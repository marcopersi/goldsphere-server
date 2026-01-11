# GoldSphere API Integration Guide

**Version:** 1.0.0  
**Base URL:** `http://localhost:8888/api`  
**Documentation:** `http://localhost:8888/docs` (Swagger UI)  
**Target:** Frontend (React) & Mobile App Developers  
**Last Updated:** 2026-01-10

---

## 🔍 Frontend FAQ - Quick Answers to Critical Questions

### Q1: Filter mit UUIDs - Wie bekommen wir die IDs?

**Antwort: Option A - Reference Endpoints geben Objekte mit IDs zurück**

```bash
GET /api/references/metals
GET /api/references/productTypes
GET /api/references/currencies
```

**Response-Format:**

```json
{
  "success": true,
  "data": {
    "items": [
      {"id": "uuid-here", "name": "Gold", "createdAt": "...", "updatedAt": "..."},
      {"id": "uuid-here", "name": "Silver", "createdAt": "...", "updatedAt": "..."}
    ],
    "pagination": {...}
  }
}
```

**Dann Filter verwenden:**

```bash
GET /api/products?metalId=<uuid-from-references>&productTypeId=<uuid-from-references>
```

**Alternative: Sammeln aller Reference Data auf einmal:**

```bash
GET /api/references
```

Gibt zurück: metals, productTypes, countries, producers, currencies, custodians, paymentFrequencies, custodyServiceTypes **in einem Request**.

---

### Q2: Bilder - Gibt es einen GET-Endpoint?

**Antwort: JA! GET /api/products/:id/image ist implementiert**

```bash
GET /api/products/158115fe-44ef-4687-80e5-60501b1ae86b/image
```

**Response:** Binary image data (JPEG/PNG/GIF/WebP)

**Headers:**
```http
Content-Type: image/jpeg
Content-Disposition: inline; filename="gold-philharmonic.jpg"
Cache-Control: public, max-age=86400
```

**404 Response wenn kein Bild:**

```json
{
  "success": false,
  "error": "Product image not found"
}
```

**Product Response gibt dynamische URL zurück:**

```json
{
  "id": "158115fe-...",
  "name": "Gold Philharmonic",
  "imageUrl": "/api/products/158115fe-.../image",  // ← Dynamisch generiert
  ...
}
```

**Wenn kein Bild vorhanden:**

```json
{
  "imageUrl": null  // ← Nicht leerer String, sondern null!
}
```

**Frontend Verwendung:**

```jsx
<img src={product.imageUrl || '/placeholder.png'} alt={product.name} />
```

---

### Q3: Currencies - Wo ist der /api/references Endpoint?

**Antwort: /api/references ist implementiert (Zeile 115 in references.ts)**

```bash
GET /api/references
```

**Response-Struktur:**

```json
{
  "success": true,
  "data": {
    "metals": [
      {"symbol": "AU", "name": "Gold"},
      {"symbol": "AG", "name": "Silver"}
    ],
    "productTypes": [
      {"name": "BAR"},
      {"name": "COIN"}
    ],
    "countries": [
      {"code": "at", "name": "Austria"},
      {"code": "ch", "name": "Switzerland"}
    ],
    "producers": [
      {"id": "uuid", "name": "Argor-Heraeus"},
      {"id": "uuid", "name": "Austrian Mint"}
    ],
    "currencies": [
      {"id": "uuid", "isoCode2": "US", "isoCode3": "USD", "isoNumericCode": 840},
      {"id": "uuid", "isoCode2": "EU", "isoCode3": "EUR", "isoNumericCode": 978}
    ],
    "custodians": [...],
    "paymentFrequencies": [...],
    "custodyServiceTypes": [...]
  }
}
```

**Alternative - Separate Endpoints:**

```bash
GET /api/references/currencies  # Nur Currencies
GET /api/references/metals       # Nur Metals (mit UUIDs!)
GET /api/references/productTypes # Nur Product Types (mit UUIDs!)
```

---

### Q4: Producer vs. ProducerName Inkonsistenz

**Antwort: Products geben BEIDE zurück**

```json
{
  "producerId": "uuid-here",      // ← UUID für Relations/Filter
  "producer": "Austrian Mint"     // ← Display Name (String)
}
```

**Warum `producer` und nicht `producerName`?**

Historisch gewachsen. `producer` ist der String-Name für Display, `producerId` ist die UUID für Relations.

**Filter verwenden `producerId`:**

```bash
GET /api/products?producerId=<uuid>
```

**Producer ist DB-basiert (kein Enum)**, weil:
- 50+ Hersteller mit dynamischen Premium-Daten
- Häufige Ergänzungen neuer Hersteller
- Verschiedene Schreibweisen je nach Region

---

### Q5: Country als String oder Enum?

**Antwort: String mit ISO 3166-1 alpha-2 Code (lowercase)**

```json
{
  "country": "at"  // ← Lowercase ISO code (Austria)
}
```

