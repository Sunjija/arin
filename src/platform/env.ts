export type RuntimeMode = 'demo' | 'live'

function readEnv(name: 'VITE_RUNTIME_MODE' | 'VITE_API_BASE_URL' | 'VITE_DEV_SERVER_URL'): string {
  const value = import.meta.env[name]
  return typeof value === 'string' ? value.trim() : ''
}

export function getRuntimeMode(): RuntimeMode {
  return readEnv('VITE_RUNTIME_MODE') === 'live' ? 'live' : 'demo'
}

export function isDemoMode(): boolean {
  return getRuntimeMode() === 'demo'
}

/** B 서버가 생기기 전에는 빈 문자열. 번들에 비밀키를 넣지 않는다. */
export function getApiBaseUrl(): string {
  return readEnv('VITE_API_BASE_URL').replace(/\/$/, '')
}

export function getDevServerUrl(): string {
  return readEnv('VITE_DEV_SERVER_URL').replace(/\/$/, '')
}

export function runtimeBannerLabel(): string {
  if (isDemoMode()) return '데모 · 서버 없음'
  const api = getApiBaseUrl()
  if (api) return `개발 서버 · ${api}`
  return '개발 서버 · Vite'
}
