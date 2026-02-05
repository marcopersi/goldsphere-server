#!/bin/bash

##############################################################################
# User Management API Test Script
# Tests block, unblock, soft delete, and list blocked users endpoints
##############################################################################

set -e

BASE_URL="http://localhost:8888"
ADMIN_EMAIL="admin@goldsphere.com"
ADMIN_PASSWORD="AdminPassword123!"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}User Management API Tests${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to print test result
print_result() {
  local test_name=$1
  local status=$2
  
  if [ "$status" -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: $test_name"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC}: $test_name"
    ((TESTS_FAILED++))
  fi
}

# Function to check HTTP status
check_status() {
  local expected=$1
  local actual=$2
  local test_name=$3
  
  if [ "$actual" -eq "$expected" ]; then
    print_result "$test_name" 0
  else
    echo -e "${RED}Expected $expected, got $actual${NC}"
    print_result "$test_name" 1
  fi
}

##############################################################################
# Step 1: Admin Login
##############################################################################

echo -e "${YELLOW}Step 1: Admin Login${NC}"

LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

HTTP_STATUS=$(echo "$LOGIN_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

check_status 200 "$HTTP_STATUS" "Admin login"

if [ "$HTTP_STATUS" -eq 200 ]; then
  ADMIN_TOKEN=$(echo "$RESPONSE_BODY" | jq -r '.token')
  ADMIN_USER_ID=$(echo "$RESPONSE_BODY" | jq -r '.user.id')
  echo -e "Admin Token: ${ADMIN_TOKEN:0:20}..."
  echo -e "Admin User ID: $ADMIN_USER_ID"
else
  echo -e "${RED}Failed to login. Cannot continue tests.${NC}"
  exit 1
fi

echo ""

##############################################################################
# Step 2: Create Test User
##############################################################################

echo -e "${YELLOW}Step 2: Create Test User${NC}"

TEST_USER_EMAIL="testuser-$(date +%s)@example.com"

CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/registration/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\":\"$TEST_USER_EMAIL\",
    \"password\":\"TestPassword123!\",
    \"firstName\":\"Test\",
    \"lastName\":\"User\",
    \"birthDate\":\"1990-01-01\",
    \"countryId\":\"e8b8c8d8-1234-5678-1234-567812345678\",
    \"postalCode\":\"12345\",
    \"city\":\"Test City\",
    \"street\":\"Test Street 1\",
    \"termsVersion\":\"1.0\"
  }")

HTTP_STATUS=$(echo "$CREATE_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$CREATE_RESPONSE" | sed '$d')

check_status 201 "$HTTP_STATUS" "Create test user"

if [ "$HTTP_STATUS" -eq 201 ]; then
  TEST_USER_ID=$(echo "$RESPONSE_BODY" | jq -r '.user.id')
  echo -e "Test User ID: $TEST_USER_ID"
else
  echo -e "${RED}Failed to create test user. Cannot continue tests.${NC}"
  exit 1
fi

echo ""

##############################################################################
# Step 3: Block User (Admin Only)
##############################################################################

echo -e "${YELLOW}Step 3: Block User${NC}"

BLOCK_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/users/$TEST_USER_ID/block" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"reason\":\"Testing block functionality\"}")

HTTP_STATUS=$(echo "$BLOCK_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$BLOCK_RESPONSE" | sed '$d')

check_status 200 "$HTTP_STATUS" "Block user"

if [ "$HTTP_STATUS" -eq 200 ]; then
  ACCOUNT_STATUS=$(echo "$RESPONSE_BODY" | jq -r '.data.accountStatus')
  echo -e "Account Status: $ACCOUNT_STATUS"
  
  if [ "$ACCOUNT_STATUS" = "blocked" ]; then
    print_result "User status is 'blocked'" 0
  else
    print_result "User status is 'blocked'" 1
  fi
fi

echo ""

##############################################################################
# Step 4: Try to Block Already Blocked User (Should Fail)
##############################################################################

echo -e "${YELLOW}Step 4: Block Already Blocked User (Should Fail)${NC}"

BLOCK_AGAIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/users/$TEST_USER_ID/block" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"reason\":\"Trying to block again\"}")

HTTP_STATUS=$(echo "$BLOCK_AGAIN_RESPONSE" | tail -n1)

