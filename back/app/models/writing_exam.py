import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import ForeignKey, Index, Text, Float, JSON, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, IDMixin

class WritingExam(Base, IDMixin):
    __tablename__ = "writing_exams"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    prompt: Mapped[str] = mapped_column(
        Text(),
        nullable=False
    )
    submitted_text: Mapped[Optional[str]] = mapped_column(
        Text(),
        nullable=True
    )
    scores: Mapped[Optional[dict]] = mapped_column(
        JSON(),
        nullable=True
    )
    overall_score: Mapped[Optional[float]] = mapped_column(
        Float(),
        nullable=True
    )
    feedback_text: Mapped[Optional[str]] = mapped_column(
        Text(),
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    user: Mapped["User"] = relationship("User", lazy="select")

    __table_args__ = (
        Index("idx_writing_exams_user_created", "user_id", created_at.desc()),
    )
