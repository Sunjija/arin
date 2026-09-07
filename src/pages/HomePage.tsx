import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { buildTodayPlan, type TodayPlan } from '../lib/studyService'
import { formatMinutes } from '../lib/dates'

export function HomePage() {
  const [plan, setPlan] = useState<TodayPlan | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { ensureSeeded } = await import('../db/seed')
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
    <div className="space-y-5">
      <section className="surface overflow-hidden p-5 sm:p-7">
        <p className="font-display text-3xl leading-tight text-[var(--accent)] sm:text-4xl">한사코치</p>
        <h1 className="font-display mt-3 text-2xl leading-snug sm:text-[1.75rem]">{plan.focusLine}</h1>
        <p className="mt-3 text-[var(--ink-muted)]">{plan.summaryLine}</p>
        <p className="mt-1 text-[var(--ink-muted)]">{plan.timeLine}</p>
        <Link
          to="/study"
          className="btn btn-primary mt-6 w-full text-base sm:w-auto sm:min-w-[220px]"
          aria-label="오늘 학습 시작"
        >
          {plan.todayDone ? '이어서 복습하기' : '오늘 학습 시작'}
        </Link>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Stat label="예상 학습 시간" value={formatMinutes(plan.estimatedMinutes)} />
        <Stat label="복습 카드" value={`${plan.reviewCardCount}장`} />
        <Stat label="오늘 범위" value={plan.lesson.title} />
        <Stat label="맞춤 문제" value={`${plan.questionCount}문항`} />
        <Stat
          label="현재 예상 점수"
          value={`${plan.estimatedScore}점${plan.scoreIsEstimate ? ' (추정)' : ''}`}
        />
        <Stat label="1급 안정권까지" value={`${plan.remainingToGoal}점`} />
        <Stat label="연속 학습" value={`${plan.streak}일`} />
        <Stat label="진행 주차" value={`${plan.planWeeks}주 중 ${plan.week}주차`} />
      </section>

      <section className="surface p-5">
        <h2 className="font-display text-xl">가장 취약한 영역</h2>
        <ul className="mt-3 space-y-2">
          {plan.weakAreas.map((area) => (
            <li key={area} className="flex items-center gap-2 text-[var(--ink)]">
              <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--accent)]" />
              {area}
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-sm">
            <span>오늘 완료율</span>
            <span>{plan.completionRate}%</span>
          </div>
          <div className="meter" role="meter" aria-valuenow={plan.completionRate} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${plan.completionRate}%` }} />
          </div>
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface p-4">
      <p className="text-sm text-[var(--ink-muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}
