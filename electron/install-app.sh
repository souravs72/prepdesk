#!/usr/bin/env bash
# Install Prepilo study app (Electron) launcher — separate from GTK lock.
set -euo pipefail
SOURCE="${BASH_SOURCE[0]}"
while [[ -L "$SOURCE" ]]; do
  DIR="$(cd "$(dirname "$SOURCE")" && pwd)"
  SOURCE="$(readlink "$SOURCE")"
  [[ "$SOURCE" != /* ]] && SOURCE="$DIR/$SOURCE"
done
ROOT="$(cd "$(dirname "$SOURCE")/.." && pwd)"
BIN="$HOME/.local/bin"
APPS="$HOME/.local/share/applications"
mkdir -p "$BIN" "$APPS"

chmod +x "$ROOT/electron/prepilo-app"
ICON_SRC="$ROOT/electron/icons/icon.png"
if [[ -f "$ICON_SRC" ]]; then
  mkdir -p "$HOME/.local/share/icons/hicolor/256x256/apps" "$HOME/.local/share/icons/hicolor/512x512/apps"
  cp "$ICON_SRC" "$HOME/.local/share/icons/hicolor/256x256/apps/prepilo.png"
  cp "$ICON_SRC" "$HOME/.local/share/icons/hicolor/512x512/apps/prepilo.png"
fi

ln -sfn "$ROOT/electron/prepilo-app" "$BIN/prepilo"

# Build once so cold start can use dist/
if [[ ! -f "$ROOT/dist/index.html" ]]; then
  echo "Building web UI for Electron…"
  (cd "$ROOT" && npm run build)
fi

cat > "$APPS/prepilo.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Prepilo
Comment=Interview prep study UI (Electron)
Exec=$BIN/prepilo
Icon=prepilo
Terminal=false
Categories=Education;Development;
StartupNotify=true
EOF

echo "Installed Prepilo Electron app"
echo "  Command:  prepilo"
echo "  Desktop:  $APPS/prepilo.desktop"
echo
echo "Dev mode (hot reload):  npm run electron:dev"
echo "GTK lock (unchanged):   prepilo-lock / npm run install-lock"
