from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from models.feedback_processor import FeedbackProcessor

router = APIRouter()
feedback_processor = FeedbackProcessor()

@router.post("/{document_id}")
async def submit_feedback(document_id: str, feedback: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Submit feedback for document fields"""
    try:
        results = []
        for field_feedback in feedback:
            result = feedback_processor.process_feedback(
                document_id=document_id,
                field_id=field_feedback["fieldId"],
                feedback={
                    "original_value": field_feedback.get("originalValue"),
                    "corrected_value": field_feedback.get("correction"),
                    "confidence": field_feedback.get("confidence", 1.0),
                    "type": "correction" if field_feedback.get("correction") else "validation"
                }
            )
            results.append(result)
        
        return {
            "status": "success",
            "message": f"Processed {len(results)} feedback items",
            "results": results
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing feedback: {str(e)}"
        )

@router.get("/stats/{field_id}")
async def get_field_statistics(field_id: str) -> Dict[str, Any]:
    """Get statistics for a field"""
    try:
        stats = feedback_processor.get_field_statistics(field_id)
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving field statistics: {str(e)}"
        )