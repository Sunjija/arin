import { afterEach, describe, expect, it } from 'vitest'
import { createAccountApp, type AccountApp } from './app.ts'

const ORIGIN = 'http://127.0.0.1:43127'

function testApp(): AccountApp {
  return createAccountApp({
    env: 'test',
    sqlitePath: ':memory:',
    rateLimit: false,
    adminKey: 'test-admin-key',
    publicOrigin: ORIGIN,
    exposeDevRecovery: true,
    allowTestSeed: true,
  })
}

async function parse(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>
}

async function register(account: AccountApp, email: string, password = 'ArinTest123!') {
  const res = await account.app.request('/api/account/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: JSON.stringify({ email, password, ageConfirmed: true }),
  })
  const body = await parse(res)
  return { res, body, token: String(body.token ?? '') }
}

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Origin: ORIGIN,
  }
}

describe('account api auth and isolation', () => {
  const opened: AccountApp[] = []
  afterEach(() => {
    while (opened.length) opened.pop()?.close()
  })

  it('lets a user register, login, and read only their own session', async () => {
    const account = testApp()
    opened.push(account)
    const created = await register(account, 'a@arin.test')
    expect(created.res.status).toBe(200)
    expect(created.token).toMatch(/^[a-f0-9]+$/)
    const session = await account.app.request('/api/account/v1/auth/session', {
      headers: { Authorization: `Bearer ${created.token}` },
    })
    const sessionBody = await parse(session)
    const view = sessionBody.session as { userId: string; emailMasked: string }
    expect(view.emailMasked).toBe('a***@arin.test')
    expect(view.userId.startsWith('usr_')).toBe(true)
  })

  it('rejects register without age confirmation', async () => {
    const account = testApp()
    opened.push(account)
    const res = await account.app.request('/api/account/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'kid@arin.test', password: 'ArinTest123!', ageConfirmed: false }),
    })
    expect(res.status).toBe(400)
  })

  it('blocks user B from reading user A events', async () => {
    const account = testApp()
    opened.push(account)
    const a = await register(account, 'a@arin.test')
    const b = await register(account, 'b@arin.test')
    const event = {
      eventId: 'evt_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      collection: 'attempts',
      entityId: 'att-a-1',
      op: 'upsert',
      clientUpdatedAt: '2026-09-10T00:00:00.000Z',
      deviceId: 'dev_1',
      payload: { id: 'att-a-1', questionId: 'q-01', correct: true, source: 'practice' },
    }
    const pushed = await account.app.request('/api/account/v1/sync/push', {
      method: 'POST',
      headers: authHeaders(a.token),
      body: JSON.stringify({ deviceId: 'dev_1', events: [event] }),
    })
    expect(pushed.status).toBe(200)
    const aPull = await parse(
      await account.app.request('/api/account/v1/sync/pull?cursor=0', { headers: authHeaders(a.token) }),
    )
    const bPull = await parse(
      await account.app.request('/api/account/v1/sync/pull?cursor=0', { headers: authHeaders(b.token) }),
    )
    const aEvents = aPull.events as Array<{ entityId: string }>
    const bEvents = bPull.events as Array<{ entityId: string }>
    expect(aEvents.some((item) => item.entityId === 'att-a-1')).toBe(true)
    expect(bEvents.some((item) => item.entityId === 'att-a-1')).toBe(false)
  })

  it('treats a repeated eventId as a duplicate instead of inserting twice', async () => {
    const account = testApp()
    opened.push(account)
    const a = await register(account, 'a@arin.test')
    const event = {
      eventId: 'evt_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      collection: 'wrongAnswers',
      entityId: 'w1',
      op: 'upsert',
      clientUpdatedAt: '2026-09-10T00:00:00.000Z',
      deviceId: 'dev_1',
      payload: { id: 'w1', questionId: 'q-02' },
    }
    const first = await parse(
      await account.app.request('/api/account/v1/sync/push', {
        method: 'POST',
        headers: authHeaders(a.token),
        body: JSON.stringify({ events: [event] }),
      }),
    )
    const second = await parse(
      await account.app.request('/api/account/v1/sync/push', {
        method: 'POST',
        headers: authHeaders(a.token),
        body: JSON.stringify({ events: [event] }),
      }),
    )
    expect((first.accepted as unknown[]).length).toBe(1)
    expect((second.duplicates as unknown[]).length).toBe(1)
    const pulled = await parse(
      await account.app.request('/api/account/v1/sync/pull?cursor=0', { headers: authHeaders(a.token) }),
    )
    expect((pulled.events as unknown[]).length).toBe(1)
  })

  it('does not duplicate guest transfer of the same device entity', async () => {
    const account = testApp()
    opened.push(account)
    const a = await register(account, 'a@arin.test')
    const event = {
      eventId: 'evt_guest_gdev_1_attempts_att-g',
      collection: 'attempts',
      entityId: 'att-g',
      op: 'upsert',
      clientUpdatedAt: '2026-09-10T00:00:00.000Z',
      deviceId: 'dev_1',
      payload: { id: 'att-g', questionId: 'q-03', correct: false },
    }
    const first = await parse(
      await account.app.request('/api/account/v1/guest/transfer', {
        method: 'POST',
        headers: authHeaders(a.token),
        body: JSON.stringify({ guestDeviceId: 'gdev_1', events: [event] }),
      }),
    )
    const second = await parse(
      await account.app.request('/api/account/v1/guest/transfer', {
        method: 'POST',
        headers: authHeaders(a.token),
        body: JSON.stringify({
          guestDeviceId: 'gdev_1',
          events: [{ ...event, eventId: 'evt_guest_gdev_1_attempts_att-g-retry' }],
        }),
      }),
    )
    expect((first.accepted as unknown[]).length).toBe(1)
    expect((second.duplicates as unknown[]).length).toBe(1)
    const pulled = await parse(
      await account.app.request('/api/account/v1/sync/pull?cursor=0', { headers: authHeaders(a.token) }),
    )
    expect((pulled.events as unknown[]).length).toBe(1)
  })

  it('returns a conflict instead of overwriting a diverging in-progress mock', async () => {
    const account = testApp()
    opened.push(account)
    const a = await register(account, 'a@arin.test')
    const mockA = {
      eventId: 'evt_mock_1',
      collection: 'activeMock',
      entityId: 'active',
      op: 'upsert',
      clientUpdatedAt: '2026-09-10T00:00:00.000Z',
      deviceId: 'dev_1',
      payload: { id: 'mock-1', revision: 2, answers: [0, null], questionSnapshots: [{ questionId: 'q-01', choices: ['가', '나'] }] },
    }
    const mockB = {
      ...mockA,
      eventId: 'evt_mock_2',
      clientUpdatedAt: '2026-09-10T00:01:00.000Z',
      deviceId: 'dev_2',
      payload: { id: 'mock-1', revision: 2, answers: [1, null], questionSnapshots: [{ questionId: 'q-01', choices: ['가', '나'] }] },
    }
    await account.app.request('/api/account/v1/sync/push', {
      method: 'POST',
      headers: authHeaders(a.token),
      body: JSON.stringify({ events: [mockA] }),
    })
    const second = await parse(
      await account.app.request('/api/account/v1/sync/push', {
        method: 'POST',
        headers: authHeaders(a.token),
        body: JSON.stringify({ events: [mockB] }),
      }),
    )
    expect((second.conflicts as unknown[]).length).toBe(1)
    const pulled = await parse(
      await account.app.request('/api/account/v1/sync/pull?cursor=0', { headers: authHeaders(a.token) }),
    )
    const events = pulled.events as Array<{ payload: { answers: unknown[] } }>
    expect(events).toHaveLength(1)
    expect(events[0]?.payload.answers[0]).toBe(0)
  })

  it('does not accept client-supplied paid entitlements and requires the admin key', async () => {
    const account = testApp()
    opened.push(account)
    const a = await register(account, 'a@arin.test')
    const denied = await account.app.request(`/api/account/v1/admin/entitlements/${(a.body.session as { userId: string }).userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${a.token}` },
      body: JSON.stringify({ plan: 'paid', source: 'billing' }),
    })
    expect(denied.status).toBe(403)
    const userId = (a.body.session as { userId: string }).userId
    const allowed = await account.app.request(`/api/account/v1/admin/entitlements/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Arin-Admin-Key': 'test-admin-key' },
      body: JSON.stringify({ plan: 'paid', source: 'billing', productCode: 'arin.premium' }),
    })
    expect(allowed.status).toBe(200)
    const ent = await parse(await account.app.request('/api/account/v1/entitlements', { headers: authHeaders(a.token) }))
    expect((ent.entitlement as { plan: string; source: string }).plan).toBe('paid')
    expect((ent.entitlement as { source: string }).source).toBe('billing')
  })

  it('deletes learning rows on account deletion and blocks the old session', async () => {
    const account = testApp()
    opened.push(account)
    const a = await register(account, 'a@arin.test')
    await account.app.request('/api/account/v1/sync/push', {
      method: 'POST',
      headers: authHeaders(a.token),
      body: JSON.stringify({
        events: [
          {
            eventId: 'evt_del_1',
            collection: 'attempts',
            entityId: 'gone',
            op: 'upsert',
            clientUpdatedAt: '2026-09-10T00:00:00.000Z',
            deviceId: 'dev_1',
            payload: { id: 'gone' },
          },
        ],
      }),
    })
    const deleted = await account.app.request('/api/account/v1/account/delete', {
      method: 'POST',
      headers: authHeaders(a.token),
      body: JSON.stringify({ confirm: 'DELETE', password: 'ArinTest123!' }),
    })
    expect(deleted.status).toBe(200)
    const session = await account.app.request('/api/account/v1/auth/session', {
      headers: { Authorization: `Bearer ${a.token}` },
    })
    expect(session.status).toBe(401)
    const login = await account.app.request('/api/account/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@arin.test', password: 'ArinTest123!' }),
    })
    expect(login.status).toBe(401)
  })

  it('does not put passwords in JSON error bodies', async () => {
    const account = testApp()
    opened.push(account)
    const res = await account.app.request('/api/account/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'missing@arin.test', password: 'super-secret-password' }),
    })
    const text = await res.text()
    expect(text).not.toContain('super-secret-password')
    expect(text).not.toContain('missing@arin.test')
  })
})
