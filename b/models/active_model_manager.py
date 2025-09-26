import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime
import torch
from transformers import LayoutLMv3ForTokenClassification, LayoutLMv3Processor

logger = logging.getLogger(__name__)

class ActiveModelManager:
    """Manages the active model for inference"""
    
    def __init__(self, model_dir: str = "models/trained", active_model_file: str = "models/active_model.json"):
        self.model_dir = Path(model_dir)
        self.active_model_file = Path(active_model_file)
        self.active_model_file.parent.mkdir(parents=True, exist_ok=True)
        
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self._active_model = None
        self._active_processor = None
        self._active_model_name = None
        
        # Load active model on initialization
        self._load_active_model()
    
    def _load_active_model(self):
        """Load the active model from disk"""
        try:
            if self.active_model_file.exists():
                with self.active_model_file.open('r') as f:
                    active_info = json.load(f)
                
                model_name = active_info.get("model_name")
                if model_name and self._model_exists(model_name):
                    self._load_model(model_name)
                    logger.info(f"Loaded active model: {model_name}")
                else:
                    logger.warning(f"Active model {model_name} not found, clearing active model")
                    self._clear_active_model()
            else:
                logger.info("No active model file found, will use default behavior")
        except Exception as e:
            logger.error(f"Error loading active model: {e}")
            self._clear_active_model()
    
    def _model_exists(self, model_name: str) -> bool:
        """Check if a model exists"""
        model_path = self.model_dir / model_name
        return model_path.exists() and (model_path / "config.json").exists()
    
    def _load_model(self, model_name: str):
        """Load a specific model into memory"""
        try:
            model_path = self.model_dir / model_name
            
            # Load processor
            processor = LayoutLMv3Processor.from_pretrained(str(model_path))
            
            # Load model
            model = LayoutLMv3ForTokenClassification.from_pretrained(
                str(model_path),
                num_labels=len(self._get_label_map())
            )
            model.to(self.device)
            model.eval()
            
            self._active_model = model
            self._active_processor = processor
            self._active_model_name = model_name
            
            logger.info(f"Successfully loaded model: {model_name}")
            
        except Exception as e:
            logger.error(f"Error loading model {model_name}: {e}")
            self._clear_active_model()
    
    def _clear_active_model(self):
        """Clear the active model from memory"""
        self._active_model = None
        self._active_processor = None
        self._active_model_name = None
    
    def _get_label_map(self) -> Dict[str, int]:
        """Get the label mapping"""
        return {
            "O": 0,
            "B-invoice_number": 1,
            "B-date": 2,
            "B-total_amount": 3,
            "B-tax_amount": 4,
            "B-vendor_name": 5,
            "B-customer_name": 6,
            "B-line_item": 7,
            "B-quantity": 8,
            "B-unit_price": 9,
            "B-description": 10
        }
    
    def set_active_model(self, model_name: str) -> Dict[str, Any]:
        """Set the active model"""
        try:
            if not self._model_exists(model_name):
                return {
                    "success": False,
                    "error": f"Model {model_name} not found"
                }
            
            # Load the model
            self._load_model(model_name)
            
            # Save active model info
            active_info = {
                "model_name": model_name,
                "timestamp": datetime.utcnow().isoformat(),
                "model_path": str(self.model_dir / model_name)
            }
            
            with self.active_model_file.open('w') as f:
                json.dump(active_info, f, indent=2)
            
            logger.info(f"Set active model to: {model_name}")
            
            return {
                "success": True,
                "message": f"Active model set to {model_name}",
                "model_name": model_name,
                "timestamp": active_info["timestamp"]
            }
            
        except Exception as e:
            logger.error(f"Error setting active model: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_active_model(self) -> Dict[str, Any]:
        """Get information about the active model"""
        if self._active_model_name:
            return {
                "active": True,
                "model_name": self._active_model_name,
                "model_path": str(self.model_dir / self._active_model_name),
                "device": self.device,
                "loaded": self._active_model is not None
            }
        else:
            return {
                "active": False,
                "model_name": None,
                "message": "No active model set"
            }
    
    def get_active_model_instance(self) -> Optional[LayoutLMv3ForTokenClassification]:
        """Get the active model instance for inference"""
        return self._active_model
    
    def get_active_processor(self) -> Optional[LayoutLMv3Processor]:
        """Get the active processor instance for inference"""
        return self._active_processor
    
    def clear_active_model(self) -> Dict[str, Any]:
        """Clear the active model"""
        try:
            self._clear_active_model()
            
            # Remove active model file
            if self.active_model_file.exists():
                self.active_model_file.unlink()
            
            logger.info("Cleared active model")
            
            return {
                "success": True,
                "message": "Active model cleared"
            }
            
        except Exception as e:
            logger.error(f"Error clearing active model: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def auto_set_latest_model(self) -> Dict[str, Any]:
        """Automatically set the latest trained model as active"""
        try:
            # Get all trained models
            models = []
            for model_dir in self.model_dir.iterdir():
                if model_dir.is_dir():
                    metadata_file = model_dir / "metadata.json"
                    if metadata_file.exists():
                        with metadata_file.open('r') as f:
                            metadata = json.load(f)
                        models.append({
                            "name": model_dir.name,
                            "timestamp": metadata.get("timestamp", ""),
                            "path": model_dir
                        })
            
            if not models:
                return {
                    "success": False,
                    "error": "No trained models found"
                }
            
            # Sort by timestamp (newest first)
            models.sort(key=lambda x: x["timestamp"], reverse=True)
            latest_model = models[0]["name"]
            
            # Set as active
            return self.set_active_model(latest_model)
            
        except Exception as e:
            logger.error(f"Error auto-setting latest model: {e}")
            return {
                "success": False,
                "error": str(e)
            }
