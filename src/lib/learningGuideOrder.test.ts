import 'fake-indexeddb/auto'
import { afterEach, expect, it } from 'vitest'
import { lessonGuides } from '../data/lessonGuides'
import { db } from '../db/database'
import { exportAllData, restoreBackup } from '../db/backup'
import { resetAppDb, seedCore } from '../test/idb'
import { emptyConceptProgress } from './conceptProgress'
import { startLesson } from './learningApi'

const originalGuides = structuredClone(lessonGuides)
afterEach(async () => {
  lessonGuides.splice(0, lessonGuides.length, ...structuredClone(originalGuides))
  await resetAppDb()
})

it('preserves course order across interleaved lessons, resume, content edits and backup restore', async () => {
  // Use independent fixtures so this regression does not depend on the published batch size.
  const template = originalGuides[0]!
  const section = template.sections[0]!
  lessonGuides.splice(0, lessonGuides.length, template,
    { ...template, lessonId: 'lesson-02', sections: ['t-tk-01', 't-tk-03'].map(conceptId => ({ ...section, conceptId })) },
    { ...template, lessonId: 'lesson-13', sections: [{ ...section, conceptId: 't-tk-02' }] })
  await seedCore({ paceMode: 'manual', dailyNewConceptCount: 3 })
  await db.conceptProgress.bulkPut(template.sections.map(item => ({
    ...emptyConceptProgress(item.conceptId), learnState: 'completed' as const,
    firstLearnedAt: '2026-01-05', completedAt: '2026-01-05',
  })))
  const session = await startLesson({ today: '2026-01-05' })
  expect(session.conceptIds).toEqual(['t-tk-01', 't-tk-02', 't-tk-03'])
  expect(session.guideSnapshots?.flatMap(guide => guide.sections.map(item => item.conceptId))).toEqual(session.conceptIds)
  expect(session.guideSnapshots?.map(guide => guide.lessonId)).toEqual(['lesson-02', 'lesson-13', 'lesson-02'])
  lessonGuides[1]!.sections.reverse()
  lessonGuides[1]!.sections[0]!.title = 'Changed after session creation'
  expect(await startLesson({ today: '2026-01-06' })).toEqual(session)
  const backup = await exportAllData()
  expect((await restoreBackup(backup)).ok).toBe(true)
  expect((await exportAllData()).activeSession).toEqual(backup.activeSession)
  expect(await startLesson({ today: '2026-01-07' })).toEqual(session)
})
