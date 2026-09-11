import { lessons } from '../data/lessons'
import { questions } from '../data/questions'
import { db } from '../db/database'
import { DataError } from './dataErrors'
import { addDays, isDue, toDateKey } from './dates'
import {
  catalogConcepts,
  conceptsForQuestion,
  lessonConceptIds,
  primaryConceptId,
} from './conceptCatalog'
import {
  emptyConceptProgress,
  hydrateConceptProgress,
  learnedErasFromCompletions,
  markConceptViewed,
  markConceptsCompleted,
  markConceptsLearning,
} from './conceptProgress'
import {
  classifyExamDate,
  countMissedStudyDays,
  normalizeStudyWeekdays,
  projectConceptFinishDate,
  remainingLessons,
  remainingVolumeWarning,
  reviewPeriodStart,
} from './goalSchedule'
import { LEARNING_POLICY } from './learningPolicy'
import { createInitialMastery, updateMasteryScore } from './mastery'
import { selectStudyQuestions } from './questionSelection'
import { pickDueCardsForToday, planDailyQuantity } from './studyPlan'
import { normalizeSettings, toLearningGoal } from './settingsNormalize'
import { selectNextLesson, upsertLessonCompletion } from './lessonProgress'
import type {
  ActiveSession,
  AttemptRecord,
  ConceptProgressRecord,
  FlashcardRecord,
  FrozenStudyPlan,
  LearningGoal,
  LearningSource,
  LessonCompletion,
  Question,
  QuestionSnapshot,
  ReviewPlanItem,
  StudyDayRecord,
  UserSettings,
  WrongAnswerRecord,
} from '../types'
import type {
  RecordLearningAnswerInput,
  RecordConceptViewInput,
  ReviewSelection,
  SaveGoalInput,
  StartLessonInput,
  CompleteSessionResult,
  LearningResult,
} from '../types/learning'

export { LEARNING_POLICY, LEARNING_POLICY_VERSION } from './learningPolicy'

function snapshotFromQuestion(question: Question): QuestionSnapshot {
  return {
    questionId: question.id,
    stem: question.stem,
    passage: question.passage,
    choices: [...question.choices],
    answerIndex: question.answerIndex,
    explanation: question.explanation,
    era: question.era,
    tags: [...question.tags],
    difficulty: question.difficulty,
    lessonId: question.lessonId,
  }
}

function emptyStudyDay(date: string, lessonId?: string, plan?: FrozenStudyPlan): StudyDayRecord {
  return {
    date,
    completed: false,
    cardsReviewed: 0,
    conceptDone: false,
    questionsAnswered: 0,
    correctCount: 0,
    lessonId,
    minutesSpent: 0,
    minutesMeasured: false,
    finishedSessionIds: [],
    plan,
  }
}

export async function getSettings(): Promise<UserSettings> {
  const row = await db.settings.get('settings')
  if (!row) throw new DataError('not-found', '설정이 없습니다.')
  const { id: _id, ...settings } = row
  return normalizeSettings(settings)
}

export async function getGoal(): Promise<LearningGoal> {
  return toLearningGoal(await getSettings())
}

export async function saveGoal(input: SaveGoalInput): Promise<LearningResult<LearningGoal>> {
  try {
    const current = await getSettings()
    const merged = normalizeSettings({
      ...current,
      ...input,
      examDate:
        input.examDateUndecided === true
          ? null
          : input.examDate !== undefined
            ? input.examDate
            : current.examDate,
      studyWeekdays:
        input.studyWeekdays !== undefined
          ? normalizeStudyWeekdays(input.studyWeekdays)
          : current.studyWeekdays,
    })
    if (merged.studyWeekdays && merged.studyWeekdays.length === 0) {
      return { ok: false, code: 'validation-failed', message: '학습 요일을 하루 이상 선택하세요.' }
    }
    if (merged.examDate && !/^\d{4}-\d{2}-\d{2}$/.test(merged.examDate)) {
      return { ok: false, code: 'validation-failed', message: '시험일 형식이 올바르지 않습니다.' }
    }
    await db.settings.put({ id: 'settings', ...merged })
    const active = await db.activeSession.toCollection().first()
    const today = toDateKey()
    if (!active || active.date !== today || active.step === 'result') {
      const day = await db.studyDays.get(today)
      if (day?.plan && !day.completed) {
        await db.studyDays.put({ ...day, plan: undefined })
      }
    }
    return { ok: true, value: toLearningGoal(merged) }
  } catch (error) {
    const message = error instanceof Error ? error.message : '목표를 저장하지 못했습니다.'
    return { ok: false, code: 'save-failed', message }
  }
}

