import uuid
from typing import Optional
from sqlalchemy import String, Boolean, Integer, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, IDMixin, TimestampMixin

class UserGoal(Base, IDMixin, TimestampMixin):
    __tablename__ = "user_goals"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    goal_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text(),
        nullable=True
    )
    is_primary: Mapped[bool] = mapped_column(
        Boolean(),
        default=False,
        server_default="false"
    )
    priority_order: Mapped[int] = mapped_column(
        Integer(),
        default=0,
        server_default="0"
    )

    user: Mapped["User"] = relationship("User", back_populates="goals")

    __table_args__ = (
        UniqueConstraint("user_id", "goal_type", name="uq_user_goals_user_id_goal_type"),
    )
