import type { Lesson, Question } from '../types'
import type { TopicEntry } from '../data/topicCatalog'
import { TOPIC_CATALOG } from '../data/topicCatalog'

export function conceptsForLesson(
  lessonId: string | undefined,
  catalog: TopicEntry[] = TOPIC_CATALOG,
): TopicEntry[] {
  if (!lessonId) return []
  return catalog.filter((topic) => topic.lessonId === lessonId)
}

export function conceptsForQuestion(
  question: Pick<Question, 'lessonId' | 'stem' | 'passage' | 'explanation' | 'era'>,
  catalog: TopicEntry[] = TOPIC_CATALOG,
): TopicEntry[] {
  const byLesson = conceptsForLesson(question.lessonId, catalog)
  if (byLesson.length === 0) {
    return catalog.filter((topic) => topic.era === question.era).slice(0, 1)
  }
  const blob = `${question.stem}\n${question.passage ?? ''}\n${question.explanation}`
  const matched = byLesson.filter((topic) =>
    topic.keywords.some((keyword) => keyword.length >= 2 && blob.includes(keyword)),
  )
  return matched.length > 0 ? matched : byLesson.slice(0, 1)
}

export function primaryConcept(
  question: Pick<Question, 'lessonId' | 'stem' | 'passage' | 'explanation' | 'era'>,
  catalog: TopicEntry[] = TOPIC_CATALOG,
): TopicEntry | null {
  return conceptsForQuestion(question, catalog)[0] ?? null
}

export function conceptTitle(
  conceptId: string,
  catalog: TopicEntry[] = TOPIC_CATALOG,
  lessons: Lesson[] = [],
): string {
  const topic = catalog.find((item) => item.id === conceptId)
  if (topic) return topic.title
  const lesson = lessons.find((item) => item.id === conceptId)
  return lesson?.title ?? conceptId
}

export function lessonConceptId(lesson: Lesson, catalog: TopicEntry[] = TOPIC_CATALOG): string {
  return conceptsForLesson(lesson.id, catalog)[0]?.id ?? lesson.id
}
