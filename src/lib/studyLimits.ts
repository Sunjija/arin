export const MIN_DAILY_CARDS = 3
export const MAX_DAILY_CARDS = 15

export function normalizeDailyCardCount(value: number): number {
  if (!Number.isFinite(value)) return MIN_DAILY_CARDS
  return Math.min(MAX_DAILY_CARDS, Math.max(MIN_DAILY_CARDS, Math.round(value)))
}
