import { describe, expect, it } from 'vitest'
import { DEV_BILLING_CATALOG } from './catalog'
import { createTestClock } from './clock'
import { capabilitiesForClientUse, hasCapability } from './entitlements'
import { BillingError } from './errors'
import { createMemoryPersistence } from './client/persistence'
import { createBillingClient } from './client/controller'
import { createBillingHarness } from './client/harness'
import { createMemoryRepository } from './server/repository'
import { createBillingService, createTestAccountAuth } from './server/service'
import { handleBillingHttp } from './server/http'
import { createRejectingTestVerifier, createUnavailableVerifier } from './server/failClosed'
import { createTestStoreWorld } from './store/testAdapter'
import { redactForLog } from './redaction'
import { DEFAULT_OFFLINE_TTL_MS } from './types'

function testEnv(accountId = 'acc_a') {
  const clock = createTestClock('2026-09-10T00:00:00.000Z')
  const harness = createBillingHarness({
    environment: 'test',
    clock,
    persistence: createMemoryPersistence({ accountId }),
    accountId,
  })
  return { ...harness, clock, accountId }
}

describe('billing purchase and entitlements', () => {
  it('grants paid access only after store verification', async () => {
    const env = testEnv()
    const catalog = await env.client.loadCatalog()
    expect(catalog.testMode).toBe(true)
    expect(catalog.salesEnabled).toBe(false)
    expect(catalog.products[0]?.localizedPrice?.display).toBe('₩4,900')

    expect(env.client.hasPaidAccess('full_mock')).toBe(false)
    const result = await env.client.purchase('arin_premium_monthly')
    expect(result.status).toBe('purchased')
    expect(env.client.hasPaidAccess('full_mock')).toBe(true)
    env.service.assertCapability(env.accountId, 'full_mock')
  })

  it('does not grant entitlement when the user cancels', async () => {
    const env = testEnv()
    env.world.setNextPurchaseBehavior('cancelled')
    const result = await env.client.purchase('arin_premium_monthly')
    expect(result).toEqual({ status: 'cancelled' })
    expect(env.client.hasPaidAccess('full_mock')).toBe(false)
    expect(() => env.service.assertCapability(env.accountId, 'full_mock')).toThrow(BillingError)
  })

  it('keeps pending purchases without entitlement until approval', async () => {
    const env = testEnv()
    env.world.setNextPurchaseBehavior('pending')
    const pending = await env.client.purchase('arin_premium_monthly')
    expect(pending.status).toBe('pending')
    expect(env.client.hasPaidAccess('full_mock')).toBe(false)

    const record = env.world.listRecords()[0]
    expect(record).toBeTruthy()
    const notification = await env.world.approvePending(record!.originalStoreTransactionId)
    await env.service.handleNotification(notification)
    await env.client.recoverUnfinished()
    expect(env.client.hasPaidAccess('full_mock')).toBe(true)
  })
})

describe('billing notifications', () => {
  it('treats duplicate notifications as idempotent', async () => {
    const env = testEnv()
    await env.client.purchase('arin_premium_monthly')
    const id = env.world.listRecords()[0]!.originalStoreTransactionId
    const first = await env.world.emitNotification(id, 'renewed')
    const once = await env.service.handleNotification(first)
    expect(once.duplicate).toBe(false)
    const twice = await env.service.handleNotification(first)
    expect(twice.duplicate).toBe(true)
    expect(env.service.entitlements(env.accountId).capabilities).toContain('full_mock')
  })

  it('matches store snapshot even when notifications arrive late or reversed', async () => {
    const env = testEnv()
    await env.client.purchase('arin_premium_monthly')
    const id = env.world.listRecords()[0]!.originalStoreTransactionId
    const renew = await env.world.renew(id)
    const purchased = await env.world.emitNotification(id, 'purchased')
    purchased.eventTime = '2026-09-09T00:00:00.000Z'
    await env.service.handleNotification(renew)
    const stale = await env.service.handleNotification(purchased)
    expect(stale.stale).toBe(true)
    const snapshot = await env.client.refresh()
    expect(snapshot.transactions[0]?.status).toBe('active')
    expect(new Date(snapshot.transactions[0]!.expiresAt ?? 0).getTime()).toBeGreaterThan(
      env.clock.now().getTime(),
    )
  })
})

