import { useEffect, useMemo, useState } from 'react'
import Editor from '@monaco-editor/react'
import { motion, AnimatePresence } from 'framer-motion'
import type { LanguageId, Question } from '../types/question'
import { Badge, Button, Card, DiffBadge } from './ui'
import { MarkdownBody } from './MarkdownBody'
import { TOPIC_LABEL } from '../lib/generator/catalog'
import { buildFeedback, gradeMcq, gradeObjective } from '../lib/progress/grade'
import { useProgress } from '../lib/progress/store'
import { runCode, type RunCaseResult } from '../lib/runner'
import { getHints, reviewCodeStub } from '../lib/ai/coach'
import clsx from 'clsx'

const LANGS: LanguageId[] = ['python', 'javascript', 'java', 'cpp', 'go', 'rust']
const API = 'http://127.0.0.1:4789'

export function QuestionPanel({
  question,
  onDone,
  lockMode = false,
  variant = 'default',
}: {
  question: Question
  onDone?: (correct: boolean) => void
  lockMode?: boolean
  /** IDE split: problem left, editor right — fills available width/height */
  variant?: 'default' | 'ide'
}) {
  const theme = useProgress((s) => s.theme)
  const recordAttempt = useProgress((s) => s.recordAttempt)
  const drafts = useProgress((s) => s.drafts)
  const saveDraft = useProgress((s) => s.saveDraft)
  const [started] = useState(() => Date.now())
  const [choice, setChoice] = useState<string>()
  const [text, setText] = useState('')
  const [lang, setLang] = useState<LanguageId>('python')
  const [code, setCode] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [correct, setCorrect] = useState(false)
  const [runs, setRuns] = useState<RunCaseResult[]>([])
  const [runMsg, setRunMsg] = useState('')
  const [hintLevel, setHintLevel] = useState(0)
  const [hint, setHint] = useState('')
  const [aiMarkdown, setAiMarkdown] = useState('')
  const [aiSource, setAiSource] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const ide = variant === 'ide' && question.kind === 'coding' && !lockMode

  useEffect(() => {
    setChoice(undefined)
    setText('')
    setSubmitted(false)
    setCorrect(false)
    setRuns([])
    setRunMsg('')
    setHintLevel(0)
    setHint('')
    setAiMarkdown('')
    setAiSource('')
    const starter = question.coding?.starterCode.python ?? ''
    const saved = drafts[question.id]?.python ?? starter
    setLang('python')
    setCode(saved)
  }, [question.id])

  useEffect(() => {
    if (question.kind !== 'coding') return
    const starter = question.coding?.starterCode[lang] ?? ''
    const saved = drafts[question.id]?.[lang]
    setCode(saved ?? starter)
  }, [lang])

  const feedback = useMemo(
    () => (submitted ? buildFeedback(question, correct, choice, { compact: lockMode || !correct }) : []),
    [submitted, correct, question, choice, lockMode],
  )

  async function fetchExplanation(ok: boolean, userAnswer?: string) {
    if (lockMode && !ok) {
      setAiMarkdown('')
      setAiSource('lock')
      return
    }
    setAiLoading(true)
    try {
      const selectedOptionText = question.options?.find((o) => o.id === choice)?.text
      const res = await fetch(`${API}/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          correct: ok,
          userAnswer,
          selectedOptionText,
        }),
      })
      const data = await res.json()
      setAiMarkdown(data.markdown || '')
      setAiSource(data.source || 'local')
    } catch {
      setAiMarkdown(feedback.map((f) => `## ${f.title}\n${f.body}`).join('\n\n'))
      setAiSource('local')
    } finally {
      setAiLoading(false)
    }
  }

  function finish(ok: boolean, userAnswer?: string) {
    setCorrect(ok)
    setSubmitted(true)
    recordAttempt({
      questionId: question.id,
      correct: ok,
      kind: question.kind,
      topic: question.topic,
      domain: question.domain,
      difficulty: question.difficulty,
      timeSpentMs: Date.now() - started,
      at: new Date().toISOString(),
      userAnswer,
      language: question.kind === 'coding' ? lang : undefined,
    })
    void fetchExplanation(ok, userAnswer)
    onDone?.(ok)
  }

  async function onRun(submit = false) {
    if (!question.coding) return
    saveDraft(question.id, lang, code)
    setRunMsg('Running…')
    const cases = submit
      ? [...question.coding.samples, ...question.coding.hidden]
      : question.coding.samples
    const res = await runCode({ language: lang, code, cases })
    if (!res.ok && !res.results.length) {
      setRunMsg(res.message ?? 'Run failed')
      return
    }
    setRuns(res.results)
    setRunMsg(res.ok ? 'All tests passed' : 'Some tests failed')
    if (submit) finish(!!res.ok, 'code-submit')
  }

  function retry() {
    if (correct) return
    setSubmitted(false)
    setAiMarkdown('')
    setRuns([])
    setRunMsg('')
  }

  const meta = (
    <div className="flex flex-wrap items-center gap-2">
      <DiffBadge d={question.difficulty} />
      <Badge>{TOPIC_LABEL[question.topic]}</Badge>
      {!lockMode && <Badge tone="accent">{question.company}</Badge>}
      <Badge>{question.kind}</Badge>
      {lockMode && <Badge tone="warn">locked</Badge>}
      {!lockMode && (
        <>
          <Badge>~{question.estimatedMinutes}m</Badge>
          <Badge>freq {question.interviewFrequency}</Badge>
        </>
      )}
    </div>
  )

  const codingBrief = question.coding && (
    <div className="space-y-4 text-sm text-[var(--color-muted)]">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-faint)]">
          Constraints
        </div>
        <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
          {question.coding.constraints.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-faint)]">
          I/O
        </div>
        <pre className="mt-1.5 overflow-auto rounded-xl border border-[var(--color-line)] bg-[var(--color-elevated)] p-3 font-mono text-xs">
          {question.coding.inputFormat}
          {'\n---\n'}
          {question.coding.outputFormat}
        </pre>
      </div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-faint)]">
          Samples
        </div>
        {question.coding.samples.map((s) => (
          <pre
            key={s.id}
            className="mt-2 overflow-auto rounded-xl border border-[var(--color-line)] bg-[var(--color-elevated)] p-3 font-mono text-xs"
          >
            {s.name}
            {'\n'}INPUT:{'\n'}
            {s.input}
            EXPECTED:{'\n'}
            {s.expectedOutput}
          </pre>
        ))}
      </div>
    </div>
  )

  const resultPanel = (
    <>
      {runMsg && <p className="text-sm text-[var(--color-muted)]">{runMsg}</p>}
      {!!runs.length && (
        <div className="space-y-2">
          {runs.map((r) => (
            <div
              key={r.id}
              className={`rounded-xl border px-3 py-2 font-mono text-xs ${
                r.passed
                  ? 'border-emerald-500/30 text-[var(--color-ok)]'
                  : 'border-rose-500/30 text-[var(--color-danger)]'
              }`}
            >
              {r.passed ? 'PASS' : 'FAIL'} · {r.hidden ? 'hidden' : r.name} · {r.timeMs}ms
              {!r.passed && (
                <pre className="mt-1 whitespace-pre-wrap text-[var(--color-muted)]">
                  expected: {r.expected}
                  {'\n'}actual: {r.actual || '(empty)'}
                  {r.stderr ? `\nstderr: ${r.stderr}` : ''}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
      {hint && (
        <Card className="bg-[var(--color-elevated)] text-sm text-[var(--color-muted)]">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
            Coach
          </div>
          <pre className="whitespace-pre-wrap font-sans">{hint}</pre>
        </Card>
      )}
    </>
  )

  const feedbackBlock = (
    <div className={lockMode && !submitted ? 'hidden' : 'space-y-3'}>
      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <Card
              className={
                correct
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : 'border-rose-500/40 bg-rose-500/5'
              }
            >
              <div className="text-lg font-semibold">{correct ? 'Correct' : 'Not quite'}</div>
              {!correct && feedback[0] && (
                <p className="mt-1 text-sm text-[var(--color-muted)]">{feedback[0].body}</p>
              )}
              {lockMode && !correct && (
                <p className="mt-2 text-xs text-[var(--color-faint)]">Try again or ask for a hint.</p>
              )}
            </Card>

            {correct && aiLoading && (
              <Card>
                <p className="text-sm text-[var(--color-muted)]">Writing explanation…</p>
              </Card>
            )}

            {correct && aiMarkdown && (
              <Card>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                    Explanation
                  </div>
                  {!lockMode && <Badge tone="accent">{aiSource}</Badge>}
                </div>
                <MarkdownBody content={aiMarkdown} />
              </Card>
            )}

            {correct &&
              !aiMarkdown &&
              feedback.map((f) => (
                <Card key={f.title}>
                  <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                    {f.title}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{f.body}</p>
                </Card>
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  const editorPane = question.kind === 'coding' && (
    <div className={clsx('flex min-h-0 flex-col', ide ? 'h-full' : 'space-y-3')}>
      <div
        className={clsx(
          'flex flex-wrap items-center gap-2',
          ide && 'shrink-0 border-b border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-2',
        )}
      >
        {LANGS.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            className={`rounded-lg px-2.5 py-1 font-mono text-xs ${
              lang === l
                ? 'bg-[var(--color-accent)] text-[#042f2e]'
                : 'bg-[var(--color-elevated)] text-[var(--color-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            {l}
          </button>
        ))}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => void onRun(false)}>
            Run samples
          </Button>
          <Button onClick={() => void onRun(true)}>Submit all tests</Button>
          <Button
            variant="ghost"
            onClick={() => {
              const next = hintLevel
              setHint(getHints(question, next))
              setHintLevel(next + 1)
            }}
          >
            Hint
          </Button>
          <Button variant="ghost" onClick={() => setHint(reviewCodeStub(code, question).join('\n'))}>
            Review
          </Button>
        </div>
      </div>
      <div
        className={clsx(
          'min-h-0 overflow-hidden border-[var(--color-line)]',
          ide ? 'flex-1 border-0' : 'rounded-xl border',
        )}
      >
        <Editor
          height={ide ? '100%' : '380px'}
          language={lang === 'cpp' ? 'cpp' : lang}
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          value={code}
          onChange={(v) => {
            const next = v ?? ''
            setCode(next)
            saveDraft(question.id, lang, next)
          }}
          options={{
            fontSize: 13,
            fontFamily: 'IBM Plex Mono',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            readOnly: submitted && correct,
            padding: { top: 12 },
          }}
        />
      </div>
      {(runMsg || runs.length > 0 || hint || (ide && submitted)) && (
        <div
          className={clsx(
            'space-y-3',
            ide &&
              'max-h-[32%] shrink-0 overflow-y-auto border-t border-[var(--color-line)] bg-[var(--color-panel)] p-3',
          )}
        >
          {resultPanel}
          {ide && feedbackBlock}
        </div>
      )}
    </div>
  )

  if (ide) {
    return (
      <div className="flex h-full min-h-0">
        <aside className="flex w-[min(38%,420px)] shrink-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-panel)]">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
            {meta}
            <h2 className="text-xl font-semibold tracking-tight">{question.title}</h2>
            <p className="leading-relaxed text-[var(--color-muted)]">{question.prompt}</p>
            {codingBrief}
          </div>
        </aside>
        <section className="min-w-0 flex-1 bg-[var(--color-canvas)]">{editorPane}</section>
      </div>
    )
  }

  // Default: coding uses problem | editor split; MCQ/objective stay single column
  if (question.kind === 'coding') {
    return (
      <div className="grid min-h-[560px] gap-0 overflow-hidden rounded-2xl border border-[var(--color-line)] lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.35fr)]">
        <aside className="space-y-4 overflow-y-auto border-b border-[var(--color-line)] bg-[var(--color-panel)] p-5 lg:border-b-0 lg:border-r">
          {meta}
          <h2 className="text-2xl font-semibold tracking-tight">{question.title}</h2>
          <p className="leading-relaxed text-[var(--color-muted)]">{question.prompt}</p>
          {codingBrief}
          {resultPanel}
          {feedbackBlock}
        </aside>
        <section className="min-h-[420px] bg-[var(--color-canvas)] lg:min-h-0">{editorPane}</section>
      </div>
    )
  }

  return (
    <div className={lockMode ? 'space-y-4' : 'mx-auto max-w-3xl'}>
      <Card className="shine space-y-4">
        {meta}
        <h2 className="text-2xl font-semibold tracking-tight">{question.title}</h2>
        <p className="leading-relaxed text-[var(--color-muted)]">{question.prompt}</p>

        {question.kind === 'mcq' && (
          <div className="space-y-2">
            {question.options?.map((o) => (
              <button
                key={o.id}
                type="button"
                disabled={submitted && correct}
                onClick={() => setChoice(o.id)}
                className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                  choice === o.id
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-dim)]/30'
                    : 'border-[var(--color-line)] hover:bg-[var(--color-elevated)]'
                }`}
              >
                <span className="font-mono text-[var(--color-accent)]">{o.id}.</span>
                <span>{o.text}</span>
              </button>
            ))}
            {!submitted && (
              <Button disabled={!choice} onClick={() => finish(gradeMcq(question, choice!), choice)}>
                Submit answer
              </Button>
            )}
            {submitted && !correct && (
              <Button variant="ghost" onClick={retry}>
                Try again
              </Button>
            )}
          </div>
        )}

        {question.kind === 'objective' && (
          <div className="space-y-3">
            <input
              value={text}
              disabled={submitted && correct}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your answer"
              className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-elevated)] px-3 py-2 outline-none ring-[var(--color-accent)] focus:ring-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && text && !(submitted && correct))
                  finish(gradeObjective(question, text), text)
              }}
            />
            {!submitted && (
              <Button disabled={!text.trim()} onClick={() => finish(gradeObjective(question, text), text)}>
                Submit answer
              </Button>
            )}
            {submitted && !correct && (
              <Button variant="ghost" onClick={retry}>
                Try again
              </Button>
            )}
          </div>
        )}
      </Card>
      {feedbackBlock}
    </div>
  )
}
