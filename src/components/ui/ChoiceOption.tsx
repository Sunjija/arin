import type { ButtonHTMLAttributes } from 'react'

export type ChoiceState = 'unselected' | 'selected' | 'correct' | 'incorrect' | 'locked'

export type ChoiceOptionProps = {
  index: number
  label: string
  state: ChoiceState
  onSelect?: () => void
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>

const STATUS_LABEL: Partial<Record<ChoiceState, string>> = {
  correct: '정답',
  incorrect: '내 답 · 오답',
}

export function ChoiceOption({
  index,
  label,
  state,
  onSelect,
  className = '',
  ...props
}: ChoiceOptionProps) {
  const locked = state === 'correct' || state === 'incorrect' || state === 'locked'
  const status = STATUS_LABEL[state]
  return (
    <button
      type="button"
      className={[
        'btn',
        'btn-secondary',
        'choice-option',
        state === 'selected' ? 'is-selected' : '',
        state === 'correct' ? 'is-correct btn-correct' : '',
        state === 'incorrect' ? 'is-incorrect btn-wrong' : '',
        state === 'locked' ? 'is-locked' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-pressed={state === 'selected' || state === 'incorrect'}
      aria-disabled={locked}
      disabled={locked}
      onClick={locked ? undefined : onSelect}
      {...props}
    >
      <span className="choice-number" aria-hidden>
        {index + 1}
      </span>
      <span className="choice-text">{label}</span>
      {status ? <span className="choice-status">{status}</span> : <span />}
    </button>
  )
}
