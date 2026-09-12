import type { ActiveSession, Concept, ConceptProgressRecord, LearningGoal } from '../types'
import { buildConceptSchedule } from './conceptSchedule'
import { answerDateKey, sessionExposureStats } from './questionStudyContext'

/** Display-only evidence from the single saved session, never reconstructed from attempts. */
export function savedSessionSummary(session?: ActiveSession | null) {
  if (!session) return { status: 'missing' as const }
  if (session.step !== 'result') return { status: 'in-progress' as const }
  const stats = sessionExposureStats(session)
  return {
    status: 'completed' as const,
    savedOn: answerDateKey(session.updatedAt),
    stats,
    total: stats.first.total + stats.repeated.total + stats.unknown.total,
  }
}

/** Uses the existing scheduling policy; no writes, proficiency scores, or inferred completion. */
export function progressSummary(input: {
  today: string
  goal: LearningGoal
  concepts: Concept[]
  progress: ConceptProgressRecord[]
  session?: ActiveSession | null
}) {
  return {
    schedule: buildConceptSchedule(input),
    session: savedSessionSummary(input.session),
  }
}
