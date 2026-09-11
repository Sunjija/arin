import { describe, expect, it } from 'vitest'
import { COURSE_CONCEPT_IDS } from '../data/courseOrder'
import { catalogConcepts } from './conceptCatalog'
import { buildConceptSchedule, orderedConcepts } from './conceptSchedule'
import { defaultSettings } from '../data/defaults'
import { toLearningGoal } from './settingsNormalize'
import { emptyConceptProgress } from './conceptProgress'
import type { LearningGoal } from '../types'

const concepts = catalogConcepts()
const goal = toLearningGoal({ ...defaultSettings(), startDate: '2026-09-11', conceptTargetDate: '2026-09-24', studyWeekdays: [0,1,2,3,4,5,6] })
const plan = (changes: Partial<LearningGoal> = {}, today = '2026-09-11') => buildConceptSchedule({ today, goal: { ...goal, ...changes }, concepts, progress: [] })

describe('concept-based course pacing', () => {
  it('covers every stable catalog ID once and interleaves culture in the course', () => {
    expect(new Set(COURSE_CONCEPT_IDS).size).toBe(COURSE_CONCEPT_IDS.length)
    expect([...COURSE_CONCEPT_IDS].sort()).toEqual(concepts.map(item => item.id).sort())
    expect(orderedConcepts([...concepts].reverse()).slice(0, 8).map(item => item.id)).toEqual(['t-pre-01','t-pre-02','t-pre-07','t-pre-03','t-pre-04','t-pre-05','t-pre-08','t-pre-06'])
    expect(COURSE_CONCEPT_IDS.indexOf('t-cu-02')).toBeLessThan(COURSE_CONCEPT_IDS.indexOf('t-je-01'))
    expect(COURSE_CONCEPT_IDS.indexOf('t-je-05')).toBeLessThan(COURSE_CONCEPT_IDS.indexOf('t-je-01'))
  })
  it('counts actual study days, recommends seven concepts, and caps today at ready content', () => {
    const result = plan()
    expect(result.studyDaysLeft).toBe(14)
    expect(result.recommendedPerDay).toBe(7)
    expect(result.availableTodayIds).toHaveLength(7)
    expect(result.unavailableConcepts).toBe(81)
    expect(result.allContentReadyFinishDate).toBeNull()
  })
  it('applies a manual concept limit even if the target requires more', () => {
    const result = plan({ paceMode: 'manual', dailyNewConceptCount: 1 })
    expect(result.availableTodayIds).toEqual(['t-pre-01'])
    expect(result.warnings.some(message => message.includes('7개가 필요'))).toBe(true)
  })
  it('leaves fourteen full days for final review by default', () => {
    const result = plan({ conceptTargetDate: null, examDate: '2026-10-24', examDateUndecided: false })
    expect(result.targetDate).toBe('2026-10-09')
  })
  it('does not start new concepts on a rest day or before the start date', () => {
    expect(plan({ studyWeekdays: [1,2,3,4,5] }, '2026-09-12').availableTodayIds).toEqual([])
    expect(plan({ startDate: '2026-09-14' }).availableTodayIds).toEqual([])
    expect(plan({ startDate: '2026-09-14' }).studyDaysLeft).toBe(11)
  })
  it('never skips an unavailable concept to reach a later ready concept', () => {
    const altered = concepts.map(item => item.id === 't-pre-02' ? { ...item, summary: '' } : item)
    const result = buildConceptSchedule({ today: '2026-09-11', goal, concepts: altered, progress: [] })
    expect(result.availableTodayIds).toEqual(['t-pre-01'])
    expect(result.blockedConceptId).toBe('t-pre-02')
  })
  it('continues at the first unfinished concept without counting mere views or attempts', () => {
    const result = buildConceptSchedule({ today: '2026-09-11', goal: { ...goal, paceMode: 'manual', dailyNewConceptCount: 1 }, concepts, progress: [{ ...emptyConceptProgress('t-pre-01'), learnState: 'completed' }, { ...emptyConceptProgress('t-pre-02'), learnState: 'learning' }] })
    expect(result.completedConcepts).toBe(1)
    expect(result.availableTodayIds).toEqual(['t-pre-02'])
  })
  it('reports impossible pace or expired deadlines without inventing a finish date', () => {
    expect(plan({ conceptTargetDate: '2026-09-11' }).selectedPerDay).toBe(20)
    expect(plan({ conceptTargetDate: '2026-09-10' }).recommendedPerDay).toBeNull()
    expect(plan({ conceptTargetDate: '2026-09-10' }).warnings.some(message => message.includes('남은 학습일이 없습니다'))).toBe(true)
  })
})
