import hashlib
from datetime import timedelta
from google.cloud import storage
from google.api_core.exceptions import GoogleAPIError
from app.core.config import settings
from app.core.exceptions import ExternalServiceException

class StorageService:
    def __init__(self) -> None:
        self.bucket_name = settings.GCS_BUCKET_NAME
        try:
            self.client = storage.Client()
        except Exception:
            self.client = None

    def _get_bucket(self) -> storage.Bucket:
        if not self.client:
            raise ExternalServiceException(
                detail="Google Cloud Storage client is not initialized",
                error_code="STORAGE_CLIENT_NOT_INITIALIZED"
            )
        try:
            return self.client.bucket(self.bucket_name)
        except GoogleAPIError as e:
            raise ExternalServiceException(
                detail=f"Failed to access bucket {self.bucket_name}: {str(e)}",
                error_code="STORAGE_BUCKET_ERROR"
            )

    def generate_hash_path(self, data: bytes, extension: str) -> str:
        sha256_hash = hashlib.sha256(data).hexdigest()
        return f"{sha256_hash[:2]}/{sha256_hash[2:4]}/{sha256_hash}.{extension}"

    async def upload(self, data: bytes, destination_path: str, content_type: str) -> str:
        try:
            bucket = self._get_bucket()
            blob = bucket.blob(destination_path)
            blob.upload_from_string(data, content_type=content_type)
            return f"gs://{self.bucket_name}/{destination_path}"
        except GoogleAPIError as e:
            raise ExternalServiceException(
                detail=f"Storage upload failed: {str(e)}",
                error_code="STORAGE_UPLOAD_ERROR"
            )

    async def download(self, source_path: str) -> bytes:
        try:
            bucket = self._get_bucket()
            blob = bucket.blob(source_path)
            return blob.download_as_bytes()
        except GoogleAPIError as e:
            raise ExternalServiceException(
                detail=f"Storage download failed: {str(e)}",
                error_code="STORAGE_DOWNLOAD_ERROR"
            )

    async def get_signed_url(self, path: str, expiration_minutes: int = 60) -> str:
        try:
            bucket = self._get_bucket()
            blob = bucket.blob(path)
            url = blob.generate_signed_url(
                version="v4",
                expiration=timedelta(minutes=expiration_minutes),
                method="GET"
            )
            return url
        except GoogleAPIError as e:
            raise ExternalServiceException(
                detail=f"Failed to generate signed URL: {str(e)}",
                error_code="STORAGE_SIGNED_URL_ERROR"
            )

    async def exists(self, path: str) -> bool:
        try:
            bucket = self._get_bucket()
            blob = bucket.blob(path)
            return blob.exists()
        except GoogleAPIError as e:
            raise ExternalServiceException(
                detail=f"Failed to check object existence: {str(e)}",
                error_code="STORAGE_EXIST_ERROR"
            )

    async def delete(self, path: str) -> None:
        try:
            bucket = self._get_bucket()
            blob = bucket.blob(path)
            blob.delete()
        except GoogleAPIError as e:
            raise ExternalServiceException(
                detail=f"Failed to delete object: {str(e)}",
                error_code="STORAGE_DELETE_ERROR"
            )

_storage_service = StorageService()

def get_storage_service() -> StorageService:
    return _storage_service
