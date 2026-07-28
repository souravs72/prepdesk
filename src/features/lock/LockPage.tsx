import { useEffect, useRef, useState } from 'react'
import { QuestionPanel } from '../../components/QuestionPanel'
import { HintChat } from '../../components/HintChat'
import { Button, Card } from '../../components/ui'
import { useProgress } from '../../lib/progress/store'

const API = 'http://127.0.0.1:4789'

function NoPasteInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const block = (e: Event) => e.preventDefault()
    el.addEventListener('paste', block)
    el.addEventListener('drop', block)
    return () => {
      el.removeEventListener('paste', block)
      el.removeEventListener('drop', block)
    }
  }, [])
  return (
    <input
      {...props}
      ref={ref}
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && ['v', 'V', 'Insert'].includes(e.key)) e.preventDefault()
        if (e.shiftKey && e.key === 'Insert') e.preventDefault()
        props.onKeyDown?.(e)
      }}
    />
  )
}

function readToken(): string {
  const q = new URLSearchParams(window.location.search)
  return q.get('token') || sessionStorage.getItem('prepdesk-lock-token') || ''
}

export function LockPage() {
  const getLockQuestion = useProgress((s) => s.getLockQuestion)
  const [question] = useState(() => getLockQuestion())
  const [token] = useState(() => readToken())
  const [bypass, setBypass] = useState('')
  const [bypassMsg, setBypassMsg] = useState('')
  const [bypassLen, setBypassLen] = useState(0)
  const [unlockedMsg, setUnlockedMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (token) sessionStorage.setItem('prepdesk-lock-token', token)
    void fetch(`${API}/lock/bypass-meta`)
      .then((r) => r.json())
      .then((d) => setBypassLen(d.length ?? 0))
      .catch(() => {})
  }, [token])

  async function unlockSolved() {
    setErrorMsg('')
    const res = await fetch(`${API}/lock/unlock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Prepdesk-Token': token,
      },
      body: JSON.stringify({ reason: 'solved', token }),
    })
    if (!res.ok) {
      setErrorMsg('Unlock failed — open PrepDesk via prepdesk-lock (session token required).')
      return
    }
    await fetch(`${API}/retest/clear`, { method: 'POST' }).catch(() => {})
    setUnlockedMsg('Desktop unlocked. You can continue your session.')
  }

  async function tryBypass() {
    setBypassMsg('')
    setErrorMsg('')
    const res = await fetch(`${API}/lock/bypass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: bypass }),
    })
    if (!res.ok) {
      setBypassMsg('Bypass rejected — type the full key manually (paste is blocked).')
      return
    }
    await fetch(`${API}/retest/clear`, { method: 'POST' }).catch(() => {})
    setUnlockedMsg('Bypass accepted. Unlocking…')
  }

  return (
    <div className="grid-bg min-h-full p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
            Desktop lock
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Answer to unlock</h1>
          <p className="max-w-2xl text-[var(--color-muted)]">
            Shell disables Alt+Tab / overview / logout shortcuts while locked (restored on unlock).
            Power-button hard shutdown still works. Use hint chat if stuck — no full answers.
          </p>
          {!token && (
            <Card className="border-amber-500/40 text-[var(--color-warn)]">
              No lock session token. Launch with <code className="font-mono">prepdesk-lock</code> so
              unlock is authenticated.
            </Card>
          )}
          {unlockedMsg && (
            <Card className="border-emerald-500/40 bg-emerald-500/10 text-[var(--color-ok)]">
              {unlockedMsg}
            </Card>
          )}
          {errorMsg && (
            <Card className="border-rose-500/40 text-[var(--color-danger)]">{errorMsg}</Card>
          )}
        </header>

        <QuestionPanel
          question={question}
          lockMode
          onDone={(ok) => {
            if (ok) void unlockSolved()
          }}
        />

        <HintChat question={question} />

        <Card className="space-y-3">
          <div className="text-sm font-medium">Emergency bypass</div>
          <p className="text-xs text-[var(--color-muted)]">
            Type the {bypassLen || '73'}-character key from{' '}
            <code className="font-mono text-[var(--color-accent)]">~/.config/prepdesk/bypass.key</code>
            . Paste disabled. TTY: <code className="font-mono">prepdesk-show-bypass</code>
            {' '}· rotate: <code className="font-mono">prepdesk-rotate-bypass</code>.
          </p>
          <NoPasteInput
            type="password"
            value={bypass}
            onChange={(e) => setBypass(e.target.value)}
            placeholder="Type bypass key…"
            className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-elevated)] px-3 py-2 font-mono text-sm outline-none ring-[var(--color-accent)] focus:ring-1"
          />
          <Button onClick={() => void tryBypass()}>Unlock with bypass</Button>
          {bypassMsg && <p className="text-sm text-[var(--color-danger)]">{bypassMsg}</p>}
        </Card>
      </div>
    </div>
  )
}
