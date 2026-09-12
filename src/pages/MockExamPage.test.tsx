/** @vitest-environment jsdom */
import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { MockExamPage } from './MockExamPage'
import { FocusLayoutContext } from '../components/layout/focusLayoutContext'
import { db } from '../db/database'
import { resetAppDb, seedCore } from '../test/idb'
import { finalizeMock, startMock } from '../lib/mockSession'

const snapshot = { questionId: 'frozen-question', stem: '당시 문항 원본', choices: ['첫 선지', '둘째 선지', '셋째 선지', '넷째 선지', '다섯째 선지'], answerIndex: 1, explanation: '당시 해설', era: 'goryeo' as const, tags: [], difficulty: 2 as const }
beforeEach(async () => { await resetAppDb(); await seedCore() })
afterEach(async () => { cleanup(); vi.restoreAllMocks(); await resetAppDb() })
function openPage() {
  return render(<MemoryRouter><FocusLayoutContext.Provider value={{ focused: false, setFocused: () => {} }}><MockExamPage /></FocusLayoutContext.Provider></MemoryRouter>)
}

it('keeps a failed answer selected and retries it before submitting exactly one attempt', async () => {
  const started = await startMock({ mode: 'sample', snapshots: [snapshot], durationMs: 60000 })
  if (!started.ok) throw new Error('start')
  openPage()
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: '이어서 풀기' }))
  const failed = vi.spyOn(db.activeMock, 'put').mockRejectedValueOnce(new Error('quota'))
  await user.click(screen.getByRole('button', { name: '둘째 선지' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('quota')
  expect(screen.getByRole('button', { name: '둘째 선지' })).toHaveAttribute('aria-pressed', 'true')
  await waitFor(async () => { expect((await db.activeMock.get(started.mock.id))!.answers).toEqual([1]) }, { timeout: 3000 })
  failed.mockRestore()
  await user.click(screen.getByRole('button', { name: '답안 확인' }))
  await user.click(screen.getByRole('button', { name: '제출' }))
  expect(await screen.findByRole('heading', { name: '채점 결과' })).toBeVisible()
  expect(await db.attempts.count()).toBe(1)
  expect((await db.mockResults.get(started.mock.id))!.answers[0]!.selectedIndex).toBe(1)
})

it('reopens an older result from its own frozen choices after a different exam replaces active storage', async () => {
  const first = await startMock({ mode: 'sample', snapshots: [snapshot], durationMs: 60000 })
  if (!first.ok) throw new Error('start')
  await finalizeMock({ id: first.mock.id, revision: first.mock.revision, answers: [1] })
  await startMock({ mode: 'sample', snapshots: [{ ...snapshot, stem: '새 시험 문항', choices: ['변경1', '변경2', '변경3', '변경4', '변경5'] }], durationMs: 60000 })
  openPage()
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: '결과 다시 보기' }))
  expect(await screen.findByText('당시 문항 원본')).toBeVisible()
  expect(screen.getByText('당시 해설')).toBeVisible()
  expect(screen.getByRole('button', { name: /둘째 선지\s*정답/ })).toBeVisible()
  expect(screen.queryByText('새 시험 문항')).toBeNull()
})
