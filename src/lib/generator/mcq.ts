import type { CompanyTag, Difficulty, Domain, Question, Topic } from '../../types/question'
import type { SeededRng } from './rng'

type McqTemplate = {
  domain: Domain
  topic: Topic
  build: (rng: SeededRng) => {
    title: string
    prompt: string
    options: { text: string; correct: boolean; whyWrong?: string }[]
    whyCorrect: string
    timeComplexity?: string
    spaceComplexity?: string
    pitfalls: string[]
    alternatives: string[]
    followUps: string[]
    tags: string[]
  }
}

const TEMPLATES: McqTemplate[] = [
  {
    domain: 'dsa',
    topic: 'arrays',
    build: (rng) => {
      const n = rng.int(4, 12)
      return {
        title: 'Array access complexity',
        prompt: `In a contiguous array of ${n} integers stored in RAM, what is the time complexity of reading the element at a known index?`,
        options: [
          { text: 'O(1)', correct: true },
          { text: 'O(log n)', correct: false, whyWrong: 'Binary search is for finding a value, not indexed access.' },
          { text: 'O(n)', correct: false, whyWrong: 'You do not scan the array when the index is known.' },
          { text: 'O(n log n)', correct: false, whyWrong: 'That is typical sorting cost, unrelated to indexed reads.' },
        ],
        whyCorrect: 'Arrays support random access: address = base + index × element_size, so a single known index is O(1).',
        timeComplexity: 'O(1)',
        spaceComplexity: 'O(1) extra',
        pitfalls: ['Confusing search complexity with access complexity'],
        alternatives: ['Dynamic arrays still offer amortized O(1) append with O(1) indexed reads'],
        followUps: ['What changes if the structure is a singly linked list?', 'How does cache locality help array scans?'],
        tags: ['arrays', 'complexity'],
      }
    },
  },
  {
    domain: 'dsa',
    topic: 'hashing',
    build: () => ({
      title: 'Hash map average lookup',
      prompt: 'Average-case time complexity for lookup in a well-designed hash map (dictionary)?',
      options: [
        { text: 'O(1)', correct: true },
        { text: 'O(log n)', correct: false, whyWrong: 'That is typical for balanced BSTs / TreeMap.' },
        { text: 'O(n)', correct: false, whyWrong: 'Worst case with pathological collisions, not the average case.' },
        { text: 'O(n log n)', correct: false, whyWrong: 'Not a lookup cost.' },
      ],
      whyCorrect: 'With a good hash and load factor, expected bucket work is constant, so average lookup is O(1).',
      timeComplexity: 'Average O(1), worst O(n)',
      spaceComplexity: 'O(n)',
      pitfalls: ['Ignoring worst-case collision attacks', 'Forgetting rehashing cost'],
      alternatives: ['Ordered maps give O(log n) guarantees'],
      followUps: ['What is load factor?', 'How do open addressing and chaining differ?'],
      tags: ['hashing'],
    }),
  },
  {
    domain: 'dsa',
    topic: 'two-pointers',
    build: (rng) => {
      const target = rng.int(8, 20)
      return {
        title: 'Two-sum on sorted array',
        prompt: `For a sorted array, finding whether two numbers sum to ${target} with two pointers is typically:`,
        options: [
          { text: 'O(n) time, O(1) extra space', correct: true },
          { text: 'O(n²) time always', correct: false, whyWrong: 'Two pointers avoid the naive nested loops on sorted data.' },
          { text: 'O(log n) time', correct: false, whyWrong: 'You still may scan linearly from both ends.' },
          { text: 'O(n) time, O(n) space required', correct: false, whyWrong: 'Extra hash set is optional; two pointers need O(1) space.' },
        ],
        whyCorrect: 'Move left/right based on current sum vs target; each index moves at most once → O(n) time, O(1) space.',
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1)',
        pitfalls: ['Using two pointers on unsorted arrays without sorting first'],
        alternatives: ['Hash set for unsorted two-sum: O(n) time, O(n) space'],
        followUps: ['How do you adapt for three-sum?', 'What if duplicates must be skipped?'],
        tags: ['two-pointers'],
      }
    },
  },
  {
    domain: 'dsa',
    topic: 'binary-search',
    build: () => ({
      title: 'Binary search complexity',
      prompt: 'Binary search on a sorted array of n distinct elements has time complexity:',
      options: [
        { text: 'O(log n)', correct: true },
        { text: 'O(n)', correct: false, whyWrong: 'Linear scan is O(n); binary search halves the range.' },
        { text: 'O(1)', correct: false, whyWrong: 'Only true for direct index access, not search by value.' },
        { text: 'O(n log n)', correct: false, whyWrong: 'That is sorting, not searching a sorted array.' },
      ],
      whyCorrect: 'Each comparison discards half the remaining search space → logarithmic steps.',
      timeComplexity: 'O(log n)',
      spaceComplexity: 'O(1) iterative / O(log n) recursive stack',
      pitfalls: ['Off-by-one mid calculation overflow', 'Wrong loop invariants on duplicates'],
      alternatives: ['Exponential search for unbounded arrays'],
      followUps: ['Lower bound vs upper bound?', 'Search in rotated sorted array?'],
      tags: ['binary-search'],
    }),
  },
  {
    domain: 'dsa',
    topic: 'graphs',
    build: () => ({
      title: 'BFS shortest path',
      prompt: 'On an unweighted graph, BFS from a source finds shortest paths in terms of number of edges because:',
      options: [
        {
          text: 'It explores nodes in non-decreasing distance order',
          correct: true,
        },
        {
          text: 'It always uses a min-heap',
          correct: false,
          whyWrong: 'Dijkstra uses a priority queue; classic BFS uses a FIFO queue.',
        },
        {
          text: 'It only works on DAGs',
          correct: false,
          whyWrong: 'BFS works on general undirected/directed unweighted graphs (with care for directions).',
        },
        {
          text: 'It compresses paths like union-find',
          correct: false,
          whyWrong: 'Union-find is for disjoint sets, not BFS layering.',
        },
      ],
      whyCorrect: 'FIFO order ensures the first time you reach a node is via a minimum number of edges.',
      timeComplexity: 'O(V + E)',
      spaceComplexity: 'O(V)',
      pitfalls: ['Using BFS for weighted graphs without modification'],
      alternatives: ['Dijkstra / 0-1 BFS for weighted cases'],
      followUps: ['How does 0-1 BFS work?', 'When is DFS preferable?'],
      tags: ['graphs', 'bfs'],
    }),
  },
  {
    domain: 'dsa',
    topic: 'dp',
    build: () => ({
      title: 'DP hallmark',
      prompt: 'Dynamic programming is most appropriate when a problem has:',
      options: [
        { text: 'Optimal substructure and overlapping subproblems', correct: true },
        { text: 'Only greedy choice property', correct: false, whyWrong: 'Greedy needs greedy choice; DP needs overlapping subproblems.' },
        { text: 'Only divide-and-conquer with disjoint work', correct: false, whyWrong: 'Pure D&C (like mergesort) does not memoize overlapping work.' },
        { text: 'Constant-time closed form only', correct: false, whyWrong: 'Closed forms are nice but not required for DP.' },
      ],
      whyCorrect: 'DP stores answers to overlapping subproblems and combines them using optimal substructure.',
      pitfalls: ['Memoizing when subproblems do not overlap', 'Wrong transition / state definition'],
      alternatives: ['Greedy when local choices prove globally optimal'],
      followUps: ['Top-down vs bottom-up tradeoffs?', 'How do you derive the DP state?'],
      tags: ['dp'],
    }),
  },
  {
    domain: 'os',
    topic: 'os',
    build: () => ({
      title: 'Process vs thread',
      prompt: 'Compared to processes, threads in the same process typically:',
      options: [
        { text: 'Share address space and are cheaper to create/context-switch', correct: true },
        { text: 'Never share memory', correct: false, whyWrong: 'Threads share the process heap/globals; processes usually do not.' },
        { text: 'Each have a separate page table always isolated from siblings', correct: false, whyWrong: 'Threads share the process address space / page tables.' },
        { text: 'Cannot run concurrently on multi-core CPUs', correct: false, whyWrong: 'Kernel threads can run in parallel on multiple cores.' },
      ],
      whyCorrect: 'Threads share the process address space; creation and switching avoid full address-space teardown.',
      pitfalls: ['Assuming threads need no synchronization', 'Confusing green threads with OS threads'],
      alternatives: ['Processes for stronger isolation / crash containment'],
      followUps: ['What is a race condition?', 'User-level vs kernel-level threads?'],
      tags: ['os', 'concurrency'],
    }),
  },
  {
    domain: 'os',
    topic: 'os',
    build: () => ({
      title: 'Virtual memory page fault',
      prompt: 'A page fault occurs when:',
      options: [
        { text: 'The CPU references a page not currently mapped in physical memory (or not present)', correct: true },
        { text: 'A disk sector checksum fails', correct: false, whyWrong: 'That is a storage/IO error, not a page fault.' },
        { text: 'A mutex is contended', correct: false, whyWrong: 'Lock contention is scheduling/sync, not paging.' },
        { text: 'The TLB is fully associative', correct: false, whyWrong: 'TLB organization is unrelated to the definition of a fault.' },
      ],
      whyCorrect: 'The MMU raises a fault when the required virtual page is not present/mapped as needed.',
      pitfalls: ['Confusing TLB miss with page fault', 'Ignoring major vs minor faults'],
      alternatives: ['Prefaulting / mlock for latency-sensitive apps'],
      followUps: ['What is thrashing?', 'Explain demand paging.'],
      tags: ['os', 'memory'],
    }),
  },
  {
    domain: 'dbms',
    topic: 'dbms',
    build: () => ({
      title: 'ACID — Isolation',
      prompt: 'In ACID, Isolation primarily means:',
      options: [
        { text: 'Concurrent transactions do not interfere in ways that violate the chosen isolation level', correct: true },
        { text: 'Data is encrypted at rest', correct: false, whyWrong: 'Encryption is a security concern, not Isolation.' },
        { text: 'The database never crashes', correct: false, whyWrong: 'Durability/recovery handle crash resilience.' },
        { text: 'All columns are atomic', correct: false, whyWrong: 'Atomicity is the “A” in ACID (all-or-nothing transaction).' },
      ],
      whyCorrect: 'Isolation controls visibility of concurrent work (e.g., READ COMMITTED, REPEATABLE READ, SERIALIZABLE).',
      pitfalls: ['Assuming SERIALIZABLE is free', 'Ignoring phantom reads'],
      alternatives: ['Optimistic concurrency control vs locking'],
      followUps: ['Explain dirty read vs non-repeatable read.', 'What is MVCC?'],
      tags: ['dbms', 'acid'],
    }),
  },
  {
    domain: 'dbms',
    topic: 'sql',
    build: () => ({
      title: 'SQL JOIN cardinality',
      prompt: 'An INNER JOIN between tables A and B returns:',
      options: [
        { text: 'Only rows with matching join keys in both tables', correct: true },
        { text: 'All rows from A, with NULLs when B has no match', correct: false, whyWrong: 'That describes LEFT OUTER JOIN.' },
        { text: 'The Cartesian product always', correct: false, whyWrong: 'CROSS JOIN / missing predicate yields Cartesian product.' },
        { text: 'Only rows unique to A', correct: false, whyWrong: 'That is closer to anti-join / EXCEPT patterns.' },
      ],
      whyCorrect: 'INNER JOIN keeps intersections of the join condition.',
      pitfalls: ['NULL join keys', 'Duplicate keys exploding row counts'],
      alternatives: ['LEFT/RIGHT/FULL OUTER JOIN for preserving unmatched rows'],
      followUps: ['When would you use a semi-join?', 'How do indexes help joins?'],
      tags: ['sql', 'joins'],
    }),
  },
  {
    domain: 'system-design',
    topic: 'system-design',
    build: () => ({
      title: 'Caching layer',
      prompt: 'A read-heavy API introduces Redis in front of Postgres primarily to:',
      options: [
        { text: 'Reduce database load and latency for frequent reads', correct: true },
        { text: 'Replace the need for backups', correct: false, whyWrong: 'Caches are volatile; backups remain essential.' },
        { text: 'Guarantee strong consistency by default', correct: false, whyWrong: 'Caches often trade consistency (TTL/stale reads).' },
        { text: 'Eliminate network hops', correct: false, whyWrong: 'You typically add a hop; the win is cheaper/faster reads.' },
      ],
      whyCorrect: 'Hot keys served from memory cut Postgres QPS and p99 latency.',
      pitfalls: ['Cache stampede', 'Stale data without invalidation strategy'],
      alternatives: ['CDN for static assets', 'Materialized views', 'Application-level memoization'],
      followUps: ['Cache-aside vs write-through?', 'How do you handle thundering herds?'],
      tags: ['system-design', 'caching'],
    }),
  },
  {
    domain: 'system-design',
    topic: 'system-design',
    build: () => ({
      title: 'Horizontal scaling',
      prompt: 'Horizontal scaling means:',
      options: [
        { text: 'Adding more machines to share load', correct: true },
        { text: 'Upgrading a single machine’s CPU/RAM', correct: false, whyWrong: 'That is vertical scaling.' },
        { text: 'Only sharding databases, never app servers', correct: false, whyWrong: 'App tiers are commonly scaled horizontally too.' },
        { text: 'Removing load balancers', correct: false, whyWrong: 'Load balancers usually enable horizontal scale-out.' },
      ],
      whyCorrect: 'Scale-out adds nodes behind a balancer; scale-up grows one node’s capacity.',
      pitfalls: ['Stateful servers without sticky sessions/shared state', 'Ignoring coordination overhead'],
      alternatives: ['Vertical scaling for simpler ops at smaller scale'],
      followUps: ['Stateless service design?', 'When does sharding become necessary?'],
      tags: ['system-design', 'scalability'],
    }),
  },
  {
    domain: 'networking',
    topic: 'networking',
    build: () => ({
      title: 'TCP vs UDP',
      prompt: 'TCP is preferred over UDP when you need:',
      options: [
        { text: 'Reliable, ordered byte-stream delivery', correct: true },
        { text: 'Lowest possible latency with no retransmission', correct: false, whyWrong: 'That favors UDP (e.g., real-time media).' },
        { text: 'No connection state ever', correct: false, whyWrong: 'TCP is connection-oriented.' },
        { text: 'Multicast as the default mode', correct: false, whyWrong: 'Multicast is more natural with UDP.' },
      ],
      whyCorrect: 'TCP provides reliability, ordering, and congestion control for streams.',
      pitfalls: ['Head-of-line blocking (HTTP/1.1)', 'Assuming TCP is always faster'],
      alternatives: ['QUIC/HTTP3, UDP + app-level reliability'],
      followUps: ['What is the three-way handshake?', 'Explain congestion control at a high level.'],
      tags: ['networking'],
    }),
  },
  {
    domain: 'oop',
    topic: 'oop',
    build: () => ({
      title: 'Encapsulation',
      prompt: 'Encapsulation in OOP primarily refers to:',
      options: [
        { text: 'Bundling data with methods and restricting direct access to internals', correct: true },
        { text: 'Inheriting from multiple concrete classes always', correct: false, whyWrong: 'That is inheritance/mixin territory, not encapsulation.' },
        { text: 'Overloading operators only', correct: false, whyWrong: 'Operator overloading is a separate language feature.' },
        { text: 'Running code on many cores', correct: false, whyWrong: 'Parallelism is unrelated to encapsulation.' },
      ],
      whyCorrect: 'Hide representation behind a stable interface to reduce coupling and misuse.',
      pitfalls: ['Getters/setters that leak mutable internals', 'Anemic domain models'],
      alternatives: ['Module-level privacy in non-OOP languages'],
      followUps: ['Difference between encapsulation and abstraction?', 'Law of Demeter?'],
      tags: ['oop'],
    }),
  },
  {
    domain: 'dsa',
    topic: 'stacks',
    build: () => ({
      title: 'Valid parentheses structure',
      prompt: 'Checking valid parentheses is classically solved with a stack because:',
      options: [
        { text: 'You need LIFO matching of the most recent unmatched opener', correct: true },
        { text: 'Stacks provide O(1) random access to the middle', correct: false, whyWrong: 'Stacks do not give middle random access.' },
        { text: 'Queues match openers better', correct: false, whyWrong: 'FIFO would mismatch nested structures.' },
        { text: 'Hash maps alone guarantee nesting order', correct: false, whyWrong: 'Maps help pair types; nesting order needs a stack.' },
      ],
      whyCorrect: 'Nested structures require last-opened-first-closed discipline — exactly LIFO.',
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(n)',
      pitfalls: ['Only counting without ordering', 'Unicode/bracket type mix-ups'],
      alternatives: ['Counter method works only for a single bracket type'],
      followUps: ['Longest valid parentheses?', 'Score of parentheses?'],
      tags: ['stacks'],
    }),
  },
  {
    domain: 'dsa',
    topic: 'trees',
    build: () => ({
      title: 'BST inorder',
      prompt: 'Inorder traversal of a binary search tree yields keys in:',
      options: [
        { text: 'Sorted ascending order', correct: true },
        { text: 'Level order', correct: false, whyWrong: 'Level order is BFS, not inorder.' },
        { text: 'Random order', correct: false, whyWrong: 'BST inorder is deterministic and sorted.' },
        { text: 'Descending only', correct: false, whyWrong: 'Reverse inorder would be descending.' },
      ],
      whyCorrect: 'Left → node → right visits BST keys from least to greatest.',
      pitfalls: ['Assuming any binary tree’s inorder is sorted'],
      alternatives: ['Morris traversal for O(1) extra space'],
      followUps: ['Validate BST?', 'k-th smallest in BST?'],
      tags: ['bst', 'trees'],
    }),
  },
]

