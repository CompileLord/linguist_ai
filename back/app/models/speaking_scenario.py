from sqlalchemy import String, Text, Integer, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, IDMixin
from app.models.enums import CEFRLevel


class SpeakingScenario(Base, IDMixin):
    __tablename__ = "speaking_scenarios"
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text(), nullable=False)
    icon: Mapped[str] = mapped_column(String(100), nullable=False)  # material symbol name
    cefr_level: Mapped[CEFRLevel] = mapped_column(SAEnum(CEFRLevel, name="cefr_level", create_type=False), nullable=False, index=True)
    character_name: Mapped[str] = mapped_column(String(100), nullable=False)
    character_role: Mapped[str] = mapped_column(String(255), nullable=False)
    scene: Mapped[str] = mapped_column(Text(), nullable=False)  # 1-sentence scene setting
    prompt_context: Mapped[str] = mapped_column(Text(), nullable=False)  # extra AI instructions
    sort_order: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
