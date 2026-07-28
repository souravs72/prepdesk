import { describe, expect, it } from 'vitest'
import { generateDailySet, generatePracticeBatch, estimateCatalogueSize, isBogusQuestion } from '../src/lib/generator'
import { gradeMcq, gradeObjective, buildFeedback } from '../src/lib/progress/grade'
import { dateKey } from '../src/lib/generator/rng'
import { adaptiveDifficulty } from '../src/lib/generator/quality'

describe('daily generator', () => {
  it('creates at least 10 mixed questions for a day', () => {
    const qs = generateDailySet('2026-07-29', 12)
    expect(qs.length).toBe(12)
    expect(qs.every((q) => q.createdForDate === '2026-07-29')).toBe(true)
    expect(qs.some((q) => q.kind === 'mcq')).toBe(true)
    expect(qs.some((q) => q.kind === 'objective')).toBe(true)
    expect(qs.some((q) => q.kind === 'coding')).toBe(true)
  })

  it('is deterministic for the same day', () => {
    const a = generateDailySet('2026-01-01', 12)
    const b = generateDailySet('2026-01-01', 12)
    expect(a.map((q) => q.title)).toEqual(b.map((q) => q.title))
  })

  it('differs across days', () => {
    const a = generateDailySet('2026-01-01', 12)
    const b = generateDailySet('2026-01-02', 12)
    expect(a.map((q) => q.id)).not.toEqual(b.map((q) => q.id))
  })

  it('avoids bogus trivial prompts', () => {
    const qs = generateDailySet('2026-07-29', 12)
    expect(qs.every((q) => !isBogusQuestion(q))).toBe(true)
    expect(qs.some((q) => /array maximum/i.test(q.title))).toBe(false)
  })

  it('starts easy-biased for new learners', () => {
    const qs = generateDailySet('2026-03-03', 12, { recentAttempts: [] })
    expect(qs.filter((q) => q.difficulty === 'easy').length).toBeGreaterThanOrEqual(6)
  })

  it('reports a huge combinatorial catalogue', () => {
    expect(estimateCatalogueSize()).toBeGreaterThan(100_000)
  })
})

describe('adaptive difficulty', () => {
  it('stays easy until enough wins', () => {
    expect(adaptiveDifficulty([])).toBe('easy')
    expect(
      adaptiveDifficulty(
        Array.from({ length: 3 }, () => ({ correct: true, difficulty: 'easy' as const, at: '' })),
      ),
    ).toBe('easy')
  })
})

describe('grading + explanations', () => {
  it('grades MCQ and builds wrong-option feedback', () => {
    const q = generateDailySet(dateKey(), 12).find((x) => x.kind === 'mcq')!
    const correct = q.options!.find((o) => o.correct)!
    const wrong = q.options!.find((o) => !o.correct)!
    expect(gradeMcq(q, correct.id)).toBe(true)
    expect(gradeMcq(q, wrong.id)).toBe(false)
    const fb = buildFeedback(q, false, wrong.id)
    expect(fb.some((f) => /wrong|correct/i.test(f.title))).toBe(true)
  })

  it('grades objective answers case-insensitively', () => {
    const q = generatePracticeBatch({ count: 20 }, 'test').find((x) => x.kind === 'objective')!
    const ans = q.acceptedAnswers![0]!
    expect(gradeObjective(q, ans.toUpperCase())).toBe(true)
  })
})

describe('coding payload', () => {
  it('includes samples, hidden cases, and solutions narrative', () => {
    const q = generatePracticeBatch({ count: 15 }, 'code').find((x) => x.kind === 'coding')!
    expect(q.coding?.samples.length).toBeGreaterThan(0)
    expect(q.coding?.hidden.length).toBeGreaterThan(0)
    expect(q.coding?.bruteForce).toBeTruthy()
    expect(q.coding?.optimized).toBeTruthy()
    expect(q.explanation.followUps.length).toBeGreaterThan(0)
  })
})
