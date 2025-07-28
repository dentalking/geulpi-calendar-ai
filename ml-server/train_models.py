#!/usr/bin/env python3
"""
Training script for ML models
"""

import os
import json
import logging
from datetime import datetime, timedelta
from typing import List, Tuple
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

from models.classifiers import EventClassifier, PriorityClassifier
from models.optimizer import ScheduleOptimizer
from models.pattern_detector import AdvancedPatternDetector
from models.burnout_predictor import BurnoutPredictor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def generate_training_data(n_samples: int = 5000) -> Tuple[List[dict], List[int]]:
    """Generate realistic training data for event classification"""
    
    events = []
    labels = []
    
    # Work events
    work_templates = [
        ("Team standup", 0.5, [9, 10]),
        ("Sprint planning", 2.0, [10, 14]),
        ("Client meeting - {}", 1.0, [9, 10, 11, 14, 15]),
        ("Code review", 1.0, [11, 15, 16]),
        ("Project {} review", 1.5, [14, 15]),
        ("1:1 with manager", 0.5, [10, 11, 15]),
        ("All hands meeting", 1.0, [11, 14]),
        ("Interview - {}", 1.0, [10, 11, 14, 15]),
        ("Design review", 1.0, [14, 15]),
        ("Technical discussion", 1.5, [10, 14])
    ]
    
    # Health events
    health_templates = [
        ("Morning run", 1.0, [6, 7, 8]),
        ("Gym workout", 1.5, [6, 7, 17, 18, 19]),
        ("Yoga class", 1.0, [7, 8, 18, 19]),
        ("Doctor appointment", 1.0, [9, 10, 11, 14, 15]),
        ("Dentist checkup", 0.5, [9, 10, 14, 15]),
        ("Physical therapy", 1.0, [11, 15, 16]),
        ("Swimming", 1.0, [6, 7, 17]),
        ("Cycling", 2.0, [6, 7, 8, 17]),
        ("Tennis match", 1.5, [17, 18, 19]),
        ("Meditation", 0.5, [7, 8, 19, 20])
    ]
    
    # Social events
    social_templates = [
        ("Lunch with {}", 1.0, [12, 13]),
        ("Coffee chat - {}", 0.5, [10, 15, 16]),
        ("Birthday party", 3.0, [18, 19, 20]),
        ("Dinner at {}", 2.0, [18, 19, 20]),
        ("Movie night", 2.5, [19, 20, 21]),
        ("Game night", 3.0, [19, 20, 21]),
        ("Brunch", 1.5, [10, 11, 12]),
        ("Happy hour", 2.0, [17, 18, 19]),
        ("Concert - {}", 3.0, [19, 20, 21]),
        ("Networking event", 2.0, [18, 19])
    ]
    
    # Learning events
    learning_templates = [
        ("Online course - {}", 1.0, [9, 19, 20]),
        ("Study {}", 2.0, [9, 10, 14, 19, 20]),
        ("Workshop: {}", 3.0, [9, 10, 14]),
        ("Tutorial - {}", 1.0, [11, 15, 19]),
        ("Book club", 1.0, [19, 20]),
        ("Language class", 1.0, [18, 19]),
        ("Coding practice", 2.0, [20, 21]),
        ("Research {}", 1.5, [10, 14, 20]),
        ("Webinar - {}", 1.0, [11, 14, 15]),
        ("Training session", 2.0, [9, 10, 14])
    ]
    
    # Personal events  
    personal_templates = [
        ("Grocery shopping", 1.0, [10, 11, 17, 18]),
        ("House cleaning", 2.0, [9, 10, 11]),
        ("Laundry", 1.0, [10, 11, 19, 20]),
        ("Meal prep", 1.5, [11, 17, 18]),
        ("Haircut", 0.5, [10, 11, 15, 16]),
        ("Car maintenance", 1.0, [9, 10, 11]),
        ("Banking", 0.5, [10, 11, 12]),
        ("Personal time", 1.0, [19, 20, 21]),
        ("Reading", 1.0, [20, 21]),
        ("Planning week", 0.5, [9, 19, 20])
    ]
    
    # Topics and names for placeholders
    topics = ["Python", "JavaScript", "AI/ML", "Cloud", "DevOps", "Security", "Mobile", "Data"]
    names = ["John", "Sarah", "Team Alpha", "Marketing", "Product", "Engineering"]
    places = ["Downtown", "Westside", "Italian place", "New restaurant", "Coffee shop"]
    
    # Category templates
    categories = [
        (work_templates, "WORK", 0, topics),
        (health_templates, "HEALTH", 1, None),
        (social_templates, "SOCIAL", 2, names + places),
        (learning_templates, "LEARNING", 3, topics),
        (personal_templates, "PERSONAL", 4, None)
    ]
    
    # Generate samples
    samples_per_category = n_samples // 5
    
    for templates, category_name, category_idx, placeholders in categories:
        for _ in range(samples_per_category):
            # Choose template
            template, duration, hours = templates[np.random.randint(len(templates))]
            
            # Fill template
            if "{}" in template and placeholders:
                title = template.format(np.random.choice(placeholders))
            else:
                title = template
            
            # Add some variation
            if np.random.random() < 0.2:
                title = title + " - Important"
            elif np.random.random() < 0.1:
                title = "Quick " + title.lower()
            
            # Choose day of week based on category
            if category_name == "WORK":
                dow = np.random.choice([0, 1, 2, 3, 4], p=[0.2, 0.2, 0.2, 0.2, 0.2])  # Mon-Fri
            elif category_name == "SOCIAL":
                dow = np.random.choice([0, 1, 2, 3, 4, 5, 6], p=[0.05, 0.05, 0.05, 0.05, 0.3, 0.3, 0.2])  # More Fri-Sun
            else:
                dow = np.random.randint(0, 7)
            
            # Choose hour
            hour = np.random.choice(hours)
            
            # Add duration variation
            duration = duration + np.random.uniform(-0.25, 0.25)
            duration = max(0.25, duration)  # Minimum 15 minutes
            
            # Create datetime
            base_date = datetime(2024, 1, 1)
            start_time = base_date + timedelta(days=dow, hours=hour)
            end_time = start_time + timedelta(hours=duration)
            
            # Create event
            event = {
                "title": title,
                "startTime": start_time,
                "endTime": end_time,
                "description": f"Category: {category_name}"
            }
            
            events.append(event)
            labels.append(category_idx)
    
    return events, labels

