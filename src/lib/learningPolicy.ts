/**
 * 검증 가능한 학습 정책 값.
 * 고정 학습 효과·합격 보장·공식 난이도 비율로 표현하지 않는다.
 */
export const LEARNING_POLICY_VERSION = 'learning-foundation-v2'

export const LEARNING_POLICY = {
  version: LEARNING_POLICY_VERSION,
  gradeCutoff: { 1: 80, 2: 70, 3: 60 } as const,
  dailyNewConceptCountDefault: 1,
  reviewPeriodDays: 14,
  /** 복습 문항 중 도래 복습 비율. 최근 오답과 같은 목록으로 쓰지 않는다. */
  reviewDueShare: 0.6,
  reviewRecentWrongShare: 0.4,
  /** 휴리스틱 추정 전용. 분량 상한·제품 약속이 아니다. */
  heuristicMinutesPerCard: 1.2,
  heuristicMinutesPerQuestion: 2.2,
  assumptions: [
    '진도는 개념 완료 기준이며 달력 날짜로 미완료 단원을 건너뛰지 않는다.',
    '새 문항은 오늘 읽은 개념과 선행 완료 개념, 복습은 개념 완료 또는 해당 문항의 풀이 기록이 있는 범위에서 고른다.',
    '최근 오답 ID와 복습 도래 ID를 같은 배열로 취급하지 않는다.',
    '자료실 열람만으로 완료하지 않는다. 같은 문항 반복 정답만으로 숙달을 주장하지 않는다.',
    '응답 시간이 없어도 숙련도를 일괄 감점하지 않는다.',
  ],
} as const

export type LearningPolicy = typeof LEARNING_POLICY
