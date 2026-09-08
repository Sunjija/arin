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
 * 같은 종류·시대 카드의 뒷면을 오답으로 섞는다.
 */
export function buildCardChoiceSet(
  card: FlashcardRecord,
  pool: FlashcardRecord[],
  random = Math.random,
): CardChoiceSet {
  const correct = card.back.trim()
  const copy = KIND_COPY[card.kind]
  const distractors = uniqueStrings(
    pool
      .filter((c) => c.id !== card.id)
      // 뒷면이 같은 의미 단위인 카드만 사용한다.
      // 같은 시대라는 이유로 왕 이름과 업적 문구를 한 선택지 세트에 섞지 않는다.
      .filter((c) => c.kind === card.kind)
      .map((c) => c.back.trim())
      .filter((text) => text.length > 0 && normalize(text) !== normalize(correct)),
  )

  if (distractors.length < 3) {
    for (const c of pool) {
      if (c.id === card.id || c.kind !== card.kind) continue
      const text = c.back.trim()
      if (!text || normalize(text) === normalize(correct)) continue
      if (!distractors.some((d) => normalize(d) === normalize(text))) {
        distractors.push(text)
      }
      if (distractors.length >= 3) break
    }
  }

  while (distractors.length < 3) {
    distractors.push(fallbackDistractor(card, distractors.length))
  }

  const picked = shuffle(distractors.slice(0, 3), random)
  const answerIndex = Math.floor(random() * 4)
  const choices = [...picked]
  choices.splice(answerIndex, 0, correct)

  return {
    prompt: card.front,
    ask: copy.ask,
    kindLabel: copy.kindLabel,
    choices: choices.slice(0, 4),
    answerIndex,
  }
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
    if (seen.has(key)) continue
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
