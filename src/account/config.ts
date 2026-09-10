import type { AccountMode } from './types'

export function readAccountMode(): AccountMode {
  const mode = import.meta.env.VITE_ARIN_ACCOUNT_MODE
  if (mode === 'connected') return 'connected'
  if (mode === 'test') return 'test'
  return 'demo'
}

export function apiBase(): string {
  const base = import.meta.env.VITE_ARIN_API_BASE
  return typeof base === 'string' && base.trim() ? base.replace(/\/$/, '') : ''
}

export function apiUrl(path: string): string {
  return `${apiBase()}/api/account/v1${path}`
}
