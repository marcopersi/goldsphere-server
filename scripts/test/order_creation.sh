#!/bin/bash

# Test script for the corrected Order API
# This demonstrates the proper frontend-minimal/backend-enriched pattern

# Source credentials helper
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$SCRIPT_DIR/credentials.sh"

echo "=== Testing Corrected Order API ==="
echo ""

# Test server connection
if ! test_server_connection; then
    exit 1
fi

# First, get the auth token using bank technical user
echo "1. Getting authentication token for bank technical user..."

LOGIN_RESPONSE=$(curl -s -X POST "${SERVER_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$BANK_EMAIL\",
    \"password\": \"$BANK_PASSWORD\"
  }")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Failed to get authentication token"
  echo "Response: $LOGIN_RESPONSE"
  echo ""
  echo "Please ensure:"
  echo "- Server is running on port 8888"
  echo "- Bank technical user exists ($BANK_EMAIL)"
  echo "- Database is initialized with correct password"
  echo "- See CREDENTIALS.md for current passwords"
  exit 1
fi

echo "✅ Authentication successful for $BANK_EMAIL"
echo ""

# Get a test product ID
echo "2. Getting available products..."

PRODUCTS_RESPONSE=$(curl -s -X GET "${SERVER_URL}/api/products?limit=1" \
  -H "Authorization: Bearer $TOKEN")

PRODUCT_ID=$(echo $PRODUCTS_RESPONSE | jq -r '.data.items[0].id // empty')

if [ -z "$PRODUCT_ID" ] || [ "$PRODUCT_ID" = "null" ]; then
  echo "❌ No products available for testing"
  echo "Response: $PRODUCTS_RESPONSE"
  exit 1
fi

PRODUCT_NAME=$(echo $PRODUCTS_RESPONSE | jq -r '.data.items[0].name // "Unknown Product"')
echo "✅ Found test product: $PRODUCT_NAME (ID: $PRODUCT_ID)"
echo ""

echo "3. Creating order with MINIMAL frontend request..."
echo ""

# This is the NEW pattern - frontend sends minimal data (no userId - extracted from JWT)
MINIMAL_ORDER_REQUEST='{
  "type": "buy",
  "currency": "CHF",
  "source": "web",
  "items": [
    {
      "productId": "'$PRODUCT_ID'",
      "quantity": 2
    }
  ],
  "notes": "Test order created with corrected API pattern - userId extracted from JWT"
}'

echo "Minimal request payload:"
echo "$MINIMAL_ORDER_REQUEST" | jq '.'
echo ""

ORDER_RESPONSE=$(curl -s -X POST "${SERVER_URL}/api/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$MINIMAL_ORDER_REQUEST")

echo "4. Backend response (enriched order):"
echo ""

if echo "$ORDER_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  echo "✅ Order created successfully!"
  echo ""
  
  # Show the enrichment
  echo "📊 Backend enrichments:"
  echo "  - Order ID: $(echo $ORDER_RESPONSE | jq -r '.data.id')"
  echo "  - Order Number: $(echo $ORDER_RESPONSE | jq -r '.data.orderNumber')"
  echo "  - Product Name: $(echo $ORDER_RESPONSE | jq -r '.data.items[0].productName')"
  echo "  - Unit Price: $(echo $ORDER_RESPONSE | jq -r '.data.currency') $(echo $ORDER_RESPONSE | jq -r '.data.items[0].unitPrice')"
  echo "  - Total Price: $(echo $ORDER_RESPONSE | jq -r '.data.currency') $(echo $ORDER_RESPONSE | jq -r '.data.items[0].totalPrice')"
  echo "  - Subtotal: $(echo $ORDER_RESPONSE | jq -r '.data.currency') $(echo $ORDER_RESPONSE | jq -r '.data.subtotal')"
  echo "  - Taxes: $(echo $ORDER_RESPONSE | jq -r '.data.currency') $(echo $ORDER_RESPONSE | jq -r '.data.taxes')"
  echo "  - Total Amount: $(echo $ORDER_RESPONSE | jq -r '.data.currency') $(echo $ORDER_RESPONSE | jq -r '.data.totalAmount')"
  echo "  - Status: $(echo $ORDER_RESPONSE | jq -r '.data.status')"
  echo "  - Created At: $(echo $ORDER_RESPONSE | jq -r '.data.createdAt')"
  echo ""
  
  echo "📝 Message from backend:"
  echo "  $(echo $ORDER_RESPONSE | jq -r '.message')"
  echo ""
  
  echo "📋 Full enriched order response:"
  echo "$ORDER_RESPONSE" | jq '.data'
  echo ""
  
  # Store order ID for potential follow-up tests
  ORDER_ID=$(echo $ORDER_RESPONSE | jq -r '.data.id')
  echo "💾 Order ID for reference: $ORDER_ID"
  
else
  echo "❌ Order creation failed!"
  echo "$ORDER_RESPONSE" | jq '.'
  exit 1
fi

echo ""
echo "=== Test Summary ==="
echo "✅ Demonstrated corrected order API pattern:"
echo "  1. Frontend sent minimal request (type, currency, source, items)"
echo "  2. Backend enriched with product details, prices, and calculations"
echo "  3. Backend generated IDs, order number, timestamps, and business logic"
echo "  4. Response contains complete order object for frontend use"
echo ""
echo "This pattern follows @marcopersi/shared package expectations and"
echo "ensures proper separation of concerns between frontend and backend."
echo ""
echo "Note: After changing OrdersCreateInput interface, run:"
echo "  npx tsoa spec-and-routes && npm run build"
