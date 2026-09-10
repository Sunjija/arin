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
  return typeof value === 'string' && value.trim().length > 0
}

const ERA_IDS = new Set<string>(ALL_ERAS)
const QUESTION_TYPES = new Set<string>(ALL_TYPES)
const CARD_KINDS = new Set(['king-to-deed', 'deed-to-king', 'chronology', 'concept'])
const CARD_RATINGS = new Set(['again', 'hard', 'good', 'easy'])
const WRONG_CAUSES = new Set(['first-time', 'confused-person', 'confused-order', 'missed-clue', 'unknown'])
const SESSION_STEPS = new Set(['cards', 'concept', 'quiz', 'result'])
const QUIZ_PHASES = new Set(['stem', 'era', 'clue', 'choices', 'feedback', 'cause'])

function isNonNegativeNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isIdArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isId)
}

function isEra(value: unknown): boolean {
  return typeof value === 'string' && ERA_IDS.has(value)
}

function isQuestionTags(value: unknown): boolean {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && QUESTION_TYPES.has(item))
}

function isOptionalBoolean(value: unknown): boolean {
  return value == null || typeof value === 'boolean'
}

function isOptionalString(value: unknown): boolean {
  return value == null || typeof value === 'string'
}

function isCountRecord(value: unknown): boolean {
  return isRecord(value) && isNonNegativeInteger(value.correct) &&
    isNonNegativeInteger(value.total) && value.correct <= value.total
}

function isFlashcard(value: unknown): boolean {
  if (!isRecord(value)) return false
  if (!isId(value.id) || typeof value.front !== 'string' || typeof value.back !== 'string' ||
    typeof value.kind !== 'string' || !CARD_KINDS.has(value.kind) || !isEra(value.era) ||
    !isQuestionTags(value.tags) || !isIsoLike(value.createdAt) || !isIsoLike(value.updatedAt) ||
    !isIsoLike(value.nextReviewAt) || !isNonNegativeNumber(value.intervalDays) ||
    !isNonNegativeInteger(value.easeStreak) || !isNonNegativeInteger(value.lapses) ||
    typeof value.fingerprint !== 'string' || !isOptionalBoolean(value.fromWrongAnswer) ||
    !isOptionalBoolean(value.userEdited)) return false
  if (value.lastRating != null && (typeof value.lastRating !== 'string' || !CARD_RATINGS.has(value.lastRating))) return false
  if (!isOptionalString(value.sourceQuestionId) || !isOptionalString(value.sourcePassage)) return false
  if (value.sourceChoices != null && !isStringArray(value.sourceChoices)) return false
  if (value.sourceAnswerIndex != null &&
    (!isNonNegativeInteger(value.sourceAnswerIndex) ||
      (Array.isArray(value.sourceChoices) && value.sourceAnswerIndex >= value.sourceChoices.length))) return false
  return true
}

function isWrongAnswer(value: unknown): boolean {
  return isRecord(value) && isId(value.id) && isId(value.questionId) &&
    isNonNegativeInteger(value.selectedIndex) && isNonNegativeInteger(value.correctIndex) &&
    typeof value.cause === 'string' && WRONG_CAUSES.has(value.cause) && isIsoLike(value.createdAt) &&
    typeof value.stem === 'string' && typeof value.explanation === 'string' && isEra(value.era) &&
    isQuestionTags(value.tags) && isOptionalBoolean(value.retryCorrect) && isOptionalString(value.retryAt)
}

function isAttempt(value: unknown): boolean {
  return isRecord(value) && isId(value.id) && isId(value.questionId) &&
    typeof value.correct === 'boolean' && isNonNegativeInteger(value.selectedIndex) &&
    (value.responseMs == null || isNonNegativeNumber(value.responseMs)) &&
    (value.responseMsSource == null || ['measured', 'legacy-untrusted', 'unavailable'].includes(String(value.responseMsSource))) &&
    (value.cause == null || (typeof value.cause === 'string' && WRONG_CAUSES.has(value.cause))) &&
    isEra(value.era) && isQuestionTags(value.tags) && isIsoLike(value.createdAt) &&
    (value.source === 'practice' || value.source === 'mock') && isOptionalString(value.resultId)
}

