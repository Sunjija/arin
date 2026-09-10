import type { Question } from '../types'
import { inspectQuestion, type InspectionFinding } from '../data/inspectQuestions'
import type { QuestionUseClass } from '../types/dailyLearning'

interface ReviewFields {
  reviewStatus?: string
  provenance?: {
    reviewAgent?: string
    reviewerId?: string
    reviewedAt?: string | null
    similarityAudit?: { reviewed?: boolean }
  }
}

/**
 * 품질 작업(PR #8)이 병합되기 전에는 휴리스틱 검수 + 선택적 review 필드만 본다.
 * 사람 승인 필드가 없으면 실전 승인으로 취급하지 않는다.
 */
export function classifyQuestionUse(
  question: Question,
  findings: InspectionFinding[] = inspectQuestion(question),
): QuestionUseClass {
  const extra = question as Question & ReviewFields
  const gaps: string[] = []
  const errors = findings.filter((finding) => finding.severity === 'error')
  if (errors.length > 0) {
    gaps.push(`검수 오류 ${errors.length}건`)
  }

  const reviewStatus = extra.reviewStatus
  const provenance = extra.provenance
  const humanReviewed =
    provenance?.reviewAgent === 'human' &&
    Boolean(provenance.reviewerId) &&
    Boolean(provenance.reviewedAt) &&
    provenance.similarityAudit?.reviewed === true
  const examApproved = reviewStatus === 'approved' && humanReviewed
  if (!examApproved) {
    gaps.push('사람 검수·승인 기록이 없어 실전 승인 문항이 아니다')
  }

  const practiceOk = errors.length === 0 && reviewStatus !== 'retired'
  const diagnosticOk = practiceOk && examApproved

  return {
    questionId: question.id,
    practiceOk,
    diagnosticOk,
    examApproved,
    gaps,
  }
}

export function classifyBank(questions: Question[]): Map<string, QuestionUseClass> {
  return new Map(questions.map((question) => [question.id, classifyQuestionUse(question)]))
}

export function diagnosticPool(questions: Question[]): Question[] {
  return questions.filter((question) => classifyQuestionUse(question).diagnosticOk)
}

export function practicePool(questions: Question[]): Question[] {
  return questions.filter((question) => classifyQuestionUse(question).practiceOk)
}

export function examApprovedPool(questions: Question[]): Question[] {
  return questions.filter((question) => classifyQuestionUse(question).examApproved)
}
