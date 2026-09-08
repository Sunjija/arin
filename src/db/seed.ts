import { flashcardSeeds } from '../data/cards'
import { defaultMastery, defaultSettings } from '../data/defaults'
import { cardFingerprint } from '../lib/cardFingerprint'
import { personKey } from '../lib/cardQuiz'
import { addDays, toDateKey } from '../lib/dates'
import type { EraId, FlashcardRecord, FlashcardSeed } from '../types'
import { db } from './database'

/** 카드 일정 시드를 고치면 올려 기존 IndexedDB의 미복습 카드 일정을 맞춘다 */
export const CONTENT_VERSION = 5

/** 첫날 복습이 비지 않을 만큼만 오늘 due로 둔다. */
export const INITIAL_DUE_COUNT = 12
const INITIAL_DUE_ERAS: EraId[] = ['prehistoric', 'three-kingdoms']

export function initialDueSeedIds(
  seeds: Array<Pick<FlashcardSeed, 'id' | 'era' | 'kind' | 'front' | 'back'>> = flashcardSeeds,
): Set<string> {
  const ordered = [
    ...seeds.filter((seed) => INITIAL_DUE_ERAS.includes(seed.era)),
    ...seeds.filter((seed) => !INITIAL_DUE_ERAS.includes(seed.era)),
  ]
  const picked: typeof ordered = []
  const seenPeople = new Set<string>()
  for (const seed of ordered) {
    if (picked.length >= INITIAL_DUE_COUNT) break
    const person = personKeyForSeed(seed)
    if (person && seenPeople.has(person)) continue
    picked.push(seed)
    if (person) seenPeople.add(person)
  }
  return new Set(picked.map((seed) => seed.id))
}

function personKeyForSeed(seed: Pick<FlashcardSeed, 'kind' | 'front' | 'back'>): string | null {
  if (seed.kind === 'king-to-deed') return personKey(seed.front)
  if (seed.kind === 'deed-to-king') return personKey(seed.back)
  return null
}

export function seedCards(today = toDateKey()): FlashcardRecord[] {
  const dueIds = initialDueSeedIds()
  return flashcardSeeds.map((seed, index) => {
    const dueToday = dueIds.has(seed.id)
    return {
      ...seed,
      createdAt: today,
      updatedAt: today,
      nextReviewAt: dueToday ? today : addDays(today, 2 + Math.floor(index / 6)),
      intervalDays: 0,
      easeStreak: 0,
      lapses: 0,
      fingerprint: cardFingerprint(seed.front, seed.back),
      fromWrongAnswer: false,
    }
  })
}

/** 시드 문구는 갱신하되 사용자의 복습 일정과 성취 기록은 보존한다. */
export function mergeSeedCard(
  existing: FlashcardRecord,
  seeded: FlashcardRecord,
): FlashcardRecord {
  if (existing.userEdited || existing.fromWrongAnswer || existing.id.startsWith('card-user-')) {
    return existing
  }
  const merged: FlashcardRecord = {
    ...existing,
    front: seeded.front,
    back: seeded.back,
    kind: seeded.kind,
    era: seeded.era,
    tags: seeded.tags,
    fingerprint: seeded.fingerprint,
  }
  if (isUnreviewedSeedCard(existing)) {
    merged.nextReviewAt = seeded.nextReviewAt
    merged.intervalDays = seeded.intervalDays
  }
  return merged
}

export function isUnreviewedSeedCard(card: FlashcardRecord): boolean {
  return (
    !card.userEdited &&
    !card.fromWrongAnswer &&
    !card.id.startsWith('card-user-') &&
    card.intervalDays === 0 &&
    card.easeStreak === 0 &&
    card.lapses === 0 &&
    card.lastRating == null
  )
}

export async function ensureSeeded(): Promise<void> {
  const [meta, settings, mastery, cardCount] = await Promise.all([
    db.meta.get('meta'),
    db.settings.get('settings'),
    db.mastery.get('mastery'),
    db.cards.count(),
  ])

  const today = toDateKey()
  const needsContentBump = Boolean(meta) && (meta?.contentVersion ?? 1) < CONTENT_VERSION
  // 부분 손상 복구: meta만 있고 설정/카드가 비어 홈이 멈추는 경우 방지
  if (meta && settings && mastery && cardCount > 0 && !needsContentBump) return

  await db.transaction(
    'rw',
    [
      db.settings,
      db.mastery,
      db.cards,
      db.meta,
      db.wrongAnswers,
      db.attempts,
      db.studyDays,
      db.mockResults,
      db.activeSession,
      db.activeMock,
      db.lessonCompletions,
    ],
    async () => {
      if (!settings) await db.settings.put({ id: 'settings', ...defaultSettings() })
      if (!mastery) await db.mastery.put({ id: 'mastery', ...defaultMastery() })
      if (cardCount === 0) {
        await db.cards.bulkPut(seedCards(today))
      } else if (needsContentBump) {
        const existing = new Map((await db.cards.toArray()).map((card) => [card.id, card]))
        const refreshed = seedCards(today).map((seeded) => {
          const current = existing.get(seeded.id)
          return current ? mergeSeedCard(current, seeded) : seeded
        })
        await db.cards.bulkPut(refreshed)
        await db.activeSession.clear()
      }
      if (!meta) {
        await db.meta.put({
          id: 'meta',
          seededAt: today,
          contentVersion: CONTENT_VERSION,
          streak: 0,
          lastStudyDate: null,
          estimatedScore: 40,
        })
      } else if (needsContentBump) {
        await db.meta.put({ ...meta, contentVersion: CONTENT_VERSION })
      }
    },
  )
}

/** 샘플 콘텐츠·설정만 복원하고 학습 기록은 비움 */
export async function restoreSampleData(): Promise<void> {
  const today = toDateKey()
  await db.transaction(
    'rw',
    [
      db.settings,
      db.mastery,
      db.cards,
      db.meta,
      db.wrongAnswers,
      db.attempts,
      db.studyDays,
      db.mockResults,
      db.activeSession,
      db.activeMock,
      db.lessonCompletions,
    ],
    async () => {
      await Promise.all([
        db.cards.clear(),
        db.wrongAnswers.clear(),
        db.attempts.clear(),
        db.studyDays.clear(),
        db.mockResults.clear(),
        db.activeSession.clear(),
        db.activeMock.clear(),
        db.lessonCompletions.clear(),
      ])
      await db.settings.put({ id: 'settings', ...defaultSettings() })
      await db.mastery.put({ id: 'mastery', ...defaultMastery() })
      await db.cards.bulkPut(seedCards(today))
      await db.meta.put({
        id: 'meta',
        seededAt: today,
        contentVersion: CONTENT_VERSION,
        streak: 0,
        lastStudyDate: null,
        estimatedScore: 40,
      })
    },
  )
}

export async function clearAllLearningData(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.settings,
      db.mastery,
      db.cards,
      db.meta,
      db.wrongAnswers,
      db.attempts,
      db.studyDays,
      db.mockResults,
      db.activeSession,
      db.activeMock,
      db.lessonCompletions,
    ],
    async () => {
      await Promise.all([
        db.settings.clear(),
        db.mastery.clear(),
        db.cards.clear(),
        db.meta.clear(),
        db.wrongAnswers.clear(),
        db.attempts.clear(),
        db.studyDays.clear(),
        db.mockResults.clear(),
        db.activeSession.clear(),
        db.activeMock.clear(),
        db.lessonCompletions.clear(),
      ])
    },
  )
  await ensureSeeded()
}
