import type { LibraryPracticeSession } from '../types'
import { isDateKey } from './dates'
import { isQuestionSnapshot } from './questionSnapshot'

export function isLibraryPracticeSession(value: unknown): value is LibraryPracticeSession {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const row = value as LibraryPracticeSession
  const id = (v: unknown) => typeof v === 'string' && v.length > 0
  const iso = (v: unknown) => typeof v === 'string' && isDateKey(v.slice(0, 10)) && Number.isFinite(Date.parse(v))
  if (!id(row.id) || !id(row.lessonId) || !Number.isInteger(row.revision) || row.revision < 0 || !['question', 'feedback', 'result'].includes(row.step) || !iso(row.startedAt) || !iso(row.updatedAt)) return false
  if (!Array.isArray(row.questionSnapshots) || !row.questionSnapshots.length || !row.questionSnapshots.every(isQuestionSnapshot) || !row.questionSnapshots.every(q => q.lessonId === row.lessonId)) return false
  const snapshots = row.questionSnapshots
  if (new Set(snapshots.map(q => q.questionId)).size !== snapshots.length || !Number.isInteger(row.questionIndex) || row.questionIndex < 0 || row.questionIndex > snapshots.length || !Array.isArray(row.answers)) return false
  if (row.answers.some((answer, index) => {
    const snapshot = snapshots[index]
    return !snapshot || !answer || answer.questionId !== snapshot.questionId || !id(answer.attemptId) || !Number.isInteger(answer.selectedIndex) || answer.selectedIndex < 0 || answer.selectedIndex >= snapshot.choices.length || answer.correct !== (answer.selectedIndex === snapshot.answerIndex) || answer.responseMs !== null
  })) return false
  if (row.step === 'result') return row.questionIndex === snapshots.length && row.answers.length === snapshots.length && row.selectedIndex === null
  const current = snapshots[row.questionIndex]
  if (!current || row.selectedIndex !== null && (!Number.isInteger(row.selectedIndex) || row.selectedIndex < 0 || row.selectedIndex >= current.choices.length)) return false
  if (row.step === 'feedback') return row.answers.length === row.questionIndex + 1 && row.selectedIndex === row.answers[row.questionIndex]?.selectedIndex
  return row.answers.length === row.questionIndex
}
