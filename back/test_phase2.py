import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.services.ai.factory import get_ai_provider
from app.models.enums import CEFRLevel, SpacedRepetitionItemType, ErrorCategory
from app.schemas.user_error import ErrorDetectionResult, DetectedError
from app.schemas.vocabulary import ExtractedVocabularyResponse, ExtractedWord

from app.schemas.lesson import LessonContent
from app.schemas.placement import PlacementQuestion

class MockPhase2AIProvider:
    async def generate_structured(
        self,
        prompt,
        response_schema,
        system_instruction=None,
        config=None
    ):
        if response_schema == ErrorDetectionResult:
            return ErrorDetectionResult(
                errors=[
                    DetectedError(
                        error_text="goed",
                        correct_text="went",
                        category=ErrorCategory.GRAMMAR,
                        explanation="Goed is not a word. The past tense of go is went."
                    )
                ]
            )
        elif response_schema == ExtractedVocabularyResponse:
            return ExtractedVocabularyResponse(
                words=[
                    ExtractedWord(
                        word="apple",
                        translation="яблоко",
                        context_sentence="I ate an apple.",
                        transcription="ae-puhl",
                        part_of_speech="noun"
                    )
                ]
            )
        elif response_schema == PlacementQuestion:
            return PlacementQuestion(
                question_text="What is the past tense of go?",
                options=["go", "goes", "went", "gone"],
                correct_answer_index=2,
                difficulty_level=CEFRLevel.B1,
                explanation="Went is the past tense of go."
            )
        elif response_schema == LessonContent:
            content_dict = {
                "theory": {
                    "title": "Simple Past",
                    "explanation": "Simple Past is used to describe completed actions in the past.",
                    "key_points": ["Subject + V2"],
                    "grammar_notes": "Irregular verbs have unique forms."
                },
                "examples": [
                    {
                        "source_text": "I went to school.",
                        "translation": "Я пошел в школу.",
                        "context": "Past action",
                        "difficulty": "A1"
                    }
                ],
                "vocabulary": [
                    {
                        "word": "go",
                        "translation": "идти",
                        "pronunciation": "goh",
                        "part_of_speech": "verb",
                        "example_sentence": "I go to school.",
                        "audio_url": None
                    }
                ],
                "exercises": [
                    {
                        "type": "multiple_choice",
                        "question": "What is the past tense of run?",
                        "options": ["run", "ran", "running", "runs"],
                        "correct_answer": "ran",
                        "explanation": "Ran is the past tense.",
                        "hints": ["Starts with r"]
                    }
                ],
                "test": [
                    {
                        "question": "Did you ___ him?",
                        "options": ["see", "saw", "seen", "sees"],
                        "correct_index": 0,
                        "points": 5
                    }
                ],
                "speaking_task": {
                    "prompt": "Talk about your yesterday.",
                    "expected_response_keywords": ["yesterday", "went"],
                    "difficulty": "A2",
                    "duration_seconds": 60
                },
                "reading_text": {
                    "title": "A Day in London",
                    "content": "Yesterday, we visited London.",
                    "comprehension_questions": ["Where did we go?"]
                },
                "listening_script": {
                    "script_text": "Yesterday was a rainy day.",
                    "questions": [
                        {
                            "question": "How was the weather?",
                            "options": ["Sunny", "Rainy"],
                            "correct_index": 1
                        }
                    ],
                    "audio_url": None
                }
            }
            return LessonContent.model_validate(content_dict)
        raise ValueError("Unsupported schema in mock")

    async def generate_content(
        self,
        prompt,
        system_instruction=None,
        config=None
    ) -> str:
        return "What went wrong: goed is incorrect.\nRule: go is irregular.\nTip: Remember went."

def test_phase2_flow():
    app.dependency_overrides[get_ai_provider] = lambda: MockPhase2AIProvider()
    client = TestClient(app)

    email = f"test_p2_{uuid.uuid4().hex[:8]}@example.com"
    password = "testpassword123"
    reg_response = client.post(
        "/auth/register",
        json={"email": email, "password": password, "full_name": "Phase 2 User"}
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
    profile_data = setup_response.json()

    import asyncio
    from app.core.database import db_manager
    from app.models.language import Language
    from sqlalchemy import select
    async def get_lang():
        async with db_manager.get_session() as session:
            result = await session.execute(select(Language).filter(Language.code == "en"))
            return result.scalar_one_or_none()
    lang = asyncio.run(get_lang())
    en_id = str(lang.id)

    add_vocab_response = client.post(
        "/vocabulary",
        headers=headers,
        json={
            "language_id": en_id,
            "word": "banana",
            "translation_context": {"ru": "банан"},
            "transcription": "buh-nae-nuh",
            "cefr_level": "A1"
        }
    )
    assert add_vocab_response.status_code == 201
    vocab_data = add_vocab_response.json()
    assert vocab_data["vocabulary"]["word"] == "banana"
    vocab_id = vocab_data["vocabulary_id"]

    list_vocab_response = client.get(
        f"/vocabulary?language_id={en_id}",
        headers=headers
    )
    assert list_vocab_response.status_code == 200
    assert list_vocab_response.json()["total"] > 0

    list_user_vocab = client.get(
        "/vocabulary/user",
        headers=headers
    )
    assert list_user_vocab.status_code == 200
    assert len(list_user_vocab.json()["items"]) > 0

    review_response = client.post(
        f"/vocabulary/{vocab_id}/review",
        headers=headers,
        json={"quality": 4, "response_time_ms": 1500}
    )
    assert review_response.status_code == 200
    reviewed_vocab = review_response.json()
    assert reviewed_vocab["repetitions_count"] == 1
    assert reviewed_vocab["is_known"] is True

    queue_response = client.get(
        "/review/queue?batch_size=10",
        headers=headers
    )
    assert queue_response.status_code == 200
    queue = queue_response.json()
    assert len(queue) > 0
    item_id = queue[0]["id"]

    respond_response = client.post(
        f"/review/{item_id}/respond",
        headers=headers,
        json={"quality": 5, "response_time_ms": 800}
    )
    assert respond_response.status_code == 200
    responded_item = respond_response.json()
    assert responded_item["repetition_number"] == 1
    assert responded_item["ease_factor"] > 2.5

    stats_response = client.get(
        "/review/stats",
        headers=headers
    )
    assert stats_response.status_code == 200
    stats = stats_response.json()
    assert "streak_days" in stats
    assert "mastery_distribution" in stats

    lessons_response = client.get("/lessons/next", headers=headers)
    assert lessons_response.status_code == 200
    lesson_id = lessons_response.json()["id"]

    complete_response = client.post(
        f"/lessons/{lesson_id}/complete",
        headers=headers,
        json={
            "exercise_answers": ["goed"],
            "test_answers": [0],
            "time_spent_seconds": 150
        }
    )
    assert complete_response.status_code == 200

    import time
    time.sleep(2)

    errors_response = client.get(
        "/errors",
        headers=headers
    )
    assert errors_response.status_code == 200
    errors_list = errors_response.json()["items"]
    assert len(errors_list) > 0
    assert errors_list[0]["error_text"] == "goed"

    frequent_response = client.get(
        "/errors/frequent?min_count=1",
        headers=headers
    )
    assert frequent_response.status_code == 200
    assert len(frequent_response.json()) > 0

    summary_response = client.get(
        "/errors/summary",
        headers=headers
    )
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary["total_errors"] > 0

    app.dependency_overrides.clear()

if __name__ == "__main__":
    test_phase2_flow()
    print("ALL PHASE 2 API TESTS PASSED SUCCESSFULLY!")
