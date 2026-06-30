from enum import Enum

class CEFRLevel(str, Enum):
    A1 = "A1"
    A2 = "A2"
    B1 = "B1"
    B2 = "B2"
    C1 = "C1"
    C2 = "C2"

    @property
    def description(self) -> str:
        mapping = {
            "A1": "Beginner",
            "A2": "Elementary",
            "B1": "Intermediate",
            "B2": "Upper Intermediate",
            "C1": "Advanced",
            "C2": "Proficient"
        }
        return mapping[self.value]

    @classmethod
    def from_score(cls, score: float) -> "CEFRLevel":
        if score < 0.2:
            return cls.A1
        elif score < 0.4:
            return cls.A2
        elif score < 0.6:
            return cls.B1
        elif score < 0.8:
            return cls.B2
        elif score < 0.95:
            return cls.C1
        else:
            return cls.C2

class SpacedRepetitionItemType(str, Enum):
    VOCAB = "vocab"
    GRAMMAR = "grammar"

class ErrorCategory(str, Enum):
    GRAMMAR = "grammar"
    VOCABULARY = "vocabulary"

class ConditionType(str, Enum):
    LESSONS_COMPLETED = "lessons_completed"
    STREAK_DAYS = "streak_days"
    WORDS_LEARNED = "words_learned"
    EXAMS_PASSED = "exams_passed"
    SPEAKING_MINUTES = "speaking_minutes"
    SPECIFIC_ACTION = "specific_action"


