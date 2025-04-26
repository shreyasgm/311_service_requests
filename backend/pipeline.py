from openai import OpenAI
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os
import fire
from typing import Dict, Any, Optional
from backend.classify_311 import pre_classify_request
from backend.extractor import extract_311_request

def pipeline_311(conversation: str) -> Dict[str, Any]:
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
            "classification": classification
        }
    
    elif classification["recommendation"] == "REDIRECT_TO_OTHER_SERVICE":
        return {
            "status": "non_311",
            "action": "This issue should be directed to another service provider.",
            "reason": classification["reason"],
            "classification": classification
        }
    
    elif classification["recommendation"] == "EXPEDITE":
        # Step 3: For emergency issues that can still be handled by 311
        request_data = extract_311_request(conversation)
        if request_data:
            # Convert Pydantic model to dict and then modify
            request_dict = request_data.model_dump() if hasattr(request_data, "model_dump") else request_data
            request_dict["priority"] = "URGENT"  # Override the priority
            request_dict["classification"] = classification
            request_dict["status"] = "expedited"
            return request_dict
        else:
            return {
                "status": "error",
                "message": "Failed to extract request details, but this appears to be an urgent 311 matter.",
                "classification": classification
            }
    
    elif classification["recommendation"] == "PROCESS_NORMALLY":
        # Step 3: For normal 311 requests
        request_data = extract_311_request(conversation)
        if request_data:
            # Convert Pydantic model to dict and then modify
            request_dict = request_data.model_dump() if hasattr(request_data, "model_dump") else request_data
            request_dict["classification"] = classification
            request_dict["status"] = "normal"
            return request_dict
        else:
            return {
                "status": "error",
                "message": "Failed to extract request details.",
                "classification": classification
            }
    
    else:
        # Fallback for unexpected classification outcomes
        return {
            "status": "error",
            "message": "Could not determine how to process this request.",
            "classification": classification
        }

class CLI:
    """Boston 311 Service Request Processing CLI"""
    
    def __init__(self):
        # Load environment variables
        load_dotenv()
        
        # Verify API key is loaded
        if not os.environ.get("OPENAI_API_KEY"):
            print("Warning: OPENAI_API_KEY not found in environment variables.")
    
    def process(self, message: str) -> None:
        """
        Process a 311 service request message and return structured data.
        
        Args:
            message: The user's 311 service request message
        """
        try:
            result = pipeline_311(message)
            # Print formatted JSON output
            print(json.dumps(result, indent=2))
        except Exception as e:
            print(f"Error processing request: {str(e)}")
    
    def batch(self, input_file: str, output_file: Optional[str] = None) -> None:
        """
        Process multiple 311 service requests from a file.
        
        Args:
            input_file: Path to file with one request message per line
            output_file: Optional path to save results (defaults to input_file.json)
        """
        if not output_file:
            output_file = f"{os.path.splitext(input_file)[0]}.json"
        
        try:
            results = []
            with open(input_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line:
                        result = pipeline_311(line)
                        results.append(result)
            
            # Save results to output file
            with open(output_file, 'w') as f:
                json.dump(results, f, indent=2)
            
            print(f"Processed {len(results)} requests. Results saved to {output_file}")
        
        except Exception as e:
            print(f"Error processing batch: {str(e)}")

def main():
    # Use Fire to automatically generate CLI
    fire.Fire(CLI)

if __name__ == "__main__":
    main()