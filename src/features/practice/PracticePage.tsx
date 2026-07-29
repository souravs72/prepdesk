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
      setMsg(res.reason ?? 'Finish batch first.')
      return
    }
    setMsg('')
    setBatch(useProgress.getState().practiceBatch)
    setIdx(0)
  }

  return (
    <div className="mx-auto h-full max-w-6xl space-y-4 overflow-auto p-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Practice</h1>
        {batch.length > 0 && (
          <span className="font-mono text-sm tabular-nums text-[var(--color-muted)]">
            {answeredCount}/{batch.length}
          </span>
        )}
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
        <div className="flex items-end" title={frozen ? 'Finish batch first' : undefined}>
          <Button className="w-full" disabled={frozen} onClick={regenerate}>
            Generate
          </Button>
        </div>
      </Card>

      {msg && <p className="text-sm text-[var(--color-warn)]">{msg}</p>}

      {batch.length > 0 && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {batch.map((q, i) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setIdx(i)}
                title={q.title}
                className={`rounded-lg border px-2.5 py-1 font-mono text-xs ${
                  i === idx ? 'border-[var(--color-accent)]' : 'border-[var(--color-line)]'
                }`}
              >
                {i + 1}
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
