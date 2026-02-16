# Environment Configuration

This project uses multiple environment files for different deployment scenarios.

## Environment Files

### `.env` (Current Active Environment)
- Used for local development
- Contains your current working configuration
- **Not committed to git** (in .gitignore)

### `.env.example` (Template)
- Template file with all available configuration options
- Safe to commit to git (no sensitive data)
- Copy this to create new environment files

### `.env.dev` (Development Template)
- Template for development environment
- Includes relaxed security settings for development
- Test Stripe keys included

### `.env.prod` (Production Template)
- Template for production environment
- Strict security settings
- Live Stripe keys (replace with actual values)
- Performance optimizations enabled

### `.env.test` (Testing Environment)
- Used for automated tests
- Separate test database
- Mock/test API keys
- Minimal logging

### `.env.ci` (CI Test Environment)
- Committed CI-safe defaults for unit test execution in GitHub Actions
- Used as fallback when `.env.test` is not present in CI runners
- Contains only non-sensitive test values

## Usage

### For Local Development
```bash
# Copy the development template
cp .env.dev .env

# Or copy the example and customize
cp .env.example .env
```

### For Production Deployment
```bash
# Copy the production template
cp .env.prod .env

# Update with your actual production values:
# - Database credentials
# - JWT secret (64+ chars)
# - Live Stripe keys
# - Production domain names
# - API keys
```

### For Testing
```bash
# The .env.test file is automatically used by test frameworks
# Make sure your test database is set up correctly
```

`tests/setup.ts` validates required test env variables at startup and fails fast when missing/invalid.
Set `TEST_TIMEOUT_MS` in `.env.test` to control Jest timeout (no hardcoded fallback).
`tests/setup.ts` loads `.env.test` first and then `.env.ci` as fallback.

## Environment Variables

### Required Variables
- `NODE_ENV` - Environment type (development, test, production)
- `PORT` - Server port
- `DB_*` - Database connection settings
- `JWT_SECRET` - JWT signing secret (min 32 chars)
- `APP_BASE_URL` - Absolute backend base URL used for generated links and product image URLs
- `EMAIL_FROM` - Sender address for transactional emails
- `STRIPE_SECRET_KEY` - Stripe API secret key

At startup, runtime validation is executed via `src/config/environment.ts`.
If required variables are missing or invalid, the server fails fast with a clear startup error.

### Optional Variables
- `PGADMIN_EMAIL` - PgAdmin login email (production only)
- `PGADMIN_PASSWORD` - PgAdmin login password (production only)
- `PRODUCT_IMAGES_DIR` - Filesystem path for product images (default: /app/initdb/images)
- `ENABLE_IMAGE_SEED` - Set `true` to auto-load product images on startup (default: `false`)
- `ADMIN_EMAIL` - Admin login email for automated image seeding
- `ADMIN_PASSWORD` - Admin login password for automated image seeding
- `APP_BASE_URL` and `EMAIL_FROM` are startup-validated and required. The server fails fast if either value is missing or invalid.

### Stripe Configuration
- **Development/Test**: Use test keys (sk_test_...)
- **Production**: Use live keys (sk_live_...)
- **Webhook Secret**: Get from Stripe Dashboard after setting up webhook endpoint

### Security Notes
- Never commit `.env` files with real credentials
- Use strong, unique secrets for production
- Rotate secrets regularly
- Use environment-specific database names
- Restrict CORS origins in production

## Switching Environments

You can quickly switch between environments by copying the appropriate template:

```bash
# Switch to development
cp .env.dev .env

# Switch to production (then update secrets)
cp .env.prod .env

# Restart your application after changing .env
npm run dev
```
