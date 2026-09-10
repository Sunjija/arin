import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { applyMigrations } from './migrate.ts'

export type SqlValue = string | number | bigint | null | Uint8Array

export class AccountDatabase {
  readonly raw: DatabaseSync

  constructor(path: string) {
    if (path !== ':memory:') {
      mkdirSync(dirname(path), { recursive: true })
    }
    this.raw = new DatabaseSync(path, { enableForeignKeyConstraints: true })
    try {
      this.raw.exec('PRAGMA journal_mode = WAL')
    } catch {
      /* :memory: 등에서 WAL을 쓰지 못할 수 있다 */
    }
    this.raw.exec('PRAGMA busy_timeout = 5000')
    applyMigrations(this)
  }

  exec(sql: string): void {
    this.raw.exec(sql)
  }

  run(sql: string, ...params: SqlValue[]): void {
    const stmt = this.raw.prepare(sql)
    stmt.run(...params)
  }

  get<T>(sql: string, ...params: SqlValue[]): T | undefined {
    const stmt = this.raw.prepare(sql)
    return stmt.get(...params) as T | undefined
  }

  all<T>(sql: string, ...params: SqlValue[]): T[] {
    const stmt = this.raw.prepare(sql)
    return stmt.all(...params) as T[]
  }

  transaction<T>(fn: () => T): T {
    this.exec('BEGIN IMMEDIATE')
    try {
      const result = fn()
      this.exec('COMMIT')
      return result
    } catch (error) {
      this.exec('ROLLBACK')
      throw error
    }
  }

  close(): void {
    this.raw.close()
  }
}
