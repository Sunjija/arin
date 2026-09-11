import { describe, expect, it } from 'vitest'
import { flashcardSeeds } from '../data/cards'
import type { FlashcardRecord } from '../types'
import { initialDueSeedIds, isUnreviewedSeedCard, mergeSeedCard, seedCards } from './seed'

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

  it('treats reviewed seed cards as reviewed', () => {
    expect(isUnreviewedSeedCard(card({ lastRating: 'good', intervalDays: 0 }))).toBe(false)
  })

  it('adopts the new first-day schedule for never-reviewed seed cards', () => {
    const merged = mergeSeedCard(
      card({
        id: 'c-01',
        nextReviewAt: '2026-09-08',
        intervalDays: 0,
        easeStreak: 0,
        lapses: 0,
      }),
      card({
        id: 'c-01',
        front: 'new front',
        nextReviewAt: '2026-09-10',
        intervalDays: 0,
      }),
    )
    expect(merged.nextReviewAt).toBe('2026-09-10')
  })

  it('seeds 12 due cards from 선사·삼국, not the opening 광종 cluster', () => {
    const today = '2026-09-08'
    const seeded = seedCards(today)
    const due = seeded.filter((item) => item.nextReviewAt <= today)
    const dueIds = initialDueSeedIds()
    expect(due).toHaveLength(12)
    expect(due.every((item) => dueIds.has(item.id))).toBe(true)
    expect(due.every((item) => item.era === 'prehistoric' || item.era === 'three-kingdoms')).toBe(
      true,
    )
    expect(due.some((item) => item.id === 'c-01')).toBe(false)
    expect(due.some((item) => item.id === 'c-16')).toBe(true)
    expect(due.some((item) => item.id === 'c-44')).toBe(false)
    expect(seeded.filter((item) => item.nextReviewAt > today)).toHaveLength(flashcardSeeds.length - 12)
  })
})