**Erlaubte Werte:**

- `"at"` - Austria
- `"ch"` - Switzerland
- `"ca"` - Canada
- `"us"` - United States
- `"za"` - South Africa
- `"au"` - Australia
- `"uk"` - United Kingdom
- `null` - Wenn Land nicht relevant/bekannt

**Country ist DB-basiert (kein Enum)**, weil neue Länder hinzukommen können.

**Country Reference Data abrufen:**

```bash
GET /api/references
→ data.countries: [{code: "at", name: "Austria"}, ...]
```

---

### Q6: Pagination bei Metals/ProductTypes?

**Antwort: JA, Pagination ist vorhanden, aber statisch**

```json
{
  "pagination": {
    "page": 1,
    "limit": 4,      // ← Anzahl Items
    "total": 4,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  }
}
```

**Warum?** Einheitliches Response-Format über alle Endpoints.

**Sind Metals/ProductTypes immer < 100?**

- **Metals:** 4 Elemente (Gold, Silver, Platinum, Palladium) - **statisch**
- **ProductTypes:** 3 Elemente (Bar, Coin, Round) - **weitgehend statisch**

Frontend kann alle auf einmal laden, Pagination ignorieren.

---

### Q7: Warum imageUrl UND imageFilename?

**Antwort: `imageUrl` wird DYNAMISCH generiert**

```json
{
  "imageUrl": "/api/products/158115fe-.../image",  // ← Dynamisch
  "imageFilename": null  // ← DEPRECATED (intern nur noch)
}
```

**`imageFilename` ist DEPRECATED** und wird in Zukunft entfernt.

Frontend soll **nur `imageUrl`** verwenden:

```typescript
// ✅ CORRECT
<img src={product.imageUrl || '/placeholder.png'} />

// ❌ WRONG
<img src={`/images/${product.imageFilename}`} />
```

---

### Q8: Error-Codes standardisiert?

**Antwort: JA, seit Phase 3.2 (10. Januar 2026)**

**Standard Error-Format:**

```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product not found",
    "details": "Product with ID 158115fe-... does not exist"
  },
  "timestamp": "2026-01-10T18:47:04.702Z",
  "requestId": "uuid-here"
}
```

**Error-Codes:**

- `VALIDATION_ERROR` - Eingabedaten ungültig (400)
- `INVALID_INPUT` - Falsches Format (400)
- `UNAUTHORIZED` - Nicht authentifiziert (401)
- `FORBIDDEN` - Keine Berechtigung (403)
- `NOT_FOUND` - Resource nicht gefunden (404)
- `PRODUCT_NOT_FOUND` - Produkt nicht gefunden (404)
- `ORDER_NOT_FOUND` - Order nicht gefunden (404)
- `ALREADY_EXISTS` - Resource existiert bereits (409)
- `INTERNAL_ERROR` - Server-Fehler (500)
- `DATABASE_ERROR` - Datenbank-Fehler (500)
- `EXTERNAL_SERVICE_ERROR` - Externer Service fehlgeschlagen (500)
- `RATE_LIMIT_EXCEEDED` - Zu viele Requests (429)

---

### Q9: Rate Limiting?

**Antwort: JA, seit Phase 3.4 (10. Januar 2026)**

**Read-Only Endpoints:** 300 Requests / 15 Minuten  
**Write Endpoints:** 30 Requests / 15 Minuten  
**Auth Endpoints:** 5 Requests / 15 Minuten

**Response Headers:**

```http
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 299
X-RateLimit-Reset: 1736525224
```

