import pytest
from unittest.mock import Mock, patch
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from workflows.pattern_detection import create_pattern_detection_workflow


class TestPatternDetectionWorkflow:
    @pytest.fixture
    def mock_detector(self):
        detector = Mock()
        detector.detect_patterns.return_value = [
            {
                "pattern_type": "weekly_recurring",
                "confidence": 0.89,
                "description": "Weekly team meetings on Tuesday"
            },
            {
                "pattern_type": "overwork_tendency", 
                "confidence": 0.76,
                "description": "Frequent late-night work sessions"
            }
        ]
        return detector
    
    @pytest.fixture
    def workflow(self, mock_detector):
        with patch("workflows.pattern_detection.PatternDetector") as mock_cls:
            mock_cls.return_value = mock_detector
            return create_pattern_detection_workflow()
    
    def test_pattern_detection_with_sufficient_data(self, workflow):
        """Test pattern detection with enough historical data"""
        base_date = datetime.now()
        events = []
        
        # Generate weekly recurring events
        for week in range(8):
            event_date = base_date - timedelta(weeks=week)
            events.append({
                "id": f"event_{week}",
                "category": "WORK",
                "title": "Team Meeting",
                "start_time": event_date.replace(hour=14).isoformat(),
                "duration": 60
            })
        
        input_data = {
            "user_id": "test_user",
            "historical_events": events,
            "time_range_days": 60
        }
        
        result = workflow.invoke({"input": input_data})
        
        assert result["status"] == "SUCCESS"
        assert len(result["output"]["patterns"]) == 2
        assert result["output"]["patterns"][0]["pattern_type"] == "weekly_recurring"
    
    def test_insufficient_data_handling(self, workflow):
        """Test handling when there's not enough data for pattern detection"""
        input_data = {
            "user_id": "test_user",
            "historical_events": [
                {"id": "1", "category": "WORK", "duration": 60}
            ],
            "time_range_days": 30
        }
        
        result = workflow.invoke({"input": input_data})
        
        assert result["status"] == "SUCCESS"
        assert "insufficient" in result["output"].get("message", "").lower()
    
    def test_pattern_validation(self, workflow, mock_detector):
        """Test that low-confidence patterns are filtered out"""
        mock_detector.detect_patterns.return_value = [
            {"pattern_type": "weekly", "confidence": 0.92},
            {"pattern_type": "daily", "confidence": 0.45},  # Below threshold
            {"pattern_type": "monthly", "confidence": 0.88}
        ]
        
        input_data = {
            "user_id": "test_user",
            "historical_events": [{"id": f"e{i}", "category": "WORK"} for i in range(20)],
            "time_range_days": 30
        }
        
        result = workflow.invoke({"input": input_data})
        
        # Only high-confidence patterns should be returned
        validated_patterns = result["output"]["patterns"]
        assert len(validated_patterns) == 2
        assert all(p["confidence"] > 0.7 for p in validated_patterns)
    
    def test_feature_engineering(self, workflow):
        """Test that proper features are extracted from events"""
        events = [
            {
                "id": "1",
                "category": "WORK", 
                "start_time": "2025-07-26T09:00:00",
                "duration": 60,
                "title": "Morning standup"
            },
            {
                "id": "2",
                "category": "PERSONAL",
                "start_time": "2025-07-26T18:00:00", 
                "duration": 90,
                "title": "Gym"
            }
        ]
        
        input_data = {
            "user_id": "test_user",
            "historical_events": events,
            "time_range_days": 7
        }
        
        with patch.object(workflow.nodes["feature_engineering"]["func"], "__call__") as mock_fe:
            mock_fe.return_value = {"features": "extracted"}
            workflow.invoke({"input": input_data})
            
            # Verify feature engineering was called with events
            assert mock_fe.called
            call_args = mock_fe.call_args[0][0]
            assert "events" in call_args