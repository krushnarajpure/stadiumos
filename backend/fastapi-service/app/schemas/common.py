from pydantic import BaseModel, Field

class MessageResponse(BaseModel):
    message: str = Field(..., description="API operation result status message", json_schema_extra={"example": "Operation completed successfully"})
