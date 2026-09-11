/** @vitest-environment jsdom */
import 'fake-indexeddb/auto'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { QuizStep } from './QuizStep'
import { questions } from '../../data/questions'
import { db } from '../../db/database'
import { questionContextCopy } from '../../lib/questionStudyContext'
import { snapshotFromQuestion } from '../../lib/wrongCard'
import { resetAppDb, seedCore } from '../../test/idb'
import type { ActiveSession, QuestionStudyContext } from '../../types'

const first = questions.find((question) => question.lessonId === 'lesson-01')!
const second = questions.filter((question) => question.lessonId === 'lesson-01' && question.id !== first.id)[0]!

function contextFor(
  questionId: string,
  reason: QuestionStudyContext['reason'],
  overrides: Partial<QuestionStudyContext> = {},
): QuestionStudyContext {
  return {
    questionId,
    reason,
    selectedOn: '2026-01-05',
    dueOn: reason === 'due-review' ? '2026-01-05' : null,
    lastWrongAt: reason === 'recent-wrong' ? '2026-01-03T12:00:00.000Z' : null,
    priorAttemptCount: 0,
    similarQuestionAttemptCount: null,
    ...overrides,
  }
}

function baseSession(overrides: Partial<ActiveSession> = {}): ActiveSession {
  const questionIds = overrides.questionIds ?? [first.id]
  const snapshots = questionIds.map((id) => {
    const question = questions.find((item) => item.id === id)!
    return snapshotFromQuestion(question)
  })
  return {
    id: 'session-quiz',
    date: '2026-01-05',
    step: 'quiz',
    lessonId: 'lesson-01',
    cardIds: [],
    cardIndex: 0,
    conceptDone: true,
    conceptMemo: '',
    questionIds,
    questionIndex: 0,
    quizPhase: 'choices',
    clueMemo: '',
    revealedChoices: true,
    answered: [],
    startedAt: '2026-01-05T09:00:00.000Z',
    updatedAt: '2026-01-05T09:00:00.000Z',
    entryMode: 'daily',
    questionSnapshots: snapshots,
    questionContexts: [contextFor(first.id, 'due-review')],
    ...overrides,
  }
}

async function chooseAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  question: (typeof questions)[number],
  selectedIndex = question.answerIndex,
) {
  const choice = question.choices[selectedIndex]!
  await user.click(screen.getByRole('button', { name: choice }))
  await waitFor(() => expect(screen.getByRole('button', { name: choice })).toHaveAttribute('aria-pressed', 'true'))
  await user.click(screen.getByRole('button', { name: '선택한 답 확인' }))
  expect(await screen.findByText(question.explanation)).toBeVisible()
}

beforeEach(async () => {
  await seedCore()
})

afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  await resetAppDb()
})