def train_event_classifier():
    """Train the event classification model"""
    logger.info("Starting event classifier training...")
    
    # Generate training data
    events, labels = generate_training_data(n_samples=5000)
    logger.info(f"Generated {len(events)} training samples")
    
    # Split data
    train_events, test_events, y_train, y_test = train_test_split(
        events, labels, test_size=0.2, random_state=42, stratify=labels
    )
    
    # Initialize classifier
    classifier = EventClassifier()
    
    # Prepare training data
    train_texts = [e["title"] for e in train_events]
    train_temporal = []
    
    for event in train_events:
        temp_feat = classifier._extract_temporal_features(event["startTime"], event["endTime"])
        train_temporal.append(temp_feat[0])
    
    train_temporal = np.array(train_temporal)
    
    # Fit vectorizer and combine features
    X_train_text = classifier.text_vectorizer.fit_transform(train_texts)
    X_train_combined = classifier._combine_features(X_train_text, train_temporal)
    X_train_scaled = classifier.scaler.fit_transform(X_train_combined)
    
    # Train model
    logger.info("Training Random Forest model...")
    classifier.model.fit(X_train_scaled, y_train)
    classifier.is_trained = True
    
    # Evaluate on test set
    test_texts = [e["title"] for e in test_events]
    test_temporal = []
    
    for event in test_events:
        temp_feat = classifier._extract_temporal_features(event["startTime"], event["endTime"])
        test_temporal.append(temp_feat[0])
    
    test_temporal = np.array(test_temporal)
    
    # Evaluate
    results = classifier.evaluate(test_texts, test_temporal, y_test)
    
    logger.info(f"Test Accuracy: {results['accuracy']:.3f}")
    logger.info("\nClassification Report:")
    print(classification_report(y_test, 
                              classifier.model.predict(classifier.scaler.transform(
                                  classifier._combine_features(
                                      classifier.text_vectorizer.transform(test_texts),
                                      test_temporal
                                  )
                              )),
                              target_names=classifier.categories))
    
    # Save model
    model_path = os.path.join(os.path.dirname(__file__), "models", "trained")
    classifier.save_model(model_path)
    logger.info(f"Model saved to {model_path}")
    
    # Test some predictions
    logger.info("\nTesting predictions:")
    test_cases = [
        ("Team standup", datetime(2024, 1, 1, 9, 0), datetime(2024, 1, 1, 9, 30)),
        ("Gym workout", datetime(2024, 1, 1, 7, 0), datetime(2024, 1, 1, 8, 0)),
        ("Dinner with friends", datetime(2024, 1, 5, 19, 0), datetime(2024, 1, 5, 21, 0)),
        ("Python course", datetime(2024, 1, 3, 20, 0), datetime(2024, 1, 3, 21, 0)),
        ("Grocery shopping", datetime(2024, 1, 6, 11, 0), datetime(2024, 1, 6, 12, 0))
    ]
    
    for title, start, end in test_cases:
        category, confidence = classifier.predict(title, start, end)
        probs = classifier.predict_proba(title, start, end)
        logger.info(f"{title}: {category} (confidence: {confidence:.2f})")
        logger.info(f"  Probabilities: {json.dumps(probs, indent=2)}")

