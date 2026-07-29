import type { Difficulty, Question } from '../../types/question'
import { COMPANIES } from './catalog'
import { dateKey, SeededRng } from './rng'
import { generateCoding } from './coding'
import { generateMcq } from './mcq'
import { generateObjective } from './objective'
import {
  adaptiveDifficulty,
  isBogusQuestion,
  pickCompanyForDifficulty,
  questionFingerprint,
} from './quality'

const DAILY_COUNT = 12

export type GenContext = {
  recentFingerprints?: string[]
  recentAttempts?: { correct: boolean; difficulty?: Difficulty; at: string }[]
  forcedDifficulty?: Difficulty
}

function makeOne(
  rng: SeededRng,
  day: string,
  index: number,
  kind: 'mcq' | 'objective' | 'coding',
  difficulty: Difficulty,
  company: Question['company'],
  topic?: string,
  domain?: string,
): Question {
  if (kind === 'mcq') return generateMcq(rng, day, index, difficulty, company, topic, domain)
  if (kind === 'objective') return generateObjective(rng, day, index, difficulty, company, topic, domain)
  return generateCoding(rng, day, index, difficulty, company, topic)
}

function generateUnique(
  baseSeed: string,
  day: string,
  index: number,
  kind: 'mcq' | 'objective' | 'coding',
  difficulty: Difficulty,
  seen: Set<string>,
  topic?: string,
  domain?: string,
): Question {
  for (let attempt = 0; attempt < 24; attempt++) {
    const rng = new SeededRng(`${baseSeed}:try:${attempt}`)
    const company = pickCompanyForDifficulty(difficulty, COMPANIES, rng) as Question['company']
    const q = makeOne(rng, day, index, kind, difficulty, company, topic, domain)
    const fp = questionFingerprint(q)
    if (isBogusQuestion(q)) continue
    if (seen.has(fp)) continue
    seen.add(fp)
    return q
  }
  // Last resort — still reject bogus; allow fingerprint collision only if unavoidable
  for (let attempt = 24; attempt < 48; attempt++) {
    const rng = new SeededRng(`${baseSeed}:fallback:${attempt}`)
    const company = pickCompanyForDifficulty(difficulty, COMPANIES, rng) as Question['company']
    const q = makeOne(rng, day, index, kind, difficulty, company, topic, domain)
    if (isBogusQuestion(q)) continue
    const fp = questionFingerprint(q)
    if (!seen.has(fp)) seen.add(fp)
    return q
  }
  const rng = new SeededRng(`${baseSeed}:final`)
  const company = pickCompanyForDifficulty(difficulty, COMPANIES, rng) as Question['company']
  const q = makeOne(rng, day, index, 'mcq', 'easy', company, topic, domain)
  return q
}

export function generateDailySet(
  day = dateKey(),
  count = DAILY_COUNT,
  ctx: GenContext = {},
): Question[] {
  const rng = new SeededRng(`prepilo-daily:${day}`)
  const questions: Question[] = []
  const kinds = [
    'mcq',
    'objective',
    'coding',
    'mcq',
    'objective',
    'coding',
    'mcq',
    'objective',
    'coding',
    'mcq',
    'objective',
    'coding',
  ] as const
  const seen = new Set(ctx.recentFingerprints ?? [])
  const difficulty =
    ctx.forcedDifficulty ?? adaptiveDifficulty(ctx.recentAttempts ?? [], undefined)

  for (let i = 0; i < count; i++) {
    const kind = kinds[i % kinds.length]!
    // Bias early slots easy when adapting upward slowly
    const slotDiff: Difficulty =
      difficulty === 'hard'
        ? i < 4
          ? 'medium'
          : 'hard'
        : difficulty === 'medium'
          ? i < 6
            ? rng.bool(0.55)
              ? 'easy'
              : 'medium'
            : 'medium'
          : 'easy'
    const q = generateUnique(`${day}:${i}:${kind}`, day, i, kind, slotDiff, seen)
    questions.push(q)
  }
  return questions
}

export function generatePracticeBatch(
  filters: {
    topic?: string
    difficulty?: string
    domain?: string
    count?: number
  },
  salt = Date.now().toString(),
  ctx: GenContext = {},
): Question[] {
  const count = filters.count ?? 8
  const day = dateKey()
  const rng = new SeededRng(`practice:${salt}:${JSON.stringify(filters)}`)
  const seen = new Set(ctx.recentFingerprints ?? [])
  const out: Question[] = []
  const baseDiff =
    (filters.difficulty as Difficulty) ||
    adaptiveDifficulty(ctx.recentAttempts ?? [], ctx.forcedDifficulty)

  for (let i = 0; i < count; i++) {
    const kind = rng.pick(['mcq', 'objective', 'coding'] as const)
    const q = generateUnique(
      `practice:${salt}:${i}:${kind}`,
      day,
      i,
      kind,
      baseDiff,
      seen,
      filters.topic,
      filters.domain,
    )
    out.push(q)
  }
  return out
}

export function estimateCatalogueSize(): number {
  return 26 * 3 * 9 * 40 * 50
}

export { adaptiveDifficulty, questionFingerprint, isBogusQuestion } from './quality'
