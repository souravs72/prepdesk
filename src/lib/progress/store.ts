import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AttemptResult, LanguageId, Question } from '../../types/question'
import { dateKey } from '../generator/rng'
import {
  generateDailySet,
  generatePracticeBatch,
  questionFingerprint,
} from '../generator'

const API = 'http://127.0.0.1:4789'

interface ProgressState {
  attempts: AttemptResult[]
  solvedIds: string[]
  answeredIds: string[]
  seenFingerprints: string[]
  theme: 'dark' | 'light'
  dailyCache: Record<string, Question[]>
  practiceBatch: Question[]
  practiceBatchId: string | null
  lockQuestionId: string | null
  drafts: Record<string, Partial<Record<LanguageId, string>>>
  mockHistory: { at: string; score: number; total: number; minutes: number }[]
  setTheme: (t: 'dark' | 'light') => void
  getDaily: (day?: string) => Question[]
  getLockQuestion: () => Question
  recordAttempt: (a: AttemptResult) => void
  saveDraft: (qid: string, lang: LanguageId, code: string) => void
  addMock: (score: number, total: number, minutes: number) => void
  getPracticeBatch: () => Question[]
  regeneratePractice: (filters: {
    topic?: string
    difficulty?: string
    domain?: string
    count?: number
  }) => { ok: boolean; reason?: string }
  isBatchFullyAnswered: (ids: string[]) => boolean
}

function genCtx(get: () => ProgressState) {
  return {
    recentFingerprints: get().seenFingerprints.slice(-400),
    recentAttempts: get().attempts.slice(-40).map((a) => ({
      correct: a.correct,
      difficulty: a.difficulty,
      at: a.at,
    })),
  }
}

