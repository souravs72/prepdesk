import { useMemo, useState } from 'react'
import { QuestionPanel } from '../../components/QuestionPanel'
import { Button, Card } from '../../components/ui'
import { generatePracticeBatch } from '../../lib/generator'
import { useProgress } from '../../lib/progress/store'
import type { Question } from '../../types/question'

export function PlaygroundPage() {
  const answeredIds = useProgress((s) => s.answeredIds)
  const [question, setQuestion] = useState<Question>(() => pickCoding())
  const [msg, setMsg] = useState('')

  const answered = answeredIds.includes(question.id)

  function pickCoding(salt = Date.now().toString()): Question {
    return (
      generatePracticeBatch({ count: 8 }, `play:${salt}`).find((q) => q.kind === 'coding') ??
      generatePracticeBatch({ count: 12 }, `play:${salt}:b`).find((q) => q.kind === 'coding')!
    )
  }

  function nextProblem() {
    if (!answered) {
      setMsg('Submit this problem (pass or fail counts as answered) before generating a new one.')
      return
    }
    setMsg('')
    setQuestion(pickCoding())
  }

  const note = useMemo(
    () => 'Monaco editor · multi-language · sample + hidden tests via local runner.',
    [],
  )

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
            Playground
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Code like it’s the real round.</h1>
          <p className="mt-2 text-[var(--color-muted)]">{note}</p>
        </div>
        <Button disabled={!answered} onClick={nextProblem}>
          {answered ? 'New coding problem' : 'Answer current first'}
        </Button>
      </header>
      {msg && <p className="text-sm text-[var(--color-warn)]">{msg}</p>}
      <Card className="text-sm text-[var(--color-muted)]">
        Start the runner: <code className="font-mono text-[var(--color-accent)]">npm run runner</code>
      </Card>
      <QuestionPanel question={question} />
    </div>
  )
}
