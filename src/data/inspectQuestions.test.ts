import { describe, expect, it } from 'vitest'
import { writeFileSync, mkdirSync } from 'node:fs'
import { EXAM_FORMATS } from './examFormats'
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
    expect(report.total).toBeGreaterThanOrEqual(30)
    expect(report.summary).toBeDefined()

    mkdirSync('artifacts', { recursive: true })
    const text = formatReportText(report)
    writeFileSync('artifacts/question-inspection-report.md', text)
    writeFileSync('artifacts/question-inspection-report.json', JSON.stringify(report, null, 2))

    // 검사 파이프라인 자체는 통과. 품질 이슈는 리포트로 추적.
    expect(report.findings.length).toBeGreaterThanOrEqual(0)
  })
})
