import uuid
from datetime import datetime
from sqlalchemy import ForeignKey, UniqueConstraint, Float, JSON, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, IDMixin

class UserListeningAttempt(Base, IDMixin):
    __tablename__ = "user_listening_attempts"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    exam_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("listening_exams.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    answers: Mapped[dict] = mapped_column(
        JSON(),
        nullable=False
    )
    score: Mapped[float] = mapped_column(
        Float(),
        nullable=False
    )
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    user: Mapped["User"] = relationship("User", lazy="select")
    exam: Mapped["ListeningExam"] = relationship("ListeningExam", lazy="select")

    __table_args__ = (
        UniqueConstraint("user_id", "exam_id", name="uq_user_listening_attempts_user_exam"),
    )
