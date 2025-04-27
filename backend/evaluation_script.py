#!/usr/bin/env python
"""
Evaluation script for 311 service request processing system.

This script:
1. Reads service request examples from a CSV file
2. Processes each request through the 311 service request pipeline
3. Saves the results to the database
4. Provides a comparison between expected and actual results
"""

import csv
import os
import sys
from pathlib import Path
from typing import Any, dict, list

from dotenv import load_dotenv

from backend.pipeline import process_and_save_request

# Configure paths
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"
EVAL_FILE = DATA_DIR / "evaluation_requests_test.csv"


def process_evaluation_data(csv_path: Path) -> list[dict[str, Any]]:
    """
    Process each raw input from the evaluation CSV through the pipeline and save to DB.

    Args:
        csv_path: Path to the evaluation CSV file

    Returns:
        list of results from processing each request
    """
    results = []

    # Check if file exists
    if not csv_path.exists():
        print(f"Error: Evaluation file not found at {csv_path}")
        sys.exit(1)

    # Read CSV and process each raw_input
    with open(csv_path, encoding="utf-8") as csvfile:
        reader = csv.dictReader(csvfile)

        # Process each row
        for i, row in enumerate(reader, 1):
            raw_input = row.get("raw_input")
            if not raw_input:
                print(f"Warning: Row {i} missing raw_input, skipping...")
                continue

            print(f"Processing request {i}: {raw_input[:50]}...")

            try:
                # Process the request through the pipeline and save to DB
                result = process_and_save_request(raw_input)

                # Add original CSV data for comparison
                result["eval_data"] = {k: v for k, v in row.items() if k != "id"}
                results.append(result)

                print(
                    f"  Processed successfully, request ID: {result.get('id', 'Unknown')}"
                )
                print(f"  Request type: {result.get('request_type', 'Unknown')}")
                print(f"  Department: {result.get('department', 'Unknown')}")
                print(f"  Priority: {result.get('priority', 'Unknown')}")
                print("  " + "-" * 60)

            except Exception as e:
                print(f"  Error processing request {i}: {str(e)}")
                results.append(
                    {
                        "status": "error",
                        "error": str(e),
                        "raw_input": raw_input,
                        "eval_data": {k: v for k, v in row.items() if k != "id"},
                    }
                )

    return results


def compare_results(results: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Compare pipeline results with expected values from evaluation data.

    Args:
        results: list of processing results

    Returns:
        dictionary with comparison metrics
    """
    comparison = {
        "total": len(results),
        "successful": 0,
        "errors": 0,
        "metrics": {
            "request_type_match": 0,
            "department_match": 0,
            "priority_match": 0,
            "is_valid_match": 0,
        },
    }

    for result in results:
        # Check if processing was successful
        if result.get("status") == "success":
            comparison["successful"] += 1

            # Get actual and expected values
            eval_data = result.get("eval_data", {})

            # Compare request type
            if (
                result.get("request_type", "").lower()
                == eval_data.get("request_type", "").lower()
            ):
                comparison["metrics"]["request_type_match"] += 1

            # Compare department
            if (
                result.get("department", "").lower()
                == eval_data.get("department", "").lower()
            ):
                comparison["metrics"]["department_match"] += 1

            # Compare priority
            if (
                result.get("priority", "").lower()
                == eval_data.get("priority", "").lower()
            ):
                comparison["metrics"]["priority_match"] += 1

            # Compare is_valid
            expected_valid = eval_data.get("is_valid", "").lower() == "true"
            actual_valid = not (
                result.get("status") == "error"
                or result.get("database_status") == "error"
            )
            if expected_valid == actual_valid:
                comparison["metrics"]["is_valid_match"] += 1
        else:
            comparison["errors"] += 1

    # Calculate percentages for successful requests
    if comparison["successful"] > 0:
        for metric in comparison["metrics"]:
            comparison["metrics"][f"{metric}_pct"] = round(
                comparison["metrics"][metric] / comparison["successful"] * 100, 2
            )

    return comparison


def main():
    """Main function to run the evaluation script"""
    # Load environment variables
    load_dotenv()

    # Check for required environment variables
    missing_env_vars = []
    for env_var in [
        "OPENAI_API_KEY",
        "DB_HOST",
        "DB_PORT",
        "DB_NAME",
        "DB_USER",
        "DB_PASSWORD",
    ]:
        if not os.environ.get(env_var):
            missing_env_vars.append(env_var)

    if missing_env_vars:
        print(
            f"Error: Missing required environment variables: {', '.join(missing_env_vars)}"
        )
        print("These must be set in your environment or .env file")
        return 1

    print(f"Starting evaluation using data from: {EVAL_FILE}")

    # Process evaluation data
    results = process_evaluation_data(EVAL_FILE)

    # Compare results with expected values
    print("\nGenerating comparison metrics...")
    comparison = compare_results(results)

    # Print summary
    print("\n" + "=" * 80)
    print("EVALUATION SUMMARY")
    print("=" * 80)
    print(f"Total requests processed: {comparison['total']}")
    print(
        f"Successful requests: {comparison['successful']} ({round(comparison['successful'] / comparison['total'] * 100, 2)}%)"
    )
    print(
        f"Failed requests: {comparison['errors']} ({round(comparison['errors'] / comparison['total'] * 100, 2)}%)"
    )
    print("\nMetrics (for successful requests):")

    for metric, value in comparison["metrics"].items():
        if not metric.endswith("_pct"):
            print(
                f"  {metric.replace('_', ' ').title()}: {value}/{comparison['successful']} ({comparison['metrics'].get(f'{metric}_pct', 0)}%)"
            )

    return 0


if __name__ == "__main__":
    sys.exit(main())
