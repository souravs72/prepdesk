import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import { TodayPage } from './features/today/TodayPage'
import { PracticePage } from './features/practice/PracticePage'
import { PlaygroundPage } from './features/playground/PlaygroundPage'
import { MockPage } from './features/mock/MockPage'
import { AnalyticsPage } from './features/analytics/AnalyticsPage'
import { CoachPage } from './features/ai/CoachPage'
import { LockPage } from './features/lock/LockPage'

declare global {
  interface Window {
    prepdesk?: { isElectron?: boolean; shell?: string }
  }
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/lock" element={<LockPage />} />
      <Route element={<Shell />}>
        <Route index element={<TodayPage />} />
        <Route path="practice" element={<PracticePage />} />
        <Route path="playground" element={<PlaygroundPage />} />
        <Route path="mock" element={<MockPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="coach" element={<CoachPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  // Electron production loads dist via file:// — needs HashRouter.
  // Browser, Vite, and GTK WebKit lock use http://127.0.0.1:5173 with BrowserRouter.
  const useHash = typeof window !== 'undefined' && window.location.protocol === 'file:'
  const Router = useHash ? HashRouter : BrowserRouter
  return (
    <Router>
      <AppRoutes />
    </Router>
  )
}
