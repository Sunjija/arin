import { cardFingerprint } from './cardFingerprint'
import { toDateKey } from './dates'
import { db } from '../db/database'
import {
  buildWrongCardBack,
  buildWrongCardFront,
  resolveQuestionSource,
} from './wrongCardContent'
import type { FlashcardRecord, QuestionSnapshot } from '../types'
import type { CreateWrongCardResult } from '../types/contracts'

export {
  buildWrongCardBack,
  buildWrongCardFront,
  resolveQuestionSource,
  snapshotFromQuestion,
} from './wrongCardContent'

export async function createWrongCardFromQuestion(input: {
  questionId: string
  snapshot?: QuestionSnapshot
}): Promise<CreateWrongCardResult> {
  const source = resolveQuestionSource(input)
  if (!source) {
    return { ok: false, reason: 'source-missing', questionId: input.questionId }
  }

  const front = buildWrongCardFront(source)
  const back = buildWrongCardBack(source)
  const fingerprint = cardFingerprint(front, back)
  const existing = await db.cards.where('fingerprint').equals(fingerprint).first()
  if (existing) return { ok: true, card: existing, created: false }

  const today = toDateKey()
  const card: FlashcardRecord = {
    id: `card-wrong-${source.questionId}-${Date.now()}`,
    front,
    back,
    kind: 'concept',
    era: source.era,
    tags: source.tags,
    fromWrongAnswer: true,
    createdAt: today,
    updatedAt: today,
    nextReviewAt: today,
    intervalDays: 0,
    easeStreak: 0,
    lapses: 0,
    fingerprint,
    sourceQuestionId: source.questionId,
    sourceChoices: [...source.choices],
    sourceAnswerIndex: source.answerIndex,
    sourcePassage: source.passage,
    userEdited: false,
  }
  await db.cards.put(card)
  return { ok: true, card, created: true }
}

export async function updateCardContent(input: {
  cardId: string
  front: string
  back: string
}): Promise<FlashcardRecord> {
  const card = await db.cards.get(input.cardId)
  if (!card) throw new Error('카드를 찾을 수 없습니다.')
  const front = input.front.trim()
  const back = input.back.trim()
  const fingerprint = cardFingerprint(front, back)
  const updated: FlashcardRecord = {
    ...card,
    front,
    back,
    fingerprint,
    userEdited: true,
    updatedAt: toDateKey(),
  }
  await db.cards.put(updated)
  return updated
}
