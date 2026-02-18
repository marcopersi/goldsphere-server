#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

get_env_var() {
  local key="$1"
  local value
  value=$(grep -E "^${key}=" .env | head -n1 | cut -d'=' -f2- || true)
  if [[ -z "$value" ]]; then
    echo "Missing required .env variable: $key" >&2
    exit 1
  fi
  echo "$value"
}

PORT="$(get_env_var PORT)"
DB_USER="$(get_env_var DB_USER)"
DB_NAME="$(get_env_var DB_NAME)"

API_BASE_URL="http://localhost:${PORT}"
ADMIN_EMAIL="admin@goldsphere.vault"
ADMIN_PASSWORD="admin123"

LOGIN_RESPONSE=$(curl -sS -w "\n%{http_code}" -X POST "${API_BASE_URL}/api/auth/login" \
  -H "accept: application/json" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")

LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')
LOGIN_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)

if [[ "$LOGIN_CODE" -lt 200 || "$LOGIN_CODE" -ge 300 ]]; then
  echo "Login failed HTTP ${LOGIN_CODE}" >&2
  echo "$LOGIN_BODY" >&2
  exit 1
fi

TOKEN=$(echo "$LOGIN_BODY" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
if [[ -z "$TOKEN" ]]; then
  TOKEN=$(echo "$LOGIN_BODY" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
fi
if [[ -z "$TOKEN" ]]; then
  echo "Could not extract JWT token from login response" >&2
  echo "$LOGIN_BODY" >&2
  exit 1
fi

uploaded=0
missing=0
failed=0

while IFS=$'\t' read -r product_id filename; do
  [[ -z "$product_id" || -z "$filename" ]] && continue

  file_path="initdb/images/${filename}"
  if [[ ! -f "$file_path" ]]; then
    echo "MISSING: ${filename}"
    missing=$((missing + 1))
    continue
  fi

  http_code=$(curl -sS -o /tmp/upload_resp.json -w "%{http_code}" \
    -X POST "${API_BASE_URL}/api/admin/products/${product_id}/image" \
    -H "Authorization: Bearer ${TOKEN}" \
    -F "image=@${file_path}")

  if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
    uploaded=$((uploaded + 1))
  else
    echo "FAILED: ${filename} (HTTP ${http_code})"
    cat /tmp/upload_resp.json
    failed=$((failed + 1))
  fi
done < <(docker exec postgres-goldsphere-db psql -U "$DB_USER" -d "$DB_NAME" -At -F $'\t' -c "SELECT id, imagefilename FROM product WHERE imagefilename IS NOT NULL AND imagefilename <> '';" )

seeded_in_db=$(docker exec postgres-goldsphere-db psql -U "$DB_USER" -d "$DB_NAME" -At -c "SELECT COUNT(*) FROM product WHERE imagedata IS NOT NULL;")

echo "UPLOAD_SUMMARY uploaded=${uploaded} missing=${missing} failed=${failed} imagedata_rows=${seeded_in_db}"