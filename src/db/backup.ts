import type { ExportPayload } from '../types'
import { db } from './database'

export async function exportAllData(): Promise<ExportPayload> {
  const [settingsRow, masteryRow, cards, wrongAnswers, attempts, studyDays, mockResults, sessions, meta] =
    await Promise.all([
      db.settings.get('settings'),
      db.mastery.get('mastery'),
      db.cards.toArray(),
      db.wrongAnswers.toArray(),
      db.attempts.toArray(),
      db.studyDays.toArray(),
      db.mockResults.toArray(),
      db.activeSession.toArray(),
      db.meta.get('meta'),
    ])

  if (!settingsRow || !masteryRow || !meta) {
    throw new Error('내보낼 기본 데이터가 없습니다. 앱을 새로고침한 뒤 다시 시도하세요.')
  }

  const { id: _s, ...settings } = settingsRow
  const { id: _m, ...mastery } = masteryRow

  return {
    version: 1,
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
  }
}

export async function importAllData(payload: ExportPayload): Promise<void> {
  if (payload.version !== 1) {
    throw new Error('지원하지 않는 백업 버전입니다.')
  }

  await db.transaction(
    'rw',
    [
      db.settings,
      db.mastery,
      db.cards,
      db.wrongAnswers,
      db.attempts,
      db.studyDays,
      db.mockResults,
      db.activeSession,
      db.meta,
    ],
    async () => {
      await Promise.all([
        db.cards.clear(),
        db.wrongAnswers.clear(),
        db.attempts.clear(),
        db.studyDays.clear(),
        db.mockResults.clear(),
        db.activeSession.clear(),
      ])

      await db.settings.put({ id: 'settings', ...payload.settings })
      await db.mastery.put({ id: 'mastery', ...payload.mastery })
      if (payload.cards.length) await db.cards.bulkPut(payload.cards)
      if (payload.wrongAnswers.length) await db.wrongAnswers.bulkPut(payload.wrongAnswers)
      if (payload.attempts.length) await db.attempts.bulkPut(payload.attempts)
      if (payload.studyDays.length) await db.studyDays.bulkPut(payload.studyDays)
      if (payload.mockResults.length) await db.mockResults.bulkPut(payload.mockResults)
      if (payload.activeSession) await db.activeSession.put(payload.activeSession)
      await db.meta.put(payload.meta)
    },
  )
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
