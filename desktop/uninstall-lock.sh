#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Restore GNOME shortcuts if a previous lock crashed
/usr/bin/python3 "$ROOT/desktop/keybinds.py" restore 2>/dev/null || true

# Stop retest timer if present
systemctl --user disable --now prepdesk-retest.timer 2>/dev/null || true
rm -f "${HOME}/.config/systemd/user/prepdesk-retest.service"
rm -f "${HOME}/.config/systemd/user/prepdesk-retest.timer"
systemctl --user daemon-reload 2>/dev/null || true

rm -f "${HOME}/.config/autostart/prepdesk-lock.desktop"
rm -f "${HOME}/.config/autostart/prepdesk-restore-keys.desktop"
rm -f "${HOME}/.local/bin/prepdesk-lock"
rm -f "${HOME}/.local/bin/prepdesk-show-bypass"
rm -f "${HOME}/.local/bin/prepdesk-rotate-bypass"

# Force unlock flag so a hung shell can exit if polled
mkdir -p "${HOME}/.config/prepdesk"
printf '%s\n' '{"unlocked":true,"reason":"uninstall","at":"'"$(date -Iseconds)"'"}' > "${HOME}/.config/prepdesk/lock-state.json"

echo "PrepDesk Lock removed from autostart; keybinds restored if a backup existed."
echo "Keep ~/.config/prepdesk/bypass.key unless you pass --purge"
if [[ "${1:-}" == "--purge" ]]; then
  rm -rf "${HOME}/.config/prepdesk"
  echo "Purged ~/.config/prepdesk"
fi
