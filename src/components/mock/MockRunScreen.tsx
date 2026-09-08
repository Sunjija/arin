import { Button, ChoiceOption } from '../ui'
import type { QuestionSnapshot } from '../../types'
import { formatRemaining, unansweredNumbers } from './mockExamLogic'

export function MockRunScreen({
  mode,
  snapshots,
  answers,
  currentIndex,
  remainingMs,
  confirming,
  saveError,
  onSelect,
  onPrev,
  onNext,
  onJump,
  onClose,
  onRetrySave,
  onSubmit,
  onBackToItem,
}: {
  mode: 'sample' | 'full'
  snapshots: QuestionSnapshot[]
  answers: Array<number | null>
  currentIndex: number
  remainingMs: number
  confirming: boolean
  saveError: string | null
  onSelect: (choice: number) => void
  onPrev: () => void
  onNext: () => void
  onJump: (index: number) => void
  onClose: () => void
  onRetrySave: () => void
  onSubmit: () => void
  onBackToItem: () => void
}) {
  const total = snapshots.length
  const snapshot = snapshots[currentIndex]
  const unanswered = unansweredNumbers(answers)
  const last = currentIndex >= total - 1
  const collapseNav = total >= 50 || mode === 'full'

  return (
    <div className="focus-reading space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="text" onClick={onClose}>
          닫기
        </Button>
        <p className="font-semibold tabular-nums">
          {currentIndex + 1}/{total}
        </p>
        <p className="tabular-nums text-[var(--ink-muted)]">남은 시간 {formatRemaining(remainingMs)}</p>
      </div>

      {collapseNav ? (
        <details className="surface p-4">
          <summary className="cursor-pointer font-semibold">
            답안 현황 · 미응답 {unanswered.length}문항
          </summary>
          <div className="mt-3 flex flex-wrap gap-1">
            {snapshots.map((_, index) => (
              <NumberButton
                key={index}
                index={index}
                current={index === currentIndex}
                answered={answers[index] != null}
                onJump={onJump}
              />
            ))}
          </div>
        </details>
      ) : (
        <div className="flex flex-wrap gap-1">
          {snapshots.map((_, index) => (
            <NumberButton
              key={index}
              index={index}
              current={index === currentIndex}
              answered={answers[index] != null}
              onJump={onJump}
            />
          ))}
        </div>
      )}

      {saveError ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="status-inline" data-tone="error" role="alert">
            저장하지 못했습니다. {saveError}
          </p>
          <Button variant="secondary" onClick={onRetrySave}>
            다시 저장
          </Button>
        </div>
      ) : null}

      {confirming ? (
        <section className="surface space-y-4 p-5">
          <h1 className="section-title">답안 확인</h1>
          <p>
            미응답 {unanswered.length}문항
            {unanswered.length > 0 ? ` · ${unanswered.join(', ')}번` : null}
          </p>
          {unanswered.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {unanswered.map((number) => (
                <Button key={number} variant="secondary" onClick={() => onJump(number - 1)}>
                  {number}번으로 이동
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-[var(--ink-muted)]">모든 문항에 답이 있습니다.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onBackToItem}>
              문항으로
            </Button>
            <Button className="ml-auto" onClick={onSubmit}>
              제출
            </Button>
          </div>
        </section>
      ) : snapshot ? (
        <section className="surface space-y-3 p-5">
          <p className="meta-text">배점 {snapshot.difficulty}점</p>
          {snapshot.passage ? (
            <blockquote className="passage-text rounded-xl bg-[var(--accent-soft)] p-3">
              {snapshot.passage}
            </blockquote>
          ) : null}
          <h1 className="text-lg font-semibold">{snapshot.stem}</h1>
          <div className="space-y-2">
            {snapshot.choices.map((choice, choiceIndex) => (
              <ChoiceOption
                key={`${snapshot.questionId}-${choiceIndex}`}
                index={choiceIndex}
                label={choice}
                state={answers[currentIndex] === choiceIndex ? 'selected' : 'unselected'}
                onSelect={() => onSelect(choiceIndex)}
              />
            ))}
          </div>
          <div className="cta-dock flex gap-2 pt-2">
            <Button variant="secondary" disabled={currentIndex === 0} onClick={onPrev}>
              이전
            </Button>
            <Button className="ml-auto" variant={last ? 'primary' : 'secondary'} onClick={onNext}>
              {last ? '답안 확인' : '다음'}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  )
}

function NumberButton({
  index,
  current,
  answered,
  onJump,
}: {
  index: number
  current: boolean
  answered: boolean
  onJump: (index: number) => void
}) {
  return (
    <button
      type="button"
      className={`touch-target rounded-lg px-2 py-1 text-sm ${
        current
          ? 'bg-[var(--accent)] text-white'
          : answered
            ? 'bg-[var(--accent-soft)]'
            : 'bg-[var(--bg)]'
      }`}
      onClick={() => onJump(index)}
      aria-label={`${index + 1}번 문제로 이동${answered ? ', 응답함' : ', 미응답'}`}
      aria-current={current ? 'true' : undefined}
    >
      {index + 1}
    </button>
  )
}
