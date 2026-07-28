import { useState } from 'react'
import { QuestionPanel } from '../../components/QuestionPanel'
import { Button, Card } from '../../components/ui'
import { TOPICS, DIFFICULTIES, TOPIC_LABEL } from '../../lib/generator/catalog'
import { useProgress } from '../../lib/progress/store'

export function PracticePage() {
  const getPracticeBatch = useProgress((s) => s.getPracticeBatch)
  const regeneratePractice = useProgress((s) => s.regeneratePractice)
  const isBatchFullyAnswered = useProgress((s) => s.isBatchFullyAnswered)
  const answeredIds = useProgress((s) => s.answeredIds)
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [domain, setDomain] = useState('')
  const [batch, setBatch] = useState(() => getPracticeBatch())
  const [idx, setIdx] = useState(0)
  const [msg, setMsg] = useState('')

  const frozen = batch.length > 0 && !isBatchFullyAnswered(batch.map((q) => q.id))
  const answeredCount = batch.filter((q) => answeredIds.includes(q.id)).length

  function regenerate() {
    const res = regeneratePractice({
      topic: topic || undefined,
      difficulty: difficulty || undefined,
      domain: domain || undefined,
      count: 10,
    })
    if (!res.ok) {
      setMsg(res.reason ?? 'Cannot regenerate yet')
      return
    }
    setMsg('')
    setBatch(useProgress.getState().practiceBatch)
    setIdx(0)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
          Practice
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Filter. Generate. Drill.</h1>
        <p className="mt-2 text-[var(--color-muted)]">
          A batch is frozen until every question is answered. No skipping via regenerate.
        </p>
      </header>

      <Card className="grid gap-3 md:grid-cols-4">
        <label className="text-sm">
          <span className="text-[var(--color-muted)]">Topic</span>
          <select
            className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-elevated)] px-2 py-2"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          >
            <option value="">Any</option>
            {TOPICS.map((t) => (
              <option key={t} value={t}>
                {TOPIC_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-[var(--color-muted)]">Difficulty</span>
          <select
            className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-elevated)] px-2 py-2"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="">Any</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-[var(--color-muted)]">Domain</span>
          <select
            className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-elevated)] px-2 py-2"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          >
            <option value="">Any</option>
            <option value="dsa">DSA</option>
            <option value="system-design">System Design</option>
            <option value="os">OS</option>
            <option value="dbms">DBMS</option>
            <option value="sql">SQL</option>
            <option value="oop">OOP</option>
            <option value="networking">Networking</option>
          </select>
        </label>
        <div className="flex items-end">
          <Button className="w-full" disabled={frozen} onClick={regenerate}>
            {frozen ? `Answered ${answeredCount}/${batch.length}` : 'Generate 10'}
          </Button>
        </div>
      </Card>

      {msg && <p className="text-sm text-[var(--color-warn)]">{msg}</p>}

      {batch.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            {batch.map((q, i) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setIdx(i)}
                className={`rounded-lg border px-2 py-1 text-xs ${
                  i === idx ? 'border-[var(--color-accent)]' : 'border-[var(--color-line)]'
                }`}
              >
                {i + 1}. {q.title}
                {answeredIds.includes(q.id) ? ' ✓' : ''}
              </button>
            ))}
          </div>
          <QuestionPanel question={batch[idx]!} />
        </>
      )}
    </div>
  )
}
