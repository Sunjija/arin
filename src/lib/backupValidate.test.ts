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

  it('accepts frozen mock snapshots that include stimulus and content version', () => {
    const result = validateExportPayload({
      ...validPayload(),
      version: 2,
      activeMock: {
        id: 'mock-1',
        revision: 1,
        mode: 'sample',
        status: 'in-progress',
        questionSnapshots: [
          {
            questionId: 'q-57',
            stem: '다음 자료의 단체에 대한 설명으로 옳은 것은?',
            passage: '상하이에서 김구가 소수의 결사를 조직하였다.',
            choices: ['가', '나', '다', '라', '마'],
            answerIndex: 0,
            explanation: '한인애국단',
            era: 'colonial',
            tags: ['independence-org'],
            difficulty: 2,
            contentVersion: 2,
            choiceOrder: 'free',
            stimulusType: 'document',
            stimulus: {
              kind: 'document',
              authenticity: 'reconstructed',
              body: '상하이에서 김구가 소수의 결사를 조직하였다.',
            },
          },
        ],
        answers: [0],
        itemElapsedMs: [1200],
        currentIndex: 0,
        startedAt: '2026-09-10T00:00:00.000Z',
        deadlineAt: '2026-09-10T00:16:00.000Z',
        updatedAt: '2026-09-10T00:01:00.000Z',
      },
    })
    expect(result.ok).toBe(true)
  })
})