async function loadProgressRows(): Promise<{
  completions: LessonCompletion[]
  storedProgress: ConceptProgressRecord[]
  attempts: AttemptRecord[]
}> {
  const [completions, storedProgress, attempts] = await Promise.all([
    db.lessonCompletions.toArray(),
    db.conceptProgress.toArray(),
    db.attempts.toArray(),
  ])
  return { completions, storedProgress, attempts }
}

export async function computeStudyPlan(today = toDateKey()): Promise<FrozenStudyPlan> {
  const [settings, cards, studyDay, active, meta, wrongAnswers] = await Promise.all([
    getSettings(),
    db.cards.toArray(),
    db.studyDays.get(today),
    db.activeSession.toCollection().first(),
    db.meta.get('meta'),
    db.wrongAnswers.orderBy('createdAt').reverse().limit(40).toArray(),
  ])
  const sameDayResume = Boolean(active && active.date === today && active.step !== 'result')
  if (studyDay?.plan?.date === today) {
    return { ...studyDay.plan, sameDayResume }
  }

  const { completions, storedProgress, attempts } = await loadProgressRows()
  const goal = toLearningGoal(settings)
  const resumeLessonId = sameDayResume ? active?.lessonId : undefined
  const lesson = selectNextLesson(lessons, completions, resumeLessonId)
  const progress = hydrateConceptProgress({
    stored: storedProgress,
    completions,
    attempts,
  })
  const learnedLessons = completions.map((row) => row.lessonId)
  const learnedEras = [...learnedErasFromCompletions(completions)]
  const remaining = remainingLessons(lessons, completions)
  const examDateMode = classifyExamDate(goal.examDate, goal.examDateUndecided, today)
  const finishDate = projectConceptFinishDate({
    today,
    remainingLessonCount: remaining.length,
    dailyNewLessons: goal.dailyNewConceptCount,
    studyWeekdays: goal.studyWeekdays,
  })
  const reviewStart = reviewPeriodStart(goal.examDate)
  const missedStudyDays = countMissedStudyDays({
    today,
    startDate: goal.startDate,
    lastStudyDate: meta?.lastStudyDate ?? null,
    studyWeekdays: goal.studyWeekdays,
  })
  const volumeWarning = remainingVolumeWarning({
    remainingLessonCount: remaining.length,
    conceptFinishDate: finishDate,
    examDate: goal.examDate,
    reviewPeriodStart: reviewStart,
    examDateMode,
  })

  const dueAll = cards.filter((card) => isDue(card.nextReviewAt, today))
  const quantity = planDailyQuantity({
    dailyMinutes: settings.dailyMinutes,
    dailyQuestionCap: settings.dailyQuestionCount,
    dailyCardCap: settings.dailyCardCount,
    dueCardCount: pickDueCardsForToday(dueAll, lesson.era, 99, learnedEras).length,
    lesson,
  })
  const dueCards = pickDueCardsForToday(
    dueAll,
    lesson.era,
    quantity.selectedCardCount,
    learnedEras,
  )
  const dueReviewQuestionIds = dueCards
    .map((card) => card.sourceQuestionId)
    .filter((id): id is string => Boolean(id))
  const recentWrongIds = wrongAnswers
    .filter((row) => {
      const question = questions.find((item) => item.id === row.questionId)
      if (!question) return false
      if (question.lessonId) return learnedLessons.includes(question.lessonId)
      return learnedEras.includes(question.era)
    })
    .map((row) => row.questionId)

  const currentLessonQuestions = questions.filter((question) => question.lessonId === lesson.id)
  const newCount = Math.min(quantity.selectedQuestionCount, currentLessonQuestions.length)
  const reviewCount =
    learnedLessons.length === 0 ? 0 : Math.max(0, quantity.selectedQuestionCount - newCount)
  const masteryRow = await db.mastery.get('mastery')
  const initialMastery = createInitialMastery()
  const selected = selectStudyQuestions({
    questions,
    masteryEras: masteryRow?.eras ?? initialMastery.eras,
    masteryTypes: masteryRow?.types ?? initialMastery.types,
    recentWrongIds,
    dueReviewQuestionIds,
    todayLessonId: lesson.id,
    todayLessonEra: lesson.era,
    learnedLessonIds: learnedLessons,
    learnedEras,
    count: quantity.selectedQuestionCount,
    newCount,
    reviewCount,
    boostTypes: settings.focusTypes,
  })

  const currentConceptIds = lessonConceptIds(lesson.id)
  const reasons = [
    `새 학습: ${lesson.title} 개념 ${currentConceptIds.length}개, 확인 문제 ${selected.newQuestions.length}개`,
    learnedLessons.length === 0
      ? '아직 완료한 단원이 없어 자동 복습에 미학습 카드를 넣지 않습니다.'
      : `누적 복습: 완료한 단원 ${learnedLessons.length}개 범위에서 카드 ${dueCards.length}장, 문항 ${selected.reviewQuestions.length}개`,
  ]
  if (missedStudyDays > 0) {
    reasons.push(`결석 ${missedStudyDays}일 — 미완료 개념을 건너뛰지 않고 이어서 학습합니다.`)
  }

  const plan: FrozenStudyPlan = {
    policyVersion: LEARNING_POLICY.version,
    date: today,
    createdAt: new Date().toISOString(),
    currentLessonId: lesson.id,
    currentConceptIds,
    newQuestionIds: selected.newQuestions.map((question) => question.id),
    reviewQuestionIds: selected.reviewQuestions.map((question) => question.id),
    reviewCardIds: dueCards.map((card) => card.id),
    newConceptCount: Math.min(goal.dailyNewConceptCount, remaining.length || 1),
    newQuestionCount: selected.newQuestions.length,
    reviewQuestionCount: selected.reviewQuestions.length,
    reviewCardCount: dueCards.length,
    reasons,
    warnings: volumeWarning ? [volumeWarning] : [],
    conceptFinishDate: finishDate,
    examDate: goal.examDate,
    examDateMode,
    reviewPeriodStart: reviewStart,
    remainingNewLessons: remaining.length,
    missedStudyDays,
    sameDayResume,
  }

  const day = studyDay ?? emptyStudyDay(today, lesson.id, plan)
  await db.studyDays.put({ ...day, lessonId: day.lessonId ?? lesson.id, plan })
  if (storedProgress.length === 0 && progress.length > 0) {
    await db.conceptProgress.bulkPut(progress)
  }
  return plan
}

