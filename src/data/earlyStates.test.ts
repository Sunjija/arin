import { describe, expect, it } from 'vitest'
import { guideForLesson, lessonGuides } from './lessonGuides'
import { getQuestionById, questions, validateQuestionBank } from './questions'
import { catalogConcepts } from '../lib/conceptCatalog'
import { buildConceptSchedule } from '../lib/conceptSchedule'
import { defaultSettings } from './defaults'
import { toLearningGoal } from '../lib/settingsNormalize'

describe('t-pre-06 early states content batch', () => {
  it('adds one lesson-01 guide section for t-pre-06 without splitting catalog IDs', () => {
    const guide = guideForLesson('lesson-01')
    expect(guide?.contentVersion).toBeGreaterThanOrEqual(4)
    expect(guide?.reviewStatus).toBe('source-checked')
    expect(guide?.reviewStatus).not.toBe('approved')
    const sections = guide?.sections ?? []
    expect(sections.map((section) => section.conceptId)).toEqual([
      't-pre-01',
      't-pre-02',
      't-pre-07',
      't-pre-03',
      't-pre-04',
      't-pre-05',
      't-pre-08',
      't-pre-06',
    ])
    const early = sections.find((section) => section.conceptId === 't-pre-06')
    expect(early?.paragraphs.length).toBeGreaterThanOrEqual(2)
    expect(early?.recallPrompt.length).toBeGreaterThan(10)
    expect(early?.expectedElements.length).toBeGreaterThanOrEqual(4)
    expect(early?.sourceUrl.startsWith('https://')).toBe(true)
    expect(early?.paragraphs.join(' ')).toMatch(/사출도/)
    expect(early?.paragraphs.join(' ')).toMatch(/영고/)
    expect(early?.paragraphs.join(' ')).toMatch(/민며느리/)
    expect(early?.paragraphs.join(' ')).toMatch(/책화/)
    expect(early?.paragraphs.join(' ')).toMatch(/천군/)
    expect(early?.paragraphs.join(' ')).toMatch(/소도/)
  })

  it('reserves q-103 and q-104 as distinct t-pre-06 check families', () => {
    expect(validateQuestionBank()).toEqual([])
    const q103 = getQuestionById('q-103')
    const q104 = getQuestionById('q-104')
    expect(q103?.lessonId).toBe('lesson-01')
    expect(q104?.lessonId).toBe('lesson-01')
    expect(q103?.conceptIds).toEqual(['t-pre-06'])
    expect(q104?.conceptIds).toEqual(['t-pre-06'])
    expect(q103?.choices).toHaveLength(5)
    expect(q104?.choices).toHaveLength(5)
    expect(q103?.familyId).toBe('pre-early-polity-match')
    expect(q104?.familyId).toBe('pre-early-states-compare')
    expect(q103?.familyId).not.toBe(q104?.familyId)
    expect(q103?.contentVersion).toBeGreaterThanOrEqual(1)
    expect(q104?.contentVersion).toBeGreaterThanOrEqual(1)
    expect(q103?.sourceUrl.startsWith('https://')).toBe(true)
    expect(q104?.sourceUrl.startsWith('https://')).toBe(true)
    expect(q104?.passage).toMatch(/학습용 재구성/)
    expect(q104?.passage).not.toMatch(/역사적 인용|사료 원문/)
    for (const choice of q103?.choices ?? []) {
      expect(q103?.explanation).toContain(`「${choice}」`)
    }
    for (const choice of q104?.choices ?? []) {
      expect(q104?.explanation).toContain(`「${choice}」`)
    }
    expect(questions.filter((question) => question.conceptIds?.includes('t-pre-06')).map((q) => q.id)).toEqual([
      'q-103',
      'q-104',
    ])
  })

  it('keeps eight lesson-01 concepts ready while the published course reaches t-tk-03', () => {
    const concepts = catalogConcepts()
    const goal = toLearningGoal({
      ...defaultSettings(),
      startDate: '2026-09-11',
      conceptTargetDate: '2026-09-24',
      studyWeekdays: [0, 1, 2, 3, 4, 5, 6],
    })
    const schedule = buildConceptSchedule({ today: '2026-09-11', goal, concepts, progress: [] })
    expect(lessonGuides[0]?.sections).toHaveLength(8)
    expect(schedule.unavailableConcepts).toBe(77)
    const readyIds = concepts.filter((concept) => concept.summary.trim() && concept.source).map((c) => c.id)
    expect(readyIds).toHaveLength(11)
    expect(new Set(readyIds)).toEqual(
      new Set(['t-pre-01', 't-pre-02', 't-pre-07', 't-pre-03', 't-pre-04', 't-pre-05', 't-pre-08', 't-pre-06', 't-tk-01', 't-tk-02', 't-tk-03']),
    )
    expect(schedule.blockedConceptId).toBe('t-tk-04')
  })
})
