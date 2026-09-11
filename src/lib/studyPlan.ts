import { MAX_DAILY_CARDS, MIN_DAILY_CARDS, normalizeDailyCardCount } from './studyLimits'
import type { Lesson } from '../types'
import type { QuantityPlan } from '../types/contracts'

export const MINUTES_PER_CARD = 1.2
export const MINUTES_PER_QUESTION = 2.2
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
 * dailyQuestionCount/dailyCardCount는 상한이다.
 * 개념 읽기 시간을 0으로 줄여 분량을 맞추지 않는다.
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

  let selectedCardCount = Math.min(dailyCardCap, Math.max(0, input.dueCardCount))
  let selectedQuestionCount = dailyQuestionCap

  const fits = (cards: number, questions: number) =>
    estimateStudyMinutes({
      cardCount: cards,
      questionCount: questions,
      conceptMinutes,
    }) <= input.dailyMinutes

  while (selectedQuestionCount > MIN_SELECTED_QUESTIONS && !fits(selectedCardCount, selectedQuestionCount)) {
    selectedQuestionCount -= 1
  }

  const minCards = selectedCardCount === 0 ? 0 : Math.min(MIN_DAILY_CARDS, selectedCardCount)
  while (selectedCardCount > minCards && !fits(selectedCardCount, selectedQuestionCount)) {
    selectedCardCount -= 1
  }

  const estimatedMinutes = estimateStudyMinutes({
    cardCount: selectedCardCount,
    questionCount: selectedQuestionCount,
    conceptMinutes,
  })
  const overflowMinutes = Math.max(0, estimatedMinutes - input.dailyMinutes)
  const fitsDailyMinutes = overflowMinutes === 0

  return {
    dailyMinutes: input.dailyMinutes,
    dailyQuestionCap,
    dailyCardCap,
    selectedCardCount,
    selectedQuestionCount,
    estimatedMinutes,
    fitsDailyMinutes,
    overflowMinutes,
    guidance: fitsDailyMinutes
      ? null
      : `최소 학습이 하루 ${input.dailyMinutes}분을 약 ${overflowMinutes}분 넘습니다. 설정에서 하루 시간을 늘리거나 문항·카드 상한을 줄이세요. 개념 읽기 시간은 줄이지 않습니다.`,
  }
}

export function quantitySettingsCopy(): string {
  return `하루 시간은 오늘 고르는 카드·개념·문항 수의 실제 상한입니다. 카드 수와 문항 수는 원하는 최대치이고, 시간 안에 들어가면 그 수만큼 제공합니다. 시간이 부족하면 문항을 먼저 줄이고, 그래도 부족하면 카드를 줄입니다. 개념 읽기 시간을 0으로 맞추지는 않습니다. 카드 상한은 ${MIN_DAILY_CARDS}~${MAX_DAILY_CARDS}장입니다.`
}
