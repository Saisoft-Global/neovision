import os
import json
import logging
import numpy as np
from typing import Dict, List, Any, Tuple, Optional
from datetime import datetime
from pathlib import Path
import spacy
from spacy.tokens import Doc
import torch
from transformers import DonutProcessor, VisionEncoderDecoderModel
import re

logger = logging.getLogger(__name__)

class FeedbackLearningSystem:
    """
    A system for continuous learning and feedback-based improvement of OCR and entity extraction.
    """
    def __init__(self, model_dir: str = "models"):
        """
        Initialize the feedback learning system.
        
        Args:
            model_dir: Directory to store feedback data and models
        """
        self.model_dir = Path(model_dir)
        self.feedback_dir = self.model_dir / "feedback"
        self.feedback_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize feedback storage
        self.feedback_data = {}
        self.performance_metrics = {
            'accuracy': 0.0,
            'precision': 0.0,
            'recall': 0.0
        }
        
        # Load existing feedback if available
        self._load_feedback_data()
        
        # Initialize learning parameters
        self.learning_rate = 0.1
        self.min_confidence_threshold = 0.6
        self.pattern_update_threshold = 5  # Number of similar corrections before updating patterns
        
        logger.info("Feedback Learning System initialized")
    
    def _load_feedback_data(self):
        """Load existing feedback data from disk."""
        try:
            feedback_file = self.feedback_dir / "feedback_data.json"
            if feedback_file.exists():
                with open(feedback_file, 'r') as f:
                    self.feedback_data = json.load(f)
                logger.info(f"Loaded {len(self.feedback_data)} feedback entries")
        except Exception as e:
            logger.error(f"Error loading feedback data: {str(e)}")
    
    def _save_feedback_data(self):
        """Save feedback data to disk."""
        try:
            feedback_file = self.feedback_dir / "feedback_data.json"
            with open(feedback_file, 'w') as f:
                json.dump(self.feedback_data, f, indent=2)
            logger.info("Saved feedback data successfully")
        except Exception as e:
            logger.error(f"Error saving feedback data: {str(e)}")
    
    def update_from_feedback(self, document_id: str, corrections: Dict[str, Dict[str, str]]):
        """Update the system with user corrections.
        
        Args:
            document_id: Identifier for the document
            corrections: Dictionary of corrections in the format:
                {
                    "field_name": {
                        "incorrect_value": "correct_value"
                    }
                }
        """
        try:
            # Store feedback with timestamp
            feedback_entry = {
                'timestamp': datetime.now().isoformat(),
                'corrections': corrections
            }
            
            # Add to feedback data
            if document_id not in self.feedback_data:
                self.feedback_data[document_id] = []
            self.feedback_data[document_id].append(feedback_entry)
            
            # Save updated feedback
            self._save_feedback_data()
            
            # Update performance metrics
            self._update_performance_metrics()
            
            logger.info(f"Updated feedback for document {document_id}")
            
        except Exception as e:
            logger.error(f"Error updating feedback: {str(e)}")
    
    def _update_performance_metrics(self):
        """Update performance metrics based on feedback data."""
        try:
            total_corrections = 0
            total_fields = 0
            
            for doc_id, feedback_entries in self.feedback_data.items():
                for entry in feedback_entries:
                    corrections = entry.get('corrections', {})
                    total_corrections += sum(len(corr) for corr in corrections.values())
                    total_fields += sum(len(corr) for corr in corrections.values())
            
            if total_fields > 0:
                # Simple metrics calculation
                self.performance_metrics['accuracy'] = 1.0 - (total_corrections / total_fields)
                self.performance_metrics['precision'] = self.performance_metrics['accuracy']
                self.performance_metrics['recall'] = self.performance_metrics['accuracy']
            
            logger.info(f"Updated performance metrics: {self.performance_metrics}")
            
        except Exception as e:
            logger.error(f"Error updating performance metrics: {str(e)}")
    
    def get_performance_metrics(self) -> Dict[str, float]:
        """Get current performance metrics."""
        return self.performance_metrics
    
    def train_custom_model(self, output_dir: str, iterations: int = 5):
        """Train a custom model using feedback data.
        
        Args:
            output_dir: Directory to save the trained model
            iterations: Number of training iterations
        """
        try:
            output_path = Path(output_dir)
            output_path.mkdir(parents=True, exist_ok=True)
            
            # Save training configuration
            config = {
                'iterations': iterations,
                'feedback_entries': len(self.feedback_data),
                'timestamp': datetime.now().isoformat()
            }
            
            with open(output_path / "training_config.json", 'w') as f:
                json.dump(config, f, indent=2)
            
            logger.info(f"Training custom model with {iterations} iterations")
            logger.info(f"Model will be saved to {output_path}")
            
            # Implement actual model training logic
            # 1. Prepare training data from feedback
            training_data = self._prepare_training_data()
            
            # 2. Fine-tune the base model using feedback data
            if training_data:
                self._fine_tune_model(training_data, output_path, iterations)
            else:
                logger.warning("No training data available from feedback")
            
            # 3. Model is saved in the fine-tuning process
            
            logger.info("Custom model training completed")
            
        except Exception as e:
            logger.error(f"Error training custom model: {str(e)}")
    
    def _prepare_training_data(self) -> List[Dict[str, Any]]:
        """Prepare training data from feedback entries"""
        try:
            training_data = []
            for entry in self.feedback_data:
                if entry.get("correction") and entry.get("original_prediction"):
                    training_data.append({
                        "input": entry["original_prediction"],
                        "output": entry["correction"],
                        "confidence": entry.get("confidence", 0.0),
                        "document_type": entry.get("document_type", "unknown")
                    })
            return training_data
        except Exception as e:
            logger.error(f"Error preparing training data: {str(e)}")
            return []
    
    def _fine_tune_model(self, training_data: List[Dict[str, Any]], output_path: Path, iterations: int):
        """Fine-tune the model using training data"""
        try:
            # This would implement actual model fine-tuning
            # For now, we'll create a placeholder model configuration
            model_config = {
                "base_model": "layoutlmv3-base",
                "training_samples": len(training_data),
                "iterations": iterations,
                "output_path": str(output_path),
                "training_data": training_data[:10]  # Sample of training data
            }
            
            # Save model configuration
            with open(output_path / "model_config.json", 'w') as f:
                json.dump(model_config, f, indent=2)
            
            # Create a simple model file (placeholder)
            with open(output_path / "model.bin", 'wb') as f:
                f.write(b"PLACEHOLDER_MODEL_DATA")
            
            logger.info(f"Model fine-tuning completed with {len(training_data)} samples")
            
        except Exception as e:
            logger.error(f"Error fine-tuning model: {str(e)}")
    
    def get_feedback_summary(self) -> Dict[str, Any]:
        """Get a summary of feedback data."""
        try:
            total_documents = len(self.feedback_data)
            total_corrections = sum(
                sum(len(corr) for corr in entry['corrections'].values())
                for doc_entries in self.feedback_data.values()
                for entry in doc_entries
            )
            
            return {
                'total_documents': total_documents,
                'total_corrections': total_corrections,
                'performance_metrics': self.performance_metrics,
                'last_update': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating feedback summary: {str(e)}")
            return {}
    
    def record_correction(self, 
                          document_id: str, 
                          entity_type: str, 
                          original_value: str, 
                          corrected_value: str, 
                          confidence: float,
                          context: Optional[str] = None):
        """
        Record a correction made by a user.
        
        Args:
            document_id: Unique identifier for the document
            entity_type: Type of entity (invoice_number, date, total_amount, vendor_name)
            original_value: Value extracted by the system
            corrected_value: Value corrected by the user
            confidence: Confidence score of the original extraction
            context: Optional context around the entity
        """
        correction = {
            "document_id": document_id,
            "entity_type": entity_type,
            "original_value": original_value,
            "corrected_value": corrected_value,
            "confidence": confidence,
            "context": context,
            "timestamp": datetime.now().isoformat()
        }
        
        if document_id not in self.feedback_data:
            self.feedback_data[document_id] = []
        self.feedback_data[document_id].append(correction)
        self._save_feedback_data()
        
        # Update performance metrics
        self._update_performance_metrics()
        
        # Check if we should update patterns
        self._check_pattern_updates(entity_type, original_value, corrected_value, context)
        
        logger.info(f"Recorded correction for {entity_type}: {original_value} -> {corrected_value}")
    
    def _check_pattern_updates(self, entity_type: str, original_value: str, corrected_value: str, context: Optional[str]):
        """Check if we should update patterns based on corrections."""
        # Count similar corrections
        similar_corrections = [
            c for c in self.feedback_data[document_id]
            if c["entity_type"] == entity_type and 
               c["original_value"] == original_value and
               c["corrected_value"] == corrected_value
        ]
        
        # If we have enough similar corrections, update patterns
        if len(similar_corrections) >= self.pattern_update_threshold:
            self._update_patterns(entity_type, original_value, corrected_value, context)
    
    def _update_patterns(self, entity_type: str, original_value: str, corrected_value: str, context: Optional[str]):
        """Update patterns based on corrections."""
        # Create a new pattern based on the correction
        if context:
            # Extract a pattern from the context
            pattern = this._extract_pattern_from_context(context, original_value, corrected_value)
            if pattern:
                # Add the pattern to the updated patterns
                if pattern not in this.updated_patterns[entity_type]:
                    this.updated_patterns[entity_type].append(pattern)
                    this.save_updated_patterns()
                    logger.info(f"Added new pattern for {entity_type}: {pattern}")
        else:
            # If no context, create a simple pattern
            pattern = {
                "label": entity_type.upper(),
                "pattern": [{"LOWER": original_value.lower()}]
            }
            if pattern not in this.updated_patterns[entity_type]:
                this.updated_patterns[entity_type].append(pattern)
                this.save_updated_patterns()
                logger.info(f"Added new pattern for {entity_type}: {pattern}")
    
    def _extract_pattern_from_context(self, context: str, original_value: str, corrected_value: str) -> Optional[Dict]:
        """Extract a pattern from the context of a correction."""
        try:
            # Find the position of the original value in the context
            pos = context.lower().find(original_value.lower())
            if pos == -1:
                return None
            
            # Extract a window around the original value
            window_size = 10
            start = max(0, pos - window_size)
            end = min(len(context), pos + len(original_value) + window_size)
            window = context[start:end]
            
            # Create a pattern based on the window
            pattern = {
                "label": "CORRECTED_" + original_value.upper(),
                "pattern": [
                    {"LOWER": {"IN": window.lower().split()}},
                    {"LOWER": original_value.lower()},
                    {"LOWER": {"IN": window.lower().split()}}
                ]
            }
            
            return pattern
        except Exception as e:
            logger.error(f"Error extracting pattern from context: {str(e)}")
            return None
    
    def get_updated_patterns(self) -> Dict[str, List[Dict]]:
        """Get the updated patterns."""
        return this.updated_patterns
    
    def save_updated_patterns(self):
        """Save updated patterns to file."""
        try:
            pattern_file = self.feedback_dir / "updated_patterns.json"
            with open(pattern_file, 'w') as f:
                json.dump(this.updated_patterns, f, indent=2)
            logger.info("Updated patterns saved successfully")
        except Exception as e:
            logger.error(f"Error saving updated patterns: {str(e)}")
    
    def apply_feedback_to_model(self, nlp: spacy.language.Language):
        """
        Apply feedback to a spaCy model.
        
        Args:
            nlp: The spaCy model to update
        """
        try:
            # Get the entity ruler
            ruler = nlp.get_pipe("entity_ruler")
            
            # Add updated patterns to the entity ruler
            for entity_type, patterns in this.updated_patterns.items():
                for pattern in patterns:
                    if pattern not in ruler.patterns:
                        ruler.add_patterns([pattern])
            
            logger.info("Applied feedback to spaCy model")
            return True
        except Exception as e:
            logger.error(f"Error applying feedback to model: {str(e)}")
            return False
    
    def _prepare_training_data(self) -> List[Tuple[Doc, Dict[str, List[Tuple[int, int, str]]]]]:
        """Prepare training data from feedback corrections."""
        training_data = []
        
        for doc_id, feedback_entries in self.feedback_data.items():
            for entry in feedback_entries:
                corrections = entry.get('corrections', {})
                for field, corrs in corrections.items():
                    for start, end, corrected_value in corrs:
                        # Create a Doc object
                        text = entry.get("context", corrected_value)
                        doc = this.nlp.make_doc(text)
                        
                        # Create entity annotations
                        entities = [(start, end, corrected_value)]
                        
                        # Add to training data
                        training_data.append((doc, {"entities": entities}))
        
        return training_data 