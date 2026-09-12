/** @vitest-environment jsdom */
import 'fake-indexeddb/auto'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import App from './App'
import { resetAppDb, seedCore } from './test/idb'

afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  await resetAppDb()
})

it('keeps the home route available after bootstrap without a route-loading spinner', async () => {
  await resetAppDb()
  await seedCore()

  render(<App />)

  expect(await screen.findByTestId('home-primary-cta')).toBeInTheDocument()
  expect(screen.queryByText('화면을 불러오는 중…')).toBeNull()
  expect(screen.queryByText('arin을 준비하는 중…')).toBeNull()
})
