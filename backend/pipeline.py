import json
from dotenv import load_dotenv
import os
import argparse
from typing import Any
from backend.classify_311 import pre_classify_request
from backend.extractor import extract_311_request


def pipeline_311(conversation: str) -> dict[str, Any]:
    """
    Orchestrate the complete 311 request processing workflow:
    1. Pre-classify the request
    2. Based on classification, process appropriately
    3. Extract structured data if needed

    Args:
        conversation (str): The user's message or conversation

    Returns:
        dict: Processed result with appropriate action
    """
    # Step 1: Pre-classify
    classification = pre_classify_request(conversation)

    # Convert classification to dict if it's a Pydantic model
    if hasattr(classification, "model_dump"):
        classification = classification.model_dump()

    # Step 2: Determine action path
    if classification["recommendation"] == "REDIRECT_TO_911":
        return {
            "status": "emergency",
            "action": "Please call 911 immediately. This requires emergency services.",
            "reason": classification["reason"],
            "classification": classification,
        }

    elif classification["recommendation"] == "REDIRECT_TO_OTHER_SERVICE":
        return {
            "status": "non_311",
            "action": "This issue should be directed to another service provider.",
            "reason": classification["reason"],
            "classification": classification,
        }

    elif classification["recommendation"] == "EXPEDITE":
        # Step 3: For emergency issues that can still be handled by 311
        request_data = extract_311_request(conversation)
        if request_data:
            # Convert Pydantic model to dict and then modify
            request_dict = (
                request_data.model_dump()
                if hasattr(request_data, "model_dump")
                else request_data
            )
            request_dict["priority"] = "URGENT"  # Override the priority
            request_dict["classification"] = classification
            request_dict["status"] = "expedited"
            return request_dict
        else:
            return {
                "status": "error",
                "message": "Failed to extract request details, but this appears to be an urgent 311 matter.",
                "classification": classification,
            }

    elif classification["recommendation"] == "PROCESS_NORMALLY":
        # Step 3: For normal 311 requests
        request_data = extract_311_request(conversation)
        if request_data:
            # Convert Pydantic model to dict and then modify
            request_dict = (
                request_data.model_dump()
                if hasattr(request_data, "model_dump")
                else request_data
            )
            request_dict["classification"] = classification
            request_dict["status"] = "normal"
            return request_dict
        else:
            return {
                "status": "error",
                "message": "Failed to extract request details.",
                "classification": classification,
            }

    else:
        # Fallback for unexpected classification outcomes
        return {
            "status": "error",
            "message": "Could not determine how to process this request.",
            "classification": classification,
        }


def main():
    # Load environment variables
    load_dotenv()

    # Verify API key is loaded
    if not os.environ.get("OPENAI_API_KEY"):
        print("Warning: OPENAI_API_KEY not found in environment variables.")

    # Create argument parser
    parser = argparse.ArgumentParser(
        description="Boston 311 Service Request Processing CLI"
    )

    # Add arguments
    parser.add_argument("message", help="The user's 311 service request message")

    # Parse arguments
    args = parser.parse_args()

    try:
        # Process the request
        result = pipeline_311(args.message)
        # Print formatted JSON output
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"Error processing request: {str(e)}")


if __name__ == "__main__":
    main()
