import { getProductById, getProductByStoreId } from '../catalog'
import { TEST_STORE_HMAC_SECRET, hmacSha256Hex, sha256Hex, utf8ToB64url, b64urlToUtf8 } from '../crypto'
import type { Clock } from '../clock'
import { plusMs, toIso } from '../clock'
import type { StoreVerifier } from '../server/verifiers'
import type {
  BillingCatalog,
  CanonicalNotification,
  CanonicalNotificationType,
  NativeStoreBilling,
  NativeStoreTransaction,
  StoreProduct,
  TransactionStatus,
  VerifiedPurchase,
  VerifyResult,
} from '../types'

export type NextPurchaseBehavior = 'success' | 'cancelled' | 'pending' | 'error'

export interface TestStoreRecord {
  originalStoreTransactionId: string
  storeTransactionId: string
  productId: string
  storeProductId: string
  status: TransactionStatus
  autoRenewEnabled: boolean | null
  purchasedAt: string
  expiresAt: string | null
  gracePeriodExpiresAt: string | null
  revokedAt: string | null
  eventTime: string
  finished: boolean
  accountHint: string | null
}

interface SignedBody {
  v: 1
  environment: 'test'
  originalStoreTransactionId: string
  storeTransactionId: string
  productId: string
  storeProductId: string
  status: TransactionStatus
  autoRenewEnabled: boolean | null
  purchasedAt: string
  expiresAt: string | null
  gracePeriodExpiresAt: string | null
  revokedAt: string | null
  eventTime: string
  accountHint: string | null
}

interface WorldState {
  seq: number
  nextBehavior: NextPurchaseBehavior
  unavailable: boolean
  records: Map<string, TestStoreRecord>
  unfinished: Set<string>
}

export interface TestStoreControls {
  setNextPurchaseBehavior(behavior: NextPurchaseBehavior): void
}

export interface TestStoreWorld {
  readonly store: 'test'
  readonly verifier: StoreVerifier
  readonly state: WorldState
  createAdapter(): NativeStoreBilling & TestStoreControls
  getRecord(originalStoreTransactionId: string): TestStoreRecord | undefined
  listRecords(): TestStoreRecord[]
  setUnavailable(value: boolean): void
  setNextPurchaseBehavior(behavior: NextPurchaseBehavior): void
  approvePending(originalStoreTransactionId: string): Promise<CanonicalNotification>
  rejectPending(originalStoreTransactionId: string): Promise<CanonicalNotification>
  renew(originalStoreTransactionId: string): Promise<CanonicalNotification>
  scheduleCancel(originalStoreTransactionId: string): Promise<CanonicalNotification>
  enableRenew(originalStoreTransactionId: string): Promise<CanonicalNotification>
  expire(originalStoreTransactionId: string): Promise<CanonicalNotification>
  refund(originalStoreTransactionId: string): Promise<CanonicalNotification>
  enterGrace(originalStoreTransactionId: string): Promise<CanonicalNotification>
  enterHold(originalStoreTransactionId: string): Promise<CanonicalNotification>
  emitNotification(
    originalStoreTransactionId: string,
    type: CanonicalNotificationType,
  ): Promise<CanonicalNotification>
  serialize(): string
}

