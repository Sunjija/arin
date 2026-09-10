import { describe, expect, it } from 'vitest'
import { validateExportPayload } from './backupValidate'
import { defaultMastery, defaultSettings } from '../data/defaults'

function validPayload() {
  return {
    version: 1,
    exportedAt: '2026-09-01T00:00:00.000Z',
    settings: defaultSettings(),
    mastery: defaultMastery(),
    cards: [],
    wrongAnswers: [],
    attempts: [],
    studyDays: [],
    mockResults: [],
    activeSession: null,
    meta: {
      id: 'meta' as const,
      seededAt: '2026-09-01',
      streak: 0,
      lastStudyDate: null,
      estimatedScore: 40,
    },
  }
}

describe('backup validation', () => {
  it('accepts version 1 payloads', () => {
    const result = validateExportPayload(validPayload())
    expect(result.ok).toBe(true)
  })

  it('rejects unsupported versions and broken settings without throwing', () => {
    expect(validateExportPayload({ ...validPayload(), version: 9 }).ok).toBe(false)
    expect(validateExportPayload({ ...validPayload(), settings: { goalScore: 200 } }).ok).toBe(false)
    expect(validateExportPayload({ ...validPayload(), mockResults: [{ id: 'x' }] }).ok).toBe(false)
  })

  it('rejects empty settings/mastery objects that used to import as success', () => {
    const emptied = {
      ...validPayload(),
      settings: {},
      mastery: {},
      attempts: [],
    }
    const result = validateExportPayload(emptied)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message.length).toBeGreaterThan(0)
    }
  })

  it('rejects out-of-range daily question count with the same rule as settings', () => {
    const result = validateExportPayload({
      ...validPayload(),
      settings: { ...defaultSettings(), dailyQuestionCount: 0 },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('하루 문제 수')
  })

  it('rejects mastery records missing era keys', () => {
    const result = validateExportPayload({
      ...validPayload(),
      mastery: { eras: {}, types: {} },
    })
    expect(result.ok).toBe(false)
  })

  it('rejects malformed nested records and active progress', () => {
    expect(
      validateExportPayload({
        ...validPayload(),
        attempts: [{ id: 'attempt-without-required-fields' }],
      }).ok,
    ).toBe(false)

    expect(
      validateExportPayload({
        ...validPayload(),
        activeSession: {
          id: 'broken-session',
          date: '2026-09-01',
          step: 'cards',
          lessonId: 'lesson-01',
        },
      }).ok,
    ).toBe(false)

    expect(
      validateExportPayload({
        ...validPayload(),
        version: 2,
        lessonCompletions: [
          {
            lessonId: 'lesson-01',
            firstCompletedAt: '2026-09-01',
            lastCompletedAt: '2026-09-01',
          },
        ],
      }).ok,
    ).toBe(false)
  })
})
