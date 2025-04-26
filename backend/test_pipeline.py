"""Test script for the 311 service request pipeline."""

import json
from backend.pipeline import pipeline_311


def test_normal_request():
    """Test a normal 311 service request."""
    
    test_message = """
    There's a large pothole on Commonwealth Avenue near Boston University. 
    It's right in front of 855 Commonwealth Ave, in the right lane heading east.
    It's about 1 foot wide and very deep - I saw a car damage their tire this morning.
    This has been there for at least a week and seems to be getting worse with the rain.
    Could you please get this fixed soon before more cars are damaged?
    """
    
    result = pipeline_311(test_message)
    print(json.dumps(result, indent=2))
    print("\nNormal request test completed successfully.")


def test_emergency_request():
    """Test an emergency request that should be redirected to 911."""
    
    test_message = """
    There's a major gas leak on Boylston Street! I can smell gas very 
    strongly coming from a broken pipe near 700 Boylston. The smell is
    getting worse and people are starting to evacuate nearby buildings.
    Please send someone immediately before there's an explosion!
    """
    
    result = pipeline_311(test_message)
    print(json.dumps(result, indent=2))
    print("\nEmergency request test completed successfully.")


def test_other_service_request():
    """Test a request that should be redirected to another service provider."""
    
    test_message = """
    My Comcast internet service has been out for three days now.
    I've called them multiple times but they keep saying they'll
    send a technician and no one shows up. This is affecting my
    ability to work from home. Can city services help resolve this?
    """
    
    result = pipeline_311(test_message)
    print(json.dumps(result, indent=2))
    print("\nOther service request test completed successfully.")


if __name__ == "__main__":
    print("Running 311 pipeline tests...\n")
    
    print("TEST 1: Normal 311 Request")
    print("-" * 50)
    test_normal_request()
    
    print("\nTEST 2: Emergency Request")
    print("-" * 50)
    test_emergency_request()
    
    print("\nTEST 3: Other Service Request")
    print("-" * 50)
    test_other_service_request()
    
    print("\nAll tests completed.")