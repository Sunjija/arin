import { serve } from '@hono/node-server'
import { createAccountApp } from './app.ts'
import { loadAccountApiConfig } from './config.ts'
import { writeAccountLog } from './log.ts'
import { seedTestUsers } from './seed.ts'

const config = loadAccountApiConfig()
const { app, db } = createAccountApp(config)
if (config.allowTestSeed) {
  seedTestUsers(db)
  writeAccountLog({ level: 'info', event: 'seed_users' })
}

const port = Number(process.env.ARIN_API_PORT ?? 43128)
const hostname = process.env.ARIN_API_HOST ?? '127.0.0.1'

const server = serve({ fetch: app.fetch, port, hostname }, (info) => {
  writeAccountLog({ level: 'info', event: 'listen', port: info.port, env: config.env })
})

process.on('SIGINT', () => {
  server.close()
  db.close()
  process.exit(0)
})
