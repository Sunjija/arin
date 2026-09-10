import type { StoreVerifier } from './verifiers'

export function createUnavailableVerifier(store: 'apple' | 'google'): StoreVerifier {
  const fail = async () =>
    ({
      ok: false as const,
      code: 'store_verification_unavailable' as const,
      message:
        store === 'apple'
          ? 'App Store 서버 검증 인증 정보가 없어 권한을 부여하지 않았습니다.'
          : 'Google Play Developer API 인증 정보가 없어 권한을 부여하지 않았습니다.',
    })

  return {
    store,
    verifySignedPayload: fail,
    refresh: fail,
  }
}

export function createRejectingTestVerifier(): StoreVerifier {
  return {
    store: 'test',
    async verifySignedPayload(signedPayload) {
      if (signedPayload.startsWith('test.')) {
        return {
          ok: false,
          code: 'test_transaction_rejected',
          message: '운영·샌드박스 서버는 테스트 어댑터 거래를 승인하지 않습니다.',
        }
      }
      return {
        ok: false,
        code: 'store_verification_failed',
        message: '테스트 검증기가 아닌 환경에서 알 수 없는 거래입니다.',
      }
    },
    async refresh() {
      return {
        ok: false,
        code: 'test_transaction_rejected',
        message: '운영·샌드박스 서버는 테스트 어댑터 거래를 승인하지 않습니다.',
      }
    },
  }
}

