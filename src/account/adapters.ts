import type { AuthSessionView, PullResult, PushResult, SyncEvent } from './types'
import { AccountError, guestSession } from './types'
import { apiUrl } from './config'

export interface AuthAdapter {
  register(input: { email: string; password: string; ageConfirmed: boolean }): Promise<{ session: AuthSessionView; token?: string }>
  login(input: { email: string; password: string }): Promise<{ session: AuthSessionView; token?: string }>
  logout(): Promise<void>
  session(): Promise<AuthSessionView>
  startRecovery(email: string): Promise<{ devRecoveryToken?: string }>
  completeRecovery(input: { token: string; newPassword: string }): Promise<void>
  reauthenticate(password: string): Promise<void>
  deleteAccount(input: { password: string }): Promise<void>
}

export interface SyncTransport {
  health(): Promise<boolean>
  push(events: SyncEvent[]): Promise<PushResult>
  pull(cursor: string | null): Promise<PullResult>
  transferGuest(input: { guestDeviceId: string; events: SyncEvent[] }): Promise<PushResult>
}

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>

function readError(payload: unknown, fallback: string): AccountError {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const error = (payload as { error?: { code?: string; message?: string } }).error
    if (error?.code) {
      return new AccountError(error.code as AccountError['code'], error.message ?? fallback)
    }
  }
  return new AccountError('internal_error', fallback)
}

