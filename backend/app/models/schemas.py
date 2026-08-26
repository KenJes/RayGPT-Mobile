from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class MessageCreate(BaseModel):
    content: str
    role: str
    conversation_id: str
    attachments: Optional[List[str]] = None

class MessageResponse(BaseModel):
    id: str
    content: str
    role: str
    timestamp: datetime
    tool_calls: Optional[List[Dict[str, Any]]] = None

class ConversationCreate(BaseModel):
    title: str
    mode: str

class ConversationResponse(BaseModel):
    id: str
    title: str
    mode: str
    created_at: datetime
    updated_at: datetime
    message_count: int

class DocumentUploadResponse(BaseModel):
    id: str
    filename: str
    file_type: str
    chunk_count: int
    created_at: str

class DocumentResponse(BaseModel):
    id: str
    filename: str
    file_type: str
    chunk_count: int
    created_at: str

class WebSocketMessage(BaseModel):
    type: str
    content: str
    conversation_id: str
    user_id: str
    mode: str

class WebSocketResponse(BaseModel):
    type: str
    content: str
    message_id: Optional[str] = None
    tool_name: Optional[str] = None
    tool_status: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    version: str
