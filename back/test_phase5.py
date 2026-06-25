import sys
from unittest.mock import MagicMock

mock_tts = MagicMock()
mock_tts_client = MagicMock()
mock_tts.TextToSpeechClient.return_value = mock_tts_client
mock_tts_client.synthesize_speech.return_value = MagicMock(audio_content=b"dummy_mp3")
sys.modules["google.cloud.texttospeech"] = mock_tts

mock_storage = MagicMock()
mock_storage_client = MagicMock()
mock_storage.Client.return_value = mock_storage_client
mock_blob = MagicMock()
mock_blob.public_url = "https://storage.googleapis.com/dummy/audio.mp3"
mock_storage_client.bucket.return_value.blob.return_value = mock_blob
sys.modules["google.cloud.storage"] = mock_storage

import uuid
import asyncio
from fastapi.testclient import TestClient
from app.main import app
from app.services.ai.factory import get_ai_provider
from app.models.enums import CEFRLevel
from app.schemas.writing_exam import WritingExamPromptGenerateAI, WritingEvaluationAI, WritingFeedbackItem
from app.schemas.listening_exam import ListeningExamAI, ListeningQuestionAI
from app.schemas.weekly_report import AICoachReportAI

class MockPhase5AIProvider:
    def __init__(self) -> None:
        self.model = "gemini-2.5-flash"

    async def generate_content(self, prompt, system_instruction=None, config=None):
        return "Mock content"

    async def generate_content_stream(self, prompt, system_instruction=None, config=None):
        yield "Mock content"

    async def generate_structured(self, prompt, response_schema, system_instruction=None, config=None):
        if response_schema.__name__ == "WritingExamPromptGenerateAI":
            return WritingExamPromptGenerateAI(
                prompt_text="Write an essay about environmental changes.",
                recommended_word_count=250,
                suggested_time_minutes=40
            )
        elif response_schema.__name__ == "WritingEvaluationAI":
            return WritingEvaluationAI(
                grammar_score=80.0,
                vocabulary_score=75.0,
                cohesion_score=70.0,
                naturalness_score=85.0,
                style_score=80.0,
                overall_score=78.0,
                feedback_items=[
                    WritingFeedbackItem(
                        criterion="grammar",
                        issue="Incorrect tense",
                        recommendation="Use past tense",
                        corrected_example="I went there."
                    )
                ]
            )
        elif response_schema.__name__ == "ListeningExamAI":
            return ListeningExamAI(
                script_text="Today Alice says: I like apples.",
                questions=[
                    ListeningQuestionAI(
                        question_text="What does Alice like?",
                        options=["Apples", "Oranges", "Bananas", "Pears"],
                        correct_answer_index=0,
                        explanation="Alice says 'I like apples'."
                    )
                ]
            )
        elif response_schema.__name__ == "AICoachReportAI":
            return AICoachReportAI(
                strengths="Your writing and grammar skills are extremely strong. You consistently demonstrate excellent coherence, cohesive devices, and high accuracy in all grammar elements across various CEFR levels.",
                weaknesses="Your listening comprehension in fast-paced dialogues shows a slight lag in response time, and you sometimes miss subtle contextual vocabulary cues.",
                recommendations="We highly recommend practicing active listening exercises daily. Listen to business news podcasts at 1.1x speed and write a detailed summary highlighting key points. Focus on advanced vocabulary acquisition."
            )
        raise ValueError("Unsupported schema")

