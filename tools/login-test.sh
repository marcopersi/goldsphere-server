#!/usr/bin/env bash
set -euo pipefail

API_URL="${1:-http://74.234.34.230:8888}"
EMAIL="${2:-bank.technical@goldsphere.vault}"
PASSWORD="${3:-GoldspherePassword}"

curl -X POST "${API_URL}/api/auth/login" \
  -H "accept: application/json" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}"
