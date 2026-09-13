import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/database'
import { resetAppDb, seedCore } from '../test/idb'
import { completeSession, computeStudyPlan, recordAnswer, saveGoal, startLesson } from './learningApi'
import { emptyConceptProgress } from './conceptProgress'
import { exportAllData, restoreBackup } from '../db/backup'
import { questions } from '../data/questions'
import { lessonGuides } from '../data/lessonGuides'
import { buildTodayPlan } from './studyService'
import type { ActiveSession } from '../types'
const date = '2026-01-05'
const readyIds = ['t-pre-01','t-pre-02','t-pre-07','t-pre-03','t-pre-04','t-pre-05','t-pre-08','t-pre-06','t-tk-01','t-tk-02','t-tk-03','t-tk-04','t-tk-05','t-tk-06']
const done = (ids: string[]) => db.conceptProgress.bulkPut(ids.map(id => ({ ...emptyConceptProgress(id), learnState: 'completed' as const, firstLearnedAt: date, completedAt: date })))
const answered = (session: ActiveSession): ActiveSession => ({ ...session, conceptDone: true, confirmedConceptIds: session.conceptIds, answered: session.questionIds.map(questionId => ({ questionId, selectedIndex: 0, correct: false, responseMs: null, attemptId: `attempt-${questionId}` })) })
afterEach(async () => { vi.restoreAllMocks(); await resetAppDb() })

