"""
Performance optimization configuration for ML Server
"""
import os
import asyncio
from typing import Dict, Any, Optional
from dataclasses import dataclass
from functools import lru_cache
import redis
import logging

logger = logging.getLogger(__name__)

@dataclass
class PerformanceConfig:
    """Configuration for ML server performance optimizations"""
    
    # Model caching
    model_cache_enabled: bool = True
    model_cache_ttl: int = 3600  # 1 hour
    
    # Result caching
    result_cache_enabled: bool = True
    result_cache_ttl: int = 300  # 5 minutes
    
    # Batch processing
    batch_size: int = 32
    batch_timeout: float = 0.1  # 100ms
    
    # Async processing
    max_concurrent_requests: int = 50
    request_timeout: float = 30.0
    
    # Model optimization
    model_quantization: bool = True
    model_pruning: bool = False
    
    # Memory management
    max_memory_usage: float = 0.8  # 80% of available memory
    garbage_collection_threshold: int = 1000  # requests
    
    # Redis configuration
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 1  # Separate from main app
    redis_max_connections: int = 20
    
    # Monitoring
    performance_logging: bool = True
    metrics_enabled: bool = True
    profiling_enabled: bool = False


class PerformanceManager:
    """Manages performance optimizations for ML server"""
    
    def __init__(self, config: PerformanceConfig):
        self.config = config
        self.redis_client: Optional[redis.Redis] = None
        self.request_count = 0
        self.semaphore = asyncio.Semaphore(config.max_concurrent_requests)
        
        # Initialize Redis connection
        self._init_redis()
    
    def _init_redis(self):
        """Initialize Redis connection for caching"""
        try:
            self.redis_client = redis.Redis(
                host=self.config.redis_host,
                port=self.config.redis_port,
                db=self.config.redis_db,
                max_connections=self.config.redis_max_connections,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            # Test connection
            self.redis_client.ping()
            logger.info("Redis connection established for ML caching")
        except Exception as e:
            logger.warning(f"Failed to connect to Redis: {e}")
            self.redis_client = None
    
    async def acquire_semaphore(self):
        """Acquire semaphore for request limiting"""
        return await self.semaphore.acquire()
    
    def release_semaphore(self):
        """Release semaphore"""
        self.semaphore.release()
    
    def cache_get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.config.result_cache_enabled or not self.redis_client:
            return None
        
        try:
            import pickle
            cached_data = self.redis_client.get(key)
            if cached_data:
                return pickle.loads(cached_data.encode('latin1'))
        except Exception as e:
            logger.warning(f"Cache get error for key {key}: {e}")
        
        return None
    
    def cache_set(self, key: str, value: Any, ttl: Optional[int] = None):
        """Set value in cache"""
        if not self.config.result_cache_enabled or not self.redis_client:
            return
        
        try:
            import pickle
            ttl = ttl or self.config.result_cache_ttl
            serialized = pickle.dumps(value).decode('latin1')
            self.redis_client.setex(key, ttl, serialized)
        except Exception as e:
            logger.warning(f"Cache set error for key {key}: {e}")
    
    def cache_delete(self, pattern: str):
        """Delete cache entries matching pattern"""
        if not self.redis_client:
            return
        
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                self.redis_client.delete(*keys)
        except Exception as e:
            logger.warning(f"Cache delete error for pattern {pattern}: {e}")
    
    def should_run_gc(self) -> bool:
        """Check if garbage collection should run"""
        self.request_count += 1
        return self.request_count % self.config.garbage_collection_threshold == 0
    
    def get_cache_key(self, prefix: str, **kwargs) -> str:
        """Generate cache key from parameters"""
        import hashlib
        import json
        
        # Sort kwargs for consistent key generation
        sorted_kwargs = sorted(kwargs.items())
        key_data = json.dumps(sorted_kwargs, sort_keys=True, default=str)
        key_hash = hashlib.md5(key_data.encode()).hexdigest()
        
        return f"ml_cache:{prefix}:{key_hash}"
    
    @lru_cache(maxsize=128)
    def get_model_config(self, model_type: str) -> Dict[str, Any]:
        """Get cached model configuration"""
        configs = {
            "event_classifier": {
                "max_features": 10000,
                "n_estimators": 100,
                "max_depth": 10
            },
            "schedule_optimizer": {
                "batch_size": 32,
                "optimization_steps": 100
            },
            "pattern_detector": {
                "n_clusters": 8,
                "min_samples": 5
            },
            "burnout_predictor": {
                "feature_selection": True,
                "regularization": 0.01
            }
        }
        return configs.get(model_type, {})


# Global performance manager instance
performance_config = PerformanceConfig()
performance_manager = PerformanceManager(performance_config)


class AsyncBatchProcessor:
    """Handles batch processing for ML requests"""
    
    def __init__(self, batch_size: int = 32, timeout: float = 0.1):
        self.batch_size = batch_size
        self.timeout = timeout
        self.pending_requests = []
        self.pending_futures = []
        self.processing_lock = asyncio.Lock()
    
    async def add_request(self, request_data: Dict[str, Any]) -> Any:
        """Add request to batch and wait for result"""
        future = asyncio.Future()
        
        async with self.processing_lock:
            self.pending_requests.append(request_data)
            self.pending_futures.append(future)
            
            # Process batch if full or start timer
            if len(self.pending_requests) >= self.batch_size:
                await self._process_batch()
            else:
                asyncio.create_task(self._process_with_timeout())
        
        return await future
    
    async def _process_with_timeout(self):
        """Process batch after timeout"""
        await asyncio.sleep(self.timeout)
        
        async with self.processing_lock:
            if self.pending_requests:
                await self._process_batch()
    
    async def _process_batch(self):
        """Process current batch of requests"""
        if not self.pending_requests:
            return
        
        requests = self.pending_requests.copy()
        futures = self.pending_futures.copy()
        
        self.pending_requests.clear()
        self.pending_futures.clear()
        
        try:
            # Process batch
            results = await self._batch_process(requests)
            
            # Set results
            for future, result in zip(futures, results):
                if not future.done():
                    future.set_result(result)
                    
        except Exception as e:
            # Set error for all futures
            for future in futures:
                if not future.done():
                    future.set_exception(e)
    
    async def _batch_process(self, requests: list) -> list:
        """Override this method in subclasses"""
        raise NotImplementedError("Subclasses must implement _batch_process")


def performance_monitor(func_name: str):
    """Decorator for monitoring function performance"""
    def decorator(func):
        import time
        from functools import wraps
        
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time
                
                if performance_config.performance_logging and duration > 1.0:
                    logger.warning(f"Slow ML operation: {func_name} took {duration:.2f}s")
                elif performance_config.performance_logging:
                    logger.debug(f"ML operation: {func_name} took {duration:.3f}s")
                
                return result
            except Exception as e:
                duration = time.time() - start_time
                logger.error(f"ML operation {func_name} failed after {duration:.2f}s: {e}")
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                
                if performance_config.performance_logging and duration > 1.0:
                    logger.warning(f"Slow ML operation: {func_name} took {duration:.2f}s")
                elif performance_config.performance_logging:
                    logger.debug(f"ML operation: {func_name} took {duration:.3f}s")
                
                return result
            except Exception as e:
                duration = time.time() - start_time
                logger.error(f"ML operation {func_name} failed after {duration:.2f}s: {e}")
                raise
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    
    return decorator