import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ensureSeeded } from '../db/seed'
import { buildTodayPlan, type TodayPlan } from '../lib/studyService'
import { formatMinutes } from '../lib/dates'

export function HomePage() {
  const [plan, setPlan] = useState<TodayPlan | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        await ensureSeeded()
        const p = await buildTodayPlan()
        if (alive) setPlan(p)
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

  return (
    <div className="space-y-6">
      <header className="page-header">
        <p className="eyebrow">
          계획 {plan.week}주차 · 오늘의 학습
        </p>
        <h1 className="page-title">{plan.focusLine}</h1>
        <p className="page-description">
          한 번에 많이 보기보다 카드, 개념, 문제 순서로 오늘 범위를 확실히 끝냅니다.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]">
        <article className="surface p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">오늘 범위</p>
              <h2 className="mt-1 text-xl font-bold tracking-[-0.025em]">{plan.lesson.title}</h2>
            </div>
            <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-bold text-[var(--accent)]">
              {plan.timeLine}
            </span>
          </div>

          <ol className="mt-5 grid gap-2 sm:grid-cols-3">
            <RoutineStep number="1" label="카드 복습" value={`${plan.reviewCardCount}장`} />
            <RoutineStep number="2" label="핵심 개념" value="요약 읽기" />
            <RoutineStep number="3" label="맞춤 문제" value={`${plan.questionCount}문항`} />
          </ol>

          <Link
            to="/study"
            className="btn btn-primary mt-5 w-full text-base sm:w-auto sm:min-w-[220px]"
            aria-label="오늘 학습 시작"
          >
            {plan.todayDone ? '이어서 복습하기' : '오늘 학습 시작'}
          </Link>
        </article>

        <aside className="surface p-5 sm:p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="metric-label">오늘 완료율</p>
              <p className="mt-1 text-4xl font-bold tracking-[-0.05em]">{plan.completionRate}%</p>
            </div>
            <p className="text-right text-sm text-[var(--ink-muted)]">
              예상 점수
              <strong className="mt-0.5 block text-lg text-[var(--ink)]">
                {plan.estimatedScore}점
              </strong>
            </p>
          </div>
          <div
            className="meter mt-4"
            role="meter"
            aria-label="오늘 학습 완료율"
            aria-valuenow={plan.completionRate}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${plan.completionRate}%` }} />
          </div>
          <p className="mt-4 border-t border-[var(--line)] pt-4 text-sm leading-relaxed text-[var(--ink-muted)]">
            목표 {plan.goalScore}점까지 <strong className="text-[var(--ink)]">{plan.remainingToGoal}점</strong>
            {plan.scoreIsEstimate ? ' · 현재 점수는 연습 기록 기반 추정치입니다.' : ''}
          </p>
        </aside>
      </section>

      <section>
        <h2 className="section-title">학습 현황</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="예상 학습 시간" value={formatMinutes(plan.estimatedMinutes)} />
          <Stat label="연속 학습" value={`${plan.streak}일`} />
          <Stat label="진행 주차" value={`${plan.planWeeks}주 중 ${plan.week}주차`} />
          <Stat label="맞춤 문제" value={`${plan.questionCount}문항`} />
        </div>
      </section>

      <section className="surface p-5 sm:p-6">
        <h2 className="section-title">집중할 영역</h2>
        {plan.streak === 0 && plan.completionRate === 0 ? (
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">
            첫 학습을 마치면 정답률과 오답 원인을 바탕으로 취약 영역을 보여드립니다.
          </p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {plan.weakAreas.map((area) => (
              <li
                key={area}
                className="rounded-full border border-[var(--line)] bg-[var(--bg)] px-3 py-1.5 text-sm"
              >
                {area}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
    </div>
  )
}

function RoutineStep({ number, label, value }: { number: string; label: string; value: string }) {
  return (
    <li className="rounded-xl border border-[var(--line)] p-3">
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">
          {number}
        </span>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <p className="mt-2 text-sm text-[var(--ink-muted)]">{value}</p>
    </li>
  )
}
