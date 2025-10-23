from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import Dict, Any, Optional
from app.auth import verify_token
from services.automation_service import AutomationService

router = APIRouter(prefix="/automation", tags=["automation"])

@router.post("/browser/execute")
async def execute_browser_automation(
    task: Dict[str, Any],
    user_id: str = Depends(verify_token)
):
    """Execute browser automation task"""
    try:
        automation_service = AutomationService()
        result = await automation_service.execute_browser_task(task)
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/desktop/execute")
async def execute_desktop_automation(
    task: Dict[str, Any],
    user_id: str = Depends(verify_token)
):
    """Execute desktop automation task"""
    try:
        automation_service = AutomationService()
        result = await automation_service.execute_desktop_task(task)
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/facial-recognition/detect")
async def detect_faces(
    task: Dict[str, Any],
    user_id: str = Depends(verify_token)
):
    """Execute facial recognition task"""
    try:
        automation_service = AutomationService()
        result = await automation_service.execute_facial_recognition(task)
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{task_id}")
async def get_automation_status(
    task_id: str,
    user_id: str = Depends(verify_token)
):
    """Get status of automation task"""
    try:
        automation_service = AutomationService()
        status = await automation_service.get_task_status(task_id)
        return {"task_id": task_id, "status": status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/workflow/execute")
async def execute_automation_workflow(
    workflow: Dict[str, Any],
    background_tasks: BackgroundTasks,
    user_id: str = Depends(verify_token)
):
    """Execute automation workflow"""
    try:
        automation_service = AutomationService()
        task_id = await automation_service.execute_workflow(workflow, user_id)
        
        # Run in background
        background_tasks.add_task(
            automation_service.run_workflow_background,
            task_id,
            workflow
        )
        
        return {"success": True, "task_id": task_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/capabilities")
async def get_automation_capabilities(user_id: str = Depends(verify_token)):
    """Get available automation capabilities"""
    try:
        automation_service = AutomationService()
        capabilities = await automation_service.get_capabilities()
        return {"capabilities": capabilities}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
