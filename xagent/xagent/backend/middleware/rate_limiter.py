"""
Rate limiting middleware for FastAPI
Implements per-IP and per-user rate limiting
"""
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Dict, Tuple
import time

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware with different limits for different endpoint types
    """
    
    def __init__(self, app):
        super().__init__(app)
        # Store: {ip: [(timestamp, endpoint), ...]}
        self.requests: Dict[str, list] = defaultdict(list)
        # Store: {ip: {endpoint: block_until_timestamp}}
        self.blocked: Dict[str, Dict[str, float]] = defaultdict(dict)
        
        # Rate limits: (requests, time_window_seconds)
        self.limits = {
            'default': (100, 60),  # 100 requests per minute
            'login': (10, 3600),   # 10 login attempts per hour
            'signup': (5, 3600),   # 5 signup attempts per hour
            'api': (200, 60),      # 200 API calls per minute
        }
    
    async def dispatch(self, request: Request, call_next):
        # Get client IP
        client_ip = self._get_client_ip(request)
        
        # Determine rate limit type
        limit_type = self._get_limit_type(request.url.path)
        max_requests, window_seconds = self.limits[limit_type]
        
        # Check if IP is blocked
        if self._is_blocked(client_ip, limit_type):
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": f"Too many requests. Please try again later.",
                    "retry_after": int(self._get_block_remaining(client_ip, limit_type))
                }
            )
        
        # Clean old requests
        self._clean_old_requests(client_ip, window_seconds)
        
        # Check rate limit
        current_requests = len([
            ts for ts, endpoint in self.requests[client_ip]
            if endpoint == limit_type
        ])
        
        if current_requests >= max_requests:
            # Block the IP for the window duration
            self.blocked[client_ip][limit_type] = time.time() + window_seconds
            
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": f"Rate limit exceeded. Maximum {max_requests} requests per {window_seconds} seconds.",
                    "retry_after": window_seconds
                }
            )
        
        # Add request to tracking
        self.requests[client_ip].append((time.time(), limit_type))
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(max_requests)
        response.headers["X-RateLimit-Remaining"] = str(max_requests - current_requests - 1)
        response.headers["X-RateLimit-Reset"] = str(int(time.time() + window_seconds))
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP from request, considering proxies"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    def _get_limit_type(self, path: str) -> str:
        """Determine rate limit type based on endpoint"""
        if "/auth/login" in path or "/token" in path:
            return "login"
        elif "/auth/signup" in path or "/auth/register" in path:
            return "signup"
        elif "/api/" in path:
            return "api"
        else:
            return "default"
    
    def _is_blocked(self, ip: str, limit_type: str) -> bool:
        """Check if IP is currently blocked for this limit type"""
        if ip in self.blocked and limit_type in self.blocked[ip]:
            if time.time() < self.blocked[ip][limit_type]:
                return True
            else:
                # Block expired, remove it
                del self.blocked[ip][limit_type]
        return False
    
    def _get_block_remaining(self, ip: str, limit_type: str) -> float:
        """Get remaining block time in seconds"""
        if ip in self.blocked and limit_type in self.blocked[ip]:
            return max(0, self.blocked[ip][limit_type] - time.time())
        return 0
    
    def _clean_old_requests(self, ip: str, window_seconds: int):
        """Remove requests older than the time window"""
        if ip in self.requests:
            cutoff = time.time() - window_seconds
            self.requests[ip] = [
                (ts, endpoint) for ts, endpoint in self.requests[ip]
                if ts > cutoff
            ]
            
            # Remove IP if no requests left
            if not self.requests[ip]:
                del self.requests[ip]
