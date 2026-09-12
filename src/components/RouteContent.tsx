import { Component, Suspense, type ReactNode } from 'react'

export function RouteLoadingFallback() {
  return (
    <div className="surface p-5 text-[var(--ink-muted)]" aria-live="polite">
      화면을 불러오는 중…
    </div>
  )
}

type BoundaryProps = { children: ReactNode }
type BoundaryState = { error: Error | null }

/**
 * Catches failed lazy route imports (e.g. stale deployment chunks).
 * Retry reloads the page so React.lazy can fetch again; remount alone would reuse the rejected promise.
 */
export class RouteLoadErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error }
  }

  private handleRetry = () => {
    window.location.reload()
  }

  render() {
    if (this.state.error) {
      return (
        <div className="surface p-5">
          <h1 className="font-display text-2xl">화면을 불러오지 못했습니다</h1>
          <p className="mt-2 text-[var(--ink-muted)]" role="alert">
            일시적인 오류이거나 새 버전이 배포됐을 수 있습니다. 다시 시도해 주세요.
          </p>
          <button type="button" className="btn btn-primary mt-4" onClick={this.handleRetry}>
            다시 시도
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export function RouteContent({ children }: { children: ReactNode }) {
  return (
    <RouteLoadErrorBoundary>
      <Suspense fallback={<RouteLoadingFallback />}>{children}</Suspense>
    </RouteLoadErrorBoundary>
  )
}
