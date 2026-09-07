import { describe, expect, it } from 'vitest'
import { cardFingerprint, normalizeText } from './cardFingerprint'

describe('cardFingerprint', () => {
  it('normalizes whitespace and punctuation', () => {
    expect(normalizeText('고려  광종!')).toBe(normalizeText('고려광종'))
  })

  it('treats reversed front/back as the same card', () => {
    const a = cardFingerprint('광종', '노비안검법')
    const b = cardFingerprint('노비안검법', '광종')
    expect(a).toBe(b)
  })

  it('distinguishes different content', () => {
    expect(cardFingerprint('광종', '과거제')).not.toBe(cardFingerprint('성종', '12목'))
  })
})
