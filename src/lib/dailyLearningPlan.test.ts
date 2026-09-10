import { describe, expect, it } from 'vitest'
import { lessons } from '../data/lessons'
import { TOPIC_CATALOG } from '../data/topicCatalog'
import type {
  AttemptRecord,
  FlashcardRecord,
  Question,
  StudyDayRecord,
  UserSettings,
} from '../types'
import type { FrozenDailyPlan, QuestionUseClass } from '../types/dailyLearning'
import { reuseOrBuildDailyPlan, type DailyPlanInput } from './dailyLearningPlan'
import { defaultSettings } from '../data/defaults'

function card(id: string, nextReviewAt: string, extras: Partial<FlashcardRecord> = {}): FlashcardRecord {
  return {
    id,
    front: id,
    back: '대동법 공납을 미·포로',
    kind: 'concept',
    era: 'joseon-late',
    tags: ['political-system'],
    createdAt: '2026-08-01',
    updatedAt: '2026-08-01',
    nextReviewAt,
    intervalDays: 1,
    easeStreak: 0,
    lapses: extras.lapses ?? 0,
    fingerprint: id,
    lastRating: extras.lastRating,
    ...extras,
  }
}

function question(id: string, extras: Partial<Question> = {}): Question {
  return {
    id,
    stem: id,
    choices: ['a', 'b', 'c', 'd', 'e'],
    answerIndex: 0,
    explanation: 'x',
    era: extras.era ?? 'joseon-late',
    tags: extras.tags ?? ['political-system'],
    difficulty: 2,
    source: '자체 제작 학습문항',
    sourceUrl: '',
    license: 'x',
    imageRights: 'x',
    lessonId: extras.lessonId ?? 'lesson-07',
    formatId: extras.formatId ?? 'policy-name',
    ...extras,
  }
}

function classes(list: Question[], examApprovedIds: string[] = []): Map<string, QuestionUseClass> {
  return new Map(
    list.map((item) => [
      item.id,
      {
        questionId: item.id,
        practiceOk: true,
        diagnosticOk: examApprovedIds.includes(item.id),
        examApproved: examApprovedIds.includes(item.id),
        gaps: examApprovedIds.includes(item.id) ? [] : ['사람 검수 없음'],
      },
    ]),
  )
}

function settings(overrides: Partial<UserSettings> = {}): UserSettings {
  return {
    ...defaultSettings(),
    startDate: '2026-09-01',
    onboardingCompleted: true,
    ...overrides,
  }
}

function input(overrides: Partial<DailyPlanInput> = {}): DailyPlanInput {
  const questions = [
    question('q-new-1', { lessonId: 'lesson-01', era: 'prehistoric', formatId: 'source-what' }),
    question('q-tax-1', { lessonId: 'lesson-07', formatId: 'policy-name' }),
    question('q-tax-2', { lessonId: 'lesson-07', formatId: 'policy-content' }),
  ]
  return {
    today: '2026-09-10',
    nowIso: '2026-09-10T01:00:00.000Z',
    settings: settings(),
    lessons,
    topics: TOPIC_CATALOG,
    cards: [card('c-due-1', '2026-09-10', { lastRating: 'hard', lapses: 2 })],
    questions,
    attempts: [],
    studyDays: [],
    questionClasses: classes(questions),
    actualMinuteSamples: [],
    mixBasis: 'provisional',
    ...overrides,
  }
}

