#!/bin/bash

# Payment API Test Setup Script
# This script starts the server and Stripe CLI, then runs the payment tests

set -e

echo "🚀 Payment API Test Setup"
echo "========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} ✅ $1"
}

print_error() {
    echo -e "${RED}[$(date +'%H:%M:%S')]${NC} ❌ $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')]${NC} ⚠️  $1"
}

# Check if required commands exist
check_requirements() {
    print_status "Checking requirements..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    if ! command -v stripe &> /dev/null; then
        print_error "Stripe CLI is not installed. Install with: brew install stripe/stripe-cli/stripe"
        exit 1
    fi
    
    print_success "All requirements satisfied"
}

# Check if .env.dev exists
check_env_file() {
    print_status "Checking environment configuration..."
    
    if [ ! -f ".env.dev" ]; then
        print_error ".env.dev file not found"
        exit 1
    fi
    
    print_success "Environment file found"
}

# Build the project
build_project() {
    print_status "Building project..."
    
    if npm run build; then
        print_success "Project built successfully"
    else
        print_error "Build failed"
        exit 1
    fi
}

# Start the server in the background
start_server() {
    print_status "Starting server..."
    
    # Check if server is already running
    if curl -s http://localhost:8080/health > /dev/null 2>&1; then
        print_warning "Server is already running on port 8080"
        return 0
    fi
    
    # Start server
    NODE_ENV=development node -r dotenv/config dist/index.js dotenv_config_path=.env.dev &
    SERVER_PID=$!
    
    # Wait for server to start
    for i in {1..30}; do
        if curl -s http://localhost:8080/health > /dev/null 2>&1; then
            print_success "Server started successfully (PID: $SERVER_PID)"
            return 0
        fi
        sleep 1
    done
    
    print_error "Server failed to start within 30 seconds"
    return 1
}

# Start Stripe CLI in the background
start_stripe_cli() {
    print_status "Starting Stripe CLI..."
    
    # Check if user is logged in to Stripe
    if ! stripe config --list > /dev/null 2>&1; then
        print_error "Not logged in to Stripe CLI. Run: stripe login"
        exit 1
    fi
    
    # Start Stripe CLI webhook forwarding
    stripe listen --forward-to localhost:8080/api/v1/payments/webhook > stripe-cli.log 2>&1 &
    STRIPE_PID=$!
    
    # Wait for Stripe CLI to initialize
    sleep 3
    
    if ps -p $STRIPE_PID > /dev/null; then
        print_success "Stripe CLI started successfully (PID: $STRIPE_PID)"
        
        # Extract webhook secret from log
        if grep -q "webhook signing secret" stripe-cli.log; then
            SECRET=$(grep "webhook signing secret" stripe-cli.log | sed 's/.*webhook signing secret is \([^ ]*\).*/\1/')
            print_status "Webhook secret: $SECRET"
        fi
    else
        print_error "Stripe CLI failed to start"
        return 1
    fi
}

# Cleanup function
cleanup() {
    print_status "Cleaning up..."
    
    if [ ! -z "$SERVER_PID" ] && ps -p $SERVER_PID > /dev/null; then
        print_status "Stopping server (PID: $SERVER_PID)"
        kill $SERVER_PID
    fi
    
    if [ ! -z "$STRIPE_PID" ] && ps -p $STRIPE_PID > /dev/null; then
        print_status "Stopping Stripe CLI (PID: $STRIPE_PID)"
        kill $STRIPE_PID
    fi
    
    # Clean up log files
    rm -f stripe-cli.log
    
    print_success "Cleanup complete"
}

# Set up signal handlers for cleanup
trap cleanup EXIT
trap cleanup SIGINT
trap cleanup SIGTERM

# Main execution
main() {
    echo
    check_requirements
    echo
    check_env_file
    echo
    build_project
    echo
    start_server
    echo
    start_stripe_cli
    echo
    
    print_success "Setup complete! You can now run tests:"
    echo
    echo "  📋 Quick test:        npm run test:payment-quick"
    echo "  🧪 Integration test:  npm run test:payment-integration"
    echo "  🐛 Manual testing:    Use curl commands or Postman"
    echo
    print_status "Server running at: http://localhost:8080"
    print_status "API Docs at: http://localhost:8080/api-docs (if enabled)"
    print_status "Stripe CLI forwarding webhooks to: http://localhost:8080/api/v1/payments/webhook"
    echo
    print_warning "Press Ctrl+C to stop all services"
    echo
    
    # Keep script running
    while true; do
        sleep 1
    done
}

# Check if we're being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
