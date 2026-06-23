from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db_session
from app.schemas.user import RegisterRequest, LoginRequest, RefreshRequest, AuthResponse, UserResponse
from app.repositories.user_repository import UserRepository
from app.services.password_service import get_password_service
from app.services.token_service import get_token_service
from app.services.auth_service import AuthService
from app.api.dependencies.auth import get_current_active_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])

async def get_auth_service(db: AsyncSession = Depends(get_db_session)) -> AuthService:
    return AuthService(
        UserRepository(db),
        get_password_service(),
        get_token_service()
    )

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    schema: RegisterRequest,
    service: AuthService = Depends(get_auth_service)
) -> AuthResponse:
    return await service.register(schema)

@router.post("/login", response_model=AuthResponse, status_code=status.HTTP_200_OK)
async def login(
    schema: LoginRequest,
    service: AuthService = Depends(get_auth_service)
) -> AuthResponse:
    return await service.login(schema)

@router.post("/refresh", response_model=AuthResponse, status_code=status.HTTP_200_OK)
async def refresh(
    schema: RefreshRequest,
    service: AuthService = Depends(get_auth_service)
) -> AuthResponse:
    return await service.refresh(schema.refresh_token)

@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def me(
    current_user: User = Depends(get_current_active_user)
) -> UserResponse:
    return UserResponse.from_orm(current_user)
