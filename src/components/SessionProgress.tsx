import type { SessionStep } from '../types'

const STEPS: Array<{ id: SessionStep; label: string }> = [
  { id: 'cards', label: '카드' },
  { id: 'concept', label: '개념' },
  { id: 'quiz', label: '문제' },
  { id: 'result', label: '결과' },
]

export function SessionProgress({ current }: { current: SessionStep }) {
  const idx = STEPS.findIndex((s) => s.id === current)
  return (
    <ol className="progress-rail" aria-label="학습 단계">
      {STEPS.map((step, i) => {
        const state = i < idx ? 'done' : i === idx ? 'current' : 'locked'
        return (
          <li
            key={step.id}
            className={`progress-step ${state}`}
            aria-current={i === idx ? 'step' : undefined}
            aria-disabled={i > idx ? true : undefined}
          >
            <span className="step-index" aria-hidden>
              {i < idx ? '✓' : i + 1}
            </span>
            <span className="step-label">{step.label}</span>
          </li>
        )
      })}
    </ol>
  )
}
