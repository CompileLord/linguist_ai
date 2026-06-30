import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import ForeignKey, Index, Text, Integer, JSON, DateTime, func, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, IDMixin

class TutorMessage(Base, IDMixin):
    __tablename__ = "tutor_messages"

    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tutor_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    role: Mapped[str] = mapped_column(
        Enum("user", "assistant", name="tutor_message_role"),
        nullable=False
    )
    content: Mapped[str] = mapped_column(
        Text(),
        nullable=False
    )
    token_count: Mapped[Optional[int]] = mapped_column(
        Integer(),
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )
    metadata_json: Mapped[Optional[dict]] = mapped_column(
        "metadata",
        JSON(),
        nullable=True
    )

    session: Mapped["TutorSession"] = relationship("TutorSession", back_populates="messages" if False else None, lazy="select")

    __table_args__ = (
        Index("idx_tutor_messages_session_created", "session_id", "created_at"),
    )
