import { describe, expect, it } from 'vitest'
import { backGuardCount, handleHardwareBack, pushBackGuard } from './backButton'

describe('hardware back guards', () => {
  it('runs the latest guard and does not fall through when it consumes', async () => {
    const seen: string[] = []
    const stop = pushBackGuard(() => {
      seen.push('guard')
    })
    await expect(handleHardwareBack(true)).resolves.toBe('consumed')
    expect(seen).toEqual(['guard'])
    stop()
    expect(backGuardCount()).toBe(0)
  })

  it('falls through to history or exit when a guard returns false', async () => {
    const stop = pushBackGuard(() => false)
    await expect(handleHardwareBack(true)).resolves.toBe('history')
    await expect(handleHardwareBack(false)).resolves.toBe('exit')
    stop()
  })
})
