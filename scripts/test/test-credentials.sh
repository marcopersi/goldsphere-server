#!/bin/bash

# Goldsphere Server Authentication Test
# Tests all user credentials and ensures they work correctly
# Run this after database reinitialization to verify setup

# Source credentials helper
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/credentials.sh"

echo "=== Goldsphere Server Authentication Test ==="
echo

# Display current credentials
show_credentials
echo

# Test server connection first
echo "Testing server connection..."
if ! test_server_connection; then
    exit 1
fi
echo

# Test 1: Bank Technical User Authentication
echo "Test 1: Bank Technical User Authentication"
echo "=========================================="
echo "Email: $BANK_EMAIL"
echo "Password: ****** (GoldspherePassword)"
echo

BANK_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$BANK_EMAIL\", \"password\": \"$BANK_PASSWORD\"}")

BANK_TOKEN=$(echo "$BANK_RESPONSE" | jq -r '.token // empty')

if [ -z "$BANK_TOKEN" ] || [ "$BANK_TOKEN" = "null" ]; then
  echo "❌ Bank technical user authentication FAILED"
  echo "Response: $BANK_RESPONSE"
  echo "This indicates the password hash in the database doesn't match 'GoldspherePassword'"
  echo "Please check the database initialization script."
  BANK_AUTH_SUCCESS=false
else
  echo "✅ Bank technical user authentication SUCCESS"
  BANK_USER_ID=$(echo "$BANK_RESPONSE" | jq -r '.user.id // empty')
  BANK_USER_NAME=$(echo "$BANK_RESPONSE" | jq -r '.user.userName // empty')
  echo "   User ID: $BANK_USER_ID"
  echo "   User Name: $BANK_USER_NAME"
  BANK_AUTH_SUCCESS=true
fi
echo

# Test 2: Admin User Authentication
echo "Test 2: Admin User Authentication"
echo "=================================="
echo "Email: $ADMIN_EMAIL"
echo "Password: ****** (admin123)"
echo

ADMIN_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$ADMIN_EMAIL\", \"password\": \"$ADMIN_PASSWORD\"}")

ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | jq -r '.token // empty')

if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
  echo "❌ Admin user authentication FAILED"
  echo "Response: $ADMIN_RESPONSE"
  ADMIN_AUTH_SUCCESS=false
else
  echo "✅ Admin user authentication SUCCESS"
  ADMIN_USER_ID=$(echo "$ADMIN_RESPONSE" | jq -r '.user.id // empty')
  ADMIN_USER_NAME=$(echo "$ADMIN_RESPONSE" | jq -r '.user.userName // empty')
  echo "   User ID: $ADMIN_USER_ID"
  echo "   User Name: $ADMIN_USER_NAME"
  ADMIN_AUTH_SUCCESS=true
fi
echo

# Test 3: API Access with Bank User
if [ "$BANK_AUTH_SUCCESS" = true ]; then
  echo "Test 3: API Access with Bank User Token"
  echo "========================================"
  
  API_RESPONSE=$(curl -s -X GET "$SERVER_URL/api/auth/validate" \
    -H "Authorization: Bearer $BANK_TOKEN")
  
  if echo "$API_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo "✅ Bank user API access SUCCESS"
    echo "   Token validation passed"
  else
    echo "❌ Bank user API access FAILED"
    echo "Response: $API_RESPONSE"
  fi
  echo
fi

# Test 4: API Access with Admin User
if [ "$ADMIN_AUTH_SUCCESS" = true ]; then
  echo "Test 4: API Access with Admin User Token"
  echo "========================================="
  
  API_RESPONSE=$(curl -s -X GET "$SERVER_URL/api/auth/validate" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
  
  if echo "$API_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo "✅ Admin user API access SUCCESS"
    echo "   Token validation passed"
  else
    echo "❌ Admin user API access FAILED"
    echo "Response: $API_RESPONSE"
  fi
  echo
fi

# Test 5: Helper Functions
echo "Test 5: Helper Functions"
echo "========================"

echo "Testing get_bank_token function..."
HELPER_BANK_TOKEN=$(get_bank_token)
if [ $? -eq 0 ] && [ -n "$HELPER_BANK_TOKEN" ]; then
  echo "✅ get_bank_token() function SUCCESS"
  echo "   Token: ${HELPER_BANK_TOKEN:0:20}..."
else
  echo "❌ get_bank_token() function FAILED"
fi

echo "Testing get_admin_token function..."
HELPER_ADMIN_TOKEN=$(get_admin_token)
if [ $? -eq 0 ] && [ -n "$HELPER_ADMIN_TOKEN" ]; then
  echo "✅ get_admin_token() function SUCCESS"
  echo "   Token: ${HELPER_ADMIN_TOKEN:0:20}..."
else
  echo "❌ get_admin_token() function FAILED"
fi
echo

# Summary
echo "=== Test Summary ==="
if [ "$BANK_AUTH_SUCCESS" = true ] && [ "$ADMIN_AUTH_SUCCESS" = true ]; then
  echo "🎉 ALL AUTHENTICATION TESTS PASSED!"
  echo ""
  echo "✅ Bank Technical User: WORKING"
  echo "✅ Admin User: WORKING"
  echo "✅ Helper Functions: WORKING"
  echo ""
  echo "Your credentials are properly configured."
  echo "You can now run other test scripts with confidence."
  exit 0
else
  echo "❌ SOME AUTHENTICATION TESTS FAILED!"
  echo ""
  if [ "$BANK_AUTH_SUCCESS" != true ]; then
    echo "❌ Bank Technical User: FAILED"
  fi
  if [ "$ADMIN_AUTH_SUCCESS" != true ]; then
    echo "❌ Admin User: FAILED"
  fi
  echo ""
  echo "Please check:"
  echo "1. Database initialization: tools/dbrecreation.sh"
  echo "2. Password hashes in initdb/02-initialLoad.sql"
  echo "3. Server is running: npm run dev"
  echo "4. Credentials in CREDENTIALS.md"
  exit 1
fi
