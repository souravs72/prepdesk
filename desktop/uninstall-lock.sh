#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Restore GNOME shortcuts if a previous lock crashed
/usr/bin/python3 "$ROOT/desktop/keybinds.py" restore 2>/dev/null || true

# Stop services / guard
systemctl --user disable --now prepdesk-retest.timer 2>/dev/null || true
systemctl --user disable --now prepdesk-guard.service 2>/dev/null || true
systemctl --user disable --now prepdesk-lock.service 2>/dev/null || true
pkill -f "desktop/session_guard.py" 2>/dev/null || true
pkill -f "desktop/native_lock.py" 2>/dev/null || true

rm -f "${HOME}/.config/systemd/user/prepdesk-retest.service"
rm -f "${HOME}/.config/systemd/user/prepdesk-retest.timer"
rm -f "${HOME}/.config/systemd/user/prepdesk-guard.service"
rm -f "${HOME}/.config/systemd/user/prepdesk-lock.service"
systemctl --user daemon-reload 2>/dev/null || true

rm -f "${HOME}/.config/autostart/prepdesk-lock.desktop"
rm -f "${HOME}/.config/autostart/prepdesk-guard.desktop"
rm -f "${HOME}/.config/autostart/prepdesk-restore-keys.desktop"
rm -f "${HOME}/.local/share/applications/prepdesk-logout.desktop"
rm -f "${HOME}/.local/share/applications/prepdesk-shutdown.desktop"
rm -f "${HOME}/.local/share/applications/prepdesk-reboot.desktop"
rm -f "${HOME}/.local/bin/prepdesk-lock"
rm -f "${HOME}/.local/bin/prepdesk-guard"
rm -f "${HOME}/.local/bin/prepdesk-end-session"
rm -f "${HOME}/.local/bin/prepdesk-show-bypass"
rm -f "${HOME}/.local/bin/prepdesk-rotate-bypass"

# Force unlock flag so a hung shell can exit if polled
mkdir -p "${HOME}/.config/prepdesk"
printf '%s\n' '{"unlocked":true,"reason":"uninstall","at":"'"$(date -Iseconds)"'"}' > "${HOME}/.config/prepdesk/lock-state.json"
printf '%s\n' '{"ok":true,"action":"login","reason":"uninstall"}' > "${HOME}/.config/prepdesk/gate-cleared.json"
rm -f "${HOME}/.config/prepdesk/session-guard.pid"
rm -f "${HOME}/.config/prepdesk/pending-session-end.json"

echo "PrepDesk Lock / Guard removed from autostart + systemd; keybinds restored if a backup existed."
echo "Keep ~/.config/prepdesk/bypass.key unless you pass --purge"
if [[ "${1:-}" == "--purge" ]]; then
  rm -rf "${HOME}/.config/prepdesk"
  echo "Purged ~/.config/prepdesk"
fi
