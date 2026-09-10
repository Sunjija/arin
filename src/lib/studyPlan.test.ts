import { describe, expect, it } from 'vitest'
import { pickDueCardsForToday, planDailyQuantity } from './studyPlan'

const lesson = { estimatedMinutes: 25, title: '고려 광종과 성종' }

describe('planDailyQuantity', () => {
  it('keeps selected counts at the requested caps when time allows', () => {
    const plan = planDailyQuantity({
      dailyMinutes: 120,
      dailyQuestionCap: 15,
      dailyCardCap: 10,
      dueCardCount: 10,
      lesson,
    })
    expect(plan.selectedCardCount).toBe(10)
    expect(plan.selectedQuestionCount).toBe(15)
    expect(plan.fitsDailyMinutes).toBe(true)
    expect(plan.guidance).toBeNull()
  })

  it('reduces questions before cards and never zeroes concept time', () => {
    const plan = planDailyQuantity({
      dailyMinutes: 30,
      dailyQuestionCap: 15,
      dailyCardCap: 10,
      dueCardCount: 10,
      lesson,
    })
    expect(plan.selectedQuestionCount).toBeLessThan(15)
    expect(plan.estimatedMinutes).toBeGreaterThanOrEqual(lesson.estimatedMinutes)
    expect(plan.overflowMinutes).toBeGreaterThan(0)
    expect(plan.fitsDailyMinutes).toBe(false)
    expect(plan.guidance).toContain('하루')
  })

  it('does not select more cards than are due', () => {
    const plan = planDailyQuantity({
      dailyMinutes: 120,
      dailyQuestionCap: 10,
      dailyCardCap: 15,
      dueCardCount: 2,
      lesson,
    })
    expect(plan.selectedCardCount).toBe(2)
  })
})

describe('pickDueCardsForToday', () => {
  it('puts today lesson era first, then date, then id', () => {
    const picked = pickDueCardsForToday(
      [
        { id: 'c-goryeo', era: 'goryeo', nextReviewAt: '2026-09-07' },
        { id: 'c-pre-b', era: 'prehistoric', nextReviewAt: '2026-09-08' },
        { id: 'c-pre-a', era: 'prehistoric', nextReviewAt: '2026-09-08' },
      ],
      'prehistoric',
      2,
    )
    expect(picked.map((card) => card.id)).toEqual(['c-pre-a', 'c-pre-b'])
  })

  it('still selects due cards when none belong to today lesson era', () => {
    const picked = pickDueCardsForToday(
      [
        { id: 'c-goryeo', era: 'goryeo', nextReviewAt: '2026-09-07' },
        { id: 'c-joseon', era: 'joseon-early', nextReviewAt: '2026-09-08' },
      ],
      'prehistoric',
      10,
    )
    expect(picked.map((card) => card.id)).toEqual(['c-goryeo', 'c-joseon'])
  })
})
