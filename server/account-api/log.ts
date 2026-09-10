const SENSITIVE_KEY = /^(password|token|authorization|cookie|admin[_-]?key|email|devrecoverytoken|newpassword|sessiontoken)$/i
const SENSITIVE_VALUE = /(password|bearer\s+[a-f0-9]{16,}|arin_session=)/i

export function redactValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEY.test(key)) return '[redacted]'
  if (typeof value === 'string' && SENSITIVE_VALUE.test(value)) return '[redacted]'
  if (Array.isArray(value)) return value.map((item, index) => redactValue(String(index), item))
  if (value && typeof value === 'object') return redactRecord(value as Record<string, unknown>)
  return value
}

export function redactRecord(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    out[key] = redactValue(key, value)
  }
  return out
}

export function containsSensitive(text: string): boolean {
  return SENSITIVE_VALUE.test(text) || /"password"\s*:/.test(text)
}

export function writeAccountLog(fields: Record<string, unknown>): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...redactRecord(fields) })
  if (containsSensitive(line)) {
    console.log(JSON.stringify({ ts: new Date().toISOString(), level: 'error', event: 'log_redaction_blocked' }))
    return
  }
  console.log(line)
}
