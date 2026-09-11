import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from './database'
import { exportAllData, restoreBackup } from './backup'
import { clearAllLearningData, ensureSeeded, restoreSampleData } from './seed'
import { resetAppDb, seedCore } from '../test/idb'
import { startLesson } from '../lib/learningApi'
import { selectLibraryChoice, startLibraryPractice, submitLibraryAnswer } from '../lib/libraryPractice'
import { emptyConceptProgress } from '../lib/conceptProgress'
import { validateExportPayload } from '../lib/backupValidate'
import type { LibraryPracticeSession } from '../types'

const key = (row: LibraryPracticeSession) => ({ lessonId: row.lessonId, sessionId: row.id, questionId: row.questionSnapshots[row.questionIndex]!.questionId, revision: row.revision })
const answerFirst = async () => {
  const started = await startLibraryPractice('lesson-01')
  const selected = await selectLibraryChoice({ ...key(started), selectedIndex: started.questionSnapshots[0]!.answerIndex })
  return submitLibraryAnswer(key(selected))
}
beforeEach(async () => { await seedCore() })
afterEach(async () => { vi.restoreAllMocks(); await resetAppDb() })

describe('library practice backup v4', () => {
  it('round-trips feedback and unsubmitted selection in separate lessons alongside the daily session', async () => {
    const daily = await startLesson({ today: '2026-01-05' })
    const feedback = await answerFirst()
    const other = await startLibraryPractice('lesson-02')
    const selection = await selectLibraryChoice({ ...key(other), selectedIndex: 2 })
    const exported = await exportAllData()
    expect(exported.version).toBe(4)
    expect(await restoreBackup(JSON.parse(JSON.stringify(exported)))).toEqual({ ok: true, importedVersion: 4 })
    expect(await db.libraryPractice.get('lesson-01')).toEqual(feedback)
    expect(await db.libraryPractice.get('lesson-02')).toEqual(selection)
    expect(await db.activeSession.get(daily.id)).toEqual(daily)
    expect(await db.attempts.count()).toBe(1)
  })
  it('rejects missing sessions, mismatched feedback and missing attempt evidence without clearing data', async () => {
    const session = await answerFirst()
    const before = await exportAllData()
    const invalid = [
      { ...before, libraryPractice: undefined },
      { ...before, libraryPractice: [session, session] },
      { ...before, libraryPractice: [{ ...session, questionIndex: 4 }] },
      { ...before, libraryPractice: [{ ...session, selectedIndex: null }] },
      { ...before, libraryPractice: [{ ...session, revision: -1 }] },
      { ...before, attempts: [] },
      { ...before, attempts: before.attempts.map(attempt => ({ ...attempt, selectedIndex: 99 })) },
    ]
    for (const payload of invalid) {
      expect((await restoreBackup(payload)).ok).toBe(false)
      expect(await db.libraryPractice.get(session.lessonId)).toEqual(session)
      expect(await db.attempts.count()).toBe(1)
    }
  })
  it('restores genuine v3 backups without inventing resumable runs from old attempts', async () => {
    await answerFirst()
    const before = await exportAllData()
    const old = { ...before, version: 3, libraryPractice: undefined }
    expect(await restoreBackup(old)).toEqual({ ok: true, importedVersion: 3 })
    expect(await db.libraryPractice.count()).toBe(0)
    expect(await db.attempts.count()).toBe(1)
    expect((await startLibraryPractice('lesson-01')).answers).toEqual([])
  })
  it('rolls back the full restore when writing the new table fails', async () => {
    const session = await answerFirst()
    const before = await exportAllData()
    vi.spyOn(db.libraryPractice, 'bulkPut').mockRejectedValueOnce(new Error('disk full'))
    await expect(restoreBackup({ ...before, settings: { ...before.settings, goalScore: 99 } })).rejects.toThrow('disk full')
    expect(await db.libraryPractice.get(session.lessonId)).toEqual(session)
    expect((await db.settings.get('settings'))?.goalScore).toBe(before.settings.goalScore)
    expect(await db.attempts.count()).toBe(1)
  })
  it('exports a consistent checkpoint while a submission is writing', async () => {
    const started = await startLibraryPractice('lesson-01')
    const selected = await selectLibraryChoice({ ...key(started), selectedIndex: 0 })
    const [backup] = await Promise.all([exportAllData(), submitLibraryAnswer(key(selected))])
    expect(validateExportPayload(backup).ok).toBe(true)
    expect(validateExportPayload(await exportAllData()).ok).toBe(true)
  })
  it('preserves a run during seeding and clears it only with explicit reset operations', async () => {
    const session = await answerFirst()
    await ensureSeeded()
    expect(await db.libraryPractice.get(session.lessonId)).toEqual(session)
    await clearAllLearningData()
    expect(await db.libraryPractice.count()).toBe(0)
    await answerFirst()
    await restoreSampleData()
    expect(await db.libraryPractice.count()).toBe(0)
    expect(await db.attempts.count()).toBe(0)
  })
})

it('upgrades a real v3 schema without erasing existing records or guessing library progress', async () => {
  const daily = await startLesson({ today: '2026-01-05' })
  const progress = { ...emptyConceptProgress('t-pre-01'), learnState: 'completed' as const, completedAt: '2026-01-05', firstLearnedAt: '2026-01-05' }
  await db.conceptProgress.put(progress)
  const saved = await exportAllData()
  await db.delete()
  const legacy = new Dexie('hanguksa-coach')
  legacy.version(3).stores({
    settings: 'id', mastery: 'id', cards: 'id, nextReviewAt, era, kind, fingerprint, fromWrongAnswer, sourceQuestionId',
    wrongAnswers: 'id, questionId, createdAt, cause', attempts: 'id, questionId, createdAt, source, resultId',
    studyDays: 'date', mockResults: 'id, createdAt, mode', activeSession: 'id', activeMock: 'id, status',
    lessonCompletions: 'lessonId', conceptProgress: 'conceptId, learnState, completedAt', meta: 'id',
  })
  try {
    await legacy.open()
    await legacy.table('settings').put({ id: 'settings', ...saved.settings })
    await legacy.table('mastery').put({ id: 'mastery', ...saved.mastery })
    await legacy.table('meta').put(saved.meta)
    await legacy.table('conceptProgress').put(progress)
    await legacy.table('activeSession').put(daily)
    await legacy.table('studyDays').bulkPut(saved.studyDays)
  } finally { legacy.close() }
  await db.open()
  expect(db.verno).toBe(4)
  expect(await db.conceptProgress.get(progress.conceptId)).toEqual(progress)
  expect(await db.activeSession.get(daily.id)).toEqual(daily)
  expect(await db.studyDays.toArray()).toEqual(saved.studyDays)
  expect(await db.libraryPractice.count()).toBe(0)
})
