import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import Boolean, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, IDMixin, TimestampMixin

class UserVocabulary(Base, IDMixin, TimestampMixin):
    __tablename__ = "user_vocabulary"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    vocabulary_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("vocabulary.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    is_known: Mapped[bool] = mapped_column(
        Boolean(),
        default=False,
        server_default="false"
    )
    repetitions_count: Mapped[int] = mapped_column(
        Integer(),
        default=0,
        server_default="0"
    )
    errors_count: Mapped[int] = mapped_column(
        Integer(),
        default=0,
        server_default="0"
    )
    last_reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    user: Mapped["User"] = relationship("User", lazy="select")
    vocabulary: Mapped["Vocabulary"] = relationship("Vocabulary", lazy="select")

    __table_args__ = (
        UniqueConstraint("user_id", "vocabulary_id", name="uq_user_vocabulary_user_vocabulary"),
    )
