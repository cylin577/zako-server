#!/usr/bin/env bash

set -euo pipefail

if [ -z "${1:-}" ]; then
    echo "Usage: $0 \"itms-services://?action=download-manifest&url=...\""
    exit 1
fi

ITMS_URL="$1"
USER_AGENT="Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1"

# Extract and URL-decode the manifest URL from the input string
MANIFEST_URL=$(python3 -c "import sys, urllib.parse; url = sys.argv[1].split('url=')[-1]; print(urllib.parse.unquote(url))" "$ITMS_URL")

echo "[*] Extracting manifest from: $MANIFEST_URL"

# Fetch manifest content
MANIFEST_CONTENT=$(curl -s -L -A "$USER_AGENT" -H "Referer: $MANIFEST_URL" "$MANIFEST_URL")

if [ -z "$MANIFEST_CONTENT" ]; then
    echo "[-] Error: Failed to fetch manifest plist."
    exit 1
fi

# Parse bundle-identifier and IPA URL from the XML plist
PARSED_INFO=$(python3 -c "
import sys, plistlib, re

data = sys.stdin.read()
match = re.search(r'<\?xml.*?</plist>', data, re.DOTALL)
if not match:
    sys.exit(1)

try:
    plist = plistlib.loads(match.group(0).encode('utf-8'))
    item = plist['items'][0]
    bundle_id = item['metadata']['bundle-identifier']
    ipa_url = next(asset['url'] for asset in item['assets'] if asset.get('kind') == 'software-package')
    print(f'{bundle_id}|{ipa_url}')
except Exception:
    sys.exit(1)
" <<< "$MANIFEST_CONTENT")

if [ -z "$PARSED_INFO" ]; then
    echo "[-] Error: Unable to parse bundle ID or package URL from manifest."
    exit 1
fi

BUNDLE_ID=$(echo "$PARSED_INFO" | cut -d'|' -f1)
IPA_URL=$(echo "$PARSED_INFO" | cut -d'|' -f2)
OUTPUT_FILENAME="${BUNDLE_ID}.ipa"

echo "[+] Bundle Identifier: $BUNDLE_ID"
echo "[+] IPA Target URL: $IPA_URL"
echo "[*] Downloading package to: $OUTPUT_FILENAME"

# Download the IPA payload
curl -L \
    -A "$USER_AGENT" \
    -H "Referer: $MANIFEST_URL" \
    "$IPA_URL" \
    -o "$OUTPUT_FILENAME"

echo "[+] Download complete: $OUTPUT_FILENAME"
