#!/bin/bash

# Test script for portfolio auto-creation when processing orders
# Tests the logic where a user without a portfolio gets one created when order reaches "shipped"

SERVER_URL="http://localhost:8888"
ADMIN_EMAIL="admin@goldsphere.vault"
ADMIN_PASSWORD="admin123"

echo "=== Testing Portfolio Auto-Creation for Orders ==="
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

# Step 2: Get Test User ID (user without portfolio)
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

# Step 3: Check if Test User has a portfolio (should be none)
echo "Step 3: Checking if Test User has existing portfolios..."
EXISTING_PORTFOLIOS=$(curl -s -X GET "$SERVER_URL/api/portfolios" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json")

TEST_USER_PORTFOLIO_COUNT=$(echo "$EXISTING_PORTFOLIOS" | jq "[.[] | select(.ownerid==\"$TEST_USER_ID\")] | length")

echo "Existing portfolios for Test User: $TEST_USER_PORTFOLIO_COUNT"
echo

# Step 4: Get a product to order
echo "Step 4: Getting a product to order..."
PRODUCTS_RESPONSE=$(curl -s -X GET "$SERVER_URL/api/products" \
  -H "Content-Type: application/json")

PRODUCT_ID=$(echo "$PRODUCTS_RESPONSE" | jq -r '.data.products[0].id')
PRODUCT_NAME=$(echo "$PRODUCTS_RESPONSE" | jq -r '.data.products[0].name')
PRODUCT_PRICE=$(echo "$PRODUCTS_RESPONSE" | jq -r '.data.products[0].price')

if [ -z "$PRODUCT_ID" ] || [ "$PRODUCT_ID" = "null" ]; then
  echo "❌ No products found!"
  exit 1
fi

echo "✅ Using product: $PRODUCT_NAME (ID: $PRODUCT_ID, Price: $PRODUCT_PRICE)"
echo

# Step 5: Create an order for the Test User
echo "Step 5: Creating order for Test User..."
ORDER_QUANTITY=2
TOTAL_PRICE=$(echo "$PRODUCT_PRICE * $ORDER_QUANTITY" | bc -l)

CREATE_ORDER_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/orders" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$TEST_USER_ID\",
    \"type\": \"buy\",
    \"status\": \"pending\",
    \"items\": [{
      \"productId\": \"$PRODUCT_ID\",
      \"productName\": \"$PRODUCT_NAME\",
      \"quantity\": $ORDER_QUANTITY,
      \"unitPrice\": $PRODUCT_PRICE,
      \"totalPrice\": $TOTAL_PRICE,
      \"specifications\": {}
    }],
    \"subtotal\": $TOTAL_PRICE,
    \"fees\": 0,
    \"taxes\": 0,
    \"totalAmount\": $TOTAL_PRICE,
    \"currency\": \"USD\",
    \"shippingAddress\": {
      \"street\": \"123 Test St\",
      \"city\": \"Test City\",
      \"state\": \"TS\",
      \"zipCode\": \"12345\",
      \"country\": \"US\"
    },
    \"paymentMethod\": {
      \"type\": \"card\"
    },
    \"tracking\": null,
    \"notes\": \"Test order for portfolio auto-creation\"
  }")

ORDER_ID=$(echo "$CREATE_ORDER_RESPONSE" | jq -r '.[0].id')

if [ -z "$ORDER_ID" ] || [ "$ORDER_ID" = "null" ]; then
  echo "❌ Failed to create order!"
  echo "Response: $CREATE_ORDER_RESPONSE"
  exit 1
fi

echo "✅ Created order ID: $ORDER_ID"
echo "Order details: $ORDER_QUANTITY x $PRODUCT_NAME = \$$TOTAL_PRICE"
echo

# Step 6: Process order through statuses until "shipped"
echo "Step 6: Processing order to 'shipped' status..."

# pending -> processing
echo "  Processing: pending -> processing..."
PROCESS_1=$(curl -s -X PUT "$SERVER_URL/api/orders/process/$ORDER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json")
echo "  Status: $(echo "$PROCESS_1" | jq -r '.orderstatus')"

# processing -> shipped (this should trigger portfolio and position creation)
echo "  Processing: processing -> shipped..."
PROCESS_2=$(curl -s -X PUT "$SERVER_URL/api/orders/process/$ORDER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json")
echo "  Status: $(echo "$PROCESS_2" | jq -r '.orderstatus')"
echo

# Step 7: Check if portfolio was created
echo "Step 7: Checking if portfolio was auto-created..."
NEW_PORTFOLIOS=$(curl -s -X GET "$SERVER_URL/api/portfolios" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json")

NEW_TEST_USER_PORTFOLIOS=$(echo "$NEW_PORTFOLIOS" | jq "[.[] | select(.ownerid==\"$TEST_USER_ID\")]")
NEW_PORTFOLIO_COUNT=$(echo "$NEW_TEST_USER_PORTFOLIOS" | jq "length")

if [ "$NEW_PORTFOLIO_COUNT" -gt "$TEST_USER_PORTFOLIO_COUNT" ]; then
  PORTFOLIO_ID=$(echo "$NEW_TEST_USER_PORTFOLIOS" | jq -r '.[0].id')
  PORTFOLIO_NAME=$(echo "$NEW_TEST_USER_PORTFOLIOS" | jq -r '.[0].portfolioname')
  echo "✅ Portfolio auto-created!"
  echo "Portfolio ID: $PORTFOLIO_ID"
  echo "Portfolio Name: $PORTFOLIO_NAME"
else
  echo "❌ Portfolio was NOT created!"
  echo "Portfolio count before: $TEST_USER_PORTFOLIO_COUNT"
  echo "Portfolio count after: $NEW_PORTFOLIO_COUNT"
fi
echo

# Step 8: Check if position was created
echo "Step 8: Checking if position was created..."
if [ -n "$PORTFOLIO_ID" ]; then
  POSITIONS_RESPONSE=$(curl -s -X GET "$SERVER_URL/api/portfolios/$PORTFOLIO_ID/positions" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json")
  
  POSITION_COUNT=$(echo "$POSITIONS_RESPONSE" | jq '.data.positions | length')
  
  if [ "$POSITION_COUNT" -gt 0 ]; then
    echo "✅ Position created!"
    echo "Positions in portfolio: $POSITION_COUNT"
    echo "Position details:"
    echo "$POSITIONS_RESPONSE" | jq '.data.positions[0] | {id, productId, quantity, purchasePrice, notes: "Position created from shipped order"}'
  else
    echo "❌ No positions found in the new portfolio!"
  fi
else
  echo "❌ Cannot check positions - no portfolio was created"
fi

echo
echo "=== Test completed ==="
