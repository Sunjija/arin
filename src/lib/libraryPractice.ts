import { db } from '../db/database'
import { questions } from '../data/questions'
import { lessons } from '../data/lessons'
import { DataError } from './dataErrors'
import { recordAnswer, snapshotFromQuestion } from './learningApi'
import { questionFromSnapshot } from './examScoring'
import { isLibraryPracticeSession } from './libraryPracticeValidation'
import type { LibraryPracticeSession } from '../types'

export interface LibraryPracticeKey { lessonId: string; sessionId: string }
export interface LibraryPracticeItemKey extends LibraryPracticeKey { questionId: string; revision: number }

export async function getLibraryPractice(lessonId: string): Promise<LibraryPracticeSession | undefined> {
  const row = await db.libraryPractice.get(lessonId)
  if (row && !isLibraryPracticeSession(row)) throw new DataError('validation-failed', '자료실 진행 기록을 읽을 수 없습니다. 기록을 백업하고 복구해 주세요.')
  return row
}

async function createPractice(lessonId: string): Promise<LibraryPracticeSession> {
  if (!lessons.some(lesson => lesson.id === lessonId)) throw new DataError('not-found', '단원을 찾을 수 없습니다.')
  const bank = questions.filter(question => question.lessonId === lessonId)
  if (!bank.length) throw new DataError('not-found', '이 단원의 확인 문제를 준비 중입니다.')
  const now = new Date().toISOString()
  const session: LibraryPracticeSession = {
    id: `library-${crypto.randomUUID()}`, lessonId, revision: 0, step: 'question', questionIndex: 0,
    selectedIndex: null, questionSnapshots: bank.map(snapshotFromQuestion), answers: [], startedAt: now, updatedAt: now,
  }
  await db.libraryPractice.put(session)
  return session
}

export async function startLibraryPractice(lessonId: string): Promise<LibraryPracticeSession> {
  return db.transaction('rw', db.libraryPractice, async () => await getLibraryPractice(lessonId) ?? createPractice(lessonId))
}

async function requirePractice(key: LibraryPracticeKey): Promise<LibraryPracticeSession> {
  const row = await getLibraryPractice(key.lessonId)
  if (!row || row.id !== key.sessionId) throw new DataError('validation-failed', '다른 창에서 새 학습이 시작되었습니다. 저장된 진행을 다시 불러와 주세요.')
  return row
}

function requireCurrent(row: LibraryPracticeSession, key: LibraryPracticeItemKey) {
  if (row.revision !== key.revision || row.questionSnapshots[row.questionIndex]?.questionId !== key.questionId) throw new DataError('validation-failed', '다른 창에서 진행이 바뀌었습니다. 저장된 진행을 다시 불러와 주세요.')
}

async function writePractice(row: LibraryPracticeSession): Promise<LibraryPracticeSession> {
  const next = { ...row, revision: row.revision + 1, updatedAt: new Date().toISOString() }
  await db.libraryPractice.put(next)
  return next
}

export async function selectLibraryChoice(input: LibraryPracticeItemKey & { selectedIndex: number }): Promise<LibraryPracticeSession> {
  return db.transaction('rw', db.libraryPractice, async () => {
    const row = await requirePractice(input)
    requireCurrent(row, input)
    const snapshot = row.questionSnapshots[row.questionIndex]!
    if (row.step !== 'question' || !Number.isInteger(input.selectedIndex) || input.selectedIndex < 0 || input.selectedIndex >= snapshot.choices.length) throw new DataError('validation-failed', '선택할 수 없는 답입니다.')
    return writePractice({ ...row, selectedIndex: input.selectedIndex })
  })
}

export async function submitLibraryAnswer(input: LibraryPracticeItemKey): Promise<LibraryPracticeSession> {
  return db.transaction('rw', [db.libraryPractice, db.attempts, db.wrongAnswers, db.mastery, db.conceptProgress], async () => {
    const row = await requirePractice(input)
    // Concurrent/retried submission returns the persisted answer, never grades twice.
    if (row.answers.some(answer => answer.questionId === input.questionId)) return row
    requireCurrent(row, input)
    if (row.step !== 'question' || row.selectedIndex === null) throw new DataError('validation-failed', '답을 선택해 주세요.')
    const snapshot = row.questionSnapshots[row.questionIndex]!
    const attempt = await recordAnswer({ question: questionFromSnapshot(snapshot), snapshot, selectedIndex: row.selectedIndex, correct: row.selectedIndex === snapshot.answerIndex, responseMs: null, learningSource: 'library', attemptId: `att-${row.id}-${snapshot.questionId}` })
    return writePractice({ ...row, step: 'feedback', selectedIndex: attempt.selectedIndex, answers: [...row.answers, { questionId: attempt.questionId, selectedIndex: attempt.selectedIndex, correct: attempt.correct, responseMs: null, attemptId: attempt.id }] })
  })
}

export async function advanceLibraryPractice(input: LibraryPracticeItemKey): Promise<LibraryPracticeSession> {
  return db.transaction('rw', db.libraryPractice, async () => {
    const row = await requirePractice(input)
    const answeredIndex = row.answers.findIndex(answer => answer.questionId === input.questionId)
    if (answeredIndex >= 0 && row.questionIndex > answeredIndex) return row
    requireCurrent(row, input)
    if (row.step !== 'feedback') throw new DataError('validation-failed', '답을 확인한 뒤 다음 문제로 이동해 주세요.')
    const index = row.questionIndex + 1
    return writePractice({ ...row, questionIndex: index, selectedIndex: null, step: index === row.questionSnapshots.length ? 'result' : 'question' })
  })
}

export async function restartLibraryPractice(input: LibraryPracticeKey): Promise<LibraryPracticeSession> {
  return db.transaction('rw', db.libraryPractice, async () => {
    const row = await requirePractice(input)
    if (row.step !== 'result') throw new DataError('validation-failed', '진행 중인 확인 문제를 먼저 마쳐 주세요.')
    return createPractice(input.lessonId)
  })
}
