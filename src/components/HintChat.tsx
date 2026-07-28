import { useState } from 'react'
import type { Question } from '../types/question'
import { Button, Card } from './ui'
import { MarkdownBody } from './MarkdownBody'

const API = 'http://127.0.0.1:4789'

type Msg = { role: 'user' | 'assistant'; content: string }

export function HintChat({ question }: { question: Question }) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content:
        'Stuck? Ask for a nudge. I’ll steer your thinking — I won’t give the final answer or full code.',
    },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  async function send() {
    const text = input.trim()
    if (!text || busy) return
    const next = [...messages, { role: 'user' as const, content: text }]
    setMessages(next)
    setInput('')
    setBusy(true)
    try {
      const res = await fetch(`${API}/hint-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          messages: next.filter((m) => m.role !== 'assistant' || next.indexOf(m) > 0),
          userMessage: text,
        }),
      })
      const data = await res.json()
      setMessages((m) => [...m, { role: 'assistant', content: data.reply || 'Try breaking the problem into smaller checks.' }])
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: 'Hint service offline — name the pattern you think applies, then what would be O(n) vs O(n²).',
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="space-y-3">
      <div className="text-sm font-medium">Hint chat</div>
      <p className="text-xs text-[var(--color-muted)]">
        Progressive hints only — no spoilers, no full solutions. Uses your daily-work-digest OpenAI key when available.
      </p>
      <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl bg-[var(--color-elevated)] p-3">
        {messages.map((m, i) => (
          <div
            key={`${i}-${m.role}`}
            className={`text-sm leading-relaxed ${
              m.role === 'assistant' ? 'text-[var(--color-muted)]' : 'text-[var(--color-ink)]'
            }`}
          >
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-accent)]">
              {m.role === 'assistant' ? 'coach' : 'you'}
            </span>
            <div className="mt-0.5">
              {m.role === 'assistant' ? <MarkdownBody content={m.content} /> : m.content}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void send()
          }}
          placeholder="e.g. I’m stuck on how to start…"
          className="min-w-0 flex-1 rounded-xl border border-[var(--color-line)] bg-[var(--color-elevated)] px-3 py-2 text-sm outline-none ring-[var(--color-accent)] focus:ring-1"
        />
        <Button disabled={busy || !input.trim()} onClick={() => void send()}>
          {busy ? '…' : 'Ask'}
        </Button>
      </div>
    </Card>
  )
}
