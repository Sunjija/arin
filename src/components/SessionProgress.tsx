import type { SessionStep } from '../types'

const STEPS: Array<{ id: SessionStep; label: string; hint: string }> = [
  { id: 'cards', label: '카드', hint: '오늘 외울 키워드를 4지선다로 빠르게' },
  { id: 'concept', label: '개념', hint: '오늘 단원 요약·체크포인트 읽기' },
  { id: 'quiz', label: '문제', hint: '취약 유형 맞춤 문제로 점검' },
  { id: 'result', label: '결과', hint: '정답률·다음 복습 반영' },
]

export function SessionProgress({ current }: { current: SessionStep }) {
  const idx = STEPS.findIndex((s) => s.id === current)
  const currentStep = STEPS[idx] ?? STEPS[0]
  return (
    <div className="space-y-2">
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
      <p className="text-sm text-[var(--ink-muted)]">
        <span className="font-medium text-[var(--ink)]">
          {idx + 1}. {currentStep.label}
        </span>
        {' — '}
        {currentStep.hint}
      </p>
      {idx < STEPS.length - 1 ? (
        <p className="text-xs text-[var(--ink-muted)]">
          학습 단계는 위 순서대로 완료하면 자동으로 열립니다.
        </p>
      ) : null}
    </div>
  )
}
