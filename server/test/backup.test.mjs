// T-backup (ARENA-SPEC section 9.3): a copy opens, passes integrity_check and replays to the same state; pruning keeps the
// newest 96 and the first of each of 14 older days by name; the script form refuses while the lock is held.
process.env.LW_DEV = '1';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { backupOnce, DEFAULT_KEEP, listBackups, parseKeep, planPrune, prune, scheduleBackups } from '../backup.mjs';
import { openDb } from '../db.mjs';
import { openWorld } from '../world.mjs';
import { BACKUP_SCRIPT, makeUser, nonce, rmDir, runScript, tmpDir } from './helpers.mjs';

const J = JSON.stringify;
const stateSans = (s) => { const { lastEvents, ...rest } = s; return J(rest); };
const RATE1 = { num: 1, den: 1 };

test('T-backup: a copy taken mid-journal opens, passes integrity_check, and replays to the same state as the live world', async () => {
  const dir = tmpDir('lw-backup'); const file = path.join(dir, 'lw.sqlite'); const bdir = path.join(dir, 'backups');
  let t = Date.UTC(2026, 9, 9, 12); const now = () => t;
  const db = await openDb(file);
  const users = [makeUser(db), makeUser(db)];
  const world = await openWorld(db, { rate: RATE1, now, log: () => {}, snapshotSec: 1e9, snapshotActions: 1e9 });
  const a = world.join(users[0], 'dolly'); const aw = world.state.accounts[a.accountId].whores[0];
  world.snapshot('test');
  world.join(users[1], 'jackie');
  for (const g of ['plunkett']) world.apply(a.accountId, 'study', [aw, g], nonce());
  t += 5000; world.tick();
  assert.ok(world.seq > world.snapSeq, 'journal rows after the snapshot');
  const file1 = await backupOnce(db, bdir, 'lw', new Date(t));
  assert.match(path.basename(file1), /^lw-\d{8}-\d{4}\.sqlite$/);
  const file2 = await backupOnce(db, bdir, 'lw', new Date(t));
  assert.notEqual(file1, file2, 'a second copy in the same minute gets a counter');
  assert.ok(!fs.readdirSync(bdir).some((n) => n.startsWith('.')), 'no temp file left');
  const copy = new DatabaseSync(file1);
  assert.equal(copy.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  assert.equal(copy.prepare('SELECT count(*) AS n FROM world_actions').get().n, world.seq - world.snapSeq, 'the journal tail is in the copy');
  copy.close();
  const live = stateSans(world.state); const seq = world.seq;
  world.stop(); db.close();
  // the copy, opened as a world (its own folder, so its own lock), replays to the live bytes
  const copyDir = path.join(dir, 'restored'); fs.mkdirSync(copyDir); const restored = path.join(copyDir, 'lw.sqlite'); fs.copyFileSync(file1, restored);
  const db2 = await openDb(restored);
  const w2 = await openWorld(db2, { rate: RATE1, now, log: () => {} });
  assert.equal(w2.seq, seq); assert.equal(stateSans(w2.state), live);
  w2.stop(); db2.close();
  // the in-process schedule: one run takes a snapshot first, then a copy, then prunes
  const db3 = await openDb(file);
  const w3 = await openWorld(db3, { rate: RATE1, now, log: () => {}, snapshotSec: 1e9, snapshotActions: 1e9 });
  t += 2000; w3.tick();
  // (the two copies above carry the fake clock's stamp, which is later than the real one the schedule stamps with, so a
  // keep of 3 proves the run without pruning its own file; planPrune is proven below)
  const sched = scheduleBackups(db3, bdir, w3, { keep: { recent: 3, daily: 14 }, everyMs: 1e9, log: () => {} });
  clearInterval(sched.timer);
  const out = await sched.run();
  assert.ok(out && fs.existsSync(out)); assert.equal(w3.snapSeq, w3.seq, 'snapshotted before the copy');
  assert.equal(listBackups(bdir).length, 3);
  const extra = await backupOnce(db3, bdir, 'lw', new Date(t)); assert.ok(fs.existsSync(extra));
  prune(bdir, { recent: 3, daily: 14 }); assert.equal(listBackups(bdir).length, 3, 'pruned to the newest 3');
  w3.stop(); db3.close();
  rmDir(dir);
});

test('T-backup: pruning keeps the newest 96 quarter-hourly files and the first of each of the 14 most recent older days', () => {
  const now = Date.UTC(2026, 9, 9, 12);
  const files = [];
  const mk = (ms) => { const d = new Date(ms); const p = (n) => String(n).padStart(2, '0'); const day = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`; return { name: `lw-${day}-${p(d.getHours())}${p(d.getMinutes())}.sqlite`, path: `/x/lw-${day}-${p(d.getHours())}${p(d.getMinutes())}.sqlite`, at: ms, day }; };
  for (let i = 0; i < 30 * 96; i++) files.push(mk(now - i * 15 * 60_000)); // 30 days of quarter-hourly copies, newest first
  const plan = planPrune(files, DEFAULT_KEEP, now);
  assert.equal(plan.keep.length, 96 + 14);
  const recent = new Set(files.slice(0, 96).map((f) => f.path));
  for (const p of files.slice(0, 96).map((f) => f.path)) assert.ok(plan.keep.includes(p));
  const dailies = plan.keep.filter((p) => !recent.has(p));
  assert.equal(dailies.length, 14);
  for (const p of dailies) { const f = files.find((x) => x.path === p); assert.ok(f.at < now - 86_400_000, 'older than 24 h'); assert.ok(files.filter((x) => x.day === f.day).every((x) => x.at >= f.at), 'the first of its day'); }
  const days = dailies.map((p) => files.find((x) => x.path === p).day).sort();
  assert.equal(new Set(days).size, 14, 'fourteen distinct days');
  assert.equal(plan.drop.length, files.length - 110);
  // on disk, by name
  const dir = tmpDir('lw-prune');
  for (const f of files.slice(0, 200)) fs.writeFileSync(path.join(dir, f.name), '');
  fs.writeFileSync(path.join(dir, 'pre-migrate-v1-v2-20260101-0000.sqlite'), ''); fs.writeFileSync(path.join(dir, '.lw-20260101-0000.sqlite.tmp'), '');
  const dropped = prune(dir, DEFAULT_KEEP, now);
  const left = fs.readdirSync(dir);
  assert.equal(dropped, 200 - planPrune(files.slice(0, 200), DEFAULT_KEEP, now).keep.length);
  assert.ok(left.includes('pre-migrate-v1-v2-20260101-0000.sqlite'), 'other labels are never pruned');
  assert.ok(left.includes('.lw-20260101-0000.sqlite.tmp'), 'dot-files are not backups');
  rmDir(dir);
  assert.deepEqual(parseKeep(undefined), DEFAULT_KEEP); assert.deepEqual(parseKeep('10,3'), { recent: 10, daily: 3 }); assert.equal(parseKeep('x'), null);
});

test('T-backup: the script form writes a copy when nothing holds the lock, and refuses naming the pid when the server does', async () => {
  const dir = tmpDir('lw-bscript'); const file = path.join(dir, 'lw.sqlite'); const bdir = path.join(dir, 'out');
  const db = await openDb(file); makeUser(db); db.close();
  const ok = await runScript(BACKUP_SCRIPT, [file, bdir, 'hand']);
  assert.equal(ok.code, 0, ok.err); assert.match(ok.out, /wrote .*hand-\d{8}-\d{4}\.sqlite/);
  assert.equal(listBackups(bdir, 'hand').length, 1);
  assert.ok(!fs.existsSync(path.join(dir, 'world.lock')), 'the script released the lock');
  fs.writeFileSync(path.join(dir, 'world.lock'), `${process.pid}\n`);
  const held = await runScript(BACKUP_SCRIPT, [file, bdir]);
  assert.equal(held.code, 3); assert.match(held.err, new RegExp(`held by pid ${process.pid}`));
  assert.equal(listBackups(bdir, 'lw').length, 0);
  rmDir(dir);
});
