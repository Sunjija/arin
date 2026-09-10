import { getRequestListener } from '@hono/node-server'
import type { Plugin } from 'vite'
import { createAccountApp, type AccountApp } from './app.ts'
import { seedTestUsers } from './seed.ts'
import { writeAccountLog } from './log.ts'

let running: AccountApp | undefined

export function getAccountApp(): AccountApp {
  if (!running) {
    running = createAccountApp()
    if (running.config.allowTestSeed) {
      seedTestUsers(running.db)
    }
  }
  return running
}

export function arinAccountApiPlugin(): Plugin {
  return {
    name: 'arin-account-api',
    configureServer(server) {
      if (process.env.ARIN_ACCOUNT_API !== '1') return
      const account = getAccountApp()
      const listener = getRequestListener(account.app.fetch)
      writeAccountLog({ level: 'info', event: 'vite_api_mount', env: account.config.env })
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? ''
        if (!url.startsWith('/api/account/')) {
          next()
          return
        }
        void listener(req, res)
      })
    },
    configurePreviewServer(server) {
      if (process.env.ARIN_ACCOUNT_API !== '1') return
      const account = getAccountApp()
      const listener = getRequestListener(account.app.fetch)
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? ''
        if (!url.startsWith('/api/account/')) {
          next()
          return
        }
        void listener(req, res)
      })
    },
  }
}
