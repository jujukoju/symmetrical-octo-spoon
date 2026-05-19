"""
oracle-api/middleware/request_id.py
------------------------------------
Starlette middleware that attaches a unique X-Request-ID to every request
and propagates it in the response headers.

Consumers can pass their own X-Request-ID; if absent, a UUID v4 is generated.
This ID is stored on request.state.request_id and echoed in all route responses,
making distributed tracing and support queries straightforward.
"""

import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id

        response: Response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response