describe('billing restore and account binding', () => {
  it('restores purchases on another device for the same account', async () => {
    const clock = createTestClock('2026-09-10T00:00:00.000Z')
    const world = createTestStoreWorld({ catalog: DEV_BILLING_CATALOG, clock })
    const repo = createMemoryRepository()
    const service = createBillingService({
      environment: 'test',
      catalog: DEV_BILLING_CATALOG,
      clock,
      repo,
      verifiers: {
        test: world.verifier,
        apple: createUnavailableVerifier('apple'),
        google: createUnavailableVerifier('google'),
      },
    })
    const deviceA = createBillingClient({
      catalog: DEV_BILLING_CATALOG,
      store: world.createAdapter(),
      service,
      persistence: createMemoryPersistence({ accountId: 'acc_same', installId: 'install_a' }),
      clock,
    })
    const deviceB = createBillingClient({
      catalog: DEV_BILLING_CATALOG,
      store: world.createAdapter(),
      service,
      persistence: createMemoryPersistence({ accountId: 'acc_same', installId: 'install_b' }),
      clock,
    })
    await deviceA.purchase('arin_premium_monthly')
    const restored = await deviceB.restore()
    expect(restored.conflicts).toHaveLength(0)
    expect(deviceB.hasPaidAccess('full_mock')).toBe(true)
  })

  it('rejects binding the same store purchase to another live account', async () => {
    const env = testEnv('acc_owner')
    await env.client.purchase('arin_premium_monthly')
    const other = createBillingClient({
      catalog: env.catalog,
      store: env.world.createAdapter(),
      service: env.service,
      persistence: createMemoryPersistence({ accountId: 'acc_intruder' }),
      clock: env.clock,
    })
    const restored = await other.restore()
    expect(restored.conflicts.length).toBeGreaterThan(0)
    expect(other.hasPaidAccess('full_mock')).toBe(false)
    expect(env.client.hasPaidAccess('full_mock')).toBe(true)
  })
})

describe('billing subscription lifecycle', () => {
  it('keeps access after cancel-at-period-end until expiry', async () => {
    const env = testEnv()
    await env.client.purchase('arin_premium_monthly')
    const id = env.world.listRecords()[0]!.originalStoreTransactionId
    await env.service.handleNotification(await env.world.scheduleCancel(id))
    const mid = await env.client.refresh()
    expect(mid.transactions[0]?.status).toBe('canceled_will_expire')
    expect(hasCapability(mid.capabilities, 'full_mock')).toBe(true)

    await env.service.handleNotification(await env.world.expire(id))
    const ended = await env.client.refresh()
    expect(ended.transactions[0]?.status).toBe('expired')
    expect(hasCapability(ended.capabilities, 'full_mock')).toBe(false)
  })

  it('renews expiry on DID_RENEW equivalent', async () => {
    const env = testEnv()
    await env.client.purchase('arin_premium_monthly')
    const before = env.client.currentSnapshot()?.transactions[0]?.expiresAt
    const id = env.world.listRecords()[0]!.originalStoreTransactionId
    env.clock.addMs(24 * 60 * 60 * 1000)
    await env.service.handleNotification(await env.world.renew(id))
    const after = await env.client.refresh()
    expect(new Date(after.transactions[0]!.expiresAt ?? 0).getTime()).toBeGreaterThan(
      new Date(before ?? 0).getTime(),
    )
  })

  it('revokes access immediately after refund', async () => {
    const env = testEnv()
    await env.client.purchase('arin_mock_pass_30d')
    expect(env.client.hasPaidAccess('full_mock')).toBe(true)
    const id = env.world.listRecords()[0]!.originalStoreTransactionId
    await env.service.handleNotification(await env.world.refund(id))
    const snapshot = await env.client.refresh()
    expect(snapshot.transactions[0]?.status).toBe('refunded')
    expect(hasCapability(snapshot.capabilities, 'full_mock')).toBe(false)
  })
})