**429 Response bei Limit Exceeded:**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later",
    "details": {
      "limit": 300,
      "resetTime": "2026-01-10T19:00:24.000Z"
    }
  }
}
```

**Retry-After Header:** Gibt an, wie lange gewartet werden muss (in Sekunden).

---

### Q10: Caching-Headers?

**Antwort: JA, seit Phase 3.5 (10. Januar 2026)**

**Product Images:**

```http
Cache-Control: public, max-age=86400
ETag: "abc123..."
```

**ETag-Support:**

Frontend kann `If-None-Match` Header senden:

```http
GET /api/products/158115fe-.../image
If-None-Match: "abc123..."
```

**304 Not Modified Response** wenn ETag matched (spart Bandbreite).

**Empfohlene Cache-Strategien:**

- **Product Images:** 24h Cache (`max-age=86400`)
- **Reference Data:** 1h Cache (`max-age=3600`)
- **Market Data:** 1min Cache (`max-age=60`)
- **Orders/Positions:** No Cache (`no-cache, no-store`)

---

## ✅ Integration Test Status

**Test Suite:** 12/12 passing (204/204 tests)

All API endpoints are covered by comprehensive integration tests:
- ✅ **Products API** - 57/57 tests passing
- ✅ **Orders API** - 16/16 tests passing  
- ✅ **Authentication** - 11/11 tests passing
- ✅ **Registration** - 17/17 tests passing
- ✅ **Market Data** - 20/20 tests passing
- ✅ **Producers** - 45/45 tests passing
- ✅ **References** - 6/6 tests passing
- ✅ **Positions** - 2/2 tests passing
- ✅ **Custody** - 9/9 tests passing
- ✅ **Audit Trail** - 5/5 tests passing
- ✅ **Login/Last Login** - 3/3 tests passing
- ✅ **API Meta** - 12/12 tests passing

**Key Integration Test Principles:**
- Each test is autonomous (creates own data, cleans up after)
- Tests use isolated test database (created fresh for each run)
- No shared state between tests (except performance-optimized shared resources in Order tests)
- All tests can run in parallel or sequentially without conflicts

---

## 📋 Quick Start

### Authentication

Most endpoints require JWT authentication via Bearer token:

```http
Authorization: Bearer <your-jwt-token>
```

### Response Format

All API responses follow this structure:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**For collection endpoints (lists), the response uses a standardized pagination structure:**

```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 42,
      "totalPages": 3,
      "hasNext": true,
      "hasPrevious": false
    }
  },
  "message": "Operation successful"
}
```

### Enum Values (Type Safety)

**IMPORTANT:** The API uses **UPPER_CASE enum constant names** for type-safe values:

**Order Types:**
- `BUY` - Buy order
- `SELL` - Sell order

**Order Status:**
- `PENDING` - Order created, awaiting confirmation
- `CONFIRMED` - Order confirmed by system
- `PROCESSING` - Order being processed
- `SHIPPED` - Order shipped to customer
- `DELIVERED` - Order delivered
- `COMPLETED` - Order fully completed
- `CANCELLED` - Order cancelled

**Product Metal:**
- `GOLD` - Gold products
- `SILVER` - Silver products
- `PLATINUM` - Platinum products
- `PALLADIUM` - Palladium products

**Product Type:**
- `COIN` - Coin products
- `BAR` - Bar products

**💡 Frontend Integration Tip:**

The frontend should use the enum classes from `@marcopersi/shared` for type-safe comparisons:

```typescript
import { OrderStatus, OrderType, Metal, ProductTypeEnum } from '@marcopersi/shared';

// Check order status
if (order.status === OrderStatus.PENDING.value) {
  // or simply:
  if (order.status === 'PENDING') {
    // Show pending state
  }
}

