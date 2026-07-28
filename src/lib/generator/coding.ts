import type { CompanyTag, Difficulty, LanguageId, Question, Topic } from '../../types/question'
import type { SeededRng } from './rng'

type CodingFamily = {
  topic: Topic
  build: (rng: SeededRng, difficulty: Difficulty) => {
    title: string
    statement: string
    constraints: string[]
    inputFormat: string
    outputFormat: string
    samples: { name: string; input: string; expectedOutput: string; isEdge?: boolean }[]
    hidden: { name: string; input: string; expectedOutput: string; isStress?: boolean }[]
    starter: Partial<Record<LanguageId, string>>
    bruteForce: string
    optimized: string
    timeComplexity: string
    spaceComplexity: string
    complexityComparison: string
    whyCorrect: string
    pitfalls: string[]
    alternatives: string[]
    followUps: string[]
    tags: string[]
  }
}

function pyStarter(body: string): Partial<Record<LanguageId, string>> {
  return {
    python: `import sys\n\ndef solve():\n${body}\n\nif __name__ == "__main__":\n    solve()\n`,
    javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/);\nlet idx = 0;\nconst next = () => input[idx++];\n\nfunction solve() {\n  // TODO\n}\nsolve();\n`,
    java: `import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    // TODO\n  }\n}\n`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n  ios::sync_with_stdio(false);\n  cin.tie(nullptr);\n  // TODO\n  return 0;\n}\n`,
    go: `package main\nimport (\n  "bufio"\n  "fmt"\n  "os"\n)\nfunc main() {\n  in := bufio.NewReader(os.Stdin)\n  _ = in\n  // TODO\n  fmt.Println()\n}\n`,
    rust: `use std::io::{self, Read};\nfn main() {\n  let mut s = String::new();\n  io::stdin().read_to_string(&mut s).unwrap();\n  // TODO\n}\n`,
  }
}

