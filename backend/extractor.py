from openai import OpenAI
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os
from pydantic import BaseModel, Field
from typing import Optional, Literal
from enum import Enum


class ContactMethod(str, Enum):
    CONSTITUENT_CALL = "Constituent Call"
    CITIZENS_CONNECT_APP = "Citizens Connect App"
    ONLINE_FORM = "Online Form"


class Priority(str, Enum):
    ONTIME = "ONTIME"
    OVERDUE = "OVERDUE"


class Request311Model(BaseModel):
    service_type: str = Field(..., description="Primary category of service request (e.g., Housing, Transportation, Public Works)")
    service_subtype: str = Field(..., description="More specific subcategory of the service request")
    location_address: str = Field(..., description="Full street address of the issue")
    location_details: str = Field(..., description="Additional location specifics or context")
    description: str = Field(..., description="Detailed description of the reported issue")
    contact_method: ContactMethod = Field(..., description="How the request was submitted")
    priority: Priority = Field(..., description="Estimated priority of the request")
    additional_notes: str = Field(..., description="Any extra context or observations")
    create_timestamp: Optional[datetime] = None
    update_timestamp: Optional[datetime] = None
    close_timestamp: Optional[datetime] = None
    
    class Config:
        json_schema_extra = {
            "required": [
                "service_type",
                "service_subtype",
                "location_address",
                "location_details",
                "description",
                "contact_method",
                "priority",
                "additional_notes"
            ]
        }


# Initialize OpenAI client
load_dotenv()
client = OpenAI()


def extract_311_request(conversation: str) -> Request311Model:
    # Define the tools for creating a structured output
    tools = [
        {
            "type": "function",
            "function": {
                "name": "create_311_request",
                "description": "Extract structured information from a 311 service request conversation",
                "parameters": Request311Model.model_json_schema(),
                "strict": True
            }
        }
    ]

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
            "create_timestamp": now,
            "update_timestamp": (now + timedelta(days=1)),
            "close_timestamp": (now + timedelta(days=3))
        })
        
        # Create a validated Pydantic model from the data
        return Request311Model(**request_data)
    except Exception as e:
        print(f"Error parsing request data: {e}")
        return None