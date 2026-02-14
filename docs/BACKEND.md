# Backend Architecture Documentation

## Overview

This document describes the backend architecture patterns, service layer structure, and key implementation details for the goldsphere-server backend.

## Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **API Documentation**: tsoa (TypeScript OpenAPI)
- **Database**: PostgreSQL 16
- **ORM/Query Builder**: Native pg client
- **Testing**: Jest with ts-jest
- **Authentication**: JWT (Bearer tokens)

## Architecture Patterns

### Service Layer Architecture

The backend follows a clean architecture with clear separation of concerns:

```
Controllers (HTTP Layer)
    ↓
Services (Business Logic)
    ↓
Repositories (Data Access)
    ↓
Database
```

### Dependency Injection

**CRITICAL**: All services MUST use Dependency Injection - NEVER instantiate dependencies inside classes!

```typescript
// ✅ CORRECT - Dependencies injected via constructor
class ModelPortfolioService {
  constructor(
    private readonly postgres: PostgresClient,
    private readonly logger: ILogger,
    private readonly modelPortfolioRepo: ModelPortfolioRepository,
    private readonly profileRepo: InvestmentProfileRepository
  ) {}
}

// ❌ WRONG - Creating dependencies inside constructor
class ModelPortfolioService {
  private readonly modelPortfolioRepo: ModelPortfolioRepository;

  constructor(
    private readonly postgres: PostgresClient,
    private readonly logger: ILogger
  ) {
    this.modelPortfolioRepo = new ModelPortfolioRepository(postgres, logger); // ❌ BAD!
  }
}
```

**Benefits:**
- Easy to mock dependencies in unit tests
- Flexibility to swap implementations
- Separation of concerns
- Industry standard best practice

### Repository Pattern

**MANDATORY**: ALL database access MUST go through repositories (no direct db calls in services).

Repositories abstract data access and provide a uniform interface:

```typescript
// Example repository interface
interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  findAll(filters: ProductFilters): Promise<Product[]>;
  create(product: CreateProductDTO): Promise<Product>;
  update(id: string, data: UpdateProductDTO): Promise<Product>;
  delete(id: string): Promise<void>;
}
```

**Location**: `/src/services/infrastructure/repository/` or `/backend/repositories/`

### Audit Trail

All write operations must record audit metadata when the table supports it. Use `getAuditUser()` and `requireAuthenticatedUser()` to enforce strict user validation — **no silent fallbacks allowed**.

**Key rules:**
- Pass `authenticatedUser` from controller -> service -> repository — the parameter is **required** (not optional).
- Controllers must use `requireAuthenticatedUser(request)` to extract and validate the user. This throws `AuthenticationError` if no valid user is present.
- Repositories must always set `createdBy` and `updatedBy` (or `updatedBy` for updates) when columns exist.
- **No SYSTEM_USER fallback.** Every write operation must have a real authenticated user. If authentication fails, fail fast with 401.
- Some tables (e.g., market price/history/cache) do not have audit columns; do not add audit writes there.

```typescript
// utils/auditTrail.ts

// Fail-fast guard for controllers — extracts user from request
export function requireAuthenticatedUser(request: any): AuditTrailUser {
  const user = request?.user;
  if (!user?.id || !user?.email || !user?.role) {
    throw new AuthenticationError('Authenticated user required.');
  }
  return user;
}

// Validation guard for repositories — ensures user is valid
export function getAuditUser(user: AuditTrailUser): AuditTrailUser {
  if (!user?.id || !user?.email) {
    throw new AuthenticationError('Audit trail user is required.');
  }
  return user;
}

// Controller example
const authenticatedUser = requireAuthenticatedUser(request);
const result = await service.createProduct(data, authenticatedUser);

// Repository example
const auditUser = getAuditUser(authenticatedUser);
await pool.query(
  'UPDATE product SET updatedBy = $1, updatedat = NOW() WHERE id = $2',
  [auditUser.id, id]
);
```

### Error Handling

#### Standard Pattern

