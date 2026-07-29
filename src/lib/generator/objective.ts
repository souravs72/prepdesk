import type { CompanyTag, Difficulty, Domain, Question, Topic } from '../../types/question'
import type { SeededRng } from './rng'

type ObjTemplate = {
  domain: Domain
  topic: Topic
  /** Intrinsic difficulty of this template family */
  level: Difficulty
  build: (rng: SeededRng) => {
    title: string
    prompt: string
    answer: string
    accepted: string[]
    whyCorrect: string
    whyIncorrect: string
    timeComplexity?: string
    spaceComplexity?: string
    pitfalls: string[]
    alternatives: string[]
    followUps: string[]
    tags: string[]
  }
}

const TEMPLATES: ObjTemplate[] = [
  {
    domain: 'dsa',
    topic: 'arrays',
    level: 'easy',
    build: (rng) => {
      const n = rng.int(6, 10)
      return {
        title: 'Second-largest in one pass',
        prompt: `You must find the second-largest distinct value in an unsorted array of ${n} ints in a single O(n) pass with O(1) extra space. What two running values do you keep while scanning?`,
        answer: 'largest and second-largest',
        accepted: [
          'largest and second-largest',
          'max and second max',
          'max, secondmax',
          'max, second max',
          'largest, second largest',
          'max1, max2',
          'first max and second max',
        ],
        whyCorrect:
          'Track the best and second-best while scanning once; when you see a new max, demote the old max to second.',
        whyIncorrect:
          'Sorting is O(n log n). Two full passes also work but the classic interview ask is one pass with max/secondMax.',
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1)',
        pitfalls: ['Duplicates making secondMax equal max', 'All elements equal → no second distinct'],
        alternatives: ['Sort descending and pick first distinct neighbor', 'Heap of size 2'],
        followUps: ['k-th largest in O(n) expected?', 'Streaming second max?'],
        tags: ['arrays'],
      }
    },
  },
  {
    domain: 'dsa',
    topic: 'hashing',
    level: 'easy',
    build: () => ({
      title: 'Two-sum complement',
      prompt:
        'In the hash-map two-sum pattern, for value x and target T you look up which key? (one expression using x and T)',
      answer: 't - x',
      accepted: ['t - x', 't-x', 'target - x', 'target-x'],
      whyCorrect: 'You need a prior value that pairs with x to form T, i.e. the complement T−x.',
      whyIncorrect: 'Looking up x again does not find a partner; looking up T alone is unrelated.',
      timeComplexity: 'O(n) expected',
      spaceComplexity: 'O(n)',
      pitfalls: ['Using the same index twice', 'Forgetting to store after the lookup'],
      alternatives: ['Sort + two pointers if indices can be remapped'],
      followUps: ['Three-sum?', 'Count pairs with given sum?'],
      tags: ['hashing', 'two-sum'],
    }),
  },
  {
    domain: 'dsa',
    topic: 'binary-search',
    level: 'easy',
    build: () => ({
      title: 'Binary search miss condition',
      prompt:
        'Iterative binary search maintains an inclusive search range [low, high]. If the target is not in the array, what is true of that range when the loop finally stops? (concept — not variable names)',
      answer: 'empty / bounds crossed',
      accepted: [
        'empty',
        'empty range',
        'the range is empty',
        'bounds crossed',
        'bounds cross',
        'low crosses high',
        'low > high',
        'lo > hi',
        'left > right',
        'start > end',
        'interval empty',
        'no elements left',
      ],
      whyCorrect:
        'Each step shrinks the inclusive range. When nothing remains to probe, the low bound has crossed the high bound — the interval is empty.',
      whyIncorrect:
        'A single remaining index (low == high) is still a valid probe. Absence is decided only after that cell misses and the range becomes empty.',
      timeComplexity: 'O(log n)',
      spaceComplexity: 'O(1)',
      pitfalls: ['Off-by-one when using mid±1 incorrectly', 'Overflow in (low+high)/2'],
      alternatives: ['Half-open [low, high) / lower_bound style loops'],
      followUps: ['First occurrence with duplicates?', 'Search in rotated array?'],
      tags: ['binary-search'],
    }),
  },
  {
    domain: 'dsa',
    topic: 'two-pointers',
    level: 'medium',
    build: () => ({
      title: 'Sorted two-sum pointers',
      prompt:
        'On a sorted array, two pointers start at both ends. If a[left]+a[right] is larger than the target, which end do you move inward — the left pointer or the right pointer?',
      answer: 'right',
      accepted: ['right', 'hi', 'high', 'end', 'the right one', 'right pointer'],
      whyCorrect: 'Sum too large → decrease the larger end (move hi left). Too small → move lo right.',
      whyIncorrect: 'Moving lo when the sum is already too large usually increases the sum further.',
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(1)',
      pitfalls: ['Using two pointers on unsorted data without sorting'],
      alternatives: ['Hash map for unsorted two-sum'],
      followUps: ['Container with most water?', '3Sum?'],
      tags: ['two-pointers'],
    }),
  },
  {
    domain: 'dsa',
    topic: 'stacks',
    level: 'easy',
    build: () => ({
      title: 'Parentheses stack discipline',
      prompt:
        'Valid parentheses matching closes brackets in which order relative to when they were opened — FIFO or LIFO?',
      answer: 'lifo',
      accepted: ['lifo', 'LIFO'],
      whyCorrect: 'The most recently opened bracket must close first — classic LIFO / stack.',
      whyIncorrect: 'FIFO would close the earliest opener first, which breaks nesting.',
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(n)',
      pitfalls: ['Only counting without type/order checks'],
      alternatives: ['Counter works only for a single bracket type'],
      followUps: ['Minimum removals to make valid?', 'Score of parentheses?'],
      tags: ['stacks'],
    }),
  },
  {
    domain: 'dsa',
    topic: 'graphs',
    level: 'medium',
    build: (rng) => {
      const v = rng.int(5, 9)
      return {
        title: 'BFS vs Dijkstra',
        prompt: `For shortest paths by hop-count on an unweighted graph with ${v} vertices, which algorithm is sufficient: BFS or Dijkstra?`,
        answer: 'bfs',
        accepted: ['bfs', 'BFS', 'breadth first search', 'breadth-first search'],
        whyCorrect: 'Unweighted shortest hop distance is exactly what BFS layers compute; Dijkstra adds priority overhead for weights.',
        whyIncorrect: 'Dijkstra still works but is unnecessary; DFS does not guarantee shortest hops.',
        timeComplexity: 'O(V+E)',
        spaceComplexity: 'O(V)',
        pitfalls: ['Using BFS unchanged on weighted graphs'],
        alternatives: ['0-1 BFS for weights in {0,1}', 'Dijkstra for positive weights'],
        followUps: ['When does Dijkstra fail?', 'Bellman-Ford use case?'],
        tags: ['graphs', 'bfs'],
      }
    },
  },
  {
    domain: 'dsa',
    topic: 'dp',
    level: 'medium',
    build: () => ({
      title: 'DP two ingredients',
      prompt:
        'Name the two classic properties that justify DP (comma-separated). Hint: optimal ___ and overlapping ___.',
      answer: 'optimal substructure, overlapping subproblems',
      accepted: [
        'optimal substructure, overlapping subproblems',
        'overlapping subproblems, optimal substructure',
        'optimal substructure and overlapping subproblems',
      ],
      whyCorrect: 'DP reuses overlapping subproblems and combines them via optimal substructure.',
      whyIncorrect: 'Greedy choice alone is not enough; pure divide-and-conquer may lack overlap.',
      pitfalls: ['Memoizing non-overlapping work', 'Wrong state definition'],
      alternatives: ['Greedy when exchange argument holds'],
      followUps: ['Top-down vs bottom-up?', 'How do you derive the transition?'],
      tags: ['dp'],
    }),
  },
  {
    domain: 'os',
    topic: 'os',
    level: 'easy',
    build: () => ({
      title: 'Thread shared memory',
      prompt:
        'Do threads of the same process share the same heap by default? Answer yes or no.',
      answer: 'yes',
      accepted: ['yes', 'y', 'true'],
      whyCorrect: 'Threads share the process address space (heap/globals); each has its own stack/registers.',
      whyIncorrect: 'Confusing threads with separate processes, which have isolated address spaces.',
      pitfalls: ['Assuming no synchronization is needed on shared heap'],
      alternatives: ['Processes for stronger isolation'],
      followUps: ['What is a race condition?', 'User vs kernel threads?'],
      tags: ['os', 'concurrency'],
    }),
  },
  {
    domain: 'os',
    topic: 'os',
    level: 'medium',
    build: () => ({
      title: 'Page fault vs TLB miss',
      prompt:
        'A referenced page is in RAM but not in the TLB. Is that a page fault? yes/no',
      answer: 'no',
      accepted: ['no', 'n', 'false'],
      whyCorrect: 'That is a TLB miss; a page fault is when the page is not present/mapped as required in the page tables.',
      whyIncorrect: 'TLB miss and page fault are related to translation but are not the same event.',
      pitfalls: ['Using the terms interchangeably in interviews'],
      alternatives: ['Walk the page table / refill TLB'],
      followUps: ['Major vs minor fault?', 'What is thrashing?'],
      tags: ['os', 'memory'],
    }),
  },
  {
    domain: 'dbms',
    topic: 'dbms',
    level: 'easy',
    build: () => ({
      title: 'ACID Isolation',
      prompt: 'In ACID, which letter stands for preventing bad interference between concurrent transactions?',
      answer: 'i',
      accepted: ['i', 'isolation', 'Isolation'],
      whyCorrect: 'Isolation controls concurrent visibility (READ COMMITTED, RR, SERIALIZABLE, etc.).',
      whyIncorrect: 'Atomicity is all-or-nothing; Durability is crash survival; Consistency is valid state transitions.',
      pitfalls: ['Assuming SERIALIZABLE is free'],
      alternatives: ['MVCC implementations'],
      followUps: ['Dirty read vs phantom read?', 'What is MVCC?'],
      tags: ['dbms', 'acid'],
    }),
  },
  {
    domain: 'dbms',
    topic: 'sql',
    level: 'easy',
    build: () => ({
      title: 'HAVING vs WHERE',
      prompt: 'Which clause filters groups after aggregation: WHERE or HAVING?',
      answer: 'having',
      accepted: ['having', 'HAVING'],
      whyCorrect: 'WHERE filters rows before GROUP BY; HAVING filters aggregated groups.',
      whyIncorrect: 'WHERE cannot reference aggregate results the way HAVING does in standard SQL.',
      pitfalls: ['Putting COUNT(*) conditions in WHERE'],
      alternatives: ['Filter aggregates in a subquery/CTE'],
      followUps: ['COUNT(*) vs COUNT(col)?', 'Window functions vs GROUP BY?'],
      tags: ['sql'],
    }),
  },
  {
    domain: 'system-design',
    topic: 'system-design',
    level: 'easy',
    build: () => ({
      title: 'Cache purpose',
      prompt:
        'A read-heavy API adds Redis in front of Postgres primarily to reduce what? Answer one word: latency or durability or encryption',
      answer: 'latency',
      accepted: ['latency', 'load', 'database load'],
      whyCorrect: 'Hot keys from memory cut latency and Postgres load; caches are not a durability/backup strategy.',
      whyIncorrect: 'Caches do not replace backups or encryption controls.',
      pitfalls: ['Cache stampede', 'Stale reads without invalidation'],
      alternatives: ['CDN', 'Materialized views'],
      followUps: ['Cache-aside vs write-through?', 'Thundering herd?'],
      tags: ['system-design', 'caching'],
    }),
  },
  {
    domain: 'system-design',
    topic: 'system-design',
    level: 'medium',
    build: () => ({
      title: 'CAP under partition',
      prompt:
        'Under network Partition, CAP forces a choice between Consistency and ___ (one word).',
      answer: 'availability',
      accepted: ['availability', 'a', 'Availability'],
      whyCorrect: 'With P, systems lean CP or AP; you cannot fully keep both C and A during a partition.',
      whyIncorrect: 'Latency/durability matter but are not the CAP dichotomy under P.',
      pitfalls: ['Misquoting CAP as always pick any two in normal operation'],
      alternatives: ['PACELC'],
      followUps: ['Example AP system?', 'Example CP system?'],
      tags: ['system-design', 'cap'],
    }),
  },
  {
    domain: 'networking',
    topic: 'networking',
    level: 'easy',
    build: () => ({
      title: 'TCP guarantee',
      prompt: 'TCP primarily adds which property over raw IP datagrams: reliability or multicast?',
      answer: 'reliability',
      accepted: ['reliability', 'reliable delivery', 'reliable'],
      whyCorrect: 'TCP provides a reliable, ordered byte stream with retransmission and congestion control.',
      whyIncorrect: 'Multicast is not TCP’s default strength; UDP is often used for that style of delivery.',
      pitfalls: ['Assuming TCP is always lower latency'],
      alternatives: ['QUIC', 'UDP + app-level reliability'],
      followUps: ['Three-way handshake?', 'Head-of-line blocking?'],
      tags: ['networking'],
    }),
  },
]

