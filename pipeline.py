def pipeline_311(conversation):
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
            request_dict = request_data.model_dump()
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
            request_dict = request_data.model_dump()
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
    