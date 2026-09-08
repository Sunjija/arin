import { useEffect, useState, type ReactNode } from 'react'
import { db } from '../db/database'
import { downloadJson, exportAllData, importAllData } from '../db/backup'
import { clearAllLearningData, restoreSampleData } from '../db/seed'
import { MAX_DAILY_CARDS, MIN_DAILY_CARDS, normalizeDailyCardCount } from '../lib/studyLimits'
import {
  ALL_TYPES,
  TYPE_LABELS,
  type ExportPayload,
  type QuestionType,
  type UserSettings,
} from '../types'
import { toDateKey } from '../lib/dates'

function settingsForForm(settings: UserSettings): UserSettings {
  return { ...settings, dailyCardCount: normalizeDailyCardCount(settings.dailyCardCount) }
}

export function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void db.settings.get('settings').then((row) => {
      if (!row) return
      const { id: _id, ...rest } = row
      setSettings(settingsForForm(rest))
    })
  }, [])

  const save = async () => {
    if (!settings) return
    setBusy(true)
    try {
      const normalized = settingsForForm(settings)
      await db.settings.put({ id: 'settings', ...normalized })
      setSettings(normalized)
      setMessage('설정을 저장했습니다.')
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
    try {
      const payload = await exportAllData()
      downloadJson(`hanguksa-coach-${toDateKey()}.json`, payload)
      setMessage('학습 데이터를 내보냈습니다.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '내보내기 실패')
    } finally {
      setBusy(false)
    }
  }

  const onImportFile = async (file: File) => {
    setBusy(true)
    try {
      const text = await file.text()
      const payload = JSON.parse(text) as ExportPayload
      await importAllData(payload)
      const row = await db.settings.get('settings')
      if (row) {
        const { id: _id, ...rest } = row
        setSettings(settingsForForm(rest))
      }
      setMessage('가져오기가 완료되었습니다.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '가져오기 실패')
    } finally {
      setBusy(false)
    }
  }

  if (!settings) {
    return <div className="surface p-5 text-[var(--ink-muted)]">설정 로딩 중…</div>
  }

  return (
    <div className="space-y-4">
      <section className="surface p-5">
        <h1 className="font-display text-2xl">설정</h1>
        <p className="mt-2 text-[var(--ink-muted)]">목표·일일 분량·데이터 백업을 관리합니다.</p>

        <div className="mt-4 space-y-3">
          <Field label="목표 점수">
            <input
              className="w-full rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2"
              type="number"
              min={60}
              max={100}
              value={settings.goalScore}
              onChange={(e) => setSettings({ ...settings, goalScore: Number(e.target.value) })}
            />
          </Field>
          <Field label="하루 문제 수">
            <input
              className="w-full rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2"
              type="number"
              min={5}
              max={40}
              value={settings.dailyQuestionCount}
              onChange={(e) =>
                setSettings({ ...settings, dailyQuestionCount: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="하루 카드 수">
            <input
              className="w-full rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2"
              type="number"
              min={MIN_DAILY_CARDS}
              max={MAX_DAILY_CARDS}
              value={settings.dailyCardCount}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  dailyCardCount: normalizeDailyCardCount(Number(e.target.value)),
                })
              }
            />
          </Field>
          <Field label="하루 학습 시간(분)">
            <input
              className="w-full rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2"
              type="number"
              min={30}
              max={300}
              value={settings.dailyMinutes}
              onChange={(e) => setSettings({ ...settings, dailyMinutes: Number(e.target.value) })}
            />
          </Field>
          <Field label="계획 주수">
            <input
              className="w-full rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2"
              type="number"
              min={4}
              max={16}
              value={settings.planWeeks}
              onChange={(e) => setSettings({ ...settings, planWeeks: Number(e.target.value) })}
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

        <button type="button" className="btn btn-primary mt-4" disabled={busy} onClick={() => void save()}>
          설정 저장
        </button>
      </section>

      <section className="surface p-5">
        <h2 className="font-display text-xl">데이터</h2>
        <p className="mt-2 text-[var(--ink-muted)]">
          IndexedDB 학습 기록을 JSON으로 내보내거나 가져옵니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void onExport()}>
            JSON 내보내기
          </button>
          <label className="btn btn-secondary cursor-pointer">
            JSON 가져오기
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void onImportFile(file)
                e.target.value = ''
              }}
            />
          </label>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={async () => {
              if (!confirm('샘플 콘텐츠로 초기화하고 학습 기록을 지울까요?')) return
              setBusy(true)
              try {
                await restoreSampleData()
                const row = await db.settings.get('settings')
                if (row) {
                  const { id: _id, ...rest } = row
                  setSettings(settingsForForm(rest))
                }
                setMessage('샘플 데이터로 복원했습니다.')
              } finally {
                setBusy(false)
              }
            }}
          >
            샘플 복원
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={async () => {
              if (!confirm('모든 학습 데이터를 지우고 처음부터 시작할까요?')) return
              setBusy(true)
              try {
                await clearAllLearningData()
                const row = await db.settings.get('settings')
                if (row) {
                  const { id: _id, ...rest } = row
                  setSettings(settingsForForm(rest))
                }
                setMessage('학습 데이터를 초기화했습니다.')
              } finally {
                setBusy(false)
              }
            }}
          >
            전체 초기화
          </button>
        </div>
      </section>

      <section className="surface p-5">
        <h2 className="font-display text-xl">안내</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--ink-muted)]">
          <li>문항·카드는 자체 제작 학습 콘텐츠입니다.</li>
          <li>공식 한국사능력검정시험 기출 문장·이미지를 복사하지 않습니다.</li>
          <li>데이터는 이 브라우저의 IndexedDB에만 저장됩니다.</li>
        </ul>
      </section>

      {message ? (
        <p className="surface p-4 text-[var(--ink-muted)]" role="status">
          {message}
        </p>
      ) : null}
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
