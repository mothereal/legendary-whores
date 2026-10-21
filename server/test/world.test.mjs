// world.mjs in-process (ARENA-SPEC section 9.3): openWorld on a temp SQLite file with the LW_DEV test seams (a fake
// clock, a fatal() that throws instead of exiting, a lock takeover). Run: node --test 'server/test/*.test.mjs'.
process.env.LW_DEV = '1';

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import * as L from '../../engine/rules.js';
import * as auth from '../auth.mjs';
import { backupOnce, listBackups } from '../backup.mjs';
import { openDb } from '../db.mjs';
import { ACCOUNT_RE, CATCHUP_CAP_MIN, CurtainPassed, dayMsOf, epochFor, evictAccount, mintAccountId, NONCE_KEEP_MS, NONCE_KEEP_PER_ACCOUNT, openWorld, parseRate, STATE_V, takeLock, WorldRefusal } from '../world.mjs';
import { bootStamp, parseLock, sameBoot } from '../backup.mjs';
import { BACKUP_SCRIPT, makeUser, nonce, rmDir, runScript, tmpDir, walk, WORLD_SCRIPT } from './helpers.mjs';

const C = L.CONTENT; const R = L.RULES;
const J = JSON.stringify;
const RATE1 = { num: 1, den: 1 }; // one District minute per real second: a fake-clock minute is 1000 ms
const MIN = 60_000;
const DEFAULT = { num: 1, den: 60 };
const noLog = () => {};
class Fatal extends Error { constructor(code, line) { super(line); this.exitCode = code; } }
const fatalThrows = (code, line) => { throw new Fatal(code, line); };

// A world on a fresh temp file at rate 1 with `n` users and a fake clock. opts override openWorld's.
async function fresh(n = 2, opts = {}, { rate = RATE1, t0 = Date.UTC(2026, 9, 9, 12, 0, 0) } = {}) {
  const dir = tmpDir('lw-world');
  const file = path.join(dir, 'lw.sqlite');
  const clock = { t: t0 };
  const now = () => clock.t;
  const db = await openDb(file);
  const users = []; for (let i = 0; i < n; i++) users.push(makeUser(db, undefined, clock.t));
  // guestTlCap 1: below the smallest tlCap a test sets (the world refuses a guest seat count at or above the street cap)
  const world = await openWorld(db, { rate, now, log: noLog, fatal: fatalThrows, snapshotSec: 1e9, snapshotActions: 1e9, guestTlCap: 1, ...opts });
  return { dir, file, db, world, users, clock, now, rate };
}
// reopen the same file after a stop (or an abandon, with takeover)
async function reopen(ctx, opts = {}) {
  const db = await openDb(ctx.file);
  try {
    const world = await openWorld(db, { rate: ctx.rate, now: ctx.now, log: noLog, fatal: fatalThrows, snapshotSec: 1e9, snapshotActions: 1e9, ...opts });
    return { ...ctx, db, world };
  } catch (err) { db.close(); throw err; } // a refused open must not keep the EXCLUSIVE connection
}
const joined = (ctx, i, starter = 'dolly') => { const r = ctx.world.join(ctx.users[i], starter); return { ...r, wid: ctx.world.state.accounts[r.accountId].whores[0] }; };
const bestPlan = (s, wid) => { const v = L.getView(s, wid); const place = L.casualPlace(v); return { place, cards: L.bestGuess(v, place).cards }; };
const stateSans = (s) => { const { lastEvents, ...rest } = s; return J(rest); };
const rowsOf = (ctx) => ctx.db.world.journalAfter(1, 0);
const close = (ctx) => { try { ctx.world.stop(); } catch { /* abandoned */ } try { ctx.db.close(); } catch { /* closed */ } rmDir(ctx.dir); };

test('parseRate: a/b and decimals as a rational in lowest terms, refused outside (0, 60] or when a day is not whole milliseconds', () => {
  assert.deepEqual(parseRate('1/60'), { num: 1, den: 60 });
  assert.deepEqual(parseRate('2/120'), { num: 1, den: 60 });
  assert.deepEqual(parseRate('1'), { num: 1, den: 1 });
  assert.deepEqual(parseRate('60'), { num: 60, den: 1 });
  assert.deepEqual(parseRate('0.5'), { num: 1, den: 2 });
  assert.equal(parseRate('0.016666667'), null, 'the decimal is not 1/60');
  assert.equal(parseRate('61'), null); assert.equal(parseRate('0'), null); assert.equal(parseRate('7/0'), null); assert.equal(parseRate('abc'), null);
  assert.equal(dayMsOf(DEFAULT), 86_400_000); assert.equal(dayMsOf(RATE1), 1_440_000);
});

test('mintAccountId: 50 bits, the shape the engine admits, never a colon', () => {
  const ids = new Set(); for (let i = 0; i < 2000; i++) { const id = mintAccountId(); assert.match(id, ACCOUNT_RE); assert.ok(!id.includes(':')); ids.add(id); }
  assert.equal(ids.size, 2000);
});

test('T-create: a fresh file creates one world at the dawn alignment, on the grid, with a four-word rng and the seed nowhere on the wire', async () => {
  // 14:30 local on the creation day: 510 minutes since 06:00
  const t0 = new Date(2026, 9, 9, 14, 30, 0).getTime();
  const ctx = await fresh(1, {}, { rate: DEFAULT, t0 });
  const { world, db } = ctx;
  const s = world.state;
  assert.equal(s.clock, 510); assert.equal(s.day, 0);
  for (const T of Object.values(s.timelines)) { assert.equal(T.lastCurtainAt, 510); assert.equal(L.nextForcedAt(s, T), 540, 'the next multiple of 180'); }
  assert.equal(world.seq, 0); assert.equal(world.snapSeq, 0);
  const row = db.world.meta(1);
  assert.equal(row.seq, 0); assert.equal(row.snap_seq, 0); assert.equal(row.rate_num, 1); assert.equal(row.rate_den, 60); assert.equal(row.state_v, STATE_V);
  assert.equal(row.clock_epoch_ms, new Date(2026, 9, 9, 6, 0, 0).getTime(), 'District clock 0 is 06:00 local');
  assert.equal(JSON.parse(db.world.get(1).state).seed, s.seed, 'the snapshot row holds the state');
  assert.equal(s.opts.standinSeal, null); assert.equal(s.opts.curtainGrid, true); assert.equal(s.opts.arena, true); assert.equal(s.opts.seasonDays, R.seasonDays);
  assert.ok(Array.isArray(s.rng) && s.rng.length === 4);
  assert.equal(epochFor(new Date(2026, 9, 9, 3, 0, 0).getTime(), DEFAULT, 360), new Date(2026, 9, 8, 6, 0, 0).getTime(), 'before dawn: the day before, so the clock is never negative');
  assert.equal(epochFor(t0, RATE1, 360), t0, 'any other rate: now');
  // the seed is in the row and nowhere else
  const j = joined(ctx, 0);
  const p = world.payload(j.accountId, { all: true, boards: true, digest: true, tick: 0 });
  const text = J(p);
  assert.ok(!text.includes(s.seed)); assert.ok(!('seed' in p) && !('rng' in p) && !('seq' in p));
  for (const r of rowsOf(ctx)) assert.ok(!r.args.includes(s.seed));
  world.stop(); db.close();
  // a refusal (exit 2) when the env rate differs from the row's pair
  const db2 = await openDb(ctx.file);
  await assert.rejects(openWorld(db2, { rate: RATE1, now: ctx.now, log: noLog }), (e) => e instanceof WorldRefusal && e.exitCode === 2 && /rate|LW_MIN_PER_SEC/.test(e.message));
  db2.close(); rmDir(ctx.dir);
});

test('T-apply: joins and actions journal in order with their clocks and nonces; a refused move adds no row; a tick row precedes an action; a stolen seq exits', async () => {
  const ctx = await fresh(2);
  const { world, db } = ctx;
  const a = joined(ctx, 0); const b = joined(ctx, 1);
  assert.match(a.accountId, ACCOUNT_RE); assert.notEqual(a.accountId, b.accountId);
  assert.equal(world.state.whores[a.wid].name, ctx.users[0].name, 'the nom de plume');
  const plan = bestPlan(world.state, a.wid);
  const n1 = nonce(); const n2 = nonce();
  const tickBefore = world.state.tick;
  assert.deepEqual(world.apply(a.accountId, 'planEvening', [a.wid, plan], n1), { tickBefore });
  world.apply(a.accountId, 'sealPlan', [a.wid], n2);
  const rows = rowsOf(ctx);
  assert.deepEqual(rows.map((r) => r.type), ['joinWorld', 'chooseStarter', 'joinWorld', 'chooseStarter', 'planEvening', 'sealPlan']);
  assert.deepEqual(rows.map((r) => r.seq), [1, 2, 3, 4, 5, 6]);
  for (const r of rows) assert.ok(Number.isInteger(r.clock));
  assert.deepEqual(rows.slice(4).map((r) => r.nonce), [n1, n2]);
  assert.deepEqual(rows.slice(0, 4).map((r) => r.nonce), [null, null, null, null]);
  assert.equal(db.world.meta(1).seq, 6);
  const m = db.world.members(1).find((x) => x.account_id === a.accountId);
  assert.equal(m.last_nonce, n2); assert.equal(m.last_rev, world.rev); assert.equal(m.last_active_at, ctx.clock.t);
  // a RulesError action: no row, state byte-identical
  const before = stateSans(world.state);
  assert.throws(() => world.apply(b.accountId, 'buyOffer', [b.wid], nonce()), (e) => e.name === 'IllegalMove' && typeof e.reason === 'string' && e.message.length > 0);
  assert.equal(stateSans(world.state), before); assert.equal(rowsOf(ctx).length, 6);
  // an action whose catch-up tick emitted events journals the tick row first
  ctx.clock.t += 180 * 1000; // past the first forced Curtain at rate 1
  world.apply(b.accountId, 'study', [b.wid, 'plunkett'], nonce());
  // the tick row (seq 7) went in first, and its Curtain snapshotted at once (snap_seq 7, the row pruned); the study is seq 8
  assert.equal(world.seq, 8); assert.equal(world.snapSeq, 7);
  const tail = rowsOf(ctx);
  assert.deepEqual(tail.map((r) => [r.seq, r.type]), [[8, 'study']]);
  assert.equal(tail[0].clock, 180, 'the action was applied at the caught-up clock');
  const snap = JSON.parse(db.world.get(1).state);
  assert.equal(snap.clock, 180); assert.ok(snap.timelines.victorian.curtainNo >= 1, 'the Curtain fell inside the tick');
  assert.ok(!('lastEvents' in snap), 'the snapshot carries no lastEvents');
  // worlds.seq moved behind the server's back: the next apply exits with the one line (the EXCLUSIVE lock keeps every other
  // process out, so the seam bumps it on the world's own connection)
  world.devBumpSeq();
  assert.throws(() => world.apply(b.accountId, 'study', [b.wid, 'plunkett'], nonce()), (e) => e instanceof Fatal && e.exitCode === 1 && /written by another process/.test(e.message));
  ctx.db.close(); rmDir(ctx.dir);
});

test('T-nonce: the same nonce twice is one row and a replayed answer; a new nonce with the same args applies again', async () => {
  const ctx = await fresh(1);
  const { world } = ctx;
  const a = joined(ctx, 0);
  const n = nonce();
  const first = world.apply(a.accountId, 'study', [a.wid, 'plunkett'], n);
  const rowsAfter = rowsOf(ctx).length; const stateAfter = stateSans(world.state); const revAfter = world.rev;
  assert.deepEqual(world.apply(a.accountId, 'study', [a.wid, 'plunkett'], n), { replayed: true });
  assert.equal(rowsOf(ctx).length, rowsAfter); assert.equal(stateSans(world.state), stateAfter); assert.equal(world.rev, revAfter);
  const p = world.payload(a.accountId, { replayed: true, tick: first.tickBefore });
  assert.equal(p.replayed, true); assert.deepEqual(p.events, []); assert.equal(p.eventsGap, false); assert.equal(p.rev, revAfter); assert.equal(p.account.lastNonce, n);
  assert.ok(p.views[a.wid] && p.legal[a.wid], 'the current payload');
  const tb = world.state.tick;
  assert.deepEqual(world.apply(a.accountId, 'study', [a.wid, 'plunkett'], nonce()), { tickBefore: tb });
  assert.equal(rowsOf(ctx).length, rowsAfter + 1, 'a deliberate second study');
  close(ctx);
});

test('T-curtain-passed in apply: a move tapped under a Curtain that has fallen is refused, also when the fall comes in the request\'s own catch-up tick (the tick stays, nothing is applied); a landed nonce replays whatever the Curtain; no curtain, no check', async () => {
  const ctx = await fresh(1);
  const { world } = ctx;
  const a = joined(ctx, 0);
  const tl = world.state.whores[a.wid].timeline;
  const k = world.state.timelines[tl].curtainNo;
  const n1 = nonce();
  assert.ok('tickBefore' in world.apply(a.accountId, 'study', [a.wid, 'plunkett'], n1, k), 'under its own Curtain it lands');
  // the real clock passes the next Curtain; nothing has ticked yet, so the state still says Curtain k
  const T = world.state.timelines[tl];
  ctx.clock.t += (L.nextForcedAt(world.state, T) - world.state.clock + 1) * 1000;
  assert.equal(world.state.timelines[tl].curtainNo, k, 'not ticked yet');
  const seq0 = world.seq; const lastNonce = world.payload(a.accountId).account.lastNonce;
  // a seal tapped under Curtain k: the request's catch-up brings the Curtain down, then the seal is refused
  assert.throws(() => world.apply(a.accountId, 'sealPlan', [a.wid, bestPlan(world.state, a.wid)], nonce(), k), (e) => e instanceof CurtainPassed && e.name === 'CurtainPassed');
  assert.equal(world.state.timelines[tl].curtainNo, k + 1, 'the catch-up tick stays');
  // one journal row, the tick (its Curtain snapshots at once, so the snapshot holds it); nothing for the seal
  assert.equal(world.seq, seq0 + 1, 'one row, the tick'); assert.equal(world.snapSeq, seq0 + 1, 'the Curtain\'s snapshot');
  assert.equal(world.payload(a.accountId).account.lastNonce, lastNonce, 'no receipt');
  assert.ok(!(world.state.whores[a.wid].plan && world.state.whores[a.wid].plan.sealed), 'nothing sealed for the next night');
  // the nonce that landed under k replays, carrying k
  assert.deepEqual(world.apply(a.accountId, 'study', [a.wid, 'plunkett'], n1, k), { replayed: true });
  // ahead of the street is refused too; the current one lands; no curtain (an account-scoped move, a direct caller) is not checked
  assert.throws(() => world.apply(a.accountId, 'study', [a.wid, 'plunkett'], nonce(), k + 2), (e) => e instanceof CurtainPassed);
  assert.ok('tickBefore' in world.apply(a.accountId, 'sealPlan', [a.wid, bestPlan(world.state, a.wid)], nonce(), k + 1));
  assert.ok('tickBefore' in world.apply(a.accountId, 'markSeen', [a.accountId, tl], nonce()));
  close(ctx);
});

