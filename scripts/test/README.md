# Test Scripts

This directory contains automated test scripts for the GoldSphere Server API.

## Prerequisites

- Server must be running on `http://localhost:8888`
- Database must be initialized with sample data
- Admin user must exist: `admin@goldsphere.vault` / `admin123`

## Available Tests

### 1. Order Creation Test (`order_creation.sh`)

Tests the corrected Order API with frontend-minimal requests:
- **Purpose**: Validates the proper frontend/backend pattern where frontend sends minimal requests and backend enriches with product data
- **What it tests**: Authentication, product retrieval, order creation with minimal payload, backend enrichment
- **Expected outcome**: Order created with total price calculations (fees + taxes)

```bash
./scripts/test/order_creation.sh
```

### 2. Portfolio Creation Test (`portfolio_creation.sh`)

Tests automatic portfolio creation when orders reach "shipped" status:
- **Purpose**: Validates that portfolios are automatically created for users when their orders are fulfilled
- **What it tests**: Order creation, status updates, portfolio auto-creation, position insertion
- **Expected outcome**: New portfolio created with positions matching shipped order items

```bash
./scripts/test/portfolio_creation.sh
```

### 3. Position Selling Test (`position_selling.sh`)

Tests position deletion and portfolio behavior:
- **Purpose**: Validates that deleting positions doesn't cascade delete portfolios
- **What it tests**: Position deletion, portfolio persistence, cascade behavior
- **Expected outcome**: Positions deleted but empty portfolios remain

```bash
./scripts/test/position_selling.sh
```

## Test Data

All tests use the admin user and work with existing sample data in the database. Tests are designed to be non-destructive and can be run multiple times.

## Running All Tests

To run all tests in sequence:

```bash
cd scripts/test
./order_creation.sh && ./portfolio_creation.sh && ./position_selling.sh
```
