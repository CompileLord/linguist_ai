import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import Text, Integer, DateTime, ForeignKey, Index, Enum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, IDMixin, TimestampMixin
from app.models.enums import ErrorCategory

class UserError(Base, IDMixin, TimestampMixin):
    __tablename__ = "user_errors"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    category: Mapped[ErrorCategory] = mapped_column(
        Enum(ErrorCategory, name="error_category"),
        nullable=False
    )
    error_text: Mapped[str] = mapped_column(
        Text(),
        nullable=False
    )
    correct_text: Mapped[str] = mapped_column(
        Text(),
        nullable=False
    )
    explanation: Mapped[str] = mapped_column(
        Text(),
        nullable=False
    )
    related_lesson_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("lessons.id", ondelete="SET NULL"),
        nullable=True
    )
    occurrence_count: Mapped[int] = mapped_column(
        Integer(),
        default=1,
        server_default="1"
    )
    last_occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )
    signaled_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    user: Mapped["User"] = relationship("User", lazy="select")
    lesson: Mapped[Optional["Lesson"]] = relationship("Lesson", lazy="select")

    __table_args__ = (
        Index("idx_user_errors_user_category", "user_id", "category"),
        Index("idx_user_errors_user_occurrence", "user_id", "occurrence_count"),
    )
