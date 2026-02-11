#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:8888}"

curl -X POST "${BASE_URL}/api/users" \
  -H "accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bank.technical@goldsphere.vault",
    "password": "GoldspherePassword1",
    "role": "user",
    "title": "Herr",
    "firstName": "Bank",
    "lastName": "Technical",
    "birthDate": "1990-01-15"
  }'
