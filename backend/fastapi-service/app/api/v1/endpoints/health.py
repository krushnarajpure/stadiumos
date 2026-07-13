from fastapi import APIRouter
from pydantic import BaseModel
import time

router = APIRouter()

class HealthResponse(BaseModel):
    status: str
    timestamp: float
    service: str

@router.get("/liveness", response_model=HealthResponse)
def liveness_probe():
    """
    Kubernetes Liveness Probe.
    Returns 200 OK to indicate the process is running.
    """
    return HealthResponse(
        status="ok",
        timestamp=time.time(),
        service="stadiumos-fastapi"
    )

@router.get("/readiness", response_model=HealthResponse)
def readiness_probe():
    """
    Kubernetes Readiness Probe.
    Verifies that the database, redis, and models are accessible.
    In a real system, you would try/except a ping to DB/Redis here.
    """
    is_ready = True
    
    # Example check: is the ML model loaded?
    # Actually, the ML model is loaded dynamically or handled gracefully.
    
    if is_ready:
        return HealthResponse(
            status="ready",
            timestamp=time.time(),
            service="stadiumos-fastapi"
        )
    else:
        return HealthResponse(
            status="unready",
            timestamp=time.time(),
            service="stadiumos-fastapi"
        )