def train_schedule_optimizer():
    """Train the schedule optimization models"""
    logger.info("Starting schedule optimizer training...")
    
    # Initialize optimizer
    optimizer = ScheduleOptimizer()
    
    # Generate larger training datasets
    logger.info("Generating balance training data...")
    X_balance, y_balance = optimizer._generate_balance_training_data(n_samples=2000)
    
    logger.info("Generating slot scoring training data...")
    X_slots, y_slots = optimizer._generate_slot_training_data(n_samples=3000)
    
    # Split data for evaluation
    X_bal_train, X_bal_test, y_bal_train, y_bal_test = train_test_split(
        X_balance, y_balance, test_size=0.2, random_state=42
    )
    
    X_slot_train, X_slot_test, y_slot_train, y_slot_test = train_test_split(
        X_slots, y_slots, test_size=0.2, random_state=42
    )
    
    # Scale features
    X_bal_train_scaled = optimizer.scaler.fit_transform(X_bal_train)
    X_bal_test_scaled = optimizer.scaler.transform(X_bal_test)
    
    X_slot_train_scaled = optimizer.slot_scaler.fit_transform(X_slot_train)
    X_slot_test_scaled = optimizer.slot_scaler.transform(X_slot_test)
    
    # Train balance model
    logger.info("Training balance scoring model...")
    optimizer.balance_model.fit(X_bal_train_scaled, y_bal_train)
    
    # Evaluate balance model
    bal_train_score = optimizer.balance_model.score(X_bal_train_scaled, y_bal_train)
    bal_test_score = optimizer.balance_model.score(X_bal_test_scaled, y_bal_test)
    
    logger.info(f"Balance Model - Train R²: {bal_train_score:.3f}, Test R²: {bal_test_score:.3f}")
    
    # Train slot scorer
    logger.info("Training slot scoring model...")
    optimizer.slot_scorer.fit(X_slot_train_scaled, y_slot_train)
    
    # Evaluate slot scorer
    slot_train_score = optimizer.slot_scorer.score(X_slot_train_scaled, y_slot_train)
    slot_test_score = optimizer.slot_scorer.score(X_slot_test_scaled, y_slot_test)
    
    logger.info(f"Slot Scorer - Train R²: {slot_train_score:.3f}, Test R²: {slot_test_score:.3f}")
    
    optimizer.is_trained = True
    
    # Save models
    model_path = os.path.join(os.path.dirname(__file__), "models", "trained")
    optimizer.save_models(model_path)
    logger.info(f"Optimizer models saved to {model_path}")
    
    # Test schedule optimization
    logger.info("\nTesting schedule optimization:")
    test_schedule = [
        {
            "id": "test-1",
            "title": "Team standup",
            "category": "WORK",
            "startTime": datetime(2024, 1, 15, 9, 0),
            "endTime": datetime(2024, 1, 15, 9, 30)
        },
        {
            "id": "test-2",
            "title": "Project work",
            "category": "WORK", 
            "startTime": datetime(2024, 1, 15, 10, 0),
            "endTime": datetime(2024, 1, 15, 12, 0)
        },
        {
            "id": "test-3",
            "title": "Late meeting",
            "category": "WORK",
            "startTime": datetime(2024, 1, 15, 21, 0),
            "endTime": datetime(2024, 1, 15, 22, 0)
        },
        {
            "id": "test-4",
            "title": "Grocery shopping",
            "category": "PERSONAL",
            "startTime": datetime(2024, 1, 15, 18, 0),
            "endTime": datetime(2024, 1, 15, 19, 0)
        }
    ]
    
    balance_score = optimizer.calculate_balance_score(test_schedule)
    logger.info(f"Test schedule balance score: {balance_score:.3f}")
    
    suggestions = optimizer.generate_suggestions(
        test_schedule, 
        datetime(2024, 1, 15).date()
    )
    
    logger.info(f"Generated {len(suggestions)} optimization suggestions:")
    for i, suggestion in enumerate(suggestions[:3], 1):
        logger.info(f"{i}. Event {suggestion['eventId']}: "
                   f"{suggestion['originalTime'].strftime('%H:%M')} → "
                   f"{suggestion['suggestedTime'].strftime('%H:%M')} "
                   f"(impact: {suggestion['impact']:.3f})")
        logger.info(f"   Reason: {suggestion['reason']}")

