from openai import OpenAI
import json
from dotenv import load_dotenv
import os
from pydantic import BaseModel, Field

# Define Pydantic models for validation
class ClassificationResponse(BaseModel):
    is_emergency: bool = Field(
        description="TRUE if this is an emergency requiring immediate attention"
    )
    belongs_in_311: bool = Field(
        description="TRUE if this request belongs in Boston's 311 non-emergency system"
    )
    reason: str = Field(
        description="Brief explanation of the classification"
    )
    recommendation: str = Field(
        description="Action to take based on classification",
        default="PROCESS_NORMALLY"
    )

def pre_classify_request(conversation):
    """
    Pre-classify a conversation to determine if it's:
    1. An emergency (needs immediate attention)
    2. Belongs in the 311 system (vs being redirected elsewhere)
    
    Uses a cheaper model to save costs before more detailed processing.
    
    Args:
        conversation (str): The user's message or conversation to classify
        
    Returns:
        ClassificationResponse: Pydantic model with classification results
    """
    # Initialize OpenAI client
    load_dotenv()
    client = OpenAI()
    
    # Define the tool schema for classification
    tools = [
        {
            "type": "function",
            "function": {
                "name": "classify_311_request",
                "description": "Classify if a request is an emergency and if it belongs in the Boston 311 system",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "is_emergency": {
                            "type": "boolean",
                            "description": "TRUE if this is an emergency requiring immediate attention (defined as an immediate threat to life, safety, or critical infrastructure)"
                        },
                        "belongs_in_311": {
                            "type": "boolean", 
                            "description": "TRUE if this request belongs in Boston's 311 non-emergency system"
                        },
                        "reason": {
                            "type": "string",
                            "description": "Brief explanation of your classification"
                        }
                    },
                    "required": ["is_emergency", "belongs_in_311", "reason"]
                }
            }
        }
    ]
    
    # Create a detailed prompt for classification
    messages = [
        {
            "role": "system",
            "content": """You are Boston's 311 service triage assistant. Your job is to quickly assess incoming requests to determine:

1. If this is an EMERGENCY requiring immediate attention (defined as an immediate threat to life, safety, or critical infrastructure)
2. If this request BELONGS in Boston's 311 non-emergency system

## Boston 311 Services (RELEVANT requests)
Boston 311 handles non-emergency city service requests including but not limited to:
- Missed trash/recycling pickup or improper disposal
- Pothole repair and street damage
- Street cleaning requests
- Bulk item removal/scheduling
- Needle cleanup/sharps removal
- Broken/damaged street signs
- Graffiti removal
- Traffic signal/light malfunctions
- Parking enforcement and ticket payment
- Streetlight outages
- Park maintenance issues
- Reporting abandoned vehicles
- Rodent activity
- Snow removal issues
- Tree maintenance (city trees)
- Noise complaints
- Broken sidewalks
- Building/housing code violations
- Water/sewer issues on public property

## NOT Boston 311 Services (IRRELEVANT requests)
The following should be directed elsewhere:
- Emergencies requiring immediate response (direct to 911):
  * Active fires or smoke from buildings
  * Medical emergencies
  * Crimes in progress
  * Gas leaks
  * Downed power lines
  * Traffic accidents with injuries
  * Flooding inside buildings causing immediate danger
  
- Utility issues on private property (direct to appropriate utility):
  * Electric service problems (Eversource/National Grid)
  * Gas service problems (National Grid)
  * Cable/internet service (Comcast, Verizon, etc.)
  * Private water/plumbing issues within buildings
  
- Other non-city services:
  * State highway issues (MassDOT)
  * MBTA/public transit problems
  * Private property disputes between neighbors
  * Legal questions or advice
  * Social services not provided by the city

Analyze the provided request and use the classify_311_request tool to provide your classification."""
        },
        {
            "role": "user",
            "content": conversation
        }
    ]
    
    try:
        # Use a cheaper model for this initial classification
        response = client.chat.completions.create(
            model="o4-mini",  # Cheaper than gpt-4
            messages=messages,
            tools=tools,
            tool_choice={"type": "function", "function": {"name": "classify_311_request"}}  # Force use of the tool
        )
        
        # Extract the tool call from the response
        tool_call = response.choices[0].message.tool_calls[0]
        
        # Parse the function arguments
        if tool_call.function.name == "classify_311_request":
            classification_data = json.loads(tool_call.function.arguments)
            
            # Add a recommendation field based on the classification
            if classification_data.get("is_emergency", False) and not classification_data.get("belongs_in_311", True):
                recommendation = "REDIRECT_TO_911"
            elif classification_data.get("is_emergency", False):
                recommendation = "EXPEDITE"
            elif not classification_data.get("belongs_in_311", True):
                recommendation = "REDIRECT_TO_OTHER_SERVICE"
            else:
                recommendation = "PROCESS_NORMALLY"
                
            classification_data["recommendation"] = recommendation
            
            # Use Pydantic for validation and conversion
            return ClassificationResponse(**classification_data)
    
    except Exception as e:
        print(f"Error during classification: {e}")
    
    # Default to processing normally if there's an error
    return ClassificationResponse(
        is_emergency=False,
        belongs_in_311=True,
        recommendation="PROCESS_NORMALLY",
        reason="Error processing request, defaulting to normal handling"
    )

