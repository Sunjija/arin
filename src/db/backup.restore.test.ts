import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { exportAllData, restoreBackup } from './backup'
import { defaultMastery, defaultSettings } from '../data/defaults'
import { questions } from '../data/questions'
import { db } from './database'
import { seedCards } from './seed'
import { buildMockSnapshots } from '../lib/examScoring'
import { startMock } from '../lib/mockSession'
import { startOrResumeSession } from '../lib/studyService'
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
    expect(exported.version).toBe(2)
    const restored = await restoreBackup(exported)
    expect(restored).toEqual({ ok: true, importedVersion: 2 })
    expect(await db.attempts.count()).toBe(1)

    const version1 = {
      ...exported,
      version: 1 as const,
      lessonCompletions: undefined,
      activeMock: undefined,
    }
    const again = await restoreBackup(version1)
    expect(again).toEqual({ ok: true, importedVersion: 1 })
    expect((await db.settings.get('settings'))?.goalScore).toBe(defaultSettings().goalScore)
    expect((await db.mastery.get('mastery'))?.eras.goryeo).toBe(defaultMastery().eras.goryeo)
    expect(await db.attempts.count()).toBe(1)
  })

  it('round-trips active study and mock sessions created by the app', async () => {
    await resetAppDb()
    await seedCore()
    await db.cards.bulkPut(seedCards('2026-01-05'))
    const study = await startOrResumeSession('2026-01-05')
    const mock = await startMock({
      mode: 'sample',
      snapshots: buildMockSnapshots(questions, 10),
      durationMs: 16 * 60 * 1000,
    })
    expect(mock.ok).toBe(true)

    const exported = await exportAllData()
    expect(await restoreBackup(exported)).toEqual({ ok: true, importedVersion: 2 })
    expect((await db.activeSession.toCollection().first())?.id).toBe(study.id)
    expect((await db.activeMock.toCollection().first())?.questionSnapshots).toHaveLength(10)
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

  it('rebuilds lesson completions when restoring a version 1 backup', async () => {
    await resetAppDb()
    await seedCore()
    await db.studyDays.put({
      date: '2026-09-01',
      completed: true,
      cardsReviewed: 4,
      conceptDone: true,
      questionsAnswered: 10,
      correctCount: 8,
      lessonId: 'lesson-01',
      minutesSpent: 25,
    })
    const exported = await exportAllData()
    const version1 = {
      ...exported,
      version: 1 as const,
      lessonCompletions: undefined,
      activeMock: undefined,
    }

    await db.lessonCompletions.clear()
    expect(await restoreBackup(version1)).toEqual({ ok: true, importedVersion: 1 })
    expect(await db.lessonCompletions.get('lesson-01')).toEqual({
      lessonId: 'lesson-01',
      firstCompletedAt: '2026-09-01',
      lastCompletedAt: '2026-09-01',
      completionCount: 1,
    })
  })

  it('rejects a broken active session before replacing existing data', async () => {
    await resetAppDb()
    await seedCore()
    await db.attempts.put(practiceAttempt('keep-1', true, '2026-09-01T00:00:00.000Z'))
    const exported = await exportAllData()

    const result = await restoreBackup({
      ...exported,
      attempts: [],
      activeSession: {
        id: 'broken-session',
        date: '2026-09-01',
        step: 'cards',
        lessonId: 'lesson-01',
      },
    })

    expect(result.ok).toBe(false)
    expect(await db.attempts.count()).toBe(1)
    expect((await db.attempts.get('keep-1'))?.correct).toBe(true)
  })
})
