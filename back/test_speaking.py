import sys
import uuid
import base64
from fastapi.testclient import TestClient
from app.main import app

def run_speaking_tests():
    client = TestClient(app)
    email = f"test_speaking_{uuid.uuid4().hex[:8]}@example.com"
    password = "testpassword123"
    reg_response = client.post(
        "/auth/register",
        json={"email": email, "password": password, "full_name": "Speaking User", "voice_name": "hfc_female"}
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

    voices_response = client.get("/auth/voices")
    assert voices_response.status_code == 200
    voices = voices_response.json()
    assert len(voices) > 0
    assert any(v["id"] == "hfc_female" for v in voices)

    start_response = client.post("/speaking/start", headers=headers)
    assert start_response.status_code == 201
    session_id = start_response.json()["session_id"]
    assert session_id is not None

    with client.websocket_connect(f"/ws/speaking/{session_id}?token={access_token}") as ws:
        ws.send_json({"type": "ping"})
        pong = ws.receive_json()
        assert pong["type"] == "pong"

        ws.send_json({"type": "text", "content": "Hello speaking coach!"})
        
        chunks_received = 0
        audio_received = False
        done_received = False

        for _ in range(20):
            msg = ws.receive_json()
            if msg["type"] == "chunk":
                chunks_received += 1
            elif msg["type"] == "audio":
                audio_received = True
                assert msg["data"] is not None
            elif msg["type"] == "done":
                done_received = True
                break
            elif msg["type"] == "error":
                print(f"Error from WebSocket: {msg['content']}")
                break

        assert chunks_received > 0 or audio_received or done_received

    end_response = client.post(f"/speaking/end?session_id={session_id}", headers=headers)
    assert end_response.status_code == 200
    end_data = end_response.json()
    assert "duration_minutes" in end_data
    assert "xp_earned" in end_data

if __name__ == "__main__":
    run_speaking_tests()
    print("ALL SPEAKING SESSION TESTS PASSED SUCCESSFULLY!")
