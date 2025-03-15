from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session
import re
from .models import get_db
from .auth import log_activity

class ActivityLoggerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Skip logging for static files, API health checks, etc.
        path = request.url.path
        if (path.startswith("/static/") or 
            path == "/api/health" or 
            path.startswith("/favicon") or
            path.endswith(".ico") or
            path.endswith(".png") or
            path.endswith(".jpg") or
            path.endswith(".css") or
            path.endswith(".js")):
            return await call_next(request)
        
        # Get the response first
        response = await call_next(request)
        
        # Only log successful page views (status code 200-299)
        if 200 <= response.status_code < 300 and not path.startswith("/api/"):
            try:
                # Try to get the user from the session/token
                username = "anonymous"  # Default to anonymous
                
                # Extract token from Authorization header
                auth_header = request.headers.get("Authorization")
                if auth_header and auth_header.startswith("Bearer "):
                    from jose import JWTError, jwt
                    from .auth import SECRET_KEY, ALGORITHM
                    try:
                        token = auth_header.replace("Bearer ", "")
                        # Decode token without full validation
                        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                        username = payload.get("sub", "anonymous")
                    except Exception as e:
                        # If token validation fails, keep username as anonymous
                        print(f"Token validation error: {e}")
                
                # Log the page visit with the extracted username
                db = next(get_db())
                log_activity(
                    db=db,
                    username=username,  # Use the extracted username
                    action="Page visit",
                    details=f"Visited {path}",
                    ip_address=request.client.host,
                    user_agent=request.headers.get("user-agent"),
                    page_url=path
                )
            except Exception as e:
                # Don't let logging errors affect the response
                print(f"Error logging activity: {e}")
        
        return response

