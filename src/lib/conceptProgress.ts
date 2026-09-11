import type {
  AttemptRecord,
  Concept,
  ConceptLearnState,
  ConceptProgressRecord,
  LessonCompletion,
} from '../types'
import { catalogConcepts, conceptsForQuestion } from './conceptCatalog'

export function emptyConceptProgress(conceptId: string): ConceptProgressRecord {
  return {
    conceptId,
    learnState: 'unseen',
    reviewMastery: null,
    firstLearnedAt: null,
    completedAt: null,
    lastAttemptAt: null,
    lastAttemptId: null,
    viewedAt: null,
  }
}

export function completedLessonIds(completions: LessonCompletion[]): Set<string> {
  return new Set(completions.map((row) => row.lessonId))
}

export function learnedErasFromCompletions(
  completions: LessonCompletion[],
  concepts: Concept[] = catalogConcepts(),
): Set<Concept['era']> {
  const done = completedLessonIds(completions)
  return new Set(concepts.filter((concept) => concept.lessonId && done.has(concept.lessonId)).map((concept) => concept.era))
}

/**
 * 완료와 복습 숙련을 분리해 채운다.
 * 열람만 있으면 완료가 아니다. 같은 문항 반복 정답만으로 숙달을 올리지 않는다.
 */
export function hydrateConceptProgress(input: {
  concepts?: Concept[]
  stored: ConceptProgressRecord[]
  completions: LessonCompletion[]
  attempts: AttemptRecord[]
}): ConceptProgressRecord[] {
  const concepts = input.concepts ?? catalogConcepts()
  const byId = new Map(input.stored.map((row) => [row.conceptId, { ...row }]))
  const doneLessons = completedLessonIds(input.completions)

  for (const concept of concepts) {
    const row = byId.get(concept.id) ?? emptyConceptProgress(concept.id)
    if (concept.lessonId && doneLessons.has(concept.lessonId) && row.learnState !== 'completed') {
      const completion = input.completions.find((item) => item.lessonId === concept.lessonId)
      row.learnState = 'completed'
      row.completedAt = row.completedAt ?? completion?.firstCompletedAt ?? null
      row.firstLearnedAt = row.firstLearnedAt ?? completion?.firstCompletedAt ?? null
    }
    byId.set(concept.id, row)
  }

  const attemptsByQuestion = new Map<string, AttemptRecord[]>()
  for (const attempt of input.attempts) {
    const list = attemptsByQuestion.get(attempt.questionId) ?? []
    list.push(attempt)
    attemptsByQuestion.set(attempt.questionId, list)
  }

  for (const [questionId, list] of attemptsByQuestion) {
    const latest = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    if (!latest) continue
    const conceptsFor = conceptsForQuestion(
      {
        lessonId: latest.snapshot?.lessonId,
        stem: latest.snapshot?.stem ?? questionId,
        passage: latest.snapshot?.passage,
        explanation: latest.snapshot?.explanation ?? '',
        era: latest.era,
      },
      concepts,
    )
    const repeatOnly = list.length > 1 && list.every((item) => item.correct)
    const mastery =
      list.length === 0 ? null : Math.round((list.filter((item) => item.correct).length / list.length) * 100)

    for (const concept of conceptsFor) {
      const row = byId.get(concept.id) ?? emptyConceptProgress(concept.id)
      if (row.learnState === 'unseen') row.learnState = 'learning'
      row.firstLearnedAt = row.firstLearnedAt ?? latest.createdAt.slice(0, 10)
      row.lastAttemptAt = latest.createdAt
      row.lastAttemptId = latest.id
      if (!repeatOnly) row.reviewMastery = mastery
      byId.set(concept.id, row)
    }
  }

  return [...byId.values()].sort((a, b) => a.conceptId.localeCompare(b.conceptId))
}

export function markConceptsLearning(
  rows: ConceptProgressRecord[],
  conceptIds: string[],
  at: string,
): ConceptProgressRecord[] {
  const set = new Set(conceptIds)
  return rows.map((row) => {
    if (!set.has(row.conceptId) || row.learnState === 'completed') return row
    return {
      ...row,
      learnState: 'learning' as ConceptLearnState,
      firstLearnedAt: row.firstLearnedAt ?? at,
    }
  })
}

export function markConceptsCompleted(
  rows: ConceptProgressRecord[],
  conceptIds: string[],
  at: string,
): ConceptProgressRecord[] {
  const set = new Set(conceptIds)
  return rows.map((row) => {
    if (!set.has(row.conceptId)) return row
    return {
      ...row,
      learnState: 'completed' as const,
      completedAt: row.completedAt ?? at,
      firstLearnedAt: row.firstLearnedAt ?? at,
    }
  })
}

export function markConceptViewed(
  row: ConceptProgressRecord | undefined,
  conceptId: string,
  at: string,
): ConceptProgressRecord {
  const current = row ?? emptyConceptProgress(conceptId)
  return { ...current, viewedAt: at }
}

export function isLearnedConcept(row: ConceptProgressRecord | undefined): boolean {
  return row?.learnState === 'completed'
}
