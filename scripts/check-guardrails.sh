#!/bin/bash
# Guardrails Script - Run after each implementation step
# Usage: ./scripts/check-guardrails.sh [step-name]

set -e  # Exit on any error

STEP_NAME="${1:-unnamed-step}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "🔒 GUARDRAILS CHECK: $STEP_NAME"
echo "========================================"
echo ""

# Step 1: Build Check
echo "📦 Step 1/4: Building TypeScript..."
if npm run build; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi
echo ""

# Step 2: Lint Check
echo "🔍 Step 2/4: Running ESLint..."
if npm run lint; then
    echo -e "${GREEN}✅ Lint passed${NC}"
else
    echo -e "${RED}❌ Lint errors found!${NC}"
    echo -e "${YELLOW}💡 Run 'npm run lint:fix' to auto-fix${NC}"
    exit 1
fi
echo ""

# Step 3: Unit & Contract Tests
echo "🧪 Step 3/4: Running Unit & Contract Tests..."
if npm run test; then
    echo -e "${GREEN}✅ Unit tests passed${NC}"
else
    echo -e "${RED}❌ Unit tests failed!${NC}"
    exit 1
fi
echo ""

# Step 4: Integration Tests (optional, can be skipped for small changes)
if [ "$2" == "--skip-integration" ]; then
    echo -e "${YELLOW}⚠️  Skipping integration tests (--skip-integration flag)${NC}"
else
    echo "🚀 Step 4/4: Running Integration Tests..."
    if npm run test:integration; then
        echo -e "${GREEN}✅ Integration tests passed${NC}"
    else
        echo -e "${RED}❌ Integration tests failed!${NC}"
        exit 1
    fi
fi
echo ""

echo "========================================"
echo -e "${GREEN}🎉 ALL GUARDRAILS PASSED!${NC}"
echo "✅ Build: OK"
echo "✅ Lint: OK"
echo "✅ Unit Tests: OK"
if [ "$2" != "--skip-integration" ]; then
    echo "✅ Integration Tests: OK"
fi
echo "========================================"
echo ""
echo "✨ Safe to commit: $STEP_NAME"
echo ""
