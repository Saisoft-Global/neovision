"""
Health check endpoints for monitoring and load balancers
"""
from fastapi import APIRouter, HTTPException, status
from datetime import datetime
import os
import psutil
from typing import Dict, Any

router = APIRouter()

@router.get("/health")
async def basic_health():
    """
    Basic health check - returns 200 if service is running
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "multi-agent-platform"
    }

@router.get("/health/detailed")
async def detailed_health():
    """
    Detailed health check with system metrics
    """
    try:
        # Get system metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "service": "multi-agent-platform",
            "system": {
                "cpu_percent": cpu_percent,
                "memory": {
                    "total": memory.total,
                    "available": memory.available,
                    "percent": memory.percent
                },
                "disk": {
                    "total": disk.total,
                    "used": disk.used,
                    "free": disk.free,
                    "percent": disk.percent
                }
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Health check failed: {str(e)}"
        )

@router.get("/health/ready")
async def readiness_check():
    """
    Readiness check - returns 200 if service is ready to accept traffic
    Checks critical dependencies
    """
    checks = {}
    all_ready = True
    
    # Check environment variables
    required_env_vars = ["SECRET_KEY"]
    env_check = all(os.getenv(var) for var in required_env_vars)
    checks["environment"] = {
        "status": "ready" if env_check else "not_ready",
        "required_vars": required_env_vars
    }
    if not env_check:
        all_ready = False
    
    # Check database connection (if applicable)
    try:
        from app.database import engine
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        checks["database"] = {"status": "ready"}
    except Exception as e:
        checks["database"] = {"status": "not_ready", "error": str(e)}
        all_ready = False
    
    # Overall status
    status_code = status.HTTP_200_OK if all_ready else status.HTTP_503_SERVICE_UNAVAILABLE
    
    return {
        "status": "ready" if all_ready else "not_ready",
        "timestamp": datetime.utcnow().isoformat(),
        "checks": checks
    }, status_code

@router.get("/health/live")
async def liveness_check():
    """
    Liveness check - returns 200 if service is alive
    Used by Kubernetes/Docker to restart unhealthy containers
    """
    return {
        "status": "alive",
        "timestamp": datetime.utcnow().isoformat()
    }
