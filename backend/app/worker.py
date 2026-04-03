import asyncio
from arq import create_pool
from arq.connections import RedisSettings
from app.config import settings
from app.models.db import Conversation
from app.database import AsyncSessionLocal
from sqlalchemy import update
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

title_llm = ChatOpenAI(
    model=settings.CHAT_MODEL,
    openai_api_key=settings.OPENROUTER_API_KEY,
    openai_api_base="https://openrouter.ai/api/v1",
    max_tokens=15,
)

async def generate_and_update_title(ctx, conv_id: str, first_message: str):
    try:
        title_prompt = (
            f"Write a very short, concise title (max 4-5 words) summarizing "
            f"this message. Do not use quotes or punctuation: {first_message}"
        )
        result = await title_llm.ainvoke([HumanMessage(content=title_prompt)])
        new_title = result.content.strip(' ".\n')

        async with AsyncSessionLocal() as db:
            await db.execute(
                update(Conversation)
                .where(Conversation.id == conv_id)
                .values(title=new_title)
            )
            await db.commit()
    except Exception as e:
        print(f"Failed to generate title: {e}")

class WorkerSettings:
    functions = [generate_and_update_title]
    redis_settings = RedisSettings(host=settings.REDIS_HOST, port=settings.REDIS_PORT)
