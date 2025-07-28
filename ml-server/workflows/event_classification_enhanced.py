from typing import TypedDict, Dict, List, Optional, Literal, Tuple, Any
from typing_extensions import Annotated
from langgraph.graph import StateGraph

# For langgraph 0.0.32 compatibility
START = "__start__"
END = "__end__"

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from datetime import datetime
import numpy as np
import os
import logging
from dotenv import load_dotenv

from models.classifiers import EventClassifier, PriorityClassifier
from models.model_registry import ModelMetrics
from workflows.enhanced_base import EnhancedWorkflow

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EventClassificationState(TypedDict):
    title: str
    description: Optional[str]
    location: Optional[str]
    startTime: datetime
    endTime: datetime
    text_features: Optional[Dict[str, float]]
    event_type: Optional[str]
    priority: Optional[str]
    confidence: float
    suggested_tags: List[str]
    needs_human_review: bool
    probability_distribution: Optional[Dict[str, float]]

class EnhancedEventClassificationWorkflow(EnhancedWorkflow):
    """Event classification workflow with versioning, A/B testing, and monitoring"""
    
    def __init__(self, **kwargs):
        super().__init__(
            workflow_name="event_classification",
            model_type="event_classifier",
            **kwargs
        )
        
        # Initialize models
        self.event_classifier = EventClassifier()
        self.priority_classifier = PriorityClassifier()
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.1,
            api_key=os.getenv("OPENAI_API_KEY", "dummy-key")
        )
        
        # Build LangGraph workflow
        self.workflow = self._build_workflow()
        
        # Set current model
        self.current_model = self.event_classifier
        self.current_version = "default"
        
        # Try to load latest production model
        self._load_production_model()
    
    def _load_production_model(self):
        """Load latest production model if available"""
        if self.model_registry:
            try:
                model = self.model_registry.get_model("event_classifier", stage="Production")
                self.event_classifier = model
                self.current_model = model
                
                # Get version info
                versions = self.model_registry.client.get_latest_versions(
                    "event_classifier",
                    stages=["Production"]
                )
                if versions:
                    self.current_version = versions[0].version
                    logger.info(f"Loaded production model version {self.current_version}")
            except Exception as e:
                logger.warning(f"Could not load production model: {e}")
    
    def _build_workflow(self) -> StateGraph:
        """Build the LangGraph workflow"""
        workflow = StateGraph(EventClassificationState)
        
        workflow.add_node("text_to_features", self.text_to_features)
        workflow.add_node("classify_event", self.classify_event_node)
        workflow.add_node("classify_priority", self.classify_priority)
        workflow.add_node("confidence_check", self.confidence_check)
        workflow.add_node("generate_tags", self.generate_tags)
        workflow.add_node("human_review", self.human_review)
        
        workflow.add_edge(START, "text_to_features")
        workflow.add_edge("text_to_features", "classify_event")
        workflow.add_edge("classify_event", "classify_priority")
        workflow.add_edge("classify_priority", "confidence_check")
        
        workflow.add_conditional_edges(
            "confidence_check",
            self.should_request_human_review,
            {
                "human_needed": "human_review",
                "proceed": "generate_tags"
            }
        )
        
        workflow.add_edge("human_review", "generate_tags")
        workflow.add_edge("generate_tags", END)
        
        return workflow.compile()
    
    async def train_model(self, training_data: Dict[str, Any], **kwargs) -> Tuple[Any, ModelMetrics]:
        """Train a new event classifier model"""
        # Extract training data
        X_text = training_data.get("texts", [])
        X_temporal = training_data.get("temporal_features", [])
        y = training_data.get("labels", [])
        
        if not X_text or not y:
            # Generate synthetic data if not provided
            X_text, X_temporal, y = self.event_classifier._generate_synthetic_data(
                n_samples=kwargs.get("n_samples", 5000)
            )
        
        # Create new classifier instance
        new_classifier = EventClassifier()
        
        # Fit text vectorizer
        X_text_features = new_classifier.text_vectorizer.fit_transform(X_text)
        
        # Combine features
        X_combined = new_classifier._combine_features(X_text_features, X_temporal)
        X_scaled = new_classifier.scaler.fit_transform(X_combined)
        
        # Train model
        new_classifier.model.fit(X_scaled, y)
        new_classifier.is_trained = True
        
        # Evaluate on validation set (using last 20% as validation)
        split_idx = int(0.8 * len(y))
        X_val = X_scaled[split_idx:]
        y_val = y[split_idx:]
        
        y_pred = new_classifier.model.predict(X_val)
        
        # Calculate metrics
        from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
        
        metrics = ModelMetrics(
            accuracy=accuracy_score(y_val, y_pred),
            precision=precision_score(y_val, y_pred, average='weighted'),
            recall=recall_score(y_val, y_pred, average='weighted'),
            f1_score=f1_score(y_val, y_pred, average='weighted'),
            latency_ms=self._measure_model_latency(new_classifier),
            memory_mb=self._estimate_model_memory(new_classifier)
        )
        
        return new_classifier, metrics
    
    async def predict(self, input_data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """Make prediction using the workflow"""
        # Get model from kwargs if provided (for A/B testing)
        model = kwargs.get("model", self.event_classifier)
        version = kwargs.get("version", self.current_version)
        
        # Temporarily set the model for this prediction
        original_classifier = self.event_classifier
        self.event_classifier = model
        
        try:
            # Run the workflow
            initial_state = EventClassificationState(
                title=input_data["title"],
                description=input_data.get("description"),
                location=input_data.get("location"),
                startTime=input_data["startTime"],
                endTime=input_data["endTime"],
                text_features=None,
                event_type=None,
                priority=None,
                confidence=0.0,
                suggested_tags=[],
                needs_human_review=False,
                probability_distribution=None
            )
            
            result = await self.workflow.ainvoke(initial_state)
            
            return {
                "eventType": result["event_type"],
                "priority": result["priority"],
                "confidence": result["confidence"],
                "suggestedTags": result["suggested_tags"],
                "success": True,
                "metrics": {
                    "confidence": result["confidence"],
                    "needs_review": result["needs_human_review"]
                }
            }
        finally:
            # Restore original classifier
            self.event_classifier = original_classifier
    
    def extract_features(self, input_data: Dict[str, Any]) -> np.ndarray:
        """Extract features for drift detection"""
        combined_text = f"{input_data['title']} {input_data.get('description', '')} {input_data.get('location', '')}"
        
        # Extract text and temporal features
        text_features, temporal_features = self.event_classifier.extract_features(
            combined_text,
            input_data['startTime'],
            input_data['endTime']
        )
        
        # Combine features
        combined = self.event_classifier._combine_features(text_features, temporal_features)
        return combined
    
    def _prepare_optimization_data(self, training_data: Dict[str, Any]) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare data for model optimization"""
        X_text = training_data.get("texts", [])
        X_temporal = training_data.get("temporal_features", [])
        y = training_data.get("labels", [])
        
        if not X_text:
            X_text, X_temporal, y = self.event_classifier._generate_synthetic_data(n_samples=1000)
        
        # Process features
        X_text_features = self.event_classifier.text_vectorizer.transform(X_text)
        X_combined = self.event_classifier._combine_features(X_text_features, X_temporal)
        X_scaled = self.event_classifier.scaler.transform(X_combined)
        
        return X_scaled, np.array(y)
    
    def _prepare_validation_data(self, validation_data: Dict[str, Any]) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare validation data"""
        return self._prepare_optimization_data(validation_data)
    
    # Workflow nodes
    async def text_to_features(self, state: EventClassificationState) -> Dict:
        """Extract features using LLM"""
        try:
            prompt = f"""
            Extract numerical features from this event:
            Title: {state['title']}
            Description: {state.get('description', 'N/A')}
            Location: {state.get('location', 'N/A')}
            Time: {state['startTime']} to {state['endTime']}
            
            Return scores (0-1) for:
            - work_related
            - health_fitness
            - social_activity
            - learning_education
            - personal_time
            - urgency_level
            """
            
            response = await self.llm.ainvoke([SystemMessage(content=prompt)])
            
            # Parse response
            features = self._parse_llm_features(response.content, state)
            
        except Exception as e:
            logger.warning(f"LLM feature extraction failed: {e}")
            features = self._fallback_features(state)
        
        return {"text_features": features}
    
    def classify_event_node(self, state: EventClassificationState) -> Dict:
        """Classify event type"""
        combined_text = f"{state['title']} {state.get('description', '')} {state.get('location', '')}"
        
        # Use the event classifier
        event_type, confidence = self.event_classifier.predict(
            combined_text,
            state['startTime'],
            state['endTime']
        )
        
        # Get probability distribution
        prob_dist = self.event_classifier.predict_proba(
            combined_text,
            state['startTime'],
            state['endTime']
        )
        
        return {
            "event_type": event_type,
            "confidence": confidence,
            "probability_distribution": prob_dist
        }
    
    def classify_priority(self, state: EventClassificationState) -> Dict:
        """Classify event priority"""
        combined_text = f"{state['title']} {state.get('description', '')}"
        event_type_idx = self.event_classifier.category_to_idx.get(state['event_type'], 5)
        
        features = self.priority_classifier.extract_features(combined_text, event_type_idx)
        priority_idx, priority_confidence = self.priority_classifier.predict(features)
        
        priorities = ["HIGH", "MEDIUM", "LOW"]
        priority = priorities[priority_idx]
        
        # Adjust based on keywords
        urgent_keywords = ['urgent', 'asap', 'important', 'critical', 'deadline']
        if any(kw in combined_text.lower() for kw in urgent_keywords):
            priority = "HIGH"
        
        return {"priority": priority}
    
    def confidence_check(self, state: EventClassificationState) -> Dict:
        """Check if human review is needed"""
        needs_review = state['confidence'] < 0.7
        return {"needs_human_review": needs_review}
    
    def should_request_human_review(self, state: EventClassificationState) -> Literal["human_needed", "proceed"]:
        """Determine workflow path based on confidence"""
        return "human_needed" if state['needs_human_review'] else "proceed"
    
    def human_review(self, state: EventClassificationState) -> Dict:
        """Placeholder for human review"""
        # In production, this would integrate with a review queue
        return {
            "event_type": state['event_type'],
            "priority": state['priority'],
            "confidence": 0.95
        }
    
    def generate_tags(self, state: EventClassificationState) -> Dict:
        """Generate suggested tags"""
        tags = []
        
        # Category-based tags
        category_tags = {
            "WORK": ["work", "professional", "office", "meeting", "project"],
            "HEALTH": ["fitness", "wellness", "health", "exercise", "selfcare"],
            "SOCIAL": ["social", "leisure", "friends", "networking", "fun"],
            "LEARNING": ["education", "development", "study", "learning", "growth"],
            "PERSONAL": ["personal", "errands", "home", "private"],
            "OTHER": ["general", "misc"]
        }
        
        tags.extend(category_tags.get(state['event_type'], ["general"])[:2])
        
        # Priority tag
        if state['priority'] == "HIGH":
            tags.append("important")
        elif state['priority'] == "LOW":
            tags.append("optional")
        
        # Time-based tags
        hour = state['startTime'].hour
        if 6 <= hour < 12:
            tags.append("morning")
        elif 17 <= hour < 22:
            tags.append("evening")
        
        # Extract keywords
        title_words = state['title'].lower().split()
        keyword_candidates = [
            'meeting', 'call', 'review', 'training', 'workout',
            'lunch', 'dinner', 'study', 'project', 'deadline'
        ]
        
        for word in title_words:
            if word in keyword_candidates and word not in tags:
                tags.append(word)
        
        # Return unique tags
        return {"suggested_tags": list(dict.fromkeys(tags))[:5]}
    
    # Helper methods
    def _parse_llm_features(self, response_text: str, state: EventClassificationState) -> Dict[str, float]:
        """Parse LLM response for features"""
        response_lower = response_text.lower()
        
        features = {
            "work_related": 0.9 if "work" in response_lower else 0.1,
            "health_fitness": 0.9 if "health" in response_lower or "fitness" in response_lower else 0.1,
            "social_activity": 0.9 if "social" in response_lower else 0.1,
            "learning_education": 0.9 if "learning" in response_lower or "education" in response_lower else 0.1,
            "personal_time": 0.5,
            "urgency_level": 0.8 if "urgent" in response_lower or "high priority" in response_lower else 0.3
        }
        
        return features
    
    def _fallback_features(self, state: EventClassificationState) -> Dict[str, float]:
        """Fallback feature extraction using keywords"""
        title_lower = state['title'].lower()
        desc_lower = state.get('description', '').lower()
        combined = title_lower + " " + desc_lower
        
        return {
            "work_related": 0.8 if any(kw in combined for kw in ["work", "meeting", "project"]) else 0.2,
            "health_fitness": 0.8 if any(kw in combined for kw in ["gym", "exercise", "health"]) else 0.1,
            "social_activity": 0.7 if any(kw in combined for kw in ["dinner", "party", "friends"]) else 0.2,
            "learning_education": 0.8 if any(kw in combined for kw in ["study", "course", "learn"]) else 0.1,
            "personal_time": 0.5,
            "urgency_level": 0.7 if "urgent" in combined else 0.3
        }
    
    def _measure_model_latency(self, model: EventClassifier) -> float:
        """Measure model inference latency"""
        # Create sample input
        sample_text = "Team meeting for project review"
        sample_start = datetime.now()
        sample_end = sample_start + timedelta(hours=1)
        
        # Measure time for 10 predictions
        import time
        start = time.time()
        for _ in range(10):
            model.predict(sample_text, sample_start, sample_end)
        end = time.time()
        
        return (end - start) * 100  # Average ms per prediction
    
    def _estimate_model_memory(self, model: EventClassifier) -> float:
        """Estimate model memory usage"""
        import joblib
        import os
        
        # Save model temporarily
        temp_file = "temp_model.joblib"
        joblib.dump(model, temp_file)
        size_mb = os.path.getsize(temp_file) / (1024 * 1024)
        os.remove(temp_file)
        
        return size_mb * 1.2  # Add 20% overhead estimate