# Goldsphere Server – VM Deployment Guide

Step-by-step guide to deploy the goldsphere-server Docker image on a VM.

## Prerequisites

- Docker Engine ≥ 24.x (`docker --version`)
- Docker Compose v2 (`docker compose version`)
- Access to GitHub Container Registry (GHCR) – the image is published at `ghcr.io/marcopersi/goldsphere-server`

## Step 1: Authenticate with GHCR

The Docker image is stored in GitHub Packages (GHCR). You need a **Personal Access Token (PAT)** with `read:packages` scope.

```bash
# Create a PAT at: https://github.com/settings/tokens
# Required scope: read:packages

echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

Verify login:

```bash
docker pull ghcr.io/marcopersi/goldsphere-server:latest
```

## Step 2: Prepare deployment files

Create a deployment directory on the VM:

```bash
mkdir -p ~/goldsphere && cd ~/goldsphere
```

You need these files from the repository:

| File | Purpose |
|------|---------|
| `docker-compose.prod.yml` | Production compose file (uses GHCR image) |
| `.env` | Environment configuration |
| `initdb/` | Database initialization scripts (SQL) |

### Option A: Clone the repo (recommended for first setup)

```bash
git clone https://github.com/marcopersi/goldsphere-server.git .
```

### Option B: Copy only required files

```bash
scp docker-compose.prod.yml user@vm:~/goldsphere/
scp .env.example user@vm:~/goldsphere/.env
scp -r initdb/ user@vm:~/goldsphere/initdb/
```

## Step 3: Configure environment variables

```bash
cp .env.example .env
nano .env   # or vim .env
```

### Required variables (MUST be set)

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_USER` | PostgreSQL username | `goldsphere` |
| `DB_PASSWORD` | PostgreSQL password (strong!) | `S3cur3P@ssw0rd!` |
| `DB_NAME` | Database name | `goldsphere` |
| `JWT_SECRET` | JWT signing secret (generate!) | see below |
| `APP_VERSION` | Docker image version tag | `latest` or `1.2.3` |

### Generate a secure JWT_SECRET

```bash
openssl rand -base64 64
```

Copy the output into `.env` as `JWT_SECRET=...`.

### Optional variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `11215` | Server port |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_POOL_MAX` | `20` | Max DB connections |
| `SMTP_HOST` | – | Email server |
| `STRIPE_SECRET_KEY` | – | Stripe API key |
| `PGADMIN_EMAIL` | `admin@goldsphere.local` | PgAdmin login email |
| `PGADMIN_PASSWORD` | `admin` | PgAdmin login password |
| `PGADMIN_PORT` | `8880` | PgAdmin exposed port |
| `ENABLE_IMAGE_SEED` | `false` | Set `true` to auto-load product images on startup |
| `ADMIN_EMAIL` | – | Admin login for image seeding |
| `ADMIN_PASSWORD` | – | Admin password for image seeding |

### Example `.env` for production

```env
NODE_ENV=production
PORT=11215
APP_VERSION=latest

DB_USER=goldsphere
DB_PASSWORD=MyStr0ngP@ssword!
DB_NAME=goldsphere
DB_PORT=5432
DB_POOL_MAX=20
DB_POOL_MIN=5

JWT_SECRET=<output from openssl rand -base64 64>

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

ADMIN_EMAIL=admin@goldsphere.vault
ADMIN_PASSWORD=admin123
ENABLE_IMAGE_SEED=true
```

## Step 4: Start the stack

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

This starts:
1. **postgres** – PostgreSQL 16 database (with healthcheck)
2. **db-init** – One-shot initializer that runs `initdb/init.sql` only if the schema is missing
3. **goldsphere-server** – API server (waits for DB to be healthy and db-init to finish)
4. **pgadmin** – PgAdmin UI for database inspection
5. **image-seed** – One-shot initializer that loads product images via the admin API (only when `ENABLE_IMAGE_SEED=true`)

### One-time DB initialization (safe re-run)

If the database is empty or missing tables, you can trigger the initializer manually:

