import pytest
from unittest.mock import Mock, patch
import numpy as np
from workflows.schedule_optimization import create_schedule_optimization_workflow


class TestScheduleOptimizationWorkflow:
    @pytest.fixture
    def mock_optimizer(self):
        optimizer = Mock()
        optimizer.predict.return_value = np.array([0.85])
        optimizer.suggest_improvements.return_value = [
            {"action": "move_event", "score": 0.92},
            {"action": "add_break", "score": 0.88}
        ]
        return optimizer
    
    @pytest.fixture
    def workflow(self, mock_optimizer):
        with patch("workflows.schedule_optimization.ScheduleOptimizer") as mock_cls:
            mock_cls.return_value = mock_optimizer
            return create_schedule_optimization_workflow()
    
    def test_optimization_with_good_balance(self, workflow):
        """Test optimization when schedule already has good balance"""
        input_data = {
            "current_schedule": {
                "events": [
                    {"id": "1", "category": "WORK", "duration": 60},
                    {"id": "2", "category": "PERSONAL", "duration": 45}
                ],
                "date": "2025-07-26"
            },
            "preferences": {
                "work_life_balance": 0.5,
                "break_frequency": 2
            }
        }
        
        result = workflow.invoke({"input": input_data})
        
        assert result["status"] == "SUCCESS"
        assert result["output"]["current_balance_score"] == 0.85
        assert len(result["output"]["suggestions"]) == 2
    
    def test_optimization_with_poor_balance(self, workflow, mock_optimizer):
        """Test optimization suggestions for poor work-life balance"""
        mock_optimizer.predict.return_value = np.array([0.35])
        
        input_data = {
            "current_schedule": {
                "events": [
                    {"id": "1", "category": "WORK", "duration": 480},
                    {"id": "2", "category": "WORK", "duration": 120}
                ],
                "date": "2025-07-26"
            },
            "preferences": {
                "work_life_balance": 0.5
            }
        }
        
        result = workflow.invoke({"input": input_data})
        
        assert result["output"]["current_balance_score"] == 0.35
        assert result["output"]["needs_immediate_attention"] is True
    
    def test_empty_schedule_handling(self, workflow):
        """Test handling of empty schedule"""
        input_data = {
            "current_schedule": {
                "events": [],
                "date": "2025-07-26"
            },
            "preferences": {}
        }
        
        result = workflow.invoke({"input": input_data})
        
        assert result["status"] == "SUCCESS"
        assert "empty" in result["output"].get("message", "").lower()
    
    def test_ranking_suggestions(self, workflow):
        """Test that suggestions are properly ranked"""
        input_data = {
            "current_schedule": {
                "events": [{"id": "1", "category": "WORK", "duration": 60}],
                "date": "2025-07-26"
            },
            "preferences": {}
        }
        
        result = workflow.invoke({"input": input_data})
        
        suggestions = result["output"]["suggestions"]
        assert suggestions[0]["score"] >= suggestions[1]["score"]