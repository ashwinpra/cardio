import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../sessions.db');
const db = new Database(dbPath);

// Current schema version. Increment when backwards-incompatible changes are made.
const CURRENT_SCHEMA_VERSION = 1;

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    gameType TEXT NOT NULL,
    state JSON NOT NULL,
    hostPlayerId TEXT,
    schemaVersion INTEGER NOT NULL DEFAULT 1,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export function saveSession(sessionId: string, gameType: string, state: any, hostPlayerId: string | null) {
  try {
    const stmt = db.prepare(`
      INSERT INTO sessions (id, gameType, state, hostPlayerId, schemaVersion, updatedAt)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        state = excluded.state,
        hostPlayerId = excluded.hostPlayerId,
        schemaVersion = excluded.schemaVersion,
        updatedAt = CURRENT_TIMESTAMP
    `);
    stmt.run(sessionId, gameType, JSON.stringify(state), hostPlayerId, CURRENT_SCHEMA_VERSION);
  } catch (err) {
    console.error(`Failed to save session ${sessionId} to DB:`, err);
  }
}

export function loadSession(sessionId: string) {
  try {
    const stmt = db.prepare('SELECT * FROM sessions WHERE id = ?');
    const row = stmt.get(sessionId) as any;
    if (!row) return null;
    
    // Version mismatch handling
    if (row.schemaVersion !== CURRENT_SCHEMA_VERSION) {
      console.warn(`Session ${sessionId} has incompatible schema version ${row.schemaVersion}. Current: ${CURRENT_SCHEMA_VERSION}. Deleting...`);
      deleteSession(sessionId);
      return null;
    }
    
    return {
      ...row,
      state: JSON.parse(row.state)
    };
  } catch (err) {
    console.error(`Failed to load session ${sessionId} from DB:`, err);
    return null;
  }
}

export function deleteSession(sessionId: string) {
  try {
    const stmt = db.prepare('DELETE FROM sessions WHERE id = ?');
    stmt.run(sessionId);
  } catch (err) {
    console.error(`Failed to delete session ${sessionId} from DB:`, err);
  }
}

export function getAllSessions() {
  try {
    const stmt = db.prepare('SELECT * FROM sessions WHERE schemaVersion = ?');
    const rows = stmt.all(CURRENT_SCHEMA_VERSION) as any[];
    return rows.map(r => {
      try {
        return {
          ...r,
          state: JSON.parse(r.state)
        };
      } catch (parseErr) {
        console.error(`Corrupted state for session ${r.id}:`, parseErr);
        return null;
      }
    }).filter(s => s !== null);
  } catch (err) {
    console.error('Failed to get all sessions from DB:', err);
    return [];
  }
}
