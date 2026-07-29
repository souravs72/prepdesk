#!/usr/bin/env bash
# Remove user-local Prepilo install (AppImage / extracted / desktop entry).
set -euo pipefail

BIN="${HOME}/.local/bin"
APPS="${HOME}/.local/share/applications"
ICON_BASE="${HOME}/.local/share/icons/hicolor"
OPT="${HOME}/.local/opt/prepilo"

# Stop running instances
pkill -f "${OPT}/squashfs-root/prepilo" 2>/dev/null || true
pkill -f 'Prepilo.AppImage' 2>/dev/null || true
sleep 0.5

rm -f "${BIN}/prepilo" "${BIN}/prepilo-appimage"
rm -f "${APPS}/prepilo.desktop"
rm -rf "$OPT"

for size in 16 24 32 48 64 128 256 512 1024; do
  rm -f "${ICON_BASE}/${size}x${size}/apps/prepilo.png"
done
gtk-update-icon-cache -f -t "$ICON_BASE" 2>/dev/null || true
update-desktop-database "$APPS" 2>/dev/null || true

echo "Prepilo removed from ~/.local (config in ~/.config/prepilo kept)."
echo "Purge config too:  rm -rf ~/.config/prepilo"
