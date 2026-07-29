#!/usr/bin/env python3
"""Prepilo session guard — logout/shutdown/suspend stay blocked until a lock question is solved."""

from __future__ import annotations

import atexit
import json
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

import gi

gi.require_version("Gio", "2.0")
gi.require_version("GLib", "2.0")
from gi.repository import Gio, GLib  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from paths import CONFIG, ensure_config  # noqa: E402

ensure_config()
PID_FILE = CONFIG / "session-guard.pid"
PENDING_FILE = CONFIG / "pending-session-end.json"
LOCK_BIN = Path.home() / ".local" / "bin" / "prepilo-lock"
LOCK_SCRIPT = ROOT / "desktop" / "prepilo-lock"


class SessionGuard:
    def __init__(self) -> None:
        self._loop = GLib.MainLoop()
        self._gnome_cookie: int | None = None
        self._inhibit_proc: subprocess.Popen | None = None
        self._lock_proc: subprocess.Popen | None = None
        self._pending: str | None = None
        self._sm: Gio.DBusProxy | None = None
        self._login: Gio.DBusProxy | None = None

    def run(self) -> int:
        CONFIG.mkdir(parents=True, exist_ok=True)
        if not self._claim_pid():
            print("Prepilo session guard already running", file=sys.stderr)
            return 0

        atexit.register(self._cleanup)
        signal.signal(signal.SIGTERM, self._on_signal)
        signal.signal(signal.SIGINT, self._on_signal)

        self._connect_dbus()
        self._take_inhibits("Prepilo: solve a question to end or suspend the session")
        self._watch_logind()
        GLib.timeout_add_seconds(1, self._check_pending_file)
        GLib.timeout_add_seconds(30, self._heartbeat)
        GLib.timeout_add_seconds(8, self._ensure_login_lock_once)

        print("Prepilo session guard active (logout/shutdown gated)", flush=True)
        try:
            self._loop.run()
        finally:
            self._cleanup()
        return 0

    def _claim_pid(self) -> bool:
        if PID_FILE.exists():
            try:
                old = int(PID_FILE.read_text().strip())
                os.kill(old, 0)
                return False
            except Exception:
                pass
        PID_FILE.write_text(str(os.getpid()) + "\n")
        return True

    def _cleanup(self) -> None:
        self._release_inhibits()
        try:
            if PID_FILE.exists() and PID_FILE.read_text().strip() == str(os.getpid()):
                PID_FILE.unlink(missing_ok=True)
        except Exception:
            pass

    def _on_signal(self, *_a) -> None:
        self._cleanup()
        try:
            self._loop.quit()
        except Exception:
            pass
        sys.exit(0)

    def _connect_dbus(self) -> None:
        try:
            self._sm = Gio.DBusProxy.new_for_bus_sync(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                None,
                "org.gnome.SessionManager",
                "/org/gnome/SessionManager",
                "org.gnome.SessionManager",
                None,
            )
        except Exception as e:
            print(f"GNOME SessionManager unavailable: {e}", file=sys.stderr)

        try:
            self._login = Gio.DBusProxy.new_for_bus_sync(
                Gio.BusType.SYSTEM,
                Gio.DBusProxyFlags.NONE,
                None,
                "org.freedesktop.login1",
                "/org/freedesktop/login1",
                "org.freedesktop.login1.Manager",
                None,
            )
        except Exception as e:
            print(f"logind unavailable: {e}", file=sys.stderr)

    def _take_inhibits(self, why: str) -> None:
        if self._sm is not None and self._gnome_cookie is None:
            try:
                result = self._sm.call_sync(
                    "Inhibit",
                    GLib.Variant("(susu)", ("prepilo", 0, why, 1 | 2 | 4 | 8)),
                    Gio.DBusCallFlags.NONE,
                    -1,
                    None,
                ).unpack()
                self._gnome_cookie = int(result[0] if isinstance(result, (tuple, list)) else result)
            except Exception as e:
                print(f"GNOME Inhibit failed: {e}", file=sys.stderr)

        if self._inhibit_proc is None or self._inhibit_proc.poll() is not None:
            try:
                self._inhibit_proc = subprocess.Popen(
                    [
                        "systemd-inhibit",
                        "--what=shutdown:sleep:idle:handle-power-key:handle-suspend-key:handle-hibernate-key",
                        "--who=prepilo",
                        f"--why={why}",
                        "--mode=block",
                        "sleep",
                        "infinity",
                    ],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
            except Exception as e:
                print(f"systemd-inhibit failed: {e}", file=sys.stderr)

    def _release_inhibits(self) -> None:
        if self._sm is not None and self._gnome_cookie is not None:
            try:
                self._sm.call_sync(
                    "Uninhibit",
                    GLib.Variant("(u)", (self._gnome_cookie,)),
                    Gio.DBusCallFlags.NONE,
                    -1,
                    None,
                )
            except Exception:
                pass
            self._gnome_cookie = None

        if self._inhibit_proc is not None:
            try:
                self._inhibit_proc.terminate()
            except Exception:
                pass
            self._inhibit_proc = None

    def _watch_logind(self) -> None:
        if self._login is None:
            return

        def on_props(_proxy, changed, _invalidated):
            try:
                if "PrepareForShutdown" in changed.keys():
                    if bool(changed.lookup_value("PrepareForShutdown").get_boolean()):
                        self._request_gate("poweroff")
                if "PrepareForSleep" in changed.keys():
                    val = changed.lookup_value("PrepareForSleep")
                    if val and bool(val.get_boolean()):
                        self._request_gate("suspend")
            except Exception:
                pass

        try:
            self._login.connect("g-properties-changed", on_props)
        except Exception:
            pass

    def _check_pending_file(self) -> bool:
        if PENDING_FILE.exists():
            try:
                data = json.loads(PENDING_FILE.read_text())
                action = data.get("action") or "logout"
                PENDING_FILE.unlink(missing_ok=True)
                self._request_gate(action)
            except Exception:
                try:
                    PENDING_FILE.unlink(missing_ok=True)
                except Exception:
                    pass
        return True

    def _heartbeat(self) -> bool:
        if self._gnome_cookie is None or self._inhibit_proc is None or (
            self._inhibit_proc is not None and self._inhibit_proc.poll() is not None
        ):
            self._take_inhibits("Prepilo: solve a question to end or suspend the session")
        return True

    def _ensure_login_lock_once(self) -> bool:
        flag = CONFIG / "login-lock-launched"
        boot_id = "unknown"
        try:
            boot_id = Path("/proc/sys/kernel/random/boot_id").read_text().strip()
        except Exception:
            boot_id = str(int(time.time()) // 86400)
        state = {}
        if flag.exists():
            try:
                state = json.loads(flag.read_text())
            except Exception:
                state = {}
        if state.get("boot_id") == boot_id:
            return False
        try:
            flag.write_text(json.dumps({"boot_id": boot_id, "at": time.time()}) + "\n")
        except OSError:
            pass
        self._spawn_lock("login")
        return False

    def _request_gate(self, action: str) -> None:
        if self._pending:
            return
        self._pending = action
        self._spawn_lock(action)

    def _spawn_lock(self, gate: str) -> None:
        if self._lock_proc and self._lock_proc.poll() is None:
            return
        cmd = str(LOCK_BIN if LOCK_BIN.exists() else LOCK_SCRIPT)
        env = os.environ.copy()
        env["PREPILO_GATE"] = gate
        try:
            self._lock_proc = subprocess.Popen(
                [cmd, "--gate", gate],
                cwd=str(ROOT),
                env=env,
                start_new_session=True,
            )
            GLib.child_watch_add(self._lock_proc.pid, self._on_lock_exit)
        except Exception as e:
            print(f"Failed to spawn lock: {e}", file=sys.stderr)
            self._pending = None

    def _on_lock_exit(self, _pid: int, _status: int) -> None:
        self._lock_proc = None
        ok_file = CONFIG / "gate-cleared.json"
        cleared = False
        # Only end the session if we explicitly requested an end-session gate.
        pending = self._pending
        reported = None
        if ok_file.exists():
            try:
                data = json.loads(ok_file.read_text())
                cleared = bool(data.get("ok"))
                reported = data.get("action")
                ok_file.unlink(missing_ok=True)
            except Exception:
                cleared = False

        self._pending = None

        if not cleared:
            self._release_inhibits()
            self._take_inhibits("Prepilo: solve a question to end or suspend the session")
            return

        # Login unlock (or solving a manually launched lock): never logout/poweroff.
        action = pending if pending and pending != "login" else None
        if action is None and reported in {"logout", "poweroff", "shutdown", "reboot", "suspend"}:
            # Only honor reported end-session actions when we had a matching pending request.
            # (Prevents a stale gate-cleared file from powering off after a normal login unlock.)
            action = None

        if action is None:
            self._release_inhibits()
            self._take_inhibits("Prepilo: solve a question to end or suspend the session")
            return

        self._release_inhibits()
        GLib.timeout_add(400, lambda: self._perform_action(action) or False)

    def _perform_action(self, action: str) -> bool:
        end_actions = {"logout", "reboot", "poweroff", "shutdown", "suspend"}
        try:
            if action == "login" or action not in end_actions:
                self._take_inhibits("Prepilo: solve a question to end or suspend the session")
                return False
            if action == "logout":
                subprocess.Popen(["gnome-session-quit", "--logout", "--no-prompt"])
            elif action == "reboot":
                subprocess.Popen(["gnome-session-quit", "--reboot", "--no-prompt"])
            elif action in ("poweroff", "shutdown"):
                subprocess.Popen(["gnome-session-quit", "--power-off", "--no-prompt"])
            elif action == "suspend":
                subprocess.Popen(["systemctl", "suspend"])
        except Exception as e:
            print(f"Session action failed: {e}", file=sys.stderr)
            self._take_inhibits("Prepilo: solve a question to end or suspend the session")
        return False


def main() -> int:
    return SessionGuard().run()


if __name__ == "__main__":
    raise SystemExit(main())
