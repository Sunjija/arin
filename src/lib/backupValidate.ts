import type { ExportPayload, MasteryScores } from '../types'
import { ALL_ERAS, ALL_TYPES } from '../types'
import { parseUserSettings } from './settingsValidation'
import { isDateKey } from './dates'

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

function idList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isId)
}

function validSnapshot(value: unknown): boolean {
  if (!isRecord(value)) return false
  return isId(value.questionId) && typeof value.stem === 'string' &&
    Array.isArray(value.choices) && value.choices.length > 1 && value.choices.every(choice => typeof choice === 'string') &&
    Number.isInteger(value.answerIndex) && Number(value.answerIndex) >= 0 && Number(value.answerIndex) < value.choices.length &&
    typeof value.explanation === 'string' && ALL_ERAS.includes(value.era as never) &&
    Array.isArray(value.tags) && value.tags.every(tag => ALL_TYPES.includes(tag as never)) &&
    [1, 2, 3].includes(Number(value.difficulty)) &&
    (value.conceptIds === undefined || idList(value.conceptIds)) &&
    (value.familyId === undefined || isId(value.familyId)) &&
    (value.contentVersion === undefined || (Number.isInteger(value.contentVersion) && Number(value.contentVersion) > 0))
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
    if (attempt.snapshot != null && (!validSnapshot(attempt.snapshot) || (attempt.snapshot as Record<string, unknown>).questionId !== attempt.questionId)) {
      return { ok: false, message: '시도 문항 원본이 손상되었습니다.' }
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
  for (const session of [raw.activeSession, raw.activeMock]) {
    if (!isRecord(session)) continue
    if (session.questionSnapshots !== undefined && (!Array.isArray(session.questionSnapshots) || !session.questionSnapshots.every(validSnapshot))) return { ok: false, message: '진행 중인 문항 원본이 손상되었습니다.' }
    for (const key of ['newQuestionIds', 'reviewQuestionIds']) {
      if (session[key] !== undefined && !idList(session[key])) return { ok: false, message: '학습 문항 범위가 손상되었습니다.' }
    }
  }
  for (const day of raw.studyDays as unknown[]) {
    if (!isRecord(day) || !isDateKey(day.date)) return { ok: false, message: '학습 날짜가 손상되었습니다.' }
    if (day.plan === undefined) continue
    const plan = day.plan
    if (!isRecord(plan) || !isDateKey(plan.date) || !isId(plan.currentLessonId) || !isId(plan.policyVersion)) return { ok: false, message: '저장된 학습 계획이 손상되었습니다.' }
    for (const key of ['currentConceptIds', 'newQuestionIds', 'reviewQuestionIds', 'reviewCardIds', 'reasons', 'warnings']) {
      if (!idList(plan[key])) return { ok: false, message: '저장된 학습 계획 목록이 손상되었습니다.' }
    }
    for (const key of ['newConceptCount', 'newQuestionCount', 'reviewQuestionCount', 'reviewCardCount', 'remainingNewLessons', 'missedStudyDays']) {
      if (!Number.isInteger(plan[key]) || Number(plan[key]) < 0) return { ok: false, message: '저장된 학습 계획 분량이 손상되었습니다.' }
    }
  }
  if (raw.lessonCompletions != null) {
    if (!Array.isArray(raw.lessonCompletions)) return { ok: false, message: '단원 완료 기록이 손상되었습니다.' }
    for (const row of raw.lessonCompletions) {
      if (!isRecord(row) || !isId(row.lessonId)) return { ok: false, message: '단원 완료 기록이 손상되었습니다.' }
    }
  }

  if (raw.conceptProgress != null) {
    if (!Array.isArray(raw.conceptProgress)) return { ok: false, message: '개념 진도 기록이 손상되었습니다.' }
    const seen = new Set<string>()
    for (const row of raw.conceptProgress) {
      if (!isRecord(row) || !isId(row.conceptId) || seen.has(row.conceptId) || !['unseen', 'learning', 'completed'].includes(String(row.learnState)) || (row.reviewMastery !== null && (!isFiniteNumber(row.reviewMastery) || row.reviewMastery < 0 || row.reviewMastery > 100))) return { ok: false, message: '개념 진도 기록이 손상되었습니다.' }
      seen.add(row.conceptId)
      for (const key of ['firstLearnedAt', 'completedAt', 'lastAttemptAt', 'viewedAt']) {
        const value = row[key]
        if (value !== null && (typeof value !== 'string' || !isDateKey(value.slice(0, 10)) || !Number.isFinite(Date.parse(value)))) return { ok: false, message: '개념 진도 날짜가 손상되었습니다.' }
      }
      if (row.lastAttemptId !== null && !isId(row.lastAttemptId)) return { ok: false, message: '개념 시도 연결이 손상되었습니다.' }
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
