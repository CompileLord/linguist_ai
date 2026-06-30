import uuid
from datetime import date
from sqlalchemy import ForeignKey, Integer, Date, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, IDMixin

class UserDailyUsage(Base, IDMixin):
    __tablename__ = "user_daily_usages"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    activity_date: Mapped[date] = mapped_column(
        Date(),
        nullable=False
    )
    message_count: Mapped[int] = mapped_column(
        Integer(),
        default=0,
        server_default="0",
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint("user_id", "activity_date", name="uq_user_daily_usages_user_date"),
    )
