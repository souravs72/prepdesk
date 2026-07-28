import { useMemo, useState } from 'react'
import { QuestionPanel } from '../../components/QuestionPanel'
import { Badge, Button, Card } from '../../components/ui'
import { useProgress } from '../../lib/progress/store'
import { dateKey } from '../../lib/generator/rng'

export function TodayPage() {
  const getDaily = useProgress((s) => s.getDaily)
  const solvedIds = useProgress((s) => s.solvedIds)
  const day = dateKey()
  const questions = useMemo(() => getDaily(day), [getDaily, day])
  const [idx, setIdx] = useState(0)
  const q = questions[idx]!
  const done = questions.filter((x) => solvedIds.includes(x.id)).length

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
            Daily set · {day}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Fresh questions. Zero déjà vu.</h1>
          <p className="mt-2 max-w-2xl text-[var(--color-muted)]">
            {questions.length} original problems for today (DSA, system design, OS, DBMS). This set is
            frozen for the calendar day — it will not regenerate mid-day.
          </p>
        </div>
        <Card className="min-w-[160px]">
          <div className="text-3xl font-semibold tabular-nums">
            {done}/{questions.length}
          </div>
          <div className="text-xs text-[var(--color-muted)]">solved today</div>
        </Card>
      </header>

      <div className="flex flex-wrap gap-2">
        {questions.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setIdx(i)}
            className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
              i === idx
                ? 'border-[var(--color-accent)] bg-[var(--color-accent-dim)]/20'
                : 'border-[var(--color-line)] hover:bg-[var(--color-elevated)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-[var(--color-faint)]">{i + 1}</span>
              <Badge>{item.kind}</Badge>
              {solvedIds.includes(item.id) && <Badge tone="ok">done</Badge>}
            </div>
            <div className="mt-1 max-w-[140px] truncate font-medium">{item.title}</div>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant="ghost" disabled={idx === 0} onClick={() => setIdx((i) => i - 1)}>
          Previous
        </Button>
        <Button
          variant="ghost"
          disabled={idx >= questions.length - 1}
          onClick={() => setIdx((i) => i + 1)}
        >
          Next
        </Button>
      </div>

      <QuestionPanel key={q.id} question={q} />
    </div>
  )
}
