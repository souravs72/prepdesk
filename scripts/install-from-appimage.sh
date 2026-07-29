#!/usr/bin/env bash
# Install Prepilo from a downloaded AppImage or from this source tree.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN="${HOME}/.local/bin"
APPS="${HOME}/.local/share/applications"
ICONS="${HOME}/.local/share/icons/hicolor/256x256/apps"
mkdir -p "$BIN" "$APPS" "$ICONS"

APPIMAGE=""
if [[ "${1:-}" == *.AppImage ]]; then
  APPIMAGE="$1"
elif [[ -f "$ROOT/release/"Prepilo-*-linux-x86_64.AppImage ]]; then
  APPIMAGE="$(ls -1 "$ROOT/release/"Prepilo-*-linux-x86_64.AppImage | sort -V | tail -1)"
fi

if [[ -n "$APPIMAGE" && -f "$APPIMAGE" ]]; then
  DEST="${HOME}/.local/opt/prepilo"
  mkdir -p "$DEST"
  cp "$APPIMAGE" "$DEST/Prepilo.AppImage"
  chmod +x "$DEST/Prepilo.AppImage"
  ln -sfn "$DEST/Prepilo.AppImage" "$BIN/prepilo"
  if [[ -f "$ROOT/electron/icons/icon.png" ]]; then
    cp "$ROOT/electron/icons/icon.png" "$ICONS/prepilo.png"
  fi
  cat > "$APPS/prepilo.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Prepilo
Comment=Interview prep study desk
Exec=$BIN/prepilo
Icon=prepilo
Terminal=false
Categories=Education;Development;
StartupNotify=true
EOF
  update-desktop-database "$APPS" 2>/dev/null || true
  echo "Installed AppImage → prepilo"
  echo "Optional GTK lock (from source): cd $ROOT && npm run install-lock"
  exit 0
fi

echo "No AppImage found."
echo "Build one:  npm run dist"
echo "Or pass:    $0 /path/to/Prepilo-*-linux-x86_64.AppImage"
exit 1