export function createTestStoreWorld(options: {
  catalog: BillingCatalog
  clock: Clock
  hmacSecret?: string
  state?: WorldState
}): TestStoreWorld {
  const secret = options.hmacSecret ?? TEST_STORE_HMAC_SECRET
  const state: WorldState =
    options.state ??
    ({
      seq: 0,
      nextBehavior: 'success',
      unavailable: false,
      records: new Map(),
      unfinished: new Set(),
    } satisfies WorldState)
  const listeners = new Set<(tx: NativeStoreTransaction) => void>()

  const newId = (prefix: string) => {
    state.seq += 1
    return `${prefix}_${state.seq}_${options.clock.now().getTime()}`
  }

  async function sign(record: TestStoreRecord): Promise<string> {
    const body: SignedBody = {
      v: 1,
      environment: 'test',
      originalStoreTransactionId: record.originalStoreTransactionId,
      storeTransactionId: record.storeTransactionId,
      productId: record.productId,
      storeProductId: record.storeProductId,
      status: record.status,
      autoRenewEnabled: record.autoRenewEnabled,
      purchasedAt: record.purchasedAt,
      expiresAt: record.expiresAt,
      gracePeriodExpiresAt: record.gracePeriodExpiresAt,
      revokedAt: record.revokedAt,
      eventTime: record.eventTime,
      accountHint: record.accountHint,
    }
    const payload = utf8ToB64url(JSON.stringify(body))
    const mac = await hmacSha256Hex(secret, payload)
    return `test.v1.${payload}.${mac}`
  }

  async function toVerified(record: TestStoreRecord): Promise<VerifiedPurchase> {
    const signed = await sign(record)
    return {
      store: 'test',
      environment: 'test',
      productId: record.productId,
      storeProductId: record.storeProductId,
      originalStoreTransactionId: record.originalStoreTransactionId,
      storeTransactionId: record.storeTransactionId,
      status: record.status,
      autoRenewEnabled: record.autoRenewEnabled,
      purchasedAt: record.purchasedAt,
      expiresAt: record.expiresAt,
      gracePeriodExpiresAt: record.gracePeriodExpiresAt,
      revokedAt: record.revokedAt,
      eventTime: record.eventTime,
      accountHint: record.accountHint,
      tokenFingerprint: await sha256Hex(signed),
    }
  }

  async function verifiedResult(record: TestStoreRecord | undefined): Promise<VerifyResult> {
    if (state.unavailable) {
      return {
        ok: false,
        code: 'store_verification_unavailable',
        message: '테스트 스토어 검증을 일시적으로 사용할 수 없습니다.',
      }
    }
    if (!record) {
      return { ok: false, code: 'not_found', message: '테스트 스토어에 해당 거래가 없습니다.' }
    }
    return { ok: true, purchase: await toVerified(record) }
  }

  const verifier: StoreVerifier = {
    store: 'test',
    async verifySignedPayload(signedPayload: string) {
      if (state.unavailable) {
        return {
          ok: false,
          code: 'store_verification_unavailable',
          message: '테스트 스토어 검증을 일시적으로 사용할 수 없습니다.',
        }
      }
      const parsed = await parseTestToken(signedPayload, secret)
      if (!parsed.ok) return parsed
      const current = state.records.get(parsed.body.originalStoreTransactionId)
      if (current) return verifiedResult(current)
      return { ok: true, purchase: await verifiedFromBody(parsed.body, signedPayload) }
    },
    async refresh(originalStoreTransactionId: string) {
      return verifiedResult(state.records.get(originalStoreTransactionId))
    },
  }

  async function verifiedFromBody(body: SignedBody, signedPayload: string): Promise<VerifiedPurchase> {
    return {
      store: 'test',
      environment: 'test',
      productId: body.productId,
      storeProductId: body.storeProductId,
      originalStoreTransactionId: body.originalStoreTransactionId,
      storeTransactionId: body.storeTransactionId,
      status: body.status,
      autoRenewEnabled: body.autoRenewEnabled,
      purchasedAt: body.purchasedAt,
      expiresAt: body.expiresAt,
      gracePeriodExpiresAt: body.gracePeriodExpiresAt,
      revokedAt: body.revokedAt,
      eventTime: body.eventTime,
      accountHint: body.accountHint,
      tokenFingerprint: await sha256Hex(signedPayload),
    }
  }

  async function nativeTx(record: TestStoreRecord): Promise<NativeStoreTransaction> {
    return {
      storeProductId: record.storeProductId,
      originalStoreTransactionId: record.originalStoreTransactionId,
      storeTransactionId: record.storeTransactionId,
      signedPayload: await sign(record),
      purchasedAt: record.purchasedAt,
      environment: 'test',
    }
  }

  async function notify(
    record: TestStoreRecord,
    type: CanonicalNotificationType,
  ): Promise<CanonicalNotification> {
    return {
      notificationId: newId('ntf'),
      environment: 'test',
      store: 'test',
      eventTime: record.eventTime,
      type,
      originalStoreTransactionId: record.originalStoreTransactionId,
      signedPayload: await sign(record),
    }
  }

  function requireRecord(id: string): TestStoreRecord {
    const record = state.records.get(id)
    if (!record) throw new Error(`unknown test transaction ${id}`)
    return record
  }

  function touch(record: TestStoreRecord, patch: Partial<TestStoreRecord>): TestStoreRecord {
    const next: TestStoreRecord = {
      ...record,
      ...patch,
      eventTime: toIso(options.clock.now()),
    }
    state.records.set(next.originalStoreTransactionId, next)
    if (!next.finished) state.unfinished.add(next.originalStoreTransactionId)
    return next
  }

  return {
    store: 'test',
    verifier,
    state,
    createAdapter() {
      const adapter: NativeStoreBilling & TestStoreControls = {
        store: 'test',
        setNextPurchaseBehavior(behavior) {
          state.nextBehavior = behavior
        },
        async getProducts(storeProductIds) {
          return storeProductIds.flatMap((id) => {
            const product = getProductByStoreId(options.catalog, id)
            if (!product) return []
            const view: StoreProduct = {
              storeProductId: id,
              localizedTitle: product.title,
              localizedDescription: product.description,
              localizedPrice: product.assumedDevPrice,
            }
            return [view]
          })
        },
        async purchase(input) {
          const product = getProductByStoreId(options.catalog, input.storeProductId)
          if (!product) {
            return { status: 'error', code: 'product_unknown', message: '알 수 없는 상품입니다.' }
          }
          const behavior = state.nextBehavior
          state.nextBehavior = 'success'
          if (behavior === 'cancelled') return { status: 'cancelled' }
          if (behavior === 'error') {
            return { status: 'error', code: 'store_error', message: '테스트 스토어 오류' }
          }
          const now = options.clock.now()
          const originalId = newId('orig')
          const record: TestStoreRecord = {
            originalStoreTransactionId: originalId,
            storeTransactionId: newId('txn'),
            productId: product.productId,
            storeProductId: input.storeProductId,
            status: behavior === 'pending' ? 'pending_purchase' : 'active',
            autoRenewEnabled: product.type === 'auto_renewable_subscription' ? true : null,
            purchasedAt: toIso(now),
            expiresAt: plusMs(now, product.durationMs).toISOString(),
            gracePeriodExpiresAt: null,
            revokedAt: null,
            eventTime: toIso(now),
            finished: false,
            accountHint: input.accountId,
          }
          state.records.set(originalId, record)
          state.unfinished.add(originalId)
          if (behavior === 'pending') {
            return { status: 'pending', originalStoreTransactionId: originalId }
          }
          const transaction = await nativeTx(record)
          for (const listener of listeners) listener(transaction)
          return { status: 'purchased', transaction }
        },
        async restore() {
          const result: NativeStoreTransaction[] = []
          for (const record of state.records.values()) {
            if (record.status === 'pending_purchase') continue
            result.push(await nativeTx(record))
          }
          return result
        },
        async unfinished() {
          const result: NativeStoreTransaction[] = []
          for (const id of state.unfinished) {
            const record = state.records.get(id)
            if (!record || record.status === 'pending_purchase') continue
            result.push(await nativeTx(record))
          }
          return result
        },
        async finish(storeTransactionId) {
          for (const record of state.records.values()) {
            if (record.storeTransactionId === storeTransactionId) {
              record.finished = true
              state.unfinished.delete(record.originalStoreTransactionId)
            }
          }
        },
        async acknowledge(purchaseToken) {
          const parsed = await parseTestToken(purchaseToken, secret)
          if (!parsed.ok) return
          const record = state.records.get(parsed.body.originalStoreTransactionId)
          if (!record) return
          record.finished = true
          state.unfinished.delete(record.originalStoreTransactionId)
        },
        subscribeUpdates(cb) {
          listeners.add(cb)
          return () => {
            listeners.delete(cb)
          }
        },
        async showManageSubscriptions() {
          return
        },
      }
      return adapter
    },
    getRecord(id) {
      return state.records.get(id)
    },
    listRecords() {
      return [...state.records.values()].map((row) => ({ ...row }))
    },
    setUnavailable(value) {
      state.unavailable = value
    },
    setNextPurchaseBehavior(behavior) {
      state.nextBehavior = behavior
    },
    async approvePending(originalStoreTransactionId) {
      const next = touch(requireRecord(originalStoreTransactionId), { status: 'active' })
      const tx = await nativeTx(next)
      for (const listener of listeners) listener(tx)
      return notify(next, 'purchased')
    },
    async rejectPending(originalStoreTransactionId) {
      const next = touch(requireRecord(originalStoreTransactionId), {
        status: 'expired',
        expiresAt: toIso(options.clock.now()),
      })
      state.unfinished.delete(originalStoreTransactionId)
      return notify(next, 'pending_canceled')
    },
    async renew(originalStoreTransactionId) {
      const record = requireRecord(originalStoreTransactionId)
      const product = getProductById(options.catalog, record.productId)
      const next = touch(record, {
        status: 'active',
        autoRenewEnabled: true,
        storeTransactionId: newId('txn'),
        expiresAt: plusMs(options.clock.now(), product?.durationMs ?? 0).toISOString(),
        finished: false,
      })
      return notify(next, 'renewed')
    },
    async scheduleCancel(originalStoreTransactionId) {
      const next = touch(requireRecord(originalStoreTransactionId), {
        status: 'canceled_will_expire',
        autoRenewEnabled: false,
      })
      return notify(next, 'cancel_scheduled')
    },
    async enableRenew(originalStoreTransactionId) {
      const next = touch(requireRecord(originalStoreTransactionId), {
        status: 'active',
        autoRenewEnabled: true,
      })
      return notify(next, 'renew_enabled')
    },
    async expire(originalStoreTransactionId) {
      const next = touch(requireRecord(originalStoreTransactionId), {
        status: 'expired',
        expiresAt: toIso(options.clock.now()),
        autoRenewEnabled: false,
      })
      return notify(next, 'expired')
    },
    async refund(originalStoreTransactionId) {
      const next = touch(requireRecord(originalStoreTransactionId), {
        status: 'refunded',
        revokedAt: toIso(options.clock.now()),
        expiresAt: toIso(options.clock.now()),
      })
      return notify(next, 'refunded')
    },
    async enterGrace(originalStoreTransactionId) {
      const next = touch(requireRecord(originalStoreTransactionId), {
        status: 'in_grace',
        gracePeriodExpiresAt: plusMs(options.clock.now(), 3 * 24 * 60 * 60 * 1000).toISOString(),
      })
      return notify(next, 'in_grace')
    },
    async enterHold(originalStoreTransactionId) {
      const next = touch(requireRecord(originalStoreTransactionId), {
        status: 'on_hold',
        gracePeriodExpiresAt: toIso(options.clock.now()),
      })
      return notify(next, 'on_hold')
    },
    async emitNotification(originalStoreTransactionId, type) {
      return notify(requireRecord(originalStoreTransactionId), type)
    },
    serialize() {
      return JSON.stringify({
        seq: state.seq,
        nextBehavior: state.nextBehavior,
        unavailable: state.unavailable,
        records: [...state.records.entries()],
        unfinished: [...state.unfinished],
      })
    },
  }
}

