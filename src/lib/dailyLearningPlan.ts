import type { TopicEntry } from '../data/topicCatalog'
import type {
  ActiveSession,
  AttemptRecord,
  FlashcardRecord,
  Lesson,
  Question,
  StudyDayRecord,
  UserSettings,
} from '../types'
import type {
  DailyPlanItem,
  FrozenDailyPlan,
  MixBasis,
  QuestionUseClass,
} from '../types/dailyLearning'
import { conceptTitle, conceptsForLesson, lessonConceptId, primaryConcept } from './conceptMapping'
import { DAILY_LEARNING_POLICY, DAILY_LEARNING_POLICY_VERSION } from './dailyLearningPolicy'
import { daysBetween, isDue } from './dates'
import { computeExamPressure } from './examPressure'
import { normalizeDailyCardCount } from './studyLimits'

export interface DailyPlanInput {
  today: string
  nowIso: string
  settings: UserSettings
  lessons: Lesson[]
  topics: TopicEntry[]
  cards: FlashcardRecord[]
  questions: Question[]
  attempts: AttemptRecord[]
  studyDays: StudyDayRecord[]
  existingPlan?: FrozenDailyPlan | null
  existingSession?: ActiveSession | null
  questionClasses: Map<string, QuestionUseClass>
  actualMinuteSamples: number[]
  mixBasis?: MixBasis
}

function byId<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]))
}

