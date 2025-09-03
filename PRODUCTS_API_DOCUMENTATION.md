# Products & Producers API Documentation

## Overview
The Products & Producers APIs provide comprehensive CRUD operations for managing precious metals products and their producers/mints. All endpoints return JSON responses with consistent formatting.

**Base URL:** `http://localhost:8888/api`

## Authentication
Most endpoints require JWT authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

# PRODUCTS API

## Products Endpoints Overview

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/products` | No | List all products with filtering and pagination |
| POST | `/products` | No | Create a new product |
| GET | `/products/:id` | No | Get a specific product by ID |
| PUT | `/products/:id` | No | Update a product |
| DELETE | `/products/:id` | No | Delete a product |
| POST | `/products/validate` | No | Validate product data without creating |
| GET | `/products/price/:id` | No | Get price information for a product |
| POST | `/products/prices` | No | Get bulk price information for multiple products |

### Important: Enhanced Response Format

All Products API endpoints return enhanced response objects that include:

- **Producer Information**: Both `producerId` (UUID for linking) and `producer` (human-readable name)
- **Metal Information**: Nested object with `id`, `name`, and `symbol` 
- **Type Information**: Human-readable product type name (e.g., "Coin", "Bar")
- **Country**: ISO 2-letter country code in lowercase (e.g., "ch", "us")

This allows your frontend to display rich information while maintaining the ability to make API calls using the IDs.

**Example Producer Data:**
```json
{
  "producerId": "b5805e13-53b8-452c-85b3-fd318fe3b5a0",
  "producer": "Argor-Heraeus"
}
```

The `producerId` can be used with the Producers API endpoints to get detailed producer information or update producer data.

---

## 1. List Products with Filtering and Pagination

### GET `/products`

Retrieve a paginated list of products with optional filtering and sorting.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number (minimum 1) |
| `limit` | number | 20 | Items per page (1-100) |
| `search` | string | - | Search in product names |
| `metal` | string | - | Filter by metal type |
| `type` | string | - | Filter by product type |
| `producer` | string | - | Filter by producer |
| `country` | string | - | Filter by issuing country |
| `inStock` | boolean | - | Filter by stock status |
| `minPrice` | number | - | Minimum price filter |
| `maxPrice` | number | - | Maximum price filter |
| `sortBy` | enum | `createdAt` | Sort field: `name`, `price`, `createdAt`, `updatedAt` |
| `sortOrder` | enum | `desc` | Sort order: `asc`, `desc` |

#### Sample Request

```bash
# Basic request
curl -X GET "http://localhost:8888/api/products" \
  -H "Content-Type: application/json"

# With filtering and pagination
curl -X GET "http://localhost:8888/api/products?page=1&limit=10&metal=gold&inStock=true&sortBy=price&sortOrder=asc" \
  -H "Content-Type: application/json"

# With search and price range
curl -X GET "http://localhost:8888/api/products?search=coin&minPrice=1000&maxPrice=3000" \
  -H "Content-Type: application/json"
