from typing import TypedDict, Dict, List, Optional
from langgraph.graph import StateGraph

# For langgraph 0.0.32 compatibility
START = "__start__"
END = "__end__"

from datetime import datetime, timedelta
import numpy as np
import logging
import os

from models.pattern_detector import AdvancedPatternDetector

logger = logging.getLogger(__name__)

class PatternDetectionState(TypedDict):
    userId: str
    lookbackDays: int
    historical_events: List[Dict]
    detected_patterns: List[Dict]
    anomalies: List[Dict]
    insights: List[str]
    statistics: Dict
    analysis_complete: bool

class PatternDetectionWorkflow:
    def __init__(self):
        self.detector = AdvancedPatternDetector()
        self.workflow = self._build_workflow()
        
        # Try to load trained models
        model_path = os.path.join(os.path.dirname(__file__), "..", "models", "trained")
        pattern_files = ["kmeans_model.joblib", "dbscan_model.joblib", 
                        "pattern_scaler.joblib", "anomaly_detector.joblib"]
        pattern_exists = all(os.path.exists(os.path.join(model_path, f)) for f in pattern_files)
        
        if pattern_exists:
            try:
                logger.info(f"Loading trained pattern detector from {model_path}")
                self.detector.load_models(model_path)
                logger.info("Trained pattern detector loaded successfully")
            except Exception as e:
                logger.warning(f"Failed to load trained pattern detector: {e}")
                logger.info("Using default initialized pattern detector")
    
    def _build_workflow(self) -> StateGraph:
        workflow = StateGraph(PatternDetectionState)
        
        workflow.add_node("collect_data", self.collect_historical_data)
        workflow.add_node("preprocess_events", self.preprocess_event_data)
        workflow.add_node("analyze_patterns", self.analyze_behavioral_patterns)
        workflow.add_node("generate_insights", self.generate_behavioral_insights)
        workflow.add_node("validate_results", self.validate_and_rank_results)
        
        workflow.add_edge(START, "collect_data")
        workflow.add_edge("collect_data", "preprocess_events")
        workflow.add_edge("preprocess_events", "analyze_patterns")
        workflow.add_edge("analyze_patterns", "generate_insights")
        workflow.add_edge("generate_insights", "validate_results")
        workflow.add_edge("validate_results", END)
        
        return workflow.compile()
    
    def collect_historical_data(self, state: PatternDetectionState) -> Dict:
        """Collect historical event data for pattern analysis"""
        logger.info(f"Collecting {state['lookbackDays']} days of historical data for user {state['userId']}")
        
        # In production, this would fetch from database
        # For now, generate realistic historical data
        mock_events = self._generate_realistic_historical_data(
            state['userId'], 
            state['lookbackDays']
        )
        
        logger.info(f"Collected {len(mock_events)} historical events")
        return {"historical_events": mock_events}
    
    def _generate_realistic_historical_data(self, user_id: str, days: int) -> List[Dict]:
        """Generate realistic historical data for testing"""
        events = []
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Create different user patterns based on user_id hash
        user_hash = hash(user_id) % 4
        
        if user_hash == 0:  # Early bird, work-focused
            work_hours = [8, 9, 10, 14, 15]
            personal_hours = [6, 7, 17, 18]
            work_weight = 0.6
        elif user_hash == 1:  # Night owl, creative
            work_hours = [10, 11, 14, 15, 16]
            personal_hours = [20, 21, 22]
            work_weight = 0.4
        elif user_hash == 2:  # Balanced lifestyle
            work_hours = [9, 10, 11, 14, 15]
            personal_hours = [7, 8, 17, 18, 19]
            work_weight = 0.5
        else:  # Health-focused
            work_hours = [9, 11, 13, 15]
            personal_hours = [6, 7, 17, 18]
            work_weight = 0.3
        
        for day in range(days):
            current_date = start_date + timedelta(days=day)
            weekday = current_date.weekday()
            
            # Events per day
            if weekday < 5:  # Weekday
                num_events = np.random.randint(2, 6)
            else:  # Weekend
                num_events = np.random.randint(1, 4)
            
            for _ in range(num_events):
                # Choose category and timing
                if weekday < 5 and np.random.random() < work_weight:
                    category = "WORK"
                    hour = np.random.choice(work_hours)
                    titles = ["Team meeting", "Project work", "Client call", "Code review"]
                elif np.random.random() < 0.25:
                    category = "HEALTH"
                    hour = np.random.choice([6, 7, 8, 17, 18, 19])
                    titles = ["Gym workout", "Running", "Yoga", "Doctor visit"]
                elif np.random.random() < 0.3:
                    category = "SOCIAL"
                    hour = np.random.choice([12, 18, 19, 20])
                    titles = ["Lunch meeting", "Dinner", "Coffee chat", "Party"]
                elif np.random.random() < 0.15:
                    category = "LEARNING"
                    hour = np.random.choice([19, 20, 21])
                    titles = ["Online course", "Reading", "Tutorial", "Workshop"]
                else:
                    category = "PERSONAL"
                    hour = np.random.choice(personal_hours)
                    titles = ["Grocery shopping", "Cleaning", "Personal time", "Meal prep"]
                
                duration = np.random.uniform(0.5, 3)
                start_time = current_date.replace(
                    hour=hour, 
                    minute=np.random.randint(0, 60)
                )
                end_time = start_time + timedelta(hours=duration)
                
                events.append({
                    "id": f"hist_{user_id}_{len(events)}",
                    "title": np.random.choice(titles),
                    "category": category,
                    "startTime": start_time,
                    "endTime": end_time,
                    "userId": user_id,
                    "location": "Office" if category == "WORK" and np.random.random() < 0.7 else ""
                })
        
        return events
    
    def preprocess_event_data(self, state: PatternDetectionState) -> Dict:
        """Preprocess and validate event data"""
        logger.info("Preprocessing event data for pattern analysis")
        
        # Filter and clean events
        valid_events = []
        for event in state['historical_events']:
            # Ensure required fields exist
            if all(key in event for key in ['startTime', 'endTime', 'category']):
                # Add missing fields
                if 'title' not in event:
                    event['title'] = f"{event['category']} event"
                
                # Normalize category
                if isinstance(event['category'], int):
                    categories = ['WORK', 'PERSONAL', 'HEALTH', 'SOCIAL', 'LEARNING', 'OTHER']
                    event['category'] = categories[event['category']] if event['category'] < len(categories) else 'OTHER'
                
                valid_events.append(event)
        
        logger.info(f"Preprocessed {len(valid_events)} valid events")
        return {"historical_events": valid_events}
    
    def analyze_behavioral_patterns(self, state: PatternDetectionState) -> Dict:
        """Analyze behavioral patterns using advanced clustering"""
        logger.info("Analyzing behavioral patterns with advanced clustering algorithms")
        
        if len(state['historical_events']) < 10:
            logger.warning("Insufficient data for pattern analysis")
            return {
                "detected_patterns": [],
                "anomalies": [],
                "statistics": {}
            }
        
        # Use the advanced pattern detector
        results = self.detector.detect_behavioral_patterns(state['historical_events'])
        
        logger.info(f"Detected {len(results['patterns'])} patterns and {len(results['anomalies'])} anomalies")
        
        return {
            "detected_patterns": results['patterns'],
            "anomalies": results['anomalies'],
            "statistics": results.get('statistics', {})
        }
    
    def generate_behavioral_insights(self, state: PatternDetectionState) -> Dict:
        """Generate insights based on detected patterns"""
        logger.info("Generating behavioral insights")
        
        insights = []
        
        # Pattern-based insights
        pattern_types = [p.get('patternType', '') for p in state['detected_patterns']]
        
        # Work-life balance insights
        if 'work_schedule' in pattern_types:
            insights.append("Strong work schedule patterns detected - you maintain consistent professional routines")
        
        if 'morning_routine' in pattern_types:
            insights.append("You have established morning routines that support your daily productivity")
        
        if 'evening_routine' in pattern_types:
            insights.append("Evening routines identified - good for work-life separation")
        
        # Social pattern insights
        social_patterns = [p for p in state['detected_patterns'] if 'social' in p.get('patternType', '').lower()]
        if social_patterns:
            insights.append("Regular social activities detected - maintaining good social connections")
        
        # Health pattern insights
        health_patterns = [p for p in state['detected_patterns'] if 'fitness' in p.get('patternType', '').lower() or 'health' in p.get('patternType', '').lower()]
        if health_patterns:
            insights.append("Consistent health and fitness patterns - maintaining good physical wellness")
        
        # Weekend pattern insights
        weekend_patterns = [p for p in state['detected_patterns'] if 'weekend' in p.get('patternType', '').lower()]
        if weekend_patterns:
            insights.append("Distinct weekend patterns show good work-life balance")
        
        # Anomaly insights
        if len(state['anomalies']) > 5:
            insights.append("Multiple schedule anomalies detected - consider reviewing irregular activities")
        elif len(state['anomalies']) <= 2:
            insights.append("Very consistent schedule with minimal anomalies - excellent routine maintenance")
        
        # Pattern diversity insights
        if len(set(pattern_types)) > 4:
            insights.append("High pattern diversity indicates a well-balanced and varied lifestyle")
        elif len(set(pattern_types)) < 3:
            insights.append("Limited pattern variety - consider diversifying your activity types")
        
        return {"insights": insights}
    
    def validate_and_rank_results(self, state: PatternDetectionState) -> Dict:
        """Validate and rank pattern analysis results"""
        logger.info("Validating and ranking pattern analysis results")
        
        # Rank patterns by relevance
        ranked_patterns = []
        for pattern in state['detected_patterns']:
            # Calculate relevance score
            frequency = pattern.get('frequency', 0)
            confidence = pattern.get('confidence', 0)
            
            if isinstance(frequency, int):
                frequency = frequency / 100  # Normalize if it's a count
            
            relevance_score = (frequency * 0.6) + (confidence * 0.4)
            pattern['relevance_score'] = relevance_score
            ranked_patterns.append(pattern)
        
        # Sort by relevance
        ranked_patterns.sort(key=lambda x: x.get('relevance_score', 0), reverse=True)
        
        # Rank anomalies by severity
        ranked_anomalies = sorted(
            state['anomalies'], 
            key=lambda x: {"high": 3, "medium": 2, "low": 1}.get(x.get('severity', 'low'), 1),
            reverse=True
        )
        
        return {
            "detected_patterns": ranked_patterns[:10],  # Top 10 patterns
            "anomalies": ranked_anomalies[:8],          # Top 8 anomalies
            "insights": state['insights'],
            "statistics": state['statistics'],
            "analysis_complete": True
        }
    
    async def detect(self, request_data: Dict) -> Dict:
        """Detect behavioral patterns in user's historical data"""
        initial_state = PatternDetectionState(
            userId=request_data["userId"],
            lookbackDays=request_data.get("lookbackDays", 30),
            historical_events=[],
            detected_patterns=[],
            anomalies=[],
            insights=[],
            statistics={},
            analysis_complete=False
        )
        
        logger.info(f"Starting pattern detection for user {initial_state['userId']}")
        result = await self.workflow.ainvoke(initial_state)
        
        return {
            "patterns": result['detected_patterns'],
            "anomalies": result['anomalies'],
            "insights": result['insights'],
            "statistics": result['statistics']
        }