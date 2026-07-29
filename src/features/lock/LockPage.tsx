import { useEffect, useRef, useState } from 'react'
import { QuestionPanel } from '../../components/QuestionPanel'
import { HintChat } from '../../components/HintChat'
import { Button } from '../../components/ui'
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
  return q.get('token') || sessionStorage.getItem('prepilo-lock-token') || ''
}

export function LockPage() {
  const getLockQuestion = useProgress((s) => s.getLockQuestion)
  const [question] = useState(() => getLockQuestion())
  const [token] = useState(() => readToken())
  const [gate] = useState(() => new URLSearchParams(window.location.search).get('gate') || 'login')
  const [bypass, setBypass] = useState('')
  const [bypassMsg, setBypassMsg] = useState('')
  const [unlockedMsg, setUnlockedMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [showBypass, setShowBypass] = useState(false)

  const gateTitle =
    gate === 'logout'
      ? 'Log out'
      : gate === 'reboot'
        ? 'Reboot'
        : gate === 'poweroff' || gate === 'shutdown'
          ? 'Shut down'
          : gate === 'suspend'
            ? 'Suspend'
            : 'Unlock'

  useEffect(() => {
    if (token) sessionStorage.setItem('prepilo-lock-token', token)
  }, [token])

  async function unlockSolved() {
    setErrorMsg('')
    const res = await fetch(`${API}/lock/unlock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Prepilo-Token': token,
      },
      body: JSON.stringify({ reason: 'solved', token }),
    })
    if (!res.ok) {
      setErrorMsg('Unlock failed. Relaunch lock.')
      return
    }
    await fetch(`${API}/retest/clear`, { method: 'POST' }).catch(() => {})
    setUnlockedMsg('Unlocked')
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
      setBypassMsg('Invalid key')
      return
    }
    await fetch(`${API}/retest/clear`, { method: 'POST' }).catch(() => {})
    setUnlockedMsg('Unlocked')
  }

  return (
    <div className="grid-bg min-h-full p-5 md:p-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <header>
          <h1 className="text-xl font-semibold tracking-tight">{gateTitle}</h1>
          {unlockedMsg && <p className="mt-1 text-sm text-[var(--color-ok)]">{unlockedMsg}</p>}
          {errorMsg && <p className="mt-1 text-sm text-[var(--color-danger)]">{errorMsg}</p>}
        </header>

        <QuestionPanel
          question={question}
          lockMode
          onDone={(ok) => {
            if (ok) void unlockSolved()
          }}
        />

        <HintChat question={question} compact />

        <div>
          {!showBypass ? (
            <button
              type="button"
              onClick={() => setShowBypass(true)}
              className="text-xs text-[var(--color-faint)] underline-offset-2 hover:text-[var(--color-muted)] hover:underline"
            >
              Bypass
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <NoPasteInput
                type="password"
                value={bypass}
                onChange={(e) => setBypass(e.target.value)}
                placeholder="Bypass key"
                className="min-w-[12rem] flex-1 rounded-xl border border-[var(--color-line)] bg-[var(--color-elevated)] px-3 py-2 font-mono text-sm outline-none ring-[var(--color-accent)] focus:ring-1"
              />
              <Button onClick={() => void tryBypass()}>Unlock</Button>
              {bypassMsg && <p className="w-full text-sm text-[var(--color-danger)]">{bypassMsg}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
