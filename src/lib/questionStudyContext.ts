import type { ActiveSession, AttemptRecord, Question, QuestionSelectionReason, QuestionStudyContext } from '../types'
import { addDays, isDateKey, toDateKey } from './dates'
import { LEARNING_POLICY } from './learningPolicy'

export function answerDateKey(value: string): string | null {
  if (isDateKey(value)) return value
  if (typeof value !== 'string' || !isDateKey(value.slice(0, 10)) || !Number.isFinite(Date.parse(value))) return null
  return toDateKey(new Date(value))
}

/** An old wrong answer followed by a correct answer is not a recent unresolved error. */
export function recentWrongAttempts(attempts: AttemptRecord[], today: string): Map<string, AttemptRecord> {
  const latest = new Map<string, AttemptRecord>()
  for (const attempt of attempts) {
    const date = answerDateKey(attempt.createdAt)
    if (!date || date > today) continue
    const previous = latest.get(attempt.questionId)
    if (!previous || Date.parse(attempt.createdAt) > Date.parse(previous.createdAt) ||
      (Date.parse(attempt.createdAt) === Date.parse(previous.createdAt) && attempt.correct)) latest.set(attempt.questionId, attempt)
  }
  const cutoff = addDays(today, 1 - LEARNING_POLICY.recentWrongDays)
  return new Map([...latest].filter(([, attempt]) => !attempt.correct && answerDateKey(attempt.createdAt)! >= cutoff))
}

export function makeQuestionStudyContext(input: {
  question: Question
  reason: QuestionSelectionReason
  selectedOn: string
  attempts: AttemptRecord[]
  dueOn?: string | null
  lastWrongAt?: string | null
}): QuestionStudyContext {
  const { question, attempts } = input
  const history = [...new Map(attempts.map(attempt => [attempt.id, attempt])).values()]
  return {
    questionId: question.id,
    reason: input.reason,
    selectedOn: input.selectedOn,
    dueOn: input.reason === 'due-review' ? input.dueOn ?? null : null,
    lastWrongAt: input.reason === 'recent-wrong' ? input.lastWrongAt ?? null : null,
    priorAttemptCount: history.filter(attempt => attempt.questionId === question.id).length,
    similarQuestionAttemptCount: question.familyId
      ? history.filter(attempt => attempt.questionId !== question.id && attempt.snapshot?.familyId === question.familyId).length
      : null,
  }
}

export function questionContextCopy(context?: QuestionStudyContext) {
  if (!context) return {
    reasonLabel: '이어 풀던 문제',
    reasonDetail: '이전 학습에는 문제별 선정 이유를 저장하지 않았습니다.',
    historyLabel: '이전 풀이 횟수 미확인',
    historyDetail: '이 학습을 시작했을 때의 답안 기록이 없어 첫 풀이 여부를 구분하지 않습니다.',
  }
  const reasons: Record<QuestionSelectionReason, [string, string]> = {
    'new-concept': ['오늘 개념 확인', '오늘 배정된 개념을 이해했는지 확인하는 문제입니다.'],
    'lesson-practice': ['단원 확인', '직접 선택한 단원의 내용을 확인하는 문제입니다.'],
    'due-review': ['복습 예정일 도래', `${context.dueOn ?? '저장된 예정일'}에 복습하도록 정한 카드와 연결된 문제입니다.`],
    'recent-wrong': ['최근 오답 다시 확인', `선정 당시 마지막 답안(${context.lastWrongAt ? answerDateKey(context.lastWrongAt) : '최근'})이 오답이어서 다시 확인합니다.`],
    'review-practice': ['배운 범위 확인', '이미 배운 개념이나 풀어 본 문항에서 골라 다시 확인합니다.'],
  }
  const [reasonLabel, reasonDetail] = reasons[context.reason]
  const historyLabel = context.priorAttemptCount > 0 ? `다시 풀이 · 이전 ${context.priorAttemptCount}회` : '첫 풀이 기록'
  const similar = context.similarQuestionAttemptCount
  const historyDetail = `학습 시작 전 저장된 동일 문항 답안 기준입니다. ${similar === null
    ? '유사 문항의 풀이 여부는 아직 확인할 수 없습니다.'
    : similar > 0 ? `연결된 유사 문항의 답안이 ${similar}회 있습니다.` : '연결된 유사 문항의 답안 기록은 없습니다.'} 처음 본 자료나 실전 실력을 뜻하지는 않습니다.`
  return { reasonLabel, reasonDetail, historyLabel, historyDetail }
}

export function sessionExposureStats(session: Pick<ActiveSession, 'answered' | 'questionContexts'>) {
  const first = { total: 0, correct: 0 }
  const repeated = { total: 0, correct: 0 }
  const unknown = { total: 0, correct: 0 }
  for (const answer of new Map(session.answered.map(row => [row.questionId, row])).values()) {
    const context = session.questionContexts?.find(item => item.questionId === answer.questionId)
    const bucket = !context ? unknown : context.priorAttemptCount === 0 ? first : repeated
    bucket.total += 1
    bucket.correct += Number(answer.correct)
  }
  return { first, repeated, unknown }
}
