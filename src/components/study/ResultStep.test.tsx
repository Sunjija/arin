/** @vitest-environment jsdom */
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter } from 'react-router-dom'
import { ResultStep } from './ResultStep'
import { sessionExposureStats } from '../../lib/questionStudyContext'
import type { ActiveSession, QuestionStudyContext, SessionAnswer } from '../../types'

function context(
  questionId: string,
  priorAttemptCount: number,
): QuestionStudyContext {
  return {
    questionId,
    reason: priorAttemptCount === 0 ? 'new-concept' : 'review-practice',
    selectedOn: '2026-01-05',
    dueOn: null,
    lastWrongAt: null,
    priorAttemptCount,
    similarQuestionAttemptCount: null,
  }
}

function answer(questionId: string, correct: boolean): SessionAnswer {
  return {
    questionId,
    correct,
    selectedIndex: correct ? 0 : 1,
    responseMs: 1200,
    attemptId: `att-${questionId}`,
  }
}

function session(overrides: Partial<ActiveSession> = {}): ActiveSession {
  return {
    id: 'session-result',
    date: '2026-01-05',
    step: 'result',
    lessonId: 'lesson-01',
    cardIds: ['card-a', 'card-b'],
    cardIndex: 2,
    conceptDone: true,
    conceptMemo: '',
    questionIds: ['q-first', 'q-repeat', 'q-legacy'],
    questionIndex: 3,
    quizPhase: 'feedback',
    clueMemo: '',
    revealedChoices: true,
    answered: [
      answer('q-first', true),
      answer('q-repeat', false),
      answer('q-legacy', true),
      answer('q-first', true),
    ],
    startedAt: '2026-01-05T09:00:00.000Z',
    updatedAt: '2026-01-05T10:00:00.000Z',
    entryMode: 'daily',
    questionContexts: [context('q-first', 0), context('q-repeat', 2)],
    ...overrides,
  }
}

function renderResult(active: ActiveSession) {
  return render(
    <MemoryRouter>
      <ResultStep session={active} lessonTitle="선사 시대" />
    </MemoryRouter>,
  )
}

afterEach(cleanup)

describe('ResultStep exposure groups', () => {
  it('splits first, repeated, and unknown groups and ignores duplicate answers', () => {
    const active = session()
    expect(sessionExposureStats(active)).toEqual({
      first: { total: 1, correct: 1 },
      repeated: { total: 1, correct: 0 },
      unknown: { total: 1, correct: 1 },
    })

    renderResult(active)
    const section = screen.getByLabelText('풀이 이력 구분')
    expect(within(section).getByText('첫 풀이 기록')).toBeVisible()
    expect(within(section).getByText('다시 풀이')).toBeVisible()
    expect(within(section).getByText('구분 정보 없음')).toBeVisible()
    expect(within(section).getAllByText('정답 1 / 1문제')).toHaveLength(2)
    expect(within(section).getByText('정답 0 / 1문제')).toBeVisible()
    expect(within(section).getByText('학습 시작 전 동일 문항 답안 없음')).toBeVisible()
    expect(within(section).queryByText(/%/)).toBeNull()
    expect(screen.getByText('2장')).toBeVisible()
    expect(screen.getByText('67%')).toBeVisible()
    expect(screen.getByText('2/3')).toBeVisible()
  })

  it('shows 기록 없음 for empty groups instead of inventing 0%', () => {
    renderResult(
      session({
        answered: [answer('q-first', true)],
        questionContexts: [context('q-first', 0)],
        cardIds: ['card-a'],
        cardIndex: 1,
      }),
    )
    const section = screen.getByLabelText('풀이 이력 구분')
    expect(within(section).getByText('정답 1 / 1문제')).toBeVisible()
    expect(within(section).getAllByText('기록 없음')).toHaveLength(2)
    expect(within(section).queryByText('0%')).toBeNull()
    expect(within(section).queryByText('0/0')).toBeNull()
  })

  it('keeps navigation links for daily and review sessions', () => {
    const { rerender } = renderResult(session({ entryMode: 'daily' }))
    expect(screen.getByRole('link', { name: '오늘 화면' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: '오답·카드 보기' })).toHaveAttribute('href', '/cards')
    expect(screen.getByLabelText('풀이 이력 구분')).toBeVisible()

    rerender(
      <MemoryRouter>
        <ResultStep session={session({ entryMode: 'review' })} lessonTitle="선사 시대" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: '복습 결과' })).toBeVisible()
    expect(screen.getByRole('link', { name: '복습 목록으로' })).toHaveAttribute('href', '/cards')
    expect(screen.getByRole('link', { name: '오늘 화면' })).toHaveAttribute('href', '/')
    expect(screen.getByLabelText('풀이 이력 구분')).toBeVisible()
    expect(screen.getByText('복습 목록')).toBeVisible()
  })
})