export function generateObjective(
  rng: SeededRng,
  day: string,
  index: number,
  difficulty: Difficulty,
  company: CompanyTag,
  topicFilter?: string,
  domainFilter?: string,
): Question {
  let pool = TEMPLATES.filter((t) => {
    if (difficulty === 'easy') return t.level === 'easy'
    if (difficulty === 'medium') return t.level === 'easy' || t.level === 'medium'
    return true
  })
  if (topicFilter) pool = pool.filter((t) => t.topic === topicFilter)
  if (domainFilter) pool = pool.filter((t) => t.domain === domainFilter)
  if (!pool.length) pool = TEMPLATES.filter((t) => t.level === 'easy')
  const template = rng.pick(pool)
  const built = template.build(rng)
  const effectiveDiff: Difficulty =
    difficulty === 'hard' ? template.level === 'easy' ? 'medium' : template.level : template.level

  return {
    id: `obj-${day}-${index}-${rng.int(1000, 9999)}`,
    title: built.title,
    kind: 'objective',
    domain: template.domain,
    topic: template.topic,
    difficulty: effectiveDiff,
    company: effectiveDiff === 'easy' ? 'General' : company,
    interviewFrequency: rng.pick(['medium', 'high'] as const),
    estimatedMinutes: effectiveDiff === 'easy' ? 3 : 6,
    prompt: built.prompt,
    acceptedAnswers: built.accepted,
    explanation: {
      whyCorrect: built.whyCorrect,
      whyIncorrect: built.whyIncorrect,
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
