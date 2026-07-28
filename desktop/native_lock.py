#!/usr/bin/env python3
"""PrepDesk Native Lock — pure GTK desktop lockdown (no browser / WebKit UI)."""

from __future__ import annotations

import atexit
import json
import os
import re
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

import gi

gi.require_version("Gtk", "3.0")
gi.require_version("Gdk", "3.0")
from gi.repository import Gdk, GLib, Gtk, Pango  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))
import keybinds  # noqa: E402
from native_questions import grade_answer, next_lock_question  # noqa: E402

API = "http://127.0.0.1:4789"
CONFIG = Path.home() / ".config" / "prepdesk"
DIGEST_ENV = Path.home() / ".config" / "daily-work-digest" / ".env"
DIGEST_CFG = Path.home() / ".config" / "daily-work-digest" / "config.yaml"

_restored = False
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


def api_json(method: str, path: str, payload: dict | None = None, token: str | None = None) -> dict:
    data = None if payload is None else json.dumps(payload).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["X-Prepdesk-Token"] = token
    req = urllib.request.Request(
        f"{API}{path}",
        data=data,
        headers=headers,
        method=method,
    )
    with urllib.request.urlopen(req, timeout=8) as r:
        return json.loads(r.read().decode())


def wait_api(tries: int = 40) -> bool:
    for _ in range(tries):
        try:
            api_json("GET", "/health")
            return True
        except Exception:
            time.sleep(0.35)
    return False


def ensure_runner() -> None:
    try:
        api_json("GET", "/health")
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
        print("PrepDesk API failed to start (npm run runner)", file=sys.stderr)
        sys.exit(1)


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
    def __init__(self, token: str):
        super().__init__(title="PrepDesk Native Lock")
        self.token = token
        self.question = next_lock_question()
        self.hint_level = 0
        self._grab_ok = False

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

        brand = Gtk.Label(label="PREPDESK NATIVE LOCK")
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

        GLib.timeout_add(400, self._tick_focus_and_grab)
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
        try:
            api_json(
                "POST",
                "/analytics/attempt",
                {
                    "questionId": self.question["id"],
                    "correct": ok,
                    "kind": self.question["kind"],
                    "topic": self.question["topic"],
                    "domain": self.question.get("domain", "dsa"),
                    "difficulty": self.question["difficulty"],
                    "timeSpentMs": 0,
                    "at": time.strftime("%Y-%m-%dT%H:%M:%S"),
                    "userAnswer": ans,
                },
            )
        except Exception:
            pass

        if ok:
            self._set_status("Correct — unlocking…", True)
            self._show_explanation(True, ans)
            GLib.timeout_add(800, self._unlock_solved)
        else:
            self._set_status("Not quite — use hints, then try again. Desktop stays locked.", False)
            self.explain_view.get_buffer().set_text(
                "Wrong for now. Ask the hint chat for a nudge — no full spoilers until you solve it."
            )

    def _show_explanation(self, correct: bool, user_answer: str) -> None:
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
        base = "\n\n".join(local)

        rich = openai_chat(
            "You are an interview coach. Write a clear plain-text explanation (no markdown fences). Teach intuition.",
            json.dumps({"question": q, "correct": correct, "userAnswer": user_answer, "facts": base}),
        )
        self.explain_view.get_buffer().set_text(rich.strip() or base)

    def _unlock_solved(self) -> bool:
        try:
            api_json("POST", "/lock/unlock", {"reason": "solved", "token": self.token}, token=self.token)
            api_json("POST", "/retest/clear", {})
        except Exception as e:
            self._set_status(f"Unlock API failed: {e}", False)
            return False
        safe_restore()
        self._ungrab()
        Gtk.main_quit()
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
        rich = openai_chat(
            "Socratic coach. Short hint only. Never reveal the final answer or full solution/code.",
            f"Level {self.hint_level}/5\nTitle: {q['title']}\n{q['prompt']}\nGive a nudge.",
        )
        self._append_chat("coach", (rich or local_hints[idx]).strip())

    def _on_chat(self, *_a) -> None:
        msg = self.chat_entry.get_text().strip()
        if not msg:
            return
        self.chat_entry.set_text("")
        self._append_chat("you", msg)
        q = self.question
        rich = openai_chat(
            "Socratic interview coach. Hints only — never the final answer, option letter, or full code.",
            f"Problem: {q['title']}\n{q['prompt']}\nUser: {msg}",
        )
        if not rich:
            rich = "Re-state the invariant you need. What would O(n) look like vs O(n²)?"
        self._append_chat("coach", rich.strip())

    def _on_bypass(self, *_a) -> None:
        key = self.bypass_entry.get_text().strip()
        try:
            api_json("POST", "/lock/bypass", {"key": key})
            api_json("POST", "/retest/clear", {})
            self._set_status("Bypass accepted.", True)
            safe_restore()
            self._ungrab()
            Gtk.main_quit()
        except Exception:
            self._set_status("Bypass rejected — type the full key (paste blocked).", False)

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
        GLib.idle_add(self._grab_input)
        self.present()
        return False

    def _on_map(self, *_a) -> bool:
        GLib.idle_add(self._grab_input)
        return False

    def _grab_input(self) -> bool:
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
        caps = Gdk.SeatCapabilities.POINTER | Gdk.SeatCapabilities.KEYBOARD
        status = seat.grab(
            window,
            caps,
            False,  # owner_events
            None,  # cursor
            None,  # event
            None,
            None,
        )
        self._grab_ok = status == Gdk.GrabStatus.SUCCESS
        # Wayland may return non-success; still keep keybinds disabled + fullscreen
        self.grab_status.set_text(
            "Input grab: ACTIVE (keyboard + mouse)"
            if self._grab_ok
            else "Input grab: limited on this session (Wayland) — shortcuts still disabled; staying fullscreen"
        )
        return False

    def _ungrab(self) -> None:
        display = self.get_display()
        if not display:
            return
        seat = display.get_default_seat()
        if seat:
            try:
                seat.ungrab()
            except Exception:
                pass

    def _tick_focus_and_grab(self) -> bool:
        self.present()
        self.set_keep_above(True)
        try:
            self.fullscreen()
        except Exception:
            pass
        if not self._grab_ok:
            self._grab_input()
        try:
            st = api_json("GET", "/lock/status")
            if st.get("unlocked"):
                safe_restore()
                self._ungrab()
                Gtk.main_quit()
                return False
        except Exception:
            pass
        return True


def main() -> int:
    global _restored
    _restored = False
    backup = CONFIG / "keybinds-backup.json"
    if backup.exists():
        keybinds.restore()

    ensure_runner()
    try:
        armed = api_json("POST", "/lock/arm", {"source": "native-shell"})
    except urllib.error.URLError:
        print("Cannot reach PrepDesk API", file=sys.stderr)
        return 1
    token = armed.get("token") or ""
    if not token:
        print("No lock token", file=sys.stderr)
        return 1

    keybinds.snapshot_and_disable()
    atexit.register(safe_restore)

    win = NativeLockApp(token)
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
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
