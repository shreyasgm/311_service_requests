from openai import OpenAI
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from enum import Enum


class ServiceRequestPriority(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    CRITICAL = "CRITICAL"


class ServiceRequest(BaseModel):
    """Structured information extracted from a 311 service request conversation"""

    service_type: str = Field(
        ...,
        description=""" Primary category of service request based on department (e.g., Housing, Transportation, Public Works)
        ('Public Works', 'Responsible for infrastructure maintenance'),
        ('Police', 'Handles non-emergency police matters'),
        ('Sanitation', 'Manages waste collection and disposal'),
        ('Transportation', 'Manages roads, traffic, and parking'),
        ('Parks & Recreation', 'Maintains public parks and recreational areas'),
        ('Health Department', 'Handles public health concerns'),
        ('Animal Control', 'Manages animal-related issues'),
        ('Other', 'Any other service request not listed above');
        """,
    )
    service_subtype: str = Field(
        ...,
        description="""
        fill in the request type based on the service type, use these descriptions or similar:
        ('Pothole', 'Report of a pothole in a roadway'),
        ('Noise Complaint', 'Report of excessive noise'),
        ('Graffiti', 'Report of graffiti on public property'),
        ('Abandoned Vehicle', 'Report of abandoned vehicle on public property'),
        ('Streetlight Outage', 'Report of a malfunctioning streetlight'),
        ('Trash Collection', 'Issues with trash or recycling collection'),
        ('Sidewalk Repair', 'Report of damaged sidewalk'),
        ('Tree Issue', 'Report of fallen tree or branch'),
        ('Water Leak', 'Report of water leak on public property'),
        ('Rodent Sighting', 'Report of rat or mice infestation')
        """,
    )
    location_address: str = Field(..., description="Full street address of the issue")
    location_details: str | None = Field(
        ..., description="Additional location specifics or context"
    )
    description: str = Field(
        ..., description="Detailed description of the reported issue"
    )
    priority: ServiceRequestPriority = Field(
        ..., description="Estimated priority of the request"
    )
    additional_notes: str | None = Field(
        None, description="Any extra context or observations"
    )
    create_timestamp: str | None = None
    update_timestamp: str | None = None
    close_timestamp: str | None = None


# Initialize OpenAI client
load_dotenv()
client = OpenAI()


def extract_311_request(conversation: str) -> ServiceRequest:
    """
    Extract structured information from a 311 service request conversation.

    Args:
        conversation: The user's message or conversation about a 311 issue

    Returns:
        ServiceRequest: Structured information about the 311 request
    """

    # Prepare the messages
    messages = [
        {
            "role": "system",
            "content": "You are an assistant that extracts structured information from 311 service request conversations. "
            "Focus on identifying the key details needed to create a service request. "
            "If any required information is missing, use logical inference or mark as 'Unknown'.",
        },
        {"role": "user", "content": conversation},
    ]

    # Call the OpenAI API with Pydantic model parsing
    try:
        completion = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=messages,
            response_format=ServiceRequest,
        )

        # Get the parsed response
        result = completion.choices[0].message.parsed

        # Add timestamp fields
        now = datetime.now()
        result.create_timestamp = now.strftime("%Y-%m-%d %H:%M:%S")
        result.update_timestamp = (now + timedelta(days=1)).strftime(
            "%Y-%m-%d %H:%M:%S"
        )
        result.close_timestamp = (now + timedelta(days=3)).strftime("%Y-%m-%d %H:%M:%S")

        return result

    except Exception as e:
        print(f"Error processing request: {e}")

        # Return a default service request if there's an error
        now = datetime.now()
        return ServiceRequest(
            service_type="Unknown",
            service_subtype="Unknown",
            location_address="Unknown",
            location_details="Unknown",
            description="Error processing request",
            priority=ServiceRequestPriority.MEDIUM,
            additional_notes="Error occurred during processing",
            create_timestamp=now.strftime("%Y-%m-%d %H:%M:%S"),
            update_timestamp=(now + timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S"),
            close_timestamp=(now + timedelta(days=3)).strftime("%Y-%m-%d %H:%M:%S"),
        )
