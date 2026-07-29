#!/usr/bin/env python3
"""Prepilo Native Lock — pure GTK desktop lockdown (no browser / WebKit UI)."""

from __future__ import annotations

import atexit
import json
import os
import re
import signal
import threading
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

# Native Wayland seat.grab triggers: Error 11 dispatching to Wayland display.
# Force XWayland before Gdk initializes unless user opts out.
_backend = os.environ.get("PREPILO_GDK_BACKEND") or os.environ.get("PREPDESK_GDK_BACKEND") or "x11"
_allow_wl = os.environ.get("PREPILO_ALLOW_WAYLAND") or os.environ.get("PREPDESK_ALLOW_WAYLAND") or ""
if _allow_wl.strip() not in {"1", "true", "yes"}:
    os.environ["GDK_BACKEND"] = _backend

import gi

gi.require_version("Gtk", "3.0")
gi.require_version("Gdk", "3.0")
from gi.repository import Gdk, GLib, Gtk  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))
import keybinds  # noqa: E402
from native_questions import grade_answer, next_lock_question  # noqa: E402
from paths import CONFIG, ensure_config  # noqa: E402

ensure_config()

API = "http://127.0.0.1:4789"
DIGEST_ENV = Path.home() / ".config" / "daily-work-digest" / ".env"
DIGEST_CFG = Path.home() / ".config" / "daily-work-digest" / "config.yaml"

_restored = False


def display_is_wayland() -> bool:
    if os.environ.get("XDG_SESSION_TYPE", "").lower() == "wayland":
        # Still true even under GDK_BACKEND=x11 (XWayland) — check actual GDK backend.
        pass
    try:
        display = Gdk.Display.get_default()
        if display is None:
            return os.environ.get("XDG_SESSION_TYPE", "").lower() == "wayland"
        name = (display.get_name() or "").lower()
        # "wayland-0" vs ":0" / "X11"
        return "wayland" in name
    except Exception:
        return os.environ.get("XDG_SESSION_TYPE", "").lower() == "wayland"


def seat_grab_supported() -> bool:
    """Exclusive seat grab is unsafe/unstable on native Wayland (Error 11)."""
    if (os.environ.get("PREPILO_FORCE_GRAB") or os.environ.get("PREPDESK_FORCE_GRAB") or "").strip() in {
        "1",
        "true",
        "yes",
    }:
        return True
    return not display_is_wayland()


CSS = b"""
window { background-color: #07080a; color: #e8eaef; }
.label-title { font-size: 26px; font-weight: bold; color: #e8eaef; }
.label-muted { color: #8b9bb4; font-size: 14px; }
.label-prompt { color: #c9d1d9; font-size: 16px; }
.label-accent { color: #2dd4bf; font-size: 12px; font-weight: bold; }
.label-ok { color: #7fd962; }
.label-bad { color: #f07178; }
entry, textview { background-color: #151821; color: #e8eaef; border-radius: 8px; padding: 8px; }
button { padding: 8px 14px; }
button.accent { background-image: image(#2dd4bf); color: #042f2e; font-weight: bold; border-radius: 10px; }
.badge { background-color: #151821; color: #8b9bb4; padding: 2px 8px; border-radius: 999px; font-size: 11px; }
"""


def safe_restore() -> None:
    global _restored
    if _restored:
        return
    try:
        keybinds.restore()
    except Exception:
        pass
    _restored = True


def api_json(
    method: str,
    path: str,
    payload: dict | None = None,
    token: str | None = None,
    timeout: float = 2.0,
) -> dict:
    data = None if payload is None else json.dumps(payload).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["X-Prepilo-Token"] = token
    req = urllib.request.Request(
        f"{API}{path}",
        data=data,
        headers=headers,
        method=method,
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())


def run_bg(fn, on_done=None) -> None:
    """Run blocking work off the GTK thread; marshal callbacks with GLib.idle_add."""

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


def wait_api(tries: int = 20) -> bool:
    for _ in range(tries):
        try:
            api_json("GET", "/health", timeout=0.8)
            return True
        except Exception:
            time.sleep(0.25)
    return False


def ensure_runner() -> None:
    try:
        api_json("GET", "/health", timeout=0.8)
        return
    except Exception:
        pass
    subprocess.Popen(
        ["npm", "run", "runner"],
        cwd=str(ROOT),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
        env=os.environ.copy(),
    )
    if not wait_api():
        print("Prepilo API slow/unavailable — continuing with local grading", file=sys.stderr)


