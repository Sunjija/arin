import { describe, expect, it } from 'vitest'
import { practiceTrend } from './practiceTrend'
import type { AttemptRecord } from '../types'
function attempt(date: string, correct: boolean, source: 'practice' | 'mock' = 'practice'): AttemptRecord {
  return { id: `${date}-${correct}`, questionId: 'q1', correct, selectedIndex: 0, responseMs: 1000, era: 'prehistoric', tags: [], createdAt: `${date}T12:00:00`, source }
}
describe('practiceTrend', () => {
  it('excludes mock, older and future attempts and keeps the numerator', () => {
    const trend = practiceTrend([attempt('2026-09-09', true), attempt('2026-09-03', false), attempt('2026-09-09', false, 'mock'), attempt('2026-09-02', true), attempt('2026-09-10', true)], 7, '2026-09-09')
    expect(trend.total).toBe(2); expect(trend.correct).toBe(1); expect(trend.accuracy).toBe(50)
    expect(trend.difference).toBe(-50)
  })
  it('distinguishes a zero score from no records', () => {
    const trend = practiceTrend([attempt('2026-09-09', false)], 7, '2026-09-09')
    expect(trend.buckets[0].accuracy).toBeNull()
    expect(trend.buckets[6].accuracy).toBe(0)
    expect(trend.difference).toBeNull()
  })
  it('includes every day once in six five-day buckets for a month', () => {
    const trend = practiceTrend([attempt('2026-08-11', true), attempt('2026-08-15', false), attempt('2026-08-16', true), attempt('2026-09-09', true)], 30, '2026-09-09')
    expect(trend.buckets).toHaveLength(6)
    expect(trend.buckets.map(b => b.total)).toEqual([2, 1, 0, 0, 0, 1])
    expect(trend.buckets.reduce((sum,b) => sum+b.total,0)).toBe(trend.total)
  })
})
