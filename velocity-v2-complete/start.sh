#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# Velocity Network Manager v2.0 - Enterprise Installer & Launcher
# ═══════════════════════════════════════════════════════════════════════════
# This script handles:
# - Port availability checking and automatic cleanup
# - Dependency installation
# - Service health monitoring
# - Graceful shutdown
# ═══════════════════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
BACKEND_PORT=8080
FRONTEND_PORT=3000
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
PID_DIR="$SCRIPT_DIR/.pids"

# Logging
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_header() { echo -e "${CYAN}$1${NC}"; }

# Banner
print_banner() {
    clear
    log_header "═══════════════════════════════════════════════════════════════"
    log_header "        Velocity Network Manager v2.0 - Enterprise Edition"
    log_header "═══════════════════════════════════════════════════════════════"
    echo ""
}

# Check Node.js
check_nodejs() {
    log_info "Checking Node.js installation..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        echo ""
        echo "Install Node.js 20 LTS: https://nodejs.org/"
        echo "Or run: ./fix-node-version.sh"
        exit 1
    fi
    
    NODE_VERSION=$(node --version)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | tr -d 'v')
    
    if [ "$NODE_MAJOR" -lt 18 ]; then
        log_error "Node.js $NODE_VERSION is too old (need v18+)"
        echo "Run: ./fix-node-version.sh"
        exit 1
    elif [ "$NODE_MAJOR" -gt 20 ]; then
        log_warning "Node.js v$NODE_MAJOR detected - v20 LTS recommended"
    else
        log_success "Node.js $NODE_VERSION ✓"
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    log_success "npm $(npm --version) ✓"
}

# Kill process on port
kill_port() {
    local port=$1
    local name=$2
    
    log_info "Checking port $port..."
    
    local pid=$(lsof -ti :$port 2>/dev/null)
    
    if [ -n "$pid" ]; then
        local proc_name=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
        log_warning "Port $port occupied by PID $pid ($proc_name)"
        log_info "Killing process..."
        
        kill -TERM $pid 2>/dev/null || true
        sleep 2
        
        if ps -p $pid > /dev/null 2>&1; then
            kill -9 $pid 2>/dev/null || true
            sleep 1
        fi
        
        if lsof -ti :$port > /dev/null 2>&1; then
            log_error "Failed to free port $port"
            return 1
        fi
        
        log_success "Port $port freed ✓"
    else
        log_success "Port $port available ✓"
    fi
    
    return 0
}

# Check ports
check_ports() {
    log_header ""
    log_header "Port Availability Check"
    log_header "─────────────────────────────────────────────────────────────"
    
    kill_port $BACKEND_PORT "Backend"
    kill_port $FRONTEND_PORT "Frontend"
    
    echo ""
}

# Install dependencies
install_deps() {
    local dir=$1
    local name=$2
    
    if [ ! -d "$dir/node_modules" ]; then
        log_info "Installing $name dependencies..."
        cd "$dir"
        npm install --loglevel=error
        if [ $? -ne 0 ]; then
            log_error "$name dependency installation failed"
            exit 1
        fi
        log_success "$name dependencies installed ✓"
    else
        log_success "$name dependencies OK ✓"
    fi
}

# Start backend
start_backend() {
    log_info "Starting backend..."
    cd "$BACKEND_DIR"
    
    node server.js > "$SCRIPT_DIR/backend.log" 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > "$PID_DIR/backend.pid"
    
    sleep 3
    
    if ! ps -p $BACKEND_PID > /dev/null 2>&1; then
        log_error "Backend failed to start - check backend.log"
        exit 1
    fi
    
    for i in {1..10}; do
        if curl -s http://localhost:$BACKEND_PORT/api/v1/health > /dev/null 2>&1; then
            log_success "Backend running (PID: $BACKEND_PID) ✓"
            return 0
        fi
        sleep 1
    done
    
    log_warning "Backend started but health check pending..."
}

