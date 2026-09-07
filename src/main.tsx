import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { ensureSeeded } from './db/seed'
import './index.css'

function Root() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ensureSeeded()
      .then(() => setReady(true))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '초기화 실패'))
  }, [])

  if (error) {
    return (
      <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
        <h1>한사코치</h1>
        <p role="alert">{error}</p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div style={{ padding: 24, fontFamily: 'sans-serif', color: '#5c635e' }}>
        학습 공간을 준비하는 중…
      </div>
    )
  }

  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
