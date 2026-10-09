// T-swarm (ARENA-SPEC section 9.3): 30 bot accounts driven from their own legalActions for 7 District days at rate 60,
// in-process on a temp file with a fake clock. Prints state bytes, heapUsed, RSS, act p95 and payload bytes for the unit's
// memory comment; binding: no throw but the engine's own refusals, every payload passes the leak walk, the state under
// 8 MB, the heap under 200 MB.
process.env.LW_DEV = '1';
import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import * as L from '../../engine/rules.js';
import { openDb } from '../db.mjs';
import { openWorld } from '../world.mjs';
import { makeUser, nonce, rmDir, tmpDir, walk } from './helpers.mjs';

const C = L.CONTENT;
const J = JSON.stringify;
const BOTS = 30; const DAYS = 7;
const RATE = { num: 60, den: 1 }; // one District minute every 1000/60 ms: a day is 24 real seconds on the fake clock

test(`T-swarm: ${BOTS} bots for ${DAYS} District days`, async () => {
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
  const mem = process.memoryUsage();
  actMs.sort((a, b) => a - b);
  const p95 = actMs[Math.floor(actMs.length * 0.95)] || 0;
  const line = `T-swarm: ${BOTS} bots, ${DAYS} days, ${acts} acts (${refused} refused), act p95 ${p95.toFixed(2)} ms, state ${stateBytes} bytes, ` +
    `heapUsed ${Math.round(mem.heapUsed / 1048576)} MB, rss ${Math.round(mem.rss / 1048576)} MB, payloads ${payloads} mean ${Math.round(payloadBytes / payloads)} bytes max ${maxPayload} bytes, ` +
    `curtains ${Object.values(world.state.timelines).map((T) => T.curtainNo).join('/')}, seq ${world.seq}, log ${world.state.log.length}`;
  console.log(line);
  assert.ok(acts >= 1000, `${acts} acts`);
  assert.ok(stateBytes < 8 * 1048576, 'state under 8 MB');
  assert.ok(mem.heapUsed < 200 * 1048576, 'heap under 200 MB');
  assert.equal(world.state.day, DAYS);
  assert.ok(Object.values(world.state.timelines).every((T) => T.curtainNo >= DAYS * 8), 'eight forced Curtains a day per Timeline');
  const h = world.health(); assert.equal(h.ok, true);
  world.stop(); db.close(); rmDir(dir);
});
