/**
 * 예상 시험 점수 계산.
 *
 * 모의고사 최근 3회가 있으면 가중 평균 (최근일수록 가중 ↑: 3, 2, 1).
 * 없으면 일반 문제 최근 정답률로 임시 추정.
 */
export function estimateScoreFromMocks(scoresNewestFirst: number[]): number | null {
  if (scoresNewestFirst.length === 0) return null
  const recent = scoresNewestFirst.slice(0, 3)
  const weights = [3, 2, 1].slice(0, recent.length)
  const weightSum = weights.reduce((a, b) => a + b, 0)
  const weighted = recent.reduce((sum, score, i) => sum + score * (weights[i] ?? 0), 0)
  return Math.round(weighted / weightSum)
}

export function estimateScoreFromAccuracy(correct: number, total: number): number {
  if (total <= 0) return 40
  const rate = correct / total
  // 심화 1급 기준으로 정답률을 100점 척도에 완만히 매핑
  return Math.round(clamp(rate * 100, 20, 95))
}

/**
 * 최근 모의고사 점수(최신→과거)가 모두 임계값 이상이고
 * 연속 횟수가 목표 이상이면 안정권.
 */
export function isStableZone(
  scoresNewestFirst: number[],
  threshold = 85,
  requiredStreak = 3,
): boolean {
  if (scoresNewestFirst.length < requiredStreak) return false
  return scoresNewestFirst.slice(0, requiredStreak).every((s) => s >= threshold)
}

/** 현재 연속 85점+ 횟수 (최신부터) */
export function consecutiveAboveThreshold(
  scoresNewestFirst: number[],
  threshold = 85,
): number {
  let count = 0
  for (const score of scoresNewestFirst) {
    if (score < threshold) break
    count += 1
  }
  return count
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