function toReviewItems(
  kind: ReviewPlanItem['kind'],
  ids: string[],
  cards: FlashcardRecord[],
  wrong: WrongAnswerRecord[],
  today: string,
): ReviewPlanItem[] {
  return ids.map((id, index) => {
    const card = cards.find((item) => item.sourceQuestionId === id || item.id === id)
    const miss = wrong.filter((row) => row.questionId === id)
    return {
      id: `${kind}-${id}-${index}`,
      kind,
      questionId: card?.sourceQuestionId ?? id,
      cardId: card?.id,
      dueOn: card?.nextReviewAt ?? today,
      reason: kind === 'due-review' ? '복습 도래' : '최근 오답(도래와 별개)',
      failCount: miss.length,
      wrongCause: miss[0]?.cause,
    }
  })
}

export async function selectReview(today = toDateKey()): Promise<ReviewSelection> {
  const plan = await computeStudyPlan(today)
  const [cards, wrong] = await Promise.all([db.cards.toArray(), db.wrongAnswers.toArray()])
  const dueItems = toReviewItems('due-review', plan.reviewCardIds, cards, wrong, today)
  const recentWrongItems = toReviewItems(
    'recent-wrong',
    plan.reviewQuestionIds.filter((id) => !plan.reviewCardIds.some((cardId) => {
      const card = cards.find((item) => item.id === cardId)
      return card?.sourceQuestionId === id
    })),
    cards,
    wrong,
    today,
  )
  return {
    date: today,
    dueItems,
    recentWrongItems,
    cardIds: plan.reviewCardIds,
    questionIds: plan.reviewQuestionIds,
    reasons: plan.reasons,
  }
}

