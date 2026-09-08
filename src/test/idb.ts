import 'fake-indexeddb/auto'
import { defaultMastery, defaultSettings } from '../data/defaults'
import { db } from '../db/database'
import type { AttemptRecord, UserSettings } from '../types'

export async function resetAppDb(): Promise<void> {
  if (db.isOpen()) db.close()
  await db.delete()
  await db.open()
}

export async function seedCore(settings?: Partial<UserSettings>): Promise<void> {
  await db.settings.put({
    id: 'settings',
    ...defaultSettings(),
    startDate: '2026-01-05',
    ...settings,
  })
  await db.mastery.put({ id: 'mastery', ...defaultMastery() })
  await db.meta.put({
    id: 'meta',
    seededAt: '2026-01-05',
    contentVersion: 5,
    streak: 0,
    lastStudyDate: null,
    estimatedScore: 40,
  })
}

export function practiceAttempt(
  id: string,
  correct: boolean,
  createdAt: string,
): AttemptRecord {
  return {
    id,
    questionId: `q-${id}`,
    correct,
    selectedIndex: correct ? 0 : 1,
    responseMs: 4000,
    era: 'goryeo',
    tags: ['king-figure'],
    createdAt,
    source: 'practice',
  }
}
