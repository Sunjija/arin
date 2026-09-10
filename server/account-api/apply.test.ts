import { describe, expect, it } from 'vitest'
import { applyEventToHead, mergeLessonCompletion, mergeStudyDay, replayEvents } from './apply.ts'

describe('sync apply policy', () => {
  it('keeps the first attempt and unions later ids via replay', () => {
    const heads = replayEvents([
      {
        eventId: 'evt_1',
        collection: 'attempts',
        entityId: 'a1',
        op: 'upsert',
        clientUpdatedAt: '2026-01-01T00:00:00.000Z',
        deviceId: 'dev_1',
        payload: { id: 'a1', correct: true },
      },
      {
        eventId: 'evt_2',
        collection: 'attempts',
        entityId: 'a1',
        op: 'upsert',
        clientUpdatedAt: '2026-01-02T00:00:00.000Z',
        deviceId: 'dev_2',
        payload: { id: 'a1', correct: false },
      },
      {
        eventId: 'evt_3',
        collection: 'attempts',
        entityId: 'a2',
        op: 'upsert',
        clientUpdatedAt: '2026-01-02T00:00:00.000Z',
        deviceId: 'dev_2',
        payload: { id: 'a2', correct: true },
      },
    ])
    expect(heads.get('attempts:a1')?.payload).toEqual({ id: 'a1', correct: true })
    expect(heads.get('attempts:a2')?.payload).toEqual({ id: 'a2', correct: true })
  })

  it('does not silently overwrite a newer in-progress mock', () => {
    const first = applyEventToHead(undefined, {
      eventId: 'evt_m1',
      collection: 'activeMock',
      entityId: 'active',
      op: 'upsert',
      clientUpdatedAt: '2026-01-01T00:00:00.000Z',
      deviceId: 'dev_1',
      payload: { id: 'mock-1', revision: 3, answers: [0, 1] },
    })
    expect(first.kind).toBe('apply')
    const conflict = applyEventToHead(first.kind === 'apply' ? first.head ?? undefined : undefined, {
      eventId: 'evt_m2',
      collection: 'activeMock',
      entityId: 'active',
      op: 'upsert',
      clientUpdatedAt: '2026-01-02T00:00:00.000Z',
      deviceId: 'dev_2',
      payload: { id: 'mock-1', revision: 3, answers: [1, 1] },
    })
    expect(conflict.kind).toBe('conflict')
  })

  it('merges study days by max counts and unioned session ids', () => {
    const merged = mergeStudyDay(
      { date: '2026-01-01', completed: false, cardsReviewed: 2, finishedSessionIds: ['s1'] },
      { date: '2026-01-01', completed: true, cardsReviewed: 1, finishedSessionIds: ['s2'] },
    )
    expect(merged).toMatchObject({
      date: '2026-01-01',
      completed: true,
      cardsReviewed: 2,
      finishedSessionIds: ['s1', 's2'],
    })
  })

  it('merges lesson completions without losing the first date', () => {
    const merged = mergeLessonCompletion(
      { lessonId: 'lesson-01', firstCompletedAt: '2026-01-01', lastCompletedAt: '2026-01-01', completionCount: 1 },
      { lessonId: 'lesson-01', firstCompletedAt: '2026-01-03', lastCompletedAt: '2026-01-04', completionCount: 2 },
    )
    expect(merged).toMatchObject({
      firstCompletedAt: '2026-01-01',
      lastCompletedAt: '2026-01-04',
      completionCount: 2,
    })
  })
})
