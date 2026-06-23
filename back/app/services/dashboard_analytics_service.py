import uuid
from datetime import datetime, date, timedelta
from typing import Dict, Any, List
from sqlalchemy import select, func, case, and_
from app.models.spaced_repetition_item import SpacedRepetitionItem
from app.repositories.spaced_repetition_repository import SpacedRepetitionRepository
from app.core.database import db_manager

class DashboardAnalyticsService:
    def __init__(self, spaced_repetition_repo: SpacedRepetitionRepository) -> None:
        self._spaced_repetition_repo = spaced_repetition_repo

    async def get_review_analytics(self, user_id: uuid.UUID, period_days: int = 30) -> Dict[str, Any]:
        daily_counts_raw = await self._spaced_repetition_repo.get_daily_review_counts(user_id, period_days)
        
        daily_counts = [{"date": d, "count": c} for d, c in daily_counts_raw]
        total_reviews = sum(c for d, c in daily_counts_raw)
        avg_reviews = float(total_reviews) / period_days if period_days > 0 else 0.0

        async with db_manager.get_session() as session:
            result = await session.execute(
                select(
                    func.coalesce(func.sum(case((SpacedRepetitionItem.mastery_percent <= 25.0, 1), else_=0)), 0).label("struggling"),
                    func.coalesce(func.sum(case((and_(SpacedRepetitionItem.mastery_percent > 25.0, SpacedRepetitionItem.mastery_percent <= 50.0), 1), else_=0)), 0).label("learning"),
                    func.coalesce(func.sum(case((and_(SpacedRepetitionItem.mastery_percent > 50.0, SpacedRepetitionItem.mastery_percent <= 75.0), 1), else_=0)), 0).label("familiar"),
                    func.coalesce(func.sum(case((SpacedRepetitionItem.mastery_percent > 75.0, 1), else_=0)), 0).label("mastered")
                ).filter(SpacedRepetitionItem.user_id == user_id)
            )
            row = result.one()
            mastery_distribution = {
                "struggling": int(row.struggling),
                "learning": int(row.learning),
                "familiar": int(row.familiar),
                "mastered": int(row.mastered)
            }

            result_dates = await session.execute(
                select(func.date(SpacedRepetitionItem.last_reviewed_at))
                .filter(SpacedRepetitionItem.user_id == user_id, SpacedRepetitionItem.last_reviewed_at != None)
                .group_by(func.date(SpacedRepetitionItem.last_reviewed_at))
                .order_by(func.date(SpacedRepetitionItem.last_reviewed_at).asc())
            )
            dates = [r[0] for r in result_dates.all() if r[0] is not None]

        current_streak = 0
        longest_streak = 0

        if dates:
            date_objs = []
            for d in dates:
                try:
                    date_objs.append(datetime.strptime(d, "%Y-%m-%d").date())
                except ValueError:
                    pass
            
            date_objs = sorted(list(set(date_objs)))

            if date_objs:
                longest_streak = 0
                current_seq = 0
                prev_date = None
                for d in date_objs:
                    if prev_date is None:
                        current_seq = 1
                    elif (d - prev_date).days == 1:
                        current_seq += 1
                    elif (d - prev_date).days > 1:
                        if current_seq > longest_streak:
                            longest_streak = current_seq
                        current_seq = 1
                    prev_date = d
                if current_seq > longest_streak:
                    longest_streak = current_seq

                today = date.today()
                yesterday = today - timedelta(days=1)

                if today in date_objs:
                    current_streak = 0
                    check_date = today
                    while check_date in date_objs:
                        current_streak += 1
                        check_date -= timedelta(days=1)
                elif yesterday in date_objs:
                    current_streak = 0
                    check_date = yesterday
                    while check_date in date_objs:
                        current_streak += 1
                        check_date -= timedelta(days=1)
                else:
                    current_streak = 0

        return {
            "daily_counts": daily_counts,
            "total_reviews_in_period": total_reviews,
            "average_daily_reviews": avg_reviews,
            "current_streak_days": current_streak,
            "longest_streak_days": longest_streak,
            "mastery_distribution": mastery_distribution
        }
