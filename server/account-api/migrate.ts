import type { AccountDatabase } from './db.ts'

const MIGRATIONS: string[] = [
  `
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    age_confirmed_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_used_at TEXT NOT NULL,
    revoked_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE recovery_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE reauth_grants (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  );

  CREATE TABLE entitlements (
    user_id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    plan TEXT NOT NULL,
    product_code TEXT,
    external_ref TEXT,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE sync_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    collection TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    op TEXT NOT NULL,
    client_updated_at TEXT NOT NULL,
    device_id TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    received_at TEXT NOT NULL,
    UNIQUE (user_id, event_id)
  );

  CREATE TABLE sync_heads (
    user_id TEXT NOT NULL,
    collection TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    revision INTEGER,
    payload_json TEXT NOT NULL,
    PRIMARY KEY (user_id, collection, entity_id)
  );

  CREATE TABLE guest_transfers (
    user_id TEXT NOT NULL,
    guest_device_id TEXT NOT NULL,
    collection TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, guest_device_id, collection, entity_id)
  );

  CREATE TABLE account_lifecycle (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    event TEXT NOT NULL,
    created_at TEXT NOT NULL,
    payload_json TEXT NOT NULL
  );

  CREATE INDEX idx_sync_events_user_seq ON sync_events(user_id, id);
  CREATE INDEX idx_sessions_token ON sessions(token_hash);
  CREATE INDEX idx_sessions_user ON sessions(user_id);
  CREATE INDEX idx_users_email ON users(email);
  `,
]

export function applyMigrations(db: AccountDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `)
  const current = db.get<{ version: number }>('SELECT MAX(version) AS version FROM schema_migrations')
  const start = current?.version ?? 0
  for (let i = start; i < MIGRATIONS.length; i += 1) {
    const sql = MIGRATIONS[i]!
    db.transaction(() => {
      db.exec(sql)
      db.run('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)', i + 1, new Date().toISOString())
    })
  }
}
