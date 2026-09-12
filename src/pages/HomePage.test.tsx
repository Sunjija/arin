/** @vitest-environment jsdom */
import 'fake-indexeddb/auto'
import { MemoryRouter } from 'react-router-dom'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { HomePage } from './HomePage'
import * as studyService from '../lib/studyService'
import { resetAppDb, seedCore } from '../test/idb'

afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  await resetAppDb()
})

it('recovers from a failed plan read without requiring a page reload', async () => {
  await resetAppDb()
  await seedCore()
  vi.spyOn(studyService, 'buildTodayPlan').mockRejectedValueOnce(new Error('일시적인 저장소 오류'))
  const user = userEvent.setup()
  render(<MemoryRouter><HomePage /></MemoryRouter>)
  expect(await screen.findByRole('alert')).toHaveTextContent('일시적인 저장소 오류')
  await user.click(screen.getByRole('button', { name: '다시 불러오기' }))
  expect(await screen.findByTestId('home-primary-cta')).toBeInTheDocument()
  expect(screen.queryByRole('alert')).toBeNull()
})
