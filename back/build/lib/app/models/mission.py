import uuid
from sqlalchemy import String, Text, Integer, Boolean, Enum, Index
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, IDMixin, TimestampMixin
from app.models.enums import CEFRLevel

class Mission(Base, IDMixin, TimestampMixin):
    __tablename__ = "missions"

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    description: Mapped[str] = mapped_column(
        Text(),
        nullable=False
    )
    scenario_prompt: Mapped[str] = mapped_column(
        Text(),
        nullable=False
    )
    related_goal: Mapped[str] = mapped_column(
        Enum("travel", "work", "study", "daily_life", "exam_prep", name="mission_related_goal"),
        nullable=False,
        index=True
    )
    cefr_level_min: Mapped[CEFRLevel] = mapped_column(
        Enum(CEFRLevel, name="cefr_level"),
        nullable=False,
        index=True
    )
    estimated_duration_minutes: Mapped[int] = mapped_column(
        Integer(),
        nullable=False
    )
    difficulty_rating: Mapped[int] = mapped_column(
        Integer(),
        nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean(),
        default=True,
        server_default="true",
        nullable=False
    )
