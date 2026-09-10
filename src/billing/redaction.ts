const SECRET_KEY_PATTERN =
  /(token|jws|receipt|payload|secret|private|authorization|password|key|signed)/i

export function redactForLog(value: unknown): unknown {
  if (typeof value === 'string') return redactString(value)
  if (Array.isArray(value)) return value.map(redactForLog)
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, nested]) => {
      if (SECRET_KEY_PATTERN.test(key)) return [key, '[redacted]']
      return [key, redactForLog(nested)]
    })
    return Object.fromEntries(entries)
  }
  return value
}

function redactString(value: string): string {
  if (value.startsWith('test.')) return 'test.[redacted-token]'
  if (value.split('.').length === 3 && value.length > 80) return '[redacted-jws]'
  return value
}

export function assertNoSecretsInText(text: string, secrets: string[]): void {
  for (const secret of secrets) {
    if (secret && text.includes(secret)) {
      throw new Error('secret leaked into log or response')
    }
  }
}
