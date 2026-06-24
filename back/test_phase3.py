import uuid
import time
from fastapi.testclient import TestClient
from app.main import app
from app.services.ai.factory import get_ai_provider
from app.schemas.mission import MissionFeedback

class MockGenerateContentStreamResponse:
    def __init__(self, text: str):
        self.text = text

class MockModels:
    def generate_content_stream(self, model, contents, config=None):
        return [
            MockGenerateContentStreamResponse("Hello! "),
            MockGenerateContentStreamResponse("I'm "),
            MockGenerateContentStreamResponse("your "),
            MockGenerateContentStreamResponse("tutor.")
        ]

class MockClient:
    def __init__(self):
        self.models = MockModels()

class MockPhase3AIProvider:
    def __init__(self) -> None:
        self.client = MockClient()
        self.model = "gemini-2.5-flash"

    async def generate_content(
        self, prompt, system_instruction=None, config=None
    ):
        return "Hello! I'm your tutor."

    async def generate_content_stream(
        self, prompt, system_instruction=None, config=None
    ):
        yield "Hello! "
        yield "I'm "
        yield "your "
        yield "tutor."

    async def generate_structured(
        self,
        prompt,
        response_schema,
        system_instruction=None,
        config=None
    ):
        if response_schema.__name__ == "MissionFeedback":
            from app.schemas.mission import MissionFeedback
            return MissionFeedback(
                task_completion_score=90.0,
                accuracy_score=85.0,
                vocabulary_score=80.0,
                fluency_score=85.0,
                summary="Good job speaking.",
                strengths=["Nice grammar"],
                weaknesses=["Watch vocabulary range"],
                improvement_suggestions=["Use synonyms"]
            )
        raise ValueError("Unsupported schema")

def test_phase3_flow():
    app.dependency_overrides[get_ai_provider] = lambda: MockPhase3AIProvider()
    client = TestClient(app)

    email = f"test_p3_{uuid.uuid4().hex[:8]}@example.com"
    password = "testpassword123"
    reg_response = client.post(
        "/auth/register",
        json={"email": email, "password": password, "full_name": "Phase 3 User"}
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

    session_create_resp = client.post(
        "/tutor/sessions",
        headers=headers,
        json={
            "title": "General English Conversation",
            "topic_context": {"topic": "Introduction"}
        }
    )
    assert session_create_resp.status_code == 201
    session_data = session_create_resp.json()
    session_id = session_data["id"]

    active_resp = client.get("/tutor/sessions/active", headers=headers)
    assert active_resp.status_code == 200
    assert active_resp.json()["id"] == session_id

    sessions_resp = client.get("/tutor/sessions", headers=headers)
    assert sessions_resp.status_code == 200
    assert len(sessions_resp.json()) > 0

    with client.websocket_connect(f"/ws/tutor/{session_id}?token={access_token}") as ws:
        ws.send_json({"type": "ping"})
        pong_data = ws.receive_json()
        assert pong_data["type"] == "pong"

        ws.send_json({"type": "message", "content": "Hello tutor!"})
        
        chunks = []
        done_msg = None
        for _ in range(10):
            msg = ws.receive_json()
            print("WS1 RECEIVED:", msg)
            if msg["type"] == "chunk":
                chunks.append(msg["content"])
            elif msg["type"] == "done":
                done_msg = msg
                break
            elif msg["type"] == "error":
                raise Exception(f"WS Error: {msg}")

        assert done_msg is not None, "No done message received"
        assert done_msg["type"] == "done"
        assert "remaining" in done_msg

        ws.send_json({"type": "end_session"})
        end_data = ws.receive_json()
        assert end_data["type"] == "session_ended"

    messages_resp = client.get(f"/tutor/sessions/{session_id}/messages", headers=headers)
    assert messages_resp.status_code == 200
    messages = messages_resp.json()
    assert len(messages) >= 2
    assert messages[0]["content"] == "Hello tutor!"
    assert messages[1]["content"] == "Hello! I'm your tutor."

    end_resp = client.post(f"/tutor/sessions/{session_id}/end", headers=headers)
    assert end_resp.status_code == 200
    assert end_resp.json()["is_active"] is False

    missions_resp = client.get("/missions", headers=headers)
    assert missions_resp.status_code == 200
    missions = missions_resp.json()
    assert len(missions) > 0
    mission_id = missions[0]["id"]

    start_mission_resp = client.post(f"/missions/{mission_id}/start", headers=headers)
    assert start_mission_resp.status_code == 200
    start_data = start_mission_resp.json()
    assert "attempt_id" in start_data
    assert "session_id" in start_data
    attempt_id = start_data["attempt_id"]
    m_session_id = start_data["session_id"]

    with client.websocket_connect(f"/ws/tutor/{m_session_id}?token={access_token}") as ws:
        ws.send_json({"type": "message", "content": "I would like to order food."})
        for _ in range(10):
            msg = ws.receive_json()
            print("WS2 RECEIVED:", msg)
            if msg["type"] == "done":
                break
            elif msg["type"] == "error":
                raise Exception(f"WS Error: {msg}")

        ws.send_json({"type": "end_session"})
        end_data = ws.receive_json()
        assert end_data["type"] == "session_ended"

    complete_resp = client.post(
        f"/missions/{mission_id}/complete",
        headers=headers,
        json={"attempt_id": attempt_id}
    )
    assert complete_resp.status_code == 200
    complete_data = complete_resp.json()
    assert complete_data["status"] == "completed"
    assert complete_data["score"] == 86.0
    assert "strengths" in complete_data["feedback"]

    attempts_resp = client.get(f"/missions/{mission_id}/attempts", headers=headers)
    assert attempts_resp.status_code == 200
    assert len(attempts_resp.json()) > 0

    app.dependency_overrides.clear()

if __name__ == "__main__":
    test_phase3_flow()
    print("ALL PHASE 3 API TESTS PASSED SUCCESSFULLY!")
