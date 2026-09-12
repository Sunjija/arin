import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { readBank, sourceHash } from './audit.mjs'

const text = value => typeof value === 'string' && Boolean(value.trim())
const source = value => {
  try { return new URL(value).protocol === 'https:' } catch { return false }
}
const validQuestion = question => Array.isArray(question.choices) && question.choices.length === 5 &&
  question.choices.every(text) && new Set(question.choices.map(choice => choice.trim())).size === 5 &&
  Number.isInteger(question.answerIndex) && question.answerIndex >= 0 && question.answerIndex < 5 &&
  text(question.stem) && text(question.explanation) && source(question.sourceUrl)

/** Structural pilot coverage only. This never grants historical accuracy or human approval. */
export function assessContentReadiness({ concepts, guides, questions }) {
  const errors = []
  for (const [name, rows, key] of [['concepts', concepts, 'id'], ['guides', guides, 'lessonId'], ['questions', questions, 'id']]) {
    const ids = rows.map(row => row[key])
    if (ids.some(id => !text(id)) || new Set(ids).size !== ids.length) errors.push(`${name}: missing/duplicate IDs`)
  }
  const sections = guides.flatMap(guide => (guide.sections ?? []).map(section => ({ section, guide })))
  const sectionIds = sections.map(({ section }) => section.conceptId)
  if (new Set(sectionIds).size !== sectionIds.length) errors.push('guides: duplicate concept sections')
  for (const { section, guide } of sections) {
    if (!concepts.some(concept => concept.id === section.conceptId && concept.lessonId === guide.lessonId)) {
      errors.push(`${section.conceptId}: guide scope mismatch`)
    }
  }
  for (const question of questions) {
    if (question.conceptIds?.some(id => !concepts.some(concept => concept.id === id && concept.lessonId === question.lessonId))) {
      errors.push(`${question.id}: question scope mismatch`)
    }
  }
  const rows = concepts.map(concept => {
    const matches = sections.filter(({ section, guide }) => section.conceptId === concept.id && guide.lessonId === concept.lessonId)
    const match = matches.length === 1 ? matches[0] : undefined
    const guideReady = Boolean(match && ['source-checked', 'approved'].includes(match.guide.reviewStatus) &&
      text(match.guide.checkedAt) && Number.isInteger(match.guide.contentVersion) && match.guide.contentVersion > 0 &&
      match.section.paragraphs?.length && match.section.paragraphs.every(text) && text(match.section.recallPrompt) &&
      match.section.expectedElements?.length && match.section.expectedElements.every(text) && source(match.section.sourceUrl))
    const mapped = questions.filter(question => question.lessonId === concept.lessonId && question.conceptIds?.includes(concept.id) && validQuestion(question))
    const families = [...new Set(mapped.map(question => question.familyId).filter(text))]
    const missing = []
    if (!guideReady) missing.push('source-checked-explanation-and-recall')
    if (!mapped.length) missing.push('explicit-source-linked-check-question')
    if (families.length < 2) missing.push('second-authored-assessment-family')
    return { conceptId: concept.id, title: concept.title, lessonId: concept.lessonId, guideReady,
      checkQuestionIds: mapped.map(question => question.id), assessmentFamilies: families,
      pilotReady: guideReady && mapped.length > 0, separateFamilyAvailable: guideReady && families.length >= 2,
      humanReview: 'unverified', missing }
  })
  return {
    scope: 'structural-content-coverage-v1',
    caveat: 'Counts are structural checks of the internal draft catalog, not release readiness, official syllabus coverage, historical verification, human approval, or measured learning effectiveness. Different family IDs alone do not prove independent assessment.',
    counts: { catalogConcepts: rows.length, sourceCheckedGuides: rows.filter(row => row.guideReady).length,
      pilotReadyConcepts: rows.filter(row => row.pilotReady).length, conceptsWithSeparateFamily: rows.filter(row => row.separateFamilyAvailable).length,
      unresolvedConcepts: rows.filter(row => !row.pilotReady).length },
    concepts: rows, errors,
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const inputs = ['src/data/topicCatalog.ts', 'src/data/lessonGuides.ts', 'src/data/questions.ts']
  const report = assessContentReadiness({ concepts: readBank(inputs[0], 'TOPIC_CATALOG'), guides: readBank(inputs[1], 'lessonGuides'), questions: readBank(inputs[2], 'authoredQuestions') })
  report.commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  report.inputHashes = Object.fromEntries(inputs.map(file => [file, sourceHash(fs.readFileSync(file, 'utf8'))]))
  fs.mkdirSync('automation-reports', { recursive: true })
  fs.writeFileSync('automation-reports/content-readiness.json', JSON.stringify(report, null, 2) + '\n')
  const safe = value => String(value).replace(/[|<>\r\n]/g, ' ')
  fs.writeFileSync('automation-reports/content-readiness.md', [
    '# 콘텐츠 출시 공백', '', report.caveat, '', `기준 커밋: ${report.commit}`, '',
    `개념 ${report.counts.catalogConcepts} / 출처 확인 표시 설명 ${report.counts.sourceCheckedGuides} / 설명+확인 문제 ${report.counts.pilotReadyConcepts} / 서로 다른 평가 계열 ${report.counts.conceptsWithSeparateFamily}`,
    '', 'URL 존재만 검사하며 출처의 내용·검수자의 신원·권리는 자동 승인하지 않는다. 기출 대비 품질이나 실측 정답률을 산출하지 않는다.', '',
    '| 개념 | 설명+확인 문제 | 남은 구조 작업 |', '|---|---|---|',
    ...report.concepts.map(row => `| ${safe(row.conceptId)} ${safe(row.title)} | ${row.pilotReady ? '구조 갖춤·사람 검수 별도' : '미준비'} | ${row.missing.join(', ') || '사람 검수 별도'} |`),
    '', '## 구조 오류', ...(report.errors.length ? report.errors.map(error => `- ${safe(error)}`) : ['- 없음']), '',
  ].join('\n'))
  console.log(JSON.stringify({ counts: report.counts, errors: report.errors }))
  // Missing content is reported, not disguised as a CI pass for release. Malformed mappings fail CI.
  if (report.errors.length) process.exitCode = 1
}
