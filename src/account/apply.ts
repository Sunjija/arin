export const SYNC_COLLECTIONS = [
  'attempts',
  'wrongAnswers',
  'cards',
  'studyDays',
  'lessonCompletions',
  'settings',
  'mastery',
  'meta',
  'mockResults',
  'activeSession',
  'activeMock',
] as const

export type SyncCollection = (typeof SYNC_COLLECTIONS)[number]
export type SyncOp = 'upsert' | 'delete'

export interface SyncEventInput {
  eventId: string
  collection: string
  entityId: string
  op: string
  clientUpdatedAt: string
  deviceId: string
  payload: unknown
}

export interface SyncHead {
  collection: SyncCollection
  entityId: string
  eventId: string
  updatedAt: string
  revision: number | null
  payload: unknown
}

export type ApplyOutcome =
  | { kind: 'apply'; head: SyncHead | null }
  | { kind: 'keep'; head: SyncHead }
  | { kind: 'conflict'; head: SyncHead }

export function isSyncCollection(value: string): value is SyncCollection {
  return (SYNC_COLLECTIONS as readonly string[]).includes(value)
}

export function isSyncOp(value: string): value is SyncOp {
  return value === 'upsert' || value === 'delete'
}

function asRecord(payload: unknown): Record<string, unknown> | null {
  if (valueObject(payload)) return payload
  return null
}

function valueObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function revisionOf(payload: unknown): number | null {
  const record = asRecord(payload)
  return typeof record?.revision === 'number' ? record.revision : null
}

function updatedAtOf(payload: unknown, fallback: string): string {
  const record = asRecord(payload)
  if (typeof record?.updatedAt === 'string') return record.updatedAt
  if (typeof record?.createdAt === 'string') return record.createdAt
  return fallback
}

function jsonEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function maxNum(a: unknown, b: unknown): number {
  const left = typeof a === 'number' && Number.isFinite(a) ? a : 0
  const right = typeof b === 'number' && Number.isFinite(b) ? b : 0
  return Math.max(left, right)
}

function minStr(a: unknown, b: unknown): string | undefined {
  const left = typeof a === 'string' ? a : undefined
  const right = typeof b === 'string' ? b : undefined
  if (!left) return right
  if (!right) return left
  return left < right ? left : right
}

function maxStr(a: unknown, b: unknown): string | undefined {
  const left = typeof a === 'string' ? a : undefined
  const right = typeof b === 'string' ? b : undefined
  if (!left) return right
  if (!right) return left
  return left > right ? left : right
}

function unionIds(a: unknown, b: unknown): string[] {
  const left = Array.isArray(a) ? a.filter((item) => typeof item === 'string') : []
  const right = Array.isArray(b) ? b.filter((item) => typeof item === 'string') : []
  return [...new Set([...left, ...right])]
}

export function mergeStudyDay(local: unknown, incoming: unknown): unknown {
  const a = asRecord(local) ?? {}
  const b = asRecord(incoming) ?? {}
  return {
    ...a,
    ...b,
    date: b.date ?? a.date,
    completed: Boolean(a.completed) || Boolean(b.completed),
    cardsReviewed: maxNum(a.cardsReviewed, b.cardsReviewed),
    conceptDone: Boolean(a.conceptDone) || Boolean(b.conceptDone),
    questionsAnswered: maxNum(a.questionsAnswered, b.questionsAnswered),
    correctCount: maxNum(a.correctCount, b.correctCount),
    minutesSpent: maxNum(a.minutesSpent, b.minutesSpent),
    minutesMeasured: Boolean(a.minutesMeasured) || Boolean(b.minutesMeasured),
    finishedSessionIds: unionIds(a.finishedSessionIds, b.finishedSessionIds),
    lessonId: b.lessonId ?? a.lessonId,
  }
}

export function mergeLessonCompletion(local: unknown, incoming: unknown): unknown {
  const a = asRecord(local) ?? {}
  const b = asRecord(incoming) ?? {}
  return {
    ...a,
    ...b,
    lessonId: b.lessonId ?? a.lessonId,
    firstCompletedAt: minStr(a.firstCompletedAt, b.firstCompletedAt),
    lastCompletedAt: maxStr(a.lastCompletedAt, b.lastCompletedAt),
    completionCount: maxNum(a.completionCount, b.completionCount),
  }
}

