/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { CardsStep } from './CardsStep'
import type { ActiveSession, FlashcardRecord } from '../../types'
const card = {id:'card-1', front:'청동기 사회의 단서는?', back:'고인돌과 군장', era:'prehistoric', intervalDays:14, easeStreak:2} as FlashcardRecord
const session = {cardIndex:0, cardIds:['card-1'], entryMode:'review'} as ActiveSession
afterEach(cleanup)
describe('recall card flow', () => {
  it('hides the answer until requested, then saves the selected rating', async () => {
    const user = userEvent.setup(); const save = vi.fn().mockResolvedValue(undefined)
    render(<CardsStep cards={[card]} session={session} onAdvance={save} onSkip={vi.fn()} />)
    expect(screen.queryByText(card.back)).toBeNull()
    expect(screen.queryByRole('group', {name:'기억 평가'})).toBeNull()
    await user.click(screen.getByRole('button', {name:'정답 보기'}))
    expect(screen.getByText(card.back)).toBeVisible()
    await user.click(screen.getByRole('button', {name:'알겠어요 28일 뒤'}))
    expect(save).toHaveBeenCalledExactlyOnceWith('good', false)
  })
  it('unknown reveals first, and Again requests a repeat only after rating', async () => {
    const user = userEvent.setup(); const save = vi.fn().mockResolvedValue(undefined)
    render(<CardsStep cards={[card]} session={session} onAdvance={save} onSkip={vi.fn()} />)
    await user.click(screen.getByRole('button', {name:'모르겠어요'}))
    expect(save).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', {name:'다시 1일 뒤'}))
    expect(save).toHaveBeenCalledExactlyOnceWith('again', true)
  })
  it('keeps the revealed card and reports a save failure', async () => {
    const user = userEvent.setup()
    render(<CardsStep cards={[card]} session={session} onAdvance={vi.fn().mockRejectedValue(new Error('저장 실패'))} onSkip={vi.fn()} />)
    await user.click(screen.getByRole('button', {name:'정답 보기'}))
    await user.click(screen.getByRole('button', {name:'쉬워요 28일 뒤'}))
    expect(screen.getByRole('alert')).toHaveTextContent('저장 실패')
    expect(screen.getByText(card.back)).toBeVisible()
    expect(screen.getByRole('button', {name:'쉬워요 28일 뒤'})).toBeEnabled()
  })
})
