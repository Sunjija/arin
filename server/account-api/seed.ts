import { hashPassword } from './crypto.ts'
import type { AccountDatabase } from './db.ts'
import { newId, nowIso } from './ids.ts'

export const TEST_USERS = [
  { email: 'a@arin.test', password: 'ArinTest123!', label: 'student-a' },
  { email: 'b@arin.test', password: 'ArinTest123!', label: 'student-b' },
] as const

export function seedTestUsers(db: AccountDatabase): { userId: string; email: string }[] {
  const created: { userId: string; email: string }[] = []
  const now = nowIso()
  for (const user of TEST_USERS) {
    const existing = db.get<{ id: string }>('SELECT id FROM users WHERE email = ?', user.email)
    if (existing) {
      created.push({ userId: existing.id, email: user.email })
      continue
    }
    const id = newId('usr')
    db.run(
      `INSERT INTO users (id, email, password_hash, age_confirmed_at, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL)`,
      id,
      user.email,
      hashPassword(user.password),
      now,
      now,
      now,
    )
    created.push({ userId: id, email: user.email })
  }
  return created
}
