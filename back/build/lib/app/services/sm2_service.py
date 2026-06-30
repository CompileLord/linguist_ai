from datetime import datetime, timedelta
from typing import Dict, Any
from dataclasses import dataclass

@dataclass
class SM2Result:
    new_interval_days: float
    new_ease_factor: float
    new_mastery_percent: float
    new_repetition_number: int
    next_review_date: datetime

class SM2AlgorithmService:
    def calculate_next_review(
        self,
        current_ease_factor: float,
        current_interval_days: float,
        repetition_number: int,
        quality: int
    ) -> SM2Result:
        new_ease_factor = current_ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        if new_ease_factor < 1.3:
            new_ease_factor = 1.3

        if quality < 3:
            new_interval_days = 1.0
            new_repetition_number = 0
        else:
            if repetition_number == 0:
                new_interval_days = 1.0
            elif repetition_number == 1:
                new_interval_days = 6.0
            else:
                new_interval_days = current_interval_days * current_ease_factor
            new_repetition_number = repetition_number + 1

        new_mastery_percent = min(100.0, max(0.0, new_repetition_number * 20.0 + (new_ease_factor - 1.3) * 15.0))

        next_review_date = datetime.utcnow() + timedelta(days=new_interval_days)

        return SM2Result(
            new_interval_days=new_interval_days,
            new_ease_factor=new_ease_factor,
            new_mastery_percent=new_mastery_percent,
            new_repetition_number=new_repetition_number,
            next_review_date=next_review_date
        )
