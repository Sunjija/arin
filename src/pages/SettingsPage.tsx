import { useEffect, useId, useState, type ReactNode } from 'react'
import { db } from '../db/database'
import { downloadJson, exportAllData, restoreBackup } from '../db/backup'
import { clearAllLearningData } from '../db/seed'
import { quantitySettingsCopy } from '../lib/studyPlan'
import { toDateKey } from '../lib/dates'
import { Button, Dialog, InlineStatus, PageHeader } from '../components/ui'
import {
  DAILY_MINUTES_MAX,
  DAILY_MINUTES_MIN,
  DAILY_QUESTION_MAX,
  DAILY_QUESTION_MIN,
  GOAL_SCORE_MAX,
  GOAL_SCORE_MIN,
  PLAN_WEEKS_MAX,
  PLAN_WEEKS_MIN,
  parseBackupFileText,
  validateSettingsForm,
} from '../components/dashboard/settingsValidation'
import { MAX_DAILY_CARDS, MIN_DAILY_CARDS } from '../lib/studyLimits'
import { ALL_TYPES, TYPE_LABELS, type QuestionType, type UserSettings } from '../types'

export function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [goalStatus, setGoalStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(
    null,
  )
  const [backupStatus, setBackupStatus] = useState<{
    tone: 'success' | 'error'
    text: string
  } | null>(null)
  const [resetStatus, setResetStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(
    null,
  )
  const [busy, setBusy] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const fileInputId = useId()

  useEffect(() => {
    void db.settings.get('settings').then((row) => {
      if (!row) return
      const { id: _id, ...rest } = row
      setSettings(rest)
    })
  }, [])

  const reloadSettings = async () => {
    const row = await db.settings.get('settings')
    if (!row) return
    const { id: _id, ...rest } = row
    setSettings(rest)
  }

  const save = async () => {
    if (!settings) return
    const errors = validateSettingsForm(settings)
    if (errors.length > 0) {
      setGoalStatus({ tone: 'error', text: errors[0]! })
      return
    }
    setBusy(true)
    try {
      await db.settings.put({ id: 'settings', ...settings })
      setGoalStatus({ tone: 'success', text: '설정을 저장했습니다.' })
    } catch (e) {
      setGoalStatus({
        tone: 'error',
        text: e instanceof Error ? e.message : '설정을 저장하지 못했습니다.',
      })
    } finally {
      setBusy(false)
    }
  }

  const toggleFocus = (type: QuestionType) => {
    if (!settings) return
    const exists = settings.focusTypes.includes(type)
    setSettings({
      ...settings,
      focusTypes: exists
        ? settings.focusTypes.filter((t) => t !== type)
        : [...settings.focusTypes, type],
    })
  }

  const onExport = async () => {
    setBusy(true)
    setBackupStatus(null)
    try {
      const payload = await exportAllData()
      downloadJson(`hanguksa-coach-${toDateKey()}.json`, payload)
      setBackupStatus({ tone: 'success', text: '기록을 백업 파일로 저장했습니다.' })
    } catch (e) {
      setBackupStatus({
        tone: 'error',
        text: e instanceof Error ? e.message : '기록을 백업하지 못했습니다.',
      })
    } finally {
      setBusy(false)
    }
  }

  const onImportFile = async (file: File) => {
    setBusy(true)
    setBackupStatus(null)
    try {
      const parsed = parseBackupFileText(await file.text())
      if (!parsed.ok) {
        setBackupStatus({ tone: 'error', text: parsed.message })
        return
      }
      const restored = await restoreBackup(parsed.value)
      if (!restored.ok) {
        setBackupStatus({ tone: 'error', text: restored.message })
        return
      }
      await reloadSettings()
      setBackupStatus({ tone: 'success', text: '기록을 가져왔습니다.' })
    } catch (e) {
      setBackupStatus({
        tone: 'error',
        text: e instanceof Error ? e.message : '기록을 가져오지 못했습니다.',
      })
    } finally {
      setBusy(false)
    }
  }

  const onReset = async () => {
    setBusy(true)
    setResetStatus(null)
    try {
      await clearAllLearningData()
      await reloadSettings()
      setResetOpen(false)
      setResetStatus({ tone: 'success', text: '학습 기록을 초기화했습니다.' })
    } catch (e) {
      setResetStatus({
        tone: 'error',
        text: e instanceof Error ? e.message : '초기화에 실패했습니다.',
      })
    } finally {
      setBusy(false)
    }
  }

  if (!settings) {
    return <div className="surface p-5 text-[var(--ink-muted)]">설정을 불러오는 중…</div>
  }

  return (
    <div className="max-w-[720px] space-y-5">
      <PageHeader title="설정" />

      <section className="surface p-5">
        <h2 className="section-title">학습 목표/분량</h2>
        <p className="meta-text mt-2 leading-relaxed">{quantitySettingsCopy()}</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="목표 점수">
            <input
              className="field-control"
              type="number"
              min={GOAL_SCORE_MIN}
              max={GOAL_SCORE_MAX}
              value={Number.isFinite(settings.goalScore) ? settings.goalScore : ''}
              onChange={(e) =>
                setSettings({ ...settings, goalScore: e.target.value === '' ? Number.NaN : Number(e.target.value) })
              }
            />
          </Field>
          <Field label="하루 문제 수">
            <input
              className="field-control"
              type="number"
              min={DAILY_QUESTION_MIN}
              max={DAILY_QUESTION_MAX}
              value={Number.isFinite(settings.dailyQuestionCount) ? settings.dailyQuestionCount : ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  dailyQuestionCount: e.target.value === '' ? Number.NaN : Number(e.target.value),
                })
              }
            />
          </Field>
          <Field label="하루 카드 수">
            <input
              className="field-control"
              type="number"
              min={MIN_DAILY_CARDS}
              max={MAX_DAILY_CARDS}
              value={Number.isFinite(settings.dailyCardCount) ? settings.dailyCardCount : ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  dailyCardCount: e.target.value === '' ? Number.NaN : Number(e.target.value),
                })
              }
            />
          </Field>
          <Field label="하루 학습 시간(분)">
            <input
              className="field-control"
              type="number"
              min={DAILY_MINUTES_MIN}
              max={DAILY_MINUTES_MAX}
              value={Number.isFinite(settings.dailyMinutes) ? settings.dailyMinutes : ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  dailyMinutes: e.target.value === '' ? Number.NaN : Number(e.target.value),
                })
              }
            />
          </Field>
          <Field label="계획 주수">
            <input
              className="field-control"
              type="number"
              min={PLAN_WEEKS_MIN}
              max={PLAN_WEEKS_MAX}
              value={Number.isFinite(settings.planWeeks) ? settings.planWeeks : ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  planWeeks: e.target.value === '' ? Number.NaN : Number(e.target.value),
                })
              }
            />
          </Field>
        </div>

        <fieldset className="mt-4 border-0 p-0">
          <legend className="mb-2 font-semibold">집중 유형</legend>
          <div className="flex flex-wrap gap-2">
            {ALL_TYPES.map((t) => {
              const on = settings.focusTypes.includes(t)
              return (
                <button
                  key={t}
                  type="button"
                  className={`btn ${on ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => toggleFocus(t)}
                >
                  {TYPE_LABELS[t]}
                </button>
              )
            })}
          </div>
        </fieldset>

        <Button className="mt-4" disabled={busy} onClick={() => void save()}>
          설정 저장
        </Button>
        {goalStatus ? (
          <div className="mt-3">
            <InlineStatus tone={goalStatus.tone}>{goalStatus.text}</InlineStatus>
          </div>
        ) : null}
      </section>

      <section className="surface p-5">
        <h2 className="section-title">기록 백업하기 / 기록 가져오기</h2>
        <p className="meta-text mt-2 leading-relaxed">
          JSON 파일은 이 브라우저에 있는 학습 기록을 옮길 때 쓰는 보조 형식입니다. 가져오기에
          실패하면 지금 화면에서 이유를 보여 드리고, 기존 기록은 그대로 둡니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => void onExport()}>
            기록 백업하기
          </Button>
          <label className="btn btn-secondary cursor-pointer" htmlFor={fileInputId}>
            기록 가져오기
          </label>
          <input
            id={fileInputId}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void onImportFile(file)
              e.target.value = ''
            }}
          />
        </div>
        {backupStatus ? (
          <div className="mt-3">
            <InlineStatus tone={backupStatus.tone}>{backupStatus.text}</InlineStatus>
          </div>
        ) : null}
      </section>

      <section className="p-1">
        <h2 className="text-sm font-semibold text-[var(--ink-muted)]">초기화</h2>
        <p className="meta-text mt-1 leading-relaxed">
          학습 기록만 지우고 처음 상태로 되돌립니다. 백업과 다른 동작입니다.
        </p>
        <Button variant="text" className="mt-2" disabled={busy} onClick={() => setResetOpen(true)}>
          학습 기록 초기화
        </Button>
        {resetStatus ? (
          <div className="mt-2">
            <InlineStatus tone={resetStatus.tone}>{resetStatus.text}</InlineStatus>
          </div>
        ) : null}
      </section>

      <Dialog open={resetOpen} title="학습 기록을 초기화할까요?" onClose={() => setResetOpen(false)}>
        <p className="text-[var(--ink-muted)]">
          진도·연습·실전 기록이 모두 사라집니다. 이 동작은 백업 가져오기와 다릅니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="text" disabled={busy} onClick={() => setResetOpen(false)}>
            취소
          </Button>
          <Button variant="destructive" disabled={busy} onClick={() => void onReset()}>
            초기화
          </Button>
        </div>
      </Dialog>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-semibold">{label}</span>
      {children}
    </label>
  )
}
