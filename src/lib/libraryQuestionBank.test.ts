import 'fake-indexeddb/auto'
import { afterEach, expect, it } from 'vitest'
import { lessonGuides } from '../data/lessonGuides'
import { questions } from '../data/questions'
import { resetAppDb, seedCore } from '../test/idb'
import { exportAllData, restoreBackup } from '../db/backup'
import { preparedLibraryQuestions } from './libraryQuestionBank'
import { startLibraryPractice } from './libraryPractice'

const originalGuides = structuredClone(lessonGuides)
const originalQuestions = structuredClone(questions)
afterEach(async () => {
  lessonGuides.splice(0, lessonGuides.length, ...structuredClone(originalGuides))
  questions.splice(0, questions.length, ...structuredClone(originalQuestions))
  await resetAppDb()
})

it('exposes prepared Kingdoms checks but excludes legacy unmapped questions and missing lessons', () => {
  expect(preparedLibraryQuestions('lesson-02').map(question => question.id)).toEqual(expect.arrayContaining(['q-105', 'q-106', 'q-109', 'q-110']))
  expect(preparedLibraryQuestions('lesson-02').map(question => question.id)).not.toContain('q-04')
  expect(preparedLibraryQuestions('lesson-13').map(question => question.id)).toEqual(expect.arrayContaining(['q-107', 'q-108']))
  expect(preparedLibraryQuestions('lesson-03')).toEqual([])
})

it('requires a source for the question and each taught concept, and excludes draft guides', () => {
  const guide = lessonGuides.find(item => item.lessonId === 'lesson-13')!
  const question = questions.find(item => item.id === 'q-107')!
  question.sourceUrl = ''
  expect(preparedLibraryQuestions('lesson-13').map(item => item.id)).not.toContain('q-107')
  question.sourceUrl = originalQuestions.find(item => item.id === 'q-107')!.sourceUrl
  question.conceptIds = ['t-tk-02', 't-tk-07']
  expect(preparedLibraryQuestions('lesson-13').map(item => item.id)).not.toContain('q-107')
  question.conceptIds = ['t-tk-02']
  guide.sections.find(item => item.conceptId === 't-tk-02')!.sourceUrl = ''
  expect(preparedLibraryQuestions('lesson-13').map(item => item.id)).not.toContain('q-107')
  guide.reviewStatus = 'draft'
  expect(preparedLibraryQuestions('lesson-13')).toEqual([])
})

it('keeps saved practice and backup snapshots after a guide is withdrawn, while refusing new practice', async () => {
  await seedCore()
  const started = await startLibraryPractice('lesson-13')
  lessonGuides.find(item => item.lessonId === 'lesson-13')!.reviewStatus = 'draft'
  questions.find(item => item.id === 'q-107')!.choices.reverse()
  expect(preparedLibraryQuestions('lesson-13')).toEqual([])
  expect(await startLibraryPractice('lesson-13')).toEqual(started)
  const backup = await exportAllData()
  expect((await restoreBackup(backup)).ok).toBe(true)
  expect(await startLibraryPractice('lesson-13')).toEqual(started)
  await expect(startLibraryPractice('lesson-03')).rejects.toThrow('준비 중')
})
