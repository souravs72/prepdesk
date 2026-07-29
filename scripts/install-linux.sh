#!/usr/bin/env bash
# Install Prepilo for the current user from an AppImage (local path or GitHub release).
# Handles missing FUSE by extracting the AppImage once.
#
# Usage:
#   ./scripts/install-linux.sh --download
#   ./scripts/install-linux.sh ./Prepilo-*.AppImage
#   curl -fsSL https://raw.githubusercontent.com/souravs72/prepilo/main/scripts/install-linux.sh | bash -s -- --download
set -euo pipefail

REPO="${PREPILO_REPO:-souravs72/prepilo}"
BRANCH="${PREPILO_BRANCH:-main}"
RAW="https://raw.githubusercontent.com/${REPO}/${BRANCH}"
BIN="${HOME}/.local/bin"
APPS="${HOME}/.local/share/applications"
ICON_BASE="${HOME}/.local/share/icons/hicolor"
OPT="${HOME}/.local/opt/prepilo"
mkdir -p "$BIN" "$APPS" "$OPT" "$OPT/download"

# Resolve repo root when running from a git checkout; empty when curled.
ROOT=""
if [[ -n "${BASH_SOURCE[0]:-}" && -f "${BASH_SOURCE[0]}" ]]; then
  _script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
  if [[ -f "$(dirname "$_script")/run-prepilo.sh" ]]; then
    ROOT="$(cd "$(dirname "$_script")/.." && pwd)"
  fi
fi

notify() {
  echo "$*"
  command -v notify-send >/dev/null 2>&1 && notify-send -a Prepilo "Prepilo" "$*" || true
}

write_runner() {
  cat > "${OPT}/run-prepilo.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
OPT="${HOME}/.local/opt/prepilo"
BIN_EXTRACTED="${OPT}/squashfs-root/prepilo"
APPIMAGE="${OPT}/Prepilo.AppImage"
CFG="${HOME}/.config/prepilo"
mkdir -p "$CFG"
unset ELECTRON_RUN_AS_NODE ELECTRON_NO_ATTACH_CONSOLE || true
ARGS=(--no-sandbox)
if [[ "${PREPILO_ENABLE_GPU:-0}" != "1" && ! -f "${CFG}/enable-gpu" ]]; then
  ARGS+=(--disable-gpu --disable-gpu-sandbox)
fi
if [[ -x "$BIN_EXTRACTED" ]]; then
  exec "$BIN_EXTRACTED" "${ARGS[@]}" "$@"
fi
if [[ -x "$APPIMAGE" ]]; then
  export APPIMAGE_EXTRACT_AND_RUN="${APPIMAGE_EXTRACT_AND_RUN:-1}"
  exec "$APPIMAGE" "${ARGS[@]}" "$@"
fi
echo "Prepilo is not installed." >&2
exit 1
EOF
  chmod +x "${OPT}/run-prepilo.sh"
}

write_uninstaller() {
  cat > "${OPT}/uninstall.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
OPT="${HOME}/.local/opt/prepilo"
pkill -f "${OPT}/squashfs-root/prepilo" 2>/dev/null || true
pkill -f 'Prepilo.AppImage' 2>/dev/null || true
sleep 0.3
rm -f "${HOME}/.local/bin/prepilo"
rm -f "${HOME}/.local/share/applications/prepilo.desktop"
rm -rf "$OPT"
for size in 16 24 32 48 64 128 256 512 1024; do
  rm -f "${HOME}/.local/share/icons/hicolor/${size}x${size}/apps/prepilo.png"
done
gtk-update-icon-cache -f -t "${HOME}/.local/share/icons/hicolor" 2>/dev/null || true
update-desktop-database "${HOME}/.local/share/applications" 2>/dev/null || true
echo "Prepilo removed."
EOF
  chmod +x "${OPT}/uninstall.sh"
}

