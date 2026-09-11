/** 날짜 유틸 — 학습일·복습일 계산은 이 모듈에서만 처리한다. */

const DAY_MS = 24 * 60 * 60 * 1000

export function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  if (year < 1900 || year > 9999) return false
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

/** YYYY-MM-DD (로컬 기준) */
export function toDateKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

export function daysBetween(a: string, b: string): number {
  const diff = parseDateKey(b).getTime() - parseDateKey(a).getTime()
  return Math.round(diff / DAY_MS)
}

export function formatKoreanDate(dateKey: string): string {
  const date = parseDateKey(dateKey)
  return `${date.getMonth() + 1}월 ${date.getDate()}일`
}

export function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours <= 0) return `${minutes}분`
  if (minutes === 0) return `${hours}시간`
  return `${hours}시간 ${minutes}분`
}

export function planWeekNumber(startDate: string, today: string, planWeeks: number): number {
  const elapsed = Math.max(0, daysBetween(startDate, today))
  const week = Math.floor(elapsed / 7) + 1
  return Math.min(Math.max(week, 1), planWeeks)
}

export function isDue(nextReviewAt: string, today: string): boolean {
  return nextReviewAt <= today
}
