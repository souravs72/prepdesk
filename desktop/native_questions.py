"""Native lock question bank + grading (MCQ / objective only)."""

from __future__ import annotations

import json
import random
import re
import time
from pathlib import Path
from typing import Any

CONFIG = Path.home() / ".config" / "prepdesk"
SEEN_FILE = CONFIG / "native-seen.json"


def _load_seen() -> list[str]:
    try:
        if SEEN_FILE.exists():
            return json.loads(SEEN_FILE.read_text()).get("ids", [])[-400:]
    except Exception:
        pass
    return []


def _save_seen(ids: list[str]) -> None:
    try:
        CONFIG.mkdir(parents=True, exist_ok=True)
        SEEN_FILE.write_text(json.dumps({"ids": ids[-400:]}, indent=2) + "\n")
    except OSError:
        pass


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", s.strip().lower().replace("-", " ").replace("_", " "))


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


BANK: list[dict[str, Any]] = [
    {
        "id": "n-mcq-array-access",
        "kind": "mcq",
        "domain": "dsa",
        "topic": "arrays",
        "difficulty": "easy",
        "company": "General",
        "title": "Array access complexity",
        "prompt": "In a contiguous array in RAM, reading element at a known index is:",
        "options": [
            {"id": "a", "text": "O(1)", "correct": True},
            {"id": "b", "text": "O(log n)", "correct": False, "whyWrong": "That is search, not indexed access."},
            {"id": "c", "text": "O(n)", "correct": False, "whyWrong": "No scan needed when index is known."},
            {"id": "d", "text": "O(n log n)", "correct": False, "whyWrong": "Sorting cost, unrelated."},
        ],
        "explanation": {
            "whyCorrect": "Address = base + index × size → constant-time random access.",
            "whyIncorrect": "Do not confuse access with search.",
            "timeComplexity": "O(1)",
            "spaceComplexity": "O(1)",
            "pitfalls": ["Confusing search with access"],
            "alternatives": ["Linked list access is O(n)"],
            "followUps": ["What about dynamic arrays append?"],
        },
    },
    {
        "id": "n-mcq-hash-lookup",
        "kind": "mcq",
        "domain": "dsa",
        "topic": "hashing",
        "difficulty": "easy",
        "company": "General",
        "title": "Hash map average lookup",
        "prompt": "Average-case lookup in a well-designed hash map is:",
        "options": [
            {"id": "a", "text": "O(1)", "correct": True},
            {"id": "b", "text": "O(log n)", "correct": False, "whyWrong": "Tree maps are O(log n)."},
            {"id": "c", "text": "O(n)", "correct": False, "whyWrong": "Worst case with collisions, not average."},
            {"id": "d", "text": "O(n log n)", "correct": False, "whyWrong": "Not a lookup cost."},
        ],
        "explanation": {
            "whyCorrect": "Good hash + load factor → expected constant bucket work.",
            "whyIncorrect": "Average ≠ worst-case collision chains.",
            "timeComplexity": "Average O(1), worst O(n)",
            "spaceComplexity": "O(n)",
            "pitfalls": ["Ignoring load factor"],
            "alternatives": ["Ordered map O(log n)"],
            "followUps": ["What is load factor?"],
        },
    },
    {
        "id": "n-mcq-bfs",
        "kind": "mcq",
        "domain": "dsa",
        "topic": "graphs",
        "difficulty": "medium",
        "company": "General",
        "title": "BFS shortest path",
        "prompt": "On an unweighted graph, BFS finds shortest hop-paths because:",
        "options": [
            {
                "id": "a",
                "text": "It explores nodes in non-decreasing distance order",
                "correct": True,
            },
            {
                "id": "b",
                "text": "It always uses a min-heap",
                "correct": False,
                "whyWrong": "Dijkstra uses a priority queue; BFS uses FIFO.",
            },
            {
                "id": "c",
                "text": "It only works on DAGs",
                "correct": False,
                "whyWrong": "BFS works on general unweighted graphs.",
            },
            {
                "id": "d",
                "text": "It compresses paths like union-find",
                "correct": False,
                "whyWrong": "Union-find is unrelated to BFS layering.",
            },
        ],
        "explanation": {
            "whyCorrect": "FIFO order reaches each node first via fewest edges.",
            "whyIncorrect": "Do not mix BFS with Dijkstra mechanics.",
            "timeComplexity": "O(V+E)",
            "spaceComplexity": "O(V)",
            "pitfalls": ["Using BFS unchanged on weighted graphs"],
            "alternatives": ["Dijkstra for positive weights"],
            "followUps": ["What is 0-1 BFS?"],
        },
    },
    {
        "id": "n-mcq-isolation",
        "kind": "mcq",
        "domain": "dbms",
        "topic": "dbms",
        "difficulty": "easy",
        "company": "General",
        "title": "ACID Isolation",
        "prompt": "In ACID, Isolation primarily means:",
        "options": [
            {
                "id": "a",
                "text": "Concurrent transactions do not interfere beyond the isolation level",
                "correct": True,
            },
            {
                "id": "b",
                "text": "Data is encrypted at rest",
                "correct": False,
                "whyWrong": "Encryption is security, not Isolation.",
            },
            {
                "id": "c", "text": "The database never crashes",
                "correct": False,
                "whyWrong": "Durability/recovery handle crashes.",
            },
            {
                "id": "d",
                "text": "All columns are atomic",
                "correct": False,
                "whyWrong": "Atomicity is the A in ACID for transactions.",
            },
        ],
        "explanation": {
            "whyCorrect": "Isolation controls concurrent visibility (RC, RR, SERIALIZABLE…).",
            "whyIncorrect": "Do not confuse with encryption or durability.",
            "pitfalls": ["Assuming SERIALIZABLE is free"],
            "alternatives": ["MVCC"],
            "followUps": ["Dirty read vs phantom read?"],
        },
    },
    {
        "id": "n-mcq-tcp",
        "kind": "mcq",
        "domain": "networking",
        "topic": "networking",
        "difficulty": "easy",
        "company": "General",
        "title": "TCP vs UDP",
        "prompt": "TCP is preferred over UDP when you need:",
        "options": [
            {"id": "a", "text": "Reliable, ordered byte-stream delivery", "correct": True},
            {
                "id": "b",
                "text": "Lowest latency with no retransmission",
                "correct": False,
                "whyWrong": "That favors UDP.",
            },
            {
                "id": "c",
                "text": "No connection state ever",
                "correct": False,
                "whyWrong": "TCP is connection-oriented.",
            },
            {
                "id": "d",
                "text": "Multicast as the default mode",
                "correct": False,
                "whyWrong": "Multicast is more natural with UDP.",
            },
        ],
        "explanation": {
            "whyCorrect": "TCP provides reliability, ordering, congestion control.",
            "whyIncorrect": "UDP trades reliability for simplicity/latency.",
            "pitfalls": ["Assuming TCP is always faster"],
            "alternatives": ["QUIC"],
            "followUps": ["Three-way handshake?"],
        },
    },
    {
        "id": "n-obj-complement",
        "kind": "objective",
        "domain": "dsa",
        "topic": "hashing",
        "difficulty": "easy",
        "company": "General",
        "title": "Two-sum complement",
        "prompt": "In hash-map two-sum, for value x and target T you look up which expression? (e.g. T - x)",
        "accepted": ["t - x", "t-x", "target - x", "target-x"],
        "explanation": {
            "whyCorrect": "You need a prior value that pairs with x to form T → complement T−x.",
            "whyIncorrect": "Looking up x again does not find a partner.",
            "timeComplexity": "O(n) expected",
            "spaceComplexity": "O(n)",
            "pitfalls": ["Same index twice"],
            "alternatives": ["Sort + two pointers"],
            "followUps": ["Three-sum?"],
        },
    },
    {
        "id": "n-obj-lifo",
        "kind": "objective",
        "domain": "dsa",
        "topic": "stacks",
        "difficulty": "easy",
        "company": "General",
        "title": "Parentheses stack discipline",
        "prompt": "Valid parentheses matching uses which order discipline? Answer FIFO or LIFO.",
        "accepted": ["lifo"],
        "explanation": {
            "whyCorrect": "Most recently opened bracket must close first — LIFO.",
            "whyIncorrect": "FIFO would break nesting.",
            "timeComplexity": "O(n)",
            "spaceComplexity": "O(n)",
            "pitfalls": ["Counting without order"],
            "alternatives": ["Counter for one bracket type only"],
            "followUps": ["Minimum removals to make valid?"],
        },
    },
    {
        "id": "n-obj-having",
        "kind": "objective",
        "domain": "sql",
        "topic": "sql",
        "difficulty": "easy",
        "company": "General",
        "title": "HAVING vs WHERE",
        "prompt": "Which clause filters groups after aggregation: WHERE or HAVING?",
        "accepted": ["having"],
        "explanation": {
            "whyCorrect": "WHERE filters rows before GROUP BY; HAVING filters groups after aggregates.",
            "whyIncorrect": "WHERE cannot reference aggregates the way HAVING does.",
            "pitfalls": ["Putting COUNT(*) in WHERE"],
            "alternatives": ["Filter in a CTE"],
            "followUps": ["COUNT(*) vs COUNT(col)?"],
        },
    },
    {
        "id": "n-obj-cap",
        "kind": "objective",
        "domain": "system-design",
        "topic": "system-design",
        "difficulty": "medium",
        "company": "General",
        "title": "CAP under partition",
        "prompt": "Under network Partition, CAP forces a choice between Consistency and ___ (one word).",
        "accepted": ["availability", "a"],
        "explanation": {
            "whyCorrect": "With P, systems lean CP or AP.",
            "whyIncorrect": "Latency/durability are not the CAP dichotomy under P.",
            "pitfalls": ["Misquoting CAP"],
            "alternatives": ["PACELC"],
            "followUps": ["Example AP system?"],
        },
    },
    {
        "id": "n-obj-page-tlb",
        "kind": "objective",
        "domain": "os",
        "topic": "os",
        "difficulty": "medium",
        "company": "General",
        "title": "Page fault vs TLB miss",
        "prompt": "A referenced page is in RAM but not in the TLB. Is that a page fault? yes/no",
        "accepted": ["no", "n", "false"],
        "explanation": {
            "whyCorrect": "That is a TLB miss; a page fault is about page table presence/mapping.",
            "whyIncorrect": "TLB miss ≠ page fault.",
            "pitfalls": ["Using terms interchangeably"],
            "alternatives": ["Page-table walk / TLB refill"],
            "followUps": ["Major vs minor fault?"],
        },
    },
    {
        "id": "n-obj-threads-heap",
        "kind": "objective",
        "domain": "os",
        "topic": "os",
        "difficulty": "easy",
        "company": "General",
        "title": "Thread shared memory",
        "prompt": "Do threads of the same process share the same heap by default? yes/no",
        "accepted": ["yes", "y", "true"],
        "explanation": {
            "whyCorrect": "Threads share process address space; each has its own stack.",
            "whyIncorrect": "Do not confuse with separate processes.",
            "pitfalls": ["No synchronization on shared heap"],
            "alternatives": ["Processes for isolation"],
            "followUps": ["What is a race condition?"],
        },
    },
    {
        "id": "n-mcq-dp",
        "kind": "mcq",
        "domain": "dsa",
        "topic": "dp",
        "difficulty": "medium",
        "company": "General",
        "title": "DP hallmark",
        "prompt": "Dynamic programming is most appropriate when a problem has:",
        "options": [
            {
                "id": "a",
                "text": "Optimal substructure and overlapping subproblems",
                "correct": True,
            },
            {
                "id": "b",
                "text": "Only greedy choice property",
                "correct": False,
                "whyWrong": "Greedy is a different technique.",
            },
            {
                "id": "c",
                "text": "Only divide-and-conquer with disjoint work",
                "correct": False,
                "whyWrong": "Pure D&C may not need memoization.",
            },
            {
                "id": "d",
                "text": "Constant-time closed form only",
                "correct": False,
                "whyWrong": "Closed forms are optional.",
            },
        ],
        "explanation": {
            "whyCorrect": "DP stores overlapping subproblems and combines via optimal substructure.",
            "whyIncorrect": "Greedy/D&C alone are not DP.",
            "pitfalls": ["Wrong state definition"],
            "alternatives": ["Greedy when exchange argument holds"],
            "followUps": ["Top-down vs bottom-up?"],
        },
    },
]


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
    if difficulty == "easy":
        pool = [q for q in BANK if q["difficulty"] == "easy"]
    else:
        pool = list(BANK)
    unused = [q for q in pool if q["id"] not in seen] or pool
    src = random.choice(unused)
    q = json.loads(json.dumps(src))
    if q["kind"] == "mcq":
        opts = list(q["options"])
        random.shuffle(opts)
        for i, o in enumerate(opts):
            o["id"] = chr(ord("a") + i)
        q["options"] = opts
    seen_list = _load_seen()
    seen_list.append(src["id"])
    _save_seen(seen_list)
    q["createdAt"] = time.strftime("%Y-%m-%dT%H:%M:%S")
    return q
