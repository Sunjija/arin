import Dexie, { type EntityTable } from 'dexie'
import type { OutboxRow, SyncConflict, SyncEvent, SyncEventStatus } from './types'

interface KvRow {
  id: string
  value: unknown
}

interface WorkspaceRow {
  ownerKey: string
  payload: unknown
  updatedAt: string
}

class AccountSyncDB extends Dexie {
  kv!: EntityTable<KvRow, 'id'>
  outbox!: EntityTable<OutboxRow, 'eventId'>
  workspaces!: EntityTable<WorkspaceRow, 'ownerKey'>
  conflicts!: EntityTable<SyncConflict, 'id'>

  constructor() {
    super('arin-account-sync')
    this.version(1).stores({
      kv: 'id',
      outbox: 'eventId, status, collection, ownerKey, [ownerKey+status]',
      workspaces: 'ownerKey',
      conflicts: 'id, collection, entityId',
    })
  }
}

export const accountSyncDb = new AccountSyncDB()

export async function kvGet<T>(id: string): Promise<T | undefined> {
  const row = await accountSyncDb.kv.get(id)
  return row?.value as T | undefined
}

export async function kvSet(id: string, value: unknown): Promise<void> {
  await accountSyncDb.kv.put({ id, value })
}

export async function kvDelete(id: string): Promise<void> {
  await accountSyncDb.kv.delete(id)
}

export async function enqueueOutbox(row: OutboxRow): Promise<void> {
  const existing = await accountSyncDb.outbox.get(row.eventId)
  if (existing?.status === 'acked') return
  if (existing && existing.status !== 'pending' && existing.status !== 'failed') return
  await accountSyncDb.outbox.put(row)
}

export async function pendingOutbox(ownerKey: string): Promise<OutboxRow[]> {
  return accountSyncDb.outbox.where('[ownerKey+status]').equals([ownerKey, 'pending']).toArray()
}

export async function failedOutbox(ownerKey: string): Promise<OutboxRow[]> {
  return accountSyncDb.outbox.where('[ownerKey+status]').equals([ownerKey, 'failed']).toArray()
}

export async function inflightOutbox(ownerKey: string): Promise<OutboxRow[]> {
  return accountSyncDb.outbox.where('[ownerKey+status]').equals([ownerKey, 'inflight']).toArray()
}

export async function markOutbox(eventIds: string[], status: SyncEventStatus, lastError: string | null = null): Promise<void> {
  await accountSyncDb.transaction('rw', accountSyncDb.outbox, async () => {
    for (const id of eventIds) {
      const row = await accountSyncDb.outbox.get(id)
      if (!row) continue
      await accountSyncDb.outbox.put({ ...row, status, lastError, attempts: row.attempts + (status === 'inflight' ? 1 : 0) })
    }
  })
}

export async function clearOwnerOutbox(ownerKey: string): Promise<void> {
  await accountSyncDb.outbox.where('ownerKey').equals(ownerKey).delete()
}

export async function saveWorkspace(ownerKey: string, payload: unknown): Promise<void> {
  await accountSyncDb.workspaces.put({ ownerKey, payload, updatedAt: new Date().toISOString() })
}

export async function loadWorkspace(ownerKey: string): Promise<unknown | undefined> {
  const row = await accountSyncDb.workspaces.get(ownerKey)
  return row?.payload
}

export async function deleteWorkspace(ownerKey: string): Promise<void> {
  await accountSyncDb.workspaces.delete(ownerKey)
}

export async function addConflict(conflict: SyncConflict): Promise<void> {
  await accountSyncDb.conflicts.put(conflict)
}

export async function listConflicts(): Promise<SyncConflict[]> {
  return accountSyncDb.conflicts.toArray()
}

export async function clearConflicts(): Promise<void> {
  await accountSyncDb.conflicts.clear()
}

export async function resetAccountSyncDb(): Promise<void> {
  if (accountSyncDb.isOpen()) accountSyncDb.close()
  await accountSyncDb.delete()
  await accountSyncDb.open()
}

export function toOutboxRow(event: SyncEvent, ownerKey: string, status: SyncEventStatus): OutboxRow {
  return {
    ...event,
    ownerKey,
    status,
    attempts: 0,
    lastError: null,
    createdAt: new Date().toISOString(),
  }
}
