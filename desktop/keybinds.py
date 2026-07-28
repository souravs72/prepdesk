#!/usr/bin/env python3
"""Temporarily disable GNOME shell/wm shortcuts while PrepDesk Lock is active.

Snapshot gsettings FIRST (atomic), then clear. Restore on unlock/crash helpers.
Does not block the hardware power button.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

BACKUP = Path.home() / ".config" / "prepdesk" / "keybinds-backup.json"
BACKUP_TMP = BACKUP.with_suffix(".json.tmp")

BINDINGS: list[tuple[str, str]] = [
    ("org.gnome.desktop.wm.keybindings", "switch-applications"),
    ("org.gnome.desktop.wm.keybindings", "switch-applications-backward"),
    ("org.gnome.desktop.wm.keybindings", "switch-windows"),
    ("org.gnome.desktop.wm.keybindings", "switch-windows-backward"),
    ("org.gnome.desktop.wm.keybindings", "switch-group"),
    ("org.gnome.desktop.wm.keybindings", "switch-group-backward"),
    ("org.gnome.desktop.wm.keybindings", "cycle-windows"),
    ("org.gnome.desktop.wm.keybindings", "cycle-windows-backward"),
    ("org.gnome.desktop.wm.keybindings", "cycle-group"),
    ("org.gnome.desktop.wm.keybindings", "cycle-group-backward"),
    ("org.gnome.desktop.wm.keybindings", "close"),
    ("org.gnome.desktop.wm.keybindings", "minimize"),
    ("org.gnome.desktop.wm.keybindings", "panel-main-menu"),
    ("org.gnome.desktop.wm.keybindings", "panel-run-dialog"),
    ("org.gnome.desktop.wm.keybindings", "show-desktop"),
    ("org.gnome.shell.keybindings", "toggle-overview"),
    ("org.gnome.shell.keybindings", "toggle-application-view"),
    ("org.gnome.shell.keybindings", "toggle-quick-settings"),
    ("org.gnome.settings-daemon.plugins.media-keys", "logout"),
    ("org.gnome.settings-daemon.plugins.media-keys", "screensaver"),
    ("org.gnome.settings-daemon.plugins.media-keys", "control-center"),
    ("org.gnome.settings-daemon.plugins.media-keys", "terminal"),
    ("org.gnome.mutter.keybindings", "toggle-tiled-left"),
    ("org.gnome.mutter.keybindings", "toggle-tiled-right"),
    ("org.gnome.mutter.keybindings", "switch-monitor"),
]

STRING_KEYS: list[tuple[str, str]] = [
    ("org.gnome.mutter", "overlay-key"),
]


def _run(args: list[str]) -> str:
    try:
        return subprocess.check_output(args, text=True, stderr=subprocess.DEVNULL).strip()
    except Exception:
        return ""


def snapshot_and_disable() -> None:
    BACKUP.parent.mkdir(parents=True, exist_ok=True)
    if BACKUP.exists():
        _apply_disabled()
        return

    snap: dict = {"arrays": {}, "strings": {}}
    for schema, key in BINDINGS:
        val = _run(["gsettings", "get", schema, key])
        if val:
            snap["arrays"][f"{schema}::{key}"] = val
    for schema, key in STRING_KEYS:
        val = _run(["gsettings", "get", schema, key])
        if val:
            snap["strings"][f"{schema}::{key}"] = val

    # Atomic write BEFORE clearing anything
    BACKUP_TMP.write_text(json.dumps(snap, indent=2) + "\n")
    BACKUP_TMP.replace(BACKUP)
    _apply_disabled()


def _apply_disabled() -> None:
    for schema, key in BINDINGS:
        _run(["gsettings", "set", schema, key, "[]"])
    for schema, key in STRING_KEYS:
        _run(["gsettings", "set", schema, key, "''"])


def restore() -> None:
    if not BACKUP.exists():
        return
    try:
        snap = json.loads(BACKUP.read_text())
    except Exception:
        return
    for compound, val in (snap.get("arrays") or {}).items():
        schema, key = compound.split("::", 1)
        _run(["gsettings", "set", schema, key, val])
    for compound, val in (snap.get("strings") or {}).items():
        schema, key = compound.split("::", 1)
        _run(["gsettings", "set", schema, key, val])
    try:
        BACKUP.unlink()
    except Exception:
        pass


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "restore":
        restore()
        print("keybinds restored")
    else:
        snapshot_and_disable()
        print("keybinds disabled (backup saved)")
