import type { Question } from '../types'

export const APPROVAL_CONDITIONS = [
  '한국사 내용 검수를 사람이 완료해야 한다.',
  '문항 편집 검수를 사람이 완료해야 한다.',
  '검수 주체(reviewerId)와 검수 일시(reviewedAt)가 있어야 한다.',
  '검수 주체(reviewAgent)는 human이어야 한다. AI 검토만으로는 승인할 수 없다.',
  '자료·이미지 이용 조건이 reconstructed-study 또는 cleared여야 한다.',
  '유사도 검사를 사람이 원문과 대조해 reviewed=true로 남겨야 한다.',
  'reviewStatus를 approved로 바꾸기 전에 위 조건을 모두 충족해야 한다.',
] as const

export function approvalGaps(question: Question): string[] {
  const gaps: string[] = []
  const provenance = question.provenance
  if (question.reviewStatus === 'retired') gaps.push('사용 중단 문항')
  if (provenance?.reviewAgent !== 'human') {
    gaps.push('사람 검수가 없다. AI 검토는 승인 조건이 아니다.')
  }
  if (!provenance?.reviewerId) gaps.push('검수 주체(reviewerId)가 없다.')
  if (!provenance?.reviewedAt) gaps.push('검수 일시가 없다.')
  const rights = provenance?.rightsStatus ?? 'unverified'
  if (rights !== 'cleared' && rights !== 'reconstructed-study') {
    gaps.push('자료 이용 조건이 확인되지 않았다.')
  }
  if (provenance?.similarityAudit.reviewed !== true) {
    gaps.push('사람 유사도 대조가 완료되지 않았다.')
  }
  if (question.reviewStatus !== 'approved') gaps.push('검수 상태가 승인이 아니다.')
  return gaps
}

/** 사람 검수와 승인 조건을 모두 통과한 문항만 실전 승인 풀에 넣는다. */
export function isHumanApproved(question: Question): boolean {
  return approvalGaps(question).length === 0
}
