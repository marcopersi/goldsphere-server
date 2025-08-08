#!/bin/bash

# Database Recreation Script
# Connects to Docker PostgreSQL and runs schema.sql

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if .env.dev exists
if [ ! -f ".env.dev" ]; then
    print_error ".env.dev file not found"
    exit 1
fi

# Source environment variables
source .env.dev

# Extract database connection details
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-goldsphere}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}

print_info "Database recreation starting..."
print_info "Host: $DB_HOST"
print_info "Port: $DB_PORT"
print_info "Database: $DB_NAME"
print_info "User: $DB_USER"

# Check if schema.sql exists
if [ ! -f "ddl/schema.sql" ]; then
    print_error "ddl/schema.sql file not found"
    exit 1
fi

# Set PGPASSWORD environment variable to avoid password prompt
export PGPASSWORD="$DB_PASSWORD"

# Test database connection
print_info "Testing database connection..."
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    print_error "Cannot connect to database. Make sure Docker PostgreSQL is running."
    print_info "Try: docker-compose up -d"
    exit 1
fi

print_success "Database connection successful"

# Run schema.sql
print_info "Running schema.sql..."
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "ddl/schema.sql"; then
    print_success "Schema applied successfully"
else
    print_error "Failed to apply schema"
    exit 1
fi

# Optionally run sample data
if [ -f "ddl/sampleData.sql" ]; then
    read -p "Do you want to load sample data? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Loading sample data..."
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "ddl/sampleData.sql"; then
            print_success "Sample data loaded successfully"
        else
            print_warning "Failed to load sample data"
        fi
    fi
fi

print_success "Database recreation completed!"