test('T-nonce-receipts: A lands and its answer is lost, 70 more actions and a routine snapshot follow, and the re-post of A is replayed: A applied once; a receipt is per account, survives a restart and every snapshot, and goes only after 48 hours', async () => {
  let ctx = await fresh(2, { snapshotActions: 50 });
  const a = joined(ctx, 0); const b = joined(ctx, 1);
  const g = C.TIMELINES.victorian.gents;
  const nA = nonce();
  ctx.world.apply(a.accountId, 'study', [a.wid, g[0]], nA);
  const seqA = ctx.world.seq; const knownAfterA = J(ctx.world.state.whores[a.wid].known);
  // 70 more of hers (markSeen: always legal, and it teaches her nothing), with a routine snapshot among them (every 50)
  for (let i = 0; i < 70; i++) ctx.world.apply(a.accountId, 'markSeen', [a.accountId, 'victorian'], nonce());
  assert.ok(ctx.world.snapSeq > seqA, 'a routine snapshot came after A');
  const bytes = stateSans(ctx.world.state); const seq = ctx.world.seq; const rev = ctx.world.rev;
  assert.deepEqual(ctx.world.apply(a.accountId, 'study', [a.wid, g[0]], nA), { replayed: true }, 'the re-post of A, 70 actions and a snapshot later');
  assert.equal(stateSans(ctx.world.state), bytes, 'A was applied once'); assert.equal(ctx.world.seq, seq); assert.equal(ctx.world.rev, rev);
  assert.equal(J(ctx.world.state.whores[a.wid].known), knownAfterA);
  assert.equal(rowsOf(ctx).filter((r) => r.nonce === nA).length, 0, 'A\'s journal row went with the snapshot');
  assert.equal(ctx.db.world.nonceSeq(1, a.accountId, nA), seqA, 'its receipt did not');
  assert.equal(ctx.world.payload(a.accountId, {}).account.lastNonce === nA, false, 'A is not her newest: the receipt, not lastNonce, recognised it');
  // per account: the same string from B is B's own action, and gets B's own receipt
  assert.equal(ctx.world.nonceSeen(b.accountId, nA), false);
  assert.ok('tickBefore' in ctx.world.apply(b.accountId, 'study', [b.wid, g[0]], nA), 'B\'s action under the same string lands');
  assert.deepEqual(ctx.world.apply(b.accountId, 'study', [b.wid, g[0]], nA), { replayed: true });
  // a refused move leaves no receipt: the same nonce on a legal move later is applied
  const nX = nonce();
  assert.throws(() => ctx.world.apply(b.accountId, 'buyOffer', [b.wid], nX), (e) => e.name === 'IllegalMove');
  assert.equal(ctx.world.nonceSeen(b.accountId, nX), false);
  // a crash (no final snapshot) and a restart: the receipt is read from the table
  ctx.world.abandon();
  ctx = await reopen(ctx, { takeoverLock: true, snapshotActions: 50 });
  assert.deepEqual(ctx.world.apply(a.accountId, 'study', [a.wid, g[0]], nA), { replayed: true }, 'after a restart');
  // the table's primary key is the last word on a pair
  assert.throws(() => ctx.db.world.nonceInsert(1, a.accountId, nA, 1, 1), /UNIQUE constraint failed: world_nonces/);
  // the prune: at snapshot time, receipts older than NONCE_KEEP_MS go and younger ones stay
  // (48 hours: twice the 24 hours the client keeps an unsettled act before it gives up on it)
  assert.equal(NONCE_KEEP_MS, 48 * 3_600_000);
  const t = ctx.clock.t; const hour = 3_600_000;
  ctx.db.world.nonceInsert(1, a.accountId, 'aaaaaaaa-0000-4000-8000-000000000008', 1, t - 49 * hour);
  ctx.db.world.nonceInsert(1, a.accountId, 'aaaaaaaa-0000-4000-8000-000000000006', 1, t - 25 * hour);
  ctx.db.world.nonceInsert(1, a.accountId, 'aaaaaaaa-0000-4000-8000-000000000007', 1, t - NONCE_KEEP_MS + 1000);
  assert.ok(ctx.world.snapshot('test'));
  assert.equal(ctx.world.nonceSeen(a.accountId, 'aaaaaaaa-0000-4000-8000-000000000008'), false, 'older than 48 hours: gone at the snapshot');
  assert.equal(ctx.world.nonceSeen(a.accountId, 'aaaaaaaa-0000-4000-8000-000000000006'), true, '25 hours old (past the client\'s 24): kept');
  assert.equal(ctx.world.nonceSeen(a.accountId, 'aaaaaaaa-0000-4000-8000-000000000007'), true, 'a second inside the 48 hours: kept');
  assert.equal(ctx.db.world.nonceSeq(1, a.accountId, nA), seqA, 'every snapshot keeps a receipt younger than 48 hours');
  close(ctx);
});

test('T-nonce-cap: no receipt younger than NONCE_KEEP_MS is ever deleted: an account holding NONCE_KEEP_PER_ACCOUNT of them has new actions refused (too-many-moves, with the wait until its oldest expires), while a re-post of its earliest still replays after 5000 newer ones and a snapshot; past the 48 hours the snapshot prunes them and moves land again; another account is untouched', async () => {
  const ctx = await fresh(2, { snapshotActions: 50 });
  const a = joined(ctx, 0); const b = joined(ctx, 1);
  const count = (acc) => ctx.db.raw.prepare('SELECT count(*) AS n FROM world_nonces WHERE world_id = 1 AND account = ?').get(acc).n;
  assert.equal(NONCE_KEEP_PER_ACCOUNT, 5000); assert.equal(NONCE_KEEP_MS, 48 * 3_600_000);
  const g = C.TIMELINES.victorian.gents;
  // B's own few
  for (let i = 0; i < 3; i++) ctx.world.apply(b.accountId, 'markSeen', [b.accountId, 'victorian'], nonce());
  // A's early action (its answer lost), then 4999 newer ones through the server, one every 200 ms (the act limit's 300 a
  // minute), with a routine snapshot every 50 of them: 5000 receipts, all inside the 48 hours
  const t0 = ctx.clock.t;
  const nA = nonce();
  ctx.world.apply(a.accountId, 'study', [a.wid, g[0]], nA);
  for (let i = 1; i < NONCE_KEEP_PER_ACCOUNT; i++) { ctx.clock.t += 200; ctx.world.apply(a.accountId, 'markSeen', [a.accountId, 'victorian'], nonce()); }
  assert.ok(ctx.world.snapSeq > 4900, `routine snapshots ran among them (snapSeq ${ctx.world.snapSeq})`);
  assert.equal(count(a.accountId), NONCE_KEEP_PER_ACCOUNT, `every receipt is kept (${count(a.accountId)})`);
  // one more is refused: nothing applied, no receipt, and the wait is until her oldest receipt leaves the window
  const bytes = stateSans(ctx.world.state); const seq = ctx.world.seq; const nX = nonce();
  assert.throws(() => ctx.world.apply(a.accountId, 'markSeen', [a.accountId, 'victorian'], nX), (e) => {
    assert.equal(e.name, 'TooManyMoves');
    const expect = Math.ceil((t0 + NONCE_KEEP_MS - ctx.clock.t) / 1000);
    assert.ok(e.retryAfter >= expect && e.retryAfter <= expect + 1, `Retry-After ${e.retryAfter} s, until her oldest receipt is 48 hours old (${expect} s)`);
    return true;
  });
  assert.equal(stateSans(ctx.world.state), bytes, 'nothing applied'); assert.equal(ctx.world.seq, seq);
  assert.equal(ctx.world.nonceSeen(a.accountId, nX), false, 'no receipt for the refused one');
  assert.ok(ctx.world.movesWait(a.accountId) > 0, 'the handler\'s check says the same: the account is full');
  // the earliest one's re-post still replays, after 5000 newer ones and a snapshot
  assert.ok(ctx.world.snapshot('test'));
  assert.equal(count(a.accountId), NONCE_KEEP_PER_ACCOUNT, 'the snapshot deletes none of them');
  // (the District clock ran 1000 minutes under her 5000 moves, so Curtains fell since A: the state before the re-post is
  // the yardstick)
  const knownBefore = J(ctx.world.state.whores[a.wid].known);
  assert.deepEqual(ctx.world.apply(a.accountId, 'study', [a.wid, g[0]], nA), { replayed: true }, 'the early receipt replays');
  assert.equal(stateSans(ctx.world.state), bytes, 'A applied once: the re-post changed nothing'); assert.equal(J(ctx.world.state.whores[a.wid].known), knownBefore);
  // another account is neither trimmed nor refused
  assert.equal(count(b.accountId), 3);
  assert.ok('tickBefore' in ctx.world.apply(b.accountId, 'markSeen', [b.accountId, 'victorian'], nonce()), 'B still plays');
  // once her oldest receipt is past the 48 hours it no longer counts, and the next snapshot prunes it: her moves land again
  ctx.clock.t = t0 + NONCE_KEEP_MS + 1000;
  assert.equal(ctx.world.movesWait(a.accountId), 0, 'a receipt past the window does not count');
  assert.ok('tickBefore' in ctx.world.apply(a.accountId, 'markSeen', [a.accountId, 'victorian'], nonce()), 'a new move lands');
  assert.ok(ctx.world.snapshot('test'));
  assert.equal(ctx.world.nonceSeen(a.accountId, nA), false, 'the expired receipt is pruned at the snapshot');
  assert.ok(count(a.accountId) < NONCE_KEEP_PER_ACCOUNT, 'and only the receipts inside the window stay');
  close(ctx);
});

// the world row's meta, read on a plain connection (the file is not open elsewhere)
function plain2Meta(file) { const d = new DatabaseSync(file); try { return d.prepare('SELECT seq, snap_seq, state_v FROM worlds WHERE id = 1').get(); } finally { d.close(); } }

