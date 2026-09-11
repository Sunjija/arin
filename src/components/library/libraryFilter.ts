import type { Lesson } from '../../types'
import { ALL_ERAS, type EraId } from '../../types'
import type { TimelineEvent } from '../../data/timeline'
import { matchesSearch, type EraFilter, type LibrarySort } from './libraryQuery'

export function eventSearchText(event: TimelineEvent): string {
  return `${event.yearLabel} ${event.title} ${event.detail}`
}

export function lessonSearchText(lesson: Lesson): string {
  return `${lesson.title} ${lesson.summary} ${lesson.keywords.join(' ')} ${lesson.checkpoints.join(' ')}`
}

export function filterTimelineEvents(
  events: readonly TimelineEvent[],
  era: EraFilter,
  q: string,
  sort: LibrarySort,
): TimelineEvent[] {
  const filtered = events.filter((event) => {
    if (era !== 'all' && event.era !== era) return false
    return matchesSearch(eventSearchText(event), q)
  })
  const ordered = [...filtered].sort((a, b) => a.yearSort - b.yearSort)
  return sort === 'desc' ? ordered.reverse() : ordered
}

function eraRank(era: EraId): number {
  const index = ALL_ERAS.indexOf(era)
  return index === -1 ? ALL_ERAS.length : index
}

export function filterLessons(
  source: readonly Lesson[],
  era: EraFilter,
  q: string,
  sort: LibrarySort,
): Lesson[] {
  const filtered = source.filter((lesson) => {
    if (era !== 'all' && lesson.era !== era) return false
    return matchesSearch(lessonSearchText(lesson), q)
  })
  const ordered = [...filtered].sort(
    (a, b) =>
      eraRank(a.era) - eraRank(b.era) ||
      a.week - b.week ||
      a.dayOrder - b.dayOrder ||
      a.id.localeCompare(b.id),
  )
  return sort === 'desc' ? ordered.reverse() : ordered
}

export type LessonEraGroup = {
  era: EraId
  lessons: Lesson[]
}

export function groupLessonsByEra(list: readonly Lesson[]): LessonEraGroup[] {
  const groups: LessonEraGroup[] = []
  for (const lesson of list) {
    const current = groups[groups.length - 1]
    if (current && current.era === lesson.era) current.lessons.push(lesson)
    else groups.push({ era: lesson.era, lessons: [lesson] })
  }
  return groups
}
