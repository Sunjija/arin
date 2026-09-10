/**
 * 학습 저장 경계.
 *
 * 현재는 Dexie IndexedDB(`hanguksa-coach`)만 사용한다.
 * 계정·동기화 작업(PR #7, `docs/contracts/account-sync-v1.md`)이 준비되면
 * 아래 키를 같은 이벤트로 올리면 된다. 이 모듈은 전송을 구현하지 않는다.
 */
export const LEARNING_SYNC_COLLECTIONS = [
  'settings',
  'mastery',
  'cards',
  'wrongAnswers',
  'attempts',
  'studyDays',
  'mockResults',
  'activeSession',
  'meta',
] as const

export const LEARNING_LOCAL_ONLY_KEYS = [
  'arin.clock.iso',
] as const

export const LEARNING_STORAGE_MODE = 'local-indexeddb' as const
