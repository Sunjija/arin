import { db } from '../db/database'
import type { ActiveSession } from '../types'

export class StudySessionConflictError extends Error {
  constructor() {
    super('다른 창에서 학습 진행이 바뀌었습니다. 저장된 진행을 다시 불러와 주세요.')
    this.name = 'StudySessionConflictError'
  }
}

/** Call inside the same read/write transaction as the corresponding mutation. */
export async function requireCurrentSession(expected: ActiveSession): Promise<ActiveSession> {
  const current = await db.activeSession.toCollection().first()
  if (!current || current.id !== expected.id || (current.revision ?? 0) !== (expected.revision ?? 0)) {
    throw new StudySessionConflictError()
  }
  if (current.step === 'result') throw new StudySessionConflictError()
  return current
}

/** Legacy rows without revision start at zero; no snapshot/record migration is needed. */
export function revisedSession(session: ActiveSession): ActiveSession {
  return { ...session, revision: (session.revision ?? 0) + 1, updatedAt: new Date().toISOString() }
}
