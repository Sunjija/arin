/**
 * 문제검사 CLI
 * 사용: npx vitest run src/data/inspectQuestions.cli.test.ts
 * 또는: npx tsx 대신 vitest로 리포트 파일 생성
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { inspectQuestionBank, formatReportText } from './inspectQuestions'

const report = inspectQuestionBank()
const text = formatReportText(report)

mkdirSync('artifacts', { recursive: true })
writeFileSync('artifacts/question-inspection-report.md', text)
writeFileSync('artifacts/question-inspection-report.json', JSON.stringify(report, null, 2))

console.log(text)
console.log('\nWrote artifacts/question-inspection-report.md')
