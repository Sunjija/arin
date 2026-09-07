import Dexie, { type EntityTable } from 'dexie'
import type {
  ActiveSession,
  AppMeta,
  AttemptRecord,
  FlashcardRecord,
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
  }
}

export const db = new HanguksaDB()
