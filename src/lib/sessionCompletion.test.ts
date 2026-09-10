import { describe, expect, it } from 'vitest'
import { applySessionCompletion } from './sessionCompletion'
import type { ActiveSession, AppMeta } from '../types'

function session(overrides: Partial<ActiveSession> = {}): ActiveSession {
  return {
    id: 'session-2026-09-10',
    date: '2026-09-10',
    step: 'quiz',
    lessonId: 'lesson-01',
    cardIds: ['c-01'],
    cardIndex: 1,
    conceptDone: true,
    conceptMemo: '',
    questionIds: ['q-01'],
    questionIndex: 1,
    quizPhase: 'choices',
    clueMemo: '',
    revealedChoices: true,
    answered: [{ questionId: 'q-01', correct: true, selectedIndex: 0, responseMs: 1000 }],
    startedAt: '2026-09-10T00:00:00.000Z',
    updatedAt: '2026-09-10T00:10:00.000Z',
    mode: 'full',
    ...overrides,
  }
}

const meta: AppMeta = {
  id: 'meta',
  seededAt: '2026-09-01',
  streak: 2,
  lastStudyDate: '2026-09-09',
  estimatedScore: 40,
}

describe('applySessionCompletion', () => {
  it('짧은 복습 완료는 전체 일일 학습을 완료로 바꾸지 않고 연속 학습도 올리지 않는다', () => {
    const result = applySessionCompletion({
      session: session({ id: 'session-2026-09-10-short', mode: 'short-review' }),
      meta,
      mode: 'short-review',
      nowIso: '2026-09-10T00:20:00.000Z',
    })
    expect(result.day.completed).toBe(false)
    expect(result.day.shortReviewCompleted).toBe(true)
    expect(result.meta.streak).toBe(2)
    expect(result.meta.lastStudyDate).toBe('2026-09-09')
  })

  it('전체 학습 완료는 연속 학습을 올리고, 같은 세션 중복 완료는 다시 올리지 않는다', () => {
    const first = applySessionCompletion({
      session: session(),
      meta,
      mode: 'full',
      nowIso: '2026-09-10T00:30:00.000Z',
    })
    expect(first.day.completed).toBe(true)
    expect(first.meta.streak).toBe(3)
    const second = applySessionCompletion({
      session: session(),
      existingDay: first.day,
      meta: first.meta,
      mode: 'full',
      nowIso: '2026-09-10T00:40:00.000Z',
    })
    expect(second.meta.streak).toBe(3)
    expect(second.day.completedSessionId).toBe(first.day.completedSessionId)
  })
})
