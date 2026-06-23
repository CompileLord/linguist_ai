from typing import Any
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

class AppException(Exception):
    def __init__(
        self,
        status_code: int = 500,
        detail: str = "Internal Server Error",
        error_code: str = "INTERNAL_ERROR",
        details: Any = None
    ) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail
        self.error_code = error_code
        self.details = details

class NotFoundException(AppException):
    def __init__(self, detail: str = "Resource Not Found", error_code: str = "NOT_FOUND", details: Any = None) -> None:
        super().__init__(status_code=404, detail=detail, error_code=error_code, details=details)

class ConflictException(AppException):
    def __init__(self, detail: str = "Conflict Occurred", error_code: str = "CONFLICT", details: Any = None) -> None:
        super().__init__(status_code=409, detail=detail, error_code=error_code, details=details)

class UnauthorizedException(AppException):
    def __init__(self, detail: str = "Unauthorized Access", error_code: str = "UNAUTHORIZED", details: Any = None) -> None:
        super().__init__(status_code=401, detail=detail, error_code=error_code, details=details)

class ForbiddenException(AppException):
    def __init__(self, detail: str = "Forbidden Access", error_code: str = "FORBIDDEN", details: Any = None) -> None:
        super().__init__(status_code=403, detail=detail, error_code=error_code, details=details)

class ValidationException(AppException):
    def __init__(self, detail: str = "Validation Failed", error_code: str = "VALIDATION_FAILED", details: Any = None) -> None:
        super().__init__(status_code=422, detail=detail, error_code=error_code, details=details)

class ExternalServiceException(AppException):
    def __init__(self, detail: str = "External Service Failure", error_code: str = "EXTERNAL_SERVICE_ERROR", details: Any = None) -> None:
        super().__init__(status_code=502, detail=detail, error_code=error_code, details=details)

class RateLimitException(AppException):
    def __init__(self, detail: str = "Rate Limit Exceeded", error_code: str = "RATE_LIMIT_EXCEEDED", details: Any = None) -> None:
        super().__init__(status_code=429, detail=detail, error_code=error_code, details=details)

async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.error_code,
                "message": exc.detail,
                "details": exc.details
            }
        }
    )

async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred.",
                "details": str(exc)
            }
        }
    )

def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)
