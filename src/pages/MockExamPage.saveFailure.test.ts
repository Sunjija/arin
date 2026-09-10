/** @vitest-environment jsdom */
import 'fake-indexeddb/auto'
import { createElement } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { FocusLayoutContext } from '../components/layout/focusLayoutContext'
import { MockExamPage } from './MockExamPage'
import * as mockService from '../lib/mockSession'
import { resetAppDb, seedCore } from '../test/idb'

afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  await resetAppDb()
})

describe('MockExamPage save failures', () => {
  it('keeps the exam open until the selected answer is saved', async () => {
    await resetAppDb()
    await seedCore()
    const realSave = mockService.saveMockProgress
    const save = vi.spyOn(mockService, 'saveMockProgress').mockRejectedValue(
      new Error('QuotaExceededError'),
    )
    render(
      createElement(
        MemoryRouter,
        null,
        createElement(
          FocusLayoutContext.Provider,
          { value: { focused: false, setFocused: () => undefined } },
          createElement(MockExamPage),
        ),
      ),
    )

    fireEvent.click(await screen.findByRole('button', { name: '시험 시작' }))
    const close = await screen.findByRole('button', { name: '닫기' })
    fireEvent.click(document.querySelector('button.choice-option')!)
    fireEvent.click(close)

    await waitFor(() => expect(save.mock.calls.length).toBeGreaterThanOrEqual(4), { timeout: 7_000 })
    expect(screen.getByRole('button', { name: '닫기' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '이어서 풀기' })).toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent('QuotaExceededError')

    save.mockImplementation(realSave)
    fireEvent.click(screen.getByRole('button', { name: '다시 저장' }))
    await waitFor(async () => {
      expect((await mockService.getActiveMock())?.answers.some((answer) => answer != null)).toBe(true)
    })
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(await screen.findByRole('button', { name: '이어서 풀기' })).toBeTruthy()
  }, 12_000)
})
