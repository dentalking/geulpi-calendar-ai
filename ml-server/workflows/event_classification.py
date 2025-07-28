from typing import TypedDict, Dict, List, Optional, Literal
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

from models.classifiers import EventClassifier, PriorityClassifier
from config.settings import settings

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

class EventClassificationWorkflow:
    def __init__(self):
        self.event_classifier = EventClassifier()
        self.priority_classifier = PriorityClassifier()
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.1,
            api_key=settings.openai_api_key or os.getenv("OPENAI_API_KEY", "dummy-key")
        )
        self.workflow = self._build_workflow()
    
    def _build_workflow(self) -> StateGraph:
        workflow = StateGraph(EventClassificationState)
        
        workflow.add_node("text_to_features", self.text_to_features)
        workflow.add_node("classify_event", self.classify_event)
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
    
    async def text_to_features(self, state: EventClassificationState) -> Dict:
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
            
            # Try to parse LLM response for better features
            try:
                # Simple parsing of LLM response (in production, use structured output)
                response_text = response.content.lower()
                
                features = {
                    "work_related": 0.9 if "work" in response_text else 0.1,
                    "health_fitness": 0.9 if "health" in response_text or "fitness" in response_text else 0.1,
                    "social_activity": 0.9 if "social" in response_text else 0.1,
                    "learning_education": 0.9 if "learning" in response_text or "education" in response_text else 0.1,
                    "personal_time": 0.5,
                    "urgency_level": 0.8 if "urgent" in response_text or "high priority" in response_text else 0.3
                }
            except:
                # Fallback to keyword-based features
                features = {
                    "work_related": 0.8 if "work" in state['title'].lower() else 0.2,
                    "health_fitness": 0.8 if any(kw in state['title'].lower() for kw in ["gym", "exercise"]) else 0.1,
                    "social_activity": 0.7 if any(kw in state['title'].lower() for kw in ["dinner", "party"]) else 0.2,
                    "learning_education": 0.8 if any(kw in state['title'].lower() for kw in ["study", "course"]) else 0.1,
                    "personal_time": 0.5,
                    "urgency_level": 0.7 if "urgent" in state.get('description', '').lower() else 0.3
                }
        except:
            features = {
                "work_related": 0.5,
                "health_fitness": 0.5,
                "social_activity": 0.5,
                "learning_education": 0.5,
                "personal_time": 0.5,
                "urgency_level": 0.5
            }
        
        return {"text_features": features}
    
    def classify_event(self, state: EventClassificationState) -> Dict:
        combined_text = f"{state['title']} {state.get('description', '')} {state.get('location', '')}"
        
        # Use the Random Forest classifier
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
        
        # Log prediction details
        logger.info(f"Predicted {event_type} with confidence {confidence:.2f}")
        logger.info(f"Probability distribution: {prob_dist}")
        
        return {
            "event_type": event_type,
            "confidence": confidence,
            "probability_distribution": prob_dist
        }
    
    def classify_priority(self, state: EventClassificationState) -> Dict:
        combined_text = f"{state['title']} {state.get('description', '')}"
        event_type_idx = self.event_classifier.category_to_idx.get(state['event_type'], 5)
        
        features = self.priority_classifier.extract_features(combined_text, event_type_idx)
        priority_idx, priority_confidence = self.priority_classifier.predict(features)
        
        priorities = ["HIGH", "MEDIUM", "LOW"]
        priority = priorities[priority_idx]
        
        # Adjust priority based on keywords and confidence
        urgent_keywords = ['urgent', 'asap', 'important', 'critical', 'deadline']
        if any(kw in combined_text.lower() for kw in urgent_keywords):
            priority = "HIGH"
        
        return {"priority": priority}
    
    def confidence_check(self, state: EventClassificationState) -> Dict:
        needs_review = state['confidence'] < settings.confidence_threshold
        return {"needs_human_review": needs_review}
    
    def should_request_human_review(self, state: EventClassificationState) -> Literal["human_needed", "proceed"]:
        return "human_needed" if state['needs_human_review'] else "proceed"
    
    def human_review(self, state: EventClassificationState) -> Dict:
        # In production, this would trigger a human review process
        # For now, we'll just boost confidence and proceed
        return {
            "event_type": state['event_type'],
            "priority": state['priority'],
            "confidence": 0.95
        }
    
    def generate_tags(self, state: EventClassificationState) -> Dict:
        tags = []
        
        # Base tags by category
        category_tags = {
            "WORK": ["work", "professional", "office", "meeting", "project"],
            "HEALTH": ["fitness", "wellness", "health", "exercise", "selfcare"],
            "SOCIAL": ["social", "leisure", "friends", "networking", "fun"],
            "LEARNING": ["education", "development", "study", "learning", "growth"],
            "PERSONAL": ["personal", "errands", "home", "private"],
            "OTHER": ["general", "misc"]
        }
        
        # Add category tags
        tags.extend(category_tags.get(state['event_type'], ["general"]))
        
        # Add priority tag
        if state['priority'] == "HIGH":
            tags.append("important")
        elif state['priority'] == "LOW":
            tags.append("optional")
        
        # Add time-based tags
        hour = state['startTime'].hour
        if 6 <= hour < 12:
            tags.append("morning")
        elif 17 <= hour < 22:
            tags.append("evening")
        
        # Extract keywords from title
        title_words = state['title'].lower().split()
        keyword_candidates = [
            'meeting', 'call', 'review', 'training', 'workout', 
            'lunch', 'dinner', 'study', 'project', 'deadline'
        ]
        
        for word in title_words:
            if word in keyword_candidates and word not in tags:
                tags.append(word)
        
        # Sort by relevance and return top tags
        # Prioritize category tags and important keywords
        priority_tags = []
        other_tags = []
        
        for tag in tags:
            if tag in category_tags.get(state['event_type'], []) or tag == "important":
                priority_tags.append(tag)
            else:
                other_tags.append(tag)
        
        final_tags = priority_tags[:2] + other_tags[:3]
        return {"suggested_tags": list(dict.fromkeys(final_tags))[:5]}
    
    async def classify(self, request_data: Dict) -> Dict:
        initial_state = EventClassificationState(
            title=request_data["title"],
            description=request_data.get("description"),
            location=request_data.get("location"),
            startTime=request_data["startTime"],
            endTime=request_data["endTime"],
            text_features=None,
            event_type=None,
            priority=None,
            confidence=0.0,
            suggested_tags=[],
            needs_human_review=False
        )
        
        result = await self.workflow.ainvoke(initial_state)
        
        return {
            "eventType": result["event_type"],
            "priority": result["priority"],
            "confidence": result["confidence"],
            "suggestedTags": result["suggested_tags"]
        }