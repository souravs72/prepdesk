import { useEffect, useMemo, useState } from 'react'
import { QuestionPanel } from '../../components/QuestionPanel'
import { Button } from '../../components/ui'
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
    <div className="mx-auto h-full max-w-6xl space-y-4 overflow-auto p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Mock</h1>
          <span className="text-sm text-[var(--color-muted)]">5 · 45m</span>
        </div>
        {!running && !done && <Button onClick={start}>Start</Button>}
        {(running || done) && (
          <div className="font-mono text-sm tabular-nums text-[var(--color-muted)]">
            {mm}:{ss} · {score}/{qs.length}
          </div>
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
        <div className="flex items-center gap-4">
          <p className="font-mono text-lg tabular-nums">
            {score}/{qs.length}
          </p>
          <Button onClick={start}>Again</Button>
        </div>
      )}
    </div>
  )
}
