/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { ConceptStep } from './ConceptStep'
import { lessons } from '../../data/lessons'
import { lessonGuides } from '../../data/lessonGuides'
const guide = { ...lessonGuides[0]!, sections: [lessonGuides[0]!.sections[0]!] }
afterEach(cleanup)
it('shows only scoped reading and requires saved recall confirmation before continuing', async () => {
  const onDone = vi.fn().mockResolvedValue(undefined)
  const onConfirm = vi.fn().mockResolvedValue(undefined)
  const props = { lesson: lessons[0]!, memo: '', onMemo: vi.fn(), onDone, guideSnapshots: [guide], confirmedConceptIds: [], onConfirm, questionCount: 1 }
  const view = render(<ConceptStep {...props} />)
  expect(screen.getByRole('button', { name: '읽기 완료 · 확인 문제 풀기' })).toBeDisabled()
  expect(screen.queryByRole('heading', { name: /위만의 집권부터/ })).toBeNull()
  await userEvent.click(screen.getByRole('checkbox', { name: '확인 질문에 내 말로 답해 봤어요' }))
  expect(onConfirm).toHaveBeenCalledWith('t-pre-01', true)
  expect(onDone).not.toHaveBeenCalled()
  view.rerender(<ConceptStep {...props} confirmedConceptIds={['t-pre-01']} />)
  await userEvent.click(screen.getByRole('button', { name: '읽기 완료 · 확인 문제 풀기' }))
  expect(onDone).toHaveBeenCalledOnce()
})
it('keeps the checkbox and next step unconfirmed when saving fails', async () => {
  render(<ConceptStep lesson={lessons[0]!} memo="" onMemo={vi.fn()} onDone={vi.fn()} guideSnapshots={[guide]} onConfirm={vi.fn().mockRejectedValue(new Error('disk full'))} questionCount={0} />)
  await userEvent.click(screen.getByRole('checkbox'))
  expect(await screen.findByText('진행을 저장하지 못했습니다. 다시 시도해 주세요.')).toBeVisible()
  expect(screen.getByRole('checkbox')).not.toBeChecked()
  expect(screen.getByRole('button', { name: '개념 확인 완료 · 다음으로' })).toBeDisabled()
})
