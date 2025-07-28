import os
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Application settings
    app_name: str = "Geulpi ML Server"
    app_version: str = "1.0.0"
    debug: bool = Field(default=False, env="DEBUG")
    environment: str = Field(default="production", env="ENVIRONMENT")
    
    # Server settings
    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=8000, env="PORT")
    workers: int = Field(default=1, env="WORKERS")
    
    # Redis settings
    redis_host: str = Field(default="localhost", env="REDIS_HOST")
    redis_port: int = Field(default=6379, env="REDIS_PORT")
    redis_password: Optional[str] = Field(default=None, env="REDIS_PASSWORD")
    redis_db: int = Field(default=0, env="REDIS_DB")
    cache_ttl: int = Field(default=3600, env="CACHE_TTL")
    
    # Kafka settings
    kafka_bootstrap_servers: str = Field(
        default="localhost:9092", 
        env="KAFKA_BOOTSTRAP_SERVERS"
    )
    kafka_consumer_group: str = Field(
        default="ml-server-group",
        env="KAFKA_CONSUMER_GROUP"
    )
    kafka_request_topic: str = Field(
        default="ml-requests",
        env="KAFKA_REQUEST_TOPIC"
    )
    kafka_response_topic: str = Field(
        default="ml-responses",
        env="KAFKA_RESPONSE_TOPIC"
    )
    
    # Model settings
    model_cache_enabled: bool = Field(default=True, env="MODEL_CACHE_ENABLED")
    model_cache_ttl: int = Field(default=3600, env="MODEL_CACHE_TTL")
    model_directory: str = Field(default="models/trained", env="MODEL_DIRECTORY")
    model_version_tracking: bool = Field(default=True, env="MODEL_VERSION_TRACKING")
    
    # Performance settings
    inference_timeout: float = Field(default=0.1, env="INFERENCE_TIMEOUT")
    batch_size: int = Field(default=32, env="BATCH_SIZE")
    max_concurrent_requests: int = Field(default=100, env="MAX_CONCURRENT_REQUESTS")
    
    # LangGraph settings
    workflow_timeout: int = Field(default=30, env="WORKFLOW_TIMEOUT")
    enable_human_in_loop: bool = Field(default=True, env="ENABLE_HUMAN_IN_LOOP")
    confidence_threshold: float = Field(default=0.7, env="CONFIDENCE_THRESHOLD")
    
    # OpenAI settings
    openai_api_key: Optional[str] = Field(default=None, env="OPENAI_API_KEY")
    
    # Logging settings
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    log_format: str = Field(
        default="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        env="LOG_FORMAT"
    )
    
    # CORS settings
    cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://localhost:8080"],
        env="CORS_ORIGINS"
    )
    cors_allow_credentials: bool = Field(default=True, env="CORS_ALLOW_CREDENTIALS")
    cors_allow_methods: list[str] = Field(
        default=["GET", "POST", "PUT", "DELETE"],
        env="CORS_ALLOW_METHODS"
    )
    cors_allow_headers: list[str] = Field(
        default=["*"],
        env="CORS_ALLOW_HEADERS"
    )
    
    # Health check settings
    health_check_interval: int = Field(default=30, env="HEALTH_CHECK_INTERVAL")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        
        # Allow parsing of complex types from environment variables
        @classmethod
        def parse_env_var(cls, field_name: str, raw_val: str):
            if field_name in ["cors_origins", "cors_allow_methods", "cors_allow_headers"]:
                return [x.strip() for x in raw_val.split(",")]
            return raw_val
    
    def get_redis_url(self) -> str:
        """Get Redis connection URL"""
        if self.redis_password:
            return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/{self.redis_db}"
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"
    
    def get_kafka_config(self) -> dict:
        """Get Kafka configuration dictionary"""
        return {
            "bootstrap.servers": self.kafka_bootstrap_servers,
            "group.id": self.kafka_consumer_group,
            "auto.offset.reset": "earliest",
            "enable.auto.commit": True,
            "session.timeout.ms": 30000,
            "heartbeat.interval.ms": 10000
        }
    
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.environment.lower() == "production"
    
    def is_development(self) -> bool:
        """Check if running in development environment"""
        return self.environment.lower() in ["development", "dev"]
    
    def is_testing(self) -> bool:
        """Check if running in test environment"""
        return self.environment.lower() in ["testing", "test"]


# Create global settings instance
settings = Settings()


# Environment-specific configuration overrides
if settings.is_development():
    settings.debug = True
    settings.log_level = "DEBUG"
elif settings.is_testing():
    settings.kafka_bootstrap_servers = "localhost:9092"
    settings.redis_host = "localhost"
    settings.model_cache_enabled = False