function unique(ids: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of ids) {
    if (seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

function completedLessonIds(days: StudyDayRecord[]): Set<string> {
  const ids = new Set<string>()
  for (const day of days) {
    if (day.conceptDone && day.lessonId) ids.add(day.lessonId)
    for (const item of day.plan?.items ?? []) {
      if (item.kind === 'new-concept' && item.completed && item.lessonId) {
        ids.add(item.lessonId)
      }
    }
  }
  return ids
}

function cardConceptId(card: FlashcardRecord, topics: TopicEntry[], lessons: Lesson[]): string {
  const lesson = lessons.find((item) => item.era === card.era)
  const blob = `${card.front}\n${card.back}`
  const fromLesson = lesson ? conceptsForLesson(lesson.id, topics) : topics.filter((t) => t.era === card.era)
  const matched = fromLesson.find((topic) => topic.keywords.some((k) => k.length >= 2 && blob.includes(k)))
  return matched?.id ?? fromLesson[0]?.id ?? card.era
}

function estimateMinutes(
  items: DailyPlanItem[],
  samples: number[],
): { minutes: number; kind: 'heuristic' | 'calibrated' } {
  const cards = items.reduce((sum, item) => sum + item.cardIds.length, 0)
  const questions = items.reduce((sum, item) => sum + item.questionIds.length, 0)
  const news = items.filter((item) => item.kind === 'new-concept').length
  const heuristic = Math.round(
    cards * DAILY_LEARNING_POLICY.minutesPerReviewCard +
      questions * DAILY_LEARNING_POLICY.minutesPerQuestion +
      news * DAILY_LEARNING_POLICY.minutesPerNewConcept,
  )
  if (samples.length >= DAILY_LEARNING_POLICY.calibratedAfterStudyDays) {
    const avg = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length)
    return { minutes: Math.max(8, Math.round(heuristic * 0.4 + avg * 0.6)), kind: 'calibrated' }
  }
  return { minutes: Math.max(8, heuristic), kind: 'heuristic' }
}

function practiceQuestionsForLesson(
  questions: Question[],
  lessonId: string,
  classes: Map<string, QuestionUseClass>,
): Question[] {
  return questions
    .filter((question) => question.lessonId === lessonId)
    .filter((question) => classes.get(question.id)?.practiceOk !== false)
    .sort((a, b) => a.id.localeCompare(b.id))
}

function recentWeakConcepts(input: DailyPlanInput): Array<{ conceptId: string; title: string; lessonId?: string }> {
  const cutoff = input.today
  const ranked = new Map<string, { title: string; lessonId?: string; at: string }>()
  for (const attempt of input.attempts) {
    const day = attempt.createdAt.slice(0, 10)
    if (daysBetween(day, cutoff) > DAILY_LEARNING_POLICY.weakLookbackDays) continue
    const weak =
      !attempt.correct ||
      attempt.outcomeKind === 'unsure-correct' ||
      attempt.confidence === 'unsure'
    if (!weak) continue
    const question = input.questions.find((item) => item.id === attempt.questionId)
    if (!question) continue
    const concept = primaryConcept(question, input.topics)
    const conceptId = concept?.id ?? question.lessonId ?? question.era
    const prev = ranked.get(conceptId)
    if (!prev || attempt.createdAt > prev.at) {
      ranked.set(conceptId, {
        title: concept?.title ?? question.lessonId ?? conceptId,
        lessonId: question.lessonId,
        at: attempt.createdAt,
      })
    }
  }
  return [...ranked.entries()]
    .sort((a, b) => b[1].at.localeCompare(a[1].at) || a[0].localeCompare(b[0]))
    .map(([conceptId, row]) => ({ conceptId, title: row.title, lessonId: row.lessonId }))
}

function nextLessons(input: DailyPlanInput, done: Set<string>): Lesson[] {
  return [...input.lessons]
    .sort((a, b) => a.week - b.week || a.dayOrder - b.dayOrder || a.id.localeCompare(b.id))
    .filter((lesson) => !done.has(lesson.id))
}

function pickTransfer(input: DailyPlanInput, learnedLessonIds: Set<string>): DailyPlanItem[] {
  const items: DailyPlanItem[] = []
  const seenQuestionIds = new Set(input.attempts.map((attempt) => attempt.questionId))
  const seenFormatsByLesson = new Map<string, Set<string>>()
  for (const attempt of input.attempts) {
    const live = input.questions.find((q) => q.id === attempt.questionId)
    const lessonId = live?.lessonId ?? attempt.questionSnapshot?.lessonId
    const formatId = live?.formatId ?? attempt.questionSnapshot?.formatId
    if (!lessonId || !formatId) continue
    const set = seenFormatsByLesson.get(lessonId) ?? new Set<string>()
    set.add(formatId)
    seenFormatsByLesson.set(lessonId, set)
  }

  for (const lessonId of [...learnedLessonIds].sort()) {
    if (items.length >= DAILY_LEARNING_POLICY.maxTransferItems) break
    const pool = practiceQuestionsForLesson(input.questions, lessonId, input.questionClasses)
    const approvedNew = pool.filter((question) => {
      const cls = input.questionClasses.get(question.id)
      const usedFormat = seenFormatsByLesson.get(lessonId)
      return (
        cls?.examApproved &&
        !seenQuestionIds.has(question.id) &&
        question.formatId &&
        usedFormat &&
        !usedFormat.has(question.formatId)
      )
    })
    const unseenPractice = pool.filter((question) => !seenQuestionIds.has(question.id))
    const conceptId = lessonConceptId(
      input.lessons.find((lesson) => lesson.id === lessonId) ?? input.lessons[0]!,
      input.topics,
    )
    const title = conceptTitle(conceptId, input.topics, input.lessons)

    if (approvedNew[0]) {
      const question = approvedNew[0]
      items.push({
        id: `transfer:${question.id}`,
        kind: 'transfer',
        conceptId,
        conceptTitle: title,
        lessonId,
        cardIds: [],
        questionIds: [question.id],
        reason: `${title}을 다른 자료 형식에서 적용해 봅니다.`,
        sourceNote: 'approved-transfer',
      })
      continue
    }

    if (unseenPractice[0]) {
      items.push({
        id: `transfer-pending:${lessonId}`,
        kind: 'transfer',
        conceptId,
        conceptTitle: title,
        lessonId,
        cardIds: [],
        questionIds: [],
        reason: `${title} 적용 평가용 검수 문항이 아직 없습니다.`,
        sourceNote: 'not-ready',
      })
      continue
    }

    if (pool[0]) {
      items.push({
        id: `transfer-reuse:${pool[0].id}`,
        kind: 'transfer',
        conceptId,
        conceptTitle: title,
        lessonId,
        cardIds: [],
        questionIds: [pool[0].id],
        reason: `${title}은 새 자료 문항이 없어 기존 문항 재복습입니다.`,
        sourceNote: 'reuse',
      })
    }
  }
  return items
}

function buildFresh(input: DailyPlanInput): FrozenDailyPlan {
  const doneLessons = completedLessonIds(input.studyDays)
  const examPressure = computeExamPressure({
    today: input.today,
    settings: input.settings,
    lessons: input.lessons,
    completedLessonIds: doneLessons,
  })
  const dailyCardCount = normalizeDailyCardCount(input.settings.dailyCardCount)
  const reviewCap = Math.min(DAILY_LEARNING_POLICY.maxReviewItems, dailyCardCount)
  const dueCards = input.cards
    .filter((card) => isDue(card.nextReviewAt, input.today))
    .sort(
      (a, b) =>
        a.nextReviewAt.localeCompare(b.nextReviewAt) ||
        b.lapses - a.lapses ||
        a.id.localeCompare(b.id),
    )
  const takenCards = dueCards.slice(0, reviewCap)
  const overdueDeferredCount = Math.max(0, dueCards.length - takenCards.length)

  const items: DailyPlanItem[] = []
  const usedConcepts = new Set<string>()

  const grouped = new Map<string, FlashcardRecord[]>()
  for (const due of takenCards) {
    const conceptId = cardConceptId(due, input.topics, input.lessons)
    const list = grouped.get(conceptId) ?? []
    list.push(due)
    grouped.set(conceptId, list)
  }
  for (const [conceptId, group] of grouped) {
    const representative = group[0]!
    const title = conceptTitle(conceptId, input.topics, input.lessons)
    const lesson = input.lessons.find((item) => item.era === representative.era)
    const questionIds = lesson
      ? practiceQuestionsForLesson(input.questions, lesson.id, input.questionClasses)
          .slice(0, 1)
          .map((q) => q.id)
      : []
    const confused = group.some(
      (due) => due.lastRating === 'hard' || due.lastRating === 'again' || due.lapses > 0,
    )
    items.push({
      id: `review:${conceptId}`,
      kind: 'review-due',
      conceptId,
      conceptTitle: title,
      lessonId: lesson?.id,
      cardIds: group.map((due) => due.id),
      questionIds,
      reason: confused
        ? `지난번 헷갈렸던 ${title}을 먼저 복습해요.`
        : `복습 시점이 된 ${title}을 확인해요.`,
    })
    usedConcepts.add(conceptId)
  }

  const weakSlots = Math.max(
    0,
    Math.round(reviewCap * 0.35) - items.filter((item) => item.kind === 'recent-weak').length,
  )
  for (const weak of recentWeakConcepts(input)) {
    if (items.filter((item) => item.kind === 'recent-weak').length >= Math.max(1, weakSlots)) break
    if (usedConcepts.has(weak.conceptId)) continue
    const questionIds = weak.lessonId
      ? practiceQuestionsForLesson(input.questions, weak.lessonId, input.questionClasses)
          .slice(0, 1)
          .map((q) => q.id)
      : []
    items.push({
      id: `weak:${weak.conceptId}`,
      kind: 'recent-weak',
      conceptId: weak.conceptId,
      conceptTitle: weak.title,
      lessonId: weak.lessonId,
      cardIds: [],
      questionIds,
      reason: `최근에 틀렸거나 확신 없이 맞힌 ${weak.title}을 다시 확인해요.`,
    })
    usedConcepts.add(weak.conceptId)
  }

  let newCap: number = DAILY_LEARNING_POLICY.maxNewConcepts
  if (input.settings.experienceLevel === 'first-time') {
    newCap = Math.min(newCap, DAILY_LEARNING_POLICY.firstTimeNewConceptCap)
  }
  if (examPressure.examDate && examPressure.daysLeft != null && !examPressure.feasible) {
    newCap = Math.min(newCap, overdueDeferredCount > 0 ? 1 : newCap)
  }
  if (
    examPressure.daysLeft != null &&
    examPressure.daysLeft <= DAILY_LEARNING_POLICY.examUrgentDays &&
    overdueDeferredCount > 0
  ) {
    newCap = Math.min(newCap, 1)
  }

  const upcoming = nextLessons(input, doneLessons)
  for (const lesson of upcoming.slice(0, newCap)) {
    const conceptId = lessonConceptId(lesson, input.topics)
    const questionIds = practiceQuestionsForLesson(input.questions, lesson.id, input.questionClasses)
      .slice(0, Math.max(1, Math.round(input.settings.dailyQuestionCount * DAILY_LEARNING_POLICY.newShare)))
      .map((q) => q.id)
    items.push({
      id: `new:${lesson.id}`,
      kind: 'new-concept',
      conceptId,
      conceptTitle: lesson.title,
      lessonId: lesson.id,
      cardIds: [],
      questionIds,
      reason: `학습 순서상 다음 단원 ${lesson.title}을 새로 봐요.`,
    })
  }

  items.push(...pickTransfer(input, doneLessons))

  const questionCap = input.settings.dailyQuestionCount
  let usedQuestions = 0
  for (const item of items) {
    if (usedQuestions >= questionCap) {
      item.questionIds = []
      continue
    }
    const room = questionCap - usedQuestions
    item.questionIds = unique(item.questionIds).slice(0, room)
    usedQuestions += item.questionIds.length
  }

  let working = items
  let { minutes, kind } = estimateMinutes(working, input.actualMinuteSamples)
  if (minutes > input.settings.dailyMinutes) {
    working = working.filter((item) => item.kind !== 'transfer' || item.sourceNote === 'approved-transfer')
    ;({ minutes, kind } = estimateMinutes(working, input.actualMinuteSamples))
  }
  if (minutes > input.settings.dailyMinutes) {
    const news = working.filter((item) => item.kind === 'new-concept')
    if (news.length > 1) {
      working = working.filter((item) => item.id !== news.at(-1)?.id)
      ;({ minutes, kind } = estimateMinutes(working, input.actualMinuteSamples))
    }
  }

  const composition = {
    reviewDue: working.filter((item) => item.kind === 'review-due').length,
    recentWeak: working.filter((item) => item.kind === 'recent-weak').length,
    newConcept: working.filter((item) => item.kind === 'new-concept').length,
    transfer: working.filter((item) => item.kind === 'transfer').length,
  }

  const warnings: string[] = []
  const contentNotes: string[] = []
  if (dueCards.length === 0) warnings.push('오늘 도래한 복습 카드가 없습니다.')
  if (upcoming.length === 0) warnings.push('새로 배울 단원이 더 없습니다.')
  if (composition.transfer === 0) {
    contentNotes.push('다른 자료에 적용하는 평가는 아직 준비되지 않았습니다.')
  }
  for (const item of working) {
    if (item.sourceNote === 'not-ready') {
      contentNotes.push(`${item.conceptTitle} 적용 평가는 검수된 새 문항이 없어 건너뜁니다.`)
    }
    if (item.sourceNote === 'reuse') {
      contentNotes.push(`${item.conceptTitle}은 기존 문항 재복습입니다. 실전 숙달이 아닙니다.`)
    }
  }
  if (![...input.questionClasses.values()].some((cls) => cls.examApproved)) {
    contentNotes.push('사람 검수를 통과한 실전 승인 문항이 없습니다. 연습 문항만 사용합니다.')
  }
  if (overdueDeferredCount > 0) {
    warnings.push(
      `밀린 복습 ${overdueDeferredCount}개는 오늘 분량 밖으로 남겨 두었습니다. 완료 처리하거나 기록에서 제거하지 않았습니다.`,
    )
  }
  if (input.mixBasis && input.mixBasis !== 'analyzed') {
    contentNotes.push('문항 구성 비율은 은행 작성용 임시 목표이며 공식 출제 비율이 아닙니다.')
  }

  const reasons = unique(working.map((item) => item.reason)).slice(0, 4)

  return {
    policyVersion: DAILY_LEARNING_POLICY_VERSION,
    date: input.today,
    createdAt: input.nowIso,
    items: working,
    composition,
    estimatedMinutes: minutes,
    estimateKind: kind,
    overdueDeferredCount,
    reasons,
    warnings,
    contentNotes: unique(contentNotes),
    examPressure,
    mixBasis: input.mixBasis ?? 'provisional',
  }
}

function sessionIds(session: ActiveSession | null | undefined): { cards: Set<string>; questions: Set<string> } {
  return {
    cards: new Set(session?.cardIds ?? []),
    questions: new Set([...(session?.questionIds ?? []), ...(session?.answered.map((a) => a.questionId) ?? [])]),
  }
}

export function reuseOrBuildDailyPlan(input: DailyPlanInput): FrozenDailyPlan {
  const existing = input.existingPlan
  if (existing && existing.date === input.today) {
    const examPressure = computeExamPressure({
      today: input.today,
      settings: input.settings,
      lessons: input.lessons,
      completedLessonIds: completedLessonIds(input.studyDays),
    })
    const ids = sessionIds(input.existingSession)
    const items = existing.items.map((item) => ({ ...item, cardIds: [...item.cardIds], questionIds: [...item.questionIds] }))
    if (input.existingSession && input.existingSession.date === input.today) {
      for (const cardId of ids.cards) {
        if (items.some((item) => item.cardIds.includes(cardId))) continue
        items.push({
          id: `review:${cardId}`,
          kind: 'review-due',
          conceptId: cardId,
          conceptTitle: '진행 중 복습',
          cardIds: [cardId],
          questionIds: [],
          reason: '진행 중인 세션의 카드를 유지합니다.',
        })
      }
    }
    return {
      ...existing,
      items,
      examPressure,
    }
  }
  return buildFresh(input)
}

export function flattenPlanCards(plan: FrozenDailyPlan): string[] {
  return unique(plan.items.flatMap((item) => item.cardIds))
}

export function flattenPlanQuestions(plan: FrozenDailyPlan, mode: 'full' | 'short-review'): string[] {
  const kinds =
    mode === 'short-review'
      ? new Set(['review-due', 'recent-weak'])
      : new Set(plan.items.map((item) => item.kind))
  return unique(
    plan.items.filter((item) => kinds.has(item.kind) && item.sourceNote !== 'not-ready').flatMap((item) => item.questionIds),
  )
}

export function flattenPlanCardsForMode(plan: FrozenDailyPlan, mode: 'full' | 'short-review'): string[] {
  if (mode === 'short-review') {
    return unique(
      plan.items
        .filter((item) => item.kind === 'review-due' || item.kind === 'recent-weak')
        .flatMap((item) => item.cardIds),
    ).slice(0, DAILY_LEARNING_POLICY.shortReviewMaxCards)
  }
  return flattenPlanCards(plan)
}

export function primaryLessonId(plan: FrozenDailyPlan, lessons: Lesson[]): string {
  const news = plan.items.find((item) => item.kind === 'new-concept')
  if (news?.lessonId) return news.lessonId
  const any = plan.items.find((item) => item.lessonId)?.lessonId
  return any ?? lessons[0]?.id ?? 'lesson-01'
}

export { byId }
