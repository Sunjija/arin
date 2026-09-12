import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assessContentReadiness } from './content-readiness.mjs'

const fixture = () => ({
  concepts: [{ id: 'a', lessonId: 'l', title: 'A' }, { id: 'b', lessonId: 'l', title: 'B' }],
  guides: [{ lessonId: 'l', reviewStatus: 'source-checked', checkedAt: '2026-09-13', contentVersion: 1,
    sections: [{ conceptId: 'a', paragraphs: ['Authored explanation'], recallPrompt: 'Recall', expectedElements: ['Fact'], sourceUrl: 'https://example.org/source' }] }],
  questions: [{ id: 'q', lessonId: 'l', conceptIds: ['a'], familyId: 'family-1', stem: 'Question', choices: ['A', 'B', 'C', 'D', 'E'], answerIndex: 0, explanation: 'Explanation', sourceUrl: 'https://example.org/source' }],
})

test('does not promote a keyword mention or an unprepared catalog entry to coverage', () => {
  const input = fixture()
  input.questions[0].stem = 'This mentions B too'
  const result = assessContentReadiness(input)
  assert.equal(result.counts.pilotReadyConcepts, 1)
  assert.equal(result.counts.unresolvedConcepts, 1)
  assert.equal(result.concepts[0].humanReview, 'unverified')
  assert.equal(result.counts.conceptsWithSeparateFamily, 0)
})
test('drafts and explanations without explicit valid checks are not pilot-ready', () => {
  for (const mutate of [
    input => { input.guides[0].reviewStatus = 'draft' },
    input => { input.questions[0].conceptIds = [] },
    input => { input.questions[0].sourceUrl = '' },
    input => { input.questions[0].choices[1] = 'A' },
    input => { input.questions[0].answerIndex = 5 },
    input => { input.guides[0].sections[0].expectedElements = [] },
  ]) {
    const input = fixture(); mutate(input)
    assert.equal(assessContentReadiness(input).counts.pilotReadyConcepts, 0)
  }
})
test('repeated variants from the same family do not become independent coverage', () => {
  const input = fixture()
  input.questions.push({ ...input.questions[0], id: 'q2' })
  assert.equal(assessContentReadiness(input).counts.conceptsWithSeparateFamily, 0)
  input.questions[1].familyId = 'family-2'
  assert.equal(assessContentReadiness(input).counts.conceptsWithSeparateFamily, 1)
})
test('duplicate guide sections and cross-lesson mappings fail the audit without inflating counts', () => {
  const input = fixture()
  input.guides[0].sections.push({ ...input.guides[0].sections[0] })
  input.questions[0].lessonId = 'different-lesson'
  const result = assessContentReadiness(input)
  assert.equal(result.counts.pilotReadyConcepts, 0)
  assert.equal(result.errors.length, 2)
})
