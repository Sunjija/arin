import type { SessionStep } from '../types'

const STEPS: Array<{ id: SessionStep; label: string }> = [
  { id: 'cards', label: '복습' },
  { id: 'concept', label: '개념' },
  { id: 'quiz', label: '문제' },
  { id: 'result', label: '결과' },
]

export function SessionProgress({ current }: { current: SessionStep }) {
  const idx = STEPS.findIndex((s) => s.id === current)
  return (
    <ol className="progress-rail mb-4" aria-label="학습 단계">
      {STEPS.map((step, i) => {
        const state = i < idx ? 'done' : i === idx ? 'current' : ''
        return (
          <li key={step.id} className={`progress-step ${state}`}>
            {step.label}
          </li>
        )
      })}
    </ol>
  )
}
