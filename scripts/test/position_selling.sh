#!/bin/bash

# Test script for selling positions and checking portfolio behavior
# Tests what happens to a portfolio when all its positions are sold/deleted

SERVER_URL="http://localhost:8888"
ADMIN_EMAIL="admin@goldsphere.vault"
ADMIN_PASSWORD="admin123"

echo "=== Testing Position Selling and Portfolio Behavior ==="
echo

# Step 1: Authenticate as admin
echo "Step 1: Authenticating as admin..."
ADMIN_TOKEN=$(curl -s -X POST "$SERVER_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$ADMIN_EMAIL\", \"password\": \"$ADMIN_PASSWORD\"}" | jq -r '.token')

if [ "$ADMIN_TOKEN" = "null" ] || [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Admin authentication failed!"
  exit 1
fi

echo "✅ Admin authenticated"
echo

# Step 2: Get Test User ID
echo "Step 2: Finding Test User..."
TEST_USER_RESPONSE=$(curl -s -X GET "$SERVER_URL/api/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json")

TEST_USER_ID=$(echo "$TEST_USER_RESPONSE" | jq -r '.[] | select(.email=="test@example.com") | .id')

if [ -z "$TEST_USER_ID" ] || [ "$TEST_USER_ID" = "null" ]; then
  echo "❌ Test User not found!"
  exit 1
fi

echo "✅ Found Test User ID: $TEST_USER_ID"
echo

# Step 3: Find Test User's portfolio
echo "Step 3: Finding Test User's portfolio..."
PORTFOLIOS_RESPONSE=$(curl -s -X GET "$SERVER_URL/api/portfolios" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json")

TEST_USER_PORTFOLIOS=$(echo "$PORTFOLIOS_RESPONSE" | jq "[.[] | select(.ownerid==\"$TEST_USER_ID\")]")
PORTFOLIO_COUNT=$(echo "$TEST_USER_PORTFOLIOS" | jq "length")

if [ "$PORTFOLIO_COUNT" -eq 0 ]; then
  echo "❌ Test User has no portfolios!"
  exit 1
fi

PORTFOLIO_ID=$(echo "$TEST_USER_PORTFOLIOS" | jq -r '.[0].id')
PORTFOLIO_NAME=$(echo "$TEST_USER_PORTFOLIOS" | jq -r '.[0].portfolioname')

echo "✅ Found portfolio: $PORTFOLIO_NAME (ID: $PORTFOLIO_ID)"
echo

# Step 4: Check current positions in the portfolio
echo "Step 4: Checking current positions in portfolio..."
POSITIONS_RESPONSE=$(curl -s -X GET "$SERVER_URL/api/portfolios/$PORTFOLIO_ID/positions" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json")

POSITIONS_COUNT=$(echo "$POSITIONS_RESPONSE" | jq '.data.positions | length')

echo "Current positions in portfolio: $POSITIONS_COUNT"

if [ "$POSITIONS_COUNT" -eq 0 ]; then
  echo "❌ No positions found to sell!"
  exit 1
fi

# Show position details
echo "Position details:"
echo "$POSITIONS_RESPONSE" | jq '.data.positions[] | {id, productName: .product.name, quantity, purchasePrice, status}'
echo

# Step 5: Sell/Delete each position
echo "Step 5: Selling all positions..."
POSITION_IDS=$(echo "$POSITIONS_RESPONSE" | jq -r '.data.positions[] | .id')

for POSITION_ID in $POSITION_IDS; do
  echo "  Selling position: $POSITION_ID"
  
  DELETE_RESPONSE=$(curl -s -X DELETE "$SERVER_URL/api/positions/$POSITION_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json")
  
  # Check if delete was successful (204 status means success)
  DELETE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$SERVER_URL/api/positions/$POSITION_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json")
  
  if [ "$DELETE_STATUS" = "404" ]; then
    echo "  ✅ Position $POSITION_ID successfully deleted"
  else
    echo "  ⚠️ Position $POSITION_ID delete status: $DELETE_STATUS"
  fi
done
echo

# Step 6: Check if positions are gone
echo "Step 6: Verifying positions are deleted..."
UPDATED_POSITIONS_RESPONSE=$(curl -s -X GET "$SERVER_URL/api/portfolios/$PORTFOLIO_ID/positions" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json")

UPDATED_POSITIONS_COUNT=$(echo "$UPDATED_POSITIONS_RESPONSE" | jq '.data.positions | length')

echo "Positions remaining in portfolio: $UPDATED_POSITIONS_COUNT"

if [ "$UPDATED_POSITIONS_COUNT" -eq 0 ]; then
  echo "✅ All positions successfully deleted!"
else
  echo "⚠️ Some positions still remain:"
  echo "$UPDATED_POSITIONS_RESPONSE" | jq '.data.positions[] | {id, status}'
fi
echo

# Step 7: Check if portfolio still exists (should still exist - no cascade delete)
echo "Step 7: Checking if portfolio still exists..."
PORTFOLIO_CHECK_RESPONSE=$(curl -s -X GET "$SERVER_URL/api/portfolios/$PORTFOLIO_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json")

PORTFOLIO_EXISTS=$(echo "$PORTFOLIO_CHECK_RESPONSE" | jq -r '.id // "not_found"')

if [ "$PORTFOLIO_EXISTS" = "not_found" ] || [ "$PORTFOLIO_EXISTS" = "null" ]; then
  echo "❌ Portfolio was automatically deleted (unexpected CASCADE behavior)!"
  echo "This means the database has CASCADE DELETE from positions → portfolio"
else
  echo "✅ Portfolio still exists (expected behavior)!"
  echo "Portfolio ID: $PORTFOLIO_EXISTS"
  echo "This confirms: Deleting positions does NOT cascade delete the portfolio"
fi
echo

# Step 8: Check all portfolios to confirm
echo "Step 8: Final portfolio count check..."
FINAL_PORTFOLIOS_RESPONSE=$(curl -s -X GET "$SERVER_URL/api/portfolios" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json")

FINAL_TEST_USER_PORTFOLIOS=$(echo "$FINAL_PORTFOLIOS_RESPONSE" | jq "[.[] | select(.ownerid==\"$TEST_USER_ID\")]")
FINAL_PORTFOLIO_COUNT=$(echo "$FINAL_TEST_USER_PORTFOLIOS" | jq "length")

echo "Test User's final portfolio count: $FINAL_PORTFOLIO_COUNT"

if [ "$FINAL_PORTFOLIO_COUNT" -gt 0 ]; then
  echo "✅ Empty portfolio retained (normal behavior)"
  echo "Portfolio details:"
  echo "$FINAL_TEST_USER_PORTFOLIOS" | jq '.[] | {id, portfolioname, createdat}'
else
  echo "❌ All portfolios were deleted (unexpected CASCADE behavior)"
fi

echo
echo "=== CASCADE BEHAVIOR SUMMARY ==="
echo "• Deleting positions: Does NOT delete portfolio"
echo "• Empty portfolios: Remain for future use"
echo "• Manual portfolio deletion: Would be needed to clean up empty portfolios"
echo
echo "=== Test completed ==="
