import type { EraId, QuestionType, WrongCause } from '../types'

export interface MasteryUpdateInput {
  current: number
  correct: boolean
  /** 응답 시간(ms). 느리면 숙련도 상승을 억제 */
  responseMs: number
  /** 며칠 전 시도인지 (0 = 오늘). 최근일수록 반영 비중 ↑ */
  daysAgo: number
  cause?: WrongCause
}

/**
 * 단일 영역 숙련도(0~100) 갱신.
 *
 * 반영 요소:
 * 1) 정답 여부 — 정답 +4~8, 오답 -6~12
 * 2) 최근성 — 오늘 시도는 100%, 7일 전은 약 50%
 * 3) 응답 시간 — 30초 초과 시 정답 보너스 감소
 * 4) 오답 원인 — 인물 혼동·순서 혼동은 추가 감점
 */
export function updateMasteryScore(input: MasteryUpdateInput): number {
  const recency = Math.max(0.4, 1 - input.daysAgo * 0.07)
  const slowPenalty = input.responseMs > 30_000 ? 0.6 : input.responseMs > 15_000 ? 0.85 : 1

  let delta: number
  if (input.correct) {
    delta = 6 * recency * slowPenalty
  } else {
    let miss = 8
    if (input.cause === 'confused-person' || input.cause === 'confused-order') {
      miss += 3
    } else if (input.cause === 'first-time') {
      miss -= 1
    }
    delta = -miss * recency
  }

  const next = input.current + delta
  return clamp(Math.round(next * 10) / 10, 0, 100)
}

export function masteryBand(score: number): 'concept' | 'focus' | 'mixed' | 'maintain' {
  if (score < 40) return 'concept'
  if (score < 70) return 'focus'
  if (score < 85) return 'mixed'
  return 'maintain'
}

export function weakestKeys<T extends string>(
  scores: Record<T, number>,
  count: number,
): T[] {
  return (Object.entries(scores) as [T, number][])
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
    .slice(0, count)
    .map(([key]) => key)
}

export function averageScore(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export function createInitialMastery(
  eraIds: EraId[],
  typeIds: QuestionType[],
  starter = 22,
): { eras: Record<EraId, number>; types: Record<QuestionType, number> } {
  const eras = Object.fromEntries(eraIds.map((id) => [id, starter])) as Record<EraId, number>
  const types = Object.fromEntries(typeIds.map((id) => [id, starter])) as Record<
    QuestionType,
    number
  >
  // 사용자 취약점 초기 가중: 연도·순서 / 왕·업적
  types.chronology = 15
  types['king-figure'] = 16
  eras.goryeo = 18
  eras['joseon-early'] = 18
  return { eras, types }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
