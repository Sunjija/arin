import type { AttemptRecord } from '../types'
import type { AttemptOutcomeKind } from '../types/dailyLearning'

export interface OutcomeInput {
  correct: boolean
  previousAttemptCount: number
  sawExplanation?: boolean
  confidence?: 'sure' | 'unsure'
  source?: AttemptRecord['source']
}

export function classifyAttemptOutcome(input: OutcomeInput): AttemptOutcomeKind {
  if (input.source === 'diagnostic') return 'unscored'
  if (!input.correct) return 'incorrect'
  if (input.sawExplanation) return 'after-help-correct'
  if (input.confidence === 'unsure') return 'unsure-correct'
  if (input.previousAttemptCount > 0) return 'repeat-correct'
  return 'first-correct'
}

export function isTransferEvidence(kind: AttemptOutcomeKind | undefined): boolean {
  return kind === 'first-correct'
}

export function countsAsMasteryUpdate(kind: AttemptOutcomeKind): boolean {
  return kind !== 'unscored'
}