```

#### Sample Response

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "name": "Swiss Gold Vreneli 20 Francs",
        "type": "Coin",
        "metal": {
          "id": "789e0123-e89b-12d3-a456-426614174002",
          "name": "Gold",
          "symbol": "AU"
        },
        "weight": 6.4516,
        "weightUnit": "grams",
        "purity": 0.9000,
        "price": 2450.00,
        "currency": "CHF",
        "producerId": "abc1234-e89b-12d3-a456-426614174003",
        "producer": "Swiss Mint",
        "country": "ch",
        "year": 1935,
        "description": "Historic Swiss gold coin in excellent condition",
        "imageUrl": "",
        "inStock": true,
        "minimumOrderQuantity": 1,
        "createdAt": "2024-09-03T10:00:00.000Z",
        "updatedAt": "2024-09-03T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## 2. Create Product

### POST `/products`

Create a new precious metals product.

#### Request Body

```json
{
  "productName": "Swiss Gold Vreneli 20 Francs",
  "productTypeId": "456e7890-e89b-12d3-a456-426614174001",
  "metalId": "789e0123-e89b-12d3-a456-426614174002",
  "producerId": "abc1234-e89b-12d3-a456-426614174003",
  "issuingCountryId": "def5678-e89b-12d3-a456-426614174004",
  "fineWeight": 6.4516,
  "unitOfMeasure": "grams",
  "purity": 0.9000,
  "price": 2450.00,
  "currency": "CHF",
  "productYear": 1935,
  "description": "Historic Swiss gold coin in excellent condition",
  "imageFilename": "vreneli-1935.jpg",
  "inStock": true,
  "stockQuantity": 15,
  "minimumOrderQuantity": 1,
  "premiumPercentage": 12.5,
  "diameter": 21.0,
  "thickness": 1.25,
  "mintage": 100000,
  "certification": "PCGS MS65"
}
```

#### Required Fields
- `productName` (string): Product name
- `productTypeId` (UUID): Reference to product type
- `metalId` (UUID): Reference to metal type
- `producerId` (UUID): Reference to producer/mint
- `fineWeight` (number): Weight in specified unit
- `unitOfMeasure` (string): Weight unit
- `price` (number): Price in specified currency

#### Sample Request

```bash
curl -X POST "http://localhost:8888/api/products" \
  -H "Content-Type: application/json" \
  -d '{
    "productName": "Swiss Gold Vreneli 20 Francs",
    "productTypeId": "456e7890-e89b-12d3-a456-426614174001",
    "metalId": "789e0123-e89b-12d3-a456-426614174002",
    "producerId": "abc1234-e89b-12d3-a456-426614174003",
    "issuingCountryId": "def5678-e89b-12d3-a456-426614174004",
    "fineWeight": 6.4516,
    "unitOfMeasure": "grams",
    "purity": 0.9000,
    "price": 2450.00,
    "currency": "CHF",
    "productYear": 1935,
    "description": "Historic Swiss gold coin in excellent condition",
    "inStock": true,
    "stockQuantity": 15,
    "minimumOrderQuantity": 1
  }'
```

#### Sample Response

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Swiss Gold Vreneli 20 Francs",
    "type": "Coin",
    "metal": {
      "id": "789e0123-e89b-12d3-a456-426614174002",
      "name": "Gold",
      "symbol": "AU"
    },
    "weight": 6.4516,
    "weightUnit": "grams",
    "purity": 0.9000,
    "price": 2450.00,
    "currency": "CHF",
    "producerId": "abc1234-e89b-12d3-a456-426614174003",
    "producer": "Swiss Mint",
    "country": "ch",
    "year": 1935,
    "description": "Historic Swiss gold coin in excellent condition",
    "inStock": true,
    "minimumOrderQuantity": 1,
    "createdAt": "2024-09-03T10:00:00.000Z",
    "updatedAt": "2024-09-03T10:00:00.000Z"
  },
  "message": "Product created successfully"
}
```

---

## 3. Get Product by ID

### GET `/products/:id`

Retrieve detailed information for a specific product.

#### Path Parameters
- `id` (UUID): Product ID

#### Sample Request

```bash
curl -X GET "http://localhost:8888/api/products/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json"
```

#### Sample Response

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Swiss Gold Vreneli 20 Francs",
    "type": "Coin",
    "metal": {
      "id": "789e0123-e89b-12d3-a456-426614174002",
      "name": "Gold",
      "symbol": "AU"
    },
    "weight": 6.4516,
    "weightUnit": "grams",
    "purity": 0.9000,
    "price": 2450.00,
    "currency": "CHF",
    "producerId": "abc1234-e89b-12d3-a456-426614174003",
    "producer": "Swiss Mint",
    "country": "ch",
    "year": 1935,
    "description": "Historic Swiss gold coin in excellent condition",
    "imageUrl": "",
    "inStock": true,
    "stockQuantity": 15,
    "minimumOrderQuantity": 1,
    "premiumPercentage": 12.5,
    "diameter": 21.0,
    "thickness": 1.25,
    "mintage": 100000,
    "certification": "PCGS MS65",
    "createdAt": "2024-09-03T10:00:00.000Z",
    "updatedAt": "2024-09-03T10:00:00.000Z"
  }
}
```

---

## 4. Update Product

### PUT `/products/:id`

Update an existing product. Supports partial updates.

#### Path Parameters
- `id` (UUID): Product ID

#### Request Body
Same structure as create, but all fields are optional for partial updates.

#### Sample Request

```bash
curl -X PUT "http://localhost:8888/api/products/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 2500.00,
    "stockQuantity": 12,
    "description": "Historic Swiss gold coin in excellent condition - Updated description"
  }'
