from typing import List, Tuple
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.db import Message, Conversation
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from app.config import settings
import tiktoken

# LangChain ChatOpenAI via OpenRouter for compression
compression_llm = ChatOpenAI(
    model=settings.COMPRESSION_MODEL,
    openai_api_key=settings.OPENROUTER_API_KEY,
    openai_api_base="https://openrouter.ai/api/v1",
    max_tokens=500,
)


def count_tokens(text: str) -> int:
    try:
        enc = tiktoken.get_encoding("cl100k_base")
        return len(enc.encode(text))
    except Exception:
        return len(text) // 4


class MemoryCompressor:
    async def should_compress(
        self, db: AsyncSession, conversation_id: uuid.UUID, tenant_id: uuid.UUID
    ) -> bool:
        from app.memory.pg_layer import PGMemoryLayer

        pg = PGMemoryLayer()
        total = await pg.get_total_token_count(db, conversation_id, tenant_id)
        return total >= settings.TOKEN_COMPRESSION_THRESHOLD

    async def compress(
        self, db: AsyncSession, conversation_id: uuid.UUID, tenant_id: uuid.UUID
    ) -> Tuple[str, int]:
        """Summarise oldest 50% of messages. Returns (summary, compressed_token_count)."""
        from app.memory.pg_layer import PGMemoryLayer

        pg = PGMemoryLayer()

        # Get all non-pinned messages
        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .where(Message.tenant_id == tenant_id)
            .where(Message.is_pinned == False)
            .order_by(Message.created_at.asc())
        )
        all_messages = result.scalars().all()

        if len(all_messages) < 4:
            return "", 0

        half = len(all_messages) // 2
        to_compress = all_messages[:half]

        # Build conversation text
        conv_text = "\n".join([f"{m.role}: {m.content}" for m in to_compress])
        compressed_tokens = sum(m.token_count or count_tokens(m.content) for m in to_compress)

        # Call Claude via OpenRouter
        existing_summary = ""
        conv_result = await db.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        conv = conv_result.scalar_one_or_none()
        if conv and conv.summary:
            existing_summary = conv.summary

        system_msg = (
            "You are a memory compressor. Summarise the following new messages "
            "and merge them with the EXISTING summary provided. The goal is to "
            "maintain a single, coherent, and concise summary of the entire "
            "conversation history. Focus on preserving key decisions, facts, "
            "and user preferences."
        )
        
        prompt = f"EXISTING SUMMARY: {existing_summary}\n\nNEW MESSAGES:\n{conv_text}\n\nProvide updated summary:"

        result = await compression_llm.ainvoke([
            SystemMessage(content=system_msg),
            HumanMessage(content=prompt),
        ])

        summary = result.content

        # Update conversation summary
        await db.execute(
            update(Conversation)
            .where(Conversation.id == conversation_id)
            .values(summary=summary)
        )

        # Delete compressed messages
        msg_ids = [m.id for m in to_compress]
        await pg.delete_messages(db, msg_ids)

        return summary, compressed_tokens
