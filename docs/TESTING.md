# Testing Strategy & Coverage

## Test Infrastructure

- **Framework:** Jest + supertest
- **Database:** Fresh PostgreSQL test database per test suite (`goldsphere_test_<uuid>`)
- **Setup:** `tests/integration/db-setup.ts` — `setupTestDatabase()` / `teardownTestDatabase()`
- **Auth:** Admin token generated via `generateToken()` from real DB user
- **Config:** `jest.config.json` (standard), `jest.leak.config.js` (memory leak detection)

## Running Tests

```bash
# All tests
npx jest --config jest.config.json --no-coverage

# Single test suite
npx jest --config jest.config.json tests/integration/products.integration.test.ts --no-coverage

# Specific test by name
npx jest --config jest.config.json tests/integration/products.integration.test.ts -t "Data transformation" --no-coverage

# With coverage
npx jest --config jest.config.json
```

## Test File Structure

```
tests/
├── setup.ts                              # Global test setup
├── integration/
│   ├── db-setup.ts                       # Test DB lifecycle
│   ├── api.integration.test.ts           # General API health
│   ├── auth.integration.test.ts          # Authentication
│   ├── login.last_login.integration.test.ts
│   ├── registration.integration.test.ts  # User registration
│   ├── users.api.integration.test.ts     # User management
│   ├── products.integration.test.ts      # Products CRUD + filtering + pricing
│   ├── products.image.integration.test.ts # Product image upload
│   ├── producers.integration.test.ts     # Producers CRUD
│   ├── orders.api.integration.test.ts    # Orders lifecycle
│   ├── position.integration.test.ts      # Positions
│   ├── custody.integration.test.ts       # Custodians
│   ├── custodyService.integration.test.ts # Custody services
│   ├── marketData.integration.test.ts    # Market data
│   ├── references.integration.test.ts    # Reference data
│   └── audit-trail.integration.test.ts   # Audit trail
└── unit/
    └── (service-level unit tests)
```

## Integration Test Coverage (as of 2026-02-11)

### Well Covered ✅

| Controller | Endpoints | Test File | Notes |
|---|---|---|---|
| ProductController | 10/10 | products + products.image | UUID assertions, filtering, pagination, pricing |
| ProducersController | 5/5 | producers | Full CRUD |
| MarketDataController | 6/6 | marketData | All endpoints covered |
| RegistrationController | 3/3 | registration | register, check-email, resend |
| ReferenceDataController | 1/1 | references | Aggregated reference data |

### Partially Covered 🟡

| Controller | Tested | Missing | Test File |
|---|---|---|---|
| AuthController | login, validate | refresh, me | auth, login |
| UserController | GET, GET/{id}, POST, PUT, DELETE | blocked, block, unblock, soft-delete | users.api |
| OrdersController | GET, POST, GET/{id}, process, PUT, DELETE | admin, my, detailed, cancel | orders.api |
| CustodiansController | GET, POST | GET/{id}, PUT/{id}, DELETE/{id} | custody |
| CustodyServiceController | GET default, GET/{id}, custodians-with-services | POST, PUT, DELETE, GET list | custodyService |
| PositionsController | GET | GET by portfolio, GET/{id} | position |

### No Integration Tests 🔴

| Controller | Endpoints | Priority |
|---|---|---|
| PortfolioController | 7 (GET, my, {id}, summary, POST, PUT, DELETE) | 🔴 High — core business logic |
| TransactionsController | 3 (GET, POST, GET/{id}) | 🔴 High — financial data |
| PaymentController / PaymentsController | 9 (intents, confirm, refund, methods) | 🔴 High — payment critical |
| CountriesController | 5 (CRUD) | 🟡 Medium — reference data |
| CurrenciesController | 5 (CRUD) | 🟡 Medium — reference data |
| MetalsController | 5 (CRUD) | 🟡 Medium — reference data |
| ProductTypesController | 5 (CRUD) | 🟡 Medium — reference data |
| OrderStatusController | 1 (GET) | Low |
| AdminController | 3 (image, load-images, csv) | Low |
| WebhookController | 1 (stripe webhook) | Low |

**Summary: ~60 of ~114 endpoints lack integration test coverage (~53%).**

## Test Patterns

### Setup / Teardown (per-test isolation)

```typescript
let testProductId: string | null = null;
const pool = getPool();

try {
  // SETUP: Insert test data directly in DB
  const result = await pool.query(`INSERT INTO ... RETURNING id`, [...]);
  testProductId = result.rows[0].id;

  // TEST: Call API
  const response = await request(app).get(`/api/products/${testProductId}`).expect(200);
  expect(response.body.data.id).toBe(testProductId);
} finally {
  // TEARDOWN: Clean up
  if (testProductId) {
    await pool.query('DELETE FROM product WHERE id = $1', [testProductId]);
  }
}
```

### UUID Validation Pattern

```typescript
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

expect(product.productTypeId).toMatch(uuidRegex);
expect(product.metalId).toMatch(uuidRegex);
expect(product.producerId).toMatch(uuidRegex);
```

## Known Issues (2026-02-11)

All previously identified UUID mapping issues have been fixed:

- ~~PositionsController: nested product object missing FK UUIDs~~ → **FIXED** (productTypeId, metalId, producerId, countryId + metal as object)
- ~~TransactionsController: productId not mapped to response~~ → **FIXED** (productId added to list mapper)
- ~~OrdersController: product FK details missing from response~~ → **FIXED** (product details + custodyService in mapper, findById SQL enhanced)
- ~~ProducersController: countryId present but no countryName~~ → **FIXED** (LEFT JOIN country on all CRUD endpoints)
