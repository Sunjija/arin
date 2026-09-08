import type { ActiveMock, MockExamResult, QuestionSnapshot, WrongCause } from '../../types'
import type { SaveMockProgressResult, ScoreSummary } from '../../types/contracts'
import { inspectFullMockPool } from '../../lib/mockEligibility'
import { gradeSnapshotAnswers } from '../../lib/examScoring'

export const SAMPLE_LABEL = '10문항 연습 · 16분'
export const FULL_LABEL = '50문항 실전 연습 · 80분'

export type MockView = 'prep' | 'running' | 'confirm' | 'result'

export type ActiveMockAction =
  | { type: 'none' }
  | { type: 'resume'; mock: ActiveMock }
  | { type: 'finalize-expired'; mock: ActiveMock }

export type ProgressDraft = {
  id: string
  answers: Array<number | null>
  currentIndex: number
  itemElapsedMs: Array<number | null>
}

export type SaveProgressFn = (input: ProgressDraft & { revision: number }) => Promise<SaveMockProgressResult>

export function modeTitle(mode: 'sample' | 'full'): string {
  return mode === 'full' ? '50문항 실전 연습' : '10문항 연습'
}

export function remainingMs(deadlineAt: string, now: number): number {
  const deadline = Date.parse(deadlineAt)
  if (!Number.isFinite(deadline)) return 0
  return Math.max(0, deadline - now)
}

export function shouldFinalizeByDeadline(deadlineAt: string, now: number): boolean {
  return remainingMs(deadlineAt, now) <= 0
}

export function formatRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSec / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  if (hours > 0) return `${hours}:${mm}:${ss}`
  return `${mm}:${ss}`
}

export function unansweredIndexes(answers: Array<number | null>): number[] {
  return answers.flatMap((answer, index) => (answer == null ? [index] : []))
}

export function unansweredNumbers(answers: Array<number | null>): number[] {
  return unansweredIndexes(answers).map((index) => index + 1)
}

export function nextAction(currentIndex: number, total: number): 'confirm' | { index: number } {
  if (total <= 0) return 'confirm'
  if (currentIndex >= total - 1) return 'confirm'
  return { index: currentIndex + 1 }
}

export function applyChoice(
  answers: Array<number | null>,
  index: number,
  choice: number,
): Array<number | null> {
  return answers.map((answer, i) => (i === index ? choice : answer))
}

export function accumulateItemElapsed(
  itemElapsedMs: Array<number | null>,
  index: number,
  deltaMs: number | null,
): Array<number | null> {
  if (deltaMs == null || deltaMs < 0 || !Number.isFinite(deltaMs)) return itemElapsedMs
  return itemElapsedMs.map((value, i) => {
    if (i !== index) return value
    return (value ?? 0) + deltaMs
  })
}

export function resolveActiveMockAction(
  mock: ActiveMock | undefined,
  now: number,
): ActiveMockAction {
  if (!mock || mock.status !== 'in-progress') return { type: 'none' }
  if (shouldFinalizeByDeadline(mock.deadlineAt, now)) {
    return { type: 'finalize-expired', mock }
  }
  return { type: 'resume', mock }
}

export function resumeState(mock: ActiveMock): {
  answers: Array<number | null>
  currentIndex: number
  itemElapsedMs: Array<number | null>
  snapshots: QuestionSnapshot[]
  revision: number
} {
  return {
    answers: [...mock.answers],
    currentIndex: mock.currentIndex,
    itemElapsedMs: [...mock.itemElapsedMs],
    snapshots: mock.questionSnapshots,
    revision: mock.revision,
  }
}

export function canStartFull(snapshots: QuestionSnapshot[]): { ok: boolean; uniqueCount: number } {
  return inspectFullMockPool(snapshots)
}

export function mockAttemptId(resultId: string, questionId: string): string {
  return `att-${resultId}-${questionId}`
}

export function missedReviewIndexes(
  snapshots: QuestionSnapshot[],
  answers: Array<number | null>,
): number[] {
  return gradeSnapshotAnswers(snapshots, answers)
    .map((item, index) => (item.correct ? -1 : index))
    .filter((index) => index >= 0)
}

export function reviewFromSnapshot(
  snapshot: QuestionSnapshot,
  selectedIndex: number | null,
): {
  questionId: string
  stem: string
  passage?: string
  choices: string[]
  answerIndex: number
  explanation: string
  selectedIndex: number | null
  correct: boolean
  difficulty: QuestionSnapshot['difficulty']
} {
  return {
    questionId: snapshot.questionId,
    stem: snapshot.stem,
    passage: snapshot.passage,
    choices: snapshot.choices,
    answerIndex: snapshot.answerIndex,
    explanation: snapshot.explanation,
    selectedIndex,
    correct: selectedIndex != null && selectedIndex === snapshot.answerIndex,
    difficulty: snapshot.difficulty,
  }
}