```typescript
try {
  const result = await service.doSomething();
  return { success: true, data: result };
} catch (error) {
  logger.error('ComponentName', 'Operation description', error);
  
  // Return user-friendly error response
  if (error.message.includes('not found')) {
    this.setStatus(404);
    return { success: false, error: 'Resource not found' };
  }
  
  this.setStatus(500);
  return { success: false, error: 'Internal server error' };
}
```

#### Error Response with Status Property

For endpoints that return non-JSON responses (e.g., binary data), throw errors with a `status` property:

```typescript
public async getBinaryData(@Path() id: string): Promise<Buffer> {
  const data = await service.getData(id);
  
  if (!data) {
    const error: any = new Error("Resource not found");
    error.status = 404; // Set status property for Express error handler
    throw error;
  }
  
  return data;
}
```

The global error handler in `app.ts` checks `err.status`:

```typescript
app.use((err: any, req: any, res: any, next: any) => {
  const status = err.status || 500;
  const message = err.message || "Internal server error";
  
  res.status(status).json({
    success: false,
    error: message
  });
});
```

### Controllers (tsoa)

Controllers use tsoa decorators for automatic route generation and OpenAPI documentation.

#### Route Regeneration Required

**CRITICAL**: After changing controller interfaces, you MUST regenerate tsoa routes:

```bash
# Regenerate routes after interface changes
npx tsoa spec-and-routes

# Then rebuild TypeScript
npm run build
```

**Why?** tsoa is configured with `"noImplicitAdditionalProperties": "throw-on-extras"`, which means:
- Adding new fields to interfaces requires route regeneration
- Routes validate against the generated schema, not the TypeScript interface
- Without regeneration, you'll get `400 Bad Request` with "excess property" errors

#### Union Types: Throw vs Return

For many tsoa endpoints, throwing errors is the safest default. However, returning a typed error object with `this.setStatus(...)` is also valid when the controller method explicitly includes the error response type in its return union.

```typescript
// ✅ Valid pattern (throw)
@Post()
public async createItem(@Body() body: ItemInput): Promise<ItemResponse | ErrorResponse> {
  if (!body.name) {
    this.setStatus(400);
    throw new Error("Name is required");
  }
  return { success: true, data: item };
}

// ✅ Also valid pattern (return typed error)
@Post()
public async createItem(@Body() body: ItemInput): Promise<ItemResponse | ErrorResponse> {
  if (!body.name) {
    this.setStatus(400);
    return { success: false, error: "Name is required" };
  }
  return { success: true, data: item };
}
```

### Authentication Error Status Behavior

Authentication endpoints must return the correct HTTP status code for token errors.

**Current behavior (`2026-02-14`):**

- `GET /api/auth/me`
  - Valid token -> `200` with `{ id, email, role }`
  - Missing token -> `401` with `{ "success": false, "error": "No token provided" }`
  - Invalid/expired token -> `401` with `{ "success": false, "error": "Invalid token" | "Token has expired" }`
- `POST /api/auth/refresh`
  - Invalid/expired token -> `401` with `{ "success": false, "error": "Invalid token" | "Token has expired" }`

Implementation note: in `AuthController`, token error paths use `this.setStatus(...)` + typed JSON return objects instead of generic `throw new Error(...)` to avoid accidental `500` responses.

#### Binary Responses

For binary responses (images, PDFs, etc.), return `Buffer` directly:

```typescript
@Get("{id}/image")
@SuccessResponse(200, "Image retrieved successfully")
@Response(404, "Image not found")
public async getProductImage(@Path() id: string): Promise<Buffer> {
  const imageData = await service.getProductImage(id);

  if (!imageData) {
    const error: any = new Error("Image not found");
    error.status = 404;
    throw error;
  }

  // Set headers for binary response
  this.setHeader('Content-Type', imageData.contentType);
  this.setHeader('Content-Disposition', `inline; filename="${imageData.filename}"`);
  this.setHeader('Content-Length', imageData.data.length.toString());
  
  return imageData.data; // Return Buffer directly, NOT JSON
}
```

