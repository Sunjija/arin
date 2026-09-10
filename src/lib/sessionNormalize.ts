import { MAX_DAILY_CARDS } from './studyLimits'
import { nowIso } from './clock'
import type { ActiveSession } from '../types'

export function normalizeResumedSession(session: ActiveSession): ActiveSession {
  let normalized = session

  if (session.step === 'cards' && session.cardIds.length > MAX_DAILY_CARDS) {
    const remainingCardIds = session.cardIds.slice(
      session.cardIndex,
      session.cardIndex + MAX_DAILY_CARDS,
    )
    normalized = {
      ...normalized,
      step: remainingCardIds.length > 0 ? 'cards' : 'concept',
      cardIds: remainingCardIds,
      cardIndex: 0,
    }
  }

  if (
    normalized.step === 'quiz' &&
    (normalized.quizPhase === 'stem' ||
      normalized.quizPhase === 'era' ||
      normalized.quizPhase === 'clue')
  ) {
    normalized = {
      ...normalized,
      quizPhase: 'choices',
      revealedChoices: true,
    }
  }

  if (normalized !== session) {
    normalized.updatedAt = nowIso()
  }
  return normalized
}
