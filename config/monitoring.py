#!/usr/bin/env python3
"""
Production Monitoring and Health Check Configuration for Python Services
Provides comprehensive health checks, metrics, and monitoring for ML Server
"""

import os
import time
import asyncio
import psutil
import aiohttp
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, asdict
from collections import defaultdict, deque

try:
    import asyncpg
except ImportError:
    asyncpg = None

try:
    import aioredis
except ImportError:
    aioredis = None

from .logging import get_logger

logger = get_logger('monitoring')


@dataclass
class HealthCheckResult:
    """Result of a health check."""
    status: str  # 'pass', 'fail', 'warn'
    message: str
    duration: Optional[float] = None
    timestamp: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@dataclass
class MetricPoint:
    """Single metric data point."""
    timestamp: float
    value: float
    labels: Optional[Dict[str, str]] = None


class MetricsCollector:
    """Collects and stores application metrics."""
    
    def __init__(self, max_points: int = 1000):
        self.max_points = max_points
        self.metrics: Dict[str, deque] = defaultdict(lambda: deque(maxlen=max_points))
        self.counters: Dict[str, int] = defaultdict(int)
        self.gauges: Dict[str, float] = defaultdict(float)
        
    def record_counter(self, name: str, value: int = 1, labels: Optional[Dict[str, str]] = None):
        """Record a counter metric."""
        key = self._make_key(name, labels)
        self.counters[key] += value
        
    def record_gauge(self, name: str, value: float, labels: Optional[Dict[str, str]] = None):
        """Record a gauge metric."""
        key = self._make_key(name, labels)
        self.gauges[key] = value
        
    def record_histogram(self, name: str, value: float, labels: Optional[Dict[str, str]] = None):
        """Record a histogram metric."""
        key = self._make_key(name, labels)
        self.metrics[key].append(MetricPoint(
            timestamp=time.time(),
            value=value,
            labels=labels
        ))
        
    def get_counter(self, name: str, labels: Optional[Dict[str, str]] = None) -> int:
        """Get counter value."""
        key = self._make_key(name, labels)
        return self.counters.get(key, 0)
        
    def get_gauge(self, name: str, labels: Optional[Dict[str, str]] = None) -> float:
        """Get gauge value."""
        key = self._make_key(name, labels)
        return self.gauges.get(key, 0.0)
        
    def get_histogram_stats(self, name: str, labels: Optional[Dict[str, str]] = None) -> Dict[str, float]:
        """Get histogram statistics."""
        key = self._make_key(name, labels)
        points = self.metrics.get(key, deque())
        
        if not points:
            return {'count': 0, 'sum': 0.0, 'avg': 0.0, 'p50': 0.0, 'p95': 0.0, 'p99': 0.0}
            
        values = [p.value for p in points]
        values.sort()
        
        return {
            'count': len(values),
            'sum': sum(values),
            'avg': sum(values) / len(values),
            'p50': self._percentile(values, 50),
            'p95': self._percentile(values, 95),
            'p99': self._percentile(values, 99)
        }
        
    def _make_key(self, name: str, labels: Optional[Dict[str, str]] = None) -> str:
        """Create a key for the metric."""
        if not labels:
            return name
        label_str = ','.join(f'{k}={v}' for k, v in sorted(labels.items()))
        return f'{name}{{{label_str}}}'
        
    def _percentile(self, values: List[float], percentile: int) -> float:
        """Calculate percentile."""
        if not values:
            return 0.0
        index = int((percentile / 100) * len(values))
        return values[min(index, len(values) - 1)]


