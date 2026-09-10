import { describe, expect, it } from 'vitest'
import { containsSensitive, redactRecord } from './log.ts'

describe('account log redaction', () => {
  it('strips password, token, cookie, and email fields', () => {
    const redacted = redactRecord({
      password: 'secret',
      token: 'abc',
      authorization: 'Bearer abc',
      cookie: 'arin_session=abc',
      email: 'a@arin.test',
      userId: 'usr_1',
    })
    expect(redacted.password).toBe('[redacted]')
    expect(redacted.token).toBe('[redacted]')
    expect(redacted.authorization).toBe('[redacted]')
    expect(redacted.cookie).toBe('[redacted]')
    expect(redacted.email).toBe('[redacted]')
    expect(redacted.userId).toBe('usr_1')
  })

  it('detects leftover secrets in a serialized line', () => {
    expect(containsSensitive('{"password":"x"}')).toBe(true)
    expect(containsSensitive('{"event":"login","userId":"usr_1"}')).toBe(false)
  })
})
