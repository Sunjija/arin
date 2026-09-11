/** @vitest-environment jsdom */
import 'fake-indexeddb/auto'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { CardsPage } from './CardsPage'
import { db } from '../db/database'
import { resetAppDb, seedCore, practiceAttempt } from '../test/idb'
import { questions } from '../data/questions'
import { startLesson } from '../lib/learningApi'

beforeEach(async () => { await seedCore() })
afterEach(async () => { cleanup(); await resetAppDb() })
function openReview() {
  return render(<MemoryRouter initialEntries={['/cards']}><Routes>
    <Route path="/cards" element={<CardsPage />} />
    <Route path="/study" element={<p>문제 복습 화면</p>} />
  </Routes></MemoryRouter>)
}

it('starts question-only review even when there are no cards', async () => {
  const q = questions.find(item => item.era === 'goryeo')!
  await db.attempts.put({ ...practiceAttempt('previous', true, '2026-01-01'), questionId: q.id })
  openReview()
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: '문제 1개 복습 시작' }))
  expect(await screen.findByText('문제 복습 화면')).toBeVisible()
  const active = await db.activeSession.toCollection().first()
  expect(active).toMatchObject({ entryMode: 'review', step: 'quiz', cardIds: [], questionIds: [q.id] })
})

it('shows an empty assignment without claiming that a first-time learner completed review', async () => {
  openReview()
  expect(await screen.findByText('오늘 배정된 복습이 없어요')).toBeVisible()
  expect(screen.queryByText('오늘 복습을 모두 마쳤어요')).toBeNull()
  expect(screen.queryByRole('button', { name: /복습 시작/ })).toBeNull()
})

it('offers the previous day unfinished session and preserves its identity', async () => {
  const original = await startLesson({ today: '2026-01-05', lessonId: 'lesson-01' })
  openReview()
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: '진행 중인 학습 이어가기' }))
  expect(await screen.findByText('문제 복습 화면')).toBeVisible()
  expect((await db.activeSession.toCollection().first())?.id).toBe(original.id)
})
