import { guideForLesson } from '../data/lessonGuides'
import { questions } from '../data/questions'

/** Eligibility for new concept practice, not expert approval for mock exams. */
export function preparedLibraryQuestions(lessonId: string) {
  const guide = guideForLesson(lessonId)
  if (!guide || guide.reviewStatus === 'draft') return []
  const taught = new Set(guide.sections.filter(section => section.sourceUrl.trim()
    && section.paragraphs.some(paragraph => paragraph.trim())).map(section => section.conceptId))
  return questions.filter(question => question.lessonId === lessonId && question.sourceUrl?.trim()
    && question.conceptIds?.length && question.conceptIds.every(id => taught.has(id)))
}
