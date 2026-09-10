import { exportAllData, restoreBackup } from '../db/backup'
import { db } from '../db/database'
import { clearAllLearningData } from '../db/seed'
import { isSyncCollection, type SyncCollection } from './apply'
import { guestEventId } from './eventId'
import { loadWorkspace, saveWorkspace } from './outbox'
import type { SyncEvent } from './types'

const TABLE_COLLECTIONS: SyncCollection[] = [
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
]

export function entityIdFor(collection: SyncCollection, record: Record<string, unknown>, key?: unknown): string {
  if (collection === 'settings' || collection === 'mastery' || collection === 'meta') return collection === 'meta' ? 'meta' : collection
  if (collection === 'activeSession' || collection === 'activeMock') return 'active'
  if (collection === 'studyDays') return String(record.date ?? key ?? '')
  if (collection === 'lessonCompletions') return String(record.lessonId ?? key ?? '')
  return String(record.id ?? key ?? '')
}

export async function snapshotLearning(ownerKey: string): Promise<void> {
  try {
    const payload = await exportAllData()
    await saveWorkspace(ownerKey, payload)
  } catch {
    await saveWorkspace(ownerKey, { empty: true })
  }
}

export async function restoreLearning(ownerKey: string): Promise<boolean> {
  const payload = await loadWorkspace(ownerKey)
  if (!payload || (typeof payload === 'object' && payload !== null && 'empty' in payload)) {
    await clearAllLearningData()
    return false
  }
  const restored = await restoreBackup(payload)
  if (!restored.ok) {
    await clearAllLearningData()
    return false
  }
  return true
}

export async function replaceWithSeededGuest(): Promise<void> {
  await clearAllLearningData()
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  return null
}

export async function learningToEvents(deviceId: string, guestDeviceId?: string): Promise<SyncEvent[]> {
  const now = new Date().toISOString()
  const events: SyncEvent[] = []
  for (const collection of TABLE_COLLECTIONS) {
    if (!isSyncCollection(collection)) continue
    const rows = await db.table(collection).toArray()
    for (const row of rows) {
      const record = asRecord(row)
      if (!record) continue
      const entityId = entityIdFor(collection, record)
      if (!entityId) continue
      const updatedAt =
        typeof record.updatedAt === 'string'
          ? record.updatedAt
          : typeof record.createdAt === 'string'
            ? record.createdAt
            : now
      events.push({
        eventId: guestDeviceId ? guestEventId(guestDeviceId, collection, entityId) : `evt_${crypto.randomUUID()}`,
        collection,
        entityId,
        op: 'upsert',
        clientUpdatedAt: updatedAt,
        deviceId,
        payload: row,
      })
    }
  }
  return events
}

export { TABLE_COLLECTIONS }
