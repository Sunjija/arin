import { BillingError, isBillingError } from '../errors'
import { redactForLog } from '../redaction'
import type { AccountAuth, BillingService } from './service'
import { parseAppleNotification, parseGoogleNotification } from './notifications'
import type { Capability, StoreKind, VerifyRequest } from '../types'

export interface BillingHttpRequest {
  method: string
  path: string
  header: (name: string) => string | undefined
  body: unknown
}

export interface BillingHttpResponse {
  status: number
  body: unknown
}

export async function handleBillingHttp(input: {
  service: BillingService
  auth: AccountAuth
  request: BillingHttpRequest
  environment: 'test' | 'sandbox' | 'production'
}): Promise<BillingHttpResponse> {
  try {
    return await route(input)
  } catch (error) {
    if (isBillingError(error)) {
      return { status: error.httpStatus, body: redactForLog(error.toBody()) }
    }
    return {
      status: 500,
      body: { error: 'invalid_request', message: '결제 서버 오류가 발생했습니다.' },
    }
  }
}

async function route(input: {
  service: BillingService
  auth: AccountAuth
  request: BillingHttpRequest
  environment: 'test' | 'sandbox' | 'production'
}): Promise<BillingHttpResponse> {
  const { service, auth, request, environment } = input
  const method = request.method.toUpperCase()
  const path = normalizePath(request.path)

  if (method === 'GET' && path === '/v1/billing/catalog') {
    const account = await auth.resolve(request.header('authorization'))
    void account
    return { status: 200, body: service.catalog('test', []) }
  }

  if (method === 'GET' && path === '/v1/billing/entitlements') {
    const { accountId } = await auth.resolve(request.header('authorization'))
    return { status: 200, body: service.entitlements(accountId) }
  }

  if (method === 'POST' && path === '/v1/billing/verify') {
    const { accountId } = await auth.resolve(request.header('authorization'))
    const body = asRecord(request.body)
    const verifyRequest: VerifyRequest = {
      store: asStore(body.store),
      productId: String(body.productId ?? ''),
      signedPayload: String(body.signedPayload ?? ''),
      appAccountToken: optionalString(body.appAccountToken),
    }
    if (!verifyRequest.signedPayload) {
      throw new BillingError('invalid_request', 'signedPayload가 필요합니다.')
    }
    return { status: 200, body: await service.verify(accountId, verifyRequest) }
  }

  if (method === 'POST' && path === '/v1/billing/restore') {
    const { accountId } = await auth.resolve(request.header('authorization'))
    const body = asRecord(request.body)
    const transactions = Array.isArray(body.transactions) ? body.transactions : []
    const payloads = transactions.map((item) => {
      const row = asRecord(item)
      return {
        store: asStore(row.store),
        signedPayload: String(row.signedPayload ?? ''),
        productId: optionalString(row.productId),
      }
    })
    return { status: 200, body: await service.restore(accountId, payloads) }
  }

  if (method === 'POST' && path === '/v1/billing/refresh') {
    const { accountId } = await auth.resolve(request.header('authorization'))
    return { status: 200, body: await service.refresh(accountId) }
  }

  if (method === 'POST' && path === '/v1/billing/access-check') {
    const { accountId } = await auth.resolve(request.header('authorization'))
    const capability = String(asRecord(request.body).capability ?? '') as Capability
    return { status: 200, body: service.assertCapability(accountId, capability) }
  }

  if (method === 'POST' && path === '/v1/billing/account-deleted') {
    const { accountId } = await auth.resolve(request.header('authorization'))
    const body = asRecord(request.body)
    const target = String(body.accountId ?? accountId)
    if (target !== accountId && environment !== 'test') {
      throw new BillingError('unauthorized', '다른 계정의 삭제를 처리할 수 없습니다.')
    }
    return {
      status: 200,
      body: service.accountDeleted(target, String(body.deletedAt ?? new Date().toISOString())),
    }
  }

  if (method === 'POST' && path === '/v1/billing/notifications/apple') {
    const notification = parseAppleNotification(request.body, environment)
    const result = await service.handleNotification(notification)
    return { status: 200, body: result }
  }

  if (method === 'POST' && path === '/v1/billing/notifications/google') {
    const notification = parseGoogleNotification(request.body, environment)
    const result = await service.handleNotification(notification)
    return { status: 200, body: result }
  }

  throw new BillingError('not_found', '알 수 없는 결제 API 경로입니다.')
}

function normalizePath(path: string): string {
  const trimmed = path.replace(/\/+$/, '')
  return trimmed.length === 0 ? '/' : trimmed
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function asStore(value: unknown): StoreKind {
  if (value === 'apple' || value === 'google' || value === 'test') return value
  throw new BillingError('invalid_request', 'store 값이 올바르지 않습니다.')
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}
