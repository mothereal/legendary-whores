// T-swarm (ARENA-SPEC section 9.3): 30 bot accounts driven from their own legalActions for 7 District days at rate 60,
// in-process on a temp file with a fake clock. Prints state bytes, heapUsed before and after a full GC, RSS, act p95 and
// payload bytes for the unit's memory comment; binding: no throw but the engine's own refusals, every payload passes the
// leak walk, the state under 8 MB, the heap after a full GC under HEAP_CAP_MB.
//
// The swarm runs in a child spawned with --expose-gc (node --test gives a test file no V8 flags), so the heap is measured
// after global.gc() and the number is the live set, not whatever garbage the last Curtain left (before a GC the figure
// swung from 41 to 181 MB across three runs of this build, and the Codex review measured 259 MB). The bound is 1.5 times
// the largest after-GC figure measured:
//   Node 25.8.1 (the build machine, a Mac, 9 October 2026), six runs: 16889144, 18019744 and 16922192 bytes (16.11, 17.18
//   and 16.14 MB), and 16, 17 and 16 MB rounded.
//   Node 22.22.2 (the production box, 9 October 2026): 18.86 MB after GC (act p95 98.65 ms there).
// Node 24 has no figure yet: its first after-GC figure belongs here, and the bound is 1.5 times the largest of them all.
process.env.LW_DEV = '1';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import * as L from '../../engine/rules.js';
import { openDb } from '../db.mjs';
import { openWorld } from '../world.mjs';
import { makeUser, nonce, rmDir, tmpDir, walk } from './helpers.mjs';

const C = L.CONTENT;
const J = JSON.stringify;
const BOTS = 30; const DAYS = 7;
// measured after GC 17.18 MB on Node 25.8.1 (Mac) and 18.86 MB on Node 22.22.2 (the production box, 2026-10-09; act p95
// 98.65 ms there); cap = 1.5 x the larger (28.29 MB, rounded up)
const HEAP_CAP_MB = 29;
const RATE = { num: 60, den: 1 }; // one District minute every 1000/60 ms: a day is 24 real seconds on the fake clock
const SELF = fileURLToPath(import.meta.url);
const MB = (b) => Math.round(b / 1048576);
const MB2 = (b) => (b / 1048576).toFixed(2);

