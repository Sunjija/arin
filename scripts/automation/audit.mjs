import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'

// Parse literals without executing code from a pull request.
export function readBank(file, variable) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
  let array
  function walk(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === variable && node.initializer) array = node.initializer
    ts.forEachChild(node, walk)
  }
  walk(source)
  if (!array || !ts.isArrayLiteralExpression(array)) throw new Error(`${file}: ${variable} must be a literal array; update audit adapter for new schema`)
  function literal(node) {
    if (ts.isStringLiteralLike(node)) return node.text
    if (ts.isNumericLiteral(node)) return Number(node.text)
    if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal)
    if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.filter(ts.isPropertyAssignment).map(p => [p.name.getText(source).replace(/^['"]|['"]$/g, ''), literal(p.initializer)]))
    return undefined
  }
  return array.elements.map(node => {
    if (!ts.isObjectLiteralExpression(node)) throw new Error(`${file}: non-literal item; audit adapter required`)
    return literal(node)
  })
}
export function validate(lessons, questions, cards) {
  const errors = [], warnings = []
  for (const [name, bank] of Object.entries({ lessons, questions, cards })) {
    const seen = new Set()
    for (const row of bank) {
      if (!row.id || seen.has(row.id)) errors.push(`${name}: missing or duplicate ID ${row.id}`)
      seen.add(row.id)
    }
  }
  const ids = new Map(lessons.map(l => [l.id, l]))
  for (const q of questions) {
    if (!q.stem || !q.explanation || !Array.isArray(q.choices) || q.choices.length !== 5 || q.choices.some(c => typeof c !== 'string' || !c.trim()) || !Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex >= q.choices.length) errors.push(`${q.id}: invalid question/choices/answer/explanation`)
    if (!ids.has(q.lessonId)) warnings.push(`${q.id}: no valid lesson mapping`)
    else if (ids.get(q.lessonId).era !== q.era) errors.push(`${q.id}: era differs from lesson`)
    if (!q.sourceUrl) warnings.push(`${q.id}: per-question source URL not available in literal record (spread metadata requires separate review)`)
  }
  return { errors, warnings }
}
export function impact(files) {
  const notes = []
  if (files.some(f => /^src\/(types|db)\//.test(f))) notes.push('E: common contracts / migration / old backup and active session review required')
  if (files.some(f => /studyService|lessonProgress|dailyLearning|spacedRepetition|questionSelection/.test(f))) notes.push('Learning: concept-first / completion-based progress / learned-era cumulative review regression required')
  if (files.some(f => /^src\/data\//.test(f))) notes.push('G: historical facts, unique answer, choice explanations, sources and image rights require human review')
  if (files.some(f => /^src\//.test(f)) && !files.some(f => /^(docs\/|README|AGENTS)/.test(f))) notes.push('Documentation impact not recorded: assess whether contracts or instructions need an update')
  return notes
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/automation/audit.mjs')) {
  fs.mkdirSync('automation-reports', { recursive: true })
  try {
    const lessons = readBank('src/data/lessons.ts', 'lessons')
    const questions = readBank('src/data/questions.ts', 'authoredQuestions')
    const cards = readBank('src/data/cards.ts', 'flashcardSeeds')
    const report = validate(lessons, questions, cards)
    let files = [], diffAvailable = true
    const base = process.env.AUDIT_BASE
    if (base && /^[a-f0-9]{40}$/.test(base) && !/^0+$/.test(base)) {
      try { files = execFileSync('git', ['diff', '--name-only', base, 'HEAD'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean) } catch { diffAvailable = false }
    } else diffAvailable = false
    const coverage = lessons.map(l => ({ id: l.id, title: l.title, era: l.era, questions: questions.filter(q => q.lessonId === l.id).length, keywords: l.keywords?.length ?? 0, checkpoints: l.checkpoints?.length ?? 0 }))
    const result = { commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), counts: { lessons: lessons.length, questions: questions.length, cards: cards.length }, coverage, ...report, diffAvailable, files, reviewRequired: impact(files) }
    fs.writeFileSync('automation-reports/audit.json', JSON.stringify(result, null, 2))
    const safe = s => String(s).replace(/[|<>\n\r]/g, ' ')
    const md = ['# 한사코치 자동 검수', `Commit: ${result.commit}`, `단원 ${lessons.length} / 문항 ${questions.length} / 카드 ${cards.length}`, '', '## 차단 오류', ...(report.errors.length ? report.errors.map(e => `- ${safe(e)}`) : ['- 없음']), '', '## 사람이 확인할 항목', ...result.reviewRequired.map(n => `- ${n}`), ...(!diffAvailable ? ['- 비교 기준 없음: 변경 영향 분석 미실행'] : []), `- 출처/매핑 경고 ${report.warnings.length}개: audit.json 참조`, '- 역사 정확성·실측 난이도·변별력·이미지 권리·완전한 문서 일치는 자동 승인하지 않습니다.', '- 본문은 리터럴 데이터 기준입니다. 스프레드/동적 데이터는 별도 검수합니다.', '', '## 단원별 콘텐츠', '| 단원 | 시대 | 문제 | 핵심어 | 확인 포인트 |', '|---|---|---:|---:|---:|', ...coverage.map(l => `| ${safe(l.title)} | ${l.era} | ${l.questions} | ${l.keywords} | ${l.checkpoints} |`)].join('\n')
    fs.writeFileSync('automation-reports/audit.md', md)
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md)
    console.log(`Audit: ${report.errors.length} errors, ${report.warnings.length} review warnings`)
    if (report.errors.length) process.exitCode = 1
  } catch (error) {
    fs.writeFileSync('automation-reports/audit-error.txt', String(error))
    console.error(error); process.exitCode = 1
  }
}
