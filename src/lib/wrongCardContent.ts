import { questions } from '../data/questions'
import type { Question, QuestionSnapshot } from '../types'

export function snapshotFromQuestion(question: Question): QuestionSnapshot {
  return {
    questionId: question.id,
    stem: question.stem,
    passage: question.passage,
    choices: [...question.choices],
    answerIndex: question.answerIndex,
    explanation: question.explanation,
    era: question.era,
    tags: [...question.tags],
    difficulty: question.difficulty,
    lessonId: question.lessonId,
    contentVersion: question.contentVersion,
    formatId: question.formatId,
    choiceOrder: question.choiceOrder,
    stimulusType: question.stimulusType,
    stimulus: question.stimulus ? JSON.parse(JSON.stringify(question.stimulus)) : undefined,
  }
}

export function resolveQuestionSource(input: {
  questionId: string
  snapshot?: QuestionSnapshot
}): QuestionSnapshot | null {
  if (input.snapshot && input.snapshot.questionId === input.questionId) {
    return input.snapshot
  }
  const live = questions.find((item) => item.id === input.questionId)
  return live ? snapshotFromQuestion(live) : null
}

export function buildWrongCardFront(source: Pick<QuestionSnapshot, 'stem' | 'passage'>): string {
  const stem = source.stem.trim()
  const passage = source.passage?.trim()
  if (passage) return `${passage}\n\n${stem}`
  return stem
}

export function buildWrongCardBack(
  source: Pick<QuestionSnapshot, 'choices' | 'answerIndex' | 'explanation'>,
): string {
  const answer = source.choices[source.answerIndex]?.trim() ?? ''
  const explanation = source.explanation.trim()
  return [answer, explanation].filter(Boolean).join('\n\n')
}
