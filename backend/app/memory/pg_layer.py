from typing import List, Dict, Optional
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.models.db import Message, Conversation
from openai import AsyncOpenAI
from app.config import settings

openai_client = AsyncOpenAI(
    api_key=settings.OPENROUTER_API_KEY,
    base_url=settings.OPENROUTER_BASE_URL,
    default_headers={
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "MemoryMesh",
    },
)


class PGMemoryLayer:
    async def get_embedding(self, text: str) -> List[float]:
        response = await openai_client.embeddings.create(
            model="openai/text-embedding-3-small",
            input=text,
        )
        return response.data[0].embedding

    async def store_message(self, db: AsyncSession, message: Message):
        db.add(message)
        await db.commit()
        await db.refresh(message)
        return message

    async def get_recent_messages(
        self, db: AsyncSession, conversation_id: uuid.UUID, tenant_id: uuid.UUID, limit: int = 20
    ) -> List[Message]:
        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .where(Message.tenant_id == tenant_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        return list(reversed(result.scalars().all()))

    async def semantic_search(
        self,
        db: AsyncSession,
        conversation_id: uuid.UUID,
        tenant_id: uuid.UUID,
        query: str,
        top_k: int = 5,
    ) -> List[Message]:
        try:
            embedding = await self.get_embedding(query)
            embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"
            result = await db.execute(
                text("""
                    SELECT id, role, content, token_count, created_at,
                           1 - (embedding <=> :embedding::vector) as similarity
                    FROM messages
                    WHERE conversation_id = :conv_id
                      AND tenant_id = :tenant_id
                      AND embedding IS NOT NULL
                    ORDER BY embedding <=> :embedding::vector
                    LIMIT :top_k
                """),
                {
                    "embedding": embedding_str,
                    "conv_id": str(conversation_id),
                    "tenant_id": str(tenant_id),
                    "top_k": top_k,
                },
            )
            rows = result.fetchall()
            messages = []
            for row in rows:
                m = Message()
                m.id = row.id
                m.role = row.role
                m.content = row.content
                m.token_count = row.token_count
                m.created_at = row.created_at
                messages.append(m)
            return messages
        except Exception as e:
            # We must rollback so the session can be reused for subsequent queries
            import logging
            logging.error(f"Semantic search failed: {e}")
            await db.rollback()
            return []

    async def get_total_token_count(
        self, db: AsyncSession, conversation_id: uuid.UUID, tenant_id: uuid.UUID
    ) -> int:
        result = await db.execute(
            text(
                "SELECT COALESCE(SUM(token_count), 0) FROM messages "
                "WHERE conversation_id = :conv_id AND tenant_id = :tenant_id"
            ),
            {"conv_id": str(conversation_id), "tenant_id": str(tenant_id)},
        )
        return int(result.scalar() or 0)

    async def get_oldest_messages(
        self, db: AsyncSession, conversation_id: uuid.UUID, tenant_id: uuid.UUID, limit: int
    ) -> List[Message]:
        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .where(Message.tenant_id == tenant_id)
            .order_by(Message.created_at.asc())
            .limit(limit)
        )
        return result.scalars().all()

    async def delete_messages(self, db: AsyncSession, message_ids: List[uuid.UUID]):
        for msg_id in message_ids:
            await db.execute(text("DELETE FROM messages WHERE id = :id"), {"id": str(msg_id)})
        await db.commit()
