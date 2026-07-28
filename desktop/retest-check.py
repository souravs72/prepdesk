#!/usr/bin/env python3
"""If a retest is due (accuracy < 80% scheduled), launch PrepDesk Lock."""

from __future__ import annotations

import json
import os
import subprocess
import time
from pathlib import Path

STATE = Path.home() / ".config" / "prepdesk" / "retest.json"
LOCK_PID = Path.home() / ".config" / "prepdesk" / "lock.pid"
LOCK_BIN = Path.home() / ".local" / "bin" / "prepdesk-lock"
ROOT_LOCK = Path(__file__).resolve().parent / "prepdesk-lock"


def lock_already_running() -> bool:
    if not LOCK_PID.exists():
        return False
    try:
        pid = int(LOCK_PID.read_text().strip())
        os.kill(pid, 0)
        return True
    except Exception:
        return False


def main() -> int:
    if not STATE.exists():
        return 0
    try:
        data = json.loads(STATE.read_text())
    except Exception:
        return 0
    due = data.get("dueAt")
    if not due or data.get("fired"):
        return 0

    now = time.time()
    if isinstance(due, (int, float)):
        due_ts = due / 1000 if due > 1e12 else float(due)
    else:
        from datetime import datetime

        due_ts = datetime.fromisoformat(str(due).replace("Z", "+00:00")).timestamp()
    if now < due_ts:
        return 0

    if lock_already_running():
        return 0

    cmd = str(LOCK_BIN if LOCK_BIN.exists() else ROOT_LOCK)
    try:
        proc = subprocess.Popen([cmd], start_new_session=True, env=os.environ.copy())
        LOCK_PID.parent.mkdir(parents=True, exist_ok=True)
        LOCK_PID.write_text(str(proc.pid) + "\n")
        data["fired"] = True
        data["launchedAt"] = time.strftime("%Y-%m-%dT%H:%M:%S")
        STATE.write_text(json.dumps(data, indent=2) + "\n")
    except Exception:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
