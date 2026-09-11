import { ALL_ERAS, ALL_TYPES } from '../types'

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value) }
function isId(value: unknown): value is string { return typeof value === 'string' && value.length > 0 }
function idList(value: unknown): value is string[] { return Array.isArray(value) && value.every(isId) }

export function isQuestionSnapshot(value: unknown): boolean {
  if (!isRecord(value)) return false
  return isId(value.questionId) && typeof value.stem === 'string' &&
    Array.isArray(value.choices) && value.choices.length > 1 && value.choices.every(choice => typeof choice === 'string') &&
    Number.isInteger(value.answerIndex) && Number(value.answerIndex) >= 0 && Number(value.answerIndex) < value.choices.length &&
    typeof value.explanation === 'string' && ALL_ERAS.includes(value.era as never) &&
    Array.isArray(value.tags) && value.tags.every(tag => ALL_TYPES.includes(tag as never)) &&
    [1, 2, 3].includes(Number(value.difficulty)) &&
    (value.conceptIds === undefined || idList(value.conceptIds)) &&
    (value.familyId === undefined || isId(value.familyId)) &&
    (value.contentVersion === undefined || (Number.isInteger(value.contentVersion) && Number(value.contentVersion) > 0))
}

