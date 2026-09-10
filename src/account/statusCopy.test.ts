import { describe, expect, it } from 'vitest'
import { guestEventId } from './eventId'
import { statusCopy } from './statusCopy'
import { guestSession } from './types'

describe('account client helpers', () => {
  it('never describes demo storage as server save completed', () => {
    const copy = statusCopy({
      session: guestSession('demo', false),
      pendingCount: 0,
      failedCount: 0,
      conflictCount: 0,
      lastError: null,
    })
    expect(copy.statusText).toContain('이 브라우저에만 저장')
    expect(copy.statusText).not.toContain('서버에 저장됨')
  })

  it('keeps guest transfer event ids stable for retries', () => {
    const first = guestEventId('gdev_1', 'attempts', 'att-1')
    const second = guestEventId('gdev_1', 'attempts', 'att-1')
    expect(first).toBe(second)
    expect(first).toBe('evt_guest_gdev_1_attempts_att-1')
  })
})
