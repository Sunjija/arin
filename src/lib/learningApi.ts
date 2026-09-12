import { lessons } from '../data/lessons'
import { guideForLesson } from '../data/lessonGuides'
import { buildConceptSchedule } from './conceptSchedule'
import { questions } from '../data/questions'
import { CARD_LESSON_SCOPE } from '../data/cardLessonScope'
import { db } from '../db/database'
import { DataError } from './dataErrors'
import { requireCurrentSession, revisedSession } from './studySessionConcurrency'
import { addDays, isDateKey, isDue, toDateKey } from './dates'
import { validateGoalInput } from './settingsValidation'
import { questionFromSnapshot } from './examScoring'
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
  remainingLessons,
  reviewPeriodStart,
} from './goalSchedule'
import { LEARNING_POLICY } from './learningPolicy'
import { createInitialMastery, updateMasteryScore } from './mastery'
import { selectStudyQuestions } from './questionSelection'
import { makeQuestionStudyContext, questionContextCopy, recentWrongAttempts } from './questionStudyContext'
import { pickDueCardsForToday, planDailyQuantity } from './studyPlan'
import { gradeFromScore, normalizeSettings, scoreFromGrade, toLearningGoal } from './settingsNormalize'
import { selectNextLesson, upsertLessonCompletion } from './lessonProgress'
import type {
  ActiveSession,
  AttemptRecord,
  ConceptProgressRecord,
  FlashcardRecord,
  FrozenStudyPlan,
  LearningGoal,
  LessonGuide,
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
    conceptIds: question.conceptIds ? [...question.conceptIds] : undefined,
    familyId: question.familyId,
    contentVersion: question.contentVersion,
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
  const error = validateGoalInput(input)
  if (error) return { ok: false, code: 'validation-failed', message: error }
  try {
    return await db.transaction('rw', [db.settings, db.studyDays, db.activeSession], async () => {
      const current = await getSettings()
      const merged = normalizeSettings({
        ...current,
        ...input,
        goalGrade: input.goalGrade ?? (input.goalScore !== undefined ? gradeFromScore(input.goalScore) : current.goalGrade),
        goalScore: input.goalScore ?? (input.goalGrade !== undefined ? scoreFromGrade(input.goalGrade, current.goalScore) : current.goalScore),
        examDateUndecided: input.examDateUndecided ?? (input.examDate !== undefined ? !input.examDate : current.examDateUndecided),
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
    })
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
  if (!isDateKey(today)) throw new DataError('validation-failed', '학습 날짜가 올바르지 않습니다.')
  return db.transaction('rw', [db.settings, db.cards, db.studyDays, db.activeSession, db.meta, db.wrongAnswers, db.lessonCompletions, db.conceptProgress, db.attempts, db.mastery], () => computePlan(today))
}

async function computePlan(today: string): Promise<FrozenStudyPlan> {
  const [settings, cards, studyDay, active, meta] = await Promise.all([
    getSettings(),
    db.cards.toArray(),
    db.studyDays.get(today),
    db.activeSession.toCollection().first(),
    db.meta.get('meta'),
  ])
  const sameDayResume = Boolean(active && active.date === today && active.step !== 'result')
  if (active && active.step !== 'result') {
    const originalPlan = (await db.studyDays.get(active.date))?.plan
    if (originalPlan) {
      // A resumed session owns its list, including when the calendar date changes.
      const newQuestionIds = active.newQuestionIds ?? active.questionIds
      const reviewQuestionIds = active.reviewQuestionIds ?? []
      return { ...originalPlan, date: today, currentLessonId: active.lessonId,
        currentConceptIds: active.conceptIds ?? lessonConceptIds(active.lessonId), newConceptCount: active.conceptIds?.length ?? originalPlan.newConceptCount, newQuestionIds, reviewQuestionIds,
        reviewCardIds: active.cardIds, newQuestionCount: newQuestionIds.length,
        reviewQuestionCount: reviewQuestionIds.length, reviewCardCount: active.cardIds.length, sameDayResume, questionContexts: active.questionContexts,
        reasons: [...originalPlan.reasons, `${active.date}에 시작한 학습을 이어갑니다.`],
      }
    }
  }
  if ((!active || active.step === 'result') && studyDay?.plan?.date === today && studyDay.plan.policyVersion === LEARNING_POLICY.version) {
    return { ...studyDay.plan, sameDayResume }
  }

  const { completions, storedProgress, attempts } = await loadProgressRows()
  const goal = toLearningGoal(settings)
  const resumeLessonId = active?.step !== 'result' ? active?.lessonId : undefined
  const progress = hydrateConceptProgress({
    stored: storedProgress,
    completions,
    attempts,
  })
  const learnedLessons = completions.map((row) => row.lessonId)
  const learnedEras = [...learnedErasFromCompletions(completions)]
  const remaining = remainingLessons(lessons, completions)
  const examDateMode = classifyExamDate(goal.examDate, goal.examDateUndecided, today)
  const concepts = catalogConcepts()
  const conceptSchedule = buildConceptSchedule({ today, goal, concepts, progress })
  const currentConceptIds = conceptSchedule.availableTodayIds
  const firstConcept = concepts.find(concept => concept.id === (currentConceptIds[0] ?? conceptSchedule.nextConceptId))
  const lesson = lessons.find(item => item.id === firstConcept?.lessonId) ?? selectNextLesson(lessons, completions, resumeLessonId)
  const completedConceptIds = new Set(progress.filter(row => row.learnState === 'completed').map(row => row.conceptId))
  const seenQuestionIds = new Set(attempts.map(attempt => attempt.questionId))
  const learnedQuestion = (question: Question) => seenQuestionIds.has(question.id) ||
    (question.conceptIds?.length ? question.conceptIds.every(id => completedConceptIds.has(id)) : Boolean(question.lessonId && learnedLessons.includes(question.lessonId)))
  const reviewQuestionIdsAllowed = questions.filter(learnedQuestion).map(question => question.id)
  const finishDate = conceptSchedule.allContentReadyFinishDate
  const reviewStart = reviewPeriodStart(goal.examDate)
  const missedStudyDays = countMissedStudyDays({
    today,
    startDate: goal.startDate,
    lastStudyDate: meta?.lastStudyDate ?? null,
    studyWeekdays: goal.studyWeekdays,
  })
  const dueAll = cards.filter((card) => isDue(card.nextReviewAt, today) && isLearnedCard(card, learnedLessons, completedConceptIds, seenQuestionIds))
  const quantity = planDailyQuantity({
    dailyMinutes: settings.dailyMinutes,
    dailyQuestionCap: settings.dailyQuestionCount,
    dailyCardCap: settings.dailyCardCount,
    dueCardCount: dueAll.length,
    lesson,
  })
  const dueCards = pickDueCardsForToday(
    dueAll,
    lesson.era,
    quantity.selectedCardCount,
  )
  const dueReviewQuestionIds = dueAll
    .map((card) => card.sourceQuestionId)
    .filter((id): id is string => Boolean(id))
  const recentWrong = recentWrongAttempts(attempts, today)
  const recentWrongIds = [...recentWrong.keys()].filter(id => reviewQuestionIdsAllowed.includes(id))
  const understood = new Set([...completedConceptIds, ...currentConceptIds])
  const newQuestionIdsAllowed = questions.filter(question => question.conceptIds?.some(id => currentConceptIds.includes(id)) && question.conceptIds.every(id => understood.has(id))).map(question => question.id)
  const reviewBudget = reviewQuestionIdsAllowed.length ? Math.max(1, Math.floor(quantity.selectedQuestionCount * 0.3)) : 0
  const newCount = Math.min(quantity.selectedQuestionCount - reviewBudget, newQuestionIdsAllowed.length)
  const reviewCount = Math.max(0, quantity.selectedQuestionCount - newCount)
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
    newQuestionIdsAllowed,
    reviewQuestionIdsAllowed,
  })

  const reasons = [
    currentConceptIds.length ? `오늘 새 개념 ${currentConceptIds.length}개 · 확인 문제 ${selected.newQuestions.length}개` : '오늘 새 개념이 없습니다. 학습 요일과 콘텐츠 준비 상태를 확인해 주세요.',
    `이미 학습한 범위와 풀어 본 문항에서 복습 카드 ${dueCards.length}장, 문항 ${selected.reviewQuestions.length}개를 골랐습니다.`,
  ]
  if (missedStudyDays > 0) {
    reasons.push(`결석 ${missedStudyDays}일 — 미완료 개념을 건너뛰지 않고 이어서 학습합니다.`)
  }

  const plan: FrozenStudyPlan = {
    questionContexts: selected.all.map(question => makeQuestionStudyContext({
      question,
      reason: selected.reviewReasons[question.id] ?? 'new-concept',
      selectedOn: today,
      attempts,
      dueOn: dueAll.filter(card => card.sourceQuestionId === question.id).map(card => card.nextReviewAt).sort()[0],
      lastWrongAt: recentWrong.get(question.id)?.createdAt,
    })),
    policyVersion: LEARNING_POLICY.version,
    date: today,
    createdAt: new Date().toISOString(),
    currentLessonId: lesson.id,
    currentConceptIds,
    newQuestionIds: selected.newQuestions.map((question) => question.id),
    reviewQuestionIds: selected.reviewQuestions.map((question) => question.id),
    reviewCardIds: dueCards.map((card) => card.id),
    newConceptCount: currentConceptIds.length,
    conceptSchedule,
    newQuestionCount: selected.newQuestions.length,
    reviewQuestionCount: selected.reviewQuestions.length,
    reviewCardCount: dueCards.length,
    reasons,
    warnings: conceptSchedule.warnings,
    conceptFinishDate: finishDate,
    examDate: goal.examDate,
    examDateMode,
    reviewPeriodStart: reviewStart,
    remainingNewLessons: remaining.length,
    missedStudyDays,
    sameDayResume,
  }

  if (active && active.step !== 'result') {
    plan.currentLessonId = active.lessonId
    plan.currentConceptIds = active.conceptIds ?? lessonConceptIds(active.lessonId)
    plan.newConceptCount = plan.currentConceptIds.length
    plan.conceptSchedule = undefined
    plan.newQuestionIds = active.newQuestionIds ?? active.questionIds
    plan.reviewQuestionIds = active.reviewQuestionIds ?? []
    plan.reviewCardIds = active.cardIds
    plan.newQuestionCount = plan.newQuestionIds.length
    plan.reviewQuestionCount = plan.reviewQuestionIds.length
    plan.reviewCardCount = plan.reviewCardIds.length
    plan.questionContexts = active.questionContexts
    plan.reasons = [`${active.date}에 시작한 학습을 이어갑니다.`]
  }
  const day = studyDay ?? emptyStudyDay(today, lesson.id, plan)
  await db.studyDays.put({ ...day, lessonId: day.lessonId ?? lesson.id, plan })
  if (storedProgress.length === 0 && progress.length > 0) {
    await db.conceptProgress.bulkPut(progress)
  }
  return plan
}

function isLearnedCard(card: FlashcardRecord, learnedLessonIds: string[], completedConceptIds = new Set<string>(), seenQuestionIds = new Set<string>()): boolean {
  const sourceQuestion = questions.find(question => question.id === card.sourceQuestionId)
  if (sourceQuestion && (seenQuestionIds.has(sourceQuestion.id) || sourceQuestion.conceptIds?.length && sourceQuestion.conceptIds.every(id => completedConceptIds.has(id)))) return true

  const scope = card.sourceQuestionId
    ? [questions.find((question) => question.id === card.sourceQuestionId)?.lessonId].filter((id): id is string => Boolean(id))
    : (!card.userEdited && !card.fromWrongAnswer ? CARD_LESSON_SCOPE[card.id] : undefined)
  if (scope?.length) return scope.every((id) => learnedLessonIds.includes(id))
  // A manually rated custom card has direct learning evidence; unmapped seeds do not.
  return Boolean(card.lastRating && (card.userEdited || card.fromWrongAnswer || card.id.startsWith('card-user-')))
}

export async function selectReview(today = toDateKey()): Promise<ReviewSelection> {
  const plan = await computeStudyPlan(today)
  const [cards, wrong] = await Promise.all([db.cards.toArray(), db.wrongAnswers.toArray()])
  const dueItems: ReviewPlanItem[] = plan.reviewCardIds.flatMap(id => {
    const card = cards.find(item => item.id === id)
    if (!card) return []
    const misses = wrong.filter(row => row.questionId === card.sourceQuestionId)
    return [{ id: `due-review-${id}`, kind: 'due-review', questionId: card.sourceQuestionId,
      cardId: id, dueOn: card.nextReviewAt, reason: '복습 예정일 도래', failCount: misses.length }]
  })
  const questionItems = plan.questionContexts?.filter(item => plan.reviewQuestionIds.includes(item.questionId)) ?? []
  const recentWrongItems: ReviewPlanItem[] = questionItems.filter(item => item.reason === 'recent-wrong').map(item => ({
    id: `recent-wrong-${item.questionId}`, kind: 'recent-wrong', questionId: item.questionId,
    dueOn: null, reason: questionContextCopy(item).reasonDetail,
    failCount: wrong.filter(row => row.questionId === item.questionId).length,
    wrongCause: wrong.find(row => row.questionId === item.questionId && row.createdAt === item.lastWrongAt)?.cause,
  }))
  return { date: today, dueItems, recentWrongItems, questionItems,
    cardIds: plan.reviewCardIds, questionIds: plan.reviewQuestionIds, reasons: plan.reasons }
}

export async function startLesson(input: StartLessonInput = {}): Promise<ActiveSession> {
  return db.transaction('rw', [db.settings, db.cards, db.studyDays, db.activeSession, db.meta, db.wrongAnswers, db.lessonCompletions, db.conceptProgress, db.attempts, db.mastery], () => startLessonTransaction(input))
}

async function startLessonTransaction(input: StartLessonInput): Promise<ActiveSession> {
  const today = input.today ?? toDateKey()
  const entryMode = input.entryMode ?? 'daily'
  const existing = await db.activeSession.toCollection().first()
  if (existing && existing.step !== 'result') {
    return existing
  }

  if (entryMode === 'review' && existing?.entryMode === 'review' && existing.step === 'result' && !input.startNewReview) return existing

  if (entryMode === 'daily' && input.lessonId === undefined && existing?.date === today && existing.step === 'result' && (await db.studyDays.get(today))?.completed) return existing

  const plan = await computeStudyPlan(today)
  const lessonId = input.lessonId ?? plan.currentLessonId
  if (!lessons.some((lesson) => lesson.id === lessonId)) throw new DataError('not-found', '학습 단원을 찾을 수 없습니다.')
  const { completions, storedProgress, attempts } = await loadProgressRows()
  const progress = hydrateConceptProgress({ stored: storedProgress, completions, attempts })
  const scoped = entryMode === 'daily' && input.lessonId === undefined
  const conceptIds = entryMode === 'review' ? [] : scoped ? plan.currentConceptIds : lessonConceptIds(lessonId)
  if (scoped && !conceptIds.length) throw new DataError('validation-failed', plan.conceptSchedule?.isStudyDay === false ? '오늘은 새 개념을 학습하는 날이 아닙니다. 설정에서 학습 요일을 조정하거나 자료실을 이용해 주세요.' : '다음 개념의 상세 설명을 준비 중입니다. 자료실에서 이미 배운 내용을 복습해 주세요.')
  const guideSnapshots: LessonGuide[] = []
  for (const id of conceptIds) {
    const concept = catalogConcepts().find(item => item.id === id)
    const guide = guideForLesson(concept?.lessonId ?? '')
    const section = guide?.sections.find(item => item.conceptId === id)
    if (!guide || !section) continue
    const group = guideSnapshots.find(item => item.lessonId === guide.lessonId)
    if (group) group.sections.push(structuredClone(section))
    else guideSnapshots.push(structuredClone({ ...guide, introduction: '오늘 배울 개념의 연결을 살펴보세요.', sections: [section] }))
  }
  const nextProgress = markConceptsLearning(ensureProgressRows(progress, conceptIds), conceptIds, today)
  if (nextProgress.length) await db.conceptProgress.bulkPut(nextProgress.filter((row) => conceptIds.includes(row.conceptId)))

  const cardIds = plan.reviewCardIds
  const newQuestionIds = lessonId === plan.currentLessonId ? plan.newQuestionIds : questions.filter((question) => question.lessonId === lessonId).slice(0, (await getSettings()).dailyQuestionCount).map((question) => question.id)
  const reviewQuestionIds = plan.reviewQuestionIds.filter((id) => !newQuestionIds.includes(id))
  const questionIds = entryMode === 'review' ? plan.reviewQuestionIds : [...newQuestionIds, ...reviewQuestionIds]
  const currentCompleted = !scoped && completions.some((row) => row.lessonId === lessonId)
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

  const questionContexts = questionIds.flatMap(id => {
    const question = questions.find(item => item.id === id)
    if (!question) return []
    const planned = plan.questionContexts?.find(item => item.questionId === id)
    return [makeQuestionStudyContext({ question, attempts, selectedOn: planned?.selectedOn ?? today,
      reason: input.lessonId && newQuestionIds.includes(id) ? 'lesson-practice' : planned?.reason ?? (plan.reviewQuestionIds.includes(id) ? 'review-practice' : 'new-concept'),
      dueOn: planned?.dueOn, lastWrongAt: planned?.lastWrongAt })]
  })
  const session: ActiveSession = {
    revision: 0,
    questionContexts,
    id: `session-${today}-${crypto.randomUUID()}`,
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
    newQuestionIds,
    reviewQuestionIds,
    ...(scoped ? { conceptIds, confirmedConceptIds: [], guideSnapshots } : {}),
    questionSnapshots: questionIds.map((id) => questions.find((question) => question.id === id)).filter((question): question is Question => Boolean(question)).map(snapshotFromQuestion),
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
  if (!catalogConcepts().some((concept) => concept.id === input.conceptId)) throw new DataError('not-found', '개념을 찾을 수 없습니다.')
  const at = input.at ?? toDateKey()
  if (!isDateKey(at)) throw new DataError('validation-failed', '개념 열람 날짜가 올바르지 않습니다.')
  return db.transaction('rw', db.conceptProgress, async () => {
    const existing = await db.conceptProgress.get(input.conceptId)
    const next = markConceptViewed(existing, input.conceptId, at)
    await db.conceptProgress.put(next)
    return next
  })
}

function practiceSource(learningSource: LearningSource): 'practice' | 'mock' {
  return learningSource === 'mock' ? 'mock' : 'practice'
}

export async function recordAnswer(input: RecordLearningAnswerInput): Promise<AttemptRecord> {
  return db.transaction('rw', [db.attempts, db.wrongAnswers, db.mastery, db.conceptProgress], () => recordAnswerTransaction(input))
}

async function recordAnswerTransaction(input: RecordLearningAnswerInput): Promise<AttemptRecord> {
  const attemptId = input.attemptId ?? `att-${crypto.randomUUID()}`
  if (input.attemptId) {
    const existing = await db.attempts.get(input.attemptId)
    if (existing) {
      if (existing.questionId !== input.question.id) throw new DataError('validation-failed', '다른 문항에 사용한 시도 ID입니다.')
      return existing
    }
  }
  if (input.resultId) {
    const duplicate = await db.attempts.where('resultId').equals(input.resultId).filter((row) => row.questionId === input.question.id).first()
    if (duplicate) return duplicate
  }

  const snapshot = input.snapshot ?? snapshotFromQuestion(input.question)
  if (snapshot.questionId !== input.question.id || !Number.isInteger(input.selectedIndex) || input.selectedIndex < 0 || input.selectedIndex >= snapshot.choices.length || (input.responseMs != null && (!Number.isFinite(input.responseMs) || input.responseMs < 0))) {
    throw new DataError('validation-failed', '답안 또는 문항 정보가 올바르지 않습니다.')
  }
  const question = questionFromSnapshot(snapshot)
  const correct = input.selectedIndex === snapshot.answerIndex
  const conceptId = primaryConceptId(question)
  const attempt: AttemptRecord = {
    id: attemptId,
    questionId: question.id,
    correct: correct,
    selectedIndex: input.selectedIndex,
    responseMs: input.responseMs,
    responseMsSource: input.responseMs == null ? 'unavailable' : 'measured',
    cause: correct ? undefined : (input.cause ?? 'unknown'),
    era: question.era,
    tags: question.tags,
    createdAt: new Date().toISOString(),
    source: practiceSource(input.learningSource),
    learningSource: input.learningSource,
    conceptId,
    snapshot,
    resultId: input.resultId,
  }
  await db.attempts.put(attempt)

  if (!correct) {
    const wrong: WrongAnswerRecord = {
      id: `wrong-${attempt.id}`,
      questionId: question.id,
      selectedIndex: input.selectedIndex,
      correctIndex: question.answerIndex,
      cause: attempt.cause ?? 'unknown',
      createdAt: toDateKey(),
      stem: question.stem,
      explanation: question.explanation,
      era: question.era,
      tags: question.tags,
    }
    await db.wrongAnswers.put(wrong)
  }

  const mastery = await db.mastery.get('mastery')
  if (mastery) {
    const { id: _id, ...scores } = mastery
    scores.eras[question.era] = updateMasteryScore({
      current: scores.eras[question.era] ?? 50,
      correct: correct,
      responseMs: input.responseMs,
      daysAgo: 0,
      cause: attempt.cause,
    })
    for (const tag of question.tags) {
      scores.types[tag] = updateMasteryScore({
        current: scores.types[tag] ?? 50,
        correct: correct,
        responseMs: input.responseMs,
        daysAgo: 0,
        cause: attempt.cause,
      })
    }
    await db.mastery.put({ id: 'mastery', ...scores })
  }

  if (conceptId) {
    const existing = await db.conceptProgress.get(conceptId)
    const related = conceptsForQuestion(question)
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
  return db.transaction('rw', [db.studyDays, db.activeSession, db.lessonCompletions, db.conceptProgress, db.meta], () => completeSessionTransaction(session))
}

async function completeSessionTransaction(session: ActiveSession): Promise<CompleteSessionResult> {
  const today = session.date
  const existingDay = await db.studyDays.get(today)
  if (existingDay?.finishedSessionIds?.includes(session.id)) {
    const active = await db.activeSession.toCollection().first()
    // A receipt is read-only: retrying an old completion never recreates a row.
    return { session: active?.id === session.id ? active : { ...session, step: 'result' }, created: false }
  }
  await requireCurrentSession(session)

  // Wall-clock elapsed time includes overnight pauses; it is not active study time.
  const minutesMeasured = false
  const minutesSpent = 0
  const cardsReviewedCount = Math.min(session.cardIndex, session.cardIds.length)
  const newQuestionIds = session.newQuestionIds ?? session.questionIds
  const scoped = session.conceptIds !== undefined
  const confirmed = scoped && session.conceptIds!.length > 0 && session.conceptIds!.every(id => session.confirmedConceptIds?.includes(id))
  const lessonComplete = session.entryMode !== 'review' && session.conceptDone && (scoped ? confirmed : newQuestionIds.length > 0) && newQuestionIds.every(id => session.answered.some(answer => answer.questionId === id))
  const day: StudyDayRecord = {
    date: today,
    completed: Boolean(existingDay?.completed || lessonComplete),
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

  if (lessonComplete) {
    const conceptIds = session.conceptIds ?? lessonConceptIds(session.lessonId)
    const stored = await db.conceptProgress.bulkGet(conceptIds)
    const existingRows = stored.filter((row): row is ConceptProgressRecord => Boolean(row))
    const completed = markConceptsCompleted(ensureProgressRows(existingRows, conceptIds), conceptIds, today)
    await db.conceptProgress.bulkPut(completed.filter((row) => conceptIds.includes(row.conceptId)))
    const affectedLessons = scoped ? [...new Set(catalogConcepts().filter(item => conceptIds.includes(item.id)).map(item => item.lessonId).filter((id): id is string => Boolean(id)))] : [session.lessonId]
    for (const lessonId of affectedLessons) {
      const taught = lessonConceptIds(lessonId)
      const rows = await db.conceptProgress.bulkGet(taught)
      if (!scoped || taught.length > 0 && rows.every(row => row?.learnState === 'completed')) {
        const current = await db.lessonCompletions.get(lessonId)
        await db.lessonCompletions.put(upsertLessonCompletion(current, lessonId, today))
      }
    }
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

  const done = revisedSession({ ...session, step: 'result' })
  await db.activeSession.put(done)
  return { session: done, created: true }
}

export { snapshotFromQuestion, emptyStudyDay }
