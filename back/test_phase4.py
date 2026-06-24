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

class MockPhase4AIProvider:
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
                script_text="Today we talk about food. Dialogue: Alice: I like apples. Bob: I prefer oranges.",
                questions=[
                    ListeningQuestionAI(
                        question_text="What does Alice like?",
                        options=["Apples", "Oranges", "Bananas", "Pears"],
                        correct_answer_index=0,
                        explanation="Alice says 'I like apples'."
                    )
                ]
            )
        raise ValueError("Unsupported schema")

def run_phase4_tests():
    app.dependency_overrides[get_ai_provider] = lambda: MockPhase4AIProvider()
    client = TestClient(app)

    email = f"test_p4_{uuid.uuid4().hex[:8]}@example.com"
    password = "testpassword123"
    reg_response = client.post(
        "/auth/register",
        json={"email": email, "password": password, "full_name": "Phase 4 User"}
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

    loop = asyncio.get_event_loop()
    lang_id = loop.run_until_complete(get_lang())
    loop.run_until_complete(set_user_level())

    exams = []
    for i in range(3):
        resp = client.get("/exams/writing/prompt", headers=headers)
        if resp.status_code != 201:
            print("ERROR RESP:", resp.status_code, resp.text)
        assert resp.status_code == 201
        data = resp.json()
        assert "exam_id" in data
        assert "prompt_text" in data
        exams.append(data["exam_id"])

    limit_resp = client.get("/exams/writing/prompt", headers=headers)
    assert limit_resp.status_code == 429
    assert limit_resp.json()["daily_limit"] == 3

    exam_id = exams[0]
    sub_resp = client.post(
        "/exams/writing/submit",
        headers=headers,
        json={"exam_id": exam_id, "submitted_text": "This is my essay about the environment."}
    )
    assert sub_resp.status_code == 200
    sub_data = sub_resp.json()
    assert sub_data["overall_score"] == 78.0

    dup_resp = client.post(
        "/exams/writing/submit",
        headers=headers,
        json={"exam_id": exam_id, "submitted_text": "Duplicate submission."}
    )
    assert dup_resp.status_code == 409

    hist_resp = client.get("/exams/writing/history", headers=headers)
    assert hist_resp.status_code == 200
    hist_data = hist_resp.json()
    assert hist_data["total"] == 3
    assert len(hist_data["items"]) == 3

    from app.models.listening_exam import ListeningExam

    async def seed_listening():
        async with db_manager.get_session() as session:
            exam = ListeningExam(
                language_id=lang_id,
                level=CEFRLevel.A1,
                script_text="This is seeded listening text script.",
                scenario_type="dialogue",
                questions=[
                    {
                        "question_text": "Is this seeded?",
                        "options": ["Yes", "No", "Maybe", "Never"],
                        "correct_answer_index": 0,
                        "explanation": "Indeed it is."
                    }
                ]
            )
            session.add(exam)
            await session.commit()
            return exam.id

    listening_exam_id = loop.run_until_complete(seed_listening())

    av_resp = client.get(
        f"/exams/listening/available?language_id={str(lang_id)}&level=A1",
        headers=headers
    )
    assert av_resp.status_code == 200
    av_data = av_resp.json()
    assert av_data["total"] >= 1

    details_resp = client.get(
        f"/exams/listening/{str(listening_exam_id)}/audio",
        headers=headers
    )
    assert details_resp.status_code == 200
    det_data = details_resp.json()
    assert "questions" in det_data
    assert "correct_answer_index" not in det_data["questions"][0]
    assert "explanation" not in det_data["questions"][0]

    trans_resp = client.get(
        f"/exams/listening/{str(listening_exam_id)}/transcript",
        headers=headers
    )
    assert trans_resp.status_code == 403

    sub_list_resp = client.post(
        f"/exams/listening/{str(listening_exam_id)}/submit",
        headers=headers,
        json={"answers": {0: 0}}
    )
    assert sub_list_resp.status_code == 200
    sub_l_data = sub_list_resp.json()
    assert sub_l_data["score"] == 100.0

    dup_list_resp = client.post(
        f"/exams/listening/{str(listening_exam_id)}/submit",
        headers=headers,
        json={"answers": {0: 0}}
    )
    assert dup_list_resp.status_code == 409

    trans_ok_resp = client.get(
        f"/exams/listening/{str(listening_exam_id)}/transcript",
        headers=headers
    )
    assert trans_ok_resp.status_code == 200
    assert trans_ok_resp.json()["script_text"] == "This is seeded listening text script."

    async def seed_more_listening():
        async with db_manager.get_session() as session:
            for k in range(5):
                exam = ListeningExam(
                    language_id=lang_id,
                    level=CEFRLevel.A1,
                    script_text=f"Script number {k}",
                    scenario_type="monologue",
                    questions=[
                        {
                            "question_text": "Question?",
                            "options": ["A", "B", "C", "D"],
                            "correct_answer_index": 0,
                            "explanation": "Ans"
                        }
                    ]
                )
                session.add(exam)
            await session.commit()

    loop.run_until_complete(seed_more_listening())

    av2_resp = client.get(
        f"/exams/listening/available?language_id={str(lang_id)}&level=A1",
        headers=headers
    )
    assert av2_resp.status_code == 200
    av2_data = av2_resp.json()
    
    submitted_count = 1
    for item in av2_data["items"]:
        exam_id_str = str(item["exam_id"])
        sub_resp = client.post(
            f"/exams/listening/{exam_id_str}/submit",
            headers=headers,
            json={"answers": {0: 0}}
        )
        if submitted_count < 5:
            assert sub_resp.status_code == 200
            submitted_count += 1
        else:
            assert sub_resp.status_code == 429
            break

    app.dependency_overrides.clear()

if __name__ == "__main__":
    run_phase4_tests()
    print("ALL PHASE 4 INTEGRATION TESTS PASSED SUCCESSFULLY!")
