import { db } from '../db/database'
import { isSyncCollection, type SyncCollection } from './apply'
import { randomEventId } from './eventId'
import { enqueueOutbox, kvGet, toOutboxRow } from './outbox'
import { entityIdFor } from './workspace'
import type { AccountMode, SyncEventStatus } from './types'

let installed = false
let suppressDepth = 0
let captureOwner = 'guest'
let captureDeviceId = 'dev_unknown'
let captureStatus: SyncEventStatus = 'local-only'

export function setCaptureContext(input: {
  ownerKey: string
  deviceId: string
  mode: AccountMode
  signedIn: boolean
}): void {
  captureOwner = input.ownerKey
  captureDeviceId = input.deviceId
  captureStatus = input.mode === 'demo' || !input.signedIn ? 'local-only' : 'pending'
}

export async function runWithoutCapture<T>(fn: () => Promise<T>): Promise<T> {
  suppressDepth += 1
  try {
    return await fn()
  } finally {
    suppressDepth -= 1
  }
}

function recordFromUnknown(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  return null
}

async function enqueueChange(collection: SyncCollection, op: 'upsert' | 'delete', record: unknown, key?: unknown): Promise<void> {
  if (suppressDepth > 0) return
  const asRecord = recordFromUnknown(record) ?? (op === 'delete' && key !== undefined ? { id: key } : null)
  if (!asRecord) return
  const entityId = entityIdFor(collection, asRecord, key)
  if (!entityId) return
  const ownerKey = (await kvGet<string>('ownerKey')) ?? captureOwner
  await enqueueOutbox(
    toOutboxRow(
      {
        eventId: randomEventId(),
        collection,
        entityId,
        op,
        clientUpdatedAt: new Date().toISOString(),
        deviceId: captureDeviceId,
        payload: op === 'delete' ? { id: entityId } : record,
      },
      ownerKey,
      captureStatus,
    ),
  )
}

export function installLearningCapture(): void {
  if (installed) return
  installed = true
  db.use({
    stack: 'dbcore',
    name: 'arin-account-sync-capture',
    create(downlevelDatabase) {
      return {
        ...downlevelDatabase,
        table(tableName) {
          const table = downlevelDatabase.table(tableName)
          return {
            ...table,
            mutate(req) {
              return table.mutate(req).then((res) => {
                void captureMutate(tableName, req as { type?: string; values?: readonly unknown[]; keys?: readonly unknown[] })
                return res
              })
            },
          }
        },
      }
    },
  })
}

async function captureMutate(
  tableName: string,
  req: { type?: string; values?: readonly unknown[]; keys?: readonly unknown[] },
): Promise<void> {
  if (suppressDepth > 0) return
  if (!isSyncCollection(tableName)) return
  if (req.type === 'deleteRange') return
  const values = req.values ?? []
  const keys = req.keys ?? []
  if (req.type === 'delete') {
    for (const key of keys) {
      await enqueueChange(tableName, 'delete', { id: key }, key)
    }
    return
  }
  if (req.type === 'add' || req.type === 'put') {
    for (let i = 0; i < values.length; i += 1) {
      await enqueueChange(tableName, 'upsert', values[i], keys[i])
    }
  }
}
