#!/usr/bin/env python3
"""
Production-Ready Logging Configuration for Python Services
Using structlog for structured, high-performance logging
"""

import os
import sys
import json
import logging
import logging.handlers
from pathlib import Path
from datetime import datetime
from typing import Any, Dict, Optional

import structlog
from structlog.typing import EventDict, Processor

# Configuration from environment variables
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO').upper()
LOG_FORMAT = os.getenv('LOG_FORMAT', 'json').lower()
LOG_FILE_ENABLED = os.getenv('LOG_FILE_ENABLED', 'false').lower() == 'true'
LOG_FILE_PATH = os.getenv('LOG_FILE_PATH', './logs')
LOG_FILE_MAX_SIZE = os.getenv('LOG_FILE_MAX_SIZE', '10MB')
LOG_FILE_MAX_FILES = int(os.getenv('LOG_FILE_MAX_FILES', '10'))
ENVIRONMENT = os.getenv('NODE_ENV', 'development')
SERVICE_NAME = os.getenv('SERVICE_NAME', 'geulpi-ml-server')
SERVICE_VERSION = os.getenv('SERVICE_VERSION', '1.0.0')


def parse_size(size_str: str) -> int:
    """Parse size strings like '10MB' into bytes."""
    units = {
        'B': 1,
        'KB': 1024,
        'MB': 1024 * 1024,
        'GB': 1024 * 1024 * 1024
    }
    
    try:
        if size_str[-2:].upper() in units:
            number = int(size_str[:-2])
            unit = size_str[-2:].upper()
        elif size_str[-1:].upper() in units:
            number = int(size_str[:-1])
            unit = size_str[-1:].upper()
        else:
            number = int(size_str)
            unit = 'B'
        
        return number * units[unit]
    except (ValueError, KeyError):
        return 10 * 1024 * 1024  # Default 10MB


def ensure_log_directory() -> Path:
    """Ensure log directory exists."""
    log_dir = Path(LOG_FILE_PATH)
    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir


def add_standard_fields(logger: Any, method_name: str, event_dict: EventDict) -> EventDict:
    """Add standard fields to all log entries."""
    event_dict.update({
        'service': SERVICE_NAME,
        'environment': ENVIRONMENT,
        'version': SERVICE_VERSION,
        'hostname': os.uname().nodename,
        'pid': os.getpid(),
    })
    return event_dict


def add_request_id(logger: Any, method_name: str, event_dict: EventDict) -> EventDict:
    """Add request ID if available from context."""
    # This would typically come from middleware or request context
    request_id = getattr(structlog.contextvars, 'request_id', None)
    if request_id:
        event_dict['request_id'] = request_id
    return event_dict


def filter_by_level(logger: Any, method_name: str, event_dict: EventDict) -> EventDict:
    """Filter logs by level - drop events below configured level."""
    level_mapping = {
        'debug': 10,
        'info': 20,
        'warning': 30,
        'error': 40,
        'critical': 50
    }
    
    current_level = level_mapping.get(LOG_LEVEL.lower(), 20)
    event_level = level_mapping.get(method_name, 20)
    
    if event_level < current_level:
        raise structlog.DropEvent
    
    return event_dict


def format_exception_info(logger: Any, method_name: str, event_dict: EventDict) -> EventDict:
    """Format exception information."""
    if 'exc_info' in event_dict:
        exc_info = event_dict.pop('exc_info')
        if exc_info:
            import traceback
            event_dict['exception'] = {
                'type': exc_info[0].__name__ if exc_info[0] else None,
                'message': str(exc_info[1]) if exc_info[1] else None,
                'traceback': traceback.format_exception(*exc_info) if exc_info[0] else None
            }
    return event_dict


def performance_processor(logger: Any, method_name: str, event_dict: EventDict) -> EventDict:
    """Add performance monitoring fields."""
    if 'duration' in event_dict:
        duration = event_dict['duration']
        if isinstance(duration, (int, float)):
            # Classify performance based on duration
            if duration > 5000:  # 5 seconds
                event_dict['performance_class'] = 'slow'
            elif duration > 1000:  # 1 second
                event_dict['performance_class'] = 'medium'
            else:
                event_dict['performance_class'] = 'fast'
    
    return event_dict


def security_processor(logger: Any, method_name: str, event_dict: EventDict) -> EventDict:
    """Security-related log processing."""
    # Mark security events
    security_keywords = ['auth', 'login', 'permission', 'access', 'security', 'token']
    event_msg = str(event_dict.get('event', '')).lower()
    
    if any(keyword in event_msg for keyword in security_keywords):
        event_dict['category'] = 'security'
        # Remove sensitive information
        for key in list(event_dict.keys()):
            if any(sensitive in key.lower() for sensitive in ['password', 'token', 'secret', 'key']):
                event_dict[key] = '[REDACTED]'
    
    return event_dict


