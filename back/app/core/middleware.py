import time
from collections import defaultdict
from typing import List, Tuple
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse
from app.core.config import settings
from app.core.logging import LoggerFactory

logger = LoggerFactory.get_logger("RateLimitMiddleware")

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app) -> None:
        super().__init__(app)
        self.requests = defaultdict(list)

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        path = request.url.path
        if path in ["/health", "/docs", "/openapi.json"] or path.startswith("/static"):
            return await call_next(request)

        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"

        now = time.time()
        window_start = now - settings.RATE_LIMIT_WINDOW_SECONDS
        
        history = self.requests[client_ip]
        self.requests[client_ip] = [t for t in history if t > window_start]
        
        current_count = len(self.requests[client_ip])
        if current_count >= settings.RATE_LIMIT_REQUESTS:
            logger.warning(
                f"Rate limit exceeded for IP: {client_ip}. Path: {path}. Count: {current_count}"
            )
            retry_after = int(settings.RATE_LIMIT_WINDOW_SECONDS - (now - self.requests[client_ip][0]))
            return JSONResponse(
                status_code=429,
                headers={"Retry-After": str(retry_after)},
                content={
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": "Rate limit exceeded. Please try again later.",
                        "details": f"Limit: {settings.RATE_LIMIT_REQUESTS} requests per {settings.RATE_LIMIT_WINDOW_SECONDS} seconds."
                    }
                }
            )

        self.requests[client_ip].append(now)
        return await call_next(request)