export function generateMcq(
  rng: SeededRng,
  day: string,
  index: number,
  difficulty: Difficulty,
  company: CompanyTag,
  topicFilter?: string,
  domainFilter?: string,
): Question {
  let pool = TEMPLATES
  if (topicFilter) pool = pool.filter((t) => t.topic === topicFilter)
  if (domainFilter) pool = pool.filter((t) => t.domain === domainFilter)
  if (!pool.length) pool = TEMPLATES
  const template = rng.pick(pool)
  const built = template.build(rng)
  const options = rng.shuffle(
    built.options.map((o, i) => ({
      id: String.fromCharCode(97 + i),
      text: o.text,
      correct: o.correct,
      whyWrong: o.whyWrong,
    })),
  )
  // re-letter after shuffle
  const lettered = options.map((o, i) => ({ ...o, id: String.fromCharCode(97 + i) }))

  return {
    id: `mcq-${day}-${index}-${rng.int(1000, 9999)}`,
    title: built.title,
    kind: 'mcq',
    domain: template.domain,
    topic: template.topic,
    difficulty,
    company,
    interviewFrequency: rng.pick(['low', 'medium', 'high'] as const),
    estimatedMinutes: difficulty === 'easy' ? 3 : difficulty === 'medium' ? 6 : 10,
    prompt: built.prompt,
    options: lettered,
    explanation: {
      whyCorrect: built.whyCorrect,
      timeComplexity: built.timeComplexity,
      spaceComplexity: built.spaceComplexity,
      pitfalls: built.pitfalls,
      alternatives: built.alternatives,
      followUps: built.followUps,
    },
    tags: built.tags,
    createdForDate: day,
  }
}

export const MCQ_TEMPLATE_COUNT = TEMPLATES.length
