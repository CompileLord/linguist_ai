import os
import time
from enum import Enum
from typing import Optional

class ActionType(str, Enum):
    LESSON_COMPLETION = "LESSON_COMPLETION"
    EXERCISE_PASS = "EXERCISE_PASS"
    WRITING_EXAM_PASS = "WRITING_EXAM_PASS"
    LISTENING_EXAM_PASS = "LISTENING_EXAM_PASS"
    DAILY_LOGIN = "DAILY_LOGIN"
    SPEAKING_SESSION = "SPEAKING_SESSION"
    VOCABULARY_REVIEW = "VOCABULARY_REVIEW"

class XPCalculationService:
    def __init__(self) -> None:
        self._cache = {}
        self._cache_time = 0.0
        self._ttl = 300.0

    def _get_xp_values(self) -> dict:
        now = time.time()
        if now - self._cache_time < self._ttl and self._cache:
            return self._cache

        defaults = {
            ActionType.LESSON_COMPLETION: 50,
            ActionType.EXERCISE_PASS: 20,
            ActionType.WRITING_EXAM_PASS: 100,
            ActionType.LISTENING_EXAM_PASS: 80,
            ActionType.DAILY_LOGIN: 10,
            ActionType.SPEAKING_SESSION: 30,
            ActionType.VOCABULARY_REVIEW: 15
        }

        resolved = {}
        for action in ActionType:
            env_key = f"XP_{action.value}"
            val = os.getenv(env_key)
            if val is not None:
                try:
                    resolved[action] = int(val)
                except ValueError:
                    resolved[action] = defaults[action]
            else:
                resolved[action] = defaults[action]

        self._cache = resolved
        self._cache_time = now
        return resolved

    def calculate_xp(self, action_type: ActionType, score: Optional[float] = None) -> int:
        xp_values = self._get_xp_values()
        base_xp = xp_values.get(action_type, 0)
        
        if score is not None and score > 90.0:
            if action_type in (ActionType.WRITING_EXAM_PASS, ActionType.LISTENING_EXAM_PASS):
                return int(base_xp * 1.5)
        return base_xp
