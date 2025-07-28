from typing import TypedDict, Dict, List, Optional, Literal
from langgraph.graph import StateGraph

# For langgraph 0.0.32 compatibility
START = "__start__"
END = "__end__"

from datetime import datetime, date, timedelta
import numpy as np
import logging

from models.optimizer import ScheduleOptimizer

logger = logging.getLogger(__name__)

class ScheduleOptimizationState(TypedDict):
    userId: str
    targetDate: date
    preferences: Optional[Dict]
    current_events: List[Dict]
    event_categories: Dict[str, str]
    balance_score: float
    target_balance: Dict[str, float]
    suggestions: List[Dict]
    estimated_improvement: float
    optimization_complete: bool

class ScheduleOptimizationWorkflow:
    def __init__(self):
        self.optimizer = ScheduleOptimizer()
        self.workflow = self._build_workflow()
    
    def _build_workflow(self) -> StateGraph:
        workflow = StateGraph(ScheduleOptimizationState)
        
        workflow.add_node("analyze_current", self.analyze_current_schedule)
        workflow.add_node("categorize_events", self.categorize_events)
        workflow.add_node("calculate_balance", self.calculate_balance_score)
        workflow.add_node("identify_issues", self.identify_optimization_opportunities)
        workflow.add_node("generate_suggestions", self.generate_optimization_suggestions)
        workflow.add_node("evaluate_impact", self.evaluate_suggestion_impact)
        
        workflow.add_edge(START, "analyze_current")
        workflow.add_edge("analyze_current", "categorize_events")
        workflow.add_edge("categorize_events", "calculate_balance")
        workflow.add_edge("calculate_balance", "identify_issues")
        workflow.add_edge("identify_issues", "generate_suggestions")
        workflow.add_edge("generate_suggestions", "evaluate_impact")
        workflow.add_edge("evaluate_impact", END)
        
        return workflow.compile()
    
    def analyze_current_schedule(self, state: ScheduleOptimizationState) -> Dict:
        """Fetch and analyze current day's events"""
        logger.info(f"Analyzing schedule for user {state['userId']} on {state['targetDate']}")
        
        # In production, this would fetch from database
        # For now, generate realistic mock events
        mock_events = self._generate_mock_schedule(state['targetDate'])
        
        # Set target balance based on preferences or defaults
        target_balance = state.get('preferences', {}).get('target_balance', {
            'WORK': 0.40,
            'HEALTH': 0.15,
            'SOCIAL': 0.20,
            'LEARNING': 0.15,
            'PERSONAL': 0.10
        })
        
        return {
            "current_events": mock_events,
            "target_balance": target_balance
        }
    
    def _generate_mock_schedule(self, target_date: date) -> List[Dict]:
        """Generate realistic mock events for testing"""
        events = []
        
        # Morning routine
        events.append({
            "id": "evt-001",
            "title": "Team standup",
            "category": "WORK",
            "startTime": datetime.combine(target_date, datetime.min.time()).replace(hour=9),
            "endTime": datetime.combine(target_date, datetime.min.time()).replace(hour=9, minute=30)
        })
        
        # Work block
        events.append({
            "id": "evt-002",
            "title": "Project development",
            "category": "WORK",
            "startTime": datetime.combine(target_date, datetime.min.time()).replace(hour=10),
            "endTime": datetime.combine(target_date, datetime.min.time()).replace(hour=12)
        })
        
        # More work
        events.append({
            "id": "evt-003",
            "title": "Client meeting",
            "category": "WORK",
            "startTime": datetime.combine(target_date, datetime.min.time()).replace(hour=14),
            "endTime": datetime.combine(target_date, datetime.min.time()).replace(hour=15)
        })
        
        # Another work event
        events.append({
            "id": "evt-004",
            "title": "Code review",
            "category": "WORK",
            "startTime": datetime.combine(target_date, datetime.min.time()).replace(hour=16),
            "endTime": datetime.combine(target_date, datetime.min.time()).replace(hour=17)
        })
        
        # Late work event (problematic)
        events.append({
            "id": "evt-005",
            "title": "Report writing",
            "category": "WORK",
            "startTime": datetime.combine(target_date, datetime.min.time()).replace(hour=20),
            "endTime": datetime.combine(target_date, datetime.min.time()).replace(hour=22)
        })
        
        # Personal event
        events.append({
            "id": "evt-006",
            "title": "Grocery shopping",
            "category": "PERSONAL",
            "startTime": datetime.combine(target_date, datetime.min.time()).replace(hour=18),
            "endTime": datetime.combine(target_date, datetime.min.time()).replace(hour=19)
        })
        
        return events
    
    def categorize_events(self, state: ScheduleOptimizationState) -> Dict:
        """Ensure all events have proper categories"""
        event_categories = {}
        
        for event in state['current_events']:
            # Map categories if needed
            category = event.get('category', 'OTHER')
            if isinstance(category, int):
                categories = ['WORK', 'PERSONAL', 'HEALTH', 'SOCIAL', 'LEARNING', 'OTHER']
                category = categories[category] if category < len(categories) else 'OTHER'
            
            event_categories[event['id']] = category
            event['category'] = category
        
        return {"event_categories": event_categories}
    
    def calculate_balance_score(self, state: ScheduleOptimizationState) -> Dict:
        """Calculate current schedule balance using XGBoost"""
        score = self.optimizer.calculate_balance_score(state['current_events'])
        
        logger.info(f"Current balance score: {score:.2f}")
        
        return {"balance_score": score}
    
    def identify_optimization_opportunities(self, state: ScheduleOptimizationState) -> Dict:
        """Identify which events could be optimized"""
        issues = self.optimizer._identify_schedule_issues(state['current_events'])
        
        logger.info(f"Identified {len(issues)} optimization opportunities")
        
        return {}
    
    def generate_optimization_suggestions(self, state: ScheduleOptimizationState) -> Dict:
        """Generate optimization suggestions using XGBoost"""
        suggestions = self.optimizer.generate_suggestions(
            state['current_events'],
            state['targetDate'],
            state.get('preferences')
        )
        
        logger.info(f"Generated {len(suggestions)} optimization suggestions")
        
        return {"suggestions": suggestions}
    
    def evaluate_suggestion_impact(self, state: ScheduleOptimizationState) -> Dict:
        """Evaluate the overall impact of suggestions"""
        total_impact = 0
        
        # Calculate cumulative impact
        for suggestion in state['suggestions']:
            total_impact += suggestion.get('impact', 0)
        
        # Average impact of top suggestions
        top_suggestions = state['suggestions'][:3]
        avg_impact = np.mean([s.get('impact', 0) for s in top_suggestions]) if top_suggestions else 0
        
        return {
            "suggestions": state['suggestions'],
            "estimated_improvement": float(avg_impact),
            "optimization_complete": True
        }
    
    async def optimize(self, request_data: Dict) -> Dict:
        initial_state = ScheduleOptimizationState(
            userId=request_data["userId"],
            targetDate=request_data["targetDate"],
            preferences=request_data.get("preferences"),
            current_events=[],
            event_categories={},
            balance_score=0.0,
            target_balance={},
            suggestions=[],
            estimated_improvement=0.0,
            optimization_complete=False
        )
        
        result = await self.workflow.ainvoke(initial_state)
        
        return {
            "suggestions": [
                {
                    "eventId": s["eventId"],
                    "originalTime": s["originalTime"],
                    "suggestedTime": s["suggestedTime"],
                    "reason": s["reason"],
                    "impact": s["impact"]
                }
                for s in result['suggestions'][:5]
            ],
            "balanceScore": result['balance_score'],
            "estimatedImprovement": result['estimated_improvement']
        }