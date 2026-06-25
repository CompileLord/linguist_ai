import uuid
from sqlalchemy import String, Integer, Enum
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, IDMixin
from app.models.enums import ConditionType

class Achievement(Base, IDMixin):
    __tablename__ = "achievements"

    code: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    description: Mapped[str] = mapped_column(
        String(500),
        nullable=False
    )
    condition_type: Mapped[ConditionType] = mapped_column(
        Enum(ConditionType, name="condition_type"),
        nullable=False
    )
    condition_value: Mapped[int] = mapped_column(
        Integer(),
        nullable=False
    )
