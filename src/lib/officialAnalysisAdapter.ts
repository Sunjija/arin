import { TARGET_FORMAT_MIX } from '../data/examFormats'
import { ADVANCED_POINT_QUOTA } from './examScoring'
import { DAILY_LEARNING_POLICY } from './dailyLearningPolicy'
import type {
  AnalysisAcceptance,
  MixBasis,
  OfficialExamAnalysisPayload,
} from '../types/dailyLearning'
import { OFFICIAL_EXAM_ANALYSIS_SCHEMA } from '../types/dailyLearning'

export interface MixGuidance {
  basis: MixBasis
  label: string
  pointQuota: { 1: number; 2: number; 3: number }
  pointQuotaConfirmed: boolean
  formatMix: Partial<Record<string, number>>
  formatMixSource: string
  acceptance: AnalysisAcceptance
}

const PROVISIONAL_LABEL = '분석 완료 전 임시 목표 (공식 출제 비율 아님)'

function isPayload(value: unknown): value is OfficialExamAnalysisPayload {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<OfficialExamAnalysisPayload>
  return row.schemaVersion === OFFICIAL_EXAM_ANALYSIS_SCHEMA && Boolean(row.source) && Boolean(row.review)
}

export function acceptAnalysisPayload(value: unknown): AnalysisAcceptance {
  if (value == null) {
    return {
      accepted: false,
      basis: 'provisional',
      reviewLevel: 'absent',
      rejection: '분석 산출물이 없다',
      label: PROVISIONAL_LABEL,
    }
  }
  if (!isPayload(value)) {
    return {
      accepted: false,
      basis: 'provisional',
      reviewLevel: 'absent',
      rejection: '스키마가 official-exam-analysis-v1이 아니다',
      label: PROVISIONAL_LABEL,
    }
  }
  if (value.source.includesOfficialText || value.source.includesOfficialImages) {
    return {
      accepted: false,
      basis: 'provisional',
      reviewLevel: value.review.level,
      rejection: '공식 원문 또는 이미지가 포함되어 수신을 거부한다',
      label: PROVISIONAL_LABEL,
    }
  }
  if (value.review.level === 'raw-collect' || value.review.level === 'outline-only') {
    return {
      accepted: false,
      basis: 'provisional',
      reviewLevel: value.review.level,
      rejection: `검토 수준 ${value.review.level}은 비율 연동 대상이 아니다`,
      label: PROVISIONAL_LABEL,
    }
  }
  if (value.review.level === 'partial-tags') {
    return {
      accepted: false,
      basis: 'partial',
      reviewLevel: value.review.level,
      rejection: '부분 태깅은 참고만 하고 관측 비율로 쓰지 않는다',
      label: '부분 분석(비율 미연동)',
    }
  }
  if (value.review.level !== 'human-reviewed-complete') {
    return {
      accepted: false,
      basis: 'provisional',
      reviewLevel: value.review.level,
      rejection: '사람 검토 완료가 아니다',
      label: PROVISIONAL_LABEL,
    }
  }
  if (!value.review.reviewerId || !value.review.reviewedAt) {
    return {
      accepted: false,
      basis: 'provisional',
      reviewLevel: value.review.level,
      rejection: '검수 주체 또는 일시가 없다',
      label: PROVISIONAL_LABEL,
    }
  }
  if (value.coverage.taggedComplete < DAILY_LEARNING_POLICY.analysisCompleteFloor) {
    return {
      accepted: false,
      basis: 'partial',
      reviewLevel: value.review.level,
      rejection: `완료 태그 ${value.coverage.taggedComplete}건은 전체 비율 하한 ${DAILY_LEARNING_POLICY.analysisCompleteFloor}에 못 미친다`,
      label: '부분 분석(비율 미연동)',
    }
  }
  return {
    accepted: true,
    basis: 'analyzed',
    reviewLevel: value.review.level,
    rejection: null,
    label: '사람 검토를 거친 관측 비율',
  }
}

export function mixGuidanceFromPayload(value: unknown = null): MixGuidance {
  const acceptance = acceptAnalysisPayload(value)
  const payload = isPayload(value) ? value : null
  if (acceptance.accepted && payload?.observed.pointQuota && payload.observed.formatMix) {
    return {
      basis: 'analyzed',
      label: acceptance.label,
      pointQuota: payload.observed.pointQuota,
      pointQuotaConfirmed: true,
      formatMix: payload.observed.formatMix,
      formatMixSource: payload.producedBy,
      acceptance,
    }
  }
  return {
    basis: acceptance.basis === 'analyzed' ? 'provisional' : acceptance.basis,
    label: acceptance.basis === 'partial' ? acceptance.label : PROVISIONAL_LABEL,
    pointQuota: { ...ADVANCED_POINT_QUOTA },
    pointQuotaConfirmed: true,
    formatMix: { ...TARGET_FORMAT_MIX },
    formatMixSource: 'local-bank-writing-target',
    acceptance,
  }
}

let injectedPayload: unknown = null

/** 테스트·이후 연동용. 앱은 기본 null(산출물 없음). */
export function setAnalysisPayloadForTests(payload: unknown): void {
  injectedPayload = payload
}

export function currentMixGuidance(): MixGuidance {
  return mixGuidanceFromPayload(injectedPayload)
}
