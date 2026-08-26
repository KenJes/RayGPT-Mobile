from app.db.database import AsyncSessionLocal, Message, Conversation
from sqlalchemy import select, desc
import uuid
from loguru import logger

class ConversationMemory:
    async def get_history(self, conversation_id: str, limit: int = 50):
        async with AsyncSessionLocal() as session:
            stmt = select(Message).where(Message.conversation_id == conversation_id).order_by(desc(Message.timestamp)).limit(limit)
            result = await session.execute(stmt)
            messages = result.scalars().all()
            return list(reversed(messages))

    async def save_message(self, conversation_id: str, role: str, content: str, tool_calls=None):
        async with AsyncSessionLocal() as session:
            msg = Message(
                id=str(uuid.uuid4()),
                conversation_id=conversation_id,
                content=content,
                role=role,
                tool_calls_json=tool_calls
            )
            session.add(msg)
            await session.commit()
            await session.refresh(msg)
            return msg

    async def create_conversation(self, user_id: str, title: str, mode: str) -> str:
        async with AsyncSessionLocal() as session:
            conv = Conversation(
                id=str(uuid.uuid4()),
                user_id=user_id,
                title=title,
                mode=mode
            )
            session.add(conv)
            await session.commit()
            return conv.id

memory_service = ConversationMemory()
