// T-migrate (ARENA-SPEC section 9.3): a v1 file opened by the v2 server gains the three world tables after a backup copy;
// an older server that reads up to v2 still opens the migrated file; a file newer than MAX_READABLE is refused.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { listBackups } from '../backup.mjs';
import { MAX_READABLE, MIGRATIONS, openDb, SCHEMA_VERSION, SchemaTooNewError } from '../db.mjs';
import { makeUser, rmDir, tmpDir } from './helpers.mjs';

const tables = (file) => { const d = new DatabaseSync(file); const t = d.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map((r) => r.name); d.close(); return t; };
const versions = (file) => { const d = new DatabaseSync(file); const v = d.prepare('SELECT version FROM schema_version ORDER BY version').all().map((r) => r.version); d.close(); return v; };

test('T-migrate: a v1 file gains worlds, world_actions and world_members under v2, after a pre-migrate copy that passes integrity_check and still opens', async () => {
  assert.equal(SCHEMA_VERSION, 2); assert.equal(MAX_READABLE, 2); assert.ok(MIGRATIONS[1] && MIGRATIONS[2]);
  const dir = tmpDir('lw-migrate'); const file = path.join(dir, 'lw.sqlite'); const backupDir = path.join(dir, 'backups');
  // a v1 file, made by the v1 DDL alone (the maxVersion seam stops the runner at 1), with one user and her save
  const v1 = await openDb(file, { maxVersion: 1, backupDir });
  assert.equal(v1.world, null, 'no world statements at v1');
  const u = makeUser(v1);
  v1.putSave(u.id, '{"v":"proto-1","at":1,"S":{},"ui":{}}', '{"tier":"common"}', 1);
  v1.close();
  assert.deepEqual(versions(file), [1]);
  assert.deepEqual(tables(file), ['feedback', 'saves', 'schema_version', 'sessions', 'users']);
  assert.ok(!fs.existsSync(backupDir), 'a fresh file took no backup');
  // opened by v2
  const steps = [];
  const v2 = await openDb(file, { backupDir, onMigrate: (a, b) => steps.push([a, b]) });
  assert.deepEqual(steps, [[1, 2]]);
  assert.ok(v2.world, 'the world statements exist');
  assert.equal(v2.getSave(u.id).updated_at, 1, 'the save survived');
  v2.close();
  assert.deepEqual(versions(file), [1, 2]);
  assert.deepEqual(tables(file), ['feedback', 'saves', 'schema_version', 'sessions', 'users', 'world_actions', 'world_members', 'worlds']);
  const copies = listBackups(backupDir, 'pre-migrate-v1-v2');
  assert.equal(copies.length, 1); assert.match(copies[0].name, /^pre-migrate-v1-v2-\d{8}-\d{4}\.sqlite$/);
  const copy = new DatabaseSync(copies[0].path);
  assert.equal(copy.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  assert.deepEqual(copy.prepare('SELECT version FROM schema_version').all().map((r) => r.version), [1], 'the copy is the v1 file');
  copy.close();
  assert.equal((fs.statSync(copies[0].path).mode & 0o777), 0o600);
  // the copy opens under this server (it migrates again, taking its own pre-migrate copy)
  const again = await openDb(copies[0].path, { backupDir: path.join(dir, 'backups2') });
  assert.ok(again.world); again.close();
  // a second open of the migrated file is a no-op
  const steps2 = [];
  const v2b = await openDb(file, { backupDir, onMigrate: (a, b) => steps2.push([a, b]) });
  assert.deepEqual(steps2, []); v2b.close();
  assert.equal(listBackups(backupDir, 'pre-migrate-v1-v2').length, 1);
  // the I2a server (reads up to 2, writes 1) opens the v2 file untouched
  const older = await openDb(file, { maxVersion: 1, backupDir });
  assert.equal(older.world, null); assert.equal(older.getSave(u.id).updated_at, 1); older.close();
  assert.deepEqual(versions(file), [1, 2]);
  // a file from a newer server is refused
  const raw = new DatabaseSync(file); raw.exec('INSERT INTO schema_version (version) VALUES (3)'); raw.close();
  await assert.rejects(openDb(file, { backupDir }), (e) => e instanceof SchemaTooNewError && /schema_version 3/.test(e.message));
  rmDir(dir);
});

test('T-migrate: the v2 DDL is STRICT and additive, and :memory: migrates without a backup directory', async () => {
  assert.ok(/CREATE TABLE IF NOT EXISTS worlds[\s\S]*\) STRICT;/.test(MIGRATIONS[2]));
  assert.ok(/CREATE TABLE IF NOT EXISTS world_actions[\s\S]*PRIMARY KEY \(world_id, seq\)\n\) STRICT, WITHOUT ROWID;/.test(MIGRATIONS[2]));
  assert.ok(/CREATE TABLE IF NOT EXISTS world_members[\s\S]*account_id\s+TEXT\s+NOT NULL UNIQUE/.test(MIGRATIONS[2]));
  assert.ok(!/DROP|ALTER/.test(MIGRATIONS[2]));
  const mem = await openDb(':memory:');
  assert.ok(mem.world); assert.equal(mem.backupDir, null); assert.equal(mem.ping(), true); mem.close();
});