// drives `n` accepted actions for the members with a seeded picker, without reading legalActions (the engine refuses what
// is not on); never seals, since a sealed lone active human would fall a Curtain early
function drive(ctx, accts, n, seed = 7) {
  let x = seed >>> 0; const rnd = () => { x = (x + 0x6D2B79F5) >>> 0; let t = Math.imul(x ^ (x >>> 15), x | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const kinds = ['study', 'study', 'explore', 'explore', 'planEvening', 'passOffer', 'buyOffer', 'dropItem', 'markSeen', 'buyCard', 'spendGossip'];
  let done = 0; let tries = 0;
  while (done < n && tries < n * 30) {
    tries++;
    const a = pick(accts); const s = ctx.world.state; const w = s.whores[a.wid]; const TL = C.TIMELINES[w.timeline];
    const kind = pick(kinds);
    const rivals = Object.values(s.whores).filter((r) => r.timeline === w.timeline && r.id !== a.wid).map((r) => r.id);
    const args = kind === 'study' ? [a.wid, pick([...TL.gents, ...rivals])] : kind === 'explore' ? [a.wid, pick(TL.places)]
      : kind === 'planEvening' ? [a.wid, (() => { const v = L.getView(s, a.wid); const place = L.casualPlace(v); return { place, cards: L.bestGuess(v, place).cards }; })()]
      : kind === 'buyCard' ? [a.wid, pick(TL.market)] : kind === 'spendGossip' ? [a.wid, pick(rivals)] : kind === 'dropItem' ? [a.wid, 0] : kind === 'markSeen' ? [a.accountId, w.timeline] : [a.wid];
    try { ctx.world.apply(a.accountId, kind, args, nonce()); done++; } catch (e) { if (e.name !== 'IllegalMove') throw e; }
  }
  return done;
}

test('T-crash-replay: a crash after 300 actions and 150 ticks with no snapshot replays to the same bytes; so does a snapshot mid-way, and a snapshot plus ticks', async () => {
  const run = async (snapshotAt) => {
    let ctx = await fresh(3);
    const accts = [joined(ctx, 0), joined(ctx, 1, 'fanny'), joined(ctx, 2, 'jackie')];
    const half = 150;
    const done1 = drive(ctx, accts, half, 11);
    for (let i = 0; i < 75; i++) { ctx.clock.t += 1000; ctx.world.tick(); } // 75 ticks of one minute, under the first grid Curtain
    if (snapshotAt === 'mid') assert.equal(ctx.world.snapshot('test'), true);
    const done2 = drive(ctx, accts, half, 13);
    for (let i = 0; i < 75; i++) { ctx.clock.t += 1000; ctx.world.tick(); }
    if (snapshotAt === 'mid-then-ticks') { assert.equal(ctx.world.snapshot('test'), true); for (let i = 0; i < 20; i++) { ctx.clock.t += 1000; ctx.world.tick(); } }
    assert.ok(done1 + done2 >= 250, `drove ${done1 + done2} actions`);
    const w1 = ctx.world; const seq1 = w1.seq; const bytes1 = stateSans(w1.state);
    if (snapshotAt === 'none') assert.equal(w1.snapSeq, 0, 'no snapshot was written');
    else assert.ok(w1.snapSeq > 0 && w1.snapSeq < seq1, 'snap_seq < seq');
    w1.abandon(); // the connection closes; the lock file and the journal stay as a crash leaves them
    assert.ok(fs.existsSync(path.join(ctx.dir, 'world.lock')), 'the lock is left behind');
    await assert.rejects(reopen(ctx), (e) => e instanceof WorldRefusal && /world\.lock is held by pid/.test(e.message), 'the stale lock holds a live pid (this process)');
    ctx = await reopen(ctx, { takeoverLock: true });
    const w2 = ctx.world;
    assert.equal(w2.seq, seq1); assert.equal(stateSans(w2.state), bytes1, `replayed state differs (${snapshotAt})`);
    const a = accts[0]; const place = C.TIMELINES.victorian.places[0];
    assert.equal(J(L.explore(w1.state, a.wid, place)), J(L.explore(w2.state, a.wid, place)), 'the next action agrees');
    close(ctx);
  };
  await run('none'); await run('mid'); await run('mid-then-ticks');
});

test('T-snapshot-prune: a snapshot at seq N prunes rows <= N, keeps the rest, and a replay from it agrees', async () => {
  const ctx = await fresh(2);
  const accts = [joined(ctx, 0), joined(ctx, 1)];
  drive(ctx, accts, 20, 3);
  const n = ctx.world.seq;
  assert.equal(ctx.world.snapshot('test'), true);
  assert.equal(ctx.db.world.journalCount(1), 0); assert.equal(ctx.world.snapSeq, n);
  drive(ctx, accts, 10, 5);
  const rows = rowsOf(ctx);
  assert.ok(rows.length >= 10 && rows.every((r) => r.seq > n), 'rows above N survive');
  const bytes = stateSans(ctx.world.state);
  ctx.world.stop(); ctx.db.close();
  const re = await reopen(ctx);
  assert.equal(stateSans(re.world.state), bytes); assert.equal(re.world.seq, ctx.world.seq);
  close(re);
});

test('T-corrupt-snapshot: a truncated worlds.state refuses to start naming the newest backup; a failed parse-back writes nothing and keeps the journal', async () => {
  const ctx = await fresh(1);
  joined(ctx, 0);
  const backupDir = path.join(ctx.dir, 'backups');
  const bk = await backupOnce(ctx.db, backupDir, 'lw');
  ctx.world.snapshot('test');
  // the parse-back check: JSON.stringify answers a cut string once
  const rowsBefore = (ctx.db.world.journalCount(1), drive(ctx, [{ accountId: ctx.world.memberOf(ctx.users[0].id), wid: ctx.world.state.accounts[ctx.world.memberOf(ctx.users[0].id)].whores[0] }], 5, 9), ctx.db.world.journalCount(1));
  const realStringify = JSON.stringify;
  let once = true;
  JSON.stringify = function patched(...args) { const out = realStringify.apply(JSON, args); if (once && out.length > 1000) { once = false; return out.slice(0, -1); } return out; };
  try { assert.equal(ctx.world.snapshot('test'), false); } finally { JSON.stringify = realStringify; }
  assert.ok(ctx.world.snapshotFailedAt !== null); assert.equal(ctx.db.world.journalCount(1), rowsBefore, 'the journal is kept');
  assert.ok(ctx.world.snapSeq < ctx.world.seq);
  assert.equal(ctx.world.snapshot('test'), true, 'the next trigger retries');
  ctx.world.stop(); ctx.db.close();
  // corrupt the row by one byte on a plain connection
  const plain = await openDb(ctx.file, { exclusive: false });
  plain.raw.exec('UPDATE worlds SET state = substr(state, 1, length(state) - 1) WHERE id = 1');
  plain.close();
  const db2 = await openDb(ctx.file);
  await assert.rejects(openWorld(db2, { rate: RATE1, now: ctx.now, log: noLog, backupDir }), (e) => e instanceof WorldRefusal && e.exitCode === 2 && e.message.includes(bk) && /restore the newest backup/.test(e.message) && /-wal and -shm/.test(e.message));
  db2.close(); rmDir(ctx.dir);
});

test('T-catchup: 30 real minutes back advances the clock by 30 with one tick row; 3 days back advances exactly 1440 after shifting the epoch by two days', async () => {
  const t0 = new Date(2026, 9, 9, 9, 15, 0).getTime();
  let ctx = await fresh(1, {}, { rate: DEFAULT, t0 });
  joined(ctx, 0);
  const c0 = ctx.world.state.clock; const epoch0 = ctx.world.clockEpochMs;
  assert.equal(ctx.world.snapshot('test'), true);
  ctx.world.stop(); ctx.db.close();
  ctx.clock.t = t0 + 30 * MIN;
  ctx = await reopen(ctx);
  assert.equal(ctx.world.state.clock, c0 + 30);
  const rows = rowsOf(ctx);
  assert.equal(rows.length, 1); assert.equal(rows[0].type, 'advanceClock'); assert.deepEqual(JSON.parse(rows[0].args), [30]);
  assert.equal(ctx.world.clockEpochMs, epoch0);
  ctx.world.stop(); ctx.db.close();
  ctx.clock.t = t0 + 30 * MIN + 3 * 86_400_000;
  ctx = await reopen(ctx);
  assert.equal(ctx.world.state.clock, c0 + 30 + CATCHUP_CAP_MIN, 'exactly one day of District time');
  assert.equal(ctx.world.clockEpochMs, epoch0 + 2 * dayMsOf(DEFAULT), 'two whole days skipped');
  assert.equal(ctx.db.world.meta(1).clock_epoch_ms, ctx.world.clockEpochMs, 'persisted');
  assert.equal(ctx.world.state.clock % 1440, (c0 + 30) % 1440, 'the phase is kept');
  close(ctx);
});

test('T-season: ticks across day 28 roll the season once in place, with a sealed plan paid after the roll and the score banked', async () => {
  const ctx = await fresh(3, {}, { rate: { num: 60, den: 1 } }); // a District day is 24 real seconds
  const a = joined(ctx, 0); const b = joined(ctx, 1);
  const dayMs = dayMsOf({ num: 60, den: 1 });
  for (let d = 0; d < 27; d++) { ctx.clock.t += dayMs; ctx.world.tick(); }
  assert.equal(ctx.world.state.day, 27); assert.equal(ctx.world.state.season, 1);
  ctx.clock.t += Math.ceil(1261 * 1000 / 60); ctx.world.tick(); // into the last grid slot of day 27: the next forced Curtain is the day boundary
  assert.equal(ctx.world.state.clock, 27 * 1440 + 1261);
  joined(ctx, 2, 'dolly'); // C is active and unsealed, so A's and B's seals cannot fall early
  ctx.world.apply(a.accountId, 'sealPlan', [a.wid, bestPlan(ctx.world.state, a.wid)], nonce());
  ctx.world.apply(b.accountId, 'sealPlan', [b.wid, bestPlan(ctx.world.state, b.wid)], nonce());
  assert.equal(ctx.world.state.timelines.victorian.curtainNo, Math.floor((27 * 1440 + 1261) / 180), 'no early fall: one forced Curtain per grid slot');
  const tickBefore = ctx.world.state.tick;
  ctx.clock.t += dayMs; ctx.world.tick();
  const ev = L.eventsFor(ctx.world.state, a.accountId, tickBefore);
  const ends = ev.filter((e) => e.type === 'season-end');
  assert.equal(ends.length, 1, 'one season-end'); assert.equal(ctx.world.state.season, 2); assert.equal(ctx.world.state.seasonStartDay, 28);
  const pay = ev.find((e) => e.type === 'payout' && e.whores && e.whores[0] === a.wid);
  assert.ok(pay && pay.id > ends[0].id, 'the sealed plan paid after the roll, into the new season');
  assert.ok(ctx.world.state.accounts[a.accountId].pastWhorescore >= 0 && ends[0].data.banked[a.accountId] !== undefined, 'banked');
  assert.equal(ctx.db.world.meta(1).season, 2, 'the Curtain snapshot carried the season');
  close(ctx);
});

test('T-reset: a state_v below STATE_V refuses to start with the recipe; with the reset asked for, a backup, an empty journal, carried scores, no girls; a second load is a no-op', async () => {
  let ctx = await fresh(2);
  const a = joined(ctx, 0); const b = joined(ctx, 1);
  ctx.world.apply(a.accountId, 'sealPlan', [a.wid, bestPlan(ctx.world.state, a.wid)], nonce());
  ctx.world.apply(b.accountId, 'sealPlan', [b.wid, bestPlan(ctx.world.state, b.wid)], nonce());
  ctx.clock.t += 200 * 1000; ctx.world.tick(); // a Curtain: both score
  const old = ctx.world.state;
  const totals = Object.fromEntries([a, b].map((x) => [x.accountId, L.whorescore(old, x.accountId).total]));
  assert.ok(totals[a.accountId] > 0 || totals[b.accountId] > 0, 'someone banked a point');
  const backupDir = path.join(ctx.dir, 'backups');
  ctx.world.stop(); ctx.db.close();
  const plain = await openDb(ctx.file, { exclusive: false });
  plain.raw.exec(`UPDATE worlds SET state_v = ${STATE_V - 1} WHERE id = 1`);
  plain.close();
  let db = await openDb(ctx.file);
  await assert.rejects(openWorld(db, { rate: RATE1, now: ctx.now, log: noLog, backupDir }), (e) => e instanceof WorldRefusal && e.exitCode === 2 && /state_v/.test(e.message) && /LW_WORLD_RESET=1/.test(e.message) && /--reset/.test(e.message));
  db.close();
  ctx = await reopen(ctx, { resetOnMismatch: true, backupDir });
  assert.equal(listBackups(backupDir, null).filter((f) => f.name.startsWith(`pre-reset-sv${STATE_V - 1}-`)).length, 1);
  assert.equal(ctx.db.world.journalCount(1), 0, 'the journal is empty');
  assert.equal(ctx.db.world.meta(1).state_v, STATE_V);
  const s = ctx.world.state;
  assert.notEqual(s.seed, old.seed);
  for (const x of [a, b]) {
    assert.ok(s.accounts[x.accountId], 'the member is back'); assert.deepEqual(s.accounts[x.accountId].whores, []);
    assert.equal(s.accounts[x.accountId].pastWhorescore, totals[x.accountId]); assert.equal(s.accounts[x.accountId].name, old.accounts[x.accountId].name);
  }
  assert.equal(ctx.world.members.size, 2);
  assert.ok(!ctx.world.hasLiveWhore(a.accountId));
  const bytes = stateSans(s); const seq = ctx.world.seq;
  ctx.world.stop(); ctx.db.close();
  ctx = await reopen(ctx, { resetOnMismatch: true, backupDir });
  assert.equal(stateSans(ctx.world.state), bytes); assert.equal(ctx.world.seq, seq); assert.equal(listBackups(backupDir, null).length, 1, 'no second reset');
  // a member re-picks: chooseStarter only, no second joinWorld row
  const again = ctx.world.join(ctx.users[0], 'fanny');
  assert.equal(again.accountId, a.accountId);
  assert.deepEqual(rowsOf(ctx).map((r) => r.type), ['chooseStarter']);
  close(ctx);
});

test('T-reset-journal: the reset replays the journal before it reads the carried scores (a Curtain paid after the last snapshot counts); a journal that does not replay refuses the reset and changes nothing', async () => {
  let ctx = await fresh(2);
  const a = joined(ctx, 0); const b = joined(ctx, 1);
  assert.equal(ctx.world.snapshot('test'), true); // the snapshot: nobody has scored yet
  ctx.world.apply(a.accountId, 'sealPlan', [a.wid, bestPlan(ctx.world.state, a.wid)], nonce());
  ctx.world.apply(b.accountId, 'sealPlan', [b.wid, bestPlan(ctx.world.state, b.wid)], nonce());
  // the Curtain's own snapshot fails (the disk is full): the tick row that paid them stays in the journal
  const realSnapshot = ctx.db.world.snapshot; ctx.db.world.snapshot = () => { throw new Error('disk full'); };
  ctx.clock.t += 200 * 1000; ctx.world.tick();
  ctx.db.world.snapshot = realSnapshot;
  assert.ok(ctx.world.snapSeq < ctx.world.seq && ctx.world.snapshotFailedAt !== null, 'the journal holds the Curtain');
  const live = Object.fromEntries([a, b].map((x) => [x.accountId, L.whorescore(ctx.world.state, x.accountId).total]));
  assert.ok(live[a.accountId] >= 1 && live[b.accountId] >= 1, `both scored at the Curtain (${J(live)})`);
  const snap = JSON.parse(ctx.db.world.get(1).state);
  for (const x of [a, b]) assert.equal(L.whorescore(snap, x.accountId).total, 0, 'the snapshot alone knows no score');
  const backupDir = path.join(ctx.dir, 'backups');
  ctx.world.abandon(); // no final snapshot: as a crash leaves the file
  ctx = await reopen(ctx, { takeoverLock: true, reset: true, backupDir });
  for (const x of [a, b]) assert.equal(ctx.world.state.accounts[x.accountId].pastWhorescore, live[x.accountId], 'the carried score is the replayed one');
  assert.equal(ctx.world.members.size, 2); assert.equal(ctx.db.world.journalCount(1), 0, 'the journal starts empty');
  assert.equal(listBackups(backupDir, null).filter((f) => f.name.startsWith('pre-reset-')).length, 1);
  const fresh2 = stateSans(ctx.world.state); const meta = J(ctx.db.world.meta(1));
  ctx.world.stop(); ctx.db.close();
  // a journal that does not replay (the row's seq is past the journal head): the reset is refused with the reason, no
  // backup is taken and nothing is written
  const plain = await openDb(ctx.file, { exclusive: false });
  plain.raw.exec('UPDATE worlds SET seq = seq + 1 WHERE id = 1');
  plain.close();
  const db2 = await openDb(ctx.file);
  const headRow = plain2Meta(ctx.file);
  await assert.rejects(openWorld(db2, { rate: RATE1, now: ctx.now, log: noLog, reset: true, backupDir }), (e) => e instanceof WorldRefusal && e.exitCode === 2
    && new RegExp(`the reset was refused at seq ${headRow.seq}: the journal does not replay \\(journal head mismatch`).test(e.message) && /nothing was changed/.test(e.message)
    && /start the old build once and stop it with SIGTERM to fold the journal/.test(e.message)
    && new RegExp(`run --reset --from-snapshot to carry the snapshot's scores and drop the journaled ones since seq ${headRow.snap_seq + 1}`).test(e.message));
  db2.close();
  assert.equal(listBackups(backupDir, null).filter((f) => f.name.startsWith('pre-reset-')).length, 1, 'no second backup');
  const plain2 = await openDb(ctx.file, { exclusive: false });
  const row = plain2.world.get(1);
  assert.equal(stateSans({ ...JSON.parse(row.state), lastEvents: [] }), fresh2, 'the state row is untouched');
  assert.equal(J({ ...plain2.world.meta(1), seq: JSON.parse(meta).seq }), meta, 'the row is untouched but for the seq the test moved');
  plain2.close();
  // the operator command refuses the same way, with exit 2
  const r = await runScript(WORLD_SCRIPT, ['--reset', ctx.file], { LW_MIN_PER_SEC: '1' });
  assert.equal(r.code, 2, r.err); assert.match(r.err, /the reset was refused/);
  rmDir(ctx.dir);
});

// A world whose last snapshot knows no score and whose journal holds two seals and the Curtain that paid them (the
// Curtain's own snapshot failed), left as a crash leaves it. For the reset's refusal and --from-snapshot.
async function crashedWithJournal() {
  const ctx = await fresh(2, {}, { t0: Date.now() - 3_600_000 });
  const a = joined(ctx, 0); const b = joined(ctx, 1);
  assert.equal(ctx.world.snapshot('test'), true); // the snapshot: nobody has scored yet
  const sealA = nonce();
  ctx.world.apply(a.accountId, 'sealPlan', [a.wid, bestPlan(ctx.world.state, a.wid)], sealA);
  ctx.world.apply(b.accountId, 'sealPlan', [b.wid, bestPlan(ctx.world.state, b.wid)], nonce());
  const realSnapshot = ctx.db.world.snapshot; ctx.db.world.snapshot = () => { throw new Error('disk full'); };
  ctx.clock.t += 200 * 1000; ctx.world.tick();
  ctx.db.world.snapshot = realSnapshot;
  const live = Object.fromEntries([a, b].map((x) => [x.accountId, L.whorescore(ctx.world.state, x.accountId).total]));
  assert.ok(live[a.accountId] >= 1 && live[b.accountId] >= 1, J(live));
  ctx.world.abandon(); // a crash: the journal was never folded into the snapshot
  const meta0 = plain2Meta(ctx.file);
  const rows = (() => { const d = new DatabaseSync(ctx.file); try { return d.prepare('SELECT seq, type, args FROM world_actions ORDER BY seq').all(); } finally { d.close(); } })();
  const edit = (sql) => { const d = new DatabaseSync(ctx.file); try { d.exec(sql); } finally { d.close(); } };
  return { ctx, a, b, sealA, live, meta0, since: meta0.snap_seq + 1, rows, edit, backupDir: path.join(ctx.dir, 'backups') };
}

test('T-reset-refusal: a journal row that does not replay, or a journal written under another state_v, refuses the reset naming the seq and both ways on, and changes nothing', async () => {
  const { ctx, meta0, since, rows, edit, backupDir } = await crashedWithJournal();
  const sealRow = rows.find((r) => r.type === 'sealPlan');
  const remedies = (e) => /start the old build once and stop it with SIGTERM to fold the journal/.test(e.message)
    && e.message.includes(`run --reset --from-snapshot to carry the snapshot's scores and drop the journaled ones since seq ${since}`) && /nothing was changed/.test(e.message);
  const untouched = () => {
    const d = new DatabaseSync(ctx.file);
    try {
      const m = d.prepare('SELECT seq, snap_seq FROM worlds WHERE id = 1').get();
      assert.deepEqual({ seq: m.seq, snapSeq: m.snap_seq }, { seq: meta0.seq, snapSeq: meta0.snap_seq }, 'the world row is untouched');
      assert.equal(d.prepare('SELECT count(*) AS n FROM world_actions').get().n, rows.length, 'the journal is untouched');
    } finally { d.close(); }
    assert.equal(listBackups(backupDir, null).filter((f) => f.name.startsWith('pre-reset-')).length, 0, 'no backup was taken');
  };
  // (1) a row the engine refuses (her seal now names a girl nobody has): refused at that row's seq
  edit(`UPDATE world_actions SET args = '["nobody:dolly"]' WHERE seq = ${sealRow.seq}`);
  let db = await openDb(ctx.file);
  await assert.rejects(openWorld(db, { rate: RATE1, now: ctx.now, log: noLog, reset: true, backupDir, takeoverLock: true }), (e) => e instanceof WorldRefusal && e.exitCode === 2
    && e.message.includes(`the reset was refused at seq ${sealRow.seq}: the journal does not replay (replay failed at seq ${sealRow.seq}: no-whore)`) && remedies(e));
  db.close(); untouched();
  edit(`UPDATE world_actions SET args = '${sealRow.args.replace(/'/g, "''")}' WHERE seq = ${sealRow.seq}`);
  // (2) the snapshot is of another state_v and the journal after it is not empty: refused at the first journaled seq
  edit(`UPDATE worlds SET state_v = ${STATE_V - 1} WHERE id = 1`);
  db = await openDb(ctx.file);
  await assert.rejects(openWorld(db, { rate: RATE1, now: ctx.now, log: noLog, resetOnMismatch: true, backupDir }), (e) => e instanceof WorldRefusal && e.exitCode === 2
    && e.message.includes(`the reset was refused at seq ${since}: the journal after the snapshot (seq ${since} to ${meta0.seq}) was written under state_v ${STATE_V - 1} and this build reads state_v ${STATE_V}`) && remedies(e));
  db.close(); untouched();
  // the operator command refuses the same way, exit 2
  const r = await runScript(WORLD_SCRIPT, ['--reset', ctx.file], { LW_MIN_PER_SEC: '1' });
  assert.equal(r.code, 2, r.err); assert.ok(r.err.includes(`the reset was refused at seq ${since}`) && r.err.includes('--reset --from-snapshot'), r.err);
  untouched();
  rmDir(ctx.dir);
});

test('T-reset-from-snapshot: after a crash and a state_v bump, --reset --from-snapshot carries the snapshot\'s scores, drops the journal after it with one loud line naming the seqs and the account ids, and keeps the receipts', async () => {
  const { ctx, a, b, sealA, live, meta0, since, rows, edit, backupDir } = await crashedWithJournal();
  takeLock(ctx.dir, { takeover: true }).release(); // the crashed world's lock (this test's own pid) goes, as a restart's would
  edit(`UPDATE worlds SET state_v = ${STATE_V - 1} WHERE id = 1`);
  const r = await runScript(WORLD_SCRIPT, ['--reset', '--from-snapshot', ctx.file], { LW_MIN_PER_SEC: '1' });
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /world reset from the snapshot; 2 member\(s\) carried/);
  assert.ok(r.err.includes(`world reset --from-snapshot: the snapshot's scores are carried and the ${rows.filter((x) => x.seq >= since).length} journaled row(s) since seq ${since} (to seq ${meta0.seq}) are DROPPED; accounts whose journaled actions are dropped: ${[a.accountId, b.accountId].sort().join(', ')}`), r.err);
  assert.ok(!r.err.includes(ctx.users[0].name) && !r.err.includes(sealA), 'never a name or a nonce in the log');
  const after = await openDb(ctx.file, { exclusive: false });
  const st = JSON.parse(after.world.get(1).state);
  assert.equal(after.world.meta(1).state_v, STATE_V); assert.equal(after.world.journalCount(1), 0);
  for (const x of [a, b]) {
    assert.equal(st.accounts[x.accountId].pastWhorescore, 0, 'the snapshot\'s score');
    assert.ok(live[x.accountId] >= 1, 'which is not the journaled one');
    assert.deepEqual(st.accounts[x.accountId].whores, [], 'members re-pick a starter');
  }
  assert.ok(after.world.nonceSeq(1, a.accountId, sealA) !== null, 'the receipts stay across a reset');
  after.close();
  assert.equal(listBackups(backupDir, null).filter((f) => f.name.startsWith(`pre-reset-sv${STATE_V - 1}-`)).length, 1, 'one pre-reset backup');
  // again, with nothing journaled after the snapshot: nothing to drop, and it says so
  const r2 = await runScript(WORLD_SCRIPT, ['--reset', '--from-snapshot', ctx.file], { LW_MIN_PER_SEC: '1' });
  assert.equal(r2.code, 0, r2.err); assert.match(r2.err, /nothing was journaled after the snapshot/);
  // the flag belongs to --reset alone
  const r3 = await runScript(WORLD_SCRIPT, ['--backup', '--from-snapshot', ctx.file], { LW_MIN_PER_SEC: '1' });
  assert.equal(r3.code, 2); assert.match(r3.err, /usage:/);
  rmDir(ctx.dir);
});

test('T-boot: every payload carries the boot id of this process; a restart mints another', async () => {
  let ctx = await fresh(1);
  const a = joined(ctx, 0);
  const p1 = ctx.world.payload(a.accountId, {});
  assert.match(p1.boot, /^[0-9a-f]{16}$/); assert.equal(p1.boot, ctx.world.boot);
  assert.equal(ctx.world.payload(a.accountId, { all: true }).boot, p1.boot, 'one boot per process');
  ctx.world.stop(); ctx.db.close();
  ctx = await reopen(ctx);
  const p2 = ctx.world.payload(a.accountId, {});
  assert.match(p2.boot, /^[0-9a-f]{16}$/); assert.notEqual(p2.boot, p1.boot, 'a new boot after a restart');
  close(ctx);
});

test('T-events: breakdown re-attached on her own payouts only; eventsGap below logFloor and past 200 events; the digest agrees on truncation', async () => {
  const ctx = await fresh(2, { logLimit: 50 });
  const a = joined(ctx, 0); const b = joined(ctx, 1);
  for (let k = 0; k < 6; k++) {
    for (const x of [a, b]) { try { ctx.world.apply(x.accountId, 'sealPlan', [x.wid, bestPlan(ctx.world.state, x.wid)], nonce()); } catch (e) { if (e.name !== 'IllegalMove') throw e; } }
    ctx.clock.t += 180 * 1000; ctx.world.tick();
  }
  const s = ctx.world.state;
  assert.ok(s.timelines.victorian.curtainNo >= 6);
  const mine = L.eventsFor(s, a.accountId, 0).filter((e) => e.type === 'payout');
  assert.ok(mine.length > 0);
  for (const e of mine) {
    if (e.whores[0] === a.wid) assert.ok(e.data.breakdown, 'hers has the breakdown'); else assert.ok(!e.data.breakdown, 'nobody else\'s does');
  }
  assert.ok(s.logFloor > 0, 'the log was trimmed');
  assert.equal(ctx.world.payload(a.accountId, { tick: s.logFloor - 1 }).eventsGap, true, 'a cursor below the floor');
  assert.equal(ctx.world.payload(a.accountId, { tick: s.tick - 1 }).eventsGap, false);
  assert.equal(ctx.world.payload(a.accountId, { tick: 0 }).eventsGap, false, 'tick 0 asks for everything the log holds: not a gap');
  assert.equal(L.awayDigest(s, a.wid, s.logFloor - 1).truncated, true);
  assert.equal(L.awayDigest(s, a.wid, s.tick - 1).truncated, false);
  // more than 200 visible events behind: a wide window in a world whose log holds them
  const ctx2 = await fresh(1, { logLimit: 8000 });
  const c = joined(ctx2, 0);
  for (let k = 0; k < 30; k++) { ctx2.clock.t += 180 * 1000; ctx2.world.tick(); }
  const s2 = ctx2.world.state; const all = L.eventsFor(s2, c.accountId, 1);
  assert.ok(all.length > 200 && s2.logFloor === 0, `${all.length} visible events, no trim`);
  const p = ctx2.world.payload(c.accountId, { tick: 1 });
  assert.equal(p.events.length, 200); assert.equal(p.eventsGap, true); assert.equal(p.events[199].id, s2.tick);
  assert.equal(L.awayDigest(s2, c.wid, 1).truncated, false, 'the digest is not truncated: the log holds it');
  close(ctx); close(ctx2);
});

test('T-lone-player: alone and active she falls a Curtain at minGapMin; with --standin-seal 45,90 applied by the operator command, not before 45', async () => {
  const sleeperThenLone = async (ctx) => {
    const sleeper = joined(ctx, 1, 'fanny');
    for (let i = 0; i < 2; i++) { ctx.clock.t += 1440 * 1000; ctx.world.tick(); } // the sleeper's last action is more than a day old
    const a = joined(ctx, 0, 'fanny');
    ctx.world.apply(a.accountId, 'sealPlan', [a.wid, bestPlan(ctx.world.state, a.wid)], nonce());
    const T = ctx.world.state.timelines.wildwest; const k = T.curtainNo; const last = T.lastCurtainAt;
    let fell = null;
    for (let m = 1; m <= 120 && fell === null; m++) { ctx.clock.t += 1000; ctx.world.tick(); if (T.curtainNo > k) fell = ctx.world.state.clock - last; }
    const p = ctx.world.payload(sleeper.accountId, {});
    return { fell, sleeperFullPayLeft: p.account.whores[0].fullPayLeft };
  };
  let ctx = await fresh(2);
  const off = await sleeperThenLone(ctx);
  assert.equal(off.fell, R.curtain.minGapMin, 'standinSeal off: the minimum gap');
  // lever (a) (round 2026-10-13, question 1, decided 2026-10-18; engine fullPayOf, sim.mjs res.sleeper): in the arena the
  // sleeper's Standing Order night pays Coin, no Renown, and spends none of her paid Curtains. Until B1b this line asserted
  // the opposite (at most fullPayPerDay - 1 left); the behaviour changed by the designer's call, so the expectation follows it
  assert.equal(off.sleeperFullPayLeft, R.curtain.fullPayPerDay, `the sleeper's Standing Order spent a paid slot (${off.sleeperFullPayLeft} of ${R.curtain.fullPayPerDay} left): lever (a) reserves all of them for the nights she seals`);
  ctx.world.stop(); ctx.db.close();
  const r = await runScript(WORLD_SCRIPT, ['--standin-seal', '45,90', ctx.file], { LW_MIN_PER_SEC: '1' });
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /standinSeal is now 45,90/);
  ctx = await reopen(ctx);
  assert.deepEqual(ctx.world.state.opts.standinSeal, { min: 45, max: 90, from: 0 });
  assert.equal(ctx.db.world.journalCount(1), 0, 'the change was snapshotted with snap_seq = seq');
  const ctx3 = await fresh(2, { standinSeal: { min: 45, max: 90 } });
  const on = await sleeperThenLone(ctx3);
  assert.ok(on.fell !== null && on.fell >= 45, `with the brake: ${on.fell}`);
  assert.equal(on.sleeperFullPayLeft, R.curtain.fullPayPerDay, `with the brake the sleeper keeps her paid Curtains too (${on.sleeperFullPayLeft} of ${R.curtain.fullPayPerDay} left)`);
  close(ctx); close(ctx3);
});