describe('QuizStep review context copy', () => {
  it('shows due, recent-wrong, and supplementary reason labels from questionContextCopy', () => {
    const due = questionContextCopy(contextFor(first.id, 'due-review'))
    const recent = questionContextCopy(contextFor(first.id, 'recent-wrong'))
    const supplementary = questionContextCopy(contextFor(first.id, 'review-practice'))

    const { rerender } = render(
      <QuizStep
        session={baseSession({ questionContexts: [contextFor(first.id, 'due-review')] })}
        onChange={vi.fn().mockResolvedValue(undefined)}
      />,
    )
    expect(screen.getByText(due.reasonLabel)).toBeVisible()
    expect(screen.getByText(due.reasonDetail)).toBeVisible()
    expect(screen.queryByText('due-review')).toBeNull()
    expect(screen.getByText((text) => text.includes(`${first.difficulty}점`))).toBeVisible()

    rerender(
      <QuizStep
        session={baseSession({ questionContexts: [contextFor(first.id, 'recent-wrong')] })}
        onChange={vi.fn().mockResolvedValue(undefined)}
      />,
    )
    expect(screen.getByText(recent.reasonLabel)).toBeVisible()
    expect(screen.getByText(recent.reasonDetail)).toBeVisible()

    rerender(
      <QuizStep
        session={baseSession({ questionContexts: [contextFor(first.id, 'review-practice')] })}
        onChange={vi.fn().mockResolvedValue(undefined)}
      />,
    )
    expect(screen.getByText(supplementary.reasonLabel)).toBeVisible()
    expect(screen.getByText(supplementary.reasonDetail)).toBeVisible()
  })

  it('shows first, repeated, similar-family, and legacy-unknown history labels', () => {
    const firstCopy = questionContextCopy(contextFor(first.id, 'new-concept', { priorAttemptCount: 0 }))
    const repeatedCopy = questionContextCopy(
      contextFor(first.id, 'review-practice', { priorAttemptCount: 2, similarQuestionAttemptCount: 0 }),
    )
    const similarCopy = questionContextCopy(
      contextFor(first.id, 'lesson-practice', { priorAttemptCount: 1, similarQuestionAttemptCount: 3 }),
    )
    const legacyCopy = questionContextCopy(undefined)

    const { rerender } = render(
      <QuizStep
        session={baseSession({
          questionContexts: [contextFor(first.id, 'new-concept', { priorAttemptCount: 0 })],
        })}
        onChange={vi.fn().mockResolvedValue(undefined)}
      />,
    )
    expect(screen.getByText(firstCopy.historyLabel)).toBeVisible()

    rerender(
      <QuizStep
        session={baseSession({
          questionContexts: [
            contextFor(first.id, 'review-practice', { priorAttemptCount: 2, similarQuestionAttemptCount: 0 }),
          ],
        })}
        onChange={vi.fn().mockResolvedValue(undefined)}
      />,
    )
    expect(screen.getByText(repeatedCopy.historyLabel)).toBeVisible()
    const repeatedDetails = screen.getByText('풀이 이력 기준').closest('details') as HTMLDetailsElement
    repeatedDetails.open = true
    expect(screen.getByText(repeatedCopy.historyDetail)).toBeVisible()

    rerender(
      <QuizStep
        session={baseSession({
          questionContexts: [
            contextFor(first.id, 'lesson-practice', { priorAttemptCount: 1, similarQuestionAttemptCount: 3 }),
          ],
        })}
        onChange={vi.fn().mockResolvedValue(undefined)}
      />,
    )
    expect(screen.getByText(similarCopy.historyLabel)).toBeVisible()
    const similarDetails = screen.getByText('풀이 이력 기준').closest('details') as HTMLDetailsElement
    similarDetails.open = true
    expect(screen.getByText(similarCopy.historyDetail)).toBeVisible()

    rerender(
      <QuizStep
        session={baseSession({ questionContexts: undefined })}
        onChange={vi.fn().mockResolvedValue(undefined)}
      />,
    )
    expect(screen.getByText(legacyCopy.reasonLabel)).toBeVisible()
    expect(screen.getByText(legacyCopy.historyLabel)).toBeVisible()
    expect(screen.queryByText(first.id)).toBeNull()
  })

  it('hides the explanation until submit and keeps the same reason after feedback', async () => {
    const user = userEvent.setup()
    const copy = questionContextCopy(contextFor(first.id, 'due-review', { priorAttemptCount: 1 }))
    let session = baseSession({
      questionContexts: [contextFor(first.id, 'due-review', { priorAttemptCount: 1 })],
    })
    const onChange = vi.fn(async (next: ActiveSession) => {
      session = next
      rerender(<QuizStep session={session} onChange={onChange} />)
    })
    const { rerender } = render(<QuizStep session={session} onChange={onChange} />)

    expect(screen.getByText(copy.reasonLabel)).toBeVisible()
    expect(screen.getByText(copy.historyLabel)).toBeVisible()
    expect(screen.queryByText(first.explanation)).toBeNull()

    await chooseAndSubmit(user, first)
    expect(within(screen.getByLabelText('문제 선정 이유와 풀이 이력')).getByText(copy.reasonLabel)).toBeVisible()
    expect(within(screen.getByLabelText('문제 선정 이유와 풀이 이력')).getByText(copy.historyLabel)).toBeVisible()
    expect(within(screen.getByLabelText('문제 선정 이유와 풀이 이력')).getByText(copy.reasonDetail)).toBeVisible()
    expect(await db.attempts.count()).toBe(1)
  })

  it('updates context when the question changes and restores the same labels after remount', async () => {
    const user = userEvent.setup()
    const dueCopy = questionContextCopy(contextFor(first.id, 'due-review'))
    const recentCopy = questionContextCopy(contextFor(second.id, 'recent-wrong', { priorAttemptCount: 2 }))
    let session = baseSession({
      questionIds: [first.id, second.id],
      questionIndex: 0,
      questionContexts: [
        contextFor(first.id, 'due-review'),
        contextFor(second.id, 'recent-wrong', { priorAttemptCount: 2 }),
      ],
    })
    const onChange = vi.fn(async (next: ActiveSession) => {
      session = next
      rerender(<QuizStep session={session} onChange={onChange} />)
    })
    const { rerender, unmount } = render(<QuizStep session={session} onChange={onChange} />)
    expect(screen.getByText(dueCopy.reasonLabel)).toBeVisible()

    await chooseAndSubmit(user, first)
    await user.click(await screen.findByRole('button', { name: '다음 문제' }))
    expect(await screen.findByRole('heading', { name: second.stem })).toBeVisible()
    expect(screen.getByText(recentCopy.reasonLabel)).toBeVisible()
    expect(screen.getByText(recentCopy.historyLabel)).toBeVisible()
    expect(screen.queryByText(dueCopy.reasonLabel)).toBeNull()
    expect(screen.queryByText(second.explanation)).toBeNull()

    unmount()
    render(<QuizStep session={session} onChange={onChange} />)
    expect(screen.getByRole('heading', { name: second.stem })).toBeVisible()
    expect(screen.getByText(recentCopy.reasonLabel)).toBeVisible()
    expect(screen.getByText(recentCopy.historyLabel)).toBeVisible()
  })

  it('keeps selection, cause skip, same-attempt cause update, save failure, and next flow', async () => {
    const user = userEvent.setup()
    let session = baseSession({
      questionIds: [first.id, second.id],
      questionContexts: [
        contextFor(first.id, 'recent-wrong', { priorAttemptCount: 1 }),
        contextFor(second.id, 'review-practice'),
      ],
    })
    const onChange = vi.fn(async (next: ActiveSession) => {
      session = next
      rerender(<QuizStep session={session} onChange={onChange} />)
    })
    const { rerender } = render(<QuizStep session={session} onChange={onChange} />)

    const wrongIndex = first.answerIndex === 0 ? 1 : 0
    const wrongChoice = first.choices[wrongIndex]!
    await user.click(screen.getByRole('button', { name: wrongChoice }))
    await waitFor(() => expect(session.selectedIndex).toBe(wrongIndex))
    await waitFor(() => expect(screen.getByRole('button', { name: wrongChoice })).toHaveAttribute('aria-pressed', 'true'))

    vi.spyOn(db.attempts, 'put').mockRejectedValueOnce(new Error('disk full'))
    await user.click(screen.getByRole('button', { name: '선택한 답 확인' }))
    expect(await screen.findByText('disk full')).toBeVisible()
    expect(screen.queryByText(first.explanation)).toBeNull()
    expect(await db.attempts.count()).toBe(0)

    await user.click(screen.getByRole('button', { name: '선택한 답 확인' }))
    expect(await screen.findByText(first.explanation)).toBeVisible()
    expect(await db.attempts.count()).toBe(1)
    const attemptId = (await db.attempts.toArray())[0]!.id

    await user.click(screen.getByRole('button', { name: '원인 건너뛰기' }))
    expect(screen.getByText('원인은 미확인으로 남습니다.')).toBeVisible()

    await user.click(screen.getByRole('button', { name: '왕·인물을 혼동함' }))
    await waitFor(async () => {
      expect((await db.attempts.get(attemptId))?.cause).toBe('confused-person')
    })
    expect(await db.attempts.count()).toBe(1)
    expect(session.answered).toHaveLength(1)
    expect(session.answered[0]?.attemptId).toBe(attemptId)

    await user.click(await screen.findByRole('button', { name: '다음 문제' }))
    expect(await screen.findByRole('heading', { name: second.stem })).toBeVisible()
    expect(screen.queryByText(first.explanation)).toBeNull()
  })
})
