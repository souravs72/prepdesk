import type { Difficulty, Question } from '../../types/question'
import { hashString } from './rng'

/** Stable fingerprint so near-identical prompts don't repeat. */
export function questionFingerprint(q: Pick<Question, 'title' | 'prompt' | 'kind' | 'topic'>): string {
  const norm = `${q.kind}|${q.topic}|${q.title}|${q.prompt}`
    .toLowerCase()
    .replace(/\d+/g, '#')
    .replace(/\s+/g, ' ')
    .trim()
  return String(hashString(norm))
}

const BOGUS_TITLE_RE =
  /^(array maximum|factorial|bitwise and|printing output|what is programming)/i
const BOGUS_PROMPT_RE =
  /what is the maximum element\?|what is \d+!\s*\?|compute \d+\s*&\s*\d+/i

export function isBogusQuestion(q: Pick<Question, 'title' | 'prompt' | 'kind'>): boolean {
  if (BOGUS_TITLE_RE.test(q.title)) return true
  if (BOGUS_PROMPT_RE.test(q.prompt)) return true
  // Tiny arithmetic / look-up with no concept
  if (q.kind === 'objective' && /array\s*\[[^\]]{0,40}\]\s*[—-]\s*what is the maximum/i.test(q.prompt))
    return true
  // Spoiler: "Answer like: <the exact answer>"
  if (/answer like:\s*.+/i.test(q.prompt) || /answer:\s*(lo|hi|fifo|lifo)\b/i.test(q.prompt))
    return true
  return false
}

export function recentAccuracy(
  attempts: { correct: boolean; at: string }[],
  window = 12,
): number {
  const slice = attempts.slice(-window)
  if (!slice.length) return 1
  return slice.filter((a) => a.correct).length / slice.length
}

/** Start easy; promote to medium only after sustained success. Hard later. */
export function adaptiveDifficulty(
  attempts: { correct: boolean; difficulty?: Difficulty; at: string }[],
  forced?: Difficulty,
): Difficulty {
  if (forced) return forced
  const recent = attempts.slice(-20)
  if (recent.length < 4) return 'easy'

  const byDiff = (d: Difficulty) => recent.filter((a) => (a.difficulty ?? 'easy') === d)
  const rate = (xs: typeof recent) =>
    xs.length ? xs.filter((a) => a.correct).length / xs.length : 0

  const easy = byDiff('easy')
  const medium = byDiff('medium')

  const recentRate = rate(recent)
  if (recentRate < 0.6) return 'easy'
  if (easy.length >= 5 && rate(easy) >= 0.85) {
    if (medium.length >= 10 && rate(medium) >= 0.9) return 'hard'
    return 'medium'
  }
  if (medium.length >= 6 && rate(medium) >= 0.8) {
    if (medium.length >= 10 && rate(medium) >= 0.9) return 'hard'
    return 'medium'
  }
  return medium.length >= 3 && recentRate >= 0.8 ? 'medium' : 'easy'
}

export function pickCompanyForDifficulty(
  difficulty: Difficulty,
  _companies: readonly string[],
  _rng: { pick: <T>(a: readonly T[]) => T },
): string {
  // Cosmetic company tags mislead when content is generic — keep General.
  void difficulty
  return 'General'
}
