import type { CardKind, FlashcardRecord } from '../types'

export interface CardChoiceSet {
  /** 화면에 크게 보이는 주제 (왕 이름, 업적 문구 등) */
  prompt: string
  /** 구체적으로 무엇을 고르는지 */
  ask: string
  /** 카드 종류 한 줄 안내 */
  kindLabel: string
  choices: string[]
  answerIndex: number
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
 * 듀오링고형 선택지 생성.
 * 같은 종류 카드의 뒷면을 오답으로 섞되, 비교 카드는 짝을 뒤바꿔 출제한다.
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
  const distractors = uniqueStrings(
    pool
      .filter((c) => c.id !== card.id)
      .filter((c) => c.kind === card.kind && !parseComparison(c))
      .map((c) => c.back.trim())
      .filter((text) => text.length > 0 && normalize(text) !== normalize(correct)),
  )

  return assembleChoices({
    prompt: card.front,
    ask: copy.ask,
    kindLabel: copy.kindLabel,
    correct,
    distractors,
    fallback: () => fallbackDistractor(card, distractors.length),
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
  const nearbyDeeds = uniqueStrings(
    pool
      .filter((item) => item.id !== card.id && item.kind === 'king-to-deed')
      .map((item) => shortenDeed(item.back))
      .filter(
        (deed) =>
          deed.length > 0 &&
          normalize(deed) !== normalize(leftDeed) &&
          normalize(deed) !== normalize(rightDeed),
      ),
  )

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
    fallback: (index) => comparisonFallback(pair, index),
    random,
  })
}

function assembleChoices({
  prompt,
  ask,
  kindLabel,
  correct,
  distractors,
  fallback,
  random,
}: {
  prompt: string
  ask: string
  kindLabel: string
  correct: string
  distractors: string[]
  fallback: (index: number) => string
  random: () => number
}): CardChoiceSet {
  const pool = [...distractors]
  while (pool.length < 3) {
    const extra = fallback(pool.length)
    if (!pool.some((item) => normalize(item) === normalize(extra)) && normalize(extra) !== normalize(correct)) {
      pool.push(extra)
    } else {
      pool.push(`${extra} ${pool.length + 1}`)
    }
  }

  const picked = shuffle(pool.slice(0, 3), random)
  const answerIndex = Math.floor(random() * 4)
  const choices = [...picked]
  choices.splice(answerIndex, 0, correct)

  return {
    prompt,
    ask,
    kindLabel,
    choices: choices.slice(0, 4),
    answerIndex,
  }
}

function formatPair(left: string, leftDeed: string, right: string, rightDeed: string): string {
  return `${left}: ${leftDeed} / ${right}: ${rightDeed}`
}

function comparisonFallback(pair: ComparisonPair, index: number): string {
  const extras = [
    ['반원 개혁', '탕평책'],
    ['사병 혁파', '훈민정음 창제'],
    ['균역법 시행', '노비안검법'],
  ]
  const [leftDeed, rightDeed] = extras[index % extras.length] ?? extras[0]!
  return formatPair(pair.left, leftDeed, pair.right, rightDeed)
}

function shortenDeed(text: string): string {
  return text
    .trim()
    .split(/\s*[→,/]\s*/)[0]
    ?.trim()
    .replace(/[.。]$/, '') ?? text.trim()
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

function fallbackDistractor(card: FlashcardRecord, index: number): string {
  const samples: Record<CardKind, string[]> = {
    'king-to-deed': [
      '같은 시대 다른 인물의 정책',
      '목적은 비슷하지만 다른 제도',
      '시기가 다른 대표 업적',
    ],
    'deed-to-king': ['같은 시대의 다른 왕', '정책을 건의한 다른 인물', '시기가 다른 군주'],
    chronology: ['앞뒤가 바뀐 사건 순서', '중간 사건이 빠진 순서', '시기가 다른 사건 흐름'],
    concept: ['적용 시기가 다른 제도', '목적이 다른 유사 개념', '결과가 다른 정책 설명'],
  }
  const options = samples[card.kind]
  return `${options[index % options.length]} (${card.era})`
}
