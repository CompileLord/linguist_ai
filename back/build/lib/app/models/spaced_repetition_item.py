import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import Float, Integer, DateTime, ForeignKey, Index, UniqueConstraint, Enum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, IDMixin
from app.models.enums import SpacedRepetitionItemType

class SpacedRepetitionItem(Base, IDMixin):
    __tablename__ = "spaced_repetition_items"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    item_type: Mapped[SpacedRepetitionItemType] = mapped_column(
        Enum(SpacedRepetitionItemType, name="spaced_repetition_item_type"),
        nullable=False
    )
    item_id: Mapped[uuid.UUID] = mapped_column(
        nullable=False
    )
    learned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    last_reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    next_review_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True
    )
    interval_days: Mapped[float] = mapped_column(
        Float(),
        default=1.0,
        server_default="1.0"
    )
    repetition_number: Mapped[int] = mapped_column(
        Integer(),
        default=0,
        server_default="0"
    )
    ease_factor: Mapped[float] = mapped_column(
        Float(),
        default=2.5,
        server_default="2.5"
    )
    mastery_percent: Mapped[float] = mapped_column(
        Float(),
        default=0.0,
        server_default="0.0"
    )

    user: Mapped["User"] = relationship("User", lazy="select")

    __table_args__ = (
        UniqueConstraint("user_id", "item_type", "item_id", name="uq_spaced_repetition_user_type_item"),
        Index("idx_spaced_repetition_user_next_review", "user_id", "next_review_at"),
    )
