/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter } from 'react-router-dom'
import { BillingPage } from './BillingPage'
import { resetBrowserBillingHarness } from '../billing/client/harness'

afterEach(() => {
  cleanup()
  resetBrowserBillingHarness()
})

describe('BillingPage test adapter', () => {
  it('labels test mode and completes a test purchase without calling it a real payment', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <BillingPage />
      </MemoryRouter>,
    )
    expect(await screen.findByTestId('billing-test-banner')).toHaveTextContent('테스트 결제 모드')
    expect(screen.getByText(/실제 인앱결제가 완료된 것처럼 표시하지 않습니다/)).toBeTruthy()
    const buy = await screen.findAllByRole('button', { name: '테스트 구매' })
    await user.click(buy[0]!)
    expect(await screen.findByText(/테스트 거래가 서버 검증을 통과했습니다/)).toBeTruthy()
    expect(screen.queryByText(/결제가 완료되었습니다/)).toBeNull()
    expect(screen.getByText(/실전 모의\(정규\): 열림/)).toBeTruthy()
  })

  it('shows user cancellation without granting access', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <BillingPage />
      </MemoryRouter>,
    )
    await screen.findByTestId('billing-test-banner')
    await user.click(screen.getByRole('button', { name: '사용자 취소' }))
    const buy = await screen.findAllByRole('button', { name: '테스트 구매' })
    await user.click(buy[0]!)
    expect(await screen.findByText(/사용자가 결제를 취소했습니다/)).toBeTruthy()
    expect(screen.getByText(/실전 모의\(정규\): 잠김/)).toBeTruthy()
  })
})
