import { useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { ErrorBoundary } from './components/ErrorBoundary'
import { FocusLayoutProvider } from './components/layout/FocusLayout'
import { AppUrlListener } from './components/platform/AppUrlListener'
import { PlatformBootstrap } from './components/platform/PlatformBootstrap'
import { ensureSeeded } from './db/seed'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { HomePage } from './pages/HomePage'
import { StudySessionPage } from './pages/StudySessionPage'
import { CardsPage } from './pages/CardsPage'
import { ProgressPage } from './pages/ProgressPage'
import { MockExamPage } from './pages/MockExamPage'
import { SettingsPage } from './pages/SettingsPage'
import { LibraryPage } from './pages/LibraryPage'
import { runStorageProbe, type StorageProbeReport } from './platform/storageProbe'

declare global {
  interface Window {
    __arinStorageProbe?: StorageProbeReport
  }
}

function Bootstrap({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ensureSeeded()
      .then(async () => {
        try {
          const probe = await runStorageProbe()
          window.__arinStorageProbe = probe
        } catch {
          /* 프로브 실패가 앱 시작을 막지 않는다 */
        }
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
        <PlatformBootstrap>
          <AppUrlListener />
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
                  <Route path="/auth/callback" element={<AuthCallbackPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Bootstrap>
            </AppShell>
          </FocusLayoutProvider>
        </PlatformBootstrap>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
