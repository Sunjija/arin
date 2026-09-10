import type { SyncCollection, SyncOp } from './apply'

export type AccountMode = 'demo' | 'connected' | 'test'

export type AuthStatus = 'guest' | 'authenticating' | 'signed-in' | 'expired' | 'locked'

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

export interface EntitlementView {
  source: 'none' | 'billing'
  plan: 'free' | 'paid'
  updatedAt: string | null
}

export interface AuthSessionView {
  status: AuthStatus
  mode: AccountMode
  userId: string | null
  emailMasked: string | null
  sessionId: string | null
  expiresAt: string | null
  entitlement: EntitlementView
  serverReachable: boolean
}

export type SyncEventStatus = 'pending' | 'inflight' | 'acked' | 'failed' | 'conflict' | 'local-only'

export interface SyncEvent {
  eventId: string
  collection: SyncCollection
  entityId: string
  op: SyncOp
  clientUpdatedAt: string
  deviceId: string
  payload: unknown
}

export interface OutboxRow extends SyncEvent {
  status: SyncEventStatus
  attempts: number
  lastError: string | null
  createdAt: string
  ownerKey: string
}

export interface PushResult {
  accepted: Array<{ eventId: string; serverSeq: number }>
  duplicates: Array<{ eventId: string; serverSeq: number }>
  conflicts: Array<{ eventId: string; collection: string; entityId: string; server: unknown }>
  rejected: Array<{ eventId: string; code: AccountErrorCode }>
}

export interface PullResult {
  events: Array<SyncEvent & { serverSeq: number }>
  nextCursor: string
  hasMore: boolean
}

export interface SyncConflict {
  id: string
  collection: SyncCollection
  entityId: string
  local: unknown
  server: unknown
  createdAt: string
}

export interface AccountUiState {
  session: AuthSessionView
  pendingCount: number
  failedCount: number
  conflictCount: number
  lastError: string | null
  statusText: string
  statusTone: 'neutral' | 'success' | 'error'
}

export class AccountError extends Error {
  readonly code: AccountErrorCode

  constructor(code: AccountErrorCode, message: string) {
    super(message)
    this.name = 'AccountError'
    this.code = code
  }
}

export function guestSession(mode: AccountMode, serverReachable: boolean): AuthSessionView {
  return {
    status: 'guest',
    mode,
    userId: null,
    emailMasked: null,
    sessionId: null,
    expiresAt: null,
    entitlement: { source: 'none', plan: 'free', updatedAt: null },
    serverReachable,
  }
}
