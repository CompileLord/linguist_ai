import uuid
from typing import Optional
from sqlalchemy import String, Integer, Float, Boolean, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, IDMixin, TimestampMixin
from app.models.enums import CEFRLevel

class UserProfile(Base, IDMixin, TimestampMixin):
    __tablename__ = "user_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False
    )
    target_language_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("languages.id"),
        nullable=False
    )
    native_language_code: Mapped[str] = mapped_column(
        String(10),
        nullable=False
    )
    current_level: Mapped[Optional[CEFRLevel]] = mapped_column(
        Enum(CEFRLevel, name="cefr_level"),
        nullable=True
    )
    placement_score: Mapped[Optional[float]] = mapped_column(
        Float(),
        nullable=True
    )
    daily_goal_minutes: Mapped[int] = mapped_column(
        Integer(),
        default=15,
        server_default="15"
    )
    streak_count: Mapped[int] = mapped_column(
        Integer(),
        default=0,
        server_default="0"
    )
    total_xp: Mapped[int] = mapped_column(
        Integer(),
        default=0,
        server_default="0"
    )
    onboarding_completed: Mapped[bool] = mapped_column(
        Boolean(),
        default=False,
        server_default="false"
    )
    timezone: Mapped[str] = mapped_column(
        String(50),
        default="UTC",
        server_default="UTC",
        nullable=False
    )


    user: Mapped["User"] = relationship("User", back_populates="profile")
    target_language: Mapped["Language"] = relationship("Language")
