// The SQLite store (docs/server-api.md sections 9 and 12). node:sqlite, prepared statements only; every value is bound,
// never spliced into SQL. Schema versions are additive: MIGRATIONS[v] is the DDL that takes a file from v-1 to v, run in
// order inside one transaction each, after a backup copy of the file (backup.mjs). A file newer than MAX_READABLE is
// left alone (SchemaTooNewError); MAX_READABLE runs one push ahead of SCHEMA_VERSION so a rollback still opens the file.

import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { backupOnce } from './backup.mjs';

export const SCHEMA_VERSION = 2;
export const MAX_READABLE = 2;

export class SchemaTooNewError extends Error {}

// v1: accounts, sessions, the cloud save, letters (unchanged since the first release)
const SCHEMA_V1 = `
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

// Every accepted player action's (account, nonce), written in the same transaction as its journal row and kept apart from
// the journal: a snapshot prunes the journal, never this table. A re-post of any nonce in it is answered replayed, however
// many actions came after; a row goes only once it is older than NONCE_KEEP_MS, at snapshot time, and an account holding
// NONCE_KEEP_PER_ACCOUNT younger ones has new actions refused instead (world.mjs). Part of the v2 DDL (schema 2 never shipped before it),
// and run again on every open of a v2 file, so a dev file written before the table (or an index) existed gains it.
export const WORLD_NONCES = `
CREATE TABLE IF NOT EXISTS world_nonces (
  world_id   INTEGER NOT NULL,
  account    TEXT    NOT NULL,
  nonce      TEXT    NOT NULL,
  seq        INTEGER NOT NULL,
  at         INTEGER NOT NULL,
  PRIMARY KEY (world_id, account, nonce)
) STRICT, WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS world_nonces_by_at ON world_nonces (world_id, at);
CREATE INDEX IF NOT EXISTS world_nonces_by_account ON world_nonces (world_id, account, at, seq);
`;

// v2: the arena. One row per world, one world per server. The engine state is the snapshot; world_actions is the
// append-only journal after it; world_members is the only mapping from a user to an engine account id; world_nonces the
// receipts a re-posted action is recognised by.
const SCHEMA_V2 = `
CREATE TABLE IF NOT EXISTS worlds (
  id             INTEGER PRIMARY KEY,
  season         INTEGER NOT NULL,
  seq            INTEGER NOT NULL,
  rev            INTEGER NOT NULL,
  snap_seq       INTEGER NOT NULL,
  clock_epoch_ms INTEGER NOT NULL,
  rate_num       INTEGER NOT NULL,
  rate_den       INTEGER NOT NULL,
  engine_v       TEXT    NOT NULL,
  state_v        INTEGER NOT NULL,
  created_at     INTEGER NOT NULL,
  saved_at       INTEGER NOT NULL,
  state          TEXT    NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS world_actions (
  world_id   INTEGER NOT NULL REFERENCES worlds(id),
  seq        INTEGER NOT NULL,
  account    TEXT,
  type       TEXT    NOT NULL,
  args       TEXT    NOT NULL,
  clock      INTEGER NOT NULL,
  at         INTEGER NOT NULL,
  nonce      TEXT,
  PRIMARY KEY (world_id, seq)
) STRICT, WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS world_members (
  world_id       INTEGER NOT NULL REFERENCES worlds(id),
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id     TEXT    NOT NULL UNIQUE,
  joined_at      INTEGER NOT NULL,
  last_nonce     TEXT,
  last_rev       INTEGER,
  last_active_at INTEGER,
  PRIMARY KEY (world_id, user_id)
) STRICT, WITHOUT ROWID;
${WORLD_NONCES}`;

export const MIGRATIONS = { 1: SCHEMA_V1, 2: SCHEMA_V2 };

// Runs `fn` inside BEGIN IMMEDIATE ... COMMIT, rolling back if it throws.
export function withTx(db, fn) {
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

// opts.exclusive (default true): PRAGMA locking_mode = EXCLUSIVE, so this connection holds the file for the process's
// life and any other process fails at its first statement; the in-process backup() still works. opts.backupDir: where the
// pre-migration copy goes (default: a `backups` folder beside the file; none for :memory:). opts.maxVersion: a test seam
// that stops the runner early (an older server opening a newer file). opts.onMigrate(from, to) is called before each step.
export async function openDb(file, opts = {}) {
  const exclusive = opts.exclusive !== false;
  const db = new DatabaseSync(file);
  db.exec(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;${exclusive ? ' PRAGMA locking_mode = EXCLUSIVE;' : ''}`);
  const target = Math.min(SCHEMA_VERSION, opts.maxVersion ?? SCHEMA_VERSION);
  const memory = file === ':memory:';
  const backupDir = opts.backupDir ?? (memory ? null : path.join(path.dirname(path.resolve(file)), 'backups'));

  // Read the version first: a database written by a newer server is left alone. Then each missing version in order,
  // a backup copy of the file before each step (never for an empty file: there is nothing to keep yet).
  db.exec('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL) STRICT;');
  const row = db.prepare('SELECT max(version) AS v FROM schema_version').get();
  if (row.v !== null && row.v > MAX_READABLE) throw new SchemaTooNewError(`schema_version ${row.v}`);
  const current = row.v ?? 0;
  for (let v = current + 1; v <= target; v++) {
    if (current > 0 && backupDir && !memory) await backupOnce({ raw: db, file }, backupDir, `pre-migrate-v${v - 1}-v${v}`);
    if (opts.onMigrate && current > 0) opts.onMigrate(v - 1, v);
    withTx(db, () => {
      db.exec(MIGRATIONS[v]);
      db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(v);
    });
  }
  // a v2 file written before world_nonces joined the v2 DDL (a dev file: schema 2 never shipped without it) gains the
  // table here; on any other v2 file this is a no-op
  if (target >= 2) db.exec(WORLD_NONCES);

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
  // the world (section 12): statements only; world.mjs owns the order they run in and the transactions around them
  const w = target >= 2 ? {
    get: db.prepare('SELECT * FROM worlds WHERE id = ?'),
    meta: db.prepare('SELECT id, season, seq, rev, snap_seq, clock_epoch_ms, rate_num, rate_den, engine_v, state_v, created_at, saved_at FROM worlds WHERE id = ?'),
    insert: db.prepare(`INSERT INTO worlds (id, season, seq, rev, snap_seq, clock_epoch_ms, rate_num, rate_den, engine_v, state_v, created_at, saved_at, state)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
    // compare-and-set on seq: changes must be 1, or another process wrote the row
    cas: db.prepare('UPDATE worlds SET seq = ?, rev = ? WHERE id = ? AND seq = ?'),
    snapshot: db.prepare('UPDATE worlds SET state = ?, snap_seq = ?, season = ?, engine_v = ?, saved_at = ? WHERE id = ?'),
    setEpoch: db.prepare('UPDATE worlds SET clock_epoch_ms = ? WHERE id = ?'),
    reset: db.prepare(`UPDATE worlds SET season = ?, seq = ?, rev = ?, snap_seq = ?, clock_epoch_ms = ?, rate_num = ?, rate_den = ?, engine_v = ?, state_v = ?, created_at = ?, saved_at = ?, state = ? WHERE id = ?`),
    journalInsert: db.prepare('INSERT INTO world_actions (world_id, seq, account, type, args, clock, at, nonce) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
    journalAfter: db.prepare('SELECT seq, account, type, args, clock, at, nonce FROM world_actions WHERE world_id = ? AND seq > ? ORDER BY seq'),
    journalPrune: db.prepare('DELETE FROM world_actions WHERE world_id = ? AND seq <= ?'),
    journalClear: db.prepare('DELETE FROM world_actions WHERE world_id = ?'),
    journalCount: db.prepare('SELECT count(*) AS n FROM world_actions WHERE world_id = ?'),
    members: db.prepare('SELECT user_id, account_id, joined_at, last_nonce, last_rev, last_active_at FROM world_members WHERE world_id = ? ORDER BY joined_at, user_id'),
    memberInsert: db.prepare('INSERT INTO world_members (world_id, user_id, account_id, joined_at) VALUES (?, ?, ?, ?)'),
    memberTouch: db.prepare('UPDATE world_members SET last_nonce = ?, last_rev = ?, last_active_at = ? WHERE world_id = ? AND account_id = ?'),
    memberName: db.prepare('SELECT u.name FROM world_members m JOIN users u ON u.id = m.user_id WHERE m.world_id = ? AND m.account_id = ?'),
    memberClearNonces: db.prepare('UPDATE world_members SET last_nonce = NULL, last_rev = NULL WHERE world_id = ?'),
    nonceSeen: db.prepare('SELECT seq FROM world_nonces WHERE world_id = ? AND account = ? AND nonce = ?'),
    nonceInsert: db.prepare('INSERT INTO world_nonces (world_id, account, nonce, seq, at) VALUES (?, ?, ?, ?, ?)'),
    noncePrune: db.prepare('DELETE FROM world_nonces WHERE world_id = ? AND at < ?'),
    // the storage cap (world.mjs movesWait): an account's receipts at or after a time, and the time of the one `offset`
    // places from the oldest of them (oldest by time, then seq: seq starts again after a reset, time does not)
    nonceCountSince: db.prepare('SELECT count(*) AS n FROM world_nonces WHERE world_id = ? AND account = ? AND at >= ?'),
    nonceAtSince: db.prepare('SELECT at FROM world_nonces WHERE world_id = ? AND account = ? AND at >= ? ORDER BY at, seq LIMIT 1 OFFSET ?'),
    nonceCount: db.prepare('SELECT count(*) AS n FROM world_nonces WHERE world_id = ?'),
  } : null;

  return {
    file,
    raw: db, // the connection itself, for backup() and the operator commands; never for a route
    backupDir,
    close: () => db.close(),
    ping: () => q.ping.get().ok === 1,
    tx: (fn) => withTx(db, fn),
    userByKey: (nameKey) => q.userByKey.get(nameKey) ?? null,
    nameTaken: (nameKey) => q.nameTaken.get(nameKey) !== undefined,

    // A new player and her first session, in one transaction. Returns null if the name was taken meanwhile (a parallel
    // sign-up finished while this one was hashing); the UNIQUE constraint backs this up.
    createUser({ name, nameKey, passHash, tokenHash, oldTokenHash, now, expiresAt }) {
      try {
        return withTx(db, () => {
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
      withTx(db, () => {
        if (oldTokenHash) q.deleteSession.run(oldTokenHash);
        q.insertSession.run(tokenHash, userId, now, expiresAt);
        q.touchUser.run(now, userId);
      });
    },

    deleteSession: (tokenHash) => { q.deleteSession.run(tokenHash); },
    sessionUser: (tokenHash, now) => q.sessionUser.get(tokenHash, now) ?? null,

    renewSession({ userId, tokenHash, now, expiresAt }) {
      withTx(db, () => {
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

    // ---- the world (null when the file is at v1 only, the maxVersion seam) ----
    world: w && {
      get: (id) => w.get.get(id) ?? null,
      meta: (id) => w.meta.get(id) ?? null,
      insert: (r) => w.insert.run(r.id, r.season, r.seq, r.rev, r.snap_seq, r.clock_epoch_ms, r.rate_num, r.rate_den, r.engine_v, r.state_v, r.created_at, r.saved_at, r.state),
      cas: (id, expectSeq, seq, rev) => w.cas.run(seq, rev, id, expectSeq).changes,
      snapshot: (id, state, snapSeq, season, engineV, savedAt) => w.snapshot.run(state, snapSeq, season, engineV, savedAt, id).changes,
      setEpoch: (id, ms) => w.setEpoch.run(ms, id).changes,
      reset: (r) => w.reset.run(r.season, r.seq, r.rev, r.snap_seq, r.clock_epoch_ms, r.rate_num, r.rate_den, r.engine_v, r.state_v, r.created_at, r.saved_at, r.state, r.id).changes,
      journalInsert: (id, row) => w.journalInsert.run(id, row.seq, row.account, row.type, row.args, row.clock, row.at, row.nonce),
      journalAfter: (id, seq) => w.journalAfter.all(id, seq),
      journalPrune: (id, seq) => w.journalPrune.run(id, seq).changes,
      journalClear: (id) => w.journalClear.run(id).changes,
      journalCount: (id) => w.journalCount.get(id).n,
      members: (id) => w.members.all(id),
      memberInsert: (id, userId, accountId, joinedAt) => w.memberInsert.run(id, userId, accountId, joinedAt),
      memberTouch: (id, accountId, nonce, rev, at) => w.memberTouch.run(nonce, rev, at, id, accountId).changes,
      memberName: (id, accountId) => w.memberName.get(id, accountId)?.name ?? null,
      memberClearNonces: (id) => w.memberClearNonces.run(id).changes,
      // the receipts (section 12.4): the seq an (account, nonce) landed at, or null; one row per accepted player action
      nonceSeq: (id, accountId, nonce) => w.nonceSeen.get(id, accountId, nonce)?.seq ?? null,
      nonceInsert: (id, accountId, nonce, seq, at) => w.nonceInsert.run(id, accountId, nonce, seq, at),
      noncePrune: (id, before) => w.noncePrune.run(id, before).changes,
      // an account's receipts at or after `since` (the storage cap counts the ones inside NONCE_KEEP_MS), and the `at` of
      // the one `offset` places from the oldest of them
      nonceCountSince: (id, accountId, since) => w.nonceCountSince.get(id, accountId, since).n,
      nonceAtSince: (id, accountId, since, offset) => w.nonceAtSince.get(id, accountId, since, offset)?.at ?? since,
      nonceCount: (id) => w.nonceCount.get(id).n,
    },
  };
}
