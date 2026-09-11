import os
import sys

# Ensure backend directory is in the Python search path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app as fastapi_app

async def app(scope, receive, send):
    """
    ASGI middleware wrapper for Vercel Serverless Function.
    Ensures that rewritten paths (via x-matched-path or x-forwarded-uri)
    are properly resolved by FastAPI.
    """
    if scope["type"] in ("http", "websocket"):
        headers = dict(scope.get("headers", []))
        
        # Check if Vercel provided the original matched path
        matched_path = headers.get(b"x-matched-path", b"").decode("utf-8")
        if matched_path:
            scope["path"] = matched_path.split("?")[0]
        elif scope["path"] in ("/api/index.py", "/api/index", "/api"):
            forwarded = headers.get(b"x-forwarded-uri", b"").decode("utf-8")
            if forwarded:
                scope["path"] = forwarded.split("?")[0]

    await fastapi_app(scope, receive, send)
