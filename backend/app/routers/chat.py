import uuid
import json
from typing import AsyncIterator
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, BaseMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from app.database import get_db
from app.schemas.chat import ChatRequest
from app.models.db import Tenant, User, Conversation
from app.memory.manager import memory_manager
from app.memory.compressor import count_tokens
from app.config import settings
from app.auth import get_current_tenant, get_current_user
from app.rate_limiter import RateLimiter
from app.memory.redis_layer import RedisMemoryLayer

redis_layer = RedisMemoryLayer()
rate_limiter = RateLimiter(redis_layer.client)

# LangChain ChatOpenAI via OpenRouter
chat_llm = ChatOpenAI(
    model=settings.CHAT_MODEL,
    openai_api_key=settings.OPENROUTER_API_KEY,
    openai_api_base="https://openrouter.ai/api/v1",
    streaming=True,
    max_tokens=1024,
)

# Lighter model for title generation
title_llm = ChatOpenAI(
    model=settings.CHAT_MODEL,
    openai_api_key=settings.OPENROUTER_API_KEY,
    openai_api_base="https://openrouter.ai/api/v1",
    max_tokens=15,
)

# LangChain prompt template
chat_prompt = ChatPromptTemplate.from_messages([
    ("system", "{system_prompt}"),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{input}"),
])

# LangChain chain: prompt | LLM
chat_chain = chat_prompt | chat_llm

router = APIRouter()


def _build_lc_history(history: list) -> list[BaseMessage]:
    """Convert raw message dicts to LangChain message objects."""
    lc_history: list[BaseMessage] = []
    for msg in history:
        if msg["role"] == "user":
            lc_history.append(HumanMessage(content=msg["content"]))
        else:
            lc_history.append(AIMessage(content=msg["content"]))
    return lc_history


@router.post("/chat")
async def chat(
    request: ChatRequest,
    fastapi_request: Request,
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(get_current_user),
):
    tenant_id = tenant.id
    user_id = user.id

    # Rate limiting
    await rate_limiter.check_rate_limit(str(tenant_id))

    # Get or create conversation
    conversation = await memory_manager.get_or_create_conversation(
        db, user_id, tenant_id, request.conversation_id
    )

    # Get memory context
    context = await memory_manager.get_context(db, tenant_id, conversation.id, request.message)

    # Build system prompt — inject all 3 memory layers
    system_prompt = "You are a helpful AI assistant with access to conversation history."
    if context["summary"]:
        system_prompt += f"\n\nConversation summary (previous context):\n{context['summary']}"
    if context["semantic_context"]:
        semantic_text = "\n".join(
            [f"{m['role']}: {m['content']}" for m in context["semantic_context"]]
        )
        system_prompt += f"\n\nSemantically relevant past messages:\n{semantic_text}"

    # Build LangChain history from recent messages
    lc_history = _build_lc_history(context["recent_messages"])

    # Save user message
    await memory_manager.save_message(db, conversation.id, tenant_id, "user", request.message)

    debug_info = context["debug"]
    debug_header = json.dumps(debug_info)

    async def generate() -> AsyncIterator[str]:
        full_response = ""
        try:
            # Send conversation_id first
            yield f"data: {json.dumps({'type': 'conversation_id', 'conversation_id': str(conversation.id), 'debug': debug_info})}\n\n"

            # Stream via LangChain chain.astream()
            async for chunk in chat_chain.astream({
                "system_prompt": system_prompt,
                "history": lc_history,
                "input": request.message,
            }):
                token = chunk.content if hasattr(chunk, "content") else str(chunk)
                if token:
                    full_response += token
                    yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

            # Save assistant response
            await memory_manager.save_message(
                db, conversation.id, tenant_id, "assistant", full_response
            )

            # Auto-generate title for new conversations
            if not request.conversation_id and conversation.title == "New Conversation":
                await fastapi_request.app.state.arq_pool.enqueue_job(
                    "generate_and_update_title", str(conversation.id), request.message
                )

            user_tokens = count_tokens(request.message)
            assistant_tokens = count_tokens(full_response)
            yield f"data: {json.dumps({'type': 'done', 'conversation_id': str(conversation.id), 'user_token_count': user_tokens, 'assistant_token_count': assistant_tokens})}\n\n"
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