# Start frontend
start_frontend() {
    log_info "Starting frontend..."
    cd "$FRONTEND_DIR"
    
    npm run dev > "$SCRIPT_DIR/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "$PID_DIR/frontend.pid"
    
    sleep 5
    
    if ! ps -p $FRONTEND_PID > /dev/null 2>&1; then
        log_error "Frontend failed to start - check frontend.log"
        exit 1
    fi
    
    log_success "Frontend running (PID: $FRONTEND_PID) ✓"
}

# Cleanup
cleanup() {
    echo ""
    log_header "═══════════════════════════════════════════════════════════════"
    log_info "Shutting down services..."
    log_header "═══════════════════════════════════════════════════════════════"
    
    if [ -f "$PID_DIR/backend.pid" ]; then
        BACKEND_PID=$(cat "$PID_DIR/backend.pid")
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            log_info "Stopping backend..."
            kill -TERM $BACKEND_PID 2>/dev/null || kill -9 $BACKEND_PID 2>/dev/null
            log_success "Backend stopped ✓"
        fi
        rm -f "$PID_DIR/backend.pid"
    fi
    
    if [ -f "$PID_DIR/frontend.pid" ]; then
        FRONTEND_PID=$(cat "$PID_DIR/frontend.pid")
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            log_info "Stopping frontend..."
            kill -TERM $FRONTEND_PID 2>/dev/null || kill -9 $FRONTEND_PID 2>/dev/null
            log_success "Frontend stopped ✓"
        fi
        rm -f "$PID_DIR/frontend.pid"
    fi
    
    log_success "Shutdown complete"
    log_header "═══════════════════════════════════════════════════════════════"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Status display
print_status() {
    log_header ""
    log_header "═══════════════════════════════════════════════════════════════"
    log_header "           Velocity Network Manager v2.0 - RUNNING"
    log_header "═══════════════════════════════════════════════════════════════"
    echo ""
    log_success "🌐 Frontend:  http://localhost:$FRONTEND_PORT"
    log_success "⚙️  Backend:   http://localhost:$BACKEND_PORT"
    echo ""
    log_header "Features:"
    echo "  ✓ Multi-vendor backup (Cisco, Ubiquiti, Aruba)"
    echo "  ✓ Live logs viewport"
    echo "  ✓ Real-time backup notifications"
    echo "  ✓ Configuration file sidebar"
    echo "  ✓ Network topology (Top-Viewer)"
    echo "  ✓ Enterprise scheduling"
    echo ""
    log_header "Logs:"
    echo "  Backend:  tail -f $SCRIPT_DIR/backend.log"
    echo "  Frontend: tail -f $SCRIPT_DIR/frontend.log"
    echo ""
    log_warning "Press Ctrl+C to stop"
    log_header "═══════════════════════════════════════════════════════════════"
    echo ""
}

# Service monitor
monitor_services() {
    while true; do
        if [ -f "$PID_DIR/backend.pid" ]; then
            BACKEND_PID=$(cat "$PID_DIR/backend.pid")
            if ! ps -p $BACKEND_PID > /dev/null 2>&1; then
                log_error "Backend crashed! Check backend.log"
                cleanup
            fi
        fi
        
        if [ -f "$PID_DIR/frontend.pid" ]; then
            FRONTEND_PID=$(cat "$PID_DIR/frontend.pid")
            if ! ps -p $FRONTEND_PID > /dev/null 2>&1; then
                log_error "Frontend crashed! Check frontend.log"
                cleanup
            fi
        fi
        
        sleep 5
    done
}

# Main
main() {
    print_banner
    check_nodejs
    
    echo ""
    log_header "Installation & Startup"
    log_header "─────────────────────────────────────────────────────────────"
    
    check_ports
    
    mkdir -p "$PID_DIR"
    
    install_deps "$BACKEND_DIR" "Backend"
    install_deps "$FRONTEND_DIR" "Frontend"
    
    echo ""
    log_header "Starting Services"
    log_header "─────────────────────────────────────────────────────────────"
    
    start_backend
    start_frontend
    
    print_status
    monitor_services
}

main