// Display user-friendly labels
const statusLabel = OrderStatus.fromValue(order.status.toLowerCase())?.displayName;
// "Pending"
```

### Currency Handling

**Design Decision: Database-Based Currency Management**

Currencies are **NOT** managed as enums but stored in the database `currency` table. This provides:

✅ **Flexibility:**
- Admin can add new currencies without code changes
- Support for regional/emerging currencies
- Easy currency activation/deactivation

✅ **Relationships:**
- `custodyService` table references `currency` via Foreign Key
- Maintains referential integrity
- Proper relational database design

✅ **Data Structure:**
```sql
CREATE TABLE currency (
    id UUID PRIMARY KEY,
    isocode2 CHAR(2) NOT NULL,        -- 'US', 'EU', 'CH'
    isocode3 CHAR(3) NOT NULL UNIQUE, -- 'USD', 'EUR', 'CHF'
    isoNumericCode INTEGER NOT NULL,   -- 840, 978, 756
    createdat TIMESTAMP,
    updatedat TIMESTAMP
);
```

**Currently Supported Currencies:**
- `USD` - US Dollar (840)
- `EUR` - Euro (978)
- `CHF` - Swiss Franc (756)
- `GBP` - British Pound (826)
- `CAD` - Canadian Dollar (124)
- `AUD` - Australian Dollar (036)

**API Response Format:**

Products and orders return currency as **ISO Code 3 string** (not enum):

```json
{
  "id": "...",
  "price": 1850.00,
  "currency": "USD"  // ← String, not enum
}
```

**Frontend Validation:**

Use the `/api/references` endpoint to get available currencies dynamically:

```typescript
GET /api/references
{
  "currencies": [
    { "id": "uuid", "isoCode3": "USD", "isoNumericCode": 840 },
    { "id": "uuid", "isoCode3": "EUR", "isoNumericCode": 978 }
  ]
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information"
}
```

---

## 🛍️ Products API - Full CRUD

### 1. List Products (with Pagination & Filters)

**Endpoint:** `GET /products`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number (min: 1) |
| `limit` | integer | No | 20 | Items per page (min: 1, max: 100) |
| `sortBy` | string | No | `createdAt` | Sort field: `name`, `price`, `createdAt` |
| `sortOrder` | string | No | `desc` | Sort order: `asc`, `desc` |
| `search` | string | No | - | Search in name and description |
| `metalId` | string | No | - | Filter by metal ID (UUID) |
| `productTypeId` | string | No | - | Filter by product type ID (UUID) |
| `producerId` | string | No | - | Filter by producer ID (UUID) |
| `inStock` | boolean | No | - | Filter by stock availability |
| `minPrice` | number | No | - | Minimum price filter |
| `maxPrice` | number | No | - | Maximum price filter |

**Example Request:**

```bash
curl -X GET "http://localhost:8888/api/products?page=1&limit=10&search=gold&sortBy=price&sortOrder=asc"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "158115fe-44ef-4687-80e5-60501b1ae86b",
        "name": "Gold Philharmonic Coin",
        "productType": "COIN",
        "metal": "GOLD",
        "weight": 31.103,
        "weightUnit": "grams",
        "purity": 0.9999,
        "price": 1510,
        "currency": "USD",
        "producer": "Austrian Mint",
        "country": "Austria",
        "year": 2024,
        "description": "Austrian Gold Philharmonic coin",
        "imageUrl": "/api/products/158115fe-44ef-4687-80e5-60501b1ae86b/image",
        "inStock": true,
        "stockQuantity": 50,
        "minimumOrderQuantity": 1,
        "premiumPercentage": 4,
        "createdAt": "2025-11-28T22:05:42.357Z",
        "updatedAt": "2025-11-28T22:05:42.357Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 14,
      "totalPages": 2,
      "hasNext": true,
      "hasPrevious": false
    }
  },
  "message": "Found 14 products"
}
```

**TypeScript Interface:**

```typescript
interface ProductListResponse {
  success: boolean;
  data: {
    items: Product[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  };
  message: string;
}

interface Product {
  id: string;
  name: string;
  productType: string;
  metal: string;
  weight: number;
  weightUnit: string;
  purity: number;
  price: number;
  currency: string;
  producer: string;
  country: string | null;
  year: number | null;
  description: string | null;
  imageUrl: string | null;  // ← Dynamische URL: "/api/products/:id/image" oder null
  inStock: boolean;
  stockQuantity: number;
  minimumOrderQuantity: number;
  premiumPercentage: number | null;
  createdAt: string;
  updatedAt: string;
}
```

---

### 2. Get Single Product

**Endpoint:** `GET /products/:id`

**Example Request:**

```bash
curl -X GET "http://localhost:8888/api/products/158115fe-44ef-4687-80e5-60501b1ae86b"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "158115fe-44ef-4687-80e5-60501b1ae86b",
    "name": "Gold Philharmonic Coin",
    ...
  }
}
```

---

### 3. Create Product

**Endpoint:** `POST /products`

**Request Body:**

```json
{
  "productName": "Gold Britannia 1oz",
  "productTypeId": "7d33c312-f8e8-4471-b9ce-aad34110e680",
  "metalId": "bdb45356-d491-4b65-9610-a8c2270db47a",
  "producerId": "6f9e1958-805a-4aea-8bf0-05890f6578d9",
  "fineWeight": 31.103,
  "unitOfMeasure": "grams",
  "purity": 0.9999,
  "price": 1580,
  "currency": "GBP",
  "inStock": true,
  "stockQuantity": 100,
  "minimumOrderQuantity": 1,
  "description": "British Gold Britannia coin"
}
```

**Required Fields:**
- `productName` (string)
- `productTypeId` (UUID)
- `metalId` (UUID)
- `producerId` (UUID)
- `fineWeight` (number > 0)
- `unitOfMeasure` (string)
- `purity` (number, 0-1)
- `price` (number > 0)
- `currency` (string)

**Example Request:**

```bash
curl -X POST "http://localhost:8888/api/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "productName": "Gold Britannia 1oz",
    "productTypeId": "7d33c312-f8e8-4471-b9ce-aad34110e680",
    "metalId": "bdb45356-d491-4b65-9610-a8c2270db47a",
    "producerId": "6f9e1958-805a-4aea-8bf0-05890f6578d9",
    "fineWeight": 31.103,
    "unitOfMeasure": "grams",
    "purity": 0.9999,
    "price": 1580,
    "currency": "GBP"
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "new-product-uuid",
    "name": "Gold Britannia 1oz",
    ...
  },
  "message": "Product created successfully"
}
```

---

### 4. Update Product

**Endpoint:** `PUT /products/:id`

**Request Body (all fields optional):**

```json
{
  "price": 1600,
  "stockQuantity": 80,
  "inStock": true
}
```

**Example Request:**

```bash
curl -X PUT "http://localhost:8888/api/products/158115fe-44ef-4687-80e5-60501b1ae86b" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "price": 1600,
    "stockQuantity": 80
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "158115fe-44ef-4687-80e5-60501b1ae86b",
    "price": 1600,
    "stockQuantity": 80,
    ...
  },
  "message": "Product updated successfully"
}
```

---

### 5. Delete Product

**Endpoint:** `DELETE /products/:id`

**Example Request:**

```bash
curl -X DELETE "http://localhost:8888/api/products/158115fe-44ef-4687-80e5-60501b1ae86b" \
  -H "Authorization: Bearer <token>"
```

**Response:**

```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

**Error Response (404):**

