import type { Clock } from '../clock'
import { getProductById, getProductByStoreId } from '../catalog'
import { sha256Hex, fingerprintPrefix } from '../crypto'
import { buildEntitlementSnapshot } from '../entitlements'
import { BillingError } from '../errors'
import { isTestToken } from '../store/testAdapter'
import type {
  AccountDeletedResponse,
  BillingCatalog,
  BillingEnvironment,
  CanonicalNotification,
  Capability,
  CatalogResponse,
  EntitlementSnapshot,
  RestoreResponse,
  StoreKind,
  StoreProduct,
  StoredTransaction,
  VerifiedPurchase,
  VerifyRequest,
  VerifyResponse,
} from '../types'
import { DEFAULT_OFFLINE_TTL_MS, MANAGE_SUBSCRIPTION_URLS } from '../types'
import type { BillingRepository } from './repository'
import type { StoreVerifier } from './verifiers'

export interface AccountAuth {
  resolve(authorizationHeader: string | undefined): Promise<{ accountId: string }>
}

export function createTestAccountAuth(): AccountAuth {
  return {
    async resolve(authorizationHeader) {
      const token = authorizationHeader?.replace(/^Bearer\s+/i, '') ?? ''
      if (!token.startsWith('test:')) {
        throw new BillingError('unauthorized', '테스트 환경은 Bearer test:<accountId>만 허용합니다.')
      }
      const accountId = token.slice('test:'.length).trim()
      if (!accountId) throw new BillingError('unauthorized', 'accountId가 없습니다.')
      return { accountId }
    },
  }
}

export function createProductionAccountAuth(resolveFromB?: AccountAuth['resolve']): AccountAuth {
  return {
    async resolve(authorizationHeader) {
      if (resolveFromB) return resolveFromB(authorizationHeader)
      throw new BillingError(
        'unauthorized',
        '계정 토큰 검증기(B)가 연결되지 않았습니다. 운영에서 테스트 인증을 받지 않습니다.',
      )
    },
  }
}

export interface BillingServiceDeps {
  environment: BillingEnvironment
  catalog: BillingCatalog
  clock: Clock
  repo: BillingRepository
  verifiers: Record<StoreKind, StoreVerifier>
  offlineTtlMs?: number
}

export interface BillingService {
  catalog(store: StoreKind, storeProducts: StoreProduct[]): CatalogResponse
  entitlements(accountId: string): EntitlementSnapshot
  verify(accountId: string, request: VerifyRequest): Promise<VerifyResponse>
  restore(
    accountId: string,
    signedPayloads: Array<{ store: StoreKind; signedPayload: string; productId?: string }>,
  ): Promise<RestoreResponse>
  refresh(accountId: string): Promise<EntitlementSnapshot>
  handleNotification(notification: CanonicalNotification): Promise<{
    duplicate: boolean
    stale: boolean
    snapshotAccountIds: string[]
  }>
  accountDeleted(accountId: string, deletedAt: string): AccountDeletedResponse
  assertCapability(accountId: string, capability: Capability): EntitlementSnapshot
  applyVerified(accountId: string | null, purchase: VerifiedPurchase): Promise<VerifyResponse>
}