export async function startLesson(input: StartLessonInput = {}): Promise<ActiveSession> {
  const today = input.today ?? toDateKey()
  const entryMode = input.entryMode ?? 'daily'
  const existing = await db.activeSession.toCollection().first()
  if (existing && existing.date === today && existing.step !== 'result') {
    return existing
  }

  const plan = await computeStudyPlan(today)
  const lessonId = input.lessonId ?? plan.currentLessonId
  const { completions, storedProgress, attempts } = await loadProgressRows()
  const progress = hydrateConceptProgress({ stored: storedProgress, completions, attempts })
  const conceptIds = lessonConceptIds(lessonId)
  const nextProgress = markConceptsLearning(ensureProgressRows(progress, conceptIds), conceptIds, today)
  if (nextProgress.length) await db.conceptProgress.bulkPut(nextProgress.filter((row) => conceptIds.includes(row.conceptId)))

  const cardIds = plan.reviewCardIds
  const questionIds = entryMode === 'review' ? plan.reviewQuestionIds : [...plan.newQuestionIds, ...plan.reviewQuestionIds]
  const currentCompleted = completions.some((row) => row.lessonId === lessonId)
  const step: ActiveSession['step'] =
    entryMode === 'review'
      ? cardIds.length > 0
        ? 'cards'
        : questionIds.length > 0
          ? 'quiz'
          : 'result'
      : currentCompleted && cardIds.length > 0
        ? 'cards'
        : 'concept'

  const session: ActiveSession = {
    id: `session-${today}-${Date.now()}`,
    date: today,
    step,
    lessonId,
    cardIds,
    cardIndex: 0,
    conceptDone: entryMode === 'review' || currentCompleted,
    conceptMemo: '',
    questionIds,
    questionIndex: 0,
    quizPhase: 'choices',
    clueMemo: '',
    revealedChoices: true,
    answered: [],
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    entryMode,
    newQuestionIds: plan.newQuestionIds,
    reviewQuestionIds: plan.reviewQuestionIds,
  }
  await db.activeSession.clear()
  await db.activeSession.put(session)
  return session
}

function ensureProgressRows(rows: ConceptProgressRecord[], conceptIds: string[]): ConceptProgressRecord[] {
  const byId = new Map(rows.map((row) => [row.conceptId, row]))
  for (const id of conceptIds) {
    if (!byId.has(id)) byId.set(id, emptyConceptProgress(id))
  }
  return [...byId.values()]
}

export async function recordConceptView(input: RecordConceptViewInput): Promise<ConceptProgressRecord> {
  const at = input.at ?? toDateKey()
  const existing = await db.conceptProgress.get(input.conceptId)
  const next = markConceptViewed(existing, input.conceptId, at)
  await db.conceptProgress.put(next)
  return next
}

function practiceSource(learningSource: LearningSource): 'practice' | 'mock' {
  return learningSource === 'mock' ? 'mock' : 'practice'
}

export async function recordAnswer(input: RecordLearningAnswerInput): Promise<AttemptRecord> {
  const attemptId = input.attemptId ?? `att-${Date.now()}-${input.question.id}`
  if (input.attemptId) {
    const existing = await db.attempts.get(input.attemptId)
    if (existing) return existing
  }
  if (input.resultId) {
    const duplicate = await db.attempts.where('resultId').equals(input.resultId).filter((row) => row.questionId === input.question.id).first()
    if (duplicate) return duplicate
  }

  const snapshot = input.snapshot ?? snapshotFromQuestion(input.question)
  const conceptId = primaryConceptId(input.question)
  const attempt: AttemptRecord = {
    id: attemptId,
    questionId: input.question.id,
    correct: input.correct,
    selectedIndex: input.selectedIndex,
    responseMs: input.responseMs,
    responseMsSource: input.responseMs == null ? 'unavailable' : 'measured',
    cause: input.correct ? undefined : (input.cause ?? 'unknown'),
    era: input.question.era,
    tags: input.question.tags,
    createdAt: new Date().toISOString(),
    source: practiceSource(input.learningSource),
    learningSource: input.learningSource,
    conceptId,
    snapshot,
    resultId: input.resultId,
  }
  await db.attempts.put(attempt)

  if (!input.correct) {
    const wrong: WrongAnswerRecord = {
      id: `wrong-${attempt.id}`,
      questionId: input.question.id,
      selectedIndex: input.selectedIndex,
      correctIndex: input.question.answerIndex,
      cause: attempt.cause ?? 'unknown',
      createdAt: toDateKey(),
      stem: input.question.stem,
      explanation: input.question.explanation,
      era: input.question.era,
      tags: input.question.tags,
    }
    await db.wrongAnswers.put(wrong)
  }

  const mastery = await db.mastery.get('mastery')
  if (mastery) {
    const { id: _id, ...scores } = mastery
    scores.eras[input.question.era] = updateMasteryScore({
      current: scores.eras[input.question.era] ?? 50,
      correct: input.correct,
      responseMs: input.responseMs,
      daysAgo: 0,
      cause: attempt.cause,
    })
    for (const tag of input.question.tags) {
      scores.types[tag] = updateMasteryScore({
        current: scores.types[tag] ?? 50,
        correct: input.correct,
        responseMs: input.responseMs,
        daysAgo: 0,
        cause: attempt.cause,
      })
    }
    await db.mastery.put({ id: 'mastery', ...scores })
  }

  if (conceptId) {
    const existing = await db.conceptProgress.get(conceptId)
    const related = conceptsForQuestion(input.question)
    for (const concept of related.length ? related : catalogConcepts().filter((item) => item.id === conceptId)) {
      const current = concept.id === conceptId ? existing : await db.conceptProgress.get(concept.id)
      const row = current ?? emptyConceptProgress(concept.id)
      const next: ConceptProgressRecord = {
        ...row,
        learnState: row.learnState === 'completed' ? 'completed' : 'learning',
        firstLearnedAt: row.firstLearnedAt ?? toDateKey(),
        lastAttemptAt: attempt.createdAt,
        lastAttemptId: attempt.id,
      }
      await db.conceptProgress.put(next)
    }
  }

  return attempt
}

