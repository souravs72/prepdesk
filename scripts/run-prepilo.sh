#!/usr/bin/env bash
# Launch installed Prepilo (extracted AppImage / local package).
set -euo pipefail

OPT="${HOME}/.local/opt/prepilo"
BIN_EXTRACTED="${OPT}/squashfs-root/prepilo"
APPIMAGE="${OPT}/Prepilo.AppImage"
CFG="${HOME}/.config/prepilo"
mkdir -p "$CFG"

unset ELECTRON_RUN_AS_NODE ELECTRON_NO_ATTACH_CONSOLE || true

ARGS=(--no-sandbox)
# Software rendering is more reliable across Linux GPUs / nested sessions.
# Opt out: touch ~/.config/prepilo/enable-gpu  or  PREPILO_ENABLE_GPU=1
if [[ "${PREPILO_ENABLE_GPU:-0}" != "1" && ! -f "${CFG}/enable-gpu" ]]; then
  ARGS+=(--disable-gpu --disable-gpu-sandbox)
fi

if [[ -x "$BIN_EXTRACTED" ]]; then
  exec "$BIN_EXTRACTED" "${ARGS[@]}" "$@"
fi

if [[ -x "$APPIMAGE" ]]; then
  # Avoid FUSE requirement when possible
  export APPIMAGE_EXTRACT_AND_RUN="${APPIMAGE_EXTRACT_AND_RUN:-1}"
  exec "$APPIMAGE" "${ARGS[@]}" "$@"
fi

echo "Prepilo is not installed. Run: scripts/install-linux.sh" >&2
if command -v notify-send >/dev/null 2>&1; then
  notify-send -a Prepilo "Prepilo" "Not installed. Run scripts/install-linux.sh" || true
fi
exit 1
