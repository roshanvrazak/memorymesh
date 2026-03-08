from typing import List, Tuple
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.db import Message, Conversation
from openai import AsyncOpenAI
from app.config import settings
import tiktoken

openai_client = AsyncOpenAI(
    api_key=settings.OPENROUTER_API_KEY,
    base_url=settings.OPENROUTER_BASE_URL,
    default_headers={
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "MemoryMesh",
    },
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

        # Get all messages
        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .where(Message.tenant_id == tenant_id)
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

        # Call Claude Haiku via OpenRouter
        response = await openai_client.chat.completions.create(
            model=settings.COMPRESSION_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a memory compressor. Summarise the following conversation into a "
                        "concise, factual summary that preserves all important context, decisions, "
                        "and information. Be thorough but concise."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Summarise this conversation:\n\n{conv_text}",
                },
            ],
            max_tokens=500,
        )

        summary = response.choices[0].message.content

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
