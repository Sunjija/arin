import { describe, expect, it } from 'vitest'
import { planDailyQuantity } from './studyPlan'

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
