import { useEffect, useState } from 'react'
import { QuestionPanel } from '../../components/QuestionPanel'
import { Button } from '../../components/ui'
import { generatePracticeBatch } from '../../lib/generator'
import { useProgress } from '../../lib/progress/store'
import { runnerHealth } from '../../lib/runner'
import type { Question } from '../../types/question'

export function PlaygroundPage() {
  const answeredIds = useProgress((s) => s.answeredIds)
  const [question, setQuestion] = useState<Question>(() => pickCoding())
  const [msg, setMsg] = useState('')
  const [runnerOk, setRunnerOk] = useState(true)

  const answered = answeredIds.includes(question.id)

  useEffect(() => {
    const tick = () => void runnerHealth().then(setRunnerOk)
    tick()
    const id = setInterval(tick, 5000)
    return () => clearInterval(id)
  }, [])

  function pickCoding(salt = Date.now().toString()): Question {
    return (
      generatePracticeBatch({ count: 8 }, `play:${salt}`).find((q) => q.kind === 'coding') ??
      generatePracticeBatch({ count: 12 }, `play:${salt}:b`).find((q) => q.kind === 'coding')!
    )
  }

  function nextProblem() {
    if (!answered) {
      setMsg('Submit this problem before generating a new one.')
      return
    }
    setMsg('')
    setQuestion(pickCoding())
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--color-line)] bg-[var(--color-panel)]/80 px-5 py-3 backdrop-blur">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              Playground
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                runnerOk
                  ? 'bg-emerald-500/15 text-[var(--color-ok)]'
                  : 'bg-amber-500/15 text-[var(--color-warn)]'
              }`}
            >
              runner {runnerOk ? 'online' : 'offline'}
            </span>
          </div>
          <h1 className="truncate text-lg font-semibold tracking-tight">{question.title}</h1>
          {msg && <p className="text-xs text-[var(--color-warn)]">{msg}</p>}
          {!runnerOk && (
            <p className="text-xs text-[var(--color-muted)]">
              Start the local runner: <code className="text-[var(--color-accent)]">npm run runner</code>
            </p>
          )}
        </div>
        <Button disabled={!answered} onClick={nextProblem}>
          {answered ? 'Next problem' : 'Answer current first'}
        </Button>
      </header>
      <div className="min-h-0 flex-1">
        <QuestionPanel question={question} variant="ide" />
      </div>
    </div>
  )
}
