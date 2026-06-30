import uuid
from typing import List, Optional
from sqlalchemy import ForeignKey, Index, Text, Enum, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, IDMixin
from app.models.enums import CEFRLevel

class ListeningExam(Base, IDMixin):
    __tablename__ = "listening_exams"

    language_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("languages.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    level: Mapped[CEFRLevel] = mapped_column(
        Enum(CEFRLevel, name="cefr_level"),
        nullable=False
    )
    script_text: Mapped[str] = mapped_column(
        Text(),
        nullable=False
    )
    scenario_type: Mapped[Optional[str]] = mapped_column(
        Text(),
        nullable=True
    )
    audio_url: Mapped[Optional[str]] = mapped_column(
        Text(),
        nullable=True
    )
    questions: Mapped[List[dict]] = mapped_column(
        JSON(),
        nullable=False
    )

    language: Mapped["Language"] = relationship("Language", lazy="select")

    __table_args__ = (
        Index("idx_listening_exams_lang_level", "language_id", "level"),
    )
