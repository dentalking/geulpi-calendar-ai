import pytest
from unittest.mock import Mock, patch
import numpy as np
from workflows.event_classification_enhanced import create_event_classification_workflow


class TestEventClassificationWorkflow:
    @pytest.fixture
    def mock_classifier(self):
        classifier = Mock()
        classifier.predict.return_value = (["WORK"], 0.92)
        return classifier
    
    @pytest.fixture
    def workflow(self, mock_classifier):
        with patch("workflows.event_classification_enhanced.EventClassifier") as mock_cls:
            mock_cls.return_value = mock_classifier
            return create_event_classification_workflow()
    
    def test_successful_classification_high_confidence(self, workflow):
        """Test successful event classification with high confidence"""
        input_data = {
            "features": np.random.rand(10).tolist(),
            "text": "팀 미팅 오후 2시"
        }
        
        result = workflow.invoke({"input": input_data})
        
        assert result["status"] == "SUCCESS"
        assert result["output"]["category"] == "WORK"
        assert result["output"]["confidence"] == 0.92
        assert result["output"]["needs_review"] is False
    
    def test_low_confidence_triggers_review(self, workflow, mock_classifier):
        """Test that low confidence triggers human review"""
        mock_classifier.predict.return_value = (["PERSONAL"], 0.65)
        
        input_data = {
            "features": np.random.rand(10).tolist(),
            "text": "친구랑 저녁"
        }
        
        result = workflow.invoke({"input": input_data})
        
        assert result["output"]["needs_review"] is True
        assert result["output"]["confidence"] == 0.65
    
    def test_feature_validation(self, workflow):
        """Test input feature validation"""
        invalid_input = {
            "features": [1, 2, 3],  # Too few features
            "text": "Test event"
        }
        
        result = workflow.invoke({"input": invalid_input})
        
        assert result["status"] == "ERROR"
        assert "validation" in result["output"]["error"].lower()
    
    def test_missing_features(self, workflow):
        """Test handling of missing features"""
        input_data = {
            "text": "Test event without features"
        }
        
        result = workflow.invoke({"input": input_data})
        
        assert result["status"] == "ERROR"
        assert "features" in result["output"]["error"].lower()