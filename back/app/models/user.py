from datetime import datetime
from typing import Optional
from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, IDMixin, TimestampMixin

class User(Base, IDMixin, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    full_name: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean(),
        default=True,
        server_default="true"
    )
    is_superuser: Mapped[bool] = mapped_column(
        Boolean(),
        default=False,
        server_default="false"
    )
    last_login_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    profile: Mapped[Optional["UserProfile"]] = relationship(
        "UserProfile",
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False
    )
    goals: Mapped[list["UserGoal"]] = relationship(
        "UserGoal",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    gamification: Mapped[Optional["UserGamification"]] = relationship(
        "UserGamification",
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False
    )


