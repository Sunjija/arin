/**
 * 일일 학습 선정 정책.
 *
 * 아래 비율·상한은 설명 가능한 초기 규칙이다.
 * 검증된 최적 학습법·공식 출제 비율이라고 표시하지 않는다.
 */
export const DAILY_LEARNING_POLICY_VERSION = 'daily-learning-v1'

export const DAILY_LEARNING_POLICY = {
  version: DAILY_LEARNING_POLICY_VERSION,
  timezone: 'device-local-calendar-date',
  reviewShare: 0.5,
  newShare: 0.3,
  transferShare: 0.2,
  maxNewConcepts: 2,
  maxReviewItems: 8,
  maxTransferItems: 2,
  shortReviewMaxCards: 4,
  shortReviewMaxQuestions: 4,
  minutesPerNewConcept: 12,
  minutesPerReviewCard: 1.2,
  minutesPerQuestion: 2.2,
  calibratedAfterStudyDays: 5,
  firstTimeNewConceptCap: 1,
  examSoonDays: 14,
  examUrgentDays: 7,
  weakLookbackDays: 14,
  diagnosticQuestionCount: 5,
  analysisCompleteFloor: 750,
  assumptions: [
    '복습 도래 카드는 기존 spacedRepetition 간격을 그대로 사용한다.',
    '밀린 복습은 오늘 상한만 넣고, 나머지는 nextReviewAt을 바꾸지 않은 채 남긴다.',
    '자기평가(처음/경험)는 신규 개념 상한에만 쓰고 숙련도로 저장하지 않는다.',
    '같은 문항 반복 정답은 실전 적용(applied)으로 올리지 않는다.',
    '한 문항의 오답으로 연결된 모든 개념을 미숙으로 내리지 않는다.',
  ],
} as const

export type DailyLearningPolicy = typeof DAILY_LEARNING_POLICY
