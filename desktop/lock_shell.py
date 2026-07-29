#!/usr/bin/env python3
"""Prepilo Lock — fullscreen GTK shell embedding the React Lock UI (same look as the browser)."""

from __future__ import annotations

import atexit
import json
import os
import signal
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import quote

# Avoid Wayland Error 11 on seat/compositor chatter — run under XWayland.
_backend = os.environ.get("PREPILO_GDK_BACKEND") or os.environ.get("PREPDESK_GDK_BACKEND") or "x11"
_allow_wl = os.environ.get("PREPILO_ALLOW_WAYLAND") or os.environ.get("PREPDESK_ALLOW_WAYLAND") or ""
if _allow_wl.strip() not in {"1", "true", "yes"}:
    os.environ["GDK_BACKEND"] = _backend

import gi

gi.require_version("Gtk", "3.0")
gi.require_version("Gdk", "3.0")
gi.require_version("WebKit2", "4.1")
from gi.repository import Gdk, GLib, Gtk, WebKit2  # noqa: E402

API = "http://127.0.0.1:4789"
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))
import keybinds  # noqa: E402
from paths import CONFIG, ensure_config  # noqa: E402

ensure_config()

_restored = False


def resolve_web_base() -> str:
    """Prefer built UI via local API; Vite only if explicitly requested or no dist."""
    explicit = os.environ.get("PREPILO_URL") or os.environ.get("PREPDESK_URL")
    if explicit:
        return explicit
    if (ROOT / "dist" / "index.html").exists():
        return f"{API}/lock"
    return "http://127.0.0.1:5173/lock"


def safe_restore() -> None:
    global _restored
    if _restored:
        return
    try:
        keybinds.restore()
    except Exception:
        pass
    _restored = True


def api_json(method: str, path: str, payload: dict | None = None, timeout: float = 2.0) -> dict:
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{API}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
        method=method,
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())


def run_bg(fn, on_done=None) -> None:
    def worker():
        err = None
        result = None
        try:
            result = fn()
        except Exception as e:
            err = e
        if on_done is not None:
            GLib.idle_add(lambda: on_done(result, err) or False)

    threading.Thread(target=worker, daemon=True).start()


def wait_for(url: str, tries: int = 60) -> bool:
    for _ in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=0.8) as r:
                if r.status == 200:
                    return True
        except Exception:
            time.sleep(0.35)
    return False


