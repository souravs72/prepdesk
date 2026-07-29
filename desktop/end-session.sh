#!/usr/bin/env bash
# Request a gated session end. Prefers the running session guard; otherwise runs the lock itself.
set -euo pipefail
ACTION="${1:-logout}"
case "$ACTION" in
  logout|poweroff|shutdown|reboot|suspend) ;;
  *)
    echo "Usage: prepdesk-end-session [logout|poweroff|reboot|suspend]" >&2
    exit 2
    ;;
esac

DIR="${HOME}/.config/prepdesk"
mkdir -p "$DIR"
printf '%s\n' "{\"action\":\"$ACTION\",\"at\":\"$(date -Iseconds)\"}" > "$DIR/pending-session-end.json"

# If guard is alive, it will pick up the pending file and drive the lock + action.
if [[ -f "$DIR/session-guard.pid" ]]; then
  pid="$(tr -d '[:space:]' < "$DIR/session-guard.pid" || true)"
  if [[ -n "${pid}" ]] && kill -0 "$pid" 2>/dev/null; then
    exit 0
  fi
fi

# No guard — run lock, then perform the action if cleared.
LOCK="${HOME}/.local/bin/prepdesk-lock"
if [[ ! -x "$LOCK" ]]; then
  LOCK="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/prepdesk-lock"
fi
PREPDESK_GATE="$ACTION" "$LOCK" --gate "$ACTION" || true
if [[ -f "$DIR/gate-cleared.json" ]]; then
  rm -f "$DIR/gate-cleared.json"
  case "$ACTION" in
    logout) gnome-session-quit --logout --no-prompt ;;
    reboot) gnome-session-quit --reboot --no-prompt ;;
    poweroff|shutdown) gnome-session-quit --power-off --no-prompt ;;
    suspend) systemctl suspend ;;
  esac
fi
