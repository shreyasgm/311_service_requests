#!/usr/bin/env python
"""
Script to extract categories from real 311 data without making any database changes.

This script:
1. Reads the real 311 data CSV
2. Extracts unique category values (departments, request types, statuses)
3. Transforms the data as needed
4. Outputs the extracted categories to stdout

Usage:
    python extract_311_categories.py [--limit N] [--csv-path PATH]

Args:
    --limit: Optional limit on number of rows to process (default: process all)
    --csv-path: Path to the CSV file with 311 data
"""

import argparse
import csv
import os
import sys
from collections import defaultdict

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
                    print(f"Processed {rows_processed} rows...", file=sys.stderr)

    except Exception as e:
        print(f"Error processing CSV: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"Completed processing {rows_processed} rows", file=sys.stderr)
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


def main():
    # set up argument parser
    parser = argparse.ArgumentParser(
        description="Extract 311 categories from real data without database changes"
    )
    parser.add_argument("--limit", type=int, help="Limit the number of rows to process")
    parser.add_argument(
        "--csv-path",
        default="data/311_real_data/tmpm461rr5o.csv",
        help="Path to the CSV file with 311 data",
    )
    args = parser.parse_args()

    csv_path = args.csv_path

    # Check if the file exists
    if not os.path.exists(csv_path):
        print(f"Error: CSV file not found at {csv_path}", file=sys.stderr)
        sys.exit(1)

    # Extract unique values from the CSV
    print(f"Extracting unique values from {csv_path}...", file=sys.stderr)
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
        f"\nExtracted {len(departments)} departments, {len(request_types)} request types, and {len(statuses)} statuses",
        file=sys.stderr,
    )

    # Output the results in a structured format
    print("\n=== DEPARTMENTS ===")
    for dept in departments:
        print(f"- {dept['name']}")
        if dept.get("code"):
            print(f"  Code: {dept['code']}")
        if dept.get("description"):
            print(f"  Description: {dept['description']}")

    print("\n=== REQUEST TYPES ===")
    for rt in request_types:
        print(f"- {rt['name']}")
        if rt.get("category"):
            print(f"  Category: {rt['category']}")
        if rt.get("description"):
            print(f"  Description: {rt['description']}")

    print("\n=== STATUSES ===")
    for status in statuses:
        print(f"- {status['name']}")
        if status.get("description"):
            print(f"  Description: {status['description']}")


if __name__ == "__main__":
    main()
