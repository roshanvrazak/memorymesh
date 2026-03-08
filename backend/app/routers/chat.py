import uuid
import json
from typing import Optional, AsyncIterator
from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.schemas.chat import ChatRequest
from app.models.db import Tenant, User, Conversation
from app.memory.manager import memory_manager
from app.config import settings
from openai import AsyncOpenAI

router = APIRouter()

openai_client = AsyncOpenAI(
    api_key=settings.OPENROUTER_API_KEY,
    base_url=settings.OPENROUTER_BASE_URL,
    default_headers={
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "MemoryMesh",
    },
)


async def get_tenant_and_user(
    x_tenant_id: str = Header(...),
    x_user_id: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    try:
        tenant_id = uuid.UUID(x_tenant_id)
        user_id = uuid.UUID(x_user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tenant_id or user_id")

    tenant = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = tenant.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    user = await db.execute(
        select(User).where(User.id == user_id).where(User.tenant_id == tenant_id)
    )
    user = user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return tenant, user


@router.post("/chat")
async def chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    x_tenant_id: str = Header(...),
    x_user_id: str = Header(...),
):
    try:
        tenant_id = uuid.UUID(x_tenant_id)
        user_id = uuid.UUID(x_user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid headers")

    # Validate tenant and user
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = tenant_result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    user_result = await db.execute(
        select(User).where(User.id == user_id).where(User.tenant_id == tenant_id)
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get or create conversation
    conversation = await memory_manager.get_or_create_conversation(
        db, user_id, tenant_id, request.conversation_id
    )

    # Get memory context
    context = await memory_manager.get_context(db, tenant_id, conversation.id, request.message)

    # Build messages for LLM
    system_prompt = "You are a helpful AI assistant with access to conversation history."
    if context["summary"]:
        system_prompt += f"\n\nConversation summary (previous context):\n{context['summary']}"

    if context["semantic_context"]:
        semantic_text = "\n".join(
            [f"{m['role']}: {m['content']}" for m in context["semantic_context"]]
        )
        system_prompt += f"\n\nSemanticly relevant past messages:\n{semantic_text}"

    messages = [{"role": "system", "content": system_prompt}]
    for msg in context["recent_messages"]:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": request.message})

    # Save user message
    await memory_manager.save_message(db, conversation.id, tenant_id, "user", request.message)

    debug_info = context["debug"]
    debug_header = json.dumps(debug_info)

    async def generate() -> AsyncIterator[str]:
        full_response = ""
        try:
            # Send conversation_id first
            yield f"data: {json.dumps({'type': 'conversation_id', 'conversation_id': str(conversation.id), 'debug': debug_info})}\n\n"

            stream = await openai_client.chat.completions.create(
                model=settings.CHAT_MODEL,
                messages=messages,
                stream=True,
            )

            async for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    full_response += delta.content
                    yield f"data: {json.dumps({'type': 'token', 'content': delta.content})}\n\n"

            # Save assistant response
            await memory_manager.save_message(
                db, conversation.id, tenant_id, "assistant", full_response
            )
            yield f"data: {json.dumps({'type': 'done', 'conversation_id': str(conversation.id)})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "X-Memory-Debug": debug_header,
            "X-Conversation-ID": str(conversation.id),
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
