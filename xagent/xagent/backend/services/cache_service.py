"""
Redis caching service
Provides caching for expensive operations
"""
import redis
import json
import os
from typing import Optional, Any
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

class CacheService:
    """
    Service for caching data in Redis
    """
    
    def __init__(self):
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        
        try:
            self.redis_client = redis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=5
            )
            # Test connection
            self.redis_client.ping()
            self.enabled = True
            logger.info("Redis cache connected successfully")
        except Exception as e:
            logger.warning(f"Redis not available, caching disabled: {str(e)}")
            self.redis_client = None
            self.enabled = False
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found
        """
        if not self.enabled:
            return None
        
        try:
            value = self.redis_client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.error(f"Cache get error: {str(e)}")
            return None
    
    def set(
        self,
        key: str,
        value: Any,
        ttl: int = 3600
    ) -> bool:
        """
        Set value in cache
        
        Args:
            key: Cache key
            value: Value to cache (must be JSON serializable)
            ttl: Time to live in seconds (default: 1 hour)
            
        Returns:
            True if successful, False otherwise
        """
        if not self.enabled:
            return False
        
        try:
            serialized = json.dumps(value)
            self.redis_client.setex(key, ttl, serialized)
            return True
        except Exception as e:
            logger.error(f"Cache set error: {str(e)}")
            return False
    
    def delete(self, key: str) -> bool:
        """
        Delete value from cache
        
        Args:
            key: Cache key
            
        Returns:
            True if successful, False otherwise
        """
        if not self.enabled:
            return False
        
        try:
            self.redis_client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Cache delete error: {str(e)}")
            return False
    
    def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching pattern
        
        Args:
            pattern: Pattern to match (e.g., "user:*")
            
        Returns:
            Number of keys deleted
        """
        if not self.enabled:
            return 0
        
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                return self.redis_client.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Cache delete pattern error: {str(e)}")
            return 0
    
    def exists(self, key: str) -> bool:
        """
        Check if key exists in cache
        
        Args:
            key: Cache key
            
        Returns:
            True if exists, False otherwise
        """
        if not self.enabled:
            return False
        
        try:
            return bool(self.redis_client.exists(key))
        except Exception as e:
            logger.error(f"Cache exists error: {str(e)}")
            return False
    
    def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """
        Increment a counter
        
        Args:
            key: Cache key
            amount: Amount to increment by
            
        Returns:
            New value or None if error
        """
        if not self.enabled:
            return None
        
        try:
            return self.redis_client.incrby(key, amount)
        except Exception as e:
            logger.error(f"Cache increment error: {str(e)}")
            return None
    
    def set_with_lock(
        self,
        key: str,
        value: Any,
        ttl: int = 3600,
        lock_timeout: int = 10
    ) -> bool:
        """
        Set value with distributed lock
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds
            lock_timeout: Lock timeout in seconds
            
        Returns:
            True if successful, False otherwise
        """
        if not self.enabled:
            return False
        
        lock_key = f"lock:{key}"
        
        try:
            # Acquire lock
            if not self.redis_client.set(lock_key, "1", nx=True, ex=lock_timeout):
                return False
            
            try:
                # Set value
                result = self.set(key, value, ttl)
                return result
            finally:
                # Release lock
                self.redis_client.delete(lock_key)
        except Exception as e:
            logger.error(f"Cache set with lock error: {str(e)}")
            return False

# Singleton instance
_cache_service: Optional[CacheService] = None

def get_cache_service() -> CacheService:
    """Get singleton cache service instance"""
    global _cache_service
    
    if _cache_service is None:
        _cache_service = CacheService()
    
    return _cache_service
