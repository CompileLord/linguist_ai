import uuid
from typing import Optional
from sqlalchemy import String, Integer, ForeignKey, Index, Enum, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, IDMixin, TimestampMixin
from app.models.enums import CEFRLevel

class Lesson(Base, IDMixin, TimestampMixin):
    __tablename__ = "lessons"

    language_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("languages.id"),
        nullable=False
    )
    cefr_level: Mapped[CEFRLevel] = mapped_column(
        Enum(CEFRLevel, name="cefr_level"),
        nullable=False
    )
    topic: Mapped[str] = mapped_column(
        String(200),
        nullable=False
    )
    title: Mapped[str] = mapped_column(
        String(300),
        nullable=False
    )
    content: Mapped[dict] = mapped_column(
        JSON(),
        nullable=False
    )
    audio_urls: Mapped[Optional[dict]] = mapped_column(
        JSON(),
        nullable=True
    )
    generation_model: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    generation_duration_ms: Mapped[Optional[int]] = mapped_column(
        Integer(),
        nullable=True
    )

    language: Mapped["Language"] = relationship("Language")

    __table_args__ = (
        Index("idx_lessons_lang_level_topic", "language_id", "cefr_level", "topic"),
    )
