import type { StoreKind, VerifyResult } from '../types'

export interface StoreVerifier {
  readonly store: StoreKind
  verifySignedPayload(signedPayload: string): Promise<VerifyResult>
  refresh(originalStoreTransactionId: string): Promise<VerifyResult>
}

export function pickVerifier(
  verifiers: Record<StoreKind, StoreVerifier>,
  store: StoreKind,
): StoreVerifier {
  return verifiers[store]
}
