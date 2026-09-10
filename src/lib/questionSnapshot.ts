import type { Question } from '../types'
import type { AttemptQuestionSnapshot } from '../types/dailyLearning'
import { nowIso } from './clock'

export function freezeAttemptSnapshot(
  question: Question,
  capturedAt = nowIso(),
): AttemptQuestionSnapshot {
  return {
    questionId: question.id,
    stem: question.stem,
    passage: question.passage,
    choices: [...question.choices],
    answerIndex: question.answerIndex,
    explanation: question.explanation,
    formatId: question.formatId,
    lessonId: question.lessonId,
    era: question.era,
    tags: [...question.tags],
    capturedAt,
  }
}

export function resolveAttemptQuestion(
  snapshot: AttemptQuestionSnapshot | undefined,
  live: Question | undefined,
): {
  stem: string
  passage?: string
  choices: string[]
  answerIndex: number
  explanation: string
  fromSnapshot: boolean
} | null {
  if (snapshot) {
    return {
      stem: snapshot.stem,
      passage: snapshot.passage,
      choices: snapshot.choices,
      answerIndex: snapshot.answerIndex,
      explanation: snapshot.explanation,
      fromSnapshot: true,
    }
  }
  if (!live) return null
  return {
    stem: live.stem,
    passage: live.passage,
    choices: live.choices,
    answerIndex: live.answerIndex,
    explanation: live.explanation,
    fromSnapshot: false,
  }
}

export function gradeAgainstSnapshot(
  selectedIndex: number | null,
  snapshot: AttemptQuestionSnapshot,
): boolean {
  return selectedIndex != null && selectedIndex === snapshot.answerIndex
}
