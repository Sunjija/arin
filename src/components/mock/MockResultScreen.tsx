import { Button, ChoiceOption, EmptyState, InlineStatus, PageHeader } from '../ui'
import type { MockExamResult, QuestionSnapshot, WrongCause } from '../../types'
import type { ScoreSummary } from '../../types/contracts'
import {
  WRONG_CAUSE_OPTIONS,
  fullMockAverageFromSummary,
  missedReviewIndexes,
  recentMocksForDisplay,
  resultModeLabel,
  reviewFromSnapshot,
} from './mockExamLogic'

export function MockResultScreen({
  result,
  snapshots,
  answers,
  summary,
  causes,
  cardMessages,
  onCause,
  onAddCard,
  onHome,
}: {
  result: MockExamResult
  snapshots: QuestionSnapshot[]
  answers: Array<number | null>
  summary: ScoreSummary | null
  causes: Record<string, WrongCause>
  cardMessages: Record<string, string>
  onCause: (questionId: string, cause: WrongCause) => void
  onAddCard: (index: number) => void
  onHome: () => void
}) {
  const missed = missedReviewIndexes(snapshots, answers)
  const recent = summary ? recentMocksForDisplay(summary) : []
  const average = summary ? fullMockAverageFromSummary(summary) : null

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="시험 결과" title="채점 결과" />
      <section className="surface surface-raised p-5 sm:p-6">
        <p className="text-4xl font-bold tracking-[-0.05em] tabular-nums">{result.score}점</p>
        <p className="text-[var(--ink-muted)]">
          {result.correct}/{result.total} 정답 · {resultModeLabel(result)}
        </p>
        <p className="meta-text mt-3">
          자체 제작 문항의 연습 점수입니다. 합격 가능성이나 미노출 실전 실력을 뜻하지 않습니다.
        </p>
        <p className="meta-text mt-3">
          최근 실전 연습 평균 {average == null ? '아직 기록 없음' : `${average}점`}
        </p>
        {recent.length > 0 ? (
          <ul className="mt-3 space-y-1 text-sm">
            {recent.map((item) => (
              <li key={item.id}>
                {resultModeLabel(item)} {item.score}점
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="section-title">문항 다시 보기</h2>
        {snapshots.length === 0 ? <p>이전 기록에는 문항 원본이 없어 당시 문항과 선지를 복원할 수 없습니다. 이 점수는 실전 평균에서 제외됩니다.</p> : null}
        {snapshots.map((snapshot, index) => {
          const review = reviewFromSnapshot(snapshot, answers[index] ?? null)
          return (
            <article key={`${snapshot.questionId}-${index}`} className="surface space-y-3 p-5">
              <p className="meta-text">
                {index + 1}번 · 배점 {review.difficulty}점 · {review.correct ? '정답' : review.selectedIndex == null ? '미응답' : '오답'}
                {snapshot.priorAttemptCount === undefined ? ' · 이전 풀이 기록 미확인' : snapshot.priorAttemptCount === 0 ? ' · 저장 기록상 첫 풀이' : ` · 이전 ${snapshot.priorAttemptCount}회 풀이`}
              </p>
              {review.passage ? <blockquote className="passage-text">{review.passage}</blockquote> : null}
              <h3 className="font-semibold">{review.stem}</h3>
              <div className="space-y-2">
                {review.choices.map((choice, choiceIndex) => {
                  const selected = review.selectedIndex === choiceIndex
                  const isAnswer = choiceIndex === review.answerIndex
                  let state: 'correct' | 'incorrect' | 'locked' = 'locked'
                  if (isAnswer) state = 'correct'
                  else if (selected) state = 'incorrect'
                  return (
                    <ChoiceOption
                      key={`${snapshot.questionId}-r-${choiceIndex}`}
                      index={choiceIndex}
                      label={choice}
                      state={state}
                    />
                  )
                })}
              </div>
              <p className="text-[var(--ink-muted)]">{review.explanation}</p>
            </article>
          )
        })}
      </section>

      <section className="space-y-3">
        <h2 className="section-title">다음 복습</h2>
        {snapshots.length === 0 ? <p>문항 원본이 없어 복습 목록을 확인할 수 없습니다.</p> : missed.length === 0 ? (
          <EmptyState title="틀린 문항 없음">이번 시험에서 틀린 문항이 없습니다.</EmptyState>
        ) : (
          missed.map((index) => {
            const snapshot = snapshots[index]!
            const review = reviewFromSnapshot(snapshot, answers[index] ?? null)
            const questionId = snapshot.questionId
            return (
              <article key={`miss-${questionId}-${index}`} className="surface space-y-3 p-5">
                <p className="text-sm text-[var(--wrong)]">
                  {index + 1}번 · {review.selectedIndex == null ? '미응답' : '오답'}
                </p>
                <h3 className="font-semibold">{review.stem}</h3>
                {review.selectedIndex != null ? (
                  <fieldset>
                    <legend className="meta-text">원인</legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {WRONG_CAUSE_OPTIONS.map((option) => (
                        <Button
                          key={option.value}
                          variant={
                            (causes[questionId] ?? 'unknown') === option.value ? 'primary' : 'secondary'
                          }
                          onClick={() => onCause(questionId, option.value)}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </fieldset>
                ) : null}
                <Button variant="secondary" onClick={() => onAddCard(index)}>
                  오답 카드로 추가
                </Button>
                {cardMessages[questionId] ? (
                  <InlineStatus
                    tone={cardMessages[questionId]?.includes('못') ? 'error' : 'success'}
                  >
                    {cardMessages[questionId]}
                  </InlineStatus>
                ) : null}
              </article>
            )
          })
        )}
      </section>

      <Button onClick={onHome}>실전 연습 홈</Button>
    </div>
  )
}
