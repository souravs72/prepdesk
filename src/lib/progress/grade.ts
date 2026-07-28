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

export function buildFeedback(q: Question, correct: boolean, selectedId?: string) {
  const lines: { title: string; body: string }[] = []
  if (correct) {
    lines.push({ title: 'Why this is right', body: q.explanation.whyCorrect })
  } else {
    lines.push({
      title: 'Why this is wrong',
      body: q.explanation.whyIncorrect ?? 'That does not match the expected answer.',
    })
    lines.push({ title: 'Why the correct answer works', body: q.explanation.whyCorrect })
    if (q.kind === 'mcq' && selectedId) {
      const opt = q.options?.find((o) => o.id === selectedId)
      if (opt?.whyWrong) lines.push({ title: 'About your option', body: opt.whyWrong })
      for (const o of q.options ?? []) {
        if (!o.correct && o.id !== selectedId && o.whyWrong) {
          lines.push({ title: `Why “${o.text}” fails`, body: o.whyWrong })
        }
      }
    }
  }
  if (q.explanation.timeComplexity)
    lines.push({ title: 'Time complexity', body: q.explanation.timeComplexity })
  if (q.explanation.spaceComplexity)
    lines.push({ title: 'Space complexity', body: q.explanation.spaceComplexity })
  if (q.explanation.pitfalls.length)
    lines.push({ title: 'Common pitfalls', body: q.explanation.pitfalls.join(' · ') })
  if (q.explanation.alternatives.length)
    lines.push({ title: 'Alternatives', body: q.explanation.alternatives.join(' · ') })
  if (q.explanation.followUps.length)
    lines.push({ title: 'Follow-ups', body: q.explanation.followUps.join(' · ') })
  if (q.coding) {
    lines.push({ title: 'Brute force', body: q.coding.bruteForce })
    lines.push({ title: 'Optimized approach', body: q.coding.optimized })
    lines.push({ title: 'Complexity comparison', body: q.coding.complexityComparison })
  }
  return lines
}