```

#### Sample Response

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Swiss Gold Vreneli 20 Francs",
    "price": 2500.00,
    "stockQuantity": 12,
    "description": "Historic Swiss gold coin in excellent condition - Updated description",
    "updatedAt": "2024-09-03T11:30:00.000Z"
  },
  "message": "Product updated successfully"
}
```

---

## 5. Delete Product

### DELETE `/products/:id`

Delete a product. Returns an error if the product has existing orders.

#### Path Parameters
- `id` (UUID): Product ID

#### Sample Request

```bash
curl -X DELETE "http://localhost:8888/api/products/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json"
```

#### Sample Response

```json
{
  "success": true,
  "message": "Product 'Swiss Gold Vreneli 20 Francs' deleted successfully"
}
```

#### Error Response (Product has orders)

```json
{
  "success": false,
  "error": "Cannot delete product with existing orders"
}
```

---

## 6. Validate Product Data

### POST `/products/validate`

Validate product data without creating the product. Useful for form validation.

#### Request Body
Same structure as create product.

#### Sample Request

```bash
curl -X POST "http://localhost:8888/api/products/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "productName": "Test Product",
    "productTypeId": "456e7890-e89b-12d3-a456-426614174001",
    "metalId": "789e0123-e89b-12d3-a456-426614174002",
    "producerId": "abc1234-e89b-12d3-a456-426614174003",
    "fineWeight": 31.1035,
    "unitOfMeasure": "grams",
    "price": 2000.00,
    "currency": "CHF"
  }'
```

#### Sample Response (Valid)

```json
{
  "success": true,
  "message": "Product data is valid",
  "validatedData": {
    "productName": "Test Product",
    "productTypeId": "456e7890-e89b-12d3-a456-426614174001",
    "metalId": "789e0123-e89b-12d3-a456-426614174002",
    "producerId": "abc1234-e89b-12d3-a456-426614174003",
    "fineWeight": 31.1035,
    "unitOfMeasure": "grams",
    "price": 2000.00,
    "currency": "CHF",
    "purity": 0.999,
    "inStock": true,
    "stockQuantity": 0,
    "minimumOrderQuantity": 1
  }
}
```

#### Sample Response (Invalid)

```json
{
  "success": false,
  "error": "Invalid product data",
  "details": [
    {
      "code": "too_small",
      "minimum": 1,
      "type": "string",
      "inclusive": true,
      "exact": false,
      "message": "Product name is required",
      "path": ["productName"]
    }
  ]
}
```

---

## 7. Get Product Price Information

### GET `/products/price/:id`

Get price and availability information for a specific product.

#### Path Parameters
- `id` (UUID): Product ID

#### Sample Request

```bash
curl -X GET "http://localhost:8888/api/products/price/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json"
```

#### Sample Response

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "price": 2450.00,
    "currency": "CHF",
    "inStock": true,
    "stockQuantity": 15,
    "minimumOrderQuantity": 1,
    "premiumPercentage": 12.5
  }
}
```

---

## 8. Bulk Product Prices

### POST `/products/prices`

Get price information for multiple products in a single request.

#### Request Body

```json
{
  "productIds": [
    "123e4567-e89b-12d3-a456-426614174000",
    "456e7890-e89b-12d3-a456-426614174001",
    "789e0123-e89b-12d3-a456-426614174002"
  ]
}
```

#### Sample Request

```bash
curl -X POST "http://localhost:8888/api/products/prices" \
  -H "Content-Type: application/json" \
  -d '{
    "productIds": [
      "123e4567-e89b-12d3-a456-426614174000",
      "456e7890-e89b-12d3-a456-426614174001"
    ]
  }'
```

#### Sample Response

```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "price": 2450.00,
      "currency": "CHF"
    },
    {
      "id": "456e7890-e89b-12d3-a456-426614174001",
      "price": 850.00,
      "currency": "USD"
    }
  ]
}
```

---

## Error Responses

All endpoints return consistent error responses:

### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid product ID format"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Product not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": "Cannot delete product with existing orders"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to create product",
  "details": "Database connection failed"
}
```

---

## Data Types and Validation