export function hydrateTestStoreWorld(
  json: string,
  options: { catalog: BillingCatalog; clock: Clock; hmacSecret?: string },
): TestStoreWorld {
  const parsed = JSON.parse(json) as {
    seq: number
    nextBehavior: NextPurchaseBehavior
    unavailable: boolean
    records: Array<[string, TestStoreRecord]>
    unfinished: string[]
  }
  return createTestStoreWorld({
    ...options,
    state: {
      seq: parsed.seq,
      nextBehavior: parsed.nextBehavior,
      unavailable: parsed.unavailable,
      records: new Map(parsed.records),
      unfinished: new Set(parsed.unfinished),
    },
  })
}

export async function parseTestToken(
  signedPayload: string,
  secret = TEST_STORE_HMAC_SECRET,
): Promise<{ ok: true; body: SignedBody } | (VerifyResult & { ok: false })> {
  const parts = signedPayload.split('.')
  if (parts[0] !== 'test' || parts[1] !== 'v1' || parts.length !== 4) {
    return { ok: false, code: 'store_verification_failed', message: '테스트 토큰 형식이 아닙니다.' }
  }
  const payload = parts[2] ?? ''
  const mac = parts[3] ?? ''
  const expected = await hmacSha256Hex(secret, payload)
  if (expected !== mac) {
    return { ok: false, code: 'store_verification_failed', message: '테스트 토큰 서명이 올바르지 않습니다.' }
  }
  try {
    const body = JSON.parse(b64urlToUtf8(payload)) as SignedBody
    if (body.environment !== 'test') {
      return { ok: false, code: 'environment_mismatch', message: '테스트 토큰 환경이 올바르지 않습니다.' }
    }
    return { ok: true, body }
  } catch {
    return { ok: false, code: 'store_verification_failed', message: '테스트 토큰을 해석하지 못했습니다.' }
  }
}

export function isTestToken(signedPayload: string): boolean {
  return signedPayload.startsWith('test.')
}
