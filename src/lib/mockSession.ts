import { inspectFullMockPool } from './mockEligibility'
import { db } from '../db/database'
import { snapshotFromQuestion } from './wrongCardContent'
import { questions } from '../data/questions'
import { scoreFromAnswers } from './examScoring'
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
  if (input.mode === 'full') {
    const inspect = inspectFullMockPool(input.snapshots)
    if (!inspect.ok) {
      return { ok: false, code: 'insufficient-pool', uniqueCount: inspect.uniqueCount }
    }
  }

  const existing = await getActiveMock()
  if (existing && existing.status === 'in-progress' && !input.replaceExisting) {
    return { ok: false, code: 'conflict', activeMock: existing }
  }

  const now = new Date().toISOString()
  const mock: ActiveMock = {
    id: `mock-${Date.now()}`,
    revision: 1,
    mode: input.mode,
    status: 'in-progress',
    questionSnapshots: input.snapshots,
    answers: input.snapshots.map(() => null),
    itemElapsedMs: input.snapshots.map(() => null),
    currentIndex: 0,
    startedAt: now,
    deadlineAt: new Date(Date.parse(now) + input.durationMs).toISOString(),
    updatedAt: now,
  }

  await db.transaction('rw', [db.activeMock], async () => {
    await db.activeMock.clear()
    await db.activeMock.put(mock)
  })
  return { ok: true, mock }
}

export async function saveMockProgress(input: SaveMockProgressInput): Promise<SaveMockProgressResult> {
  const current = await db.activeMock.get(input.id)
  if (!current) return { ok: false, code: 'not-found' }
  if (current.status === 'submitted') return { ok: false, code: 'already-finalized', mock: current }
  if (input.revision < current.revision) return { ok: false, code: 'stale-revision', mock: current }

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
}

export async function finalizeMock(input: {
  id: string
  revision?: number
  answers?: Array<number | null>
  itemElapsedMs?: Array<number | null>
}): Promise<FinalizeMockResult> {
  return db.transaction('rw', [db.activeMock, db.mockResults], async () => {
    const current = await db.activeMock.get(input.id)
    if (!current) throw new Error('진행 중인 시험을 찾을 수 없습니다.')
    if (current.status === 'submitted' && current.submittedResultId) {
      const existing = await db.mockResults.get(current.submittedResultId)
      if (existing) return { result: existing, created: false }
    }
    if (input.revision != null && input.revision < current.revision) {
      throw new Error('더 최신 답안이 이미 저장되어 있습니다.')
    }

    const answers = input.answers ?? current.answers
    const itemElapsedMs = input.itemElapsedMs ?? current.itemElapsedMs
    const result = gradeActiveMock({ ...current, answers, itemElapsedMs })

    await db.mockResults.put(result)
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

export function gradeActiveMock(mock: ActiveMock): MockExamResult {
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
  const ended = Date.now()
  const durationSec = Number.isFinite(started) ? Math.max(0, Math.round((ended - started) / 1000)) : 0

  return {
    id: mock.id,
    createdAt: new Date().toISOString(),
    mode: mock.mode,
    total: mock.questionSnapshots.length,
    correct: graded.filter((item) => item.correct).length,
    score: scoreFromAnswers(graded),
    durationSec,
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
