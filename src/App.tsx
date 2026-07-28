import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import { TodayPage } from './features/today/TodayPage'
import { PracticePage } from './features/practice/PracticePage'
import { PlaygroundPage } from './features/playground/PlaygroundPage'
import { MockPage } from './features/mock/MockPage'
import { AnalyticsPage } from './features/analytics/AnalyticsPage'
import { CoachPage } from './features/ai/CoachPage'
import { LockPage } from './features/lock/LockPage'

export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  )
}
