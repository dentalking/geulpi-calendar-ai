#!/bin/bash

# Monitor script for tracking service fix completion
# Services indicate completion by deleting their PROMPT.md files

echo "🔍 Monitoring Service Fix Progress..."
echo "============================================"

check_service_status() {
    local service=$1
    local prompt_file="${service}/PROMPT.md"
    
    if [ -f "$prompt_file" ]; then
        echo "⏳ $service: In Progress (PROMPT.md exists)"
        return 1
    else
        echo "✅ $service: Complete (PROMPT.md deleted)"
        return 0
    fi
}

# Check all services
frontend_done=false
backend_done=false
mlserver_done=false

while true; do
    clear
    echo "🔍 Service Fix Status Monitor"
    echo "============================="
    echo "Time: $(date)"
    echo ""
    
    # Check each service
    if check_service_status "frontend"; then
        frontend_done=true
    fi
    
    if check_service_status "backend"; then
        backend_done=true
    fi
    
    if check_service_status "ml-server"; then
        mlserver_done=true
    fi
    
    echo ""
    
    # Check if all services are done
    if [ "$frontend_done" = true ] && [ "$backend_done" = true ] && [ "$mlserver_done" = true ]; then
        echo "🎉 All services have completed their fixes!"
        echo ""
        echo "Next steps:"
        echo "1. Run E2E tests: npm run test:e2e:smart"
        echo "2. Check SERVICE_COORDINATION_STATUS.md for details"
        break
    else
        echo "⏳ Waiting for all services to complete..."
        echo ""
        echo "Press Ctrl+C to stop monitoring"
        sleep 30
    fi
done