check_status 409 "$HTTP_STATUS" "Block already blocked user returns 409"

echo ""

##############################################################################
# Step 5: Get Blocked Users List
##############################################################################

echo -e "${YELLOW}Step 5: Get Blocked Users List${NC}"

BLOCKED_LIST_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/users/blocked" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

HTTP_STATUS=$(echo "$BLOCKED_LIST_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$BLOCKED_LIST_RESPONSE" | sed '$d')

check_status 200 "$HTTP_STATUS" "Get blocked users list"

if [ "$HTTP_STATUS" -eq 200 ]; then
  BLOCKED_COUNT=$(echo "$RESPONSE_BODY" | jq '.data | length')
  echo -e "Blocked Users Count: $BLOCKED_COUNT"
  
  if [ "$BLOCKED_COUNT" -gt 0 ]; then
    print_result "Blocked users list is not empty" 0
  else
    print_result "Blocked users list is not empty" 1
  fi
fi

echo ""

##############################################################################
# Step 6: Unblock User
##############################################################################

echo -e "${YELLOW}Step 6: Unblock User${NC}"

UNBLOCK_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/users/$TEST_USER_ID/unblock" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

HTTP_STATUS=$(echo "$UNBLOCK_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$UNBLOCK_RESPONSE" | sed '$d')

check_status 200 "$HTTP_STATUS" "Unblock user"

if [ "$HTTP_STATUS" -eq 200 ]; then
  ACCOUNT_STATUS=$(echo "$RESPONSE_BODY" | jq -r '.data.accountStatus')
  echo -e "Account Status: $ACCOUNT_STATUS"
  
  if [ "$ACCOUNT_STATUS" = "active" ]; then
    print_result "User status is 'active'" 0
  else
    print_result "User status is 'active'" 1
  fi
fi

echo ""

##############################################################################
# Step 7: Try to Unblock Active User (Should Fail)
##############################################################################

echo -e "${YELLOW}Step 7: Unblock Active User (Should Fail)${NC}"

UNBLOCK_AGAIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/users/$TEST_USER_ID/unblock" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

HTTP_STATUS=$(echo "$UNBLOCK_AGAIN_RESPONSE" | tail -n1)

check_status 409 "$HTTP_STATUS" "Unblock active user returns 409"

echo ""

##############################################################################
# Step 8: Soft Delete User
##############################################################################

echo -e "${YELLOW}Step 8: Soft Delete User${NC}"

SOFT_DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/users/$TEST_USER_ID/soft" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

HTTP_STATUS=$(echo "$SOFT_DELETE_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$SOFT_DELETE_RESPONSE" | sed '$d')

check_status 200 "$HTTP_STATUS" "Soft delete user"

if [ "$HTTP_STATUS" -eq 200 ]; then
  ACCOUNT_STATUS=$(echo "$RESPONSE_BODY" | jq -r '.data.accountStatus')
  echo -e "Account Status: $ACCOUNT_STATUS"
  
  if [ "$ACCOUNT_STATUS" = "deleted" ]; then
    print_result "User status is 'deleted'" 0
  else
    print_result "User status is 'deleted'" 1
  fi
fi

echo ""

##############################################################################
# Step 9: Try to Block Without Admin Token (Should Fail)
##############################################################################

echo -e "${YELLOW}Step 9: Block Without Admin Token (Should Fail)${NC}"

NO_AUTH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/users/$TEST_USER_ID/block" \
  -H "Content-Type: application/json" \
  -d "{\"reason\":\"No token\"}")

HTTP_STATUS=$(echo "$NO_AUTH_RESPONSE" | tail -n1)

check_status 401 "$HTTP_STATUS" "Block without token returns 401"

echo ""

##############################################################################
# Step 10: Try to Block Self (Should Fail)
##############################################################################

echo -e "${YELLOW}Step 10: Admin Tries to Block Self (Should Fail)${NC}"

BLOCK_SELF_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/users/$ADMIN_USER_ID/block" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"reason\":\"Testing self-block prevention\"}")

HTTP_STATUS=$(echo "$BLOCK_SELF_RESPONSE" | tail -n1)

check_status 403 "$HTTP_STATUS" "Block self returns 403"

echo ""

##############################################################################
# Summary
##############################################################################

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed! ✓${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed! ✗${NC}"
  exit 1
fi
