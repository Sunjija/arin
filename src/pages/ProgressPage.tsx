import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MasteryBar } from '../components/MasteryBar'
import {
  formatConsecutiveGoal,
  formatFullMockAverage,
  formatPracticeAccuracy,
  initialWeakAreas,
  recentMockLine,
  remainingWeakAreas,
} from '../components/dashboard/progressCopy'
import { PageHeader } from '../components/ui'
import { getProgressSnapshot } from '../lib/studyService'
import { formatKoreanDate } from '../lib/dates'
import type { ProgressSnapshot } from '../types'

export function ProgressPage() {
  const [data, setData] = useState<ProgressSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void getProgressSnapshot()
      .then((snapshot) => {
        if (alive) setData(snapshot)
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : '불러오기 실패')
      })
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

  if (!data) {
    return <div className="surface p-5 text-[var(--ink-muted)]">기록을 불러오는 중…</div>
  }

  const summary = data.scoreSummary
  const practice = formatPracticeAccuracy(summary)
  const mockAverage = formatFullMockAverage(summary)
  const consecutive = formatConsecutiveGoal(summary)
  const weakOnScreen = initialWeakAreas(data.weakAreas)
  const weakRest = remainingWeakAreas(data.weakAreas)
  const recentMocks = summary.recentMocks.slice(0, 5)

  return (
    <div className="max-w-[720px] space-y-4">
      <PageHeader title="내 기록">
        <p className="mt-3">
          <Link to="/settings" className="btn btn-text">
            설정
          </Link>
        </p>
      </PageHeader>

      <section className="surface p-5">
        <h2 className="section-title">성적</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <MetricCard metric={practice} />
          <MetricCard metric={mockAverage} />
        </div>
        <div className="mt-3 rounded-xl border border-[var(--line)] p-4">
          <p className="meta-text">{consecutive.label}</p>
          <p className="mt-1 text-xl font-semibold tracking-[-0.03em]">
            {consecutive.value}
            <span className="ml-2 text-sm font-normal text-[var(--ink-muted)]">{consecutive.detail}</span>
          </p>
        </div>
      </section>

      <section className="surface p-5">
        <h2 className="section-title">취약 영역</h2>
        {weakOnScreen.length === 0 ? (
          <p className="mt-3 text-[var(--ink-muted)]">아직 기록 없음</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {weakOnScreen.map((area) => (
              <li key={`${area.kind}-${area.key}`}>
                <MasteryBar
                  label={area.label}
                  value={area.accuracy ?? 0}
                  detail={`${area.attemptCount}회`}
                />
              </li>
            ))}
          </ul>
        )}
        {weakRest.length > 0 ? (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--accent)]">
              측정된 영역 더 보기
            </summary>
            <ul className="mt-3 space-y-3">
              {weakRest.map((area) => (
                <li key={`${area.kind}-${area.key}`}>
                  <MasteryBar
                    label={area.label}
                    value={area.accuracy ?? 0}
                    detail={`${area.attemptCount}회`}
                  />
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>

      <section className="surface p-5">
        <h2 className="section-title">최근 실전 연습</h2>
        {recentMocks.length === 0 ? (
          <p className="mt-2 text-[var(--ink-muted)]">아직 기록 없음</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {recentMocks.map((mock) => (
              <li key={mock.id} className="flex justify-between gap-3 text-sm">
                <span>
                  {formatKoreanDate(mock.createdAt.slice(0, 10))} · {recentMockLine(mock)}
                </span>
                <span className="tabular-nums">{mock.score}점</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

function MetricCard({
  metric,
}: {
  metric: { label: string; value: string; detail: string | null }
}) {
  return (
    <div className="rounded-xl border border-[var(--line)] p-4">
      <p className="meta-text">{metric.label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-[-0.04em]">{metric.value}</p>
      {metric.detail ? <p className="mt-1 text-sm text-[var(--ink-muted)]">{metric.detail}</p> : null}
    </div>
  )
}