def setup_stdlib_logging() -> None:
    """Configure standard library logging to work with structlog."""
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, LOG_LEVEL))
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Create formatters
    if LOG_FORMAT == 'json':
        formatter = logging.Formatter(
            '%(message)s'  # structlog will handle the JSON formatting
        )
    else:
        formatter = logging.Formatter(
            '%(asctime)s [%(levelname)s] %(name)s: %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(getattr(logging, LOG_LEVEL))
    root_logger.addHandler(console_handler)
    
    # File handlers (if enabled)
    if LOG_FILE_ENABLED:
        log_dir = ensure_log_directory()
        max_bytes = parse_size(LOG_FILE_MAX_SIZE)
        
        # Combined log file
        combined_handler = logging.handlers.RotatingFileHandler(
            log_dir / 'combined.log',
            maxBytes=max_bytes,
            backupCount=LOG_FILE_MAX_FILES
        )
        combined_handler.setFormatter(formatter)
        combined_handler.setLevel(getattr(logging, LOG_LEVEL))
        root_logger.addHandler(combined_handler)
        
        # Error log file
        error_handler = logging.handlers.RotatingFileHandler(
            log_dir / 'error.log',
            maxBytes=max_bytes,
            backupCount=LOG_FILE_MAX_FILES
        )
        error_handler.setFormatter(formatter)
        error_handler.setLevel(logging.ERROR)
        root_logger.addHandler(error_handler)


def configure_structlog() -> None:
    """Configure structlog with production-ready settings."""
    # Choose processors based on environment
    shared_processors = [
        structlog.contextvars.merge_contextvars,
        add_standard_fields,
        add_request_id,
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        format_exception_info,
        performance_processor,
        security_processor,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
    ]
    
    if ENVIRONMENT == 'development' and LOG_FORMAT != 'json':
        # Pretty printing for development
        processors = shared_processors + [
            structlog.dev.ConsoleRenderer(colors=True)
        ]
    else:
        # JSON output for production/staging
        processors = shared_processors + [
            structlog.processors.dict_tracebacks,
            structlog.processors.JSONRenderer()
        ]
    
    # Configure structlog
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(getattr(logging, LOG_LEVEL)),
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: Optional[str] = None) -> structlog.stdlib.BoundLogger:
    """Get a configured logger instance."""
    return structlog.get_logger(name)


class StructuredLogger:
    """High-level logger with helper methods."""
    
    def __init__(self, name: Optional[str] = None):
        self.logger = get_logger(name)
    
    def log_request(self, method: str, path: str, status_code: int, 
                   duration: float, **kwargs) -> None:
        """Log HTTP request."""
        self.logger.info(
            "HTTP Request",
            method=method,
            path=path,
            status_code=status_code,
            duration=duration,
            category="http",
            **kwargs
        )
    
    def log_database_query(self, query: str, duration: float, **kwargs) -> None:
        """Log database query."""
        self.logger.debug(
            "Database Query",
            query=query[:200] + "..." if len(query) > 200 else query,
            duration=duration,
            category="database",
            **kwargs
        )
    
    def log_error(self, message: str, error: Exception = None, **kwargs) -> None:
        """Log error with full context."""
        log_data = {
            "category": "error",
            **kwargs
        }
        
        if error:
            log_data.update({
                "error_type": type(error).__name__,
                "error_message": str(error),
                "exc_info": True
            })
        
        self.logger.error(message, **log_data)
    
    def log_security_event(self, event: str, details: Dict[str, Any] = None) -> None:
        """Log security-related event."""
        self.logger.warning(
            "Security Event",
            event=event,
            category="security",
            **(details or {})
        )
    
    def log_performance(self, operation: str, duration: float, **kwargs) -> None:
        """Log performance metric."""
        self.logger.info(
            "Performance Metric",
            operation=operation,
            duration=duration,
            category="performance",
            **kwargs
        )
    
    def log_ml_inference(self, model: str, input_size: int, duration: float, 
                        success: bool, **kwargs) -> None:
        """Log ML inference operation."""
        self.logger.info(
            "ML Inference",
            model=model,
            input_size=input_size,
            duration=duration,
            success=success,
            category="ml",
            **kwargs
        )


# Initialize logging configuration
def init_logging() -> StructuredLogger:
    """Initialize logging configuration."""
    setup_stdlib_logging()
    configure_structlog()
    
    # Log initialization
    logger = StructuredLogger('init')
    logger.logger.info(
        "Logging initialized",
        log_level=LOG_LEVEL,
        log_format=LOG_FORMAT,
        file_logging_enabled=LOG_FILE_ENABLED,
        service=SERVICE_NAME,
        environment=ENVIRONMENT
    )
    
    return logger


# Export convenience functions
__all__ = [
    'init_logging',
    'get_logger',
    'StructuredLogger',
    'configure_structlog',
    'setup_stdlib_logging'
]


# Auto-initialize if imported
if __name__ != '__main__':
    init_logging()
