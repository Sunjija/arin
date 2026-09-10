import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import {
  applyEventToHead,
  isSyncCollection,
  isSyncOp,
  type SyncHead,
  type SyncEventInput,
} from './apply.ts'
import type { AccountApiConfig } from './config.ts'
import { loadAccountApiConfig } from './config.ts'
import { hashPassword, randomToken, safeEqual, sha256Hex, verifyPassword, verifyPasswordOrDummy } from './crypto.ts'
import { AccountDatabase } from './db.ts'
import { isValidEmail, isValidPassword, maskEmail, newId, normalizeEmail, nowIso } from './ids.ts'
import { writeAccountLog } from './log.ts'

export type AccountErrorCode =
  | 'validation_failed'
  | 'auth_invalid'
  | 'auth_expired'
  | 'auth_required'
  | 'auth_conflict'
  | 'reauth_required'
  | 'rate_limited'
  | 'sync_conflict'
  | 'sync_duplicate'
  | 'not_found'
  | 'forbidden'
  | 'server_unreachable'
  | 'demo_mode'
  | 'deletion_pending'
  | 'internal_error'

const SESSION_COOKIE = 'arin_session'

interface UserRow {
  id: string
  email: string
  password_hash: string
  age_confirmed_at: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

interface SessionRow {
  id: string
  user_id: string
  token_hash: string
  expires_at: string
  created_at: string
  last_used_at: string
  revoked_at: string | null
}

interface HeadRow {
  user_id: string
  collection: string
  entity_id: string
  event_id: string
  updated_at: string
  revision: number | null
  payload_json: string
}

interface EventRow {
  id: number
  user_id: string
  event_id: string
  collection: string
  entity_id: string
  op: string
  client_updated_at: string
  device_id: string
  payload_json: string
  received_at: string
}

interface EntitlementRow {
  user_id: string
  source: string
  plan: string
  product_code: string | null
  external_ref: string | null
  updated_at: string
}

export interface AccountApp {
  app: Hono
  db: AccountDatabase
  config: AccountApiConfig
  close: () => void
}

function fail(code: AccountErrorCode, message: string, status: number) {
  return { body: { ok: false as const, error: { code, message } }, status }
}

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

function readHead(row: HeadRow | undefined): SyncHead | undefined {
  if (!row || !isSyncCollection(row.collection)) return undefined
  return {
    collection: row.collection,
    entityId: row.entity_id,
    eventId: row.event_id,
    updatedAt: row.updated_at,
    revision: row.revision,
    payload: parseJson(row.payload_json),
  }
}

function entitlementView(row: EntitlementRow | undefined) {
  if (!row) return { source: 'none' as const, plan: 'free' as const, updatedAt: null as string | null }
  const plan = row.plan === 'paid' ? ('paid' as const) : ('free' as const)
  const source = row.source === 'billing' ? ('billing' as const) : ('none' as const)
  return { source, plan, updatedAt: row.updated_at }
}

function sessionView(input: {
  user: UserRow
  session: SessionRow
  entitlement?: EntitlementRow
  serverReachable?: boolean
}) {
  return {
    status: 'signed-in' as const,
    mode: 'connected' as const,
    userId: input.user.id,
    emailMasked: maskEmail(input.user.email),
    sessionId: input.session.id,
    expiresAt: input.session.expires_at,
    entitlement: entitlementView(input.entitlement),
    serverReachable: input.serverReachable ?? true,
  }
}

function readBearer(header: string | undefined): string | null {
  if (!header) return null
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match?.[1]?.trim() || null
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asEvent(value: unknown): SyncEventInput | null {
  if (!isObject(value)) return null
  if (typeof value.eventId !== 'string' || typeof value.collection !== 'string') return null
  if (typeof value.entityId !== 'string' || typeof value.op !== 'string') return null
  if (typeof value.clientUpdatedAt !== 'string' || typeof value.deviceId !== 'string') return null
  if (!isSyncCollection(value.collection) || !isSyncOp(value.op)) return null
  if (!value.eventId.startsWith('evt_') || value.eventId.length > 200) return null
  return {
    eventId: value.eventId,
    collection: value.collection,
    entityId: value.entityId,
    op: value.op,
    clientUpdatedAt: value.clientUpdatedAt,
    deviceId: value.deviceId,
    payload: value.payload,
  }
}

export function createAccountApp(overrides: Partial<AccountApiConfig> & { sqlitePath?: string } = {}): AccountApp {
  const config = loadAccountApiConfig(overrides)
  const db = new AccountDatabase(overrides.sqlitePath ?? config.sqlitePath)
  const app = new Hono()
  const rate = new Map<string, { count: number; resetAt: number }>()
  app.use('*', async (c, next) => {
    const requestId = newId('req').slice(0, 16)
    const started = Date.now()
    await next()
    writeAccountLog({
      level: 'info',
      requestId,
      route: c.req.path,
      method: c.req.method,
      status: c.res.status,
      ms: Date.now() - started,
      event: 'http',
    })
  })

  app.use(
    '*',
    cors({
      origin: config.publicOrigin,
      credentials: true,
      allowHeaders: ['Content-Type', 'Authorization', 'X-Arin-Admin-Key'],
      allowMethods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    }),
  )

  const api = new Hono()

  const hitRate = (key: string, limit: number) => {
    if (!config.rateLimit) return false
    const now = Date.now()
    const current = rate.get(key)
    if (!current || current.resetAt < now) {
      rate.set(key, { count: 1, resetAt: now + 60_000 })
      return false
    }
    current.count += 1
    return current.count > limit
  }

  const originOk = (c: { req: { method: string; header: (name: string) => string | undefined } }) => {
    const origin = c.req.header('Origin')
    if (!origin) return true
    return origin === config.publicOrigin
  }

  const attachSessionCookie = (c: Parameters<typeof setCookie>[0], token: string, expiresAt: string) => {
    setCookie(c, SESSION_COOKIE, token, {
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
      secure: config.env === 'production',
      expires: new Date(expiresAt),
    })
  }

  const loadEntitlement = (userId: string) =>
    db.get<EntitlementRow>('SELECT * FROM entitlements WHERE user_id = ?', userId)

  const createSession = (userId: string) => {
    const token = randomToken()
    const now = nowIso()
    const expiresAt = nowIso(new Date(Date.now() + config.sessionTtlMs))
    const row: SessionRow = {
      id: newId('ses'),
      user_id: userId,
      token_hash: sha256Hex(token),
      expires_at: expiresAt,
      created_at: now,
      last_used_at: now,
      revoked_at: null,
    }
    db.run(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, last_used_at, revoked_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL)`,
      row.id,
      row.user_id,
      row.token_hash,
      row.expires_at,
      row.created_at,
      row.last_used_at,
    )
    return { token, row }
  }

  const readAuth = (c: {
    req: { header: (name: string) => string | undefined }
  }): { user: UserRow; session: SessionRow } | { error: ReturnType<typeof fail> } => {
    const bearer = readBearer(c.req.header('Authorization'))
    const cookie = getCookie(c as Parameters<typeof getCookie>[0], SESSION_COOKIE)
    const token = bearer || cookie
    if (!token) return { error: fail('auth_required', '로그인이 필요합니다.', 401) }
    const session = db.get<SessionRow>('SELECT * FROM sessions WHERE token_hash = ?', sha256Hex(token))
    if (!session || session.revoked_at) return { error: fail('auth_expired', '세션이 만료되었습니다.', 401) }
    if (session.expires_at < nowIso()) return { error: fail('auth_expired', '세션이 만료되었습니다.', 401) }
    const user = db.get<UserRow>('SELECT * FROM users WHERE id = ?', session.user_id)
    if (!user || user.deleted_at) return { error: fail('auth_expired', '세션이 만료되었습니다.', 401) }
    const nextExpiry = nowIso(new Date(Date.now() + config.sessionTtlMs))
    db.run('UPDATE sessions SET last_used_at = ?, expires_at = ? WHERE id = ?', nowIso(), nextExpiry, session.id)
    session.last_used_at = nowIso()
    session.expires_at = nextExpiry
    return { user, session }
  }

  const requireUser = (c: {
    json: (body: unknown, status?: number) => Response
    req: { method: string; header: (name: string) => string | undefined }
  }) => {
    if (!originOk(c) && c.req.method !== 'GET') {
      return { error: c.json(fail('forbidden', '허용되지 않은 출처입니다.', 403).body, 403) }
    }
    const auth = readAuth(c)
    if ('error' in auth) return { error: c.json(auth.error.body, auth.error.status) }
    return auth
  }

  const persistHead = (userId: string, event: SyncEventInput, head: SyncHead | null) => {
    if (!head) {
      db.run('DELETE FROM sync_heads WHERE user_id = ? AND collection = ? AND entity_id = ?', userId, event.collection, event.entityId)
      return
    }
    db.run(
      `INSERT INTO sync_heads (user_id, collection, entity_id, event_id, updated_at, revision, payload_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, collection, entity_id) DO UPDATE SET
         event_id = excluded.event_id,
         updated_at = excluded.updated_at,
         revision = excluded.revision,
         payload_json = excluded.payload_json`,
      userId,
      head.collection,
      head.entityId,
      head.eventId,
      head.updatedAt,
      head.revision,
      JSON.stringify(head.payload),
    )
  }

  const insertEvent = (userId: string, event: SyncEventInput): number => {
    db.run(
      `INSERT INTO sync_events (
         user_id, event_id, collection, entity_id, op, client_updated_at, device_id, payload_json, received_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      userId,
      event.eventId,
      event.collection,
      event.entityId,
      event.op,
      event.clientUpdatedAt,
      event.deviceId,
      JSON.stringify(event.payload ?? null),
      nowIso(),
    )
    const row = db.get<{ id: number }>(
      'SELECT id FROM sync_events WHERE user_id = ? AND event_id = ?',
      userId,
      event.eventId,
    )
    return Number(row?.id ?? 0)
  }

  const pushEvents = (userId: string, events: SyncEventInput[], guestDeviceId?: string) => {
    const accepted: Array<{ eventId: string; serverSeq: number }> = []
    const duplicates: Array<{ eventId: string; serverSeq: number }> = []
    const conflicts: Array<{ eventId: string; collection: string; entityId: string; server: unknown }> = []
    const rejected: Array<{ eventId: string; code: AccountErrorCode }> = []

    db.transaction(() => {
      for (const event of events) {
        if (guestDeviceId) {
          const prior = db.get<{ event_id: string }>(
            `SELECT event_id FROM guest_transfers
             WHERE user_id = ? AND guest_device_id = ? AND collection = ? AND entity_id = ?`,
            userId,
            guestDeviceId,
            event.collection,
            event.entityId,
          )
          if (prior) {
            const existing = db.get<EventRow>(
              'SELECT id FROM sync_events WHERE user_id = ? AND event_id = ?',
              userId,
              prior.event_id,
            )
            duplicates.push({ eventId: event.eventId, serverSeq: Number(existing?.id ?? 0) })
            continue
          }
        }

        const existing = db.get<EventRow>(
          'SELECT id FROM sync_events WHERE user_id = ? AND event_id = ?',
          userId,
          event.eventId,
        )
        if (existing) {
          duplicates.push({ eventId: event.eventId, serverSeq: Number(existing.id) })
          continue
        }

        const headRow = db.get<HeadRow>(
          'SELECT * FROM sync_heads WHERE user_id = ? AND collection = ? AND entity_id = ?',
          userId,
          event.collection,
          event.entityId,
        )
        const outcome = applyEventToHead(readHead(headRow), event)
        if (outcome.kind === 'conflict') {
          conflicts.push({
            eventId: event.eventId,
            collection: event.collection,
            entityId: event.entityId,
            server: outcome.head.payload,
          })
          continue
        }

        const seq = insertEvent(userId, event)
        if (outcome.kind === 'apply') persistHead(userId, event, outcome.head)
        if (guestDeviceId) {
          db.run(
            `INSERT OR IGNORE INTO guest_transfers (
               user_id, guest_device_id, collection, entity_id, event_id, created_at
             ) VALUES (?, ?, ?, ?, ?, ?)`,
            userId,
            guestDeviceId,
            event.collection,
            event.entityId,
            event.eventId,
            nowIso(),
          )
        }
        accepted.push({ eventId: event.eventId, serverSeq: seq })
      }
    })

    return { accepted, duplicates, conflicts, rejected }
  }

  api.get('/health', (c) =>
    c.json({
      ok: true,
      env: config.env,
      storage: 'sqlite',
      mode: 'connected',
    }),
  )

  api.post('/auth/register', async (c) => {
    if (hitRate(`register:${c.req.header('x-forwarded-for') ?? 'local'}`, 10)) {
      return c.json(fail('rate_limited', '요청이 너무 많습니다.', 429).body, 429)
    }
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
    const email = typeof body?.email === 'string' ? normalizeEmail(body.email) : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    const ageConfirmed = body?.ageConfirmed === true
    if (!isValidEmail(email) || !isValidPassword(password) || !ageConfirmed) {
      return c.json(fail('validation_failed', '이메일, 비밀번호(8자 이상), 만 14세 이상 확인이 필요합니다.', 400).body, 400)
    }
    const exists = db.get<UserRow>('SELECT id FROM users WHERE email = ?', email)
    if (exists) return c.json(fail('auth_conflict', '이미 사용 중인 계정입니다.', 409).body, 409)
    const now = nowIso()
    const user: UserRow = {
      id: newId('usr'),
      email,
      password_hash: hashPassword(password),
      age_confirmed_at: now,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    }
    db.run(
      `INSERT INTO users (id, email, password_hash, age_confirmed_at, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL)`,
      user.id,
      user.email,
      user.password_hash,
      user.age_confirmed_at,
      user.created_at,
      user.updated_at,
    )
    const created = createSession(user.id)
    attachSessionCookie(c, created.token, created.row.expires_at)
    writeAccountLog({ level: 'info', event: 'register', userId: user.id })
    return c.json({
      ok: true,
      session: sessionView({ user, session: created.row }),
      token: created.token,
    })
  })

  api.post('/auth/login', async (c) => {
    if (hitRate(`login:${c.req.header('x-forwarded-for') ?? 'local'}`, 20)) {
      return c.json(fail('rate_limited', '요청이 너무 많습니다.', 429).body, 429)
    }
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
    const email = typeof body?.email === 'string' ? normalizeEmail(body.email) : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    const user = isValidEmail(email)
      ? db.get<UserRow>('SELECT * FROM users WHERE email = ?', email)
      : undefined
    const ok = verifyPasswordOrDummy(password, user && !user.deleted_at ? user.password_hash : null)
    if (!ok || !user || user.deleted_at) {
      return c.json(fail('auth_invalid', '이메일 또는 비밀번호가 올바르지 않습니다.', 401).body, 401)
    }
    const created = createSession(user.id)
    attachSessionCookie(c, created.token, created.row.expires_at)
    writeAccountLog({ level: 'info', event: 'login', userId: user.id })
    return c.json({
      ok: true,
      session: sessionView({ user, session: created.row, entitlement: loadEntitlement(user.id) }),
      token: created.token,
    })
  })

  api.post('/auth/logout', async (c) => {
    const auth = await requireUser(c)
    if ('error' in auth) return auth.error
    db.run('UPDATE sessions SET revoked_at = ? WHERE id = ?', nowIso(), auth.session.id)
    deleteCookie(c, SESSION_COOKIE, { path: '/' })
    writeAccountLog({ level: 'info', event: 'logout', userId: auth.user.id })
    return c.json({ ok: true })
  })

  api.get('/auth/session', async (c) => {
    const auth = await requireUser(c)
    if ('error' in auth) return auth.error
    const cookieToken = getCookie(c, SESSION_COOKIE)
    if (cookieToken) attachSessionCookie(c, cookieToken, auth.session.expires_at)
    return c.json({
      ok: true,
      session: sessionView({
        user: auth.user,
        session: auth.session,
        entitlement: loadEntitlement(auth.user.id),
      }),
    })
  })

  api.post('/auth/recover/start', async (c) => {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
    const email = typeof body?.email === 'string' ? normalizeEmail(body.email) : ''
    const user = isValidEmail(email) ? db.get<UserRow>('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL', email) : undefined
    let devToken: string | undefined
    if (user) {
      const token = randomToken()
      db.run(
        `INSERT INTO recovery_tokens (id, user_id, token_hash, expires_at, used_at, created_at)
         VALUES (?, ?, ?, ?, NULL, ?)`,
        newId('rcv'),
        user.id,
        sha256Hex(token),
        nowIso(new Date(Date.now() + config.recoveryTtlMs)),
        nowIso(),
      )
      if (config.env !== 'production') {
        mkdirSync(dirname(config.mailboxPath), { recursive: true })
        writeFileSync(
          config.mailboxPath,
          `${JSON.stringify({ userId: user.id, createdAt: nowIso(), tokenHint: token.slice(0, 4) })}\n`,
        )
      }
      if (config.exposeDevRecovery) devToken = token
      writeAccountLog({ level: 'info', event: 'recover_start', userId: user.id })
    }
    const response: Record<string, unknown> = {
      ok: true,
      message: '해당 이메일이 가입되어 있으면 복구 안내를 보냅니다.',
    }
    if (devToken) response.devRecoveryToken = devToken
    return c.json(response)
  })

  api.post('/auth/recover/complete', async (c) => {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
    const token = typeof body?.token === 'string' ? body.token : ''
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''
    if (!token || !isValidPassword(newPassword)) {
      return c.json(fail('validation_failed', '복구 토큰과 새 비밀번호가 필요합니다.', 400).body, 400)
    }
    const row = db.get<{ id: string; user_id: string; expires_at: string; used_at: string | null }>(
      'SELECT * FROM recovery_tokens WHERE token_hash = ?',
      sha256Hex(token),
    )
    if (!row || row.used_at || row.expires_at < nowIso()) {
      return c.json(fail('auth_invalid', '복구 토큰이 유효하지 않습니다.', 401).body, 401)
    }
    db.transaction(() => {
      db.run('UPDATE recovery_tokens SET used_at = ? WHERE id = ?', nowIso(), row.id)
      db.run(
        'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
        hashPassword(newPassword),
        nowIso(),
        row.user_id,
      )
      db.run('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL', nowIso(), row.user_id)
    })
    writeAccountLog({ level: 'info', event: 'recover_complete', userId: row.user_id })
    return c.json({ ok: true })
  })

  api.post('/auth/reauthenticate', async (c) => {
    const auth = await requireUser(c)
    if ('error' in auth) return auth.error
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
    const password = typeof body?.password === 'string' ? body.password : ''
    if (!verifyPassword(password, auth.user.password_hash)) {
      return c.json(fail('auth_invalid', '비밀번호가 올바르지 않습니다.', 401).body, 401)
    }
    db.run(
      `INSERT INTO reauth_grants (id, session_id, expires_at, created_at) VALUES (?, ?, ?, ?)`,
      newId('rea'),
      auth.session.id,
      nowIso(new Date(Date.now() + config.reauthTtlMs)),
      nowIso(),
    )
    return c.json({ ok: true })
  })

  const hasReauth = (sessionId: string, password: string | undefined, user: UserRow) => {
    if (password && verifyPassword(password, user.password_hash)) return true
    const grant = db.get<{ id: string }>(
      'SELECT id FROM reauth_grants WHERE session_id = ? AND expires_at >= ? LIMIT 1',
      sessionId,
      nowIso(),
    )
    return Boolean(grant)
  }

  api.post('/account/delete', async (c) => {
    const auth = await requireUser(c)
    if ('error' in auth) return auth.error
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
    const confirm = body?.confirm === 'DELETE'
    const password = typeof body?.password === 'string' ? body.password : undefined
    if (!confirm) return c.json(fail('validation_failed', '탈퇴 확인 문구가 필요합니다.', 400).body, 400)
    if (!hasReauth(auth.session.id, password, auth.user)) {
      return c.json(fail('reauth_required', '탈퇴 전에 비밀번호를 다시 확인해야 합니다.', 401).body, 401)
    }
    const deletedAt = nowIso()
    db.transaction(() => {
      db.run('UPDATE users SET deleted_at = ?, updated_at = ?, email = ? WHERE id = ?', deletedAt, deletedAt, `deleted+${auth.user.id}@invalid.local`, auth.user.id)
      db.run('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL', deletedAt, auth.user.id)
      db.run('DELETE FROM recovery_tokens WHERE user_id = ?', auth.user.id)
      db.run('DELETE FROM entitlements WHERE user_id = ?', auth.user.id)
      db.run('DELETE FROM sync_events WHERE user_id = ?', auth.user.id)
      db.run('DELETE FROM sync_heads WHERE user_id = ?', auth.user.id)
      db.run('DELETE FROM guest_transfers WHERE user_id = ?', auth.user.id)
      db.run(
        `INSERT INTO account_lifecycle (user_id, event, created_at, payload_json) VALUES (?, ?, ?, ?)`,
        auth.user.id,
        'account.deleted',
        deletedAt,
        JSON.stringify({ billingFollowUp: 'unspecified' }),
      )
    })
    deleteCookie(c, SESSION_COOKIE, { path: '/' })
    writeAccountLog({ level: 'info', event: 'account_deleted', userId: auth.user.id })
    return c.json({ ok: true })
  })

  api.post('/sync/push', async (c) => {
    const auth = await requireUser(c)
    if ('error' in auth) return auth.error
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
    const rawEvents = Array.isArray(body?.events) ? body.events : null
    if (!rawEvents) return c.json(fail('validation_failed', 'events 배열이 필요합니다.', 400).body, 400)
    const events: SyncEventInput[] = []
    for (const item of rawEvents) {
      const parsed = asEvent(item)
      if (!parsed) return c.json(fail('validation_failed', '이벤트 형식이 올바르지 않습니다.', 400).body, 400)
      events.push(parsed)
    }
    const result = pushEvents(auth.user.id, events)
    return c.json({ ok: true, ...result })
  })

  api.get('/sync/pull', async (c) => {
    const auth = await requireUser(c)
    if ('error' in auth) return auth.error
    const cursorRaw = c.req.query('cursor') ?? '0'
    const cursor = Number.parseInt(cursorRaw, 10)
    const after = Number.isFinite(cursor) ? cursor : 0
    const rows = db.all<EventRow>(
      `SELECT * FROM sync_events WHERE user_id = ? AND id > ? ORDER BY id ASC LIMIT ?`,
      auth.user.id,
      after,
      config.pullLimit + 1,
    )
    const hasMore = rows.length > config.pullLimit
    const page = hasMore ? rows.slice(0, config.pullLimit) : rows
    const events = page.map((row) => ({
      eventId: row.event_id,
      collection: row.collection,
      entityId: row.entity_id,
      op: row.op,
      clientUpdatedAt: row.client_updated_at,
      deviceId: row.device_id,
      payload: parseJson(row.payload_json),
      serverSeq: Number(row.id),
    }))
    const nextCursor = page.length ? String(page[page.length - 1]!.id) : String(after)
    return c.json({ ok: true, events, nextCursor, hasMore })
  })

  api.post('/guest/transfer', async (c) => {
    const auth = await requireUser(c)
    if ('error' in auth) return auth.error
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
    const guestDeviceId = typeof body?.guestDeviceId === 'string' ? body.guestDeviceId : ''
    if (!guestDeviceId.startsWith('gdev_')) {
      return c.json(fail('validation_failed', 'guestDeviceId가 필요합니다.', 400).body, 400)
    }
    const rawEvents = Array.isArray(body?.events) ? body.events : null
    if (!rawEvents) return c.json(fail('validation_failed', 'events 배열이 필요합니다.', 400).body, 400)
    const events: SyncEventInput[] = []
    for (const item of rawEvents) {
      const parsed = asEvent(item)
      if (!parsed) return c.json(fail('validation_failed', '이벤트 형식이 올바르지 않습니다.', 400).body, 400)
      events.push(parsed)
    }
    const result = pushEvents(auth.user.id, events, guestDeviceId)
    writeAccountLog({ level: 'info', event: 'guest_transfer', userId: auth.user.id, count: events.length })
    return c.json({ ok: true, ...result })
  })

  api.get('/entitlements', async (c) => {
    const auth = await requireUser(c)
    if ('error' in auth) return auth.error
    return c.json({ ok: true, entitlement: entitlementView(loadEntitlement(auth.user.id)) })
  })

  api.put('/admin/entitlements/:userId', async (c) => {
    const key = c.req.header('X-Arin-Admin-Key') ?? ''
    if (!config.adminKey || !safeEqual(key, config.adminKey)) {
      return c.json(fail('forbidden', '관리자 권한이 없습니다.', 403).body, 403)
    }
    const userId = c.req.param('userId')
    const user = db.get<UserRow>('SELECT id FROM users WHERE id = ? AND deleted_at IS NULL', userId)
    if (!user) return c.json(fail('not_found', '사용자를 찾을 수 없습니다.', 404).body, 404)
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
    const plan = body?.plan === 'paid' ? 'paid' : 'free'
    const source = body?.source === 'billing' ? 'billing' : 'none'
    const productCode = typeof body?.productCode === 'string' ? body.productCode : null
    const externalRef = typeof body?.externalRef === 'string' ? body.externalRef : null
    const updatedAt = nowIso()
    db.run(
      `INSERT INTO entitlements (user_id, source, plan, product_code, external_ref, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         source = excluded.source,
         plan = excluded.plan,
         product_code = excluded.product_code,
         external_ref = excluded.external_ref,
         updated_at = excluded.updated_at`,
      userId,
      source,
      plan,
      productCode,
      externalRef,
      updatedAt,
    )
    writeAccountLog({ level: 'info', event: 'entitlement_put', userId })
    return c.json({ ok: true, entitlement: { source, plan, updatedAt, productCode, externalRef } })
  })

  app.route('/api/account/v1', api)
  app.notFound((c) => c.json(fail('not_found', '없는 경로입니다.', 404).body, 404))
  app.onError((error, c) => {
    writeAccountLog({
      level: 'error',
      event: 'unhandled',
      route: c.req.path,
      message: error instanceof Error ? error.message : 'error',
    })
    return c.json(fail('internal_error', '서버 오류가 발생했습니다.', 500).body, 500)
  })

  return {
    app,
    db,
    config,
    close: () => db.close(),
  }
}
