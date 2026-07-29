import { useEffect, useState } from 'react'
import { Card } from '../../components/ui'
import { computeStats, useProgress } from '../../lib/progress/store'
import { TOPIC_LABEL } from '../../lib/generator/catalog'

const API = 'http://127.0.0.1:4789'

export function AnalyticsPage() {
  const attempts = useProgress((s) => s.attempts)
  const solvedIds = useProgress((s) => s.solvedIds)
  const mockHistory = useProgress((s) => s.mockHistory)
  const stats = computeStats(attempts, solvedIds)
  const [retest, setRetest] = useState<{ dueAtIso?: string; accuracy?: number; reason?: string }>({})
  const [disk, setDisk] = useState<{
    byTopic?: Record<string, { n: number; ok: number }>
    byKind?: Record<string, { n: number; ok: number }>
    byDifficulty?: Record<string, { n: number; ok: number }>
  }>({})

  useEffect(() => {
    void fetch(`${API}/analytics`)
      .then((r) => r.json())
      .then(setDisk)
      .catch(() => {})
    void fetch(`${API}/retest`)
      .then((r) => r.json())
      .then(setRetest)
      .catch(() => {})
  }, [attempts.length])

  const retestDue = retest.dueAtIso
    ? new Date(retest.dueAtIso).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  return (
    <div className="mx-auto h-full max-w-6xl space-y-4 overflow-auto p-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
      </header>

      {retest.dueAtIso && (
        <Card className="border-amber-500/30">
          <div className="text-sm text-[var(--color-warn)]">
            Retest · {retest.accuracy}% · {retestDue}
          </div>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Attempted', stats.total],
          ['Solved', stats.solved],
          ['Accuracy', `${stats.accuracy}%`],
          ['Streak', `${stats.streak}d`],
        ].map(([k, v]) => (
          <Card key={k as string}>
            <div className="text-xs text-[var(--color-muted)]">{k}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{v}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card>
          <h3 className="text-sm font-medium">Difficulty</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-[var(--color-muted)]">
            {Object.entries(stats.byDifficulty || {}).map(([k, v]) => (
              <li key={k} className="flex justify-between font-mono text-xs">
                <span>{k}</span>
                <span>
                  {v.ok}/{v.n}
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h3 className="text-sm font-medium">Type</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-[var(--color-muted)]">
            {Object.entries(stats.byKind || {}).map(([k, v]) => (
              <li key={k} className="flex justify-between font-mono text-xs">
                <span>{k}</span>
                <span>
                  {v.ok}/{v.n}
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h3 className="text-sm font-medium">Topics</h3>
          <ul className="mt-2 max-h-48 space-y-1.5 overflow-auto text-sm text-[var(--color-muted)]">
            {Object.entries(disk.byTopic || {}).map(([k, v]) => (
              <li key={k} className="flex justify-between font-mono text-xs">
                <span>{TOPIC_LABEL[k as keyof typeof TOPIC_LABEL] ?? k}</span>
                <span>
                  {v.ok}/{v.n}
                </span>
              </li>
            ))}
            {!Object.keys(disk.byTopic || {}).length && <li>No data</li>}
          </ul>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <h3 className="text-sm font-medium">Weak</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-[var(--color-muted)]">
            {stats.weak.length === 0 && <li>No data</li>}
            {stats.weak.map((t) => (
              <li key={t.topic} className="flex justify-between">
                <span>{TOPIC_LABEL[t.topic as keyof typeof TOPIC_LABEL] ?? t.topic}</span>
                <span className="font-mono text-xs">
                  {Math.round(t.rate * 100)}% · {t.n}
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h3 className="text-sm font-medium">Strong</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-[var(--color-muted)]">
            {stats.strong.length === 0 && <li>No data</li>}
            {stats.strong.map((t) => (
              <li key={t.topic} className="flex justify-between">
                <span>{TOPIC_LABEL[t.topic as keyof typeof TOPIC_LABEL] ?? t.topic}</span>
                <span className="font-mono text-xs">
                  {Math.round(t.rate * 100)}% · {t.n}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <h3 className="text-sm font-medium">Time</h3>
          <p className="mt-1 font-mono text-sm text-[var(--color-muted)]">
            {Math.round(stats.timeSpentMs / 60000)} min
          </p>
        </Card>
        <Card>
          <h3 className="text-sm font-medium">Mocks</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-[var(--color-muted)]">
            {mockHistory.length === 0 && <li>None</li>}
            {mockHistory.map((m) => (
              <li key={m.at} className="flex justify-between font-mono text-xs">
                <span>{m.at.slice(0, 10)}</span>
                <span>
                  {m.score}/{m.total} · {m.minutes}m
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