def ensure_services() -> str:
    """Start the local API (serves dist UI + lock endpoints). Returns UI base URL."""
    api_ok = False
    try:
        api_json("GET", "/health", timeout=0.8)
        api_ok = True
    except Exception:
        pass

    if not api_ok:
        subprocess.Popen(
            ["npm", "run", "runner"],
            cwd=str(ROOT),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            env=os.environ.copy(),
            start_new_session=True,
        )
        if not wait_for(f"{API}/health", 90):
            print("Prepilo API failed to start", file=sys.stderr)
            sys.exit(1)

    dist_ui = ROOT / "dist" / "index.html"
    if not dist_ui.exists():
        print("Building Prepilo UI (first run)…", flush=True)
        built = subprocess.run(
            ["npm", "run", "build"],
            cwd=str(ROOT),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        if built.returncode != 0 or not dist_ui.exists():
            print("npm run build failed — falling back to Vite", file=sys.stderr)

    web_base = resolve_web_base()
    if web_base.startswith(API):
        if wait_for(f"{API}/lock", 20) or wait_for(f"{API}/", 20):
            return f"{API}/lock"
        print("API up but /lock not ready", file=sys.stderr)

    # Vite fallback for explicit URL or missing dist
    try:
        with urllib.request.urlopen("http://127.0.0.1:5173/", timeout=0.8):
            return web_base if "5173" in web_base else "http://127.0.0.1:5173/lock"
    except Exception:
        pass
    if "5173" in web_base or not dist_ui.exists():
        subprocess.Popen(
            ["npm", "run", "dev:web"],
            cwd=str(ROOT),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            env=os.environ.copy(),
            start_new_session=True,
        )
        if not wait_for("http://127.0.0.1:5173/", 90):
            print("Prepilo UI failed to start (build with npm run build, or npm run dev:web)", file=sys.stderr)
            sys.exit(1)
        return "http://127.0.0.1:5173/lock"

    return f"{API}/lock"


def mark_gate_cleared(gate: str, reason: str) -> None:
    try:
        CONFIG.mkdir(parents=True, exist_ok=True)
        (CONFIG / "gate-cleared.json").write_text(
            json.dumps(
                {
                    "ok": True,
                    "action": gate,
                    "reason": reason,
                    "at": time.strftime("%Y-%m-%dT%H:%M:%S"),
                }
            )
            + "\n"
        )
    except OSError:
        pass


def display_is_wayland() -> bool:
    try:
        display = Gdk.Display.get_default()
        if display is None:
            return os.environ.get("XDG_SESSION_TYPE", "").lower() == "wayland"
        return "wayland" in (display.get_name() or "").lower()
    except Exception:
        return os.environ.get("XDG_SESSION_TYPE", "").lower() == "wayland"


class LockWindow(Gtk.Window):
    def __init__(self, token: str, gate: str = "login", web_base: str | None = None):
        super().__init__(title="Prepilo Lock")
        self.token = token
        self.gate = gate
        self._solved = False
        self._poll_busy = False
        self._grab_ok = False
        self._grab_attempts = 0
        ui = web_base or resolve_web_base()

        self.set_decorated(False)
        self.set_keep_above(True)
        self.set_skip_taskbar_hint(True)
        self.set_modal(True)
        self.fullscreen()
        self.connect("delete-event", lambda *_: True)
        self.connect("key-press-event", self._on_key)
        self.connect("map-event", self._on_map)

        ctx = WebKit2.WebContext.get_default()
        self.view = WebKit2.WebView.new_with_context(ctx)
        settings = self.view.get_settings()
        settings.set_enable_developer_extras(False)
        settings.set_javascript_can_access_clipboard(False)
        self.view.connect("context-menu", lambda *_: True)
        self.view.connect("decide-policy", self._on_policy)

        self.add(self.view)
        sep = "&" if "?" in ui else "?"
        self.view.load_uri(
            f"{ui}{sep}token={quote(token)}&gate={quote(gate)}"
        )
        self.show_all()

        GLib.timeout_add(1500, self._tick_focus)
        GLib.timeout_add_seconds(2, self._tick_unlock)

    def _on_policy(self, _view, decision, decision_type):
        if decision_type == WebKit2.PolicyDecisionType.NAVIGATION_ACTION:
            try:
                nav = decision.get_navigation_action()
                req = nav.get_request()
                uri = req.get_uri() or ""
                if not (
                    uri.startswith("http://127.0.0.1:5173/")
                    or uri.startswith("http://localhost:5173/")
                    or uri.startswith("http://127.0.0.1:4789/")
                    or uri.startswith("http://localhost:4789/")
                    or uri.startswith("about:")
                ):
                    decision.ignore()
                    return True
            except Exception:
                pass
        return False

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

    def _on_map(self, *_a):
        GLib.idle_add(self._try_grab)
        return False

    def _try_grab(self) -> bool:
        if display_is_wayland() or self._grab_attempts >= 2:
            return False
        self._grab_attempts += 1
        display = self.get_display()
        seat = display.get_default_seat() if display else None
        window = self.get_window()
        if not seat or not window:
            return False
        try:
            status = seat.grab(
                window,
                Gdk.SeatCapabilities.POINTER | Gdk.SeatCapabilities.KEYBOARD,
                True,
                None,
                None,
                None,
                None,
            )
            self._grab_ok = status == Gdk.GrabStatus.SUCCESS
        except Exception:
            self._grab_ok = False
        return False

    def _ungrab(self) -> None:
        if not self._grab_ok:
            return
        try:
            seat = self.get_display().get_default_seat()
            if seat:
                seat.ungrab()
        except Exception:
            pass
        self._grab_ok = False

    def _tick_focus(self):
        try:
            self.set_keep_above(True)
            if not self.is_active():
                self.present()
        except Exception:
            pass
        return True

    def _finish(self, reason: str) -> None:
        if self._solved:
            return
        self._solved = True
        mark_gate_cleared(self.gate, reason)
        safe_restore()
        self._ungrab()
        print(f"Prepilo unlocked ({reason}) — closing lock window.", flush=True)
        # Brief delay so the React “unlocked” banner is visible.
        GLib.timeout_add(1200, lambda: (Gtk.main_quit() or False))

    def _tick_unlock(self):
        if self._solved or self._poll_busy:
            return True
        self._poll_busy = True

        def work():
            return api_json("GET", "/lock/status", timeout=0.8)

        def done(st, err):
            self._poll_busy = False
            if err or not st:
                return
            if st.get("unlocked"):
                self._finish(st.get("reason") or "unlocked")

        run_bg(work, done)
        return True


def _parse_gate(argv: list[str]) -> str:
    gate = os.environ.get("PREPILO_GATE") or os.environ.get("PREPDESK_GATE", "login")
    if "--gate" in argv:
        i = argv.index("--gate")
        if i + 1 < len(argv):
            gate = argv[i + 1]
    if gate not in {"login", "logout", "poweroff", "shutdown", "reboot", "suspend"}:
        gate = "login"
    return gate


def _single_instance():
    import fcntl

    CONFIG.mkdir(parents=True, exist_ok=True)
    lock_path = CONFIG / "native-lock.flock"
    fh = open(lock_path, "w")
    try:
        fcntl.flock(fh.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        fh.close()
        return None
    fh.write(str(os.getpid()) + "\n")
    fh.flush()
    return fh


def main(argv: list[str] | None = None) -> int:
    global _restored
    _restored = False
    argv = list(argv if argv is not None else sys.argv[1:])
    gate = _parse_gate(argv)

    instance = _single_instance()
    if instance is None:
        print("Prepilo lock already running", file=sys.stderr)
        return 0

    if (CONFIG / "keybinds-backup.json").exists():
        keybinds.restore()

    web_base = ensure_services()

    try:
        armed = api_json("POST", "/lock/arm", {"source": f"webkit-shell:{gate}"}, timeout=3.0)
    except urllib.error.URLError:
        print("Cannot reach Prepilo API on :4789", file=sys.stderr)
        return 1

    token = armed.get("token") or ""
    if not token:
        print("Lock arm did not return a session token", file=sys.stderr)
        return 1

    keybinds.snapshot_and_disable()
    atexit.register(safe_restore)

    print(
        f"Prepilo lock starting (gate={gate}, UI={web_base}, GDK_BACKEND={os.environ.get('GDK_BACKEND')})",
        flush=True,
    )

    win = LockWindow(token, gate=gate, web_base=web_base)
    win.show_all()

    def _on_signal(_s, _f):
        safe_restore()
        try:
            win._ungrab()
        except Exception:
            pass
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
        try:
            instance.close()
        except Exception:
            pass
    return 0 if win._solved or gate == "login" else 1


if __name__ == "__main__":
    raise SystemExit(main())
