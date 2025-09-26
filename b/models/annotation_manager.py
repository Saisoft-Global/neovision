from typing import Dict, Any, List
import json
import os
from datetime import datetime
from pathlib import Path

class AnnotationManager:
    def __init__(self, data_dir: str = "data/annotations"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def save_annotation(self, document_id: str, annotations: List[Dict[str, Any]]) -> str:
        """Save document annotations"""
        annotation_file = self.data_dir / f"{document_id}.json"
        
        annotation_data = {
            "document_id": document_id,
            "annotations": annotations,
            "timestamp": datetime.utcnow().isoformat(),
            "status": "pending_review"
        }
        
        with annotation_file.open('w') as f:
            json.dump(annotation_data, f, indent=2)
            
        return str(annotation_file)

    def get_annotation(self, document_id: str) -> Dict[str, Any]:
        """Retrieve document annotations"""
        annotation_file = self.data_dir / f"{document_id}.json"
        
        if not annotation_file.exists():
            return None
            
        with annotation_file.open('r') as f:
            return json.load(f)

    def update_annotation(self, document_id: str, updates: Dict[str, Any]) -> bool:
        """Update existing annotations"""
        annotation_file = self.data_dir / f"{document_id}.json"
        
        if not annotation_file.exists():
            return False
            
        with annotation_file.open('r') as f:
            data = json.load(f)
            
        data.update(updates)
        data["last_modified"] = datetime.utcnow().isoformat()
        
        with annotation_file.open('w') as f:
            json.dump(data, f, indent=2)
            
        return True

    def list_annotations(self, status: str = None) -> List[Dict[str, Any]]:
        """List all annotations with optional status filter"""
        annotations = []
        
        for file in self.data_dir.glob("*.json"):
            with file.open('r') as f:
                data = json.load(f)
                if status is None or data.get("status") == status:
                    annotations.append(data)
                    
        return annotations