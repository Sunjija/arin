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
  const schedule = plan.frozenPlan?.conceptSchedule
  const newConceptCount = ongoing && session?.conceptIds === undefined ? undefined : plan.frozenPlan?.newConceptCount
  const canStart = ongoing || (newConceptCount ?? 1) > 0
  const stepIndex = done ? 3 : ongoing ? ['concept', 'quiz', 'cards', 'result'].indexOf(session!.step) : 0
  const completedSteps = [
    done || (ongoing ? session!.conceptDone : plan.completion.conceptDone),
    done || (ongoing ? session!.questionIds.length > 0 && session!.questionIds.every(id => session!.answered.some(answer => answer.questionId === id)) : plan.questionCount > 0 && plan.completion.questionsAnswered >= plan.questionCount),
    done || (ongoing ? session!.cardIds.length > 0 && session!.cardIndex >= session!.cardIds.length : plan.reviewCardCount > 0 && plan.completion.cardsReviewed >= plan.reviewCardCount),
  ]
  const steps = [
    ['개념 연결하기', newConceptCount == null ? plan.lesson.title : `오늘 ${newConceptCount}개 · ${plan.lesson.title}`],
    ['문제로 확인하기', `핵심 문제 ${ongoing ? session!.questionIds.length : plan.questionCount}개`],
    ['누적 복습하기', `배운 범위의 카드 ${ongoing ? session!.cardIds.length : plan.reviewCardCount}장`],
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
            <span className="pill blue">{done ? '학습 완료' : ongoing ? '학습 중' : !canStart ? schedule?.isStudyDay === false ? '쉬는 날' : '다음 개념 준비 중' : `오늘 개념 ${newConceptCount ?? 1}개`}</span>
            <ChapterArtwork era={plan.lesson.era} />
          </article>
          <Link to={model.primaryCta.to} className="btn btn-primary hero-cta" data-testid="home-primary-cta">
            {model.primaryCta.label}<ArrowIcon />
          </Link>
          <p className="quantity-line">{model.quantityLine}</p>
          {model.extraReviewCta && <Link to={model.extraReviewCta.to} className="btn btn-secondary w-full">{model.extraReviewCta.label}</Link>}
        </section>
        <section className="today-sequence">
          {schedule && <div className="mb-6 space-y-2">
            <p className="meta-text">개념 1회독 목표 · {schedule.targetDate}</p>
            <h2 className="section-title">{schedule.completedConcepts} / {schedule.totalConcepts}개 확인</h2>
            <p className="text-sm">학습일 {schedule.studyDaysLeft}일 남음 · {schedule.recommendedPerDay == null ? '목표일을 조정해 주세요' : `권장 하루 ${schedule.recommendedPerDay}개`}</p>
            <p className="meta-text">{schedule.unavailableConcepts > 0 ? `상세 설명 ${schedule.unavailableConcepts}개 준비 중 · 전체 완주일은 아직 확정할 수 없어요.` : `예상 완주일 ${schedule.allContentReadyFinishDate}`}</p>
            <Link className="inline-flex min-h-11 items-center text-sm underline" to="/settings">목표와 공부할 요일 변경</Link>
          </div>}
          <div className="section-heading"><h2>오늘의 순서</h2><span>{completedSteps.filter(Boolean).length} / 3 완료</span></div>
          <ol className="learning-sequence">
            {steps.map(([title, detail], i) => <li key={title} className={completedSteps[i] ? 'done' : i === stepIndex ? 'current' : ''}>
              <span className="sequence-number">{completedSteps[i] ? '✓' : i + 1}</span>
              <div><h3>{title}</h3><p>{detail}</p></div>
              {completedSteps[i] ? <span className="sequence-status">완료</span> : i === stepIndex && canStart ? <Link className="pill blue touch-target" to="/study">{ongoing ? '이어하기' : '시작하기'}</Link> : <span aria-hidden="true">›</span>}
            </li>)}
          </ol>
          {ongoing && session?.conceptIds === undefined && <p className="meta-text mb-3">진행 중인 학습을 마치면 새 목표에 맞춘 개념 분량으로 이어집니다.</p>}
          {model.guidance && <InlineStatus tone="neutral">{model.guidance}</InlineStatus>}
          {!canStart && plan.planWarnings?.map(message => <p className="meta-text mt-3" key={message}>{message}</p>)}
          {model.recordHint && <p className="meta-text mt-6">{model.recordHint}</p>}
        </section>
      </div>
    </div>
  )
}
