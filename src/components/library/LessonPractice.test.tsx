/** @vitest-environment jsdom */
import 'fake-indexeddb/auto'
import { db } from '../../db/database'
import { resetAppDb, seedCore } from '../../test/idb'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { LessonPractice } from './LessonPractice'
import { questions } from '../../data/questions'
import * as libraryPractice from '../../lib/libraryPractice'
import {
  advanceLibraryPractice,
  getLibraryPractice,
  selectLibraryChoice,
  startLibraryPractice,
  submitLibraryAnswer,
} from '../../lib/libraryPractice'
import type { LibraryPracticeSession } from '../../types'

const lessonBank = questions.filter((question) => question.lessonId === 'lesson-01')

function itemKey(row: LibraryPracticeSession) {
  return {
    lessonId: row.lessonId,
    sessionId: row.id,
    questionId: row.questionSnapshots[row.questionIndex]!.questionId,
    revision: row.revision,
  }
}

async function startFromIntro(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: '이 단원 문제 풀기' }))
  expect(await screen.findByRole('heading', { name: lessonBank[0]!.stem })).toBeVisible()
}

async function chooseAnswer(user: ReturnType<typeof userEvent.setup>, question: (typeof lessonBank)[number], selectedIndex = question.answerIndex) {
  const label = `${selectedIndex + 1}. ${question.choices[selectedIndex]}`
  await user.click(screen.getByRole('button', { name: label }))
  await waitFor(() => expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'true'))
}

beforeEach(async () => {
  await seedCore()
})
afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  await resetAppDb()
})

it('runs only the chosen lesson, hides explanations until submission, and reports the result', async () => {
  const user = userEvent.setup()
  render(<LessonPractice lessonId="lesson-01" />)
  await startFromIntro(user)
  for (const [index, question] of lessonBank.entries()) {
    expect(await screen.findByRole('heading', { name: question.stem })).toBeVisible()
    expect(screen.queryByText(question.explanation)).toBeNull()
    expect(screen.getByRole('button', { name: '답 확인' })).toBeDisabled()
    await chooseAnswer(user, question)
    await user.click(screen.getByRole('button', { name: '답 확인' }))
    expect(await screen.findByText(question.explanation)).toBeVisible()
    await user.click(screen.getByRole('button', { name: index === lessonBank.length - 1 ? '결과 보기' : '다음 문제' }))
  }
  expect(await screen.findByRole('heading', { name: `단원 확인 완료 · ${lessonBank.length} / ${lessonBank.length}` })).toBeVisible()
  expect(await db.attempts.count()).toBe(lessonBank.length)
  expect((await db.attempts.toArray()).every((attempt) => attempt.learningSource === 'library')).toBe(true)
  expect(await db.lessonCompletions.count()).toBe(0)
  expect(await db.libraryPractice.get('lesson-01')).toMatchObject({ step: 'result', lessonId: 'lesson-01' })
})

it('keeps feedback hidden on storage failure and retries the same attempt', async () => {
  const user = userEvent.setup()
  render(<LessonPractice lessonId="lesson-01" />)
  await startFromIntro(user)
  const question = lessonBank[0]!
  await chooseAnswer(user, question)
  vi.spyOn(db.mastery, 'put').mockRejectedValueOnce(new Error('storage failure'))
  await user.click(screen.getByRole('button', { name: '답 확인' }))
  expect(await screen.findByText('답안을 저장하지 못했습니다. 다시 눌러 저장해 주세요.')).toBeVisible()
  expect(screen.queryByText(question.explanation)).toBeNull()
  expect(await db.attempts.count()).toBe(0)
  await user.click(screen.getByRole('button', { name: '답 확인' }))
  expect(await screen.findByText(question.explanation)).toBeVisible()
  expect(await db.attempts.count()).toBe(1)
})

it('restores an unsubmitted selection after unmount and remount', async () => {
  const user = userEvent.setup()
  const { unmount } = render(<LessonPractice lessonId="lesson-01" />)
  await startFromIntro(user)
  const question = lessonBank[0]!
  await chooseAnswer(user, question, 1)
  const saved = await getLibraryPractice('lesson-01')
  expect(saved).toMatchObject({ step: 'question', selectedIndex: 1, questionIndex: 0 })
  unmount()
  render(<LessonPractice lessonId="lesson-01" />)
  expect(await screen.findByText('저장된 진행을 불러와 이어서 풀 수 있습니다.')).toBeVisible()
  expect(screen.getByRole('heading', { name: question.stem })).toBeVisible()
  expect(screen.getByRole('button', { name: `2. ${question.choices[1]}` })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.queryByText(question.explanation)).toBeNull()
  expect(await db.attempts.count()).toBe(0)
})

it('restores feedback after remount without recording a duplicate attempt', async () => {
  const user = userEvent.setup()
  const { unmount } = render(<LessonPractice lessonId="lesson-01" />)
  await startFromIntro(user)
  const question = lessonBank[0]!
  await chooseAnswer(user, question)
  await user.click(screen.getByRole('button', { name: '답 확인' }))
  expect(await screen.findByText(question.explanation)).toBeVisible()
  expect(await db.attempts.count()).toBe(1)
  unmount()
  render(<LessonPractice lessonId="lesson-01" />)
  expect(await screen.findByText(question.explanation)).toBeVisible()
  expect(screen.getByRole('heading', { name: question.stem })).toBeVisible()
  expect(screen.queryByRole('button', { name: '답 확인' })).toBeNull()
  expect(await db.attempts.count()).toBe(1)
})

