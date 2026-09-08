import { describe, expect, it } from 'vitest'
import type { ScoreSummary, TodayPlan } from '../../types'
import {
  BANNED_HOME_PHRASES,
  HOME_RECORD_EMPTY,
  buildHomeViewModel,
  homeVisibleText,
  isInProgressSession,
} from './todayCopy'

const emptySummary = (goalScore = 85): ScoreSummary => ({
  practiceAccuracy: null,
  practiceAttemptCount: 0,
  fullMockAverage: null,
  eligibleFullMockCount: 0,
  consecutiveGoalHits: 0,
  goalScore,
  recentMocks: [],
})

function plan(overrides: Partial<TodayPlan> = {}): TodayPlan {
  return {
    date: '2026-09-08',
    week: 2,
    planWeeks: 8,
    lesson: {
      id: 'lesson-goryeo-1',
      title: '고려 광종과 성종',
      era: 'goryeo',
      week: 2,
      dayOrder: 1,
      summary: '',
      keywords: [],
      checkpoints: [],
      estimatedMinutes: 20,
    },
    reviewLabel: '기초 복습',
    reviewHasEvidence: false,
    dueCards: [],
    quantity: {
      dailyMinutes: 120,
      dailyQuestionCap: 15,
      dailyCardCap: 10,
      selectedCardCount: 8,
      selectedQuestionCount: 12,
      estimatedMinutes: 48,
      fitsDailyMinutes: true,
      overflowMinutes: 0,
      guidance: null,
    },
    reviewCardCount: 8,
    questionCount: 12,
    estimatedMinutes: 48,
    completion: {
      todayDone: false,
      cardsReviewed: 0,
      questionsAnswered: 0,
      conceptDone: false,
      extraReviewAvailable: false,
    },
    scoreSummary: emptySummary(),
    observedWeakAreas: [],
    streak: 0,
    estimatedScore: 40,
    scoreIsEstimate: true,
    goalScore: 85,
    remainingToGoal: null,
    focusLine: '오늘 학습: 고려 광종과 성종 · 취약 고려',
    timeLine: '약 48분',
    todayDone: false,
    completionRate: 0,
    weakAreas: ['고려'],
    ...overrides,
  }
}

describe('home view model — 새 사용자', () => {
  it('uses lesson title, not focusLine weak-area copy, and does not treat 40 as a score', () => {
    const model = buildHomeViewModel(plan(), false)
    const text = homeVisibleText(model)

    expect(model.eyebrow).toBe('계획 2주차 · 오늘')
    expect(model.title).toBe('오늘 학습: 고려 광종과 성종')
    expect(model.reviewLine).toBe('복습: 기초 복습')
    expect(model.reviewHasEvidence).toBe(false)
    expect(model.quantityLine).toBe('카드 8장 · 개념 1개 · 문제 12개 · 약 48분')
    expect(model.primaryCta).toEqual({ label: '오늘 학습 시작', to: '/study' })
    expect(model.extraReviewCta).toBeNull()
    expect(model.recordHint).toBe(HOME_RECORD_EMPTY)
    expect(text).not.toContain('취약')
    expect(text).not.toContain('40점')
    expect(text).not.toContain('연속 0일')
    expect(text).not.toContain('0일')
    for (const phrase of BANNED_HOME_PHRASES) {
      expect(text).not.toContain(phrase)
    }
  })

  it('does not claim a diagnosis when reviewHasEvidence is false', () => {
    const model = buildHomeViewModel(plan({ reviewLabel: '기초 복습', reviewHasEvidence: false }), false)
    expect(model.reviewLine).toBe('복습: 기초 복습')
    expect(homeVisibleText(model)).not.toMatch(/취약|진단|약점/)
  })
})

describe('home view model — 진행 중 / 당일 완료', () => {
  it('uses 이어서 학습 when a same-day session is in progress', () => {
    expect(isInProgressSession({ date: '2026-09-08', step: 'quiz' }, '2026-09-08')).toBe(true)
    expect(isInProgressSession({ date: '2026-09-08', step: 'result' }, '2026-09-08')).toBe(false)
    expect(isInProgressSession({ date: '2026-09-07', step: 'cards' }, '2026-09-08')).toBe(false)

    const model = buildHomeViewModel(plan(), true)
    expect(model.primaryCta.label).toBe('이어서 학습')
    expect(model.extraReviewCta).toBeNull()
  })

  it('uses 추가 복습 as the only CTA when today is done and no session is in progress', () => {
    const model = buildHomeViewModel(
      plan({
        completion: {
          todayDone: true,
          cardsReviewed: 8,
          questionsAnswered: 12,
          conceptDone: true,
          extraReviewAvailable: true,
        },
        todayDone: true,
      }),
      false,
    )
    expect(model.primaryCta).toEqual({ label: '추가 복습', to: '/cards' })
    expect(model.extraReviewCta).toBeNull()
  })
})

describe('home view model — 분량 안내와 점수 의미', () => {
  it('does not hide quantity.guidance', () => {
    const guidance =
      '최소 학습이 하루 30분을 약 12분 넘습니다. 설정에서 하루 시간을 늘리거나 문항·카드 상한을 줄이세요. 개념 읽기 시간은 줄이지 않습니다.'
    const model = buildHomeViewModel(
      plan({
        quantity: {
          dailyMinutes: 30,
          dailyQuestionCap: 15,
          dailyCardCap: 10,
          selectedCardCount: 8,
          selectedQuestionCount: 1,
          estimatedMinutes: 42,
          fitsDailyMinutes: false,
          overflowMinutes: 12,
          guidance,
        },
        estimatedMinutes: 42,
        questionCount: 1,
      }),
      false,
    )
    expect(model.guidance).toBe(guidance)
    expect(homeVisibleText(model)).toContain('하루 30분')
  })

  it('does not show a record hint once practice exists, even with no full mock', () => {
    const model = buildHomeViewModel(
      plan({
        scoreSummary: {
          ...emptySummary(),
          practiceAccuracy: 70,
          practiceAttemptCount: 10,
        },
        estimatedScore: 40,
      }),
      false,
    )
    expect(model.recordHint).toBeNull()
    expect(homeVisibleText(model)).not.toContain('40점')
    expect(homeVisibleText(model)).not.toContain('70%')
  })
})
