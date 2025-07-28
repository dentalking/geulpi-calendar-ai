from typing import TypedDict, Dict, List, Optional
from langgraph.graph import StateGraph

# For langgraph 0.0.32 compatibility
START = "__start__"
END = "__end__"

from datetime import datetime, timedelta
import numpy as np
import logging
import os

from models.burnout_predictor import BurnoutPredictor

logger = logging.getLogger(__name__)

class BurnoutAnalysisState(TypedDict):
    userId: str
    lookbackDays: int
    includeRecommendations: bool
    events: List[Dict]
    risk_analysis: Dict
    preventive_actions: List[str]
    monitoring_plan: Dict
    analysis_complete: bool

class BurnoutAnalysisWorkflow:
    def __init__(self):
        self.predictor = BurnoutPredictor()
        self.workflow = self._build_workflow()
        
        # Try to load trained model
        model_path = os.path.join(os.path.dirname(__file__), "..", "models", "trained")
        burnout_files = ["burnout_risk_model.joblib", "burnout_scaler.joblib"]
        burnout_exists = all(os.path.exists(os.path.join(model_path, f)) for f in burnout_files)
        
        if burnout_exists:
            try:
                logger.info(f"Loading trained burnout predictor from {model_path}")
                self.predictor.load_models(model_path)
                logger.info("Trained burnout predictor loaded successfully")
            except Exception as e:
                logger.warning(f"Failed to load trained burnout predictor: {e}")
                logger.info("Using default initialized burnout predictor")
    
    def _build_workflow(self) -> StateGraph:
        workflow = StateGraph(BurnoutAnalysisState)
        
        workflow.add_node("collect_events", self.collect_recent_events)
        workflow.add_node("analyze_risk", self.analyze_burnout_risk)
        workflow.add_node("evaluate_severity", self.evaluate_risk_severity)
        workflow.add_node("generate_actions", self.generate_preventive_actions)
        workflow.add_node("create_monitoring", self.create_monitoring_plan)
        
        workflow.add_edge(START, "collect_events")
        workflow.add_edge("collect_events", "analyze_risk")
        workflow.add_edge("analyze_risk", "evaluate_severity")
        workflow.add_edge("evaluate_severity", "generate_actions")
        workflow.add_edge("generate_actions", "create_monitoring")
        workflow.add_edge("create_monitoring", END)
        
        return workflow.compile()
    
    def collect_recent_events(self, state: BurnoutAnalysisState) -> Dict:
        """Collect recent events for burnout analysis"""
        logger.info(f"Collecting {state['lookbackDays']} days of events for burnout analysis")
        
        # In production, this would fetch from database
        # For now, generate realistic event data that might indicate burnout
        mock_events = self._generate_burnout_scenario_events(
            state['userId'], 
            state['lookbackDays']
        )
        
        logger.info(f"Collected {len(mock_events)} events for analysis")
        return {"events": mock_events}
    
    def _generate_burnout_scenario_events(self, user_id: str, days: int) -> List[Dict]:
        """Generate events that simulate various burnout risk levels"""
        events = []
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Simulate increasing workload over time
        for day_offset in range(days):
            current_date = start_date + timedelta(days=day_offset)
            weekday = current_date.weekday()
            
            # Increase intensity as we get closer to present
            intensity = 0.5 + (day_offset / days) * 0.5
            
            # Base events per day increases with intensity
            base_events = 4 if weekday < 5 else 2
            num_events = int(base_events * (1 + intensity))
            
            # Work dominance increases with intensity
            work_probability = 0.5 + (intensity * 0.3)
            
            for event_num in range(num_events):
                if weekday < 5 and np.random.random() < work_probability:
                    # Work events
                    if event_num == 0:  # Early morning
                        start_hour = 7 + np.random.randint(0, 2)
                        title = "Early work session"
                    elif event_num < num_events - 1:  # Regular hours
                        start_hour = 9 + event_num * 2
                        title = "Project work" if np.random.random() < 0.5 else "Meeting"
                    else:  # Late evening
                        start_hour = 18 + int(intensity * 3)
                        title = "Late work session"
                    
                    category = "WORK"
                    duration = 1.5 + np.random.uniform(0, 1.5)
                else:
                    # Non-work events (decreasing with intensity)
                    categories = ["PERSONAL", "HEALTH", "SOCIAL"]
                    if np.random.random() < (1 - intensity):  # Less likely as intensity increases
                        category = "HEALTH"
                        title = "Exercise" if current_date.hour < 12 else "Walk"
                        start_hour = 7 if event_num == 0 else 18
                        duration = 1.0
                    else:
                        category = np.random.choice(categories)
                        title = f"{category.lower()} activity"
                        start_hour = 12 + np.random.randint(0, 8)
                        duration = 1.0
                
                start_time = current_date.replace(
                    hour=min(start_hour, 23), 
                    minute=np.random.randint(0, 60)
                )
                end_time = start_time + timedelta(hours=duration)
                
                events.append({
                    "id": f"burnout_test_{day_offset}_{event_num}",
                    "userId": user_id,
                    "title": title,
                    "category": category,
                    "startTime": start_time,
                    "endTime": end_time
                })
        
        return events
    
    def analyze_burnout_risk(self, state: BurnoutAnalysisState) -> Dict:
        """Analyze burnout risk using ML model"""
        logger.info("Analyzing burnout risk with machine learning model")
        
        # Use the burnout predictor
        risk_analysis = self.predictor.analyze_burnout_risk(
            state['events'],
            user_preferences=None
        )
        
        logger.info(f"Burnout analysis complete - Risk level: {risk_analysis['risk_level']}")
        
        return {"risk_analysis": risk_analysis}
    
    def evaluate_risk_severity(self, state: BurnoutAnalysisState) -> Dict:
        """Evaluate the severity and urgency of burnout risk"""
        logger.info("Evaluating burnout risk severity")
        
        risk_analysis = state['risk_analysis']
        risk_level = risk_analysis['risk_level']
        risk_score = risk_analysis['risk_score']
        
        # Add severity evaluation
        if risk_level == 'critical':
            risk_analysis['severity'] = {
                'level': 'critical',
                'urgency': 'immediate',
                'description': 'Immediate intervention required - high burnout risk',
                'color': 'red'
            }
        elif risk_level == 'high':
            risk_analysis['severity'] = {
                'level': 'high',
                'urgency': 'urgent',
                'description': 'Urgent attention needed - approaching burnout',
                'color': 'orange'
            }
        elif risk_level == 'medium':
            risk_analysis['severity'] = {
                'level': 'medium',
                'urgency': 'moderate',
                'description': 'Preventive measures recommended',
                'color': 'yellow'
            }
        else:
            risk_analysis['severity'] = {
                'level': 'low',
                'urgency': 'low',
                'description': 'Maintain current balance',
                'color': 'green'
            }
        
        # Add key metrics summary
        risk_factors = risk_analysis.get('risk_factors', {})
        
        risk_analysis['key_metrics'] = {
            'consecutive_work_hours': risk_factors.get('consecutive_hours', {}).get('value', 0),
            'work_life_ratio': risk_factors.get('work_life_balance', {}).get('work_ratio', 0),
            'overtime_frequency': risk_factors.get('overtime', {}).get('evening_work', 0),
            'rest_adequacy': risk_factors.get('rest_time', {}).get('status', 'unknown')
        }
        
        return {"risk_analysis": risk_analysis}
    
    def generate_preventive_actions(self, state: BurnoutAnalysisState) -> Dict:
        """Generate specific preventive actions based on risk factors"""
        logger.info("Generating preventive actions")
        
        risk_analysis = state['risk_analysis']
        risk_level = risk_analysis['risk_level']
        risk_factors = risk_analysis.get('risk_factors', {})
        
        preventive_actions = []
        
        # Critical actions for high risk
        if risk_level in ['critical', 'high']:
            preventive_actions.extend([
                {
                    'action': 'immediate_rest',
                    'title': 'Take immediate time off',
                    'description': 'Schedule at least 2 days off within the next week',
                    'priority': 'critical',
                    'timeline': 'within 48 hours'
                },
                {
                    'action': 'delegate_work',
                    'title': 'Delegate or postpone non-critical tasks',
                    'description': 'Identify 30% of tasks that can be delegated or delayed',
                    'priority': 'high',
                    'timeline': 'immediately'
                }
            ])
        
        # Specific factor-based actions
        if risk_factors.get('consecutive_hours', {}).get('status') in ['high', 'critical']:
            preventive_actions.append({
                'action': 'break_schedule',
                'title': 'Implement mandatory break schedule',
                'description': 'Set timer for 10-minute breaks every 90 minutes',
                'priority': 'high',
                'timeline': 'starting tomorrow'
            })
        
        if risk_factors.get('overtime', {}).get('evening_work', 0) > 3:
            preventive_actions.append({
                'action': 'evening_boundary',
                'title': 'Set hard stop time for work',
                'description': 'No work activities after 6 PM - set calendar blocker',
                'priority': 'high',
                'timeline': 'starting today'
            })
        
        if risk_factors.get('work_life_balance', {}).get('status') == 'poor':
            preventive_actions.extend([
                {
                    'action': 'schedule_personal',
                    'title': 'Block time for personal activities',
                    'description': 'Schedule 2 hours daily for non-work activities',
                    'priority': 'medium',
                    'timeline': 'this week'
                },
                {
                    'action': 'add_exercise',
                    'title': 'Add regular exercise sessions',
                    'description': 'Schedule 30-minute exercise 3 times per week',
                    'priority': 'medium',
                    'timeline': 'starting this week'
                }
            ])
        
        # General wellness actions
        if risk_level != 'low':
            preventive_actions.extend([
                {
                    'action': 'sleep_hygiene',
                    'title': 'Improve sleep schedule',
                    'description': 'Consistent 8-hour sleep window, no screens 1 hour before bed',
                    'priority': 'medium',
                    'timeline': 'ongoing'
                },
                {
                    'action': 'mindfulness',
                    'title': 'Practice stress reduction',
                    'description': '10-minute daily meditation or breathing exercises',
                    'priority': 'low',
                    'timeline': 'daily'
                }
            ])
        
        # Sort by priority
        priority_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
        preventive_actions.sort(key=lambda x: priority_order.get(x['priority'], 4))
        
        return {"preventive_actions": preventive_actions[:8]}  # Limit to top 8 actions
    
    def create_monitoring_plan(self, state: BurnoutAnalysisState) -> Dict:
        """Create a monitoring plan to track burnout risk over time"""
        logger.info("Creating burnout monitoring plan")
        
        risk_level = state['risk_analysis']['risk_level']
        
        # Determine monitoring frequency based on risk
        if risk_level == 'critical':
            check_frequency = 'daily'
            review_period = 7
        elif risk_level == 'high':
            check_frequency = 'every 3 days'
            review_period = 14
        elif risk_level == 'medium':
            check_frequency = 'weekly'
            review_period = 30
        else:
            check_frequency = 'bi-weekly'
            review_period = 60
        
        monitoring_plan = {
            'check_frequency': check_frequency,
            'review_period_days': review_period,
            'next_check': (datetime.now() + timedelta(days=1 if risk_level == 'critical' else 3)).date().isoformat(),
            'metrics_to_track': [
                {
                    'metric': 'daily_work_hours',
                    'target': 'less than 8 hours',
                    'current': state['risk_analysis'].get('key_metrics', {}).get('consecutive_work_hours', 0)
                },
                {
                    'metric': 'evening_work_frequency',
                    'target': 'maximum 1 per week',
                    'current': state['risk_analysis'].get('risk_factors', {}).get('overtime', {}).get('evening_work', 0)
                },
                {
                    'metric': 'break_compliance',
                    'target': 'minimum 30 minutes lunch + 2 short breaks',
                    'current': 'not tracked'
                },
                {
                    'metric': 'exercise_sessions',
                    'target': 'minimum 3 per week',
                    'current': 'to be tracked'
                }
            ],
            'alert_thresholds': {
                'work_hours_per_day': 10,
                'consecutive_days_without_break': 6,
                'late_work_sessions_per_week': 3
            },
            'escalation_plan': {
                'contact': 'manager or HR',
                'trigger': 'risk score above 0.8 for 3 consecutive checks'
            }
        }
        
        return {
            "monitoring_plan": monitoring_plan,
            "analysis_complete": True
        }
    
    async def analyze(self, request_data: Dict) -> Dict:
        """Analyze burnout risk for a user"""
        initial_state = BurnoutAnalysisState(
            userId=request_data["userId"],
            lookbackDays=request_data.get("lookbackDays", 30),
            includeRecommendations=request_data.get("includeRecommendations", True),
            events=[],
            risk_analysis={},
            preventive_actions=[],
            monitoring_plan={},
            analysis_complete=False
        )
        
        logger.info(f"Starting burnout analysis for user {initial_state['userId']}")
        result = await self.workflow.ainvoke(initial_state)
        
        response = {
            "riskScore": result['risk_analysis']['risk_score'],
            "riskLevel": result['risk_analysis']['risk_level'],
            "severity": result['risk_analysis']['severity'],
            "warnings": result['risk_analysis']['warnings'],
            "riskFactors": result['risk_analysis']['risk_factors'],
            "trend": result['risk_analysis']['trend']
        }
        
        if initial_state['includeRecommendations']:
            response.update({
                "recommendations": result['risk_analysis']['recommendations'],
                "preventiveActions": result['preventive_actions'],
                "monitoringPlan": result['monitoring_plan']
            })
        
        return response