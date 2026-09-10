import {
  computeTargetMix,
  type MixBasis,
  type MixWeightOptions,
  type TargetMix,
} from '../data/officialExamAnalysis'
import { eraBloc, questionsForMock, questionsForStudy } from '../data/questionBank'
import {
  FULL_QUESTION_COUNT,
  freezeQuestionSnapshot,
  localPointQuota,
  pickMockQuestions,
  type RandomFn,
} from './examScoring'
import { isHumanApproved } from './questionReview'
import type { Question, QuestionSnapshot } from '../types'

export type MockPoolPolicy = 'approved-only' | 'transition-unreviewed' | 'practice-or-mock'

export interface MixShortage {
  dimension: string
  needed: number
  have: number
  basis: MixBasis
}

export interface MockPoolDescription {
  pool: Question[]
  policy: MockPoolPolicy
  approvedCount: number
  mockCount: number
  practiceCount: number
  usedUnreviewed: boolean
}

export interface MockAssemblyResult {
  questions: Question[]
  snapshots: QuestionSnapshot[]
  pool: MockPoolDescription
  mix: TargetMix
  shortages: MixShortage[]
  pointCounts: { 1: number; 2: number; 3: number }
  eraCounts: { premodern: number; modern: number }
}

export const ERA_ITEM_TOLERANCE = 2
export const FORMAT_ITEM_TOLERANCE = 2

export function describeMockPool(
  bank: Question[],
  mode: 'sample' | 'full',
): MockPoolDescription {
  const practice = questionsForStudy(bank)
  const mock = questionsForMock(bank)
  const approved = mock.filter(isHumanApproved)
  if (mode === 'sample') {
    const samplePool = bank.filter(
      (question) =>
        question.reviewStatus !== 'retired' &&
        (question.purpose ?? ['practice', 'mock']).some(
          (purpose) => purpose === 'practice' || purpose === 'mock',
        ),
    )
    return {
      pool: samplePool,
      policy: 'practice-or-mock',
      approvedCount: approved.length,
      mockCount: mock.length,
      practiceCount: practice.length,
      usedUnreviewed: true,
    }
  }

  if (approved.length >= FULL_QUESTION_COUNT) {
    return {
      pool: approved,
      policy: 'approved-only',
      approvedCount: approved.length,
      mockCount: mock.length,
      practiceCount: practice.length,
      usedUnreviewed: false,
    }
  }

  return {
    pool: mock,
    policy: 'transition-unreviewed',
    approvedCount: approved.length,
    mockCount: mock.length,
    practiceCount: practice.length,
    usedUnreviewed: true,
  }
}

export function transitionNotice(pool: MockPoolDescription): string | null {
  if (pool.policy !== 'transition-unreviewed') return null
  return `사람 검수를 마친 실전 문항이 ${FULL_QUESTION_COUNT}문항보다 적어(현재 승인 ${pool.approvedCount}문항), 이번 실전 연습에는 검수 전 문항이 포함됩니다. 개념 확인용 연습과 구분해 이용해 주세요.`
}

function countByDifficulty(items: Question[]): { 1: number; 2: number; 3: number } {
  const counts = { 1: 0, 2: 0, 3: 0 }
  for (const item of items) counts[item.difficulty] += 1
  return counts
}

function countByEraBloc(items: Question[]): { premodern: number; modern: number } {
  const counts = { premodern: 0, modern: 0 }
  for (const item of items) counts[eraBloc(item.era)] += 1
  return counts
}

function rebalanceEra(
  picked: Question[],
  pool: Question[],
  targetPremodern: number,
): Question[] {
  const unused = pool.filter((question) => !picked.some((item) => item.id === question.id))
  const current = [...picked]
  const premodernCount = () => current.filter((item) => eraBloc(item.era) === 'premodern').length
  const surplus = premodernCount() - targetPremodern
  const replace = (fromBloc: 'premodern' | 'modern', toBloc: 'premodern' | 'modern', times: number) => {
    let remaining = times
    for (let i = 0; i < current.length && remaining > 0; i += 1) {
      const item = current[i]
      if (!item || eraBloc(item.era) !== fromBloc) continue
      const swap = unused.find(
        (candidate) =>
          eraBloc(candidate.era) === toBloc && candidate.difficulty === item.difficulty,
      )
      if (!swap) continue
      unused.splice(unused.indexOf(swap), 1)
      unused.push(item)
      current[i] = swap
      remaining -= 1
    }
  }
  if (surplus > ERA_ITEM_TOLERANCE) replace('premodern', 'modern', surplus)
  if (surplus < -ERA_ITEM_TOLERANCE) replace('modern', 'premodern', -surplus)
  return current
}