```bash
docker compose -f docker-compose.prod.yml --env-file .env run --rm db-init
```

This checks for the `users` table and runs `initdb/init.sql` only when it is missing.
Do not run this on a non-empty database unless you intend to rebuild the schema.

### Verify startup

```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs -f goldsphere-server

# Verify API is reachable
curl http://localhost:11215/api/health
```

Expected output in logs:

```
Server is running on port 11215
```

## Step 5: Deploy a specific version

To pin a specific release version instead of `latest`:

```bash
# In .env, set:
APP_VERSION=1.2.3

# Then:
docker compose -f docker-compose.prod.yml --env-file .env pull
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

To see available versions:

```bash
# List tags from GHCR
docker image ls ghcr.io/marcopersi/goldsphere-server
```

Or check the [GitHub Packages page](https://github.com/marcopersi/goldsphere-server/pkgs/container/goldsphere-server).

## Common Operations

### Update to latest version

```bash
cd ~/goldsphere
docker compose -f docker-compose.prod.yml --env-file .env pull
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

### View logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Only server
docker compose -f docker-compose.prod.yml logs -f goldsphere-server

# Only database
docker compose -f docker-compose.prod.yml logs -f postgres
```

### Stop the stack

```bash
docker compose -f docker-compose.prod.yml --env-file .env down
```

### Stop and remove data (⚠️ DESTRUCTIVE – deletes database!)

```bash
docker compose -f docker-compose.prod.yml --env-file .env down -v
```

### Restart a single service

```bash
docker compose -f docker-compose.prod.yml --env-file .env restart goldsphere-server
```

### Database backup

```bash
docker exec postgres-goldsphere-db pg_dump -U goldsphere goldsphere > backup_$(date +%Y%m%d).sql
```

### Database restore
### PgAdmin

PgAdmin is part of `docker-compose.prod.yml` and is reachable at:

```
http://<vm-ip>:8880
```

Default credentials are controlled by:

- `PGADMIN_EMAIL` (default: admin@goldsphere.local)
- `PGADMIN_PASSWORD` (default: admin)

Set these in `.env` for production.

```bash
cat backup_20260210.sql | docker exec -i postgres-goldsphere-db psql -U goldsphere goldsphere
```

### Load product images into the database

If product image files are available under `initdb/images`, you can load them
into `product.imageData` using the admin endpoint:

```bash
curl -X POST "http://localhost:${PORT:-11215}/api/admin/products/load-images" \
	-H "Authorization: Bearer <admin_jwt>"

For automated startup seeding in production, ensure all of the following:

- `ENABLE_IMAGE_SEED=true`
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` match an existing admin user
- `initdb/images` exists on the host next to `docker-compose.prod.yml`
```

The server reads images from `PRODUCT_IMAGES_DIR` when set, otherwise from
`/app/initdb/images` (mounted from `./initdb/images`).

## Troubleshooting

### Server can't connect to database

```
Error: connect ECONNREFUSED 172.x.x.x:5432
```

- Check if postgres is healthy: `docker compose -f docker-compose.prod.yml ps`
- Verify `DB_USER`, `DB_PASSWORD`, `DB_NAME` match in `.env`
- Wait for postgres healthcheck (can take up to 30s on first start)

### Authentication errors

```
FATAL: password authentication failed for user "goldsphere"
```

- Database was already initialized with different credentials
- Either reset: `docker compose -f docker-compose.prod.yml down -v && docker compose -f docker-compose.prod.yml --env-file .env up -d`
- Or update the password in PostgreSQL manually

### Image pull fails

```
Error: denied: permission denied
```

- Re-authenticate: `docker login ghcr.io -u USERNAME --password-stdin`
- Check PAT has `read:packages` scope
- For private repos: PAT also needs `repo` scope

## File Overview

| File | Environment | Image Source |
|------|-------------|--------------|
| `docker-compose.yml` | Local development | `build:` (builds from source) |
| `docker-compose.prod.yml` | Production / VM | `image:` from GHCR |
| `.env.example` | Template | Copy to `.env` |
| `.env` | Runtime config | **Never commit!** |
