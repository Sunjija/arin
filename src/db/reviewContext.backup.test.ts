import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { db } from './database'
import { exportAllData, restoreBackup } from './backup'
import { startLesson, computeStudyPlan } from '../lib/learningApi'
import { resetAppDb, seedCore, practiceAttempt } from '../test/idb'
import { questions } from '../data/questions'

beforeEach(async () => { await seedCore() })
afterEach(resetAppDb)

it('round-trips frozen reasons and history in v4 without a destructive schema upgrade', async () => {
  const session = await startLesson({ today: '2026-01-05' })
  const before = await exportAllData()
  expect(before.version).toBe(4)
  expect((await restoreBackup(before)).ok).toBe(true)
  expect((await db.activeSession.get(session.id))?.questionContexts).toEqual(session.questionContexts)
  expect((await db.studyDays.get(session.date))?.plan?.questionContexts).toEqual(before.studyDays[0]?.plan?.questionContexts)
})

it('keeps pre-feature backups and their unfinished sessions unknown instead of inventing first attempts', async () => {
  const session = await startLesson({ today: '2026-01-05' })
  const old = await exportAllData()
  delete old.activeSession!.questionContexts
  for (const day of old.studyDays) if (day.plan) delete day.plan.questionContexts
  expect((await restoreBackup(old)).ok).toBe(true)
  const resumed = await startLesson({ today: '2026-01-06' })
  expect(resumed.id).toBe(session.id)
  expect(resumed.questionContexts).toBeUndefined()
  expect((await computeStudyPlan('2026-01-06')).questionContexts).toBeUndefined()
})

it('rejects corrupt counts, selection dates, reasons and question mapping before changing any records', async () => {
  await startLesson({ today: '2026-01-05' })
  const before = await exportAllData()
  const original = before.activeSession!.questionContexts![0]!
  for (const patch of [
    { priorAttemptCount: -1 }, { priorAttemptCount: 0.5 }, { similarQuestionAttemptCount: -1 },
    { selectedOn: '2026-02-31' }, { reason: 'invented' }, { questionId: 'unassigned-question' },
    { reason: 'review-practice' }, { dueOn: '2026-01-01' }, { lastWrongAt: '2026-01-01' },
  ]) {
    const bad = structuredClone(before)
    bad.activeSession!.questionContexts![0] = { ...original, ...patch } as typeof original
    expect((await restoreBackup(bad)).ok).toBe(false)
    expect((await db.activeSession.get(before.activeSession!.id))?.questionContexts).toEqual(before.activeSession!.questionContexts)
  }
  for (const replacement of [[], [original, original]]) {
    const bad = structuredClone(before)
    bad.studyDays[0]!.plan!.questionContexts = replacement
    expect((await restoreBackup(bad)).ok).toBe(false)
  }
  expect((await exportAllData()).studyDays).toEqual(before.studyDays)
})

it('requires actual due and recent-error dates rather than fabricated scheduled dates', async () => {
  const q = questions.find(item => item.era === 'goryeo')!
  await db.attempts.put({ ...practiceAttempt('recent-error', false, '2026-01-05'), questionId: q.id })
  const session = await startLesson({ today: '2026-01-05', entryMode: 'review' })
  expect(session.questionContexts?.[0]?.reason).toBe('recent-wrong')
  const before = await exportAllData()
  expect((await restoreBackup(before)).ok).toBe(true)
  for (const patch of [{ lastWrongAt: '2025-12-01' }, { lastWrongAt: '2026-01-06' }, { priorAttemptCount: 0 },
    { reason: 'due-review', lastWrongAt: null, dueOn: null }, { reason: 'due-review', lastWrongAt: null, dueOn: '2026-01-06' }]) {
    const bad = structuredClone(before)
    Object.assign(bad.activeSession!.questionContexts![0]!, patch)
    expect((await restoreBackup(bad)).ok).toBe(false)
  }
  expect((await db.activeSession.get(session.id))?.questionContexts).toEqual(session.questionContexts)
})
