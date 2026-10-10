#!/usr/bin/env node
// Backups (docs/server-api.md section 12.9): node:sqlite's backup() of the live connection into `<dir>`, checked with
// integrity_check before it takes its final name. In-process the server runs one every 15 minutes (after a snapshot, so
// the copy carries a fresh state and a short journal) and prunes to the newest 96 quarter-hourly files plus the first
// file of each of the 14 most recent calendar days. As a script (`node server/backup.mjs <db> <dir> [label]`) it takes the
// world lock first and refuses with one line while the server holds it.
//
// Restore: stop the unit, copy the chosen file over the live file (remove its -wal and -shm files), start; the server
// replays the journal tail inside the copy.

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync, backup } from 'node:sqlite';

// ---- the lock file (section 12.10): <dir>/world.lock holds the live pid and the boot it was taken in; stale when that pid
// is dead, when the machine has rebooted since (the pid may now be somebody else's), when the pid belongs to a process that
// is not one of ours (a Linux /proc/<pid>/cmdline that names none of the server scripts), or when the pid is not ours to
// signal (EPERM: another user's process, so never the world server, which runs as the same user as its operator commands).
// The server takes it at open; every operator command and this file's script form take it first and refuse while it is
// held. The EXCLUSIVE SQLite connection and the seq compare-and-set stay the guards against two live writers. ----
export class LockHeld extends Error { constructor(message) { super(message); this.name = 'LockHeld'; this.exitCode = 3; } }
// the server, an operator command, or a server test holding a world in-process
const OURS_RE = /server\/(server|world|backup|test\/[a-z-]+\.test)\.mjs/;
// One token for this boot: Linux's boot_id when readable; elsewhere the boot time in whole seconds ('t:<epoch s>').
// Two stamps of the 't:' kind agree within a few seconds of rounding; a reboot is never that quick.
export function bootStamp() {
  try { const id = fs.readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim(); if (/^[0-9a-f-]{36}$/.test(id)) return id; } catch { /* not Linux */ }
  return `t:${Math.round(Date.now() / 1000 - os.uptime())}`;
}
export function sameBoot(a, b) {
  if (!a || !b) return true; // a lock from a build that wrote only the pid: judged by the pid alone
  if (a.startsWith('t:') && b.startsWith('t:')) return Math.abs(Number(a.slice(2)) - Number(b.slice(2))) <= 10;
  return a === b;
}
// 'alive' (ours, or cannot tell), 'dead' (ESRCH), 'foreign' (EPERM, or a readable cmdline naming none of our scripts)
export function pidState(pid) {
  try { process.kill(pid, 0); } catch (err) { return err.code === 'ESRCH' ? 'dead' : 'foreign'; }
  try {
    const cmd = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0').join(' ');
    if (cmd && !OURS_RE.test(cmd)) return 'foreign';
  } catch { /* no /proc, or not readable: the signal check stands */ }
  return 'alive';
}
export function parseLock(text) {
  const [pidLine, boot] = String(text).split('\n').map((x) => x.trim());
  const pid = /^[0-9]{1,10}$/.test(pidLine || '') ? Number(pidLine) : NaN;
  return { pid, boot: boot || null };
}
export function takeLock(dir, { takeover = false } = {}) {
  const file = path.join(dir, 'world.lock');
  const mine = `${process.pid}\n${bootStamp()}\n`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = fs.openSync(file, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL, 0o600);
      fs.writeSync(fd, mine);
      fs.closeSync(fd);
      let released = false;
      return { path: file, release() { if (released) return; released = true; try { if (parseLock(fs.readFileSync(file, 'utf8')).pid === process.pid) fs.rmSync(file, { force: true }); } catch { /* gone already */ } } };
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      let held = { pid: NaN, boot: null };
      try { held = parseLock(fs.readFileSync(file, 'utf8')); } catch { /* unreadable: treat as stale */ }
      const stale = !Number.isInteger(held.pid) || held.pid <= 0 || !sameBoot(held.boot, bootStamp()) || pidState(held.pid) !== 'alive';
      if (!stale && !takeover) throw new LockHeld(`world.lock is held by pid ${held.pid} (${file}); stop it first`);
      fs.rmSync(file, { force: true });
    }
  }
  throw new LockHeld(`cannot take ${file}`);
}

