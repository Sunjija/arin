import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { questions } from '../data/questions'
import { cardFingerprint } from './cardFingerprint'
import { createWrongCardFromQuestion } from './wrongCard'
import { buildWrongCardBack, buildWrongCardFront, snapshotFromQuestion } from './wrongCardContent'
import { db } from '../db/database'
import { resetAppDb } from '../test/idb'

afterEach(async () => {
  await resetAppDb()
})

describe('createWrongCardFromQuestion', () => {
  it('stores passage+stem and treats the same content as a duplicate', async () => {
    await resetAppDb()
    const q01 = questions.find((item) => item.id === 'q-01')
    const q03 = questions.find((item) => item.id === 'q-03')
    expect(q01 && q03).toBeTruthy()
    const created = await createWrongCardFromQuestion({
      questionId: 'q-01',
      snapshot: snapshotFromQuestion(q01!),
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(created.created).toBe(true)
    expect(created.card.front).toContain('기하학적 무늬')
    expect(created.card.front).toContain(q01!.stem)
    expect(created.card.sourcePassage).toBe(q01!.passage)
    expect(created.card.fingerprint).toBe(
      cardFingerprint(buildWrongCardFront(snapshotFromQuestion(q01!)), buildWrongCardBack(snapshotFromQuestion(q01!))),
    )

    const duplicate = await createWrongCardFromQuestion({
      questionId: 'q-01',
      snapshot: snapshotFromQuestion(q01!),
    })
    expect(duplicate.ok).toBe(true)
    if (duplicate.ok) {
      expect(duplicate.created).toBe(false)
      expect(duplicate.card.id).toBe(created.card.id)
    }

    const withoutPassage = await createWrongCardFromQuestion({
      questionId: 'q-03',
      snapshot: snapshotFromQuestion(q03!),
    })
    expect(withoutPassage.ok).toBe(true)
    if (withoutPassage.ok) {
      expect(withoutPassage.card.front).toBe(q03!.stem)
    }
    expect(await db.cards.count()).toBe(2)
  })
})
