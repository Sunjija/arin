import type { EntitlementSnapshot, NativeStoreTransaction } from '../types'

export interface ClientPersistence {
  getInstallId(): string
  getAccountId(): string
  setAccountId(accountId: string): void
  getUnfinished(): NativeStoreTransaction[]
  setUnfinished(rows: NativeStoreTransaction[]): void
  getSnapshot(): EntitlementSnapshot | null
  setSnapshot(snapshot: EntitlementSnapshot | null): void
}

export function createMemoryPersistence(seed?: {
  installId?: string
  accountId?: string
}): ClientPersistence {
  const installId = seed?.installId ?? `install_${crypto.randomUUID()}`
  let accountId = seed?.accountId ?? `placeholder:install:${installId}`
  let unfinished: NativeStoreTransaction[] = []
  let snapshot: EntitlementSnapshot | null = null
  return {
    getInstallId: () => installId,
    getAccountId: () => accountId,
    setAccountId: (next) => {
      accountId = next
    },
    getUnfinished: () => [...unfinished],
    setUnfinished: (rows) => {
      unfinished = [...rows]
    },
    getSnapshot: () => snapshot,
    setSnapshot: (next) => {
      snapshot = next
    },
  }
}

const KEY = 'arin.billing.v1.client'

interface PersistedClient {
  installId: string
  accountId: string
  unfinished: NativeStoreTransaction[]
  snapshot: EntitlementSnapshot | null
}

export function createLocalStoragePersistence(storage: Storage): ClientPersistence {
  const read = (): PersistedClient => {
    try {
      const raw = storage.getItem(KEY)
      if (raw) return JSON.parse(raw) as PersistedClient
    } catch {
      /* ignore broken storage */
    }
    const installId = `install_${crypto.randomUUID()}`
    return {
      installId,
      accountId: `placeholder:install:${installId}`,
      unfinished: [],
      snapshot: null,
    }
  }
  const write = (state: PersistedClient) => {
    storage.setItem(KEY, JSON.stringify(state))
  }
  let state = read()
  write(state)
  return {
    getInstallId: () => state.installId,
    getAccountId: () => state.accountId,
    setAccountId: (accountId) => {
      state = { ...state, accountId }
      write(state)
    },
    getUnfinished: () => [...state.unfinished],
    setUnfinished: (unfinished) => {
      state = { ...state, unfinished }
      write(state)
    },
    getSnapshot: () => state.snapshot,
    setSnapshot: (snapshot) => {
      state = { ...state, snapshot }
      write(state)
    },
  }
}
