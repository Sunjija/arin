export interface AccountSession {
  localId: string
  displayName: string | null
  accessToken: string | null
  refreshToken: string | null
  expiresAt: string | null
  provider: 'test' | 'pending-b'
}

export interface AccountSessionStore {
  getSession(): Promise<AccountSession | null>
  setSession(session: AccountSession): Promise<void>
  clearSession(): Promise<void>
}

export interface StartLoginInput {
  redirectUri: string
}

export type StartLoginResult =
  | { ok: true }
  | { ok: false; code: 'not-wired' | 'cancelled' | 'failed'; message?: string }

export type CompleteLoginResult =
  | { ok: true; session: AccountSession }
  | { ok: false; code: 'invalid-callback' | 'failed'; message?: string }

export interface AccountSyncPort {
  readonly id: 'test' | 'pending-b'
  startExternalLogin(input: StartLoginInput): Promise<StartLoginResult>
  completeFromCallback(url: string): Promise<CompleteLoginResult>
  getSession(): Promise<AccountSession | null>
  signOut(): Promise<void>
}