it('keeps the feedback step when advancing fails to save', async () => {
  const user = userEvent.setup()
  render(<LessonPractice lessonId="lesson-01" />)
  await startFromIntro(user)
  const question = lessonBank[0]!
  await chooseAnswer(user, question)
  await user.click(screen.getByRole('button', { name: '답 확인' }))
  expect(await screen.findByText(question.explanation)).toBeVisible()
  const put = vi.spyOn(db.libraryPractice, 'put').mockRejectedValueOnce(new Error('disk full'))
  await user.click(screen.getByRole('button', { name: '다음 문제' }))
  expect(await screen.findByText('다음 단계로 넘어가지 못했습니다. 다시 눌러 주세요.')).toBeVisible()
  expect(screen.getByText(question.explanation)).toBeVisible()
  expect(screen.getByRole('heading', { name: question.stem })).toBeVisible()
  expect((await getLibraryPractice('lesson-01'))?.step).toBe('feedback')
  put.mockRestore()
  await user.click(screen.getByRole('button', { name: '다음 문제' }))
  expect(await screen.findByRole('heading', { name: lessonBank[1]!.stem })).toBeVisible()
  expect(screen.queryByText(question.explanation)).toBeNull()
})

it('restores the result screen and starts a new run only after explicit replay', async () => {
  const user = userEvent.setup()
  let row = await startLibraryPractice('lesson-01')
  const firstId = row.id
  while (row.step !== 'result') {
    row = await selectLibraryChoice({ ...itemKey(row), selectedIndex: row.questionSnapshots[row.questionIndex]!.answerIndex })
    row = await submitLibraryAnswer(itemKey(row))
    row = await advanceLibraryPractice(itemKey(row))
  }
  expect(await db.attempts.count()).toBe(lessonBank.length)
  const { unmount } = render(<LessonPractice lessonId="lesson-01" />)
  expect(await screen.findByRole('heading', { name: `단원 확인 완료 · ${lessonBank.length} / ${lessonBank.length}` })).toBeVisible()
  unmount()
  render(<LessonPractice lessonId="lesson-01" />)
  expect(await screen.findByRole('heading', { name: `단원 확인 완료 · ${lessonBank.length} / ${lessonBank.length}` })).toBeVisible()
  await user.click(screen.getByRole('button', { name: '다시 풀기' }))
  expect(await screen.findByRole('heading', { name: lessonBank[0]!.stem })).toBeVisible()
  const restarted = await getLibraryPractice('lesson-01')
  expect(restarted?.id).not.toBe(firstId)
  expect(restarted?.answers).toEqual([])
  expect(await db.attempts.count()).toBe(lessonBank.length)
})

it('ignores a delayed load for a previous lesson after lessonId changes', async () => {
  let release: (row: LibraryPracticeSession | undefined) => void = () => {}
  const gate = new Promise<LibraryPracticeSession | undefined>((resolve) => {
    release = resolve
  })
  const realGet = libraryPractice.getLibraryPractice.bind(libraryPractice)
  const spy = vi.spyOn(libraryPractice, 'getLibraryPractice').mockImplementationOnce(async (id) => {
    const row = await gate
    if (id !== 'lesson-01') return realGet(id)
    return row
  })

  const seeded = await startLibraryPractice('lesson-01')
  await selectLibraryChoice({ ...itemKey(seeded), selectedIndex: 0 })
  const { rerender } = render(<LessonPractice lessonId="lesson-01" />)
  expect(await screen.findByText('저장된 진행을 확인하는 중…')).toBeVisible()
  rerender(<LessonPractice lessonId="lesson-02" />)
  expect(await screen.findByRole('button', { name: '이 단원 문제 풀기' })).toBeVisible()
  release(await realGet('lesson-01'))
  await waitFor(() => expect(spy).toHaveBeenCalled())
  expect(screen.queryByRole('heading', { name: lessonBank[0]!.stem })).toBeNull()
  expect(screen.getByRole('button', { name: '이 단원 문제 풀기' })).toBeVisible()
})

it('shows a load failure and recovers with retry', async () => {
  const user = userEvent.setup()
  vi.spyOn(libraryPractice, 'getLibraryPractice')
    .mockRejectedValueOnce(new Error('indexeddb unavailable'))
    .mockResolvedValueOnce(undefined)
  render(<LessonPractice lessonId="lesson-01" />)
  expect(await screen.findByText('확인 문제 진행을 불러오지 못했습니다.')).toBeVisible()
  await user.click(screen.getByRole('button', { name: '다시 시도' }))
  expect(await screen.findByRole('button', { name: '이 단원 문제 풀기' })).toBeVisible()
})

it('offers reload when another window changed the saved progress', async () => {
  const user = userEvent.setup()
  render(<LessonPractice lessonId="lesson-01" />)
  await startFromIntro(user)
  const question = lessonBank[0]!
  await chooseAnswer(user, question, 0)
  const current = (await getLibraryPractice('lesson-01'))!
  await selectLibraryChoice({
    lessonId: current.lessonId,
    sessionId: current.id,
    questionId: current.questionSnapshots[0]!.questionId,
    revision: current.revision,
    selectedIndex: 1,
  })
  await user.click(screen.getByRole('button', { name: `1. ${question.choices[0]}` }))
  expect(await screen.findByText(/다른 창/)).toBeVisible()
  expect(screen.getByRole('button', { name: '저장된 진행 다시 불러오기' })).toBeVisible()
  expect(screen.queryByText(question.explanation)).toBeNull()
  await user.click(screen.getByRole('button', { name: '저장된 진행 다시 불러오기' }))
  expect(await screen.findByText('저장된 진행을 다시 불러왔습니다.')).toBeVisible()
  expect(screen.getByRole('button', { name: `2. ${question.choices[1]}` })).toHaveAttribute('aria-pressed', 'true')
})
