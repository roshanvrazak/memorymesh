from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid


class MessageSchema(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    token_count: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationSchema(BaseModel):
    id: uuid.UUID
    title: Optional[str]
    summary: Optional[str]
    created_at: datetime
    updated_at: datetime
    messages: List[MessageSchema] = []

    class Config:
        from_attributes = True


class ConversationListItem(BaseModel):
    id: uuid.UUID
    title: Optional[str]
    summary: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[uuid.UUID] = None


class TenantCreate(BaseModel):
    name: str


class UserCreate(BaseModel):
    username: str
    password: str


class TenantResponse(BaseModel):
    id: uuid.UUID
    name: str
    api_key: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    username: str
    created_at: datetime

    class Config:
        from_attributes = True


class MemoryDebugResponse(BaseModel):
    redis_messages: int
    redis_hit: bool
    semantic_messages: int
    summary_active: bool
    summary_tokens: Optional[int]
    total_context_messages: int


class TokenUsageResponse(BaseModel):
    tenant_id: uuid.UUID
    total_tokens: int
    message_count: int
