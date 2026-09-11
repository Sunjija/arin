import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { exportAllData, restoreBackup } from './backup'
import { defaultMastery, defaultSettings } from '../data/defaults'
import { db } from './database'
import { practiceAttempt, resetAppDb, seedCore } from '../test/idb'

afterEach(async () => {
  await resetAppDb()
})

describe('backup restore', () => {
  it('round-trips a valid export and keeps version 1 backups compatible', async () => {
    await resetAppDb()
    await seedCore()
    await db.attempts.put(practiceAttempt('keep-1', true, '2026-09-01T00:00:00.000Z'))

    const exported = await exportAllData()
    expect(exported.version).toBe(4)
    const restored = await restoreBackup(exported)
    expect(restored).toEqual({ ok: true, importedVersion: 4 })
    expect(await db.attempts.count()).toBe(1)

    const version1 = {
      ...exported,
      version: 1 as const,
      lessonCompletions: undefined,
      activeMock: undefined,
      libraryPractice: undefined,
    }
    const again = await restoreBackup(version1)
    expect(again).toEqual({ ok: true, importedVersion: 1 })
    expect((await db.settings.get('settings'))?.goalScore).toBe(defaultSettings().goalScore)
    expect((await db.mastery.get('mastery'))?.eras.goryeo).toBe(defaultMastery().eras.goryeo)
    expect(await db.attempts.count()).toBe(1)
  })

  it('rejects a hollow backup and leaves existing records in place', async () => {
    await resetAppDb()
    await seedCore()
    await db.attempts.put(practiceAttempt('keep-1', true, '2026-09-01T00:00:00.000Z'))
    const exported = await exportAllData()

    const result = await restoreBackup({
      ...exported,
      settings: {},
      mastery: {},
      attempts: [],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message.length).toBeGreaterThan(0)
    }
    expect(await db.attempts.count()).toBe(1)
    expect((await db.attempts.get('keep-1'))?.correct).toBe(true)
    expect((await db.settings.get('settings'))?.dailyQuestionCount).toBe(15)
  })
})
