import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, IDMixin, TimestampMixin

class UserLesson(Base, IDMixin, TimestampMixin):
    __tablename__ = "user_lessons"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default="not_started",
        server_default="not_started",
        nullable=False
    )
    score: Mapped[Optional[float]] = mapped_column(
        Float(),
        nullable=True
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    time_spent_seconds: Mapped[int] = mapped_column(
        Integer(),
        default=0,
        server_default="0",
        nullable=False
    )
    exercises_correct: Mapped[int] = mapped_column(
        Integer(),
        default=0,
        server_default="0",
        nullable=False
    )
    exercises_total: Mapped[int] = mapped_column(
        Integer(),
        default=0,
        server_default="0",
        nullable=False
    )
    xp_earned: Mapped[int] = mapped_column(
        Integer(),
        default=0,
        server_default="0",
        nullable=False
    )

    user: Mapped["User"] = relationship("User")
    lesson: Mapped["Lesson"] = relationship("Lesson")

    __table_args__ = (
        UniqueConstraint("user_id", "lesson_id", name="uq_user_lessons_user_id_lesson_id"),
    )
