import Dexie, { type EntityTable } from 'dexie'
import type {
  ActiveMock,
  ActiveSession,
  AppMeta,
  AttemptRecord,
  ConceptProgressRecord,
  FlashcardRecord,
  LessonCompletion,
  MasteryScores,
  MockExamResult,
  StudyDayRecord,
  UserSettings,
  WrongAnswerRecord,
} from '../types'

export class HanguksaDB extends Dexie {
  settings!: EntityTable<UserSettings & { id: 'settings' }, 'id'>
  mastery!: EntityTable<MasteryScores & { id: 'mastery' }, 'id'>
  cards!: EntityTable<FlashcardRecord, 'id'>
  wrongAnswers!: EntityTable<WrongAnswerRecord, 'id'>
  attempts!: EntityTable<AttemptRecord, 'id'>
  studyDays!: EntityTable<StudyDayRecord, 'date'>
  mockResults!: EntityTable<MockExamResult, 'id'>
  activeSession!: EntityTable<ActiveSession, 'id'>
  activeMock!: EntityTable<ActiveMock, 'id'>
  lessonCompletions!: EntityTable<LessonCompletion, 'lessonId'>
  conceptProgress!: EntityTable<ConceptProgressRecord, 'conceptId'>
  meta!: EntityTable<AppMeta, 'id'>

  constructor() {
    super('hanguksa-coach')
    this.version(1).stores({
      settings: 'id',
      mastery: 'id',
      cards: 'id, nextReviewAt, era, kind, fingerprint, fromWrongAnswer',
      wrongAnswers: 'id, questionId, createdAt, cause',
      attempts: 'id, questionId, createdAt, source',
      studyDays: 'date',
      mockResults: 'id, createdAt',
      activeSession: 'id',
      meta: 'id',
    })
    this.version(2)
      .stores({
        settings: 'id',
        mastery: 'id',
        cards: 'id, nextReviewAt, era, kind, fingerprint, fromWrongAnswer, sourceQuestionId',
        wrongAnswers: 'id, questionId, createdAt, cause',
        attempts: 'id, questionId, createdAt, source, resultId',
        studyDays: 'date',
        mockResults: 'id, createdAt, mode',
        activeSession: 'id',
        activeMock: 'id, status',
        lessonCompletions: 'lessonId',
        meta: 'id',
      })
      .upgrade(async (tx) => {
        const days = await tx.table('studyDays').toArray()
        const completions = new Map<string, LessonCompletion>()
        for (const day of days as StudyDayRecord[]) {
          if (!day.completed || !day.lessonId) continue
          const existing = completions.get(day.lessonId)
          if (existing) {
            existing.lastCompletedAt = day.date
            existing.completionCount += 1
          } else {
            completions.set(day.lessonId, {
              lessonId: day.lessonId,
              firstCompletedAt: day.date,
              lastCompletedAt: day.date,
              completionCount: 1,
            })
          }
        }
        if (completions.size > 0) {
          await tx.table('lessonCompletions').bulkPut([...completions.values()])
        }
      })
    this.version(3).stores({
      settings: 'id',
      mastery: 'id',
      cards: 'id, nextReviewAt, era, kind, fingerprint, fromWrongAnswer, sourceQuestionId',
      wrongAnswers: 'id, questionId, createdAt, cause',
      attempts: 'id, questionId, createdAt, source, resultId',
      studyDays: 'date',
      mockResults: 'id, createdAt, mode',
      activeSession: 'id',
      activeMock: 'id, status',
      lessonCompletions: 'lessonId',
      conceptProgress: 'conceptId, learnState, completedAt',
      meta: 'id',
    })
  }
}

export const db = new HanguksaDB()
