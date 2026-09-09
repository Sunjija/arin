/** @vitest-environment jsdom */
import { createElement, Fragment, type ReactNode } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useSearchParams } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { LibraryPage } from './LibraryPage'
import { TimelinePage } from './TimelinePage'

function QueryProbe() {
  const [params] = useSearchParams()
  return createElement('pre', { 'data-testid': 'qs' }, params.toString())
}

function renderAt(path: string, page: ReactNode = createElement(LibraryPage)) {
  return render(
    createElement(
      MemoryRouter,
      { initialEntries: [path] },
      createElement(Fragment, null, page, createElement(QueryProbe)),
    ),
  )
}

afterEach(() => {
  cleanup()
})

describe('LibraryPage', () => {
  it('exports a single 자료실 header and shares it with /timeline', () => {
    const { unmount } = renderAt('/library')
    expect(screen.getAllByRole('heading', { level: 1 }).map((node) => node.textContent)).toEqual([
      '흐름으로 읽는 한국사',
    ])
    expect(screen.getByRole('tab', { name: '연표' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: '개념' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.queryByText('한국사 연표')).toBeNull()
    unmount()

    renderAt('/timeline', createElement(TimelinePage))
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('흐름으로 읽는 한국사')
    expect(screen.getByText('기원전 2333')).toBeTruthy()
  })

  it('restores tab, era, q, and sort from the URL', () => {
    renderAt('/library?tab=concepts&era=goryeo&q=광종&sort=desc')
    expect(screen.getByRole('tab', { name: '개념' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('개념 검색')).toHaveValue('광종')
    expect(screen.getByLabelText('시대')).toHaveValue('goryeo')
    expect(screen.getByLabelText('정렬')).toHaveValue('desc')
    expect(screen.getByRole('button', { name: /고려 광종과 성종/ })).toBeTruthy()
    expect(screen.queryByText('오늘 학습으로')).toBeNull()
  })

  it('searches in Korean, filters by era/sort, and expands from the keyboard', async () => {
    const user = userEvent.setup()
    renderAt('/timeline')

    const search = screen.getByLabelText('연표 검색')
    await user.type(search, '고조선')
    expect(screen.getByTestId('qs')).toHaveTextContent('q=%EA%B3%A0%EC%A1%B0%EC%84%A0')
    expect(screen.getByRole('button', { name: /고조선 건국 전승/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /고조선 멸망/ })).toBeTruthy()

    await user.selectOptions(screen.getByLabelText('시대'), 'goryeo')
    expect(screen.queryByRole('button', { name: /고조선 건국 전승/ })).toBeNull()

    await user.selectOptions(screen.getByLabelText('정렬'), 'desc')
    await user.selectOptions(screen.getByLabelText('시대'), 'all')
    await user.clear(search)

    const newest = screen.getByRole('button', { name: /남북 정상 회담/ })
    expect(newest.getAttribute('data-library-first-event')).toBe('true')

    await user.selectOptions(screen.getByLabelText('정렬'), 'asc')
    const first = screen.getByRole('button', { name: /고조선 건국 전승/ })
    expect(first).toHaveAttribute('aria-expanded', 'false')
    first.focus()
    await user.keyboard('{Enter}')
    expect(first).toHaveAttribute('aria-expanded', 'true')
    expect(first.textContent).toContain('단군 왕검')
    await user.keyboard('{Enter}')
    expect(first).toHaveAttribute('aria-expanded', 'false')
  })

  it('offers clear and reset when a search has zero hits', async () => {
    const user = userEvent.setup()
    renderAt('/timeline')
    await user.type(screen.getByLabelText('연표 검색'), '없는검색어xyz')
    expect(screen.getByText('해당하는 사건이 없습니다.')).toBeTruthy()
    expect(screen.getByRole('button', { name: '지우기' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: '초기화' }))
    expect(screen.getByRole('button', { name: /고조선 건국 전승/ })).toBeTruthy()
    expect(screen.getByTestId('qs').textContent).toBe('')
  })

  it('shows concept summary, keywords, and checkpoints without study completion copy', async () => {
    const user = userEvent.setup()
    renderAt('/library')
    await user.click(screen.getByRole('tab', { name: '개념' }))
    expect(screen.getByTestId('qs')).toHaveTextContent('tab=concepts')
    expect(screen.getByText('18건')).toBeTruthy()

    const lesson = screen.getByRole('button', { name: /선사 문화와 고조선/ })
    await user.click(lesson)
    expect(lesson).toHaveAttribute('aria-expanded', 'true')
    expect(within(lesson).getByText(/고조선의 건국 전통과/)).toBeTruthy()
    expect(within(lesson).getByText(/청동기: 비파형동검/)).toBeTruthy()
    expect(within(lesson).getByText('핵심어')).toBeTruthy()
    expect(screen.queryByText('오늘 학습으로')).toBeNull()
    expect(screen.queryByText(/빈출/)).toBeNull()
    expect(screen.queryByText(/숙련/)).toBeNull()
  })

  it('keeps long titles in the accessible name', () => {
    renderAt('/timeline')
    const longTitle = screen.getByRole('button', { name: /대한민국 임시정부 수립/ })
    expect(longTitle.className).toContain('flex')
    expect(screen.getByText('기원전 2333')).toBeTruthy()
  })
})