export function createBillingService(deps: BillingServiceDeps): BillingService {
  const offlineTtlMs = deps.offlineTtlMs ?? DEFAULT_OFFLINE_TTL_MS

  const entitlementsOf = (productId: string): Capability[] =>
    getProductById(deps.catalog, productId)?.entitlements ?? []

  function snapshotFor(accountId: string, stale = false): EntitlementSnapshot {
    return buildEntitlementSnapshot({
      accountId,
      environment: deps.environment,
      transactions: deps.repo.listByAccount(accountId),
      now: deps.clock.now(),
      offlineTtlMs,
      catalogEntitlements: entitlementsOf,
      stale,
    })
  }

  function assertEnvironment(purchase: VerifiedPurchase): void {
    if (purchase.environment === 'test' && deps.environment !== 'test') {
      throw new BillingError(
        'test_transaction_rejected',
        '운영·샌드박스 서버는 테스트 어댑터 거래를 승인하지 않습니다.',
      )
    }
    if (purchase.environment !== deps.environment) {
      throw new BillingError(
        'environment_mismatch',
        '거래 환경과 서버 환경이 다릅니다.',
        { details: { purchase: purchase.environment, server: deps.environment } },
      )
    }
  }

  async function bindAndStore(accountId: string | null, purchase: VerifiedPurchase): Promise<StoredTransaction> {
    assertEnvironment(purchase)
    const product =
      getProductById(deps.catalog, purchase.productId) ??
      getProductByStoreId(deps.catalog, purchase.storeProductId)
    if (!product) {
      throw new BillingError('product_unknown', '카탈로그에 없는 상품입니다.')
    }

    const existing = deps.repo.getByOriginalId(
      purchase.store,
      purchase.environment,
      purchase.originalStoreTransactionId,
    )

    if (accountId && existing?.accountId && existing.accountId !== accountId && !existing.accountDeletedAt) {
      throw new BillingError(
        'purchase_bound_to_other_account',
        '이 구매는 다른 활성 계정에 이미 연결되어 있습니다.',
        {
          details: {
            boundFingerprint: fingerprintPrefix(await sha256Hex(existing.accountId)),
            originalStoreTransactionId: existing.originalStoreTransactionId,
          },
        },
      )
    }

    let boundAccount = existing?.accountDeletedAt ? null : (existing?.accountId ?? null)
    let deletedAt = existing?.accountDeletedAt ?? null
    if (accountId) {
      boundAccount = accountId
      deletedAt = null
    }

    const row: StoredTransaction = {
      originalStoreTransactionId: purchase.originalStoreTransactionId,
      storeTransactionId: purchase.storeTransactionId,
      store: purchase.store,
      environment: purchase.environment,
      productId: product.productId,
      storeProductId: purchase.storeProductId,
      accountId: boundAccount,
      accountDeletedAt: deletedAt,
      status: purchase.status,
      autoRenewEnabled: purchase.autoRenewEnabled,
      purchasedAt: purchase.purchasedAt,
      expiresAt: purchase.expiresAt,
      gracePeriodExpiresAt: purchase.gracePeriodExpiresAt,
      revokedAt: purchase.revokedAt,
      lastStoreEventTime: purchase.eventTime,
      lastVerifiedAt: deps.clock.now().toISOString(),
      tokenFingerprint: purchase.tokenFingerprint,
    }

    deps.repo.upsert(row)
    return row
  }

  async function verifyWithStore(request: VerifyRequest): Promise<VerifiedPurchase> {
    if (isTestToken(request.signedPayload) && deps.environment !== 'test') {
      throw new BillingError(
        'test_transaction_rejected',
        '운영·샌드박스 서버는 테스트 어댑터 거래를 승인하지 않습니다.',
      )
    }
    if (deps.environment !== 'test' && !deps.catalog.salesEnabled && request.store !== 'test') {
      throw new BillingError('sales_not_enabled', '판매가 활성화되지 않았습니다. 권한을 부여하지 않습니다.')
    }
    const verifier = deps.verifiers[request.store]
    const result = await verifier.verifySignedPayload(request.signedPayload)
    if (!result.ok) throw new BillingError(result.code, result.message)
    return result.purchase
  }

  return {
    catalog(store, storeProducts) {
      const priceByStoreId = new Map(storeProducts.map((item) => [item.storeProductId, item.localizedPrice]))
      return {
        salesEnabled: deps.catalog.salesEnabled,
        environment: deps.environment,
        testMode: deps.environment === 'test',
        products: deps.catalog.products.map((product) => {
          const storeProductId = product.storeProductIds[store]
          return {
            productId: product.productId,
            storeProductId,
            type: product.type,
            subscriptionGroup: product.subscriptionGroup,
            entitlements: product.entitlements,
            title: product.title,
            description: product.description,
            terms: product.terms,
            localizedPrice: priceByStoreId.get(storeProductId) ?? null,
            assumedDevPriceDisplay: deps.environment === 'test' ? product.assumedDevPrice.display : null,
          }
        }),
      }
    },
    entitlements(accountId) {
      return snapshotFor(accountId)
    },
    async verify(accountId, request) {
      const purchase = await verifyWithStore(request)
      return this.applyVerified(accountId, purchase)
    },
    async applyVerified(accountId, purchase) {
      const row = await bindAndStore(accountId, purchase)
      const finished = purchase.status !== 'pending_purchase'
      if (!accountId) {
        return {
          snapshot: emptySnapshot('unbound', deps.environment, deps.clock.now(), offlineTtlMs),
          transactionStatus: row.status,
          finished: false,
        }
      }
      return {
        snapshot: snapshotFor(accountId),
        transactionStatus: row.status,
        finished,
      }
    },
    async restore(accountId, signedPayloads) {
      const conflicts: RestoreResponse['conflicts'] = []
      for (const item of signedPayloads) {
        try {
          await this.verify(accountId, {
            store: item.store,
            productId: item.productId ?? '',
            signedPayload: item.signedPayload,
          })
        } catch (error) {
          if (error instanceof BillingError && error.code === 'purchase_bound_to_other_account') {
            conflicts.push({
              originalStoreTransactionId: error.details?.originalStoreTransactionId ?? 'unknown',
              boundAccountIdFingerprint: error.details?.boundFingerprint ?? 'unknown',
            })
            continue
          }
          throw error
        }
      }
      return { snapshot: snapshotFor(accountId), conflicts }
    },
    async refresh(accountId) {
      const rows = deps.repo.listByAccount(accountId).filter((row) => !row.accountDeletedAt)
      for (const row of rows) {
        const result = await deps.verifiers[row.store].refresh(row.originalStoreTransactionId)
        if (!result.ok) {
          throw new BillingError(result.code, result.message)
        }
        await bindAndStore(accountId, result.purchase)
      }
      return snapshotFor(accountId)
    },
    async handleNotification(notification) {
      if (notification.environment === 'test' && deps.environment !== 'test') {
        throw new BillingError(
          'test_transaction_rejected',
          '운영 서버는 테스트 알림으로 권한을 바꾸지 않습니다.',
        )
      }
      if (deps.repo.hasNotification(notification.notificationId)) {
        return { duplicate: true, stale: false, snapshotAccountIds: [] }
      }
      if (notification.type === 'test_ping') {
        deps.repo.recordNotification(notification, false, 'test ping ignored for entitlements')
        return { duplicate: false, stale: false, snapshotAccountIds: [] }
      }

      const existing = deps.repo.getByOriginalId(
        notification.store,
        notification.environment,
        notification.originalStoreTransactionId,
      )
      const stale =
        !!existing &&
        new Date(notification.eventTime).getTime() < new Date(existing.lastStoreEventTime).getTime() &&
        notification.type !== 'refunded' &&
        notification.type !== 'revoked'

      const verifier = deps.verifiers[notification.store]
      const fromPayload = await verifier.verifySignedPayload(notification.signedPayload)
      const fromRefresh = await verifier.refresh(notification.originalStoreTransactionId)
      const result = fromRefresh.ok ? fromRefresh : fromPayload
      if (!result.ok) {
        throw new BillingError(result.code, result.message)
      }

      const row = await bindAndStore(existing?.accountId ?? result.purchase.accountHint, result.purchase)
      deps.repo.recordNotification(notification, true, stale ? 'stale_notification_refresh_applied' : 'applied')
      return {
        duplicate: false,
        stale,
        snapshotAccountIds: row.accountId ? [row.accountId] : [],
      }
    },
    accountDeleted(accountId, deletedAt) {
      const open: StoredTransaction[] = []
      for (const row of deps.repo.listByAccount(accountId)) {
        const next = { ...row, accountDeletedAt: deletedAt }
        deps.repo.upsert(next)
        if (row.autoRenewEnabled || row.status === 'canceled_will_expire' || row.status === 'active') {
          open.push(next)
        }
      }
      return {
        snapshotCleared: true,
        manageUrls: MANAGE_SUBSCRIPTION_URLS,
        openStoreSubscriptions: open.map((row) => ({
          productId: row.productId,
          status: row.status,
          autoRenewEnabled: row.autoRenewEnabled,
          expiresAt: row.expiresAt,
          originalStoreTransactionId: row.originalStoreTransactionId,
          store: row.store,
          purchasedAt: row.purchasedAt,
        })),
      }
    },
    assertCapability(accountId, capability) {
      const snapshot = snapshotFor(accountId)
      if (!snapshot.capabilities.includes(capability)) {
        throw new BillingError('entitlement_inactive', '이 계정에는 해당 유료 권한이 없습니다.')
      }
      return snapshot
    },
  }
}

function emptySnapshot(
  accountId: string,
  environment: BillingEnvironment,
  now: Date,
  offlineTtlMs: number,
): EntitlementSnapshot {
  return buildEntitlementSnapshot({
    accountId,
    environment,
    transactions: [],
    now,
    offlineTtlMs,
    catalogEntitlements: () => [],
  })
}

export type { CatalogResponse }