test('T-rng-isolation: 1000 stale rummages by A leave the world\'s rng words, B\'s stream and B\'s deck byte-identical, and B\'s next deal unchanged', async () => {
  const ctx = await fresh(2);
  const a = joined(ctx, 0); const b = joined(ctx, 1);
  const s = ctx.world.state;
  const before = { rng: J(s.rng), brng: J(s.whores[b.wid].rng), bdraw: J(s.whores[b.wid].draw), bhand: J(s.whores[b.wid].hand), arng: J(s.whores[a.wid].rng) };
  const nextDeal = (st) => { const c = JSON.parse(J(st)); L.mut.explore(c, b.wid, C.TIMELINES.victorian.places[1]); return J([c.whores[b.wid].hand, c.whores[b.wid].draw, c.whores[b.wid].items]); };
  const dealBefore = nextDeal(s);
  const place = C.TIMELINES.victorian.places[0];
  let accepted = 0;
  for (let i = 0; i < 1000; i++) { try { ctx.world.apply(a.accountId, 'explore', [a.wid, place], nonce()); accepted++; } catch (e) { if (e.name !== 'IllegalMove') throw e; } }
  assert.ok(accepted >= 900, `${accepted} rummages accepted`);
  const after = ctx.world.state;
  assert.equal(J(after.rng), before.rng, 'the world\'s stream');
  assert.equal(J(after.whores[b.wid].rng), before.brng, 'B\'s stream'); assert.equal(J(after.whores[b.wid].draw), before.bdraw); assert.equal(J(after.whores[b.wid].hand), before.bhand);
  assert.notEqual(J(after.whores[a.wid].rng), before.arng, 'A\'s own stream moved');
  assert.equal(nextDeal(after), dealBefore, 'B\'s next deal is the same bytes');
  close(ctx);
});

