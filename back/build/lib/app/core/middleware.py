import time
from collections import defaultdict
from starlette.responses import JSONResponse
from app.core.config import settings
from app.core.logging import LoggerFactory

logger = LoggerFactory.get_logger("RateLimitMiddleware")

class RateLimitMiddleware:
    def __init__(self, app) -> None:
        self.app = app
        self.requests = defaultdict(list)

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        if path in ["/health", "/docs", "/openapi.json"] or path.startswith("/static"):
            await self.app(scope, receive, send)
            return

        client_ip = "unknown"
        headers = dict(scope.get("headers", []))
        forwarded = headers.get(b"x-forwarded-for")
        if forwarded:
            try:
                client_ip = forwarded.decode("latin-1").split(",")[0].strip()
            except Exception:
                pass
        else:
            client = scope.get("client")
            if client:
                client_ip = client[0]

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
            response = JSONResponse(
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
            await response(scope, receive, send)
            return

        self.requests[client_ip].append(now)
        await self.app(scope, receive, send)
