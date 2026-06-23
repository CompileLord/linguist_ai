import uuid
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db_session
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.services.token_service import get_token_service, TokenService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db_session),
    token_service: TokenService = Depends(get_token_service)
) -> User:
    if not token:
        raise UnauthorizedException(detail="Not authenticated", error_code="NOT_AUTHENTICATED")
    
    payload = token_service.decode_token(token)
    repo = UserRepository(db)
    try:
        user_id = uuid.UUID(payload.sub)
    except ValueError:
        raise UnauthorizedException(detail="Invalid token subject formatting", error_code="TOKEN_INVALID")
        
    user = await repo.get_by_id(user_id)
    if not user:
        raise UnauthorizedException(detail="User not found", error_code="USER_NOT_FOUND")
        
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if not current_user.is_active:
        raise ForbiddenException(detail="Inactive user account", error_code="USER_INACTIVE")
    return current_user

async def get_current_superuser(
    current_user: User = Depends(get_current_active_user)
) -> User:
    if not current_user.is_superuser:
        raise ForbiddenException(detail="Requires superuser privileges", error_code="REQUIRES_SUPERUSER")
    return current_user
