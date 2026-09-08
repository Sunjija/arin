import type { ChoiceState } from '../ui'

export function choiceState({
  index,
  selected,
  revealed,
  answerIndex,
}: {
  index: number
  selected: number | null
  revealed: boolean
  answerIndex: number
}): ChoiceState {
  if (!revealed) return selected === index ? 'selected' : 'unselected'
  if (index === answerIndex) return 'correct'
  if (selected === index) return 'incorrect'
  return 'locked'
}
