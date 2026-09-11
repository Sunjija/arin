import type { ExamFormatId } from './examFormats'
import type {
  ChoiceOrderMode,
  EraId,
  Question,
  QuestionProvenance,
  QuestionStats,
  StimulusKind,
  StimulusSpec,
} from '../types'

export const LEGACY_BLUEPRINT_VERSION = 'legacy-v1'
export const BATCH1_BLUEPRINT_VERSION = '2026-09-batch1'

const KEEP_FORMATS = new Set<ExamFormatId>(['chronology-events', 'chronology-labeled'])

export const EMPTY_QUESTION_STATS: QuestionStats = {
  attemptCount: null,
  correctRate: null,
  discrimination: null,
}

export const DEFAULT_DRAFT_PROVENANCE: QuestionProvenance = {
  origin: 'original',
  blueprintVersion: LEGACY_BLUEPRINT_VERSION,
  factSources: [],
  productionMethod: 'original-authored',
  authorId: 'legacy-bank',
  reviewAgent: 'none',
  reviewedAt: null,
  rightsStatus: 'unverified',
  mediaRightsNote: '레거시 공통 메타데이터만 있음. 문항별 이용 허락·유사도 사람 대조는 아직 없다.',
  similarityAudit: {
    status: 'not-run',
    corpusVersion: 'official-65-79-not-ingested',
    reviewed: false,
  },
}

export function defaultChoiceOrder(formatId?: string): ChoiceOrderMode {
  return formatId && KEEP_FORMATS.has(formatId as ExamFormatId) ? 'keep' : 'free'
}

function hashString(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function seededRandom(seed: number): () => number {
  let value = seed % 2147483647
  if (value <= 0) value += 2147483646
  return () => {
    value = (value * 16807) % 2147483647
    return (value - 1) / 2147483646
  }
}

/**
 * 저작 단계의 정답 위치 편향을 문항 ID로 한 번만 풀어 둔다.
 * index % 5 순환도, 위치별 개수 맞추기도 쓰지 않는다.
 * 시간순 선지는 그대로 둔다.
 */
export function stabilizeAuthoredChoices(question: Question): Question {
  if (question.choiceOrder === 'keep') return question
  const random = seededRandom(hashString(question.id) || 1)
  const order = question.choices.map((_, index) => index)
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[order[i], order[j]] = [order[j]!, order[i]!]
  }
  const choices = order.map((index) => question.choices[index]!)
  const answerIndex = order.indexOf(question.answerIndex)
  return {
    ...question,
    choices,
    answerIndex: answerIndex === -1 ? question.answerIndex : answerIndex,
  }
}

export function eraBloc(era: EraId): 'premodern' | 'modern' {
  return era === 'opening' || era === 'colonial' || era === 'modern' ? 'modern' : 'premodern'
}

export function stimulusToPlainText(stimulus?: StimulusSpec): string {
  if (!stimulus) return ''
  const parts: string[] = []
  if (stimulus.title) parts.push(stimulus.title)
  if (stimulus.body) parts.push(stimulus.body)
  if (stimulus.rows?.length) {
    parts.push(stimulus.rows.map((row) => `${row.label}: ${row.value}`).join('\n'))
  }
  if (stimulus.columns?.length && stimulus.table?.length) {
    parts.push(
      [stimulus.columns.join(' / '), ...stimulus.table.map((row) => row.join(' / '))].join('\n'),
    )
  }
  if (stimulus.events?.length) {
    parts.push(
      stimulus.events
        .map((event) => [event.marker, event.year, event.text].filter(Boolean).join(' '))
        .join('\n'),
    )
  }
  if (stimulus.dialogue?.length) {
    parts.push(stimulus.dialogue.map((line) => `${line.speaker}: ${line.line}`).join('\n'))
  }
  if (stimulus.diagramText) parts.push(stimulus.diagramText)
  if (stimulus.caption) parts.push(stimulus.caption)
  return parts.filter(Boolean).join('\n')
}

function estimatedStimulusType(question: Question): StimulusKind {
  if (question.stimulus?.kind) return question.stimulus.kind
  if (question.passage) return 'text'
  return 'none'
}

/** 기존 100문항에 호환 기본값을 채운다. 수행하지 않은 검수·허락을 완료로 쓰지 않는다. */
export function withBankDefaults(question: Question): Question {
  const stimulusType = question.stimulusType ?? estimatedStimulusType(question)
  const passage =
    question.passage ??
    (question.stimulus ? stimulusToPlainText(question.stimulus) || undefined : undefined)
  return {
    ...question,
    passage,
    purpose: question.purpose ?? ['practice', 'mock'],
    reviewStatus: question.reviewStatus ?? 'draft',
    contentVersion: question.contentVersion ?? 1,
    choiceOrder: question.choiceOrder ?? defaultChoiceOrder(question.formatId),
    officialSkillConfidence:
      question.officialSkillConfidence ?? (question.officialSkillType ? 'authored' : 'unset'),
    stimulusType,
    stimulusTypeConfidence:
      question.stimulusTypeConfidence ?? (question.stimulus ? 'authored' : 'estimate'),
    visualRequired: question.visualRequired ?? false,
    provenance: question.provenance ?? DEFAULT_DRAFT_PROVENANCE,
    stats: question.stats ?? EMPTY_QUESTION_STATS,
  }
}

export function isRetired(question: Question): boolean {
  return question.reviewStatus === 'retired'
}

export function questionsForStudy(list: Question[]): Question[] {
  return list.filter((question) => !isRetired(question) && (question.purpose ?? ['practice']).includes('practice'))
}

export function questionsForMock(list: Question[]): Question[] {
  return list.filter((question) => !isRetired(question) && (question.purpose ?? ['mock']).includes('mock'))
}
