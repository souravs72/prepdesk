import { useState } from 'react'
import { Button, Card } from '../../components/ui'
import { useProgress } from '../../lib/progress/store'
import { aiAssist } from '../../lib/ai/coach'

export function CoachPage() {
  const getDaily = useProgress((s) => s.getDaily)
  const q = getDaily()[0]!
  const [prompt, setPrompt] = useState('')
  const [out, setOut] = useState('')
  const [key, setKey] = useState(() => localStorage.getItem('prepilo-openai-key') ?? '')
  const [showKey, setShowKey] = useState(false)

  return (
    <div className="mx-auto h-full max-w-3xl space-y-4 overflow-auto p-5">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Coach</h1>
        <span className="truncate text-sm text-[var(--color-muted)]">{q.title}</span>
      </header>

      <Card className="space-y-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="Ask a hint…"
          className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-elevated)] px-3 py-2"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={!prompt.trim()}
            onClick={async () => {
              setOut('…')
              setOut(await aiAssist(prompt, q))
            }}
          >
            Ask
          </Button>
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="text-xs text-[var(--color-faint)] underline-offset-2 hover:underline"
          >
            API key
          </button>
        </div>
        {showKey && (
          <input
            type="password"
            value={key}
            onChange={(e) => {
              setKey(e.target.value)
              localStorage.setItem('prepilo-openai-key', e.target.value)
            }}
            className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-elevated)] px-3 py-2 text-sm"
            placeholder="sk-…"
          />
        )}
        {out && (
          <pre className="whitespace-pre-wrap rounded-xl bg-[var(--color-elevated)] p-3 text-sm text-[var(--color-muted)]">
            {out}
          </pre>
        )}
      </Card>
    </div>
  )
}
