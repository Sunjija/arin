import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, InlineStatus } from '../components/ui'
import { db } from '../db/database'
import { ensureSeeded } from '../db/seed'
import { buildHomeViewModel, isInProgressSession } from '../components/dashboard/todayCopy'
import { buildTodayPlan, type TodayPlan } from '../lib/studyService'
import type { ActiveSession } from '../types'

export function HomePage() {
  const [plan, setPlan] = useState<TodayPlan | null>(null)
  const [session, setSession] = useState<ActiveSession | undefined>()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        await ensureSeeded()
        const [nextPlan, active] = await Promise.all([
          buildTodayPlan(),
          db.activeSession.toCollection().first(),
        ])
        if (!alive) return
        setPlan(nextPlan)
        setSession(active)
      } catch (e: unknown) {
        if (alive) setError(e instanceof Error ? e.message : '불러오기 실패')
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  if (error) {
    return (
      <div className="surface p-5">
        <p role="alert">{error}</p>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="surface p-5 text-[var(--ink-muted)]" aria-live="polite">
        오늘의 학습을 준비하는 중…
      </div>
    )
  }

  const model = buildHomeViewModel(plan, isInProgressSession(session, plan.date))

  return (
    <div className="max-w-[720px] space-y-3">
      <PageHeader eyebrow={model.eyebrow} title={model.title} />

      <article className="surface surface-raised p-5">
        <p className="meta-text">{model.reviewLine}</p>
        <p className="mt-2 text-[var(--text-body)]">{model.quantityLine}</p>

        <Link
          to={model.primaryCta.to}
          className="btn btn-primary mt-4 w-full"
          data-testid="home-primary-cta"
        >
          {model.primaryCta.label}
        </Link>

        {model.extraReviewCta ? (
          <Link to={model.extraReviewCta.to} className="btn btn-secondary mt-2 w-full">
            {model.extraReviewCta.label}
          </Link>
        ) : null}

        {model.guidance ? (
          <div className="mt-3">
            <InlineStatus tone="neutral">{model.guidance}</InlineStatus>
          </div>
        ) : null}
      </article>

      {model.recordHint ? <p className="meta-text px-1">{model.recordHint}</p> : null}
    </div>
  )
}