export async function completeSession(session: ActiveSession): Promise<CompleteSessionResult> {
  const today = session.date
  const existingDay = await db.studyDays.get(today)
  if (existingDay?.finishedSessionIds?.includes(session.id)) {
    const done = { ...session, step: 'result' as const, updatedAt: new Date().toISOString() }
    await db.activeSession.put(done)
    return { session: done, created: false }
  }

  const started = Date.parse(session.startedAt)
  const minutesMeasured = Number.isFinite(started)
  const minutesSpent = minutesMeasured ? Math.max(0, Math.round((Date.now() - started) / 60000)) : 0
  const cardsReviewedCount = session.step === 'cards' ? session.cardIndex : session.cardIds.length
  const day: StudyDayRecord = {
    date: today,
    completed: session.entryMode === 'review' ? Boolean(existingDay?.completed) : true,
    cardsReviewed: (existingDay?.cardsReviewed ?? 0) + cardsReviewedCount,
    conceptDone: Boolean(existingDay?.conceptDone || session.conceptDone),
    questionsAnswered: (existingDay?.questionsAnswered ?? 0) + session.answered.length,
    correctCount: (existingDay?.correctCount ?? 0) + session.answered.filter((answer) => answer.correct).length,
    lessonId: existingDay?.lessonId ?? session.lessonId,
    minutesSpent: (existingDay?.minutesSpent ?? 0) + minutesSpent,
    minutesMeasured: Boolean(existingDay?.minutesMeasured || minutesMeasured),
    finishedSessionIds: [...(existingDay?.finishedSessionIds ?? []), session.id],
    plan: existingDay?.plan,
  }
  await db.studyDays.put(day)

  if (session.entryMode !== 'review' && session.conceptDone) {
    const current = await db.lessonCompletions.get(session.lessonId)
    await db.lessonCompletions.put(upsertLessonCompletion(current, session.lessonId, today))
    const conceptIds = lessonConceptIds(session.lessonId)
    const stored = await db.conceptProgress.bulkGet(conceptIds)
    const existingRows = stored.filter((row): row is ConceptProgressRecord => Boolean(row))
    const completed = markConceptsCompleted(ensureProgressRows(existingRows, conceptIds), conceptIds, today)
    await db.conceptProgress.bulkPut(completed.filter((row) => conceptIds.includes(row.conceptId)))
  }

  const meta = await db.meta.get('meta')
  if (meta) {
    const yesterday = addDays(today, -1)
    const streak =
      meta.lastStudyDate === today
        ? meta.streak
        : meta.lastStudyDate === yesterday
          ? meta.streak + 1
          : 1
    await db.meta.put({ ...meta, streak, lastStudyDate: today })
  }

  const done = { ...session, step: 'result' as const, updatedAt: new Date().toISOString() }
  await db.activeSession.put(done)
  return { session: done, created: true }
}

export { snapshotFromQuestion, emptyStudyDay }
