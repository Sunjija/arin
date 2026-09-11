import { ALL_ERAS, type Difficulty, type Question, type QuestionSnapshot } from '../types'

/**
 * 심화 정답표(77·78·79회) 배점 분포 참고값.
 * 로컬 출제 목표로만 쓴다. 공식 고정 비율이라고 단정하지 않는다.
 * 문항수 참고: 1점 10 / 2점 30 / 3점 10 → 점수 10 + 60 + 30 = 100
 */
export const ADVANCED_POINT_QUOTA = {
  1: 10,
  2: 30,
  3: 10,
} as const

export const ADVANCED_TOTAL_POINTS = 100
export const ADVANCED_QUESTION_COUNT = 50
export const SAMPLE_QUESTION_COUNT = 10
export const FULL_QUESTION_COUNT = 50

export type RandomFn = () => number

/** difficulty = 배점 */
export function pointsForDifficulty(d: Difficulty): number {
  return d
}

export function scoreFromAnswers(
  items: Array<{ correct: boolean; difficulty: Difficulty }>,
): number {
  const earned = items.reduce(
    (sum, item) => sum + (item.correct ? pointsForDifficulty(item.difficulty) : 0),
    0,
  )
  const max = items.reduce((sum, item) => sum + pointsForDifficulty(item.difficulty), 0)
  if (max <= 0) return 0
  return Math.round((earned / max) * 100)
}

export function gradeSnapshotAnswers(
  snapshots: QuestionSnapshot[],
  answers: Array<number | null>,
): Array<{
  questionId: string
  selectedIndex: number | null
  correct: boolean
  difficulty: Difficulty
}> {
  return snapshots.map((snapshot, index) => {
    const selectedIndex = answers[index] ?? null
    return {
      questionId: snapshot.questionId,
      selectedIndex,
      correct: selectedIndex != null && selectedIndex === snapshot.answerIndex,
      difficulty: snapshot.difficulty,
    }
  })
}

export function localPointQuota(total: number): { 1: number; 2: number; 3: number } {
  const target1 = Math.round(total * 0.2)
  const target3 = Math.round(total * 0.2)
  const target2 = Math.max(0, total - target1 - target3)
  return { 1: target1, 2: target2, 3: target3 }
}

/**
 * 모의고사 풀을 로컬 1/2/3점 목표 비율에 가깝게 고른 뒤,
 * 난이도 묶음이 아니라 시대 순(+ 같은 시대 안 섞기)으로 배열한다.
 * 문항이 부족하면 있는 고유 문항만 반환한다. `__pad` 복제는 하지 않는다.
 */
export function pickMockQuestions(
  pool: Question[],
  total: number,
  random: RandomFn = Math.random,
): Question[] {
  const unique: Question[] = []
  const seen = new Set<string>()
  for (const question of pool) {
    if (seen.has(question.id)) continue
    seen.add(question.id)
    unique.push(question)
  }

  const byDiff: Record<1 | 2 | 3, Question[]> = { 1: [], 2: [], 3: [] }
  for (const question of unique) {
    const band = difficultyBand(question.difficulty)
    byDiff[band].push(question)
  }
  for (const d of [1, 2, 3] as const) {
    byDiff[d] = shuffle(byDiff[d], random)
  }

  const quota = localPointQuota(total)
  const picked: Question[] = []
  const take = (list: Question[], n: number) => {
    const slice = list.slice(0, n)
    picked.push(...slice)
    return slice.length
  }

  let need1 = quota[1] - take(byDiff[1], quota[1])
  let need2 = quota[2] - take(byDiff[2], quota[2])
  let need3 = quota[3] - take(byDiff[3], quota[3])

  const leftover = shuffle(
    unique.filter((question) => !picked.some((item) => item.id === question.id)),
    random,
  )
  for (const question of leftover) {
    if (picked.length >= total) break
    const band = difficultyBand(question.difficulty)
    if (need1 > 0 && band === 1) {
      picked.push(question)
      need1 -= 1
      continue
    }
    if (need3 > 0 && band === 3) {
      picked.push(question)
      need3 -= 1
      continue
    }
    if (need2 > 0) {
      picked.push(question)
      need2 -= 1
      continue
    }
    picked.push(question)
  }

  return orderByEraThenShuffle(picked.slice(0, total), random)
}

/** 세션 동안 선지 순서를 snapshot에 고정한다. 원문 은행을 다시 읽지 않는다. */
export function freezeQuestionSnapshot(
  question: Question,
  random: RandomFn = Math.random,
): QuestionSnapshot {
  const order = question.choices.map((_, index) => index)
  const shuffled = shuffle(order, random)
  const choices = shuffled.map((index) => question.choices[index]!)
  const answerIndex = shuffled.indexOf(question.answerIndex)
  return {
    questionId: question.id,
    stem: question.stem,
    passage: question.passage,
    choices,
    answerIndex: answerIndex === -1 ? question.answerIndex : answerIndex,
    explanation: question.explanation,
    era: question.era,
    tags: [...question.tags],
    difficulty: question.difficulty,
    lessonId: question.lessonId,
    conceptIds: question.conceptIds ? [...question.conceptIds] : undefined,
    contentVersion: question.contentVersion,
    familyId: question.familyId,
  }
}

export function buildMockSnapshots(
  pool: Question[],
  total: number,
  random: RandomFn = Math.random,
): QuestionSnapshot[] {
  return pickMockQuestions(pool, total, random).map((question) =>
    freezeQuestionSnapshot(question, random),
  )
}

export function questionFromSnapshot(snapshot: QuestionSnapshot): Question {
  return {
    id: snapshot.questionId,
    stem: snapshot.stem,
    passage: snapshot.passage,
    choices: [...snapshot.choices],
    answerIndex: snapshot.answerIndex,
    explanation: snapshot.explanation,
    era: snapshot.era,
    tags: [...snapshot.tags],
    difficulty: snapshot.difficulty,
    lessonId: snapshot.lessonId,
    conceptIds: snapshot.conceptIds ? [...snapshot.conceptIds] : undefined,
    contentVersion: snapshot.contentVersion,
    familyId: snapshot.familyId,
    source: '',
    sourceUrl: '',
    license: '',
    imageRights: '',
  }
}

function difficultyBand(d: Difficulty): 1 | 2 | 3 {
  if (d >= 3) return 3
  if (d <= 1) return 1
  return 2
}

function eraRank(era: Question['era']): number {
  const index = ALL_ERAS.indexOf(era)
  return index === -1 ? ALL_ERAS.length : index
}

function orderByEraThenShuffle(items: Question[], random: RandomFn): Question[] {
  const buckets = new Map<Question['era'], Question[]>()
  for (const item of items) {
    const list = buckets.get(item.era) ?? []
    list.push(item)
    buckets.set(item.era, list)
  }

  const ordered: Question[] = []
  const remaining = new Map(buckets)
  for (const era of ALL_ERAS) {
    const list = remaining.get(era)
    if (!list) continue
    ordered.push(...shuffle(list, random))
    remaining.delete(era)
  }
  const leftovers = [...remaining.entries()].sort((a, b) => eraRank(a[0]) - eraRank(b[0]))
  for (const [, list] of leftovers) {
    ordered.push(...shuffle(list, random))
  }
  return ordered
}

function shuffle<T>(arr: T[], random: RandomFn = Math.random): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}
