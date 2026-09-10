export type ArinEnv = 'development' | 'test' | 'production'

export interface AccountApiConfig {
  env: ArinEnv
  sqlitePath: string
  adminKey: string
  publicOrigin: string
  sessionTtlMs: number
  reauthTtlMs: number
  recoveryTtlMs: number
  pullLimit: number
  exposeDevRecovery: boolean
  allowTestSeed: boolean
  mailboxPath: string
  rateLimit: boolean
}

function envString(name: string, fallback: string): string {
  const value = process.env[name]
  return value && value.trim() ? value.trim() : fallback
}

function envFlag(name: string): boolean {
  const value = process.env[name]?.trim().toLowerCase()
  return value === '1' || value === 'true' || value === 'yes'
}

export function loadAccountApiConfig(overrides: Partial<AccountApiConfig> = {}): AccountApiConfig {
  const envRaw = envString('ARIN_ENV', 'development')
  const env: ArinEnv =
    envRaw === 'production' || envRaw === 'test' || envRaw === 'development' ? envRaw : 'development'
  const exposeDevRecovery = env !== 'production' && envFlag('ARIN_DEV_RECOVERY')
  const allowTestSeed = env !== 'production' && envFlag('ARIN_ALLOW_TEST_SEED')

  const base: AccountApiConfig = {
    env,
    sqlitePath: envString('ARIN_SQLITE_PATH', 'server/data/arin-account.sqlite'),
    adminKey: envString('ARIN_ADMIN_KEY', ''),
    publicOrigin: envString('ARIN_PUBLIC_ORIGIN', 'http://127.0.0.1:43127'),
    sessionTtlMs: 14 * 24 * 60 * 60 * 1000,
    reauthTtlMs: 5 * 60 * 1000,
    recoveryTtlMs: 60 * 60 * 1000,
    pullLimit: 200,
    exposeDevRecovery,
    allowTestSeed,
    mailboxPath: envString('ARIN_DEV_MAILBOX_PATH', 'server/data/dev-mailbox.json'),
    rateLimit: env !== 'test',
  }
  return { ...base, ...overrides }
}
