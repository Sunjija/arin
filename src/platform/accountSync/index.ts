import { testAccountSyncPort } from './testAdapter'
import type { AccountSyncPort } from './types'

/**
 * B account-sync 실구현이 오면 이 함수만 교체한다.
 * 딥링크·세션 저장소 계약은 docs/contracts/mobile-platform-v1.md.
 */
export function getAccountSyncPort(): AccountSyncPort {
  return testAccountSyncPort
}

export type { AccountSession, AccountSyncPort } from './types'
export { accountSessionStore } from './sessionStore'
