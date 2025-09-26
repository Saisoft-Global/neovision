#!/usr/bin/env python3
"""
System Feature Validation Script
Validates each feature systematically to ensure everything works properly
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

class SystemValidator:
    """Validates all system features systematically"""
    
    def __init__(self):
        self.test_results = {}
        self.test_data_dir = Path("test_data")
        self.test_data_dir.mkdir(exist_ok=True)
        
    def run_all_validations(self):
        """Run all feature validations"""
        print("\n🔍 SYSTEM FEATURE VALIDATION")
        print("=" * 60)
        
        validations = [
            ("Document Processor", self.validate_document_processor),
            ("Enhanced Annotation Manager", self.validate_annotation_manager),
            ("Enhanced Training System", self.validate_training_system),
            ("Human-in-the-Loop System", self.validate_human_feedback),
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
        else:
            print("⚠️  Some features need attention.")
        
        return passed == total
    
    def validate_document_processor(self) -> Dict[str, Any]:
        """Validate document processor functionality"""
        try:
            from models.document_processor import DocumentProcessor
            
            # Initialize processor
            processor = DocumentProcessor()
            print("  ✅ DocumentProcessor initialized successfully")
            
            # Test image creation
            test_image = self.create_test_image()
            print("  ✅ Test image created")
            
            # Test hybrid OCR processing
            result = processor.process_image(test_image)
            print("  ✅ Image processing completed")
            
            # Validate result structure
            required_fields = [
                "extracted_text", "document_type", "confidence", 
                "bounding_boxes", "extracted_fields", "tables",
                "is_handwritten", "handwritten_probability", "ocr_confidence"
            ]
            
            missing_fields = [field for field in required_fields if field not in result]
            if missing_fields:
                return {
                    "status": "FAIL",
                    "error": f"Missing fields in result: {missing_fields}",
                    "result": result
                }
            
            # Test handwritten detection
            if "is_handwritten" in result:
                print(f"  ✅ Handwritten detection: {result['is_handwritten']}")
            
            # Test field extraction
            if result.get("extracted_fields"):
                print(f"  ✅ Field extraction: {len(result['extracted_fields'])} fields")
            else:
                print("  ⚠️  No fields extracted (expected for test image)")
            
            return {
                "status": "PASS",
                "result": result,
                "message": "Document processor working correctly"
            }
            
        except Exception as e:
            return {"status": "FAIL", "error": str(e)}
    
    def validate_annotation_manager(self) -> Dict[str, Any]:
        """Validate enhanced annotation manager"""
        try:
            from models.annotation_manager import AnnotationManager
            
            # Initialize manager
            manager = AnnotationManager()
            print("  ✅ AnnotationManager initialized successfully")
            
            # Test document templates
            templates = manager.get_document_templates()
            if not templates:
                return {"status": "FAIL", "error": "No document templates loaded"}
            print(f"  ✅ Document templates loaded: {list(templates.keys())}")
            
            # Test session creation
            session_id = manager.create_annotation_session(
                document_id="test_doc_001",
                document_type="invoice",
                image_path="test_data/test_image.jpg",
                user_id="test_user"
            )
            print(f"  ✅ Annotation session created: {session_id}")
            
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
            print("  ✅ Field annotation added successfully")
            
            # Test session retrieval
            session_data = manager.get_annotation_session(session_id)
            if not session_data:
                return {"status": "FAIL", "error": "Failed to retrieve session data"}
            print("  ✅ Session data retrieved successfully")
            
            # Test session completion
            success = manager.complete_annotation_session(session_id)
            if not success:
                return {"status": "FAIL", "error": "Failed to complete session"}
            print("  ✅ Session completed successfully")
            
            # Test statistics
            stats = manager.get_annotation_statistics()
            if "total_sessions" not in stats:
                return {"status": "FAIL", "error": "Statistics missing required fields"}
            print("  ✅ Statistics retrieved successfully")
            
            return {
                "status": "PASS",
                "session_id": session_id,
                "statistics": stats,
                "message": "Annotation manager working correctly"
            }
            
        except Exception as e:
            return {"status": "FAIL", "error": str(e)}
    
    def validate_training_system(self) -> Dict[str, Any]:
        """Validate enhanced training system"""
        try:
            from models.training_manager import TrainingManager
            from models.annotation_manager import AnnotationManager
            
            # Initialize managers
            training_manager = TrainingManager()
            annotation_manager = AnnotationManager()
            print("  ✅ Training and annotation managers initialized")
            
            # Create test training data
            test_training_data = self.create_test_training_data()
            print("  ✅ Test training data created")
            
            # Test quick training status
            status = annotation_manager.get_quick_training_status("invoice")
            if "can_train" not in status:
                return {"status": "FAIL", "error": "Quick training status missing required fields"}
            print("  ✅ Quick training status retrieved")
            
            # Test training manager initialization
            if not hasattr(training_manager, 'train_model'):
                return {"status": "FAIL", "error": "TrainingManager missing train_model method"}
            print("  ✅ TrainingManager has required methods")
            
            # Test dataset creation (without actual training)
            if hasattr(training_manager, '_get_label_map'):
                label_map = training_manager._get_label_map()
                print(f"  ✅ Label mapping available: {len(label_map)} labels")
            
            return {
                "status": "PASS",
                "training_data": len(test_training_data),
                "message": "Training system components working correctly"
            }
            
        except Exception as e:
            return {"status": "FAIL", "error": str(e)}
    
    def validate_human_feedback(self) -> Dict[str, Any]:
        """Validate human-in-the-loop system"""
        try:
            from models.human_in_loop import HumanInLoopManager, FeedbackType, DocumentStatus
            
            # Initialize manager
            manager = HumanInLoopManager()
            print("  ✅ HumanInLoopManager initialized successfully")
            
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
            print(f"  ✅ Human feedback session created: {session.session_id}")
            
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
            print("  ✅ Feedback added successfully")
            
            # Test session status update
            session = manager.update_session_status(
                session.session_id, 
                DocumentStatus.APPROVED, 
                "test_user"
            )
            if not session:
                return {"status": "FAIL", "error": "Failed to update session status"}
            print("  ✅ Session status updated successfully")
            
            # Test pending sessions
            pending = manager.get_pending_sessions()
            print(f"  ✅ Pending sessions retrieved: {len(pending)}")
            
            # Test learning insights
            insights = manager.get_learning_insights()
            if "common_corrections" not in insights:
                return {"status": "FAIL", "error": "Learning insights missing required fields"}
            print("  ✅ Learning insights retrieved")
            
            return {
                "status": "PASS",
                "session_id": session.session_id,
                "insights": insights,
                "message": "Human feedback system working correctly"
            }
            
        except Exception as e:
            return {"status": "FAIL", "error": str(e)}
    
    def validate_automated_training(self) -> Dict[str, Any]:
        """Validate automated training pipeline"""
        try:
            from models.automated_training_pipeline import AutomatedTrainingPipeline, TrainingTrigger
            
            # Initialize pipeline
            pipeline = AutomatedTrainingPipeline()
            print("  ✅ AutomatedTrainingPipeline initialized successfully")
            
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
            print("  ✅ Annotation data added successfully")
            
            # Test training job creation
            job_id = pipeline.create_training_job(
                model_name="test_model",
                trigger=TrainingTrigger.MANUAL,
                document_types=["invoice"],
                force_retrain=True
            )
            print(f"  ✅ Training job created: {job_id}")
            
            # Test job status retrieval
            job_status = pipeline.get_training_job_status(job_id)
            if not job_status:
                return {"status": "FAIL", "error": "Failed to retrieve job status"}
            print("  ✅ Training job status retrieved")
            
            # Test training statistics
            stats = pipeline.get_training_statistics()
            if "total_training_jobs" not in stats:
                return {"status": "FAIL", "error": "Training statistics missing required fields"}
            print("  ✅ Training statistics retrieved")
            
            return {
                "status": "PASS",
                "job_id": job_id,
                "statistics": stats,
                "message": "Automated training pipeline working correctly"
            }
            
        except Exception as e:
            return {"status": "FAIL", "error": str(e)}
    
    def validate_api_endpoints(self) -> Dict[str, Any]:
        """Validate API endpoint imports and basic functionality"""
        try:
            # Test annotation router
            from routers.annotation import router as annotation_router
            print("  ✅ Annotation router imported successfully")
            
            # Test training router
            from routers.training import router as training_router
            print("  ✅ Training router imported successfully")
            
            # Test human feedback router
            from routers.human_feedback import router as human_feedback_router
            print("  ✅ Human feedback router imported successfully")
            
            # Test automated training router
            from routers.automated_training import router as automated_training_router
            print("  ✅ Automated training router imported successfully")
            
            # Count endpoints
            annotation_routes = len(annotation_router.routes)
            training_routes = len(training_router.routes)
            human_feedback_routes = len(human_feedback_router.routes)
            automated_training_routes = len(automated_training_router.routes)
            
            total_routes = annotation_routes + training_routes + human_feedback_routes + automated_training_routes
            
            print(f"  ✅ Total API routes: {total_routes}")
            print(f"    - Annotation: {annotation_routes}")
            print(f"    - Training: {training_routes}")
            print(f"    - Human Feedback: {human_feedback_routes}")
            print(f"    - Automated Training: {automated_training_routes}")
            
            return {
                "status": "PASS",
                "total_routes": total_routes,
                "annotation_routes": annotation_routes,
                "training_routes": training_routes,
                "human_feedback_routes": human_feedback_routes,
                "automated_training_routes": automated_training_routes,
                "message": "All API endpoints imported successfully"
            }
            
        except Exception as e:
            return {"status": "FAIL", "error": str(e)}
    
    def validate_integration(self) -> Dict[str, Any]:
        """Validate integration between components"""
        try:
            from models.annotation_manager import AnnotationManager
            from models.human_in_loop import HumanInLoopManager
            from models.automated_training_pipeline import AutomatedTrainingPipeline
            
            # Test component integration
            annotation_manager = AnnotationManager()
            human_loop_manager = HumanInLoopManager()
            training_pipeline = AutomatedTrainingPipeline()
            
            print("  ✅ All components initialized successfully")
            
            # Test data flow: Annotation -> Human Feedback -> Training
            session_id = annotation_manager.create_annotation_session(
                document_id="integration_test_001",
                document_type="invoice",
                image_path="test_data/test_image.jpg"
            )
            print("  ✅ Annotation session created for integration test")
            
            # Complete annotation session
            annotation_manager.complete_annotation_session(session_id)
            print("  ✅ Annotation session completed")
            
            # Create human feedback session
            session_data = annotation_manager.get_annotation_session(session_id)
            if session_data:
                feedback_session = human_loop_manager.create_session(
                    document_id="integration_test_001",
                    filename="test_invoice.pdf",
                    extracted_data=session_data
                )
                print("  ✅ Human feedback session created from annotation data")
                
                # Add feedback
                human_loop_manager.add_feedback(
                    session_id=feedback_session.session_id,
                    field_name="invoice_number",
                    feedback_type="validation",
                    original_value="INV-001",
                    user_id="test_user"
                )
                print("  ✅ Feedback added to human session")
            
            return {
                "status": "PASS",
                "message": "Component integration working correctly"
            }
            
        except Exception as e:
            return {"status": "FAIL", "error": str(e)}
    
    def create_test_image(self) -> Image.Image:
        """Create a test image for validation"""
        # Create a simple test image
        img = Image.new('RGB', (800, 600), color='white')
        
        # Save test image
        test_image_path = self.test_data_dir / "test_image.jpg"
        img.save(test_image_path)
        
        return img
    
    def create_test_training_data(self) -> List[Dict[str, Any]]:
        """Create test training data"""
        return [
            {
                "image_path": "test_data/test_image.jpg",
                "annotations": [
                    {
                        "text": "INV-001",
                        "label": "B-invoice_number",
                        "label_id": 1,
                        "bbox": [100, 50, 200, 80],
                        "confidence": 0.95
                    }
                ],
                "document_type": "invoice",
                "quality_score": 1.0
            }
        ]

def main():
    """Run system validation"""
    print("🚀 SYSTEM FEATURE VALIDATION STARTING...")
    
    validator = SystemValidator()
    success = validator.run_all_validations()
    
    if success:
        print("\n🎉 ALL FEATURES VALIDATED SUCCESSFULLY!")
        print("✅ System is ready for frontend integration")
        return True
    else:
        print("\n⚠️  Some features need attention before frontend integration")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)


