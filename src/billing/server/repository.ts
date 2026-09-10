import type { BillingEnvironment, CanonicalNotification, StoredTransaction, StoreKind } from '../types'

export interface BillingRepository {
  getByOriginalId(
    store: StoreKind,
    environment: BillingEnvironment,
    originalStoreTransactionId: string,
  ): StoredTransaction | undefined
  upsert(row: StoredTransaction): void
  listByAccount(accountId: string): StoredTransaction[]
  listAll(): StoredTransaction[]
  recordNotification(notification: CanonicalNotification, applied: boolean, note: string): boolean
  hasNotification(notificationId: string): boolean
  serialize(): string
}

export interface RecordedNotification {
  notification: CanonicalNotification
  applied: boolean
  note: string
  recordedAt: string
}

export function createMemoryRepository(): BillingRepository & { notifications: RecordedNotification[] } {
  const transactions = new Map<string, StoredTransaction>()
  const notifications: RecordedNotification[] = []
  const notificationIds = new Set<string>()

  const keyOf = (
    store: StoreKind,
    environment: BillingEnvironment,
    originalStoreTransactionId: string,
  ) => `${store}:${environment}:${originalStoreTransactionId}`

  return {
    notifications,
    getByOriginalId(store, environment, originalStoreTransactionId) {
      return transactions.get(keyOf(store, environment, originalStoreTransactionId))
    },
    upsert(row) {
      transactions.set(keyOf(row.store, row.environment, row.originalStoreTransactionId), { ...row })
    },
    listByAccount(accountId) {
      return [...transactions.values()].filter((row) => row.accountId === accountId)
    },
    listAll() {
      return [...transactions.values()].map((row) => ({ ...row }))
    },
    recordNotification(notification, applied, note) {
      if (notificationIds.has(notification.notificationId)) return false
      notificationIds.add(notification.notificationId)
      notifications.push({
        notification,
        applied,
        note,
        recordedAt: notification.eventTime,
      })
      return true
    },
    hasNotification(notificationId) {
      return notificationIds.has(notificationId)
    },
    serialize() {
      return JSON.stringify({
        transactions: [...transactions.values()],
        notifications,
      })
    },
  }
}

export function hydrateMemoryRepository(json: string): ReturnType<typeof createMemoryRepository> {
  const repo = createMemoryRepository()
  const parsed = JSON.parse(json) as {
    transactions?: StoredTransaction[]
    notifications?: RecordedNotification[]
  }
  for (const row of parsed.transactions ?? []) repo.upsert(row)
  for (const item of parsed.notifications ?? []) {
    repo.recordNotification(item.notification, item.applied, item.note)
  }
  return repo
}
