import { describe, expect, it } from 'vitest'
import { pickDueCardsForToday, planDailyQuantity } from './studyPlan'

const lesson = { estimatedMinutes: 25, title: '고려 광종과 성종' }

describe('planDailyQuantity', () => {
  it('keeps selected counts at the requested caps and does not shrink them for time', () => {
    const plan = planDailyQuantity({
      dailyMinutes: 30,
      dailyQuestionCap: 15,
      dailyCardCap: 10,
      dueCardCount: 10,
      lesson,
    })
    expect(plan.selectedCardCount).toBe(10)
    expect(plan.selectedQuestionCount).toBe(15)
    expect(plan.fitsDailyMinutes).toBe(true)
    expect(plan.estimateKind).toBe('heuristic')
    expect(plan.guidance).toContain('개념')
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
  it('keeps learned eras and sorts by due date then current lesson era', () => {
    const picked = pickDueCardsForToday(
      [
        { id: 'c-goryeo', era: 'goryeo', nextReviewAt: '2026-09-07' },
        { id: 'c-pre-b', era: 'prehistoric', nextReviewAt: '2026-09-08' },
        { id: 'c-pre-a', era: 'prehistoric', nextReviewAt: '2026-09-08' },
        { id: 'c-modern', era: 'modern', nextReviewAt: '2026-09-06' },
      ],
      'prehistoric',
      3,
      ['prehistoric', 'goryeo'],
    )
    expect(picked.map((card) => card.id)).toEqual(['c-goryeo', 'c-pre-a', 'c-pre-b'])
  })

  it('does not include unseen eras in automatic review', () => {
    const picked = pickDueCardsForToday(
      [{ id: 'c-modern', era: 'modern', nextReviewAt: '2026-09-06' }],
      'prehistoric',
      5,
      ['prehistoric'],
    )
    expect(picked).toEqual([])
  })
})
