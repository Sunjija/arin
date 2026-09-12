/** @vitest-environment jsdom */
import { lazy, type ComponentType } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { RouteContent } from './RouteContent'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

type LazyModule = { default: ComponentType }

function deferredLazy() {
  let resolve!: (value: LazyModule) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<LazyModule>((res, rej) => {
    resolve = res
    reject = rej
  })
  const LazyPage = lazy(() => promise)
  return { LazyPage, resolve, reject }
}

it('shows a Korean loading fallback while a route import is pending', async () => {
  const { LazyPage, resolve } = deferredLazy()
  render(
    <RouteContent>
      <LazyPage />
    </RouteContent>,
  )

  expect(screen.getByText('화면을 불러오는 중…')).toBeInTheDocument()

  resolve({ default: () => <div>학습 화면</div> })
  expect(await screen.findByText('학습 화면')).toBeInTheDocument()
  expect(screen.queryByText('화면을 불러오는 중…')).toBeNull()
})

it('shows a readable error and reloads on retry after a rejected route import', async () => {
  const { LazyPage, reject } = deferredLazy()
  const reload = vi.fn()
  vi.stubGlobal('location', { ...window.location, reload })

  const user = userEvent.setup()
  render(
    <RouteContent>
      <LazyPage />
    </RouteContent>,
  )

  expect(screen.getByText('화면을 불러오는 중…')).toBeInTheDocument()
  reject(new Error('Failed to fetch dynamically imported module'))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    '일시적인 오류이거나 새 버전이 배포됐을 수 있습니다',
  )
  expect(screen.queryByText('화면을 불러오는 중…')).toBeNull()

  await user.click(screen.getByRole('button', { name: '다시 시도' }))
  await waitFor(() => expect(reload).toHaveBeenCalledTimes(1))
})
