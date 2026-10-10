#!/usr/bin/env node
// The world (docs/server-api.md section 12): one engine state per server, held in memory, every accepted action journaled
// in the same transaction that moves the world row's seq, a snapshot of the state every 60 s or 50 actions and on every
// Curtain and on SIGTERM, the journal after the snapshot replayed at start. Importable without side effects: nothing
// listens, no timer runs and no file is touched until openWorld() is called; start() runs the timers.
//
// As a script: node server/world.mjs --reset [--from-snapshot] | --standin-seal <min>,<max>|off | --backup [label] | --evict <name>  [db]
// Each takes the world lock first and refuses with one line while the server holds it.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as L from '../engine/rules.js';
import { backupOnce, listBackups, parseKeep, scheduleBackups, takeLock } from './backup.mjs';
import { openDb } from './db.mjs';

const C = L.CONTENT;
const R = L.RULES;

export const STATE_V = 1; // bumped only by a change that breaks the state shape; a mismatch refuses to start (section 12.8)
export const WORLD_ID = 1;
export const TICK_MS = 1000;
export const HEALTH_TICK_MS = 10_000;
export const CATCHUP_CAP_MIN = 1440;
// How long an accepted action's (account, nonce) receipt is kept in world_nonces (section 12.4): a re-post of it within
// this is answered replayed however many actions came after. The client gives up on an unsettled act after 24 hours,
// inside it. And how many an account keeps at most, its newest: far above any player's pace (one move every 17 s for
// the whole of those 24 hours), so the table stays small however fast a hostile client posts (the act limit lets one
// account land 300 a minute). Both are pruned at snapshot time only.
export const NONCE_KEEP_MS = 48 * 3_600_000;
export const NONCE_KEEP_PER_ACCOUNT = 5000;

// ---- account ids: minted here, never by a client; 50 bits, lowercase, never a ':' ----
const B32 = 'abcdefghijklmnopqrstuvwxyz234567';
export function mintAccountId() { const b = crypto.randomBytes(10); let s = 'p'; for (let i = 0; i < 10; i++) s += B32[b[i] & 31]; return s; }
export const ACCOUNT_RE = /^p[a-z2-7]{10}$/;

// ---- errors ----
// A refusal to start (exit 2, one line): the server prints it and stops; a test catches it.
export class WorldRefusal extends Error { constructor(message, exitCode = 2) { super(message); this.name = 'WorldRefusal'; this.exitCode = exitCode; } }
export { LockHeld } from './backup.mjs';
// The engine refused a player's move (400 illegal-move; message is the engine's line, reason its code).
export class IllegalMove extends Error { constructor(reason, message) { super(message); this.name = 'IllegalMove'; this.reason = reason; } }