```json
{
  "success": false,
  "error": "Product not found"
}
```

---

### 6. Get Product Image (BINARY)

**Endpoint:** `GET /products/:id/image`

**Description:** Liefert Binärdaten des Produktbildes. Kein JSON!

**Example Request:**

```bash
curl -X GET "http://localhost:8888/api/products/158115fe-44ef-4687-80e5-60501b1ae86b/image"
```

**Response (Success):**

- **Status:** 200 OK
- **Content-Type:** `image/jpeg` | `image/png` | `image/gif` | `image/webp`
- **Headers:**
  ```http
  Content-Type: image/jpeg
  Content-Disposition: inline; filename="gold-philharmonic.jpg"
  Cache-Control: public, max-age=86400
  X-Content-Type-Options: nosniff
  Content-Security-Policy: default-src 'none'
  ETag: "abc123..."
  ```
- **Body:** Binary image data

**Error Response (404):**

```json
{
  "success": false,
  "error": "Product image not found"
}
```

**Error Response (400 - Invalid UUID):**

```json
{
  "success": false,
  "error": "Invalid product ID format"
}
```

**Frontend Verwendung:**

```jsx
// React Component
function ProductImage({ product }) {
  if (!product.imageUrl) {
    return <img src="/placeholder.png" alt={product.name} />;
  }
  
  return (
    <img 
      src={product.imageUrl}  // ← "/api/products/:id/image"
      alt={product.name}
      loading="lazy"
    />
  );
}
```

**TypeScript mit Error Handling:**

```typescript
async function loadProductImage(productId: string): Promise<Blob> {
  const response = await fetch(`/api/products/${productId}/image`);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Image not found');
    }
    throw new Error('Failed to load image');
  }
  
  return response.blob();
}

// Verwendung
try {
  const imageBlob = await loadProductImage(productId);
  const imageUrl = URL.createObjectURL(imageBlob);
  setImageSrc(imageUrl);
} catch (error) {
  setImageSrc('/placeholder.png');
}
```

**Caching-Strategie:**

Die Response enthält `Cache-Control: public, max-age=86400` (24h Cache).

Browser cached Bilder automatisch. Für zusätzliche Kontrolle:

```typescript
// Mit If-None-Match für 304 Not Modified
const etag = localStorage.getItem(`product-image-etag-${productId}`);

const response = await fetch(`/api/products/${productId}/image`, {
  headers: etag ? { 'If-None-Match': etag } : {}
});

if (response.status === 304) {
  // Image unchanged, use cached version
  return cachedImageUrl;
}

// Save new ETag
const newEtag = response.headers.get('ETag');
if (newEtag) {
  localStorage.setItem(`product-image-etag-${productId}`, newEtag);
}
```

---

### 7. Upload Product Image

**Endpoint:** `POST /products/:id/image`

**Request Body:**

```json
{
  "imageBase64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "contentType": "image/png",
  "filename": "product-image.png"
}
```

**Supported Content Types:**
- `image/jpeg` or `image/jpg`
- `image/png`
- `image/gif`
- `image/webp`

**Max File Size:** 5MB

**Base64 Format:**
- With prefix: `data:image/png;base64,iVBORw0KGg...`
- Without prefix: `iVBORw0KGg...` (both accepted)

**Example Request:**

```bash
curl -X POST "http://localhost:8888/api/products/158115fe-44ef-4687-80e5-60501b1ae86b/image" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "imageBase64": "iVBORw0KGgoAAAANSUhEUgAAAAUA...",
    "contentType": "image/png",
    "filename": "gold-coin.png"
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "Image uploaded successfully"
}
```

**Error Responses:**

```json
// Invalid content type
{
  "success": false,
  "error": "Invalid image data",
  "details": "Invalid content type. Must be one of: image/jpeg, image/jpg, image/png, image/gif, image/webp"
}

// File too large
{
  "success": false,
  "error": "Invalid image data",
  "details": "Image size exceeds maximum allowed size of 5MB"
}

// Product not found
{
  "success": false,
  "error": "Product not found",
  "details": "Product not found: <product-id>"
}
```

**JavaScript/TypeScript Example:**

```typescript
// Convert File to Base64
async function uploadProductImage(productId: string, file: File) {
  const base64 = await fileToBase64(file);
  
  const response = await fetch(`/api/products/${productId}/image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      imageBase64: base64,
      contentType: file.type,
      filename: file.name
    })
  });
  
  return response.json();
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]; // Remove data URI prefix
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

**React Hook Example:**

