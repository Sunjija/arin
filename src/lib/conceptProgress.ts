import type { AttemptRecord, FlashcardRecord, Question } from '../types'
import type { ConceptMemoryState, ConceptProgress } from '../types/dailyLearning'
import { conceptsForQuestion, primaryConcept } from './conceptMapping'
import { isTransferEvidence } from './attemptOutcome'
import type { TopicEntry } from '../data/topicCatalog'

export interface ConceptProgressInput {
  questions: Question[]
  attempts: AttemptRecord[]
  cards: FlashcardRecord[]
  topics: TopicEntry[]
  completedLessonIds: Iterable<string>
}

export function deriveConceptProgress(input: ConceptProgressInput): ConceptProgress[] {
  const completed = new Set(input.completedLessonIds)
  const byConcept = new Map<string, ConceptProgress>()

  const ensure = (conceptId: string, title: string, lessonId?: string): ConceptProgress => {
    const current = byConcept.get(conceptId)
    if (current) return current
    const created: ConceptProgress = {
      conceptId,
      title,
      lessonId,
      memory: 'unseen',
      applicationReady: false,
      evidence: '아직 기록이 없습니다.',
    }
    byConcept.set(conceptId, created)
    return created
  }

  for (const topic of input.topics) {
    const row = ensure(topic.id, topic.title, topic.lessonId)
    if (topic.lessonId && completed.has(topic.lessonId) && row.memory === 'unseen') {
      row.memory = 'learning'
      row.evidence = '단원 개념 확인을 마쳤습니다. 기억 유지와 실전 적용은 별개입니다.'
    }
  }

  for (const card of input.cards) {
    if (!card.lastRating && card.easeStreak === 0) continue
    const topic = input.topics.find((item) => item.era === card.era && item.lessonId)
    if (!topic) continue
    const row = ensure(topic.id, topic.title, topic.lessonId)
    if (card.intervalDays >= 7 && (card.lastRating === 'good' || card.lastRating === 'easy')) {
      if (row.memory !== 'applied') {
        row.memory = 'remembered'
        row.evidence = '간격 복습에서 최근 성공이 있어 기억 상태로 봅니다. 실전 적용은 아닙니다.'
      }
    } else if (row.memory === 'unseen') {
      row.memory = 'learning'
      row.evidence = '카드 복습을 시작했습니다.'
    }
  }

  const attemptsByQuestion = new Map<string, AttemptRecord[]>()
  for (const attempt of input.attempts) {
    const list = attemptsByQuestion.get(attempt.questionId) ?? []
    list.push(attempt)
    attemptsByQuestion.set(attempt.questionId, list)
  }

  for (const [questionId, list] of attemptsByQuestion) {
    const question = input.questions.find((item) => item.id === questionId)
    if (!question) continue
    const concepts = conceptsForQuestion(question, input.topics)
    const latest = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    if (!latest) continue
    const multiConcept = concepts.length > 1
    for (const concept of concepts.length ? concepts : [primaryConcept(question, input.topics)].filter(Boolean)) {
      if (!concept) continue
      const row = ensure(concept.id, concept.title, concept.lessonId)
      if (!latest.correct) {
        if (multiConcept && !latest.cause) {
          row.memory = 'needs-check'
          row.evidence = '한 문항이 여러 개념을 담고 있어 오답 원인을 특정하지 못했습니다. 추가 확인 대상입니다.'
        } else if (!multiConcept) {
          row.memory = row.memory === 'applied' ? 'needs-check' : 'learning'
          row.evidence = '최근 오답이 있어 개념을 미숙으로 단정하지 않고 학습 중으로 둡니다.'
        } else {
          row.memory = 'needs-check'
          row.evidence = '관련 문항 오답이 있어 추가 확인 대상입니다. 연결된 모든 개념을 미숙으로 내리지는 않았습니다.'
        }
        continue
      }
      if (latest.outcomeKind === 'repeat-correct') {
        if (row.memory === 'unseen') row.memory = 'remembered'
        row.evidence = '전에 본 문제를 다시 맞혔습니다. 실전 숙달로 표시하지 않습니다.'
        continue
      }
      if (isTransferEvidence(latest.outcomeKind) && latest.questionSnapshot) {
        const firstOfThisQuestion = list.length === 1
        const differentFormat = Boolean(
          question.formatId &&
            list.every((item) => !item.questionSnapshot || item.questionSnapshot.formatId === question.formatId),
        )
        if (firstOfThisQuestion && differentFormat && row.memory !== 'unseen') {
          row.memory = 'applied'
          row.applicationReady = true
          row.evidence = '처음 보는 다른 형식 문항에서 맞혔습니다. 같은 문항 반복 정답과 구분합니다.'
        }
      } else if (row.memory === 'unseen' || row.memory === 'learning') {
        row.memory = 'learning'
        row.evidence = '연습 정답이 있습니다. 기억 상태와 실전 적용은 아직 구분합니다.'
      }
    }
  }

  return [...byConcept.values()].sort((a, b) => a.conceptId.localeCompare(b.conceptId))
}

export function memoryLabel(state: ConceptMemoryState): string {
  switch (state) {
    case 'unseen':
      return '아직 안 봄'
    case 'learning':
      return '개념 학습 중'
    case 'remembered':
      return '기억 확인(추정)'
    case 'needs-check':
      return '추가 확인 필요'
    case 'applied':
      return '다른 자료에서 적용'
    default:
      return state
  }
}
