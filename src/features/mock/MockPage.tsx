import { useEffect, useMemo, useState } from 'react'
import { QuestionPanel } from '../../components/QuestionPanel'
import { Button, Card } from '../../components/ui'
import { generatePracticeBatch } from '../../lib/generator'
import { useProgress } from '../../lib/progress/store'
import type { Question } from '../../types/question'

export function MockPage() {
  const addMock = useProgress((s) => s.addMock)
  const [running, setRunning] = useState(false)
  const [qs, setQs] = useState<Question[]>([])
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [seconds, setSeconds] = useState(45 * 60)
  const [done, setDone] = useState(false)
  const startedAt = useMemo(() => Date.now(), [running])

  useEffect(() => {
    if (!running || done) return
    const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [running, done])

  useEffect(() => {
    if (running && seconds === 0 && !done) finish(score)
  }, [seconds])

  function start() {
    const batch = generatePracticeBatch({ count: 5 }, `mock:${Date.now()}`)
    setQs(batch)
    setIdx(0)
    setScore(0)
    setSeconds(45 * 60)
    setDone(false)
    setRunning(true)
  }

  function finish(finalScore: number) {
    setDone(true)
    setRunning(false)
    const minutes = Math.round((Date.now() - startedAt) / 60000)
    addMock(finalScore, qs.length || 5, minutes)
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <div className="mx-auto h-full max-w-6xl space-y-6 overflow-auto p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
            Mock interview
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">45 minutes. Five questions.</h1>
        </div>
        {!running && !done && <Button onClick={start}>Start mock</Button>}
        {(running || done) && (
          <Card>
            <div className="font-mono text-2xl tabular-nums">
              {mm}:{ss}
            </div>
            <div className="text-xs text-[var(--color-muted)]">
              score {score}/{qs.length}
            </div>
          </Card>
        )}
      </header>

      {running && qs[idx] && (
        <QuestionPanel
          question={qs[idx]!}
          onDone={(ok) => {
            const nextScore = score + (ok ? 1 : 0)
            setScore(nextScore)
            if (idx + 1 >= qs.length) finish(nextScore)
            else setIdx(idx + 1)
          }}
        />
      )}

      {done && (
        <Card className="space-y-3">
          <h2 className="text-xl font-semibold">Session feedback</h2>
          <p className="text-[var(--color-muted)]">
            You scored {score}/{qs.length}. Review each explanation in Practice, then re-drill weak
            topics from Analytics.
          </p>
          <Button onClick={start}>Run another mock</Button>
        </Card>
      )}
    </div>
  )
}
