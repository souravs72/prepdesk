#!/usr/bin/env bash
set -euo pipefail
FILE="${HOME}/.config/prepilo/bypass.key"
if [[ ! -f "$FILE" ]]; then
  echo "No bypass key yet. Run: prepilo-rotate-bypass" >&2
  exit 1
fi
KEY="$(tr -d '\n' < "$FILE")"
echo "$KEY"
echo
echo "Length: ${#KEY}  ·  File: $FILE"
echo "Paste is disabled in the lock UI — type it manually when needed."
