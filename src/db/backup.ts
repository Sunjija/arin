import type { ExportPayload } from '../types'
import { db } from './database'
import { validateExportPayload } from '../lib/backupValidate'
import type { BackupRestoreResult } from '../types/contracts'

const TABLES = [
  'settings',
  'mastery',
  'cards',
  'wrongAnswers',
  'attempts',
  'studyDays',
  'mockResults',
  'activeSession',
  'activeMock',
  'lessonCompletions',
  'meta',
] as const

export async function exportAllData(): Promise<ExportPayload> {
  const [
    settingsRow,
    masteryRow,
    cards,
    wrongAnswers,
    attempts,
    studyDays,
    mockResults,
    sessions,
    mocks,
    lessonCompletions,
    meta,
  ] = await Promise.all([
    db.settings.get('settings'),
    db.mastery.get('mastery'),
    db.cards.toArray(),
    db.wrongAnswers.toArray(),
    db.attempts.toArray(),
    db.studyDays.toArray(),
    db.mockResults.toArray(),
    db.activeSession.toArray(),
    db.activeMock.toArray(),
    db.lessonCompletions.toArray(),
    db.meta.get('meta'),
  ])

  if (!settingsRow || !masteryRow || !meta) {
    throw new Error('내보낼 기본 데이터가 없습니다. 앱을 새로고침한 뒤 다시 시도하세요.')
  }

  const { id: _s, ...settings } = settingsRow
  const { id: _m, ...mastery } = masteryRow

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    settings,
    mastery,
    cards,
    wrongAnswers,
    attempts,
    studyDays,
    mockResults,
    activeSession: sessions[0] ?? null,
    meta,
    lessonCompletions,
    activeMock: mocks.find((row) => row.status === 'in-progress') ?? mocks[0] ?? null,
  }
}

export async function importAllData(payload: ExportPayload): Promise<void> {
  const restored = await restoreBackup(payload)
  if (!restored.ok) {
    throw new Error(restored.message)
  }
}

/** 검증 실패 시 기존 DB를 바꾸지 않는다. 복원과 전체 초기화는 다른 API다. */
export async function restoreBackup(raw: unknown): Promise<BackupRestoreResult> {
  const checked = validateExportPayload(raw)
  if (!checked.ok) {
    return { ok: false, code: 'import-invalid', message: checked.message }
  }
  const payload = checked.payload

  await db.transaction('rw', TABLES.map((name) => db.table(name)), async () => {
    await Promise.all([
      db.cards.clear(),
      db.wrongAnswers.clear(),
      db.attempts.clear(),
      db.studyDays.clear(),
      db.mockResults.clear(),
      db.activeSession.clear(),
      db.activeMock.clear(),
      db.lessonCompletions.clear(),
    ])

    await db.settings.put({ id: 'settings', ...payload.settings })
    await db.mastery.put({ id: 'mastery', ...payload.mastery })
    if (payload.cards.length) await db.cards.bulkPut(payload.cards)
    if (payload.wrongAnswers.length) await db.wrongAnswers.bulkPut(payload.wrongAnswers)
    if (payload.attempts.length) await db.attempts.bulkPut(payload.attempts)
    if (payload.studyDays.length) await db.studyDays.bulkPut(payload.studyDays)
    if (payload.mockResults.length) await db.mockResults.bulkPut(payload.mockResults)
    if (payload.activeSession) await db.activeSession.put(payload.activeSession)
    if (payload.activeMock) await db.activeMock.put(payload.activeMock)
    if (payload.lessonCompletions?.length) {
      await db.lessonCompletions.bulkPut(payload.lessonCompletions)
    }
    await db.meta.put(payload.meta)
  })

  return { ok: true, importedVersion: payload.version }
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
