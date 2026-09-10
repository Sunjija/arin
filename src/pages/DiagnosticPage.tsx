import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getQuestionById, questions } from '../data/questions'
import { diagnosticPool } from '../lib/questionQualityAdapter'
import { DAILY_LEARNING_POLICY } from '../lib/dailyLearningPolicy'
import { readSettings, writeSettings } from '../lib/dailyLearningService'
import { recordQuizAnswer } from '../lib/studyService'
import { nowIso } from '../lib/clock'

export function DiagnosticPage() {
  const navigate = useNavigate()
  const pool = useMemo(
    () => diagnosticPool(questions).slice(0, DAILY_LEARNING_POLICY.diagnosticQuestionCount),
    [],
  )
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const question = pool[index] ? getQuestionById(pool[index]!.id) : undefined

  const finish = async (skipped: boolean) => {
    const settings = await readSettings()
    await writeSettings({
      ...settings,
      diagnosticSkipped: skipped,
      diagnosticCompletedAt: skipped ? settings.diagnosticCompletedAt : nowIso(),
      onboardingCompleted: true,
    })
    navigate('/')
  }

  if (pool.length === 0) {
    return (
      <div className="surface space-y-3 p-5">
        <h1 className="page-title">진단 문항이 없습니다</h1>
        <p className="text-[var(--ink-muted)]">
          사람 검수를 통과한 문항이 있을 때만 진단을 제공합니다. 자기평가만으로 실력을 정하지 않습니다.
        </p>
        <Link className="btn btn-primary" to="/">
          오늘 학습으로
        </Link>
      </div>
    )
  }

  if (!question) {
    return (
      <div className="surface p-5">
        <p>문항을 불러오지 못했습니다.</p>
        <Link className="btn btn-primary mt-3" to="/">
          홈으로
        </Link>
      </div>
    )
  }

  return (
    <div className="surface space-y-4 p-5">
      <p className="eyebrow">선택 진단 · 건너뛸 수 있음</p>
      <h1 className="text-lg font-semibold">
        {index + 1} / {pool.length}
      </h1>
      <p className="text-sm text-[var(--ink-muted)]">
        결과는 시작 위치 참고용이며 검증된 실력이 아닙니다. 숙련도 점수에 넣지 않습니다.
      </p>
      {question.passage ? (
        <blockquote className="rounded-xl bg-[var(--accent-soft)]/50 p-4 leading-relaxed whitespace-pre-line">
          {question.passage}
        </blockquote>
      ) : null}
      <h2 className="leading-relaxed">{question.stem}</h2>
      <div className="space-y-2">
        {question.choices.map((choice, choiceIndex) => (
          <button
            key={choice}
            type="button"
            className={`btn choice-option ${selected === choiceIndex ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelected(choiceIndex)}
          >
            <span className="choice-number">{choiceIndex + 1}</span>
            <span>{choice}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="btn btn-primary w-full"
        disabled={selected == null || busy}
        onClick={async () => {
          if (selected == null) return
          setBusy(true)
          try {
            await recordQuizAnswer({
              question,
              selectedIndex: selected,
              correct: selected === question.answerIndex,
              responseMs: 0,
              source: 'diagnostic',
            })
            if (index + 1 >= pool.length) {
              await finish(false)
            } else {
              setIndex(index + 1)
              setSelected(null)
            }
          } finally {
            setBusy(false)
          }
        }}
      >
        {index + 1 >= pool.length ? '마치고 오늘 학습으로' : '다음'}
      </button>
      <button type="button" className="btn btn-ghost w-full" onClick={() => void finish(true)}>
        건너뛰고 오늘 학습 시작
      </button>
    </div>
  )
}
