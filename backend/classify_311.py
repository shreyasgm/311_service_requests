from openai import OpenAI
from dotenv import load_dotenv
from enum import Enum
from pydantic import BaseModel, Field

from backend.data_models import TriageResult, RequestPriority


class RequestRecommendation(str, Enum):
    REDIRECT_TO_911 = "REDIRECT_TO_911"
    EXPEDITE = "EXPEDITE"
    REDIRECT_TO_OTHER_SERVICE = "REDIRECT_TO_OTHER_SERVICE"
    PROCESS_NORMALLY = "PROCESS_NORMALLY"


class PreClassificationResult(BaseModel):
    """
    Initial classification of a 311 service request to determine
    if it's an emergency and if it belongs in the 311 system.
    """

    is_emergency: bool = Field(
        ...,
        description="TRUE if this is an emergency requiring immediate attention (defined as an immediate threat to life, safety, or critical infrastructure)",
    )
    belongs_in_311: bool = Field(
        ...,
        description="TRUE if this request belongs in Boston's 311 non-emergency system",
    )
    reason: str = Field(
        ..., description="Brief explanation of the classification and reasoning"
    )
    recommendation: RequestRecommendation = Field(
        default=RequestRecommendation.PROCESS_NORMALLY,
        description="Action recommendation based on classification (REDIRECT_TO_911, EXPEDITE, REDIRECT_TO_OTHER_SERVICE, or PROCESS_NORMALLY)",
    )


def pre_classify_request(conversation: str) -> PreClassificationResult:
    """
    Pre-classify a conversation to determine if it's:
    1. An emergency (needs immediate attention)
    2. Belongs in the 311 system (vs being redirected elsewhere)

    Uses a cheaper model to save costs before more detailed processing.

    Args:
        conversation: The user's message or conversation to classify

    Returns:
        PreClassificationResult: Classification results with is_emergency,
        belongs_in_311, reason and recommendation
    """
    # Initialize OpenAI client
    load_dotenv()
    client = OpenAI()

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

Analyze the provided request and determine if it's an emergency and if it belongs in the 311 system.""",
        },
        {"role": "user", "content": conversation},
    ]

    # Use a cheaper model for this initial classification
    completion = client.beta.chat.completions.parse(
        model="gpt-4o",  # Cheaper than gpt-4
        messages=messages,
        response_format=PreClassificationResult,
    )

    try:
        # Get the parsed response
        result = completion.choices[0].message.parsed

        # Determine recommendation based on classification
        if result.is_emergency and not result.belongs_in_311:
            result.recommendation = RequestRecommendation.REDIRECT_TO_911
        elif result.is_emergency:
            result.recommendation = RequestRecommendation.EXPEDITE
        elif not result.belongs_in_311:
            result.recommendation = RequestRecommendation.REDIRECT_TO_OTHER_SERVICE
        else:
            result.recommendation = RequestRecommendation.PROCESS_NORMALLY

        return result

    except Exception as e:
        print(f"Error processing classification: {e}")

    # Default to processing normally if there's an error
    return PreClassificationResult(
        is_emergency=False,
        belongs_in_311=True,
        reason="Error processing request, defaulting to normal handling",
        recommendation=RequestRecommendation.PROCESS_NORMALLY,
    )


def create_triage_result(pre_classification: PreClassificationResult) -> TriageResult:
    """
    Convert a PreClassificationResult into a TriageResult for further processing.

    Args:
        pre_classification: The initial classification result

    Returns:
        TriageResult: A triage result with appropriate priority level
    """
    # Determine priority based on recommendation
    priority = RequestPriority.MEDIUM  # Default

    if pre_classification.recommendation == RequestRecommendation.EXPEDITE:
        priority = RequestPriority.CRITICAL
    elif pre_classification.recommendation == RequestRecommendation.REDIRECT_TO_911:
        priority = RequestPriority.CRITICAL
    elif pre_classification.recommendation == RequestRecommendation.PROCESS_NORMALLY:
        priority = RequestPriority.MEDIUM
    elif (
        pre_classification.recommendation
        == RequestRecommendation.REDIRECT_TO_OTHER_SERVICE
    ):
        priority = RequestPriority.LOW

    return TriageResult(
        is_emergency=pre_classification.is_emergency,
        confidence=0.85,  # Default confidence level
        reasoning=pre_classification.reason,
        priority=priority,
    )
