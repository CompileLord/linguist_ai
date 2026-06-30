import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import ForeignKey, Index, Text, Float, Enum, JSON, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, IDMixin

class UserMissionAttempt(Base, IDMixin):
    __tablename__ = "user_mission_attempts"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    mission_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("missions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    transcript: Mapped[dict] = mapped_column(
        JSON(),
        nullable=False
    )
    feedback: Mapped[Optional[str]] = mapped_column(
        Text(),
        nullable=True
    )
    score: Mapped[Optional[float]] = mapped_column(
        Float(),
        nullable=True
    )
    status: Mapped[str] = mapped_column(
        Enum("in_progress", "completed", "abandoned", name="mission_attempt_status"),
        nullable=False
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    user: Mapped["User"] = relationship("User", lazy="select")
    mission: Mapped["Mission"] = relationship("Mission", lazy="select")

    __table_args__ = (
        Index("idx_user_mission_attempts_user_mission", "user_id", "mission_id"),
    )
