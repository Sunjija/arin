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
})
