from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional

from app.services.copilot_service import copilot_service, CopilotStructuredResponse
from app.api.deps import get_current_user

router = APIRouter()

class CopilotQueryRequest(BaseModel):
    message: str
    session_id: str
    scenario: Optional[str] = None

@router.post("/query", response_model=CopilotStructuredResponse, status_code=status.HTTP_200_OK)
async def query_copilot(req: CopilotQueryRequest, current_user = Depends(get_current_user)):
    """
    Query the StadiumOS AI Operations Copilot.
    """
    try:
        response = await copilot_service.query(
            message=req.message,
            session_id=req.session_id,
            scenario=req.scenario
        )
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Copilot inference failed: {str(e)}"
        )

@router.delete("/session/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def clear_copilot_session(session_id: str, current_user = Depends(get_current_user)):
    """
    Clear the conversation history for a given session.
    """
    await copilot_service.clear_session(session_id)
