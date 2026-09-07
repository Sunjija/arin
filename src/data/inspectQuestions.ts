import type { Question } from '../types'
import {
  EXAM_FORMATS,
  TARGET_FORMAT_MIX,
  type ExamFormatId,
  type ExamFormatSpec,
} from './examFormats'
import { questions as bank } from './questions'

export type Severity = 'error' | 'warn' | 'info'

export interface InspectionFinding {
  questionId: string
  severity: Severity
  code: string
  message: string
  formatGuess?: ExamFormatId
}

export interface InspectionReport {
  generatedAt: string
  total: number
  findings: InspectionFinding[]
  formatCounts: Partial<Record<ExamFormatId, number>>
  summary: {
    errors: number
    warns: number
    infos: number
    aiSmellScore: number
  }
  recommendations: string[]
}

const ABSURD_PAIRS: Array<[RegExp, RegExp, string]> = [
  [/빗살무늬|신석기|고인돌/, /독립협회|임시정부|의열단|6월 민주/, '선사↔근현대 황당 교차'],
  [/노비안검|시무 28조|12목/, /갑신정변|을사늑약|3·1운동/, '고려↔개항/일제 황당 교차'],
  [/훈민정음|집현전/, /삼별초|강화 천도/, '조선↔고려무신 황당 교차'],
]

function normalize(text: string): string {
  return text.replace(/\s+/g, '')
}

const SPACE_CLUE =
  /천도|유역|한강|평양|강화|사비|웅진|진출|순수|도읍|지역|해안|북진|남진|서경|동경/

/** 휴리스틱으로 포맷 추정 (명시 formatId 우선) */
export function guessFormat(q: Question): ExamFormatId {
  if (q.formatId && EXAM_FORMATS.some((f) => f.id === q.formatId)) {
    return q.formatId as ExamFormatId
  }
  const stem = q.stem
  const passage = q.passage ?? ''
  if (stem.includes('옳지 않은')) return 'wrong-statement'
  if (stem.includes('배열') || stem.includes('순서') || stem.includes('나열')) {
    return passage.includes('(가)') ? 'chronology-labeled' : 'chronology-events'
  }
  if (stem.includes('비교')) return 'king-compare'
  if (stem.includes('연결') || stem.includes('짝')) return 'king-policy-match'
  if (stem.includes('명칭')) return 'policy-name'
  if (stem.includes('영향') || stem.includes('결과')) return 'cause-effect'
  if (stem.includes('문화유산') || stem.includes('조성된 시기')) return 'heritage-period'
  if (stem.includes('활동') && q.tags.includes('independence-org')) return 'org-activity'
  if (stem.includes('밑줄') || stem.includes('㉠')) return 'source-underline'
  if (SPACE_CLUE.test(stem + passage) && (stem.includes('지역') || stem.includes('어디') || stem.includes('공간') || /천도|유역|진출/.test(passage))) {
    return 'map-region'
  }
  if (
    (stem.includes('왕') || stem.includes('인물')) &&
    q.choices.every((c) => c.length <= 12 && !c.includes('하였다'))
  ) {
    return 'source-who'
  }
  if (passage && (stem.includes('가리키') || stem.includes('설명'))) return 'source-what'
  if (stem.includes('법') || stem.includes('제도')) return 'policy-content'
  if (q.tags.includes('king-figure')) return 'king-policy-match'
  return 'source-what'
}

function passageAnswerOverlap(q: Question): number {
  const passage = normalize(q.passage ?? '')
  const answer = normalize(q.choices[q.answerIndex] ?? '')
  if (!passage || answer.length < 6) return 0
  let hits = 0
  for (let i = 0; i <= answer.length - 6; i += 3) {
    const chunk = answer.slice(i, i + 6)
    if (passage.includes(chunk)) hits += 1
  }
  return hits
}

function hasAbsurdCrossEra(q: Question): string | null {
  const blob = `${q.stem}\n${q.passage ?? ''}\n${q.choices.join('\n')}`
  for (const [a, b, label] of ABSURD_PAIRS) {
    const inAnswer = q.choices.some((c, i) => i !== q.answerIndex && (a.test(c) || b.test(c)))
    if (a.test(blob) && b.test(blob) && inAnswer) return label
  }
  // 정답 외 선지가 전부 다른 시대만인지: 근현대 키워드 vs 고대
  const ancient = /신석기|고조선|빗살무늬|고인돌|광개토|진흥왕|발해/
  const modern = /임시정부|독립협회|을사|3·1|6월 민주|5·18|갑신/
  const wrong = q.choices.filter((_, i) => i !== q.answerIndex)
  const ancientWrongs = wrong.filter((c) => ancient.test(c)).length
  const modernWrongs = wrong.filter((c) => modern.test(c)).length
  if (ancient.test(q.stem + (q.passage ?? '')) && modernWrongs >= 3) {
    return '고대 문항인데 오답 대부분이 근현대'
  }
  if (modern.test(q.stem + (q.passage ?? '')) && ancientWrongs >= 3) {
    return '근현대 문항인데 오답 대부분이 고대'
  }
  return null
}

function looksLikeRestatedPassage(q: Question): boolean {
  return passageAnswerOverlap(q) >= 3
}

function choiceLengthSkew(q: Question): boolean {
  const lengths = q.choices.map((c) => c.length)
  const max = Math.max(...lengths)
  const min = Math.min(...lengths)
  return max >= min * 3 && max - min >= 30
}

