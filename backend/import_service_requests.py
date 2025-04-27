"""
Script to import real 311 service requests into the database.

This script:
1. Reads the real 311 data CSV
2. Transforms each service request to match our database schema
3. Fetches reference data (departments, request types, statuses) from the database
4. Inserts the transformed service requests into the database

Usage:
    python import_service_requests.py [--limit N] [--sample N] [--db-url DATABASE_URL]

Args:
    --limit: Optional limit on number of rows to process (default: process all)
    --sample: Optional sample size to insert (randomly chosen from processed rows)
    --db-url: Optional database connection URL (default: use environment variables)
"""

import argparse
import asyncio
import csv
import os
import random
import sys
from datetime import datetime
from typing import Any

import asyncpg
from dotenv import load_dotenv

load_dotenv()

# Column mappings between real 311 data and our schema
COLUMN_MAPPINGS = {
    "case_enquiry_id": "external_id",  # Original 311 ID from the source system
    "open_dt": "created_at",  # When the request was created
    "closed_dt": "closed_at",  # When the request was closed
    "case_status": "status",  # Request status (e.g., Open, Closed)
    "closure_reason": "closure_notes",  # Notes on why the case was closed
    "case_title": "request_type",  # Primary request type (e.g., Pothole)
    "subject": "department",  # Department full name (e.g., Public Works Department)
    "reason": "category",  # Category (e.g., Street Maintenance)
    "location": "address",  # Address of the issue
    "latitude": "latitude",  # Latitude
    "longitude": "longitude",  # Longitude
    "source": "source",  # Source of the request (e.g., Citizens Connect App)
    "raw_input": "summary",  # Use summary as raw_input since we don't have the original text
}


async def connect_to_db() -> asyncpg.Connection:
    """
    Connect to the PostgreSQL database using environment variables.

    Returns:
        asyncpg.Connection: Database connection
    """
    # Get individual connection parameters
    db_host = os.environ.get("DB_HOST")
    db_port = os.environ.get("DB_PORT")
    db_name = os.environ.get("DB_NAME")
    db_user = os.environ.get("DB_USER")
    db_password = os.environ.get("DB_PASSWORD")

    # Check if all required parameters are present
    if not all([db_host, db_port, db_name, db_user, db_password]):
        missing_params = []
        if not db_host:
            missing_params.append("DB_HOST")
        if not db_port:
            missing_params.append("DB_PORT")
        if not db_name:
            missing_params.append("DB_NAME")
        if not db_user:
            missing_params.append("DB_USER")
        if not db_password:
            missing_params.append("DB_PASSWORD")
        error_msg = f"Missing required database parameters: {', '.join(missing_params)}"
        print(f"Error: {error_msg}")
        sys.exit(1)

    # Construct connection string for asyncpg
    connection_string = (
        f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    )

    try:
        # Attempt to establish the connection
        print(f"Attempting to connect to database '{db_name}' on '{db_host}:{db_port}'...")
        connection = await asyncpg.connect(connection_string)
        print("Connected to database")
        return connection
    except Exception as e:
        print(f"Error connecting to database: {e}")
        sys.exit(1)


async def fetch_reference_data(
    conn: asyncpg.Connection,
) -> tuple[dict[str, str], dict[str, str], dict[str, str]]:
    """
    Fetch reference data from the database that will be needed for linking service requests.

    Args:
        conn: Database connection

    Returns:
        Tuple containing mappings for departments, request types, and statuses
    """
    # Fetch departments and create a mapping from name to ID
    departments = await conn.fetch("SELECT id, name FROM departments")
    department_map = {dept["name"].lower(): dept["id"] for dept in departments}

    # Fetch request types and create a mapping from name to ID
    request_types = await conn.fetch("SELECT id, name FROM request_types")
    request_type_map = {rt["name"].lower(): rt["id"] for rt in request_types}

    # Fetch statuses and create a mapping from name to ID
    statuses = await conn.fetch("SELECT id, name FROM statuses")
    status_map = {status["name"].lower(): status["id"] for status in statuses}

    return department_map, request_type_map, status_map


