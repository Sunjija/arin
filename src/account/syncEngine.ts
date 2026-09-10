import { db } from '../db/database'
import { applyEventToHead, isSyncCollection, replayEvents, type SyncHead } from './apply'
import { runWithoutCapture } from './capture'
import {
  addConflict,
  failedOutbox,
  inflightOutbox,
  kvGet,
  kvSet,
  markOutbox,
  pendingOutbox,
} from './outbox'
import type { AuthAdapter, SyncTransport } from './adapters'
import { learningToEvents, replaceWithSeededGuest, snapshotLearning } from './workspace'
import { AccountError, type AuthSessionView, type SyncEvent } from './types'

const INFLIGHT_TIMEOUT_MS = 30_000

export async function recoverInflight(ownerKey: string): Promise<void> {
  const inflight = await inflightOutbox(ownerKey)
  const stale = inflight.filter((row) => Date.parse(row.createdAt) < Date.now() - INFLIGHT_TIMEOUT_MS)
  if (stale.length) await markOutbox(stale.map((row) => row.eventId), 'pending')
}

export async function flushOutbox(ownerKey: string, transport: SyncTransport): Promise<void> {
  await recoverInflight(ownerKey)
  const pending = [...(await pendingOutbox(ownerKey)), ...(await failedOutbox(ownerKey))]
  if (pending.length === 0) return
  const ids = pending.map((row) => row.eventId)
  await markOutbox(ids, 'inflight')
  try {
    const result = await transport.push(pending)
    await markOutbox(result.accepted.map((item) => item.eventId), 'acked')
    await markOutbox(result.duplicates.map((item) => item.eventId), 'acked')
    await markOutbox(
      result.rejected.map((item) => item.eventId),
      'failed',
      'rejected',
    )
    for (const conflict of result.conflicts) {
      await markOutbox([conflict.eventId], 'conflict', 'sync_conflict')
      if (!isSyncCollection(conflict.collection)) continue
      const local = pending.find((row) => row.eventId === conflict.eventId)
      await addConflict({
        id: conflict.eventId,
        collection: conflict.collection,
        entityId: conflict.entityId,
        local: local?.payload ?? null,
        server: conflict.server,
        createdAt: new Date().toISOString(),
      })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'sync failed'
    await markOutbox(ids, 'failed', message)
    throw error
  }
}

export async function pullAndApply(
  ownerKey: string,
  transport: SyncTransport,
  options: { replace?: boolean } = {},
): Promise<void> {
  let cursor = options.replace ? null : ((await kvGet<string>(`cursor:${ownerKey}`)) ?? null)
  const collected: Array<SyncEvent & { serverSeq: number }> = []
  let hasMore = true
  let nextCursor = cursor ?? '0'
  while (hasMore) {
    const page = await transport.pull(cursor)
    collected.push(...page.events)
    nextCursor = page.nextCursor
    hasMore = page.hasMore
    cursor = page.nextCursor
    if (page.events.length === 0) break
  }
  const heads = replayEvents(collected)
  await runWithoutCapture(async () => {
    if (options.replace) {
      await replaceWithSeededGuest()
      await writeHeads(heads)
    } else {
      await applyHeadsOntoLocal(heads)
    }
  })
  await kvSet(`cursor:${ownerKey}`, nextCursor)
}

async function writeHeads(heads: Map<string, SyncHead>): Promise<void> {
  const grouped = new Map<string, SyncHead[]>()
  for (const head of heads.values()) {
    const list = grouped.get(head.collection) ?? []
    list.push(head)
    grouped.set(head.collection, list)
  }
  for (const [collection, list] of grouped) {
    if (collection === 'activeSession' || collection === 'activeMock') {
      await db.table(collection).clear()
    }
    for (const head of list) {
      if (head.payload && typeof head.payload === 'object') {
        await db.table(collection).put(head.payload)
      }
    }
  }
}

async function applyHeadsOntoLocal(heads: Map<string, SyncHead>): Promise<void> {
  for (const head of heads.values()) {
    const table = db.table(head.collection)
    if (head.collection === 'attempts' || head.collection === 'mockResults') {
      const existing = await table.get(head.entityId)
      if (!existing) await table.put(head.payload)
      continue
    }
    if (head.collection === 'activeSession' || head.collection === 'activeMock') {
      const current = (await table.toCollection().first()) as { updatedAt?: unknown; revision?: unknown } | undefined
      if (current) {
        const outcome = applyEventToHead(
          {
            collection: head.collection,
            entityId: 'active',
            eventId: 'local',
            updatedAt: typeof current.updatedAt === 'string' ? current.updatedAt : '',
            revision: typeof current.revision === 'number' ? current.revision : null,
            payload: current,
          },
          {
            eventId: head.eventId,
            collection: head.collection,
            entityId: 'active',
            op: 'upsert',
            clientUpdatedAt: head.updatedAt,
            deviceId: 'server',
            payload: head.payload,
          },
        )
        if (outcome.kind === 'conflict') {
          await addConflict({
            id: head.eventId,
            collection: head.collection,
            entityId: 'active',
            local: current,
            server: head.payload,
            createdAt: new Date().toISOString(),
          })
          continue
        }
      }
      await table.clear()
      if (head.payload) await table.put(head.payload)
      continue
    }
    if (head.payload) await table.put(head.payload)
  }
}

export async function transferGuestThenPull(input: {
  ownerKey: string
  guestDeviceId: string
  deviceId: string
  transport: SyncTransport
}): Promise<void> {
  const events = await learningToEvents(input.deviceId, input.guestDeviceId)
  if (events.length) {
    await input.transport.transferGuest({ guestDeviceId: input.guestDeviceId, events })
  }
  await pullAndApply(input.ownerKey, input.transport, { replace: true })
}

export async function resolveConflictKeepLocal(ownerKey: string, transport: SyncTransport, eventId: string): Promise<void> {
  await markOutbox([eventId], 'pending')
  await flushOutbox(ownerKey, transport)
}

export async function resolveConflictTakeServer(eventId: string, serverPayload: unknown, collection: string): Promise<void> {
  if (!isSyncCollection(collection)) return
  await runWithoutCapture(async () => {
    if (collection === 'activeSession' || collection === 'activeMock') await db.table(collection).clear()
    if (serverPayload) await db.table(collection).put(serverPayload)
  })
  await markOutbox([eventId], 'acked')
}

export async function parkCurrentUser(userId: string): Promise<void> {
  await snapshotLearning(userId)
}

export async function loginWithAdapters(input: {
  auth: AuthAdapter
  transport: SyncTransport
  guestDeviceId: string
  deviceId: string
  email: string
  password: string
  currentOwnerKey: string
}): Promise<AuthSessionView> {
  if (input.currentOwnerKey !== 'guest') {
    try {
      await flushOutbox(input.currentOwnerKey, input.transport)
    } catch {
      /* 오프라인이면 스냅샷만 남긴다 */
    }
    await parkCurrentUser(input.currentOwnerKey)
  } else {
    await snapshotLearning('guest')
  }
  const logged = await input.auth.login({ email: input.email, password: input.password })
  const userId = logged.session.userId
  if (!userId) throw new AccountError('internal_error', '사용자 식별자가 없습니다.')
  await kvSet('ownerKey', userId)
  if (input.currentOwnerKey === 'guest') {
    await transferGuestThenPull({
      ownerKey: userId,
      guestDeviceId: input.guestDeviceId,
      deviceId: input.deviceId,
      transport: input.transport,
    })
  } else {
    await pullAndApply(userId, input.transport, { replace: true })
  }
  return logged.session
}

export async function registerWithAdapters(input: {
  auth: AuthAdapter
  transport: SyncTransport
  guestDeviceId: string
  deviceId: string
  email: string
  password: string
  ageConfirmed: boolean
}): Promise<AuthSessionView> {
  await snapshotLearning('guest')
  const registered = await input.auth.register({
    email: input.email,
    password: input.password,
    ageConfirmed: input.ageConfirmed,
  })
  const userId = registered.session.userId
  if (!userId) throw new AccountError('internal_error', '사용자 식별자가 없습니다.')
  await kvSet('ownerKey', userId)
  await transferGuestThenPull({
    ownerKey: userId,
    guestDeviceId: input.guestDeviceId,
    deviceId: input.deviceId,
    transport: input.transport,
  })
  return registered.session
}
