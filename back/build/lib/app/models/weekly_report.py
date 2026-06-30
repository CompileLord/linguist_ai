import uuid
from datetime import date, datetime
from sqlalchemy import ForeignKey, UniqueConstraint, Date, DateTime, Text, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, IDMixin

class WeeklyReport(Base, IDMixin):
    __tablename__ = "weekly_reports"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    period_start: Mapped[date] = mapped_column(
        Date(),
        nullable=False
    )
    period_end: Mapped[date] = mapped_column(
        Date(),
        nullable=False
    )
    strengths: Mapped[str] = mapped_column(
        Text(),
        nullable=False
    )
    weaknesses: Mapped[str] = mapped_column(
        Text(),
        nullable=False
    )
    recommendations: Mapped[str] = mapped_column(
        Text(),
        nullable=False
    )
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    user: Mapped["User"] = relationship("User", lazy="select")

    __table_args__ = (
        UniqueConstraint("user_id", "period_start", name="uq_weekly_reports_user_period_start"),
        Index("idx_weekly_reports_user_generated_at", "user_id", generated_at.desc())
    )
