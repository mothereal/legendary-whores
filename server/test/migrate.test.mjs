// T-migrate (ARENA-SPEC section 9.3; docs/server-api.md 12.11): a v1 file opened by this server gains the four world
// tables and then the guests column, each step after a backup copy; the build before this one (reads up to 3, writes 2)
// still opens the migrated file untouched; a file newer than MAX_READABLE is refused; a v2 file written before
// world_nonces joined the v2 DDL gains the table at open; a v2 file migrates to v3 in one step and a guest can then be
// written and found by the sweep's pick.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import * as auth from '../auth.mjs';
import { listBackups } from '../backup.mjs';
import { MAX_READABLE, MIGRATIONS, openDb, SCHEMA_VERSION, SchemaTooNewError } from '../db.mjs';
import { makeUser, mintName, rmDir, tmpDir } from './helpers.mjs';

const tables = (file) => { const d = new DatabaseSync(file); const t = d.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map((r) => r.name); d.close(); return t; };
const versions = (file) => { const d = new DatabaseSync(file); const v = d.prepare('SELECT version FROM schema_version ORDER BY version').all().map((r) => r.version); d.close(); return v; };
const columns = (file, table) => { const d = new DatabaseSync(file); const c = d.prepare(`PRAGMA table_info(${table})`).all().map((r) => r.name); d.close(); return c; };
const indexes = (file, table) => { const d = new DatabaseSync(file); const i = d.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = ? AND name NOT LIKE 'sqlite_%' ORDER BY name").all(table).map((r) => r.name); d.close(); return i; };
const WORLD_TABLES = ['feedback', 'saves', 'schema_version', 'sessions', 'users', 'world_actions', 'world_members', 'world_nonces', 'worlds'];

test('T-migrate: a v1 file gains the world tables under v2 and the guests column under v3, one pre-migrate copy per step that passes integrity_check and still opens; the build before this one opens the v3 file untouched; a v4 file is refused', async () => {
  assert.equal(SCHEMA_VERSION, 3, 'the guests schema'); assert.equal(MAX_READABLE, 3, 'reads no further than it writes: the next schema raises MAX_READABLE alone first');
  assert.ok(MIGRATIONS[1] && MIGRATIONS[2] && MIGRATIONS[3]); assert.equal(MIGRATIONS[4], undefined);
  const dir = tmpDir('lw-migrate'); const file = path.join(dir, 'lw.sqlite'); const backupDir = path.join(dir, 'backups');
  // a v1 file, made by the v1 DDL alone (the maxVersion seam stops the runner at 1), with one user and her save
  const v1 = await openDb(file, { maxVersion: 1, backupDir });
  assert.equal(v1.world, null, 'no world statements at v1'); assert.equal(v1.guests, null, 'no guest statements at v1');
  const u = makeUser(v1);
  v1.putSave(u.id, '{"v":"proto-1","at":1,"S":{},"ui":{}}', '{"tier":"common"}', 1);
  v1.close();
  assert.deepEqual(versions(file), [1]);
  assert.deepEqual(tables(file), ['feedback', 'saves', 'schema_version', 'sessions', 'users']);
  assert.ok(!fs.existsSync(backupDir), 'a fresh file took no backup');
  // opened by this server: two steps, a copy before each
  const steps = [];
  const v3 = await openDb(file, { backupDir, onMigrate: (a, b) => steps.push([a, b]) });
  assert.deepEqual(steps, [[1, 2], [2, 3]]);
  assert.ok(v3.world, 'the world statements exist'); assert.ok(v3.guests, 'the guest statements exist');
  assert.equal(v3.getSave(u.id).updated_at, 1, 'the save survived');
  assert.equal(v3.sessionUser(auth.tokenHash(u.token), Date.now()).guest_expires_at, null, 'a user from before the column is a kept account');
  v3.close();
  assert.deepEqual(versions(file), [1, 2, 3]);
  assert.deepEqual(tables(file), WORLD_TABLES);
  assert.ok(columns(file, 'users').includes('guest_expires_at'), 'the guests column');
  assert.deepEqual(indexes(file, 'users'), ['users_guest_expiry'], 'the expiry index');
  for (const [label, at] of [['pre-migrate-v1-v2', [1]], ['pre-migrate-v2-v3', [1, 2]]]) {
    const copies = listBackups(backupDir, label);
    assert.equal(copies.length, 1, label); assert.match(copies[0].name, new RegExp(`^${label}-\\d{8}-\\d{4}\\.sqlite$`));
    const copy = new DatabaseSync(copies[0].path);
    assert.equal(copy.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    assert.deepEqual(copy.prepare('SELECT version FROM schema_version').all().map((r) => r.version), at, `the ${label} copy is the file before that step`);
    copy.close();
    assert.equal((fs.statSync(copies[0].path).mode & 0o777), 0o600);
  }
  assert.ok(!columns(listBackups(backupDir, 'pre-migrate-v2-v3')[0].path, 'users').includes('guest_expires_at'), 'the v2 copy has no guests column');
  // the v1 copy opens under this server (it migrates again, taking its own pre-migrate copies)
  const again = await openDb(listBackups(backupDir, 'pre-migrate-v1-v2')[0].path, { backupDir: path.join(dir, 'backups2') });
  assert.ok(again.world && again.guests); again.close();
  // a second open of the migrated file is a no-op
  const steps2 = [];
  const v3b = await openDb(file, { backupDir, onMigrate: (a, b) => steps2.push([a, b]) });
  assert.deepEqual(steps2, []); v3b.close();
  assert.equal(listBackups(backupDir, 'pre-migrate-v1-v2').length, 1); assert.equal(listBackups(backupDir, 'pre-migrate-v2-v3').length, 1);
  // the build before this one (reads up to 3, writes 2) opens the v3 file untouched: the world, no guest statements, and
  // its user insert still works (the column takes NULL)
  const prior = await openDb(file, { maxVersion: 2, backupDir });
  assert.ok(prior.world, 'the world statements'); assert.equal(prior.guests, null, 'no guest statements below v3');
  const u2 = makeUser(prior);
  assert.equal(prior.sessionUser(auth.tokenHash(u2.token), Date.now()).guest_expires_at, null);
  assert.throws(() => prior.createUser({ name: mintName(), nameKey: 'x', passHash: 'none', tokenHash: auth.tokenHash(auth.newToken()), oldTokenHash: null, now: 1, expiresAt: 2, guestExpiresAt: 3 }), /schema 3/, 'a guest needs the column');
  prior.close();
  assert.deepEqual(versions(file), [1, 2, 3], 'untouched');
  // the I2a server (reads up to 2, writes 1) opens it too
  const older = await openDb(file, { maxVersion: 1, backupDir });
  assert.equal(older.world, null); assert.equal(older.getSave(u.id).updated_at, 1); older.close();
  // a file from a server one push ahead of this one is refused: MAX_READABLE is 3 here
  const raw4 = new DatabaseSync(file); raw4.exec('INSERT INTO schema_version (version) VALUES (4)'); raw4.close();
  await assert.rejects(openDb(file, { backupDir }), (e) => e instanceof SchemaTooNewError && /schema_version 4/.test(e.message));
  rmDir(dir);
});

test('T-migrate v3: a v2 file (the build before this one) migrates to v3 in one step after a copy, gains the column and its index, keeps its rows, and a guest can then be written, read on her session and found by the sweep\'s pick; a v3 file opens with no step', async () => {
  const dir = tmpDir('lw-migrate-v3'); const file = path.join(dir, 'lw.sqlite'); const backupDir = path.join(dir, 'backups');
  // the v2 file as the build before this one wrote it: the world tables, no guests column
  const v2 = await openDb(file, { maxVersion: 2, backupDir });
  const u = makeUser(v2);
  v2.world.nonceInsert(1, 'pabcdefghij', '00000000-0000-0000-0000-000000000000', 7, 1);
  v2.close();
  assert.deepEqual(versions(file), [1, 2]); assert.ok(!columns(file, 'users').includes('guest_expires_at'));
  assert.ok(!fs.existsSync(backupDir), 'nothing was migrated yet');
  const steps = [];
  const db = await openDb(file, { backupDir, exclusive: false, onMigrate: (a, b) => steps.push([a, b]) }); // the file is read beside it below
  assert.deepEqual(steps, [[2, 3]], 'one step');
  assert.deepEqual(versions(file), [1, 2, 3]);
  assert.ok(columns(file, 'users').includes('guest_expires_at')); assert.deepEqual(indexes(file, 'users'), ['users_guest_expiry']);
  assert.equal(listBackups(backupDir, 'pre-migrate-v2-v3').length, 1, 'the copy before the step'); assert.equal(listBackups(backupDir, 'pre-migrate-v1-v2').length, 0);
  assert.equal(db.world.nonceSeq(1, 'pabcdefghij', '00000000-0000-0000-0000-000000000000'), 7, 'the receipts survived');
  assert.ok(db.userByKey(u.name.toLowerCase()), 'the users survived');
  assert.equal(db.sessionUser(auth.tokenHash(u.token), Date.now()).guest_expires_at, null, 'kept');
  // a guest: her date on the row and on her session; the sweep's pick lists her once the date has passed, and never a
  // kept account or a tombstone (no session, no member row)
  const now = Date.now(); const token = auth.newToken(); const name = mintName('G');
  const g = db.createUser({ name, nameKey: name.toLowerCase(), passHash: 'none', tokenHash: auth.tokenHash(token), oldTokenHash: null, now, expiresAt: now + auth.SESSION_MS, guestExpiresAt: now + 1000 });
  assert.ok(g, 'written');
  assert.equal(db.sessionUser(auth.tokenHash(token), now).guest_expires_at, now + 1000);
  assert.deepEqual(db.guests.expired(now), [], 'not yet');
  assert.deepEqual(db.guests.expired(now + 1000), [g.id], 'past her date, with a session');
  assert.equal(db.guests.slide(g.id, now + 5000), 1); assert.deepEqual(db.guests.expired(now + 1000), [], 'slid on');
  assert.equal(db.guests.slide(u.id, now + 5000), 0, 'a kept account never slides');
  assert.equal(db.guests.deleteSessionsOf(g.id), 1);
  assert.deepEqual(db.guests.expired(now + 9000), [], 'a tombstone: no session, no member row');
  assert.ok(db.nameTaken(name.toLowerCase()), 'her name stays taken');
  // the keep: once; a second is refused as kept; another row's name is refused as taken, and nothing is written
  const t2 = auth.newToken(); const n2 = mintName('G');
  const g2 = db.createUser({ name: n2, nameKey: n2.toLowerCase(), passHash: 'none', tokenHash: auth.tokenHash(t2), oldTokenHash: null, now, expiresAt: now + auth.SESSION_MS, guestExpiresAt: now + 1000 });
  assert.equal(db.guests.keep({ userId: g2.id, name: u.name, nameKey: u.name.toLowerCase(), passHash: 'scrypt$x' }), 'taken');
  assert.equal(db.sessionUser(auth.tokenHash(t2), now).name, n2, 'nothing written');
  const kept = mintName('K');
  assert.equal(db.guests.keep({ userId: g2.id, name: kept, nameKey: kept.toLowerCase(), passHash: 'scrypt$x' }), null);
  const row = db.sessionUser(auth.tokenHash(t2), now);
  assert.equal(row.name, kept); assert.equal(row.guest_expires_at, null); assert.equal(db.userByKey(kept.toLowerCase()).pass_hash, 'scrypt$x');
  assert.equal(db.guests.keep({ userId: g2.id, name: kept, nameKey: kept.toLowerCase(), passHash: 'scrypt$y' }), 'kept');
  assert.equal(db.userByKey(kept.toLowerCase()).pass_hash, 'scrypt$x', 'a kept account is not written again');
  db.close();
  // a second open is a no-op; the v3 DDL is the column and the index and nothing else
  const steps2 = [];
  const again = await openDb(file, { backupDir, onMigrate: (a, b) => steps2.push([a, b]) });
  assert.deepEqual(steps2, []); assert.equal(again.world.nonceCount(1), 1); again.close();
  assert.equal(listBackups(backupDir, 'pre-migrate-v2-v3').length, 1, 'no new copy');
  assert.match(MIGRATIONS[3], /ALTER TABLE users ADD COLUMN guest_expires_at INTEGER;/);
  assert.match(MIGRATIONS[3], /CREATE INDEX users_guest_expiry ON users\(guest_expires_at\);/);
  assert.ok(!/DROP|CREATE TABLE|UPDATE|DELETE/.test(MIGRATIONS[3]), 'additive: a column and an index');
  rmDir(dir);
});

test('T-migrate: a v2 file written before world_nonces existed (a dev file of 389fc31\'s DDL) opens, gains the table and its index, and keeps its rows; a second open is a no-op', async () => {
  const dir = tmpDir('lw-migrate-nonces'); const file = path.join(dir, 'lw.sqlite'); const backupDir = path.join(dir, 'backups');
  const v2 = await openDb(file, { maxVersion: 2, backupDir });
  const u = makeUser(v2);
  v2.close();
  // the file as the arena's first build wrote it: schema 2, no world_nonces (and neither its index)
  const raw = new DatabaseSync(file);
  raw.exec('DROP INDEX IF EXISTS world_nonces_by_at; DROP TABLE IF EXISTS world_nonces;');
  raw.close();
  assert.ok(!tables(file).includes('world_nonces')); assert.deepEqual(versions(file), [1, 2]);
  const steps = [];
  const db = await openDb(file, { backupDir, onMigrate: (a, b) => steps.push([a, b]) });
  assert.deepEqual(steps, [[2, 3]], 'the guests step only: the table is not a migration');
  assert.ok(db.raw.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'world_nonces'").get(), 'the table is there');
  const idx = db.raw.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'world_nonces' AND name NOT LIKE 'sqlite_%'").all().map((r) => r.name);
  assert.deepEqual(idx, ['world_nonces_by_at', 'world_nonces_by_account']);
  assert.equal(db.world.nonceSeq(1, 'pabcdefghij', '00000000-0000-0000-0000-000000000000'), null);
  db.world.nonceInsert(1, 'pabcdefghij', '00000000-0000-0000-0000-000000000000', 7, 1);
  assert.equal(db.world.nonceSeq(1, 'pabcdefghij', '00000000-0000-0000-0000-000000000000'), 7);
  assert.equal(db.getSave(u.id), null); assert.ok(db.userByKey(u.name.toLowerCase()), 'the users survived');
  db.close();
  assert.deepEqual(versions(file), [1, 2, 3]);
  const again = await openDb(file, { backupDir });
  assert.equal(again.world.nonceCount(1), 1, 'a second open keeps the rows'); again.close();
  assert.equal(listBackups(backupDir, 'pre-migrate-v2-v3').length, 1, 'the one copy is the guests step\'s');
  rmDir(dir);
});

test('T-migrate: the v2 DDL is STRICT and additive, and :memory: migrates without a backup directory', async () => {
  assert.ok(/CREATE TABLE IF NOT EXISTS worlds[\s\S]*\) STRICT;/.test(MIGRATIONS[2]));
  assert.ok(/CREATE TABLE IF NOT EXISTS world_actions[\s\S]*PRIMARY KEY \(world_id, seq\)\n\) STRICT, WITHOUT ROWID;/.test(MIGRATIONS[2]));
  assert.ok(/CREATE TABLE IF NOT EXISTS world_members[\s\S]*account_id\s+TEXT\s+NOT NULL UNIQUE/.test(MIGRATIONS[2]));
  assert.ok(/CREATE TABLE IF NOT EXISTS world_nonces[\s\S]*PRIMARY KEY \(world_id, account, nonce\)\n\) STRICT, WITHOUT ROWID;/.test(MIGRATIONS[2]), 'world_nonces is in the v2 DDL itself');
  assert.ok(!/recent_nonces/.test(MIGRATIONS[2]));
  assert.ok(!/DROP|ALTER/.test(MIGRATIONS[2]));
  const mem = await openDb(':memory:');
  assert.ok(mem.world); assert.ok(mem.guests); assert.equal(mem.backupDir, null); assert.equal(mem.ping(), true); mem.close();
});
