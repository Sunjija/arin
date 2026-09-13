import { describe, expect, it } from 'vitest'
import { guideForLesson, lessonGuides } from './lessonGuides'
import { getQuestionById, questions, validateQuestionBank } from './questions'
import { catalogConcepts } from '../lib/conceptCatalog'

const NEW_IDS = ['q-105', 'q-106', 'q-107', 'q-108', 'q-109', 'q-110'] as const

describe('P2 three kingdoms early batch (t-tk-01..03)', () => {
  it('adds lesson-02 guides for t-tk-01 and t-tk-03 without rewriting lesson-01', () => {
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
    expect(lesson02?.reviewStatus).toBe('source-checked')
    expect(lesson02?.reviewStatus).not.toBe('approved')
    expect(lesson02?.contentVersion).toBeGreaterThanOrEqual(1)
    expect(lesson02?.sections.filter((section) => ['t-tk-01', 't-tk-03'].includes(section.conceptId)).map((section) => section.conceptId)).toEqual(['t-tk-01', 't-tk-03'])

    const goguryeo = lesson02?.sections.find((section) => section.conceptId === 't-tk-01')
    expect(goguryeo?.paragraphs.join(' ')).toMatch(/소수림/)
    expect(goguryeo?.paragraphs.join(' ')).toMatch(/광개토/)
    expect(goguryeo?.paragraphs.join(' ')).toMatch(/장수/)
    expect(goguryeo?.paragraphs.join(' ')).toMatch(/평양/)
    expect(goguryeo?.expectedElements.length).toBeGreaterThanOrEqual(3)
    expect(goguryeo?.sourceUrl.startsWith('https://')).toBe(true)

    const silla = lesson02?.sections.find((section) => section.conceptId === 't-tk-03')
    expect(silla?.paragraphs.join(' ')).toMatch(/법흥/)
    expect(silla?.paragraphs.join(' ')).toMatch(/이차돈/)
    expect(silla?.paragraphs.join(' ')).toMatch(/진흥/)
    expect(silla?.sourceUrl.startsWith('https://')).toBe(true)
  })

  it('adds lesson-13 guide for t-tk-02 with careful Mahan wording', () => {
    const lesson13 = guideForLesson('lesson-13')
    expect(lesson13?.reviewStatus).toBe('source-checked')
    expect(lesson13?.reviewStatus).not.toBe('approved')
    expect(lesson13?.sections.filter((section) => section.conceptId === 't-tk-02').map((section) => section.conceptId)).toEqual(['t-tk-02'])
    const baekje = lesson13?.sections[0]
    expect(baekje?.paragraphs.join(' ')).toMatch(/근초고/)
    expect(baekje?.paragraphs.join(' ')).toMatch(/문주/)
    expect(baekje?.paragraphs.join(' ')).toMatch(/웅진/)
    expect(baekje?.paragraphs.join(' ')).toMatch(/성왕/)
    expect(baekje?.paragraphs.join(' ')).toMatch(/사비/)
    expect(baekje?.paragraphs.join(' ')).toMatch(/단정하지/)
    expect(baekje?.paragraphs.join(' ')).not.toMatch(/마한 전체를 한 시점에 완전히 통합/)
    expect(baekje?.sourceUrl.startsWith('https://')).toBe(true)
    expect(lessonGuides.map((guide) => guide.lessonId)).toEqual(['lesson-01', 'lesson-02', 'lesson-13'])
  })

  it('reserves q-105~q-110 with distinct families, lessons, and concept links', () => {
    expect(validateQuestionBank()).toEqual([])
    const byId = Object.fromEntries(NEW_IDS.map((id) => [id, getQuestionById(id)]))

    expect(byId['q-105']?.lessonId).toBe('lesson-02')
    expect(byId['q-106']?.lessonId).toBe('lesson-02')
    expect(byId['q-107']?.lessonId).toBe('lesson-13')
    expect(byId['q-108']?.lessonId).toBe('lesson-13')
    expect(byId['q-109']?.lessonId).toBe('lesson-02')
    expect(byId['q-110']?.lessonId).toBe('lesson-02')

    expect(byId['q-105']?.conceptIds).toEqual(['t-tk-01'])
    expect(byId['q-106']?.conceptIds).toEqual(['t-tk-01'])
    expect(byId['q-107']?.conceptIds).toEqual(['t-tk-02'])
    expect(byId['q-108']?.conceptIds).toEqual(['t-tk-02'])
    expect(byId['q-109']?.conceptIds).toEqual(['t-tk-03'])
    expect(byId['q-110']?.conceptIds).toEqual(['t-tk-03'])

    const families = NEW_IDS.map((id) => byId[id]?.familyId)
    expect(new Set(families).size).toBe(6)

    expect(byId['q-105']?.familyId).toBe('tk-goguryeo-sosurim-reform')
    expect(byId['q-106']?.familyId).toBe('tk-goguryeo-king-wrong-match')
    expect(byId['q-107']?.familyId).toBe('tk-baekje-ungjin-trigger')
    expect(byId['q-108']?.familyId).toBe('tk-baekje-capital-move-context')
    expect(byId['q-109']?.familyId).toBe('tk-silla-ichadon-beopheung')
    expect(byId['q-110']?.familyId).toBe('tk-silla-beopheung-linked-reform')

    expect(byId['q-107']?.passage).toMatch(/학습용 재구성/)
    expect(byId['q-108']?.passage).toMatch(/학습용 재구성/)
    expect(byId['q-109']?.passage).toMatch(/학습용 재구성/)

    for (const id of NEW_IDS) {
      const question = byId[id]
      expect(question?.choices).toHaveLength(5)
      expect(question?.contentVersion).toBeGreaterThanOrEqual(1)
      expect(question?.sourceUrl?.startsWith('https://')).toBe(true)
      for (const choice of question?.choices ?? []) {
        expect(question?.explanation.replace(/[.!?](?=」)/g, '')).toContain(`「${choice.replace(/[.!?]$/, '')}」`)
      }
    }

    expect(questions.filter((question) => question.conceptIds?.includes('t-tk-01')).map((q) => q.id)).toEqual([
      'q-105',
      'q-106',
    ])
    expect(questions.filter((question) => question.conceptIds?.includes('t-tk-02')).map((q) => q.id)).toEqual([
      'q-107',
      'q-108',
    ])
    expect(questions.filter((question) => question.conceptIds?.includes('t-tk-03')).map((q) => q.id)).toEqual([
      'q-109',
      'q-110',
    ])
    expect(questions.some((question) => NEW_IDS.includes(question.id as (typeof NEW_IDS)[number]) && !question.conceptIds?.length)).toBe(
      false,
    )
  })

  it('does not reuse the same answer-clue pairs as existing benchmark items q-05~q-07', () => {
    const q105 = getQuestionById('q-105')
    const q106 = getQuestionById('q-106')
    const q109 = getQuestionById('q-109')
    const q110 = getQuestionById('q-110')
    expect(q105?.stem).not.toMatch(/일어난 순서대로/)
    expect(q106?.formatId).toBe('wrong-statement')
    expect(q109?.passage).toMatch(/순교|처형/)
    expect(q110?.stem).toMatch(/다른 체제 정비/)
    expect(q105?.familyId).not.toBe(getQuestionById('q-05')?.familyId)
  })

  it('marks the three concepts ready via guide summaries without changing catalog IDs', () => {
    const concepts = catalogConcepts()
    for (const id of ['t-tk-01', 't-tk-02', 't-tk-03'] as const) {
      const concept = concepts.find((item) => item.id === id)
      expect(concept?.summary.trim().length).toBeGreaterThan(40)
      expect(concept?.source.startsWith('https://')).toBe(true)
    }
    expect(concepts.filter((concept) => concept.summary.trim() && concept.source).map((c) => c.id)).toEqual(
      expect.arrayContaining(['t-tk-01', 't-tk-02', 't-tk-03', 't-pre-06']),
    )
  })
})
