import pytest
import os
import sys
from pathlib import Path

# Add the parent directory to sys.path to allow imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Set test environment variables
os.environ["TESTING"] = "true"
os.environ["REDIS_HOST"] = "localhost"
os.environ["REDIS_PORT"] = "6379"
os.environ["KAFKA_BOOTSTRAP_SERVERS"] = "localhost:9092"


@pytest.fixture
def mock_redis_client():
    """Mock Redis client for testing"""
    from unittest.mock import Mock
    client = Mock()
    client.get.return_value = None
    client.set.return_value = True
    client.expire.return_value = True
    return client


@pytest.fixture
def sample_event_features():
    """Sample feature vector for event classification"""
    import numpy as np
    return np.random.rand(10).tolist()


@pytest.fixture
def sample_schedule():
    """Sample schedule for optimization testing"""
    return {
        "events": [
            {
                "id": "1",
                "title": "Team Meeting",
                "category": "WORK",
                "start_time": "2025-07-26T10:00:00",
                "duration": 60
            },
            {
                "id": "2", 
                "title": "Lunch Break",
                "category": "PERSONAL",
                "start_time": "2025-07-26T12:00:00",
                "duration": 60
            },
            {
                "id": "3",
                "title": "Project Work",
                "category": "WORK",
                "start_time": "2025-07-26T14:00:00",
                "duration": 180
            }
        ],
        "date": "2025-07-26"
    }


@pytest.fixture
def trained_model_path(tmp_path):
    """Create temporary directory for test models"""
    model_dir = tmp_path / "models" / "trained"
    model_dir.mkdir(parents=True)
    return model_dir