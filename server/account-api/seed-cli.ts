#!/usr/bin/env node
import { createAccountApp } from './app.ts'
import { loadAccountApiConfig } from './config.ts'
import { seedTestUsers } from './seed.ts'

const config = loadAccountApiConfig()
if (!config.allowTestSeed) {
  console.error('Set ARIN_ALLOW_TEST_SEED=1 (non-production) to create test users.')
  process.exit(1)
}
const { db } = createAccountApp(config)
const users = seedTestUsers(db)
for (const user of users) {
  console.log(`${user.email}  (${user.userId})`)
}
console.log('password: ArinTest123!')
db.close()