```typescript
import { useState } from 'react';

export function useProductImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadImage = async (productId: string, file: File) => {
    setUploading(true);
    setError(null);
    
    try {
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size exceeds 5MB');
      }
      
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        throw new Error('Invalid file type. Must be JPEG, PNG, GIF, or WebP');
      }
      
      // Convert to Base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      // Upload
      const response = await fetch(`/api/products/${productId}/image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          imageBase64: base64,
          contentType: file.type,
          filename: file.name
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.details || data.error);
      }
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return { uploadImage, uploading, error };
}
```

---

## 📚 Reference Data APIs

### Overview: GET /api/references (All Reference Data)

**Empfohlen:** Lädt alle Reference Data in einem Request (beim App-Start).

```bash
GET /api/references
```

**Response:**

```json
{
  "success": true,
  "data": {
    "metals": [
      {"symbol": "AU", "name": "Gold"},
      {"symbol": "AG", "name": "Silver"},
      {"symbol": "PT", "name": "Platinum"},
      {"symbol": "PD", "name": "Palladium"}
    ],
    "productTypes": [
      {"name": "BAR"},
      {"name": "COIN"}
    ],
    "countries": [
      {"code": "at", "name": "Austria"},
      {"code": "ch", "name": "Switzerland"},
      {"code": "ca", "name": "Canada"},
      {"code": "us", "name": "United States"}
    ],
    "producers": [
      {"id": "uuid-1", "name": "Argor-Heraeus"},
      {"id": "uuid-2", "name": "Austrian Mint"},
      {"id": "uuid-3", "name": "Perth Mint"}
    ],
    "currencies": [
      {"id": "uuid-a", "isoCode2": "US", "isoCode3": "USD", "isoNumericCode": 840},
      {"id": "uuid-b", "isoCode2": "EU", "isoCode3": "EUR", "isoNumericCode": 978},
      {"id": "uuid-c", "isoCode2": "CH", "isoCode3": "CHF", "isoNumericCode": 756}
    ],
    "custodians": [
      {"value": "LOOMIS", "name": "Loomis International"},
      {"value": "BRINKS", "name": "Brink's Global Services"}
    ],
    "paymentFrequencies": [
      {"value": "MONTHLY", "displayName": "Monthly", "description": "Monthly payments"},
      {"value": "QUARTERLY", "displayName": "Quarterly", "description": "Quarterly payments"}
    ],
    "custodyServiceTypes": [
      {"value": "ALLOCATED", "displayName": "Allocated Storage", "description": "Specific bars assigned to you"},
      {"value": "UNALLOCATED", "displayName": "Unallocated Storage", "description": "Shared pool storage"}
    ]
  }
}
```

**Verwendung:**

```typescript
// App-Start: Alle Reference Data laden
useEffect(() => {
  fetch('/api/references')
    .then(res => res.json())
    .then(data => {
      setMetals(data.data.metals);
      setProductTypes(data.data.productTypes);
      setProducers(data.data.producers);
      setCurrencies(data.data.currencies);
    });
}, []);
```

---

### GET /api/references/metals (Mit UUIDs!)

```bash
GET /api/references/metals
```

**Response:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "8f6a4c76-5726-4417-ae15-b2419d2e1cf1",
        "name": "Gold",
        "createdAt": "2025-11-28T22:05:42.354Z",
        "updatedAt": "2025-11-28T22:05:42.354Z"
      },
      {
        "id": "3b2e9a8f-1234-5678-abcd-ef0123456789",
        "name": "Silver",
        "createdAt": "2025-11-28T22:05:42.354Z",
        "updatedAt": "2025-11-28T22:05:42.354Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 4,
      "total": 4,
      "totalPages": 1,
      "hasNext": false,
      "hasPrevious": false
    }
  }
}
```

**Verwendung für Filter:**

```typescript
// 1. Metals laden
const metalsResponse = await fetch('/api/references/metals');
const metals = metalsResponse.data.items; // [{id, name}, ...]

// 2. Filter mit UUID
const goldMetal = metals.find(m => m.name === 'Gold');
const productsResponse = await fetch(`/api/products?metalId=${goldMetal.id}`);
```

---

### GET /api/references/productTypes (Mit UUIDs!)

```bash
GET /api/references/productTypes
```

**Response:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "7d33c312-f8e8-4471-b9ce-aad34110e680",
        "name": "Bar",
        "createdAt": "2025-11-28T22:05:42.353Z",
        "updatedAt": "2025-11-28T22:05:42.353Z"
      },
      {
        "id": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
        "name": "Coin",
        "createdAt": "2025-11-28T22:05:42.353Z",
        "updatedAt": "2025-11-28T22:05:42.353Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 3,
      "total": 3,
      "totalPages": 1,
      "hasNext": false,
      "hasPrevious": false
    }
  }
}
```

**Verwendung für Filter:**

```typescript
// 1. Product Types laden
const typesResponse = await fetch('/api/references/productTypes');
const types = typesResponse.data.items; // [{id, name}, ...]

