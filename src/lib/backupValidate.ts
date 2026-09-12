import type { ExportPayload, MasteryScores } from '../types'
import { ALL_ERAS, ALL_TYPES } from '../types'
import { parseUserSettings } from './settingsValidation'
import { isDateKey } from './dates'
import { isLibraryPracticeSession } from './libraryPracticeValidation'
import { isQuestionSnapshot as validSnapshot } from './questionSnapshot'
import { validQuestionContexts } from './questionStudyContextValidation'

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


function validGuide(value: unknown): value is import('../types').LessonGuide {
  if (!isRecord(value) || !isId(value.lessonId) || !Number.isInteger(value.contentVersion) || Number(value.contentVersion) < 1 || !['draft', 'source-checked', 'approved'].includes(String(value.reviewStatus)) || !isDateKey(value.checkedAt) || typeof value.introduction !== 'string' || !Array.isArray(value.sections) || value.sections.length === 0) return false
  return value.sections.every(section => isRecord(section) && isId(section.conceptId) && isId(section.title) && idList(section.paragraphs) && section.paragraphs.length > 0 && isId(section.recallPrompt) && idList(section.expectedElements) && section.expectedElements.length > 0 && typeof section.sourceUrl === 'string' && /^https?:\/\//.test(section.sourceUrl) && (section.additionalSourceUrls === undefined || idList(section.additionalSourceUrls)))
}

function validConceptSchedule(value: unknown): boolean {
  if (!isRecord(value) || !isId(value.courseVersion) || !isDateKey(value.targetDate) || typeof value.isStudyDay !== 'boolean' || !idList(value.availableTodayIds) || !idList(value.warnings)) return false
  for (const key of ['totalConcepts', 'completedConcepts', 'remainingConcepts', 'readyRemainingConcepts', 'unavailableConcepts', 'studyDaysLeft', 'selectedPerDay']) {
    if (!Number.isInteger(value[key]) || Number(value[key]) < 0) return false
  }
  if (Number(value.selectedPerDay) < 1 || Number(value.selectedPerDay) > 20) return false
  if (value.recommendedPerDay !== null && (!Number.isInteger(value.recommendedPerDay) || Number(value.recommendedPerDay) < 0)) return false
  for (const key of ['nextConceptId', 'blockedConceptId']) if (value[key] !== null && !isId(value[key])) return false
  for (const key of ['readyContentFinishDate', 'allContentReadyFinishDate']) if (value[key] !== null && !isDateKey(value[key])) return false
  return Number(value.completedConcepts) + Number(value.remainingConcepts) === value.totalConcepts && Number(value.readyRemainingConcepts) + Number(value.unavailableConcepts) === value.remainingConcepts
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
  if (raw.version !== 1 && raw.version !== 2 && raw.version !== 3 && raw.version !== 4) {
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
    if (result.questionSnapshots !== undefined) {
      const snapshots = result.questionSnapshots
      const answers = result.answers
      if (!Array.isArray(snapshots) || snapshots.length !== result.total || snapshots.length !== result.answers.length ||
        !snapshots.every(validSnapshot) || snapshots.some((snapshot, index) => {
          const answer = answers[index]
          return !isRecord(answer) || answer.questionId !== snapshot.questionId ||
            (answer.selectedIndex !== null && (!Number.isInteger(answer.selectedIndex) || Number(answer.selectedIndex) < 0 || Number(answer.selectedIndex) >= snapshot.choices.length)) ||
            answer.correct !== (answer.selectedIndex !== null && answer.selectedIndex === snapshot.answerIndex) ||
            (snapshot.priorAttemptCount !== undefined && (!Number.isInteger(snapshot.priorAttemptCount) || snapshot.priorAttemptCount < 0))
        })) return { ok: false, message: '모의고사 문항 원본 또는 답안이 손상되었습니다.' }
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
  if (isRecord(raw.activeSession)) {
    const session = raw.activeSession
    if (session.revision !== undefined && (!Number.isSafeInteger(session.revision) || Number(session.revision) < 0)) return { ok: false, message: '학습 진행 버전이 손상되었습니다.' }
    if (session.questionContexts !== undefined && !validQuestionContexts(session.questionContexts, session.questionIds, session.newQuestionIds, session.reviewQuestionIds)) return { ok: false, message: '문제 선정 이유 또는 풀이 이력이 손상되었습니다.' }
    if (session.conceptIds !== undefined || session.guideSnapshots !== undefined || session.confirmedConceptIds !== undefined) {
      if (!idList(session.conceptIds) || new Set(session.conceptIds).size !== session.conceptIds.length || !idList(session.confirmedConceptIds) || !session.confirmedConceptIds.every(id => (session.conceptIds as string[]).includes(id)) || !Array.isArray(session.guideSnapshots) || !session.guideSnapshots.every(validGuide)) return { ok: false, message: '진행 중인 개념 원본이 손상되었습니다.' }
      const snapshotIds = session.guideSnapshots.flatMap(guide => guide.sections.map(section => section.conceptId))
      if (snapshotIds.length !== session.conceptIds.length || new Set(snapshotIds).size !== snapshotIds.length || !snapshotIds.every(id => (session.conceptIds as string[]).includes(id))) return { ok: false, message: '개념 범위와 원본이 일치하지 않습니다.' }
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
    if (plan.conceptSchedule !== undefined && !validConceptSchedule(plan.conceptSchedule)) return { ok: false, message: '개념 분량 계획이 손상되었습니다.' }
    if (plan.questionContexts !== undefined && !validQuestionContexts(plan.questionContexts, [...plan.newQuestionIds as string[], ...plan.reviewQuestionIds as string[]], plan.newQuestionIds, plan.reviewQuestionIds)) return { ok: false, message: '계획의 문제 선정 이유 또는 풀이 이력이 손상되었습니다.' }
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

  if (raw.version === 4 || raw.libraryPractice !== undefined) {
    if (!Array.isArray(raw.libraryPractice)) return { ok: false, message: '자료실 진행 목록이 없습니다.' }
    const lessons = new Set<string>()
    const sessions = new Set<string>()
    const attempts = raw.attempts as ExportPayload['attempts']
    for (const session of raw.libraryPractice) {
      if (!isLibraryPracticeSession(session) || lessons.has(session.lessonId) || sessions.has(session.id)) return { ok: false, message: '자료실 진행 기록이 손상되었습니다.' }
      lessons.add(session.lessonId)
      sessions.add(session.id)
      for (const [index, answer] of session.answers.entries()) {
        const matching = attempts.filter(attempt => attempt.id === answer.attemptId)
        const attempt = matching[0]
        const snapshot = session.questionSnapshots[index]!
        if (matching.length !== 1 || !attempt || attempt.learningSource !== 'library' || attempt.questionId !== answer.questionId || attempt.selectedIndex !== answer.selectedIndex || attempt.correct !== answer.correct || attempt.snapshot?.lessonId !== session.lessonId || attempt.snapshot.answerIndex !== snapshot.answerIndex || JSON.stringify(attempt.snapshot.choices) !== JSON.stringify(snapshot.choices)) return { ok: false, message: '자료실 진행과 답안 기록이 일치하지 않습니다.' }
      }
    }
  }

  const payload: ExportPayload = {
    ...(raw as unknown as ExportPayload),
    version: raw.version,
    libraryPractice: (raw.libraryPractice as ExportPayload['libraryPractice']) ?? [],
    settings: settings.value,
    mastery: mastery.value,
  }
  return { ok: true, payload }
}
