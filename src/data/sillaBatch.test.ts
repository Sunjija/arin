import { describe, expect, it } from 'vitest'
import { guideForLesson, lessonGuides } from './lessonGuides'
import { getQuestionById, questions, validateQuestionBank } from './questions'
import { catalogConcepts } from '../lib/conceptCatalog'

const NEW_IDS = ['q-111', 'q-112', 'q-113', 'q-114', 'q-115', 'q-116'] as const
const PRIOR_IDS = ['q-105', 'q-106', 'q-107', 'q-108', 'q-109', 'q-110'] as const

describe('P2 Silla growth and institutions batch (t-tk-04..06)', () => {
  it('keeps lesson-01 and prior lesson-02/13 sections while adding new concepts at guide v4', () => {
    const lesson01 = guideForLesson('lesson-01')
    expect(lesson01?.contentVersion).toBe(5)
    expect(lesson01?.sections.map((section) => section.conceptId)).toEqual([
      't-pre-01',
      't-pre-02',
      't-pre-07',
      't-pre-03',
      't-pre-04',
      't-pre-05',
      't-pre-08',
      't-pre-06',
    ])

    const lesson02 = guideForLesson('lesson-02')
    expect(lesson02?.contentVersion).toBe(4)
    expect(lesson02?.reviewStatus).toBe('source-checked')
    expect(lesson02?.reviewStatus).not.toBe('approved')
    expect(lesson02?.sections.map((section) => section.conceptId)).toEqual([
      't-tk-01',
      't-tk-03',
      't-tk-05',
      't-tk-06',
    ])
    expect(lesson02?.sections.find((section) => section.conceptId === 't-tk-01')?.paragraphs.join(' ')).toMatch(
      /소수림/,
    )
    expect(lesson02?.sections.find((section) => section.conceptId === 't-tk-03')?.paragraphs.join(' ')).toMatch(
      /이차돈/,
    )

    const golpum = lesson02?.sections.find((section) => section.conceptId === 't-tk-05')
    expect(golpum?.paragraphs.join(' ')).toMatch(/진골/)
    expect(golpum?.paragraphs.join(' ')).toMatch(/6두품|아찬/)
    expect(golpum?.paragraphs.join(' ')).toMatch(/중위/)
    expect(golpum?.paragraphs.join(' ')).toMatch(/모든 왕대/)
    expect(golpum?.sourceUrl.startsWith('https://')).toBe(true)

    const institutions = lesson02?.sections.find((section) => section.conceptId === 't-tk-06')
    expect(institutions?.paragraphs.join(' ')).toMatch(/화랑/)
    expect(institutions?.paragraphs.join(' ')).toMatch(/병부/)
    expect(institutions?.paragraphs.join(' ')).toMatch(/상대등/)
    expect(institutions?.paragraphs.join(' ')).toMatch(/정규 군부대|관청/)
    expect(institutions?.paragraphs.join(' ')).toMatch(/총리/)
    expect(institutions?.sourceUrl.startsWith('https://')).toBe(true)

    const lesson13 = guideForLesson('lesson-13')
    expect(lesson13?.contentVersion).toBe(4)
    expect(lesson13?.reviewStatus).toBe('source-checked')
    expect(lesson13?.sections.map((section) => section.conceptId)).toEqual(['t-tk-02', 't-tk-04'])
    expect(lesson13?.sections[0]?.paragraphs.join(' ')).toMatch(/근초고/)
    expect(lesson13?.sections[0]?.paragraphs.join(' ')).toMatch(/단정하지/)

    const jinheung = lesson13?.sections.find((section) => section.conceptId === 't-tk-04')
    expect(jinheung?.paragraphs.join(' ')).toMatch(/한강/)
    expect(jinheung?.paragraphs.join(' ')).toMatch(/순수/)
    expect(jinheung?.paragraphs.join(' ')).toMatch(/적성/)
    expect(jinheung?.paragraphs.join(' ')).toMatch(/법흥/)
    expect(jinheung?.paragraphs.join(' ')).toMatch(/경제력|교류/)
    expect(jinheung?.sourceUrl.startsWith('https://')).toBe(true)

    expect(lessonGuides.map((guide) => guide.lessonId)).toEqual(['lesson-01', 'lesson-02', 'lesson-13'])
  })

  it('reserves q-111~q-116 with distinct families, lessons, and concept links', () => {
    expect(validateQuestionBank()).toEqual([])
    const byId = Object.fromEntries(NEW_IDS.map((id) => [id, getQuestionById(id)]))

    expect(byId['q-111']?.lessonId).toBe('lesson-13')
    expect(byId['q-112']?.lessonId).toBe('lesson-13')
    expect(byId['q-113']?.lessonId).toBe('lesson-02')
    expect(byId['q-114']?.lessonId).toBe('lesson-02')
    expect(byId['q-115']?.lessonId).toBe('lesson-02')
    expect(byId['q-116']?.lessonId).toBe('lesson-02')

    expect(byId['q-111']?.conceptIds).toEqual(['t-tk-04'])
    expect(byId['q-112']?.conceptIds).toEqual(['t-tk-04'])
    expect(byId['q-113']?.conceptIds).toEqual(['t-tk-05'])
    expect(byId['q-114']?.conceptIds).toEqual(['t-tk-05'])
    expect(byId['q-115']?.conceptIds).toEqual(['t-tk-06'])
    expect(byId['q-116']?.conceptIds).toEqual(['t-tk-06'])

    const families = NEW_IDS.map((id) => byId[id]?.familyId)
    expect(new Set(families).size).toBe(6)
    expect(byId['q-111']?.familyId).toBe('tk-silla-hanriver-consequences')
    expect(byId['q-112']?.familyId).toBe('tk-silla-sunsubi-jeokseongbi')
    expect(byId['q-113']?.familyId).toBe('tk-silla-golpum-achan-limit')
    expect(byId['q-114']?.familyId).toBe('tk-silla-golpum-life-interpretation')
    expect(byId['q-115']?.familyId).toBe('tk-silla-hwarang-training-identify')
    expect(byId['q-116']?.familyId).toBe('tk-silla-institutions-king-function')

    expect(byId['q-111']?.formatId).not.toBe('map-region')
    expect(byId['q-112']?.formatId).not.toBe('map-region')
    expect(byId['q-112']?.passage).toMatch(/학습용 재구성/)
    expect(byId['q-116']?.passage).toMatch(/학습용 재구성/)

    for (const id of NEW_IDS) {
      const question = byId[id]
      expect(question?.choices).toHaveLength(5)
      expect(question?.contentVersion).toBeGreaterThanOrEqual(1)
      expect(question?.sourceUrl?.startsWith('https://')).toBe(true)
      expect(question?.explanation.length).toBeGreaterThan(80)
      // The report separately reviews each distractor; substring matches cannot verify its rationale.
    }

    expect(questions.filter((question) => question.conceptIds?.includes('t-tk-04')).map((q) => q.id)).toEqual([
      'q-111',
      'q-112',
    ])
    expect(questions.filter((question) => question.conceptIds?.includes('t-tk-05')).map((q) => q.id)).toEqual([
      'q-113',
      'q-114',
    ])
    expect(questions.filter((question) => question.conceptIds?.includes('t-tk-06')).map((q) => q.id)).toEqual([
      'q-115',
      'q-116',
    ])
  })

  it('keeps prior IDs and distinguishes the new assessment types', () => {
    for (const id of PRIOR_IDS) {
      const question = getQuestionById(id)
      expect(question).toBeTruthy()
      expect(question?.conceptIds?.[0]).toMatch(/^t-tk-0[123]$/)
    }

    const q04 = getQuestionById('q-04')
    const q07 = getQuestionById('q-07')
    const q110 = getQuestionById('q-110')
    const q111 = getQuestionById('q-111')
    const q112 = getQuestionById('q-112')
    const q113 = getQuestionById('q-113')
    const q114 = getQuestionById('q-114')
    const q115 = getQuestionById('q-115')
    const q116 = getQuestionById('q-116')

    expect(q111?.formatId).toBe('cause-effect')
    expect(q111?.stem).not.toBe(q04?.stem)
    expect(q111?.familyId).not.toBe(q110?.familyId)
    expect(q112?.stem).toMatch(/비석/)
    expect(q112?.passage).toMatch(/적성|순수|표창/)
    expect(q113?.stem).toMatch(/6두품/)
    expect(q114?.formatId).toBe('source-what')
    expect(q114?.passage).toMatch(/가옥|방의 크기/)
    expect(q115?.passage).toMatch(/청소년/)
    expect(q116?.passage).toMatch(/\(가\).*\(나\)/s)
    expect(q07?.choices.some((choice) => /법흥왕 때 불교/.test(choice))).toBe(true)
    expect(q111?.choices.some((choice) => choice.includes('중국과의 교류'))).toBe(true)
    expect(q111?.stem).not.toBe(q07?.stem)
  })

  it('marks the three concepts ready via guide summaries without changing catalog IDs', () => {
    const concepts = catalogConcepts()
    for (const id of ['t-tk-04', 't-tk-05', 't-tk-06'] as const) {
      const concept = concepts.find((item) => item.id === id)
      expect(concept?.summary.trim().length).toBeGreaterThan(40)
      expect(concept?.source.startsWith('https://')).toBe(true)
    }
    expect(concepts.filter((concept) => concept.summary.trim() && concept.source).map((c) => c.id)).toEqual(
      expect.arrayContaining(['t-tk-01', 't-tk-02', 't-tk-03', 't-tk-04', 't-tk-05', 't-tk-06']),
    )
  })
})
