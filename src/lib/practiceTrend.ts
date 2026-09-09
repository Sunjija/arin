import type { AttemptRecord } from '../types'
import { addDays, formatKoreanDate, toDateKey } from './dates'

export function practiceTrend(attempts: AttemptRecord[], days: 7 | 30, today = toDateKey()) {
  const start = addDays(today, 1 - days)
  const previousStart = addDays(start, -days)
  const practice = attempts.filter(item => item.source === 'practice')
  const dayOf = (item: AttemptRecord) => toDateKey(new Date(item.createdAt))
  const current = practice.filter(item => dayOf(item) >= start && dayOf(item) <= today)
  const previous = practice.filter(item => dayOf(item) >= previousStart && dayOf(item) < start)
  const accuracy = (items: AttemptRecord[]) => items.length ? Math.round(items.filter(item => item.correct).length / items.length * 100) : null
  const value = accuracy(current)
  const oldValue = accuracy(previous)
  const bucketSize = days === 7 ? 1 : 5
  const buckets = Array.from({length: days / bucketSize}, (_, i) => {
    const from = addDays(start, i * bucketSize)
    const to = addDays(from, bucketSize - 1)
    const items = current.filter(item => dayOf(item) >= from && dayOf(item) <= to)
    return { from, to, label: formatKoreanDate(to), total: items.length, accuracy: accuracy(items) }
  })
  return { total: current.length, correct: current.filter(item => item.correct).length, accuracy: value,
    difference: value != null && oldValue != null ? value - oldValue : null, buckets }
}
