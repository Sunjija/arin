import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validate, impact, readBank } from './audit.mjs'
test('blocks duplicate IDs, invalid answers and era mismatch', () => {
  const q = { id: 'q', stem: 'x', explanation: 'x', choices: ['a','b','c','d','e'], answerIndex: 9, lessonId: 'l', era: 'goryeo' }
  const result = validate([{ id: 'l', era: 'prehistoric' }], [q, q], [])
  assert.ok(result.errors.some(e => e.includes('duplicate')))
  assert.ok(result.errors.some(e => e.includes('invalid')))
  assert.ok(result.errors.some(e => e.includes('era')))
})
test('flags source and documentation gaps without calling them fact errors', () => {
  const result = validate([], [{ id:'q', stem:'x', explanation:'x', choices:['a','b','c','d','e'], answerIndex:0 }], [])
  assert.equal(result.errors.length, 0)
  assert.equal(result.warnings.length, 2)
  assert.ok(impact(['src/types/index.ts']).some(n => n.includes('migration')))
  assert.ok(impact(['src/data/questions.ts']).some(n => n.includes('Documentation')))
})
test('reads actual literal bank', () => assert.ok(readBank('src/data/questions.ts', 'authoredQuestions').length > 0))
