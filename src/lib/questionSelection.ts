import type { EraId, Question, QuestionType } from '../types'
import { masteryBand } from './mastery'

export interface SelectionContext {
  questions: Question[]
  masteryEras: Record<EraId, number>
  masteryTypes: Record<QuestionType, number>
  recentWrongIds: string[]
  dueReviewQuestionIds: string[]
  todayLessonEra?: EraId
  todayLessonId?: string
  /** 완료한 단원. 없으면 복습 풀이 비고, 미학습 시대로 채우지 않는다. */
  learnedLessonIds?: string[]
  learnedEras?: EraId[]
  count: number
  newCount?: number
  reviewCount?: number
  /** 집중 가중 유형 (기본: 연도·순서, 왕·업적) */
  boostTypes?: QuestionType[]
  boostMultiplier?: number
  excludeIds?: string[]
}

export interface SplitSelection {
  newQuestions: Question[]
  reviewQuestions: Question[]
  all: Question[]
}

/**
 * 오늘의 맞춤 문제 선택.
 *
 * 새 문항: 현재 단원(lessonId) 안에서만.
 * 복습 문항: 완료한 단원·시대에서만. 미학습 시대로 보충하지 않는다.
 * 최근 오답과 복습 도래 ID는 다른 버킷이다.
 */
export function selectDailyQuestions(ctx: SelectionContext): Question[] {
  return selectStudyQuestions(ctx).all
}

export function selectStudyQuestions(ctx: SelectionContext): SplitSelection {
  const boostTypes = ctx.boostTypes ?? ['chronology', 'king-figure']
  const boostMultiplier = ctx.boostMultiplier ?? 1.5
  const exclude = new Set(ctx.excludeIds ?? [])
  const used = new Set<string>()
  const learnedLessons = new Set(ctx.learnedLessonIds ?? [])
  const learnedEras = new Set(ctx.learnedEras ?? [])
  const split = ctx.learnedLessonIds != null || ctx.learnedEras != null || ctx.newCount != null

  const newPool = ctx.questions.filter((question) => {
    if (exclude.has(question.id)) return false
    if (ctx.todayLessonId) return question.lessonId === ctx.todayLessonId
    if (ctx.todayLessonEra) return question.era === ctx.todayLessonEra
    return true
  })

  const reviewPool = ctx.questions.filter((question) => {
    if (exclude.has(question.id)) return false
    if (question.lessonId) return learnedLessons.has(question.lessonId)
    return learnedEras.has(question.era)
  })

  const newCount = split
    ? Math.max(0, ctx.newCount ?? Math.max(0, ctx.count - (ctx.reviewCount ?? 0)))
    : ctx.count
  const reviewCount = split ? Math.max(0, ctx.reviewCount ?? Math.max(0, ctx.count - newCount)) : 0

  const newQuestions = takeWeighted(newPool, newCount, used, boostTypes, boostMultiplier)
  const reviewQuestions = split
    ? pickReviewQuestions({
        pool: reviewPool.filter((question) => !used.has(question.id)),
        count: reviewCount,
        used,
        recentWrongIds: ctx.recentWrongIds,
        dueReviewQuestionIds: ctx.dueReviewQuestionIds,
        masteryEras: ctx.masteryEras,
        masteryTypes: ctx.masteryTypes,
        boostTypes,
        boostMultiplier,
      })
    : []

  if (!split) {
    return { newQuestions, reviewQuestions: [], all: fillLegacyMix(ctx, newPool, new Set(), boostTypes, boostMultiplier) }
  }

  return { newQuestions, reviewQuestions, all: ensureUnique([...newQuestions, ...reviewQuestions]) }
}

