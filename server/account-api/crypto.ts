import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_LEN = 64

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }).toString(
    'hex',
  )
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const n = Number(parts[1])
  const r = Number(parts[2])
  const p = Number(parts[3])
  const salt = parts[4]
  const expectedHex = parts[5]
  if (!salt || !expectedHex || !Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) {
    return false
  }
  const actual = scryptSync(password, salt, expectedHex.length / 2, { N: n, r, p })
  const expected = Buffer.from(expectedHex, 'hex')
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}

const DUMMY_HASH = hashPassword('arin-dummy-password-not-used')

/** 계정이 없을 때도 비슷한 비용을 들인다. */
export function verifyPasswordOrDummy(password: string, stored: string | null): boolean {
  if (!stored) {
    verifyPassword(password, DUMMY_HASH)
    return false
  }
  return verifyPassword(password, stored)
}

export function randomToken(): string {
  return randomBytes(32).toString('hex')
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}
