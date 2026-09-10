import { FREE_CAPABILITIES, PAID_CAPABILITIES, type Capability, type EntitlementLine, type EntitlementSnapshot, type StoredTransaction, type TransactionStatus } from './types'
import { uniqueCapabilities } from './catalog'

const ENTITLED: ReadonlySet<TransactionStatus> = new Set([
  'active',
  'canceled_will_expire',
  'in_grace',
])

export function isEntitledStatus(status: TransactionStatus, expiresAt: string | null, now: Date): boolean {
  if (!ENTITLED.has(status)) return false
  if (!expiresAt) return status === 'active'
  return new Date(expiresAt).getTime() > now.getTime()
}

export function lineFromStored(row: StoredTransaction): EntitlementLine {
  return {
    productId: row.productId,
    status: row.status,
    autoRenewEnabled: row.autoRenewEnabled,
    expiresAt: row.expiresAt,
    originalStoreTransactionId: row.originalStoreTransactionId,
    store: row.store,
    purchasedAt: row.purchasedAt,
  }
}

export function buildEntitlementSnapshot(input: {
  accountId: string
  environment: EntitlementSnapshot['environment']
  transactions: StoredTransaction[]
  now: Date
  offlineTtlMs: number
  catalogEntitlements: (productId: string) => Capability[]
  stale?: boolean
}): EntitlementSnapshot {
  const live = input.transactions.filter(
    (row) =>
      row.accountId === input.accountId &&
      !row.accountDeletedAt &&
      isEntitledStatus(row.status, row.expiresAt, input.now),
  )
  const paid = uniqueCapabilities(live.flatMap((row) => input.catalogEntitlements(row.productId)))
  const verifiedAt = input.now.toISOString()
  return {
    accountId: input.accountId,
    environment: input.environment,
    capabilities: uniqueCapabilities([...FREE_CAPABILITIES, ...paid]),
    transactions: input.transactions
      .filter((row) => row.accountId === input.accountId)
      .map(lineFromStored),
    verifiedAt,
    offlineValidUntil: new Date(input.now.getTime() + input.offlineTtlMs).toISOString(),
    stale: input.stale ?? false,
  }
}

export function capabilitiesForClientUse(
  snapshot: EntitlementSnapshot | null,
  now: Date,
): { capabilities: Capability[]; stale: boolean; reason: 'none' | 'ok' | 'offline_expired' } {
  if (!snapshot) return { capabilities: [...FREE_CAPABILITIES], stale: true, reason: 'none' }
  if (now.getTime() > new Date(snapshot.offlineValidUntil).getTime()) {
    return { capabilities: [...FREE_CAPABILITIES], stale: true, reason: 'offline_expired' }
  }
  return { capabilities: snapshot.capabilities, stale: snapshot.stale, reason: 'ok' }
}

export function hasCapability(capabilities: readonly Capability[], capability: Capability): boolean {
  return capabilities.includes(capability)
}

export function isPaidCapability(capability: Capability): boolean {
  return (PAID_CAPABILITIES as readonly Capability[]).includes(capability)
}
