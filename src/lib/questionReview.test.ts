import { describe, expect, it } from 'vitest'
import { APPROVAL_CONDITIONS, approvalGaps, isHumanApproved } from './questionReview'
import { withBankDefaults } from '../data/questionBank'
import type { Question } from '../types'

describe('question approval gates', () => {
  it('requires human review and does not treat AI review as approval', () => {
    expect(APPROVAL_CONDITIONS.some((line) => line.includes('AI 검토만으로는 승인할 수 없다'))).toBe(
      true,
    )
    const draft = withBankDefaults({
      id: 'q-x',
      stem: 's',
      choices: ['a', 'b', 'c', 'd', 'e'],
      answerIndex: 0,
      explanation: 'e',
      era: 'goryeo',
      tags: ['source'],
      difficulty: 2,
      source: '',
      sourceUrl: '',
      license: '',
      imageRights: '',
      reviewStatus: 'in-review',
      provenance: {
        origin: 'original',
        blueprintVersion: '2026-09-batch1',
        factSources: [],
        productionMethod: 'ai-draft-human-pending',
        authorId: 'batch1-editor',
        reviewAgent: 'ai',
        reviewedAt: null,
        rightsStatus: 'reconstructed-study',
        similarityAudit: { status: 'not-run', reviewed: false },
      },
    } satisfies Question)
    expect(isHumanApproved(draft)).toBe(false)
    expect(approvalGaps(draft).some((gap) => gap.includes('사람 검수'))).toBe(true)
    expect(approvalGaps(draft).some((gap) => gap.includes('유사도'))).toBe(true)
  })
})
