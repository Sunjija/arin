import { inspectFullMockPool } from './mockEligibility'
import { db } from '../db/database'
import { snapshotFromQuestion } from './wrongCardContent'
import { questions } from '../data/questions'
import { scoreFromAnswers, questionFromSnapshot } from './examScoring'
import { recordAnswer } from './learningApi'
import { isQuestionSnapshot } from './questionSnapshot'
import type { ActiveMock, MockExamResult, QuestionSnapshot } from '../types'
import type {
  FinalizeMockResult,
  SaveMockProgressInput,
  SaveMockProgressResult,
  StartMockInput,
  StartMockResult,
} from '../types/contracts'

export {
  FULL_DURATION_MS,
  FULL_UNIQUE_REQUIRED,
  SAMPLE_DURATION_MS,
  inspectFullMockPool,
} from './mockEligibility'

export async function getActiveMock(): Promise<ActiveMock | undefined> {
  const rows = await db.activeMock.toArray()
  return rows.find((row) => row.status === 'in-progress') ?? rows[0]
}

export async function startMock(input: StartMockInput): Promise<StartMockResult> {
  if (!input.snapshots.length || !input.snapshots.every(isQuestionSnapshot) || !Number.isFinite(input.durationMs) || input.durationMs <= 0) {
    throw new Error('시험 문항 또는 제한 시간이 올바르지 않습니다.')
  }
  if (input.mode === 'full') {
    const inspect = inspectFullMockPool(input.snapshots)
    if (!inspect.ok) {
      return { ok: false, code: 'insufficient-pool', uniqueCount: inspect.uniqueCount }
    }
  }

  return db.transaction('rw', [db.activeMock, db.attempts], async () => {
    const existing = await getActiveMock()
    if (existing && existing.status === 'in-progress' && !input.replaceExisting) {
      return { ok: false, code: 'conflict', activeMock: existing }
    }

    const now = new Date().toISOString()
    const mock: ActiveMock = {
      id: `mock-${crypto.randomUUID()}`,
      revision: 1,
      mode: input.mode,
      status: 'in-progress',
      questionSnapshots: structuredClone(input.snapshots),
      answers: input.snapshots.map(() => null),
      itemElapsedMs: input.snapshots.map(() => null),
      currentIndex: 0,
      startedAt: now,
      deadlineAt: new Date(Date.parse(now) + input.durationMs).toISOString(),
      updatedAt: now,
    }

    const attempts = await db.attempts.toArray()
    for (const snapshot of mock.questionSnapshots) {
      snapshot.priorAttemptCount = attempts.filter(attempt => attempt.questionId === snapshot.questionId).length
    }
    await db.activeMock.clear()
    await db.activeMock.put(mock)
    return { ok: true, mock }
  })
}

export async function getMockResult(id: string): Promise<MockExamResult | undefined> {
  return db.mockResults.get(id)
}

export async function saveMockProgress(input: SaveMockProgressInput): Promise<SaveMockProgressResult> {
  return db.transaction('rw', db.activeMock, async () => {
    const current = await db.activeMock.get(input.id)
    if (!current) return { ok: false, code: 'not-found' }
    if (current.status === 'submitted') return { ok: false, code: 'already-finalized', mock: current }
    if (input.revision !== current.revision) return { ok: false, code: 'stale-revision', mock: current }
    if (Date.now() >= Date.parse(current.deadlineAt)) return { ok: false, code: 'deadline-expired', mock: current }
    validateAnswers(current, input.answers, input.itemElapsedMs)
    if (!Number.isInteger(input.currentIndex) || input.currentIndex < 0 || input.currentIndex >= current.questionSnapshots.length) throw new Error('문항 위치가 올바르지 않습니다.')

    const next: ActiveMock = {
      ...current,
      revision: current.revision + 1,
      answers: input.answers,
      currentIndex: input.currentIndex,
      itemElapsedMs: input.itemElapsedMs,
      updatedAt: new Date().toISOString(),
    }
    await db.activeMock.put(next)
    return { ok: true, mock: next }
  })
}

function validateAnswers(mock: ActiveMock, answers: Array<number | null>, elapsed: Array<number | null>) {
  if (answers.length !== mock.questionSnapshots.length || elapsed.length !== answers.length ||
    answers.some((answer, i) => answer !== null && (!Number.isInteger(answer) || answer < 0 || answer >= mock.questionSnapshots[i]!.choices.length)) ||
    elapsed.some(value => value !== null && (!Number.isFinite(value) || value < 0))) {
    throw new Error('답안 또는 풀이 시간이 올바르지 않습니다.')
  }
}

