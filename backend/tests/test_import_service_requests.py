"""Test module for the import_service_requests script."""

import os
import sys

# Add the parent directory to path so we can import our modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from import_service_requests import (
    parse_datetime,
    transform_service_request,
)


def test_parse_datetime():
    """Test parsing datetime strings from CSV."""
    # Test valid datetime with time
    assert parse_datetime("2024-05-14 13:33:28") is not None
    
    # Test valid date only
    assert parse_datetime("2024-05-14") is not None
    
    # Test None input
    assert parse_datetime(None) is None
    
    # Test invalid format
    assert parse_datetime("not a date") is None


def test_transform_service_request():
    """Test transforming a CSV row into our service request format."""
    # Sample row from the CSV
    sample_row = {
        "case_enquiry_id": "101005463183",
        "open_dt": "2024-05-14 13:33:28",
        "sla_target_dt": "2024-05-17 04:30:00",
        "closed_dt": "2024-05-15 02:58:54",
        "case_status": "Closed",
        "closure_reason": "Case Closed. Closed date : Wed May 15 06:58:54 EDT 2024",
        "case_title": "Improper Storage of Trash (Barrels)",
        "subject": "Public Works Department",
        "reason": "Code Enforcement",
        "type": "Improper Storage of Trash (Barrels)",
        "department": "PWDx",
        "location": "160-162 Liverpool St East Boston MA 02128",
        "latitude": "42.37387949518689",
        "longitude": "-71.03980037090297",
        "source": "Citizens Connect App",
    }
    
    # Mock reference data mappings
    department_map = {"public works": "dept1-uuid"}
    request_type_map = {"improper storage of trash (barrels)": "rt1-uuid"}
    status_map = {"closed": "status1-uuid", "new": "status2-uuid"}
    
    # Transform the row
    result = transform_service_request(
        sample_row, department_map, request_type_map, status_map
    )
    
    # Verify the transformation
    assert result is not None
    assert result["external_id"] == "101005463183"
    assert result["summary"] == "Improper Storage of Trash (Barrels) - 160-162 Liverpool St East Boston MA 02128"
    assert result["request_type_id"] == "rt1-uuid"
    assert result["department_id"] == "dept1-uuid"
    assert result["status_id"] == "status1-uuid"
    assert result["latitude"] == 42.37387949518689
    assert result["longitude"] == -71.03980037090297
    assert result["is_valid"] is True
    assert result["address"] == "160-162 Liverpool St East Boston MA 02128"
    assert result["source"] == "Citizens Connect App"


def test_transform_service_request_missing_refs():
    """Test handling of missing reference data."""
    # Sample row with values that won't be in our reference maps
    sample_row = {
        "case_enquiry_id": "123456",
        "open_dt": "2024-05-14 13:33:28",
        "case_status": "Working",  # Not in our status map
        "case_title": "Unknown Request Type",  # Not in request_type_map
        "subject": "Unknown Department",  # Not in department_map
        "location": "123 Main St",
    }
    
    # Mock reference data mappings (empty)
    department_map = {}
    request_type_map = {}
    status_map = {"new": "status2-uuid"}  # Only have "new" status
    
    # Transform the row
    result = transform_service_request(
        sample_row, department_map, request_type_map, status_map
    )
    
    # Verify the transformation
    assert result is not None
    assert result["department_id"] is None  # Should be None since not found
    assert result["request_type_id"] is None  # Should be None since not found
    assert result["status_id"] == "status2-uuid"  # Should default to "new"
    assert result["address"] == "123 Main St"


def test_transform_service_request_with_invalid_coords():
    """Test handling of invalid coordinates."""
    # Sample row with invalid coordinates
    sample_row = {
        "case_enquiry_id": "123456",
        "open_dt": "2024-05-14 13:33:28",
        "case_status": "Closed",
        "case_title": "Test Request",
        "subject": "Public Works Department",
        "location": "123 Main St",
        "latitude": "not-a-number",
        "longitude": "also-not-a-number",
    }
    
    # Mock reference data mappings
    department_map = {"public works": "dept1-uuid"}
    request_type_map = {"test request": "rt1-uuid"}
    status_map = {"closed": "status1-uuid"}
    
    # Transform the row
    result = transform_service_request(
        sample_row, department_map, request_type_map, status_map
    )
    
    # Verify the transformation
    assert result is not None
    assert result["latitude"] is None  # Should be None since invalid
    assert result["longitude"] is None  # Should be None since invalid