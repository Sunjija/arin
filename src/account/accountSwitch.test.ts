import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { createAccountApp } from '../../server/account-api/app.ts'
import { createHttpAdapters } from './adapters'
import { kvSet, resetAccountSyncDb } from './outbox'
import { loginWithAdapters, registerWithAdapters } from './syncEngine'
import { db } from '../db/database'
import { practiceAttempt, resetAppDb, seedCore } from '../test/idb'

const ORIGIN = 'http://127.0.0.1:43127'

afterEach(async () => {
  await resetAppDb()
  await resetAccountSyncDb()
})

describe('guest transfer and account switch', () => {
  it('moves guest attempts to account A and hides them after login as B', async () => {
    const account = createAccountApp({
      env: 'test',
      sqlitePath: ':memory:',
      rateLimit: false,
      publicOrigin: ORIGIN,
    })
    const fetchImpl = async (input: string, init?: RequestInit) => {
      const url = new URL(input, ORIGIN)
      return account.app.request(url.pathname + url.search, init)
    }
    const { auth, sync } = createHttpAdapters({
      getToken: async () => token,
      setToken: async (value) => {
        token = value
      },
      fetchImpl,
    })
    let token: string | null = null

    await resetAppDb()
    await seedCore()
    await db.attempts.put(practiceAttempt('guest-1', false, '2026-09-01T00:00:00.000Z'))
    await kvSet('ownerKey', 'guest')

    const registered = await registerWithAdapters({
      auth,
      transport: sync,
      guestDeviceId: 'gdev_test',
      deviceId: 'dev_test',
      email: 'a@arin.test',
      password: 'ArinTest123!',
      ageConfirmed: true,
    })
    expect(registered.userId).toBeTruthy()
    expect((await db.attempts.toArray()).some((row) => row.id === 'guest-1')).toBe(true)

    await db.attempts.clear()
    await seedCore()
    await db.attempts.put(practiceAttempt('guest-b', true, '2026-09-02T00:00:00.000Z'))
    await kvSet('ownerKey', 'guest')
    token = null

    const b = await registerWithAdapters({
      auth,
      transport: sync,
      guestDeviceId: 'gdev_other',
      deviceId: 'dev_test',
      email: 'b@arin.test',
      password: 'ArinTest123!',
      ageConfirmed: true,
    })
    expect(b.userId).not.toBe(registered.userId)
    const ids = (await db.attempts.toArray()).map((row) => row.id)
    expect(ids).toContain('guest-b')
    expect(ids).not.toContain('guest-1')

    token = null
    const aAgain = await loginWithAdapters({
      auth,
      transport: sync,
      guestDeviceId: 'gdev_other',
      deviceId: 'dev_test',
      email: 'a@arin.test',
      password: 'ArinTest123!',
      currentOwnerKey: b.userId ?? 'guest',
    })
    expect(aAgain.userId).toBe(registered.userId)
    const afterSwitch = (await db.attempts.toArray()).map((row) => row.id)
    expect(afterSwitch).toContain('guest-1')
    expect(afterSwitch).not.toContain('guest-b')
    account.close()
  })
})
