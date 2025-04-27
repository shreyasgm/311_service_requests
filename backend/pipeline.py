import argparse
import json
import os
import uuid
from datetime import datetime
from typing import Any

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

from backend.classify_311 import (
    PreClassificationResult,
    create_triage_result,
    pre_classify_request,
)
from backend.data_models import (
    ClassificationResult,
    Department,
    GeocodingResult,
    GeoLocation,
    LLMProcessingResult,
    ProcessedServiceRequest,
    RequestStatus,
    RequestType,
    ValidationResult,
)
from backend.extractor import ServiceRequest, extract_311_request


def get_db_connection():
    """
    Create a connection to the database using direct parameter passing.

    Returns:
        psycopg2.connection: Database connection
    """
    load_dotenv()

    # Get individual connection parameters
    db_host = os.environ.get("DB_HOST")
    db_port = os.environ.get("DB_PORT")
    db_name = os.environ.get("DB_NAME")
    db_user = os.environ.get("DB_USER")
    db_password = os.environ.get("DB_PASSWORD")
    connection_string = os.environ.get("SUPABASE_CONNECTION_STRING")

    # Check if all required parameters are present
    if not all([db_host, db_port, db_name, db_user, db_password]):
        missing_params = []
        if not db_host:
            missing_params.append("DB_HOST")
        if not db_port:
            missing_params.append("DB_PORT")
        if not db_name:
            missing_params.append("DB_NAME")
        if not db_user:
            missing_params.append("DB_USER")
        if not db_password:
            missing_params.append("DB_PASSWORD")
        raise ValueError(
            f"Missing required database parameters: {', '.join(missing_params)}"
        )

    conn = None  # Initialize connection variable
    try:
        # Attempt to establish the connection
        print(
            f"Attempting to connect to database '{db_name}' on '{db_host}:{db_port}'..."
        )
        conn = psycopg2.connect(
            host=db_host,
            database=db_name,
            user=db_user,
            password=db_password,
            port=db_port,
        )
        print("Connection established. Verifying...")

        # Verify the connection is alive and working by executing a simple query
        # Use 'with' statement for cursor to ensure it's closed automatically
        with conn.cursor() as cur:
            cur.execute("SELECT 1;")  # Simple, standard check
            # Optionally fetch the result if needed, but execution alone confirms connectivity
            # result = cur.fetchone()
            # print(f"Verification query result: {result}")

        print("Database connection verified successfully.")
        # Return the active connection object
        return conn

    except psycopg2.Error as e:
        # Handle specific psycopg2 errors (connection, credentials, etc.)
        print(f"Database Error: {e}")
        # Close the connection if it was partially opened before the error occurred
        if conn:
            conn.close()
            print("Database connection closed due to error.")
        # Raise a more general ConnectionError, wrapping the original exception
        raise ConnectionError(f"Failed to connect to or verify database: {e}") from e

    except Exception as e:
        # Handle any other unexpected errors during the process
        print(f"An unexpected error occurred: {e}")
        if conn:
            conn.close()
            print("Database connection closed due to unexpected error.")
        # Re-raise the exception, possibly wrapped in ConnectionError for consistency
        raise ConnectionError(
            f"An unexpected error occurred during DB connection: {e}"
        ) from e


