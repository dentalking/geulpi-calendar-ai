#!/usr/bin/env python3
"""
Test script for enhanced ML server features
Demonstrates model versioning, A/B testing, and monitoring
"""

import asyncio
import httpx
from datetime import datetime, timedelta
import json
import time
from typing import Dict, Any, List

# Configuration
BASE_URL = "http://localhost:8001"  # Enhanced server port
HEADERS = {"Content-Type": "application/json"}

async def test_health_check():
    """Test health check endpoint"""
    print("\n=== Testing Health Check ===")
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.json()

async def test_event_classification_v2():
    """Test enhanced event classification"""
    print("\n=== Testing Enhanced Event Classification ===")
    
    test_events = [
        {
            "title": "Team standup meeting",
            "description": "Daily sync with the development team",
            "startTime": datetime.now().isoformat(),
            "endTime": (datetime.now() + timedelta(hours=0.5)).isoformat(),
            "location": "Conference Room A"
        },
        {
            "title": "Gym workout session",
            "description": "Upper body strength training",
            "startTime": (datetime.now() + timedelta(hours=2)).isoformat(),
            "endTime": (datetime.now() + timedelta(hours=3)).isoformat(),
            "location": "Local Fitness Center"
        },
        {
            "title": "Machine Learning Study Group",
            "description": "Review deep learning architectures",
            "startTime": (datetime.now() + timedelta(hours=5)).isoformat(),
            "endTime": (datetime.now() + timedelta(hours=7)).isoformat(),
            "location": "Online"
        }
    ]
    
    async with httpx.AsyncClient() as client:
        for event in test_events:
            print(f"\nClassifying: {event['title']}")
            response = await client.post(
                f"{BASE_URL}/v2/classify-event",
                json=event,
                headers=HEADERS
            )
            if response.status_code == 200:
                result = response.json()
                print(f"  Type: {result['eventType']}")
                print(f"  Priority: {result['priority']}")
                print(f"  Confidence: {result['confidence']:.2f}")
                print(f"  Tags: {result['suggestedTags']}")
            else:
                print(f"  Error: {response.status_code} - {response.text}")

async def test_model_training():
    """Test model training and registration"""
    print("\n=== Testing Model Training ===")
    
    training_request = {
        "model_type": "event_classifier",
        "optimize": True,
        "auto_promote": False,
        "n_optimization_trials": 20,
        "description": "Test model with optimization"
    }
    
    async with httpx.AsyncClient(timeout=300.0) as client:
        print("Starting model training (this may take a few minutes)...")
        response = await client.post(
            f"{BASE_URL}/models/train",
            json=training_request,
            headers=HEADERS
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"Training completed!")
            print(f"  Version: {result['version']}")
            print(f"  Metrics: {json.dumps(result['metrics'], indent=4)}")
            return result['version']
        else:
            print(f"Error: {response.status_code} - {response.text}")
            return None

async def test_model_versions(model_name: str = "event_classifier"):
    """Test listing model versions"""
    print(f"\n=== Testing Model Versions for {model_name} ===")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/models/{model_name}/versions")
        
        if response.status_code == 200:
            result = response.json()
            print(f"Found {len(result['versions'])} versions:")
            for v in result['versions']:
                print(f"  Version {v['version']}: {v['stage']} (created: {v['created_at']})")
        else:
            print(f"Error: {response.status_code} - {response.text}")

async def test_model_promotion(model_name: str, version: str):
    """Test model promotion"""
    print(f"\n=== Testing Model Promotion ===")
    
    async with httpx.AsyncClient() as client:
        # Promote to staging
        print(f"Promoting {model_name} v{version} to Staging...")
        response = await client.post(
            f"{BASE_URL}/models/{model_name}/promote",
            params={"version": version, "target_stage": "Staging"},
            headers=HEADERS
        )
        
        if response.status_code == 200:
            print(f"Success: {response.json()['message']}")
        else:
            print(f"Error: {response.status_code} - {response.text}")

async def test_ab_testing():
    """Test A/B testing framework"""
    print("\n=== Testing A/B Test Creation ===")
    
    ab_test_request = {
        "name": "Event Classifier v1 vs v2",
        "description": "Compare baseline model with optimized version",
        "model_type": "event_classifier",
        "variants": [
            {
                "name": "control",
                "version": "1",
                "traffic_percentage": 50
            },
            {
                "name": "treatment",
                "version": "2",
                "traffic_percentage": 50
            }
        ],
        "duration_hours": 1,
        "success_metrics": {
            "success_rate": {"threshold": 0.95, "weight": 1.0},
            "avg_latency_ms": {"threshold": 50, "weight": 0.5}
        }
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/experiments/create",
            json=ab_test_request,
            headers=HEADERS
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"A/B test created!")
            print(f"  Experiment ID: {result['experiment_id']}")
            print(f"  Status: {result['status']}")
            return result['experiment_id']
        else:
            print(f"Error: {response.status_code} - {response.text}")
            return None

