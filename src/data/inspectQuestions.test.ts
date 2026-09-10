import { describe, expect, it } from 'vitest'
import { writeFileSync, mkdirSync } from 'node:fs'
import { EXAM_FORMATS, TARGET_FORMAT_MIX } from './examFormats'
import { formatReportText, inspectQuestionBank } from './inspectQuestions'

describe('exam format catalog', () => {
  it('has core 한능검-style formats', () => {
    expect(EXAM_FORMATS.length).toBeGreaterThanOrEqual(12)
    expect(EXAM_FORMATS.some((f) => f.id === 'source-who')).toBe(true)
    expect(EXAM_FORMATS.some((f) => f.id === 'chronology-labeled')).toBe(true)
  })
})

describe('question inspection agent', () => {
  it('produces a report and writes artifacts', () => {
    const report = inspectQuestionBank()
    expect(report.total).toBeGreaterThanOrEqual(100)
    expect(report.findings.filter((finding) => finding.severity === 'error')).toEqual([])
    expect(report.findings.some((finding) => finding.code === 'CYCLIC_ANSWER_INDEX')).toBe(false)
    expect(report.answerPositionCounts.reduce((sum, count) => sum + count, 0)).toBe(report.total)

    mkdirSync('artifacts', { recursive: true })
    const text = formatReportText(report)
    writeFileSync('artifacts/question-inspection-report.md', text)
    writeFileSync('artifacts/question-inspection-report.json', JSON.stringify(report, null, 2))

  })

  it('uses a format target mix that totals 100 percent', () => {
    const total = Object.values(TARGET_FORMAT_MIX).reduce(
      (sum, target) => sum + (target ?? 0),
      0,
    )
    expect(total).toBe(100)
  })
})