export function inspectQuestion(q: Question, format?: ExamFormatSpec): InspectionFinding[] {
  const findings: InspectionFinding[] = []
  const formatGuess = format?.id ?? guessFormat(q)
  const spec = format ?? EXAM_FORMATS.find((f) => f.id === formatGuess)

  if (q.choices.length !== 5) {
    findings.push({
      questionId: q.id,
      severity: 'error',
      code: 'CHOICE_COUNT',
      message: `선지 ${q.choices.length}개 (5지 필요)`,
      formatGuess,
    })
  }

  if (looksLikeRestatedPassage(q)) {
    findings.push({
      questionId: q.id,
      severity: 'error',
      code: 'PASSAGE_COPY',
      message: '정답 선지가 지문 표현을 과도하게 반복함 (지문 베끼기형)',
      formatGuess,
    })
  }

  const absurd = hasAbsurdCrossEra(q)
  if (absurd) {
    findings.push({
      questionId: q.id,
      severity: 'warn',
      code: 'ABSURD_DISTRACTOR',
      message: absurd,
      formatGuess,
    })
  }

  if (choiceLengthSkew(q)) {
    findings.push({
      questionId: q.id,
      severity: 'warn',
      code: 'LENGTH_SKEW',
      message: '정답/오답 선지 길이 편차가 커서 형식 단서가 될 수 있음',
      formatGuess,
    })
  }

  // 인물명 선지인데 지문에 같은 인물명이 있으면 실패
  if (formatGuess === 'source-who' && q.passage) {
    for (const choice of q.choices) {
      if (choice.length <= 12 && q.passage.includes(choice)) {
        findings.push({
          questionId: q.id,
          severity: 'error',
          code: 'NAME_IN_PASSAGE',
          message: `지문에 선지 인물명 “${choice}”가 이미 노출됨`,
          formatGuess,
        })
      }
    }
  }

  if (spec) {
    for (const fail of spec.failPatterns) {
      // soft check via keywords
      if (fail.includes('황당') && absurd) {
        findings.push({
          questionId: q.id,
          severity: 'info',
          code: 'FORMAT_FAIL_PATTERN',
          message: `포맷(${spec.id}) 실패 패턴: ${fail}`,
          formatGuess,
        })
      }
    }
  }

  // 난이도-포맷 정합성
  if (formatGuess.startsWith('chronology') && q.difficulty === 1) {
    findings.push({
      questionId: q.id,
      severity: 'warn',
      code: 'DIFFICULTY_MISMATCH',
      message: '순서형은 보통 2~3점인데 1점으로 표기됨',
      formatGuess,
    })
  }

  return findings
}

export function inspectQuestionBank(list: Question[] = bank): InspectionReport {
  const findings: InspectionFinding[] = []
  const formatCounts: Partial<Record<ExamFormatId, number>> = {}

  for (const q of list) {
    const guess = guessFormat(q)
    formatCounts[guess] = (formatCounts[guess] ?? 0) + 1
    findings.push(...inspectQuestion(q))
  }

  const errors = findings.filter((f) => f.severity === 'error').length
  const warns = findings.filter((f) => f.severity === 'warn').length
  const infos = findings.filter((f) => f.severity === 'info').length
  const aiSmellScore = Math.min(100, errors * 12 + warns * 5 + infos * 2)

  const recommendations: string[] = []
  if (errors > 0) {
    recommendations.push('PASSAGE_COPY / NAME_IN_PASSAGE 오류 문항을 우선 재작성할 것')
  }
  recommendations.push('신규 문항은 examFormats.ts의 formatId를 먼저 고른 뒤 작성할 것')
  recommendations.push('오답은 인접 시대·유사 제도·혼동 인물로만 구성할 것')

  // 포맷 공백 안내
  for (const [id, target] of Object.entries(TARGET_FORMAT_MIX) as Array<[ExamFormatId, number]>) {
    const have = formatCounts[id] ?? 0
    const expected = Math.round((target / 100) * list.length)
    if (have < Math.max(1, expected - 1)) {
      recommendations.push(`포맷 부족: ${id} (현재 ${have}, 목표 약 ${expected})`)
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    total: list.length,
    findings,
    formatCounts,
    summary: { errors, warns, infos, aiSmellScore },
    recommendations: [...new Set(recommendations)],
  }
}

export function formatReportText(report: InspectionReport): string {
  const lines: string[] = []
  lines.push(`# 문제검사 리포트`)
  lines.push(`생성: ${report.generatedAt}`)
  lines.push(`문항 수: ${report.total}`)
  lines.push(
    `요약: error ${report.summary.errors} / warn ${report.summary.warns} / info ${report.summary.infos} / AI-smell ${report.summary.aiSmellScore}`,
  )
  lines.push('')
  lines.push('## 포맷 분포')
  for (const [id, count] of Object.entries(report.formatCounts).sort()) {
    lines.push(`- ${id}: ${count}`)
  }
  lines.push('')
  lines.push('## 파인딩')
  if (report.findings.length === 0) lines.push('- (없음)')
  for (const f of report.findings) {
    lines.push(`- [${f.severity}] ${f.questionId} ${f.code}: ${f.message} (${f.formatGuess ?? '-'})`)
  }
  lines.push('')
  lines.push('## 권고')
  for (const r of report.recommendations) lines.push(`- ${r}`)
  return lines.join('\n')
}
