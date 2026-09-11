import type { AttemptRecord, MockExamResult } from '../types'
import type {
  FullMockIneligibilityReason,
  RecentMockSummary,
  ScoreSummary,
} from '../types/contracts'

const PADDED_ID = /__pad\d+$/
const FULL_UNIQUE_REQUIRED = 50

export function originalQuestionId(questionId: string): string {
  return questionId.replace(PADDED_ID, '')
}

export function isPaddedQuestionId(questionId: string): boolean {
  return PADDED_ID.test(questionId)
}

export function evaluateFullMockEligibility(
  result: MockExamResult,
): { eligible: true } | { eligible: false; reason: FullMockIneligibilityReason } {
  if (result.mode !== 'full') {
    return { eligible: false, reason: 'sample-mode' }
  }
  if (!Number.isFinite(result.score) || result.score < 0 || result.score > 100) {
    return { eligible: false, reason: 'invalid-score' }
  }
  if (!Array.isArray(result.answers) || result.answers.length !== result.total) {
    return { eligible: false, reason: 'invalid-answers' }
  }

  const ids = result.answers.map((a) => a.questionId)
  if (ids.some((id) => isPaddedQuestionId(id))) {
    return { eligible: false, reason: 'padded-questions' }
  }

  const unique = new Set(ids.map(originalQuestionId))
  if (unique.size < FULL_UNIQUE_REQUIRED) {
    return { eligible: false, reason: 'insufficient-unique-questions' }
  }

  return { eligible: true }
}

export function summarizeRecentMocks(resultsNewestFirst: MockExamResult[]): RecentMockSummary[] {
  const seen = new Set<string>()
  const summaries: RecentMockSummary[] = []

  for (const result of resultsNewestFirst) {
    if (seen.has(result.id)) {
      summaries.push({
        id: result.id,
        createdAt: result.createdAt,
        mode: result.mode,
        score: result.score,
        total: result.total,
        eligibleForFullStats: false,
        ineligibilityReason: 'duplicate-id',
      })
      continue
    }
    seen.add(result.id)
    const eligibility = evaluateFullMockEligibility(result)
    summaries.push({
      id: result.id,
      createdAt: result.createdAt,
      mode: result.mode,
      score: result.score,
      total: result.total,
      eligibleForFullStats: eligibility.eligible,
      ineligibilityReason: eligibility.eligible ? undefined : eligibility.reason,
    })
  }

  return summaries
}

export function eligibleFullResultsNewestFirst(resultsNewestFirst: MockExamResult[]): MockExamResult[] {
  const seen = new Set<string>()
  const eligible: MockExamResult[] = []
  for (const result of resultsNewestFirst) {
    if (seen.has(result.id)) continue
    seen.add(result.id)
    if (evaluateFullMockEligibility(result).eligible) eligible.push(result)
  }
  return eligible
}

/** 적격 full 결과 최근 최대 3회의 동일 가중 산술평균. */
export function averageEligibleFullMocks(resultsNewestFirst: MockExamResult[]): number | null {
  const recent = eligibleFullResultsNewestFirst(resultsNewestFirst).slice(0, 3)
  if (recent.length === 0) return null
  const sum = recent.reduce((acc, item) => acc + item.score, 0)
  return Math.round(sum / recent.length)
}

export function consecutiveGoalHits(
  resultsNewestFirst: MockExamResult[],
  goalScore: number,
): number {
  const eligible = eligibleFullResultsNewestFirst(resultsNewestFirst)
  let count = 0
  for (const result of eligible) {
    if (result.score < goalScore) break
    count += 1
  }
  return count
}

export function practiceAccuracyFromAttempts(
  attempts: AttemptRecord[],
): { accuracy: number | null; count: number } {
  const practice = attempts.filter((a) => a.source === 'practice')
  if (practice.length === 0) return { accuracy: null, count: 0 }
  const correct = practice.filter((a) => a.correct).length
  return {
    accuracy: Math.round((correct / practice.length) * 100),
    count: practice.length,
  }
}

export function buildScoreSummary(input: {
  attempts: AttemptRecord[]
  mockResultsNewestFirst: MockExamResult[]
  goalScore: number
}): ScoreSummary {
  const practice = practiceAccuracyFromAttempts(input.attempts)
  const recentMocks = summarizeRecentMocks(input.mockResultsNewestFirst)
  const eligible = eligibleFullResultsNewestFirst(input.mockResultsNewestFirst)

  return {
    practiceAccuracy: practice.accuracy,
    practiceAttemptCount: practice.count,
    fullMockAverage: averageEligibleFullMocks(input.mockResultsNewestFirst),
    eligibleFullMockCount: eligible.length,
    consecutiveGoalHits: consecutiveGoalHits(input.mockResultsNewestFirst, input.goalScore),
    goalScore: input.goalScore,
    recentMocks,
  }
}
