import { describe, expect, it } from 'vitest'
import { buildCardChoiceSet, ratingFromQuizResult } from './cardQuiz'
import type { FlashcardRecord } from '../types'

function card(partial: Partial<FlashcardRecord> & Pick<FlashcardRecord, 'id' | 'front' | 'back'>): FlashcardRecord {
  return {
    kind: 'king-to-deed',
    era: 'goryeo',
    tags: ['king-figure'],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    nextReviewAt: '2026-01-01',
    intervalDays: 0,
    easeStreak: 0,
    lapses: 0,
    fingerprint: partial.id,
    ...partial,
  }
}

describe('buildCardChoiceSet', () => {
  it('creates choices with exactly one correct answer and a concrete ask', () => {
    const target = card({ id: '1', front: '광종', back: '노비안검법' })
    const pool = [
      target,
      card({ id: '2', front: '성종', back: '12목 설치' }),
      card({ id: '3', front: '태종', back: '사병 혁파' }),
      card({ id: '4', front: '세종', back: '훈민정음' }),
      card({ id: '5', front: '대조영', back: '발해 건국' }),
    ]
    const set = buildCardChoiceSet(target, pool, () => 0.2)
    expect(set.mode).toBe('choices')
    expect(set.choices.length).toBeGreaterThanOrEqual(2)
    expect(set.choices.length).toBeLessThanOrEqual(4)
    expect(set.choices[set.answerIndex]).toBe('노비안검법')
    expect(new Set(set.choices).size).toBe(set.choices.length)
    expect(set.ask).toContain('업적')
    expect(set.kindLabel).toBe('왕 → 업적')
    expect(set.prompt).toBe('광종')
    expect(set.answerText).toBe('노비안검법')
  })

  it('does not mix person-name answers into a king-to-deed choice set', () => {
    const target = card({ id: '1', front: '고려 성종', back: '12목 설치' })
    const pool = [
      target,
      card({
        id: 'reverse',
        front: '노비안검법',
        back: '고려 광종',
        kind: 'deed-to-king',
      }),
      card({ id: '2', front: '고려 광종', back: '노비안검법' }),
      card({ id: '3', front: '고려 공민왕', back: '전민변정도감 설치' }),
      card({ id: '4', front: '고려 태조', back: '사심관 제도 실시' }),
    ]

    const set = buildCardChoiceSet(target, pool, () => 0.2)

    expect(set.ask).toContain('대표 업적')
    expect(set.choices).not.toContain('고려 광종')
    expect(set.choices.every((choice) => choice !== '고려 광종')).toBe(true)
  })

  it('keeps deed-to-king choices as person names', () => {
    const target = card({
      id: '1',
      front: '노비안검법 · 과거제',
      back: '고려 광종',
      kind: 'deed-to-king',
    })
    const pool = [
      target,
      card({ id: '2', front: '12목 설치', back: '고려 성종', kind: 'deed-to-king' }),
      card({
        id: '3',
        front: '전민변정도감',
        back: '고려 공민왕',
        kind: 'deed-to-king',
      }),
      card({ id: '4', front: '훈요 10조', back: '고려 태조', kind: 'deed-to-king' }),
    ]

    const set = buildCardChoiceSet(target, pool, () => 0.2)

    expect(set.mode).toBe('choices')
    expect(set.ask).toContain('인물')
    expect(set.choices[set.answerIndex]).toBe('고려 광종')
    expect(set.choices.every((choice) => choice.startsWith('고려 '))).toBe(true)
  })

  it('uses the paired king-to-deed description instead of a leaked cue like 위만조선 집권', () => {
    const target = card({
      id: 'c-44',
      front: '위만조선 집권',
      back: '위만',
      kind: 'deed-to-king',
      era: 'prehistoric',
    })
    const pool = [
      target,
      card({
        id: 'c-16',
        front: '위만',
        back: '고조선 후기 집권. 중계 무역으로 세력 확대',
        era: 'prehistoric',
      }),
      card({
        id: 'c-09',
        front: '불교 공인 (신라)',
        back: '법흥왕',
        kind: 'deed-to-king',
        era: 'three-kingdoms',
      }),
      card({
        id: 'c-19',
        front: '발해 건국',
        back: '대조영',
        kind: 'deed-to-king',
        era: 'north-south',
      }),
      card({
        id: 'c-61',
        front: '고려 건국',
        back: '왕건',
        kind: 'deed-to-king',
      }),
    ]

    const set = buildCardChoiceSet(target, pool, () => 0.2)
    expect(set.mode).toBe('choices')
    expect(set.prompt).toBe('고조선 후기 집권. 중계 무역으로 세력 확대')
    expect(set.prompt).not.toContain('위만')
    expect(set.ask).toBe('다음 설명에 해당하는 인물은?')
    expect(set.choices[set.answerIndex]).toBe('위만')
  })

  it('falls back to recall when the cue still names the answer', () => {
    const target = card({
      id: 'leaky',
      front: '위만조선 집권',
      back: '위만',
      kind: 'deed-to-king',
      era: 'prehistoric',
    })
    const set = buildCardChoiceSet(target, [target], () => 0.2)
    expect(set.mode).toBe('recall')
    expect(set.prompt).toBe('위만조선 집권')
    expect(set.choices).toEqual([])
  })

  it('turns comparison cards into swapped-pair questions instead of restating the title', () => {
    const target = card({
      id: 'c-05',
      front: '광종 vs 성종, 정책 목적 차이',
      back: '광종: 왕권 강화 / 성종: 유교적 통치 질서·지방 제도 정비',
      kind: 'concept',
    })
    const pool = [
      target,
      card({ id: 'c-01', front: '고려 광종', back: '노비안검법, 과거제 도입' }),
      card({ id: 'c-03', front: '고려 성종', back: '최승로 시무 28조 수용, 12목 설치' }),
      card({ id: 'c-62', front: '고려 공민왕', back: '반원 정책, 전민변정도감' }),
      card({ id: 'c-21', front: '조선 태종', back: '사병 혁파, 호패법', era: 'joseon-early' }),
    ]

    const set = buildCardChoiceSet(target, pool, () => 0.2)

    expect(set.mode).toBe('choices')
    expect(set.prompt).toBe('광종 · 성종')
    expect(set.ask).toBe('정책 목적을 바르게 짝지은 것은?')
    expect(set.kindLabel).toBe('비교')
    expect(set.prompt).not.toContain('차이')
    expect(set.choices.every((choice) => choice.includes('광종:') && choice.includes('성종:'))).toBe(
      true,
    )
    expect(set.choices[set.answerIndex]).toContain('광종: 왕권 강화')
    expect(set.choices[set.answerIndex]).toContain('성종: 유교적 통치 질서')
    expect(set.choices).toContain('광종: 유교적 통치 질서·지방 제도 정비 / 성종: 왕권 강화')
  })

  it('prefers same-kind same-era backs and does not take the first three cards of the whole pool', () => {
    const target = card({ id: '1', front: '광종', back: '노비안검법', era: 'goryeo' })
    const pool = [
      target,
      card({
        id: 'wrong-kind-1',
        front: '노비안검법',
        back: '고려 광종',
        kind: 'deed-to-king',
        era: 'goryeo',
      }),
      card({
        id: 'wrong-kind-2',
        front: '12목',
        back: '고려 성종',
        kind: 'deed-to-king',
        era: 'goryeo',
      }),
      card({
        id: 'wrong-kind-3',
        front: '훈민정음',
        back: '세종',
        kind: 'deed-to-king',
        era: 'joseon-early',
      }),
      card({ id: 'other-era-1', front: '태종', back: '사병 혁파', era: 'joseon-early' }),
      card({ id: 'other-era-2', front: '세종', back: '훈민정음', era: 'joseon-early' }),
      card({ id: 'same-era-1', front: '성종', back: '12목 설치', era: 'goryeo' }),
      card({ id: 'same-era-2', front: '공민왕', back: '전민변정도감', era: 'goryeo' }),
      card({ id: 'same-era-3', front: '태조', back: '사심관 제도', era: 'goryeo' }),
    ]

    const set = buildCardChoiceSet(target, pool, () => 0.35)

    expect(set.mode).toBe('choices')
    expect(set.choices).not.toContain('고려 광종')
    expect(set.choices).not.toContain('고려 성종')
    expect(set.choices).not.toContain('세종')
    const distractors = set.choices.filter((_, index) => index !== set.answerIndex)
    expect(distractors.sort()).toEqual(['12목 설치', '사심관 제도', '전민변정도감'].sort())
  })

  it('falls back to recall when there are no real same-kind distractors', () => {
    const target = card({ id: '1', front: '광종', back: '노비안검법' })
    const pool = [
      target,
      card({
        id: 'reverse',
        front: '노비안검법',
        back: '고려 광종',
        kind: 'deed-to-king',
      }),
    ]
    const set = buildCardChoiceSet(target, pool, () => 0.2)
    expect(set.mode).toBe('recall')
    expect(set.choices).toEqual([])
    expect(set.answerText).toBe('노비안검법')
    expect(set.choices.join(' ')).not.toMatch(/같은 시대|다른 인물|정책 \(/)
  })

  it('does not invent comparison fallback facts when nearby deeds are missing', () => {
    const target = card({
      id: 'c-05',
      front: '광종 vs 성종',
      back: '광종: 왕권 강화 / 성종: 유교적 통치 질서',
      kind: 'concept',
    })
    const set = buildCardChoiceSet(target, [target], () => 0.2)
    expect(set.mode).toBe('choices')
    expect(set.choices).toHaveLength(2)
    expect(set.choices).toContain('광종: 왕권 강화 / 성종: 유교적 통치 질서')
    expect(set.choices).toContain('광종: 유교적 통치 질서 / 성종: 왕권 강화')
    expect(set.choices.join(' ')).not.toMatch(/반원 개혁|탕평책|훈민정음 창제/)
  })
})

describe('ratingFromQuizResult', () => {
  it('maps wrong to again and fast correct to easy', () => {
    expect(ratingFromQuizResult(false, 1000)).toBe('again')
    expect(ratingFromQuizResult(true, 2000)).toBe('easy')
    expect(ratingFromQuizResult(true, 7000)).toBe('good')
    expect(ratingFromQuizResult(true, 12000)).toBe('hard')
  })
})
