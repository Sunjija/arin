import type { AttemptRecord, EraId, QuestionType, WrongCause } from '../types'
import type { WeakArea } from '../types/contracts'
import { ALL_ERAS, ALL_TYPES, ERA_LABELS, TYPE_LABELS } from '../types'

export interface MasteryUpdateInput {
  current: number
  correct: boolean
  /** 응답 시간(ms). 측정 불가면 null이며 속도 보너스/불이익을 주지 않는다. */
  responseMs: number | null
  /** 며칠 전 시도인지 (0 = 오늘). 최근일수록 반영 비중 ↑ */
  daysAgo: number
  cause?: WrongCause
}

/**
 * 단일 영역 숙련도(0~100) 갱신 — 문항 선택용 내부 값.
 * 화면 진단에는 observedWeakAreas를 쓴다.
 */
export function updateMasteryScore(input: MasteryUpdateInput): number {
  const recency = Math.max(0.4, 1 - input.daysAgo * 0.07)
  void input.responseMs

  let delta: number
  if (input.correct) {
    delta = 6 * recency
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

/** 내부 선택용 중립 시작값. 사용자 진단처럼 특정 시대를 낮추지 않는다. */
export function createInitialMastery(
  eraIds: EraId[] = ALL_ERAS,
  typeIds: QuestionType[] = ALL_TYPES,
  starter = 50,
): { eras: Record<EraId, number>; types: Record<QuestionType, number> } {
  const eras = Object.fromEntries(eraIds.map((id) => [id, starter])) as Record<EraId, number>
  const types = Object.fromEntries(typeIds.map((id) => [id, starter])) as Record<
    QuestionType,
    number
  >
  return { eras, types }
}

export function observedWeakAreas(attempts: AttemptRecord[], minAttempts = 3): WeakArea[] {
  const eraStats = emptyStats(ALL_ERAS)
  const typeStats = emptyStats(ALL_TYPES)

  for (const attempt of attempts) {
    bump(eraStats, attempt.era, attempt.correct)
    for (const tag of attempt.tags) bump(typeStats, tag, attempt.correct)
  }

  const areas: WeakArea[] = [
    ...ALL_ERAS.map((key) => toWeakArea(key, 'era', ERA_LABELS[key], eraStats[key]!, minAttempts)),
    ...ALL_TYPES.map((key) =>
      toWeakArea(key, 'type', TYPE_LABELS[key], typeStats[key]!, minAttempts),
    ),
  ]

  return areas
    .filter((area) => area.measured)
    .sort((a, b) => (a.accuracy ?? 100) - (b.accuracy ?? 100) || a.label.localeCompare(b.label))
}

function emptyStats<T extends string>(keys: T[]): Record<T, { correct: number; total: number }> {
  return Object.fromEntries(keys.map((key) => [key, { correct: 0, total: 0 }])) as Record<
    T,
    { correct: number; total: number }
  >
}

function bump<T extends string>(
  stats: Record<T, { correct: number; total: number }>,
  key: T,
  correct: boolean,
) {
  const row = stats[key]
  if (!row) return
  row.total += 1
  if (correct) row.correct += 1
}

function toWeakArea(
  key: EraId | QuestionType,
  kind: 'era' | 'type',
  label: string,
  stats: { correct: number; total: number },
  minAttempts: number,
): WeakArea {
  const measured = stats.total >= minAttempts
  return {
    key,
    kind,
    label,
    attemptCount: stats.total,
    accuracy: stats.total === 0 ? null : Math.round((stats.correct / stats.total) * 100),
    measured,
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