test('T-concurrent-writer: the operator commands refuse while the lock is held, naming the pid, and change nothing; with the lock removed they fail against the EXCLUSIVE connection', async () => {
  const ctx = await fresh(1);
  joined(ctx, 0);
  const before = J(ctx.db.world.meta(1));
  const r1 = await runScript(WORLD_SCRIPT, ['--standin-seal', '45,90', ctx.file], { LW_MIN_PER_SEC: '1' });
  assert.notEqual(r1.code, 0); assert.match(r1.err, new RegExp(`held by pid ${process.pid}`));
  const bdir = path.join(ctx.dir, 'bk');
  const r2 = await runScript(BACKUP_SCRIPT, [ctx.file, bdir], {});
  assert.notEqual(r2.code, 0); assert.match(r2.err, new RegExp(`held by pid ${process.pid}`)); assert.ok(!fs.existsSync(bdir) || fs.readdirSync(bdir).length === 0);
  assert.equal(ctx.world.state.opts.standinSeal, null); assert.equal(J(ctx.db.world.meta(1)), before);
  fs.rmSync(path.join(ctx.dir, 'world.lock'));
  const r3 = await runScript(WORLD_SCRIPT, ['--standin-seal', '45,90', ctx.file], { LW_MIN_PER_SEC: '1' });
  assert.notEqual(r3.code, 0); assert.match(r3.err, /locked|SQLITE_BUSY|busy/i);
  assert.equal(J(ctx.db.world.meta(1)), before); assert.equal(ctx.world.state.opts.standinSeal, null);
  // the world still works on its own connection
  ctx.world.tick(); assert.equal(ctx.world.snapshot('test'), true);
  close(ctx);
});

test('T-health (in-process): ok while ticking; clockBehindMs > 0 when the real clock stepped back; not ok with a stalled tick or an unbounded journal', async () => {
  let ctx = await fresh(1, { snapshotMaxLag: 3 });
  joined(ctx, 0);
  ctx.world.start();
  let h = ctx.world.health();
  assert.equal(h.ok, true); assert.equal(h.world.members, 1); assert.equal(h.world.clockBehindMs, 0); assert.equal(typeof h.world.seq, 'number');
  for (let i = 0; i < 4; i++) { ctx.clock.t += 1000; ctx.world.tick(); }
  h = ctx.world.health(); assert.equal(h.ok, false, 'seq - snapSeq past the lag'); assert.ok(h.world.seq - h.world.snapSeq > 3);
  assert.equal(ctx.world.snapshot('test'), true); assert.equal(ctx.world.health().ok, true);
  ctx.clock.t += 11_000; assert.equal(ctx.world.health().ok, false, 'no tick for 11 s');
  ctx.world.tick(); assert.equal(ctx.world.health().ok, true);
  ctx.world.stop(); ctx.db.close();
  // the real clock steps back by 3 minutes: the District waits and health reports it, never 503
  ctx.clock.t -= 3 * MIN;
  ctx = await reopen(ctx);
  h = ctx.world.health();
  assert.equal(h.ok, true); assert.equal(h.world.clockBehindMs, 3 * MIN);
  ctx.world.stop(); ctx.db.close();
  ctx = await reopen(ctx, { devHooks: { stallTick: true } });
  ctx.world.start();
  assert.equal(ctx.world.health().ok, false, 'a pinned lastTickAt');
  close(ctx);
});

test('T-tick-throw (in-process): a throw inside a request\'s catch-up tick is fatal, and the restart replays to the pre-throw state and re-runs the minute cleanly', async () => {
  let ctx = await fresh(1, { devHooks: { throwNextRequestTick: true } });
  const a = joined(ctx, 0); // joins do not tick here: the fake clock has not moved
  const bytes = stateSans(ctx.world.state); const seq = ctx.world.seq;
  ctx.clock.t += 5000;
  assert.throws(() => ctx.world.apply(a.accountId, 'study', [a.wid, 'plunkett'], nonce()), (e) => e instanceof Fatal && e.exitCode === 1 && /tick failed/.test(e.message));
  ctx.world.abandon();
  ctx = await reopen(ctx, { takeoverLock: true });
  assert.equal(ctx.world.seq, seq + 1, 'the restart caught the five minutes up as one tick row');
  const replayed = JSON.parse(J(ctx.world.state)); const fresh2 = L.mut.advanceClock(JSON.parse(bytes), 5);
  assert.equal(stateSans(replayed), stateSans(fresh2), 'the pre-throw state plus the throwing minute, run cleanly');
  const tb = ctx.world.state.tick;
  assert.deepEqual(ctx.world.apply(a.accountId, 'study', [a.wid, 'plunkett'], nonce()), { tickBefore: tb });
  close(ctx);
});

test('takeLock: a stale lock (dead pid, a pid from before a reboot, a pid that is not ours to signal) is cleared; a live one refuses unless taken over; release removes only its own', () => {
  const dir = tmpDir('lw-lock');
  fs.writeFileSync(path.join(dir, 'world.lock'), '999999999\n');
  const l1 = takeLock(dir);
  const held = parseLock(fs.readFileSync(l1.path, 'utf8'));
  assert.equal(held.pid, process.pid); assert.equal(held.boot, bootStamp(), 'the lock names the boot it was taken in');
  assert.throws(() => takeLock(dir), (e) => e.name === 'LockHeld' && e.exitCode === 3 && e.message.includes(String(process.pid)));
  const l2 = takeLock(dir, { takeover: true });
  assert.equal(parseLock(fs.readFileSync(l2.path, 'utf8')).pid, process.pid);
  l2.release(); assert.ok(!fs.existsSync(l2.path));
  l1.release(); // nothing left to remove
  // a lock from a build that wrote only the pid is judged by the pid alone: live, so held
  fs.writeFileSync(path.join(dir, 'world.lock'), `${process.pid}\n`);
  assert.throws(() => takeLock(dir), (e) => e.name === 'LockHeld');
  // the same live pid from another boot (the machine rebooted and the pid was handed out again): stale
  assert.ok(sameBoot(bootStamp(), bootStamp()) && !sameBoot('t:1000', 't:2000') && !sameBoot('a', 'b'));
  fs.writeFileSync(path.join(dir, 'world.lock'), `${process.pid}\nt:1000\n`);
  const l3 = takeLock(dir); l3.release(); assert.ok(!fs.existsSync(l3.path));
  // a live pid that is not ours to signal (pid 1 under a non-root user: EPERM) is nobody's world server: stale
  if (typeof process.getuid === 'function' && process.getuid() !== 0) {
    fs.writeFileSync(path.join(dir, 'world.lock'), `1\n${bootStamp()}\n`);
    const l4 = takeLock(dir); l4.release(); assert.ok(!fs.existsSync(l4.path));
  }
  rmDir(dir);
});

test('evictAccount: a squatter\'s girls are retired under the operator command, her street slot is free again, her seat is vacated, and she is not-in-world until her next join hires afresh', async () => {
  const ctx = await fresh(3, { tlCap: 2 });
  const a = joined(ctx, 0); const b = joined(ctx, 1);
  assert.equal(ctx.world.crowd().victorian, 2);
  const seat = Object.keys(ctx.world.state.timelines.victorian.seats)[0];
  ctx.world.state.timelines.victorian.seats[seat].holder = a.wid; // as if she had won it
  assert.equal(evictAccount(ctx.world.state, 'nobody-by-that-name'), null);
  assert.equal(evictAccount(ctx.world.state, ctx.users[0].name.toUpperCase()), 1, 'case-insensitive, one girl retired');
  assert.equal(evictAccount(ctx.world.state, ctx.users[0].name), 0, 'nothing left to retire');
  assert.equal(ctx.world.state.whores[a.wid].retired, true);
  assert.equal(ctx.world.state.timelines.victorian.seats[seat].holder, null, 'the seat is vacated');
  assert.equal(ctx.world.crowd().victorian, 1, 'the slot is free');
  assert.equal(ctx.world.hasLiveWhore(a.accountId), false, 'the handler answers not-in-world');
  assert.equal(ctx.world.owns(a.accountId, a.wid), false, 'a retired girl is nobody\'s to send out');
  assert.ok(ctx.world.snapshot('evict'), 'the command snapshots the change');
  // the third user takes the freed slot; the evicted account comes back with a fresh girl under the same account id
  const c = joined(ctx, 2); assert.equal(ctx.world.crowd().victorian, 2);
  const again = ctx.world.join(ctx.users[0], 'fanny');
  assert.equal(again.accountId, a.accountId);
  assert.equal(ctx.world.hasLiveWhore(a.accountId), true);
  const live = ctx.world.state.accounts[a.accountId].whores.filter((id) => !ctx.world.state.whores[id].retired);
  assert.equal(live.length, 1); assert.notEqual(live[0], a.wid);
  // B's view never names the retired girl among her rivals
  const vb = L.getView(ctx.world.state, b.wid, { logTail: 0 });
  assert.ok(!vb.timeline.rivals.some((r) => r.id === a.wid)); assert.ok(vb.timeline.rivals.some((r) => r.id === c.wid));
  close(ctx);
});

test('evict then rejoin with the same starter: the retired girl keeps her id and history, the rehire is <account>:dolly#2, every list of hers skips the retired one, and a restart replays the rehire', async () => {
  let ctx = await fresh(2, { tlCap: 2 });
  const a = joined(ctx, 0); const b = joined(ctx, 1);
  ctx.world.apply(a.accountId, 'study', [a.wid, 'plunkett'], nonce());
  const oldStudied = J(ctx.world.state.whores[a.wid].known);
  ctx.world.state.whores[a.wid].curtains = 2; ctx.world.state.whores[a.wid].best = 'rare'; // a season worth banking
  const totalBefore = L.whorescore(ctx.world.state, a.accountId).total;
  assert.ok(totalBefore > 0);
  assert.equal(evictAccount(ctx.world.state, ctx.users[0].name), 1);
  assert.equal(L.whorescore(ctx.world.state, a.accountId).total, totalBefore, 'eviction banks her points: the total stays');
  assert.equal(ctx.world.state.accounts[a.accountId].pastWhorescore, totalBefore);
  assert.ok(ctx.world.snapshot('evict'));
  assert.equal(ctx.world.hasLiveWhore(a.accountId), false);
  const again = ctx.world.join(ctx.users[0], 'dolly');
  assert.equal(again.accountId, a.accountId, 'the same account');
  assert.deepEqual(rowsOf(ctx).map((r) => r.type), ['chooseStarter'], 'a rehire, no second joinWorld');
  const s = ctx.world.state; const acct = s.accounts[a.accountId];
  const live = acct.whores.filter((id) => !s.whores[id].retired);
  assert.deepEqual(live, [`${a.accountId}:dolly#2`]); assert.deepEqual(acct.whores, [a.wid, `${a.accountId}:dolly#2`]);
  const w2 = live[0];
  assert.equal(s.whores[a.wid].retired, true); assert.equal(J(s.whores[a.wid].known), oldStudied, 'the old record and her history stay');
  assert.equal(s.whores[w2].char, 'dolly'); assert.equal(s.whores[w2].name, ctx.users[0].name); assert.notEqual(J(s.whores[w2].rng), J(s.whores[a.wid].rng), 'a fresh stream');
  assert.equal(L.charOf(w2), 'dolly');
  assert.equal(ctx.world.hasLiveWhore(a.accountId), true); assert.equal(ctx.world.owns(a.accountId, w2), true); assert.equal(ctx.world.owns(a.accountId, a.wid), false);
  assert.equal(ctx.world.crowd().victorian, 2);
  assert.equal(L.whorescore(s, a.accountId).total, totalBefore, 'the rehire does not raise it');
  assert.equal(ctx.world.players(50).find((r) => r.name === ctx.users[0].name).whorescore, totalBefore, 'the Players board agrees');
  // her lists: the payload, the boards, her legal moves, the rivals of others
  const p = ctx.world.payload(a.accountId, { all: true, boards: true, digest: true, tick: 0 });
  assert.deepEqual(Object.keys(p.views), [w2]); assert.deepEqual(p.account.whores.map((w) => w.id), [w2]); assert.equal(p.focus, w2);
  assert.deepEqual(p.boards.whorescore.find((r) => r.account === a.accountId).whores.map((w) => w.id), [w2]);
  assert.ok(ctx.world.legalFor(a.accountId).some((d) => d.type === 'explore') && !ctx.world.legalFor(a.accountId).some((d) => d.whore === a.wid));
  const vb = L.getView(s, b.wid, { logTail: 0 });
  assert.ok(!vb.timeline.rivals.some((r) => r.id === a.wid) && vb.timeline.rivals.some((r) => r.id === w2));
  assert.equal(ctx.world.profile(b.accountId, w2).profile.id, w2);
  // she plays on under the new id, and the restart replays the rehire to the same bytes
  ctx.world.apply(a.accountId, 'study', [w2, 'plunkett'], nonce());
  const bytes = stateSans(ctx.world.state);
  ctx.world.stop(); ctx.db.close();
  ctx = await reopen(ctx);
  assert.equal(stateSans(ctx.world.state), bytes);
  // evicted again and rehired again: #3
  assert.equal(evictAccount(ctx.world.state, ctx.users[0].name), 1); assert.ok(ctx.world.snapshot('evict'));
  const third = ctx.world.join(ctx.users[0], 'dolly');
  assert.equal(third.accountId, a.accountId);
  assert.deepEqual(ctx.world.state.accounts[a.accountId].whores.filter((id) => !ctx.world.state.whores[id].retired), [`${a.accountId}:dolly#3`]);
  close(ctx);
});

// A guest in the world's file at the fake clock: pass_hash 'none', her date as given. Returns { id, name, token, cookie }.
const DAY = 86_400_000;
function guestOf(ctx, expiresAt, name = `G_${nonce().slice(0, 8)}`) {
  const token = auth.newToken(); const now = ctx.clock.t;
  const user = ctx.db.createUser({ name, nameKey: name.toLowerCase(), passHash: 'none', tokenHash: auth.tokenHash(token), oldTokenHash: null, now, expiresAt: now + auth.SESSION_MS, guestExpiresAt: expiresAt });
  if (!user) throw new Error('name taken');
  return { id: user.id, name, token };
}
const sessionLive = (ctx, u) => ctx.db.sessionUser(auth.tokenHash(u.token), ctx.clock.t) !== null;

