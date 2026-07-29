#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Restore GNOME shortcuts if a previous lock crashed
/usr/bin/python3 "$ROOT/desktop/keybinds.py" restore 2>/dev/null || true

# Stop services / guard
systemctl --user disable --now prepilo-retest.timer 2>/dev/null || true
systemctl --user disable --now prepilo-guard.service 2>/dev/null || true
systemctl --user disable --now prepilo-lock.service 2>/dev/null || true
pkill -f "desktop/session_guard.py" 2>/dev/null || true
pkill -f "desktop/native_lock.py" 2>/dev/null || true

rm -f "${HOME}/.config/systemd/user/prepilo-retest.service"
rm -f "${HOME}/.config/systemd/user/prepilo-retest.timer"
rm -f "${HOME}/.config/systemd/user/prepilo-guard.service"
rm -f "${HOME}/.config/systemd/user/prepilo-lock.service"
systemctl --user daemon-reload 2>/dev/null || true

rm -f "${HOME}/.config/autostart/prepilo-lock.desktop"
rm -f "${HOME}/.config/autostart/prepilo-guard.desktop"
rm -f "${HOME}/.config/autostart/prepilo-restore-keys.desktop"
rm -f "${HOME}/.local/share/applications/prepilo-logout.desktop"
rm -f "${HOME}/.local/share/applications/prepilo-shutdown.desktop"
rm -f "${HOME}/.local/share/applications/prepilo-reboot.desktop"
rm -f "${HOME}/.local/bin/prepilo-lock"
rm -f "${HOME}/.local/bin/prepilo-guard"
rm -f "${HOME}/.local/bin/prepilo-end-session"
rm -f "${HOME}/.local/bin/prepilo-show-bypass"
rm -f "${HOME}/.local/bin/prepilo-rotate-bypass"

# Force unlock flag so a hung shell can exit if polled
mkdir -p "${HOME}/.config/prepilo"
printf '%s\n' '{"unlocked":true,"reason":"uninstall","at":"'"$(date -Iseconds)"'"}' > "${HOME}/.config/prepilo/lock-state.json"
printf '%s\n' '{"ok":true,"action":"login","reason":"uninstall"}' > "${HOME}/.config/prepilo/gate-cleared.json"
rm -f "${HOME}/.config/prepilo/session-guard.pid"
rm -f "${HOME}/.config/prepilo/pending-session-end.json"

echo "Prepilo Lock / Guard removed from autostart + systemd; keybinds restored if a backup existed."
echo "Keep ~/.config/prepilo/bypass.key unless you pass --purge"
if [[ "${1:-}" == "--purge" ]]; then
  rm -rf "${HOME}/.config/prepilo"
  echo "Purged ~/.config/prepilo"
fi
