import { useState } from 'react'
import type { Question } from '../types/question'
import { Button, Card } from './ui'
import { MarkdownBody } from './MarkdownBody'

const API = 'http://127.0.0.1:4789'

type Msg = { role: 'user' | 'assistant'; content: string }

export function HintChat({ question, compact = false }: { question: Question; compact?: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(!compact)

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
          messages: next,
          userMessage: text,
        }),
      })
      const data = await res.json()
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: data.reply || 'Break into smaller checks.' },
      ])
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'Offline. Name the pattern; O(n) vs O(n²)?' },
      ])
    } finally {
      setBusy(false)
    }
  }

  if (compact && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-[var(--color-faint)] underline-offset-2 hover:text-[var(--color-muted)] hover:underline"
      >
        Hint
      </button>
    )
  }

  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Hint</div>
        {compact && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs text-[var(--color-faint)]"
          >
            Hide
          </button>
        )}
      </div>
      {messages.length > 0 && (
        <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg bg-[var(--color-elevated)] p-2.5">
          {messages.map((m, i) => (
            <div
              key={`${i}-${m.role}`}
              className={`text-sm leading-relaxed ${
                m.role === 'assistant' ? 'text-[var(--color-muted)]' : 'text-[var(--color-ink)]'
              }`}
            >
              {m.role === 'assistant' ? <MarkdownBody content={m.content} /> : m.content}
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void send()
          }}
          placeholder="Ask…"
          className="min-w-0 flex-1 rounded-xl border border-[var(--color-line)] bg-[var(--color-elevated)] px-3 py-2 text-sm outline-none ring-[var(--color-accent)] focus:ring-1"
        />
        <Button disabled={busy || !input.trim()} onClick={() => void send()}>
          {busy ? '…' : 'Ask'}
        </Button>
      </div>
    </Card>
  )
}
