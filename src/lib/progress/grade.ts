import type { Question } from '../../types/question'

export function normalizeAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
}

export function gradeObjective(q: Question, answer: string): boolean {
  const u = normalizeAnswer(answer)
  if (!u) return false
  const accepted = q.acceptedAnswers ?? []
  if (accepted.some((a) => normalizeAnswer(a) === u)) return true
  // Concept answers: allow "the range is empty" to match accepted "empty"
  return accepted.some((a) => {
    const n = normalizeAnswer(a)
    if (n.length < 3) return false
    return u.includes(n) || n.includes(u)
  })
}

export function gradeMcq(q: Question, optionId: string): boolean {
  return !!q.options?.find((o) => o.id === optionId && o.correct)
}

export function buildFeedback(
  q: Question,
  correct: boolean,
  selectedId?: string,
  opts?: { compact?: boolean },
) {
  const compact = Boolean(opts?.compact)
  const lines: { title: string; body: string }[] = []

  if (!correct) {
    if (q.kind === 'mcq' && selectedId) {
      const opt = q.options?.find((o) => o.id === selectedId)
      lines.push({
        title: 'Why',
        body: opt?.whyWrong || q.explanation.whyIncorrect || 'Wrong option.',
      })
    } else {
      lines.push({
        title: 'Why',
        body: q.explanation.whyIncorrect || 'Incorrect.',
      })
    }
    return lines
  }

  lines.push({ title: 'Why', body: q.explanation.whyCorrect })
  if (compact) return lines

  if (q.explanation.timeComplexity)
    lines.push({ title: 'Time', body: q.explanation.timeComplexity })
  if (q.explanation.spaceComplexity)
    lines.push({ title: 'Space', body: q.explanation.spaceComplexity })
  if (q.explanation.pitfalls.length)
    lines.push({ title: 'Pitfalls', body: q.explanation.pitfalls.join(' · ') })
  return lines
}