export function createHttpAdapters(input: {
  getToken: () => Promise<string | null>
  setToken: (token: string | null) => Promise<void>
  fetchImpl?: Fetcher
}): { auth: AuthAdapter; sync: SyncTransport } {
  const fetchImpl = input.fetchImpl ?? fetch

  const request = async (path: string, init: RequestInit = {}) => {
    const token = await input.getToken()
    const headers = new Headers(init.headers)
    headers.set('Accept', 'application/json')
    if (init.body) headers.set('Content-Type', 'application/json')
    if (token) headers.set('Authorization', `Bearer ${token}`)
    const response = await fetchImpl(apiUrl(path), {
      ...init,
      headers,
      credentials: 'include',
    })
    const body: unknown = await response.json().catch(() => null)
    return { response, body }
  }

  const auth: AuthAdapter = {
    async register(payload) {
      let result: { response: Response; body: unknown }
      try {
        result = await request('/auth/register', { method: 'POST', body: JSON.stringify(payload) })
      } catch {
        throw new AccountError('server_unreachable', '개발 서버에 연결하지 못했습니다.')
      }
      if (!result.response.ok) throw readError(result.body, '가입에 실패했습니다.')
      const data = result.body as { session: AuthSessionView; token?: string }
      if (data.token) await input.setToken(data.token)
      return { session: { ...data.session, serverReachable: true, mode: 'connected' }, token: data.token }
    },
    async login(payload) {
      let result: { response: Response; body: unknown }
      try {
        result = await request('/auth/login', { method: 'POST', body: JSON.stringify(payload) })
      } catch {
        throw new AccountError('server_unreachable', '개발 서버에 연결하지 못했습니다.')
      }
      if (!result.response.ok) throw readError(result.body, '로그인에 실패했습니다.')
      const data = result.body as { session: AuthSessionView; token?: string }
      if (data.token) await input.setToken(data.token)
      return { session: { ...data.session, serverReachable: true, mode: 'connected' }, token: data.token }
    },
    async logout() {
      try {
        await request('/auth/logout', { method: 'POST', body: '{}' })
      } catch {
        /* 로컬 세션은 그래도 지운다 */
      }
      await input.setToken(null)
    },
    async session() {
      try {
        const result = await request('/auth/session')
        if (!result.response.ok) {
          await input.setToken(null)
          return guestSession('connected', result.response.status < 500)
        }
        const data = result.body as { session: AuthSessionView }
        return { ...data.session, serverReachable: true, mode: 'connected' }
      } catch {
        return guestSession('connected', false)
      }
    },
    async startRecovery(email) {
      try {
        const result = await request('/auth/recover/start', { method: 'POST', body: JSON.stringify({ email }) })
        if (!result.response.ok) throw readError(result.body, '복구 요청에 실패했습니다.')
        const data = result.body as { devRecoveryToken?: string }
        return { devRecoveryToken: data.devRecoveryToken }
      } catch (error) {
        if (error instanceof AccountError) throw error
        throw new AccountError('server_unreachable', '개발 서버에 연결하지 못했습니다.')
      }
    },
    async completeRecovery(payload) {
      const result = await request('/auth/recover/complete', { method: 'POST', body: JSON.stringify(payload) })
      if (!result.response.ok) throw readError(result.body, '비밀번호를 바꾸지 못했습니다.')
    },
    async reauthenticate(password) {
      const result = await request('/auth/reauthenticate', { method: 'POST', body: JSON.stringify({ password }) })
      if (!result.response.ok) throw readError(result.body, '비밀번호 확인에 실패했습니다.')
    },
    async deleteAccount(payload) {
      const result = await request('/account/delete', {
        method: 'POST',
        body: JSON.stringify({ confirm: 'DELETE', password: payload.password }),
      })
      if (!result.response.ok) throw readError(result.body, '계정을 삭제하지 못했습니다.')
      await input.setToken(null)
    },
  }

  const sync: SyncTransport = {
    async health() {
      try {
        const result = await request('/health')
        return Boolean(result.response.ok && (result.body as { ok?: boolean }).ok)
      } catch {
        return false
      }
    },
    async push(events) {
      try {
        const result = await request('/sync/push', {
          method: 'POST',
          body: JSON.stringify({ deviceId: events[0]?.deviceId ?? 'dev_unknown', events }),
        })
        if (!result.response.ok) throw readError(result.body, '동기화에 실패했습니다.')
        return result.body as PushResult
      } catch (error) {
        if (error instanceof AccountError) throw error
        throw new AccountError('server_unreachable', '개발 서버에 연결하지 못했습니다.')
      }
    },
    async pull(cursor) {
      const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
      try {
        const result = await request(`/sync/pull${query}`)
        if (!result.response.ok) throw readError(result.body, '기록을 받지 못했습니다.')
        return result.body as PullResult
      } catch (error) {
        if (error instanceof AccountError) throw error
        throw new AccountError('server_unreachable', '개발 서버에 연결하지 못했습니다.')
      }
    },
    async transferGuest(payload) {
      try {
        const result = await request('/guest/transfer', { method: 'POST', body: JSON.stringify(payload) })
        if (!result.response.ok) throw readError(result.body, '게스트 기록을 옮기지 못했습니다.')
        return result.body as PushResult
      } catch (error) {
        if (error instanceof AccountError) throw error
        throw new AccountError('server_unreachable', '개발 서버에 연결하지 못했습니다.')
      }
    },
  }

  return { auth, sync }
}

export function createDemoAdapters(): { auth: AuthAdapter; sync: SyncTransport } {
  const demoError = () =>
    new AccountError('demo_mode', '데모 모드입니다. 서버 저장을 쓰려면 npm run dev:account 로 실행하세요.')
  return {
    auth: {
      register: async () => {
        throw demoError()
      },
      login: async () => {
        throw demoError()
      },
      logout: async () => undefined,
      session: async () => guestSession('demo', false),
      startRecovery: async () => {
        throw demoError()
      },
      completeRecovery: async () => {
        throw demoError()
      },
      reauthenticate: async () => {
        throw demoError()
      },
      deleteAccount: async () => {
        throw demoError()
      },
    },
    sync: {
      health: async () => false,
      push: async () => {
        throw demoError()
      },
      pull: async () => ({ events: [], nextCursor: '0', hasMore: false }),
      transferGuest: async () => {
        throw demoError()
      },
    },
  }
}
