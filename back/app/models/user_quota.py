import uuid
from datetime import date
from sqlalchemy import ForeignKey, UniqueConstraint, String, Integer, Date, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, IDMixin

class UserQuota(Base, IDMixin):
    __tablename__ = "user_quotas"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    function_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    daily_limit: Mapped[int] = mapped_column(
        Integer(),
        nullable=False
    )
    current_usage: Mapped[int] = mapped_column(
        Integer(),
        default=0,
        server_default="0",
        nullable=False
    )
    last_reset_date: Mapped[date] = mapped_column(
        Date(),
        nullable=False
    )

    user: Mapped["User"] = relationship("User", lazy="select")

    __table_args__ = (
        UniqueConstraint("user_id", "function_name", name="uq_user_quotas_user_function"),
        Index("idx_user_quotas_user_id", "user_id"),
        Index("idx_user_quotas_user_function", "user_id", "function_name")
    )
