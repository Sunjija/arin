import { TARGET_FORMAT_MIX, type ExamFormatId } from './examFormats'
import type { OfficialSkillType, StimulusKind } from '../types'

export const TARGET_OFFICIAL_ROUNDS = [
  65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79,
] as const

export type OfficialAnalysisStatus = 'not-analyzed' | 'partial' | 'complete'

export type OfficialItemTagStatus = 'not-analyzed' | 'outline-only' | 'complete'

export interface OfficialItemRecord {
  round: number
  number: number
  analysisStatus: OfficialItemTagStatus
  /** 확인되지 않으면 null. 추정값을 완료로 쓰지 않는다. */
  points: 1 | 2 | 3 | null
  era: string | null
  topic: string | null
  officialSkillType: OfficialSkillType | null
  internalFormatId: ExamFormatId | null
  stimulusType: StimulusKind | null
  visualRequired: boolean | null
  reasoningSteps: 1 | 2 | 3 | null
  distractorStrategy: string | null
  tagConfidence: 'unset' | 'estimate'
  notes: string
}

export interface MixWeightOptions {
  recentWeight: number
  previousWeight: number
  recentRoundCount: number
}

export const DEFAULT_MIX_WEIGHTS: MixWeightOptions = {
  recentWeight: 2,
  previousWeight: 1,
  recentRoundCount: 5,
}

/**
 * 제79회 비교 표본 10문항의 측정 방식만 기록한다.
 * 공식 원문·이미지·확인되지 않은 배점은 넣지 않는다.
 */
export const ROUND_79_EDITORIAL_OUTLINES: OfficialItemRecord[] = [
  {
    round: 79,
    number: 1,
    analysisStatus: 'outline-only',
    points: null,
    era: 'prehistoric',
    topic: '선사 생활상',
    officialSkillType: 'source-analysis',
    internalFormatId: 'source-underline',
    stimulusType: 'document',
    visualRequired: null,
    reasoningSteps: null,
    distractorStrategy: null,
    tagConfidence: 'estimate',
    notes: '편집 비교용 측정 방식. 박물관 체험 안내에서 선사 생활상을 추론. 원문 미수록.',
  },
  {
    round: 79,
    number: 4,
    analysisStatus: 'outline-only',
    points: null,
    era: 'culture',
    topic: '수도·유물과 국가',
    officialSkillType: 'source-analysis',
    internalFormatId: 'heritage-period',
    stimulusType: 'catalog',
    visualRequired: null,
    reasoningSteps: null,
    distractorStrategy: null,
    tagConfidence: 'estimate',
    notes: '편집 비교용. 수도·유물 전시를 연결해 국가·문화재 판별. 원문 미수록.',
  },
  {
    round: 79,
    number: 22,
    analysisStatus: 'outline-only',
    points: null,
    era: null,
    topic: '두 사료가 정한 시간 구간의 사건',
    officialSkillType: 'chronology',
    internalFormatId: 'chronology-labeled',
    stimulusType: 'timeline',
    visualRequired: null,
    reasoningSteps: 2,
    distractorStrategy: null,
    tagConfidence: 'estimate',
    notes: '편집 비교용. 원문·시대 확정값 없음.',
  },
  {
    round: 79,
    number: 24,
    analysisStatus: 'outline-only',
    points: null,
    era: 'goryeo',
    topic: '왕명 문서와 담당 기구',
    officialSkillType: 'source-analysis',
    internalFormatId: 'policy-name',
    stimulusType: 'document',
    visualRequired: null,
    reasoningSteps: 2,
    distractorStrategy: null,
    tagConfidence: 'estimate',
    notes: '편집 비교용. 왕명 문서 형태·사례로 기구 추론. 원문 미수록.',
  },
  {
    round: 79,
    number: 30,
    analysisStatus: 'outline-only',
    points: null,
    era: 'opening',
    topic: '개화 기구와 정책',
    officialSkillType: 'situation',
    internalFormatId: 'source-what',
    stimulusType: 'document',
    visualRequired: null,
    reasoningSteps: 2,
    distractorStrategy: null,
    tagConfidence: 'estimate',
    notes: '편집 비교용. 건물·외교 단서로 개화 기구·정책 연결. 원문 미수록.',
  },
  {
    round: 79,
    number: 31,
    analysisStatus: 'outline-only',
    points: null,
    era: 'opening',
    topic: '개혁 연표 빈 구간',
    officialSkillType: 'chronology',
    internalFormatId: 'chronology-labeled',
    stimulusType: 'timeline',
    visualRequired: null,
    reasoningSteps: 2,
    distractorStrategy: null,
    tagConfidence: 'estimate',
    notes: '편집 비교용. 여러 개혁 단서로 연표 빈 구간 판단. 원문 미수록.',
  },
  {
    round: 79,
    number: 32,
    analysisStatus: 'outline-only',
    points: null,
    era: 'colonial',
    topic: '조약 조항과 체결 배경',
    officialSkillType: 'source-analysis',
    internalFormatId: 'cause-effect',
    stimulusType: 'document',
    visualRequired: null,
    reasoningSteps: 2,
    distractorStrategy: null,
    tagConfidence: 'estimate',
    notes: '편집 비교용. 조약 조항 해석. 원문 미수록.',
  },
  {
    round: 79,
    number: 39,
    analysisStatus: 'outline-only',
    points: null,
    era: 'colonial',
    topic: '판결문에서 운동 식별',
    officialSkillType: 'source-analysis',
    internalFormatId: 'org-activity',
    stimulusType: 'document',
    visualRequired: null,
    reasoningSteps: 2,
    distractorStrategy: null,
    tagConfidence: 'estimate',
    notes: '편집 비교용. 판결문에서 운동 식별 후 관련 사실 판단. 원문 미수록.',
  },
  {
    round: 79,
    number: 47,
    analysisStatus: 'outline-only',
    points: null,
    era: 'modern',
    topic: '신문 기사로 정부 시기·정책 판별',
    officialSkillType: 'source-analysis',
    internalFormatId: 'source-what',
    stimulusType: 'newspaper',
    visualRequired: null,
    reasoningSteps: 2,
    distractorStrategy: null,
    tagConfidence: 'estimate',
    notes: '편집 비교용. 신문 단서로 정부 시기 판별. 조선어학회 문항과 주제·시대가 달라 비교 표본으로 부적절.',
  },
  {
    round: 79,
    number: 50,
    analysisStatus: 'outline-only',
    points: null,
    era: null,
    topic: '여러 왕조 군사 제도 비교',
    officialSkillType: 'evaluation',
    internalFormatId: 'king-compare',
    stimulusType: 'table',
    visualRequired: null,
    reasoningSteps: 2,
    distractorStrategy: null,
    tagConfidence: 'estimate',
    notes: '편집 비교용. 세 왕조 군사 제도 비교. 무단·문화 통치 문항과 주제·시대가 달라 비교 표본으로 부적절.',
  },
]

