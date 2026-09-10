import { Preferences } from '@capacitor/preferences'
import type { AccountSession, AccountSessionStore } from './types'

export const ACCOUNT_SESSION_KEY = 'arin.account.session'

function parseSession(raw: string | null): AccountSession | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as AccountSession
    if (!value || typeof value.localId !== 'string') return null
    return value
  } catch {
    return null
  }
}

export const accountSessionStore: AccountSessionStore = {
  async getSession() {
    const { value } = await Preferences.get({ key: ACCOUNT_SESSION_KEY })
    return parseSession(value)
  },
  async setSession(session) {
    await Preferences.set({ key: ACCOUNT_SESSION_KEY, value: JSON.stringify(session) })
  },
  async clearSession() {
    await Preferences.remove({ key: ACCOUNT_SESSION_KEY })
  },
}
