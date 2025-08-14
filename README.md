# GoldSphere Server

[![CI/CD](https://github.com/marcopersi/goldsphere-server/workflows/CI%2FCD/badge.svg)](https://github.com/marcopersi/goldsphere-server/actions/workflows/ci-cd.yml)

The server including the business logic and integration for the goldsphere project.

## Getting Started

```bash
npm install
npm run build
npm start
```

## Development

```bash
npm run dev
```

## Payment API Testing

The project includes comprehensive payment integration tests that validate the entire Stripe payment flow.

### Quick Payment Test

Runs a fast integration test covering authentication, payment creation, retrieval, and validation:

```bash
# Ensure server is running first
npm start

# In a new terminal, run the test
npm run test:payment-quick
```

**Prerequisites:**
- Server running on `localhost:8080`
- Stripe CLI installed and logged in (`stripe login`)
- Stripe CLI forwarding webhooks: `stripe listen --forward-to localhost:8080/api/v1/payments/webhook`

**What it tests:**
1. Server health check
2. JWT authentication
3. Payment intent creation ($25 test transaction)
4. Payment intent retrieval
5. Payment confirmation validation (expected to fail without payment method)
6. Payment methods listing (expected to fail with test customer)
7. Authentication validation (unauthorized requests)

### Full Integration Tests

For comprehensive testing with automatic server/Stripe CLI management:

```bash
npm run test:payment-integration
```

The test will automatically:
- Start the server
- Start Stripe CLI webhook forwarding  
- Run all payment flow tests
- Clean up processes when complete

All tests validate real Stripe API integration with proper error handling and webhook processing.