def run_phase5_tests():
    app.dependency_overrides[get_ai_provider] = lambda: MockPhase5AIProvider()
    client = TestClient(app)

    email = f"test_p5_{uuid.uuid4().hex[:8]}@example.com"
    password = "testpassword123"
    reg_response = client.post(
        "/auth/register",
        json={"email": email, "password": password, "full_name": "Phase 5 User"}
    )
    assert reg_response.status_code == 201
    auth_data = reg_response.json()
    access_token = auth_data["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    setup_response = client.post(
        "/profile/setup",
        headers=headers,
        json={
            "target_language_code": "en",
            "native_language_code": "ru",
            "daily_goal_minutes": 15,
            "goals": ["travel"]
        }
    )
    assert setup_response.status_code == 201

    from app.core.database import db_manager
    from app.models.language import Language
    from sqlalchemy import select

    async def get_lang():
        async with db_manager.get_session() as session:
            res = await session.execute(select(Language).filter(Language.code == "en"))
            return res.scalar_one().id

    async def set_user_level():
        async with db_manager.get_session() as session:
            from app.models.user_profile import UserProfile
            from app.models.user import User
            res = await session.execute(select(UserProfile).join(User).filter(User.email == email))
            profile = res.scalar_one()
            profile.current_level = CEFRLevel.A1
            profile.onboarding_completed = True
            session.add(profile)
            await session.commit()

    async def make_superuser():
        async with db_manager.get_session() as session:
            from app.models.user import User
            res = await session.execute(select(User).filter(User.email == email))
            usr = res.scalar_one()
            usr.is_superuser = True
            session.add(usr)
            await session.commit()

    loop = asyncio.get_event_loop()
    lang_id = loop.run_until_complete(get_lang())
    loop.run_until_complete(set_user_level())

    stats_resp = client.get("/gamification/stats", headers=headers)
    assert stats_resp.status_code == 200
    stats_data = stats_resp.json()
    assert stats_data["total_xp"] == 0
    assert stats_data["current_game_level"] == 1
    assert stats_data["current_streak"] == 0

    quota_resp = client.get("/quota/status", headers=headers)
    assert quota_resp.status_code == 200
    quota_data = quota_resp.json()
    assert len(quota_data["quotas"]) == 6

    ach_resp = client.get("/achievements/all", headers=headers)
    assert ach_resp.status_code == 200
    ach_data = ach_resp.json()
    assert len(ach_data) == 15

    user_ach_resp = client.get("/achievements/user", headers=headers)
    assert user_ach_resp.status_code == 200
    assert len(user_ach_resp.json()) == 0

    recent_ach_resp = client.get("/achievements/recent", headers=headers)
    assert recent_ach_resp.status_code == 200
    assert len(recent_ach_resp.json()) == 0

    latest_report_resp = client.get("/coach/reports/latest", headers=headers)
    assert latest_report_resp.status_code == 404

    prompt_resp = client.get("/exams/writing/prompt", headers=headers)
    assert prompt_resp.status_code == 201
    exam_id = prompt_resp.json()["exam_id"]

    sub_resp = client.post(
        "/exams/writing/submit",
        headers=headers,
        json={"exam_id": exam_id, "submitted_text": "This is my essay about environment."}
    )
    assert sub_resp.status_code == 200

    stats_resp = client.get("/gamification/stats", headers=headers)
    assert stats_resp.status_code == 200
    assert stats_resp.json()["total_xp"] > 0

    user_ach_resp = client.get("/achievements/user", headers=headers)
    assert user_ach_resp.status_code == 200
    assert len(user_ach_resp.json()) > 0

    from app.models.listening_exam import ListeningExam

    async def seed_listening():
        async with db_manager.get_session() as session:
            exam = ListeningExam(
                language_id=lang_id,
                level=CEFRLevel.A1,
                script_text="Today Alice says: I like apples.",
                scenario_type="dialogue",
                questions=[
                    {
                        "question_text": "What does Alice like?",
                        "options": ["Apples", "Oranges", "Bananas", "Pears"],
                        "correct_answer_index": 0,
                        "explanation": "Alice says 'I like apples'."
                    }
                ]
            )
            session.add(exam)
            await session.commit()
            return exam.id

    listening_exam_id = loop.run_until_complete(seed_listening())

    sub_listening_resp = client.post(
        f"/exams/listening/{str(listening_exam_id)}/submit",
        headers=headers,
        json={"answers": {0: 0}}
    )
    assert sub_listening_resp.status_code == 200

    loop.run_until_complete(make_superuser())

    gen_resp = client.post("/admin/coach/generate-reports", headers=headers)
    assert gen_resp.status_code == 200

    reports_resp = client.get("/coach/reports", headers=headers)
    assert reports_resp.status_code == 200
    assert reports_resp.json()["total"] > 0

    latest_report_resp = client.get("/coach/reports/latest", headers=headers)
    assert latest_report_resp.status_code == 200
    assert len(latest_report_resp.json()["strengths"]) > 0

    app.dependency_overrides.clear()

if __name__ == "__main__":
    run_phase5_tests()
    print("ALL PHASE 5 INTEGRATION TESTS PASSED SUCCESSFULLY!")