const FAMILIES: CodingFamily[] = [
  {
    topic: 'arrays',
    build: (rng, difficulty) => {
      const n = difficulty === 'easy' ? rng.int(3, 6) : rng.int(5, 10)
      const arr = Array.from({ length: n }, () => rng.int(-20, 40))
      const target = arr[rng.int(0, n - 1)]! + arr[rng.int(0, n - 1)]!
      // two sum indices (first pair)
      let i1 = -1
      let i2 = -1
      outer: for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          if (arr[i]! + arr[j]! === target) {
            i1 = i
            i2 = j
            break outer
          }
        }
      }
      if (i1 < 0) {
        // force a pair
        i1 = 0
        i2 = Math.min(1, n - 1)
        arr[i2] = target - arr[i1]!
      }
      const input = `${n} ${target}\n${arr.join(' ')}\n`
      const expected = `${i1} ${i2}`
      return {
        title: 'Pair Sum Indices',
        statement:
          'Given an array of integers and a target, return any two distinct indices i, j such that a[i] + a[j] == target. Guaranteed a solution exists.',
        constraints: ['2 ≤ n ≤ 10^5 (optimized expected)', '-10^9 ≤ a[i], target ≤ 10^9'],
        inputFormat: 'First line: n target\nSecond line: n integers',
        outputFormat: 'Two indices i j (0-based), i < j preferred',
        samples: [
          { name: 'sample-1', input, expectedOutput: expected },
          {
            name: 'edge-duplicates',
            input: `4 10\n5 5 1 9\n`,
            expectedOutput: '0 1',
            isEdge: true,
          },
        ],
        hidden: [
          {
            name: 'hidden-mid',
            input: `5 8\n1 2 3 5 6\n`,
            expectedOutput: '2 3',
          },
          {
            name: 'stress-ish',
            input: `6 0\n-1 0 1 2 -2 3\n`,
            expectedOutput: '0 2',
            isStress: true,
          },
        ],
        starter: pyStarter(
          `    data = list(map(int, sys.stdin.read().split()))\n    n, target = data[0], data[1]\n    a = data[2:]\n    # TODO: print two indices\n    print(-1, -1)\n`,
        ),
        bruteForce: 'Check all pairs O(n²).',
        optimized: 'Hash map value→index while scanning: O(n) time, O(n) space.',
        timeComplexity: 'Optimized O(n)',
        spaceComplexity: 'Optimized O(n)',
        complexityComparison: 'Brute O(n²)/O(1) vs Hash O(n)/O(n). Prefer hash for large n.',
        whyCorrect: 'Each value needs its complement target−x; a hash map finds complements in expected O(1).',
        pitfalls: ['Using the same index twice', 'Returning values instead of indices'],
        alternatives: ['Sort + two pointers if indices are rebuilt carefully'],
        followUps: ['Three sum', 'Count number of pairs'],
        tags: ['arrays', 'hashing', 'two-sum'],
      }
    },
  },
  {
    topic: 'strings',
    build: (rng) => {
      const s = rng.pick(['interview', 'prepdesk', 'algorithm', 'station', 'monaco'])
      const freq: Record<string, number> = {}
      for (const ch of s) freq[ch] = (freq[ch] ?? 0) + 1
      let ans = -1
      for (let i = 0; i < s.length; i++) {
        if (freq[s[i]!] === 1) {
          ans = i
          break
        }
      }
      return {
        title: 'First Unique Character Index',
        statement: 'Return the index of the first non-repeating character in a lowercase string, or -1 if none.',
        constraints: ['1 ≤ |s| ≤ 10^5', 's consists of lowercase English letters'],
        inputFormat: 'Single line: the string s',
        outputFormat: 'Single integer index or -1',
        samples: [
          { name: 'sample-1', input: `${s}\n`, expectedOutput: String(ans) },
          { name: 'edge-all-repeat', input: `aabb\n`, expectedOutput: '-1', isEdge: true },
        ],
        hidden: [
          { name: 'hidden', input: `loveleetcode\n`, expectedOutput: '2' },
          { name: 'stress', input: `${'a'.repeat(20)}b\n`, expectedOutput: '20', isStress: true },
        ],
        starter: pyStarter(`    s = sys.stdin.read().strip()\n    print(-1)\n`),
        bruteForce: 'For each index, scan rest O(n²).',
        optimized: 'Frequency count then second pass O(n).',
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1) alphabet / O(σ)',
        complexityComparison: 'Brute O(n²) vs counting O(n).',
        whyCorrect: 'Characters with frequency 1 are unique; the leftmost such index is the answer.',
        pitfalls: ['Returning the character instead of index', 'Case sensitivity'],
        alternatives: ['Ordered dict of counts'],
        followUps: ['First unique in a stream'],
        tags: ['strings', 'hashing'],
      }
    },
  },
  {
    topic: 'sliding-window',
    build: (rng) => {
      const arr = Array.from({ length: rng.int(5, 8) }, () => rng.int(1, 15))
      const k = rng.int(2, Math.min(4, arr.length))
      let best = 0
      let sum = 0
      for (let i = 0; i < arr.length; i++) {
        sum += arr[i]!
        if (i >= k) sum -= arr[i - k]!
        if (i >= k - 1) best = Math.max(best, sum)
      }
      return {
        title: 'Max Sum Subarray of Size K',
        statement: 'Given an array of positives and an integer k, return the maximum sum of any contiguous subarray of length k.',
        constraints: ['1 ≤ k ≤ n ≤ 10^5', '1 ≤ a[i] ≤ 10^4'],
        inputFormat: 'First line: n k\nSecond line: n integers',
        outputFormat: 'Single integer — maximum window sum',
        samples: [
          {
            name: 'sample-1',
            input: `${arr.length} ${k}\n${arr.join(' ')}\n`,
            expectedOutput: String(best),
          },
          { name: 'edge-k-n', input: `3 3\n1 2 3\n`, expectedOutput: '6', isEdge: true },
        ],
        hidden: [
          { name: 'hidden', input: `5 2\n2 1 5 1 3\n`, expectedOutput: '6' },
          {
            name: 'stress',
            input: `8 3\n1 1 1 1 1 1 1 9\n`,
            expectedOutput: '11',
            isStress: true,
          },
        ],
        starter: pyStarter(
          `    data = list(map(int, sys.stdin.read().split()))\n    n, k = data[0], data[1]\n    a = data[2:]\n    print(0)\n`,
        ),
        bruteForce: 'Sum each window separately O(n·k).',
        optimized: 'Sliding window: add right, remove left O(n).',
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1)',
        complexityComparison: 'O(nk) brute vs O(n) sliding window.',
        whyCorrect: 'Adjacent windows differ by one departure and one arrival — maintain a running sum.',
        pitfalls: ['Off-by-one when k=n', 'Negatives change algorithm (Kadane)'],
        alternatives: ['Prefix sums'],
        followUps: ['Longest substring with ≤k distinct', 'Minimum window substring'],
        tags: ['sliding-window', 'arrays'],
      }
    },
  },
  {
    topic: 'binary-search',
    build: (rng) => {
      const arr = Array.from({ length: rng.int(6, 10) }, () => rng.int(0, 50)).sort((a, b) => a - b)
      const unique = [...new Set(arr)]
      const target = rng.bool() ? unique[rng.int(0, unique.length - 1)]! : rng.int(51, 60)
      let lo = 0
      let hi = unique.length - 1
      let ans = -1
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        if (unique[mid] === target) {
          ans = mid
          break
        }
        if (unique[mid]! < target) lo = mid + 1
        else hi = mid - 1
      }
      return {
        title: 'Binary Search Index',
        statement: 'Given a sorted array of distinct integers and a target, return its index or -1 if missing.',
        constraints: ['1 ≤ n ≤ 10^5', 'Array sorted ascending, distinct'],
        inputFormat: 'First line: n target\nSecond line: n integers',
        outputFormat: 'Index or -1',
        samples: [
          {
            name: 'sample-1',
            input: `${unique.length} ${target}\n${unique.join(' ')}\n`,
            expectedOutput: String(ans),
          },
          { name: 'edge-missing', input: `4 7\n1 3 5 9\n`, expectedOutput: '-1', isEdge: true },
        ],
        hidden: [
          { name: 'hidden', input: `5 4\n1 2 3 4 5\n`, expectedOutput: '3' },
          { name: 'stress', input: `7 100\n1 2 3 4 5 6 7\n`, expectedOutput: '-1', isStress: true },
        ],
        starter: pyStarter(
          `    data = list(map(int, sys.stdin.read().split()))\n    n, target = data[0], data[1]\n    a = data[2:]\n    print(-1)\n`,
        ),
        bruteForce: 'Linear scan O(n).',
        optimized: 'Binary search O(log n).',
        timeComplexity: 'O(log n)',
        spaceComplexity: 'O(1)',
        complexityComparison: 'Linear O(n) vs binary O(log n) on sorted data.',
        whyCorrect: 'Sorted order lets you discard half the search space each step.',
        pitfalls: ['Overflow in (lo+hi)/2 in some languages', 'Infinite loops on bad bounds'],
        alternatives: ['std::lower_bound'],
        followUps: ['First/last occurrence with duplicates', 'Search rotated array'],
        tags: ['binary-search'],
      }
    },
  },
  {
    topic: 'stacks',
    build: (rng) => {
      const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' }
      const openers = ['(', '[', '{']
      let s = ''
      const stack: string[] = []
      const len = rng.int(4, 8)
      for (let i = 0; i < len; i++) {
        if (stack.length && rng.bool(0.45)) {
          const o = stack.pop()!
          const closer = Object.entries(pairs).find(([, v]) => v === o)![0]
          s += closer
        } else {
          const o = rng.pick(openers)
          stack.push(o)
          s += o
        }
      }
      while (stack.length) {
        const o = stack.pop()!
        const closer = Object.entries(pairs).find(([, v]) => v === o)![0]
        s += closer
      }
      return {
        title: 'Valid Brackets',
        statement: 'Given a string containing only ()[]{}, return YES if valid, NO otherwise.',
        constraints: ['1 ≤ |s| ≤ 10^5'],
        inputFormat: 'Single line string',
        outputFormat: 'YES or NO',
        samples: [
          { name: 'sample-1', input: `${s}\n`, expectedOutput: 'YES' },
          { name: 'edge-invalid', input: `(]\n`, expectedOutput: 'NO', isEdge: true },
        ],
        hidden: [
          { name: 'hidden', input: `{[()]}\n`, expectedOutput: 'YES' },
          { name: 'stress', input: `${'('.repeat(30)}${')'.repeat(30)}\n`, expectedOutput: 'YES', isStress: true },
        ],
        starter: pyStarter(`    s = sys.stdin.read().strip()\n    print("NO")\n`),
        bruteForce: 'Naive replace pairs repeatedly O(n²).',
        optimized: 'Stack matching O(n).',
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(n)',
        complexityComparison: 'Repeated replace is slower; stack is linear.',
        whyCorrect: 'Each closer must match the most recent unmatched opener (LIFO).',
        pitfalls: ['Empty stack on closer', 'Wrong pairing map'],
        alternatives: ['Counter only works for one bracket type'],
        followUps: ['Minimum removals to make valid', 'Longest valid parentheses'],
        tags: ['stacks', 'strings'],
      }
    },
  },
]