function rememberFingerprints(qs: Question[], prev: string[]) {
  const next = [...prev]
  for (const q of qs) {
    const fp = questionFingerprint(q)
    if (!next.includes(fp)) next.push(fp)
  }
  return next.slice(-500)
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      attempts: [],
      solvedIds: [],
      answeredIds: [],
      seenFingerprints: [],
      theme: 'dark',
      dailyCache: {},
      practiceBatch: [],
      practiceBatchId: null,
      lockQuestionId: null,
      drafts: {},
      mockHistory: [],
      setTheme: (theme) => set({ theme }),
      isBatchFullyAnswered: (ids) => {
        const answered = new Set(get().answeredIds)
        return ids.length > 0 && ids.every((id) => answered.has(id))
      },
      getDaily: (day = dateKey()) => {
        const cache = get().dailyCache
        if (cache[day]?.length) return cache[day]!
        const qs = generateDailySet(day, 12, genCtx(get))
        set({
          dailyCache: { ...cache, [day]: qs },
          seenFingerprints: rememberFingerprints(qs, get().seenFingerprints),
        })
        return qs
      },
      getLockQuestion: () => {
        const day = dateKey()
        const daily = get().getDaily(day)
        // Coding is excluded from lock — avoids /run RCE escape during lockdown
        const lockPool = daily.filter((q) => q.kind === 'mcq' || q.kind === 'objective')
        const pool = lockPool.length ? lockPool : daily
        const solved = new Set(get().solvedIds)
        const existingId = get().lockQuestionId
        if (existingId) {
          const found = pool.find((q) => q.id === existingId) ?? daily.find((q) => q.id === existingId)
          // Pin until correctly solved — wrong attempts must not skip
          if (found && !solved.has(found.id)) return found
        }
        const next = pool.find((q) => !solved.has(q.id)) ?? pool[0]!
        set({ lockQuestionId: next.id })
        return next
      },
      getPracticeBatch: () => {
        const cur = get().practiceBatch
        if (cur.length) return cur
        const qs = generatePracticeBatch({ count: 10 }, `practice-init:${dateKey()}`, genCtx(get))
        set({
          practiceBatch: qs,
          practiceBatchId: `pb-${dateKey()}-init`,
          seenFingerprints: rememberFingerprints(qs, get().seenFingerprints),
        })
        return qs
      },
      regeneratePractice: (filters) => {
        const cur = get().practiceBatch
        if (cur.length && !get().isBatchFullyAnswered(cur.map((q) => q.id))) {
          return {
            ok: false,
            reason:
              'Finish this batch first.',
          }
        }
        const qs = generatePracticeBatch(filters, `practice:${Date.now()}`, genCtx(get))
        set({
          practiceBatch: qs,
          practiceBatchId: `pb-${Date.now()}`,
          seenFingerprints: rememberFingerprints(qs, get().seenFingerprints),
        })
        return { ok: true }
      },
      recordAttempt: (a) => {
        set((s) => ({
          attempts: [...s.attempts, a].slice(-2000),
          answeredIds: Array.from(new Set([...s.answeredIds, a.questionId])),
          solvedIds: a.correct
            ? Array.from(new Set([...s.solvedIds, a.questionId]))
            : s.solvedIds,
          lockQuestionId:
            a.correct && a.questionId === s.lockQuestionId ? null : s.lockQuestionId,
        }))
        void fetch(`${API}/analytics/attempt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(a),
        }).catch(() => {})
      },
      saveDraft: (qid, lang, code) =>
        set((s) => ({
          drafts: {
            ...s.drafts,
            [qid]: { ...s.drafts[qid], [lang]: code },
          },
        })),
      addMock: (score, total, minutes) =>
        set((s) => ({
          mockHistory: [
            { at: new Date().toISOString(), score, total, minutes },
            ...s.mockHistory,
          ].slice(0, 50),
        })),
    }),
    {
      name: 'prepilo-progress-v3',
      version: 3,
      migrate: (persisted: unknown) => {
        let s = (persisted ?? {}) as Record<string, unknown>
        // Migrate browser progress from PrepDesk localStorage key if present
        if ((!s || Object.keys(s).length === 0) && typeof localStorage !== 'undefined') {
          try {
            const legacy = localStorage.getItem('prepdesk-progress-v3')
            if (legacy) s = JSON.parse(legacy)?.state ?? JSON.parse(legacy) ?? s
          } catch {
            /* ignore */
          }
        }
        return {
          attempts: Array.isArray(s.attempts) ? s.attempts : [],
          solvedIds: Array.isArray(s.solvedIds) ? s.solvedIds : [],
          answeredIds: Array.isArray(s.answeredIds) ? s.answeredIds : [],
          seenFingerprints: Array.isArray(s.seenFingerprints) ? s.seenFingerprints : [],
          theme: s.theme === 'light' ? 'light' : 'dark',
          dailyCache: typeof s.dailyCache === 'object' && s.dailyCache ? s.dailyCache : {},
          practiceBatch: Array.isArray(s.practiceBatch) ? s.practiceBatch : [],
          practiceBatchId: (s.practiceBatchId as string | null) ?? null,
          lockQuestionId: (s.lockQuestionId as string | null) ?? null,
          drafts: typeof s.drafts === 'object' && s.drafts ? s.drafts : {},
          mockHistory: Array.isArray(s.mockHistory) ? s.mockHistory : [],
        }
      },
    },
  ),
)

export function computeStats(attempts: AttemptResult[], solvedIds: string[]) {
  const total = attempts.length
  const correct = attempts.filter((a) => a.correct).length
  const accuracy = total ? Math.round((correct / total) * 100) : 0
  const byTopic: Record<string, { ok: number; n: number }> = {}
  const byKind: Record<string, { ok: number; n: number }> = {}
  const byDifficulty: Record<string, { ok: number; n: number }> = {}
  for (const a of attempts) {
    byTopic[a.topic] ??= { ok: 0, n: 0 }
    byTopic[a.topic]!.n++
    if (a.correct) byTopic[a.topic]!.ok++
    byKind[a.kind] ??= { ok: 0, n: 0 }
    byKind[a.kind]!.n++
    if (a.correct) byKind[a.kind]!.ok++
    byDifficulty[a.difficulty] ??= { ok: 0, n: 0 }
    byDifficulty[a.difficulty]!.n++
    if (a.correct) byDifficulty[a.difficulty]!.ok++
  }
  const topicRates = Object.entries(byTopic).map(([topic, v]) => ({
    topic,
    rate: v.n ? v.ok / v.n : 0,
    n: v.n,
  }))
  const weak = [...topicRates].sort((a, b) => a.rate - b.rate).slice(0, 5)
  const strong = [...topicRates].sort((a, b) => b.rate - a.rate).slice(0, 5)
  const days = new Set(attempts.map((a) => a.at.slice(0, 10)))
  let streak = 0
  const d = new Date()
  for (;;) {
    const key = d.toISOString().slice(0, 10)
    if (!days.has(key) && streak > 0) break
    if (days.has(key)) streak++
    else if (streak === 0) {
      d.setDate(d.getDate() - 1)
      continue
    } else break
    d.setDate(d.getDate() - 1)
    if (streak > 400) break
  }
  const timeSpentMs = attempts.reduce((s, a) => s + a.timeSpentMs, 0)
  return {
    total,
    correct,
    accuracy,
    solved: solvedIds.length,
    weak,
    strong,
    streak,
    timeSpentMs,
    byKind,
    byDifficulty,
  }
}
