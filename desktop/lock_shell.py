#!/usr/bin/env python3
"""PrepDesk Lock — fullscreen WebKit shell that blocks until unlock."""

from __future__ import annotations

import atexit
import json
import os
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import quote

import gi

gi.require_version("Gtk", "3.0")
gi.require_version("Gdk", "3.0")
gi.require_version("WebKit2", "4.1")
from gi.repository import Gdk, GLib, Gtk, WebKit2  # noqa: E402

API = "http://127.0.0.1:4789"
WEB_BASE = os.environ.get("PREPDESK_URL", "http://127.0.0.1:5173/lock")
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))
import keybinds  # noqa: E402

_restored = False


def safe_restore() -> None:
    global _restored
    if _restored:
        return
    try:
        keybinds.restore()
    except Exception:
        pass
    _restored = True


def api_get(path: str) -> dict:
    with urllib.request.urlopen(f"{API}{path}", timeout=2) as r:
        return json.loads(r.read().decode())


def api_post(path: str, payload: dict | None = None) -> dict:
    data = json.dumps(payload or {}).encode()
    req = urllib.request.Request(
        f"{API}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=3) as r:
        return json.loads(r.read().decode())


def wait_for(url: str, tries: int = 60) -> bool:
    for _ in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=1) as r:
                if r.status == 200:
                    return True
        except Exception:
            time.sleep(0.4)
    return False


def ensure_services() -> None:
    try:
        api_get("/health")
        with urllib.request.urlopen("http://127.0.0.1:5173/", timeout=1):
            return
    except Exception:
        pass

    subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=str(ROOT),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        env=os.environ.copy(),
        start_new_session=True,
    )
    if not wait_for(f"{API}/health", 90):
        print("PrepDesk API failed to start", file=sys.stderr)
        sys.exit(1)
    if not wait_for("http://127.0.0.1:5173/", 90):
        print("PrepDesk web failed to start", file=sys.stderr)
        sys.exit(1)


class LockWindow(Gtk.Window):
    def __init__(self, token: str):
        super().__init__(title="PrepDesk Lock")
        self.token = token
        self.set_decorated(False)
        self.set_keep_above(True)
        self.set_skip_taskbar_hint(True)
        self.set_modal(True)
        self.fullscreen()
        self.connect("delete-event", self._on_delete)
        self.connect("key-press-event", self._on_key)

        ctx = WebKit2.WebContext.get_default()
        self.view = WebKit2.WebView.new_with_context(ctx)
        settings = self.view.get_settings()
        settings.set_enable_developer_extras(False)
        settings.set_javascript_can_access_clipboard(False)
        self.view.connect("context-menu", lambda *_: True)
        self.view.connect("decide-policy", self._on_policy)

        self.add(self.view)
        sep = "&" if "?" in WEB_BASE else "?"
        self.view.load_uri(f"{WEB_BASE}{sep}token={quote(token)}")
        self.show_all()

        GLib.timeout_add(350, self._tick_focus)
        GLib.timeout_add(700, self._tick_unlock)

    def _on_policy(self, _view, decision, decision_type):
        # Block navigating away from local lock UI
        if decision_type == WebKit2.PolicyDecisionType.NAVIGATION_ACTION:
            try:
                nav = decision.get_navigation_action()
                req = nav.get_request()
                uri = req.get_uri() or ""
                if not (
                    uri.startswith("http://127.0.0.1:5173/")
                    or uri.startswith("http://localhost:5173/")
                    or uri.startswith("about:")
                ):
                    decision.ignore()
                    return True
            except Exception:
                pass
        return False

    def _on_delete(self, *_args):
        return True

    def _on_key(self, _w, event):
        key = Gdk.keyval_name(event.keyval) or ""
        state = event.state
        if key == "Escape":
            return True
        if key in ("Tab", "ISO_Left_Tab") and (state & Gdk.ModifierType.MOD1_MASK):
            return True
        if key == "F4" and (state & Gdk.ModifierType.MOD1_MASK):
            return True
        if key in ("Delete", "KP_Delete") and (state & Gdk.ModifierType.CONTROL_MASK) and (
            state & Gdk.ModifierType.MOD1_MASK
        ):
            return True
        if key in ("Super_L", "Super_R", "Meta_L", "Meta_R"):
            return True
        return False

    def _tick_focus(self):
        self.present()
        self.set_keep_above(True)
        try:
            self.fullscreen()
        except Exception:
            pass
        return True

    def _tick_unlock(self):
        try:
            st = api_get("/lock/status")
            if st.get("unlocked"):
                safe_restore()
                Gtk.main_quit()
                return False
        except Exception:
            pass
        return True


def main() -> int:
    # Always try restore leftover keybinds from a previous crash, then allow a fresh lock session
    global _restored
    _restored = False
    if (Path.home() / ".config" / "prepdesk" / "keybinds-backup.json").exists():
        keybinds.restore()

    ensure_services()

    try:
        armed = api_post("/lock/arm", {"source": "shell"})
    except urllib.error.URLError:
        print("Cannot reach PrepDesk API on :4789", file=sys.stderr)
        return 1

    token = armed.get("token") or ""
    if not token:
        print("Lock arm did not return a session token", file=sys.stderr)
        return 1

    keybinds.snapshot_and_disable()
    atexit.register(safe_restore)

    win = LockWindow(token)
    win.show_all()

    def _on_signal(_s, _f):
        # Restore shortcuts even if user kills the lock from TTY
        safe_restore()
        try:
            Gtk.main_quit()
        except Exception:
            pass
        sys.exit(0)

    signal.signal(signal.SIGINT, _on_signal)
    signal.signal(signal.SIGTERM, _on_signal)

    try:
        Gtk.main()
    finally:
        safe_restore()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