def convert_to_processed_service_request(
    conversation: str,
    classification: PreClassificationResult,
    request_data: ServiceRequest | None = None,
) -> ProcessedServiceRequest:
    """
    Convert the classification and request data into a ProcessedServiceRequest.

    Args:
        conversation: The raw user input
        classification: The pre-classification result
        request_data: Optional extracted service request data

    Returns:
        ProcessedServiceRequest: Processed request conforming to our data model
    """
    # Create triage result from classification
    triage = create_triage_result(classification)

    # Determine validation result
    validation = ValidationResult(
        is_valid=(
            classification.belongs_in_311
            and classification.recommendation != "REDIRECT_TO_911"
        ),
        confidence=0.85,
        reasoning=classification.reason,
        invalid_reason=None if classification.belongs_in_311 else classification.reason,
    )

    # Create summary
    summary = "Unknown request"
    if request_data:
        summary = request_data.description

    # For non-valid requests, set validation.is_valid=False to avoid the classification validation error
    if not validation.is_valid:
        # Initialize with required fields but mark as invalid to skip classification requirement
        processed_request = ProcessedServiceRequest(
            raw_input=conversation,
            summary=summary,
            triage=triage,
            validation=validation,
            status=RequestStatus.INVALID,  # Use INVALID status
        )
        return processed_request

    # For valid requests, we need to ensure we have classification data
    if not request_data:
        # If we don't have request data but need to create a valid request, use default classification
        department = Department(name="Unknown", description="Department not identified")
        request_type = RequestType(
            name="General Request", description="Request type not identified"
        )

        classification_result = ClassificationResult(
            request_type=request_type,
            department=department,
            confidence=0.5,  # Low confidence since this is a default
            reasoning="Unable to determine specific classification from user input.",
            alternative_classifications=None,
        )

        # Initialize with required fields, including classification
        processed_request = ProcessedServiceRequest(
            raw_input=conversation,
            summary=summary,
            triage=triage,
            validation=validation,
            classification=classification_result,  # Include default classification
            status=RequestStatus.NEW,
        )

        return processed_request

    # Normal case - valid request with request data
    # Create department from request data
    department = Department(name=request_data.service_type, description=None)

    # Create request type from request data
    request_type = RequestType(name=request_data.service_subtype, description=None)

    # Create classification result
    classification_result = ClassificationResult(
        request_type=request_type,
        department=department,
        confidence=0.8,
        reasoning=f"Based on the user's description, this appears to be a {request_data.service_subtype} issue handled by {request_data.service_type}.",
        alternative_classifications=None,
    )

    # Initialize with required fields including classification
    processed_request = ProcessedServiceRequest(
        raw_input=conversation,
        summary=summary,
        triage=triage,
        validation=validation,
        classification=classification_result,  # Always include classification for valid requests
        status=RequestStatus.NEW,
    )

    # Create geolocation if we have address data
    if request_data.location_address and request_data.location_address != "Unknown":
        # Simple geocoding (in a real implementation, we would use a geocoding service)
        location = GeoLocation(
            latitude=None,
            longitude=None,
            address=request_data.location_address,
            neighborhood=None,
            city="Boston",
            state="MA",
            zip_code=None,
        )

        geocoding = GeocodingResult(
            location=location,
            confidence=0.7,
            reasoning=f"Address provided by user: {request_data.location_address}",
        )

        processed_request.geocoding = geocoding

    return processed_request


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

    # Step 2: Determine action path
    if classification.recommendation == "REDIRECT_TO_911":
        return {
            "status": "emergency",
            "action": "Please call 911 immediately. This requires emergency services.",
            "reason": classification.reason,
            "classification": classification.model_dump(),
        }

    elif classification.recommendation == "REDIRECT_TO_OTHER_SERVICE":
        return {
            "status": "non_311",
            "action": "This issue should be directed to another service provider.",
            "reason": classification.reason,
            "classification": classification.model_dump(),
        }

    elif classification.recommendation == "EXPEDITE":
        # Step 3: For emergency issues that can still be handled by 311
        request_data = extract_311_request(conversation)
        if request_data:
            # Convert Pydantic model to dict and then modify
            request_dict = request_data.model_dump()
            request_dict["priority"] = "URGENT"  # Override the priority
            request_dict["classification"] = classification.model_dump()
            request_dict["status"] = "expedited"
            return request_dict
        else:
            return {
                "status": "error",
                "message": "Failed to extract request details, but this appears to be an urgent 311 matter.",
                "classification": classification.model_dump(),
            }

    elif classification.recommendation == "PROCESS_NORMALLY":
        # Step 3: For normal 311 requests
        request_data = extract_311_request(conversation)
        if request_data:
            # Convert Pydantic model to dict and then modify
            request_dict = request_data.model_dump()
            request_dict["classification"] = classification.model_dump()
            request_dict["status"] = "normal"
            return request_dict
        else:
            return {
                "status": "error",
                "message": "Failed to extract request details.",
                "classification": classification.model_dump(),
            }

    else:
        # Fallback for unexpected classification outcomes
        return {
            "status": "error",
            "message": "Could not determine how to process this request.",
            "classification": classification.model_dump(),
        }


