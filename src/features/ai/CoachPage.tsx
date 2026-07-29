import { useState } from 'react'
import { Button, Card } from '../../components/ui'
import { useProgress } from '../../lib/progress/store'
import { aiAssist } from '../../lib/ai/coach'

export function CoachPage() {
  const getDaily = useProgress((s) => s.getDaily)
  const q = getDaily()[0]!
  const [prompt, setPrompt] = useState('Give me a hint without revealing the answer.')
  const [out, setOut] = useState('')
  const [key, setKey] = useState(() => localStorage.getItem('prepilo-openai-key') ?? '')

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
          AI coach
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Hints, reviews, next steps.</h1>
      </header>

      <Card className="space-y-3">
        <label className="block text-sm">
          <span className="text-[var(--color-muted)]">Optional OpenAI API key (stored locally)</span>
          <input
            type="password"
            value={key}
            onChange={(e) => {
              setKey(e.target.value)
              localStorage.setItem('prepilo-openai-key', e.target.value)
            }}
            className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-elevated)] px-3 py-2"
            placeholder="sk-..."
          />
        </label>
        <p className="text-xs text-[var(--color-muted)]">
          Without a key, Prepilo uses a local progressive hint engine. Context: today’s first question —
          “{q.title}”.
        </p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-elevated)] px-3 py-2"
        />
        <Button
          onClick={async () => {
            setOut('Thinking…')
            setOut(await aiAssist(prompt, q))
          }}
        >
          Ask coach
        </Button>
        {out && (
          <pre className="whitespace-pre-wrap rounded-xl bg-[var(--color-elevated)] p-4 text-sm text-[var(--color-muted)]">
            {out}
          </pre>
        )}
      </Card>
    </div>
  )
}
