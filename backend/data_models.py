from datetime import datetime
from enum import Enum
from typing import Any
from pydantic import BaseModel, Field, model_validator


class UserInput(BaseModel):
    """Raw user input model - this is what comes in from the user"""

    text: str

# Service request supplemental data models

class RequestPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RequestStatus(str, Enum):
    NEW = "new"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"
    INVALID = "invalid"


class Department(BaseModel):
    name: str
    description: str | None = None


class RequestType(BaseModel):
    name: str
    description: str | None = None


class GeoLocation(BaseModel):
    latitude: float | None = None
    longitude: float | None = None
    address: str | None = None
    neighborhood: str | None = None
    city: str = "Boston"
    state: str = "MA"
    zip_code: str | None = None


# Service request


class ValidationResult(BaseModel):
    is_valid: bool
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str
    invalid_reason: str | None = None


class TriageResult(BaseModel):
    is_emergency: bool
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str
    priority: RequestPriority = RequestPriority.MEDIUM


class ClassificationResult(BaseModel):
    request_type: RequestType
    department: Department
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str
    alternative_classifications: list[dict[str, Any]] | None = None


class GeocodingResult(BaseModel):
    location: GeoLocation
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str


# Processed service request

class ProcessedServiceRequest(BaseModel):
    """This is the fully processed result from the LLM pipeline"""

    raw_input: str
    summary: str
    triage: TriageResult
    validation: ValidationResult
    classification: ClassificationResult | None = None
    geocoding: GeocodingResult | None = None
    created_at: datetime = Field(default_factory=datetime.now)
    status: RequestStatus = RequestStatus.NEW

    @model_validator(mode='after')
    def validate_classification_presence(cls, values):
        validation = values.get("validation")
        classification = values.get("classification")

        # If request is valid, it must have a classification
        if validation and validation.is_valid and not classification:
            raise ValueError("Valid requests must include classification information")

        return values

    @property
    def is_actionable(self) -> bool:
        """Determines if this service request can be actioned by city services"""
        return (
            not self.triage.is_emergency
            and self.validation.is_valid
            and self.classification is not None
        )

# Dashboard / report models

class DepartmentSummary(BaseModel):
    """Summary statistics for a department's service requests"""

    department_name: str
    total_requests: int
    requests_by_type: dict[str, int]
    requests_by_status: dict[str, int]
    avg_resolution_time_hours: float | None = None


class GeospatialRequestView(BaseModel):
    """Model for map view of service requests"""

    summary: str
    request_type: str
    department: str
    status: str
    location: GeoLocation
    created_at: datetime


class ServiceRequestDashboard(BaseModel):
    """Overall dashboard model for service requests"""

    total_requests: int
    requests_by_department: dict[str, int]
    requests_by_type: dict[str, int]
    requests_by_status: dict[str, int]
    requests_by_priority: dict[str, int]
    recent_requests: list[ProcessedServiceRequest]
    geospatial_view: list[GeospatialRequestView]


class LLMProcessingResult(BaseModel):
    """The complete output from the LLM processing pipeline"""

    processed_request: ProcessedServiceRequest
    confidence_score: float = Field(ge=0.0, le=1.0)
    processing_metadata: dict[str, Any] = Field(default_factory=dict)
    error_messages: list[str] = Field(default_factory=list)
    suggestions: str | None = None

    @property
    def requires_human_review(self) -> bool:
        """Determines if this request needs human review based on confidence scores"""
        if self.confidence_score < 0.7:
            return True
        if (
            self.processed_request.validation.is_valid
            and self.processed_request.validation.confidence < 0.8
        ):
            return True
        if (
            self.processed_request.classification
            and self.processed_request.classification.confidence < 0.75
        ):
            return True
        return False
