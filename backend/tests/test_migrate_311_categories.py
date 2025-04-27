"""Tests for the 311 categories migration script."""

import csv
import os
import tempfile
import unittest
from unittest.mock import AsyncMock, MagicMock

import pytest

from backend.migrate_311_categories import (
    extract_unique_values,
    transform_department_values,
    transform_request_types,
    transform_statuses,
    update_database,
)


class TestExtractUniqueValues(unittest.TestCase):
    """Test the extract_unique_values function."""

    def setUp(self):
        """Set up a temporary CSV file for testing."""
        self.temp_csv = tempfile.NamedTemporaryFile(
            mode="w+", delete=False, suffix=".csv"
        )

        # Create a test CSV with some sample data
        fieldnames = [
            "department",
            "subject",
            "case_title",
            "reason",
            "type",
            "case_status",
        ]
        writer = csv.DictWriter(self.temp_csv, fieldnames=fieldnames)
        writer.writeheader()

        # Add some test data
        writer.writerow(
            {
                "department": "PWDx",
                "subject": "Public Works Department",
                "case_title": "Pothole",
                "reason": "Street Maintenance",
                "type": "Pothole Repair",
                "case_status": "Open",
            }
        )
        writer.writerow(
            {
                "department": "BTDT",
                "subject": "Transportation - Traffic Division",
                "case_title": "Street Light Outage",
                "reason": "Street Lights",
                "type": "Street Light Outage",
                "case_status": "Closed",
            }
        )
        writer.writerow(
            {
                "department": "PWDx",
                "subject": "Public Works Department",
                "case_title": "Sidewalk Repair",
                "reason": "Street Maintenance",
                "type": "Sidewalk Repair",
                "case_status": "Open",
            }
        )

        self.temp_csv.close()

    def tearDown(self):
        """Remove the temporary CSV file."""
        os.unlink(self.temp_csv.name)

    def test_extract_unique_values(self):
        """Test that unique values are extracted correctly."""
        unique_values = extract_unique_values(self.temp_csv.name)

        # Check that all columns were extracted
        self.assertEqual(len(unique_values), 6)

        # Check the unique values for each column
        self.assertEqual(unique_values["department"], {"PWDx", "BTDT"})
        self.assertEqual(
            unique_values["subject"],
            {"Public Works Department", "Transportation - Traffic Division"},
        )
        self.assertEqual(
            unique_values["case_title"],
            {"Pothole", "Street Light Outage", "Sidewalk Repair"},
        )
        self.assertEqual(
            unique_values["reason"], {"Street Maintenance", "Street Lights"}
        )
        self.assertEqual(
            unique_values["type"],
            {"Pothole Repair", "Street Light Outage", "Sidewalk Repair"},
        )
        self.assertEqual(unique_values["case_status"], {"Open", "Closed"})

    def test_extract_with_limit(self):
        """Test that the limit parameter works correctly."""
        unique_values = extract_unique_values(self.temp_csv.name, limit=1)

        # Should only have data from the first row
        self.assertEqual(unique_values["department"], {"PWDx"})
        self.assertEqual(unique_values["subject"], {"Public Works Department"})
        self.assertEqual(unique_values["case_title"], {"Pothole"})
        self.assertEqual(unique_values["reason"], {"Street Maintenance"})
        self.assertEqual(unique_values["type"], {"Pothole Repair"})
        self.assertEqual(unique_values["case_status"], {"Open"})


class TestTransformFunctions(unittest.TestCase):
    """Test the transformation functions."""

    def test_transform_department_values(self):
        """Test that department values are transformed correctly."""
        dept_values = {"PWDx", "BTDT", "PARK"}
        subject_values = {
            "Public Works Department",
            "Transportation - Traffic Division",
            "Parks & Recreation Department",
        }

        departments = transform_department_values(dept_values, subject_values)

        # Check that we have at least the expected number of departments
        # The function might create more than 3 departments depending on matches
        self.assertGreaterEqual(len(departments), 3)

        # Check that the departments are correctly transformed
        department_names = [d["name"] for d in departments]
        self.assertIn("Public Works", department_names)
        self.assertIn("Transportation", department_names)
        self.assertIn("Parks & Recreation", department_names)

        # Check that descriptions are set
        for dept in departments:
            self.assertIsNotNone(dept["description"])

    def test_transform_request_types(self):
        """Test that request types are transformed correctly."""
        case_titles = {"Pothole", "Street Light Outage", "Graffiti Removal"}
        reasons = {"Street Maintenance", "Street Lights", "Graffiti"}
        types = {"Pothole Repair", "Street Light Outage", "Graffiti Removal"}

        request_types = transform_request_types(case_titles, reasons, types)

        # Check that we have the right number of request types
        self.assertGreater(len(request_types), 0)

        # Check that important request types are included
        rt_names = [rt["name"] for rt in request_types]
        self.assertIn("Pothole Repair", rt_names)
        self.assertIn("Street Light Outage", rt_names)
        self.assertIn("Graffiti Removal", rt_names)

        # Check that descriptions are set
        for rt in request_types:
            self.assertIsNotNone(rt["description"])

    def test_transform_statuses(self):
        """Test that statuses are transformed correctly."""
        case_statuses = {"Open", "Closed"}

        statuses = transform_statuses(case_statuses)

        # Check that we have the right number of statuses
        # Should include both from data and our additional statuses
        self.assertGreaterEqual(len(statuses), 5)

        # Check that all expected statuses are included
        status_names = [s["name"] for s in statuses]
        expected_statuses = ["Open", "Closed", "New", "In Progress", "Invalid"]
        for status in expected_statuses:
            self.assertIn(status, status_names)

        # Check that descriptions are set
        for status in statuses:
            self.assertIsNotNone(status["description"])


@pytest.mark.asyncio
async def test_update_database():
    """Test that the database update function works correctly."""
    # Create mock data
    departments = [
        {"name": "Public Works", "description": "Test description"},
        {"name": "Transportation", "description": "Test description"},
    ]

    request_types = [
        {
            "name": "Pothole",
            "description": "Test description",
            "category": "Street Maintenance",
        },
        {
            "name": "Street Light Outage",
            "description": "Test description",
            "category": "Street Lights",
        },
    ]

    statuses = [
        {"name": "Open", "description": "Test description"},
        {"name": "Closed", "description": "Test description"},
    ]

    # Create a mock connection
    mock_conn = AsyncMock()
    mock_conn.execute = AsyncMock()
    mock_conn.fetchval = AsyncMock(side_effect=["dept_id", "rt_id"])
    mock_conn.transaction = MagicMock(return_value=AsyncMock())

    # Call the update_database function
    await update_database(mock_conn, departments, request_types, statuses)

    # Check that the expected DELETE statements were executed
    delete_calls = [
        c for c in mock_conn.execute.call_args_list if "DELETE FROM" in c.args[0]
    ]
    assert len(delete_calls) == 8  # There are 8 DELETE statements in the function

    # Check that the expected number of INSERT statements were executed
    insert_calls = [
        c for c in mock_conn.execute.call_args_list if "INSERT INTO" in c.args[0]
    ]
    # Should have at least inserts for departments, request_types, and statuses
    # Not all request types might get mapped to departments (depends on name matching)
    expected_min_inserts = len(departments) + len(request_types) + len(statuses)
    expected_max_inserts = (
        len(departments) + len(request_types) + len(statuses) + len(request_types)
    )
    assert expected_min_inserts <= len(insert_calls) <= expected_max_inserts


if __name__ == "__main__":
    unittest.main()