def generate_pattern_training_data(n_users: int = 10, events_per_user: int = 100) -> List[Dict]:
    """Generate realistic behavioral pattern data for multiple users"""
    all_events = []
    
    for user_id in range(n_users):
        user_events = []
        
        # Each user has different behavioral patterns
        user_type = user_id % 4  # 4 different user types
        
        if user_type == 0:  # Early bird, work-focused
            work_hours = [8, 9, 10, 14, 15]
            personal_hours = [6, 7, 17, 18]
            social_hours = [19, 20]
            work_weight = 0.6
        elif user_type == 1:  # Night owl, creative
            work_hours = [10, 11, 14, 15, 16]
            personal_hours = [20, 21, 22]
            social_hours = [18, 19, 20]
            work_weight = 0.4
        elif user_type == 2:  # Balanced lifestyle
            work_hours = [9, 10, 11, 14, 15]
            personal_hours = [7, 8, 17, 18, 19]
            social_hours = [18, 19, 20, 21]
            work_weight = 0.5
        else:  # Flexible, health-focused
            work_hours = [9, 11, 13, 15]
            personal_hours = [6, 7, 17, 18]
            social_hours = [19, 20]
            work_weight = 0.3
        
        # Generate events for this user over 90 days
        base_date = datetime(2024, 1, 1)
        
        for day in range(90):
            current_date = base_date + timedelta(days=day)
            weekday = current_date.weekday()
            
            # Number of events per day varies
            if weekday < 5:  # Weekday
                num_events = np.random.randint(3, 8)
            else:  # Weekend
                num_events = np.random.randint(1, 5)
            
            daily_events = []
            used_hours = set()
            
            for _ in range(num_events):
                # Choose category based on user type and day
                if weekday < 5:  # Weekday
                    if np.random.random() < work_weight:
                        category = "WORK"
                        possible_hours = work_hours
                    elif np.random.random() < 0.3:
                        category = "PERSONAL"
                        possible_hours = personal_hours
                    else:
                        category = np.random.choice(["HEALTH", "SOCIAL", "LEARNING"])
                        possible_hours = personal_hours + social_hours
                else:  # Weekend
                    category = np.random.choice(["PERSONAL", "HEALTH", "SOCIAL", "LEARNING"], 
                                               p=[0.4, 0.25, 0.25, 0.1])
                    possible_hours = personal_hours + social_hours
                
                # Choose hour avoiding conflicts
                available_hours = [h for h in possible_hours if h not in used_hours]
                if not available_hours:
                    continue
                
                hour = np.random.choice(available_hours)
                used_hours.add(hour)
                
                # Generate title and duration based on category
                if category == "WORK":
                    titles = ["Team meeting", "Project work", "Client call", "Code review", "Planning session"]
                    duration = np.random.uniform(0.5, 3)
                elif category == "HEALTH":
                    titles = ["Gym workout", "Running", "Yoga", "Doctor visit", "Meditation"]
                    duration = np.random.uniform(0.5, 2)
                elif category == "SOCIAL":
                    titles = ["Dinner with friends", "Coffee chat", "Party", "Game night", "Movie"]
                    duration = np.random.uniform(1, 4)
                elif category == "LEARNING":
                    titles = ["Online course", "Reading", "Tutorial", "Workshop", "Study session"]
                    duration = np.random.uniform(1, 3)
                else:  # PERSONAL
                    titles = ["Grocery shopping", "Cleaning", "Laundry", "Meal prep", "Personal time"]
                    duration = np.random.uniform(0.5, 2)
                
                start_time = current_date.replace(hour=hour, minute=np.random.randint(0, 60))
                end_time = start_time + timedelta(hours=duration)
                
                event = {
                    "id": f"user_{user_id}_event_{len(user_events)}",
                    "userId": f"user_{user_id}",
                    "title": np.random.choice(titles),
                    "category": category,
                    "startTime": start_time,
                    "endTime": end_time,
                    "location": "Office" if category == "WORK" and np.random.random() < 0.7 else ""
                }
                
                daily_events.append(event)
            
            user_events.extend(daily_events)
        
        all_events.extend(user_events)
    
    return all_events

