import { describe, expect, it } from 'vitest'
import { computeExamPressure } from './examPressure'
import { lessons } from '../data/lessons'
import { defaultSettings } from '../data/defaults'

describe('computeExamPressure', () => {
  it('응시일 미정도 실패하지 않는다', () => {
    const pressure = computeExamPressure({
      today: '2026-09-10',
      settings: { ...defaultSettings(), examDate: null },
      lessons,
      completedLessonIds: [],
    })
    expect(pressure.examDate).toBeNull()
    expect(pressure.message).toMatch(/미정/)
  })
})
