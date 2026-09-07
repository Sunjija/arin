import type { CardRating } from '../types'

export interface ReviewState {
  intervalDays: number
  easeStreak: number
}

export interface NextReviewResult extends ReviewState {
  nextIntervalDays: number
}

const BASE_INTERVAL: Record<CardRating, number> = {
  again: 1,
  hard: 3,
  good: 7,
  easy: 14,
}

const MAX_INTERVAL = 60

/**
 * 암기카드 다음 복습 간격 계산.
 *
 * - 기본 간격: 모름 1일 / 헷갈림 3일 / 맞음 7일 / 너무 쉬움 14일
 * - 맞음·너무 쉬움을 연속으로 받으면 이전 간격의 약 2배
 * - 모름·헷갈림이면 연속 배율 리셋
 * - 최대 60일
 */
export function calculateNextInterval(
  rating: CardRating,
  previous: ReviewState,
): NextReviewResult {
  if (rating === 'again' || rating === 'hard') {
    return {
      intervalDays: BASE_INTERVAL[rating],
      easeStreak: 0,
      nextIntervalDays: BASE_INTERVAL[rating],
    }
  }

  const streak = previous.easeStreak + 1
  const base = BASE_INTERVAL[rating]
  // 연속으로 맞히면 이전 간격 × 약 2 (첫 성공은 기본 간격 유지)
  const doubled =
    streak >= 2 && previous.intervalDays > 0
      ? Math.round(previous.intervalDays * 2)
      : base
  const nextIntervalDays = Math.min(Math.max(doubled, base), MAX_INTERVAL)

  return {
    intervalDays: nextIntervalDays,
    easeStreak: streak,
    nextIntervalDays,
  }
}

export { MAX_INTERVAL, BASE_INTERVAL }
