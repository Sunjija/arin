import { mkdirSync, copyFileSync, existsSync } from 'node:fs'
import { basename, join } from 'node:path'
import { loadAccountApiConfig } from './config.ts'
import { writeAccountLog } from './log.ts'

function stamp(): string {
  return new Date().toISOString().replaceAll(':', '').replaceAll('.', '-')
}

export function backupSqlite(sqlitePath = loadAccountApiConfig().sqlitePath, destDir = 'server/data/backups'): string {
  if (!existsSync(sqlitePath)) {
    throw new Error('백업할 SQLite 파일이 없습니다. 개발 서버를 한 번 실행하세요.')
  }
  mkdirSync(destDir, { recursive: true })
  const dest = join(destDir, `arin-account-${stamp()}.sqlite`)
  copyFileSync(sqlitePath, dest)
  const wal = `${sqlitePath}-wal`
  const shm = `${sqlitePath}-shm`
  if (existsSync(wal)) copyFileSync(wal, `${dest}-wal`)
  if (existsSync(shm)) copyFileSync(shm, `${dest}-shm`)
  writeAccountLog({ level: 'info', event: 'backup', file: basename(dest) })
  return dest
}

export function restoreSqlite(fromPath: string, sqlitePath = loadAccountApiConfig().sqlitePath): void {
  if (!existsSync(fromPath)) throw new Error('복구할 백업 파일이 없습니다.')
  copyFileSync(fromPath, sqlitePath)
  writeAccountLog({ level: 'info', event: 'restore', file: basename(fromPath) })
}

const command = process.argv[2]
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('backup.ts')) {
  if (command === 'restore') {
    const from = process.argv[3]
    if (!from) {
      console.error('usage: tsx server/account-api/backup.ts restore <file>')
      process.exit(1)
    }
    restoreSqlite(from)
  } else {
    console.log(backupSqlite())
  }
}
