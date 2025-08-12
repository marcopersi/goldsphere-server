#!/bin/bash

# Goldsphere Server Credentials Helper
# Provides standardized credentials for all testing and automation scripts
# 
# Usage: source scripts/credentials.sh
# Then use: $BANK_EMAIL, $BANK_PASSWORD, $ADMIN_EMAIL, $ADMIN_PASSWORD

# Bank Technical User - Primary user for technical operations
export BANK_EMAIL="bank.technical@goldsphere.vault"
export BANK_PASSWORD="GoldspherePassword"

# Admin User - For administrative operations
export ADMIN_EMAIL="admin@goldsphere.vault"
export ADMIN_PASSWORD="admin123"

# Server Configuration
export SERVER_URL="http://localhost:8888"
export API_BASE_URL="$SERVER_URL/api"

# Helper function to get authentication token for bank user
get_bank_token() {
    local response=$(curl -s -X POST "$SERVER_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\": \"$BANK_EMAIL\", \"password\": \"$BANK_PASSWORD\"}")
    
    local token=$(echo "$response" | jq -r '.token // empty')
    
    if [ -z "$token" ] || [ "$token" = "null" ]; then
        echo "❌ Bank user authentication failed!" >&2
        echo "Response: $response" >&2
        return 1
    fi
    
    echo "$token"
}

# Helper function to get authentication token for admin user
get_admin_token() {
    local response=$(curl -s -X POST "$SERVER_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\": \"$ADMIN_EMAIL\", \"password\": \"$ADMIN_PASSWORD\"}")
    
    local token=$(echo "$response" | jq -r '.token // empty')
    
    if [ -z "$token" ] || [ "$token" = "null" ]; then
        echo "❌ Admin authentication failed!" >&2
        echo "Response: $response" >&2
        return 1
    fi
    
    echo "$token"
}

# Helper function to test if server is running
test_server_connection() {
    if ! curl -s -f "$SERVER_URL/health" > /dev/null; then
        echo "❌ Server is not running at $SERVER_URL" >&2
        echo "Please start the server with: npm run dev" >&2
        return 1
    fi
    echo "✅ Server is running at $SERVER_URL"
    return 0
}

# Display credentials (for debugging - passwords hidden)
show_credentials() {
    echo "=== Goldsphere Server Credentials ==="
    echo "Bank Technical User: $BANK_EMAIL (password: ***)"
    echo "Admin User: $ADMIN_EMAIL (password: ***)"
    echo "Server URL: $SERVER_URL"
    echo "API Base URL: $API_BASE_URL"
    echo ""
    echo "Usage in scripts:"
    echo "  source scripts/credentials.sh"
    echo "  BANK_TOKEN=\$(get_bank_token)"
    echo "  ADMIN_TOKEN=\$(get_admin_token)"
    echo "=================================="
}

# Export functions so they can be used in scripts that source this file
export -f get_bank_token
export -f get_admin_token
export -f test_server_connection
export -f show_credentials
