import pytest
from backend.pipeline import get_db_connection

def test_db_connection():
    """
    Test that we can establish a connection to the database.
    This test verifies that:
    1. We can connect to the database
    2. The connection is valid
    3. We can execute a simple query
    """
    # Get a connection
    conn = get_db_connection()
    
    try:
        # Verify the connection is valid
        assert conn is not None
        assert not conn.closed
        
        # Create a cursor
        cursor = conn.cursor()
        
        # Execute a simple query to verify connection works
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        
        # Verify we got the expected result
        assert result == (1,)
        
    finally:
        # Always close the connection
        conn.close() 