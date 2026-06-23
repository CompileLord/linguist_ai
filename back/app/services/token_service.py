import time
import uuid
from typing import Optional
from jose import jwt, JWTError
from app.core.config import settings
from app.core.exceptions import UnauthorizedException
from app.schemas.token import TokenPayload

class TokenService:
    def __init__(self) -> None:
        self.secret_key = settings.JWT_SECRET_KEY
        self.algorithm = "HS256"

    def create_access_token(self, subject: str, extra_claims: Optional[dict] = None) -> str:
        now = int(time.time())
        expire = now + (settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
        claims = {
            "sub": subject,
            "exp": expire,
            "iat": now,
            "jti": str(uuid.uuid4()),
            "type": "access"
        }
        if extra_claims:
            claims.update(extra_claims)
        return jwt.encode(claims, self.secret_key, algorithm=self.algorithm)

    def create_refresh_token(self, subject: str) -> str:
        now = int(time.time())
        expire = now + (settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60)
        claims = {
            "sub": subject,
            "exp": expire,
            "iat": now,
            "jti": str(uuid.uuid4()),
            "type": "refresh"
        }
        return jwt.encode(claims, self.secret_key, algorithm=self.algorithm)

    def decode_token(self, token: str) -> TokenPayload:
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return TokenPayload(**payload)
        except jwt.ExpiredSignatureError:
            raise UnauthorizedException(detail="Token has expired", error_code="TOKEN_EXPIRED")
        except JWTError:
            raise UnauthorizedException(detail="Invalid token signature or format", error_code="TOKEN_INVALID")

_token_service = TokenService()

def get_token_service() -> TokenService:
    return _token_service
