import { MAX_DAILY_CARDS, MIN_DAILY_CARDS, normalizeDailyCardCount } from './studyLimits'
import { LEARNING_POLICY } from './learningPolicy'
import type { EraId, Lesson } from '../types'
import type { QuantityPlan } from '../types/contracts'

/** @deprecated 휴리스틱 추정 전용. 분량 약속으로 쓰지 않는다. */
export const MINUTES_PER_CARD = LEARNING_POLICY.heuristicMinutesPerCard
/** @deprecated 휴리스틱 추정 전용. 분량 약속으로 쓰지 않는다. */
export const MINUTES_PER_QUESTION = LEARNING_POLICY.heuristicMinutesPerQuestion
export const MIN_SELECTED_QUESTIONS = 1

export function estimateStudyMinutes(input: {
  cardCount: number
  questionCount: number
  conceptMinutes: number
}): number {
  return Math.round(
    input.cardCount * MINUTES_PER_CARD + input.conceptMinutes + input.questionCount * MINUTES_PER_QUESTION,
  )
}

/**
 * 하루 분량은 개념·문제·복습 개수 상한이다.
 * 고정 시간으로 문항·카드 수를 줄이지 않는다. estimatedMinutes는 참고 휴리스틱이다.
 */
export function planDailyQuantity(input: {
  dailyMinutes: number
  dailyQuestionCap: number
  dailyCardCap: number
  dueCardCount: number
  lesson: Pick<Lesson, 'estimatedMinutes' | 'title'>
}): QuantityPlan {
  const dailyCardCap = normalizeDailyCardCount(input.dailyCardCap)
  const dailyQuestionCap = Math.max(MIN_SELECTED_QUESTIONS, Math.round(input.dailyQuestionCap))
  const conceptMinutes = Math.max(1, input.lesson.estimatedMinutes)
  const selectedCardCount = Math.min(dailyCardCap, Math.max(0, input.dueCardCount))
  const selectedQuestionCount = dailyQuestionCap
  const estimatedMinutes = estimateStudyMinutes({
    cardCount: selectedCardCount,
    questionCount: selectedQuestionCount,
    conceptMinutes,
  })

  return {
    dailyMinutes: input.dailyMinutes,
    dailyQuestionCap,
    dailyCardCap,
    selectedCardCount,
    selectedQuestionCount,
    estimatedMinutes,
    fitsDailyMinutes: true,
    overflowMinutes: 0,
    estimateKind: 'heuristic',
    guidance: `오늘 분량은 개념 1개 · 문제 ${selectedQuestionCount}개 · 복습 ${selectedCardCount}장입니다. 약 ${estimatedMinutes}분은 참고 추정이며 학습 속도를 약속하지 않습니다.`,
  }
}

export function quantitySettingsCopy(): string {
  return `하루 분량은 개념·문제·복습 개수로 정합니다. 카드 상한은 ${MIN_DAILY_CARDS}~${MAX_DAILY_CARDS}장입니다. 문제·카드 수는 상한이며, 배운 범위에 맞는 내용만 제공합니다.`
}

/**
 * 복습 카드는 배운 범위에서만 고른다. 미학습 시대 카드는 자동 복습에 넣지 않는다.
 * 현재 단원 시대를 섞되, 배운 다른 시대를 제외하지 않는다.
 */
export function pickDueCardsForToday<T extends { id: string; era: EraId; nextReviewAt: string }>(
  dueCards: T[],
  lessonEra: EraId,
  limit: number,
  learnedEras?: Iterable<EraId>,
): T[] {
  const allowed = learnedEras ? new Set(learnedEras) : null
  const pool = allowed ? dueCards.filter((card) => allowed.has(card.era)) : dueCards
  return [...pool]
    .sort((a, b) => {
      const byDate = a.nextReviewAt.localeCompare(b.nextReviewAt)
      if (byDate !== 0) return byDate
      const byLesson = Number(b.era === lessonEra) - Number(a.era === lessonEra)
      if (byLesson !== 0) return byLesson
      return a.id.localeCompare(b.id)
    })
    .slice(0, Math.max(0, limit))
}