install_icons_from_tree() {
  local tree="$1"
  local sizes=(16 24 32 48 64 128 256 512 1024)
  for size in "${sizes[@]}"; do
    local src="${tree}/usr/share/icons/hicolor/${size}x${size}/apps/prepilo.png"
    if [[ -f "$src" ]]; then
      mkdir -p "${ICON_BASE}/${size}x${size}/apps"
      cp -L "$src" "${ICON_BASE}/${size}x${size}/apps/prepilo.png"
    fi
  done
  if [[ -n "$ROOT" && ! -f "${ICON_BASE}/256x256/apps/prepilo.png" ]]; then
    for size in 16 32 48 128 256 512; do
      local src="${ROOT}/electron/icons/${size}x${size}.png"
      [[ -f "$src" ]] || continue
      mkdir -p "${ICON_BASE}/${size}x${size}/apps"
      cp "$src" "${ICON_BASE}/${size}x${size}/apps/prepilo.png"
    done
  fi
  gtk-update-icon-cache -f -t "$ICON_BASE" 2>/dev/null || true
}

write_desktop() {
  cat > "${APPS}/prepilo.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Prepilo
Comment=Interview prep study desk
Exec=${OPT}/run-prepilo.sh
Icon=prepilo
Terminal=false
Categories=Education;Development;
StartupNotify=true
StartupWMClass=prepilo
EOF
  update-desktop-database "$APPS" 2>/dev/null || true
}

download_latest_appimage() {
  local out="$1"
  echo "Downloading latest Prepilo AppImage from GitHub (${REPO})…"
  rm -rf "$OPT/download"
  mkdir -p "$OPT/download"
  if command -v gh >/dev/null 2>&1; then
    gh release download -R "$REPO" -p 'Prepilo-*-linux-x86_64.AppImage' -D "$OPT/download" --clobber
  else
    local api="https://api.github.com/repos/${REPO}/releases/latest"
    local url
    url="$(curl -fsSL "$api" | python3 -c 'import sys,json,re; d=json.load(sys.stdin); print(next(a["browser_download_url"] for a in d.get("assets",[]) if re.search(r"Prepilo-.*-linux-x86_64\\.AppImage$", a["name"])))')"
    curl -fL --progress-bar -o "$OPT/download/Prepilo.AppImage" "$url"
  fi
  local found
  found="$(ls -1 "$OPT"/download/Prepilo-*-linux-x86_64.AppImage 2>/dev/null | sort -V | tail -1 || true)"
  [[ -n "$found" ]] || found="$(ls -1 "$OPT"/download/*.AppImage 2>/dev/null | head -1 || true)"
  [[ -n "$found" && -f "$found" ]] || {
    echo "Download failed." >&2
    exit 1
  }
  cp "$found" "$out"
  chmod +x "$out"
}

APPIMAGE=""
DO_DOWNLOAD=0
for arg in "$@"; do
  case "$arg" in
    --download|download|github) DO_DOWNLOAD=1 ;;
    *.AppImage) APPIMAGE="$arg" ;;
  esac
done

if [[ -z "$APPIMAGE" && "$DO_DOWNLOAD" -eq 0 ]]; then
  if [[ -n "$ROOT" && -f "$ROOT/release/"Prepilo-*-linux-x86_64.AppImage ]]; then
    APPIMAGE="$(ls -1 "$ROOT/release/"Prepilo-*-linux-x86_64.AppImage | sort -V | tail -1)"
  else
    DO_DOWNLOAD=1
  fi
fi

DEST_APPIMAGE="${OPT}/Prepilo.AppImage"
if [[ "$DO_DOWNLOAD" -eq 1 ]]; then
  download_latest_appimage "$DEST_APPIMAGE"
elif [[ -n "$APPIMAGE" && -f "$APPIMAGE" ]]; then
  cp "$APPIMAGE" "$DEST_APPIMAGE"
  chmod +x "$DEST_APPIMAGE"
else
  echo "Usage: $0 [--download] [Prepilo-*.AppImage]" >&2
  exit 1
fi

write_runner
write_uninstaller

echo "Extracting AppImage (works without FUSE)…"
rm -rf "${OPT}/squashfs-root"
(
  cd "$OPT"
  ./Prepilo.AppImage --appimage-extract >/dev/null
)
chmod +x "${OPT}/squashfs-root/prepilo" "${OPT}/squashfs-root/AppRun"

install_icons_from_tree "${OPT}/squashfs-root"
write_desktop
ln -sfn "${OPT}/run-prepilo.sh" "${BIN}/prepilo"

notify "Prepilo installed. Open it from the app menu or run: prepilo"
echo
echo "Installed to:  $OPT"
echo "Command:       prepilo"
echo "Desktop:       $APPS/prepilo.desktop"
echo "Uninstall:     ${OPT}/uninstall.sh"
