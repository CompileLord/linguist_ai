import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import ForeignKey, Index, String, JSON, Integer, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, IDMixin

class TutorSession(Base, IDMixin):
    __tablename__ = "tutor_sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    topic_context: Mapped[Optional[dict]] = mapped_column(
        JSON(),
        nullable=True
    )
    active_lesson_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("lessons.id", ondelete="SET NULL"),
        nullable=True
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    ended_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean(),
        default=True,
        server_default="true",
        nullable=False,
        index=True
    )
    message_count: Mapped[int] = mapped_column(
        Integer(),
        default=0,
        server_default="0",
        nullable=False
    )

    user: Mapped["User"] = relationship("User", lazy="select")
    active_lesson: Mapped[Optional["Lesson"]] = relationship("Lesson", lazy="select")

    __table_args__ = (
        Index("idx_tutor_sessions_user_active", "user_id", "is_active"),
    )
