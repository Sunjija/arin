import { describe, expect, it } from 'vitest'
import { defaultSettings } from '../data/defaults'
import { catalogConcepts } from './conceptCatalog'
import { emptyConceptProgress } from './conceptProgress'
import { toLearningGoal } from './settingsNormalize'
import { progressSummary, savedSessionSummary } from './progressSummary'
import type { ActiveSession } from '../types'

const goal = toLearningGoal({ ...defaultSettings(), startDate: '2026-09-11', conceptTargetDate: '2026-09-30' })
const input = { today: '2026-09-12', goal, concepts: catalogConcepts(), progress: [] }
const session: ActiveSession = {
  id: 'saved', date: '2026-09-11', step: 'result', lessonId: 'lesson-01', cardIds: [], cardIndex: 0,
  conceptDone: true, conceptMemo: '', questionIds: ['a', 'b', 'c'], questionIndex: 3,
  quizPhase: 'feedback', clueMemo: '', revealedChoices: true,
  startedAt: '2026-09-11T10:00:00+09:00', updatedAt: '2026-09-12T10:00:00+09:00',
  answered: ['a', 'b', 'c'].map(questionId => ({ questionId, correct: true, selectedIndex: 0, responseMs: null })),
  questionContexts: [0, 2].map((priorAttemptCount, i) => ({ questionId: ['a', 'b'][i], priorAttemptCount, reason: 'review-practice', selectedOn: '2026-09-11', dueOn: null, lastWrongAt: null, similarQuestionAttemptCount: null })),
}

describe('progress evidence summary', () => {
  it('counts completed catalog concepts only and preserves honest unprepared coverage', () => {
    const progress = [
      { ...emptyConceptProgress('t-pre-01'), learnState: 'completed' as const },
      { ...emptyConceptProgress('t-pre-02'), viewedAt: '2026-09-11' },
      { ...emptyConceptProgress('t-pre-03'), learnState: 'learning' as const },
      { ...emptyConceptProgress('outside-catalog'), learnState: 'completed' as const },
    ]
    const before = structuredClone(progress)
    const { schedule } = progressSummary({ ...input, progress })
    expect(schedule).toMatchObject({ totalConcepts: 88, completedConcepts: 1, remainingConcepts: 87, readyRemainingConcepts: 13, unavailableConcepts: 74, allContentReadyFinishDate: null })
    expect(progress).toEqual(before)
    expect(progressSummary(input).session).toEqual({ status: 'missing' })
    expect(progressSummary({ ...input, concepts: [] }).schedule.completedConcepts).toBe(0)
  })

  it('retains scheduler warnings for expired dates, rest days, and unavailable explanations', () => {
    const { schedule } = progressSummary({ ...input, goal: { ...goal, studyWeekdays: [1], examDateUndecided: false, examDate: '2026-09-10', conceptTargetDate: '2026-09-09' } })
    expect(schedule.warnings.join(' ')).toContain('시험일이 지났습니다')
    expect(schedule.warnings.join(' ')).toContain('오늘은 쉬는 날')
    expect(schedule.warnings.join(' ')).toContain('상세 설명이 준비되지 않은 개념이 74개')
    expect(schedule.studyDaysLeft).toBe(0)
    expect(progressSummary(input).schedule.targetDate).toBe('2026-09-30')
    expect(progressSummary(input).schedule.warnings.join(' ')).not.toContain('시험일이 지났습니다')
  })

  it('uses saved context and deduplicates answers for the completed session only', () => {
    const result = savedSessionSummary({ ...session, answered: [...session.answered, { ...session.answered[0], correct: false }] })
    expect(result).toMatchObject({ status: 'completed', total: 3, stats: { first: { correct: 0, total: 1 }, repeated: { correct: 1, total: 1 }, unknown: { correct: 1, total: 1 } } })
    expect(savedSessionSummary({ ...session, step: 'quiz' })).toEqual({ status: 'in-progress' })
  })

  it('leaves legacy context unknown and distinguishes card-only completion from no session', () => {
    expect(savedSessionSummary({ ...session, questionContexts: undefined })).toMatchObject({ stats: { first: { total: 0 }, repeated: { total: 0 }, unknown: { total: 3 } } })
    expect(savedSessionSummary({ ...session, answered: [], questionIds: [], cardIds: ['card'], updatedAt: 'invalid' })).toMatchObject({ status: 'completed', total: 0, savedOn: null })
    expect(savedSessionSummary(null)).toEqual({ status: 'missing' })
  })
})
