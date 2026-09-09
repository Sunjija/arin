import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, InlineStatus } from '../components/ui'
import { db } from '../db/database'
import { ensureSeeded } from '../db/seed'
import { buildHomeViewModel, isInProgressSession } from '../components/dashboard/todayCopy'
import { buildTodayPlan, type TodayPlan } from '../lib/studyService'
import { ChapterArtwork, ArrowIcon } from '../components/DesignArtwork'
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

  const ongoing = isInProgressSession(session, plan.date)
  const done = plan.completion.todayDone
  const stepIndex = done ? 3 : ongoing ? ['cards', 'concept', 'quiz', 'result'].indexOf(session!.step) : plan.reviewCardCount ? 0 : 1
  const steps = [
    ['기억 깨우기', `복습 카드 ${ongoing ? session!.cardIds.length : plan.reviewCardCount}장`],
    ['개념 연결하기', plan.lesson.title],
    ['문제로 확인하기', `핵심 문제 ${ongoing ? session!.questionIds.length : plan.questionCount}개`],
  ]
  return (
    <div className="today-page">
      <PageHeader title="오늘도, 한 시대 더."><p>흐름을 이해하면 기억은 오래갑니다.</p></PageHeader>
      <div className="today-layout">
        <section className="today-feature">
          <article className="chapter-hero">
            <p className="chapter-kicker">CHAPTER {plan.lesson.id.replace('lesson-', '')}</p>
            <h2>{plan.lesson.era === 'prehistoric' ? <>나라의 시작을<br />만나다</> : plan.lesson.title}</h2>
            <p className="chapter-subtitle">{plan.lesson.title}</p>
            <span className="pill blue">{done ? '학습 완료' : ongoing ? '학습 중' : `${plan.week}주차 학습`}</span>
            <ChapterArtwork era={plan.lesson.era} />
          </article>
          <Link to={model.primaryCta.to} className="btn btn-primary hero-cta" data-testid="home-primary-cta">
            {model.primaryCta.label}<ArrowIcon />
          </Link>
          <p className="quantity-line">{model.quantityLine}</p>
          {model.extraReviewCta && <Link to={model.extraReviewCta.to} className="btn btn-secondary w-full">{model.extraReviewCta.label}</Link>}
        </section>
        <section className="today-sequence">
          <div className="section-heading"><h2>오늘의 순서</h2><span>{Math.min(stepIndex, 3)} / 3 완료</span></div>
          <ol className="learning-sequence">
            {steps.map(([title, detail], i) => <li key={title} className={i < stepIndex ? 'done' : i === stepIndex ? 'current' : ''}>
              <span className="sequence-number">{i < stepIndex ? '✓' : i + 1}</span>
              <div><h3>{title}</h3><p>{detail}</p></div>
              {i < stepIndex ? <span className="sequence-status">완료</span> : i === stepIndex ? <Link className="pill blue touch-target" to="/study">{ongoing ? '이어하기' : '시작하기'}</Link> : <span aria-hidden="true">›</span>}
            </li>)}
          </ol>
          {model.guidance && <InlineStatus tone="neutral">{model.guidance}</InlineStatus>}
          {model.recordHint && <p className="meta-text mt-6">{model.recordHint}</p>}
        </section>
      </div>
    </div>
  )
}
