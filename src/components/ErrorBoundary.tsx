import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-shell">
          <div className="surface p-5">
            <h1 className="font-display text-2xl">화면을 불러오지 못했습니다</h1>
            <p className="mt-2 text-[var(--ink-muted)]" role="alert">
              {this.state.error.message}
            </p>
            <button
              type="button"
              className="btn btn-primary mt-4"
              onClick={() => window.location.assign('/')}
            >
              새로고침
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
