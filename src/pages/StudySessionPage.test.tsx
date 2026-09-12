/** @vitest-environment jsdom */
import 'fake-indexeddb/auto'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter } from 'react-router-dom'
import { FocusLayoutContext } from '../components/layout/focusLayoutContext'
import { db } from '../db/database'
import { questions } from '../data/questions'
import { seedCore, resetAppDb } from '../test/idb'
import { startLesson } from '../lib/learningApi'
import { toDateKey } from '../lib/dates'
import { snapshotFromQuestion } from '../lib/wrongCard'
import { getSavedSession, saveSession, submitSessionAnswer } from '../lib/studyService'
import { StudySessionPage } from './StudySessionPage'

beforeEach(() => seedCore())
afterEach(async () => { cleanup(); vi.restoreAllMocks(); await resetAppDb() })

function mountPage() {
  return render(<MemoryRouter initialEntries={['/study']}>
    <FocusLayoutContext.Provider value={{ focused: false, setFocused: vi.fn() }}>
      <StudySessionPage />
    </FocusLayoutContext.Provider>
  </MemoryRouter>)
}

async function prepareQuiz() {
  const started = await startLesson({ today: toDateKey(), lessonId: 'lesson-01' })
  const question = questions.find(item => item.id === started.questionIds[0])!
  const selected = [question, questions.find(item => item.lessonId === question.lessonId && item.id !== question.id)!]
  const session = await saveSession({ ...started, step: 'quiz', conceptDone: true,
    questionIds: selected.map(item => item.id), newQuestionIds: selected.map(item => item.id),
    questionSnapshots: selected.map(snapshotFromQuestion) })
  return { session, question }
}

it('rejects a stale selection, reloads feedback from another window, and can continue with the returned revision', async () => {
  const user = userEvent.setup()
  const { session, question } = await prepareQuiz()
  mountPage()
  await screen.findByRole('heading', { name: question.stem })
  const otherWindow = await saveSession({ ...structuredClone(session), selectedIndex: question.answerIndex })
  const feedback = await submitSessionAnswer(otherWindow, 1000)
  await user.click(screen.getByRole('button', { name: question.choices[(question.answerIndex + 1) % question.choices.length]! }))
  expect(await screen.findByRole('button', { name: '저장된 진행 다시 불러오기' })).toBeVisible()
  expect(screen.queryByText(question.explanation)).toBeNull()
  expect(await getSavedSession()).toEqual(feedback)
  await user.click(screen.getByRole('button', { name: '저장된 진행 다시 불러오기' }))
  expect(await screen.findByText(question.explanation)).toBeVisible()
  expect(screen.queryByRole('button', { name: '저장된 진행 다시 불러오기' })).toBeNull()
  await user.click(screen.getByRole('button', { name: '다음 문제' }))
  const second = questions.find(item => item.id === session.questionIds[1])!
  expect(await screen.findByRole('heading', { name: second.stem })).toBeVisible()
  expect((await getSavedSession()).questionIndex).toBe(1)
  expect(await db.attempts.count()).toBe(1)
})

it('keeps answers hidden on feedback-save failure, reloads the selection, retries and resumes feedback after remount', async () => {
  const user = userEvent.setup()
  const { question } = await prepareQuiz()
  const page = mountPage()
  await screen.findByRole('heading', { name: question.stem })
  const choice = question.choices[question.answerIndex]!
  await user.click(screen.getByRole('button', { name: choice }))
  await waitFor(() => expect(screen.getByRole('button', { name: choice })).toHaveAttribute('aria-pressed', 'true'))
  const selected = await getSavedSession()
  vi.spyOn(db.activeSession, 'put').mockRejectedValueOnce(new Error('진행 저장 공간이 부족합니다.'))
  await user.click(screen.getByRole('button', { name: '선택한 답 확인' }))
  expect(await screen.findByRole('button', { name: '저장된 진행 다시 불러오기' })).toBeVisible()
  expect(screen.queryByText(question.explanation)).toBeNull()
  expect(await db.attempts.count()).toBe(0)
  expect(await getSavedSession()).toEqual(selected)
  await user.click(screen.getByRole('button', { name: '저장된 진행 다시 불러오기' }))
  await waitFor(() => expect(screen.queryByRole('button', { name: '저장된 진행 다시 불러오기' })).toBeNull())
  expect(screen.getByRole('button', { name: choice })).toHaveAttribute('aria-pressed', 'true')
  await user.click(screen.getByRole('button', { name: '선택한 답 확인' }))
  expect(await screen.findByText(question.explanation)).toBeVisible()
  expect(await db.attempts.count()).toBe(1)
  page.unmount()
  mountPage()
  expect(await screen.findByText(question.explanation)).toBeVisible()
  expect(await db.attempts.count()).toBe(1)
})

it('does not show results when completion fails and retries without duplicate totals', async () => {
  const user = userEvent.setup()
  const { session, question } = await prepareQuiz()
  const last = await saveSession({ ...session, questionIds: [question.id], newQuestionIds: [question.id], selectedIndex: question.answerIndex })
  await submitSessionAnswer(last, null)
  const page = mountPage()
  await screen.findByText(question.explanation)
  vi.spyOn(db.activeSession, 'put').mockRejectedValueOnce(new Error('완료 저장 실패'))
  await user.click(screen.getByRole('button', { name: '결과 보기' }))
  expect(await screen.findByRole('button', { name: '저장된 진행 다시 불러오기' })).toBeVisible()
  expect(screen.queryByRole('heading', { name: '오늘 학습 결과' })).toBeNull()
  expect((await db.studyDays.get(session.date))?.finishedSessionIds).not.toContain(session.id)
  await user.click(screen.getByRole('button', { name: '결과 보기' }))
  expect(await screen.findByRole('heading', { name: '오늘 학습 결과' })).toBeVisible()
  expect((await db.studyDays.get(session.date))?.questionsAnswered).toBe(1)
  page.unmount()
  mountPage()
  expect(await screen.findByRole('heading', { name: '오늘 학습 결과' })).toBeVisible()
  expect((await db.studyDays.get(session.date))?.questionsAnswered).toBe(1)
})

it('keeps a failed memo draft for retry and resumes the entire saved text', async () => {
  const user = userEvent.setup()
  await startLesson({ today: toDateKey(), lessonId: 'lesson-01' })
  const page = mountPage()
  const memo = await screen.findByRole('textbox', { name: '교재·강의 범위 메모 (선택)' })
  await user.type(memo, '구석기와 신석기를 비교한 긴 메모')
  expect(screen.getByRole('button', { name: '읽기 완료 · 확인 문제 풀기' })).toBeDisabled()
  vi.spyOn(db.activeSession, 'put').mockRejectedValueOnce(new Error('메모 저장 실패'))
  await user.tab()
  expect(await screen.findByText('진행을 저장하지 못했습니다. 다시 시도해 주세요.')).toBeVisible()
  expect(memo).toHaveValue('구석기와 신석기를 비교한 긴 메모')
  expect((await getSavedSession()).conceptMemo).toBe('')
  await user.click(screen.getByRole('button', { name: '메모 저장' }))
  await waitFor(() => expect(screen.queryByRole('button', { name: '메모 저장' })).toBeNull())
  expect((await getSavedSession()).conceptMemo).toBe('구석기와 신석기를 비교한 긴 메모')
  page.unmount()
  mountPage()
  expect(await screen.findByRole('textbox', { name: '교재·강의 범위 메모 (선택)' })).toHaveValue('구석기와 신석기를 비교한 긴 메모')
})
