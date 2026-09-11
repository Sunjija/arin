import { TOPIC_CATALOG, type TopicEntry } from '../data/topicCatalog'
import { lessons } from '../data/lessons'
import type { Concept, Lesson, Question } from '../types'

export const CONCEPT_CONTENT_VERSION = 1

export function catalogConcepts(
  topics: TopicEntry[] = TOPIC_CATALOG,
  lessonList: Lesson[] = lessons,
): Concept[] {
  const orderedLessons = [...lessonList].sort(
    (a, b) => a.week - b.week || a.dayOrder - b.dayOrder || a.id.localeCompare(b.id),
  )
  const lessonIndex = new Map(orderedLessons.map((lesson, index) => [lesson.id, index]))

  return topics.map((topic, index) => {
    const previousInCatalog = topics[index - 1]
    const lessonPos = topic.lessonId ? lessonIndex.get(topic.lessonId) : undefined
    const previousLessonId =
      lessonPos != null && lessonPos > 0 ? orderedLessons[lessonPos - 1]?.id : undefined
    const prerequisiteIds = [
      previousInCatalog?.lessonId === topic.lessonId ? previousInCatalog.id : undefined,
      previousInCatalog?.lessonId === topic.lessonId ? undefined : previousLessonId,
    ].filter((id): id is string => Boolean(id))

    return {
      id: topic.id,
      title: topic.title,
      era: topic.era,
      lessonId: topic.lessonId,
      prerequisiteIds,
      summary: topic.notes,
      keywords: topic.keywords,
      source: 'topic-catalog',
      contentVersion: CONCEPT_CONTENT_VERSION,
    }
  })
}

export function conceptsForLesson(
  lessonId: string | undefined,
  concepts: Concept[] = catalogConcepts(),
): Concept[] {
  if (!lessonId) return []
  return concepts.filter((concept) => concept.lessonId === lessonId)
}

export function conceptsForQuestion(
  question: Pick<Question, 'lessonId' | 'stem' | 'passage' | 'explanation' | 'era'>,
  concepts: Concept[] = catalogConcepts(),
): Concept[] {
  const byLesson = conceptsForLesson(question.lessonId, concepts)
  const pool = byLesson.length > 0 ? byLesson : concepts.filter((concept) => concept.era === question.era).slice(0, 1)
  const blob = `${question.stem}\n${question.passage ?? ''}\n${question.explanation}`
  const matched = pool.filter((concept) =>
    concept.keywords.some((keyword) => keyword.length >= 2 && blob.includes(keyword)),
  )
  return matched.length > 0 ? matched : pool.slice(0, 1)
}

export function primaryConceptId(
  question: Pick<Question, 'lessonId' | 'stem' | 'passage' | 'explanation' | 'era'>,
  concepts: Concept[] = catalogConcepts(),
): string | undefined {
  return conceptsForQuestion(question, concepts)[0]?.id
}

export function lessonConceptIds(lessonId: string, concepts: Concept[] = catalogConcepts()): string[] {
  const ids = conceptsForLesson(lessonId, concepts).map((concept) => concept.id)
  return ids.length > 0 ? ids : [lessonId]
}