def train_pattern_detector():
    """Train the pattern detection models"""
    logger.info("Starting pattern detector training...")
    
    # Initialize detector
    detector = AdvancedPatternDetector()
    
    # Generate training data
    logger.info("Generating behavioral pattern training data...")
    training_events = generate_pattern_training_data(n_users=10, events_per_user=100)
    logger.info(f"Generated {len(training_events)} training events across multiple users")
    
    # Group events by user for individual pattern analysis
    user_events = {}
    for event in training_events:
        user_id = event["userId"]
        if user_id not in user_events:
            user_events[user_id] = []
        user_events[user_id].append(event)
    
    # Train on multiple users' data
    all_features = []
    all_patterns = []
    
    for user_id, events in user_events.items():
        logger.info(f"Analyzing patterns for {user_id} ({len(events)} events)")
        
        # Extract features for this user
        features, feature_names = detector.extract_comprehensive_features(events)
        if features.shape[0] > 0:
            all_features.append(features)
        
        # Detect patterns for this user
        patterns = detector.detect_behavioral_patterns(events)
        all_patterns.append(patterns)
        
        logger.info(f"  Found {len(patterns['patterns'])} patterns and {len(patterns['anomalies'])} anomalies")
    
    # Combine all features for model training
    if all_features:
        combined_features = np.vstack(all_features)
        logger.info(f"Training models on {combined_features.shape[0]} events with {combined_features.shape[1]} features")
        
        # Fit preprocessing models
        scaled_features = detector.scaler.fit_transform(combined_features)
        
        # Train clustering models
        detector.kmeans.fit(scaled_features)
        detector.dbscan.fit(scaled_features)
        
        # Train anomaly detector
        detector.anomaly_detector.fit(scaled_features)
        
        detector.is_trained = True
        
        logger.info("Pattern detector models trained successfully")
        
        # Save models
        model_path = os.path.join(os.path.dirname(__file__), "models", "trained")
        detector.save_models(model_path)
        logger.info(f"Pattern detector models saved to {model_path}")
        
        # Test pattern detection
        logger.info("\nTesting pattern detection:")
        test_user_events = user_events["user_0"][:50]  # Use first 50 events from user 0
        
        test_results = detector.detect_behavioral_patterns(test_user_events)
        
        logger.info(f"Test Results:")
        logger.info(f"  Patterns found: {len(test_results['patterns'])}")
        logger.info(f"  Anomalies detected: {len(test_results['anomalies'])}")
        logger.info(f"  Insights generated: {len(test_results['insights'])}")
        
        # Show example patterns
        for i, pattern in enumerate(test_results['patterns'][:3], 1):
            logger.info(f"  Pattern {i}: {pattern['patternType']} - {pattern['description']}")
        
        # Show example insights
        for insight in test_results['insights'][:3]:
            logger.info(f"  Insight: {insight}")
    
    else:
        logger.warning("No valid features extracted, using default models")

