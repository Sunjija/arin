/** @vitest-environment jsdom */
import 'fake-indexeddb/auto'
import { db } from '../../db/database'
import { resetAppDb, seedCore } from '../../test/idb'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { LessonPractice } from './LessonPractice'
import { questions } from '../../data/questions'
beforeEach(async () => { await seedCore() })
afterEach(async () => { cleanup(); vi.restoreAllMocks(); await resetAppDb() })
it('runs only the chosen lesson, hides explanations until submission, and reports the result', async () => {
  const user = userEvent.setup()
  render(<LessonPractice lessonId="lesson-01" />)
  await user.click(screen.getByRole('button', { name: '이 단원 문제 풀기' }))
  const bank = questions.filter((q) => q.lessonId === 'lesson-01')
  for (const [index, question] of bank.entries()) {
    expect(screen.getByRole('heading', { name: question.stem })).toBeVisible()
    expect(screen.queryByText(question.explanation)).toBeNull()
    expect(screen.getByRole('button', { name: '답 확인' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: `${question.answerIndex + 1}. ${question.choices[question.answerIndex]}` }))
    await user.click(screen.getByRole('button', { name: '답 확인' }))
    expect(await screen.findByText(question.explanation)).toBeVisible()
    await user.click(screen.getByRole('button', { name: index === bank.length - 1 ? '결과 보기' : '다음 문제' }))
  }
  expect(screen.getByRole('heading', { name: `단원 확인 완료 · ${bank.length} / ${bank.length}` })).toBeVisible()
  expect(await db.attempts.count()).toBe(bank.length)
  expect((await db.attempts.toArray()).every(attempt => attempt.learningSource === 'library')).toBe(true)
  expect(await db.lessonCompletions.count()).toBe(0)
})

it('keeps feedback hidden on storage failure and retries the same attempt', async () => {
  const user = userEvent.setup()
  render(<LessonPractice lessonId="lesson-01" />)
  await user.click(screen.getByRole('button', { name: '이 단원 문제 풀기' }))
  const question = questions.find(q => q.lessonId === 'lesson-01')!
  await user.click(screen.getByRole('button', { name: `${question.answerIndex + 1}. ${question.choices[question.answerIndex]}` }))
  vi.spyOn(db.mastery, 'put').mockRejectedValueOnce(new Error('storage failure'))
  await user.click(screen.getByRole('button', { name: '답 확인' }))
  expect(await screen.findByText('답안을 저장하지 못했습니다. 다시 눌러 저장해 주세요.')).toBeVisible()
  expect(screen.queryByText(question.explanation)).toBeNull()
  expect(await db.attempts.count()).toBe(0)
  await user.click(screen.getByRole('button', { name: '답 확인' }))
  expect(await screen.findByText(question.explanation)).toBeVisible()
  expect(await db.attempts.count()).toBe(1)
})
