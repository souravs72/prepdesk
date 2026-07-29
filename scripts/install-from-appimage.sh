#!/usr/bin/env bash
# Back-compat wrapper → install-linux.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec "$ROOT/scripts/install-linux.sh" "$@"
