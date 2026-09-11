import { describe, expect, it } from 'vitest'
import {
  ALL_ERAS,
  type Question,
  type QuestionSnapshot,
} from '../types'
import { inspectFullMockPool } from './mockEligibility'
import {
  buildMockSnapshots,
  freezeQuestionSnapshot,
  gradeSnapshotAnswers,
  pickMockQuestions,
  scoreFromAnswers,
} from './examScoring'

function q(
  id: string,
  difficulty: Question['difficulty'],
  era: Question['era'] = 'goryeo',
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
  }
}

function seededRandom(seed: number): () => number {
  let value = seed
  return () => {
    value = (value * 16807) % 2147483647
    return (value - 1) / 2147483646
  }
}

describe('examScoring', () => {
  it('scales weighted score to 100', () => {
    const score = scoreFromAnswers([
      { correct: true, difficulty: 1 },
      { correct: true, difficulty: 2 },
      { correct: false, difficulty: 3 },
    ])
    expect(score).toBe(50)
  })

  it('scores unanswered as incorrect without inventing a choice', () => {
    const snapshots: QuestionSnapshot[] = [
      {
        questionId: 'a',
        stem: 'a',
        choices: ['a', 'b', 'c', 'd', 'e'],
        answerIndex: 0,
        explanation: '',
        era: 'goryeo',
        tags: ['chronology'],
        difficulty: 1,
      },
      {
        questionId: 'b',
        stem: 'b',
        choices: ['a', 'b', 'c', 'd', 'e'],
        answerIndex: 0,
        explanation: '',
        era: 'goryeo',
        tags: ['chronology'],
        difficulty: 2,
      },
      {
        questionId: 'c',
        stem: 'c',
        choices: ['a', 'b', 'c', 'd', 'e'],
        answerIndex: 0,
        explanation: '',
        era: 'goryeo',
        tags: ['chronology'],
        difficulty: 3,
      },
    ]
    const graded = gradeSnapshotAnswers(snapshots, [0, null, 4])
    expect(graded[1]).toMatchObject({
      questionId: 'b',
      selectedIndex: null,
      correct: false,
      difficulty: 2,
    })
    expect(graded[0]?.correct).toBe(true)
    expect(graded[2]?.correct).toBe(false)
    // earned 1 / max 6 → 17
    expect(scoreFromAnswers(graded)).toBe(17)
  })

  it('does not clone questions with __pad when the bank is under 50', () => {
    const pool = Array.from({ length: 12 }, (_, i) =>
      q(`q${i}`, ((i % 3) + 1) as 1 | 2 | 3),
    )
    const picked = pickMockQuestions(pool, 50, seededRandom(3))
    expect(picked.length).toBe(12)
    expect(picked.every((item) => !item.id.includes('__pad'))).toBe(true)
    expect(new Set(picked.map((item) => item.id)).size).toBe(12)
    const snapshots = picked.map((item) => freezeQuestionSnapshot(item, () => 0))
    expect(inspectFullMockPool(snapshots).ok).toBe(false)
  })

  it('keeps the local 1/2/3-point mix when the bank is rich enough', () => {
    const pool = [
      ...Array.from({ length: 12 }, (_, i) => q(`e${i}`, 1)),
      ...Array.from({ length: 36 }, (_, i) => q(`m${i}`, 2)),
      ...Array.from({ length: 12 }, (_, i) => q(`h${i}`, 3)),
    ]
    const picked = pickMockQuestions(pool, 50, seededRandom(9))
    const counts = { 1: 0, 2: 0, 3: 0 }
    for (const item of picked) counts[item.difficulty] += 1
    expect(counts[1]).toBe(10)
    expect(counts[2]).toBe(30)
    expect(counts[3]).toBe(10)
  })

  it('orders picked items by era and only shuffles within the same era', () => {
    const pool: Question[] = []
    for (const era of ALL_ERAS) {
      pool.push(q(`${era}-1`, 1, era), q(`${era}-2`, 2, era), q(`${era}-3`, 3, era))
    }
    const picked = pickMockQuestions(pool, 30, seededRandom(11))
    const ranks = picked.map((item) => ALL_ERAS.indexOf(item.era))
    for (let i = 1; i < ranks.length; i += 1) {
      expect(ranks[i]!).toBeGreaterThanOrEqual(ranks[i - 1]!)
    }
    expect(picked.some((item, i) => i > 0 && item.difficulty < picked[i - 1]!.difficulty)).toBe(true)
  })

  it('freezes shuffled choices in the snapshot even if the live bank changes', () => {
    const live = q('live', 2)
    live.stem = '원문 줄기'
    live.passage = '원문 지문'
    live.choices = ['갑', '을', '병', '정', '무']
    live.answerIndex = 2
    live.explanation = '원문 해설'
    const snapshot = freezeQuestionSnapshot(live, seededRandom(21))
    live.stem = '바뀐 줄기'
    live.passage = '바뀐 지문'
    live.choices = ['X', 'Y', 'Z', 'W', 'V']
    live.answerIndex = 0
    live.explanation = '바뀐 해설'
    expect(snapshot.stem).toBe('원문 줄기')
    expect(snapshot.passage).toBe('원문 지문')
    expect(snapshot.explanation).toBe('원문 해설')
    expect(snapshot.choices).toHaveLength(5)
    expect(new Set(snapshot.choices)).toEqual(new Set(['갑', '을', '병', '정', '무']))
    expect(snapshot.choices[snapshot.answerIndex]).toBe('병')
    expect(snapshot.choices).not.toEqual(['갑', '을', '병', '정', '무'])
  })

  it('keeps chronology choice order when choiceOrder is keep', () => {
    const live = q('seq', 3)
    live.choiceOrder = 'keep'
    live.choices = ['가→나→다', '나→가→다', '다→나→가', '가→다→나', '다→가→나']
    live.answerIndex = 2
    const snapshot = freezeQuestionSnapshot(live, seededRandom(21))
    expect(snapshot.choices).toEqual(live.choices)
    expect(snapshot.answerIndex).toBe(2)
  })

  it('builds unique full snapshots without padding', () => {
    const pool = Array.from({ length: 60 }, (_, i) =>
      q(`q${i}`, ((i % 3) + 1) as 1 | 2 | 3, ALL_ERAS[i % ALL_ERAS.length]!),
    )
    const snapshots = buildMockSnapshots(pool, 50, seededRandom(4))
    expect(snapshots).toHaveLength(50)
    expect(inspectFullMockPool(snapshots)).toEqual({ ok: true, uniqueCount: 50 })
  })
})