describe('scoped daily learning', () => {
  it.each([
    { completed: 8, concepts: ['t-tk-01', 't-tk-02', 't-tk-03'], checks: ['q-105', 'q-106', 'q-107', 'q-108', 'q-109', 'q-110'] },
    { completed: 11, concepts: ['t-tk-04', 't-tk-05', 't-tk-06'], checks: ['q-111', 'q-112', 'q-113', 'q-114', 'q-115', 'q-116'] },
  ])('offers the six new checks after $completed concepts and freezes their source versions', async ({ completed, concepts, checks }) => {
    await seedCore({ paceMode: 'manual', dailyNewConceptCount: 3, dailyQuestionCount: 15 })
    await done(readyIds.slice(0, completed))
    const session = await startLesson({ today: date })
    expect(session.conceptIds).toEqual(concepts)
    expect([...session.newQuestionIds!].sort()).toEqual(checks)
    expect(session.guideSnapshots?.flatMap(guide => guide.sections.map(section => section.conceptId))).toEqual(session.conceptIds)
    const newSnapshots = session.questionSnapshots?.filter(snapshot => session.newQuestionIds!.includes(snapshot.questionId))
    expect(newSnapshots?.map(snapshot => snapshot.questionId).sort()).toEqual(checks)
    for (const snapshot of newSnapshots ?? []) {
      expect(snapshot.contentVersion).toBe(questions.find(question => question.id === snapshot.questionId)?.contentVersion)
    }
    const backup = await exportAllData()
    expect((await restoreBackup(backup)).ok).toBe(true)
    expect(await startLesson({ today: '2026-01-06' })).toEqual(session)
  })
  it('freezes only the requested daily concepts and their eligible questions', async () => {
    await seedCore({ paceMode: 'manual', dailyNewConceptCount: 1 })
    const session = await startLesson({ today: date })
    expect(session.conceptIds).toEqual(['t-pre-01'])
    expect(session.newQuestionIds).toEqual(['q-01'])
    expect(session.guideSnapshots?.flatMap(guide => guide.sections.map(section => section.conceptId))).toEqual(session.conceptIds)
    expect(session.confirmedConceptIds).toEqual([])
  })
  it('requires explicit recall confirmation and marks only the selected concepts', async () => {
    await seedCore({ paceMode: 'manual', dailyNewConceptCount: 1 })
    const first = await startLesson({ today: date })
    await completeSession({ ...answered(first), confirmedConceptIds: [] })
    expect((await db.conceptProgress.get('t-pre-01'))?.learnState).not.toBe('completed')
    const second = await startLesson({ today: '2026-01-06' })
    await completeSession(answered(second))
    expect((await db.conceptProgress.get('t-pre-01'))?.learnState).toBe('completed')
    expect((await db.conceptProgress.get('t-pre-02'))?.learnState).not.toBe('completed')
    expect(await db.lessonCompletions.count()).toBe(0)
    expect((await computeStudyPlan('2026-01-07')).currentConceptIds).toEqual(['t-pre-02'])
  })
  it('allows recall-confirmed reading when no eligible choice question exists, without fake scores', async () => {
    await seedCore({ paceMode: 'manual', dailyNewConceptCount: 1 })
    await done(readyIds.slice(0, 3))
    const session = await startLesson({ today: date })
    expect(session.conceptIds).toEqual(['t-pre-03'])
    expect(session.newQuestionIds).toEqual([]) // q-51 still requires t-pre-04 and t-pre-05.
    expect(session.questionIds).not.toContain('q-51')
    const complete = answered(session)
    await completeSession(complete)
    await completeSession(complete)
    expect((await db.conceptProgress.get('t-pre-03'))?.learnState).toBe('completed')
    expect((await db.studyDays.get(date))?.completed).toBe(true)
    expect((await startLesson({ today: date })).id).toBe(session.id)
    expect((await buildTodayPlan(date)).frozenPlan?.conceptSchedule?.completedConcepts).toBe(4)
    expect(await db.attempts.count()).toBe(0)
    expect(await db.lessonCompletions.count()).toBe(0)
  })
  it('stops before unprepared content after the published batches, leaving the rest of the course uncompleted', async () => {
    await seedCore({ paceMode: 'manual', dailyNewConceptCount: 20 })
    const session = await startLesson({ today: date })
    expect(session.conceptIds).toEqual(readyIds)
    await completeSession(answered(session))
    expect(await db.lessonCompletions.count()).toBe(3)
    const plan = await computeStudyPlan('2026-01-06')
    expect(plan.currentConceptIds).toEqual([])
    expect(plan.conceptSchedule?.nextConceptId).toBe('t-tk-08')
    expect(plan.conceptFinishDate).toBeNull()
    await expect(startLesson({ today: '2026-01-06' })).rejects.toThrow('준비 중')
  })
  it('keeps old scope, guide text and questions after midnight or a new goal', async () => {
    await seedCore({ paceMode: 'manual', dailyNewConceptCount: 1 })
    const session = await startLesson({ today: date })
    await saveGoal({ dailyNewConceptCount: 7, paceMode: 'manual' })
    const old = lessonGuides[0]!.sections[0]!.title
    try {
      lessonGuides[0]!.sections[0]!.title = 'new guide revision'
      const resumed = await startLesson({ today: '2026-01-06' })
      expect(resumed).toEqual(session)
      const plan = await computeStudyPlan('2026-01-06')
      expect(plan.currentConceptIds).toEqual(session.conceptIds)
      expect(plan.newConceptCount).toBe(1)
      expect((await buildTodayPlan('2026-01-06')).frozenPlan?.currentConceptIds).toEqual(session.conceptIds)
    } finally { lessonGuides[0]!.sections[0]!.title = old }
  })
  it('allows the exact question previously tried in the library, without opening the rest of its lesson', async () => {
    await seedCore({ paceMode: 'manual', dailyNewConceptCount: 1 })
    const question = questions.find(item => item.id === 'q-79')!
    await recordAnswer({ question, selectedIndex: question.answerIndex, correct: true, responseMs: null, learningSource: 'library' })
    const plan = await computeStudyPlan(date)
    expect(plan.reviewQuestionIds).toContain('q-79')
    expect(plan.reviewQuestionIds).not.toContain('q-02')
    expect(plan.newQuestionIds).toEqual(['q-01'])
  })
  it('rolls back both day and concept records if partial-concept persistence fails', async () => {
    await seedCore({ paceMode: 'manual', dailyNewConceptCount: 1 })
    const session = await startLesson({ today: date })
    vi.spyOn(db.conceptProgress, 'bulkPut').mockRejectedValueOnce(new Error('disk full'))
    await expect(completeSession(answered(session))).rejects.toThrow('disk full')
    expect((await db.studyDays.get(date))?.completed).toBe(false)
    expect((await db.conceptProgress.get('t-pre-01'))?.learnState).toBe('learning')
    expect((await db.activeSession.get(session.id))?.step).toBe('concept')
  })
  it('preserves new goal and partial guide snapshots in a backup, rejecting mismatched scope', async () => {
    await seedCore({ paceMode: 'manual', dailyNewConceptCount: 1, conceptTargetDate: '2026-02-05' })
    const session = await startLesson({ today: date })
    await db.activeSession.put({ ...session, confirmedConceptIds: ['t-pre-01'] })
    const backup = await exportAllData()
    expect((await restoreBackup(backup)).ok).toBe(true)
    expect((await exportAllData()).activeSession).toEqual(backup.activeSession)
    expect((await exportAllData()).settings.conceptTargetDate).toBe('2026-02-05')
    expect((await restoreBackup({ ...backup, activeSession: { ...backup.activeSession, conceptIds: ['t-pre-02'] } })).ok).toBe(false)
    expect((await exportAllData()).activeSession).toEqual(backup.activeSession)
    expect((await restoreBackup({ ...backup, studyDays: backup.studyDays.map(day => ({ ...day, plan: { ...day.plan, conceptSchedule: { selectedPerDay: 'bad' } } })) })).ok).toBe(false)
  })
})
