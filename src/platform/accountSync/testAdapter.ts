import { authCallbackUri } from '../identity'
import { parseDeepLink } from '../deepLinks'
import { accountSessionStore } from './sessionStore'
import type { AccountSession, AccountSyncPort, CompleteLoginResult, StartLoginResult } from './types'

function sessionFromCode(code: string): AccountSession {
  return {
    localId: `test:${code}`,
    displayName: '테스트 사용자',
    accessToken: `test-token:${code}`,
    refreshToken: null,
    expiresAt: null,
    provider: 'test',
  }
}

export const testAccountSyncPort: AccountSyncPort = {
  id: 'test',
  async startExternalLogin(input): Promise<StartLoginResult> {
    const redirect = input.redirectUri || authCallbackUri()
    const fake = `${redirect}${redirect.includes('?') ? '&' : '?'}code=local-demo`
    return this.completeFromCallback(fake).then((result) =>
      result.ok ? { ok: true } : { ok: false, code: 'failed', message: result.message },
    )
  },
  async completeFromCallback(url: string): Promise<CompleteLoginResult> {
    const intent = parseDeepLink(url)
    if (intent.kind !== 'auth-callback') {
      return { ok: false, code: 'invalid-callback', message: '로그인 콜백 주소가 아닙니다.' }
    }
    const params = new URLSearchParams(intent.search)
    const error = params.get('error')
    if (error) return { ok: false, code: 'failed', message: error }
    const code = params.get('code')
    if (!code) return { ok: false, code: 'invalid-callback', message: 'code가 없습니다.' }
    const session = sessionFromCode(code)
    await accountSessionStore.setSession(session)
    return { ok: true, session }
  },
  getSession() {
    return accountSessionStore.getSession()
  },
  signOut() {
    return accountSessionStore.clearSession()
  },
}
