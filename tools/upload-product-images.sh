#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:8888}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SQL_FILE="${SQL_FILE:-$ROOT_DIR/initdb/03-sampleData.sql}"
IMAGES_DIR="${IMAGES_DIR:-$ROOT_DIR/initdb/images}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@goldsphere.vault}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
VERIFY_AFTER_UPLOAD="${VERIFY_AFTER_UPLOAD:-true}"
MODE="${MODE:-admin}"

if [[ -z "$ADMIN_PASSWORD" ]]; then
  read -r -s -p "Admin password: " ADMIN_PASSWORD
  echo ""
fi

if [[ ! -f "$SQL_FILE" ]]; then
  echo "SQL file not found: $SQL_FILE" >&2
  exit 1
fi

if [[ "$MODE" == "upload" && ! -d "$IMAGES_DIR" ]]; then
  echo "Images dir not found: $IMAGES_DIR" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required." >&2
  exit 1
fi

login_response=$(curl -sS -X POST "${BASE_URL}/api/auth/login" \
  -H "accept: application/json" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")

token=$(printf "%s" "$login_response" | python3 -c "import json,sys;\
data=json.load(sys.stdin);\
print(data.get('token','') if data.get('success') else '')")

if [[ -z "$token" ]]; then
  echo "Login failed. Response: $login_response" >&2
  exit 1
fi

if [[ "$MODE" == "admin" ]]; then
  response=$(curl -sS -X POST "${BASE_URL}/api/admin/products/load-images" \
    -H "Authorization: Bearer ${token}")
  echo "$response"
  exit 0
fi

mappings=()
while IFS= read -r line; do
  mappings+=("$line")
done < <(python3 - "$SQL_FILE" <<'PY'
import re
import sys

sql_path = sys.argv[1]
with open(sql_path, "r", encoding="utf-8") as f:
  content = f.read()

pattern = re.compile(
  r"\(\s*'(?P<name>[^']+)'\s*,.*?'(?P<imageUrl>[^']*)'\s*,\s*'(?P<imageFilename>[^']*)'\s*,\s*(true|false)",
  re.IGNORECASE | re.DOTALL,
)

seen = set()
for match in pattern.finditer(content):
  name = match.group("name").strip()
  image_filename = match.group("imageFilename").strip()
  if not image_filename:
    continue
  key = (image_filename.lower(), name.lower())
  if key in seen:
    continue
  seen.add(key)
  print(f"{image_filename}\t{name}")
PY
)

if [[ ${#mappings[@]} -eq 0 ]]; then
  echo "No image mappings found in $SQL_FILE" >&2
  exit 1
fi

uploaded=0
skipped=0
failed=0

for mapping in "${mappings[@]}"; do
  filename="${mapping%%$'\t'*}"
  product_name="${mapping#*$'\t'}"
  file_path="${IMAGES_DIR}/${filename}"

  if [[ ! -f "$file_path" ]]; then
    echo "Missing file: $file_path (product: $product_name)"
    skipped=$((skipped + 1))
    continue
  fi

  encoded_name=$(python3 - <<PY
import urllib.parse
print(urllib.parse.quote("$product_name"))
PY
)

  product_response=$(curl -sS "${BASE_URL}/api/products?search=${encoded_name}&limit=50")

  product_id=$(printf "%s" "$product_response" | python3 - <<'PY'
import json
import sys

name = sys.stdin.readline().rstrip("\n")

try:
  data = json.loads(sys.stdin.read())
except json.JSONDecodeError:
  print("")
  sys.exit(0)

items = data.get("data", {}).get("items", [])
name_lower = name.lower()
exact = [item for item in items if str(item.get("name", "")).lower() == name_lower]

if len(exact) == 1:
  print(exact[0].get("id", ""))
else:
  print("")
PY
<<EOF
$product_name
$product_response
EOF
)

  if [[ -z "$product_id" ]]; then
    echo "No exact match for product: $product_name"
    skipped=$((skipped + 1))
    continue
  fi

  payload=$(python3 - "$file_path" "$filename" <<'PY'
import base64
import json
import mimetypes
import sys

path = sys.argv[1]
filename = sys.argv[2]

mime, _ = mimetypes.guess_type(filename)
if not mime:
  ext = filename.lower().split(".")[-1]
  if ext in ("jpg", "jpeg"):
    mime = "image/jpeg"
  elif ext == "png":
    mime = "image/png"
  elif ext == "gif":
    mime = "image/gif"
  elif ext == "webp":
    mime = "image/webp"
  else:
    mime = "application/octet-stream"

with open(path, "rb") as f:
  image_base64 = base64.b64encode(f.read()).decode("ascii")

print(json.dumps({
  "imageBase64": image_base64,
  "contentType": mime,
  "filename": filename,
}))
PY
)

  upload_response=$(curl -sS -X POST "${BASE_URL}/api/products/${product_id}/image" \
    -H "accept: application/json" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -d "$payload")

  if printf "%s" "$upload_response" | python3 - <<'PY'
import json
import sys
try:
  data = json.load(sys.stdin)
except json.JSONDecodeError:
  sys.exit(1)

sys.exit(0 if data.get("success") else 1)
PY
  then
    uploaded=$((uploaded + 1))
    echo "Uploaded: $filename -> $product_name"
  else
    failed=$((failed + 1))
    echo "Upload failed: $filename -> $product_name | Response: $upload_response"
    continue
  fi

  if [[ "$VERIFY_AFTER_UPLOAD" == "true" ]]; then
    status=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/products/${product_id}/image")
    if [[ "$status" != "200" ]]; then
      echo "Verify failed for $product_name ($filename). Status: $status"
    fi
  fi

done

echo "Done. Uploaded: $uploaded, Skipped: $skipped, Failed: $failed"