export async function finalizeMock(input: {
  id: string
  revision?: number
  answers?: Array<number | null>
  itemElapsedMs?: Array<number | null>
}): Promise<FinalizeMockResult> {
  return db.transaction('rw', [db.activeMock, db.mockResults, db.attempts, db.wrongAnswers, db.mastery, db.conceptProgress], async () => {
    const completed = await db.mockResults.get(input.id)
    if (completed) return { result: completed, created: false }
    const current = await db.activeMock.get(input.id)
    if (!current) throw new Error('진행 중인 시험을 찾을 수 없습니다.')
    if (current.status === 'submitted' && current.submittedResultId) {
      const existing = await db.mockResults.get(current.submittedResultId)
      if (existing) return { result: existing, created: false }
    }
    if (input.revision != null && input.revision !== current.revision) {
      throw new Error('더 최신 답안이 이미 저장되어 있습니다.')
    }

    const expired = Date.now() >= Date.parse(current.deadlineAt)
    const answers = expired ? current.answers : input.answers ?? current.answers
    const itemElapsedMs = expired ? current.itemElapsedMs : input.itemElapsedMs ?? current.itemElapsedMs
    if (!expired && input.answers && input.revision === undefined) throw new Error('답안 버전을 확인한 뒤 제출해 주세요.')
    validateAnswers(current, answers, itemElapsedMs)
    const result = gradeActiveMock({ ...current, answers, itemElapsedMs }, Date.now())

    await db.mockResults.put(result)
    for (const [index, snapshot] of current.questionSnapshots.entries()) {
      const selectedIndex = answers[index]
      if (selectedIndex == null) continue
      await recordAnswer({
        question: questionFromSnapshot(snapshot), snapshot, selectedIndex,
        correct: selectedIndex === snapshot.answerIndex, responseMs: itemElapsedMs[index] ?? null,
        learningSource: 'mock', resultId: result.id, attemptId: `att-${result.id}-${index}-${snapshot.questionId}`,
      })
    }
    await db.activeMock.put({
      ...current,
      answers,
      itemElapsedMs,
      status: 'submitted',
      submittedResultId: result.id,
      updatedAt: new Date().toISOString(),
      revision: current.revision + 1,
    })
    return { result, created: true }
  })
}

export function gradeActiveMock(mock: ActiveMock, nowMs = Date.now()): MockExamResult {
  const graded = mock.questionSnapshots.map((snapshot, index) => {
    const selectedIndex = mock.answers[index] ?? null
    return {
      questionId: snapshot.questionId,
      selectedIndex,
      correct: selectedIndex != null && selectedIndex === snapshot.answerIndex,
      difficulty: snapshot.difficulty,
    }
  })
  const byEra: MockExamResult['byEra'] = {}
  const byType: MockExamResult['byType'] = {}
  for (const [index, snapshot] of mock.questionSnapshots.entries()) {
    const correct = graded[index]?.correct ?? false
    byEra[snapshot.era] = byEra[snapshot.era] ?? { correct: 0, total: 0 }
    byEra[snapshot.era]!.total += 1
    if (correct) byEra[snapshot.era]!.correct += 1
    for (const tag of snapshot.tags) {
      byType[tag] = byType[tag] ?? { correct: 0, total: 0 }
      byType[tag]!.total += 1
      if (correct) byType[tag]!.correct += 1
    }
  }

  const started = Date.parse(mock.startedAt)
  const deadline = Date.parse(mock.deadlineAt)
  const ended = Number.isFinite(deadline) ? Math.min(nowMs, deadline) : nowMs
  const durationSec = Number.isFinite(started) ? Math.max(0, Math.round((ended - started) / 1000)) : 0

  return {
    id: mock.id,
    createdAt: new Date(nowMs).toISOString(),
    mode: mock.mode,
    total: mock.questionSnapshots.length,
    correct: graded.filter((item) => item.correct).length,
    score: scoreFromAnswers(graded),
    durationSec,
    questionSnapshots: structuredClone(mock.questionSnapshots),
    answers: graded.map(({ questionId, selectedIndex, correct }) => ({
      questionId,
      selectedIndex,
      correct,
    })),
    byEra,
    byType,
  }
}

export function snapshotsFromQuestionIds(ids: string[]): QuestionSnapshot[] {
  return ids.flatMap((id) => {
    const question = questions.find((item) => item.id === id)
    return question ? [snapshotFromQuestion(question)] : []
  })
}