class HealthChecker:
    """Comprehensive health checker for Python services."""
    
    def __init__(self):
        self.checks: Dict[str, Callable] = {}
        self.metrics = MetricsCollector()
        self.start_time = time.time()
        self._initialize_checks()
        self._start_metrics_collection()
        
    def add_check(self, name: str, check_func: Callable):
        """Add a health check."""
        self.checks[name] = check_func
        
    def _initialize_checks(self):
        """Initialize default health checks."""
        self.add_check('system', self._check_system)
        self.add_check('memory', self._check_memory)
        self.add_check('disk', self._check_disk)
        self.add_check('database', self._check_database)
        self.add_check('redis', self._check_redis)
        self.add_check('external_services', self._check_external_services)
        
    async def _check_system(self) -> HealthCheckResult:
        """Check system resources."""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            load_avg = psutil.getloadavg()[0] if hasattr(psutil, 'getloadavg') else 0
            
            # CPU threshold
            cpu_threshold = 80
            status = 'warn' if cpu_percent > cpu_threshold else 'pass'
            
            return HealthCheckResult(
                status=status,
                message=f"CPU usage: {cpu_percent:.1f}%",
                details={
                    'cpu_percent': cpu_percent,
                    'load_average': load_avg,
                    'cpu_count': psutil.cpu_count()
                }
            )
        except Exception as e:
            return HealthCheckResult(
                status='fail',
                message=f"System check failed: {str(e)}",
                error=str(e)
            )
            
    async def _check_memory(self) -> HealthCheckResult:
        """Check memory usage."""
        try:
            memory = psutil.virtual_memory()
            memory_threshold = 85  # 85%
            
            status = 'warn' if memory.percent > memory_threshold else 'pass'
            
            return HealthCheckResult(
                status=status,
                message=f"Memory usage: {memory.percent:.1f}%",
                details={
                    'total': memory.total,
                    'available': memory.available,
                    'used': memory.used,
                    'percent': memory.percent
                }
            )
        except Exception as e:
            return HealthCheckResult(
                status='fail',
                message=f"Memory check failed: {str(e)}",
                error=str(e)
            )
            
    async def _check_disk(self) -> HealthCheckResult:
        """Check disk space."""
        try:
            disk = psutil.disk_usage('.')
            disk_threshold = 90  # 90%
            used_percent = (disk.used / disk.total) * 100
            
            status = 'warn' if used_percent > disk_threshold else 'pass'
            
            return HealthCheckResult(
                status=status,
                message=f"Disk usage: {used_percent:.1f}%",
                details={
                    'total': disk.total,
                    'used': disk.used,
                    'free': disk.free,
                    'percent': used_percent
                }
            )
        except Exception as e:
            return HealthCheckResult(
                status='fail',
                message=f"Disk check failed: {str(e)}",
                error=str(e)
            )
            
    async def _check_database(self) -> HealthCheckResult:
        """Check database connectivity."""
        database_url = os.getenv('DATABASE_URL')
        if not database_url or not asyncpg:
            return HealthCheckResult(
                status='pass',
                message='Database not configured or asyncpg not available'
            )
            
        try:
            start_time = time.time()
            conn = await asyncpg.connect(database_url)
            await conn.execute('SELECT 1')
            await conn.close()
            duration = time.time() - start_time
            
            return HealthCheckResult(
                status='pass',
                message='Database connection successful',
                duration=duration * 1000,  # Convert to ms
                details={'response_time_ms': duration * 1000}
            )
        except Exception as e:
            logger.error("Database health check failed", error=e, check='database')
            return HealthCheckResult(
                status='fail',
                message=f"Database check failed: {str(e)}",
                error=str(e)
            )
            
    async def _check_redis(self) -> HealthCheckResult:
        """Check Redis connectivity."""
        redis_url = os.getenv('REDIS_URL')
        if not redis_url or not aioredis:
            return HealthCheckResult(
                status='pass',
                message='Redis not configured or aioredis not available'
            )
            
        try:
            start_time = time.time()
            redis = aioredis.from_url(redis_url)
            await redis.ping()
            await redis.close()
            duration = time.time() - start_time
            
            return HealthCheckResult(
                status='pass',
                message='Redis connection successful',
                duration=duration * 1000,
                details={'response_time_ms': duration * 1000}
            )
        except Exception as e:
            logger.error("Redis health check failed", error=e, check='redis')
            return HealthCheckResult(
                status='fail',
                message=f"Redis check failed: {str(e)}",
                error=str(e)
            )
            
    async def _check_external_services(self) -> HealthCheckResult:
        """Check external API services."""
        services_status = []
        failures = []
        
        # Check OpenAI API
        if os.getenv('OPENAI_API_KEY'):
            try:
                async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
                    headers = {
                        'Authorization': f"Bearer {os.getenv('OPENAI_API_KEY')}",
                        'User-Agent': 'Geulpi-ML/1.0'
                    }
                    async with session.get('https://api.openai.com/v1/models', headers=headers) as resp:
                        if resp.status == 200:
                            services_status.append({'name': 'OpenAI', 'status': 'pass'})
                        else:
                            failures.append({'name': 'OpenAI', 'error': f'HTTP {resp.status}'})
            except Exception as e:
                failures.append({'name': 'OpenAI', 'error': str(e)})
                
        # Check Anthropic API
        if os.getenv('ANTHROPIC_API_KEY'):
            try:
                async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
                    headers = {
                        'x-api-key': os.getenv('ANTHROPIC_API_KEY'),
                        'Content-Type': 'application/json',
                        'anthropic-version': '2023-06-01'
                    }
                    data = {
                        'model': 'claude-3-haiku-20240307',
                        'max_tokens': 1,
                        'messages': [{'role': 'user', 'content': 'test'}]
                    }
                    async with session.post('https://api.anthropic.com/v1/messages', 
                                           headers=headers, json=data) as resp:
                        if resp.status < 500:  # Even 4xx means service is reachable
                            services_status.append({'name': 'Anthropic', 'status': 'pass'})
                        else:
                            failures.append({'name': 'Anthropic', 'error': f'HTTP {resp.status}'})
            except Exception as e:
                failures.append({'name': 'Anthropic', 'error': str(e)})
                
        total_services = len(services_status) + len(failures)
        if total_services == 0:
            status = 'pass'
            message = 'No external services configured'
        elif len(failures) == 0:
            status = 'pass'
            message = f'All {len(services_status)} external services healthy'
        elif len(failures) < total_services:
            status = 'warn'
            message = f'{len(services_status)} services up, {len(failures)} down'
        else:
            status = 'fail'
            message = f'All {len(failures)} external services down'
            
        return HealthCheckResult(
            status=status,
            message=message,
            details={
                'services': services_status,
                'failures': failures
            }
        )
        
    async def run_check(self, name: str) -> HealthCheckResult:
        """Run a specific health check."""
        check_func = self.checks.get(name)
        if not check_func:
            return HealthCheckResult(
                status='fail',
                message=f'Check {name} not found'
            )
            
        try:
            start_time = time.time()
            # Add timeout
            result = await asyncio.wait_for(check_func(), timeout=10.0)
            duration = time.time() - start_time
            
            result.duration = duration * 1000  # Convert to ms
            result.timestamp = datetime.utcnow().isoformat() + 'Z'
            
            return result
        except asyncio.TimeoutError:
            return HealthCheckResult(
                status='fail',
                message=f'Check {name} timed out',
                error='Timeout after 10 seconds'
            )
        except Exception as e:
            logger.error(f"Health check {name} failed", error=e, check=name)
            return HealthCheckResult(
                status='fail',
                message=f'Check {name} failed: {str(e)}',
                error=str(e)
            )
            
    async def run_all_checks(self) -> Dict[str, HealthCheckResult]:
        """Run all health checks."""
        tasks = [
            (name, self.run_check(name)) 
            for name in self.checks.keys()
        ]
        
        results = {}
        for name, task in tasks:
            try:
                results[name] = await task
            except Exception as e:
                logger.error(f"Failed to run check {name}", error=e)
                results[name] = HealthCheckResult(
                    status='fail',
                    message=f'Check execution failed: {str(e)}',
                    error=str(e)
                )
                
        return results
        
    def get_overall_status(self, checks: Dict[str, HealthCheckResult]) -> str:
        """Determine overall health status."""
        statuses = [check.status for check in checks.values()]
        
        if 'fail' in statuses:
            return 'fail'
        elif 'warn' in statuses:
            return 'warn'
        else:
            return 'pass'
            
    async def get_health_report(self) -> Dict[str, Any]:
        """Get comprehensive health report."""
        checks = await self.run_all_checks()
        overall_status = self.get_overall_status(checks)
        uptime = time.time() - self.start_time
        
        return {
            'status': overall_status,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'uptime': self._format_duration(uptime),
            'version': os.getenv('SERVICE_VERSION', '1.0.0'),
            'environment': os.getenv('NODE_ENV', 'development'),
            'service': os.getenv('SERVICE_NAME', 'geulpi-ml-server'),
            'checks': {name: asdict(result) for name, result in checks.items()},
            'metrics': self._get_metrics_summary()
        }
        
    def record_request(self, method: str, path: str, status_code: int, duration: float):
        """Record HTTP request metrics."""
        labels = {
            'method': method,
            'status_code': str(status_code)
        }
        
        self.metrics.record_counter('http_requests_total', 1, labels)
        self.metrics.record_histogram('http_request_duration_ms', duration * 1000, labels)
        
        if status_code >= 400:
            self.metrics.record_counter('http_requests_errors_total', 1, labels)
            
    def record_ml_inference(self, model: str, duration: float, success: bool, input_tokens: int = 0):
        """Record ML inference metrics."""
        labels = {
            'model': model,
            'success': str(success)
        }
        
        self.metrics.record_counter('ml_inferences_total', 1, labels)
        self.metrics.record_histogram('ml_inference_duration_ms', duration * 1000, labels)
        
        if input_tokens > 0:
            self.metrics.record_histogram('ml_input_tokens', input_tokens, labels)
            
        if not success:
            self.metrics.record_counter('ml_inference_errors_total', 1, labels)
            
    def record_database_query(self, duration: float, success: bool = True):
        """Record database query metrics."""
        labels = {'success': str(success)}
        
        self.metrics.record_counter('database_queries_total', 1, labels)
        self.metrics.record_histogram('database_query_duration_ms', duration * 1000, labels)
        
        if not success:
            self.metrics.record_counter('database_errors_total', 1, labels)
            
    def _get_metrics_summary(self) -> Dict[str, Any]:
        """Get metrics summary."""
        return {
            'requests': {
                'total': self.metrics.get_counter('http_requests_total'),
                'errors': self.metrics.get_counter('http_requests_errors_total'),
                'response_time': self.metrics.get_histogram_stats('http_request_duration_ms')
            },
            'ml_inferences': {
                'total': self.metrics.get_counter('ml_inferences_total'),
                'errors': self.metrics.get_counter('ml_inference_errors_total'),
                'duration': self.metrics.get_histogram_stats('ml_inference_duration_ms')
            },
            'database': {
                'queries': self.metrics.get_counter('database_queries_total'),
                'errors': self.metrics.get_counter('database_errors_total'),
                'response_time': self.metrics.get_histogram_stats('database_query_duration_ms')
            }
        }
        
    def _start_metrics_collection(self):
        """Start background metrics collection."""
        # This would typically run in a background task
        # For now, we'll just record system metrics when requested
        pass
        
    def _format_duration(self, seconds: float) -> str:
        """Format duration in human readable format."""
        if seconds < 60:
            return f"{int(seconds)}s"
        elif seconds < 3600:
            minutes = int(seconds // 60)
            secs = int(seconds % 60)
            return f"{minutes}m {secs}s"
        elif seconds < 86400:
            hours = int(seconds // 3600)
            minutes = int((seconds % 3600) // 60)
            return f"{hours}h {minutes}m"
        else:
            days = int(seconds // 86400)
            hours = int((seconds % 86400) // 3600)
            return f"{days}d {hours}h"
            
    def get_prometheus_metrics(self) -> str:
        """Export metrics in Prometheus format."""
        service_name = os.getenv('SERVICE_NAME', 'geulpi_ml_server').replace('-', '_')
        lines = []
        
        # HTTP request metrics
        total_requests = self.metrics.get_counter('http_requests_total')
        lines.extend([
            f'# HELP {service_name}_http_requests_total Total HTTP requests',
            f'# TYPE {service_name}_http_requests_total counter',
            f'{service_name}_http_requests_total {total_requests}'
        ])
        
        # ML inference metrics
        total_inferences = self.metrics.get_counter('ml_inferences_total')
        lines.extend([
            f'# HELP {service_name}_ml_inferences_total Total ML inferences',
            f'# TYPE {service_name}_ml_inferences_total counter',
            f'{service_name}_ml_inferences_total {total_inferences}'
        ])
        
        # System metrics
        try:
            memory = psutil.virtual_memory()
            lines.extend([
                f'# HELP {service_name}_memory_usage_bytes Memory usage in bytes',
                f'# TYPE {service_name}_memory_usage_bytes gauge',
                f'{service_name}_memory_usage_bytes {memory.used}'
            ])
            
            cpu_percent = psutil.cpu_percent()
            lines.extend([
                f'# HELP {service_name}_cpu_usage_percent CPU usage percentage',
                f'# TYPE {service_name}_cpu_usage_percent gauge',
                f'{service_name}_cpu_usage_percent {cpu_percent}'
            ])
        except Exception:
            pass
            
        return '\n'.join(lines) + '\n'


# Singleton instance
health_checker = HealthChecker()

# FastAPI middleware and endpoints would be defined separately
# This is just the core monitoring logic

__all__ = ['health_checker', 'HealthChecker', 'HealthCheckResult', 'MetricsCollector']
