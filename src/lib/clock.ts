import { parseDateKey, toDateKey } from './dates'

const STORAGE_KEY = 'arin.clock.iso'

export interface Clock {
  now(): Date
}

let overrideClock: Clock | null = null

function parseClockInput(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const local = parseDateKey(value)
    local.setHours(9, 0, 0, 0)
    return local
  }
  return new Date(value)
}

function storageClock(): Clock | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const date = parseClockInput(raw)
    if (Number.isNaN(date.getTime())) return null
    return { now: () => new Date(date.getTime()) }
  } catch {
    return null
  }
}

export function getClock(): Clock {
  return overrideClock ?? storageClock() ?? { now: () => new Date() }
}

export function now(): Date {
  return getClock().now()
}

export function todayKey(): string {
  return toDateKey(now())
}

export function nowIso(): string {
  return now().toISOString()
}

export function setClock(clock: Clock | null): void {
  overrideClock = clock
}

export function setClockToDate(date: Date | string): void {
  const resolved = typeof date === 'string' ? parseClockInput(date) : date
  overrideClock = { now: () => new Date(resolved.getTime()) }
}

export function resetClock(): void {
  overrideClock = null
}

export function persistClockOverride(value: string | null): void {
  if (typeof localStorage === 'undefined') return
  if (!value) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, value)
}

export function readPersistedClockOverride(): string | null {
  if (typeof localStorage === 'undefined') return null
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

/** URL `?asOf=YYYY-MM-DD` — 검증용. 학습일 미리보기만 바꾼다. */
export function applyClockFromSearch(search: string): void {
  const asOf = new URLSearchParams(search).get('asOf')
  if (!asOf) return
  persistClockOverride(asOf)
  setClockToDate(asOf)
}

/**
 * 학습일 시간대 정책: 기기 로컬 캘린더 날짜(YYYY-MM-DD).
 * `toDateKey`가 Date의 로컬 연·월·일을 사용한다. IANA 변환은 하지 않는다.
 * 한국 사용자는 보통 Asia/Seoul이 기기 시간대다. 자정 경계는 로컬 자정이다.
 */
export const LEARNING_TIMEZONE_POLICY = {
  id: 'device-local-calendar-date',
  dateKey: 'YYYY-MM-DD',
  boundary: 'local-midnight',
} as const
