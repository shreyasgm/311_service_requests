from openai import OpenAI
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os


#initialise OpenAI client
load_dotenv()
client = OpenAI()

def extract_311_request(conversation):
    #define the tools for creating a structured output
    tools = [
        {
            "type": "function",
            "function": {
                "name": "create_311_request",
                "description": "Extract structured information from a 311 service request conversation",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "service_type": {
                            "type": "string",
                            "description": "Primary category of service request (e.g., Housing, Transportation, Public Works)"
                        },
                        "service_subtype": {
                            "type": "string",
                            "description": "More specific subcategory of the service request"
                        },
                        "location_address": {
                            "type": "string",
                            "description": "Full street address of the issue"
                        },
                        "location_details": {
                            "type": ["string", "null"],
                            "description": "Additional location specifics or context"
                        },
                        "description": {
                            "type": "string",
                            "description": "Detailed description of the reported issue"
                        },
                        "priority": {
                            "type": "string",
                            "enum": ["HIGH", "MEDIUM", "LOW"],
                            "description": "Estimated priority of the request"
                        },
                        "additional_notes": {
                            "type": ["string", "null"],
                            "description": "Any extra context or observations"
                        }
                    },
                    "required": [
                        "service_type", 
                        "service_subtype", 
                        "location_address", 
                        "location_details",  # Added this to the required list
                        "description", 
                        "priority",
                        "additional_notes"  # Also added this
                    ],
                    "additionalProperties": False
                },
                "strict": True
            }
        }
    ]

    # Rest of the code remains the same

    # Prepare the messages
    messages = [
        {
            "role": "system", 
            "content": "You are an assistant that extracts structured information from 311 service request conversations. "
            "Focus on identifying the key details needed to create a service request. "
            "If any required information is missing, use logical inference or mark as 'Unknown'."
        },
        {
            "role": "user", 
            "content": conversation
        }
    ]

    # Call the OpenAI API with function calling
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        tools=tools,
        tool_choice={"type": "function", "function": {"name": "create_311_request"}}
    )

    # Extract the function call
    tool_call = response.choices[0].message.tool_calls[0]
    
    # Parse the arguments
    try:
        request_data = json.loads(tool_call.function.arguments)
        
        # Add timestamp fields
        now = datetime.now()
        request_data.update({
            "create_timestamp": now.strftime("%Y-%m-%d %H:%M:%S"),
            "update_timestamp": (now + timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S"),
            "close_timestamp": (now + timedelta(days=3)).strftime("%Y-%m-%d %H:%M:%S")
        })
        
        return request_data
    except Exception as e:
        print(f"Error parsing request data: {e}")
        return None