// 2. Filter mit UUID
const coinType = types.find(t => t.name === 'Coin');
const productsResponse = await fetch(`/api/products?productTypeId=${coinType.id}`);
```

---

### GET /api/references/currencies (Mit UUIDs!)

```bash
GET /api/references/currencies
```

**Response:**

```json
[
  {
    "id": "f8e7d6c5-b4a3-9281-7654-321098765432",
    "isoCode2": "US",
    "isoCode3": "USD",
    "isoNumericCode": 840,
    "createdAt": "2025-11-28T22:05:42.354Z",
    "updatedAt": "2025-11-28T22:05:42.354Z"
  },
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
    "isoCode2": "EU",
    "isoCode3": "EUR",
    "isoNumericCode": 978,
    "createdAt": "2025-11-28T22:05:42.354Z",
    "updatedAt": "2025-11-28T22:05:42.354Z"
  }
]
```

**Note:** Currencies werden **direkt als Array** zurückgegeben (kein wrapper), historisch gewachsen.

**Verwendung:**

```typescript
// Currencies laden
const currencies = await fetch('/api/references/currencies').then(r => r.json());

// Currency Dropdown
<select>
  {currencies.map(c => (
    <option key={c.id} value={c.isoCode3}>{c.isoCode3}</option>
  ))}
</select>
```

---

### GET /api/producers (Mit UUIDs!)

```bash
GET /api/producers?page=1&limit=50
```

**Response:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "6f9e1958-805a-4aea-8bf0-05890f6578d9",
        "producerName": "Argor-Heraeus",
        "createdAt": "2025-11-28T22:05:42.354Z",
        "updatedAt": "2025-11-28T22:05:42.354Z"
      },
      {
        "id": "9904a26f-a1b6-4af5-a7be-e16aeb382272",
        "producerName": "Austrian Mint",
        "createdAt": "2025-11-28T22:05:42.354Z",
        "updatedAt": "2025-11-28T22:05:42.354Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 15,
      "totalPages": 1,
      "hasNext": false,
      "hasPrevious": false
    }
  }
}
```

---

## 🔐 Authentication

### Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "role": "investor"
  }
}
```

### Using the Token

Include in all authenticated requests:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📊 Market Data API

### 1. Get Current Price for Metal

**Endpoint:** `GET /market-data/price/:metalSymbol`

**Parameters:**
- `metalSymbol` - Metal symbol (e.g., `AU` for Gold, `AG` for Silver)
- `currency` (optional) - Currency code (default: `USD`)

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "30a0ee69-cafc-471f-b8fb-673c87540106",
    "metalId": "8f6a4c76-5726-4417-ae15-b2419d2e1cf1",
    "metalName": "Gold",
    "metalSymbol": "AU",
    "pricePerTroyOz": "2000.5000",
    "currency": "USD",
    "providerId": "8fc827d4-ca8d-4b72-b1e8-745a6fb671f6",
    "providerName": "Metals-API",
    "timestamp": "2026-01-10T18:47:04.702Z",
    "bid": null,
    "ask": null,
    "high24h": null,
    "low24h": null,
    "change24h": null,
    "changePercent24h": null
  }
}
```

**Note:** Property names are in **camelCase** (e.g., `metalSymbol`, `pricePerTroyOz`, not snake_case)

### 2. Get Prices for Multiple Metals

**Endpoint:** `GET /market-data/prices`

**Query Parameters:**
- `symbols` (required) - Comma-separated metal symbols (e.g., `AU,AG,PT`)

**Response:**

```json
{
  "success": true,
  "data": {
    "AU": {
      "metalSymbol": "AU",
      "pricePerTroyOz": "2000.5000",
      "currency": "USD",
      ...
    },
    "AG": {
      "metalSymbol": "AG",
      "pricePerTroyOz": "25.7500",
      "currency": "USD",
      ...
    }
  }
}
```

### 3. Get Historical Prices

**Endpoint:** `GET /market-data/history/:metalSymbol`

**Query Parameters:**
- `startDate` (optional) - ISO date (e.g., `2025-11-01`)
- `endDate` (optional) - ISO date
- `limit` (optional) - Max results (default: 100, max: 1000)

---

## 🎯 Common Use Cases

### 1. Display Product Catalog with Filters

```typescript
async function loadProducts(filters: {
  page?: number;
  limit?: number;
  search?: string;
  metalId?: string;
  minPrice?: number;
  maxPrice?: number;
}) {
  const params = new URLSearchParams();
  
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.search) params.append('search', filters.search);
  if (filters.metalId) params.append('metalId', filters.metalId);
  if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
  if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
  
  const response = await fetch(`/api/products?${params}`);
  const data = await response.json();
  
  return data;
}

// Usage
const products = await loadProducts({
  page: 1,
  limit: 20,
  search: 'gold',
  minPrice: 1000,
  maxPrice: 2000
});
```

### 2. Create Product with Image

