import uuid
from datetime import date
from sqlalchemy import ForeignKey, Integer, Date, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

class UserGamification(Base):
    __tablename__ = "user_gamification"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False
    )
    total_xp: Mapped[int] = mapped_column(
        Integer(),
        default=0,
        server_default="0",
        nullable=False
    )
    current_game_level: Mapped[int] = mapped_column(
        Integer(),
        default=1,
        server_default="1",
        nullable=False
    )
    current_streak: Mapped[int] = mapped_column(
        Integer(),
        default=0,
        server_default="0",
        nullable=False
    )
    longest_streak: Mapped[int] = mapped_column(
        Integer(),
        default=0,
        server_default="0",
        nullable=False
    )
    last_activity_date: Mapped[date | None] = mapped_column(
        Date(),
        nullable=True
    )
    has_unread_report: Mapped[bool] = mapped_column(
        Boolean(),
        default=False,
        server_default="false",
        nullable=False
    )
    total_speaking_minutes: Mapped[int] = mapped_column(
        Integer(),
        default=0,
        server_default="0",
        nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="gamification")
