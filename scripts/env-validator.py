#!/usr/bin/env python3
"""
Environment Variable Validator for Python Services
Validates required environment variables for ML Server
"""

import os
import re
import sys
import socket
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Set, Optional

# ANSI color codes
class Colors:
    RED = '\033[31m'
    GREEN = '\033[32m'
    YELLOW = '\033[33m'
    BLUE = '\033[34m'
    BOLD = '\033[1m'
    RESET = '\033[0m'

class PythonEnvValidator:
    def __init__(self):
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.env = os.getenv('NODE_ENV', 'development')
        
        # Required environment variables
        self.required_vars = {
            'common': [
                'NODE_ENV',
                'PORT',
                'DATABASE_URL',
                'REDIS_URL'
            ],
            'ml_server': [
                'OPENAI_API_KEY',
                'ANTHROPIC_API_KEY'
            ],
            'production': [
                'LOG_FILE_PATH',
                'METRICS_PORT'
            ]
        }
        
        # Validation patterns
        self.validation_rules = {
            'PORT': r'^\d{1,5}$',
            'NODE_ENV': r'^(development|staging|production)$',
            'LOG_LEVEL': r'^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$',
            'METRICS_PORT': r'^\d{1,5}$',
            'REDIS_DB': r'^\d+$'
        }

    def log(self, message: str, level: str = 'info') -> None:
        """Log a message with color coding."""
        prefixes = {
            'error': f"{Colors.RED}{Colors.BOLD}[ERROR]{Colors.RESET}",
            'warn': f"{Colors.YELLOW}{Colors.BOLD}[WARN]{Colors.RESET}",
            'info': f"{Colors.BLUE}{Colors.BOLD}[INFO]{Colors.RESET}",
            'success': f"{Colors.GREEN}{Colors.BOLD}[SUCCESS]{Colors.RESET}"
        }
        print(f"{prefixes[level]} {message}")

    def load_env_file(self, env_file: Path) -> bool:
        """Load environment variables from a file."""
        try:
            if env_file.exists():
                with open(env_file, 'r') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#') and '=' in line:
                            key, value = line.split('=', 1)
                            # Remove quotes and set if not already set
                            value = value.strip('"\'')
                            if key not in os.environ:
                                os.environ[key] = value
                
                self.log(f"Loaded environment file: {env_file}", 'info')
                return True
            return False
        except Exception as e:
            self.log(f"Failed to load {env_file}: {str(e)}", 'error')
            return False

    def validate_required(self) -> None:
        """Validate required environment variables."""
        self.log('Validating required environment variables...', 'info')
        
        all_required = set(self.required_vars['common'])
        
        # Add service-specific variables
        service_type = os.getenv('SERVICE_TYPE', 'ml_server')
        if service_type in self.required_vars:
            all_required.update(self.required_vars[service_type])
        
        # Add environment-specific variables
        if self.env == 'production':
            all_required.update(self.required_vars['production'])
        
        for var_name in all_required:
            if not os.getenv(var_name):
                self.errors.append(f"Missing required environment variable: {var_name}")

    def validate_formats(self) -> None:
        """Validate environment variable formats."""
        self.log('Validating environment variable formats...', 'info')
        
        for var_name, pattern in self.validation_rules.items():
            value = os.getenv(var_name)
            if value and not re.match(pattern, value):
                self.errors.append(f"Invalid format for {var_name}: {value}")
        
        # Validate URLs
        url_vars = ['DATABASE_URL', 'REDIS_URL']
        for var_name in url_vars:
            value = os.getenv(var_name)
            if value and not self._is_valid_url(value):
                self.errors.append(f"Invalid URL format for {var_name}")

    def _is_valid_url(self, url: str) -> bool:
        """Basic URL validation."""
        url_pattern = r'^(postgresql|redis)://[\w\-\.:@/]+$'
        return bool(re.match(url_pattern, url))

    def validate_security(self) -> None:
        """Validate security configurations."""
        self.log('Validating security configurations...', 'info')
        
        # Check API keys
        api_keys = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY']
        for key_name in api_keys:
            value = os.getenv(key_name)
            if value:
                if len(value) < 20:
                    self.warnings.append(f"{key_name} seems too short")
                if not value.startswith(('sk-', 'sk-ant-')):
                    self.warnings.append(f"{key_name} doesn't follow expected format")
        
        # Production-specific security checks
        if self.env == 'production':
            if os.getenv('LOG_LEVEL') in ['DEBUG', 'TRACE']:
                self.warnings.append('Debug logging should be disabled in production')
            
            # Check if sensitive data is properly configured
            if not os.getenv('SSL_ENABLED', '').lower() == 'true':
                self.warnings.append('SSL should be enabled in production')

    def validate_python_environment(self) -> None:
        """Validate Python-specific environment settings."""
        self.log('Validating Python environment...', 'info')
        
        # Check Python version
        python_version = sys.version_info
        if python_version < (3, 8):
            self.errors.append(f"Python 3.8+ required, found {python_version.major}.{python_version.minor}")
        
        # Check if virtual environment is active
        if not hasattr(sys, 'real_prefix') and not (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
            self.warnings.append('Virtual environment not detected')
        
        # Check critical Python packages
        try:
            import fastapi
            import pydantic
            import sqlalchemy
        except ImportError as e:
            self.errors.append(f"Missing required Python package: {str(e)}")

    def test_database_connection(self) -> None:
        """Test database connectivity."""
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            return
        
        try:
            # Extract host and port from DATABASE_URL
            # Format: postgresql://user:pass@host:port/db
            import re
            match = re.match(r'postgresql://[^@]+@([^:]+):(\d+)/.*', database_url)
            if match:
                host, port = match.groups()
                with socket.create_connection((host, int(port)), timeout=5):
                    self.log('Database connection test passed', 'success')
            else:
                self.warnings.append('Could not parse DATABASE_URL for connection test')
        except Exception as e:
            self.warnings.append(f"Database connection test failed: {str(e)}")

    def test_redis_connection(self) -> None:
        """Test Redis connectivity."""
        redis_url = os.getenv('REDIS_URL')
        if not redis_url:
            return
        
        try:
            # Extract host and port from REDIS_URL
            # Format: redis://[:password@]host:port[/db]
            import re
            match = re.match(r'redis://(?:[^@]*@)?([^:]+):(\d+)(?:/\d+)?', redis_url)
            if match:
                host, port = match.groups()
                with socket.create_connection((host, int(port)), timeout=5):
                    self.log('Redis connection test passed', 'success')
            else:
                self.warnings.append('Could not parse REDIS_URL for connection test')
        except Exception as e:
            self.warnings.append(f"Redis connection test failed: {str(e)}")

    def check_disk_space(self) -> None:
        """Check available disk space for logs and cache."""
        try:
            import shutil
            
            # Check disk space for log directory
            log_path = os.getenv('LOG_FILE_PATH', '/var/log')
            if os.path.exists(os.path.dirname(log_path)):
                _, _, free = shutil.disk_usage(os.path.dirname(log_path))
                free_gb = free // (1024**3)
                if free_gb < 1:
                    self.warnings.append(f"Low disk space for logs: {free_gb}GB available")
            
            # Check disk space for cache
            cache_path = os.getenv('CACHE_PATH', '/tmp')
            if os.path.exists(cache_path):
                _, _, free = shutil.disk_usage(cache_path)
                free_gb = free // (1024**3)
                if free_gb < 2:
                    self.warnings.append(f"Low disk space for cache: {free_gb}GB available")
                    
        except Exception as e:
            self.warnings.append(f"Could not check disk space: {str(e)}")

    def generate_report(self) -> bool:
        """Generate validation report."""
        print('\n' + '=' * 60)
        print(f"{Colors.BOLD}Python Environment Validation Report{Colors.RESET}")
        print('=' * 60)
        print(f"Environment: {Colors.BLUE}{self.env}{Colors.RESET}")
        print(f"Python Version: {sys.version.split()[0]}")
        print(f"Timestamp: {datetime.now().isoformat()}")
        print('=' * 60)
        
        if not self.errors and not self.warnings:
            self.log('All validations passed!', 'success')
        else:
            if self.errors:
                print(f"\n{Colors.RED}{Colors.BOLD}ERRORS ({len(self.errors)}):{Colors.RESET}")
                for i, error in enumerate(self.errors, 1):
                    print(f"  {i}. {error}")
            
            if self.warnings:
                print(f"\n{Colors.YELLOW}{Colors.BOLD}WARNINGS ({len(self.warnings)}):{Colors.RESET}")
                for i, warning in enumerate(self.warnings, 1):
                    print(f"  {i}. {warning}")
        
        print('\n' + '=' * 60)
        return len(self.errors) == 0

    def validate(self) -> None:
        """Run all validations."""
        self.log('Starting Python environment validation...', 'info')
        
        # Load environment files
        env_file = Path(f".env.{self.env}")
        self.load_env_file(env_file)
        
        # Load default .env as fallback
        self.load_env_file(Path('.env'))
        
        # Run validations
        self.validate_required()
        self.validate_formats()
        self.validate_security()
        self.validate_python_environment()
        
        # Test connections if requested
        if os.getenv('CI') or '--test-connections' in sys.argv:
            self.test_database_connection()
            self.test_redis_connection()
        
        # Check system resources
        self.check_disk_space()
        
        # Generate report and exit
        is_valid = self.generate_report()
        sys.exit(0 if is_valid else 1)

def main() -> None:
    """Main entry point."""
    validator = PythonEnvValidator()
    try:
        validator.validate()
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Validation interrupted by user{Colors.RESET}")
        sys.exit(1)
    except Exception as e:
        print(f"{Colors.RED}Validation failed: {str(e)}{Colors.RESET}")
        sys.exit(1)

if __name__ == '__main__':
    main()
