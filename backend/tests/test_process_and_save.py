"""Tests for process_and_save_request functionality."""

from backend.pipeline import process_and_save_request


def test_process_and_save_request():
    """Test that a request can be processed and saved to the database."""
    # Example service request
    request_text = "There's a large pothole on Main Street near the intersection with Elm Street. It's been there for weeks and it's damaging cars. Please fix it as soon as possible. This was reported on 2023-05-15 at 10:30 AM. My name is John Doe, you can reach me at 555-123-4567 or john.doe@example.com."

    # Process the request and save to DB
    result = process_and_save_request(request_text)

    # Verify the result
    assert result is not None
    assert "id" in result
    assert "category" in result
    assert "location" in result
    assert "description" in result