function isStudyDay(value: unknown): boolean {
  return isRecord(value) && isIsoLike(value.date) && typeof value.completed === 'boolean' &&
    isNonNegativeInteger(value.cardsReviewed) && typeof value.conceptDone === 'boolean' &&
    isNonNegativeInteger(value.questionsAnswered) && isNonNegativeInteger(value.correctCount) &&
    value.correctCount <= value.questionsAnswered && isOptionalString(value.lessonId) &&
    isNonNegativeNumber(value.minutesSpent) && isOptionalBoolean(value.minutesMeasured) &&
    (value.finishedSessionIds == null || isIdArray(value.finishedSessionIds))
}

function isMockAnswer(value: unknown): boolean {
  return isRecord(value) && isId(value.questionId) &&
    (value.selectedIndex == null || isNonNegativeInteger(value.selectedIndex)) && typeof value.correct === 'boolean'
}

function isStatsMap(value: unknown, allowedKeys: Set<string>): boolean {
  return isRecord(value) && Object.entries(value).every(([key, count]) => allowedKeys.has(key) && isCountRecord(count))
}

function isMockResult(value: unknown): boolean {
  return isRecord(value) && isId(value.id) && isIsoLike(value.createdAt) &&
    (value.mode === 'full' || value.mode === 'sample') && isNonNegativeInteger(value.total) &&
    isNonNegativeInteger(value.correct) && value.correct <= value.total && isFiniteNumber(value.score) &&
    value.score >= 0 && value.score <= 100 && isNonNegativeNumber(value.durationSec) &&
    Array.isArray(value.answers) && value.answers.length === value.total && value.answers.every(isMockAnswer) &&
    isStatsMap(value.byEra, ERA_IDS) && isStatsMap(value.byType, QUESTION_TYPES)
}

function isSessionAnswer(value: unknown): boolean {
  return isRecord(value) && isId(value.questionId) && typeof value.correct === 'boolean' &&
    isNonNegativeInteger(value.selectedIndex) && (value.responseMs == null || isNonNegativeNumber(value.responseMs)) &&
    (value.cause == null || (typeof value.cause === 'string' && WRONG_CAUSES.has(value.cause))) &&
    (value.eraGuess == null || isEra(value.eraGuess)) && isOptionalString(value.clueMemo) &&
    isOptionalString(value.attemptId)
}

function isActiveSession(value: unknown): boolean {
  if (!isRecord(value) || !isId(value.id) || !isIsoLike(value.date) || typeof value.step !== 'string' ||
    !SESSION_STEPS.has(value.step) || !isId(value.lessonId) || !isIdArray(value.cardIds) ||
    !isNonNegativeInteger(value.cardIndex) || value.cardIndex > value.cardIds.length ||
    typeof value.conceptDone !== 'boolean' || typeof value.conceptMemo !== 'string' ||
    !isIdArray(value.questionIds) || !isNonNegativeInteger(value.questionIndex) ||
    value.questionIndex > Math.max(0, value.questionIds.length - 1) || typeof value.quizPhase !== 'string' ||
    !QUIZ_PHASES.has(value.quizPhase) || typeof value.clueMemo !== 'string' ||
    typeof value.revealedChoices !== 'boolean' || !Array.isArray(value.answered) ||
    !value.answered.every(isSessionAnswer) || !isIsoLike(value.startedAt) || !isIsoLike(value.updatedAt)) return false
  if (value.eraGuess != null && !isEra(value.eraGuess)) return false
  if (value.selectedIndex != null && !isNonNegativeInteger(value.selectedIndex)) return false
  return value.entryMode == null || value.entryMode === 'daily' || value.entryMode === 'review'
}

function isQuestionSnapshot(value: unknown): boolean {
  return isRecord(value) && isId(value.questionId) && typeof value.stem === 'string' &&
    isOptionalString(value.passage) && isStringArray(value.choices) && value.choices.length > 0 &&
    isNonNegativeInteger(value.answerIndex) && value.answerIndex < value.choices.length &&
    typeof value.explanation === 'string' && isEra(value.era) && isQuestionTags(value.tags) &&
    (value.difficulty === 1 || value.difficulty === 2 || value.difficulty === 3) &&
    isOptionalString(value.lessonId)
}

