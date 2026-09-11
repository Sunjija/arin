import { describe, expect, it } from 'vitest'
import type { RecentMockSummary, ScoreSummary, WeakArea } from '../../types'
import {
  BANNED_PROGRESS_PHRASES,
  NO_RECORD,
  formatConsecutiveGoal,
  formatFullMockAverage,
  formatPracticeAccuracy,
  fullMockAverageUsedCount,
  initialWeakAreas,
  measuredWeakAreas,
  mockModeLabel,
  recentMockLine,
} from './progressCopy'

function summary(overrides: Partial<ScoreSummary> = {}): ScoreSummary {
  return {
    practiceAccuracy: null,
    practiceAttemptCount: 0,
    fullMockAverage: null,
    eligibleFullMockCount: 0,
    consecutiveGoalHits: 0,
    goalScore: 85,
    recentMocks: [],
    ...overrides,
  }
}

function sampleMock(score: number, id = `sample-${score}`): RecentMockSummary {
  return {
    id,
    createdAt: '2026-09-01T00:00:00.000Z',
    mode: 'sample',
    score,
    total: 10,
    eligibleForFullStats: false,
    ineligibilityReason: 'sample-mode',
  }
}

describe('progress copy — 기록 없음과 금지 문구', () => {
  it('shows 아직 기록 없음 for null practice and full-mock averages', () => {
    const s = summary()
    expect(formatPracticeAccuracy(s)).toEqual({
      label: '연습 정답률',
      value: NO_RECORD,
      detail: null,
    })
    expect(formatFullMockAverage(s)).toEqual({
      label: '최근 실전 연습 평균',
      value: NO_RECORD,
      detail: null,
    })
    const blob = [
      formatPracticeAccuracy(s).value,
      formatFullMockAverage(s).value,
      formatConsecutiveGoal(s).value,
      formatConsecutiveGoal(s).detail,
    ].join(' ')
    for (const phrase of BANNED_PROGRESS_PHRASES) {
      expect(blob).not.toContain(phrase)
    }
  })
})

describe('progress copy — practice만 / sample mock만 / full mock', () => {
  it('keeps practice accuracy separate from the full-mock average', () => {
    const s = summary({ practiceAccuracy: 50, practiceAttemptCount: 8 })
    expect(formatPracticeAccuracy(s).value).toBe('50%')
    expect(formatPracticeAccuracy(s).detail).toBe('연습 8회')
    expect(formatFullMockAverage(s).value).toBe(NO_RECORD)
  })

  it('does not treat sample mocks as the 실전 연습 평균', () => {
    const s = summary({
      recentMocks: [sampleMock(90), sampleMock(100, 'sample-100')],
    })
    expect(formatFullMockAverage(s).value).toBe(NO_RECORD)
    expect(fullMockAverageUsedCount(s)).toBe(0)
    expect(mockModeLabel('sample')).toBe('샘플')
  })

  it('makes the number of full mocks used in the average readable, capping at 3', () => {
    const one = summary({ fullMockAverage: 90, eligibleFullMockCount: 1 })
    expect(formatFullMockAverage(one).value).toBe('90점')
    expect(formatFullMockAverage(one).detail).toBe('최근 실전 연습 1회 평균')

    const many = summary({ fullMockAverage: 80, eligibleFullMockCount: 5 })
    expect(fullMockAverageUsedCount(many)).toBe(3)
    expect(formatFullMockAverage(many).detail).toBe('최근 실전 연습 3회 평균')
    expect(mockModeLabel('full')).toBe('실전')
  })
})

describe('progress copy — 최근 모의 한 줄', () => {
  it('shows mode, score, item count, and stats eligibility', () => {
    expect(recentMockLine(sampleMock(100))).toBe('샘플 · 100점 · 10문항 · 통계 제외')
    expect(
      recentMockLine({
        mode: 'full',
        score: 88,
        total: 50,
        eligibleForFullStats: true,
      }),
    ).toBe('실전 · 88점 · 50문항 · 통계 포함')
  })
})

describe('progress copy — 목표 60·85·100', () => {
  it('uses goalScore rather than a hardcoded 85 or 1급 안정권', () => {
    for (const goal of [60, 85, 100]) {
      const copy = formatConsecutiveGoal(summary({ goalScore: goal, consecutiveGoalHits: 2 }))
      expect(copy.detail).toBe(`목표 ${goal}점`)
      expect(copy.value).toBe('2회')
      expect(`${copy.label} ${copy.value} ${copy.detail}`).not.toContain('1급 안정권')
      expect(`${copy.label} ${copy.value} ${copy.detail}`).not.toContain('85점 이상 연속')
    }
  })
})

describe('progress copy — 취약 영역은 measured만', () => {
  it('drops unmeasured areas and keeps the initial screen to a short list', () => {
    const areas: WeakArea[] = [
      {
        key: 'goryeo',
        kind: 'era',
        label: '고려',
        attemptCount: 8,
        accuracy: 40,
        measured: true,
      },
      {
        key: 'prehistoric',
        kind: 'era',
        label: '선사·고조선',
        attemptCount: 1,
        accuracy: 0,
        measured: false,
      },
      {
        key: 'king-figure',
        kind: 'type',
        label: '왕·인물',
        attemptCount: 6,
        accuracy: 50,
        measured: true,
      },
      {
        key: 'chronology',
        kind: 'type',
        label: '연도·사건 순서',
        attemptCount: 5,
        accuracy: 60,
        measured: true,
      },
      {
        key: 'source',
        kind: 'type',
        label: '사료',
        attemptCount: 4,
        accuracy: 70,
        measured: true,
      },
    ]

    expect(measuredWeakAreas(areas).map((a) => a.label)).toEqual([
      '고려',
      '왕·인물',
      '연도·사건 순서',
      '사료',
    ])
    expect(initialWeakAreas(areas, 3).map((a) => a.label)).toEqual(['고려', '왕·인물', '연도·사건 순서'])
    expect(initialWeakAreas(areas, 3)).toHaveLength(3)
  })
})
