import { useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { ErrorBoundary } from './components/ErrorBoundary'
import { FocusLayoutProvider } from './components/layout/FocusLayout'
import { ensureSeeded } from './db/seed'
import { HomePage } from './pages/HomePage'
import { StudySessionPage } from './pages/StudySessionPage'
import { CardsPage } from './pages/CardsPage'
import { ProgressPage } from './pages/ProgressPage'
import { MockExamPage } from './pages/MockExamPage'
import { SettingsPage } from './pages/SettingsPage'
import { LibraryPage } from './pages/LibraryPage'
import { BillingPage } from './pages/BillingPage'

function Bootstrap({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ensureSeeded()
      .then(() => {
        if (alive) setReady(true)
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : '초기화 실패')
      })
    return () => {
      alive = false
    }
  }, [])

  if (error) {
    return (
      <div className="surface p-5">
        <p role="alert">앱 초기화에 실패했습니다: {error}</p>
        <button type="button" className="btn btn-primary mt-4" onClick={() => window.location.reload()}>
          다시 시도
        </button>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="surface p-5 text-[var(--ink-muted)]" aria-live="polite">
        arin을 준비하는 중…
      </div>
    )
  }

  return children
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <FocusLayoutProvider>
          <AppShell>
            <Bootstrap>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/study" element={<StudySessionPage />} />
                <Route path="/cards" element={<CardsPage />} />
                <Route path="/timeline" element={<LibraryPage />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/wrong" element={<Navigate to="/cards" replace />} />
                <Route path="/progress" element={<ProgressPage />} />
                <Route path="/mock" element={<MockExamPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/billing" element={<BillingPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Bootstrap>
          </AppShell>
        </FocusLayoutProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
