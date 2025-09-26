from typing import Dict, Any, List
import json
from datetime import datetime
import os

class FeedbackProcessor:
    """Process and store user feedback for model improvement"""
    
    def __init__(self, feedback_dir: str = "data/feedback"):
        self.feedback_dir = feedback_dir
        os.makedirs(feedback_dir, exist_ok=True)
        
    def process_feedback(self, document_id: str, field_id: str, feedback: Dict[str, Any]) -> Dict[str, Any]:
        """Process and store user feedback"""
        feedback_data = {
            "document_id": document_id,
            "field_id": field_id,
            "original_value": feedback["original_value"],
            "corrected_value": feedback.get("corrected_value"),
            "confidence": feedback.get("confidence", 1.0),
            "timestamp": datetime.utcnow().isoformat(),
            "feedback_type": feedback.get("type", "correction")
        }
        
        # Store feedback
        self._store_feedback(feedback_data)
        
        # Update field statistics
        self._update_field_stats(field_id, feedback_data)
        
        return feedback_data
    
    def get_field_statistics(self, field_id: str) -> Dict[str, Any]:
        """Get statistics for a specific field"""
        stats_file = os.path.join(self.feedback_dir, f"field_stats_{field_id}.json")
        
        if os.path.exists(stats_file):
            with open(stats_file, "r") as f:
                return json.load(f)
        
        return {
            "field_id": field_id,
            "total_corrections": 0,
            "accuracy": 1.0,
            "common_corrections": {},
            "trend": "stable"
        }
    
    def _store_feedback(self, feedback_data: Dict[str, Any]):
        """Store feedback data"""
        feedback_file = os.path.join(
            self.feedback_dir,
            f"feedback_{feedback_data['document_id']}.json"
        )
        
        existing_feedback = []
        if os.path.exists(feedback_file):
            with open(feedback_file, "r") as f:
                existing_feedback = json.load(f)
        
        existing_feedback.append(feedback_data)
        
        with open(feedback_file, "w") as f:
            json.dump(existing_feedback, f, indent=2)
    
    def _update_field_stats(self, field_id: str, feedback_data: Dict[str, Any]):
        """Update statistics for field"""
        stats = self.get_field_statistics(field_id)
        
        # Update total corrections
        stats["total_corrections"] += 1
        
        # Update accuracy
        is_correct = (
            feedback_data["feedback_type"] == "validation" or
            feedback_data["original_value"] == feedback_data["corrected_value"]
        )
        total = stats["total_corrections"]
        prev_accuracy = stats["accuracy"]
        stats["accuracy"] = (prev_accuracy * (total - 1) + (1 if is_correct else 0)) / total
        
        # Update trend
        if total > 1:
            stats["trend"] = (
                "up" if stats["accuracy"] > prev_accuracy
                else "down" if stats["accuracy"] < prev_accuracy
                else "stable"
            )
        
        # Update common corrections
        if not is_correct and feedback_data["corrected_value"]:
            original = feedback_data["original_value"]
            corrected = feedback_data["corrected_value"]
            key = f"{original} → {corrected}"
            stats["common_corrections"][key] = stats["common_corrections"].get(key, 0) + 1
        
        # Save updated stats
        stats_file = os.path.join(self.feedback_dir, f"field_stats_{field_id}.json")
        with open(stats_file, "w") as f:
            json.dump(stats, f, indent=2)