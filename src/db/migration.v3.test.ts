import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, expect, it, vi } from 'vitest'
import { db } from './database'
import { exportAllData, restoreBackup } from './backup'
import { resetAppDb, seedCore, practiceAttempt } from '../test/idb'
import { startLesson } from '../lib/learningApi'
import { flashcardSeeds } from '../data/cards'

const card = { ...flashcardSeeds[0]!, front: '사용자가 편집한 내용', userEdited: true, fingerprint: 'edited', createdAt: '2026-01-05', updatedAt: '2026-01-05', nextReviewAt: '2026-01-06', intervalDays: 1, easeStreak: 0, lapses: 1 }
afterEach(async () => { vi.restoreAllMocks(); await resetAppDb() })

it('upgrades an actual v2 database without erasing edited cards, attempts or sessions', async () => {
  await seedCore()
  await db.cards.put(card)
  await db.attempts.put(practiceAttempt('legacy-attempt', false, '2026-01-05T00:00:00.000Z'))
  const session = await startLesson({ today: '2026-01-05' })
  const saved = await exportAllData()
  await db.delete()
  const legacy = new Dexie('hanguksa-coach')
  legacy.version(2).stores({
    settings: 'id', mastery: 'id',
    cards: 'id, nextReviewAt, era, kind, fingerprint, fromWrongAnswer, sourceQuestionId',
    wrongAnswers: 'id, questionId, createdAt, cause', attempts: 'id, questionId, createdAt, source, resultId',
    studyDays: 'date', mockResults: 'id, createdAt, mode', activeSession: 'id',
    activeMock: 'id, status', lessonCompletions: 'lessonId', meta: 'id',
  })
  try {
    await legacy.open()
    await legacy.table('settings').put({ id: 'settings', ...saved.settings })
    await legacy.table('mastery').put({ id: 'mastery', ...saved.mastery })
    await legacy.table('meta').put(saved.meta)
    await legacy.table('cards').put(card)
    await legacy.table('attempts').bulkPut(saved.attempts)
    await legacy.table('activeSession').put({ ...session, questionContexts: undefined, questionSnapshots: undefined, newQuestionIds: undefined, reviewQuestionIds: undefined, conceptIds: undefined, confirmedConceptIds: undefined, guideSnapshots: undefined })
  } finally { legacy.close() }
  await db.open()
  expect(db.verno).toBe(4)
  expect(await db.cards.get(card.id)).toEqual(card)
  expect(await db.attempts.get('legacy-attempt')).toEqual(saved.attempts[0])
  expect((await db.activeSession.get(session.id))?.questionIds).toEqual(session.questionIds)
  expect(await db.conceptProgress.count()).toBe(0)
  const v2 = { ...await exportAllData(), version: 2, conceptProgress: undefined, libraryPractice: undefined }
  expect(await restoreBackup(v2)).toEqual({ ok: true, importedVersion: 2 })
  expect(await db.cards.get(card.id)).toEqual(card)
})

it('rolls back a restore that fails after clearing tables', async () => {
  await seedCore()
  await db.cards.put(card)
  const before = await exportAllData()
  vi.spyOn(db.cards, 'bulkPut').mockRejectedValueOnce(new Error('disk full'))
  await expect(restoreBackup({ ...before, cards: [{ ...card, front: 'replacement' }] })).rejects.toThrow('disk full')
  expect(await db.cards.get(card.id)).toEqual(card)
  expect((await exportAllData()).settings).toEqual(before.settings)
})
