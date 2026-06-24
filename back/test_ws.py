import sys
from app.main import app
from fastapi.testclient import TestClient
import uuid

with open("test_ws_debug.log", "w") as f:
    f.write("Starting test_ws\n")
    f.flush()

    # Set up mock auth
    client = TestClient(app)
    f.write("TestClient created\n")
    f.flush()

    email = f"test_ws_{uuid.uuid4().hex[:8]}@example.com"
    password = "testpassword123"
    reg_response = client.post("/auth/register", json={"email": email, "password": password, "full_name": "Phase 3 User"})
    f.write(f"Register status: {reg_response.status_code}\n")
    f.flush()
    
    access_token = reg_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    # Profile setup
    client.post("/profile/setup", headers=headers, json={"target_language_code": "en", "native_language_code": "ru", "daily_goal_minutes": 15, "goals": ["travel"]})
    f.write("Profile setup done\n")
    f.flush()

    # Create session
    session_create_resp = client.post("/tutor/sessions", headers=headers, json={"title": "General English", "topic_context": {}})
    session_id = session_create_resp.json()["id"]
    f.write(f"Session {session_id} created\n")
    f.flush()

    try:
        with client.websocket_connect(f"/ws/tutor/{session_id}?token={access_token}") as ws:
            f.write("Connected!\n")
            f.flush()
            ws.send_json({"type": "ping"})
            f.write("Sent ping, waiting for pong...\n")
            f.flush()
            pong = ws.receive_json()
            f.write(f"Received: {pong}\n")
            f.flush()
            
            f.write("Sending hello...\n")
            f.flush()
            ws.send_json({"type": "message", "content": "Hello tutor!"})
            for _ in range(5):
                f.write(f"Waiting for chunk {_}...\n")
                f.flush()
                chunk = ws.receive_json()
                f.write(f"Received: {chunk}\n")
                f.flush()
                if chunk.get("type") in ("done", "error"):
                    break
    except Exception as e:
        f.write(f"Exception: {e}\n")
        f.flush()

