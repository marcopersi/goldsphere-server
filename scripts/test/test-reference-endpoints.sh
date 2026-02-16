#!/bin/bash
# Reference Service API Endpoint Tests
# Tests für Metals, ProductTypes und Producers Endpoints

API_URL="http://localhost:8888/api"

echo "🧪 Reference Service API Tests"
echo "================================"
echo ""

# Test 1: GET /api/metals (list all)
echo "✅ Test 1: GET /api/metals (list all)"
curl -s "$API_URL/metals" | jq '{success, totalItems: .data.pagination.total, firstThree: .data.items[0:3] | map({id, name, symbol})}'
echo ""

# Test 2: GET /api/metals with pagination
echo "✅ Test 2: GET /api/metals?page=1&limit=2 (pagination)"
curl -s "$API_URL/metals?page=1&limit=2" | jq '{success, pagination: .data.pagination, items: .data.items | map(.name)}'
echo ""

# Test 3: GET /api/metals with search
echo "✅ Test 3: GET /api/metals?search=gold (search)"
curl -s "$API_URL/metals?search=gold" | jq '{success, matches: .data.items | length, items: .data.items | map(.name)}'
echo ""

# Test 4: GET /api/metals/:id (by ID)
echo "✅ Test 4: GET /api/metals/:id (get Gold by ID)"
GOLD_ID=$(curl -s "$API_URL/metals" | jq -r '.data.items[] | select(.name == "Gold") | .id')
curl -s "$API_URL/metals/$GOLD_ID" | jq '{success, metal: .data | {name, symbol}}'
echo ""

# Test 5: GET /api/metals/:id (404 case)
echo "✅ Test 5: GET /api/metals/:id (404 test)"
HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null "$API_URL/metals/00000000-0000-0000-0000-000000000000")
echo "HTTP Status: $HTTP_CODE (expected: 404)"
echo ""

# Test 6: GET /api/productTypes (list all)
echo "✅ Test 6: GET /api/productTypes (list all)"
curl -s "$API_URL/productTypes" | jq '{success, totalItems: .data.pagination.total, items: .data.items | map(.name)}'
echo ""

# Test 7: GET /api/productTypes/:id (by ID)
echo "✅ Test 7: GET /api/productTypes/:id (get Coin by ID)"
COIN_ID=$(curl -s "$API_URL/productTypes" | jq -r '.data.items[] | select(.name == "Coin") | .id')
curl -s "$API_URL/productTypes/$COIN_ID" | jq '{success, productType: .data.name}'
echo ""

# Test 8: GET /api/producers (list all)
echo "✅ Test 8: GET /api/producers (list first 5)"
curl -s "$API_URL/producers?limit=5" | jq '{success, totalItems: .data.pagination.total, pagination: .data.pagination}'
echo ""

# Test 9: GET /api/producers with search
echo "✅ Test 9: GET /api/producers?search=mint (search)"
curl -s "$API_URL/producers?search=mint&limit=3" | jq '{success, matches: .data.items | length}'
echo ""

# Test 10: GET /api/producers/:id (by ID)
echo "✅ Test 10: GET /api/producers/:id (get first producer)"
FIRST_PRODUCER_ID=$(curl -s "$API_URL/producers?limit=1" | jq -r '.data.items[0].id')
if [ "$FIRST_PRODUCER_ID" != "null" ]; then
  curl -s "$API_URL/producers/$FIRST_PRODUCER_ID" | jq '{success, producer: .data | {id, name}}'
else
  echo "No producers found in database"
fi
echo ""

echo "================================"
echo "✅ All tests completed!"
echo ""
echo "📚 Available Endpoints:"
echo "  GET /api/metals                - List all metals (pagination, search)"
echo "  GET /api/metals/:id            - Get metal by ID"
echo "  GET /api/productTypes          - List all product types (pagination, search)"
echo "  GET /api/productTypes/:id      - Get product type by ID"
echo "  GET /api/producers             - List all producers (pagination, search)"
echo "  GET /api/producers/:id         - Get producer by ID"
echo ""