**Key Points:**
- Return `Promise<Buffer>`, not `Promise<{ data: string }>`
- Set `Content-Type` header (e.g., `image/jpeg`, `image/png`)
- Do NOT include `charset` in Content-Type for binary data
- Use `Content-Disposition: inline` for browser display or `attachment` for downloads
- Frontend expects direct binary response, not base64-encoded JSON

### Testing Notes

`--detectLeaks` is unstable in this repo (hangs under ts-jest). Do not use it.

Use `--detectOpenHandles` for isolation runs and enable `JEST_LEAK_CHECK=true` so console mocking is disabled during diagnostics.

```bash
# Open handles diagnostics
JEST_LEAK_CHECK=true npx jest tests/unit tests/contracts --runInBand --testTimeout=30000 --detectOpenHandles --testPathIgnorePatterns='tests/integration'
```

## API Patterns

### Request/Response Schema

All API endpoints follow consistent schema validation:

```typescript
interface StandardRequest {
  // Input fields with validation
}

interface StandardSuccessResponse {
  success: true;
  data: any;
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

interface StandardErrorResponse {
  success: false;
  error: string;
  details?: any;
}
```

### Pagination

Standard pagination parameters:

```typescript
interface PaginationParams {
  page?: number;      // Default: 1, Min: 1
  limit?: number;     // Default: 10, Min: 1, Max: 100
  sortBy?: string;    // Field to sort by
  sortOrder?: 'asc' | 'desc'; // Default: 'asc'
}

interface PaginatedResponse<T> {
  success: true;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;  // Note: "hasPrevious", not "hasPrev"
    };
  };
}
```

## Service Examples

### Product Management Service

#### Get Product Image

Binary image endpoint returning raw JPEG/PNG data:

```typescript
// Service method
async getProductImage(id: string): Promise<ProductImageDTO | null> {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    return null; // Return null for invalid input
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return null; // Return null for invalid UUID format
  }
  
  return await this.repository.getImageWithMetadata(id);
}

// DTO
interface ProductImageDTO {
  data: Buffer;
  contentType: string; // e.g., 'image/jpeg'
  filename: string;
}
```

**Frontend Integration:**
- Product list includes `imageUrl: "/api/products/{id}/image"`
- Frontend displays images via `<img src="/api/products/{id}/image" />`
- Endpoint returns HTTP 200 with binary data or HTTP 404 if not found

#### Upload Product Image

```typescript
async uploadImage(
  id: string,
  imageBase64: string,
  contentType: string,
  filename: string
): Promise<void> {
  // Validate content type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(contentType)) {
    throw new Error('Invalid content type');
  }

  // Decode base64 and check size (max 5MB)
  const imageBuffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  const maxSize = 5 * 1024 * 1024;
  if (imageBuffer.length > maxSize) {
    throw new Error('Image exceeds 5MB limit');
  }

  await this.repository.saveImage(id, imageBuffer, contentType, filename);
}
```

### Order Management Service

#### Create Order

Orders support buy/sell types with multiple items:

```typescript
interface OrdersCreateInput {
  type: string;                          // 'buy' or 'sell'
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  currency?: string;                     // Optional: 'CHF', 'USD', 'EUR'
  source?: string;                       // Optional: 'web', 'mobile'
  custodyServiceId?: string;             // Optional: custody service
  notes?: string;                        // Optional: customer notes
  userId?: string;                       // Optional: ignored, user from JWT
}

interface OrdersCreateResponse {
  success: true;
  data: {
    orderId: string;
    type: string;
    status: string;
    items: OrderItem[];
    totalAmount: number;
    currency: string;
    createdAt: string;
  };
}
```

**Validation:**
- tsoa validates `@Body()` strictly against interface
- Excess properties cause `400 Bad Request` with validation error
- Frontend and backend schemas must match exactly

