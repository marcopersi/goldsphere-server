#!/bin/bash
# Database Reset and Initialization Script
# Resets the PostgreSQL database and runs all init scripts

set -e  # Exit on error

echo "🔄 Resetting GoldSphere Database..."

# Check if container is running
if ! docker ps | grep -q postgres-goldsphere-db; then
  echo "❌ PostgreSQL container is not running!"
  echo "💡 Start it with: docker-compose up -d postgres"
  exit 1
fi

# Get credentials from .env
source .env

echo "📦 Database: $DB_NAME"
echo "👤 User: $DB_USER"
echo ""

# Drop and recreate database
echo "🗑️  Dropping database..."
docker exec -i postgres-goldsphere-db psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS $DB_NAME;" postgres 2>/dev/null || true

echo "✨ Creating database..."
docker exec -i postgres-goldsphere-db psql -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;" postgres

# Run initialization scripts in order
echo ""
echo "📝 Running initialization scripts..."

echo "  1️⃣  Schema..."
docker exec -i postgres-goldsphere-db psql -U "$DB_USER" -d "$DB_NAME" < initdb/01-schema.sql

echo "  2️⃣  Initial Load..."
docker exec -i postgres-goldsphere-db psql -U "$DB_USER" -d "$DB_NAME" < initdb/02-initialLoad.sql

echo "  3️⃣  Sample Data..."
docker exec -i postgres-goldsphere-db psql -U "$DB_USER" -d "$DB_NAME" < initdb/03-sampleData.sql

echo "  4️⃣  Enhanced User Registration..."
docker exec -i postgres-goldsphere-db psql -U "$DB_USER" -d "$DB_NAME" < initdb/04-enhanced-user-registration.sql

echo ""
echo "✅ Database reset complete!"
echo ""
echo "📊 Database Status:"
docker exec -i postgres-goldsphere-db psql -U "$DB_USER" -d "$DB_NAME" -c "\dt" | head -20

echo ""
echo "🎉 Ready to go! Start the server with: npm run dev"