function fillLegacyMix(
  ctx: SelectionContext,
  pool: Question[],
  used: Set<string>,
  boostTypes: QuestionType[],
  boostMultiplier: number,
): Question[] {
  const quotas = splitQuotas(ctx.count)
  const picked: Question[] = []
  const weakestEras = rankWeak(ctx.masteryEras)
  const weakestTypes = rankWeak(ctx.masteryTypes)
  const strongEras = rankStrong(ctx.masteryEras)

  const buckets: Array<{ need: number; filter: (q: Question) => boolean }> = [
    {
      need: quotas.weak,
      filter: (q) =>
        weakestEras.slice(0, 3).includes(q.era) ||
        q.tags.some((t) => weakestTypes.slice(0, 2).includes(t)),
    },
    {
      need: quotas.review,
      filter: (q) => ctx.dueReviewQuestionIds.includes(q.id),
    },
    {
      need: quotas.today,
      filter: (q) =>
        (ctx.todayLessonId != null && q.lessonId === ctx.todayLessonId) ||
        (ctx.todayLessonEra != null && q.era === ctx.todayLessonEra),
    },
    {
      need: quotas.maintain,
      filter: (q) =>
        strongEras.slice(0, 3).includes(q.era) &&
        masteryBand(ctx.masteryEras[q.era] ?? 0) === 'maintain',
    },
  ]

  for (const bucket of buckets) {
    const candidates = weightedShuffle(
      pool.filter((q) => !used.has(q.id) && bucket.filter(q)),
      boostTypes,
      boostMultiplier,
    )
    for (const q of candidates) {
      if (picked.length >= ctx.count) break
      if (bucket.need <= 0) break
      picked.push(q)
      used.add(q.id)
      bucket.need -= 1
    }
  }

  if (picked.length < ctx.count) {
    const rest = weightedShuffle(
      pool.filter((q) => !used.has(q.id)),
      boostTypes,
      boostMultiplier,
    )
    for (const q of rest) {
      if (picked.length >= ctx.count) break
      picked.push(q)
      used.add(q.id)
    }
  }

  return ensureUnique(picked).slice(0, ctx.count)
}

function pickReviewQuestions(input: {
  pool: Question[]
  count: number
  used: Set<string>
  recentWrongIds: string[]
  dueReviewQuestionIds: string[]
  masteryEras: Record<EraId, number>
  masteryTypes: Record<QuestionType, number>
  boostTypes: QuestionType[]
  boostMultiplier: number
}): Question[] {
  const dueNeed = Math.round(input.count * 0.6)
  const recentNeed = Math.max(0, input.count - dueNeed)
  const picked: Question[] = []
  const take = (filter: (q: Question) => boolean, need: number) => {
    const candidates = weightedShuffle(
      input.pool.filter((q) => !input.used.has(q.id) && filter(q)),
      input.boostTypes,
      input.boostMultiplier,
    )
    let remaining = need
    for (const q of candidates) {
      if (picked.length >= input.count || remaining <= 0) break
      picked.push(q)
      input.used.add(q.id)
      remaining -= 1
    }
  }
  take((q) => input.dueReviewQuestionIds.includes(q.id), dueNeed)
  take((q) => input.recentWrongIds.includes(q.id) && !input.dueReviewQuestionIds.includes(q.id), recentNeed)
  take(() => true, input.count - picked.length)
  return picked
}

function takeWeighted(
  pool: Question[],
  count: number,
  used: Set<string>,
  boostTypes: QuestionType[],
  boostMultiplier: number,
): Question[] {
  const picked: Question[] = []
  const candidates = weightedShuffle(
    pool.filter((q) => !used.has(q.id)),
    boostTypes,
    boostMultiplier,
  )
  for (const q of candidates) {
    if (picked.length >= count) break
    picked.push(q)
    used.add(q.id)
  }
  return picked
}

/** 세션 내 중복 ID 제거 */
export function ensureUnique<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  const result: T[] = []
  for (const item of items) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    result.push(item)
  }
  return result
}

export function splitQuotas(count: number): {
  weak: number
  review: number
  today: number
  maintain: number
} {
  const weak = Math.round(count * 0.4)
  const review = Math.round(count * 0.3)
  const today = Math.round(count * 0.2)
  const maintain = Math.max(0, count - weak - review - today)
  return { weak, review, today, maintain }
}

function rankWeak<T extends string>(scores: Record<T, number>): T[] {
  return (Object.entries(scores) as [T, number][]).sort((a, b) => a[1] - b[1]).map(([k]) => k)
}

function rankStrong<T extends string>(scores: Record<T, number>): T[] {
  return (Object.entries(scores) as [T, number][]).sort((a, b) => b[1] - a[1]).map(([k]) => k)
}

function weightedShuffle(
  questions: Question[],
  boostTypes: QuestionType[],
  boostMultiplier: number,
): Question[] {
  return questions
    .map((q) => {
      const boosted = q.tags.some((t) => boostTypes.includes(t))
      const weight = (boosted ? boostMultiplier : 1) * (0.5 + Math.random())
      return { q, weight }
    })
    .sort((a, b) => b.weight - a.weight)
    .map((x) => x.q)
}
