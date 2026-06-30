from typing import Optional
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, IDMixin, TimestampMixin

class Language(Base, IDMixin, TimestampMixin):
    __tablename__ = "languages"

    code: Mapped[str] = mapped_column(
        String(10),
        unique=True,
        index=True,
        nullable=False
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    native_name: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean(),
        default=True,
        server_default="true"
    )
    icon_url: Mapped[Optional[str]] = mapped_column(
        String(),
        nullable=True
    )
