#!/usr/bin/env bash

set -euo pipefail

if [ -z "${1:-}" ]; then
    echo "Usage: $0 <path_to_ipa_file>"
    exit 1
fi

IPA_FILE="$1"

if [ ! -f "$IPA_FILE" ]; then
    echo "[-] Error: File '$IPA_FILE' not found."
    exit 1
fi

EXTRACT_DIR="extracted_$(basename "$IPA_FILE" .ipa)"

echo "[*] Unpacking '$IPA_FILE' into '$EXTRACT_DIR'..."
rm -rf "$EXTRACT_DIR"
unzip -q "$IPA_FILE" -d "$EXTRACT_DIR"

APP_DIR=$(find "$EXTRACT_DIR/Payload" -mindepth 1 -maxdepth 1 -type d -name "*.app" | head -n 1)

if [ -z "$APP_DIR" ]; then
    echo "[-] Error: No .app bundle found inside Payload directory."
    exit 1
fi

echo "[+] App Bundle Found: $(basename "$APP_DIR")"
echo "------------------------------------------------------------"

# Extract strings and run filtering via inline Python script
python3 -c "
import sys, os, re, subprocess

app_dir = sys.argv[1]

# Common benign domain patterns to filter out false positives
WHITELIST_DOMAINS = [
    r'.*\.apple\.com$', r'.*\.flutter\.dev$', r'.*\.w3\.org$',
    r'.*\.openssl\.org$', r'.*\.haxx\.se$', r'.*\.curl\.se$',
    r'.*\.gnu\.org$', r'.*\.pub\.dev$'
]

IP_REGEX = re.compile(r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b')
URL_REGEX = re.compile(r'https?://[a-zA-Z0-9.\-_]+(?::\d+)?(?:/[a-zA-Z0-9._%~/-]*)?')

def is_whitelisted(domain):
    for pattern in WHITELIST_DOMAINS:
        if re.match(pattern, domain, re.IGNORECASE):
            return True
    return False

found_ips = set()
found_urls = set()

# Collect files to scan: main binary, dylibs, frameworks
files_to_scan = []
for root, _, files in os.walk(app_dir):
    for f in files:
        filepath = os.path.join(root, f)
        # Check if file is executable or shared library or App binary
        if f.endswith(('.dylib', 'App')) or os.access(filepath, os.X_OK):
            files_to_scan.append(filepath)

print(f'[*] Extracting strings from {len(files_to_scan)} binary target(s)...')

for filepath in files_to_scan:
    try:
        rel_path = os.path.relpath(filepath, app_dir)
        proc = subprocess.run(['strings', filepath], capture_output=True, text=True, errors='ignore')
        strings_output = proc.stdout

        # Scan for IPv4
        for ip in IP_REGEX.findall(strings_output):
            # Ignore localhost, broadcast, or zero IPs
            if not ip.startswith(('127.', '0.', '255.')):
                found_ips.add((ip, rel_path))

        # Scan for URLs
        for url in URL_REGEX.findall(strings_output):
            domain_match = re.search(r'https?://([^/:]+)', url)
            if domain_match:
                domain = domain_match.group(1)
                if not is_whitelisted(domain):
                    found_urls.add((url, rel_path))

    except Exception as e:
        continue

print('\n[!] Suspicious IPv4 Addresses Detected:')
if found_ips:
    for ip, source in sorted(found_ips):
        print(f'  - {ip:<18} (in {source})')
else:
    print('  None found.')

print('\n[!] Non-Standard / Potential C2 URLs Detected:')
if found_urls:
    for url, source in sorted(found_urls):
        print(f'  - {url:<60} (in {source})')
else:
    print('  None found.')

" "$APP_DIR"

echo "------------------------------------------------------------"
echo "[+] Analysis complete. Unpacked files stored in '$EXTRACT_DIR'."
