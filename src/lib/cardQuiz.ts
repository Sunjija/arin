import type { CardKind, FlashcardRecord } from '../types'

export type CardQuizMode = 'choices' | 'recall'

export interface CardChoiceSet {
  /** 화면에 크게 보이는 주제 (왕 이름, 업적 문구 등) */
  prompt: string
  /** 구체적으로 무엇을 고르는지 */
  ask: string
  /** 카드 종류 한 줄 안내 */
  kindLabel: string
  mode: CardQuizMode
  choices: string[]
  answerIndex: number
  /** 회상 모드·채점 후 정답 확인용. 선지 원문이며 새로 만든 문장이 아니다. */
  answerText: string
}

export interface ComparisonPair {
  left: string
  leftDeed: string
  right: string
  rightDeed: string
}

const KIND_COPY: Record<CardKind, { ask: string; kindLabel: string }> = {
  'king-to-deed': {
    ask: '이 왕(인물)의 대표 업적·정책으로 옳은 것은?',
    kindLabel: '왕 → 업적',
  },
  'deed-to-king': {
    ask: '다음 업적·정책과 가장 잘 맞는 인물은?',
    kindLabel: '업적 → 왕',
  },
  chronology: {
    ask: '빈칸·순서에 들어갈 내용으로 옳은 것은?',
    kindLabel: '연표·순서',
  },
  concept: {
    ask: '이 개념·제도에 대한 설명으로 옳은 것은?',
    kindLabel: '개념',
  },
}

/**
 * 같은 kind를 우선하고, 그다음 같은 시대 카드의 뒷면을 오답으로 쓴다.
 * 비교 카드는 짝을 뒤바꿔 출제한다. 후보가 없으면 회상/정답 확인으로 넘긴다.
 * placeholder 선지나 검증되지 않은 문장은 만들지 않는다.
 */
export function buildCardChoiceSet(
  card: FlashcardRecord,
  pool: FlashcardRecord[],
  random = Math.random,
): CardChoiceSet {
  const comparison = parseComparison(card)
  if (comparison) return buildComparisonChoiceSet(card, comparison, pool, random)

  const correct = card.back.trim()
  const copy = KIND_COPY[card.kind]
  const distractors = collectKindBacks(card, pool, random)

  return assembleChoices({
    prompt: card.front,
    ask: copy.ask,
    kindLabel: copy.kindLabel,
    correct,
    distractors,
    random,
  })
}

export function parseComparison(card: FlashcardRecord): ComparisonPair | null {
  const backMatch = card.back
    .trim()
    .match(/^(.+?)\s*[:：]\s*(.+?)\s*\/\s*(.+?)\s*[:：]\s*(.+)$/)
  if (!backMatch) return null
  const left = backMatch[1].trim()
  const leftDeed = shortenDeed(backMatch[2])
  const right = backMatch[3].trim()
  const rightDeed = shortenDeed(backMatch[4])
  if (!left || !right || normalize(leftDeed) === normalize(rightDeed)) return null
  return { left, leftDeed, right, rightDeed }
}

function buildComparisonChoiceSet(
  card: FlashcardRecord,
  pair: ComparisonPair,
  pool: FlashcardRecord[],
  random: () => number,
): CardChoiceSet {
  const { left, leftDeed, right, rightDeed } = pair
  const correct = formatPair(left, leftDeed, right, rightDeed)
  const nearbyDeeds = collectNearbyDeeds(card, pair, pool, random)

  const distractors = uniqueStrings(
    [
      formatPair(left, rightDeed, right, leftDeed),
      nearbyDeeds[0] ? formatPair(left, nearbyDeeds[0], right, rightDeed) : '',
      nearbyDeeds[1] ? formatPair(left, leftDeed, right, nearbyDeeds[1]) : '',
      nearbyDeeds[0] && nearbyDeeds[1]
        ? formatPair(left, nearbyDeeds[1], right, nearbyDeeds[0])
        : '',
    ].filter(Boolean),
  ).filter((choice) => normalize(choice) !== normalize(correct))

  return assembleChoices({
    prompt: `${left} · ${right}`,
    ask: '정책 목적을 바르게 짝지은 것은?',
    kindLabel: '비교',
    correct,
    distractors,
    random,
  })
}

function collectKindBacks(
  card: FlashcardRecord,
  pool: FlashcardRecord[],
  random: () => number,
): string[] {
  const correct = card.back.trim()
  const sameKind = pool.filter(
    (item) => item.id !== card.id && item.kind === card.kind && !parseComparison(item),
  )
  const ranked = [
    ...shuffle(
      sameKind.filter((item) => item.era === card.era),
      random,
    ),
    ...shuffle(
      sameKind.filter((item) => item.era !== card.era),
      random,
    ),
  ]
  return uniqueStrings(
    ranked
      .map((item) => item.back.trim())
      .filter((text) => text.length > 0 && normalize(text) !== normalize(correct)),
  )
}

function collectNearbyDeeds(
  card: FlashcardRecord,
  pair: ComparisonPair,
  pool: FlashcardRecord[],
  random: () => number,
): string[] {
  const deedCards = pool.filter((item) => item.id !== card.id && item.kind === 'king-to-deed')
  const ranked = [
    ...shuffle(
      deedCards.filter((item) => item.era === card.era),
      random,
    ),
    ...shuffle(
      deedCards.filter((item) => item.era !== card.era),
      random,
    ),
  ]
  return uniqueStrings(
    ranked
      .map((item) => shortenDeed(item.back))
      .filter(
        (deed) =>
          deed.length > 0 &&
          normalize(deed) !== normalize(pair.leftDeed) &&
          normalize(deed) !== normalize(pair.rightDeed),
      ),
  )
}

function assembleChoices({
  prompt,
  ask,
  kindLabel,
  correct,
  distractors,
  random,
}: {
  prompt: string
  ask: string
  kindLabel: string
  correct: string
  distractors: string[]
  random: () => number
}): CardChoiceSet {
  const real = uniqueStrings(distractors).filter((item) => normalize(item) !== normalize(correct))
  if (real.length === 0) {
    return {
      prompt,
      ask,
      kindLabel,
      mode: 'recall',
      choices: [],
      answerIndex: 0,
      answerText: correct,
    }
  }

  const picked = real.slice(0, 3)
  const answerIndex = Math.floor(random() * (picked.length + 1))
  const choices = [...picked]
  choices.splice(answerIndex, 0, correct)

  return {
    prompt,
    ask,
    kindLabel,
    mode: 'choices',
    choices,
    answerIndex,
    answerText: correct,
  }
}

function formatPair(left: string, leftDeed: string, right: string, rightDeed: string): string {
  return `${left}: ${leftDeed} / ${right}: ${rightDeed}`
}

function shortenDeed(text: string): string {
  return (
    text
      .trim()
      .split(/\s*[→,/]\s*/)[0]
      ?.trim()
      .replace(/[.。]$/, '') ?? text.trim()
  )
}

/** 정답/오답 + 응답 속도로 복습 평가 매핑 */
export function ratingFromQuizResult(correct: boolean, responseMs: number) {
  if (!correct) return 'again' as const
  if (responseMs < 4000) return 'easy' as const
  if (responseMs < 10000) return 'good' as const
  return 'hard' as const
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const key = normalize(value)
    if (seen.has(key) || !value) continue
    seen.add(key)
    result.push(value)
  }
  return result
}

function normalize(text: string): string {
  return text.replace(/\s+/g, '').toLowerCase()
}
