"""Combinatorial question templates for Prepilo native lock."""

from __future__ import annotations

import random
from typing import Any, Callable

Builder = Callable[[], dict[str, Any]]


def _opts(*pairs: tuple[str, bool, str | None]) -> list[dict[str, Any]]:
    out = []
    for text, correct, why in pairs:
        d: dict[str, Any] = {"text": text, "correct": correct}
        if why and not correct:
            d["whyWrong"] = why
        out.append(d)
    return out


def _mcq(
    tid: str,
    domain: str,
    topic: str,
    difficulty: str,
    title: str,
    prompt: str,
    options: list[dict[str, Any]],
    why: str,
    *,
    why_bad: str = "",
    time: str | None = None,
    space: str | None = None,
    pitfalls: list[str] | None = None,
    alts: list[str] | None = None,
    follow: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "templateId": tid,
        "kind": "mcq",
        "domain": domain,
        "topic": topic,
        "difficulty": difficulty,
        "company": "General",
        "title": title,
        "prompt": prompt,
        "options": options,
        "explanation": {
            "whyCorrect": why,
            "whyIncorrect": why_bad or "Eliminate distractors using the core definition.",
            "timeComplexity": time,
            "spaceComplexity": space,
            "pitfalls": pitfalls or [],
            "alternatives": alts or [],
            "followUps": follow or [],
        },
    }


def _obj(
    tid: str,
    domain: str,
    topic: str,
    difficulty: str,
    title: str,
    prompt: str,
    accepted: list[str],
    why: str,
    why_bad: str,
    *,
    time: str | None = None,
    space: str | None = None,
    pitfalls: list[str] | None = None,
    alts: list[str] | None = None,
    follow: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "templateId": tid,
        "kind": "objective",
        "domain": domain,
        "topic": topic,
        "difficulty": difficulty,
        "company": "General",
        "title": title,
        "prompt": prompt,
        "accepted": accepted,
        "explanation": {
            "whyCorrect": why,
            "whyIncorrect": why_bad,
            "timeComplexity": time,
            "spaceComplexity": space,
            "pitfalls": pitfalls or [],
            "alternatives": alts or [],
            "followUps": follow or [],
        },
    }


