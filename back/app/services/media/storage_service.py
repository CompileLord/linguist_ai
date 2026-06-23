import os
import hashlib
from pathlib import Path
from app.core.config import settings

class StorageService:
    def __init__(self) -> None:
        self.base_dir = Path(settings.LOCAL_STORAGE_DIR)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def generate_hash_path(self, data: bytes, extension: str) -> str:
        sha256_hash = hashlib.sha256(data).hexdigest()
        return f"{sha256_hash[:2]}/{sha256_hash[2:4]}/{sha256_hash}.{extension}"

    async def upload(self, data: bytes, destination_path: str, content_type: str) -> str:
        file_path = self.base_dir / destination_path
        file_path.parent.mkdir(parents=True, exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(data)
        return str(file_path)

    async def download(self, source_path: str) -> bytes:
        file_path = self.base_dir / source_path
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        with open(file_path, "rb") as f:
            return f.read()

    async def get_signed_url(self, path: str, expiration_minutes: int = 60) -> str:
        return f"/static/audio/{path}"

    async def exists(self, path: str) -> bool:
        file_path = self.base_dir / path
        return file_path.exists()

    async def delete(self, path: str) -> None:
        file_path = self.base_dir / path
        if file_path.exists():
            os.remove(file_path)

_storage_service = StorageService()

def get_storage_service() -> StorageService:
    return _storage_service
