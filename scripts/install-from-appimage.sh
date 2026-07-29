#!/usr/bin/env bash
# Install PrepDesk from a downloaded AppImage or from this source tree.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN="${HOME}/.local/bin"
APPS="${HOME}/.local/share/applications"
ICONS="${HOME}/.local/share/icons/hicolor/256x256/apps"
mkdir -p "$BIN" "$APPS" "$ICONS"

APPIMAGE=""
if [[ "${1:-}" == *.AppImage ]]; then
  APPIMAGE="$1"
elif [[ -f "$ROOT/release/"PrepDesk-*-linux-x86_64.AppImage ]]; then
  APPIMAGE="$(ls -1 "$ROOT/release/"PrepDesk-*-linux-x86_64.AppImage | sort -V | tail -1)"
fi

if [[ -n "$APPIMAGE" && -f "$APPIMAGE" ]]; then
  DEST="${HOME}/.local/opt/prepdesk"
  mkdir -p "$DEST"
  cp "$APPIMAGE" "$DEST/PrepDesk.AppImage"
  chmod +x "$DEST/PrepDesk.AppImage"
  ln -sfn "$DEST/PrepDesk.AppImage" "$BIN/prepdesk"
  if [[ -f "$ROOT/electron/icons/icon.png" ]]; then
    cp "$ROOT/electron/icons/icon.png" "$ICONS/prepdesk.png"
  fi
  cat > "$APPS/prepdesk.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=PrepDesk
Comment=Interview prep study desk
Exec=$BIN/prepdesk
Icon=prepdesk
Terminal=false
Categories=Education;Development;
StartupNotify=true
EOF
  update-desktop-database "$APPS" 2>/dev/null || true
  echo "Installed AppImage → prepdesk"
  echo "Optional GTK lock (from source): cd $ROOT && npm run install-lock"
  exit 0
fi

echo "No AppImage found."
echo "Build one:  npm run dist"
echo "Or pass:    $0 /path/to/PrepDesk-*-linux-x86_64.AppImage"
exit 1
