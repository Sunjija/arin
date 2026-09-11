import type { ScoreSummary, WeakArea } from '../../types'

export const NO_RECORD = '아직 기록 없음'

export const BANNED_PROGRESS_PHRASES = [
  '1급 안정권',
  '예상 시험 점수',
  '합격 확률',
  '오르는 중',
  '하락 중',
  '점점 좋아',
] as const

export type MetricCopy = {
  label: string
  value: string
  detail: string | null
}

export function formatPracticeAccuracy(summary: ScoreSummary): MetricCopy {
  if (summary.practiceAccuracy == null) {
    return { label: '연습 정답률', value: NO_RECORD, detail: null }
  }
  return {
    label: '연습 정답률',
    value: `${summary.practiceAccuracy}%`,
    detail: `연습 ${summary.practiceAttemptCount}회`,
  }
}

export function fullMockAverageUsedCount(summary: ScoreSummary): number {
  return Math.min(3, summary.eligibleFullMockCount)
}

export function formatFullMockAverage(summary: ScoreSummary): MetricCopy {
  if (summary.fullMockAverage == null) {
    return { label: '최근 실전 연습 평균', value: NO_RECORD, detail: null }
  }
  const used = fullMockAverageUsedCount(summary)
  return {
    label: '최근 실전 연습 평균',
    value: `${summary.fullMockAverage}점`,
    detail: `최근 실전 연습 ${used}회 평균`,
  }
}

export function formatConsecutiveGoal(summary: ScoreSummary): MetricCopy {
  return {
    label: '목표 점수 연속 달성',
    value: `${summary.consecutiveGoalHits}회`,
    detail: `목표 ${summary.goalScore}점`,
  }
}

export function measuredWeakAreas(areas: WeakArea[]): WeakArea[] {
  return areas.filter((area) => area.measured)
}

export function initialWeakAreas(areas: WeakArea[], limit = 3): WeakArea[] {
  return measuredWeakAreas(areas).slice(0, limit)
}

export function remainingWeakAreas(areas: WeakArea[], limit = 3): WeakArea[] {
  return measuredWeakAreas(areas).slice(limit)
}

export function mockModeLabel(mode: 'full' | 'sample'): string {
  return mode === 'full' ? '실전' : '샘플'
}
