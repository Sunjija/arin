import type { ActiveSession, TodayPlan } from '../../types'

export const HOME_RECORD_EMPTY = '첫 학습 후 기록이 쌓여요'

export const BANNED_HOME_PHRASES = [
  '1급 안정권',
  '예상 시험 점수',
  '합격 확률',
  '예상 점수',
  '취약 고려',
] as const

export function isInProgressSession(
  session: Pick<ActiveSession, 'date' | 'step'> | null | undefined,
  today: string,
): boolean {
  return Boolean(session && session.date === today && session.step !== 'result')
}

export function todayEyebrow(week: number): string {
  return `계획 ${week}주차 · 오늘`
}

export function todayTitle(lessonTitle: string): string {
  return `오늘 학습: ${lessonTitle}`
}

export function todayReviewLine(reviewLabel: string): string {
  return `복습: ${reviewLabel}`
}

export function todayQuantityLine(input: {
  reviewCardCount: number
  questionCount: number
  estimatedMinutes: number
}): string {
  return `카드 ${input.reviewCardCount}장 · 개념 1개 · 문제 ${input.questionCount}개 · 약 ${input.estimatedMinutes}분`
}

export function homeRecordHint(plan: Pick<TodayPlan, 'scoreSummary'>): string | null {
  const { practiceAccuracy, fullMockAverage } = plan.scoreSummary
  if (practiceAccuracy == null && fullMockAverage == null) return HOME_RECORD_EMPTY
  return null
}

export type HomeCta = {
  label: string
  to: string
}

export type HomeViewModel = {
  eyebrow: string
  title: string
  reviewLine: string
  reviewHasEvidence: boolean
  quantityLine: string
  guidance: string | null
  primaryCta: HomeCta
  extraReviewCta: HomeCta | null
  recordHint: string | null
}

export function buildHomeViewModel(
  plan: TodayPlan,
  hasActiveSession: boolean,
): HomeViewModel {
  return {
    eyebrow: todayEyebrow(plan.week),
    title: todayTitle(plan.lesson.title),
    reviewLine: todayReviewLine(plan.reviewLabel),
    reviewHasEvidence: plan.reviewHasEvidence,
    quantityLine: todayQuantityLine({
      reviewCardCount: plan.reviewCardCount,
      questionCount: plan.questionCount,
      estimatedMinutes: plan.estimatedMinutes,
    }),
    guidance: plan.quantity.guidance,
    primaryCta: {
      label: hasActiveSession ? '이어서 학습' : '오늘 학습 시작',
      to: '/study',
    },
    extraReviewCta: plan.completion.todayDone
      ? { label: '추가 복습', to: '/cards' }
      : null,
    recordHint: homeRecordHint(plan),
  }
}

export function homeVisibleText(model: HomeViewModel): string {
  return [
    model.eyebrow,
    model.title,
    model.reviewLine,
    model.quantityLine,
    model.primaryCta.label,
    model.extraReviewCta?.label,
    model.guidance,
    model.recordHint,
  ]
    .filter(Boolean)
    .join('\n')
}