describe('reuseOrBuildDailyPlan', () => {
  it('신규·시험일 미정·이력 적어도 계획을 만든다', () => {
    const plan = reuseOrBuildDailyPlan(
      input({
        settings: settings({ examDate: null, experienceLevel: 'first-time' }),
        cards: [],
        attempts: [],
      }),
    )
    expect(plan.date).toBe('2026-09-10')
    expect(plan.composition.newConcept).toBeGreaterThan(0)
    expect(plan.examPressure?.examDate).toBeNull()
    expect(plan.estimateKind).toBe('heuristic')
  })

  it('같은 날 다시 만들면 항목이 바뀌지 않는다', () => {
    const first = reuseOrBuildDailyPlan(input())
    const second = reuseOrBuildDailyPlan(input({ existingPlan: first, nowIso: '2026-09-10T09:00:00.000Z' }))
    expect(second.items.map((item) => item.id)).toEqual(first.items.map((item) => item.id))
    expect(second.items.flatMap((item) => item.cardIds)).toEqual(first.items.flatMap((item) => item.cardIds))
  })

  it('밀린 복습을 무제한으로 넣지 않고 남은 것은 완료 처리하지 않는다', () => {
    const cards = Array.from({ length: 20 }, (_, i) =>
      card(`c-overdue-${String(i).padStart(2, '0')}`, '2026-09-01', { lapses: 20 - i }),
    )
    const plan = reuseOrBuildDailyPlan(input({ cards }))
    expect(plan.items.filter((item) => item.kind === 'review-due').length).toBeLessThanOrEqual(8)
    expect(plan.overdueDeferredCount).toBeGreaterThan(0)
    expect(plan.warnings.some((line) => line.includes('완료 처리하거나 기록에서 제거하지 않았습니다'))).toBe(
      true,
    )
    expect(cards.every((item) => item.nextReviewAt === '2026-09-01')).toBe(true)
  })

  it('시험 임박하고 범위가 남으면 솔직히 안내하고 합격 가능성을 말하지 않는다', () => {
    const plan = reuseOrBuildDailyPlan(
      input({
        settings: settings({ examDate: '2026-09-12', dailyMinutes: 20 }),
        studyDays: [],
      }),
    )
    expect(plan.examPressure?.feasible).toBe(false)
    expect(plan.examPressure?.message).toMatch(/전 범위를 다루기 어렵습니다/)
    expect(plan.examPressure?.message).toMatch(/합격 가능성은 예측하지 않습니다/)
  })

  it('복습 재고가 없고 신규가 없으면 경고를 남긴다', () => {
    const done: StudyDayRecord[] = lessons.map((lesson) => ({
      date: `2026-08-${String(lesson.week).padStart(2, '0')}`,
      completed: true,
      cardsReviewed: 1,
      conceptDone: true,
      questionsAnswered: 1,
      correctCount: 1,
      lessonId: lesson.id,
      minutesSpent: 20,
    }))
    const plan = reuseOrBuildDailyPlan(
      input({
        cards: [card('c-later', '2026-10-01')],
        studyDays: done,
      }),
    )
    expect(plan.warnings.some((line) => line.includes('도래한 복습'))).toBe(true)
    expect(plan.warnings.some((line) => line.includes('새로 배울 단원'))).toBe(true)
  })

  it('실전 승인 문항이 없으면 적용 평가를 승인처럼 쓰지 않는다', () => {
    const plan = reuseOrBuildDailyPlan(input())
    expect(plan.items.some((item) => item.sourceNote === 'approved-transfer')).toBe(false)
    expect(plan.contentNotes.some((line) => line.includes('실전 승인'))).toBe(true)
  })

  it('목표·날짜가 바뀌어도 진행 중 카드는 유지한다', () => {
    const first = reuseOrBuildDailyPlan(input())
    const session = {
      id: 'session-2026-09-10',
      date: '2026-09-10',
      step: 'cards' as const,
      lessonId: 'lesson-07',
      cardIds: ['kept-card'],
      cardIndex: 0,
      conceptDone: false,
      conceptMemo: '',
      questionIds: ['kept-q'],
      questionIndex: 0,
      quizPhase: 'choices' as const,
      clueMemo: '',
      revealedChoices: true,
      answered: [{ questionId: 'kept-q', correct: true, selectedIndex: 0, responseMs: 1 }],
      startedAt: '2026-09-10T00:00:00.000Z',
      updatedAt: '2026-09-10T00:00:00.000Z',
    }
    const changed: FrozenDailyPlan = first
    const reused = reuseOrBuildDailyPlan(
      input({
        existingPlan: changed,
        existingSession: session,
        settings: settings({ goalGrade: 2, goalScore: 70, examDate: '2026-12-01' }),
      }),
    )
    expect(reused.items.some((item) => item.cardIds.includes('kept-card'))).toBe(true)
    expect(session.answered).toHaveLength(1)
  })

  it('날짜가 바뀌면 새 계획을 만든다', () => {
    const first = reuseOrBuildDailyPlan(input({ today: '2026-09-10' }))
    const nextDay = reuseOrBuildDailyPlan(
      input({ today: '2026-09-12', nowIso: '2026-09-12T01:00:00.000Z', existingPlan: first }),
    )
    expect(nextDay.date).toBe('2026-09-12')
    expect(nextDay.createdAt).not.toBe(first.createdAt)
  })

  it('같은 개념 카드는 한 항목으로 묶는다', () => {
    const cards = [
      card('c-a', '2026-09-10', { lastRating: 'hard' }),
      card('c-b', '2026-09-10', { lastRating: 'hard' }),
    ]
    const plan = reuseOrBuildDailyPlan(input({ cards }))
    const reviews = plan.items.filter((item) => item.kind === 'review-due')
    expect(reviews).toHaveLength(1)
    expect(reviews[0]?.cardIds).toEqual(['c-a', 'c-b'])
  })

  it('충분한 학습 시간이 쌓이면 시간 추정을 보정한다', () => {
    const samples = [30, 32, 28, 31, 29]
    const plan = reuseOrBuildDailyPlan(input({ actualMinuteSamples: samples }))
    expect(plan.estimateKind).toBe('calibrated')
  })

  it('최근 오답 개념을 복습 이유에 넣는다', () => {
    const attempts: AttemptRecord[] = [
      {
        id: 'a1',
        questionId: 'q-tax-1',
        correct: false,
        selectedIndex: 2,
        responseMs: 3000,
        era: 'joseon-late',
        tags: ['political-system'],
        createdAt: '2026-09-08T00:00:00.000Z',
        source: 'practice',
        outcomeKind: 'incorrect',
      },
    ]
    const plan = reuseOrBuildDailyPlan(
      input({
        cards: [],
        attempts,
      }),
    )
    expect(plan.reasons.some((line) => /대동법|복습|확신/.test(line) || plan.items.some((item) => item.kind === 'recent-weak'))).toBe(
      true,
    )
  })
})
