import { NavLink, Outlet } from 'react-router-dom'
import {
  BookOpenCheck,
  BrainCircuit,
  ChartNoAxesCombined,
  Code2,
  Command,
  Moon,
  Sun,
  Swords,
  Timer,
} from 'lucide-react'
import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { useProgress } from '../lib/progress/store'
import { runnerHealth } from '../lib/runner'

const links = [
  { to: '/', label: 'Today', icon: Timer },
  { to: '/practice', label: 'Practice', icon: BookOpenCheck },
  { to: '/playground', label: 'Playground', icon: Code2 },
  { to: '/mock', label: 'Mock', icon: Swords },
  { to: '/analytics', label: 'Analytics', icon: ChartNoAxesCombined },
  { to: '/coach', label: 'Coach', icon: BrainCircuit },
]

export function Shell() {
  const theme = useProgress((s) => s.theme)
  const setTheme = useProgress((s) => s.setTheme)
  const [runnerOk, setRunnerOk] = useState(false)

  useEffect(() => {
    document.body.classList.toggle('light', theme === 'light')
  }, [theme])

  useEffect(() => {
    const tick = () => void runnerHealth().then(setRunnerOk)
    tick()
    const id = setInterval(tick, 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="grid-bg flex h-full min-h-0">
      <aside className="glass flex w-[200px] shrink-0 flex-col border-r border-[var(--color-line)] p-3">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent)] text-[var(--color-canvas)]">
            <Command size={16} />
          </div>
          <div className="text-sm font-semibold tracking-tight">Prepilo</div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition',
                  isActive
                    ? 'bg-[var(--color-elevated)] text-[var(--color-ink)] shadow-sm'
                    : 'text-[var(--color-muted)] hover:bg-[var(--color-elevated)]/60 hover:text-[var(--color-ink)]',
                )
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-[var(--color-muted)]">
          {!runnerOk && <span className="text-[var(--color-warn)]">Runner off</span>}
          <button
            type="button"
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] px-2 py-1.5 text-[var(--color-ink)] hover:bg-[var(--color-elevated)]"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </aside>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
