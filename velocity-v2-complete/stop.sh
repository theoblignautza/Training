#!/bin/bash

# Velocity Network Manager v2.0 - Clean Shutdown Script

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$SCRIPT_DIR/.pids"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

echo ""
log_info "Stopping Velocity Network Manager..."
echo ""

# Stop backend
if [ -f "$PID_DIR/backend.pid" ]; then
    BACKEND_PID=$(cat "$PID_DIR/backend.pid")
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        kill -TERM $BACKEND_PID 2>/dev/null || kill -9 $BACKEND_PID 2>/dev/null
        log_success "Backend stopped (PID: $BACKEND_PID)"
    fi
    rm -f "$PID_DIR/backend.pid"
fi

# Stop frontend
if [ -f "$PID_DIR/frontend.pid" ]; then
    FRONTEND_PID=$(cat "$PID_DIR/frontend.pid")
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        kill -TERM $FRONTEND_PID 2>/dev/null || kill -9 $FRONTEND_PID 2>/dev/null
        log_success "Frontend stopped (PID: $FRONTEND_PID)"
    fi
    rm -f "$PID_DIR/frontend.pid"
fi

# Kill any processes still on ports
for port in 8080 3000; do
    PID=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$PID" ]; then
        kill -9 $PID 2>/dev/null
        log_success "Freed port $port"
    fi
done

log_success "All services stopped"
echo ""
