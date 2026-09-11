import { describe, expect, it } from 'vitest'
import { lessons } from '../../data/lessons'
import { timelineEvents } from '../../data/timeline'
import { filterLessons, filterTimelineEvents, groupLessonsByEra } from './libraryFilter'

describe('library filters', () => {
  it('keeps source timeline and lesson banks unchanged', () => {
    const eventIds = timelineEvents.map((event) => event.id)
    const eventCount = timelineEvents.length
    const lessonIds = lessons.map((lesson) => lesson.id)
    const lessonCount = lessons.length

    filterTimelineEvents(timelineEvents, 'goryeo', '광종', 'desc')
    filterLessons(lessons, 'culture', '석굴암', 'asc')

    expect(timelineEvents.map((event) => event.id)).toEqual(eventIds)
    expect(timelineEvents).toHaveLength(eventCount)
    expect(timelineEvents).toHaveLength(70)
    expect(lessons.map((lesson) => lesson.id)).toEqual(lessonIds)
    expect(lessons).toHaveLength(lessonCount)
    expect(lessons).toHaveLength(18)
  })

  it('sorts timeline asc as oldest first and desc as newest first', () => {
    const asc = filterTimelineEvents(timelineEvents, 'all', '', 'asc')
    const desc = filterTimelineEvents(timelineEvents, 'all', '', 'desc')
    expect(asc[0]?.yearLabel).toContain('기원전')
    expect(asc[0]?.title).toContain('고조선')
    expect(desc[0]?.title).toContain('남북 정상')
    expect(asc.at(-1)?.title).toBe(desc[0]?.title)
  })

  it('matches Korean query against year, title, and detail', () => {
    const found = filterTimelineEvents(timelineEvents, 'all', '고조선', 'asc')
    expect(found.some((event) => event.title.includes('고조선 건국'))).toBe(true)
    expect(found.some((event) => event.yearLabel.includes('기원전'))).toBe(true)
    expect(filterTimelineEvents(timelineEvents, 'all', '없는검색어xyz', 'asc')).toEqual([])
  })

  it('filters timeline by era without dropping other eras from the source', () => {
    const goryeo = filterTimelineEvents(timelineEvents, 'goryeo', '', 'asc')
    expect(goryeo.length).toBeGreaterThan(0)
    expect(goryeo.every((event) => event.era === 'goryeo')).toBe(true)
    expect(timelineEvents.some((event) => event.era === 'prehistoric')).toBe(true)
  })

  it('lists 18 lessons by era and searches keywords in Korean', () => {
    const all = filterLessons(lessons, 'all', '', 'asc')
    expect(all).toHaveLength(18)
    const groups = groupLessonsByEra(all)
    expect(groups[0]?.era).toBe('prehistoric')
    expect(groups.some((group) => group.era === 'culture')).toBe(true)

    const comb = filterLessons(lessons, 'all', '빗살무늬', 'asc')
    expect(comb).toHaveLength(1)
    expect(comb[0]?.id).toBe('lesson-01')

    const desc = filterLessons(lessons, 'all', '', 'desc')
    expect(desc[0]?.era).toBe(all.at(-1)?.era)
  })
})
