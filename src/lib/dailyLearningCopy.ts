import { formatMinutes } from './dates'
import type { FrozenDailyPlan, TodayView } from '../types/dailyLearning'
import type { EstimateKind } from '../types/dailyLearning'

export function compositionHeadline(plan: FrozenDailyPlan): string {
  const { newConcept, reviewDue, recentWeak, transfer } = plan.composition
  const review = reviewDue + recentWeak
  const parts: string[] = []
  if (newConcept > 0) parts.push(`새 개념 ${newConcept}개`)
  if (review > 0) parts.push(`복습 ${review}개`)
  if (transfer > 0) parts.push(`적용 ${transfer}개`)
  if (parts.length === 0) return '오늘은 이어서 확인할 자료가 조금 있습니다.'
  if (parts.length === 1) return `오늘은 ${parts[0]}를 공부해요.`
  if (parts.length === 2) return `오늘은 ${parts[0]}와 ${parts[1]}를 공부해요.`
  return `오늘은 ${parts[0]}, ${parts[1]}, ${parts[2]}를 공부해요.`
}

export function reasonLine(plan: FrozenDailyPlan): string {
  return plan.reasons[0] ?? '목표와 학습 이력을 기준으로 오늘 순서를 정해 두었습니다.'
}

export function timeLine(minutes: number, kind: EstimateKind): string {
  const label = formatMinutes(minutes)
  if (kind === 'calibrated') {
    return `최근 학습 기록 기준으로 약 ${label}입니다.`
  }
  return `약 ${label}로 보여요. 아직 추정입니다.`
}

export function nextReviewHint(earliestDue: string | null, today: string): string | null {
  if (!earliestDue) return null
  if (earliestDue <= today) return '다음에 앱을 열면 오늘 남겨 둔 복습부터 이어서 보여 줍니다.'
  const [, month, day] = earliestDue.split('-')
  return `다음 복습은 ${Number(month)}월 ${Number(day)}일에 다시 도래합니다.`
}

export function readinessNote(todayFullDone: boolean, hasApplied: boolean): string {
  if (hasApplied) {
    return '실전 적용은 검수된 새 자료 문항에서만 갱신합니다. 같은 문제 반복 정답은 숙달로 치지 않습니다.'
  }
  if (todayFullDone) {
    return '오늘 학습을 마쳤습니다. 짧은 퀴즈 완료만으로 실전 준비가 끝난 것은 아닙니다.'
  }
  return '학습 완료, 기억 상태, 실전 적용은 따로 표시합니다. 퀴즈만으로 합격 가능성을 말하지 않습니다.'
}

export function buildTodayCopy(input: {
  plan: FrozenDailyPlan
  onboardingCompleted: boolean
  sessionInProgress: boolean
  todayFullDone: boolean
  todayShortDone: boolean
  demoContent: boolean
  earliestFutureReview: string | null
  today: string
  hasApplied: boolean
}): Pick<
  TodayView,
  | 'headline'
  | 'reasonLine'
  | 'timeLine'
  | 'primaryAction'
  | 'primaryLabel'
  | 'shortReviewAvailable'
  | 'nextReviewHint'
  | 'readinessNote'
> {
  const shortReviewAvailable =
    !input.todayFullDone &&
    !input.sessionInProgress &&
    input.plan.composition.reviewDue + input.plan.composition.recentWeak > 0

  let primaryAction: TodayView['primaryAction'] = 'start'
  let primaryLabel = '오늘 학습 시작'
  if (!input.onboardingCompleted) {
    primaryAction = 'setup'
    primaryLabel = '목표 설정하기'
  } else if (input.sessionInProgress) {
    primaryAction = 'resume'
    primaryLabel = '이어서 공부하기'
  } else if (input.todayFullDone) {
    primaryAction = 'review-more'
    primaryLabel = '복습 기록 보기'
  }

  return {
    headline: compositionHeadline(input.plan),
    reasonLine: reasonLine(input.plan),
    timeLine: timeLine(input.plan.estimatedMinutes, input.plan.estimateKind),
    primaryAction,
    primaryLabel,
    shortReviewAvailable,
    nextReviewHint: nextReviewHint(input.earliestFutureReview, input.today),
    readinessNote: readinessNote(input.todayFullDone, input.hasApplied),
  }
}