def _builders() -> list[Builder]:
    b: list[Builder] = []

    b.append(lambda: _mcq(
        "mcq-array-access", "dsa", "arrays", "easy", "Array access complexity",
        f"In a contiguous array of {random.randint(4, 14)} ints in RAM, reading a known index is:",
        _opts(("O(1)", True, None), ("O(log n)", False, "Search, not access."), ("O(n)", False, "No scan needed."), ("O(n log n)", False, "Sorting cost.")),
        "Address = base + index × size → O(1).", time="O(1)", space="O(1)",
        pitfalls=["Confusing search with access"], follow=["Linked list access cost?"]))

    b.append(lambda: _mcq(
        "mcq-hash-lookup", "dsa", "hashing", "easy", "Hash map average lookup",
        "Average-case lookup in a well-designed hash map is:",
        _opts(("O(1)", True, None), ("O(log n)", False, "Tree maps."), ("O(n)", False, "Worst case."), ("O(n log n)", False, "Not lookup.")),
        "Good hash + load factor → expected constant work.", time="Avg O(1)", space="O(n)",
        follow=["What is load factor?"]))

    b.append(lambda: _mcq(
        "mcq-two-ptr", "dsa", "two-pointers", "easy", "Two-sum on sorted array",
        f"Sorted array two-sum to target {random.randint(8, 24)} with two pointers is typically:",
        _opts(("O(n) time, O(1) space", True, None), ("O(n²) always", False, "Pointers avoid nested loops."), ("O(log n)", False, "Still linear scan."), ("O(n) time, O(n) space required", False, "Hash optional.")),
        "Each index moves at most once.", time="O(n)", space="O(1)"))

    b.append(lambda: _mcq(
        "mcq-binsearch", "dsa", "binary-search", "easy", "Binary search complexity",
        "Binary search on a sorted array of n distinct elements is:",
        _opts(("O(log n)", True, None), ("O(n)", False, "Linear scan."), ("O(1)", False, "Not by value."), ("O(n log n)", False, "Sorting.")),
        "Each step halves the range.", time="O(log n)"))

    b.append(lambda: _mcq(
        "mcq-bfs", "dsa", "graphs", "medium", "BFS shortest path",
        "On an unweighted graph, BFS finds shortest hop-paths because:",
        _opts(("Explores in non-decreasing distance order", True, None), ("Always uses a min-heap", False, "Dijkstra uses PQ."), ("Only works on DAGs", False, "Works generally."), ("Like union-find path compression", False, "Unrelated.")),
        "FIFO reaches each node via fewest edges first.", time="O(V+E)"))

    b.append(lambda: _mcq(
        "mcq-dp", "dsa", "dp", "medium", "DP hallmark",
        "Dynamic programming fits when a problem has:",
        _opts(("Optimal substructure and overlapping subproblems", True, None), ("Only greedy choice", False, "Different technique."), ("Only disjoint D&C", False, "May not need memo."), ("Closed form only", False, "Optional.")),
        "Store overlapping subproblems; combine optimally."))

    b.append(lambda: _mcq(
        "mcq-parens", "dsa", "stacks", "easy", "Valid parentheses",
        "Valid parentheses is classically solved with a stack because:",
        _opts(("LIFO matching of latest opener", True, None), ("O(1) middle access", False, "Stacks lack that."), ("Queues match better", False, "FIFO breaks nesting."), ("Hash maps alone guarantee nesting", False, "Need stack order.")),
        "Nesting needs last-opened-first-closed.", time="O(n)", space="O(n)"))

    b.append(lambda: _mcq(
        "mcq-bst-inorder", "dsa", "trees", "easy", "BST inorder",
        "Inorder traversal of a BST yields keys in:",
        _opts(("Sorted ascending order", True, None), ("Level order", False, "That is BFS."), ("Random order", False, "Deterministic."), ("Descending only", False, "Reverse inorder.")),
        "Left → node → right visits keys least to greatest."))

    b.append(lambda: _mcq(
        "mcq-heap-k", "dsa", "heaps", "medium", "Heap for k-th largest",
        f"Streaming {random.randint(3, 8)}-th largest with a bounded heap commonly uses:",
        _opts(("A min-heap of size k", True, None), ("Max-heap of size k only", False, "Wrong polarity for k-th."), ("Rebuild sorted array each insert", False, "Too slow."), ("BFS queue", False, "Wrong tool.")),
        "Min-heap of size k: root is k-th largest.", time="O(n log k)", space="O(k)"))

    b.append(lambda: _mcq(
        "mcq-stable-sort", "dsa", "sorting", "easy", "Stable sort",
        "A sort is stable if:",
        _opts(("Equal keys keep relative input order", True, None), ("Always O(n log n)", False, "≠ stability."), ("Uses O(1) memory", False, "In-place ≠ stable."), ("Must be comparison-based", False, "Radix can be stable.")),
        "Stability preserves order among ties."))

    b.append(lambda: _mcq(
        "mcq-dyn-append", "dsa", "arrays", "medium", "Dynamic array append",
        "Appending to a dynamic array that doubles when full is:",
        _opts(("O(1) amortized", True, None), ("O(n) amortized", False, "Resizes amortize."), ("O(log n) amortized", False, "Geometric → O(1)."), ("O(n²) amortized", False, "Bad growth.")),
        "Geometric growth spreads copy cost.", time="O(1) amortized"))

    b.append(lambda: _mcq(
        "mcq-ll-mid", "dsa", "linked-lists", "easy", "Middle of linked list",
        "Middle of a singly linked list in one pass uses:",
        _opts(("Slow and fast pointers", True, None), ("Binary search on indices", False, "No random access."), ("Max-heap of nodes", False, "Unrelated."), ("DFS only", False, "Overkill.")),
        "Fast moves 2×; when fast ends, slow is mid.", time="O(n)", space="O(1)"))

    b.append(lambda: _mcq(
        "mcq-uf", "dsa", "union-find", "medium", "Union-Find use case",
        "Disjoint-set (Union-Find) naturally fits:",
        _opts(("Connectivity / component merges", True, None), ("Negative-weight shortest paths", False, "Bellman-Ford."), ("Ordered BST iteration", False, "No order."), ("LRU eviction", False, "List+hash.")),
        "UF tracks partitions under union/find."))

    b.append(lambda: _mcq(
        "mcq-trie", "dsa", "tries", "medium", "Trie strength",
        "A trie shines for:",
        _opts(("Fast prefix queries over many strings", True, None), ("O(1) index access", False, "Arrays."), ("Guaranteed O(1) like hashing", False, "Depends on length."), ("Priority extraction", False, "Heaps.")),
        "Shared prefixes help autocomplete / prefix counts."))

    b.append(lambda: _mcq(
        "mcq-greedy", "dsa", "greedy", "medium", "Greedy correctness",
        "Greedy is safe when you can prove:",
        _opts(("Local choice yields global optimum", True, None), ("Subproblems always overlap", False, "DP."), ("Graph is complete", False, "Unrelated."), ("n is power of two", False, "Unrelated.")),
        "Needs exchange/stay-ahead style proof."))

    b.append(lambda: _mcq(
        "mcq-growth", "dsa", "complexity", "easy", "Growth rates",
        "As n → ∞, which grows fastest?",
        _opts(("O(2ⁿ)", True, None), ("O(n²)", False, "Poly < exp."), ("O(n log n)", False, "Slower."), ("O(n)", False, "Slower.")),
        "Exponential dominates polynomials."))

    b.append(lambda: _mcq(
        "mcq-queue-bfs", "dsa", "queues", "easy", "BFS structure",
        "BFS frontier typically uses:",
        _opts(("FIFO queue", True, None), ("LIFO stack", False, "DFS."), ("Max-heap by id", False, "Not classic BFS."), ("Sorted edge set", False, "Unnecessary.")),
        "FIFO expands level by level."))

    b.append(lambda: _mcq(
        "mcq-twosum-space", "dsa", "hashing", "easy", "Two-sum space tradeoff",
        "Hash-map two-sum (unsorted) typically trades:",
        _opts(("O(n) space for O(n) expected time", True, None), ("O(1) space for O(n log n) only", False, "Sort+pointers."), ("O(n²) space for O(1)", False, "Not classic."), ("No tradeoff", False, "There is one.")),
        "Store seen values for expected linear time."))

    b.append(lambda: _mcq(
        "mcq-process-thread", "os", "os", "easy", "Process vs thread",
        "Compared to processes, threads in the same process typically:",
        _opts(("Share address space; cheaper create/switch", True, None), ("Never share memory", False, "They share heap."), ("Always separate page tables", False, "Shared AS."), ("Cannot run multi-core", False, "They can.")),
        "Threads share process address space."))

    b.append(lambda: _mcq(
        "mcq-page-fault", "os", "os", "easy", "Page fault",
        "A page fault occurs when:",
        _opts(("CPU refs a page not mapped/present as required", True, None), ("Disk checksum fails", False, "IO error."), ("Mutex contended", False, "Sync."), ("TLB fully associative", False, "Unrelated.")),
        "MMU faults on missing/invalid mapping."))

    b.append(lambda: _mcq(
        "mcq-rr", "os", "os", "medium", "Round-robin",
        "Round-robin scheduling primarily:",
        _opts(("Shares time fairly with a quantum", True, None), ("Minimizes wait optimally always", False, "SJF better for avg wait."), ("Eliminates context switches", False, "Causes many."), ("Only I/O-bound priority", False, "Different policy.")),
        "Rotate ready tasks each quantum."))

    b.append(lambda: _mcq(
        "mcq-deadlock", "os", "os", "medium", "Deadlock conditions",
        "Which is NOT a Coffman deadlock condition?",
        _opts(("Preemption of all CPU caches", True, None), ("Mutual exclusion", False, "Is a condition."), ("Hold and wait", False, "Is a condition."), ("Circular wait", False, "Is a condition.")),
        "Four: mutex, hold-and-wait, no preemption, circular wait."))

    b.append(lambda: _mcq(
        "mcq-acid-i", "dbms", "dbms", "easy", "ACID Isolation",
        "In ACID, Isolation primarily means:",
        _opts(("Concurrent txns obey the isolation level", True, None), ("Encrypted at rest", False, "Security."), ("DB never crashes", False, "Durability."), ("Columns are atomic", False, "Atomicity.")),
        "Controls concurrent visibility."))

    b.append(lambda: _mcq(
        "mcq-inner-join", "sql", "sql", "easy", "INNER JOIN",
        "INNER JOIN of A and B returns:",
        _opts(("Only matching join-key rows", True, None), ("All A rows with NULLs for misses", False, "LEFT JOIN."), ("Always Cartesian product", False, "CROSS JOIN."), ("Only rows unique to A", False, "Anti-join.")),
        "Intersection under the join predicate."))

    b.append(lambda: _mcq(
        "mcq-bplus", "dbms", "dbms", "medium", "B+ tree index",
        "OLTP DBs often use B+ tree indexes because they:",
        _opts(("Keep keys ordered; high fanout cuts disk I/O", True, None), ("Are always O(1) like perfect hash", False, "Logarithmic height."), ("Store unordered bags only", False, "Order matters."), ("Replace transactions", False, "Unrelated.")),
        "Short trees + ordered leaves fit range scans."))

    b.append(lambda: _mcq(
        "mcq-3nf", "dbms", "dbms", "medium", "Third normal form",
        "3NF roughly requires non-key attributes:",
        _opts(("Depend on the key, whole key, nothing but key", True, None), ("Must be encrypted", False, "Unrelated."), ("Must be composite PK", False, "Not required."), ("Cannot be indexed", False, "Unrelated.")),
        "No transitive deps of non-keys on non-keys."))

    b.append(lambda: _mcq(
        "mcq-cache", "system-design", "system-design", "easy", "Caching layer",
        "Redis in front of Postgres for a read-heavy API primarily:",
        _opts(("Cuts DB load and read latency", True, None), ("Replaces backups", False, "Volatile."), ("Guarantees strong consistency", False, "Often stale."), ("Eliminates network hops", False, "Adds a hop.")),
        "Hot keys served from memory."))

    b.append(lambda: _mcq(
        "mcq-horiz", "system-design", "system-design", "easy", "Horizontal scaling",
        "Horizontal scaling means:",
        _opts(("Adding more machines", True, None), ("Upgrading one machine", False, "Vertical."), ("Only DB sharding never apps", False, "Apps scale too."), ("Removing load balancers", False, "LBs enable it.")),
        "Scale-out adds nodes."))

    b.append(lambda: _mcq(
        "mcq-idem", "system-design", "system-design", "medium", "Idempotent APIs",
        "Idempotent APIs matter under retries because:",
        _opts(("Repeating request must not double side effects", True, None), ("Always faster", False, "≠ speed."), ("Disable TLS", False, "Unrelated."), ("Require UDP", False, "Unrelated.")),
        "Networks retry; need safe re-send semantics."))

    b.append(lambda: _mcq(
        "mcq-lb", "system-design", "system-design", "easy", "Load balancer",
        "A load balancer primarily:",
        _opts(("Distributes requests across healthy instances", True, None), ("Stores durable source-of-truth data", False, "DB/object store."), ("Compiles code", False, "Unrelated."), ("Replaces auth", False, "Separate concern.")),
        "Spread traffic + health checks."))

    b.append(lambda: _mcq(
        "mcq-tcp", "networking", "networking", "easy", "TCP vs UDP",
        "Prefer TCP over UDP when you need:",
        _opts(("Reliable ordered byte-stream", True, None), ("Lowest latency no retransmit", False, "UDP."), ("No connection state", False, "TCP is connected."), ("Multicast default", False, "UDP-ish.")),
        "Reliability + ordering + congestion control."))

    b.append(lambda: _mcq(
        "mcq-dns", "networking", "networking", "easy", "DNS purpose",
        "DNS primarily maps:",
        _opts(("Names → IP / related records", True, None), ("SQL tables → indexes", False, "DB."), ("Pixels → colors", False, "Unrelated."), ("Threads → CPUs", False, "Scheduler.")),
        "Name resolution for connectivity."))

    b.append(lambda: _mcq(
        "mcq-409", "networking", "networking", "medium", "HTTP 409",
        "HTTP 409 Conflict typically means:",
        _opts(("Request conflicts with current resource state", True, None), ("Unauthorized", False, "401/403."), ("Teapot", False, "418."), ("Gateway timeout", False, "504.")),
        "State conflict (version, unique key, etc.)."))

    b.append(lambda: _mcq(
        "mcq-encap", "oop", "oop", "easy", "Encapsulation",
        "Encapsulation primarily means:",
        _opts(("Bundle data+methods; hide internals", True, None), ("Always multi-inherit concrete classes", False, "Inheritance."), ("Operator overloading only", False, "Separate."), ("Multi-core execution", False, "Unrelated.")),
        "Stable interface; hidden representation."))

    b.append(lambda: _mcq(
        "mcq-poly", "oop", "oop", "easy", "Polymorphism",
        "Runtime polymorphism lets you:",
        _opts(("Call subclass behavior via base/interface ref", True, None), ("Force fields public", False, "Unrelated."), ("Disable GC", False, "Unrelated."), ("Guarantee O(1) calls", False, "Not the point.")),
        "Same call site; different implementations."))

    # Objectives
    b.append(lambda: _obj(
        "obj-second-max", "dsa", "arrays", "easy", "Second-largest one pass",
        f"Second-largest distinct in unsorted array of {random.randint(6, 12)} ints, one O(n) pass O(1) space. Two vars? (e.g. max, secondMax)",
        ["max, secondmax", "max, second max", "largest, second largest", "max1, max2"],
        "Track best and second-best; demote on new max.", "Sorting is O(n log n).", time="O(n)", space="O(1)"))

    b.append(lambda: _obj(
        "obj-complement", "dsa", "hashing", "easy", "Two-sum complement",
        "Hash-map two-sum: for x and target T look up which expression? (e.g. T - x)",
        ["t - x", "t-x", "target - x", "target-x"],
        "Partner is complement T−x.", "Looking up x again finds no partner.", time="O(n)", space="O(n)"))

    b.append(lambda: _obj(
        "obj-bs-exit", "dsa", "binary-search", "easy", "Binary search miss",
        "Inclusive [low, high] binary search; target absent — what is true of the range when the loop stops? (empty / bounds crossed)",
        [
            "empty", "empty range", "the range is empty", "bounds crossed", "bounds cross",
            "low crosses high", "low > high", "lo > hi", "left > right", "start > end",
            "interval empty", "no elements left",
        ],
        "Empty range when bounds cross.", "A single remaining index can still be probed.", time="O(log n)"))

    b.append(lambda: _obj(
        "obj-two-ptr-hi", "dsa", "two-pointers", "medium", "Sorted two-sum move",
        "Sorted array, ends pointers. If a[lo]+a[hi] too large, which moves? lo or hi",
        ["hi", "high", "right", "end"],
        "Too large → move hi left.", "Moving lo usually increases sum.", time="O(n)"))

    b.append(lambda: _obj(
        "obj-lifo", "dsa", "stacks", "easy", "Parentheses discipline",
        "Valid parentheses uses which order? FIFO or LIFO",
        ["lifo"],
        "Last opened closes first.", "FIFO breaks nesting.", time="O(n)"))

    b.append(lambda: _obj(
        "obj-bfs-dij", "dsa", "graphs", "medium", "BFS vs Dijkstra",
        f"Hop-count shortest paths on unweighted graph ({random.randint(5, 12)} verts): BFS or Dijkstra?",
        ["bfs", "breadth first search", "breadth-first search"],
        "BFS layers = hop distance.", "Dijkstra works but unnecessary.", time="O(V+E)"))

    b.append(lambda: _obj(
        "obj-dp-two", "dsa", "dp", "medium", "DP ingredients",
        "Two classic DP properties (comma-separated). Hint: optimal ___ and overlapping ___.",
        ["optimal substructure, overlapping subproblems", "overlapping subproblems, optimal substructure",
         "optimal substructure and overlapping subproblems"],
        "Reuse overlapping subproblems via optimal substructure.", "Greedy alone is not enough."))

    b.append(lambda: _obj(
        "obj-threads", "os", "os", "easy", "Thread shared heap",
        "Do threads of same process share the heap by default? yes/no",
        ["yes", "y", "true"],
        "Shared address space; private stacks.", "Not separate processes."))

    b.append(lambda: _obj(
        "obj-tlb", "os", "os", "medium", "TLB vs page fault",
        "Page in RAM but not in TLB — is that a page fault? yes/no",
        ["no", "n", "false"],
        "TLB miss ≠ page fault.", "Fault is about page-table presence/mapping."))

    b.append(lambda: _obj(
        "obj-acid", "dbms", "dbms", "easy", "ACID letter",
        "ACID letter for preventing bad concurrent interference?",
        ["i", "isolation"],
        "Isolation = concurrent visibility rules.", "A/C/D are other guarantees."))

    b.append(lambda: _obj(
        "obj-having", "sql", "sql", "easy", "HAVING vs WHERE",
        "Which filters groups after aggregation: WHERE or HAVING?",
        ["having"],
        "HAVING after GROUP BY; WHERE before.", "WHERE cannot use aggregates the same way."))

    b.append(lambda: _obj(
        "obj-cache", "system-design", "system-design", "easy", "Cache purpose",
        "Redis before Postgres primarily reduces: latency or durability or encryption?",
        ["latency", "load", "database load"],
        "Cuts latency/load; not backups/encryption.", "Caches are not durability."))

    b.append(lambda: _obj(
        "obj-cap", "system-design", "system-design", "medium", "CAP under P",
        "Under Partition, CAP chooses between Consistency and ___ (one word).",
        ["availability", "a"],
        "CP vs AP under partition.", "Not latency/durability as the CAP pair."))

    b.append(lambda: _obj(
        "obj-tcp", "networking", "networking", "easy", "TCP property",
        "TCP mainly adds over raw IP: reliability or multicast?",
        ["reliability", "reliable delivery", "reliable"],
        "Reliable ordered stream.", "Multicast is not TCP’s strength."))

    b.append(lambda: _obj(
        "obj-fifo", "dsa", "queues", "easy", "Queue order",
        "Classic queue order: FIFO or LIFO?",
        ["fifo"],
        "First-in, first-out.", "LIFO is a stack."))

    b.append(lambda: _obj(
        "obj-bst", "dsa", "trees", "easy", "Balanced BST search",
        "Balanced BST search is Big-O of? (e.g. O(log n))",
        ["o(log n)", "log n", "o(logn)", "logarithmic"],
        "Height Θ(log n) when balanced.", "Skewed tree can be O(n)."))

    b.append(lambda: _obj(
        "obj-rec-stack", "dsa", "recursion", "easy", "Recursion memory",
        "Deep recursion risks exhausting: stack or heap?",
        ["stack"],
        "Call frames live on the stack.", "Heap is for dynamic objects."))

    b.append(lambda: _obj(
        "obj-mutex", "os", "os", "easy", "Mutex purpose",
        "A mutex protects a critical section from: races or paging or caching?",
        ["races", "race", "race conditions", "concurrent access"],
        "Mutual exclusion against races.", "Paging/caching are different concerns."))

    b.append(lambda: _obj(
        "obj-pk", "dbms", "dbms", "easy", "Primary key",
        "A primary key must be unique and ___ (nullable or non-null).",
        ["non-null", "not null", "notnull", "nonnull"],
        "PK uniquely identifies and cannot be NULL.", "Nullable unique ≠ PK."))

    b.append(lambda: _obj(
        "obj-cdn", "system-design", "system-design", "easy", "CDN use",
        "CDN mainly caches closer to users: static or transactional-writes?",
        ["static", "static assets", "static content"],
        "Edge caching for static/cacheable content.", "Writes still hit systems of record."))

    b.append(lambda: _obj(
        "obj-get", "networking", "networking", "easy", "HTTP GET",
        "Is GET supposed to be safe/idempotent retrieval without side effects? yes/no",
        ["yes", "y", "true"],
        "GET retrieves; should not mutate.", "Mutating GET breaks HTTP semantics."))

    b.append(lambda: _obj(
        "obj-nested", "dsa", "complexity", "easy", "Nested loops",
        "Two nested loops each n times are typically Big-O? (e.g. O(n^2))",
        ["o(n^2)", "o(n²)", "o(n**2)", "n^2", "n²"],
        "n×n → quadratic.", "Not O(n) without special structure."))

    b.append(lambda: _obj(
        "obj-slide", "dsa", "sliding-window", "medium", "Sliding window map",
        "Longest substring ≤K distinct chars: sliding window + which structure? (hashmap/counter)",
        ["hashmap", "hash map", "frequency map", "counter", "dict", "dictionary"],
        "Map tracks frequencies in the window.", "Sorting each window is too slow.", time="O(n)"))

    b.append(lambda: _obj(
        "obj-topo", "dsa", "graphs", "medium", "Topological sort",
        "Topological sort applies to: DAG or cyclic?",
        ["dag", "directed acyclic graph"],
        "Topo order iff directed acyclic.", "Cycles block a valid order.", time="O(V+E)"))

    b.append(lambda: _obj(
        "obj-mvcc", "dbms", "dbms", "medium", "MVCC",
        "MVCC = Multi-Version ___ Control (one word).",
        ["concurrency", "concurrency control"],
        "Multi-Version Concurrency Control.", "Not the usual expansion with other words."))

    b.append(lambda: _obj(
        "obj-chash", "system-design", "system-design", "medium", "Consistent hashing",
        "Consistent hashing reduces key remapping when nodes change — true/false?",
        ["true", "t", "yes", "y"],
        "Only a fraction of keys move.", "mod N remaps most keys on N change."))

    return b


BUILDERS: list[Builder] = _builders()


def template_count() -> int:
    return len(BUILDERS)


def builders_for(difficulty: str) -> list[Builder]:
    # Probe difficulty with fixed seed so params don't leak randomness
    out: list[Builder] = []
    state = random.getstate()
    for i, builder in enumerate(BUILDERS):
        random.seed(1000 + i)
        q = builder()
        level = q["difficulty"]
        if difficulty == "easy" and level != "easy":
            continue
        out.append(builder)
    random.setstate(state)
    return out or BUILDERS
