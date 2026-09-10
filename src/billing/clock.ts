export interface Clock {
  now(): Date
}

export interface TestClock extends Clock {
  set(iso: string): void
  addMs(ms: number): void
}

export function createSystemClock(): Clock {
  return { now: () => new Date() }
}

export function createTestClock(iso: string): TestClock {
  let current = new Date(iso).getTime()
  return {
    now: () => new Date(current),
    set: (next) => {
      current = new Date(next).getTime()
    },
    addMs: (ms) => {
      current += ms
    },
  }
}

export function toIso(date: Date): string {
  return date.toISOString()
}

export function plusMs(date: Date, ms: number): Date {
  return new Date(date.getTime() + ms)
}
