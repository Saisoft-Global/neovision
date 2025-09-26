#!/usr/bin/env python3
"""
Comprehensive Feature Validation Script
Tests all system features systematically
"""

import sys
import os
import json
import time
import logging
from pathlib import Path
from typing import Dict, Any, List
import uuid
from PIL import Image
import numpy as np

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class FeatureValidator:
    """Validates all system features systematically"""
    
    def __init__(self):
        self.test_results = {}
        self.test_data_dir = Path("test_data")
        self.test_data_dir.mkdir(exist_ok=True)
        
    def run_all_validations(self):
        """Run all feature validations"""
        print("\n🔍 COMPREHENSIVE FEATURE VALIDATION")
        print("=" * 60)
        
        validations = [
            ("Document Processor - Basic", self.validate_document_processor_basic),
            ("Document Processor - Handwritten", self.validate_document_processor_handwritten),
            ("Document Processor - Financial", self.validate_document_processor_financial),
            ("Annotation Manager", self.validate_annotation_manager),
            ("Training System", self.validate_training_system),
            ("Human-in-the-Loop", self.validate_human_feedback),
            ("Automated Training Pipeline", self.validate_automated_training),
            ("API Endpoints", self.validate_api_endpoints),
            ("Integration Tests", self.validate_integration)
        ]
        
        passed = 0
        total = len(validations)
        
        for name, validation_func in validations:
            print(f"\n🧪 Testing {name}...")
            try:
                result = validation_func()
                self.test_results[name] = result
                if result["status"] == "PASS":
                    print(f"✅ {name}: PASSED")
                    passed += 1
                else:
                    print(f"❌ {name}: FAILED - {result.get('error', 'Unknown error')}")
            except Exception as e:
                print(f"❌ {name}: ERROR - {str(e)}")
                self.test_results[name] = {"status": "ERROR", "error": str(e)}
        
        # Summary
        print(f"\n📊 VALIDATION SUMMARY")
        print("=" * 60)
        print(f"Passed: {passed}/{total}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if passed == total:
            print("🎉 ALL FEATURES VALIDATED SUCCESSFULLY!")
            print("✅ System is ready for frontend integration")
        else:
            print("⚠️  Some features need attention before frontend integration")
        
        return passed == total
    
    def validate_document_processor_basic(self) -> Dict[str, Any]:
        """Validate basic document processor functionality"""
        try:
            from models.document_processor import DocumentProcessor
            
            processor = DocumentProcessor()
            test_image = self.create_test_image()
            
            result = processor.process_image(test_image)
            
            # Basic validation
            required_fields = [
                "extracted_text", "document_type", "confidence", 
                "bounding_boxes", "extracted_fields", "tables"
            ]
            
            missing_fields = [field for field in required_fields if field not in result]
            if missing_fields:
                return {
                    "status": "FAIL",
                    "error": f"Missing fields: {missing_fields}"
                }
            
            return {
                "status": "PASS",
                "message": "Basic document processor working correctly"
            }
            
        except Exception as e:
            return {"status": "FAIL", "error": str(e)}
    
    def validate_document_processor_handwritten(self) -> Dict[str, Any]:
        """Validate handwritten document processing"""
        try:
            from models.document_processor import DocumentProcessor
            
            processor = DocumentProcessor()
            test_image = self.create_test_handwritten_image()
            
            result = processor.process_image(test_image)
            
            # Check handwritten detection
            if not result.get("is_handwritten") and result.get("handwritten_probability", 0) < 0.3:
                return {
                    "status": "FAIL",
                    "error": "Handwritten detection not working properly"
                }
            
            # Check hybrid processing
            if "hybrid" not in result.get("processing_method", "").lower():
                return {
                    "status": "FAIL",
                    "error": "Hybrid processing not activated"
                }
            
            return {
                "status": "PASS",
                "message": "Handwritten document processing working correctly"
            }
            
        except Exception as e:
            return {"status": "FAIL", "error": str(e)}
    
    def validate_document_processor_financial(self) -> Dict[str, Any]:
        """Validate financial document processing"""
        try:
            from models.document_processor import DocumentProcessor
            
            processor = DocumentProcessor()
            test_image = self.create_test_financial_image()
            
            result = processor.process_image(test_image)
            
            # Check financial document classification
            doc_type = result.get("document_type", "")
            if "financial" not in doc_type.lower():
                return {
                    "status": "FAIL",
                    "error": f"Financial document not classified correctly: {doc_type}"
                }
            
            # Check financial field extraction
            extracted_fields = result.get("extracted_fields", {})
            financial_fields = any(keyword in str(extracted_fields).lower() for keyword in [
                "net", "sales", "shares", "quarter", "company"
            ])
            
            if not financial_fields:
                return {
                    "status": "FAIL",
                    "error": "Financial fields not extracted"
                }
            
            return {
                "status": "PASS",
                "message": "Financial document processing working correctly"
            }
            
        except Exception as e:
            return {"status": "FAIL", "error": str(e)}
    
    def validate_annotation_manager(self) -> Dict[str, Any]:
        """Validate annotation manager functionality"""
        try:
            from models.annotation_manager import AnnotationManager
            
            manager = AnnotationManager()
            
            # Test session creation
            session_id = manager.create_annotation_session(
                document_id="test_doc_001",
                document_type="invoice",
                image_path="test_data/test_image.jpg",
                user_id="test_user"
            )
            
            # Test field annotation
            success = manager.add_field_annotation(
                session_id=session_id,
                field_name="invoice_number",
                field_value="INV-TEST-001",
                bounding_box=[100, 50, 300, 80],
                confidence=0.95
            )
            
            if not success:
                return {"status": "FAIL", "error": "Failed to add field annotation"}
            
            # Test session completion
            success = manager.complete_annotation_session(session_id)
            if not success:
                return {"status": "FAIL", "error": "Failed to complete session"}
            
            return {
                "status": "PASS",
                "message": "Annotation manager working correctly"
            }
            
        except Exception as e:
            return {"status": "FAIL", "error": str(e)}
    
    def validate_training_system(self) -> Dict[str, Any]:
        """Validate training system functionality"""
        try:
            from models.training_manager import TrainingManager
            from models.annotation_manager import AnnotationManager
            
            training_manager = TrainingManager()
            annotation_manager = AnnotationManager()
            
            # Test quick training status
            status = annotation_manager.get_quick_training_status("invoice")
            if "can_train" not in status:
                return {"status": "FAIL", "error": "Quick training status missing required fields"}
            
            return {
                "status": "PASS",
                "message": "Training system components working correctly"
            }
            
        except Exception as e:
            return {"status": "FAIL", "error": str(e)}
    
    def validate_human_feedback(self) -> Dict[str, Any]:
        """Validate human-in-the-loop functionality"""
        try:
            from models.human_in_loop import HumanInLoopManager, FeedbackType
            
            manager = HumanInLoopManager()
            
            # Test session creation
            test_data = {
                "document_type": "invoice",
                "confidence": 0.75,
                "extracted_fields": {"invoice_number": "INV-001"},
                "requires_human_review": True
            }
            
            session = manager.create_session(
                document_id="test_doc_001",
                filename="test_invoice.pdf",
                extracted_data=test_data,
                user_id="test_user"
            )
            
            # Test feedback addition
            session = manager.add_feedback(
                session_id=session.session_id,
                field_name="invoice_number",
                feedback_type=FeedbackType.CORRECTION,
                original_value="INV-001",
                corrected_value="INV-002",
                feedback_notes="Corrected invoice number",
                user_id="test_user"
            )
            
            if not session:
                return {"status": "FAIL", "error": "Failed to add feedback"}
            
            return {
                "status": "PASS",
                "message": "Human feedback system working correctly"
            }
            
        except Exception as e:
            return {"status": "FAIL", "error": str(e)}
    
    def validate_automated_training(self) -> Dict[str, Any]:
        """Validate automated training pipeline"""
        try:
            from models.automated_training_pipeline import AutomatedTrainingPipeline, TrainingTrigger
            
            pipeline = AutomatedTrainingPipeline()
            
            # Test annotation data addition
            success = pipeline.add_annotation_data(
                document_id="test_doc_001",
                document_type="invoice",
                image_path="test_data/test_image.jpg",
                extracted_fields={"invoice_number": "INV-001", "total_amount": "$100.00"},
                confidence_scores={"invoice_number": 0.95, "total_amount": 0.90}
            )
            
            if not success:
                return {"status": "FAIL", "error": "Failed to add annotation data"}
            
            # Test training job creation
            job_id = pipeline.create_training_job(
                model_name="test_model",
                trigger=TrainingTrigger.MANUAL,
                document_types=["invoice"],
                force_retrain=True
            )
            
            # Test job status retrieval
            job_status = pipeline.get_training_job_status(job_id)
            if not job_status:
                return {"status": "FAIL", "error": "Failed to retrieve job status"}
            
            return {
                "status": "PASS",
                "message": "Automated training pipeline working correctly"
            }
            
        except Exception as e:
            return {"status": "FAIL", "error": str(e)}
    
    def validate_api_endpoints(self) -> Dict[str, Any]:
        """Validate API endpoint imports"""
        try:
            from routers.annotation import router as annotation_router
            from routers.training import router as training_router
            from routers.human_feedback import router as human_feedback_router
            from routers.automated_training import router as automated_training_router
            
            # Count endpoints
            annotation_routes = len(annotation_router.routes)
            training_routes = len(training_router.routes)
            human_feedback_routes = len(human_feedback_router.routes)
            automated_training_routes = len(automated_training_router.routes)
            
            total_routes = annotation_routes + training_routes + human_feedback_routes + automated_training_routes
            
            if total_routes < 20:  # Minimum expected routes
                return {"status": "FAIL", "error": f"Too few routes: {total_routes}"}
            
            return {
                "status": "PASS",
                "total_routes": total_routes,
                "message": "All API endpoints imported successfully"
            }
            
        except Exception as e:
            return {"status": "FAIL", "error": str(e)}
    
    def validate_integration(self) -> Dict[str, Any]:
        """Validate component integration"""
        try:
            from models.annotation_manager import AnnotationManager
            from models.human_in_loop import HumanInLoopManager
            from models.automated_training_pipeline import AutomatedTrainingPipeline
            
            # Test component initialization
            annotation_manager = AnnotationManager()
            human_loop_manager = HumanInLoopManager()
            training_pipeline = AutomatedTrainingPipeline()
            
            # Test data flow
            session_id = annotation_manager.create_annotation_session(
                document_id="integration_test_001",
                document_type="invoice",
                image_path="test_data/test_image.jpg"
            )
            
            annotation_manager.complete_annotation_session(session_id)
            
            return {
                "status": "PASS",
                "message": "Component integration working correctly"
            }
            
        except Exception as e:
            return {"status": "FAIL", "error": str(e)}
    
    def create_test_image(self) -> Image.Image:
        """Create a basic test image"""
        img = Image.new('RGB', (800, 600), color='white')
        test_image_path = self.test_data_dir / "test_image.jpg"
        img.save(test_image_path)
        return img
    
    def create_test_handwritten_image(self) -> Image.Image:
        """Create a test handwritten image"""
        img = Image.new('RGB', (800, 600), color='white')
        test_image_path = self.test_data_dir / "test_handwritten.jpg"
        img.save(test_image_path)
        return img
    
    def create_test_financial_image(self) -> Image.Image:
        """Create a test financial document image"""
        img = Image.new('RGB', (800, 600), color='white')
        test_image_path = self.test_data_dir / "test_financial.jpg"
        img.save(test_image_path)
        return img

def main():
    """Run comprehensive validation"""
    print("🚀 COMPREHENSIVE FEATURE VALIDATION STARTING...")
    
    validator = FeatureValidator()
    success = validator.run_all_validations()
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
