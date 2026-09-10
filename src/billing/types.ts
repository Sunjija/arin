export type BillingEnvironment = 'test' | 'sandbox' | 'production'

export type StoreKind = 'apple' | 'google' | 'test'

export type ProductType = 'auto_renewable_subscription' | 'non_renewing_period'

export type Capability =
  | 'study_daily'
  | 'review_cards'
  | 'library'
  | 'progress'
  | 'mock_sample'
  | 'full_mock'
  | 'extended_study'

export type TransactionStatus =
  | 'pending_purchase'
  | 'active'
  | 'canceled_will_expire'
  | 'in_grace'
  | 'on_hold'
  | 'paused'
  | 'expired'
  | 'refunded'
  | 'revoked'

export type BillingErrorCode =
  | 'unauthorized'
  | 'sales_not_enabled'
  | 'product_unknown'
  | 'store_verification_failed'
  | 'store_verification_unavailable'
  | 'test_transaction_rejected'
  | 'environment_mismatch'
  | 'purchase_bound_to_other_account'
  | 'pending_purchase'
  | 'entitlement_inactive'
  | 'duplicate_notification'
  | 'stale_notification'
  | 'conflict'
  | 'not_found'
  | 'invalid_request'
  | 'user_cancelled'
  | 'in_flight'

export const FREE_CAPABILITIES: readonly Capability[] = [
  'study_daily',
  'review_cards',
  'library',
  'progress',
  'mock_sample',
]

export const PAID_CAPABILITIES: readonly Capability[] = ['full_mock', 'extended_study']

export const ENTITLED_STATUSES: readonly TransactionStatus[] = [
  'active',
  'canceled_will_expire',
  'in_grace',
]

export interface LocalizedPrice {
  currency: string
  amount: number
  display: string
}

export interface CatalogProduct {
  productId: string
  storeProductIds: Record<StoreKind, string>
  type: ProductType
  subscriptionGroup: string | null
  durationMs: number
  entitlements: Capability[]
  title: string
  description: string
  terms: string
  assumedDevPrice: LocalizedPrice
}

export interface BillingCatalog {
  version: 1
  salesEnabled: boolean
  /** 판매용이 아닌 개발 카탈로그임을 명시 */
  purpose: 'development-assumption'
  products: CatalogProduct[]
}

export interface EntitlementLine {
  productId: string
  status: TransactionStatus
  autoRenewEnabled: boolean | null
  expiresAt: string | null
  originalStoreTransactionId: string
  store: StoreKind
  purchasedAt: string
}

export interface EntitlementSnapshot {
  accountId: string
  environment: BillingEnvironment
  capabilities: Capability[]
  transactions: EntitlementLine[]
  verifiedAt: string
  offlineValidUntil: string
  stale: boolean
}

export interface StoredTransaction {
  originalStoreTransactionId: string
  storeTransactionId: string
  store: StoreKind
  environment: BillingEnvironment
  productId: string
  storeProductId: string
  accountId: string | null
  accountDeletedAt: string | null
  status: TransactionStatus
  autoRenewEnabled: boolean | null
  purchasedAt: string
  expiresAt: string | null
  gracePeriodExpiresAt: string | null
  revokedAt: string | null
  lastStoreEventTime: string
  lastVerifiedAt: string
  tokenFingerprint: string
}

export interface VerifiedPurchase {
  store: StoreKind
  environment: BillingEnvironment
  productId: string
  storeProductId: string
  originalStoreTransactionId: string
  storeTransactionId: string
  status: TransactionStatus
  autoRenewEnabled: boolean | null
  purchasedAt: string
  expiresAt: string | null
  gracePeriodExpiresAt: string | null
  revokedAt: string | null
  eventTime: string
  accountHint: string | null
  tokenFingerprint: string
}

export type VerifyResult =
  | { ok: true; purchase: VerifiedPurchase }
  | { ok: false; code: BillingErrorCode; message: string }

export type CanonicalNotificationType =
  | 'purchased'
  | 'renewed'
  | 'cancel_scheduled'
  | 'renew_enabled'
  | 'in_grace'
  | 'on_hold'
  | 'paused'
  | 'expired'
  | 'refunded'
  | 'revoked'
  | 'pending'
  | 'pending_canceled'
  | 'test_ping'

export interface CanonicalNotification {
  notificationId: string
  environment: BillingEnvironment
  store: StoreKind
  eventTime: string
  type: CanonicalNotificationType
  originalStoreTransactionId: string
  signedPayload: string
}

export interface BillingErrorBody {
  error: BillingErrorCode
  message: string
  details?: Record<string, string>
}

export interface CatalogProductView {
  productId: string
  storeProductId: string
  type: ProductType
  subscriptionGroup: string | null
  entitlements: Capability[]
  title: string
  description: string
  terms: string
  localizedPrice: LocalizedPrice | null
  assumedDevPriceDisplay: string | null
}

export interface CatalogResponse {
  salesEnabled: boolean
  environment: BillingEnvironment
  testMode: boolean
  products: CatalogProductView[]
}

export interface VerifyRequest {
  store: StoreKind
  productId: string
  signedPayload: string
  appAccountToken?: string
}

export interface VerifyResponse {
  snapshot: EntitlementSnapshot
  transactionStatus: TransactionStatus
  finished: boolean
}

export interface RestoreResponse {
  snapshot: EntitlementSnapshot
  conflicts: Array<{ originalStoreTransactionId: string; boundAccountIdFingerprint: string }>
}

export interface AccountDeletedResponse {
  snapshotCleared: true
  manageUrls: Record<'apple' | 'google', string>
  openStoreSubscriptions: EntitlementLine[]
}

export interface StoreProduct {
  storeProductId: string
  localizedTitle: string
  localizedDescription: string
  localizedPrice: LocalizedPrice
}

export interface NativeStoreTransaction {
  storeProductId: string
  originalStoreTransactionId: string
  storeTransactionId: string
  signedPayload: string
  purchasedAt: string
  environment: BillingEnvironment
}

export type NativePurchaseResult =
  | { status: 'purchased'; transaction: NativeStoreTransaction }
  | { status: 'pending'; originalStoreTransactionId: string }
  | { status: 'cancelled' }
  | { status: 'error'; code: string; message: string }

export interface NativeStoreBilling {
  readonly store: StoreKind
  getProducts(storeProductIds: string[]): Promise<StoreProduct[]>
  purchase(input: {
    storeProductId: string
    accountId: string
    appAccountToken?: string
    obfuscatedAccountId?: string
  }): Promise<NativePurchaseResult>
  restore(): Promise<NativeStoreTransaction[]>
  unfinished(): Promise<NativeStoreTransaction[]>
  finish(storeTransactionId: string): Promise<void>
  acknowledge(purchaseToken: string): Promise<void>
  subscribeUpdates(cb: (tx: NativeStoreTransaction) => void): () => void
  showManageSubscriptions(storeProductId?: string): Promise<void>
}

export const MANAGE_SUBSCRIPTION_URLS = {
  apple: 'https://apps.apple.com/account/subscriptions',
  google: 'https://play.google.com/store/account/subscriptions',
} as const

export const DEFAULT_OFFLINE_TTL_MS = 48 * 60 * 60 * 1000
