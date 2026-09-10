/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest'
import { Preferences } from '@capacitor/preferences'
import identity from '../../mobile/identity.json'
import capacitorConfig from '../../capacitor.config.json'
import { ACTIVE_APP_ID, DEVELOPMENT_APP_ID, authCallbackUri } from './identity'
import { getRuntimeMode, isDemoMode, runtimeBannerLabel } from './env'
import { getAccountSyncPort } from './accountSync'
import { ACCOUNT_SESSION_KEY } from './accountSync/sessionStore'
import { getNativeBillingPort } from './billing/port'
import { isExternalHref } from './links'

describe('identity and env', () => {
  it('keeps the active install id on the development identifier', () => {
    expect(identity.development.appId).toBe('app.arin.dev')
    expect(ACTIVE_APP_ID).toBe(DEVELOPMENT_APP_ID)
    expect(identity.production.status).toBe('placeholder-unregistered')
    expect(capacitorConfig.appId).toBe(identity.development.appId)
    expect(capacitorConfig.appName).toBe(identity.development.appName)
    expect(authCallbackUri()).toBe('arin://auth/callback')
  })

  it('defaults Vite runtime to demo when VITE_RUNTIME_MODE is unset or demo', () => {
    expect(getRuntimeMode()).toBe('demo')
    expect(isDemoMode()).toBe(true)
    expect(runtimeBannerLabel()).toContain('데모')
  })
})

describe('account sync test adapter', () => {
  afterEach(async () => {
    await Preferences.remove({ key: ACCOUNT_SESSION_KEY })
  })

  it('stores a local session from an auth callback and can sign out', async () => {
    const port = getAccountSyncPort()
    expect(port.id).toBe('test')
    const started = await port.startExternalLogin({ redirectUri: 'arin://auth/callback' })
    expect(started.ok).toBe(true)
    const session = await port.getSession()
    expect(session?.provider).toBe('test')
    expect(session?.accessToken).toContain('test-token:')
    await port.signOut()
    expect(await port.getSession()).toBeNull()
  })
})

describe('billing port', () => {
  it('stays unwired until the payments owner connects a native SDK', async () => {
    const port = getNativeBillingPort()
    await expect(port.connect()).resolves.toEqual({ ok: false, code: 'not-wired' })
    await expect(port.purchase('sku.demo')).resolves.toMatchObject({ ok: false, code: 'not-wired' })
  })
})

describe('external links', () => {
  it('keeps in-app routes inside the webview', () => {
    expect(isExternalHref('/settings', 'https://localhost')).toBe(false)
    expect(isExternalHref('https://example.com/notice', 'https://localhost')).toBe(true)
    expect(isExternalHref('arin://app/mock', 'https://localhost')).toBe(false)
  })
})