/** getScoreSummary 결과를 그대로 쓴다. [result.score, ...recent]로 다시 쌓지 않는다. */
export function recentMocksForDisplay(summary: ScoreSummary): ScoreSummary['recentMocks'] {
  return summary.recentMocks
}

export function fullMockAverageFromSummary(summary: ScoreSummary): number | null {
  return summary.fullMockAverage
}

export function existingProgressCopy(mock: ActiveMock): string {
  const answered = mock.answers.filter((answer) => answer != null).length
  const unanswered = unansweredNumbers(mock.answers).length
  return `${modeTitle(mock.mode)}이 진행 중입니다. ${answered}문항 응답, 미응답 ${unanswered}문항이 저장되어 있습니다. 새로 시작하면 기존 진행을 덮어씁니다.`
}

export const WRONG_CAUSE_OPTIONS: Array<{ value: WrongCause; label: string }> = [
  { value: 'unknown', label: '미확인' },
  { value: 'first-time', label: '처음 보는 내용' },
  { value: 'confused-person', label: '왕·인물을 혼동함' },
  { value: 'confused-order', label: '사건 순서가 헷갈림' },
  { value: 'missed-clue', label: '사료의 단서를 놓침' },
]

export function createAnswerBuffer(initial: Array<number | null>) {
  let answers = [...initial]
  return {
    get() {
      return answers
    },
    select(index: number, choice: number) {
      answers = applyChoice(answers, index, choice)
      return answers
    },
    replace(next: Array<number | null>) {
      answers = [...next]
      return answers
    },
  }
}

export function createSubmitOnce() {
  let running = false
  let completed = false
  return {
    get locked() {
      return running || completed
    },
    async run<T>(fn: () => Promise<T>): Promise<{ status: 'ran'; value: T } | { status: 'skipped' }> {
      if (completed || running) return { status: 'skipped' }
      running = true
      try {
        const value = await fn()
        completed = true
        return { status: 'ran', value }
      } catch (error) {
        running = false
        throw error
      }
    },
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function createProgressSaver(
  save: SaveProgressFn,
  options?: { retryDelayMs?: number; maxRetries?: number },
) {
  const retryDelayMs = options?.retryDelayMs ?? 400
  const maxRetries = options?.maxRetries ?? 3
  let revision = 1
  let inflight = false
  let pending: ProgressDraft | null = null
  let retries = 0
  let lastError: string | null = null
  let chain: Promise<void> = Promise.resolve()

  function setRevision(next: number) {
    revision = next
  }

  function enqueue(draft: ProgressDraft) {
    pending = draft
    retries = 0
    chain = chain.then(
      () => run(),
      () => run(),
    )
    return chain
  }

  async function run(): Promise<void> {
    if (inflight) return
    inflight = true
    try {
      while (pending) {
        const draft = pending
        pending = null
        try {
          const result = await save({ ...draft, revision })
          if (result.ok) {
            revision = result.mock.revision
            retries = 0
            lastError = null
          } else if (result.code === 'stale-revision' && result.mock) {
            revision = result.mock.revision
            pending = pending ?? draft
            retries = 0
          } else if (result.code === 'already-finalized') {
            lastError = null
          } else {
            retries += 1
            lastError = result.code
            if (retries <= maxRetries) {
              pending = pending ?? draft
              await delay(retryDelayMs * retries)
            }
          }
        } catch (error) {
          retries += 1
          lastError = error instanceof Error ? error.message : 'save-failed'
          if (retries <= maxRetries) {
            pending = pending ?? draft
            await delay(retryDelayMs * retries)
          }
        }
      }
    } finally {
      inflight = false
    }
  }

  async function flush(): Promise<void> {
    await chain
    if (pending) await enqueue(pending)
  }

  return {
    enqueue,
    flush,
    setRevision,
    getRevision: () => revision,
    getError: () => lastError,
  }
}

export function finalizePayload(input: {
  id: string
  revision: number
  answers: Array<number | null>
  itemElapsedMs: Array<number | null>
}) {
  return {
    id: input.id,
    revision: input.revision,
    answers: input.answers,
    itemElapsedMs: input.itemElapsedMs,
  }
}

export function resultModeLabel(result: Pick<MockExamResult, 'mode'>): string {
  return result.mode === 'full' ? '50문항 실전 연습' : '10문항 연습'
}
