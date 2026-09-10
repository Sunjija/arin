import { afterEach, describe, expect, it } from 'vitest'
import {
  acceptAnalysisPayload,
  mixGuidanceFromPayload,
  setAnalysisPayloadForTests,
} from './officialAnalysisAdapter'
import type { OfficialExamAnalysisPayload } from '../types/dailyLearning'

const complete: OfficialExamAnalysisPayload = {
  schemaVersion: 'official-exam-analysis-v1',
  producedBy: 'test',
  producedAt: '2026-09-10T00:00:00.000Z',
  source: {
    corpus: 'official-advanced-65-79',
    rounds: [65],
    itemCount: 750,
    includesOfficialText: false,
    includesOfficialImages: false,
  },
  review: {
    level: 'human-reviewed-complete',
    reviewerId: 'reviewer-1',
    reviewedAt: '2026-09-10T00:00:00.000Z',
    notes: '',
  },
  coverage: { targetItemCount: 750, taggedComplete: 750, outlineOnly: 0, notAnalyzed: 0 },
  observed: {
    pointQuota: { 1: 10, 2: 30, 3: 10 },
    eraBloc: { premodern: 60, modern: 40 },
    formatMix: { 'source-who': 12 },
    officialSkillType: null,
    stimulusType: null,
  },
  items: [],
}

describe('officialAnalysisAdapter', () => {
  afterEach(() => setAnalysisPayloadForTests(null))

  it('산출물이 없으면 임시 목표이고 공식 비율이 아니다', () => {
    const mix = mixGuidanceFromPayload(null)
    expect(mix.basis).toBe('provisional')
    expect(mix.label).toContain('공식 출제 비율 아님')
    expect(mix.acceptance.accepted).toBe(false)
  })

  it('원문이 있으면 거부한다', () => {
    const result = acceptAnalysisPayload({
      ...complete,
      source: { ...complete.source, includesOfficialText: true },
    })
    expect(result.accepted).toBe(false)
    expect(result.rejection).toMatch(/원문/)
  })

  it('outline-only는 비율 연동을 하지 않는다', () => {
    const result = acceptAnalysisPayload({
      ...complete,
      review: { ...complete.review, level: 'outline-only' },
    })
    expect(result.accepted).toBe(false)
    expect(result.basis).toBe('provisional')
  })

  it('사람 검토 완료와 하한을 통과하면 analyzed로 받는다', () => {
    const result = acceptAnalysisPayload(complete)
    expect(result.accepted).toBe(true)
    expect(result.basis).toBe('analyzed')
  })
})