describe('billing outage, deletion, and offline cache', () => {
  it('does not grant access when store verification is unavailable', async () => {
    const env = testEnv()
    env.world.setUnavailable(true)
    const result = await env.client.purchase('arin_premium_monthly')
    expect(result.status).toBe('failed')
    if (result.status === 'failed') expect(result.code).toBe('store_verification_unavailable')
    expect(env.client.hasPaidAccess('full_mock')).toBe(false)
    env.world.setUnavailable(false)
    await env.client.recoverUnfinished()
    expect(env.client.hasPaidAccess('full_mock')).toBe(true)
  })

  it('clears service entitlements on account delete without canceling the store subscription', async () => {
    const env = testEnv()
    await env.client.purchase('arin_premium_monthly')
    const deleted = env.service.accountDeleted(env.accountId, env.clock.now().toISOString())
    expect(deleted.snapshotCleared).toBe(true)
    expect(deleted.openStoreSubscriptions.length).toBeGreaterThan(0)
    expect(deleted.manageUrls.apple).toContain('subscriptions')
    expect(() => env.service.assertCapability(env.accountId, 'full_mock')).toThrow(BillingError)
    expect(env.world.listRecords()[0]?.status).toBe('active')
  })

  it('drops paid capabilities after the offline TTL until revalidation', async () => {
    const env = testEnv()
    await env.client.purchase('arin_premium_monthly')
    const snapshot = env.client.currentSnapshot()
    expect(snapshot).toBeTruthy()
    env.clock.addMs(DEFAULT_OFFLINE_TTL_MS + 1000)
    const visible = capabilitiesForClientUse(snapshot, env.clock.now())
    expect(visible.reason).toBe('offline_expired')
    expect(visible.capabilities).not.toContain('full_mock')
    const refreshed = await env.client.refresh()
    expect(refreshed.capabilities).toContain('full_mock')
  })
})

describe('billing environment isolation and secrets', () => {
  it('rejects test tokens on a production server', async () => {
    const test = testEnv()
    const purchased = await test.client.purchase('arin_premium_monthly')
    expect(purchased.status).toBe('purchased')
    const token = (await test.store.restore())[0]?.signedPayload
    expect(token?.startsWith('test.')).toBe(true)

    const production = createBillingService({
      environment: 'production',
      catalog: { ...DEV_BILLING_CATALOG, salesEnabled: false },
      clock: test.clock,
      repo: createMemoryRepository(),
      verifiers: {
        test: createRejectingTestVerifier(),
        apple: createUnavailableVerifier('apple'),
        google: createUnavailableVerifier('google'),
      },
    })
    await expect(
      production.verify('acc_prod', { store: 'test', productId: 'arin_premium_monthly', signedPayload: token! }),
    ).rejects.toMatchObject({ code: 'test_transaction_rejected' })

    const http = await handleBillingHttp({
      service: production,
      auth: { resolve: async () => ({ accountId: 'acc_prod' }) },
      environment: 'production',
      request: {
        method: 'POST',
        path: '/v1/billing/verify',
        header: () => 'Bearer app-session',
        body: { store: 'test', productId: 'arin_premium_monthly', signedPayload: token },
      },
    })
    expect(http.status).toBe(400)
    expect(http.body).toMatchObject({ error: 'test_transaction_rejected' })

    const testHttp = await handleBillingHttp({
      service: test.service,
      auth: createTestAccountAuth(),
      environment: 'test',
      request: {
        method: 'POST',
        path: '/v1/billing/verify',
        header: () => 'Bearer test:acc_a',
        body: { store: 'test', productId: 'arin_premium_monthly', signedPayload: token },
      },
    })
    expect(testHttp.status).toBe(200)
  })

  it('does not grant access from a client success flag and redacts tokens', async () => {
    const env = testEnv()
    env.world.setNextPurchaseBehavior('success')
    const storeResult = await env.store.purchase({
      storeProductId: 'arin.premium.monthly.test',
      accountId: env.accountId,
    })
    expect(storeResult.status).toBe('purchased')
    expect(env.service.entitlements(env.accountId).capabilities).not.toContain('full_mock')
    if (storeResult.status !== 'purchased') throw new Error('expected purchase')
    const leaked = JSON.stringify(redactForLog({ signedPayload: storeResult.transaction.signedPayload }))
    expect(leaked).not.toContain(storeResult.transaction.signedPayload)
  })

  it('blocks overlapping purchase clicks', async () => {
    const env = testEnv()
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const original = env.store.purchase.bind(env.store)
    env.store.purchase = async (input) => {
      await gate
      return original(input)
    }
    const first = env.client.purchase('arin_premium_monthly')
    const second = await env.client.purchase('arin_premium_monthly')
    expect(second).toMatchObject({ status: 'failed', code: 'in_flight' })
    release()
    expect((await first).status).toBe('purchased')
  })

  it('apple and google verifiers fail closed without credentials', async () => {
    const env = testEnv()
    await expect(
      env.service.verify(env.accountId, {
        store: 'apple',
        productId: 'arin_premium_monthly',
        signedPayload: 'header.payload.sig',
      }),
    ).rejects.toMatchObject({ code: 'store_verification_unavailable' })
    await expect(
      env.service.verify(env.accountId, {
        store: 'google',
        productId: 'arin_premium_monthly',
        signedPayload: 'play-token',
      }),
    ).rejects.toMatchObject({ code: 'store_verification_unavailable' })
  })
})