export const BACKUP_EVERY_MS = 15 * 60_000;
export const DEFAULT_KEEP = { recent: 96, daily: 14 };
const STAMP_RE = /-(\d{8})-(\d{4})\.sqlite$/;
// A copy is written to a dot-file first: `<prefix><label>-YYYYMMDD-HHMM[-n].sqlite.tmp`, where the prefix names the
// database it copies (`.lwtmp-` and 12 hex of a hash of its full path), so two databases that share one backup folder
// never take each other's temp files for their own.
export const TEMP_MAX_AGE_MS = 10 * 60_000;
const TMP_SUFFIX = '.sqlite.tmp';
// the database file behind a db.mjs handle ({ file }) or { raw, file }; null for :memory: or a bare connection
const fileOf = (db) => (db && typeof db.file === 'string' && db.file !== ':memory:' ? path.resolve(db.file) : null);
export function tempPrefix(file) {
  const tag = file ? crypto.createHash('sha256').update(path.resolve(file)).digest('hex').slice(0, 12) : 'anon00000000';
  return `.lwtmp-${tag}-`;
}
// true when <dir of file>/world.lock names this process: the lock the server takes at open and every script form first
export function holdsLock(file) {
  if (!file) return false;
  try { return parseLock(fs.readFileSync(path.join(path.dirname(path.resolve(file)), 'world.lock'), 'utf8')).pid === process.pid; } catch { return false; }
}

// Temp copies left by a copy that was interrupted (a crash or a kill between backup() and the rename). Pruning keeps its
// hands off dot-files, so they would stay for ever. Swept only by the process that holds the world lock for `file`, and
// only files with this database's own prefix and the .sqlite.tmp suffix that have not been touched for TEMP_MAX_AGE_MS
// (a copy takes seconds, so a younger one may still be in flight). Returns the number removed.
export function sweepTemp(dir, file, nowMs = Date.now()) {
  if (!holdsLock(file)) return 0;
  const prefix = tempPrefix(file);
  let names;
  try { names = fs.readdirSync(dir); } catch { return 0; }
  let n = 0;
  for (const name of names) {
    if (!name.startsWith(prefix) || !name.endsWith(TMP_SUFFIX)) continue;
    const p = path.join(dir, name);
    try {
      const st = fs.lstatSync(p);
      if (!st.isFile() || st.mtimeMs > nowMs - TEMP_MAX_AGE_MS) continue;
      fs.rmSync(p, { force: true }); n++;
    } catch { /* gone already: the next sweep looks again */ }
  }
  return n;
}

