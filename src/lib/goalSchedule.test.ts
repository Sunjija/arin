import { describe, expect, it } from 'vitest'
import {
  classifyExamDate,
  countMissedStudyDays,
  nextStudyDate,
  projectConceptFinishDate,
  remainingVolumeWarning,
} from './goalSchedule'

describe('goal schedule', () => {
  it('does not skip unfinished lessons after three missed study days', () => {
    const missed = countMissedStudyDays({
      today: '2026-09-11',
      startDate: '2026-09-01',
      lastStudyDate: '2026-09-07',
      studyWeekdays: [0, 1, 2, 3, 4, 5, 6],
    })
    expect(missed).toBe(3)
  })

  it('classifies exam dates and warns when remaining volume does not fit', () => {
    expect(classifyExamDate(null, true, '2026-09-11')).toBe('undecided')
    expect(classifyExamDate('2026-09-01', false, '2026-09-11')).toBe('past')
    expect(classifyExamDate('2026-12-01', false, '2026-09-11')).toBe('scheduled')
    const finish = projectConceptFinishDate({
      today: '2026-09-11',
      remainingLessonCount: 18,
      dailyNewLessons: 1,
      studyWeekdays: [1, 2, 3, 4, 5],
    })
    expect(finish).toBeTruthy()
    const warning = remainingVolumeWarning({
      remainingLessonCount: 18,
      conceptFinishDate: '2026-10-10',
      examDate: '2026-09-20',
      reviewPeriodStart: '2026-09-06',
      examDateMode: 'scheduled',
    })
    expect(warning).toContain('남은 단원 18개')
  })

  it('finds the next weekday after a gap', () => {
    expect(nextStudyDate('2026-09-11', [1, 2, 3, 4, 5])).toBe('2026-09-14')
  })
})
