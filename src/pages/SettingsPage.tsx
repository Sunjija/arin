import { useEffect, useId, useState, type ReactNode } from 'react'
import { db } from '../db/database'
import { getSettings, saveGoal } from '../lib/learningApi'
import { buildConceptSchedule } from '../lib/conceptSchedule'
import { catalogConcepts } from '../lib/conceptCatalog'
import { toLearningGoal } from '../lib/settingsNormalize'
import { validateGoalInput } from '../lib/settingsValidation'
import { downloadJson, exportAllData, restoreBackup } from '../db/backup'
import { clearAllLearningData } from '../db/seed'
import { quantitySettingsCopy } from '../lib/studyPlan'
import { toDateKey } from '../lib/dates'
import { Button, Dialog, InlineStatus, PageHeader } from '../components/ui'
import {
  DAILY_QUESTION_MAX,
  DAILY_QUESTION_MIN,
  GOAL_SCORE_MAX,
  GOAL_SCORE_MIN,
  parseBackupFileText,
} from '../components/dashboard/settingsValidation'
import { MAX_DAILY_CARDS, MIN_DAILY_CARDS } from '../lib/studyLimits'
import { ALL_TYPES, TYPE_LABELS, type QuestionType, type UserSettings, type ConceptProgressRecord } from '../types'

export function SettingsPage() {
  const [progress, setProgress] = useState<ConceptProgressRecord[]>([])
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
    void Promise.all([getSettings(), db.conceptProgress.toArray()]).then(([nextSettings, rows]) => { setSettings(nextSettings); setProgress(rows) }).catch(() => setGoalStatus({ tone: 'error', text: '설정을 불러오지 못했습니다. 다시 열어 주세요.' }))
  }, [])

  const reloadSettings = async () => {
    setSettings(await getSettings())
    setProgress(await db.conceptProgress.toArray())
  }

  const save = async () => {
    if (!settings) return
    const error = validateGoalInput(settings)
    if (error) {
      setGoalStatus({ tone: 'error', text: error })
      return
    }
    setBusy(true)
    try {
      const { goalGrade: _goalGrade, ...input } = settings
      const result = await saveGoal(input)
      if (!result.ok) { setGoalStatus({ tone: 'error', text: result.message }); return }
      await reloadSettings()
      setGoalStatus({ tone: 'success', text: '목표를 저장했습니다. 진행 중인 학습은 유지하며 다음 새 학습부터 적용합니다.' })
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
    return <div className="surface p-5 text-[var(--ink-muted)]">{goalStatus?.text ?? '설정을 불러오는 중…'}</div>
  }

  const goalError = validateGoalInput(settings)
  const schedule = goalError ? null : buildConceptSchedule({ today: toDateKey(), goal: toLearningGoal(settings), concepts: catalogConcepts(), progress })

  return (
    <div className="max-w-[720px] space-y-5">
      <PageHeader title="설정" />

      <section className="surface p-5">
        <h2 className="section-title">언제까지, 얼마나 공부할까요?</h2>
        <p className="meta-text mt-2 leading-relaxed">{quantitySettingsCopy()}</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="학습 시작일"><input className="field-control" type="date" value={settings.startDate} onChange={event => setSettings({ ...settings, startDate: event.target.value })} /></Field>
          <Field label="응시할 한능검 시험일"><input className="field-control" type="date" value={settings.examDate ?? ''} onChange={event => setSettings({ ...settings, examDate: event.target.value || null, examDateUndecided: !event.target.value })} /></Field>
          <label className="flex items-center gap-2 sm:col-span-2"><input type="checkbox" checked={settings.examDateUndecided ?? true} onChange={event => setSettings({ ...settings, examDateUndecided: event.target.checked, examDate: event.target.checked ? null : settings.examDate })} />시험일은 아직 정하지 않았어요</label>
          <p className="meta-text sm:col-span-2">시험일은 <a className="underline" href="https://www.historyexam.go.kr/" target="_blank" rel="noreferrer">한능검 공식 홈페이지</a>에서 확인해 입력하세요.</p>
          <Field label="개념 1회독 목표일 (선택)"><input className="field-control" type="date" value={settings.conceptTargetDate ?? ''} onChange={event => setSettings({ ...settings, conceptTargetDate: event.target.value || null })} /></Field>
          <Field label="하루 개념 분량"><select className="field-control" value={settings.paceMode ?? 'auto'} onChange={event => setSettings({ ...settings, paceMode: event.target.value as 'auto' | 'manual' })}><option value="auto">목표일까지 남은 학습일로 계산</option><option value="manual">직접 정하기</option></select></Field>
          {settings.paceMode === 'manual' && <Field label="하루 새 개념 수 (1~20개)"><input className="field-control" type="number" min={1} max={20} value={Number.isFinite(settings.dailyNewConceptCount) ? settings.dailyNewConceptCount : ''} onChange={event => setSettings({ ...settings, dailyNewConceptCount: event.target.value === '' ? Number.NaN : Number(event.target.value) })} /></Field>}
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

        </div>

        <fieldset className="mt-4 border-0 p-0">
          <legend className="mb-2 font-semibold">공부할 요일</legend>
          <div className="flex flex-wrap gap-3">{['일', '월', '화', '수', '목', '금', '토'].map((label, day) => <label key={day} className="flex items-center gap-2 py-2"><input type="checkbox" checked={settings.studyWeekdays?.includes(day) ?? true} onChange={event => { const weekdays = settings.studyWeekdays ?? [0, 1, 2, 3, 4, 5, 6]; setSettings({ ...settings, studyWeekdays: event.target.checked ? [...weekdays, day] : weekdays.filter(item => item !== day) }) }} />{label}</label>)}</div>
        </fieldset>
        {schedule && <div className="mt-4 space-y-2 rounded-2xl bg-[var(--accent-soft)]/40 p-4 text-sm">
          <p className="font-semibold">개념 목표일 {schedule.targetDate} · 남은 학습일 {schedule.studyDaysLeft}일</p>
          <p>남은 개념 {schedule.remainingConcepts}개 · {schedule.recommendedPerDay == null ? '목표일 조정 필요' : `권장 하루 ${schedule.recommendedPerDay}개`} · 적용 분량 {schedule.selectedPerDay}개</p>
          <p className="meta-text">목표일을 비우면 시험 2주 전 복습 시작일의 전날을 사용합니다. 시험도 미정이면 기존 {settings.planWeeks}주 계획을 기준으로 계산합니다.</p>
          {schedule.warnings.map(message => <p key={message}>{message}</p>)}
        </div>}
        {goalError && goalStatus?.text !== goalError && <div className="mt-3"><InlineStatus tone="error">{goalError}</InlineStatus></div>}
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
