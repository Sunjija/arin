import { TOPIC_CATALOG, type TopicEntry } from '../data/topicCatalog'
import { lessons } from '../data/lessons'
import { guideForLesson } from '../data/lessonGuides'
import type { Concept, Lesson, Question } from '../types'

export const CONCEPT_CONTENT_VERSION = 1

export function catalogConcepts(
  topics: TopicEntry[] = TOPIC_CATALOG,
  _lessonList: Lesson[] = lessons,
): Concept[] {
  return topics.map((topic) => {
    const guideSections = guideForLesson(topic.lessonId ?? '')?.sections ?? []
    const sectionIndex = guideSections.findIndex(section => section.conceptId === topic.id)
    const previous = sectionIndex > 0 ? guideSections[sectionIndex - 1] : undefined
    // Only the authored pilot sequence is explicit; the catalog's order is not a prerequisite graph.
    const prerequisiteIds = previous ? [previous.conceptId] : []

    return {
      id: topic.id,
      title: topic.title,
      era: topic.era,
      lessonId: topic.lessonId,
      prerequisiteIds,
      summary: guideForLesson(topic.lessonId ?? '')?.sections.find((section) => section.conceptId === topic.id)?.paragraphs.join('\n') ?? '',
      keywords: topic.keywords,
      source: guideForLesson(topic.lessonId ?? '')?.sections.find((section) => section.conceptId === topic.id)?.sourceUrl ?? '',
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
  question: Pick<Question, 'lessonId' | 'stem' | 'passage' | 'explanation' | 'era' | 'conceptIds'>,
  concepts: Concept[] = catalogConcepts(),
): Concept[] {
  return concepts.filter((concept) => question.conceptIds?.includes(concept.id) && (!question.lessonId || concept.lessonId === question.lessonId))
}

export function primaryConceptId(
  question: Pick<Question, 'lessonId' | 'stem' | 'passage' | 'explanation' | 'era' | 'conceptIds'>,
  concepts: Concept[] = catalogConcepts(),
): string | undefined {
  return conceptsForQuestion(question, concepts)[0]?.id
}

export function lessonConceptIds(lessonId: string, concepts: Concept[] = catalogConcepts()): string[] {
  const taught = guideForLesson(lessonId)?.sections.map((section) => section.conceptId) ?? []
  return conceptsForLesson(lessonId, concepts).filter((concept) => taught.includes(concept.id)).map((concept) => concept.id)
}
