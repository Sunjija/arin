import { URL_SCHEME } from './identity'

export type AppRouteIntent = {
  kind: 'app-route'
  pathname: string
  search: string
  hash: string
}

export type AuthCallbackIntent = {
  kind: 'auth-callback'
  url: string
  pathname: string
  search: string
  hash: string
}

export type DeepLinkIntent = AppRouteIntent | AuthCallbackIntent | { kind: 'ignored'; reason: string }

const AUTH_PATH = '/auth/callback'

function splitPathQueryHash(rawPath: string): { pathname: string; search: string; hash: string } {
  const hashIndex = rawPath.indexOf('#')
  const hash = hashIndex >= 0 ? rawPath.slice(hashIndex) : ''
  const withoutHash = hashIndex >= 0 ? rawPath.slice(0, hashIndex) : rawPath
  const queryIndex = withoutHash.indexOf('?')
  const search = queryIndex >= 0 ? withoutHash.slice(queryIndex) : ''
  let pathname = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash
  if (!pathname.startsWith('/')) pathname = `/${pathname}`
  if (pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.slice(0, -1)
  return { pathname, search, hash }
}

function fromHttpUrl(url: URL): DeepLinkIntent {
  const parts = splitPathQueryHash(`${url.pathname}${url.search}${url.hash}`)
  if (parts.pathname === AUTH_PATH) {
    return { kind: 'auth-callback', url: url.toString(), ...parts }
  }
  return { kind: 'app-route', ...parts }
}

function fromCustomScheme(url: URL): DeepLinkIntent {
  const host = url.hostname
  const pathFromHost = url.pathname && url.pathname !== '/' ? url.pathname : ''
  if (host === 'auth' || host === 'app') {
    const combined = host === 'auth' ? `/auth${pathFromHost || '/callback'}` : pathFromHost || '/'
    const parts = splitPathQueryHash(`${combined}${url.search}${url.hash}`)
    if (parts.pathname === AUTH_PATH || (host === 'auth' && (pathFromHost === '' || pathFromHost === '/callback'))) {
      return { kind: 'auth-callback', url: url.toString(), pathname: AUTH_PATH, search: url.search, hash: url.hash }
    }
    return { kind: 'app-route', ...parts }
  }
  return { kind: 'ignored', reason: `unknown-host:${host}` }
}

export function parseDeepLink(raw: string | null | undefined): DeepLinkIntent {
  if (!raw || !raw.trim()) return { kind: 'ignored', reason: 'empty' }
  const trimmed = raw.trim()

  try {
    const url = new URL(trimmed)
    if (url.protocol === `${URL_SCHEME}:`) return fromCustomScheme(url)
    if (url.protocol === 'http:' || url.protocol === 'https:') return fromHttpUrl(url)
    return { kind: 'ignored', reason: `unsupported-protocol:${url.protocol}` }
  } catch {
    if (trimmed.startsWith('/')) {
      const parts = splitPathQueryHash(trimmed)
      if (parts.pathname === AUTH_PATH) {
        return { kind: 'auth-callback', url: trimmed, ...parts }
      }
      return { kind: 'app-route', ...parts }
    }
    return { kind: 'ignored', reason: 'unparseable' }
  }
}

export function toRouterLocation(intent: AppRouteIntent | AuthCallbackIntent): string {
  return `${intent.pathname}${intent.search}${intent.hash}`
}
