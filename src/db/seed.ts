import { flashcardSeeds } from '../data/cards'
import { defaultMastery, defaultSettings } from '../data/defaults'
import { cardFingerprint } from '../lib/cardFingerprint'
import { toDateKey } from '../lib/dates'
import type { FlashcardRecord } from '../types'
import { db } from './database'

/** 카드·단원 확장 시 올려 기존 IndexedDB에 새 카드를 보강한다 */
export const CONTENT_VERSION = 3

export function seedCards(today = toDateKey()): FlashcardRecord[] {
  return flashcardSeeds.map((seed, index) => {
    // 초반 일부는 오늘 복습 대상으로 두어 첫 세션이 비지 않게 함
    const dueToday = index < 12
    return {
      ...seed,
      createdAt: today,
      updatedAt: today,
      nextReviewAt: dueToday ? today : today,
      intervalDays: dueToday ? 0 : 0,
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
  return {
    ...existing,
    front: seeded.front,
    back: seeded.back,
    kind: seeded.kind,
    era: seeded.era,
    tags: seeded.tags,
    fingerprint: seeded.fingerprint,
  }
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
    ],
    async () => {
      await Promise.all([
        db.cards.clear(),
        db.wrongAnswers.clear(),
        db.attempts.clear(),
        db.studyDays.clear(),
        db.mockResults.clear(),
        db.activeSession.clear(),
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
      ])
    },
  )
  await ensureSeeded()
}
