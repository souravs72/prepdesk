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
  return (q.acceptedAnswers ?? []).some((a) => normalizeAnswer(a) === u)
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
    // Wrong answers stay short — one reason only.
    if (q.kind === 'mcq' && selectedId) {
      const opt = q.options?.find((o) => o.id === selectedId)
      lines.push({
        title: 'Why not',
        body: opt?.whyWrong || q.explanation.whyIncorrect || 'That option is incorrect.',
      })
    } else {
      lines.push({
        title: 'Why not',
        body: q.explanation.whyIncorrect || 'That does not match the expected answer.',
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
  if (q.explanation.alternatives.length)
    lines.push({ title: 'Alternatives', body: q.explanation.alternatives.join(' · ') })
  if (q.explanation.followUps.length)
    lines.push({ title: 'Follow-ups', body: q.explanation.followUps.join(' · ') })
  if (q.coding) {
    lines.push({ title: 'Approach', body: q.coding.optimized })
  }
  return lines
}
