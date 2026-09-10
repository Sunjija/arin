export type BillingConnectResult = { ok: true } | { ok: false; code: 'not-wired' }

export type BillingProduct = {
  id: string
  title: string
  price: string
}

export type BillingPurchaseResult =
  | { ok: true; productId: string; nativeReceipt: string }
  | { ok: false; code: 'not-wired' | 'cancelled' | 'failed'; message?: string }

export interface NativeBillingPort {
  connect(): Promise<BillingConnectResult>
  getProducts(ids: string[]): Promise<{ ok: true; products: BillingProduct[] } | { ok: false; code: 'not-wired' }>
  purchase(id: string): Promise<BillingPurchaseResult>
  restore(): Promise<BillingPurchaseResult>
}

const unwired: NativeBillingPort = {
  async connect() {
    return { ok: false, code: 'not-wired' }
  },
  async getProducts() {
    return { ok: false, code: 'not-wired' }
  },
  async purchase() {
    return { ok: false, code: 'not-wired' }
  },
  async restore() {
    return { ok: false, code: 'not-wired' }
  },
}

/** 결제 담당이 Play Billing / StoreKit 플러그인으로 교체한다. */
export function getNativeBillingPort(): NativeBillingPort {
  return unwired
}