export const OFFICIAL_ITEM_RECORDS: OfficialItemRecord[] = [...ROUND_79_EDITORIAL_OUTLINES]

export const ANALYSIS_SCOPE = {
  targetRounds: TARGET_OFFICIAL_ROUNDS,
  targetItemCount: TARGET_OFFICIAL_ROUNDS.length * 50,
  officialStemsInRepo: false,
  officialPaperImagesInRepo: false,
  completeTaggedCount: OFFICIAL_ITEM_RECORDS.filter((item) => item.analysisStatus === 'complete').length,
  outlineOnlyCount: OFFICIAL_ITEM_RECORDS.filter((item) => item.analysisStatus === 'outline-only').length,
  notAnalyzedCount:
    TARGET_OFFICIAL_ROUNDS.length * 50 -
    OFFICIAL_ITEM_RECORDS.filter((item) => item.analysisStatus !== 'not-analyzed').length,
  confirmedPointQuotaRounds: [77, 78, 79] as const,
  confirmedPointQuota: { 1: 10, 2: 30, 3: 10 } as const,
  notes: [
    '분석 대상은 공식 심화 65~79회 750문항이다.',
    '이 저장소에는 공식 문제지 원문과 이미지를 넣지 않았다.',
    '제79회 10문항은 편집 비교용 측정 방식만 부분 기록했으며, 배점·자료 원문은 확인하지 못했다.',
    '65~78회와 79회 나머지 40문항은 미분석이다.',
    '77~79회 정답표에서 1점 10·2점 30·3점 10 구성은 확인된 값으로 쓴다.',
    '전근대 61%·근현대 39%는 분석 완료 전 임시값이다. 공식 출제 비율이라고 표시하지 않는다.',
  ],
} as const

export type MixBasis = 'provisional' | 'analyzed'

export interface TargetMix {
  basis: MixBasis
  label: string
  weights: MixWeightOptions
  analyzedItemCount: number
  outlinedItemCount: number
  targetRoundCount: number
  targetItemCount: number
  points: { 1: number; 2: number; 3: number; source: string; confirmed: boolean }
  era: { premodern: number; modern: number; source: string; confirmed: boolean }
  officialSkillType: Partial<Record<OfficialSkillType, number>> | null
  stimulusType: Partial<Record<StimulusKind, number>> | null
  formatMix: Partial<Record<ExamFormatId, number>>
  formatMixSource: string
}

export interface CompleteOfficialTag {
  round: number
  points: 1 | 2 | 3
  eraBloc: 'premodern' | 'modern'
  officialSkillType: OfficialSkillType
  stimulusType: StimulusKind
  internalFormatId: ExamFormatId
}

function roundWeight(round: number, latestRound: number, options: MixWeightOptions): number {
  const recentFrom = latestRound - options.recentRoundCount + 1
  return round >= recentFrom ? options.recentWeight : options.previousWeight
}

