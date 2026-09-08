import { describe, expect, it } from 'vitest'
import { eventsByEra, timelineEvents } from './timeline'

describe('timeline bank', () => {
  it('covers prehistoric through contemporary events in order', () => {
    const ids = timelineEvents.map((event) => event.id)
    expect(new Set(ids).size).toBe(timelineEvents.length)
    expect(timelineEvents.length).toBeGreaterThanOrEqual(60)

    const eras = new Set(timelineEvents.map((event) => event.era))
    for (const era of [
      'prehistoric',
      'three-kingdoms',
      'north-south',
      'goryeo',
      'joseon-early',
      'joseon-late',
      'opening',
      'colonial',
      'modern',
    ]) {
      expect(eras.has(era as never)).toBe(true)
    }

    const ordered = eventsByEra('all')
    for (let i = 1; i < ordered.length; i += 1) {
      expect(ordered[i]!.yearSort).toBeGreaterThanOrEqual(ordered[i - 1]!.yearSort)
    }
    expect(ordered[0]?.title).toContain('고조선')
    expect(ordered.at(-1)?.title).toContain('남북 정상')
  })
})
