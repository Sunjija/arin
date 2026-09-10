import { describe, expect, it } from 'vitest'
import { parseDeepLink, toRouterLocation } from './deepLinks'

describe('parseDeepLink', () => {
  it('maps arin://app paths onto the web router', () => {
    expect(parseDeepLink('arin://app/mock?mode=sample')).toEqual({
      kind: 'app-route',
      pathname: '/mock',
      search: '?mode=sample',
      hash: '',
    })
    expect(parseDeepLink('arin://app/settings')).toEqual({
      kind: 'app-route',
      pathname: '/settings',
      search: '',
      hash: '',
    })
    expect(toRouterLocation({
      kind: 'app-route',
      pathname: '/cards',
      search: '',
      hash: '',
    })).toBe('/cards')
  })

  it('treats arin://auth/callback as a login return', () => {
    const intent = parseDeepLink('arin://auth/callback?code=abc&state=1')
    expect(intent.kind).toBe('auth-callback')
    if (intent.kind !== 'auth-callback') return
    expect(intent.search).toBe('?code=abc&state=1')
    expect(toRouterLocation(intent)).toBe('/auth/callback?code=abc&state=1')
  })

  it('accepts https auth callbacks for future app links', () => {
    const intent = parseDeepLink('https://arin.app/auth/callback?code=from-https')
    expect(intent).toMatchObject({ kind: 'auth-callback', pathname: '/auth/callback' })
  })

  it('ignores empty and unknown schemes', () => {
    expect(parseDeepLink('')).toEqual({ kind: 'ignored', reason: 'empty' })
    expect(parseDeepLink('mailto:a@b.c').kind).toBe('ignored')
  })
})