// ---- the rate and the clock (section 12.6) ----
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
// 'a/b' with integers, or a decimal with at most 6 places, as a rational in lowest terms; null when refused
export function parseRate(text = '1/60') {
  let num; let den;
  let m = /^([0-9]{1,6})\/([0-9]{1,6})$/.exec(text);
  if (m) { num = Number(m[1]); den = Number(m[2]); } else if ((m = /^([0-9]{1,3})(?:\.([0-9]{1,6}))?$/.exec(text))) { const frac = m[2] || ''; den = 10 ** frac.length; num = Number(m[1]) * den + Number(frac || 0); } else return null;
  if (!num || !den) return null;
  const g = gcd(num, den); num /= g; den /= g;
  if (num / den > 60) return null;
  if ((1440000 * den) % num !== 0) return null; // a District day must be a whole number of milliseconds
  return { num, den };
}
export const isDefaultRate = (rate) => rate.num === 1 && rate.den === 60;
export const dayMsOf = (rate) => (1440 * 1000 * rate.den) / rate.num;
export const minPerSecText = (rate) => (rate.num / rate.den).toFixed(9);
export const clockAtFor = (epochMs, rate, t) => Math.floor(((t - epochMs) * rate.num) / (1000 * rate.den));
// 'HH:MM' local -> minutes after local midnight; null when refused
export function parseDayStart(text = '06:00') {
  const m = /^([01][0-9]|2[0-3]):([0-5][0-9])$/.exec(text);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
// The real time of District clock 0 for a world created at `nowMs`: at the default rate, LW_DAY_START local today, one
// day earlier when that instant is still ahead (so the clock is never negative); at any other rate, now.
export function epochFor(nowMs, rate, dayStartMin) {
  if (!isDefaultRate(rate)) return nowMs;
  const d = new Date(nowMs);
  d.setHours(Math.floor(dayStartMin / 60), dayStartMin % 60, 0, 0);
  let epoch = d.getTime();
  if (epoch > nowMs) epoch -= dayMsOf(rate);
  return epoch;
}
// LW_STANDIN_SEAL: '45,90' -> { min, max }; 'off' or unset -> null; undefined when refused
export function parseStandinSeal(text) {
  if (text === undefined || text === 'off') return null;
  const m = /^([0-9]{1,4}),([0-9]{1,4})$/.exec(text);
  if (!m) return undefined;
  const min = Number(m[1]); const max = Number(m[2]);
  return max >= min && min >= 1 ? { min, max, from: 0 } : undefined;
}

// Settings from the environment, with each refusal as one line (the server dies with it, exit 2).
export function envOpts(env = process.env) {
  const v = (name) => (env[name] === '' ? undefined : env[name]);
  const int = (name, dflt, lo, hi) => {
    const t = v(name); if (t === undefined) return dflt;
    const n = /^[0-9]{1,9}$/.test(t) ? Number(t) : NaN;
    if (!(n >= lo && n <= hi)) throw new WorldRefusal(`${name} must be an integer from ${lo} to ${hi}`);
    return n;
  };
  const rate = parseRate(v('LW_MIN_PER_SEC') ?? '1/60');
  if (!rate) throw new WorldRefusal('LW_MIN_PER_SEC must be a/b or a decimal (6 places at most), between 0 and 60, with a District day a whole number of milliseconds');
  const dayStart = parseDayStart(v('LW_DAY_START') ?? '06:00');
  if (dayStart === null) throw new WorldRefusal('LW_DAY_START must be HH:MM (local time)');
  const standinSeal = parseStandinSeal(v('LW_STANDIN_SEAL'));
  if (standinSeal === undefined) throw new WorldRefusal('LW_STANDIN_SEAL must be min,max (whole minutes, max >= min >= 1) or off');
  const keep = parseKeep(v('LW_BACKUP_KEEP'));
  if (!keep) throw new WorldRefusal('LW_BACKUP_KEEP must be recent,daily (two counts)');
  const reset = v('LW_WORLD_RESET');
  if (reset !== undefined && reset !== '1') throw new WorldRefusal('LW_WORLD_RESET must be 1 or unset');
  return {
    rate, dayStart, standinSeal, backupKeep: keep,
    logLimit: int('LW_LOG_LIMIT', 8000, 100, 100000),
    cap: int('LW_WORLD_CAP', 90, 1, 10000),
    tlCap: int('LW_TL_CAP', 10, 1, 10000),
    snapshotSec: int('LW_SNAPSHOT_SEC', 60, 1, 86400),
    snapshotActions: int('LW_SNAPSHOT_ACTIONS', 50, 1, 1000000),
    snapshotMaxLag: int('LW_SNAPSHOT_MAX_LAG', 5000, 1, 10000000),
    resetOnMismatch: reset === '1',
  };
}

// The lock file lives in backup.mjs (the script form of both files takes it); re-exported here for the server and the tests.
export { takeLock };

// ---- the world ----
const SHAPE = (s) => s && typeof s === 'object' && typeof s.seed === 'string' && Array.isArray(s.rng) && s.timelines && typeof s.timelines === 'object'
  && s.accounts && typeof s.accounts === 'object' && s.whores && typeof s.whores === 'object' && Number.isInteger(s.tick) && Number.isInteger(s.clock);
const stateText = (state) => { const { lastEvents, ...rest } = state; return JSON.stringify(rest); };
const hourFloor = (ms) => Math.floor(ms / 3_600_000) * 3_600_000;
const HUMAN_TIER_SCORE = (w) => R.whorescore[w.tier] || 0;

/**
 * openWorld(db, opts) -> the world (async: a reset takes a backup first).
 * opts: rate { num, den }, dayStart (minutes), logLimit, cap, tlCap, standinSeal, snapshotSec, snapshotActions,
 * snapshotMaxLag, backupKeep, resetOnMismatch, reset (force the reset), fromSnapshot (with a reset: carry the snapshot's
 * scores and drop the journal after it, the operator's --reset --from-snapshot), stateDir (the lock's folder; null = no
 * lock), backupDir (null = no backups), log(line).
 * Test seams, LW_DEV=1 only: now() -> ms, takeoverLock, fatal(code, line) (default: log and process.exit), devHooks
 * { throwNextRequestTick, stallTick }.
 */
export async function openWorld(db, opts = {}) {
  const DEV = process.env.LW_DEV === '1';
  for (const seam of ['now', 'takeoverLock', 'fatal', 'devHooks']) if (opts[seam] !== undefined && !DEV) throw new WorldRefusal(`openWorld: ${seam} is a test seam (LW_DEV=1 only)`);
  const now = opts.now ?? Date.now;
  const log = opts.log ?? ((line) => console.error(line));
  const fatal = opts.fatal ?? ((code, line) => { log(line); process.exit(code); });
  const devHooks = { throwNextRequestTick: false, stallTick: false, ...(opts.devHooks || {}) };
  const rate = opts.rate ?? { num: 1, den: 60 };
  const dayStart = opts.dayStart ?? 360;
  const logLimit = opts.logLimit ?? 8000;
  const cap = opts.cap ?? 90;
  const tlCap = opts.tlCap ?? 10;
  const snapshotSec = opts.snapshotSec ?? 60;
  const snapshotActions = opts.snapshotActions ?? 50;
  const snapshotMaxLag = opts.snapshotMaxLag ?? 5000;
  const memory = db.file === ':memory:';
  const stateDir = opts.stateDir !== undefined ? opts.stateDir : (memory ? null : path.dirname(path.resolve(db.file)));
  const backupDir = opts.backupDir !== undefined ? opts.backupDir : (memory ? null : db.backupDir);
  const dayMs = dayMsOf(rate);
  if (!db.world) throw new WorldRefusal('the database has no world tables (schema v2)');

  let state = null; let seq = 0; let rev = 0; let snapSeq = 0; let clockEpochMs = 0;
  // this process's start, on every payload (section 12.2): a client compares revs only within one boot, so a restart or a
  // restored backup (whose rev may be lower than the one on her screen) is adopted, never taken for a late answer
  const boot = crypto.randomBytes(8).toString('hex');
  const members = new Map(); // users.id -> account id
  const lastNonce = new Map(); // account id -> { nonce, rev } (her newest; the payload's account.lastNonce)
  const lastActive = new Map(); // account id -> real ms of her newest accepted action (join counts)
  const nonceDirty = new Set(); // accounts with a receipt written since the last snapshot: their count is trimmed there
  let applying = false; let dirtyActions = 0; let lastTickAt = 0; let lastSnapshotAt = 0; let dayAtSnapshot = 0; let snapshotFailedAt = null;
  let lock = null; let timers = []; let backups = null; let stopped = false;

  const clockAt = (t) => clockAtFor(clockEpochMs, rate, t);
  // a receipt in world_nonces: the action with this (account, nonce) landed, however many came after it
  const nonceSeen = (accountId, nonce) => typeof accountId === 'string' && typeof nonce === 'string' && db.world.nonceSeq(WORLD_ID, accountId, nonce) !== null;
  const newestBackup = () => { const files = backupDir ? listBackups(backupDir, null) : []; return files.length ? files[0].path : '(no backup yet)'; };
  const restoreLine = () => `restore the newest backup: stop the unit, copy ${newestBackup()} over ${db.file} (remove its -wal and -shm files), start`;

  // ---- the lock, before any write ----
  if (stateDir) { try { lock = takeLock(stateDir, { takeover: !!opts.takeoverLock }); } catch (err) { throw err.name === 'LockHeld' ? new WorldRefusal(err.message, 3) : err; } }

  // ---- journal and row writes, each inside one transaction with the compare-and-set on seq ----
  function cas(expect, next, newRev) {
    const changes = db.world.cas(WORLD_ID, expect, next, newRev);
    if (changes !== 1) { const e = new Error(`world row written by another process at seq ${expect}`); e.cas = true; throw e; }
  }
  function withCas(fn) {
    try { db.tx(fn); } catch (err) {
      if (err.cas) { err.fatalHandled = true; fatal(1, `lw-server: ${err.message}; stopping so the journal is replayed`); throw err; }
      throw err;
    }
  }

  function freshWorld(t) {
    const seed = crypto.randomBytes(16).toString('hex');
    const epoch = epochFor(t, rate, dayStart);
    const startClock = clockAtFor(epoch, rate, t);
    const s = L.newGame(seed, { arena: true, humans: [], startClock, seasonDays: R.seasonDays, logLimit, minGapMin: R.curtain.minGapMin, maxGapMin: R.curtain.maxGapMin,
      scriptRival: false, scriptItch: true, standinSeal: opts.standinSeal ?? null, curtainGrid: true });
    return { s, epoch };
  }

  function create() {
    const t = now();
    const { s, epoch } = freshWorld(t);
    db.tx(() => db.world.insert({ id: WORLD_ID, season: s.season, seq: 0, rev: 0, snap_seq: 0, clock_epoch_ms: epoch, rate_num: rate.num, rate_den: rate.den,
      engine_v: R.version, state_v: STATE_V, created_at: t, saved_at: t, state: stateText(s) }));
    state = s; seq = 0; rev = 0; snapSeq = 0; clockEpochMs = epoch; lastSnapshotAt = t; dayAtSnapshot = s.day;
    log(`lw-server: world created; District clock 0 is ${new Date(epoch).toISOString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone}), rate ${rate.num}/${rate.den}, start clock ${s.clock}`);
  }

  // The reset (section 12.8): a backup, every member's banked score carried into a fresh world, the journal cleared, one
  // joinWorld row per member. Members re-pick a starter. `old` is the state the scores are read from: the snapshot WITH the
  // journal replayed onto it (load does that first, so a Curtain paid after the last snapshot is part of the score
  // carried), or the snapshot alone under --from-snapshot. The receipts in world_nonces stay: a re-post of an action that
  // landed before the reset is still answered replayed, never applied to her new girl.
  async function reset(row, old) {
    if (backupDir) { const f = await backupOnce(db, backupDir, `pre-reset-sv${row.state_v}`); log(`lw-server: world reset: backup ${f}`); } else log('lw-server: world reset (no backup directory)');
    const t = now();
    const carried = db.world.members(WORLD_ID).map((m) => ({ userId: m.user_id, id: m.account_id, name: db.world.memberName(WORLD_ID, m.account_id) ?? m.account_id,
      pastWhorescore: old && old.accounts && old.accounts[m.account_id] ? L.whorescore(old, m.account_id).total : 0 }));
    const { s, epoch } = freshWorld(t);
    const text = stateText(s);
    db.tx(() => {
      db.world.journalClear(WORLD_ID);
      db.world.memberClearNonces(WORLD_ID);
      carried.forEach((m, i) => db.world.journalInsert(WORLD_ID, { seq: i + 1, account: m.id, type: 'joinWorld', args: JSON.stringify([{ id: m.id, name: m.name, pastWhorescore: m.pastWhorescore }]), clock: s.clock, at: t, nonce: null }));
      db.world.reset({ id: WORLD_ID, season: s.season, seq: carried.length, rev: carried.length ? 1 : 0, snap_seq: 0, clock_epoch_ms: epoch, rate_num: rate.num, rate_den: rate.den,
        engine_v: R.version, state_v: STATE_V, created_at: t, saved_at: t, state: text });
    });
    return db.world.get(WORLD_ID);
  }

  // The journal after the snapshot, onto `state`. A refusal carries the seq it failed at and the reason, for the reset's
  // own refusal (load).
  function replay(row) {
    const rows = db.world.journalAfter(WORLD_ID, row.snap_seq);
    const head = rows.length ? rows[rows.length - 1].seq : row.snap_seq;
    const refuse = (at, reason) => Object.assign(new WorldRefusal(`lw-server: ${reason}; ${restoreLine()}`), { seq: at, reason });
    if (head !== row.seq) throw refuse(Math.min(head, row.seq) + 1, `journal head mismatch (worlds.seq ${row.seq}, journal ${head})`);
    for (const r of rows) {
      let reason = null;
      try {
        if (r.clock > state.clock) L.mut.advanceClock(state, r.clock - state.clock);
        const fn = Object.hasOwn(L.mut, r.type) ? L.mut[r.type] : null;
        if (typeof fn !== 'function') throw new Error(`no such action ${r.type}`);
        fn(state, ...JSON.parse(r.args));
      } catch (err) {
        reason = err && err.code ? err.code : err && err.message ? err.message : 'error';
      }
      if (reason !== null) throw refuse(r.seq, `replay failed at seq ${r.seq}: ${reason}`);
    }
    state.lastEvents = [];
  }

  async function load() {
    let row = db.world.get(WORLD_ID);
    if (!row) { create(); return; }
    if (row.rate_num !== rate.num || row.rate_den !== rate.den) {
      throw new WorldRefusal(`lw-server: the world runs at ${row.rate_num}/${row.rate_den} District minutes per second and LW_MIN_PER_SEC asks for ${rate.num}/${rate.den}; changing the rate under a live world moves every Curtain`);
    }
    let old; let didReset = false;
    try { old = JSON.parse(row.state); } catch { old = null; }
    if (!SHAPE(old)) throw new WorldRefusal(`lw-server: world state unreadable (worlds.state does not parse to a world); ${restoreLine()}`);
    if (row.state_v !== STATE_V || opts.reset) {
      if (row.state_v !== STATE_V && !opts.reset && !opts.resetOnMismatch) {
        throw new WorldRefusal(`lw-server: world state_v ${row.state_v} != STATE_V ${STATE_V}; back up and reset with: LW_WORLD_RESET=1 node server/server.mjs (one start) or node server/world.mjs --reset ${db.file}; the last backup is ${newestBackup()}`);
      }
      // The journal first: what was accepted after the last snapshot (a seal paid at a Curtain, a Standing Order) is part
      // of every member's banked score, and the reset clears the journal. Replayed through this build's engine only when
      // the snapshot is of this build's shape (state_v); a journal that does not replay, or one written under another
      // state_v, refuses the reset before any backup or write, naming the seq and both ways on. --from-snapshot is the
      // operator's choice to carry the snapshot's scores and drop the journaled ones, said loudly.
      const since = row.snap_seq + 1;
      const remedy = `start the old build once and stop it with SIGTERM to fold the journal, or run --reset --from-snapshot to carry the snapshot's scores and drop the journaled ones since seq ${since}`;
      const pending = db.world.journalAfter(WORLD_ID, row.snap_seq);
      if (opts.fromSnapshot) {
        const accounts = [...new Set(pending.map((r) => r.account).filter((a) => typeof a === 'string'))].sort();
        log(pending.length
          ? `lw-server: world reset --from-snapshot: the snapshot's scores are carried and the ${pending.length} journaled row(s) since seq ${since} (to seq ${row.seq}) are DROPPED; accounts whose journaled actions are dropped: ${accounts.length ? accounts.join(', ') : 'none (clock ticks only)'}`
          : `lw-server: world reset --from-snapshot: nothing was journaled after the snapshot (seq ${row.snap_seq}); the snapshot's scores are carried`);
        state = old;
      } else {
        if (row.state_v !== STATE_V && (pending.length || row.seq !== row.snap_seq)) {
          throw new WorldRefusal(`lw-server: the reset was refused at seq ${since}: the journal after the snapshot (seq ${since} to ${row.seq}) was written under state_v ${row.state_v} and this build reads state_v ${STATE_V}, so it is not replayed; nothing was changed; ${remedy}`);
        }
        state = old; state.lastEvents = [];
        try { replay(row); } catch (err) {
          if (!(err instanceof WorldRefusal) || err.seq === undefined) throw err;
          throw new WorldRefusal(`lw-server: the reset was refused at seq ${err.seq}: the journal does not replay (${err.reason}); nothing was changed; ${remedy}`, err.exitCode);
        }
      }
      row = await reset(row, state);
      old = JSON.parse(row.state);
      didReset = true;
    }
    if (row.engine_v !== R.version) log(`lw-server: world snapshot written by engine ${row.engine_v}, this one is ${R.version}; reading with defaults`);
    state = old; state.lastEvents = [];
    seq = row.seq; rev = row.rev; snapSeq = row.snap_seq; clockEpochMs = row.clock_epoch_ms; lastSnapshotAt = now(); dayAtSnapshot = state.day;
    for (const m of db.world.members(WORLD_ID)) {
      members.set(m.user_id, m.account_id);
      if (m.last_nonce) lastNonce.set(m.account_id, { nonce: m.last_nonce, rev: m.last_rev });
      lastActive.set(m.account_id, m.last_active_at ?? m.joined_at);
    }
    replay(row);
    if (didReset) snapshot('reset'); // the carried members are in the snapshot; the journal starts empty
  }

  // The tick: fatal on any throw (an engine throw or a journal failure leaves a state no replay reproduces).
  function tickInline(delta, from = 'timer') {
    try {
      if (from === 'request' && devHooks.throwNextRequestTick) { devHooks.throwNextRequestTick = false; throw new Error('dev hook: the tick throws'); }
      const clockBefore = state.clock; const dayBefore = state.day;
      L.mut.advanceClock(state, delta);
      const moved = state.lastEvents.length > 0 || state.day !== dayBefore;
      const nextSeq = seq + 1; const nextRev = moved ? rev + 1 : rev;
      withCas(() => {
        db.world.journalInsert(WORLD_ID, { seq: nextSeq, account: null, type: 'advanceClock', args: JSON.stringify([delta]), clock: clockBefore, at: now(), nonce: null });
        cas(seq, nextSeq, nextRev);
      });
      seq = nextSeq; rev = nextRev;
      if (state.lastEvents.some((e) => e.type === 'curtain')) snapshot('curtain');
    } catch (err) {
      if (!err || !err.fatalHandled) {
        if (err) err.fatalHandled = true;
        try { fatal(1, `lw-server: tick failed (${err && err.code ? err.code : err && err.message ? err.message : 'error'}); stopping so the journal is replayed`); } catch (f) { f.fatalHandled = true; throw f; }
      }
      throw err; // a fatal that returns (a test seam) must not let the caller continue
    }
  }

  function catchUp() {
    let gap = clockAt(now()) - state.clock;
    if (gap > CATCHUP_CAP_MIN) {
      const skipDays = Math.ceil((gap - CATCHUP_CAP_MIN) / 1440);
      clockEpochMs += skipDays * dayMs;
      db.tx(() => db.world.setEpoch(WORLD_ID, clockEpochMs));
      gap -= skipDays * 1440;
      log(`lw-server: catch-up: ${skipDays} whole District day(s) skipped (the clock keeps its phase), advancing ${gap} minute(s)`);
    }
    if (gap > 0) tickInline(gap, 'catchup');
  }

  function snapshot(reason) {
    const t = now();
    let text; let parsed;
    try {
      text = stateText(state);
      parsed = JSON.parse(text);
      if (!(parsed && parsed.tick === state.tick && parsed.clock === state.clock && parsed.seed === state.seed)) throw new Error('parse-back mismatch');
    } catch (err) {
      snapshotFailedAt = t; log(`lw-server: snapshot (${reason}) not written: ${err && err.message ? err.message : 'error'}; the journal is kept`); return false;
    }
    const at = seq;
    try {
      // the journal up to the snapshot goes; a receipt goes only when it is older than NONCE_KEEP_MS, or when its account
      // holds more than NONCE_KEEP_PER_ACCOUNT newer ones (section 12.4; only accounts that acted since the last snapshot
      // are counted, so the work is bounded by the actions in between)
      db.tx(() => {
        db.world.snapshot(WORLD_ID, text, at, state.season, R.version, t); db.world.journalPrune(WORLD_ID, at); db.world.noncePrune(WORLD_ID, t - NONCE_KEEP_MS);
        for (const a of nonceDirty) db.world.nonceTrim(WORLD_ID, a, NONCE_KEEP_PER_ACCOUNT);
      });
    } catch (err) {
      snapshotFailedAt = t; log(`lw-server: snapshot (${reason}) failed (${err && err.code ? err.code : 'error'}); the journal is kept`); return false;
    }
    snapSeq = at; dirtyActions = 0; lastSnapshotAt = t; dayAtSnapshot = state.day; snapshotFailedAt = null; nonceDirty.clear();
    return true;
  }
  function maybeSnapshot() {
    if (dirtyActions >= snapshotActions) return snapshot('actions');
    if (now() - lastSnapshotAt >= snapshotSec * 1000 && (dirtyActions > 0 || state.day !== dayAtSnapshot)) return snapshot('timer');
    return false;
  }

  function guard(fn) {
    if (applying) throw new Error('reentrant apply');
    applying = true;
    try { return fn(); } finally { applying = false; }
  }

  function tick() {
    guard(() => {
      if (devHooks.stallTick) return;
      lastTickAt = now();
      const target = clockAt(lastTickAt);
      if (target > state.clock) tickInline(target - state.clock, 'timer');
      maybeSnapshot();
    });
  }

  function apply(accountId, type, args, nonce) {
    return guard(() => {
      if (nonceSeen(accountId, nonce)) return { replayed: true };
      const target = clockAt(now()); const tickBefore = state.tick;
      if (target > state.clock) tickInline(target - state.clock, 'request');
      const fn = L[type];
      if (typeof fn !== 'function' || !L.mut[type]) throw new Error(`no such action ${type}`);
      let next;
      try { next = fn(state, ...args); } catch (err) { if (err instanceof L.RulesError) throw new IllegalMove(err.code, err.message); throw err; }
      const at = now(); const nextSeq = seq + 1; const nextRev = rev + 1;
      // the receipt goes in with the journal row: both land or neither does (its primary key is the last word on a pair)
      withCas(() => {
        db.world.journalInsert(WORLD_ID, { seq: nextSeq, account: accountId, type, args: JSON.stringify(args), clock: state.clock, at, nonce });
        db.world.nonceInsert(WORLD_ID, accountId, nonce, nextSeq, at);
        db.world.memberTouch(WORLD_ID, accountId, nonce, nextRev, at);
        cas(seq, nextSeq, nextRev);
      });
      state = next; seq = nextSeq; rev = nextRev; dirtyActions += 1;
      lastNonce.set(accountId, { nonce, rev }); lastActive.set(accountId, at); nonceDirty.add(accountId);
      if (state.lastEvents.some((e) => e.type === 'curtain')) snapshot('curtain'); else maybeSnapshot();
      return { tickBefore };
    });
  }

  function join(user, starter) {
    return guard(() => {
      const target = clockAt(now()); const tickBefore = state.tick;
      if (target > state.clock) tickInline(target - state.clock, 'join');
      let id = members.get(user.id) ?? null;
      const fresh = !id;
      if (fresh) { do { id = mintAccountId(); } while (state.accounts[id] || [...members.values()].includes(id)); }
      const at = now();
      const rows = [];
      let next = state;
      if (fresh || !state.accounts[id]) {
        const h = { id, name: user.name, pastWhorescore: 0 };
        next = L.joinWorld(next, h);
        rows.push({ account: id, type: 'joinWorld', args: JSON.stringify([h]), clock: next.clock });
      }
      next = L.chooseStarter(next, id, starter);
      rows.push({ account: id, type: 'chooseStarter', args: JSON.stringify([id, starter]), clock: next.clock });
      const nextSeq = seq + rows.length; const nextRev = rev + 1;
      withCas(() => {
        if (fresh) db.world.memberInsert(WORLD_ID, user.id, id, at);
        db.world.memberTouch(WORLD_ID, id, lastNonce.get(id)?.nonce ?? null, nextRev, at);
        rows.forEach((r, i) => db.world.journalInsert(WORLD_ID, { seq: seq + i + 1, ...r, at, nonce: null }));
        cas(seq, nextSeq, nextRev);
      });
      state = next; seq = nextSeq; rev = nextRev; dirtyActions += rows.length;
      members.set(user.id, id); lastActive.set(id, at);
      maybeSnapshot();
      return { tickBefore, accountId: id };
    });
  }

  // ---- read side ----
  const liveWhores = (acct) => acct.whores.filter((wid) => state.whores[wid] && !state.whores[wid].retired);
  function crowd() {
    const out = Object.fromEntries(Object.keys(state.timelines).map((tl) => [tl, 0]));
    for (const w of Object.values(state.whores)) if (!w.retired && state.accounts[w.account].kind === 'human' && w.timeline in out) out[w.timeline]++;
    return out;
  }
  // the nom de plume of every human with a live girl in each Timeline (a name is public on the Players board; never a plan,
  // a Place or a seal), sorted, so the plan screen can say who else is in the era tonight (spec 9.4)
  function humanNames() {
    const out = Object.fromEntries(Object.keys(state.timelines).map((tl) => [tl, []]));
    for (const w of Object.values(state.whores)) {
      const a = state.accounts[w.account];
      if (!w.retired && a && a.kind === 'human' && typeof a.name === 'string' && w.timeline in out) out[w.timeline].push(a.name);
    }
    for (const tl of Object.keys(out)) out[tl].sort((x, y) => x.localeCompare(y));
    return out;
  }
  function curtains() {
    const n = crowd(); const names = humanNames();
    return Object.fromEntries(Object.values(state.timelines).map((T) => [T.id, {
      curtainNo: T.curtainNo, lastCurtainAt: T.lastCurtainAt, nextCurtainAt: L.nextForcedAt(state, T), earliestCurtainAt: T.lastCurtainAt + state.opts.minGapMin,
      humans: n[T.id], humanNames: names[T.id], sealing: L.sealingOf(state, T.id), ready: L.curtainReady(state, T.id),
    }]));
  }
  function payload(accountId, { focus = null, all = false, boards = false, digest = false, tick = 0, replayed = false } = {}) {
    const acct = state.accounts[accountId];
    if (!acct) throw new Error('no such account');
    const live = liveWhores(acct);
    const focusId = focus && live.includes(focus) ? focus : (live[0] ?? null);
    const ids = all ? live : (focusId ? [focusId] : []);
    const views = {}; const legal = {};
    for (const wid of ids) { views[wid] = L.getView(state, wid, { logTail: 0 }); legal[wid] = L.legalActions(state, wid); }
    const base = L.getView(state, accountId, { focus: focusId ?? undefined, logTail: 0 }).account;
    const n = crowd();
    const account = { ...base, id: accountId, canOpen: base.canOpen.filter((c) => n[C.CHARACTERS[c].timeline] < tlCap), lastNonce: lastNonce.get(accountId)?.nonce ?? null };
    let events = []; let eventsGap = false;
    if (!replayed) {
      const allEv = L.eventsFor(state, accountId, tick);
      events = allEv.slice(-200);
      eventsGap = (tick > 0 && tick < (state.logFloor || 0)) || allEv.length > 200;
    }
    const out = {
      boot, rev, tick: state.tick, serverNow: now(), clock: state.clock, day: state.day, season: state.season, minPerSec: minPerSecText(rate), epochMs: clockEpochMs,
      account, focus: focusId, views, legal, curtains: curtains(), events, eventsGap, replayed: !!replayed,
    };
    if (boards) { out.whorescore = L.whorescore(state, accountId); out.boards = L.leaderboards(state); }
    if (digest) {
      out.digest = {};
      for (const wid of live) { const tl = state.whores[wid].timeline; out.digest[tl] = L.awayDigest(state, wid, acct.seen[tl] ?? 0, { tonight: true }); }
    }
    return out;
  }
  function profile(accountId, wid) {
    if (!Object.hasOwn(state.whores, wid)) return null;
    return { rev, profile: L.publicProfile(state, accountId, wid) };
  }
  function players(limit) {
    const rows = L.leaderboards(state).whorescore;
    const out = [];
    for (const row of rows) {
      if (!row.whores.length) continue;
      const lead = row.whores.reduce((a, b) => (HUMAN_TIER_SCORE(b) > HUMAN_TIER_SCORE(a) ? b : a));
      const la = row.kind === 'human' ? lastActive.get(row.account) : null;
      out.push({ rank: out.length + 1, name: row.name, tier: lead.tier, title: lead.title, road: lead.road, whorescore: row.value,
        timelines: row.whores.map((w) => w.timeline), lastActive: la == null ? null : hourFloor(la), house: row.kind !== 'human' });
      if (out.length >= limit) break;
    }
    return out;
  }
  function health() {
    const t = now();
    const behind = Math.max(0, ((state.clock - clockAt(t)) * 1000 * rate.den) / rate.num);
    const ok = !stopped && t - lastTickAt <= HEALTH_TICK_MS && seq - snapSeq <= snapshotMaxLag;
    return { ok, world: { seq, snapSeq, clock: state.clock, clockBehindMs: Math.round(behind), members: members.size } };
  }

  // ---- lifecycle ----
  function start() {
    if (timers.length) return;
    lastTickAt = devHooks.stallTick ? 0 : now();
    const t = setInterval(() => { try { tick(); } catch (err) { if (!err || !err.fatalHandled) fatal(1, `lw-server: tick timer failed (${err && err.message ? err.message : 'error'})`); } }, TICK_MS);
    t.unref(); timers.push(t);
    if (backupDir) { backups = scheduleBackups(db, backupDir, world, { keep: opts.backupKeep, log }); timers.push(backups.timer); }
  }
  function stop() {
    if (stopped) return;
    stopped = true;
    for (const t of timers) clearInterval(t);
    timers = [];
    try { snapshot('sigterm'); } catch (err) { log(`lw-server: final snapshot failed (${err && err.message ? err.message : 'error'})`); }
    if (lock) { lock.release(); lock = null; }
  }
  function abandon() {
    if (!DEV) throw new Error('abandon is a test seam (LW_DEV=1 only)');
    stopped = true;
    for (const t of timers) clearInterval(t);
    timers = [];
    db.close();
  }

  try {
    await load();
    catchUp();
  } catch (err) {
    if (lock) { lock.release(); lock = null; } // a refusal must not leave a lock behind
    throw err;
  }
  lastTickAt = devHooks.stallTick ? 0 : now();

  const world = {
    get state() { return state; }, get seq() { return seq; }, get rev() { return rev; }, get snapSeq() { return snapSeq; }, get clockEpochMs() { return clockEpochMs; }, boot,
    get lastTickAt() { return lastTickAt; }, get snapshotFailedAt() { return snapshotFailedAt; }, get dirtyActions() { return dirtyActions; }, get lock() { return lock; },
    members, lastNonce, lastActive, rate, tlCap, cap, dayMs, clockAt,
    // the handler's first check on an act: an action of this account's with this nonce has landed (world_nonces)
    nonceSeen,
    memberOf: (userId) => members.get(userId) ?? null,
    isMember: (userId) => members.has(userId),
    hasLiveWhore: (accountId) => !!state.accounts[accountId] && liveWhores(state.accounts[accountId]).length > 0,
    // the engine's own ownership check (assertOwns), run before every mutator; a retired girl is nobody's to send out
    owns: (accountId, wid) => { try { return !L.assertOwns(state, accountId, wid).retired; } catch (err) { if (err instanceof L.RulesError) return false; throw err; } },
    legalFor: (who) => L.legalActions(state, who),
    apply, join, tick, payload, profile, players, crowd, curtains, health, snapshot, start, stop, abandon,
    tickInline, // for the operator script and tests only
    devHooks,
    // LW_DEV only: moves the row's seq behind the server's back on its own connection (the EXCLUSIVE lock keeps every
    // other connection out, so a test cannot do it from outside), to prove the compare-and-set exits.
    devBumpSeq: () => { if (!DEV) throw new Error('test seam'); db.tx(() => db.world.cas(WORLD_ID, seq, seq + 1, rev)); },
    backupNow: () => (backups ? backups.run() : (backupDir ? backupOnce(db, backupDir, 'lw') : Promise.resolve(null))),
  };
  return world;
}

// ---- the operator commands ----
// Retires every live whore of the human account called `name` (case-insensitive) through the engine's one retirement rule
// (L.retireWhore: her season points banked into the account's pastWhorescore, her seat vacated, her challenges dropped,
// skipped by every list from then on). Returns the number retired, or null when no such account exists. Mutates `state`
// in place: the caller snapshots before and after (nothing is journaled, so a replay never crosses it).
export function evictAccount(state, name) {
  const key = String(name).toLowerCase();
  const acct = Object.values(state.accounts).find((a) => a.kind === 'human' && typeof a.name === 'string' && a.name.toLowerCase() === key);
  if (!acct) return null;
  let n = 0;
  for (const wid of acct.whores) if (Object.hasOwn(state.whores, wid) && L.retireWhore(state, wid)) n++;
  return n;
}

async function main(argv) {
  const [cmd, ...rest] = argv;
  const usage = 'usage: node server/world.mjs --reset [--from-snapshot] | --standin-seal <min>,<max>|off | --backup [label] | --evict <name>  [db]   (db defaults to LW_DB)';
  if (!['--reset', '--standin-seal', '--backup', '--evict'].includes(cmd)) { console.error(usage); return 2; }
  // --reset --from-snapshot: carry the snapshot's scores and drop what was journaled after it (section 12.8)
  let fromSnapshot = false;
  if (cmd === '--reset' && rest[0] === '--from-snapshot') { fromSnapshot = true; rest.shift(); }
  if (rest.includes('--from-snapshot')) { console.error(usage); return 2; }
  const arg = cmd === '--reset' ? null : rest.shift();
  if ((cmd === '--standin-seal' || cmd === '--evict') && arg === undefined) { console.error(usage); return 2; }
  const file = rest[0] ?? (process.env.LW_DB === '' ? undefined : process.env.LW_DB);
  if (!file || file === ':memory:') { console.error(usage); return 2; }
  let opts;
  try { opts = envOpts(); } catch (err) { console.error(`lw-world: ${err.message}`); return 2; }
  let lock;
  try { lock = takeLock(path.dirname(path.resolve(file))); } catch (err) { console.error(`lw-world: ${err.message}`); return 3; }
  let db;
  try {
    db = await openDb(file);
    if (cmd === '--backup') {
      const out = await backupOnce(db, db.backupDir, arg || 'lw');
      console.log(`lw-world: wrote ${out}`);
      return 0;
    }
    if (cmd === '--reset') {
      const world = await openWorld(db, { ...opts, reset: true, fromSnapshot, stateDir: null, backupDir: db.backupDir, log: (l) => console.error(l) });
      world.snapshot('reset');
      console.log(`lw-world: world reset${fromSnapshot ? ' from the snapshot' : ''}; ${world.members.size} member(s) carried; seq ${world.seq}`);
      return 0;
    }
    if (cmd === '--evict') {
      // --evict <name>: retire every live girl of that account (a squatter holding a street's slot, section 12.10). Her
      // account stays and her girls' season points are banked into it; the engine skips a retired whore everywhere, so the
      // slot is free at the next count and her next join hires a fresh girl (the same character is `<account>:<char>#2`).
      // Load and replay, snapshot, retire, snapshot: no replay crosses it.
      const world = await openWorld(db, { ...opts, stateDir: null, backupDir: db.backupDir, log: (l) => console.error(l) });
      if (!world.snapshot('evict')) { console.error('lw-world: snapshot failed; nothing changed'); return 1; }
      const n = evictAccount(world.state, arg);
      if (n === null) { console.error(`lw-world: no human account named ${JSON.stringify(arg)}`); return 2; }
      if (n === 0) { console.log(`lw-world: ${arg} has no live girl; nothing changed`); return 0; }
      if (!world.snapshot('evict')) { console.error('lw-world: snapshot failed after the change; restore from the last backup'); return 1; }
      console.log(`lw-world: evicted ${arg}: ${n} girl(s) retired at seq ${world.seq}`);
      return 0;
    }
    // --standin-seal: load and replay, snapshot, change the option, snapshot again so no replay crosses the change
    const seal = parseStandinSeal(arg);
    if (seal === undefined) { console.error('lw-world: --standin-seal takes min,max (whole minutes, max >= min >= 1) or off'); return 2; }
    const world = await openWorld(db, { ...opts, stateDir: null, backupDir: db.backupDir, log: (l) => console.error(l) });
    if (!world.snapshot('standin-seal')) { console.error('lw-world: snapshot failed; nothing changed'); return 1; }
    world.state.opts.standinSeal = seal;
    if (!world.snapshot('standin-seal')) { console.error('lw-world: snapshot failed after the change; restore from the last backup'); return 1; }
    console.log(`lw-world: standinSeal is now ${seal ? `${seal.min},${seal.max}` : 'off'} at seq ${world.seq}`);
    return 0;
  } catch (err) {
    console.error(`lw-world: ${err && err.message ? err.message : 'failed'}`);
    return err instanceof WorldRefusal ? err.exitCode : 1;
  } finally {
    try { if (db) db.close(); } catch { /* already closed */ }
    lock.release();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(await main(process.argv.slice(2)));
}
