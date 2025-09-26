"""
Automated Training and Ingestion API Router
Provides endpoints for continuous learning, automatic training, and data ingestion
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, File, UploadFile
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import logging
from datetime import datetime
import uuid
import asyncio
from pathlib import Path

from models.automated_training_pipeline import (
    AutomatedTrainingPipeline, 
    TrainingTrigger, 
    TrainingStatus
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize the automated training pipeline
training_pipeline = AutomatedTrainingPipeline()

# Request/Response Models
class CreateTrainingJobRequest(BaseModel):
    model_name: str
    trigger: str = "manual"  # manual, threshold, scheduled, performance, new_document_type
    document_types: Optional[List[str]] = None
    force_retrain: bool = False

class BulkIngestionRequest(BaseModel):
    data_source: str
    batch_size: int = 10
    document_types: Optional[List[str]] = None

class ScheduleTrainingRequest(BaseModel):
    model_name: str
    schedule_type: str = "daily"  # daily, weekly, monthly
    time: str = "02:00"

class AutoTrainingConfigRequest(BaseModel):
    enabled: bool
    min_annotations: Optional[int] = None
    retraining_threshold: Optional[int] = None
    performance_threshold: Optional[float] = None

# API Endpoints

@router.post("/create-training-job")
async def create_training_job(request: CreateTrainingJobRequest):
    """Create a new training job"""
    try:
        logger.info(f"Creating training job for model: {request.model_name}")
        
        # Convert string trigger to enum
        try:
            trigger = TrainingTrigger(request.trigger)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid trigger type: {request.trigger}")
        
        job_id = training_pipeline.create_training_job(
            model_name=request.model_name,
            trigger=trigger,
            document_types=request.document_types,
            force_retrain=request.force_retrain
        )
        
        return {
            "success": True,
            "job_id": job_id,
            "message": "Training job created successfully"
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating training job: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create training job: {str(e)}")

@router.get("/training-job/{job_id}")
async def get_training_job_status(job_id: str):
    """Get status of a training job"""
    try:
        status = training_pipeline.get_training_job_status(job_id)
        
        if not status:
            raise HTTPException(status_code=404, detail="Training job not found")
        
        return {
            "success": True,
            "job": status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting training job status: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get training job status: {str(e)}")

@router.get("/training-jobs")
async def list_training_jobs(status: Optional[str] = None, limit: int = 50):
    """List all training jobs with optional status filter"""
    try:
        jobs = []
        
        for job_id, job in training_pipeline.training_jobs.items():
            if status and job.status.value != status:
                continue
            
            job_data = training_pipeline.get_training_job_status(job_id)
            jobs.append(job_data)
            
            if len(jobs) >= limit:
                break
        
        # Sort by creation time (newest first)
        jobs.sort(key=lambda x: x["created_at"], reverse=True)
        
        return {
            "success": True,
            "jobs": jobs,
            "total": len(jobs)
        }
        
    except Exception as e:
        logger.error(f"Error listing training jobs: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to list training jobs: {str(e)}")

@router.get("/model-performance/{model_name}")
async def get_model_performance(model_name: str):
    """Get performance metrics for a model"""
    try:
        performance = training_pipeline.get_model_performance(model_name)
        
        return {
            "success": True,
            "model_name": model_name,
            "performance": performance
        }
        
    except Exception as e:
        logger.error(f"Error getting model performance: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get model performance: {str(e)}")

@router.post("/schedule-training")
async def schedule_retraining(request: ScheduleTrainingRequest):
    """Schedule regular retraining of a model"""
    try:
        training_pipeline.schedule_retraining(
            model_name=request.model_name,
            schedule_type=request.schedule_type,
            time=request.time
        )
        
        return {
            "success": True,
            "message": f"Scheduled {request.schedule_type} retraining for {request.model_name} at {request.time}"
        }
        
    except Exception as e:
        logger.error(f"Error scheduling training: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to schedule training: {str(e)}")

@router.post("/bulk-ingestion")
async def bulk_ingestion(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    data_source: str = "bulk_upload",
    batch_size: int = 10
):
    """Upload and process multiple documents for training data"""
    try:
        # Save uploaded files
        temp_dir = Path("temp/bulk_ingestion")
        temp_dir.mkdir(parents=True, exist_ok=True)
        
        file_paths = []
        for file in files:
            if not file.filename:
                continue
                
            file_path = temp_dir / file.filename
            with file_path.open("wb") as buffer:
                content = await file.read()
                buffer.write(content)
            file_paths.append(str(file_path))
        
        # Process files in background
        background_tasks.add_task(
            process_bulk_files,
            file_paths,
            data_source,
            batch_size
        )
        
        return {
            "success": True,
            "message": f"Started bulk ingestion of {len(file_paths)} files",
            "files_count": len(file_paths)
        }
        
    except Exception as e:
        logger.error(f"Error in bulk ingestion: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to start bulk ingestion: {str(e)}")

@router.post("/add-annotation")
async def add_annotation_data(
    document_id: str,
    document_type: str,
    image_path: str,
    extracted_fields: Dict[str, Any],
    confidence_scores: Dict[str, float],
    user_validations: Optional[List[Dict[str, Any]]] = None
):
    """Add annotation data for training"""
    try:
        success = training_pipeline.add_annotation_data(
            document_id=document_id,
            document_type=document_type,
            image_path=image_path,
            extracted_fields=extracted_fields,
            confidence_scores=confidence_scores,
            user_validations=user_validations
        )
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to add annotation data")
        
        return {
            "success": True,
            "message": "Annotation data added successfully"
        }
        
    except Exception as e:
        logger.error(f"Error adding annotation data: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to add annotation data: {str(e)}")

@router.post("/auto-training-config")
async def configure_auto_training(request: AutoTrainingConfigRequest):
    """Configure automatic training settings"""
    try:
        training_pipeline.enable_automatic_training(request.enabled)
        
        if request.min_annotations:
            training_pipeline.min_annotations_for_training = request.min_annotations
        
        if request.retraining_threshold:
            training_pipeline.retraining_threshold = request.retraining_threshold
        
        if request.performance_threshold:
            training_pipeline.performance_threshold = request.performance_threshold
        
        return {
            "success": True,
            "message": "Auto-training configuration updated",
            "config": {
                "enabled": request.enabled,
                "min_annotations": training_pipeline.min_annotations_for_training,
                "retraining_threshold": training_pipeline.retraining_threshold,
                "performance_threshold": training_pipeline.performance_threshold
            }
        }
        
    except Exception as e:
        logger.error(f"Error configuring auto-training: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to configure auto-training: {str(e)}")

@router.get("/training-statistics")
async def get_training_statistics():
    """Get comprehensive training statistics"""
    try:
        stats = training_pipeline.get_training_statistics()
        
        return {
            "success": True,
            "statistics": stats
        }
        
    except Exception as e:
        logger.error(f"Error getting training statistics: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get training statistics: {str(e)}")

@router.get("/annotation-data")
async def list_annotation_data(
    document_type: Optional[str] = None,
    quality_threshold: float = 0.0,
    limit: int = 100
):
    """List annotation data with optional filters"""
    try:
        filtered_data = []
        
        for doc_id, data in training_pipeline.annotation_data.items():
            if document_type and data.document_type != document_type:
                continue
            
            if data.quality_score < quality_threshold:
                continue
            
            data_dict = {
                "document_id": data.document_id,
                "document_type": data.document_type,
                "quality_score": data.quality_score,
                "created_at": data.created_at.isoformat(),
                "field_count": len(data.extracted_fields),
                "validation_count": len(data.user_validations)
            }
            
            filtered_data.append(data_dict)
            
            if len(filtered_data) >= limit:
                break
        
        # Sort by quality score (highest first)
        filtered_data.sort(key=lambda x: x["quality_score"], reverse=True)
        
        return {
            "success": True,
            "annotation_data": filtered_data,
            "total": len(filtered_data)
        }
        
    except Exception as e:
        logger.error(f"Error listing annotation data: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to list annotation data: {str(e)}")

@router.post("/trigger-training")
async def trigger_manual_training(
    document_types: Optional[List[str]] = None,
    force_retrain: bool = False
):
    """Manually trigger training for specific document types"""
    try:
        model_name = f"manual_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        job_id = training_pipeline.create_training_job(
            model_name=model_name,
            trigger=TrainingTrigger.MANUAL,
            document_types=document_types,
            force_retrain=force_retrain
        )
        
        return {
            "success": True,
            "job_id": job_id,
            "message": "Manual training triggered successfully"
        }
        
    except Exception as e:
        logger.error(f"Error triggering manual training: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to trigger training: {str(e)}")

@router.get("/health")
async def health_check():
    """Health check endpoint for automated training pipeline"""
    try:
        stats = training_pipeline.get_training_statistics()
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "auto_training_enabled": stats["auto_training_enabled"],
            "total_annotations": stats["total_annotations"],
            "total_jobs": stats["total_training_jobs"],
            "pipeline_status": "running"
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}", exc_info=True)
        return {
            "status": "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }

# Background task functions
async def process_bulk_files(file_paths: List[str], data_source: str, batch_size: int):
    """Background task to process bulk uploaded files"""
    try:
        logger.info(f"Starting bulk processing of {len(file_paths)} files")
        
        results = training_pipeline.ingest_bulk_data(
            data_source=data_source,
            document_files=file_paths,
            batch_size=batch_size
        )
        
        logger.info(f"Bulk processing completed: {results['processed']}/{results['total_files']} processed")
        
        # Clean up temporary files
        for file_path in file_paths:
            try:
                Path(file_path).unlink()
            except Exception as e:
                logger.warning(f"Failed to clean up file {file_path}: {str(e)}")
        
    except Exception as e:
        logger.error(f"Error in bulk processing background task: {str(e)}", exc_info=True)
