"""Shared Prepilo config paths (migrates from legacy ~/.config/prepdesk)."""
from __future__ import annotations

import shutil
from pathlib import Path

LEGACY_CONFIG = Path.home() / ".config" / "prepdesk"
CONFIG = Path.home() / ".config" / "prepilo"


def ensure_config() -> Path:
    CONFIG.mkdir(parents=True, exist_ok=True)
    if LEGACY_CONFIG.is_dir():
        for name in (
            "bypass.key",
            "analytics.json",
            "retest.json",
            "keybinds-backup.json",
        ):
            src, dst = LEGACY_CONFIG / name, CONFIG / name
            if src.exists() and not dst.exists():
                try:
                    shutil.copy2(src, dst)
                except OSError:
                    pass
    return CONFIG
