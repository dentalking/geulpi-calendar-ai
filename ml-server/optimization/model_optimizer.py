"""
Model optimization utilities for ML server performance
"""
import os
import pickle
import joblib
import numpy as np
import logging
from typing import Any, Dict, Optional, Union
from sklearn.base import BaseEstimator
import hashlib
import time
from functools import wraps

logger = logging.getLogger(__name__)


class ModelOptimizer:
    """Utility class for optimizing ML models for production"""
    
    def __init__(self, cache_dir: str = "cache/models"):
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)
    
    def compress_model(self, model: BaseEstimator, compression_level: int = 6) -> bytes:
        """Compress model using joblib with specified compression level"""
        import joblib
        from io import BytesIO
        
        buffer = BytesIO()
        joblib.dump(model, buffer, compress=compression_level)
        return buffer.getvalue()
    
    def decompress_model(self, compressed_data: bytes) -> BaseEstimator:
        """Decompress model from compressed bytes"""
        import joblib
        from io import BytesIO
        
        buffer = BytesIO(compressed_data)
        return joblib.load(buffer)
    
    def quantize_features(self, features: np.ndarray, dtype: np.dtype = np.float32) -> np.ndarray:
        """Quantize features to reduce memory usage"""
        if features.dtype != dtype:
            return features.astype(dtype)
        return features
    
    def create_model_hash(self, model_params: Dict[str, Any]) -> str:
        """Create hash of model parameters for caching"""
        param_str = str(sorted(model_params.items()))
        return hashlib.md5(param_str.encode()).hexdigest()
    
    def cache_model(self, model: BaseEstimator, model_id: str, metadata: Dict[str, Any] = None):
        """Cache model to disk with metadata"""
        try:
            cache_path = os.path.join(self.cache_dir, f"{model_id}.joblib")
            metadata_path = os.path.join(self.cache_dir, f"{model_id}_metadata.pkl")
            
            # Save model
            compressed_data = self.compress_model(model)
            with open(cache_path, 'wb') as f:
                f.write(compressed_data)
            
            # Save metadata
            if metadata:
                metadata['cached_at'] = time.time()
                metadata['model_size'] = len(compressed_data)
                with open(metadata_path, 'wb') as f:
                    pickle.dump(metadata, f)
            
            logger.info(f"Model cached: {model_id} ({len(compressed_data)} bytes)")
            
        except Exception as e:
            logger.error(f"Failed to cache model {model_id}: {e}")
    
    def load_cached_model(self, model_id: str) -> Optional[BaseEstimator]:
        """Load model from cache"""
        try:
            cache_path = os.path.join(self.cache_dir, f"{model_id}.joblib")
            metadata_path = os.path.join(self.cache_dir, f"{model_id}_metadata.pkl")
            
            if not os.path.exists(cache_path):
                return None
            
            # Load model
            with open(cache_path, 'rb') as f:
                compressed_data = f.read()
            
            model = self.decompress_model(compressed_data)
            
            # Load metadata if available
            if os.path.exists(metadata_path):
                with open(metadata_path, 'rb') as f:
                    metadata = pickle.load(f)
                logger.info(f"Model loaded from cache: {model_id} (cached at {metadata.get('cached_at')})")
            else:
                logger.info(f"Model loaded from cache: {model_id}")
            
            return model
            
        except Exception as e:
            logger.error(f"Failed to load cached model {model_id}: {e}")
            return None
    
    def get_cache_info(self, model_id: str) -> Optional[Dict[str, Any]]:
        """Get information about cached model"""
        try:
            metadata_path = os.path.join(self.cache_dir, f"{model_id}_metadata.pkl")
            
            if os.path.exists(metadata_path):
                with open(metadata_path, 'rb') as f:
                    return pickle.load(f)
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get cache info for {model_id}: {e}")
            return None
    
    def clear_cache(self, model_id: Optional[str] = None):
        """Clear model cache (all models or specific model)"""
        try:
            if model_id:
                # Clear specific model
                cache_path = os.path.join(self.cache_dir, f"{model_id}.joblib")
                metadata_path = os.path.join(self.cache_dir, f"{model_id}_metadata.pkl")
                
                for path in [cache_path, metadata_path]:
                    if os.path.exists(path):
                        os.remove(path)
                
                logger.info(f"Cache cleared for model: {model_id}")
            else:
                # Clear all models
                for file in os.listdir(self.cache_dir):
                    if file.endswith(('.joblib', '_metadata.pkl')):
                        os.remove(os.path.join(self.cache_dir, file))
                
                logger.info("All model cache cleared")
                
        except Exception as e:
            logger.error(f"Failed to clear cache: {e}")


