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

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
          Analytics
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Know your edges.</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Persisted under ~/.config/prepilo/analytics.json. Below 80% rolling accuracy schedules a
          retest in ~4.5 hours.
        </p>
      </header>

      {retest.dueAtIso && (
        <Card className="border-amber-500/30">
          <div className="text-sm font-medium text-[var(--color-warn)]">Retest scheduled</div>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {retest.reason} (rolling {retest.accuracy}%). Due {retest.dueAtIso}
          </p>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Attempted', stats.total],
          ['Solved', stats.solved],
          ['Accuracy', `${stats.accuracy}%`],
          ['Streak', `${stats.streak}d`],
        ].map(([k, v]) => (
          <Card key={k as string}>
            <div className="text-xs text-[var(--color-muted)]">{k}</div>
            <div className="mt-2 text-3xl font-semibold tabular-nums">{v}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h3 className="font-semibold">By difficulty</h3>
          <ul className="mt-3 space-y-2 text-sm text-[var(--color-muted)]">
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
          <h3 className="font-semibold">By type</h3>
          <ul className="mt-3 space-y-2 text-sm text-[var(--color-muted)]">
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
          <h3 className="font-semibold">Disk snapshot (topics)</h3>
          <ul className="mt-3 max-h-48 space-y-2 overflow-auto text-sm text-[var(--color-muted)]">
            {Object.entries(disk.byTopic || {}).map(([k, v]) => (
              <li key={k} className="flex justify-between font-mono text-xs">
                <span>{TOPIC_LABEL[k as keyof typeof TOPIC_LABEL] ?? k}</span>
                <span>
                  {v.ok}/{v.n}
                </span>
              </li>
            ))}
            {!Object.keys(disk.byTopic || {}).length && <li>No disk analytics yet.</li>}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="font-semibold">Weak topics</h3>
          <ul className="mt-3 space-y-2 text-sm text-[var(--color-muted)]">
            {stats.weak.length === 0 && <li>Attempt more questions to unlock signals.</li>}
            {stats.weak.map((t) => (
              <li key={t.topic} className="flex justify-between">
                <span>{TOPIC_LABEL[t.topic as keyof typeof TOPIC_LABEL] ?? t.topic}</span>
                <span className="font-mono">
                  {Math.round(t.rate * 100)}% · {t.n}
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h3 className="font-semibold">Strong topics</h3>
          <ul className="mt-3 space-y-2 text-sm text-[var(--color-muted)]">
            {stats.strong.length === 0 && <li>No data yet.</li>}
            {stats.strong.map((t) => (
              <li key={t.topic} className="flex justify-between">
                <span>{TOPIC_LABEL[t.topic as keyof typeof TOPIC_LABEL] ?? t.topic}</span>
                <span className="font-mono">
                  {Math.round(t.rate * 100)}% · {t.n}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <h3 className="font-semibold">Time invested</h3>
        <p className="mt-2 text-[var(--color-muted)]">
          ~{Math.round(stats.timeSpentMs / 60000)} minutes across tracked attempts.
        </p>
      </Card>

      <Card>
        <h3 className="font-semibold">Mock history</h3>
        <ul className="mt-3 space-y-2 text-sm text-[var(--color-muted)]">
          {mockHistory.length === 0 && <li>No mocks yet.</li>}
          {mockHistory.map((m) => (
            <li key={m.at} className="flex justify-between font-mono text-xs">
              <span>{m.at.slice(0, 19)}</span>
              <span>
                {m.score}/{m.total} · {m.minutes}m
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
