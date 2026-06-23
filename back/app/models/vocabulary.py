import uuid
from typing import Optional
from sqlalchemy import String, Integer, ForeignKey, Enum, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, IDMixin, TimestampMixin
from app.models.enums import CEFRLevel

class Vocabulary(Base, IDMixin, TimestampMixin):
    __tablename__ = "vocabulary"

    language_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("languages.id"),
        nullable=False,
        index=True
    )
    word: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True
    )
    translation_context: Mapped[dict] = mapped_column(
        JSON(),
        nullable=False
    )
    transcription: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    audio_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True
    )
    cefr_level: Mapped[CEFRLevel] = mapped_column(
        Enum(CEFRLevel, name="cefr_level"),
        nullable=False,
        index=True
    )
    frequency_rank: Mapped[Optional[int]] = mapped_column(
        Integer(),
        nullable=True
    )

    language: Mapped["Language"] = relationship("Language", lazy="select")

    __table_args__ = (
        UniqueConstraint("language_id", "word", name="uq_vocabulary_language_word"),
    )
