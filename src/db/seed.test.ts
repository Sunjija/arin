import { describe, expect, it } from 'vitest'
import type { FlashcardRecord } from '../types'
import { mergeSeedCard } from './seed'

function card(overrides: Partial<FlashcardRecord> = {}): FlashcardRecord {
  return {
    id: 'c-91',
    front: 'old front',
    back: 'old back',
    kind: 'chronology',
    era: 'modern',
    tags: ['chronology'],
    createdAt: '2026-01-01',
    updatedAt: '2026-02-01',
    nextReviewAt: '2026-10-01',
    intervalDays: 30,
    easeStreak: 4,
    lapses: 2,
    fingerprint: 'old',
    ...overrides,
  }
}

describe('seed content migration', () => {
  it('updates corrected content without resetting review progress', () => {
    const merged = mergeSeedCard(
      card(),
      card({
        front: 'new front',
        back: 'new back',
        fingerprint: 'new',
        nextReviewAt: '2026-03-01',
        intervalDays: 0,
        easeStreak: 0,
        lapses: 0,
      }),
    )

    expect(merged.front).toBe('new front')
    expect(merged.back).toBe('new back')
    expect(merged.fingerprint).toBe('new')
    expect(merged.nextReviewAt).toBe('2026-10-01')
    expect(merged.intervalDays).toBe(30)
    expect(merged.easeStreak).toBe(4)
    expect(merged.lapses).toBe(2)
  })

  it('does not overwrite user-edited or wrong-answer cards', () => {
    const edited = mergeSeedCard(
      card({ userEdited: true, front: '내가 고친 앞' }),
      card({ front: 'new front', back: 'new back', fingerprint: 'new' }),
    )
    expect(edited.front).toBe('내가 고친 앞')

    const fromWrong = mergeSeedCard(
      card({ fromWrongAnswer: true, front: '오답 앞' }),
      card({ front: 'new front' }),
    )
    expect(fromWrong.front).toBe('오답 앞')
  })
})
