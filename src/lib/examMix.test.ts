import { describe, expect, it } from 'vitest'
import { questions } from '../data/questions'
import {
  assembleMockExam,
  describeMockPool,
  inventoryShortages,
  transitionNotice,
} from './examMix'
import { computeTargetMix } from '../data/officialExamAnalysis'
import { freezeQuestionSnapshot, pickMockQuestions } from './examScoring'
import { isHumanApproved } from './questionReview'
import type { Question } from '../types'

function q(
  id: string,
  difficulty: Question['difficulty'],
  era: Question['era'] = 'goryeo',
  extras: Partial<Question> = {},
): Question {
  return {
    id,
    stem: id,
    choices: ['a', 'b', 'c', 'd', 'e'],
    answerIndex: 0,
    explanation: '',
    era,
    tags: ['chronology'],
    difficulty,
    source: '자체 제작 학습문항',
    sourceUrl: '',
    license: '',
    imageRights: '',
    purpose: ['mock'],
    reviewStatus: 'draft',
    ...extras,
  }
}

function seededRandom(seed: number): () => number {
  let value = seed
  return () => {
    value = (value * 16807) % 2147483647
    return (value - 1) / 2147483646
  }
}

describe('mock assembly and review pools', () => {
  it('uses a transition pool instead of silently calling drafts approved', () => {
    const pool = describeMockPool(questions, 'full')
    expect(pool.policy).toBe('transition-unreviewed')
    expect(pool.approvedCount).toBe(0)
    expect(pool.mockCount).toBe(100)
    expect(questions.filter(isHumanApproved)).toHaveLength(0)
    expect(transitionNotice(pool)).toContain('검수 전 문항이 포함')
    expect(transitionNotice(pool)).toContain('개념 확인용 연습')
  })

  it('reports point shortages instead of padding when the bank is thin', () => {
    const pool = [
      ...Array.from({ length: 4 }, (_, i) => q(`e${i}`, 1)),
      ...Array.from({ length: 8 }, (_, i) => q(`m${i}`, 2)),
      ...Array.from({ length: 3 }, (_, i) => q(`h${i}`, 3)),
    ]
    const mix = computeTargetMix()
    const shortages = inventoryShortages(pool, 50, mix)
    expect(shortages.some((item) => item.dimension === 'count')).toBe(true)
    expect(shortages.some((item) => item.dimension === 'points-3')).toBe(true)
    const assembled = assembleMockExam(pool, 50, 'full', seededRandom(4))
    expect(assembled.questions).toHaveLength(15)
    expect(new Set(assembled.questions.map((item) => item.id)).size).toBe(15)
    expect(assembled.questions.every((item) => !item.id.includes('__pad'))).toBe(true)
    expect(assembled.shortages.some((item) => item.dimension === 'count')).toBe(true)
  })

  it('uses only approved items when 50 approved mock items exist', () => {
    const bank = Array.from({ length: 60 }, (_, i) =>
      q(`ok${i}`, ((i % 3) + 1) as 1 | 2 | 3, i % 2 === 0 ? 'goryeo' : 'colonial', {
        reviewStatus: 'approved',
        provenance: {
          origin: 'original',
          blueprintVersion: 'test',
          factSources: [],
          productionMethod: 'original-authored',
          authorId: 'tester',
          reviewAgent: 'human',
          reviewerId: 'reviewer-1',
          reviewedAt: '2026-09-10',
          rightsStatus: 'reconstructed-study',
          similarityAudit: { status: 'human-reviewed', reviewed: true },
        },
      }),
    )
    const pool = describeMockPool(bank, 'full')
    expect(pool.policy).toBe('approved-only')
    expect(pool.usedUnreviewed).toBe(false)
    const assembled = assembleMockExam(bank, 50, 'full', seededRandom(2))
    expect(assembled.questions).toHaveLength(50)
    expect(assembled.questions.every(isHumanApproved)).toBe(true)
  })

  it('does not shuffle chronology choices and keeps snapshot text after the live bank changes', () => {
    const live = q('seq', 3)
    live.choiceOrder = 'keep'
    live.choices = ['가→나→다', '나→가→다', '다→나→가', '가→다→나', '다→가→나']
    live.answerIndex = 2
    live.stem = '원문'
    live.explanation = '원문 해설'
    const snapshot = freezeQuestionSnapshot(live, seededRandom(21))
    expect(snapshot.choices).toEqual(live.choices)
    expect(snapshot.answerIndex).toBe(2)
    live.choices = ['X', 'Y', 'Z', 'W', 'V']
    live.answerIndex = 0
    live.stem = '바뀜'
    live.explanation = '바뀐 해설'
    expect(snapshot.stem).toBe('원문')
    expect(snapshot.choices[snapshot.answerIndex]).toBe('다→나→가')
    expect(snapshot.explanation).toBe('원문 해설')
  })

  it('maps shuffled answer indexes with the stored choice order', () => {
    const live = q('free', 2)
    live.choices = ['갑', '을', '병', '정', '무']
    live.answerIndex = 2
    live.choiceOrder = 'free'
    const snapshot = freezeQuestionSnapshot(live, seededRandom(21))
    expect(snapshot.choices[snapshot.answerIndex]).toBe('병')
    expect(snapshot.choices).not.toEqual(['갑', '을', '병', '정', '무'])
  })

  it('does not force a cyclic index % 5 answer placement', () => {
    const picked = pickMockQuestions(questions, 50, seededRandom(9))
    const cyclic = picked.every((question, index) => question.answerIndex === index % 5)
    expect(cyclic).toBe(false)
  })
})