```typescript
async function createProductWithImage(productData: any, imageFile: File) {
  // 1. Create product
  const createResponse = await fetch('/api/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(productData)
  });
  
  const product = await createResponse.json();
  
  if (!product.success) {
    throw new Error(product.error);
  }
  
  // 2. Upload image
  const base64 = await fileToBase64(imageFile);
  
  const imageResponse = await fetch(`/api/products/${product.data.id}/image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      imageBase64: base64,
      contentType: imageFile.type,
      filename: imageFile.name
    })
  });
  
  return product.data;
}
```

### 3. Update Product Price

```typescript
async function updateProductPrice(productId: string, newPrice: number) {
  const response = await fetch(`/api/products/${productId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ price: newPrice })
  });
  
  return response.json();
}
```

### 4. Delete Product

```typescript
async function deleteProduct(productId: string) {
  const response = await fetch(`/api/products/${productId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.json();
}
```

---

## 🚨 Error Handling

All endpoints return consistent error responses:

```typescript
interface ErrorResponse {
  success: false;
  error: string;        // User-friendly error message
  details?: string;     // Technical details (optional)
}
```

**Common HTTP Status Codes:**

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Request completed successfully |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input, validation error |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 500 | Server Error | Internal server error |

**Example Error Handling:**

```typescript
try {
  const response = await fetch('/api/products');
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.details || data.error);
  }
  
  return data.data;
} catch (error) {
  console.error('API Error:', error);
  // Show user-friendly error message
  showToast('Failed to load products', 'error');
}
```

---

## 📱 Mobile App Considerations

### 1. Image Optimization

Before uploading images, compress them on the client:

```typescript
import ImageCompressor from 'react-native-image-compressor';

async function compressAndUpload(imageUri: string, productId: string) {
  // Compress image
  const compressed = await ImageCompressor.compress(imageUri, {
    compressionMethod: 'auto',
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 0.8
  });
  
  // Convert to Base64
  const base64 = await RNFS.readFile(compressed, 'base64');
  
  // Upload
  return uploadProductImage(productId, base64, 'image/jpeg', 'product.jpg');
}
```

### 2. Offline Support

Cache product data locally:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getProducts(useCache = true) {
  if (useCache) {
    const cached = await AsyncStorage.getItem('products');
    if (cached) {
      return JSON.parse(cached);
    }
  }
  
  const response = await fetch('/api/products?limit=100');
  const data = await response.json();
  
  await AsyncStorage.setItem('products', JSON.stringify(data.data));
  
  return data.data;
}
```

### 3. Pagination

Implement infinite scroll:

```typescript
const [products, setProducts] = useState([]);
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);

async function loadMore() {
  if (!hasMore) return;
  
  const response = await fetch(`/api/products?page=${page}&limit=20`);
  const data = await response.json();
  
  setProducts([...products, ...data.data.products]);
  setPage(page + 1);
  setHasMore(page < data.data.totalPages);
}
```

---

## 🧪 Testing & Development

### Running Integration Tests

```bash
# Run all integration tests
npm test -- tests/integration

# Run specific test suite
npm test -- tests/integration/products.integration.test.ts

# Run with coverage
npm test -- tests/integration --coverage
```

**Test Database:**
- Each test run creates a fresh isolated database
- Database name: `goldsphere_test_{timestamp}_{random}`
- Automatically cleaned up after test completion

**Important:** When developing new services:
1. Import `app` **AFTER** `setupTestDatabase()` in test files
2. Use `getPool()` from `dbConfig` for all database operations
3. Services must use dependency injection (don't cache pools in constructors)

### Testing Endpoints

Use these curl commands to test the API:

```bash
# List products
curl "http://localhost:8888/api/products?page=1&limit=5"

# Get single product
curl "http://localhost:8888/api/products/<product-id>"

# Get market data
curl "http://localhost:8888/api/market-data/price/AU"
curl "http://localhost:8888/api/market-data/prices?symbols=AU,AG"

# Create product (requires auth)
curl -X POST "http://localhost:8888/api/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d @product.json

# Update product (requires auth)
curl -X PUT "http://localhost:8888/api/products/<product-id>" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"price": 1600}'

# Delete product (requires auth)
curl -X DELETE "http://localhost:8888/api/products/<product-id>" \
  -H "Authorization: Bearer <token>"

# Upload image (requires auth)
curl -X POST "http://localhost:8888/api/products/<product-id>/image" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d @image-upload.json
```

---

## ⚠️ Important Notes

### Database Pool Management
- **Critical:** All services MUST use `getPool()` from `dbConfig` for database access
- DO NOT cache pool instances in service constructors
- Use dependency injection for testability

### API Response Format
- All timestamps are in ISO 8601 format (UTC)
- Property names use **camelCase** (not snake_case)
- Numeric values from database (e.g., prices) are returned as strings for precision

### Error Handling
- Always check `response.success` before accessing `response.data`
- 500 errors include `error` and `details` properties
- 404 errors are specific (e.g., "Product not found: {id}")

---

## 📞 Support

- **API Documentation:** http://localhost:8888/docs
- **OpenAPI Spec:** http://localhost:8888/api-spec.yaml
- **Health Check:** http://localhost:8888/health
- **Issues:** Contact backend team

---

**Last Updated:** 2026-01-10  
**API Version:** 1.0.0