def save_to_database(
    request: ProcessedServiceRequest,
) -> tuple[str, dict[str, Any]]:
    """
    Save the processed service request to the database.

    Args:
        request: The processed service request

    Returns:
        tuple: (request_id, metadata) with the database ID and additional metadata
    """
    request_id = str(uuid.uuid4())
    metadata = {"created_at": datetime.now().isoformat()}

    try:
        # Create DB connection
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        try:
            # Start a transaction
            # Get status ID based on our enum status
            status_name = request.status.value.capitalize()
            cursor.execute("SELECT id FROM statuses WHERE name = %s", (status_name,))
            result = cursor.fetchone()
            status_id = result[0] if result else None

            if not status_id:
                # Default to 'New' if not found
                cursor.execute("SELECT id FROM statuses WHERE name = 'New'")
                result = cursor.fetchone()
                status_id = result[0] if result else None

            # Get priority ID based on triage result
            priority_name = request.triage.priority.value.capitalize()
            cursor.execute(
                "SELECT id FROM priorities WHERE name = %s", (priority_name,)
            )
            result = cursor.fetchone()
            priority_id = result[0] if result else None

            if not priority_id:
                # Default to 'Medium' if not found
                cursor.execute("SELECT id FROM priorities WHERE name = 'Medium'")
                result = cursor.fetchone()
                priority_id = result[0] if result else None

            # Extract department and request type if available
            department_id = None
            request_type_id = None

            if request.classification:
                # Try to find the department in the database
                cursor.execute(
                    "SELECT id FROM departments WHERE name ILIKE %s",
                    (request.classification.department.name,),
                )
                result = cursor.fetchone()
                department_id = result[0] if result else None

                # If not found, create a new department
                if not department_id:
                    cursor.execute(
                        """
                        INSERT INTO departments (name, description)
                        VALUES (%s, %s)
                        RETURNING id
                        """,
                        (
                            request.classification.department.name,
                            request.classification.department.description,
                        ),
                    )
                    department_id = cursor.fetchone()[0]

                # Try to find the request type in the database
                cursor.execute(
                    "SELECT id FROM request_types WHERE name ILIKE %s",
                    (request.classification.request_type.name,),
                )
                result = cursor.fetchone()
                request_type_id = result[0] if result else None

                # If not found, create a new request type
                if not request_type_id:
                    cursor.execute(
                        """
                        INSERT INTO request_types (name, description)
                        VALUES (%s, %s)
                        RETURNING id
                        """,
                        (
                            request.classification.request_type.name,
                            request.classification.request_type.description,
                        ),
                    )
                    request_type_id = cursor.fetchone()[0]

                # Ensure we have a mapping between request type and department
                cursor.execute(
                    """
                    SELECT 1 FROM request_type_department_mapping
                    WHERE request_type_id = %s AND department_id = %s
                    """,
                    (request_type_id, department_id),
                )
                mapping_exists = cursor.fetchone() is not None

                if not mapping_exists:
                    # Create a mapping and mark it as primary
                    cursor.execute(
                        """
                        INSERT INTO request_type_department_mapping
                        (request_type_id, department_id, is_primary)
                        VALUES (%s, %s, TRUE)
                        """,
                        (request_type_id, department_id),
                    )

            # Extract location data if available
            latitude = None
            longitude = None
            address = None

            if request.geocoding and request.geocoding.location:
                loc = request.geocoding.location
                latitude = loc.latitude
                longitude = loc.longitude
                address = loc.address

            # Insert the service request
            cursor.execute(
                """
                INSERT INTO service_requests (
                    id, raw_input, summary, request_type_id, 
                    department_id, status_id, priority_id,
                    latitude, longitude, address, 
                    is_emergency, is_valid
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                """,
                (
                    request_id,
                    request.raw_input,
                    request.summary,
                    request_type_id,
                    department_id,
                    status_id,
                    priority_id,
                    latitude,
                    longitude,
                    address,
                    request.triage.is_emergency,
                    request.validation.is_valid,
                ),
            )

            # Save AI analysis results
            cursor.execute(
                """
                INSERT INTO ai_analysis_results (
                    service_request_id, 
                    triage_result, 
                    validation_result,
                    classification_result,
                    geocoding_result,
                    confidence_scores
                ) VALUES (
                    %s, %s, %s, %s, %s, %s
                ) RETURNING id
                """,
                (
                    request_id,
                    json.dumps(request.triage.model_dump()),
                    json.dumps(request.validation.model_dump()),
                    json.dumps(
                        request.classification.model_dump()
                        if request.classification
                        else {}
                    ),
                    json.dumps(
                        request.geocoding.model_dump() if request.geocoding else {}
                    ),
                    json.dumps(
                        {
                            "overall": 0.85,
                            "triage": request.triage.confidence,
                            "validation": request.validation.confidence,
                            "classification": request.classification.confidence
                            if request.classification
                            else 0.0,
                            "geocoding": request.geocoding.confidence
                            if request.geocoding
                            else 0.0,
                        }
                    ),
                ),
            )
            ai_analysis_id = cursor.fetchone()[0]
            metadata["ai_analysis_id"] = ai_analysis_id

            # Commit the transaction
            conn.commit()

        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()

        return request_id, metadata

    except Exception as e:
        print(f"Error saving to database: {str(e)}")
        # Re-raise to be handled by the caller
        raise