### Product Schema

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| productName | string | Yes | Min 1 character |
| productTypeId | UUID | Yes | Must exist in database |
| metalId | UUID | Yes | Must exist in database |
| producerId | UUID | Yes | Must exist in database |
| issuingCountryId | UUID | No | Must exist if provided |
| fineWeight | number | Yes | Must be positive |
| unitOfMeasure | string | Yes | Min 1 character |
| purity | number | No | 0-1 range, default 0.999 |
| price | number | Yes | Must be non-negative |
| currency | string | No | 3 characters, default varies |
| productYear | number | No | 1000 to current year + 1 |
| description | string | No | Any length |
| imageFilename | string | No | Filename only |
| inStock | boolean | No | Default true |
| stockQuantity | number | No | Min 0, default 0 |
| minimumOrderQuantity | number | No | Min 1, default 1 |
| premiumPercentage | number | No | Min 0 |
| diameter | number | No | Must be positive |
| thickness | number | No | Must be positive |
| mintage | number | No | Must be positive |
| certification | string | No | Any text |

### Supported Values

#### Unit of Measure
- `grams`
- `troy_ounces` 
- `kilograms`
- Custom values accepted

#### Currencies
- `USD` (US Dollar)
- `EUR` (Euro)
- `GBP` (British Pound)
- `CHF` (Swiss Franc)
- `CAD` (Canadian Dollar)
- `AUD` (Australian Dollar)

---

## JavaScript/TypeScript Example