def bypass_ok(key: str) -> bool:
    path = CONFIG / "bypass.key"
    try:
        if path.exists() and path.read_text().strip() == key.strip():
            return True
    except OSError:
        pass
    try:
        api_json("POST", "/lock/bypass", {"key": key}, timeout=2.0)
        return True
    except Exception:
        return False


def load_openai() -> tuple[str, str]:
    key = ""
    model = "gpt-4.1-mini"
    if DIGEST_ENV.exists():
        for line in DIGEST_ENV.read_text().splitlines():
            t = line.strip()
            if t.startswith("OPENAI_API_KEY="):
                key = t.split("=", 1)[1].strip().strip("'\"")
    if DIGEST_CFG.exists():
        m = re.search(r"openai:\s*\n\s*model:\s*([^\s#]+)", DIGEST_CFG.read_text())
        if m:
            model = m.group(1).strip().strip("'\"")
    return key, model


def openai_chat(system: str, user: str) -> str:
    key, model = load_openai()
    if not key:
        return ""
    body = {
        "model": model,
        "temperature": 0.4,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            data = json.loads(r.read().decode())
        return data["choices"][0]["message"]["content"]
    except Exception as e:
        return f"(OpenAI unavailable: {e})"


class NoPasteEntry(Gtk.Entry):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.connect("key-press-event", self._on_key)
        self.connect("button-press-event", self._on_btn)
        self.connect("paste-clipboard", lambda *_: True)
        self.connect("populate-popup", self._on_popup)

    def _on_popup(self, _e, menu):
        for child in list(menu.get_children()):
            try:
                label = child.get_label() if hasattr(child, "get_label") else ""
            except Exception:
                label = ""
            if label and "aste" in str(label):
                menu.remove(child)

    def _on_btn(self, _w, event):
        return event.button == 2

    def _on_key(self, _w, event):
        key = Gdk.keyval_name(event.keyval) or ""
        ctrl = bool(event.state & Gdk.ModifierType.CONTROL_MASK)
        shift = bool(event.state & Gdk.ModifierType.SHIFT_MASK)
        if ctrl and key.lower() == "v":
            return True
        if shift and key in ("Insert", "KP_Insert"):
            return True
        return False


class NativeLockApp(Gtk.Window):
    def __init__(self, token: str, gate: str = "login"):
        super().__init__(title="Prepilo Native Lock")
        self.token = token
        self.gate = gate if gate in {"login", "logout", "poweroff", "shutdown", "reboot", "suspend"} else "login"
        self.question = next_lock_question()
        self.hint_level = 0
        self._grab_ok = False
        self._solved = False

        self.set_decorated(False)
        self.set_keep_above(True)
        self.set_skip_taskbar_hint(True)
        self.set_modal(True)
        self.fullscreen()
        self.connect("delete-event", lambda *_: True)
        self.connect("key-press-event", self._on_win_key)
        self.connect("focus-out-event", self._on_focus_out)
        self.connect("map-event", self._on_map)

        css = Gtk.CssProvider()
        css.load_from_data(CSS)
        Gtk.StyleContext.add_provider_for_screen(
            Gdk.Screen.get_default(), css, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        )

        outer = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=14)
        outer.set_margin_top(48)
        outer.set_margin_bottom(48)
        outer.set_margin_start(72)
        outer.set_margin_end(72)
        self.add(outer)

        gate_note = {
            "login": "LOGIN LOCK — solve to use this session",
            "logout": "LOGOUT GATE — solve to log out",
            "poweroff": "SHUTDOWN GATE — solve to power off",
            "shutdown": "SHUTDOWN GATE — solve to power off",
            "reboot": "REBOOT GATE — solve to reboot",
            "suspend": "SUSPEND GATE — solve to suspend",
        }.get(self.gate, "PREPILO NATIVE LOCK")
        brand = Gtk.Label(label=gate_note)
        brand.get_style_context().add_class("label-accent")
        brand.set_xalign(0)
        outer.pack_start(brand, False, False, 0)

        self.meta = Gtk.Label()
        self.meta.get_style_context().add_class("label-muted")
        self.meta.set_xalign(0)
        outer.pack_start(self.meta, False, False, 0)

        self.title_l = Gtk.Label()
        self.title_l.get_style_context().add_class("label-title")
        self.title_l.set_xalign(0)
        self.title_l.set_line_wrap(True)
        outer.pack_start(self.title_l, False, False, 4)

        self.prompt_l = Gtk.Label()
        self.prompt_l.get_style_context().add_class("label-prompt")
        self.prompt_l.set_xalign(0)
        self.prompt_l.set_line_wrap(True)
        self.prompt_l.set_max_width_chars(90)
        outer.pack_start(self.prompt_l, False, False, 0)

        self.answer_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        outer.pack_start(self.answer_box, False, False, 8)

        row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        self.submit_btn = Gtk.Button(label="Submit answer")
        self.submit_btn.get_style_context().add_class("accent")
        self.submit_btn.connect("clicked", self._on_submit)
        hint_btn = Gtk.Button(label="Hint")
        hint_btn.connect("clicked", self._on_hint)
        row.pack_start(self.submit_btn, False, False, 0)
        row.pack_start(hint_btn, False, False, 0)
        outer.pack_start(row, False, False, 0)

        self.status = Gtk.Label(label="")
        self.status.set_xalign(0)
        self.status.set_line_wrap(True)
        outer.pack_start(self.status, False, False, 0)

        # Explanation
        self.explain_frame = Gtk.ScrolledWindow()
        self.explain_frame.set_min_content_height(140)
        self.explain_frame.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
        self.explain_view = Gtk.TextView()
        self.explain_view.set_wrap_mode(Gtk.WrapMode.WORD_CHAR)
        self.explain_view.set_editable(False)
        self.explain_view.set_cursor_visible(False)
        self.explain_frame.add(self.explain_view)
        outer.pack_start(self.explain_frame, True, True, 0)

        # Hint chat
        chat_label = Gtk.Label(label="HINT CHAT (no full answers)")
        chat_label.get_style_context().add_class("label-accent")
        chat_label.set_xalign(0)
        outer.pack_start(chat_label, False, False, 0)

        self.chat_scroll = Gtk.ScrolledWindow()
        self.chat_scroll.set_min_content_height(100)
        self.chat_buf = Gtk.TextBuffer()
        self.chat_view = Gtk.TextView(buffer=self.chat_buf)
        self.chat_view.set_wrap_mode(Gtk.WrapMode.WORD_CHAR)
        self.chat_view.set_editable(False)
        self.chat_scroll.add(self.chat_view)
        outer.pack_start(self.chat_scroll, True, True, 0)

        chat_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        self.chat_entry = Gtk.Entry()
        self.chat_entry.set_placeholder_text("Ask for a nudge…")
        self.chat_entry.connect("activate", self._on_chat)
        ask_btn = Gtk.Button(label="Ask")
        ask_btn.connect("clicked", self._on_chat)
        chat_row.pack_start(self.chat_entry, True, True, 0)
        chat_row.pack_start(ask_btn, False, False, 0)
        outer.pack_start(chat_row, False, False, 0)

        # Bypass
        bypass_l = Gtk.Label(label="EMERGENCY BYPASS (type only — paste blocked)")
        bypass_l.get_style_context().add_class("label-accent")
        bypass_l.set_xalign(0)
        outer.pack_start(bypass_l, False, False, 8)
        self.bypass_entry = NoPasteEntry()
        self.bypass_entry.set_visibility(False)
        self.bypass_entry.set_placeholder_text("Type 73-char bypass key…")
        outer.pack_start(self.bypass_entry, False, False, 0)
        bypass_btn = Gtk.Button(label="Unlock with bypass")
        bypass_btn.connect("clicked", self._on_bypass)
        outer.pack_start(bypass_btn, False, False, 0)

        self.grab_status = Gtk.Label(label="")
        self.grab_status.get_style_context().add_class("label-muted")
        self.grab_status.set_xalign(0)
        outer.pack_start(self.grab_status, False, False, 0)

        self._radio_group = None
        self._radio_ids: dict[Gtk.RadioButton, str] = {}
        self._obj_entry = None
        self._render_question()
        self._append_chat("coach", "Stuck? Ask for a directional hint. I will not give the final answer.")

        self._status_poll_busy = False
        self._grab_attempts = 0
        GLib.timeout_add(1500, self._tick_focus_and_grab)
        GLib.timeout_add_seconds(3, self._poll_unlock_status)
        self.show_all()

    def _render_question(self) -> None:
        q = self.question
        self.meta.set_text(
            f"{q['difficulty']}  ·  {q['topic']}  ·  {q['kind']}  ·  {q.get('company', 'General')}"
        )
        self.title_l.set_text(q["title"])
        self.prompt_l.set_text(q["prompt"])
        for child in list(self.answer_box.get_children()):
            self.answer_box.remove(child)
        self._radio_group = None
        self._radio_ids = {}
        self._obj_entry = None
        if q["kind"] == "mcq":
            group = None
            for opt in q.get("options", []):
                btn = Gtk.RadioButton.new_with_label_from_widget(group, f"{opt['id']}. {opt['text']}")
                if group is None:
                    group = btn
                self._radio_ids[btn] = opt["id"]
                self.answer_box.pack_start(btn, False, False, 0)
            self._radio_group = group
        else:
            entry = Gtk.Entry()
            entry.set_placeholder_text("Type your answer…")
            entry.connect("activate", self._on_submit)
            self.answer_box.pack_start(entry, False, False, 0)
            self._obj_entry = entry
        self.answer_box.show_all()

    def _selected_answer(self) -> str:
        if self.question["kind"] == "mcq":
            if not self._radio_group:
                return ""
            for btn in self._radio_group.get_group():
                if btn.get_active():
                    return self._radio_ids.get(btn, "")
            return ""
        return (self._obj_entry.get_text() if self._obj_entry else "").strip()

    def _set_status(self, text: str, ok: bool | None = None) -> None:
        self.status.set_text(text)
        ctx = self.status.get_style_context()
        ctx.remove_class("label-ok")
        ctx.remove_class("label-bad")
        if ok is True:
            ctx.add_class("label-ok")
        elif ok is False:
            ctx.add_class("label-bad")

    def _append_chat(self, who: str, text: str) -> None:
        end = self.chat_buf.get_end_iter()
        self.chat_buf.insert(end, f"{who}: {text}\n\n")

    def _on_submit(self, *_a) -> None:
        ans = self._selected_answer()
        if not ans:
            self._set_status("Select or type an answer first.", False)
            return
        ok = grade_answer(self.question, ans)
        payload = {
            "questionId": self.question["id"],
            "correct": ok,
            "kind": self.question["kind"],
            "topic": self.question["topic"],
            "domain": self.question.get("domain", "dsa"),
            "difficulty": self.question["difficulty"],
            "timeSpentMs": 0,
            "at": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "userAnswer": ans,
        }
        run_bg(lambda: api_json("POST", "/analytics/attempt", payload, timeout=2.0) or {})

        if ok:
            self._set_status("Correct — unlocking…", True)
            self._show_explanation_async(True, ans)
            GLib.timeout_add(350, self._unlock_solved)
        else:
            self._set_status("Not quite — use hints, then try again. Desktop stays locked.", False)
            self.explain_view.get_buffer().set_text(
                "Wrong for now. Ask the hint chat for a nudge — no full spoilers until you solve it."
            )

    def _local_explanation(self, correct: bool) -> str:
        q = self.question
        local = []
        ex = q.get("explanation", {})
        if correct:
            local.append("Why this is right:\n" + ex.get("whyCorrect", ""))
        else:
            local.append("Why wrong:\n" + ex.get("whyIncorrect", ""))
            local.append("Correct reasoning:\n" + ex.get("whyCorrect", ""))
        if ex.get("timeComplexity"):
            local.append("Time: " + ex["timeComplexity"])
        if ex.get("spaceComplexity"):
            local.append("Space: " + ex["spaceComplexity"])
        if ex.get("pitfalls"):
            local.append("Pitfalls:\n- " + "\n- ".join(ex["pitfalls"]))
        if ex.get("followUps"):
            local.append("Follow-ups:\n- " + "\n- ".join(ex["followUps"]))
        return "\n\n".join(local)

    def _show_explanation_async(self, correct: bool, user_answer: str) -> None:
        base = self._local_explanation(correct)
        self.explain_view.get_buffer().set_text(base)
        q = self.question

        def work():
            return openai_chat(
                "You are an interview coach. Write a clear plain-text explanation (no markdown fences). Teach intuition.",
                json.dumps({"question": q, "correct": correct, "userAnswer": user_answer, "facts": base}),
            )

        def done(rich, _err):
            text = (rich or "").strip() or base
            if text.startswith("(OpenAI unavailable"):
                text = base
            self.explain_view.get_buffer().set_text(text)

        run_bg(work, done)

    def _mark_gate_cleared(self, reason: str) -> None:
        self._solved = True
        try:
            CONFIG.mkdir(parents=True, exist_ok=True)
            (CONFIG / "gate-cleared.json").write_text(
                json.dumps(
                    {
                        "ok": True,
                        "action": self.gate,
                        "reason": reason,
                        "at": time.strftime("%Y-%m-%dT%H:%M:%S"),
                    }
                )
                + "\n"
            )
        except OSError:
            pass

    def _finish_unlock(self) -> None:
        self._mark_gate_cleared("solved")
        safe_restore()
        self._ungrab()
        Gtk.main_quit()

    def _unlock_solved(self) -> bool:
        # Always unlock locally first so a hung API cannot freeze the session.
        token = self.token

        def work():
            try:
                if token:
                    api_json(
                        "POST",
                        "/lock/unlock",
                        {"reason": "solved", "token": token},
                        token=token,
                        timeout=2.0,
                    )
                api_json("POST", "/retest/clear", {}, timeout=1.5)
            except Exception:
                pass
            return True

        def done(_r, _e):
            self._finish_unlock()

        run_bg(work, done)
        # Safety: if background never returns, still unlock shortly.
        GLib.timeout_add(2500, lambda: (not self._solved and self._finish_unlock()) or False)
        return False

    def _on_hint(self, *_a) -> None:
        self.hint_level += 1
        q = self.question
        local_hints = [
            f"Pattern focus: what structure fits {q['topic']}?",
            "Name a target complexity before diving into details.",
            "Work a tiny example by hand — what must stay true each step?",
            "Which edge case breaks the naive approach?",
            "Compare brute force vs one improvement idea — still no full solution.",
        ]
        idx = min(self.hint_level - 1, len(local_hints) - 1)
        fallback = local_hints[idx]
        self._append_chat("coach", "Thinking…")
        level = self.hint_level

        def work():
            return openai_chat(
                "Socratic coach. Short hint only. Never reveal the final answer or full solution/code.",
                f"Level {level}/5\nTitle: {q['title']}\n{q['prompt']}\nGive a nudge.",
            )

        def done(rich, _err):
            text = (rich or "").strip() or fallback
            if text.startswith("(OpenAI unavailable"):
                text = fallback
            # Replace last "Thinking…" line if present
            end = self.chat_buf.get_end_iter()
            start = self.chat_buf.get_start_iter()
            content = self.chat_buf.get_text(start, end, False)
            if content.rstrip().endswith("coach: Thinking…"):
                self.chat_buf.set_text(content.rsplit("coach: Thinking…", 1)[0])
            self._append_chat("coach", text)

        run_bg(work, done)

    def _on_chat(self, *_a) -> None:
        msg = self.chat_entry.get_text().strip()
        if not msg:
            return
        self.chat_entry.set_text("")
        self._append_chat("you", msg)
        self._append_chat("coach", "Thinking…")
        q = self.question

        def work():
            return openai_chat(
                "Socratic interview coach. Hints only — never the final answer, option letter, or full code.",
                f"Problem: {q['title']}\n{q['prompt']}\nUser: {msg}",
            )

        def done(rich, _err):
            text = (rich or "").strip() or (
                "Re-state the invariant you need. What would O(n) look like vs O(n²)?"
            )
            if text.startswith("(OpenAI unavailable"):
                text = "Re-state the invariant you need. What would O(n) look like vs O(n²)?"
            end = self.chat_buf.get_end_iter()
            start = self.chat_buf.get_start_iter()
            content = self.chat_buf.get_text(start, end, False)
            if content.rstrip().endswith("coach: Thinking…"):
                self.chat_buf.set_text(content.rsplit("coach: Thinking…", 1)[0])
            self._append_chat("coach", text)

        run_bg(work, done)

    def _on_bypass(self, *_a) -> None:
        key = self.bypass_entry.get_text().strip()
        if not key:
            self._set_status("Type the bypass key first.", False)
            return
        self._set_status("Checking bypass…", None)

        def work():
            return bypass_ok(key)

        def done(ok, _err):
            if ok:
                self._set_status("Bypass accepted.", True)
                self._mark_gate_cleared("bypass")
                safe_restore()
                self._ungrab()
                Gtk.main_quit()
            else:
                self._set_status("Bypass rejected — type the full key (paste blocked).", False)

        run_bg(work, done)

    def _on_win_key(self, _w, event) -> bool:
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

    def _on_focus_out(self, *_a) -> bool:
        if seat_grab_supported():
            GLib.idle_add(self._grab_input)
        try:
            self.present()
        except Exception:
            pass
        return False

    def _on_map(self, *_a) -> bool:
        if seat_grab_supported():
            GLib.idle_add(self._grab_input)
        else:
            self.grab_status.set_text(
                "Wayland safe mode — no exclusive grab; shortcuts disabled; fullscreen"
            )
        return False

    def _grab_input(self) -> bool:
        if not seat_grab_supported():
            self._grab_attempts = 99
            self._grab_ok = False
            self.grab_status.set_text(
                "Wayland safe mode — no exclusive grab; shortcuts disabled; fullscreen"
            )
            return False
        display = self.get_display()
        if display is None:
            self.grab_status.set_text("Grab: no display")
            return False
        seat = display.get_default_seat()
        if seat is None:
            self.grab_status.set_text("Grab: no seat")
            return False
        window = self.get_window()
        if window is None:
            return False
        if self._grab_attempts >= 2 and not self._grab_ok:
            self.grab_status.set_text(
                "Input grab unavailable — shortcuts disabled; staying fullscreen"
            )
            return False
        self._grab_attempts += 1
        caps = Gdk.SeatCapabilities.POINTER | Gdk.SeatCapabilities.KEYBOARD
        try:
            status = seat.grab(
                window,
                caps,
                True,
                None,
                None,
                None,
                None,
            )
            self._grab_ok = status == Gdk.GrabStatus.SUCCESS
        except Exception:
            self._grab_ok = False
        backend = os.environ.get("GDK_BACKEND", "?")
        self.grab_status.set_text(
            f"Input grab: ACTIVE ({backend})"
            if self._grab_ok
            else f"Input grab unavailable ({backend}) — shortcuts disabled; fullscreen"
        )
        return False

    def _ungrab(self) -> None:
        if not self._grab_ok:
            return
        display = self.get_display()
        if not display:
            return
        seat = display.get_default_seat()
        if seat:
            try:
                seat.ungrab()
            except Exception:
                pass
        self._grab_ok = False

    def _tick_focus_and_grab(self) -> bool:
        try:
            self.set_keep_above(True)
        except Exception:
            pass
        try:
            if not self.is_active():
                self.present()
        except Exception:
            pass
        if seat_grab_supported() and not self._grab_ok and self._grab_attempts < 2:
            self._grab_input()
        return True

    def _poll_unlock_status(self) -> bool:
        if self._solved or self._status_poll_busy:
            return True
        self._status_poll_busy = True

        def work():
            return api_json("GET", "/lock/status", timeout=0.8)

        def done(st, err):
            self._status_poll_busy = False
            if err or not st:
                return
            if st.get("unlocked"):
                self._mark_gate_cleared("remote-unlock")
                safe_restore()
                self._ungrab()
                Gtk.main_quit()

        run_bg(work, done)
        return True


def _parse_gate(argv: list[str]) -> str:
    gate = os.environ.get("PREPILO_GATE") or os.environ.get("PREPDESK_GATE", "login")
    if "--gate" in argv:
        i = argv.index("--gate")
        if i + 1 < len(argv):
            gate = argv[i + 1]
    return gate


def _single_instance():
    """Return an open lock file if we own the instance, else None."""
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

    backup = CONFIG / "keybinds-backup.json"
    if backup.exists():
        keybinds.restore()

    ensure_runner()
    token = ""
    try:
        armed = api_json("POST", "/lock/arm", {"source": f"native-shell:{gate}"}, timeout=2.0)
        token = armed.get("token") or ""
    except Exception as e:
        print(f"Lock API arm skipped ({e}); local unlock still works", file=sys.stderr)

    keybinds.snapshot_and_disable()
    atexit.register(safe_restore)

    backend = os.environ.get("GDK_BACKEND", "auto")
    print(f"Prepilo lock starting (gate={gate}, GDK_BACKEND={backend})", flush=True)

    win = NativeLockApp(token, gate=gate)
    win.show_all()

    def _sig(_s, _f):
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

    signal.signal(signal.SIGINT, _sig)
    signal.signal(signal.SIGTERM, _sig)

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
