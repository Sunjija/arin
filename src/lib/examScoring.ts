import type { Difficulty, Question } from '../types'

/**
 * 심화 정답표(77·78·79회) 배점 분포 참고값.
 * 문항수: 1점 10 / 2점 30 / 3점 10 → 점수 10 + 60 + 30 = 100
 */
export const ADVANCED_POINT_QUOTA = {
  1: 10,
  2: 30,
  3: 10,
} as const

export const ADVANCED_TOTAL_POINTS = 100
export const ADVANCED_QUESTION_COUNT = 50

/** difficulty = 배점 */
export function pointsForDifficulty(d: Difficulty): number {
  return d
}

export function scoreFromAnswers(
  items: Array<{ correct: boolean; difficulty: Difficulty }>,
): number {
  const earned = items.reduce(
    (sum, item) => sum + (item.correct ? pointsForDifficulty(item.difficulty) : 0),
    0,
  )
  const max = items.reduce((sum, item) => sum + pointsForDifficulty(item.difficulty), 0)
  if (max <= 0) return 0
  // 축소 모드도 100점 만점으로 환산
  return Math.round((earned / max) * 100)
}

/**
 * 모의고사 풀을 심화 배점 비율(2:6:2)에 가깝게 구성.
 * 문항이 부족하면 있는 범위에서 최대한 맞춘다.
 */
export function pickMockQuestions(
  pool: Question[],
  total: number,
): Question[] {
  const byDiff: Record<1 | 2 | 3, Question[]> = { 1: [], 2: [], 3: [] }
  for (const q of pool) {
    const band = (q.difficulty >= 3 ? 3 : q.difficulty <= 1 ? 1 : 2) as 1 | 2 | 3
    byDiff[band].push(q)
  }
  for (const d of [1, 2, 3] as const) {
    byDiff[d] = shuffle(byDiff[d])
  }

  const target1 = Math.round(total * 0.2)
  const target3 = Math.round(total * 0.2)
  const target2 = total - target1 - target3

  const picked: Question[] = []
  const take = (list: Question[], n: number) => {
    const slice = list.slice(0, n)
    picked.push(...slice)
    return slice.length
  }

  let need1 = target1 - take(byDiff[1], target1)
  let need2 = target2 - take(byDiff[2], target2)
  let need3 = target3 - take(byDiff[3], target3)

  const leftover = shuffle(
    pool.filter((q) => !picked.some((p) => p.id === q.id)),
  )
  for (const q of leftover) {
    if (picked.length >= total) break
    const band = (q.difficulty >= 3 ? 3 : q.difficulty <= 1 ? 1 : 2) as 1 | 2 | 3
    if (need1 > 0 && band === 1) {
      picked.push(q)
      need1 -= 1
      continue
    }
    if (need3 > 0 && band === 3) {
      picked.push(q)
      need3 -= 1
      continue
    }
    if (need2 > 0) {
      picked.push(q)
      need2 -= 1
      continue
    }
    picked.push(q)
  }

  // 은행이 부족하면 순환 보충해 50문항 구조를 맞춤 (축소 모드는 total이 작음)
  let i = 0
  while (picked.length < total && pool.length > 0) {
    picked.push(pool[i % pool.length]!)
    i += 1
  }

  return picked.slice(0, total)
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}
