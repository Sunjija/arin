import { DEV_BILLING_CATALOG } from '../catalog'
import { createSystemClock, type Clock } from '../clock'
import { DEFAULT_OFFLINE_TTL_MS } from '../types'
import { createMemoryRepository, hydrateMemoryRepository, type BillingRepository } from '../server/repository'
import { createBillingService, createProductionAccountAuth, createTestAccountAuth, type AccountAuth, type BillingService } from '../server/service'
import { createUnavailableVerifier, createRejectingTestVerifier } from '../server/failClosed'
import { handleBillingHttp, type BillingHttpRequest } from '../server/http'
import { createTestStoreWorld, hydrateTestStoreWorld, type TestStoreWorld } from '../store/testAdapter'
import { createLocalStoragePersistence, createMemoryPersistence, type ClientPersistence } from './persistence'
import { createBillingClient, type BillingClient } from './controller'
import type { NativeStoreBilling } from '../store/native'
import type { BillingEnvironment } from '../types'

export interface BillingHarness {
  environment: BillingEnvironment
  catalog: typeof DEV_BILLING_CATALOG
  world: TestStoreWorld
  service: BillingService
  client: BillingClient
  store: NativeStoreBilling
  persistence: ClientPersistence
  clock: Clock
  repo: BillingRepository
  auth: AccountAuth
  persist(): void
  handleHttp(request: BillingHttpRequest): ReturnType<typeof handleBillingHttp>
}

const WORLD_KEY = 'arin.billing.v1.testWorld'
const REPO_KEY = 'arin.billing.v1.repo'

export function createBillingHarness(options?: {
  environment?: BillingEnvironment
  clock?: Clock
  persistence?: ClientPersistence
  storage?: Storage | null
  accountId?: string
}): BillingHarness {
  const environment = options?.environment ?? 'test'
  const clock = options?.clock ?? createSystemClock()
  const catalog = DEV_BILLING_CATALOG
  const storage = options?.storage

  let world: TestStoreWorld
  if (environment === 'test' && storage) {
    const saved = storage.getItem(WORLD_KEY)
    world = saved
      ? hydrateTestStoreWorld(saved, { catalog, clock })
      : createTestStoreWorld({ catalog, clock })
  } else {
    world = createTestStoreWorld({ catalog, clock })
  }

  const repo =
    environment === 'test' && storage?.getItem(REPO_KEY)
      ? hydrateMemoryRepository(storage.getItem(REPO_KEY)!)
      : createMemoryRepository()

  const verifiers =
    environment === 'test'
      ? {
          test: world.verifier,
          apple: createUnavailableVerifier('apple'),
          google: createUnavailableVerifier('google'),
        }
      : {
          test: createRejectingTestVerifier(),
          apple: createUnavailableVerifier('apple'),
          google: createUnavailableVerifier('google'),
        }

  const service = createBillingService({
    environment,
    catalog,
    clock,
    repo,
    verifiers,
    offlineTtlMs: DEFAULT_OFFLINE_TTL_MS,
  })

  const auth = environment === 'test' ? createTestAccountAuth() : createProductionAccountAuth()
  const persistence =
    options?.persistence ??
    (storage ? createLocalStoragePersistence(storage) : createMemoryPersistence({ accountId: options?.accountId }))
  if (options?.accountId) persistence.setAccountId(options.accountId)

  const store = world.createAdapter()
  const client = createBillingClient({ catalog, store, service, persistence, clock })

  const persist = () => {
    if (!storage || environment !== 'test') return
    storage.setItem(WORLD_KEY, world.serialize())
    storage.setItem(REPO_KEY, repo.serialize())
  }

  return {
    environment,
    catalog,
    world,
    service,
    client,
    store,
    persistence,
    clock,
    repo,
    auth,
    persist,
    handleHttp(request) {
      return handleBillingHttp({ service, auth, request, environment })
    },
  }
}

let browserHarness: BillingHarness | null = null

export function getBrowserBillingHarness(): BillingHarness {
  if (browserHarness) return browserHarness
  const storage = typeof localStorage === 'undefined' ? null : localStorage
  browserHarness = createBillingHarness({ environment: 'test', storage })
  return browserHarness
}

export function resetBrowserBillingHarness(): void {
  browserHarness = null
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(WORLD_KEY)
  localStorage.removeItem(REPO_KEY)
  localStorage.removeItem('arin.billing.v1.client')
}