function headFrom(event: SyncEventInput, collection: SyncCollection, payload: unknown): SyncHead {
  return {
    collection,
    entityId: event.entityId,
    eventId: event.eventId,
    updatedAt: event.clientUpdatedAt,
    revision: revisionOf(payload),
    payload,
  }
}

export function applyEventToHead(current: SyncHead | undefined, event: SyncEventInput): ApplyOutcome {
  if (!isSyncCollection(event.collection) || !isSyncOp(event.op)) {
    return current ? { kind: 'keep', head: current } : { kind: 'apply', head: null }
  }
  const collection = event.collection
  if (event.op === 'delete') {
    if (!current) return { kind: 'apply', head: null }
    if (collection === 'activeSession' || collection === 'activeMock') {
      if (current.updatedAt > event.clientUpdatedAt) return { kind: 'conflict', head: current }
    }
    return { kind: 'apply', head: null }
  }

  const incomingUpdated = event.clientUpdatedAt
  const incomingPayload = event.payload

  if (!current) return { kind: 'apply', head: headFrom(event, collection, incomingPayload) }

  if (collection === 'attempts' || collection === 'mockResults') {
    return { kind: 'keep', head: current }
  }

  if (collection === 'studyDays') {
    const merged = mergeStudyDay(current.payload, incomingPayload)
    return {
      kind: 'apply',
      head: {
        ...current,
        eventId: event.eventId,
        updatedAt: incomingUpdated >= current.updatedAt ? incomingUpdated : current.updatedAt,
        payload: merged,
      },
    }
  }

  if (collection === 'lessonCompletions') {
    const merged = mergeLessonCompletion(current.payload, incomingPayload)
    return {
      kind: 'apply',
      head: {
        ...current,
        eventId: event.eventId,
        updatedAt: incomingUpdated >= current.updatedAt ? incomingUpdated : current.updatedAt,
        payload: merged,
      },
    }
  }

  if (collection === 'activeMock') {
    const incomingRev = revisionOf(incomingPayload) ?? 0
    const serverRev = current.revision ?? 0
    if (incomingRev > serverRev) return { kind: 'apply', head: headFrom(event, collection, incomingPayload) }
    if (incomingRev < serverRev) return { kind: 'conflict', head: current }
    if (!jsonEqual(current.payload, incomingPayload)) return { kind: 'conflict', head: current }
    return { kind: 'keep', head: current }
  }

  if (collection === 'activeSession') {
    if (incomingUpdated > current.updatedAt) {
      return { kind: 'apply', head: headFrom(event, collection, incomingPayload) }
    }
    if (incomingUpdated < current.updatedAt) return { kind: 'conflict', head: current }
    if (!jsonEqual(current.payload, incomingPayload)) return { kind: 'conflict', head: current }
    return { kind: 'keep', head: current }
  }

  if (incomingUpdated > current.updatedAt) {
    return { kind: 'apply', head: headFrom(event, collection, incomingPayload) }
  }
  if (incomingUpdated < current.updatedAt) {
    return { kind: 'keep', head: current }
  }
  if (collection === 'settings' || collection === 'mastery' || collection === 'meta' || collection === 'cards') {
    return { kind: 'keep', head: current }
  }
  if (incomingUpdated === current.updatedAt) {
    const localTs = updatedAtOf(current.payload, current.updatedAt)
    const remoteTs = updatedAtOf(incomingPayload, incomingUpdated)
    if (remoteTs > localTs) return { kind: 'apply', head: headFrom(event, collection, incomingPayload) }
  }
  return { kind: 'keep', head: current }
}

export function replayEvents(events: SyncEventInput[]): Map<string, SyncHead> {
  const heads = new Map<string, SyncHead>()
  for (const event of events) {
    if (!isSyncCollection(event.collection)) continue
    const key = `${event.collection}:${event.entityId}`
    const outcome = applyEventToHead(heads.get(key), event)
    if (outcome.kind === 'apply') {
      if (outcome.head) heads.set(key, outcome.head)
      else heads.delete(key)
    }
  }
  return heads
}
