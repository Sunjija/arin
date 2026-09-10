import type { Clock } from '../clock'
import { getProductById } from '../catalog'
import { capabilitiesForClientUse, hasCapability } from '../entitlements'
import { BillingError, isBillingError } from '../errors'
import type { BillingService } from '../server/service'
import type { NativeStoreBilling, NativeStoreTransaction } from '../store/native'
import type { TestStoreControls } from '../store/testAdapter'
import type {
  BillingCatalog,
  Capability,
  CatalogResponse,
  EntitlementSnapshot,
} from '../types'
import type { ClientPersistence } from './persistence'

export type PurchaseFlowResult =
  | { status: 'purchased'; snapshot: EntitlementSnapshot }
  | { status: 'cancelled' }
  | { status: 'pending'; originalStoreTransactionId?: string }
  | { status: 'failed'; code: string; message: string }

export interface BillingClient {
  accountId(): string
  setAccountId(accountId: string): void
  loadCatalog(): Promise<CatalogResponse>
  currentSnapshot(): EntitlementSnapshot | null
  visibleCapabilities(now?: Date): Capability[]
  hasPaidAccess(capability: Capability, now?: Date): boolean
  purchase(productId: string): Promise<PurchaseFlowResult>
  restore(): Promise<{ snapshot: EntitlementSnapshot; conflicts: RestoreConflict[] }>
  refresh(): Promise<EntitlementSnapshot>
  recoverUnfinished(): Promise<void>
  inFlight(): boolean
}

export interface RestoreConflict {
  originalStoreTransactionId: string
  boundAccountIdFingerprint: string
}

export function createBillingClient(deps: {
  catalog: BillingCatalog
  store: NativeStoreBilling
  service: BillingService
  persistence: ClientPersistence
  clock: Clock
}): BillingClient {
  let busy = false

  const withLock = async <T,>(fn: () => Promise<T>): Promise<T> => {
    if (busy) {
      throw new BillingError('in_flight', '이미 결제 요청을 처리하고 있습니다.')
    }
    busy = true
    try {
      return await fn()
    } finally {
      busy = false
    }
  }

  const saveUnfinished = (rows: NativeStoreTransaction[]) => {
    deps.persistence.setUnfinished(rows)
  }

  const addUnfinished = (tx: NativeStoreTransaction) => {
    const current = deps.persistence.getUnfinished().filter(
      (row) => row.storeTransactionId !== tx.storeTransactionId,
    )
    saveUnfinished([...current, tx])
  }

  const removeUnfinished = (storeTransactionId: string) => {
    saveUnfinished(
      deps.persistence.getUnfinished().filter((row) => row.storeTransactionId !== storeTransactionId),
    )
  }

  const verifyTx = async (tx: NativeStoreTransaction, productId: string) => {
    const result = await deps.service.verify(deps.persistence.getAccountId(), {
      store: deps.store.store,
      productId,
      signedPayload: tx.signedPayload,
    })
    deps.persistence.setSnapshot(result.snapshot)
    if (result.finished) {
      await deps.store.finish(tx.storeTransactionId)
      if (deps.store.store === 'google' || deps.store.store === 'test') {
        await deps.store.acknowledge(tx.signedPayload)
      }
      removeUnfinished(tx.storeTransactionId)
    }
    return result
  }

  return {
    accountId() {
      return deps.persistence.getAccountId()
    },
    setAccountId(accountId) {
      deps.persistence.setAccountId(accountId)
      deps.persistence.setSnapshot(null)
    },
    async loadCatalog() {
      const ids = deps.catalog.products.map((product) => product.storeProductIds[deps.store.store])
      const storeProducts = await deps.store.getProducts(ids)
      return deps.service.catalog(deps.store.store, storeProducts)
    },
    currentSnapshot() {
      return deps.persistence.getSnapshot()
    },
    visibleCapabilities(now = deps.clock.now()) {
      return capabilitiesForClientUse(deps.persistence.getSnapshot(), now).capabilities
    },
    hasPaidAccess(capability, now = deps.clock.now()) {
      return hasCapability(capabilitiesForClientUse(deps.persistence.getSnapshot(), now).capabilities, capability)
    },
    async purchase(productId) {
      try {
        return await withLock(async () => {
          const product = getProductById(deps.catalog, productId)
          if (!product) {
            return { status: 'failed', code: 'product_unknown', message: '알 수 없는 상품입니다.' }
          }
          const result = await deps.store.purchase({
            storeProductId: product.storeProductIds[deps.store.store],
            accountId: deps.persistence.getAccountId(),
          })
          if (result.status === 'cancelled') return { status: 'cancelled' }
          if (result.status === 'pending') {
            return { status: 'pending', originalStoreTransactionId: result.originalStoreTransactionId }
          }
          if (result.status === 'error') {
            return { status: 'failed', code: result.code, message: result.message }
          }
          addUnfinished(result.transaction)
          try {
            const verified = await verifyTx(result.transaction, productId)
            return { status: 'purchased', snapshot: verified.snapshot }
          } catch (error) {
            return toFailed(error)
          }
        })
      } catch (error) {
        return toFailed(error)
      }
    },
    async restore() {
      const txs = await deps.store.restore()
      const restored = await deps.service.restore(
        deps.persistence.getAccountId(),
        txs.map((tx) => ({
          store: deps.store.store,
          signedPayload: tx.signedPayload,
        })),
      )
      deps.persistence.setSnapshot(restored.snapshot)
      return restored
    },
    async refresh() {
      const snapshot = await deps.service.refresh(deps.persistence.getAccountId())
      deps.persistence.setSnapshot(snapshot)
      return snapshot
    },
    async recoverUnfinished() {
      const local = deps.persistence.getUnfinished()
      const fromStore = await deps.store.unfinished()
      const pending = [...local]
      for (const tx of fromStore) {
        if (!pending.some((row) => row.storeTransactionId === tx.storeTransactionId)) pending.push(tx)
      }
      for (const tx of pending) {
        const product = deps.catalog.products.find((item) =>
          Object.values(item.storeProductIds).includes(tx.storeProductId),
        )
        try {
          await verifyTx(tx, product?.productId ?? '')
        } catch {
          /* keep unfinished for retry */
        }
      }
    },
    inFlight() {
      return busy
    },
  }
}

function toFailed(error: unknown): PurchaseFlowResult {
  if (isBillingError(error)) return { status: 'failed', code: error.code, message: error.message }
  return {
    status: 'failed',
    code: 'store_verification_failed',
    message: error instanceof Error ? error.message : '결제 확인에 실패했습니다.',
  }
}

export function isTestStore(store: NativeStoreBilling): store is NativeStoreBilling & TestStoreControls {
  return store.store === 'test' && 'setNextPurchaseBehavior' in store
}
