import { BillingError } from '../errors'
import type { BillingEnvironment, CanonicalNotification } from '../types'

export function parseAppleNotification(body: unknown, serverEnv: BillingEnvironment): CanonicalNotification {
  if (serverEnv !== 'test') {
    throw new BillingError(
      'store_verification_unavailable',
      'App Store Server Notifications V2 JWS 검증 인증 정보가 없습니다. 권한을 변경하지 않습니다.',
    )
  }
  return parseCanonicalEnvelope(body, 'apple 테스트 알림')
}

export function parseGoogleNotification(body: unknown, serverEnv: BillingEnvironment): CanonicalNotification {
  if (serverEnv !== 'test') {
    throw new BillingError(
      'store_verification_unavailable',
      'Google Play RTDN 재조회를 위한 Developer API 인증 정보가 없습니다. 권한을 변경하지 않습니다.',
    )
  }
  if (isRecord(body) && isRecord(body.message) && typeof body.message.data === 'string') {
    try {
      const decoded = JSON.parse(atob(body.message.data.replace(/-/g, '+').replace(/_/g, '/'))) as unknown
      if (isRecord(decoded) && decoded.testNotification) {
        return {
          notificationId: String(body.message.messageId ?? `google-test-${Date.now()}`),
          environment: 'test',
          store: 'test',
          eventTime: new Date().toISOString(),
          type: 'test_ping',
          originalStoreTransactionId: 'none',
          signedPayload: 'test.ping',
        }
      }
    } catch {
      throw new BillingError('invalid_request', 'Google 알림 본문을 해석하지 못했습니다.')
    }
  }
  return parseCanonicalEnvelope(body, 'google 테스트 알림')
}

function parseCanonicalEnvelope(body: unknown, label: string): CanonicalNotification {
  const source = unwrapSignedPayload(body)
  if (!isRecord(source)) {
    throw new BillingError('invalid_request', `${label} 형식이 아닙니다.`)
  }
  if (source.environment !== 'test') {
    throw new BillingError('environment_mismatch', '테스트 서버만 서명 없는 canonical 알림을 받습니다.')
  }
  if (typeof source.notificationId !== 'string' || typeof source.signedPayload !== 'string') {
    throw new BillingError('invalid_request', `${label} 필수 필드가 없습니다.`)
  }
  return source as unknown as CanonicalNotification
}

function unwrapSignedPayload(body: unknown): unknown {
  if (isRecord(body) && typeof body.signedPayload === 'string' && body.signedPayload.startsWith('{')) {
    return JSON.parse(body.signedPayload) as unknown
  }
  if (isRecord(body) && isRecord(body.signedPayload) === false && isCanonical(body)) return body
  if (isRecord(body) && isCanonical(body.notification)) return body.notification
  return body
}

function isCanonical(value: unknown): boolean {
  return isRecord(value) && typeof value.notificationId === 'string' && typeof value.type === 'string'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
