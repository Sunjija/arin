import { describe, expect, it } from 'vitest'
import {
  difficultyDistribution,
  questions,
  validateQuestionBank,
} from '../data/questions'
import { flashcardSeeds } from './cards'
import { lessons } from './lessons'

describe('question bank quality', () => {
  it('has at least 80 items with 5 choices and valid answers', () => {
    expect(questions.length).toBeGreaterThanOrEqual(80)
    expect(validateQuestionBank()).toEqual([])
  })

  it('keeps roughly 심화 1:2:3 point mix (~20/60/20)', () => {
    const d = difficultyDistribution()
    const total = d[1] + d[2] + d[3]
    expect(d[1] / total).toBeGreaterThan(0.15)
    expect(d[1] / total).toBeLessThan(0.3)
    expect(d[2] / total).toBeGreaterThan(0.5)
    expect(d[3] / total).toBeGreaterThan(0.15)
    expect(d[3] / total).toBeLessThan(0.3)
  })

  it('covers all major eras at least once', () => {
    const eras = new Set(questions.map((q) => q.era))
    for (const era of [
      'prehistoric',
      'three-kingdoms',
      'north-south',
      'goryeo',
      'joseon-early',
      'joseon-late',
      'opening',
      'colonial',
      'modern',
      'culture',
    ]) {
      expect(eras.has(era as never)).toBe(true)
    }
  })

  it('includes many source/chronology/king items for 변별력', () => {
    const tags = questions.flatMap((q) => q.tags)
    expect(tags.filter((t) => t === 'chronology').length).toBeGreaterThanOrEqual(8)
    expect(tags.filter((t) => t === 'king-figure').length).toBeGreaterThanOrEqual(10)
    expect(tags.filter((t) => t === 'source').length).toBeGreaterThanOrEqual(10)
  })

  it('distributes correct answers evenly across all five positions', () => {
    const counts = Array.from({ length: 5 }, () => 0)
    questions.forEach((question) => {
      counts[question.answerIndex] += 1
    })
    expect(counts).toEqual([20, 20, 20, 20, 20])
  })

  it('connects every question to a lesson from the same era', () => {
    const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]))
    questions.forEach((question) => {
      const lesson = question.lessonId ? lessonById.get(question.lessonId) : undefined
      expect(lesson, `${question.id} lesson`).toBeDefined()
      expect(lesson?.era, `${question.id} era`).toBe(question.era)
    })
  })

  it('keeps corrected historical wording in critical content', () => {
    const q49 = questions.find((question) => question.id === 'q-49')
    const q81 = questions.find((question) => question.id === 'q-81')
    const q100 = questions.find((question) => question.id === 'q-100')
    const c91 = flashcardSeeds.find((card) => card.id === 'c-91')

    expect(q49?.passage).toContain('현존')
    expect(q49?.passage).not.toContain('세계 최초')
    expect(q81?.choices[q81.answerIndex]).toContain('녹읍을 폐지')
    expect(q100?.choices[q100.answerIndex]).toContain('7월 17일')
    expect(c91?.back).not.toContain('한국전쟁 종료')
    expect(c91?.back).toContain('정전 체제')
  })
})
