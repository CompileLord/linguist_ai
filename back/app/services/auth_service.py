import uuid
from app.models.user import User
from app.schemas.user import RegisterRequest, LoginRequest, AuthResponse, UserResponse
from app.repositories.interfaces.user import AbstractUserRepository
from app.services.password_service import PasswordService
from app.services.token_service import TokenService
from app.services.interfaces.auth import AbstractAuthService
from app.core.exceptions import ConflictException, UnauthorizedException

class AuthService(AbstractAuthService):
    def __init__(
        self,
        repository: AbstractUserRepository,
        password_service: PasswordService,
        token_service: TokenService
    ) -> None:
        super().__init__(repository)
        self.password_service = password_service
        self.token_service = token_service

    async def register(self, schema: RegisterRequest) -> AuthResponse:
        exists = await self._repository.exists_by_email(schema.email)
        if exists:
            raise ConflictException(detail="Email already registered", error_code="EMAIL_EXISTS")
        
        hashed = self.password_service.hash_password(schema.password)
        from app.models.user_gamification import UserGamification
        new_user = User(
            email=schema.email,
            hashed_password=hashed,
            full_name=schema.full_name,
            voice_name=schema.voice_name,
            is_active=True,
            is_superuser=False
        )
        new_user.gamification = UserGamification(
            total_xp=0,
            current_game_level=1,
            current_streak=0,
            longest_streak=0,
            last_activity_date=None,
            has_unread_report=False
        )
        saved_user = await self._repository.create(new_user)

        
        access_token = self.token_service.create_access_token(str(saved_user.id))
        refresh_token = self.token_service.create_refresh_token(str(saved_user.id))
        
        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse.from_orm(saved_user)
        )

    async def login(self, schema: LoginRequest) -> AuthResponse:
        user = await self._repository.get_by_email(schema.email)
        if not user:
            raise UnauthorizedException(detail="Incorrect email or password", error_code="INVALID_CREDENTIALS")
        
        valid = self.password_service.verify_password(schema.password, user.hashed_password)
        if not valid:
            raise UnauthorizedException(detail="Incorrect email or password", error_code="INVALID_CREDENTIALS")
        
        if not user.is_active:
            raise UnauthorizedException(detail="Inactive user account", error_code="USER_INACTIVE")

        await self._repository.update_last_login(user.id)
        
        access_token = self.token_service.create_access_token(str(user.id))
        refresh_token = self.token_service.create_refresh_token(str(user.id))
        
        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse.from_orm(user)
        )

    async def refresh(self, refresh_token: str) -> AuthResponse:
        payload = self.token_service.decode_token(refresh_token)
        if payload.type != "refresh":
            raise UnauthorizedException(detail="Invalid token type", error_code="TOKEN_INVALID")
            
        try:
            user_id = uuid.UUID(payload.sub)
        except ValueError:
            raise UnauthorizedException(detail="Invalid token subject format", error_code="TOKEN_INVALID")
            
        user = await self._repository.get_by_id(user_id)
        if not user or not user.is_active:
            raise UnauthorizedException(detail="User not found or inactive", error_code="USER_INACTIVE")
            
        new_access = self.token_service.create_access_token(str(user.id))
        new_refresh = self.token_service.create_refresh_token(str(user.id))
        
        return AuthResponse(
            access_token=new_access,
            refresh_token=new_refresh,
            user=UserResponse.from_orm(user)
        )

    async def get_user_by_token(self, token: str) -> User:
        payload = self.token_service.decode_token(token)
        if payload.type != "access":
            raise UnauthorizedException(detail="Invalid token type", error_code="TOKEN_INVALID")
            
        try:
            user_id = uuid.UUID(payload.sub)
        except ValueError:
            raise UnauthorizedException(detail="Invalid token subject format", error_code="TOKEN_INVALID")
            
        user = await self._repository.get_by_id(user_id)
        if not user:
            raise UnauthorizedException(detail="User not found", error_code="USER_NOT_FOUND")
        return user
