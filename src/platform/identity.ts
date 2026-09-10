import identity from '../../mobile/identity.json'

export type AppChannel = 'development' | 'production'

export const URL_SCHEME = identity.urlScheme
export const PRODUCT_NAME = identity.productName
export const APP_VERSION = identity.version
export const APP_VERSION_CODE = identity.versionCode

export const DEVELOPMENT_APP_ID = identity.development.appId
export const DEVELOPMENT_APP_NAME = identity.development.appName
export const PRODUCTION_APP_ID = identity.production.appId
export const PRODUCTION_APP_NAME = identity.production.appName
export const PRODUCTION_ID_STATUS = identity.production.status

/** 현재 설치 빌드는 개발용 식별자를 쓴다. 운영 ID는 미등록 플레이스홀더. */
export const ACTIVE_APP_ID = DEVELOPMENT_APP_ID
export const ACTIVE_APP_NAME = DEVELOPMENT_APP_NAME
export const ACTIVE_CHANNEL: AppChannel = 'development'

export function authCallbackUri(): string {
  return `${URL_SCHEME}://auth/callback`
}

export function appDeepLink(pathname: string, search = '', hash = ''): string {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`
  return `${URL_SCHEME}://app${path}${search}${hash}`
}
