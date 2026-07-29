"""Native lock question selection + grading (MCQ / objective only)."""

from __future__ import annotations

import json
import random
import re
import time
from pathlib import Path
from typing import Any

from native_bank import builders_for, template_count
from paths import CONFIG, ensure_config

ensure_config()
SEEN_FILE = CONFIG / "native-seen.json"


def _load_seen() -> list[str]:
    try:
        if SEEN_FILE.exists():
            return json.loads(SEEN_FILE.read_text()).get("ids", [])[-500:]
    except Exception:
        pass
    return []


def _save_seen(ids: list[str]) -> None:
    try:
        CONFIG.mkdir(parents=True, exist_ok=True)
        SEEN_FILE.write_text(json.dumps({"ids": ids[-500:]}, indent=2) + "\n")
    except OSError:
        pass


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", s.strip().lower().replace("-", " ").replace("_", " "))


def _fingerprint(q: dict[str, Any]) -> str:
    raw = f"{q.get('kind')}|{q.get('topic')}|{q.get('title')}|{q.get('prompt')}"
    raw = re.sub(r"\d+", "#", raw.lower())
    raw = re.sub(r"\s+", " ", raw).strip()
    return raw[:180]


def _analytics_difficulty() -> str:
    path = CONFIG / "analytics.json"
    try:
        data = json.loads(path.read_text())
        attempts = data.get("attempts") or []
        recent = attempts[-20:]
        if len(recent) < 4:
            return "easy"
        ok = sum(1 for a in recent if a.get("correct")) / len(recent)
        if ok >= 0.85:
            return "medium"
        return "easy"
    except Exception:
        return "easy"


def grade_answer(question: dict[str, Any], answer: str) -> bool:
    if question["kind"] == "mcq":
        for opt in question.get("options", []):
            if opt.get("id") == answer and opt.get("correct"):
                return True
        return False
    u = _norm(answer)
    return any(_norm(a) == u for a in question.get("accepted", []))


def next_lock_question() -> dict[str, Any]:
    difficulty = _analytics_difficulty()
    seen = set(_load_seen())
    pool = builders_for(difficulty)
    random.shuffle(pool)

    chosen = None
    for builder in pool:
        q = builder()
        tid = q.get("templateId") or q.get("title")
        fp = _fingerprint(q)
        if tid in seen or fp in seen:
            continue
        chosen = q
        break
    if chosen is None:
        chosen = random.choice(pool)()

    if chosen["kind"] == "mcq":
        opts = list(chosen["options"])
        random.shuffle(opts)
        for i, o in enumerate(opts):
            o["id"] = chr(ord("a") + i)
        chosen["options"] = opts

    tid = chosen.get("templateId") or chosen["title"]
    seen_list = _load_seen()
    seen_list.append(tid)
    seen_list.append(_fingerprint(chosen))
    _save_seen(seen_list)

    chosen["id"] = f"{tid}-{int(time.time()) % 100000}-{random.randint(100, 999)}"
    chosen["createdAt"] = time.strftime("%Y-%m-%dT%H:%M:%S")
    chosen["bankSize"] = template_count()
    return chosen
