import { afterEach, describe, expect, it } from 'vitest'
import { consumeLaunchUrlOnce, markNativeUrlHandled, resetLaunchUrlGateForTests } from './launchUrl'

describe('consumeLaunchUrlOnce', () => {
  afterEach(() => {
    resetLaunchUrlGateForTests()
  })

  it('returns the first non-empty URL and ignores later reads', () => {
    expect(consumeLaunchUrlOnce(undefined)).toBeUndefined()
    expect(consumeLaunchUrlOnce('arin://app/mock')).toBe('arin://app/mock')
    expect(consumeLaunchUrlOnce('arin://app/settings')).toBeUndefined()
  })

  it('does not let a stale launch URL override an already handled appUrlOpen', () => {
    markNativeUrlHandled()
    expect(consumeLaunchUrlOnce('arin://app/')).toBeUndefined()
  })
})