export function generateCoding(
  rng: SeededRng,
  day: string,
  index: number,
  difficulty: Difficulty,
  company: CompanyTag,
  topicFilter?: string,
): Question {
  let pool = FAMILIES
  if (topicFilter) pool = pool.filter((f) => f.topic === topicFilter)
  if (!pool.length) pool = FAMILIES
  const family = rng.pick(pool)
  const built = family.build(rng, difficulty)

  const samples = built.samples.map((t, i) => ({
    id: `s${i}`,
    name: t.name,
    input: t.input,
    expectedOutput: t.expectedOutput,
    isEdge: t.isEdge,
  }))
  const hidden = built.hidden.map((t, i) => ({
    id: `h${i}`,
    name: t.name,
    input: t.input,
    expectedOutput: t.expectedOutput,
    hidden: true,
    isStress: t.isStress,
  }))

  return {
    id: `code-${day}-${index}-${rng.int(1000, 9999)}`,
    title: built.title,
    kind: 'coding',
    domain: 'dsa',
    topic: family.topic,
    difficulty,
    company,
    interviewFrequency: rng.pick(['medium', 'high'] as const),
    estimatedMinutes: difficulty === 'easy' ? 15 : difficulty === 'medium' ? 25 : 40,
    prompt: built.statement,
    coding: {
      statement: built.statement,
      constraints: built.constraints,
      inputFormat: built.inputFormat,
      outputFormat: built.outputFormat,
      samples,
      hidden,
      starterCode: built.starter,
      bruteForce: built.bruteForce,
      optimized: built.optimized,
      timeComplexity: built.timeComplexity,
      spaceComplexity: built.spaceComplexity,
      complexityComparison: built.complexityComparison,
    },
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

export const CODING_FAMILY_COUNT = FAMILIES.length
