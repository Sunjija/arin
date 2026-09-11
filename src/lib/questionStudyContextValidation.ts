import type { QuestionStudyContext } from '../types'
import { addDays, isDateKey } from './dates'
import { LEARNING_POLICY } from './learningPolicy'
import { answerDateKey } from './questionStudyContext'

/** Optional metadata is all-or-nothing for the frozen question list. */
export function validQuestionContexts(value: unknown, questionIds: unknown, newIds: unknown, reviewIds: unknown): value is QuestionStudyContext[] {
  if (!Array.isArray(value) || !Array.isArray(questionIds) || !questionIds.every(id => typeof id === 'string') || value.length !== questionIds.length) return false
  if (!Array.isArray(newIds) || !Array.isArray(reviewIds)) return false
  const seen = new Set<string>()
  for (const row of value) {
    if (!row || typeof row !== 'object' || Array.isArray(row) || typeof row.questionId !== 'string' || !questionIds.includes(row.questionId) || seen.has(row.questionId)) return false
    seen.add(row.questionId)
    if (!['new-concept', 'lesson-practice', 'due-review', 'recent-wrong', 'review-practice'].includes(row.reason) || !isDateKey(row.selectedOn)) return false
    const scope = row.reason === 'new-concept' || row.reason === 'lesson-practice' ? newIds : reviewIds
    if (!scope.includes(row.questionId)) return false
    if (!Number.isSafeInteger(row.priorAttemptCount) || row.priorAttemptCount < 0 || row.similarQuestionAttemptCount !== null && (!Number.isSafeInteger(row.similarQuestionAttemptCount) || row.similarQuestionAttemptCount < 0)) return false
    if (row.reason === 'due-review') {
      if (!isDateKey(row.dueOn) || row.dueOn > row.selectedOn) return false
    } else if (row.dueOn !== null) return false
    if (row.reason === 'recent-wrong') {
      if (typeof row.lastWrongAt !== 'string' || !Number.isFinite(Date.parse(row.lastWrongAt)) || !isDateKey(row.lastWrongAt.slice(0, 10))) return false
      const date = answerDateKey(row.lastWrongAt)
      if (!date || date > row.selectedOn || date < addDays(row.selectedOn, 1 - LEARNING_POLICY.recentWrongDays) || row.priorAttemptCount < 1) return false
    } else if (row.lastWrongAt !== null) return false
  }
  return true
}
