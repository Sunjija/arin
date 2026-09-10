import type { BillingErrorBody, BillingErrorCode } from './types'

export class BillingError extends Error {
  readonly code: BillingErrorCode
  readonly details?: Record<string, string>
  readonly httpStatus: number

  constructor(
    code: BillingErrorCode,
    message: string,
    options?: { details?: Record<string, string>; httpStatus?: number },
  ) {
    super(message)
    this.name = 'BillingError'
    this.code = code
    this.details = options?.details
    this.httpStatus = options?.httpStatus ?? statusForCode(code)
  }

  toBody(): BillingErrorBody {
    const body: BillingErrorBody = { error: this.code, message: this.message }
    if (this.details) body.details = this.details
    return body
  }
}

export function statusForCode(code: BillingErrorCode): number {
  switch (code) {
    case 'unauthorized':
      return 401
    case 'entitlement_inactive':
      return 403
    case 'not_found':
      return 404
    case 'conflict':
    case 'purchase_bound_to_other_account':
      return 409
    case 'store_verification_unavailable':
      return 503
    default:
      return 400
  }
}

export function isBillingError(value: unknown): value is BillingError {
  return value instanceof BillingError
}
