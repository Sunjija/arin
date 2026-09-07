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
  count: number
  /** 집중 가중 유형 (기본: 연도·순서, 왕·업적) */
  boostTypes?: QuestionType[]
  boostMultiplier?: number
  excludeIds?: string[]
}

/**
 * 오늘의 맞춤 문제 선택.
 *
 * 구성 비율:
 * - 40% 가장 취약한 영역
 * - 30% 최근 오답·복습 도래
 * - 20% 오늘 새 학습 범위
 * - 10% 잘하는 영역 유지
 *
 * 같은 세션에서 동일 문제 중복 출제 금지.
 * 왕·업적 / 연도·사건 순서 유형은 가중치 1.5배.
 */
export function selectDailyQuestions(ctx: SelectionContext): Question[] {
  const boostTypes = ctx.boostTypes ?? ['chronology', 'king-figure']
  const boostMultiplier = ctx.boostMultiplier ?? 1.5
  const exclude = new Set(ctx.excludeIds ?? [])
  const used = new Set<string>()
  const pool = ctx.questions.filter((q) => !exclude.has(q.id))

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
      filter: (q) =>
        ctx.recentWrongIds.includes(q.id) || ctx.dueReviewQuestionIds.includes(q.id),
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

  // 부족분은 전체 풀에서 가중 보충
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
