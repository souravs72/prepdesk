import clsx from 'clsx'
import type { Difficulty } from '../types/question'

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'accent' | 'ok' | 'warn' | 'danger'
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide',
        tone === 'neutral' && 'bg-[var(--color-elevated)] text-[var(--color-muted)]',
        tone === 'accent' && 'bg-[var(--color-accent-dim)] text-[var(--color-accent)]',
        tone === 'ok' && 'bg-emerald-500/15 text-[var(--color-ok)]',
        tone === 'warn' && 'bg-amber-500/15 text-[var(--color-warn)]',
        tone === 'danger' && 'bg-rose-500/15 text-[var(--color-danger)]',
      )}
    >
      {children}
    </span>
  )
}

export function DiffBadge({ d }: { d: Difficulty }) {
  return (
    <Badge tone={d === 'easy' ? 'ok' : d === 'medium' ? 'warn' : 'danger'}>{d}</Badge>
  )
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={clsx('rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] p-5', className)}>
      {children}
    </div>
  )
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  className,
  type = 'button',
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'danger'
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition disabled:opacity-40',
        variant === 'primary' &&
          'bg-[var(--color-accent)] text-[#042f2e] hover:brightness-110',
        variant === 'ghost' &&
          'border border-[var(--color-line)] bg-transparent text-[var(--color-ink)] hover:bg-[var(--color-elevated)]',
        variant === 'danger' && 'bg-[var(--color-danger)]/20 text-[var(--color-danger)]',
        className,
      )}
    >
      {children}
    </button>
  )
}