function stamp(d) {
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

// One copy of `db` (a db.mjs handle, or { raw, file } with the connection and its file; a bare DatabaseSync works too, with
// no sweep) into `dir`, named `<label>-YYYYMMDD-HHMM.sqlite` (label `lw` for the routine copy). Written to a dot-file
// first, checked, then renamed, so a half-written copy never carries a backup's name. Returns the final path. Throws on a
// failed copy or a failed integrity_check (the dot-file is removed). When a file of that name exists already (two copies
// in one minute) a counter is added. First, when this process holds the world lock, the stale temp copies of this
// database are swept (sweepTemp); the pre-migration copy runs before the lock is taken and sweeps nothing.
export async function backupOnce(db, dir, label = 'lw', now = new Date()) {
  const conn = db && db.raw ? db.raw : db;
  const file = fileOf(db);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  sweepTemp(dir, file);
  let name = `${label}-${stamp(now)}.sqlite`;
  for (let i = 2; fs.existsSync(path.join(dir, name)); i++) name = `${label}-${stamp(now)}-${i}.sqlite`;
  const tmp = path.join(dir, `${tempPrefix(file)}${name.slice(0, -'.sqlite'.length)}${TMP_SUFFIX}`);
  fs.rmSync(tmp, { force: true });
  try {
    await backup(conn, tmp);
    const copy = new DatabaseSync(tmp);
    let check;
    try { check = copy.prepare('PRAGMA integrity_check').get(); } finally { copy.close(); }
    if (!check || check.integrity_check !== 'ok') throw new Error(`integrity_check: ${check ? check.integrity_check : 'no answer'}`);
    const final = path.join(dir, name);
    fs.renameSync(tmp, final);
    try { fs.chmodSync(final, 0o600); } catch { /* the unit's UMask covers it */ }
    return final;
  } catch (err) {
    fs.rmSync(tmp, { force: true });
    throw err;
  }
}

// The backup files in `dir` whose name carries a stamp, newest first: [{ name, path, at }]; label null lists every label.
// Dot-files are not backups.
export function listBackups(dir, label = 'lw') {
  let names;
  try { names = fs.readdirSync(dir); } catch { return []; }
  const out = [];
  for (const name of names) {
    if (name.startsWith('.') || (label && !name.startsWith(`${label}-`))) continue;
    const m = STAMP_RE.exec(name) || /-(\d{8})-(\d{4})-\d+\.sqlite$/.exec(name);
    if (!m) continue;
    const at = new Date(Number(m[1].slice(0, 4)), Number(m[1].slice(4, 6)) - 1, Number(m[1].slice(6, 8)), Number(m[2].slice(0, 2)), Number(m[2].slice(2, 4))).getTime();
    out.push({ name, path: path.join(dir, name), at, day: m[1] });
  }
  return out.sort((a, b) => b.at - a.at || (a.name < b.name ? 1 : -1));
}

// Which routine copies to keep, by name: the newest `keep.recent`, and of the files older than 24 h from `now`, the first
// of each calendar day for the `keep.daily` most recent such days. Returns { keep: [...], drop: [...] } (paths).
export function planPrune(files, keep = DEFAULT_KEEP, now = Date.now()) {
  const kept = new Set(files.slice(0, keep.recent).map((f) => f.path));
  const old = files.filter((f) => f.at < now - 86_400_000);
  const byDay = new Map();
  for (const f of old) { const cur = byDay.get(f.day); if (!cur || f.at < cur.at) byDay.set(f.day, f); } // the first of the day
  const days = [...byDay.keys()].sort().reverse().slice(0, keep.daily);
  for (const d of days) kept.add(byDay.get(d).path);
  return { keep: files.filter((f) => kept.has(f.path)).map((f) => f.path), drop: files.filter((f) => !kept.has(f.path)).map((f) => f.path) };
}

export function prune(dir, keep = DEFAULT_KEEP, now = Date.now(), label = 'lw') {
  const { drop } = planPrune(listBackups(dir, label), keep, now);
  for (const p of drop) fs.rmSync(p, { force: true });
  return drop.length;
}

// LW_BACKUP_KEEP=96,14 -> { recent: 96, daily: 14 }; null for a bad value
export function parseKeep(text) {
  if (text === undefined) return { ...DEFAULT_KEEP };
  const m = /^([0-9]{1,4}),([0-9]{1,4})$/.exec(text);
  return m ? { recent: Number(m[1]), daily: Number(m[2]) } : null;
}

// Every 15 minutes: a snapshot (so the copy carries a fresh state), one copy, then prune. A failure logs one line and
// never stops the server. Returns the timer (unref'd) so stop() can clear it; `run()` is exposed for tests.
export function scheduleBackups(db, dir, world, { keep = DEFAULT_KEEP, everyMs = BACKUP_EVERY_MS, log = console.error } = {}) {
  let running = false;
  async function run() {
    if (running) return null;
    running = true;
    try {
      if (world) world.snapshot('backup');
      const file = await backupOnce(db, dir, 'lw');
      prune(dir, keep);
      return file;
    } catch (err) {
      log(`lw-server: backup failed (${err?.code ?? err?.name ?? 'error'})`);
      return null;
    } finally {
      running = false;
    }
  }
  const timer = setInterval(run, everyMs);
  timer.unref();
  return { timer, run };
}

// ---- the script form ----
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [file, dir, label] = process.argv.slice(2);
  if (!file || !dir) { console.error('usage: node server/backup.mjs <db> <dir> [label]'); process.exit(2); }
  let lock;
  try { lock = takeLock(path.dirname(path.resolve(file))); } catch (err) { console.error(`lw-backup: ${err.message}`); process.exit(3); }
  try {
    const conn = new DatabaseSync(file);
    try {
      const out = await backupOnce({ raw: conn, file }, dir, label || 'lw');
      console.log(`lw-backup: wrote ${out}`);
    } finally { conn.close(); }
  } catch (err) {
    console.error(`lw-backup: failed (${err?.code ?? err?.message ?? 'error'})`);
    lock.release();
    process.exit(1);
  }
  lock.release();
}