def train_burnout_predictor():
    """Train the burnout risk prediction model"""
    logger.info("Starting burnout predictor training...")
    
    # Initialize predictor
    predictor = BurnoutPredictor()
    
    # Generate training data
    logger.info("Generating burnout risk training data...")
    X, y = predictor._generate_burnout_training_data(n_samples=3000)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Scale features
    X_train_scaled = predictor.scaler.fit_transform(X_train)
    X_test_scaled = predictor.scaler.transform(X_test)
    
    # Train model
    logger.info("Training burnout risk model...")
    predictor.risk_model.fit(X_train_scaled, y_train)
    
    # Evaluate
    train_score = predictor.risk_model.score(X_train_scaled, y_train)
    test_score = predictor.risk_model.score(X_test_scaled, y_test)
    
    logger.info(f"Burnout Risk Model - Train R²: {train_score:.3f}, Test R²: {test_score:.3f}")
    
    # Analyze feature importance
    feature_importance = predictor.risk_model.feature_importances_
    feature_names = [
        # Density features
        'avg_daily_events', 'max_daily_events', 'daily_events_std', 'avg_weekly_events',
        'max_consecutive_hours', 'back_to_back_count', 'events_per_day_ratio',
        # Rest features
        'avg_gap_hours', 'min_gap_hours', 'short_breaks_count', 'weekend_ratio',
        'avg_free_hours', 'missed_lunches', 'short_lunches',
        # Overtime features
        'evening_work', 'late_night_work', 'early_morning', 'weekend_work',
        'avg_work_hours', 'max_work_hours', 'long_sessions',
        # Workload features
        'workload_trend', 'recent_increase', 'meeting_ratio', 'project_diversity', 'weeks_analyzed',
        # Balance features
        'work_ratio', 'work_hours_ratio', 'health_ratio', 'personal_ratio',
        'social_ratio', 'balance_entropy', 'non_work_ratio',
        # Pattern features
        'schedule_variance', 'irregular_hours', 'has_recovery', 'active_days'
    ]
    
    # Show top important features
    top_features = sorted(zip(feature_names, feature_importance), key=lambda x: x[1], reverse=True)[:10]
    logger.info("Top 10 important features for burnout prediction:")
    for i, (name, importance) in enumerate(top_features, 1):
        logger.info(f"  {i}. {name}: {importance:.3f}")
    
    predictor.is_trained = True
    
    # Save model
    model_path = os.path.join(os.path.dirname(__file__), "models", "trained")
    predictor.save_models(model_path)
    logger.info(f"Burnout predictor models saved to {model_path}")
    
    # Test burnout analysis
    logger.info("\nTesting burnout risk analysis:")
    
    # Generate test schedule with high burnout risk
    test_events = []
    base_date = datetime(2024, 1, 15)
    
    # Add many work events with little rest
    for day in range(7):
        current_date = base_date + timedelta(days=day)
        
        # Early morning work
        test_events.append({
            "id": f"test_{day}_1",
            "title": "Early work session",
            "category": "WORK",
            "startTime": current_date.replace(hour=7),
            "endTime": current_date.replace(hour=9)
        })
        
        # Back-to-back meetings
        for hour in [9, 10, 11, 14, 15, 16]:
            test_events.append({
                "id": f"test_{day}_{hour}",
                "title": f"Meeting {hour}",
                "category": "WORK",
                "startTime": current_date.replace(hour=hour),
                "endTime": current_date.replace(hour=hour+1)
            })
        
        # Late evening work
        if day < 5:  # Weekdays
            test_events.append({
                "id": f"test_{day}_late",
                "title": "Late work session",
                "category": "WORK",
                "startTime": current_date.replace(hour=20),
                "endTime": current_date.replace(hour=22)
            })
    
    # Analyze burnout risk
    analysis = predictor.analyze_burnout_risk(test_events)
    
    logger.info(f"Test Schedule Analysis:")
    logger.info(f"  Risk Score: {analysis['risk_score']:.3f}")
    logger.info(f"  Risk Level: {analysis['risk_level']}")
    logger.info(f"  Warnings: {len(analysis['warnings'])}")
    for warning in analysis['warnings'][:3]:
        logger.info(f"    - {warning}")
    logger.info(f"  Recommendations: {len(analysis['recommendations'])}")
    for rec in analysis['recommendations'][:3]:
        logger.info(f"    - {rec}")

def main():
    """Train all models"""
    logger.info("Starting ML model training pipeline...")
    
    # Train event classifier
    train_event_classifier()
    
    logger.info("\n" + "="*50 + "\n")
    
    # Train schedule optimizer  
    train_schedule_optimizer()
    
    logger.info("\n" + "="*50 + "\n")
    
    # Train pattern detector
    train_pattern_detector()
    
    logger.info("\n" + "="*50 + "\n")
    
    # Train burnout predictor
    train_burnout_predictor()
    
    logger.info("\nAll models trained successfully!")

if __name__ == "__main__":
    main()