def process_and_save_request(conversation: str) -> dict[str, Any]:
    """
    Process a 311 request and save it to the database.

    Args:
        conversation: The user's 311 service request message

    Returns:
        dict: The processed result with database ID if successful
    """
    # Step 1: Pre-classify
    classification = pre_classify_request(conversation)

    # Step 2: If this isn't a valid 311 request, we can just process it without saving
    if classification.recommendation in [
        "REDIRECT_TO_911",
        "REDIRECT_TO_OTHER_SERVICE",
    ]:
        return pipeline_311(conversation)

    # Step 3: Extract data for valid 311 requests
    request_data = extract_311_request(conversation)
    if not request_data:
        return {
            "status": "error",
            "message": "Failed to extract request details from a valid 311 request.",
            "classification": classification.model_dump(),
        }

    # Step 4: Create a properly structured ProcessedServiceRequest
    processed_request = convert_to_processed_service_request(
        conversation, classification, request_data
    )

    # Step 5: Create an LLMProcessingResult to wrap the request with metadata
    llm_result = LLMProcessingResult(
        processed_request=processed_request,
        confidence_score=0.85,  # Default overall confidence
        processing_metadata={
            "model": "gpt-4o",
            "processing_time_ms": 1500,  # Placeholder
            "version": "1.0.0",
        },
        error_messages=[],
        suggestions=None,
    )

    # Step 6: Save to database and get the ID
    try:
        request_id, metadata = save_to_database(processed_request)

        # Create result for the API response
        result = {
            "id": request_id,
            "status": "success",
            "database_status": "saved",
            "requires_human_review": llm_result.requires_human_review,
            "is_actionable": processed_request.is_actionable,
            "summary": processed_request.summary,
            "created_at": metadata.get("created_at"),
            # Add other fields as needed
        }

        # Add classification info if available
        if processed_request.classification:
            result["department"] = processed_request.classification.department.name
            result["request_type"] = processed_request.classification.request_type.name

        # Add priority info
        result["priority"] = processed_request.triage.priority.value
        result["is_emergency"] = processed_request.triage.is_emergency

        # Add location info if available
        if processed_request.geocoding and processed_request.geocoding.location:
            result["location"] = {
                "address": processed_request.geocoding.location.address,
                "latitude": processed_request.geocoding.location.latitude,
                "longitude": processed_request.geocoding.location.longitude,
            }

        return result

    except Exception as e:
        # Handle database errors
        error_msg = f"Failed to save request to database: {str(e)}"
        print(error_msg)
        return {
            "status": "error",
            "database_status": "error",
            "message": error_msg,
            "summary": processed_request.summary if processed_request else "Unknown",
            "is_emergency": processed_request.triage.is_emergency
            if processed_request
            else False,
            "is_valid": processed_request.validation.is_valid
            if processed_request
            else False,
        }


def main():
    """Main function for the CLI tool"""
    # Load environment variables
    load_dotenv()

    # Check for required environment variables
    if not os.environ.get("OPENAI_API_KEY"):
        print("Error: OPENAI_API_KEY not found in environment variables")
        print("This must be set in your environment or .env file")
        return 1

    # Create argument parser
    parser = argparse.ArgumentParser(
        description="Boston 311 Service Request Processing CLI"
    )

    # Add arguments
    parser.add_argument("message", help="The user's 311 service request message")
    parser.add_argument(
        "--save-to-db", action="store_true", help="Save the result to the database"
    )

    # Parse arguments
    args = parser.parse_args()

    # If saving to DB, verify DB connection parameters are available
    if args.save_to_db:
        missing_db_params = []
        for param in ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"]:
            if not os.environ.get(param):
                missing_db_params.append(param)

        if missing_db_params:
            print(
                f"Error: Missing required database parameters: {', '.join(missing_db_params)}"
            )
            print(
                "These must be set in your environment or .env file when using --save-to-db"
            )
            return 1

    try:
        if args.save_to_db:
            # Process and save to DB
            try:
                result = process_and_save_request(args.message)
            except Exception as e:
                import traceback

                print(f"Error processing and saving request: {str(e)}")
                traceback.print_exc()
                return 1
        else:
            # Just process without saving
            result = pipeline_311(args.message)

        # Print formatted JSON output
        print(json.dumps(result, indent=2))
        return 0
    except Exception as e:
        print(f"Error processing request: {str(e)}")
        return 1


if __name__ == "__main__":
    import sys

    sys.exit(main())