class ModelPreloader:
    """Preload and manage multiple models for fast inference"""
    
    def __init__(self, max_models: int = 10):
        self.max_models = max_models
        self.loaded_models: Dict[str, BaseEstimator] = {}
        self.model_metadata: Dict[str, Dict[str, Any]] = {}
        self.usage_count: Dict[str, int] = {}
        self.optimizer = ModelOptimizer()
    
    def preload_model(self, model_id: str, model: BaseEstimator, metadata: Dict[str, Any] = None):
        """Preload model into memory"""
        if len(self.loaded_models) >= self.max_models:
            self._evict_least_used_model()
        
        self.loaded_models[model_id] = model
        self.model_metadata[model_id] = metadata or {}
        self.usage_count[model_id] = 0
        
        logger.info(f"Model preloaded: {model_id}")
    
    def get_model(self, model_id: str) -> Optional[BaseEstimator]:
        """Get model from memory or cache"""
        # Check if model is already loaded
        if model_id in self.loaded_models:
            self.usage_count[model_id] += 1
            return self.loaded_models[model_id]
        
        # Try to load from cache
        model = self.optimizer.load_cached_model(model_id)
        if model:
            self.preload_model(model_id, model)
            return model
        
        return None
    
    def _evict_least_used_model(self):
        """Evict the least used model from memory"""
        if not self.loaded_models:
            return
        
        # Find least used model
        least_used_id = min(self.usage_count.items(), key=lambda x: x[1])[0]
        
        # Remove from memory
        del self.loaded_models[least_used_id]
        del self.model_metadata[least_used_id]
        del self.usage_count[least_used_id]
        
        logger.info(f"Evicted model from memory: {least_used_id}")
    
    def get_memory_usage(self) -> Dict[str, Any]:
        """Get memory usage statistics"""
        total_models = len(self.loaded_models)
        total_usage = sum(self.usage_count.values())
        
        return {
            "loaded_models": total_models,
            "max_models": self.max_models,
            "total_usage_count": total_usage,
            "usage_by_model": dict(self.usage_count)
        }


def cached_inference(cache_ttl: int = 300):
    """Decorator for caching inference results"""
    def decorator(func):
        cache = {}
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create cache key
            cache_key = str(hash((str(args), str(sorted(kwargs.items())))))
            
            # Check cache
            if cache_key in cache:
                result, timestamp = cache[cache_key]
                if time.time() - timestamp < cache_ttl:
                    return result
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Cache result
            cache[cache_key] = (result, time.time())
            
            # Clean old cache entries
            current_time = time.time()
            expired_keys = [
                key for key, (_, timestamp) in cache.items()
                if current_time - timestamp >= cache_ttl
            ]
            for key in expired_keys:
                del cache[key]
            
            return result
        
        return wrapper
    return decorator


def optimize_numpy_operations():
    """Configure NumPy for optimal performance"""
    # Use all available CPU cores for NumPy operations
    os.environ['OMP_NUM_THREADS'] = str(os.cpu_count())
    os.environ['MKL_NUM_THREADS'] = str(os.cpu_count())
    os.environ['NUMEXPR_NUM_THREADS'] = str(os.cpu_count())
    
    # Set NumPy to use optimized BLAS if available
    try:
        import numpy as np
        np.show_config()
        logger.info("NumPy optimizations configured")
    except Exception as e:
        logger.warning(f"Failed to configure NumPy optimizations: {e}")


class MemoryProfiler:
    """Profile memory usage of ML operations"""
    
    def __init__(self):
        self.baseline_memory = self._get_memory_usage()
    
    def _get_memory_usage(self) -> float:
        """Get current memory usage in MB"""
        import psutil
        return psutil.Process().memory_info().rss / 1024 / 1024
    
    def profile_function(self, func_name: str):
        """Decorator to profile memory usage of a function"""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                start_memory = self._get_memory_usage()
                start_time = time.time()
                
                try:
                    result = func(*args, **kwargs)
                    
                    end_memory = self._get_memory_usage()
                    end_time = time.time()
                    
                    memory_used = end_memory - start_memory
                    execution_time = end_time - start_time
                    
                    if memory_used > 100:  # Log if using more than 100MB
                        logger.warning(
                            f"High memory usage in {func_name}: "
                            f"{memory_used:.1f}MB in {execution_time:.2f}s"
                        )
                    elif memory_used > 50:  # Log if using more than 50MB
                        logger.info(
                            f"Memory usage in {func_name}: "
                            f"{memory_used:.1f}MB in {execution_time:.2f}s"
                        )
                    
                    return result
                    
                except Exception as e:
                    end_memory = self._get_memory_usage()
                    memory_used = end_memory - start_memory
                    logger.error(
                        f"Function {func_name} failed with {memory_used:.1f}MB memory usage: {e}"
                    )
                    raise
            
            return wrapper
        return decorator


# Global instances
model_optimizer = ModelOptimizer()
model_preloader = ModelPreloader(max_models=8)
memory_profiler = MemoryProfiler()

# Configure NumPy optimizations on import
optimize_numpy_operations()