// The swarm itself: returns the figures; throws on a leak-walk failure or an unexpected engine throw.
async function runSwarm() {
  const dir = tmpDir('lw-swarm'); const file = path.join(dir, 'lw.sqlite');
  let t = Date.UTC(2026, 9, 9, 6); const now = () => t;
  const db = await openDb(file);
  const users = []; for (let i = 0; i < BOTS; i++) users.push(makeUser(db));
  const world = await openWorld(db, { rate: RATE, now, log: () => {}, logLimit: 8000 });
  world.start();
  const starters = ['dolly', 'fanny', 'jackie'];
  const bots = users.map((u, i) => { const r = world.join(u, starters[i % 3]); return { u, id: r.accountId, wid: world.state.accounts[r.accountId].whores[0], kind: ['heavy', 'light', 'absent'][i % 3], tick: 0, rev: 0 }; });
  let x = 12345; const rnd = () => { x = (x + 0x6D2B79F5) >>> 0; let y = Math.imul(x ^ (x >>> 15), x | 1); y ^= y + Math.imul(y ^ (y >>> 7), y | 61); return ((y ^ (y >>> 14)) >>> 0) / 4294967296; };
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const actMs = []; let acts = 0; let refused = 0; let payloads = 0; let payloadBytes = 0; let maxPayload = 0;
  const leakWalk = (p, bot) => {
    const others = bots.filter((b) => b !== bot).map((b) => b.wid);
    walk(p, (v, pth) => {
      for (const o of others) assert.ok(!pth.startsWith(`.views.${o}.`), `another bot's view at ${pth}`);
      if (/\.(hand|draw|discard|known|plan)\b/.test(pth) && !pth.startsWith(`.views.${bot.wid}.`) && !/\.legal\./.test(pth)) assert.ok(/lastCharmed\.cards|\.whore\./.test(pth), pth);
    });
    assert.ok(!('seed' in p) && !('rng' in p) && !('seq' in p));
    for (const e of p.events) assert.ok(e.vis === 'all' || e.vis.includes(bot.id));
  };
  const argsFor = (s, bot, d) => {
    switch (d.type) {
      case 'study': return [bot.wid, d.target];
      case 'explore': return [bot.wid, d.place];
      case 'buyCard': return [bot.wid, d.card];
      case 'cure': return [bot.wid, d.affliction];
      case 'spendGossip': return [bot.wid, d.rival];
      case 'startAssignation': return [bot.wid, d.gent];
      case 'playAssignation': { const v = L.getView(s, bot.wid); return [bot.wid, { cards: L.bestGuess(v, { gent: d.gent }).cards }]; }
      case 'planEvening': { const v = L.getView(s, bot.wid); return [bot.wid, { place: d.place, cards: L.bestGuess(v, d.place).cards }]; }
      case 'useTalent': return [bot.wid, { kind: d.kind }];
      case 'buyOffer': case 'passOffer': case 'cancelAssignation': case 'dealLent': case 'buySpecial': case 'buyDigs': case 'unseal': case 'sealPlan': return [bot.wid];
      default: return null;
    }
  };
  const actsAt = (bot, hour) => (bot.kind === 'heavy' ? [8, 13, 20].includes(hour) : bot.kind === 'light' ? hour === 19 : false);
  for (let day = 0; day < DAYS; day++) {
    for (let hour = 0; hour < 24; hour++) {
      for (const bot of bots) {
        if (!actsAt(bot, hour)) continue;
        // poll first, as the client would: the payload and its leak walk
        const p = world.payload(bot.id, { tick: bot.tick, boards: hour === 20, digest: true });
        payloads++; const bytes = J(p).length; payloadBytes += bytes; maxPayload = Math.max(maxPayload, bytes); bot.tick = p.tick;
        leakWalk(p, bot);
        for (let k = 0; k < 4; k++) {
          const legal = L.legalActions(world.state, bot.wid).filter((d) => !['switchTimeline', 'challengeSeat', 'unseal'].includes(d.type));
          if (!legal.length) break;
          const d = k === 3 && legal.some((z) => z.type === 'sealPlan') ? legal.find((z) => z.type === 'sealPlan') : pick(legal);
          const args = argsFor(world.state, bot, d); if (!args) continue;
          const t0 = performance.now();
          try { world.apply(bot.id, d.type, args, nonce()); acts++; } catch (e) { if (e.name !== 'IllegalMove') throw e; refused++; }
          actMs.push(performance.now() - t0);
        }
      }
      t += 60 * 1000 / 60 * 1; // one District hour at rate 60 is one real second
      world.tick();
    }
  }
  world.snapshot('end');
  const stateBytes = J(world.state).length;
  const before = process.memoryUsage();
  const gcRan = typeof global.gc === 'function';
  if (gcRan) global.gc();
  const after = process.memoryUsage();
  actMs.sort((a, b) => a - b);
  const p95 = actMs[Math.floor(actMs.length * 0.95)] || 0;
  const health = world.health();
  const out = {
    acts, refused, p95: Number(p95.toFixed(2)), stateBytes, heapBeforeGc: before.heapUsed, heapAfterGc: after.heapUsed, gcRan, rss: after.rss,
    payloads, meanPayload: Math.round(payloadBytes / payloads), maxPayload, curtains: Object.values(world.state.timelines).map((T) => T.curtainNo),
    day: world.state.day, seq: world.seq, log: world.state.log.length, healthOk: health.ok,
  };
  world.stop(); db.close(); rmDir(dir);
  return out;
}
const lineOf = (r) => `T-swarm: ${BOTS} bots, ${DAYS} days, ${r.acts} acts (${r.refused} refused), act p95 ${r.p95.toFixed(2)} ms, state ${r.stateBytes} bytes, ` +
  `heapUsed ${MB(r.heapBeforeGc)} MB before GC, ${MB2(r.heapAfterGc)} MB (${r.heapAfterGc} bytes) after GC against a cap of ${HEAP_CAP_MB} MB${r.gcRan ? '' : ' (no --expose-gc: not collected)'}, rss ${MB(r.rss)} MB, ` +
  `payloads ${r.payloads} mean ${r.meanPayload} bytes max ${r.maxPayload} bytes, curtains ${r.curtains.join('/')}, seq ${r.seq}, log ${r.log}`;

if (process.env.LW_SWARM_CHILD === '1') {
  // the child: the swarm, one JSON line of figures on stdout; a throw is exit 1 with the stack on stderr
  const r = await runSwarm();
  console.log(`SWARM ${J(r)}`);
} else {
  test(`T-swarm: ${BOTS} bots for ${DAYS} District days (a child with --expose-gc)`, async () => {
    const child = spawn(process.execPath, ['--expose-gc', '--disable-warning=ExperimentalWarning', SELF], {
      env: { PATH: process.env.PATH, TZ: process.env.TZ ?? 'UTC', LW_DEV: '1', LW_SWARM_CHILD: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = ''; let err = '';
    child.stdout.on('data', (c) => { out += c; });
    child.stderr.on('data', (c) => { err += c; });
    const code = await new Promise((resolve) => child.on('exit', (c) => resolve(c)));
    assert.equal(code, 0, `the swarm child exited ${code}\n${err.slice(0, 4000)}`);
    const line = out.split('\n').find((l) => l.startsWith('SWARM '));
    assert.ok(line, `no figures from the child\n${out.slice(0, 2000)}\n${err.slice(0, 2000)}`);
    const r = JSON.parse(line.slice(6));
    console.log(lineOf(r));
    assert.equal(r.gcRan, true, 'the child ran with --expose-gc');
    assert.ok(r.acts >= 1000, `${r.acts} acts`);
    assert.ok(r.stateBytes < 8 * 1048576, 'state under 8 MB');
    assert.ok(r.heapAfterGc < HEAP_CAP_MB * 1048576, `heap after a full GC under ${HEAP_CAP_MB} MB (measured ${MB2(r.heapAfterGc)} MB after GC, ${MB(r.heapBeforeGc)} MB before)`);
    assert.equal(r.day, DAYS);
    assert.ok(r.curtains.every((n) => n >= DAYS * 8), 'eight forced Curtains a day per Timeline');
    assert.equal(r.healthOk, true);
  });
}