test('T-guest-sweep: guests past their date are swept on the hour: a member\'s live girls retire as the eviction does, between two snapshots, and her member row and sessions go; a session-only guest loses the session; a member without a session is swept by the row; a tombstone (neither) and a kept account are never touched; the retirement survives a restart with nothing to replay', async () => {
  let ctx = await fresh(2, { tlCap: 3 });
  assert.equal(typeof ctx.world.sweepGuests, 'function', 'the world sweeps guests');
  const t0 = ctx.clock.t;
  const gA = guestOf(ctx, t0 + 7 * DAY); // a member with a session
  const gB = guestOf(ctx, t0 + 7 * DAY); // a member whose session has gone
  const gC = guestOf(ctx, t0 + 7 * DAY); // a session, never joined
  const gD = guestOf(ctx, t0 + 7 * DAY); // a tombstone in the making: neither
  const gE = guestOf(ctx, t0 + 30 * DAY); // a member with days left
  const k = joined(ctx, 0); // a kept account, a member
  const a = ctx.world.join(gA, 'dolly'); const aw = ctx.world.state.accounts[a.accountId].whores[0];
  const b = ctx.world.join(gB, 'fanny'); const bw = ctx.world.state.accounts[b.accountId].whores[0];
  const e = ctx.world.join(gE, 'jackie'); const ew = ctx.world.state.accounts[e.accountId].whores[0];
  ctx.db.deleteSession(auth.tokenHash(gB.token)); ctx.db.deleteSession(auth.tokenHash(gD.token));
  assert.deepEqual(ctx.world.crowd(), { victorian: 2, wildwest: 1, vegas: 1 });
  assert.equal(ctx.world.guestMembers(t0), 3, 'three guests hold a member row with days left');
  const seat = Object.keys(ctx.world.state.timelines.victorian.seats)[0];
  ctx.world.state.timelines.victorian.seats[seat].holder = aw; // as if she had won it
  ctx.world.state.whores[aw].curtains = 2; ctx.world.state.whores[aw].best = 'rare'; // a season worth banking
  const totalA = L.whorescore(ctx.world.state, a.accountId).total; assert.ok(totalA > 0);
  // nothing has expired: nothing moves
  assert.deepEqual(ctx.world.sweepGuests(t0 + DAY), { swept: 0, retired: 0 });
  assert.equal(ctx.world.state.whores[aw].retired, false);
  // seven days on: the sweep at that hour
  const t7 = t0 + 7 * DAY;
  const seqBefore = ctx.world.seq; const revBefore = ctx.world.rev;
  assert.deepEqual(ctx.world.sweepGuests(t7), { swept: 3, retired: 2 }, 'A, B and C swept; A\'s and B\'s girls retired; D is a tombstone, E has days left, K is kept');
  // the street changed for everyone else: the rev moved once per member swept (A and B; C held no member row), on the
  // row too, so a poll with the old rev is answered with the view, not { same: true }
  assert.equal(ctx.world.rev, revBefore + 2, 'the rev moved with the two retirements');
  assert.equal(ctx.db.world.get(1).rev, ctx.world.rev, 'and the row agrees');
  // A: her girl retired by the retirement rule (banked, seat vacated), her member row and session gone, her users row a tombstone
  assert.equal(ctx.world.state.whores[aw].retired, true); assert.equal(ctx.world.state.timelines.victorian.seats[seat].holder, null, 'the seat is vacated');
  assert.equal(L.whorescore(ctx.world.state, a.accountId).total, totalA, 'her points are banked');
  assert.equal(ctx.world.isMember(gA.id), false); assert.equal(ctx.world.memberOf(gA.id), null); assert.equal(ctx.world.hasLiveWhore(a.accountId), false);
  assert.ok(!ctx.db.world.members(1).some((m) => m.user_id === gA.id), 'the member row is gone');
  assert.equal(sessionLive(ctx, gA), false, 'her session is gone');
  assert.ok(ctx.db.userByKey(gA.name.toLowerCase()), 'the users row stays'); assert.ok(ctx.db.nameTaken(gA.name.toLowerCase()), 'her name stays taken');
  assert.ok(ctx.world.state.accounts[a.accountId], 'her world account stays for the record');
  // B: swept by her member row alone
  assert.equal(ctx.world.state.whores[bw].retired, true); assert.equal(ctx.world.isMember(gB.id), false); assert.ok(!ctx.db.world.members(1).some((m) => m.user_id === gB.id));
  // C: her session alone
  assert.equal(sessionLive(ctx, gC), false); assert.ok(ctx.db.userByKey(gC.name.toLowerCase()));
  // E and K: untouched
  assert.equal(ctx.world.state.whores[ew].retired, false); assert.equal(ctx.world.isMember(gE.id), true); assert.equal(sessionLive(ctx, gE), true);
  assert.equal(ctx.world.state.whores[k.wid].retired, false); assert.equal(ctx.world.isMember(ctx.users[0].id), true); assert.equal(sessionLive(ctx, ctx.users[0]), true);
  assert.deepEqual(ctx.world.crowd(), { victorian: 1, wildwest: 0, vegas: 1 }, 'the slots are free');
  assert.equal(ctx.world.guestMembers(t7), 1, 'E alone');
  assert.equal(ctx.world.health().world.members, 2, 'K and E');
  // nothing was journaled, and the snapshot after the retirements is the file's state
  assert.equal(ctx.world.seq, seqBefore); assert.equal(ctx.world.snapSeq, ctx.world.seq, 'snapshotted at once');
  const snap = JSON.parse(ctx.db.world.get(1).state);
  assert.equal(snap.whores[aw].retired, true); assert.equal(snap.whores[bw].retired, true);
  // the next sweep skips the tombstones (A, B, C and D hold neither a session nor a row) and leaves E and K
  assert.deepEqual(ctx.world.sweepGuests(t7 + DAY), { swept: 0, retired: 0 });
  // a kept account is never a guest, however old: K's date is NULL
  assert.deepEqual(ctx.world.sweepGuests(t0 + 400 * DAY), { swept: 1, retired: 1 }, 'E, once her date passes; K never');
  assert.equal(ctx.world.state.whores[ew].retired, true); assert.equal(ctx.world.isMember(ctx.users[0].id), true); assert.equal(ctx.world.state.whores[k.wid].retired, false);
  // the restart: the snapshot carries the retirements and the journal has nothing to replay across them
  const bytes = stateSans(ctx.world.state); const revStop = ctx.world.rev;
  ctx.world.stop(); ctx.db.close();
  ctx = await reopen(ctx);
  assert.equal(stateSans(ctx.world.state), bytes);
  assert.equal(ctx.world.rev, revStop, 'the rev the sweep moved survives the restart');
  assert.equal(ctx.world.isMember(gA.id), false); assert.equal(ctx.world.isMember(ctx.users[0].id), true);
  assert.deepEqual(ctx.world.crowd(), { victorian: 1, wildwest: 0, vegas: 0 });
  // the slot is free: a new guest takes it under a fresh account; A's name is still taken for her
  const gF = guestOf(ctx, ctx.clock.t + 7 * DAY);
  const f = ctx.world.join(gF, 'dolly');
  assert.notEqual(f.accountId, a.accountId); assert.deepEqual(ctx.world.crowd(), { victorian: 2, wildwest: 0, vegas: 0 });
  assert.throws(() => guestOf(ctx, ctx.clock.t + 7 * DAY, gA.name), /name taken/);
  close(ctx);
});

test('T-guest-sweep-snapshot: when the second snapshot of a sweep fails, the retirement is dropped with it: the girl stays live in memory, the member row, the rev and the seat stay, the state is the one the file and the journal reproduce, and the next sweep retires her once the file takes a snapshot again', async () => {
  const lines = [];
  let ctx = await fresh(1, { tlCap: 3, log: (l) => lines.push(l) });
  const t0 = ctx.clock.t;
  const g = guestOf(ctx, t0 + 7 * DAY);
  const r = ctx.world.join(g, 'dolly'); const wid = ctx.world.state.accounts[r.accountId].whores[0];
  const seat = Object.keys(ctx.world.state.timelines.victorian.seats)[0];
  ctx.world.state.timelines.victorian.seats[seat].holder = wid;
  assert.ok(ctx.world.snapshot('test'), 'the file holds her live');
  const bytes = stateSans(ctx.world.state); const rev0 = ctx.world.rev; const seq0 = ctx.world.seq;
  // the second snapshot of the sweep fails at the row write (the first one, before the retirement, lands)
  const snap0 = ctx.db.world.snapshot; let calls = 0;
  ctx.db.world.snapshot = (...args) => { calls++; if (calls === 2) throw Object.assign(new Error('disk full'), { code: 'SQLITE_FULL' }); return snap0(...args); };
  const t7 = t0 + 7 * DAY;
  assert.deepEqual(ctx.world.sweepGuests(t7), { swept: 0, retired: 0 }, 'nothing counted: the retirement did not land');
  assert.equal(calls, 2, 'two snapshots were tried');
  assert.equal(ctx.world.state.whores[wid].retired, false, 'her girl stays live in memory');
  assert.equal(ctx.world.state.timelines.victorian.seats[seat].holder, wid, 'and keeps her seat');
  assert.equal(stateSans(ctx.world.state), bytes, 'the state is the one before the sweep');
  assert.equal(ctx.world.rev, rev0, 'the rev did not move'); assert.equal(ctx.world.seq, seq0);
  assert.equal(ctx.world.isMember(g.id), true, 'the member row stays'); assert.ok(ctx.db.world.members(1).some((m) => m.user_id === g.id));
  assert.equal(sessionLive(ctx, g), true, 'and her session');
  assert.deepEqual(ctx.world.crowd(), { victorian: 1, wildwest: 0, vegas: 0 });
  assert.ok(lines.some((l) => /guest sweep stopped before a retirement/.test(l)), `one line, counts only (${J(lines)})`);
  assert.ok(!lines.some((l) => l.includes(g.name)), 'no name in the log');
  assert.equal(JSON.parse(ctx.db.world.get(1).state).whores[wid].retired, false, 'the file holds her live too');
  // the file takes snapshots again: the next sweep retires her, and a restart agrees with memory
  ctx.db.world.snapshot = snap0;
  assert.deepEqual(ctx.world.sweepGuests(t7 + 3_600_000), { swept: 1, retired: 1 });
  assert.equal(ctx.world.state.whores[wid].retired, true); assert.equal(ctx.world.rev, rev0 + 1); assert.equal(ctx.world.isMember(g.id), false);
  const after = stateSans(ctx.world.state);
  ctx.world.stop(); ctx.db.close();
  ctx = await reopen(ctx);
  assert.equal(stateSans(ctx.world.state), after); assert.equal(ctx.world.rev, rev0 + 1);
  close(ctx);
});

test('T-rename: the keep renames a member guest through the engine\'s renameAccount beside the users row in one transaction, journaled and snapshotted at once (no row left to replay), on her account and every girl of hers; a refusal from the users row writes nothing on either side; a guest who never joined is renamed on the row alone; the restart agrees', async () => {
  let ctx = await fresh(1, { tlCap: 3 });
  assert.equal(typeof ctx.world.rename, 'function', 'the world renames');
  const t0 = ctx.clock.t;
  const g = guestOf(ctx, t0 + 7 * DAY); const n = guestOf(ctx, t0 + 7 * DAY);
  const k = joined(ctx, 0);
  const j = ctx.world.join(g, 'dolly'); const wid = ctx.world.state.accounts[j.accountId].whores[0];
  ctx.world.apply(j.accountId, 'study', [wid, 'plunkett'], nonce());
  const keep = (u, name) => () => ctx.db.guests.keep({ userId: u.id, name, nameKey: name.toLowerCase(), passHash: 'scrypt$test' });
  // the engine's own refusal comes first, before any write: a name a world human holds is `exists`, an IllegalMove,
  // and the users row is not touched (the server checks the row's name first, so over the wire this is the second guard)
  const before = stateSans(ctx.world.state); const seq0 = ctx.world.seq;
  assert.throws(() => ctx.world.rename(g.id, ctx.users[0].name, keep(g, ctx.users[0].name)), (e) => e.name === 'IllegalMove' && e.reason === 'exists');
  assert.equal(stateSans(ctx.world.state), before, 'nothing applied'); assert.equal(ctx.world.seq, seq0);
  assert.equal(ctx.db.sessionUser(auth.tokenHash(g.token), t0).name, g.name, 'the row is as it was');
  // a name a users row holds with no account in the world (a guest who never joined): the engine lets it pass and the
  // row refuses it as taken; nothing moved on either side (the state's bytes, the seq, the users row)
  assert.deepEqual(ctx.world.rename(g.id, n.name, keep(g, n.name)), { refused: 'taken' });
  assert.equal(stateSans(ctx.world.state), before); assert.equal(ctx.world.seq, seq0);
  assert.equal(ctx.db.sessionUser(auth.tokenHash(g.token), t0).name, g.name);
  assert.deepEqual(rowsOf(ctx).filter((r) => r.type === 'renameAccount'), [], 'no journal row');
  // the keep: the account and her girl wear the name, the row too; one journal row went in and the snapshot pruned it
  const N = `K_${nonce().slice(0, 8)}`;
  assert.deepEqual(ctx.world.rename(g.id, N, keep(g, N)), { renamed: true });
  assert.equal(ctx.world.state.accounts[j.accountId].name, N); assert.equal(ctx.world.state.whores[wid].name, N);
  assert.equal(ctx.world.seq, seq0 + 1); assert.equal(ctx.world.snapSeq, ctx.world.seq, 'snapshotted at once');
  assert.deepEqual(rowsOf(ctx), [], 'the renameAccount row is pruned: a rollback to the build before this one has nothing to replay');
  const row = ctx.db.sessionUser(auth.tokenHash(g.token), t0);
  assert.equal(row.name, N); assert.equal(row.guest_expires_at, null);
  assert.equal(JSON.parse(ctx.db.world.get(1).state).accounts[j.accountId].name, N, 'the snapshot carries it');
  assert.ok(ctx.world.players(50).some((r) => r.name === N) && !ctx.world.players(50).some((r) => r.name === g.name));
  assert.equal(L.getView(ctx.world.state, k.wid, { logTail: 0 }).timeline.rivals.find((r) => r.id === wid).name, N, 'K sees the new name');
  // a second keep on the same row: kept already, nothing written, no journal row
  assert.deepEqual(ctx.world.rename(g.id, `K_${nonce().slice(0, 8)}`, keep(g, 'x')), { refused: 'kept' });
  assert.equal(ctx.world.seq, seq0 + 1); assert.equal(ctx.world.state.accounts[j.accountId].name, N);
  // a guest who never joined: the row alone
  const N2 = `K_${nonce().slice(0, 8)}`;
  assert.deepEqual(ctx.world.rename(n.id, N2, keep(n, N2)), { renamed: false });
  assert.equal(ctx.db.sessionUser(auth.tokenHash(n.token), t0).name, N2); assert.equal(ctx.world.seq, seq0 + 1);
  // the restart agrees, and the engine's mut carries the move so a row that was not pruned would replay
  assert.equal(typeof L.mut.renameAccount, 'function');
  const bytes = stateSans(ctx.world.state);
  ctx.world.stop(); ctx.db.close();
  ctx = await reopen(ctx);
  assert.equal(stateSans(ctx.world.state), bytes);
  assert.equal(ctx.world.state.whores[wid].name, N);
  // and a renameAccount row left in the journal (a snapshot that failed after the keep) replays to the same name
  ctx.db.world.journalInsert(1, { seq: ctx.world.seq + 1, account: j.accountId, type: 'renameAccount', args: J([j.accountId, 'Late_Name']), clock: ctx.world.state.clock, at: ctx.clock.t, nonce: null });
  ctx.db.tx(() => ctx.db.world.cas(1, ctx.world.seq, ctx.world.seq + 1, ctx.world.rev + 1));
  ctx.world.abandon(); // no stop: a stop's snapshot would fold the row
  ctx = await reopen(ctx, { takeoverLock: true });
  assert.equal(ctx.world.state.accounts[j.accountId].name, 'Late_Name'); assert.equal(ctx.world.state.whores[wid].name, 'Late_Name');
  close(ctx);
});

