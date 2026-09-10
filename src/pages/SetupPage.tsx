import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { diagnosticPool } from '../lib/questionQualityAdapter'
import { questions } from '../data/questions'
import { GRADE_CUTOFF, normalizeSettings } from '../lib/settingsNormalize'
import { readSettings, writeSettings } from '../lib/dailyLearningService'
import { GOAL_GRADE_LABELS, type UserSettings } from '../types'
import type { ExperienceLevel, GoalGrade } from '../types/dailyLearning'

export function SetupPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [examUndecided, setExamUndecided] = useState(true)
  const [busy, setBusy] = useState(false)
  const diagnosticReady = diagnosticPool(questions).length > 0

  useEffect(() => {
    void readSettings().then((row) => {
      setSettings(row)
      setExamUndecided(!row.examDate)
    })
  }, [])

  if (!settings) {
    return <div className="surface p-5 text-[var(--ink-muted)]">목표 설정을 준비하는 중…</div>
  }

  const save = async (goDiagnostic: boolean) => {
    setBusy(true)
    try {
      const next = normalizeSettings({
        ...settings,
        examDate: examUndecided ? null : settings.examDate,
        goalScore: GRADE_CUTOFF[settings.goalGrade ?? 1],
        onboardingCompleted: true,
        diagnosticSkipped: !goDiagnostic,
      })
      await writeSettings(next)
      navigate(goDiagnostic ? '/setup/diagnostic' : '/')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <header className="page-header">
        <p className="eyebrow">처음 설정</p>
        <h1 className="page-title">시험일까지 이어서 공부할 목표</h1>
        <p className="mt-2 text-[var(--ink-muted)]">
          매번 범위를 고르지 않아도 오늘 학습이 이어지도록, 목표만 먼저 둡니다. 나중에 설정에서 바꿀 수 있습니다.
        </p>
      </header>

      <section className="surface space-y-4 p-5">
        <fieldset className="border-0 p-0">
          <legend className="font-semibold">목표 급수</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {([1, 2] as GoalGrade[]).map((grade) => (
              <button
                key={grade}
                type="button"
                className={`btn ${settings.goalGrade === grade ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() =>
                  setSettings({
                    ...settings,
                    goalGrade: grade,
                    goalScore: GRADE_CUTOFF[grade],
                  })
                }
              >
                {GOAL_GRADE_LABELS[grade]}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">심화 시험 급수 기준입니다. 합격 가능성을 예측하지는 않습니다.</p>
        </fieldset>

        <fieldset className="border-0 p-0">
          <legend className="font-semibold">응시 예정일</legend>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={examUndecided}
              onChange={(e) => {
                setExamUndecided(e.target.checked)
                if (e.target.checked) setSettings({ ...settings, examDate: null })
              }}
            />
            아직 미정
          </label>
          {!examUndecided ? (
            <input
              className="field-control mt-2"
              type="date"
              value={settings.examDate ?? ''}
              onChange={(e) => setSettings({ ...settings, examDate: e.target.value || null })}
            />
          ) : null}
        </fieldset>

        <label className="block space-y-1">
          <span className="font-semibold">하루 학습 가능 시간 (분)</span>
          <input
            className="field-control"
            type="number"
            min={20}
            max={300}
            value={settings.dailyMinutes}
            onChange={(e) => setSettings({ ...settings, dailyMinutes: Number(e.target.value) })}
          />
        </label>

        <fieldset className="border-0 p-0">
          <legend className="font-semibold">한국사 학습 경험</legend>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            자기평가는 검증된 실력이 아닙니다. 신규 개념 개수 안내만 조금 조정합니다.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(
              [
                ['first-time', '처음 공부해요'],
                ['has-experience', '어느 정도 공부해 봤어요'],
              ] as Array<[ExperienceLevel, string]>
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`btn ${settings.experienceLevel === value ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSettings({ ...settings, experienceLevel: value })}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() => void save(false)}
        >
          저장하고 오늘 학습으로
        </button>
        {diagnosticReady ? (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={() => void save(true)}
          >
            짧은 진단 풀어보기
          </button>
        ) : (
          <p className="text-sm text-[var(--ink-muted)]">
            검수된 진단 문항이 없어 초기 진단은 제공하지 않습니다.
          </p>
        )}
        <Link to="/" className="btn btn-ghost">
          나중에 설정
        </Link>
      </div>
    </div>
  )
}
