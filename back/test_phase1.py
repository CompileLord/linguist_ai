import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.services.ai.factory import get_ai_provider
from app.models.enums import CEFRLevel
from app.schemas.placement import PlacementQuestion
from app.schemas.lesson import LessonContent

class MockAIProvider:
    async def generate_structured(
        self,
        prompt,
        response_schema,
        system_instruction=None,
        config=None
    ):
        if response_schema == PlacementQuestion:
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
                    "key_points": ["Subject + V2", "Did for questions"],
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

def test_onboarding_and_lesson_flow():
    app.dependency_overrides[get_ai_provider] = lambda: MockAIProvider()
    client = TestClient(app)

    # 1. Register a test user
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    password = "testpassword123"
    reg_response = client.post(
        "/auth/register",
        json={"email": email, "password": password, "full_name": "Phase 1 User"}
    )
    assert reg_response.status_code == 201
    auth_data = reg_response.json()
    access_token = auth_data["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    # 2. Setup user profile
    setup_response = client.post(
        "/profile/setup",
        headers=headers,
        json={
            "target_language_code": "en",
            "native_language_code": "ru",
            "daily_goal_minutes": 15,
            "goals": ["travel", "programming"]
        }
    )
    assert setup_response.status_code == 201
    profile_data = setup_response.json()
    assert profile_data["native_language_code"] == "ru"
    assert len(profile_data["goals"]) == 2

    # 3. Start placement test
    start_test_response = client.post("/profile/placement/start", headers=headers)
    assert start_test_response.status_code == 200
    q1 = start_test_response.json()
    assert "question_text" in q1
    assert len(q1["options"]) == 4

    # 4. Answer placement questions until stabilized
    next_question = q1
    step = 0
    while next_question is not None and step < 12:
        ans_response = client.post(
            "/profile/placement/answer",
            headers=headers,
            json={"answer_index": 2}
        )
        assert ans_response.status_code == 200
        step_data = ans_response.json()
        next_question = step_data["next_question"]
        step += 1

    # 5. Fetch final placement result
    result_response = client.get("/profile/placement/result", headers=headers)
    assert result_response.status_code == 200
    res_data = result_response.json()
    assert "final_level" in res_data
    assert "accuracy" in res_data

    # 6. Retrieve profile and verify onboarding completed
    profile_get = client.get("/profile", headers=headers)
    assert profile_get.status_code == 200
    prof_data = profile_get.json()
    assert prof_data["onboarding_completed"] is True
    assert prof_data["current_level"] is not None

    # 7. Get next lesson (generates/retrieves)
    next_lesson_response = client.get("/lessons/next", headers=headers)
    assert next_lesson_response.status_code == 200
    lesson_data = next_lesson_response.json()
    assert "topic" in lesson_data
    assert "content" in lesson_data
    lesson_id = lesson_data["id"]

    # 8. Retrieve specific lesson
    get_lesson_response = client.get(f"/lessons/{lesson_id}", headers=headers)
    assert get_lesson_response.status_code == 200

    # 9. Complete the lesson
    complete_response = client.post(
        f"/lessons/{lesson_id}/complete",
        headers=headers,
        json={
            "exercise_answers": ["ran"],
            "test_answers": [0],
            "time_spent_seconds": 120
        }
    )
    assert complete_response.status_code == 200
    comp_data = complete_response.json()
    assert comp_data["score"] == 1.0
    assert comp_data["xp_earned"] > 0

    # 10. Check history
    history_response = client.get("/lessons/history", headers=headers)
    assert history_response.status_code == 200
    history_data = history_response.json()
    assert len(history_data) > 0
    assert history_data[0]["status"] == "completed"

    app.dependency_overrides.clear()

if __name__ == "__main__":
    test_onboarding_and_lesson_flow()
    print("ALL PHASE 1 API TESTS PASSED SUCCESSFULLY!")