```typescript
class ProductsAPI {
  private baseUrl = 'http://localhost:8888/api';
  
  async getProducts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    metal?: string;
    inStock?: boolean;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: 'name' | 'price' | 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const url = `${this.baseUrl}/products${queryParams.toString() ? '?' + queryParams : ''}`;
    const response = await fetch(url);
    return response.json();
  }
  
  async createProduct(productData: {
    productName: string;
    productTypeId: string;
    metalId: string;
    producerId: string;
    fineWeight: number;
    unitOfMeasure: string;
    price: number;
    // ... other optional fields
  }) {
    const response = await fetch(`${this.baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData),
    });
    return response.json();
  }
  
  async getProductById(id: string) {
    const response = await fetch(`${this.baseUrl}/products/${id}`);
    return response.json();
  }
  
  async updateProduct(id: string, updates: Partial<any>) {
    const response = await fetch(`${this.baseUrl}/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    return response.json();
  }
  
  async deleteProduct(id: string) {
    const response = await fetch(`${this.baseUrl}/products/${id}`, {
      method: 'DELETE',
    });
    return response.json();
  }
  
  async validateProduct(productData: any) {
    const response = await fetch(`${this.baseUrl}/products/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData),
    });
    return response.json();
  }
  
  async getProductPrice(id: string) {
    const response = await fetch(`${this.baseUrl}/products/price/${id}`);
    return response.json();
  }
  
  async getBulkPrices(productIds: string[]) {
    const response = await fetch(`${this.baseUrl}/products/prices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ productIds }),
    });
    return response.json();
  }
}

// Usage example
const api = new ProductsAPI();

// Get products with filtering
const products = await api.getProducts({
  page: 1,
  limit: 20,
  metal: 'gold',
  inStock: true,
  sortBy: 'price',
  sortOrder: 'asc'
});

// Create a new product
const newProduct = await api.createProduct({
  productName: 'American Gold Eagle 1 oz',
  productTypeId: '456e7890-e89b-12d3-a456-426614174001',
  metalId: '789e0123-e89b-12d3-a456-426614174002',
  producerId: 'abc1234-e89b-12d3-a456-426614174003',
  fineWeight: 31.1035,
  unitOfMeasure: 'grams',
  price: 2100.00,
  currency: 'USD'
});
```

---

## Notes for Frontend Implementation

1. **Error Handling**: All endpoints return consistent error formats with `success: false` and descriptive error messages.

2. **Validation**: Use the `/products/validate` endpoint for real-time form validation before submission.

3. **Pagination**: The list endpoint supports pagination with `hasNext`/`hasPrev` indicators for easy UI implementation.

4. **Filtering**: Multiple filter options are available and can be combined for complex queries.

5. **UUID Format**: All IDs are UUIDs. Invalid UUID formats will return 400 errors.

6. **Optional Fields**: Many fields have sensible defaults and are optional during creation.

7. **Bulk Operations**: Use the bulk prices endpoint to efficiently get pricing for multiple products (e.g., shopping cart scenarios).

8. **No Authentication Required**: Currently, all product endpoints are public and don't require authentication tokens.

---

**Last Updated:** September 3, 2025  
**API Version:** 1.0  
**Server:** goldsphere-server

---

# PRODUCERS API

## Producers Endpoints Overview

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/producers` | No | List all producers/mints with filtering and pagination |
| POST | `/producers` | No | Create a new producer |
| GET | `/producers/:id` | No | Get a specific producer by ID |
| PUT | `/producers/:id` | No | Update a producer |
| DELETE | `/producers/:id` | No | Delete a producer |

---

## 1. List Producers with Filtering and Pagination

### GET `/producers`

Retrieve a paginated list of precious metals producers/mints.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number (minimum 1) |
| `limit` | number | 20 | Items per page (1-100) |
| `search` | string | - | Search in producer names |
| `sortBy` | enum | `name` | Sort field: `name`, `createdAt`, `updatedAt` |
| `sortOrder` | enum | `asc` | Sort order: `asc`, `desc` |

#### Sample Request

```bash
# Basic request
curl -X GET "http://localhost:8888/api/producers" \
  -H "Content-Type: application/json"

# With search and pagination
curl -X GET "http://localhost:8888/api/producers?page=1&limit=10&search=royal&sortBy=name&sortOrder=asc" \
  -H "Content-Type: application/json"
```

#### Sample Response

```json
{
  "success": true,
  "data": {
    "producers": [
      {
        "id": "58a3cd62-a2f6-42f6-b02f-21b5f625d32e",
        "producerName": "British Royal Mint",
        "createdAt": "2025-08-29T17:26:03.661Z",
        "updatedAt": "2025-08-29T17:26:03.661Z"
      },
      {
        "id": "4702a243-4eb6-45f4-a969-3a3673d2fabd",
        "producerName": "Austrian Mint",
        "createdAt": "2025-08-29T17:26:03.661Z",
        "updatedAt": "2025-08-29T17:26:03.661Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 31,
      "totalPages": 2,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## 2. Create Producer

### POST `/producers`

Create a new precious metals producer/mint.

#### Request Body

```json
{
  "producerName": "New Mint Company"
}
```

#### Required Fields
- `producerName` (string): Producer/mint name (unique)

#### Sample Request

```bash
curl -X POST "http://localhost:8888/api/producers" \
  -H "Content-Type: application/json" \
  -d '{
    "producerName": "New Mint Company"
  }'
```

#### Sample Response

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "producerName": "New Mint Company",
    "createdAt": "2025-09-03T14:00:00.000Z",
    "updatedAt": "2025-09-03T14:00:00.000Z"
  },
  "message": "Producer created successfully"
}
```

---

## 3. Get Producer by ID

### GET `/producers/:id`

Retrieve detailed information for a specific producer.

#### Path Parameters
- `id` (UUID): Producer ID

#### Sample Request

```bash
curl -X GET "http://localhost:8888/api/producers/58a3cd62-a2f6-42f6-b02f-21b5f625d32e" \
  -H "Content-Type: application/json"
```

#### Sample Response

```json
{
  "success": true,
  "data": {
    "id": "58a3cd62-a2f6-42f6-b02f-21b5f625d32e",
    "producerName": "British Royal Mint",
    "createdAt": "2025-08-29T17:26:03.661Z",
    "updatedAt": "2025-08-29T17:26:03.661Z"
  }
}
```

---

## 4. Update Producer

### PUT `/producers/:id`

Update an existing producer's information.

#### Path Parameters
- `id` (UUID): Producer ID

#### Request Body

```json
{
  "producerName": "Updated Mint Name"
}
```

#### Sample Request

```bash
curl -X PUT "http://localhost:8888/api/producers/58a3cd62-a2f6-42f6-b02f-21b5f625d32e" \
  -H "Content-Type: application/json" \
  -d '{
    "producerName": "Updated Royal Mint"
  }'
```

#### Sample Response

```json
{
  "success": true,
  "data": {
    "id": "58a3cd62-a2f6-42f6-b02f-21b5f625d32e",
    "producerName": "Updated Royal Mint",
    "createdAt": "2025-08-29T17:26:03.661Z",
    "updatedAt": "2025-09-03T14:30:00.000Z"
  },
  "message": "Producer updated successfully"
}
```

---

## 5. Delete Producer

### DELETE `/producers/:id`

Delete a producer. Returns an error if products reference this producer.

#### Path Parameters
- `id` (UUID): Producer ID

#### Sample Request

```bash
curl -X DELETE "http://localhost:8888/api/producers/58a3cd62-a2f6-42f6-b02f-21b5f625d32e" \
  -H "Content-Type: application/json"
```

#### Sample Response

```json
{
  "success": true,
  "message": "Producer 'British Royal Mint' deleted successfully"
}
```

#### Error Response (Producer has products)

```json
{
  "success": false,
  "error": "Cannot delete producer with existing products"
}
```

---

## Product-Producer Relationship

Products are linked to producers via the `producerId` field in the product creation/update requests:

```json
{
  "productName": "Gold Britannia 1 oz",
  "producerId": "58a3cd62-a2f6-42f6-b02f-21b5f625d32e",
  "metalId": "789e0123-e89b-12d3-a456-426614174002",
  "productTypeId": "456e7890-e89b-12d3-a456-426614174001",
  "fineWeight": 31.1035,
  "unitOfMeasure": "grams",
  "price": 2100.00
}
```

The `producerId` must be a valid UUID from the producers table. You can:

1. **Get all producers** using `GET /producers`
2. **Create new producers** if needed using `POST /producers`  
3. **Link products to producers** using the `producerId` in product creation

---

## Producers API Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid producer ID format"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Producer not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": "Producer with this name already exists"
}
```

```json
{
  "success": false,
  "error": "Cannot delete producer with existing products"
}
```

---

## JavaScript/TypeScript Producers Example

```typescript
class ProducersAPI {
  private baseUrl = 'http://localhost:8888/api';
  
  async getProducers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: 'name' | 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const url = `${this.baseUrl}/producers${queryParams.toString() ? '?' + queryParams : ''}`;
    const response = await fetch(url);
    return response.json();
  }
  
  async createProducer(producerData: {
    producerName: string;
  }) {
    const response = await fetch(`${this.baseUrl}/producers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(producerData),
    });
    return response.json();
  }
  
  async getProducerById(id: string) {
    const response = await fetch(`${this.baseUrl}/producers/${id}`);
    return response.json();
  }
  
  async updateProducer(id: string, updates: { producerName?: string }) {
    const response = await fetch(`${this.baseUrl}/producers/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    return response.json();
  }
  
  async deleteProducer(id: string) {
    const response = await fetch(`${this.baseUrl}/producers/${id}`, {
      method: 'DELETE',
    });
    return response.json();
  }
}

// Usage example
const producersApi = new ProducersAPI();

// Get all producers
const producers = await producersApi.getProducers({
  page: 1,
  limit: 20,
  search: 'royal',
  sortBy: 'name',
  sortOrder: 'asc'
});

// Create a new producer
const newProducer = await producersApi.createProducer({
  producerName: 'Custom Mint Ltd.'
});

// Then use the producer ID in product creation
const productsApi = new ProductsAPI();
const newProduct = await productsApi.createProduct({
  productName: 'Custom Gold Coin',
  producerId: newProducer.data.id, // Link to the new producer
  metalId: '789e0123-e89b-12d3-a456-426614174002',
  productTypeId: '456e7890-e89b-12d3-a456-426614174001',
  fineWeight: 31.1035,
  unitOfMeasure: 'grams',
  price: 2200.00
});
```

---

## Complete Workflow Example

Here's how to work with both APIs together:

```bash
# 1. Get all available producers
curl -X GET "http://localhost:8888/api/producers" | jq '.data.producers[] | {id, producerName}'

# 2. Create a new producer if needed
curl -X POST "http://localhost:8888/api/producers" \
  -H "Content-Type: application/json" \
  -d '{"producerName": "New Custom Mint"}' | jq '.data.id'

# 3. Use the producer ID to create a product
curl -X POST "http://localhost:8888/api/products" \
  -H "Content-Type: application/json" \
  -d '{
    "productName": "Custom Gold Bar 100g",
    "producerId": "PRODUCER_ID_FROM_STEP_2",
    "metalId": "VALID_METAL_ID",
    "productTypeId": "VALID_PRODUCT_TYPE_ID",
    "fineWeight": 100.0,
    "unitOfMeasure": "grams",
    "price": 6500.00,
    "purity": 0.9999
  }'

# 4. Get products by a specific producer (filter in application logic)
curl -X GET "http://localhost:8888/api/products" | jq '.data.products[] | select(.producerId == "PRODUCER_ID")'
```

---

**Last Updated:** September 3, 2025  
**API Version:** 1.0  
**Server:** goldsphere-server
