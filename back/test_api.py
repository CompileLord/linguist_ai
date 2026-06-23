import uuid
from fastapi.testclient import TestClient
from app.main import app

def test_root():
    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "LinguistAI"

def test_health():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "database" in data["checks"]
    assert data["checks"]["database"]["status"] == "up"

def test_auth_flow():
    client = TestClient(app)
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    password = "testpassword123"
    
    register_payload = {
        "email": email,
        "password": password,
        "full_name": "Test User"
    }
    
    reg_response = client.post("/auth/register", json=register_payload)
    assert reg_response.status_code == 201
    reg_data = reg_response.json()
    assert "access_token" in reg_data
    assert "refresh_token" in reg_data
    assert reg_data["user"]["email"] == email
    
    login_payload = {
        "email": email,
        "password": password
    }
    login_response = client.post("/auth/login", json=login_payload)
    assert login_response.status_code == 200
    login_data = login_response.json()
    assert "access_token" in login_data
    access_token = login_data["access_token"]
    
    headers = {"Authorization": f"Bearer {access_token}"}
    me_response = client.get("/auth/me", headers=headers)
    assert me_response.status_code == 200
    me_data = me_response.json()
    assert me_data["email"] == email
    assert me_data["full_name"] == "Test User"
    
    refresh_payload = {
        "refresh_token": reg_data["refresh_token"]
    }
    ref_response = client.post("/auth/refresh", json=refresh_payload)
    assert ref_response.status_code == 200
    ref_data = ref_response.json()
    assert "access_token" in ref_data
    assert "refresh_token" in ref_data

if __name__ == "__main__":
    test_root()
    test_health()
    test_auth_flow()
    print("ALL API TESTS PASSED SUCCESSFULLY!")
