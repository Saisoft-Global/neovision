from typing import Dict, Any, List
import re

class TemplateProcessor:
    """Process extracted fields using document templates"""
    
    def apply_template(self, extraction_result: Dict[str, Any], template: Dict[str, Any]) -> Dict[str, Any]:
        """Apply template rules to extraction results"""
        processed_fields = []
        
        for field in extraction_result["fields"]:
            # Find matching template field
            template_field = next(
                (tf for tf in template["fields"] if tf["label"].lower() == field["label"].lower()),
                None
            )
            
            if template_field:
                # Validate and process field based on template rules
                processed_field = self._process_field(field, template_field)
                if processed_field:
                    processed_fields.append(processed_field)
            else:
                # Keep fields not defined in template
                processed_fields.append(field)
        
        # Add missing required fields from template
        self._add_missing_fields(processed_fields, template["fields"])
        
        return {
            **extraction_result,
            "fields": processed_fields,
            "template_id": template["id"]
        }
    
    def _process_field(self, field: Dict[str, Any], template_field: Dict[str, Any]) -> Dict[str, Any]:
        """Process individual field based on template rules"""
        processed = field.copy()
        
        # Apply field type validation
        if template_field["type"] == "number":
            try:
                float(field["value"])
            except ValueError:
                processed["confidence"] *= 0.5
                
        elif template_field["type"] == "date":
            if not self._is_valid_date(field["value"]):
                processed["confidence"] *= 0.5
                
        elif template_field["type"] == "currency":
            if not self._is_valid_currency(field["value"]):
                processed["confidence"] *= 0.5
        
        # Apply regex validation if specified
        if template_field.get("regex"):
            try:
                if not re.match(template_field["regex"], field["value"]):
                    processed["confidence"] *= 0.5
            except re.error:
                pass  # Invalid regex pattern
        
        return processed
    
    def _add_missing_fields(self, processed_fields: List[Dict[str, Any]], template_fields: List[Dict[str, Any]]):
        """Add missing required fields from template"""
        existing_labels = {f["label"].lower() for f in processed_fields}
        
        for template_field in template_fields:
            if template_field["required"] and template_field["label"].lower() not in existing_labels:
                processed_fields.append({
                    "id": f"missing_{template_field['id']}",
                    "label": template_field["label"],
                    "value": "",
                    "confidence": 0.0,
                    "missing": True
                })
    
    def _is_valid_date(self, value: str) -> bool:
        """Validate date format"""
        date_patterns = [
            r'\d{4}-\d{2}-\d{2}',
            r'\d{2}/\d{2}/\d{4}',
            r'\d{2}-\d{2}-\d{4}'
        ]
        return any(re.match(pattern, value) for pattern in date_patterns)
    
    def _is_valid_currency(self, value: str) -> bool:
        """Validate currency format"""
        return bool(re.match(r'^\$?\s*\d+(?:,\d{3})*\.?\d*$', value))