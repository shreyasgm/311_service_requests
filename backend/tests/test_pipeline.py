"""Test script for the 311 service request pipeline."""

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
    assert result is not None
    assert "service_type" in result
    assert "location_address" in result


def test_emergency_request():
    """Test an emergency request that should be redirected to 911."""

    test_message = """
    There's a major gas leak on Boylston Street! I can smell gas very 
    strongly coming from a broken pipe near 700 Boylston. The smell is
    getting worse and people are starting to evacuate nearby buildings.
    Please send someone immediately before there's an explosion!
    """

    result = pipeline_311(test_message)
    assert result is not None
    assert "status" in result
    assert result["status"] == "emergency"
    assert "classification" in result
    assert result["classification"]["is_emergency"] is True


def test_other_service_request():
    """Test a request that should be redirected to another service provider."""

    test_message = """
    My Comcast internet service has been out for three days now.
    I've called them multiple times but they keep saying they'll
    send a technician and no one shows up. This is affecting my
    ability to work from home. Can city services help resolve this?
    """

    result = pipeline_311(test_message)
    assert result is not None
    assert "status" in result
    assert result["status"] == "non_311"
    assert "classification" in result
    assert result["classification"]["belongs_in_311"] is False
