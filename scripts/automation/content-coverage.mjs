import fs from 'node:fs'
import path from 'node:path'
import { readBank, sourceHash, normalizeNewlines } from './audit.mjs'

const inputs = {
  lessons: ['lessons', 'lessons'], questions: ['questions', 'authoredQuestions'],
  cards: ['cards', 'flashcardSeeds'], timeline: ['timeline', 'timelineEvents'],
  concepts: ['topicCatalog', 'TOPIC_CATALOG'], guides: ['lessonGuides', 'lessonGuides'],
}
const banks = Object.fromEntries(Object.entries(inputs).map(([kind, [file, variable]]) => [kind, readBank(`src/data/${file}.ts`, variable)]))
const inputHashes = Object.fromEntries(Object.values(inputs).map(([file]) => [`src/data/${file}.ts`, sourceHash(fs.readFileSync(`src/data/${file}.ts`, 'utf8'))]))
const normalize = (value) => String(value ?? '').replace(/[\s·ㆍ~:：()[\]（）]/g, '')
const textOf = (row) => normalize([row.title, row.front, row.back, row.stem, row.passage, row.explanation, row.description].filter(Boolean).join(' '))
const candidatesFor = (row) => banks.concepts.filter(concept => concept.era === row.era && concept.keywords.some(keyword => normalize(keyword).length >= 2 && textOf(row).includes(normalize(keyword)))).map(concept => concept.id)
const sections = banks.guides.flatMap(guide => guide.sections.map(section => ({ ...section, lessonId: guide.lessonId, checkedAt: guide.checkedAt, contentVersion: guide.contentVersion })))
const lessonIds = new Set(banks.lessons.map(lesson => lesson.id))
const conceptIds = new Set(banks.concepts.map(concept => concept.id))
const errors = []
for (const [kind, bank] of Object.entries(banks)) {
  const ids = bank.map(row => kind === 'guides' ? row.lessonId : row.id)
  if (ids.some(id => !id) || new Set(ids).size !== ids.length) errors.push(`${kind}: missing/duplicate IDs`)
}
for (const q of banks.questions) {
  if (!lessonIds.has(q.lessonId)) errors.push(`${q.id}: missing lesson`)
  if (q.conceptIds?.some(id => !conceptIds.has(id) || banks.concepts.find(c => c.id === id).lessonId !== q.lessonId)) errors.push(`${q.id}: invalid explicit concept mapping`)
}
for (const section of sections) {
  if (!conceptIds.has(section.conceptId) || banks.concepts.find(c => c.id === section.conceptId).lessonId !== section.lessonId || !section.paragraphs?.length || !section.recallPrompt || !section.expectedElements?.length || !section.sourceUrl) errors.push(`${section.conceptId}: incomplete guide or scope mismatch`)
}
const inventory = {
  method: 'literal-source-inventory-v1', inputHashes,
  caveat: 'Keyword matches are research candidates, never runtime mappings or verified coverage. Source checks are not expert exam approval. Catalog is an internal draft, not the official complete syllabus.',
  counts: Object.fromEntries(Object.entries(banks).map(([kind, bank]) => [kind, bank.length])),
  summary: {
    conceptsWithGuide: sections.length,
    conceptsWithoutGuide: banks.concepts.filter(c => !sections.some(s => s.conceptId === c.id)).length,
    questionsExplicitlyMapped: banks.questions.filter(q => q.conceptIds?.length).length,
    questionsWithSourceUrl: banks.questions.filter(q => q.sourceUrl).length,
    questionsWithPassage: banks.questions.filter(q => q.passage).length,
    actualImageQuestions: banks.questions.filter(q => q.imageUrl || q.stimulus?.imageUrl).length,
    calibratedQuestions: banks.questions.filter(q => q.stats?.attemptCount > 0 && q.stats?.discrimination != null).length,
  },
  lessons: banks.lessons.map(lesson => ({ id: lesson.id, title: lesson.title, era: lesson.era, oldCalendarOrder: [lesson.week, lesson.dayOrder], status: banks.guides.some(g => g.lessonId === lesson.id) ? 'source-checked-guide-expert-review-pending' : 'needs-guide', conceptIds: banks.concepts.filter(c => c.lessonId === lesson.id).map(c => c.id), questionIds: banks.questions.filter(q => q.lessonId === lesson.id).map(q => q.id) })),
  concepts: banks.concepts.map(concept => {
    const guide = sections.find(section => section.conceptId === concept.id)
    return { id: concept.id, title: concept.title, era: concept.era, lessonId: concept.lessonId, status: guide ? 'source-checked-guide-expert-review-pending' : 'needs-guide', sourceUrl: guide?.sourceUrl ?? null, descriptionBlocks: guide?.paragraphs.length ?? 0, recallPrompts: guide ? 1 : 0, explicitQuestionIds: banks.questions.filter(q => q.conceptIds?.includes(concept.id)).map(q => q.id), candidateQuestionIds: banks.questions.filter(q => candidatesFor(q).includes(concept.id)).map(q => q.id), candidateCardIds: banks.cards.filter(c => candidatesFor(c).includes(concept.id)).map(c => c.id), candidateTimelineIds: banks.timeline.filter(t => candidatesFor(t).includes(concept.id)).map(t => t.id), requiredNext: guide ? ['independent-confirmation-question', 'comparison-or-source-application', 'expert-review'] : ['learner-explanation', 'comparison', 'recall', 'explicit-question-mapping', 'fact-source', 'expert-review'] }
  }),
  questions: banks.questions.map(q => ({ id: q.id, lessonId: q.lessonId, status: q.sourceUrl ? 'source-linked-editorial-review-pending' : 'needs-source-and-review', conceptIds: q.conceptIds ?? [], candidateConceptIds: candidatesFor(q), familyId: q.familyId ?? null, sourceUrl: q.sourceUrl ?? null, formatId: q.formatId, actualStimulus: q.passage ? 'text' : 'none', points: q.difficulty, calibratedDifficulty: null })),
  cards: banks.cards.map(card => ({ id: card.id, front: card.front, era: card.era, status: 'needs-concept-mapping-and-review', candidateConceptIds: candidatesFor(card) })),
  timeline: banks.timeline.map(event => ({ id: event.id, title: event.title, era: event.era, status: 'needs-concept-mapping-and-source-review', candidateConceptIds: candidatesFor(event) })),
  errors,
}
const safe = value => String(value).replace(/[|\r\n]/g, ' ')
const md = ['# 콘텐츠 원본 집계', '', '자동 생성: `node scripts/automation/content-coverage.mjs`. 입력 해시는 inventory.json에 기록한다.', '', inventory.caveat, '', `단원 ${inventory.counts.lessons} / 개념 목록 ${inventory.counts.concepts} / 문항 ${inventory.counts.questions} / 카드 ${inventory.counts.cards} / 연표 ${inventory.counts.timeline}`, `설명 원본 연결 ${inventory.summary.conceptsWithGuide} / 설명 보충 ${inventory.summary.conceptsWithoutGuide} / 명시적 개념 연결 문항 ${inventory.summary.questionsExplicitlyMapped} / 출처 URL 문항 ${inventory.summary.questionsWithSourceUrl} / 실제 이미지 문항 ${inventory.summary.actualImageQuestions}`, '', '## 단원별 현황', '', '| 단원 | 개념 목록 | 문항 | 상태 |', '|---|---:|---:|---|', ...inventory.lessons.map(l=>`| ${safe(l.title)} | ${l.conceptIds.length} | ${l.questionIds.length} | ${l.status} |`), '', '## 개념별 보충 목록', '', '후보 수는 키워드 탐색 결과다. 선지·해설의 언급만으로도 후보가 생기므로 실제 학습 커버리지에 합산하지 않는다.', '', '| 개념 | 설명 문단 | 회상 질문 | 명시적 연결 문항 | 조사 후보 문항/카드/연표 |', '|---|---:|---:|---|---|', ...inventory.concepts.map(c=>`| ${c.id} ${safe(c.title)} | ${c.descriptionBlocks} | ${c.recallPrompts} | ${c.explicitQuestionIds.join(', ') || '없음'} | ${c.candidateQuestionIds.length}/${c.candidateCardIds.length}/${c.candidateTimelineIds.length} |`), '', '## 구조 오류', '', ...(errors.length ? errors.map(error=>`- ${error}`) : ['- 없음. 사실·이미지 권리·난이도 검수는 별도.']), ''].join('\n')
const outputs = { 'research/content-coverage/inventory.json': JSON.stringify(inventory, null, 2)+'\n', 'research/content-coverage/report.md': md }
for (const [file, content] of Object.entries(outputs)) {
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(file) || normalizeNewlines(fs.readFileSync(file, 'utf8')) !== content) errors.push(`${file}: regenerate coverage report`)
  } else {
    fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content)
  }
}
console.log(JSON.stringify({counts: inventory.counts, summary: inventory.summary, errors}))
if (errors.length) process.exitCode = 1
