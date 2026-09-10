import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { applyClockFromSearch } from '../lib/clock'
import { ensureSeeded } from '../db/seed'
import { getTodayView } from '../lib/dailyLearningService'
import type { TodayView } from '../types/dailyLearning'

export function HomePage() {
  const location = useLocation()
  const [view, setView] = useState<TodayView | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    applyClockFromSearch(location.search)
    let alive = true
    ;(async () => {
      try {
        await ensureSeeded()
        const next = await getTodayView()
        if (alive) setView(next)
      } catch (e: unknown) {
        if (alive) setError(e instanceof Error ? e.message : '불러오기 실패')
      }
    })()
    return () => {
      alive = false
    }
  }, [location.search])

  if (error) {
    return (
      <div className="surface p-5">
        <p role="alert">{error}</p>
      </div>
    )
  }

  if (!view) {
    return (
      <div className="surface p-5 text-[var(--ink-muted)]" aria-live="polite">
        오늘의 학습을 준비하는 중…
      </div>
    )
  }

  const startTo =
    view.primaryAction === 'setup'
      ? '/setup'
      : view.primaryAction === 'review-more'
        ? '/cards'
        : '/study'

  return (
    <div className="space-y-6">
      <header className="page-header">
        <p className="eyebrow">오늘 학습</p>
        <h1 className="page-title">{view.headline}</h1>
        <p className="mt-2 text-[var(--ink-muted)]">{view.reasonLine}</p>
      </header>

      {view.demoContent ? (
        <p className="surface p-4 text-sm text-[var(--ink-muted)]" role="note">
          지금 보이는 카드·문항은 샘플 학습 콘텐츠입니다. 실제 사용자 기록이나 운영 통계와 섞이지 않습니다.
        </p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]">
        <article className="surface p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">오늘 구성</p>
              <h2 className="mt-1 text-xl font-bold tracking-[-0.025em]">
                새 개념 {view.plan.composition.newConcept} · 복습{' '}
                {view.plan.composition.reviewDue + view.plan.composition.recentWeak} · 적용{' '}
                {view.plan.composition.transfer}
              </h2>
            </div>
            <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-bold text-[var(--accent)]">
              {view.timeLine}
            </span>
          </div>

          <ul className="mt-5 space-y-2">
            {view.plan.items.slice(0, 6).map((item) => (
              <li key={item.id} className="rounded-xl border border-[var(--line)] p-3">
                <p className="text-sm font-semibold">{item.conceptTitle}</p>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">{item.reason}</p>
                {item.sourceNote === 'reuse' ? (
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">기존 문항 재복습</p>
                ) : null}
                {item.sourceNote === 'not-ready' ? (
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">적용 평가 준비되지 않음</p>
                ) : null}
              </li>
            ))}
          </ul>

          <Link
            to={startTo}
            className="btn btn-primary mt-5 w-full text-base sm:w-auto sm:min-w-[220px]"
            aria-label={view.primaryLabel}
          >
            {view.primaryLabel}
          </Link>
          {view.shortReviewAvailable ? (
            <Link to="/study?mode=short-review" className="btn btn-secondary mt-3 w-full sm:ml-2 sm:w-auto">
              짧게 복습하기
            </Link>
          ) : null}
          {view.todayShortDone && !view.todayFullDone ? (
            <p className="mt-3 text-sm text-[var(--ink-muted)]">
              짧은 복습은 마쳤습니다. 오늘의 전체 학습은 아직 남아 있습니다.
            </p>
          ) : null}
        </article>

        <aside className="surface p-5 sm:p-6">
          <p className="metric-label">안내</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">{view.readinessNote}</p>
          {view.plan.examPressure ? (
            <p className="mt-4 border-t border-[var(--line)] pt-4 text-sm leading-relaxed">
              {view.plan.examPressure.message}
            </p>
          ) : null}
          {view.nextReviewHint ? (
            <p className="mt-4 text-sm text-[var(--ink-muted)]">{view.nextReviewHint}</p>
          ) : null}
          {!view.onboardingCompleted ? (
            <Link to="/setup" className="btn btn-secondary mt-4 w-full">
              목표·응시일 설정
            </Link>
          ) : (
            <Link to="/settings" className="btn btn-ghost mt-4 w-full">
              목표 수정
            </Link>
          )}
        </aside>
      </section>

      {view.plan.warnings.length > 0 || view.plan.contentNotes.length > 0 ? (
        <section className="surface p-5 sm:p-6">
          <h2 className="section-title">오늘 구성의 한계</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--ink-muted)]">
            {[...view.plan.warnings, ...view.plan.contentNotes].map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
