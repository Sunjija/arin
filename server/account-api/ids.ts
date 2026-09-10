import { randomUUID } from 'node:crypto'

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID()}`
}

export function nowIso(date = new Date()): string {
  return date.toISOString()
}

export function maskEmail(email: string): string {
  const trimmed = email.trim().toLowerCase()
  const at = trimmed.indexOf('@')
  if (at <= 0) return '***'
  const local = trimmed.slice(0, at)
  const domain = trimmed.slice(at + 1)
  const head = local.slice(0, 1)
  return `${head}***@${domain}`
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(normalizeEmail(email)) && email.length <= 200
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8 && password.length <= 200
}
