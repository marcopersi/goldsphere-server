#!/bin/bash

# Test script for the corrected Order API
# This demonstrates the proper frontend-minimal/backend-enriched pattern

echo "=== Testing Corrected Order API ==="
echo ""

BASE_URL="http://localhost:8888"

# First, get the auth token (assuming we have a test user)
echo "1. Getting authentication token..."

LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@goldsphere.vault",
    "password": "admin123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Failed to get authentication token"
  echo "Response: $LOGIN_RESPONSE"
  echo ""
  echo "Please ensure:"
  echo "- Server is running on port 8888"
  echo "- Test user exists (admin@goldsphere.vault)"
  echo "- Database is initialized"
  exit 1
fi

echo "✅ Authentication successful"
echo ""

# Get a test product ID
echo "2. Getting available products..."

PRODUCTS_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/products?limit=1" \
  -H "Authorization: Bearer $TOKEN")

PRODUCT_ID=$(echo $PRODUCTS_RESPONSE | jq -r '.data.products[0].id // empty')

if [ -z "$PRODUCT_ID" ] || [ "$PRODUCT_ID" = "null" ]; then
  echo "❌ No products available for testing"
  echo "Response: $PRODUCTS_RESPONSE"
  exit 1
fi

PRODUCT_NAME=$(echo $PRODUCTS_RESPONSE | jq -r '.data.products[0].name // "Unknown Product"')
echo "✅ Found test product: $PRODUCT_NAME (ID: $PRODUCT_ID)"
echo ""

echo "3. Creating order with MINIMAL frontend request..."
echo ""

# This is the NEW pattern - frontend sends minimal data (no userId - extracted from JWT)
MINIMAL_ORDER_REQUEST='{
  "type": "buy",
  "items": [
    {
      "productId": "'$PRODUCT_ID'",
      "quantity": 2
    }
  ],
  "shippingAddress": {
    "type": "shipping",
    "firstName": "John",
    "lastName": "Doe",
    "street": "123 Test St",
    "city": "Test City",
    "state": "CA",
    "zipCode": "12345",
    "country": "USA"
  },
  "paymentMethod": {
    "type": "card"
  },
  "notes": "Test order created with corrected API pattern - userId extracted from JWT"
}'

echo "Minimal request payload:"
echo "$MINIMAL_ORDER_REQUEST" | jq '.'
echo ""

ORDER_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/orders" \
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
  echo "  - Product Name: $(echo $ORDER_RESPONSE | jq -r '.data.items[0].productName')"
  echo "  - Unit Price: \$$(echo $ORDER_RESPONSE | jq -r '.data.items[0].unitPrice')"
  echo "  - Total Price: \$$(echo $ORDER_RESPONSE | jq -r '.data.items[0].totalPrice')"
  echo "  - Subtotal: \$$(echo $ORDER_RESPONSE | jq -r '.data.subtotal')"
  echo "  - Processing Fee: \$$(echo $ORDER_RESPONSE | jq -r '.data.fees.processing')"
  echo "  - Shipping Fee: \$$(echo $ORDER_RESPONSE | jq -r '.data.fees.shipping')"
  echo "  - Insurance Fee: \$$(echo $ORDER_RESPONSE | jq -r '.data.fees.insurance')"
  echo "  - Taxes: \$$(echo $ORDER_RESPONSE | jq -r '.data.taxes')"
  echo "  - Total Amount: \$$(echo $ORDER_RESPONSE | jq -r '.data.totalAmount')"
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
echo "  1. Frontend sent minimal request (type, items, shipping, payment)"
echo "  2. Backend enriched with product details, prices, and calculations"
echo "  3. Backend generated IDs, timestamps, and business logic"
echo "  4. Response contains complete order object for frontend use"
echo ""
echo "This pattern follows @marcopersi/shared package expectations and"
echo "ensures proper separation of concerns between frontend and backend."