export function mixFromCompleteTags(
  items: CompleteOfficialTag[],
  options: MixWeightOptions = DEFAULT_MIX_WEIGHTS,
): {
  points: { 1: number; 2: number; 3: number }
  era: { premodern: number; modern: number }
  officialSkillType: Record<OfficialSkillType, number>
  stimulusType: Partial<Record<StimulusKind, number>>
  formatMix: Partial<Record<ExamFormatId, number>>
} | null {
  const complete = items.filter(
    (item) =>
      item.points != null &&
      item.eraBloc != null &&
      item.officialSkillType != null &&
      item.stimulusType != null &&
      item.internalFormatId != null,
  )
  if (complete.length === 0) return null

  const latestRound = Math.max(...complete.map((item) => item.round))
  const add = (record: Record<string, number>, key: string, weight: number) => {
    record[key] = (record[key] ?? 0) + weight
  }
  const points: Record<string, number> = {}
  const era: Record<string, number> = {}
  const skills: Record<string, number> = {}
  const stimuli: Record<string, number> = {}
  const formats: Record<string, number> = {}
  let weightSum = 0
  for (const item of complete) {
    const weight = roundWeight(item.round, latestRound, options)
    weightSum += weight
    add(points, String(item.points), weight)
    add(era, item.eraBloc, weight)
    add(skills, item.officialSkillType, weight)
    add(stimuli, item.stimulusType, weight)
    add(formats, item.internalFormatId, weight)
  }
  const share = (record: Record<string, number>, key: string) =>
    weightSum > 0 ? (record[key] ?? 0) / weightSum : 0

  return {
    points: { 1: share(points, '1'), 2: share(points, '2'), 3: share(points, '3') },
    era: { premodern: share(era, 'premodern'), modern: share(era, 'modern') },
    officialSkillType: {
      knowledge: share(skills, 'knowledge'),
      chronology: share(skills, 'chronology'),
      situation: share(skills, 'situation'),
      inquiry: share(skills, 'inquiry'),
      'source-analysis': share(skills, 'source-analysis'),
      evaluation: share(skills, 'evaluation'),
    },
    stimulusType: stimuli,
    formatMix: formats,
  }
}

export function computeTargetMix(
  options: Partial<MixWeightOptions> = {},
  completeTags: CompleteOfficialTag[] = [],
): TargetMix {
  const weights = { ...DEFAULT_MIX_WEIGHTS, ...options }
  const analyzed = mixFromCompleteTags(completeTags, weights)
  const outlinedItemCount = OFFICIAL_ITEM_RECORDS.filter((item) => item.analysisStatus === 'outline-only')
    .length
  if (!analyzed) {
    return {
      basis: 'provisional',
      label: '분석 완료 전 임시 목표 (공식 출제 비율 아님)',
      weights,
      analyzedItemCount: 0,
      outlinedItemCount,
      targetRoundCount: TARGET_OFFICIAL_ROUNDS.length,
      targetItemCount: ANALYSIS_SCOPE.targetItemCount,
      points: {
        1: 10,
        2: 30,
        3: 10,
        source: '77~79회 정답표에서 확인한 문항 수',
        confirmed: true,
      },
      era: {
        premodern: 0.61,
        modern: 0.39,
        source: '기존 조사 메모의 임시값. 전수 태깅 전',
        confirmed: false,
      },
      officialSkillType: null,
      stimulusType: null,
      formatMix: { ...TARGET_FORMAT_MIX },
      formatMixSource: '내부 포맷 목표. 공식 회차 태깅으로 검증되지 않음',
    }
  }

  const toCount = (share: number, total: number) => Math.round(share * total)
  return {
    basis: 'analyzed',
    label: `확인된 ${completeTags.length}문항 가중 분석 (최근 ${weights.recentRoundCount}회 가중 ${weights.recentWeight})`,
    weights,
    analyzedItemCount: completeTags.length,
    outlinedItemCount,
    targetRoundCount: TARGET_OFFICIAL_ROUNDS.length,
    targetItemCount: ANALYSIS_SCOPE.targetItemCount,
    points: {
      1: toCount(analyzed.points[1], 50),
      2: toCount(analyzed.points[2], 50),
      3: toCount(analyzed.points[3], 50),
      source: 'complete tags only',
      confirmed: true,
    },
    era: {
      premodern: analyzed.era.premodern,
      modern: analyzed.era.modern,
      source: 'complete tags only',
      confirmed: true,
    },
    officialSkillType: analyzed.officialSkillType,
    stimulusType: analyzed.stimulusType,
    formatMix: analyzed.formatMix,
    formatMixSource: 'complete tags only',
  }
}

export function analysisCoverage(): {
  status: OfficialAnalysisStatus
  complete: number
  outlineOnly: number
  notAnalyzed: number
  target: number
} {
  const complete = ANALYSIS_SCOPE.completeTaggedCount
  const outlineOnly = ANALYSIS_SCOPE.outlineOnlyCount
  const target = ANALYSIS_SCOPE.targetItemCount
  const notAnalyzed = target - complete - outlineOnly
  const status: OfficialAnalysisStatus =
    complete === target ? 'complete' : complete > 0 || outlineOnly > 0 ? 'partial' : 'not-analyzed'
  return { status, complete, outlineOnly, notAnalyzed, target }
}
