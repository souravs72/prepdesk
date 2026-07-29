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
import { estimateCatalogueSize } from '../lib/generator'

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
      <aside className="glass flex w-[240px] shrink-0 flex-col border-r border-[var(--color-line)] p-4">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-accent)] text-[var(--color-canvas)]">
            <Command size={18} />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">Prepilo</div>
            <div className="text-[11px] text-[var(--color-muted)]">Interview OS</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition',
                  isActive
                    ? 'bg-[var(--color-elevated)] text-[var(--color-ink)] shadow-sm'
                    : 'text-[var(--color-muted)] hover:bg-[var(--color-elevated)]/60 hover:text-[var(--color-ink)]',
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 space-y-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-elevated)]/50 p-3 text-[11px] text-[var(--color-muted)]">
          <div className="flex items-center justify-between">
            <span>Runner</span>
            <span className={runnerOk ? 'text-[var(--color-ok)]' : 'text-[var(--color-warn)]'}>
              {runnerOk ? 'online' : 'offline'}
            </span>
          </div>
          <div>Catalogue space ~{estimateCatalogueSize().toLocaleString()}</div>
          <button
            type="button"
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-line)] px-2 py-1.5 text-[var(--color-ink)] hover:bg-[var(--color-panel)]"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
