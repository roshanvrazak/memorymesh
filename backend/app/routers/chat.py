import uuid
import json
from typing import AsyncIterator
from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, BaseMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from app.database import get_db
from app.schemas.chat import ChatRequest
from app.models.db import Tenant, User, Conversation
from app.memory.manager import memory_manager
from app.config import settings
from openai import AsyncOpenAI

_LC_ROLE_MAP = {SystemMessage: "system", HumanMessage: "user", AIMessage: "assistant"}


def build_prompt(system_prompt: str, history: list, user_input: str) -> list[dict]:
    """Build OpenAI-compatible messages using LangChain ChatPromptTemplate.

    Injects all 3 memory layers (summary + semantic context already embedded in
    system_prompt by the caller) and formats conversation history via
    MessagesPlaceholder before appending the current user turn.
    """
    lc_history: list[BaseMessage] = []
    for msg in history:
        if msg["role"] == "user":
            lc_history.append(HumanMessage(content=msg["content"]))
        else:
            lc_history.append(AIMessage(content=msg["content"]))

    prompt = ChatPromptTemplate.from_messages([
        ("system", "{system_prompt}"),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{input}"),
    ])

    formatted = prompt.format_messages(
        system_prompt=system_prompt,
        history=lc_history,
        input=user_input,
    )

    return [{"role": _LC_ROLE_MAP[type(m)], "content": m.content} for m in formatted]

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

    # Build system prompt — inject all 3 memory layers
    system_prompt = "You are a helpful AI assistant with access to conversation history."
    if context["summary"]:
        system_prompt += f"\n\nConversation summary (previous context):\n{context['summary']}"
    if context["semantic_context"]:
        semantic_text = "\n".join(
            [f"{m['role']}: {m['content']}" for m in context["semantic_context"]]
        )
        system_prompt += f"\n\nSemantically relevant past messages:\n{semantic_text}"

    # Build OpenAI-compatible message list via LangChain ChatPromptTemplate
    messages = build_prompt(system_prompt, context["recent_messages"], request.message)

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
            
            # If this is a new conversation (we know because we just created it or it has the default title)
            if not request.conversation_id and conversation.title == "New Conversation":
                from fastapi import BackgroundTasks
                import asyncio
                
                async def generate_and_update_title(conv_id, first_message):
                    try:
                        title_prompt = f"Write a very short, concise title (max 4-5 words) summarizing this message. Do not use quotes or punctuation: {first_message}"
                        title_response = await openai_client.chat.completions.create(
                            model=settings.CHAT_MODEL,
                            messages=[{"role": "user", "content": title_prompt}],
                            max_tokens=15,
                        )
                        new_title = title_response.choices[0].message.content.strip(' ".\n')
                        
                        # We need a new session since the request session is closed
                        from app.database import AsyncSessionLocal
                        async with AsyncSessionLocal() as bg_db:
                            from sqlalchemy import update
                            await bg_db.execute(
                                update(Conversation)
                                .where(Conversation.id == conv_id)
                                .values(title=new_title)
                            )
                            await bg_db.commit()
                    except Exception as e:
                        import logging
                        logging.error(f"Failed to auto-generate title: {e}")

                # Create task and run it in background without blocking SSE
                asyncio.create_task(generate_and_update_title(conversation.id, request.message))

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
