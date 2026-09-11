import type { ExportPayload, MasteryScores } from '../types'
import { ALL_ERAS, ALL_TYPES } from '../types'
import { parseUserSettings } from './settingsValidation'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isIsoLike(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 8
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

export function parseMasteryScores(
  raw: unknown,
): { ok: true; value: MasteryScores } | { ok: false; message: string } {
  if (!isRecord(raw) || !isRecord(raw.eras) || !isRecord(raw.types)) {
    return { ok: false, message: '숙련도 기록이 없습니다.' }
  }
  const eras = {} as MasteryScores['eras']
  for (const era of ALL_ERAS) {
    const score = raw.eras[era]
    if (!isFiniteNumber(score) || score < 0 || score > 100) {
      return { ok: false, message: '숙련도 기록이 손상되었습니다.' }
    }
    eras[era] = score
  }
  const types = {} as MasteryScores['types']
  for (const type of ALL_TYPES) {
    const score = raw.types[type]
    if (!isFiniteNumber(score) || score < 0 || score > 100) {
      return { ok: false, message: '숙련도 기록이 손상되었습니다.' }
    }
    types[type] = score
  }
  return { ok: true, value: { eras, types } }
}

export function validateExportPayload(raw: unknown): { ok: true; payload: ExportPayload } | { ok: false; message: string } {
  if (!isRecord(raw)) return { ok: false, message: '백업 파일이 객체가 아닙니다.' }
  if (raw.version !== 1 && raw.version !== 2 && raw.version !== 3) {
    return { ok: false, message: '지원하지 않는 백업 버전입니다.' }
  }
  if (!isIsoLike(raw.exportedAt)) return { ok: false, message: '내보낸 시각이 없습니다.' }

  const settings = parseUserSettings(raw.settings)
  if (!settings.ok) return settings

  const mastery = parseMasteryScores(raw.mastery)
  if (!mastery.ok) return mastery

  if (!isRecord(raw.meta) || raw.meta.id !== 'meta') {
    return { ok: false, message: '메타 기록이 없습니다.' }
  }

  const arrays: Array<[string, unknown]> = [
    ['cards', raw.cards],
    ['wrongAnswers', raw.wrongAnswers],
    ['attempts', raw.attempts],
    ['studyDays', raw.studyDays],
    ['mockResults', raw.mockResults],
  ]
  for (const [name, value] of arrays) {
    if (!Array.isArray(value)) return { ok: false, message: `${name} 배열이 없습니다.` }
  }

  for (const card of raw.cards as unknown[]) {
    if (!isRecord(card) || !isId(card.id) || typeof card.front !== 'string' || typeof card.back !== 'string') {
      return { ok: false, message: '카드 기록이 손상되었습니다.' }
    }
  }
  for (const attempt of raw.attempts as unknown[]) {
    if (!isRecord(attempt) || !isId(attempt.id) || typeof attempt.questionId !== 'string') {
      return { ok: false, message: '시도 기록이 손상되었습니다.' }
    }
    if (typeof attempt.correct !== 'boolean') {
      return { ok: false, message: '시도 기록이 손상되었습니다.' }
    }
    if (attempt.responseMs != null && !isFiniteNumber(attempt.responseMs)) {
      return { ok: false, message: '풀이 시간이 올바르지 않습니다.' }
    }
  }
  for (const result of raw.mockResults as unknown[]) {
    if (!isRecord(result) || !isId(result.id) || (result.mode !== 'full' && result.mode !== 'sample')) {
      return { ok: false, message: '모의고사 기록이 손상되었습니다.' }
    }
    if (!isFiniteNumber(result.score) || result.score < 0 || result.score > 100 || !Array.isArray(result.answers)) {
      return { ok: false, message: '모의고사 점수 또는 답안이 손상되었습니다.' }
    }
  }
  if (raw.activeSession != null && (!isRecord(raw.activeSession) || !isId(raw.activeSession.id))) {
    return { ok: false, message: '학습 진행 기록이 손상되었습니다.' }
  }
  if (raw.activeMock != null && (!isRecord(raw.activeMock) || !isId(raw.activeMock.id))) {
    return { ok: false, message: '시험 진행 기록이 손상되었습니다.' }
  }
  if (raw.lessonCompletions != null) {
    if (!Array.isArray(raw.lessonCompletions)) return { ok: false, message: '단원 완료 기록이 손상되었습니다.' }
    for (const row of raw.lessonCompletions) {
      if (!isRecord(row) || !isId(row.lessonId)) return { ok: false, message: '단원 완료 기록이 손상되었습니다.' }
    }
  }

  if (raw.conceptProgress != null) {
    if (!Array.isArray(raw.conceptProgress)) return { ok: false, message: '개념 진도 기록이 손상되었습니다.' }
    for (const row of raw.conceptProgress) {
      if (!isRecord(row) || !isId(row.conceptId)) return { ok: false, message: '개념 진도 기록이 손상되었습니다.' }
    }
  }

  const payload: ExportPayload = {
    ...(raw as unknown as ExportPayload),
    version: raw.version === 3 ? 3 : raw.version === 2 ? 2 : 1,
    settings: settings.value,
    mastery: mastery.value,
  }
  return { ok: true, payload }
}
