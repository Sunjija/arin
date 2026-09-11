import { originalQuestionId, isPaddedQuestionId } from './scoreSummary'
import type { QuestionSnapshot } from '../types'

export const SAMPLE_DURATION_MS = 16 * 60 * 1000
export const FULL_DURATION_MS = 80 * 60 * 1000
export const FULL_UNIQUE_REQUIRED = 50

export function uniqueOriginalQuestionCount(snapshots: QuestionSnapshot[]): number {
  return new Set(snapshots.map((item) => originalQuestionId(item.questionId))).size
}

export function inspectFullMockPool(snapshots: QuestionSnapshot[]): {
  ok: boolean
  uniqueCount: number
} {
  const uniqueCount = uniqueOriginalQuestionCount(snapshots)
  const padded = snapshots.some((item) => isPaddedQuestionId(item.questionId))
  const ok =
    snapshots.length === FULL_UNIQUE_REQUIRED &&
    uniqueCount === FULL_UNIQUE_REQUIRED &&
    !padded
  return { ok, uniqueCount }
}
