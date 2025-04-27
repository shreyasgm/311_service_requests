"""
Script to extract categories from real 311 data and update the database.

This script:
1. Reads the real 311 data CSV
2. Extracts unique category values (departments, request types, statuses)
3. Transforms the data as needed
4. Updates the database with the extracted categories

Usage:
    python migrate_311_categories.py [--limit N] [--db-url DATABASE_URL]

Args:
    --limit: Optional limit on number of rows to process (default: process all)
"""

import argparse
import asyncio
import csv
import os
import sys
from collections import defaultdict

import asyncpg
from dotenv import load_dotenv

load_dotenv()

# Column mappings between real 311 data and our schema
COLUMN_MAPPINGS = {
    # Real data column -> Our schema table.column
    "department": "departments.code",  # Department code (e.g., PWDx)
    "subject": "departments.name",  # Department full name (e.g., Public Works Department)
    "case_title": "request_types.name",  # Primary request type (e.g., Pothole)
    "reason": "request_types.category",  # Category (e.g., Street Maintenance)
    "type": "request_types.subcategory",  # Subcategory (e.g., Pothole Repair)
    "case_status": "statuses.name",  # Request status (e.g., Open, Closed)
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
        print(
            f"Attempting to connect to database '{db_name}' on '{db_host}:{db_port}'..."
        )
        connection = await asyncpg.connect(connection_string)
        print("Connected to database")
        return connection
    except Exception as e:
        print(f"Error connecting to database: {e}")
        sys.exit(1)


def extract_unique_values(
    csv_path: str, limit: int | None = None
) -> dict[str, set[str]]:
    """
    Extract unique values from columns of interest in 311 data.

    Args:
        csv_path: Path to the CSV file
        limit: Optional limit on number of rows to process (for large files)

    Returns:
        dictionary of column names to sets of unique values
    """
    unique_values = defaultdict(set)
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

                # Extract values from columns we care about
                for col in COLUMN_MAPPINGS.keys():
                    if col in row and row[col]:
                        unique_values[col].add(row[col])

                # Print progress every 10,000 rows
                if rows_processed % 10000 == 0:
                    print(f"Processed {rows_processed} rows...")

    except Exception as e:
        print(f"Error processing CSV: {e}")
        sys.exit(1)

    print(f"Completed processing {rows_processed} rows")
    return unique_values


def transform_department_values(
    dept_values: set[str], subject_values: set[str]
) -> list[dict[str, str]]:
    """
    Transform department values into our schema format.

    Args:
        dept_values: set of department codes from the CSV
        subject_values: set of subject values from the CSV

    Returns:
        list of department dictionaries ready for database insertion
    """
    # Create a mapping of department codes to full names
    dept_code_to_name = {
        "PWDx": "Public Works",
        "BTDT": "Transportation",
        "PARK": "Parks & Recreation",
        "ANML": "Animal Control",
        "ISD": "Inspectional Services",
        "BWSC": "Water & Sewer",
        "PROP": "Property Management",
        "ONS_": "Neighborhood Services",
        "BPD_": "Police",
        "BPS_": "Boston Public Schools",
        "GRNi": "Green Initiatives",
        "DISB": "Disability Services",
        "BHA_": "Boston Housing Authority",
        "DND_": "Development & Neighborhoods",
        "INFO": "Information Services",
        "GEN_": "Mayor's Office",
        "No Q": "Unassigned",
    }

    # Create cleaned up department list with descriptions
    departments = []

    # Add departments from subject_values (these are the full department names)
    for subject in sorted(subject_values):
        # Clean up name if needed
        name = subject
        if " Department" in name:
            name = name.replace(" Department", "")

        departments.append(
            {
                "name": name,
                "description": f"Department from 311 system: {subject}",
                "code": next(
                    (
                        code
                        for code, dept_name in dept_code_to_name.items()
                        if dept_name.lower() in name.lower()
                    ),
                    None,
                ),
            }
        )

    # Add any departments from dept_values that weren't already added
    for dept_code in sorted(dept_values):
        if dept_code in dept_code_to_name:
            # Check if we already have this department
            name = dept_code_to_name[dept_code]
            if not any(d["name"] == name for d in departments):
                departments.append(
                    {
                        "name": name,
                        "description": f"Department from 311 system code: {dept_code}",
                        "code": dept_code,
                    }
                )

    return departments


def transform_request_types(
    case_titles: set[str], reasons: set[str], types: set[str]
) -> list[dict[str, str]]:
    """
    Transform request type values into our schema format.

    Args:
        case_titles: set of case title values from the CSV
        reasons: set of reason values from the CSV
        types: set of type values from the CSV

    Returns:
        list of request type dictionaries ready for database insertion
    """
    # Start with case_titles, which are often similar to our request_types
    # But they can be very specific - we'll need to filter and group them

    # First, gather the type values as they're more standardized
    request_types = []

    # Filter and clean up type values
    for type_val in sorted(types):
        # Skip very specific types that mention specific locations
        if ":" in type_val and any(
            loc in type_val
            for loc in ["Playground", "Park", "Field", "Square", "Garden", "Cemetery"]
        ):
            continue

        # Skip duplicate/similar entries
        if any(rt["name"] == type_val for rt in request_types):
            continue

        # Get the corresponding reason category if available
        reason_category = next(
            (
                r
                for r in reasons
                if type_val in next((t for t in types if type_val == t), "")
            ),
            "",
        )

        request_types.append(
            {
                "name": type_val,
                "description": f"Category: {reason_category}"
                if reason_category
                else "Request type from 311 system",
                "category": reason_category,
            }
        )

    # Add important case_titles that aren't already covered by type
    common_case_titles = {
        "Pothole": "Report of a pothole in a roadway",
        "Sidewalk Repair": "Report of damaged sidewalk",
        "Street Light Outage": "Report of a malfunctioning streetlight",
        "Abandoned Vehicle": "Report of abandoned vehicle on public property",
        "Graffiti Removal": "Report of graffiti on public property",
        "Noise Complaint": "Report of excessive noise",
        "Illegal Dumping": "Report of illegally dumped trash or debris",
    }

    for title, desc in common_case_titles.items():
        if not any(rt["name"] == title for rt in request_types):
            # Find matching reason if available
            matching_reason = next(
                (r for r in reasons if title.lower() in r.lower()), ""
            )

            request_types.append(
                {"name": title, "description": desc, "category": matching_reason}
            )

    return request_types


def transform_statuses(case_statuses: set[str]) -> list[dict[str, str]]:
    """
    Transform status values into our schema format.

    Args:
        case_statuses: set of case status values from the CSV

    Returns:
        list of status dictionaries ready for database insertion
    """
    # Map raw statuses to our schema format
    status_mapping = {
        "Open": "Open request that's being worked on",
        "Closed": "Request has been completed and closed",
    }

    # Add our custom statuses that might not be in the raw data
    our_statuses = {
        "New": "Request has been received but not yet processed",
        "In Progress": "Request is being actively addressed",
        "Invalid": "Request was determined to be invalid or not actionable",
    }

    statuses = []

    # Add statuses from the raw data
    for status in sorted(case_statuses):
        statuses.append(
            {
                "name": status,
                "description": status_mapping.get(
                    status, f"Status from 311 system: {status}"
                ),
            }
        )

    # Add our custom statuses if they're not already in the list
    for status, desc in our_statuses.items():
        if not any(s["name"] == status for s in statuses):
            statuses.append({"name": status, "description": desc})

    return statuses


async def update_database(
    conn: asyncpg.Connection,
    departments: list[dict[str, str]],
    request_types: list[dict[str, str]],
    statuses: list[dict[str, str]],
) -> None:
    """
    Update the database with extracted and transformed categories.

    Args:
        conn: Database connection
        departments: list of department dictionaries
        request_types: list of request type dictionaries
        statuses: list of status dictionaries
    """
    try:
        # Start a transaction
        async with conn.transaction():
            # Empty all tables in the correct order to respect foreign key constraints
            print("Emptying all tables...")
            await conn.execute("DELETE FROM ai_analysis_results")
            await conn.execute("DELETE FROM request_history")
            await conn.execute("DELETE FROM service_requests")
            await conn.execute("DELETE FROM request_type_department_mapping")
            await conn.execute("DELETE FROM request_types")
            await conn.execute("DELETE FROM departments")
            await conn.execute("DELETE FROM priorities")
            await conn.execute("DELETE FROM statuses")

            # 1. Update departments table
            print(f"Updating departments table with {len(departments)} departments...")

            # Insert new departments
            for dept in departments:
                await conn.execute(
                    """
                    INSERT INTO departments (name, description, contact_email, contact_phone)
                    VALUES ($1, $2, $3, $4)
                    """,
                    dept["name"],
                    dept["description"],
                    None,  # contact_email
                    None,  # contact_phone
                )

            # 2. Update request_types table
            print(
                f"Updating request_types table with {len(request_types)} request types..."
            )

            # Insert new request types
            for rt in request_types:
                await conn.execute(
                    """
                    INSERT INTO request_types (name, description, avg_resolution_time)
                    VALUES ($1, $2, $3)
                    """,
                    rt["name"],
                    rt["description"],
                    None,  # avg_resolution_time
                )

            # 3. Update statuses table
            print(f"Updating statuses table with {len(statuses)} statuses...")

            # Insert new statuses
            for status in statuses:
                await conn.execute(
                    """
                    INSERT INTO statuses (name, description)
                    VALUES ($1, $2)
                    """,
                    status["name"],
                    status["description"],
                )

            # 4. Create mappings between request types and departments
            print("Creating mappings between request types and departments...")

            # Create department mappings based on common patterns
            dept_mappings = {
                "Pothole": "Public Works",
                "Sidewalk": "Public Works",
                "Street Light": "Transportation",
                "Traffic Signal": "Transportation",
                "Parking": "Transportation",
                "Tree": "Parks & Recreation",
                "Park": "Parks & Recreation",
                "Playground": "Parks & Recreation",
                "Animal": "Animal Control",
                "Building": "Inspectional Services",
                "Inspection": "Inspectional Services",
                "Unsanitary": "Inspectional Services",
                "Water": "Water & Sewer",
                "Sewer": "Water & Sewer",
                "Catch Basin": "Water & Sewer",
                "Graffiti": "Property Management",
                "Neighborhood": "Neighborhood Services",
                "Noise": "Police",
                "Abandoned Vehicle": "Police",
            }

            # Create mappings for each request type
            for rt in request_types:
                # Find the appropriate department
                dept_name = "Mayor's Office"  # Default

                for keyword, department in dept_mappings.items():
                    if keyword.lower() in rt["name"].lower():
                        dept_name = department
                        break

                # Get department and request type IDs
                dept_id = await conn.fetchval(
                    "SELECT id FROM departments WHERE name = $1", dept_name
                )

                rt_id = await conn.fetchval(
                    "SELECT id FROM request_types WHERE name = $1", rt["name"]
                )

                if dept_id and rt_id:
                    await conn.execute(
                        """
                        INSERT INTO request_type_department_mapping 
                        (request_type_id, department_id, is_primary)
                        VALUES ($1, $2, TRUE)
                        """,
                        rt_id,
                        dept_id,
                    )

            print("Database update completed successfully")

    except Exception as e:
        print(f"Error updating database: {e}")
        # Transaction will be rolled back automatically


async def main():
    # set up argument parser
    parser = argparse.ArgumentParser(
        description="Migrate 311 categories from real data to database"
    )
    parser.add_argument("--limit", type=int, help="Limit the number of rows to process")
    parser.add_argument("--db-url", help="Database connection URL")
    args = parser.parse_args()

    # Environment variables for database connection already loaded

    # Path to the real 311 data
    csv_path = "data/311_real_data/tmpm461rr5o.csv"

    # Check if the file exists
    if not os.path.exists(csv_path):
        print(f"Error: CSV file not found at {csv_path}")
        sys.exit(1)

    # Extract unique values from the CSV
    print(f"Extracting unique values from {csv_path}...")
    unique_values = extract_unique_values(csv_path, args.limit)

    # Transform the data
    departments = transform_department_values(
        unique_values.get("department", set()), unique_values.get("subject", set())
    )

    request_types = transform_request_types(
        unique_values.get("case_title", set()),
        unique_values.get("reason", set()),
        unique_values.get("type", set()),
    )

    statuses = transform_statuses(unique_values.get("case_status", set()))

    # Print summary
    print(
        f"\nExtracted {len(departments)} departments, {len(request_types)} request types, and {len(statuses)} statuses"
    )

    # Connect to the database
    conn = await connect_to_db()

    try:
        # Update the database
        await update_database(conn, departments, request_types, statuses)
    finally:
        # Close the connection
        await conn.close()
        print("Database connection closed")


if __name__ == "__main__":
    asyncio.run(main())
