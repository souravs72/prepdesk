import { useMemo, useState } from 'react'
import { QuestionPanel } from '../../components/QuestionPanel'
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
    <div className="mx-auto h-full max-w-6xl space-y-4 overflow-auto p-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">
          Today <span className="font-normal text-[var(--color-muted)]">· {day}</span>
        </h1>
        <div className="font-mono text-sm tabular-nums text-[var(--color-muted)]">
          {done}/{questions.length}
        </div>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {questions.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setIdx(i)}
            title={item.title}
            className={`rounded-lg border px-2.5 py-1 font-mono text-xs transition ${
              i === idx
                ? 'border-[var(--color-accent)] bg-[var(--color-accent-dim)]/20'
                : 'border-[var(--color-line)] hover:bg-[var(--color-elevated)]'
            }`}
          >
            {i + 1}
            {solvedIds.includes(item.id) ? ' ✓' : ''}
          </button>
        ))}
      </div>

      <QuestionPanel key={q.id} question={q} />
    </div>
  )
}