def parse_datetime(dt_str: str | None) -> datetime | None:
    """
    Parse a datetime string from the CSV into a Python datetime object.

    Args:
        dt_str: Datetime string from CSV or None

    Returns:
        datetime object or None if input was None or invalid
    """
    if not dt_str:
        return None

    try:
        return datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        try:
            # Try alternate format
            return datetime.strptime(dt_str, "%Y-%m-%d")
        except ValueError:
            print(f"Warning: Could not parse datetime: {dt_str}")
            return None


def process_csv_data(
    csv_path: str,
    department_map: dict[str, str],
    request_type_map: dict[str, str],
    status_map: dict[str, str],
    limit: int | None = None,
) -> list[dict[str, Any]]:
    """
    Process the CSV data and transform it to match our database schema.

    Args:
        csv_path: Path to the CSV file
        department_map: Mapping from department name to ID
        request_type_map: Mapping from request type name to ID
        status_map: Mapping from status name to ID
        limit: Optional limit on number of rows to process

    Returns:
        List of dictionaries containing transformed service request data
    """
    transformed_data = []
    rows_processed = 0

    try:
        with open(csv_path, newline="", encoding="utf-8") as csvfile:
            reader = csv.DictReader(csvfile)

            # Process each row
            for row in reader:
                rows_processed += 1

                # Only process up to limit if specified
                if limit and rows_processed > limit:
                    break

                # Transform the row data
                transformed_row = transform_service_request(
                    row, department_map, request_type_map, status_map
                )
                if transformed_row:
                    transformed_data.append(transformed_row)

                # Print progress every 1,000 rows
                if rows_processed % 1000 == 0:
                    print(f"Processed {rows_processed} rows...")

        print(f"Completed processing {rows_processed} rows")
        print(f"Successfully transformed {len(transformed_data)} service requests")
        return transformed_data

    except Exception as e:
        print(f"Error processing CSV: {e}")
        sys.exit(1)


def transform_service_request(
    row: dict[str, str],
    department_map: dict[str, str],
    request_type_map: dict[str, str],
    status_map: dict[str, str],
) -> dict[str, Any] | None:
    """
    Transform a single row from the CSV into our service request format.

    Args:
        row: Dictionary containing a row from the CSV
        department_map: Mapping from department name to ID
        request_type_map: Mapping from request type name to ID
        status_map: Mapping from status name to ID

    Returns:
        Dictionary containing transformed service request data, or None if invalid
    """
    # Create a summary from available data
    summary = f"{row.get('case_title', 'Unknown')} - {row.get('location', 'Unknown location')}"
    
    # Clean department name
    dept_name = row.get("subject", "")
    if " Department" in dept_name:
        dept_name = dept_name.replace(" Department", "")
    
    # Find corresponding IDs from our reference data
    department_id = department_map.get(dept_name.lower())
    request_type_id = request_type_map.get(row.get("type", "").lower())
    
    # If the "type" doesn't match, try using "case_title" instead
    if not request_type_id:
        request_type_id = request_type_map.get(row.get("case_title", "").lower())
    
    status_id = status_map.get(row.get("case_status", "").lower())
    
    # If we couldn't find key reference data, log and skip
    if not status_id:
        print(f"Warning: Could not find status ID for '{row.get('case_status')}', using 'New'")
        status_id = status_map.get("new")  # Default to "New" status
    
    # Parse dates from CSV
    created_at = parse_datetime(row.get("open_dt"))
    if not created_at:
        created_at = datetime.now()  # Default to current time if missing
    
    # Extract latitude and longitude
    try:
        latitude = float(row.get("latitude")) if row.get("latitude") else None
        longitude = float(row.get("longitude")) if row.get("longitude") else None
    except ValueError:
        print(f"Warning: Invalid lat/long for case {row.get('case_enquiry_id')}")
        latitude = None
        longitude = None
    
    # Check if this is a valid emergency
    is_emergency = False
    if row.get("sla_target_dt") and row.get("open_dt"):
        try:
            target_date = parse_datetime(row.get("sla_target_dt"))
            open_date = parse_datetime(row.get("open_dt"))
            if target_date and open_date:
                # If SLA is less than 24 hours, consider it high priority/potential emergency
                time_diff = target_date - open_date
                if time_diff.total_seconds() < 24 * 60 * 60:
                    is_emergency = True
        except (ValueError, TypeError):
            pass
    
    # Create the transformed request
    transformed_request = {
        "created_at": created_at,
        "raw_input": summary,  # We don't have the original text, so use the summary
        "summary": summary,
        "request_type_id": request_type_id,
        "department_id": department_id,
        "status_id": status_id,
        "priority_id": None,  # We don't have priority in the source data
        "location": None,  # Will be set automatically from lat/long by trigger
        "address": row.get("location", ""),
        "latitude": latitude,
        "longitude": longitude,
        "is_emergency": is_emergency,
        "is_valid": True,  # Assume all imported requests are valid
        "external_id": row.get("case_enquiry_id"),  # Store the original ID
        "source": row.get("source"),  # Store the source system
        "closure_reason": row.get("closure_reason"),  # Store closure notes
    }
    
    return transformed_request


