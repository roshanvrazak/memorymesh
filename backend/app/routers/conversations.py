import uuid
import secrets
import json
from typing import List
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.database import get_db
from app.models.db import Conversation, Message, Tenant, User
from app.schemas.chat import (
    ConversationSchema,
    ConversationListItem,
    TenantCreate,
    UserCreate,
    TenantResponse,
    UserResponse,
    MemoryDebugResponse,
)
from app.memory.manager import memory_manager
from app.memory.redis_layer import RedisMemoryLayer
from app.auth import get_current_tenant, get_current_user, get_password_hash

router = APIRouter()
redis_layer = RedisMemoryLayer()


@router.get("/conversations", response_model=List[ConversationListItem])
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Conversation)
        .where(Conversation.tenant_id == tenant.id)
        .where(Conversation.user_id == user.id)
        .order_by(Conversation.updated_at.desc())
    )
    return result.scalars().all()


@router.get("/conversations/{conversation_id}", response_model=ConversationSchema)
async def get_conversation(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .where(Conversation.tenant_id == tenant.id)
        .where(Conversation.user_id == user.id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Load messages
    msg_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .where(Message.tenant_id == tenant.id)
        .order_by(Message.created_at.asc())
    )
    conv.messages = msg_result.scalars().all()
    return conv


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .where(Conversation.tenant_id == tenant.id)
        .where(Conversation.user_id == user.id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Clear Redis cache
    await redis_layer.delete_session(str(tenant.id), str(conversation_id))

    # Delete from DB (cascade deletes messages)
    await db.execute(delete(Conversation).where(Conversation.id == conversation_id))
    await db.commit()
    return {"status": "deleted"}


@router.get(
    "/conversations/{conversation_id}/memory-debug", response_model=MemoryDebugResponse
)
async def memory_debug(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(get_current_user),
):
    # Check Redis
    redis_messages = await redis_layer.get_messages(str(tenant.id), str(conversation_id))
    redis_hit = redis_messages is not None
    redis_count = len(redis_messages) if redis_messages else 0

    # Check DB for conversation summary
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .where(Conversation.tenant_id == tenant.id)
        .where(Conversation.user_id == user.id)
    )
    conv = result.scalar_one_or_none()
    summary = conv.summary if conv else None

    return MemoryDebugResponse(
        redis_messages=redis_count,
        redis_hit=redis_hit,
        semantic_messages=0,  # Would need a query for this
        summary_active=summary is not None,
        summary_tokens=len(summary) // 4 if summary else None,
        total_context_messages=redis_count,
    )


@router.post("/tenants", response_model=TenantResponse)
async def create_tenant(
    body: TenantCreate,
    db: AsyncSession = Depends(get_db),
):
    api_key = secrets.token_urlsafe(32)
    api_key_hash = get_password_hash(api_key)

    tenant = Tenant(name=body.name, api_key_hash=api_key_hash)
    db.add(tenant)
    await db.commit()
    await db.refresh(tenant)

    response = TenantResponse.model_validate(tenant)
    response.api_key = api_key  # Return plain API key only once
    return response


@router.post("/tenants/{tenant_id}/users", response_model=UserResponse)
async def create_user(
    tenant_id: uuid.UUID,
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    hashed_password = get_password_hash(body.password)
    user = User(tenant_id=tenant_id, username=body.username, hashed_password=hashed_password)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
