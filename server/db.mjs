// The SQLite store (docs/server-api.md section 9). node:sqlite, prepared statements only; every value is bound, never
// spliced into SQL.

import { DatabaseSync } from 'node:sqlite';

export const SCHEMA_VERSION = 1;
// The newest schema this server can open without touching it. Lands one release ahead of the schema that
// writes it, so a deploy that rolls back after a migration still starts.
export const MAX_READABLE = 2;

export class SchemaTooNewError extends Error {}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id           INTEGER PRIMARY KEY,
  name         TEXT    NOT NULL CHECK (length(name) BETWEEN 3 AND 24),
  name_key     TEXT    NOT NULL UNIQUE CHECK (name_key = lower(name)),
  pass_hash    TEXT    NOT NULL,
  created_at   INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT    PRIMARY KEY CHECK (length(token_hash) = 64),
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
) STRICT, WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS sessions_by_user   ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_by_expiry ON sessions(expires_at);

-- data (a whole saved game, about 250 KB) comes last: SQLite reads a row's columns in order, so the small ones before
-- it are read without walking the saved game's overflow pages (the Players board and every session lookup).
CREATE TABLE IF NOT EXISTS saves (
  user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  summary    TEXT    NOT NULL,
  updated_at INTEGER NOT NULL,
  data       TEXT    NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS feedback (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  kind       TEXT    NOT NULL CHECK (kind IN ('bug', 'idea', 'rating')),
  rating     INTEGER CHECK (rating BETWEEN 1 AND 5),
  text       TEXT    NOT NULL CHECK (length(text) <= 2000),
  context    TEXT    NOT NULL,
  created_at INTEGER NOT NULL,
  CHECK ((kind = 'rating') = (rating IS NOT NULL))
) STRICT;
`;

// Runs `fn` inside BEGIN IMMEDIATE ... COMMIT, rolling back if it throws.
function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function openDb(file) {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');

  // Create what is missing (idempotent), but read the version first: a database written by a newer server is left alone.
  transaction(db, () => {
    db.exec('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL) STRICT;');
    const row = db.prepare('SELECT max(version) AS v FROM schema_version').get();
    if (row.v !== null && row.v > MAX_READABLE) throw new SchemaTooNewError(`schema_version ${row.v}`);
    db.prepare('INSERT INTO schema_version (version) SELECT ? WHERE NOT EXISTS (SELECT 1 FROM schema_version)')
      .run(SCHEMA_VERSION);
    db.exec(SCHEMA);
  });

  const q = {
    ping: db.prepare('SELECT 1 AS ok'),
    userByKey: db.prepare('SELECT id, name, pass_hash FROM users WHERE name_key = ?'),
    nameTaken: db.prepare('SELECT 1 AS taken FROM users WHERE name_key = ?'),
    insertUser: db.prepare(
      'INSERT INTO users (name, name_key, pass_hash, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?) RETURNING id'),
    touchUser: db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?'),
    insertSession: db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'),
    deleteSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
    sessionUser: db.prepare(`
      SELECT u.id, u.name, s.expires_at, sv.updated_at AS save_updated_at
        FROM sessions s JOIN users u ON u.id = s.user_id LEFT JOIN saves sv ON sv.user_id = u.id
       WHERE s.token_hash = ? AND s.expires_at > ?`),
    renewSession: db.prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?'),
    saveUpdatedAt: db.prepare('SELECT updated_at FROM saves WHERE user_id = ?'),
    getSave: db.prepare('SELECT data, updated_at FROM saves WHERE user_id = ?'),
    // updated_at strictly increases per player
    upsertSave: db.prepare(`
      INSERT INTO saves (user_id, data, summary, updated_at) VALUES (?, ?, ?, ?)
        ON CONFLICT (user_id) DO UPDATE SET
          data = excluded.data, summary = excluded.summary,
          updated_at = max(excluded.updated_at, saves.updated_at + 1)
        RETURNING updated_at`),
    players: db.prepare(`
      SELECT u.name, s.summary, s.updated_at
        FROM saves s JOIN users u ON u.id = s.user_id
       ORDER BY json_extract(s.summary, '$.whorescore') DESC, s.updated_at DESC, u.name_key ASC
       LIMIT ?`),
    insertFeedback: db.prepare(
      'INSERT INTO feedback (user_id, kind, rating, text, context, created_at) VALUES (?, ?, ?, ?, ?, ?)'),
    sweepSessions: db.prepare('DELETE FROM sessions WHERE expires_at <= ?'),
  };

  return {
    close: () => db.close(),
    ping: () => q.ping.get().ok === 1,
    userByKey: (nameKey) => q.userByKey.get(nameKey) ?? null,
    nameTaken: (nameKey) => q.nameTaken.get(nameKey) !== undefined,

    // A new player and her first session, in one transaction. Returns null if the name was taken meanwhile (a parallel
    // sign-up finished while this one was hashing); the UNIQUE constraint backs this up.
    createUser({ name, nameKey, passHash, tokenHash, oldTokenHash, now, expiresAt }) {
      try {
        return transaction(db, () => {
          if (q.nameTaken.get(nameKey) !== undefined) return null;
          if (oldTokenHash) q.deleteSession.run(oldTokenHash);
          const { id } = q.insertUser.get(name, nameKey, passHash, now, now);
          q.insertSession.run(tokenHash, id, now, expiresAt);
          return { id };
        });
      } catch (err) {
        if (/UNIQUE constraint failed: users\.name_key/.test(String(err && err.message))) return null;
        throw err;
      }
    },

    // A successful login: drop the request's old session, start a new one, note the visit.
    startSession({ userId, tokenHash, oldTokenHash, now, expiresAt }) {
      transaction(db, () => {
        if (oldTokenHash) q.deleteSession.run(oldTokenHash);
        q.insertSession.run(tokenHash, userId, now, expiresAt);
        q.touchUser.run(now, userId);
      });
    },

    deleteSession: (tokenHash) => { q.deleteSession.run(tokenHash); },
    sessionUser: (tokenHash, now) => q.sessionUser.get(tokenHash, now) ?? null,

    renewSession({ userId, tokenHash, now, expiresAt }) {
      transaction(db, () => {
        q.renewSession.run(expiresAt, tokenHash);
        q.touchUser.run(now, userId);
      });
    },

    saveUpdatedAt: (userId) => q.saveUpdatedAt.get(userId)?.updated_at ?? null,
    getSave: (userId) => q.getSave.get(userId) ?? null,
    putSave: (userId, data, summary, now) => q.upsertSave.get(userId, data, summary, now).updated_at,
    players: (limit) => q.players.all(limit),
    addFeedback: ({ userId, kind, rating, text, context, now }) => {
      q.insertFeedback.run(userId, kind, rating, text, context, now);
    },
    sweepSessions: (now) => q.sweepSessions.run(now).changes,
  };
}
