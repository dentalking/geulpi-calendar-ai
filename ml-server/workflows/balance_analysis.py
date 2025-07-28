from typing import TypedDict, Dict, List
from langgraph.graph import StateGraph

# For langgraph 0.0.32 compatibility
START = "__start__"
END = "__end__"

from datetime import date, datetime, timedelta
import numpy as np

class BalanceAnalysisState(TypedDict):
    userId: str
    startDate: date
    endDate: date
    events_data: List[Dict]
    category_stats: Dict[str, float]
    overall_score: float
    insights: List[str]
    recommendations: List[str]

class BalanceAnalysisWorkflow:
    def __init__(self):
        self.workflow = self._build_workflow()
    
    def _build_workflow(self) -> StateGraph:
        workflow = StateGraph(BalanceAnalysisState)
        
        workflow.add_node("collect_events", self.collect_events_in_range)
        workflow.add_node("analyze_distribution", self.analyze_category_distribution)
        workflow.add_node("calculate_score", self.calculate_balance_score)
        workflow.add_node("generate_insights", self.generate_insights)
        workflow.add_node("create_recommendations", self.create_recommendations)
        
        workflow.add_edge(START, "collect_events")
        workflow.add_edge("collect_events", "analyze_distribution")
        workflow.add_edge("analyze_distribution", "calculate_score")
        workflow.add_edge("calculate_score", "generate_insights")
        workflow.add_edge("generate_insights", "create_recommendations")
        workflow.add_edge("create_recommendations", END)
        
        return workflow.compile()
    
    def collect_events_in_range(self, state: BalanceAnalysisState) -> Dict:
        days_diff = (state['endDate'] - state['startDate']).days
        
        mock_events = []
        for i in range(days_diff * 4):
            event_date = state['startDate'] + timedelta(days=i // 4)
            event_datetime = datetime.combine(event_date, datetime.min.time()) + timedelta(hours=9 + (i % 4) * 3)
            
            mock_events.append({
                "id": f"event-{i}",
                "category": i % 6,
                "startTime": event_datetime,
                "endTime": event_datetime + timedelta(hours=1),
                "title": f"Event {i}"
            })
        
        return {"events_data": mock_events}
    
    def analyze_category_distribution(self, state: BalanceAnalysisState) -> Dict:
        category_counts = {
            "WORK": 0,
            "PERSONAL": 0,
            "HEALTH": 0,
            "SOCIAL": 0,
            "LEARNING": 0,
            "OTHER": 0
        }
        
        categories = list(category_counts.keys())
        
        for event in state['events_data']:
            category_idx = event.get('category', 5)
            category = categories[category_idx]
            category_counts[category] += 1
        
        total_events = len(state['events_data'])
        category_percentages = {
            cat: (count / total_events * 100) if total_events > 0 else 0
            for cat, count in category_counts.items()
        }
        
        return {"category_stats": category_percentages}
    
    def calculate_balance_score(self, state: BalanceAnalysisState) -> Dict:
        ideal_distribution = {
            "WORK": 40,
            "PERSONAL": 10,
            "HEALTH": 15,
            "SOCIAL": 20,
            "LEARNING": 15,
            "OTHER": 0
        }
        
        deviations = []
        for category, ideal_pct in ideal_distribution.items():
            actual_pct = state['category_stats'].get(category, 0)
            deviation = abs(actual_pct - ideal_pct)
            deviations.append(deviation)
        
        avg_deviation = np.mean(deviations)
        score = max(0, 1 - (avg_deviation / 100))
        
        return {"overall_score": float(score)}
    
    def generate_insights(self, state: BalanceAnalysisState) -> Dict:
        insights = []
        
        if state['overall_score'] > 0.8:
            insights.append("Your work-life balance is excellent")
        elif state['overall_score'] > 0.6:
            insights.append("Your work-life balance is good but could be improved")
        else:
            insights.append("Your work-life balance needs attention")
        
        work_pct = state['category_stats'].get("WORK", 0)
        if work_pct > 50:
            insights.append("Work activities dominate your schedule")
        
        health_pct = state['category_stats'].get("HEALTH", 0)
        if health_pct < 10:
            insights.append("Consider adding more health-related activities")
        
        social_pct = state['category_stats'].get("SOCIAL", 0)
        if social_pct > 15 and social_pct < 25:
            insights.append("Social engagement is at healthy levels")
        
        return {"insights": insights}
    
    def create_recommendations(self, state: BalanceAnalysisState) -> Dict:
        recommendations = []
        
        work_pct = state['category_stats'].get("WORK", 0)
        if work_pct > 45:
            recommendations.append("Consider batch processing work tasks")
            recommendations.append("Set clear work-hour boundaries")
        
        health_pct = state['category_stats'].get("HEALTH", 0)
        if health_pct < 15:
            recommendations.append("Schedule 2-3 exercise sessions per week")
            recommendations.append("Add short wellness breaks during work hours")
        
        personal_pct = state['category_stats'].get("PERSONAL", 0)
        if personal_pct < 10:
            recommendations.append("Block time for personal activities")
            recommendations.append("Schedule regular self-care time")
        
        learning_pct = state['category_stats'].get("LEARNING", 0)
        if learning_pct < 10:
            recommendations.append("Dedicate time for skill development")
        
        return {"recommendations": recommendations}
    
    async def analyze(self, request_data: Dict) -> Dict:
        initial_state = BalanceAnalysisState(
            userId=request_data["userId"],
            startDate=request_data["startDate"],
            endDate=request_data["endDate"],
            events_data=[],
            category_stats={},
            overall_score=0.0,
            insights=[],
            recommendations=[]
        )
        
        result = await self.workflow.ainvoke(initial_state)
        
        category_breakdown = [
            {
                "category": category,
                "percentage": percentage,
                "recommendedPercentage": {"WORK": 40, "PERSONAL": 10, "HEALTH": 15, "SOCIAL": 20, "LEARNING": 15, "OTHER": 0}.get(category, 0),
                "status": "optimal" if abs(percentage - {"WORK": 40, "PERSONAL": 10, "HEALTH": 15, "SOCIAL": 20, "LEARNING": 15, "OTHER": 0}.get(category, 0)) < 5 else "needs_attention"
            }
            for category, percentage in result['category_stats'].items()
        ]
        
        return {
            "overallScore": result['overall_score'],
            "categoryBreakdown": category_breakdown,
            "insights": result['insights'],
            "recommendations": result['recommendations']
        }