test('T-rename-snapshot (the code review of batch 3b): when the keep\'s snapshot fails, nothing is written on either side: no renameAccount row is left in the journal (a rollback to the build before this one still starts), the users row stays a guest\'s under her old name, the state, the seq and the rev stay, one line is logged with no name, and the keep lands once the file takes snapshots again', async () => {
  const lines = [];
  let ctx = await fresh(1, { tlCap: 3, log: (l) => lines.push(l) });
  const t0 = ctx.clock.t;
  const g = guestOf(ctx, t0 + 7 * DAY);
  const j = ctx.world.join(g, 'dolly'); const wid = ctx.world.state.accounts[j.accountId].whores[0];
  assert.ok(ctx.world.snapshot('test'), 'the file holds her under her guest name');
  const bytes = stateSans(ctx.world.state); const seq0 = ctx.world.seq; const rev0 = ctx.world.rev;
  const keep = (name) => () => ctx.db.guests.keep({ userId: g.id, name, nameKey: name.toLowerCase(), passHash: 'scrypt$test' });
  const N = `K_${nonce().slice(0, 8)}`;
  // the snapshot's row write fails (the disk is full) at the keep
  const snap0 = ctx.db.world.snapshot;
  ctx.db.world.snapshot = () => { throw Object.assign(new Error('disk full'), { code: 'SQLITE_FULL' }); };
  let out = null; let threw = null;
  try { out = ctx.world.rename(g.id, N, keep(N)); } catch (e) { threw = e; }
  assert.deepEqual(rowsOf(ctx).filter((r) => r.type === 'renameAccount'), [], `a keep whose snapshot failed leaves no renameAccount row in the journal: the build before this one has no such action to replay (rename returned ${J(out)})`);
  assert.ok(threw && threw.name !== 'IllegalMove', `the keep fails loudly, so the player is told nothing landed (${threw && threw.message})`);
  const row = ctx.db.sessionUser(auth.tokenHash(g.token), t0);
  assert.equal(row.name, g.name, 'the users row keeps her guest name'); assert.notEqual(row.guest_expires_at, null, 'and she is a guest still');
  assert.equal(ctx.world.state.accounts[j.accountId].name, g.name); assert.equal(ctx.world.state.whores[wid].name, g.name);
  assert.equal(stateSans(ctx.world.state), bytes, 'the state is the one the file holds'); assert.equal(ctx.world.seq, seq0); assert.equal(ctx.world.rev, rev0); assert.equal(ctx.world.snapSeq, seq0);
  assert.equal(JSON.parse(ctx.db.world.get(1).state).accounts[j.accountId].name, g.name, 'the file too');
  assert.ok(ctx.world.snapshotFailedAt !== null, 'the failure is noted');
  assert.ok(lines.some((l) => /snapshot \(rename\) failed/.test(l)), `one line (${J(lines)})`);
  assert.ok(!lines.some((l) => l.includes(g.name) || l.includes(N)), 'no name in the log');
  // a restart from the file as it is agrees with memory: nothing to replay across
  ctx.db.world.snapshot = snap0;
  ctx.world.abandon(); // as a crash leaves the file
  ctx = await reopen(ctx, { takeoverLock: true });
  assert.equal(stateSans(ctx.world.state), bytes); assert.equal(ctx.world.state.accounts[j.accountId].name, g.name);
  // the file takes snapshots again: the keep lands, journaled and snapshotted at once, and a restart agrees
  assert.deepEqual(ctx.world.rename(g.id, N, keep(N)), { renamed: true });
  assert.equal(ctx.world.state.accounts[j.accountId].name, N); assert.equal(ctx.world.state.whores[wid].name, N);
  assert.equal(ctx.world.seq, seq0 + 1); assert.equal(ctx.world.snapSeq, seq0 + 1, 'snapshotted at once'); assert.deepEqual(rowsOf(ctx), [], 'pruned');
  assert.equal(ctx.db.sessionUser(auth.tokenHash(g.token), ctx.clock.t).guest_expires_at, null, 'kept');
  assert.equal(ctx.world.snapshotFailedAt, null);
  const after = stateSans(ctx.world.state);
  ctx.world.stop(); ctx.db.close();
  ctx = await reopen(ctx);
  assert.equal(stateSans(ctx.world.state), after); assert.equal(ctx.world.state.accounts[j.accountId].name, N);
  close(ctx);
});

test('T-guest-cap (the code review of batch 3b): the guest rooms are part of the world\'s, never all of them: a guest cap at or above the world cap refuses to open with one line naming both and takes no lock; below it the world opens with both; the same street by street (the fix round): LW_GUEST_TL_CAP at or above LW_TL_CAP refuses the same way', async () => {
  const dir = tmpDir('lw-world'); const file = path.join(dir, 'lw.sqlite');
  const db = await openDb(file);
  try {
    for (const [cap, guestCap] of [[3, 3], [3, 15], [1, 1], [10, 11]]) {
      await assert.rejects(openWorld(db, { rate: RATE1, log: noLog, fatal: fatalThrows, cap, guestCap }),
        (e) => e instanceof WorldRefusal && e.exitCode === 2 && e.message.includes(`LW_GUEST_CAP (${guestCap}) must be below LW_WORLD_CAP (${cap})`), `${guestCap} guest rooms of ${cap}`);
    }
    for (const [tlCap, guestTlCap] of [[3, 3], [3, 5], [1, 1], [10, 11]]) {
      await assert.rejects(openWorld(db, { rate: RATE1, log: noLog, fatal: fatalThrows, cap: 3, guestCap: 2, tlCap, guestTlCap }),
        (e) => e instanceof WorldRefusal && e.exitCode === 2 && e.message.includes(`LW_GUEST_TL_CAP (${guestTlCap}) must be below LW_TL_CAP (${tlCap})`), `${guestTlCap} guest seats of ${tlCap}`);
    }
    const world = await openWorld(db, { rate: RATE1, log: noLog, fatal: fatalThrows, cap: 3, guestCap: 2, tlCap: 3, guestTlCap: 2 }); // the refusals took no lock
    assert.equal(world.cap, 3); assert.equal(world.guestCap, 2); assert.equal(world.tlCap, 3); assert.equal(world.guestTlCap, 2);
    world.stop();
  } finally { db.close(); rmDir(dir); }
});

test('T-sweep-tx (the fix round of batch 3b): the sweep\'s work for one guest is one transaction: when the delete of her sessions fails (SQLITE_FULL) the retirement snapshot, the member delete and the rev advance roll back with it, so her girl stays live in memory and in the file, her seat, her member row, her session, the rev and the row\'s rev stay, one line is logged with no name, and the next sweep retires her; a failing member delete and a failing snapshot write roll back the same way', async () => {
  const lines = [];
  let ctx = await fresh(1, { tlCap: 3, log: (l) => lines.push(l) });
  const t0 = ctx.clock.t;
  const g = guestOf(ctx, t0 + 7 * DAY);
  const r = ctx.world.join(g, 'dolly'); const wid = ctx.world.state.accounts[r.accountId].whores[0];
  const seat = Object.keys(ctx.world.state.timelines.victorian.seats)[0];
  ctx.world.state.timelines.victorian.seats[seat].holder = wid;
  assert.ok(ctx.world.snapshot('test'), 'the file holds her live');
  const bytes = stateSans(ctx.world.state); const rev0 = ctx.world.rev; const seq0 = ctx.world.seq;
  const t7 = t0 + 7 * DAY; const HOUR = 3_600_000;
  const full = () => { throw Object.assign(new Error('disk full'), { code: 'SQLITE_FULL' }); };
  const unchanged = (what) => {
    assert.equal(ctx.world.state.whores[wid].retired, false, `${what}: her girl stays live in memory`);
    assert.equal(ctx.world.state.timelines.victorian.seats[seat].holder, wid, `${what}: and keeps her seat`);
    assert.equal(stateSans(ctx.world.state), bytes, `${what}: the state is the one before the sweep`);
    assert.equal(ctx.world.rev, rev0, `${what}: the rev did not move`); assert.equal(ctx.db.world.get(1).rev, rev0, `${what}: nor the row's`); assert.equal(ctx.world.seq, seq0);
    assert.equal(ctx.world.isMember(g.id), true, `${what}: the member row stays in memory`); assert.ok(ctx.db.world.members(1).some((m) => m.user_id === g.id), `${what}: and in the file`);
    assert.equal(sessionLive(ctx, g), true, `${what}: and her session`);
    assert.equal(JSON.parse(ctx.db.world.get(1).state).whores[wid].retired, false, `${what}: the file holds her live too`);
    assert.deepEqual(ctx.world.crowd(), { victorian: 1, wildwest: 0, vegas: 0 });
    assert.equal(ctx.world.guestMembers(), 1, `${what}: her seat is held until the sweep lands`);
  };
  const sweep = (t, what) => {
    let out = null; let threw = null;
    try { out = ctx.world.sweepGuests(t); } catch (e) { threw = e; }
    assert.equal(threw, null, `${what}: the sweep never throws; a failed write is one line and the next hour (${threw && threw.message})`);
    return out;
  };
  // the delete of her sessions fails inside the transaction: the retirement snapshot written before it rolls back too
  const del0 = ctx.db.guests.deleteSessionsOf;
  ctx.db.guests.deleteSessionsOf = full;
  assert.deepEqual(sweep(t7, 'sessions'), { swept: 0, retired: 0 }, 'nothing counted: the transaction rolled back');
  ctx.db.guests.deleteSessionsOf = del0;
  unchanged('sessions');
  assert.equal(lines.filter((l) => /guest sweep stopped before a retirement/.test(l)).length, 1, `one line, counts only (${J(lines)})`);
  assert.ok(!lines.some((l) => l.includes(g.name)), 'no name in the log');
  // the delete of her member row fails
  const mdel0 = ctx.db.guests.memberDelete;
  ctx.db.guests.memberDelete = full;
  assert.deepEqual(sweep(t7 + HOUR, 'member'), { swept: 0, retired: 0 });
  ctx.db.guests.memberDelete = mdel0;
  unchanged('member');
  // the snapshot's row write fails: the fold before the retirement lands, the one inside the transaction does not
  const snap0 = ctx.db.world.snapshot; let calls = 0;
  ctx.db.world.snapshot = (...args) => { calls++; if (calls === 2) full(); return snap0(...args); };
  assert.deepEqual(sweep(t7 + 2 * HOUR, 'snapshot'), { swept: 0, retired: 0 });
  assert.equal(calls, 2, 'the fold, then the one inside the transaction');
  ctx.db.world.snapshot = snap0;
  unchanged('snapshot');
  assert.equal(lines.filter((l) => /guest sweep stopped before a retirement/.test(l)).length, 3, `three lines (${J(lines)})`);
  assert.ok(!lines.some((l) => l.includes(g.name)), 'no name in the log');
  // the file takes every write again: the next sweep retires her in one transaction, and a restart agrees
  assert.deepEqual(sweep(t7 + 3 * HOUR, 'landed'), { swept: 1, retired: 1 });
  assert.equal(ctx.world.state.whores[wid].retired, true); assert.equal(ctx.world.state.timelines.victorian.seats[seat].holder, null, 'the seat is vacated');
  assert.equal(ctx.world.rev, rev0 + 1); assert.equal(ctx.db.world.get(1).rev, rev0 + 1, 'the row\'s rev moved with it');
  assert.equal(ctx.world.isMember(g.id), false); assert.ok(!ctx.db.world.members(1).some((m) => m.user_id === g.id)); assert.equal(sessionLive(ctx, g), false);
  assert.equal(JSON.parse(ctx.db.world.get(1).state).whores[wid].retired, true, 'the file holds the retirement');
  assert.equal(ctx.world.snapSeq, ctx.world.seq, 'snapshotted at once'); assert.equal(ctx.world.guestMembers(), 0, 'her seat is free');
  const after = stateSans(ctx.world.state);
  ctx.world.stop(); ctx.db.close();
  ctx = await reopen(ctx);
  assert.equal(stateSans(ctx.world.state), after); assert.equal(ctx.world.rev, rev0 + 1); assert.equal(ctx.world.isMember(g.id), false);
  close(ctx);
});

