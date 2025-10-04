import { Database } from 'better-sqlite3';
import { getEnvConfig } from './environment';

const env = getEnvConfig();

let db: Database | null = null;

export function getDatabase() {
  if (!db) {
    db = new Database('local.db');
    initializeDatabase();
  }
  return db;
}

function initializeDatabase() {
  db?.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS knowledge_versions (
      id TEXT PRIMARY KEY,
      version INTEGER NOT NULL,
      nodes TEXT NOT NULL,
      relations TEXT NOT NULL,
      metadata TEXT,
      status TEXT DEFAULT 'inactive',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}