export function collectShortages(
  items: Question[],
  requested: number,
  mix: TargetMix,
): MixShortage[] {
  const shortages: MixShortage[] = []
  const push = (dimension: string, needed: number, have: number) => {
    if (have < needed) shortages.push({ dimension, needed, have, basis: mix.basis })
  }
  push('count', requested, items.length)
  const points = countByDifficulty(items)
  if (requested === FULL_QUESTION_COUNT && mix.points.confirmed) {
    push('points-1', mix.points[1], points[1])
    push('points-2', mix.points[2], points[2])
    push('points-3', mix.points[3], points[3])
  } else {
    const quota = localPointQuota(requested)
    push('points-1', quota[1], points[1])
    push('points-2', quota[2], points[2])
    push('points-3', quota[3], points[3])
  }
  if (requested === FULL_QUESTION_COUNT) {
    const era = countByEraBloc(items)
    const targetPremodern = Math.round(mix.era.premodern * requested)
    const targetModern = requested - targetPremodern
    if (era.premodern < targetPremodern - ERA_ITEM_TOLERANCE) {
      push('era-premodern', targetPremodern - ERA_ITEM_TOLERANCE, era.premodern)
    }
    if (era.modern < targetModern - ERA_ITEM_TOLERANCE) {
      push('era-modern', targetModern - ERA_ITEM_TOLERANCE, era.modern)
    }
  }
  if (requested === FULL_QUESTION_COUNT) {
    const formatCounts: Record<string, number> = {}
    for (const item of items) {
      const id = item.formatId ?? 'unknown'
      formatCounts[id] = (formatCounts[id] ?? 0) + 1
    }
    for (const [formatId, share] of Object.entries(mix.formatMix)) {
      if (share == null) continue
      const needed = Math.round((share / 100) * requested)
      const have = formatCounts[formatId] ?? 0
      if (needed > 0 && have < needed - FORMAT_ITEM_TOLERANCE) {
        shortages.push({
          dimension: `format-${formatId}`,
          needed: needed - FORMAT_ITEM_TOLERANCE,
          have,
          basis: mix.basis,
        })
      }
    }
  }
  return shortages
}

export function inventoryShortages(
  pool: Question[],
  requested: number,
  mix: TargetMix,
): MixShortage[] {
  const unique: Question[] = []
  const seen = new Set<string>()
  for (const question of pool) {
    if (seen.has(question.id)) continue
    seen.add(question.id)
    unique.push(question)
  }
  const shortages: MixShortage[] = []
  const push = (dimension: string, needed: number, have: number) => {
    if (have < needed) shortages.push({ dimension, needed, have, basis: mix.basis })
  }
  push('count', requested, unique.length)
  const points = countByDifficulty(unique)
  const quota =
    requested === FULL_QUESTION_COUNT && mix.points.confirmed
      ? mix.points
      : localPointQuota(requested)
  push('points-1', quota[1], points[1])
  push('points-2', quota[2], points[2])
  push('points-3', quota[3], points[3])
  if (requested === FULL_QUESTION_COUNT) {
    const era = countByEraBloc(unique)
    const targetPremodern = Math.round(mix.era.premodern * requested)
    const targetModern = requested - targetPremodern
    if (era.premodern < targetPremodern - ERA_ITEM_TOLERANCE) {
      push('era-premodern', targetPremodern - ERA_ITEM_TOLERANCE, era.premodern)
    }
    if (era.modern < targetModern - ERA_ITEM_TOLERANCE) {
      push('era-modern', targetModern - ERA_ITEM_TOLERANCE, era.modern)
    }
    const formatCounts: Record<string, number> = {}
    for (const item of unique) {
      const id = item.formatId ?? 'unknown'
      formatCounts[id] = (formatCounts[id] ?? 0) + 1
    }
    for (const [formatId, share] of Object.entries(mix.formatMix)) {
      if (share == null) continue
      const needed = Math.round((share / 100) * requested)
      const have = formatCounts[formatId] ?? 0
      if (needed > 0 && have < needed - FORMAT_ITEM_TOLERANCE) {
        shortages.push({
          dimension: `format-${formatId}`,
          needed: needed - FORMAT_ITEM_TOLERANCE,
          have,
          basis: mix.basis,
        })
      }
    }
  }
  return shortages
}

export function assembleMockExam(
  bank: Question[],
  total: number,
  mode: 'sample' | 'full',
  random: RandomFn = Math.random,
  mixOptions?: Partial<MixWeightOptions>,
): MockAssemblyResult {
  const mix = computeTargetMix(mixOptions)
  const pool = describeMockPool(bank, mode)
  const unique = pickMockQuestions(pool.pool, total, random)
  const targetPremodern = Math.round(mix.era.premodern * Math.min(total, unique.length || total))
  const balanced =
    total === FULL_QUESTION_COUNT ? rebalanceEra(unique, pool.pool, targetPremodern) : unique
  const questions = balanced
  const shortages = collectShortages(questions, total, mix)
  return {
    questions,
    snapshots: questions.map((question) => freezeQuestionSnapshot(question, random)),
    pool,
    mix,
    shortages,
    pointCounts: countByDifficulty(questions),
    eraCounts: countByEraBloc(questions),
  }
}

export function mixSummaryCopy(mix: TargetMix): string {
  if (mix.basis === 'provisional') {
    return `${mix.label}. 1·2·3점 ${mix.points[1]}·${mix.points[2]}·${mix.points[3]}문항은 77~79회 정답표에서 확인했습니다. 전근대 ${Math.round(mix.era.premodern * 100)}% · 근현대 ${Math.round(mix.era.modern * 100)}%는 임시값입니다.`
  }
  return mix.label
}
