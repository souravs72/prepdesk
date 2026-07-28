#!/usr/bin/env bash
# Force-regenerate a 2-UUID bypass key (~73 chars).
set -euo pipefail
DIR="${HOME}/.config/prepdesk"
FILE="${DIR}/bypass.key"
mkdir -p "$DIR"
KEY="$(node -e "const {randomUUID}=require('crypto');process.stdout.write(randomUUID()+'-'+randomUUID())")"
printf '%s\n' "$KEY" > "$FILE"
chmod 600 "$FILE"
echo "$KEY"
echo
echo "Saved (${#KEY} chars) → $FILE"
