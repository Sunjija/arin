import { Preferences } from '@capacitor/preferences'
import { db } from '../db/database'

export const STORAGE_PROBE_KEY = 'arin.storage.probe'

export type StorageProbeReport = {
  indexedDbAvailable: boolean
  indexedDbHadMeta: boolean
  preferencesRoundTrip: boolean
  previousProbeAt: string | null
}

async function readProbe(): Promise<string | null> {
  try {
    const { value } = await Preferences.get({ key: STORAGE_PROBE_KEY })
    return value
  } catch {
    return null
  }
}

export async function runStorageProbe(): Promise<StorageProbeReport> {
  const previousProbeAt = await readProbe()
  let indexedDbAvailable = false
  let indexedDbHadMeta = false
  try {
    const meta = await db.meta.get('meta')
    indexedDbAvailable = true
    indexedDbHadMeta = Boolean(meta)
  } catch {
    indexedDbAvailable = false
  }

  const now = new Date().toISOString()
  let preferencesRoundTrip = false
  try {
    await Preferences.set({ key: STORAGE_PROBE_KEY, value: now })
    const { value } = await Preferences.get({ key: STORAGE_PROBE_KEY })
    preferencesRoundTrip = value === now
  } catch {
    preferencesRoundTrip = false
  }

  return {
    indexedDbAvailable,
    indexedDbHadMeta,
    preferencesRoundTrip,
    previousProbeAt,
  }
}
