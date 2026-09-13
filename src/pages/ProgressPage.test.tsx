/** @vitest-environment jsdom */
import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { StrictMode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { db } from '../db/database'
import { practiceAttempt, resetAppDb, seedCore } from '../test/idb'
import { emptyConceptProgress } from '../lib/conceptProgress'
import { addDays, toDateKey } from '../lib/dates'
import * as learningApi from '../lib/learningApi'
import type { ActiveSession, LearningGoal } from '../types'
import { ProgressPage } from './ProgressPage'

function savedSession(overrides: Partial<ActiveSession> = {}): ActiveSession {
  return {
    id: 'saved', date: '2026-09-11', step: 'result', lessonId: 'lesson-01', cardIds: [], cardIndex: 0,
    conceptDone: true, conceptMemo: '', questionIds: ['a', 'b', 'c'], questionIndex: 3,
    quizPhase: 'feedback', clueMemo: '', revealedChoices: true,
    startedAt: '2026-09-11T10:00:00+09:00', updatedAt: '2026-09-12T10:00:00+09:00',
    answered: ['a', 'b', 'c'].map(questionId => ({ questionId, correct: questionId !== 'b', selectedIndex: 0, responseMs: null })),
    questionContexts: [0, 2].map((priorAttemptCount, i) => ({ questionId: ['a', 'b'][i], priorAttemptCount, reason: 'review-practice', selectedOn: '2026-09-11', dueOn: null, lastWrongAt: null, similarQuestionAttemptCount: null })),
    ...overrides,
  }
}
function show(strict = false) {
  const page = <MemoryRouter><ProgressPage /></MemoryRouter>
  return render(strict ? <StrictMode>{page}</StrictMode> : page)
}
async function databaseContents() {
  return Promise.all(db.tables.map(async table => ({ name: table.name, rows: await table.toArray() })))
}
beforeEach(async () => { await seedCore({ startDate: toDateKey(), conceptTargetDate: addDays(toDateKey(), 30) }) })
afterEach(async () => { cleanup(); vi.restoreAllMocks(); await resetAppDb() })

it('reads empty records without writes, separates dates and explains unavailable coverage', async () => {
  const before = await databaseContents()
  show()
  expect(screen.getByRole('status')).toHaveTextContent('불러오는 중')
  expect(await screen.findByText('0 / 88개')).toBeVisible()
  expect(screen.getByText('미정')).toBeVisible()
  expect(screen.getByText('준비됨 11개 · 준비 중 77개')).toBeVisible()
  expect(screen.getByText('저장된 학습이 없습니다.')).toBeVisible()
  expect(screen.getByRole('link', { name: '첫 실전 연습 시작' })).toHaveAttribute('href', '/mock')
  expect(await databaseContents()).toEqual(before)
})

it('shows actual completed concepts and a saved result independently from the keyboard period toggle', async () => {
  const user = userEvent.setup()
  await db.conceptProgress.bulkPut([
    { ...emptyConceptProgress('t-pre-01'), learnState: 'completed' },
    { ...emptyConceptProgress('t-pre-02'), viewedAt: toDateKey() },
    { ...emptyConceptProgress('t-pre-03'), learnState: 'learning' },
    { ...emptyConceptProgress('unknown-id'), learnState: 'completed' },
  ])
  await db.lessonCompletions.put({ lessonId: 'lesson-02', firstCompletedAt: toDateKey(), lastCompletedAt: toDateKey(), completionCount: 1 })
  await db.attempts.bulkPut([practiceAttempt('now', true, toDateKey()), practiceAttempt('older', false, addDays(toDateKey(), -15)), practiceAttempt('oldest', false, addDays(toDateKey(), -40))])
  const session = savedSession()
  await db.activeSession.put({ ...session, answered: [...session.answered, session.answered[0]] })
  const before = await databaseContents()
  show()
  expect(await screen.findByText('1 / 88개')).toBeVisible()
  const saved = screen.getByRole('region', { name: '저장된 완료 학습의 풀이 구분' })
  expect(within(saved).getByText('다시 풀이').nextElementSibling).toHaveTextContent('정답 0개 / 1문항')
  expect(within(saved).getByText('구분 정보 없음').nextElementSibling).toHaveTextContent('정답 1개 / 1문항')
  expect(screen.getByText('1 / 1문제 정답 · 모의고사 제외')).toBeVisible()
  const resultBefore = saved.textContent
  screen.getByRole('button', { name: '최근 30일' }).focus()
  await user.keyboard('{Enter}')
  expect(screen.getByRole('button', { name: '최근 30일' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByText('1 / 2문제 정답 · 모의고사 제외')).toBeVisible()
  expect(saved.textContent).toBe(resultBefore)
  expect(screen.getByRole('link', { name: '고려 보완 학습' })).toHaveAttribute('href', '/library?tab=concepts&era=goryeo')
  expect(await databaseContents()).toEqual(before)
})

it('keeps legacy completed answers unknown even when matching attempts exist', async () => {
  await db.activeSession.put(savedSession({ questionContexts: undefined }))
  await db.attempts.put({ ...practiceAttempt('old', true, toDateKey()), questionId: 'a' })
  show()
  await screen.findByText('0 / 88개')
  const saved = within(screen.getByRole('region', { name: '저장된 완료 학습의 풀이 구분' }))
  expect(saved.getByText('구분 정보 없음').nextElementSibling).toHaveTextContent('정답 2개 / 3문항')
  expect(saved.getByText('첫 풀이').nextElementSibling).toHaveTextContent('문제 기록 없음')
  expect(screen.getByText(/기록이 적어 집계되지 않은 영역도/)).toBeVisible()
})

it('does not publish answers from an unfinished session or fabricate a card-only result', async () => {
  await db.activeSession.put(savedSession({ step: 'quiz' }))
  const view = show()
  expect(await screen.findByText(/현재 저장된 학습은 진행 중/)).toBeVisible()
  expect(screen.queryByText('정답 1개 / 1문항')).toBeNull()
  view.unmount()
  await db.activeSession.put(savedSession({ answered: [], questionIds: [], cardIds: ['card'] }))
  show()
  expect(await screen.findByText(/이 완료 학습에는 제출한 문제 기록이 없습니다/)).toBeVisible()
  expect(screen.queryByText('정답 0개 / 0문항')).toBeNull()
})

it('shows a safe error and retries only reads after an IndexedDB read failure', async () => {
  const user = userEvent.setup()
  const before = await databaseContents()
  vi.spyOn(db.conceptProgress, 'toArray').mockRejectedValueOnce(new Error('internal-secret-enum'))
  show()
  expect(await screen.findByRole('alert')).toHaveTextContent('학습 기록을 불러오지 못했습니다')
  expect(screen.queryByText(/internal-secret/)).toBeNull()
  expect(screen.queryByText('0 / 88개')).toBeNull()
  await user.click(screen.getByRole('button', { name: '기록 다시 불러오기' }))
  expect(await screen.findByText('0 / 88개')).toBeVisible()
  expect(await databaseContents()).toEqual(before)
})

it('ignores a late read from an abandoned effect and after unmount', async () => {
  const actualGoal = await learningApi.getGoal()
  let resolveOld!: (goal: LearningGoal) => void
  const delayed = new Promise<LearningGoal>(resolve => { resolveOld = resolve })
  vi.spyOn(learningApi, 'getGoal').mockReturnValueOnce(delayed)
  const view = show(true)
  expect(await screen.findByText(actualGoal.conceptTargetDate!)).toBeVisible()
  await act(async () => { resolveOld({ ...actualGoal, conceptTargetDate: '2025-01-01' }); await delayed })
  expect(screen.queryByText('2025-01-01')).toBeNull()
  view.unmount()
  let rejectLate!: (error: Error) => void
  vi.spyOn(learningApi, 'getGoal').mockReturnValueOnce(new Promise((_, reject) => { rejectLate = reject }))
  const pending = show()
  pending.unmount()
  await act(async () => { rejectLate(new Error('late failure')); await Promise.resolve() })
  expect(screen.queryByRole('alert')).toBeNull()
})