test('T-guest-tl-crowd (the fix round of batch 3b): a guest seat is held while her member row stands, her date passed or not: guestMembers and guestCrowd count an expired, unswept guest until the sweep removes her and never a kept account; a guest\'s payload leaves a street whose guest seats are taken out of canOpen while a kept player\'s keeps it; the keep frees her seat at once', async () => {
  const ctx = await fresh(2, { tlCap: 3, guestTlCap: 1 });
  assert.equal(typeof ctx.world.guestCrowd, 'function', 'the world counts guest girls per street');
  assert.equal(ctx.world.guestTlCap, 1);
  const t0 = ctx.clock.t;
  const gA = guestOf(ctx, t0 + 7 * DAY); // a guest with days left
  const gB = guestOf(ctx, t0 - 1); // past her date already, and unswept until the sweep runs
  const gC = guestOf(ctx, t0 + 7 * DAY); // the one whose canOpen is read
  const k = joined(ctx, 0); // a kept member on victorian
  const a = ctx.world.join(gA, 'dolly'); ctx.world.join(gB, 'jackie'); const c = ctx.world.join(gC, 'fanny');
  assert.ok(a.accountId && c.accountId);
  assert.deepEqual(ctx.world.crowd(), { victorian: 2, wildwest: 1, vegas: 1 });
  assert.equal(ctx.world.guestMembers(), 3, 'three guests hold a member row: B counts, her date passed, until the sweep');
  assert.deepEqual(ctx.world.guestCrowd(), { victorian: 1, wildwest: 1, vegas: 1 }, 'their girls per street; K, kept, is not among them');
  // a second slot for C and for K (set as the unlock would): victorian and vegas are guest-full for C alone (A on the
  // one, B on the other, expired or not), while K is offered every street but her own
  ctx.world.state.accounts[c.accountId].slots = 2; ctx.world.state.accounts[k.accountId].slots = 2;
  assert.deepEqual(ctx.world.payload(c.accountId, { tick: 0, guest: true }).account.canOpen, [], 'C: no street has a guest seat left');
  assert.deepEqual(ctx.world.payload(c.accountId, { tick: 0 }).account.canOpen, ['dolly', 'jackie'], 'read without the flag: the seat count alone');
  assert.deepEqual(ctx.world.payload(k.accountId, { tick: 0, guest: false }).account.canOpen, ['fanny', 'jackie'], 'K: a kept player is never held by the guest seats');
  // the sweep removes B: her seat is free, and C may open vegas
  assert.deepEqual(ctx.world.sweepGuests(t0), { swept: 1, retired: 1 });
  assert.equal(ctx.world.guestMembers(), 2); assert.deepEqual(ctx.world.guestCrowd(), { victorian: 1, wildwest: 1, vegas: 0 });
  assert.deepEqual(ctx.world.payload(c.accountId, { tick: 0, guest: true }).account.canOpen, ['jackie']);
  // A keeps her game: a kept account at once, her girl no longer a guest's, and C may open victorian; the seat count
  // itself is unchanged, since she is still on the street
  const N = `K_${nonce().slice(0, 8)}`;
  assert.deepEqual(ctx.world.rename(gA.id, N, () => ctx.db.guests.keep({ userId: gA.id, name: N, nameKey: N.toLowerCase(), passHash: 'scrypt$test' })), { renamed: true });
  assert.equal(ctx.world.guestMembers(), 1, 'C alone'); assert.deepEqual(ctx.world.guestCrowd(), { victorian: 0, wildwest: 1, vegas: 0 });
  assert.deepEqual(ctx.world.crowd(), { victorian: 2, wildwest: 1, vegas: 0 });
  assert.deepEqual(ctx.world.payload(c.accountId, { tick: 0, guest: true }).account.canOpen, ['dolly', 'jackie']);
  close(ctx);
});

test('T-window (a pin for the replay, B3 item 7): three humans on one street with the house, 48 District hours away: the last 200 events the payload sends still hold her newest payout and its Curtain, with eventsGap true', async () => {
  const ctx = await fresh(3, { tlCap: 3, logLimit: 8000 });
  const a = joined(ctx, 0); joined(ctx, 1); joined(ctx, 2);
  ctx.world.apply(a.accountId, 'sealPlan', [a.wid, bestPlan(ctx.world.state, a.wid)], nonce());
  const left = ctx.world.state.tick;
  ctx.clock.t += 48 * 60 * 60 * 1000; ctx.world.tick(); // 48 District hours at rate 1: sixteen Curtains on her street
  const s = ctx.world.state;
  assert.ok(s.timelines.victorian.curtainNo >= 16, `${s.timelines.victorian.curtainNo} Curtains`);
  const all = L.eventsFor(s, a.accountId, left);
  assert.ok(all.length > 200, `${all.length} visible events since she left`);
  const payouts = all.filter((e) => e.type === 'payout' && e.whores[0] === a.wid);
  assert.ok(payouts.length >= 16, `${payouts.length} payouts of hers`);
  const newest = payouts[payouts.length - 1];
  const p = ctx.world.payload(a.accountId, { tick: left, all: true });
  assert.equal(p.events.length, 200); assert.equal(p.eventsGap, true);
  assert.ok(p.events.some((e) => e.id === newest.id), 'her newest payout is inside the window');
  assert.ok(p.events.some((e) => e.type === 'curtain' && e.timeline === 'victorian' && e.curtain === newest.curtain), 'and its Curtain');
  assert.ok(p.events.filter((e) => e.id > newest.id).length < 100, `${p.events.filter((e) => e.id > newest.id).length} events after it`);
  close(ctx);
});

test('payload: focus-only by default, all=1 every live girl, boards and digest on demand, curtains for every Timeline, canOpen filtered by the Timeline cap', async () => {
  const ctx = await fresh(3, { tlCap: 2 });
  const a = joined(ctx, 0); joined(ctx, 1); joined(ctx, 2);
  const p = ctx.world.payload(a.accountId, { tick: 0 });
  assert.deepEqual(Object.keys(p.views), [a.wid]); assert.deepEqual(Object.keys(p.legal), [a.wid]); assert.equal(p.focus, a.wid);
  assert.deepEqual(Object.keys(p.curtains).sort(), [...C.TIMELINE_IDS].sort());
  assert.equal(p.curtains.victorian.humans, 3); assert.equal(p.curtains.vegas.humans, 0); assert.equal(p.curtains.victorian.nextCurtainAt, 180);
  assert.deepEqual(Object.keys(p.curtains.victorian.sealing).sort(), ['activeSealed', 'activeTotal', 'lastAt', 'sealed', 'total']);
  // the seal line counts people: three humans, none sealed, whatever the house players at the table
  assert.equal(p.curtains.victorian.sealing.activeTotal, 3); assert.equal(p.curtains.victorian.sealing.activeSealed, 0);
  assert.ok(p.curtains.victorian.sealing.total > 3 && p.curtains.victorian.sealing.sealed === p.curtains.victorian.sealing.total - 3, J(p.curtains.victorian.sealing));
  // who else is in the era tonight: every human's nom de plume, sorted, names only (the plan screen lists the others)
  assert.deepEqual(p.curtains.victorian.humanNames, ctx.users.map((u) => u.name).sort((x, y) => x.localeCompare(y)));
  assert.deepEqual(p.curtains.vegas.humanNames, []);
  ctx.world.apply(a.accountId, 'sealPlan', [a.wid, bestPlan(ctx.world.state, a.wid)], nonce());
  const p2 = ctx.world.payload(a.accountId, { tick: 0 });
  assert.equal(p2.curtains.victorian.sealing.activeSealed, 1); assert.equal(p2.curtains.victorian.sealing.activeTotal, 3);
  assert.deepEqual(p2.curtains.victorian.humanNames, p.curtains.victorian.humanNames, 'a seal changes no name and adds nothing to the list');
  assert.ok(!('whorescore' in p) && !('boards' in p) && !('digest' in p));
  assert.equal(p.minPerSec, '1.000000000'); assert.equal(p.epochMs, ctx.world.clockEpochMs); assert.equal(p.serverNow, ctx.clock.t);
  assert.equal(p.views[a.wid].log.length, 0, 'logTail 0');
  const q = ctx.world.payload(a.accountId, { all: true, boards: true, digest: true, tick: 0 });
  assert.ok(q.whorescore && q.boards && q.digest && q.digest.victorian && Array.isArray(q.digest.victorian.headlines));
  assert.ok(q.boards.whorescore.some((r) => r.account === a.accountId));
  assert.deepEqual(ctx.world.crowd(), { victorian: 3, wildwest: 0, vegas: 0 });
  // canOpen: no second girl yet (slots), but the filter is proven on the crowd side through join's steer in api.test
  assert.deepEqual(q.account.canOpen, []);
  // the leak walk over the whole payload: no hand, draw, discard, known or plan of another human
  const others = Object.values(ctx.world.state.whores).filter((w) => w.account !== a.accountId && ctx.world.state.accounts[w.account].kind === 'human');
  walk(q, (v, pth) => { for (const o of others) assert.ok(!pth.includes(`.${o.id}.hand`) && !pth.includes(`.${o.id}.draw`) && !pth.includes(`.${o.id}.known`), pth); });
  const text = J(q); assert.ok(!text.includes(ctx.world.state.seed));
  close(ctx);
});

test('players: the Whorescore board from the world, house rows tagged, lastActive to the hour for humans, the account\'s face is its best girl', async () => {
  const ctx = await fresh(2);
  const a = joined(ctx, 0); const b = joined(ctx, 1, 'jackie');
  ctx.world.apply(a.accountId, 'sealPlan', [a.wid, bestPlan(ctx.world.state, a.wid)], nonce());
  ctx.world.apply(b.accountId, 'sealPlan', [b.wid, bestPlan(ctx.world.state, b.wid)], nonce());
  ctx.clock.t += 200 * 1000; ctx.world.tick();
  const rows = ctx.world.players(50);
  assert.ok(rows.length >= 2);
  for (const r of rows) { assert.deepEqual(Object.keys(r).sort(), ['house', 'lastActive', 'name', 'rank', 'road', 'tier', 'timelines', 'title', 'whorescore']); assert.ok(!/clementine|bettie|AUTOMATON/i.test(r.name)); }
  rows.forEach((r, i) => assert.equal(r.rank, i + 1));
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].whorescore >= rows[i].whorescore);
  const ha = rows.find((r) => r.name === ctx.users[0].name); const hb = rows.find((r) => r.name === ctx.users[1].name);
  assert.ok(ha && hb); assert.equal(ha.house, false); assert.deepEqual(ha.timelines, ['victorian']); assert.deepEqual(hb.timelines, ['vegas']);
  const m = ctx.db.world.members(1).find((x) => x.account_id === a.accountId);
  assert.equal(ha.lastActive, Math.floor(m.last_active_at / 3_600_000) * 3_600_000);
  for (const r of rows.filter((x) => x.house)) assert.equal(r.lastActive, null);
  assert.ok(rows.some((r) => r.house), 'house players listed');
  assert.equal(ctx.world.players(1).length, 1);
  close(ctx);
});

test('T-forecast: payload.forecast holds labels and counts for her Timeline; humans never counted; A\'s forecast is identical before and after B seals', async () => {
  const ctx = await fresh(2);
  const a = joined(ctx, 0);
  const s = ctx.world.state;
  const places = [...C.TIMELINES.victorian.places].sort();
  const p0 = ctx.world.payload(a.accountId, {});
  assert.ok(p0.forecast, 'forecast on the wire');
  assert.deepEqual(Object.keys(p0.forecast), [a.wid], 'one entry per view');
  const f0 = p0.forecast[a.wid];
  assert.deepEqual(Object.keys(f0).sort(), ['counts', 'known', 'labels'], 'labels, counts and known only: no follower, followerCan or possible');
  for (const k of ['labels', 'counts', 'known']) assert.deepEqual(Object.keys(f0[k]).sort(), places, `${k} keyed by her Timeline's Places`);
  for (const pid of places) {
    assert.ok(['quiet', 'a few', 'busy'].includes(f0.labels[pid]), f0.labels[pid]);
    assert.ok(Number.isInteger(f0.counts[pid]) && f0.counts[pid] >= 0, `${pid}: ${f0.counts[pid]}`);
    assert.ok(Array.isArray(f0.known[pid]));
  }
  const house = Object.values(s.whores).filter((w) => w.timeline === 'victorian' && !w.retired && s.accounts[w.account].kind !== 'human');
  const sum = (f) => places.reduce((t, pid) => t + f.counts[pid], 0);
  assert.ok(sum(f0) >= 1 && sum(f0) <= house.length, `${sum(f0)} counted of ${house.length} house girls`);
  // B joins the same street: no count moves (humans are never counted)
  const b = joined(ctx, 1);
  const f1 = ctx.world.payload(a.accountId, {}).forecast[a.wid];
  assert.deepEqual(f1.counts, f0.counts, 'B joining moved a count'); assert.deepEqual(f1.labels, f0.labels);
  // her own knowledge: a Studied Habit names where that rival is heading, with her last Sway (null until Gossip or a Curtain)
  const lavinia = Object.values(s.whores).find((w) => w.char === 'lavinia');
  ctx.world.apply(a.accountId, 'study', [a.wid, lavinia.id], nonce());
  const f2 = ctx.world.payload(a.accountId, {}).forecast[a.wid];
  const entries = places.flatMap((pid) => f2.known[pid].map((k) => ({ pid, ...k })));
  const lav = entries.find((k) => k.id === lavinia.id);
  assert.ok(lav, 'the Studied rival is in known'); assert.equal(lav.why, 'habit'); assert.equal(lav.name, lavinia.name); assert.equal(lav.lastSway, null);
  assert.equal(L.CONTENT.PLACES[lav.pid].kind, 'posh', 'her Posh Habit');
  for (const k of entries) {
    const st = ctx.world.state;
    assert.ok(st.whores[k.id] && st.accounts[st.whores[k.id].account].kind !== 'human', `${k.id}: a human in known`);
    assert.ok(['gossip', 'habit'].includes(k.why), k.why); assert.ok(k.lastSway === null || Number.isInteger(k.lastSway));
  }
  // B seals while A is unsealed, so the Curtain stays up: A's forecast is the same bytes before and after, and never names B
  const before = J(f2);
  ctx.world.apply(b.accountId, 'sealPlan', [b.wid, bestPlan(ctx.world.state, b.wid)], nonce());
  const sb = ctx.world.state;
  assert.ok(sb.whores[b.wid].plan && sb.whores[b.wid].plan.sealed, 'B is sealed'); assert.ok(!sb.whores[a.wid].plan, 'A is not');
  const frozen = stateSans(sb);
  const p3 = ctx.world.payload(a.accountId, { all: true, boards: true, digest: true, tick: 0 });
  assert.equal(stateSans(ctx.world.state), frozen, 'the read side moved the state');
  assert.equal(J(p3.forecast[a.wid]), before, 'B sealing moved A\'s forecast');
  assert.deepEqual(Object.keys(p3.forecast), Object.keys(p3.views), 'all=1: one entry per view');
  const text = J(p3.forecast);
  assert.ok(!text.includes(b.wid) && !text.includes(b.accountId) && !text.includes(ctx.users[1].name), 'B on A\'s forecast');
  // B's own forecast is hers alone
  const pb = ctx.world.payload(b.accountId, {});
  assert.deepEqual(Object.keys(pb.forecast), [b.wid]); assert.ok(!J(pb.forecast).includes(a.wid));
  close(ctx);
});