async def sample_and_insert_data(
    conn: asyncpg.Connection,
    transformed_data: list[dict[str, Any]],
    sample_size: int | None = None,
) -> None:
    """
    Sample the transformed data if needed and insert into the database using batch operations.

    Args:
        conn: Database connection
        transformed_data: List of transformed service requests
        sample_size: Optional sample size to limit insertion
    """
    # Sample the data if requested
    data_to_insert = transformed_data
    if sample_size and sample_size < len(transformed_data):
        data_to_insert = random.sample(transformed_data, sample_size)
        print(f"Randomly sampled {sample_size} requests from {len(transformed_data)} processed requests")
    
    print(f"Inserting {len(data_to_insert)} service requests into the database...")
    
    try:
        # Start a transaction
        async with conn.transaction():
            # Prepare data for batch insertion
            # Column names for the COPY command
            columns = [
                "created_at", "raw_input", "summary", "request_type_id", "department_id", 
                "status_id", "priority_id", "address", "latitude", "longitude", 
                "is_emergency", "is_valid"
            ]
            
            # Define batch size (adjust as needed for optimal performance)
            batch_size = 500
            total_batches = (len(data_to_insert) + batch_size - 1) // batch_size
            
            for batch_num in range(total_batches):
                start_idx = batch_num * batch_size
                end_idx = min((batch_num + 1) * batch_size, len(data_to_insert))
                batch = data_to_insert[start_idx:end_idx]
                
                # Prepare values for COPY
                values = []
                for request in batch:
                    values.append([
                        request["created_at"],
                        request["raw_input"],
                        request["summary"],
                        request["request_type_id"],
                        request["department_id"],
                        request["status_id"],
                        request["priority_id"],
                        request["address"],
                        request["latitude"],
                        request["longitude"],
                        request["is_emergency"],
                        request["is_valid"],
                    ])
                
                # Execute COPY command for this batch
                await conn.copy_records_to_table(
                    'service_requests', 
                    records=values,
                    columns=columns
                )
                
                print(f"Inserted batch {batch_num + 1}/{total_batches} ({start_idx + 1}-{end_idx} of {len(data_to_insert)})")
            
            print("Database insertion completed successfully")
    
    except Exception as e:
        print(f"Error inserting data into database: {e}")
        # Transaction will be rolled back automatically


async def main() -> None:
    """Main function to execute the script."""
    # Set up argument parser
    parser = argparse.ArgumentParser(description="Import 311 service requests from real data")
    parser.add_argument("--limit", type=int, help="Limit the number of rows to process")
    parser.add_argument(
        "--sample", 
        type=int, 
        help="Sample size to randomly select from processed rows (for testing)"
    )
    parser.add_argument("--db-url", help="Database connection URL")
    args = parser.parse_args()
    
    # Path to the real 311 data
    csv_path = "data/311_real_data/tmpm461rr5o.csv"
    
    # Check if the file exists
    if not os.path.exists(csv_path):
        print(f"Error: CSV file not found at {csv_path}")
        sys.exit(1)
    
    # Connect to the database
    conn = await connect_to_db()
    
    try:
        # Fetch reference data
        department_map, request_type_map, status_map = await fetch_reference_data(conn)
        
        # Process the CSV data
        transformed_data = process_csv_data(
            csv_path, department_map, request_type_map, status_map, args.limit
        )
        
        # Insert the data into the database
        await sample_and_insert_data(conn, transformed_data, args.sample)
        
    finally:
        # Close the connection
        await conn.close()
        print("Database connection closed")


if __name__ == "__main__":
    asyncio.run(main())