**Frontend Integration:**
```typescript
// Frontend sends
const orderRequest = {
  type: 'sell',
  currency: 'CHF',
  source: 'web',
  items: [
    { productId: '8a9d5ecc-a380-4989-85d5-1fb4bad3c772', quantity: 1 }
  ]
};

// POST /api/orders
const response = await fetch('/api/orders', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(orderRequest)
});
```

## Database Management

### Critical Rules

**❌ NEVER RESET THE DATABASE WITHOUT EXPLICIT USER PERMISSION**
- ❌ **NEVER** run `docker-compose down -v`
- ❌ **NEVER** drop/truncate tables without asking first
- ✅ **ALWAYS** ask user before ANY destructive database operation

**Why:**
- Database may contain hours of imported data (1M+ rows)
- Data import can take 10-15 minutes to restore
- Loss of development/testing progress

### Connection

```typescript
// src/dbConfig.ts
import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

export const getPool = () => pool;
```

**Credentials:**
- User: `bank.technical@goldsphere.vault`
- Password: `GoldspherePassword`
- Host: `localhost`
- Port: `5432`
- Database: `goldsphere`

## Testing

### Test Structure

```
tests/
├── unit/                  # Unit tests (mocked dependencies)
├── integration/           # Integration tests (real database)
└── contracts/             # Contract tests (API endpoints)
```

### Running Tests

```bash
# All unit tests (default)
npm test

# Specific test file
npx jest path/to/test.ts

# Integration tests (requires database)
npx jest tests/integration/

# With coverage
npm run test:coverage
```

### Unit Test Pattern

```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let mockRepository: jest.Mocked<IRepository>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      create: jest.fn(),
      // ... other methods
    } as any;

    service = new ServiceName(mockRepository);
  });

  it('should do something', async () => {
    mockRepository.findById.mockResolvedValue(testData);
    
    const result = await service.doSomething('id');
    
    expect(result).toEqual(expectedResult);
    expect(mockRepository.findById).toHaveBeenCalledWith('id');
  });
});
```

### Integration Test Pattern

```typescript
import request from 'supertest';
import app from '../../src/app';

describe('Endpoint Integration Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    
    authToken = loginResponse.body.token;
  });

  it('should return data', async () => {
    const response = await request(app)
      .get('/api/endpoint')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

### Critical Testing Rules

**NEVER COMMIT OR PUSH WHEN TESTS ARE FAILING** - Zero tolerance for broken tests!

```bash
# Before committing, ALWAYS run:
npm test

# Fix ALL failing tests before commit
# Wait for explicit user approval before committing
```

## Code Quality Standards

### File Size Limits

- **Maximum 300 lines per file**
- Split larger files into smaller, logical modules
- Use barrel exports (`index.ts`) for clean imports

### TypeScript Best Practices

- Strict typing always - avoid `any` except when necessary
- Define interfaces for complex data structures
- Use type inference where appropriate
- Prefer interfaces over types for object shapes

### Error Handling

- **No unhandled promise rejections**
- All errors must be logged with context
- User-friendly error messages
- **Never hide root errors with fallbacks**

### SOLID Principles

- **Single Responsibility**: One class/function = one responsibility
- **Open/Closed**: Open for extension, closed for modification
- **Liskov Substitution**: Derived types substitutable for base types
- **Interface Segregation**: Many small interfaces over large ones
- **Dependency Inversion**: Depend on abstractions, not implementations

### KISS & YAGNI

- **Keep It Simple, Stupid**: Always choose the simplest solution
- **You Aren't Gonna Need It**: Only write code needed right now
- No features for "maybe later" or "just in case"

## Documentation

**ALL documentation MUST be centralized in `/docs` directory.**

When implementing features:
1. Update relevant `/docs/*.md` files
2. Reference docs in code comments: `// See docs/BACKEND.md`
3. Keep `/docs/README.md` as central index

**After implementing a feature, ALWAYS ask:**
> "Soll ich die Dokumentation in `/docs/[RELEVANT_FILE].md` aktualisieren?"

---

**Last Updated**: February 3, 2026