async def test_ab_results(experiment_id: str):
    """Test getting A/B test results"""
    print(f"\n=== Testing A/B Test Results ===")
    
    async with httpx.AsyncClient() as client:
        # Simulate some traffic first
        print("Simulating traffic to generate results...")
        test_events = [
            {
                "title": f"Test Event {i}",
                "description": "Test description",
                "startTime": datetime.now().isoformat(),
                "endTime": (datetime.now() + timedelta(hours=1)).isoformat(),
                "request_id": f"test_{i}"
            }
            for i in range(20)
        ]
        
        for event in test_events:
            await client.post(
                f"{BASE_URL}/v2/classify-event",
                json=event,
                headers=HEADERS
            )
            await asyncio.sleep(0.1)
        
        # Get results
        print("\nFetching A/B test results...")
        response = await client.get(f"{BASE_URL}/experiments/{experiment_id}/results")
        
        if response.status_code == 200:
            results = response.json()
            print(f"Experiment: {results['experiment_id']}")
            print(f"Status: {results['status']}")
            print("\nVariant Results:")
            for variant, stats in results.get('variants', {}).items():
                print(f"\n  {variant}:")
                print(f"    Sample Size: {stats['sample_size']}")
                print(f"    Success Rate: {stats['success_rate']:.2%}")
                print(f"    Avg Latency: {stats['avg_latency_ms']:.2f}ms")
        else:
            print(f"Error: {response.status_code} - {response.text}")

async def test_monitoring_dashboard(model_name: str = "event_classifier"):
    """Test monitoring dashboard"""
    print(f"\n=== Testing Monitoring Dashboard ===")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/monitoring/dashboard/{model_name}")
        
        if response.status_code == 200:
            dashboard = response.json()
            print(f"Model: {dashboard['model_name']}")
            print(f"Current Version: {dashboard['current_version']}")
            print(f"Health Status: {dashboard['health_status']}")
            print(f"Statistics:")
            for key, value in dashboard['statistics'].items():
                print(f"  {key}: {value}")
            print(f"Active Alerts: {dashboard['active_alerts']}")
            print(f"Drift Detected: {dashboard['drift_detected']}")
        else:
            print(f"Error: {response.status_code} - {response.text}")

async def test_prometheus_metrics():
    """Test Prometheus metrics endpoint"""
    print("\n=== Testing Prometheus Metrics ===")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/monitoring/metrics")
        
        if response.status_code == 200:
            metrics = response.text
            print("Sample metrics (first 500 chars):")
            print(metrics[:500])
        else:
            print(f"Error: {response.status_code} - {response.text}")

async def test_model_comparison(model_name: str = "event_classifier"):
    """Test model comparison"""
    print(f"\n=== Testing Model Comparison ===")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/models/compare",
            params={
                "model_name": model_name,
                "version_a": "1",
                "version_b": "2"
            },
            headers=HEADERS
        )
        
        if response.status_code == 200:
            comparison = response.json()
            print("Version A:")
            print(f"  Version: {comparison['version_a']['version']}")
            print(f"  Metrics: {json.dumps(comparison['version_a']['metrics'], indent=4)}")
            print("\nVersion B:")
            print(f"  Version: {comparison['version_b']['version']}")
            print(f"  Metrics: {json.dumps(comparison['version_b']['metrics'], indent=4)}")
            print(f"\nRecommendation: {comparison['recommendation']}")
        else:
            print(f"Error: {response.status_code} - {response.text}")

async def run_all_tests():
    """Run all tests in sequence"""
    print("Starting Enhanced ML Server Tests")
    print("=================================")
    
    # 1. Health check
    health = await test_health_check()
    
    # 2. Test enhanced classification
    await test_event_classification_v2()
    
    # 3. Train a new model (optional - takes time)
    # version = await test_model_training()
    
    # 4. List model versions
    await test_model_versions()
    
    # 5. Test model promotion (if you have multiple versions)
    # await test_model_promotion("event_classifier", "2")
    
    # 6. Create and test A/B experiment
    # experiment_id = await test_ab_testing()
    # if experiment_id:
    #     await asyncio.sleep(2)  # Wait for some data
    #     await test_ab_results(experiment_id)
    
    # 7. Test monitoring
    await test_monitoring_dashboard()
    await test_prometheus_metrics()
    
    # 8. Test model comparison
    # await test_model_comparison()
    
    print("\n=================================")
    print("Tests completed!")

async def simulate_production_traffic():
    """Simulate production-like traffic for testing"""
    print("\n=== Simulating Production Traffic ===")
    
    event_templates = [
        ("Team {} meeting", "WORK", "Discuss project updates"),
        ("Gym workout - {}", "HEALTH", "Cardio and strength training"),
        ("Dinner with {}", "SOCIAL", "Catching up with friends"),
        ("Study {} programming", "LEARNING", "Learning new technologies"),
        ("Personal errands", "PERSONAL", "Shopping and household tasks")
    ]
    
    async with httpx.AsyncClient() as client:
        for i in range(100):
            template = event_templates[i % len(event_templates)]
            event = {
                "title": template[0].format(f"#{i}"),
                "description": template[2],
                "startTime": (datetime.now() + timedelta(hours=i)).isoformat(),
                "endTime": (datetime.now() + timedelta(hours=i+1)).isoformat(),
                "request_id": f"sim_{i}"
            }
            
            try:
                response = await client.post(
                    f"{BASE_URL}/v2/classify-event",
                    json=event,
                    headers=HEADERS,
                    timeout=5.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if i % 10 == 0:
                        print(f"Request {i}: {result['eventType']} (confidence: {result['confidence']:.2f})")
                else:
                    print(f"Request {i} failed: {response.status_code}")
            except Exception as e:
                print(f"Request {i} error: {e}")
            
            await asyncio.sleep(0.1)
    
    print("Traffic simulation completed!")

if __name__ == "__main__":
    # Run tests
    asyncio.run(run_all_tests())
    
    # Optionally simulate traffic
    # asyncio.run(simulate_production_traffic())