function isActiveMock(value: unknown): boolean {
  if (!isRecord(value) || !isId(value.id) || !Number.isInteger(value.revision) || (value.revision as number) < 1 ||
    (value.mode !== 'full' && value.mode !== 'sample') ||
    (value.status !== 'in-progress' && value.status !== 'submitted') ||
    !Array.isArray(value.questionSnapshots) || value.questionSnapshots.length === 0 ||
    !value.questionSnapshots.every(isQuestionSnapshot) || !Array.isArray(value.answers) ||
    value.answers.length !== value.questionSnapshots.length ||
    !value.answers.every((answer) => answer == null || isNonNegativeInteger(answer)) ||
    !Array.isArray(value.itemElapsedMs) || value.itemElapsedMs.length !== value.questionSnapshots.length ||
    !value.itemElapsedMs.every((elapsed) => elapsed == null || isNonNegativeNumber(elapsed)) ||
    !isNonNegativeInteger(value.currentIndex) || value.currentIndex >= value.questionSnapshots.length ||
    !isIsoLike(value.startedAt) || !isIsoLike(value.deadlineAt) || !isIsoLike(value.updatedAt) ||
    !isOptionalString(value.submittedResultId)) return false
  const questionSnapshots = value.questionSnapshots
  const answers = value.answers
  return answers.every((answer, index) => {
    if (answer == null) return true
    const snapshot = questionSnapshots[index]
    return isRecord(snapshot) && Array.isArray(snapshot.choices) && answer < snapshot.choices.length
  })
}

function isLessonCompletion(value: unknown): boolean {
  return isRecord(value) && isId(value.lessonId) && isIsoLike(value.firstCompletedAt) &&
    isIsoLike(value.lastCompletedAt) && Number.isInteger(value.completionCount) &&
    (value.completionCount as number) > 0
}

function isMeta(value: unknown): boolean {
  return isRecord(value) && value.id === 'meta' && isIsoLike(value.seededAt) &&
    (value.contentVersion == null || isNonNegativeInteger(value.contentVersion)) &&
    isNonNegativeInteger(value.streak) && (value.lastStudyDate == null || isIsoLike(value.lastStudyDate)) &&
    isFiniteNumber(value.estimatedScore) && value.estimatedScore >= 0 && value.estimatedScore <= 100
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
  if (raw.version !== 1 && raw.version !== 2) {
    return { ok: false, message: '지원하지 않는 백업 버전입니다.' }
  }
  if (!isIsoLike(raw.exportedAt)) return { ok: false, message: '내보낸 시각이 없습니다.' }

  const settings = parseUserSettings(raw.settings)
  if (!settings.ok) return settings

  const mastery = parseMasteryScores(raw.mastery)
  if (!mastery.ok) return mastery

  if (!isMeta(raw.meta)) return { ok: false, message: '메타 기록이 손상되었습니다.' }

  const collections: Array<[string, unknown, (item: unknown) => boolean]> = [
    ['카드', raw.cards, isFlashcard],
    ['오답', raw.wrongAnswers, isWrongAnswer],
    ['시도', raw.attempts, isAttempt],
    ['학습일', raw.studyDays, isStudyDay],
    ['모의고사', raw.mockResults, isMockResult],
  ]
  for (const [label, value, validator] of collections) {
    if (!Array.isArray(value)) return { ok: false, message: `${label} 기록 배열이 없습니다.` }
    if (!value.every(validator)) return { ok: false, message: `${label} 기록이 손상되었습니다.` }
  }
  if (raw.activeSession != null && !isActiveSession(raw.activeSession)) {
    return { ok: false, message: '학습 진행 기록이 손상되었습니다.' }
  }
  if (raw.activeMock != null && !isActiveMock(raw.activeMock)) {
    return { ok: false, message: '시험 진행 기록이 손상되었습니다.' }
  }
  if (raw.lessonCompletions != null) {
    if (!Array.isArray(raw.lessonCompletions) || !raw.lessonCompletions.every(isLessonCompletion)) {
      return { ok: false, message: '단원 완료 기록이 손상되었습니다.' }
    }
  }

  const payload: ExportPayload = {
    ...(raw as unknown as ExportPayload),
    version: raw.version === 2 ? 2 : 1,
    settings: settings.value,
    mastery: mastery.value,
  }
  return { ok: true, payload }
}
