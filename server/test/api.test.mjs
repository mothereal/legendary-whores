// The arena over HTTP (ARENA-SPEC section 9.3, api.test.mjs): server.mjs as a child on a temp file with LW_DEV=1, accounts
// written into the file before the child starts (the sign-up limiter is 5 an hour per address), a port from 20000 up,
// polled on /api/health. Run: node --test 'server/test/*.test.mjs'.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import * as L from '../../engine/rules.js';
import { openDb } from '../db.mjs';
import { ALLOWED, GREASE_TOP as VALIDATOR_GREASE_TOP, HELD_BACK, ID_RE } from '../validate.mjs';
import { openWorld } from '../world.mjs';
import { client, nonce, REPO, rmDir, runScript, seedUsers, sleep, startServer, tmpDir, walk, WORLD_SCRIPT } from './helpers.mjs';

const C = L.CONTENT;
const J = JSON.stringify;
// the most Grease Palms any girl may buy (the engine's greaseMax at the highest Notoriety): the validator's bound
const GREASE_TOP = L.greaseMax({ notoriety: Number.MAX_SAFE_INTEGER });
const DENIED = ['resolveCurtain', 'advanceClock', 'sleepTillDawn', 'endSeason', 'stageRival', 'newGame', 'joinWorld', 'rummage', ...HELD_BACK];

// A child on a fresh file with `n` users, each with a client; opts.env on top of the dev baseline.
async function arena(n, env = {}) {
  const dir = tmpDir('lw-api');
  const file = path.join(dir, 'lw.sqlite');
  const users = await seedUsers(file, n);
  const server = await startServer({ LW_DB: file, ...env });
  const clients = users.map((u) => client(server, u.cookie));
  const anon = client(server);
  return { dir, file, users, server, clients, anon, close: async () => { await server.stop(); rmDir(dir); } };
}
const focusOf = (body) => body.focus;
const bestPlan = (view) => { const place = L.casualPlace(view); return { place, cards: L.bestGuess(view, place).cards }; };
async function untilCurtain(c, tl, k, ms = 15000) {
  const t0 = Date.now();
  for (;;) {
    const v = await c.view('tick=0');
    if (v.status === 200 && v.body.curtains[tl].curtainNo > k) return v.body;
    if (Date.now() - t0 > ms) throw new Error(`no Curtain within ${ms} ms (curtainNo ${v.body && v.body.curtains ? v.body.curtains[tl].curtainNo : '?'})`);
    await sleep(100);
  }
}

test('arena over HTTP: join, act, poll, profile, players, the allowlist, shapes, privacy, rng isolation, a Curtain', async (t) => {
  const A = await arena(4, { LW_MIN_PER_SEC: '60' }); // one District minute every 17 ms: the first grid Curtain in 3 s
  const [a, b, c] = A.clients;
  t.after(() => A.close());

  // the join limiter is 5 an hour per address and every request past the session check counts: five joins on this server
  await t.test('join: 401 without a session, 400 on a bad starter, 201 with the full payload; /api/me shows member and crowd; a second join is 409', async () => {
    assert.equal((await A.anon.join('dolly')).status, 401);
    assert.equal((await a.join('lavinia')).body.error.code, 'bad-request');
    const me0 = await a.get('/api/me');
    assert.equal(me0.body.user.member, false); assert.deepEqual(me0.body.crowd, { victorian: 0, wildwest: 0, vegas: 0 }); assert.equal(typeof me0.body.tlCap, 'number');
    const r = await a.join('dolly');
    assert.equal(r.status, 201, r.text);
    const p = r.body;
    assert.equal(p.account.name, A.users[0].name); assert.match(p.account.id, /^p[a-z2-7]{10}$/);
    assert.equal(Object.keys(p.views).length, 1); assert.equal(p.views[p.focus].whore.name, A.users[0].name, 'the nom de plume');
    assert.deepEqual(p.events.map((e) => e.type), ['joined', 'starter-chosen']);
    assert.equal(p.replayed, false); assert.equal(p.eventsGap, false); assert.ok(!('seq' in p)); assert.ok(!('boards' in p));
    assert.equal(p.minPerSec, '60.000000000');
    assert.equal((await a.join('dolly')).body.error.code, 'already-in-world');
    assert.equal((await a.get('/api/me')).body.user.member, true);
    assert.equal((await b.join('dolly')).status, 201); assert.equal((await c.join('dolly')).status, 201);
    assert.deepEqual((await a.get('/api/me')).body.crowd, { victorian: 3, wildwest: 0, vegas: 0 });
  });

  let aw; let bw; let aid; let bid;
  await t.test('T-allowlist: every denied name, the rummage alias and challengeSeat answer 400 unknown-action; an unknown name too', async () => {
    const v = await a.view(); aw = focusOf(v.body); aid = v.body.account.id;
    bw = focusOf((await b.view()).body); bid = (await b.view()).body.account.id;
    for (const name of [...DENIED, 'nonsense']) {
      const r = await a.act(name, [aw, 1]);
      assert.equal(r.status, 400, name); assert.equal(r.body.error.code, 'unknown-action', name);
    }
    assert.ok(!ALLOWED.some((n) => DENIED.includes(n)));
  });

  await t.test('T-shape: malformed bodies answer 400 and never reach the engine or echo what was sent; a baseline card not in her hand is illegal-move bad-baseline', async () => {
    const MARK = 'zq'.repeat(40); // longer than ID_RE admits: must never come back
    const lastNonceBefore = (await a.view()).body.account.lastNonce;
    const n = nonce();
    const good = { action: 'study', args: [aw, 'plunkett'], nonce: n, curtain: 0 };
    const bodies = [
      {}, [], 'x', { action: 'study' }, { action: 'study', args: [aw, 'plunkett'] }, { ...good, extra: 1 }, { ...good, nonce: 'short' }, { ...good, nonce: 12 },
      { ...good, nonce: n.toUpperCase() }, { ...good, nonce: `${n}0` }, { ...good, args: [] }, { ...good, args: [aw, 'plunkett', 1, 2] }, { ...good, args: 'plunkett' },
      { ...good, args: { 0: aw } }, { ...good, args: [aw, MARK] }, { ...good, args: [MARK, 'plunkett'] }, { ...good, args: [aw, 5] }, { ...good, args: [aw, null] },
      { ...good, args: [aw, { target: 'plunkett' }] }, { ...good, args: [aw, 'x'.repeat(3000)] }, { ...good, action: MARK }, { ...good, action: 7 },
      { action: 'explore', args: [aw, 'salon', { want: MARK, more: 1 }], nonce: n }, { action: 'explore', args: [aw, 'salon', 'salon'], nonce: n },
      { action: 'dropItem', args: [aw, 3], nonce: n }, { action: 'dropItem', args: [aw, '0'], nonce: n }, { action: 'dropItem', args: [aw, -1], nonce: n },
      { action: 'playAssignation', args: [aw, { cards: [] }], nonce: n }, { action: 'playAssignation', args: [aw, { cards: [0, 1, 2] }], nonce: n }, { action: 'playAssignation', args: [aw, { cards: ['0'] }], nonce: n },
      { action: 'playAssignation', args: [aw, { cards: [0], hand: [] }], nonce: n }, { action: 'useTalent', args: [aw, { kind: 'x', extra: 1 }], nonce: n }, { action: 'useTalent', args: [aw, 'quick-change'], nonce: n },
      { action: 'planEvening', args: [aw, { place: 'salon' }], nonce: n }, { action: 'planEvening', args: [aw, { place: 'salon', cards: [0, 1, 2, 3] }], nonce: n }, { action: 'planEvening', args: [aw, { place: 'salon', cards: [0], grease: GREASE_TOP + 1 }], nonce: n },
      { action: 'planEvening', args: [aw, { place: 'salon', cards: [0], stake: 'yes' }], nonce: n },
      { action: 'planEvening', args: [aw, { place: 'salon', cards: [0], baseline: [{ key: 'k', place: 'salon', cards: ['come-hither'], hand: ['come-hither'] }] }], nonce: n },
      { action: 'planEvening', args: [aw, { place: 'salon', cards: [0], baseline: [{ key: 'k', place: 'salon', cards: ['come-hither'], known: {} }] }], nonce: n },
      { action: 'planEvening', args: [aw, { place: 'salon', cards: [0], baseline: [{ key: 'k', place: 'salon', cards: ['not-a-card'] }] }], nonce: n },
      // an inherited name is not a card (own keys only), whatever Object.prototype says
      { action: 'planEvening', args: [aw, { place: 'salon', cards: [0], baseline: [{ key: 'k', place: 'salon', cards: ['__proto__'] }] }], nonce: n },
      { action: 'planEvening', args: [aw, { place: 'salon', cards: [0], baseline: [{ key: 'k', place: 'salon', cards: ['constructor'] }] }], nonce: n },
      { action: 'planEvening', args: [aw, { place: 'salon', cards: [0], baseline: [{ key: 'k', place: 'salon', cards: ['toString'] }] }], nonce: n },
      { action: 'markSeen', args: [aid, 'nowhere'], nonce: n }, { action: 'sealPlan', args: [aw, { place: 'salon', cards: [0], slumOk: 1 }], nonce: n },
      // an item is its id string and a Talent is the object validateTalent reads: the older int/string shapes are refused
      { action: 'planEvening', args: [aw, { place: 'salon', cards: [0], item: 3 }], nonce: n }, { action: 'planEvening', args: [aw, { place: 'salon', cards: [0], talent: 'double-entendre' }], nonce: n },
      { action: 'planEvening', args: [aw, { place: 'salon', cards: [0], talent: { kind: 'double-entendre', card: 0, art: 'wit', gent: 'x' } }], nonce: n },
      { action: 'planEvening', args: [aw, { place: 'salon', cards: [0], bribe: 'yes' }], nonce: n }, { action: 'playAssignation', args: [aw, { cards: [0], item: 0 }], nonce: n },
      { action: 'playAssignation', args: [aw, { cards: [0], talent: 'double-entendre' }], nonce: n },
    ];
    // each body above is refused for its own fault, so a girl-targeted one carries a well-formed curtain
    for (const b of bodies) if (b && typeof b === 'object' && !Array.isArray(b) && typeof b.action === 'string' && b.action !== 'markSeen' && !('curtain' in b)) b.curtain = 0;
    // the curtain (section 12.2): required on a girl-targeted action, a non-negative safe integer wherever it is sent
    bodies.push({ action: 'study', args: [aw, 'plunkett'], nonce: n }, { ...good, curtain: -1 }, { ...good, curtain: '0' }, { ...good, curtain: 1.5 }, { ...good, curtain: null },
      { ...good, curtain: 2 ** 53 }, { ...good, curtain: [0] }, { action: 'sealPlan', args: [aw], nonce: n }, { action: 'markSeen', args: [aid, 'victorian'], nonce: n, curtain: -1 });
    // markSeen's optional upTo (a tick): a non-negative safe integer, and nothing after it
    bodies.push({ action: 'markSeen', args: [aid, 'victorian', -1], nonce: n }, { action: 'markSeen', args: [aid, 'victorian', 1.5], nonce: n },
      { action: 'markSeen', args: [aid, 'victorian', 2 ** 53], nonce: n }, { action: 'markSeen', args: [aid, 'victorian', '5'], nonce: n },
      { action: 'markSeen', args: [aid, 'victorian', null], nonce: n }, { action: 'markSeen', args: [aid, 'victorian', 5, 6], nonce: n });
    assert.ok(bodies.length >= 40);
    for (const body of bodies) {
      const r = await a.post('/api/act', body);
      assert.equal(r.status, 400, J(body)); assert.ok(['bad-request', 'unknown-action', 'bad-json'].includes(r.body.error.code), J(body));
      assert.ok(!r.text.includes(MARK), 'a client string came back');
    }
    const protoBody = '{"action":"study","args":["' + aw + '","plunkett"],"nonce":"' + n + '","__proto__":{"x":1}}';
    const rp = await a.post('/api/act', protoBody);
    assert.equal(rp.status, 400); assert.equal(rp.body.error.code, 'bad-json');
    // an accepted act always writes her last_nonce in the journal's transaction: none of these did
    assert.equal((await a.view()).body.account.lastNonce, lastNonceBefore, 'nothing reached the engine');
    // E20: a baseline card not in her hand
    const v = (await a.view()).body.views[aw];
    const notHeld = Object.keys(C.CARDS).find((cid) => !v.whore.hand.some((h) => h.id === cid));
    const rb = await a.act('planEvening', [aw, { place: L.casualPlace(v), cards: L.bestGuess(v, L.casualPlace(v)).cards, baseline: [{ key: 'k', place: L.casualPlace(v), cards: [notHeld] }] }]);
    assert.equal(rb.status, 400); assert.equal(rb.body.error.code, 'illegal-move'); assert.equal(rb.body.error.reason, 'bad-baseline');
    assert.ok(rb.body.error.message.length > 0 && !rb.body.error.message.includes('—'));
    // the shapes the client sends (section 12.2: args exactly as the engine takes them) reach the engine: a string item she
    // does not hold is the engine's no-item, an object Talent and a bribe flag are judged by the engine, never bad-request
    const base = { place: L.casualPlace(v), cards: L.bestGuess(v, L.casualPlace(v)).cards };
    const ri = await a.act('planEvening', [aw, { ...base, item: 'no-such-item' }]);
    assert.equal(ri.status, 400, ri.text); assert.equal(ri.body.error.code, 'illegal-move'); assert.equal(ri.body.error.reason, 'no-item');
    for (const extra of [{ talent: { kind: 'double-entendre', card: base.cards[0] ?? 0, art: 'wit' } }, { bribe: false }, { bribe: true }, { item: null, talent: null }]) {
      const r = await a.act('planEvening', [aw, { ...base, ...extra }]);
      assert.ok(r.status === 200 || (r.status === 400 && r.body.error.code === 'illegal-move'), `${J(extra)}: ${r.text}`);
    }
    // Codex round 3 (finding 2): a Talent's Art is an own key of ARTS. An inherited name on a well-formed Double Entendre
    // (Dolly's Talent, unspent, on a Worked card) is a malformed body: 400 bad-request, never the engine's, and nothing lands
    assert.equal(C.CHARACTERS[L.charOf(aw)].talent, 'double-entendre'); assert.ok(base.cards.length >= 1, 'a Worked card');
    const ln0 = (await a.view()).body.account.lastNonce;
    for (const art of ['__proto__', 'constructor', 'toString']) {
      const r = await a.act('planEvening', [aw, { ...base, talent: { kind: 'double-entendre', card: base.cards[0], art } }]);
      assert.equal(r.status, 400, `${art}: ${r.text}`); assert.equal(r.body.error.code, 'bad-request', `${art}: ${r.text}`);
      const rs = await a.act('sealPlan', [aw, { ...base, talent: { kind: 'double-entendre', card: base.cards[0], art } }]);
      assert.equal(rs.status, 400, `${art} seal: ${rs.text}`); assert.equal(rs.body.error.code, 'bad-request', `${art} seal: ${rs.text}`);
      const ra = await a.act('playAssignation', [aw, { cards: [0], talent: { kind: 'double-entendre', card: 0, art } }]);
      assert.equal(ra.status, 400, `${art} assignation: ${ra.text}`); assert.equal(ra.body.error.code, 'bad-request', `${art} assignation: ${ra.text}`);
    }
    assert.equal((await a.view()).body.account.lastNonce, ln0, 'no inherited Art reached the engine');
    // every own Art still reaches the engine
    for (const art of C.ART_IDS) {
      const r = await a.act('planEvening', [aw, { ...base, talent: { kind: 'double-entendre', card: base.cards[0], art } }]);
      assert.ok(r.status === 200 || (r.status === 400 && r.body.error.code === 'illegal-move'), `${art}: ${r.text}`);
    }
  });

  await t.test('T-not-yours: another player\'s girl in args[0] is 403; an account-scoped action ignores what was sent there', async () => {
    const r = await a.act('study', [bw, 'plunkett']);
    assert.equal(r.status, 403); assert.equal(r.body.error.code, 'not-yours');
    assert.equal((await a.act('study', ['lavinia', 'plunkett'])).body.error.code, 'not-yours', 'a house girl is not hers either');
    const m = await a.act('markSeen', [bid, 'victorian']);
    assert.equal(m.status, 200); assert.equal(m.body.account.seen.victorian, m.body.tick, 'applied to A, whatever args[0] said');
    const nl = await a.act('buyCard', [aw, 'no-such-card']);
    assert.equal(nl.status, 400); assert.equal(nl.body.error.code, 'not-legal');
  });

  await t.test('T-poll: same:true is tiny with no seq; a full payload after another player acts carries only public events; focus-only and all=1; lastNonce', async () => {
    const v1 = await a.view('tick=0');
    const same = await a.view(`since=${v1.body.rev}`);
    assert.equal(same.status, 200); assert.equal(same.body.same, true); assert.equal(same.body.rev, v1.body.rev);
    assert.ok(same.text.length < 200, same.text); assert.ok(!same.text.includes('seq')); assert.ok('serverNow' in same.body && 'clock' in same.body);
    // the boot of this server process, on the full payload and the short answer alike (section 12.2)
    assert.match(v1.body.boot, /^[0-9a-f]{16}$/); assert.equal(same.body.boot, v1.body.boot);
    const n = nonce();
    assert.equal((await b.act('study', [bw, 'plunkett'], n)).status, 200);
    const v2 = await a.view(`since=${v1.body.rev}&tick=${v1.body.tick}`);
    assert.equal(v2.body.same, undefined); assert.ok(v2.body.rev > v1.body.rev);
    for (const e of v2.body.events) assert.ok(e.vis === 'all' || e.vis.includes(v1.body.account.id), `a private event of another account: ${e.type}`);
    assert.ok(!v2.body.events.some((e) => e.type === 'study'), 'B\'s Study is hers alone');
    assert.deepEqual(Object.keys(v2.body.views), [aw]); assert.deepEqual(Object.keys((await a.view('all=1')).body.views), [aw]);
    assert.equal((await b.view()).body.account.lastNonce, n);
    assert.equal((await a.view('bogus=1')).body.error.code, 'bad-request'); assert.equal((await a.view('all=2')).body.error.code, 'bad-request');
    assert.equal((await a.view('since=1&since=2')).body.error.code, 'bad-request');
    const pr = await a.get(`/api/profile?whore=${encodeURIComponent(bw)}`);
    assert.equal(pr.status, 200); assert.equal(pr.body.profile.id, bw); assert.ok(!('hand' in pr.body.profile));
    assert.equal((await a.get('/api/profile?whore=nobody')).status, 404);
    assert.equal((await A.anon.view()).status, 401);
    assert.equal((await A.clients[3].view()).body.error.code, 'not-in-world');
  });

  await t.test('T-nonce over the wire: the same body twice is one journal row and replayed: true', async () => {
    const n = nonce(); const seq0 = (await A.anon.get('/api/health')).body.world.seq;
    const g = C.TIMELINES.victorian.gents[1];
    const r1 = await a.act('study', [aw, g], n);
    assert.equal(r1.status, 200); assert.equal(r1.body.replayed, false);
    const seq1 = (await A.anon.get('/api/health')).body.world.seq;
    const r2 = await a.act('study', [aw, g], n);
    assert.equal(r2.status, 200); assert.equal(r2.body.replayed, true); assert.deepEqual(r2.body.events, []); assert.equal(r2.body.eventsGap, false);
    assert.ok(r2.body.views[aw], 'the current payload');
    const seq2 = (await A.anon.get('/api/health')).body.world.seq;
    assert.ok(seq1 - seq0 >= 1, 'the first landed');
    // the replay added no row: the rows between are tick rows, at most one a second at this rate (the seconds between are few)
    assert.ok(seq2 - seq1 <= 2, `rows after the replay: ${seq2 - seq1}`);
    const seqAfterDifferent = (await (async () => { await a.act('study', [aw, g], nonce()); return A.anon.get('/api/health'); })()).body.world.seq;
    assert.ok(seqAfterDifferent > seq2, 'a new nonce applies again');
    // an action whose legality flips once it lands (startAssignation: legalActions no longer lists it) is still answered
    // replayed: true on a re-post, never not-legal: the nonce is checked before the legality gates (section 12.4)
    const legal = (await a.view()).body.legal[aw];
    const sa = legal.find((x) => x.type === 'startAssignation');
    assert.ok(sa, 'an Assignation on offer');
    const n2 = nonce();
    const s1 = await a.act('startAssignation', [aw, sa.gent], n2);
    assert.equal(s1.status, 200, s1.text);
    assert.ok(!(await a.view()).body.legal[aw].some((x) => x.type === 'startAssignation'), 'no longer legal once it landed');
    const s2 = await a.act('startAssignation', [aw, sa.gent], n2);
    assert.equal(s2.status, 200, s2.text); assert.equal(s2.body.replayed, true);
    assert.equal((await a.act('cancelAssignation', [aw])).status, 200);
  });

  await t.test('T-curtain: A rummages over HTTP, then seals; B is absent; the grid Curtain pays A with her breakdown and gives B a Standing Order', async () => {
    const before = (await b.view()).body;
    let accepted = 0;
    const place = C.TIMELINES.victorian.places[0];
    for (let i = 0; i < 60; i++) { const r = await a.act('explore', [aw, place]); if (r.status === 200) accepted++; else assert.equal(r.body.error.code, 'illegal-move', r.text); }
    assert.ok(accepted >= 10, `${accepted} rummages`);
    // A seals; B is absent (never seals)
    const va = (await a.view()).body.views[aw];
    const sn = nonce();
    const s = await a.act('sealPlan', [aw, bestPlan(va)], sn);
    assert.equal(s.status, 200, s.text);
    const re = await a.act('sealPlan', [aw, bestPlan(va)], sn);
    assert.equal(re.status, 200, re.text); assert.equal(re.body.replayed, true, 'a landed seal re-posted is replayed, not not-legal');
    const k = s.body.curtains.victorian.curtainNo;
    const after = await untilCurtain(a, 'victorian', k);
    assert.equal(after.curtains.victorian.curtainNo, k + 1); assert.equal(after.curtains.victorian.nextCurtainAt % 180, 0);
    const bv = await b.view('tick=0&digest=1');
    assert.equal(bv.body.curtains.victorian.curtainNo, k + 1);
    assert.ok(bv.body.digest.victorian && bv.body.digest.victorian.headlines.length >= 1);
    const bText = J(bv.body.events) + J(bv.body.digest);
    assert.ok(bText.includes(A.users[0].name) || bText.includes(aw), 'the Curtain names A by nom de plume');
    assert.ok(bv.body.events.some((e) => e.type === 'payout' && e.whores[0] === bw), 'B\'s Standing Order paid her something');
    // A's payout carries her breakdown even on a late poll from an old cursor
    await sleep(600);
    const av = await a.view(`tick=${before.tick}`);
    const pay = av.body.events.find((e) => e.type === 'payout' && e.whores[0] === aw);
    assert.ok(pay && pay.data.breakdown, 'A\'s breakdown re-attached');
    for (const e of av.body.events) if (e.type === 'payout' && e.whores[0] !== aw) assert.ok(!e.data.breakdown, 'nobody else\'s breakdown');
  });

  await t.test('T-privacy-http: A\'s all=1&boards=1&digest=1 payload holds nothing of B\'s hand, deck, known or plan, no seed, rng or seq, no private event of B\'s, and a human winner\'s cards stay hers', async () => {
    for (const g of C.TIMELINES.victorian.gents) for (const x of [a, b]) await x.act('study', [x === a ? aw : bw, g]);
    const p = (await a.view('tick=0&all=1&boards=1&digest=1')).body;
    const text = J(p);
    assert.ok(!('seed' in p) && !('rng' in p) && !('seq' in p));
    for (const key of ['"seed"', '"rng"', '"draw"', '"discard"', '"lastPayouts"']) assert.ok(!text.includes(key), `${key} on the wire`);
    // kinkFor appears only on her own items and stalls, masked by her own known (the engine's maskedItem)
    walk(p, (v, pth) => { if (pth.endsWith('.kinkFor') && v) assert.ok(pth.startsWith(`.views.${aw}.`), pth); });
    walk(p, (v, pth) => { assert.ok(!/\.(hand|draw|discard|known|plan)\./.test(pth) || pth.startsWith(`.views.${aw}.`) || pth.includes('.whore.') || /\.legal\./.test(pth) || /lastCharmed\.cards/.test(pth), pth); });
    for (const e of p.events) assert.ok(e.vis === 'all' || e.vis.includes(p.account.id));
    const rivalB = p.views[aw].timeline.rivals.find((r) => r.id === bw);
    assert.ok(rivalB, 'B is on A\'s street'); assert.ok(!('hand' in rivalB) && !('draw' in rivalB) && !('known' in rivalB && rivalB.known.gents));
    assert.ok(!rivalB.plan || rivalB.plan.place === undefined, 'no sealed Place');
    for (const g of p.views[aw].timeline.gents) if (g.lastCharmed && g.lastCharmed.whore && String(g.lastCharmed.whore).startsWith(`${p.account.id}:`) === false && String(g.lastCharmed.whore).includes(':')) assert.equal(g.lastCharmed.cards, null, `${g.id}: a human winner's cards shown to a rival`);
    const own = (await b.view()).body.views[bw];
    for (const g of own.timeline.gents) if (g.lastCharmed && g.lastCharmed.whore === bw) assert.ok(Array.isArray(g.lastCharmed.cards), 'her own cards stay hers');
    // gossip on sealed B never carries her Place
    const bv2 = (await b.view()).body.views[bw];
    if (!bv2.whore.plan) await b.act('sealPlan', [bw, bestPlan(bv2)]);
    const bPlace = (await b.view()).body.views[bw].whore.plan ? (await b.view()).body.views[bw].whore.plan.place : null;
    const gs = await a.act('spendGossip', [aw, bw]);
    if (gs.status === 200) {
      const ev = gs.body.events.find((e) => e.type === 'gossip');
      if (ev && bPlace) { assert.ok(!J(ev).includes(C.PLACES[bPlace].name), 'her sealed Place named'); assert.equal(ev.data.tonight ?? null, null); }
    } else assert.equal(gs.body.error.code, 'not-legal');
  });

  await t.test('T-players over HTTP: both humans and the house, ranked, no automaton, lastActive to the hour for humans and null for the house', async () => {
    const r = await A.anon.get('/api/players?limit=50');
    assert.equal(r.status, 200);
    const rows = r.body.players;
    for (const x of rows) assert.deepEqual(Object.keys(x).sort(), ['house', 'lastActive', 'name', 'rank', 'road', 'tier', 'timelines', 'title', 'whorescore']);
    const ha = rows.find((x) => x.name === A.users[0].name); const hb = rows.find((x) => x.name === A.users[1].name);
    assert.ok(ha && hb && ha.house === false && hb.house === false);
    assert.equal(ha.lastActive % 3_600_000, 0); assert.ok(ha.lastActive <= Date.now() && ha.lastActive > Date.now() - 2 * 3_600_000);
    assert.ok(rows.some((x) => x.house && x.lastActive === null));
    assert.ok(!rows.some((x) => /clementine|bettie/i.test(x.name)));
    rows.forEach((x, i) => assert.equal(x.rank, i + 1));
    assert.equal((await A.anon.get('/api/players?limit=2')).body.players.length, 2);
  });

  await t.test('T-health over HTTP: 200 with the world block while ticking', async () => {
    const h = await A.anon.get('/api/health');
    assert.equal(h.status, 200); assert.equal(h.body.ok, true);
    assert.deepEqual(Object.keys(h.body.world).sort(), ['clock', 'clockBehindMs', 'members', 'seq', 'snapSeq']);
    assert.equal(h.body.world.members, 3); assert.equal(h.body.world.clockBehindMs, 0);
  });

  await t.test('after SIGTERM the file holds a snapshot, the world\'s rng and B\'s stream are intact and the seed is only in worlds.state', async () => {
    const bBefore = (await b.view()).body.views[bw];
    const { code } = await A.server.stop();
    assert.equal(code, 0);
    assert.ok(!fs.existsSync(path.join(A.dir, 'world.lock')), 'the lock was released');
    const db = await openDb(A.file, { exclusive: false });
    const row = db.world.get(1); const s = JSON.parse(row.state);
    assert.equal(row.snap_seq, row.seq, 'the final snapshot');
    assert.ok(Array.isArray(s.rng) && s.rng.length === 4);
    assert.ok(Array.isArray(s.whores[bw].rng), 'B has her own stream');
    assert.equal(s.whores[bw].draw.length, bBefore.whore.drawCount, 'B\'s deck as her last view said');
    for (const r of db.world.journalAfter(1, 0)) assert.ok(!r.args.includes(s.seed));
    db.close();
  });
});

test('T-limits: 301 acts a minute and 121 views are 429 with Retry-After; LW_TL_CAP=2 steers to the open streets; LW_WORLD_CAP=3 answers world-full', async (t) => {
  const A = await arena(4, { LW_MIN_PER_SEC: '1', LW_TL_CAP: '2', LW_WORLD_CAP: '3' });
  t.after(() => A.close());
  const [a, b, c, d] = A.clients;
  assert.equal((await a.join('dolly')).status, 201); assert.equal((await b.join('dolly')).status, 201);
  const me = await c.get('/api/me');
  assert.equal(me.body.crowd.victorian, 2); assert.equal(me.body.tlCap, 2);
  const full = await c.join('dolly');
  assert.equal(full.status, 503); assert.equal(full.body.error.code, 'timeline-full'); assert.deepEqual(full.body.error.data.open, ['fanny', 'jackie']);
  assert.equal((await c.join('fanny')).status, 201);
  const wf = await d.join('jackie');
  assert.equal(wf.status, 503); assert.equal(wf.body.error.code, 'world-full');
  const aw = (await a.view()).body.focus;
  // the same count gates openTimeline: a full street cannot be opened into (A has one slot, so the cap answers first)
  const ot = await a.act('openTimeline', [aw, 'dolly']);
  assert.equal(ot.status, 503); assert.equal(ot.body.error.code, 'timeline-full'); assert.deepEqual(ot.body.error.data.open, ['fanny', 'jackie']);
  assert.equal((await a.act('openTimeline', [aw, 'jackie'])).body.error.code, 'not-legal', 'a street with room, but no second slot yet');
  let last;
  for (let i = 0; i < 301; i++) { last = await a.act('markSeen', [aw, 'victorian']); if (last.status === 429) break; assert.equal(last.status, 200, `act ${i}: ${last.text}`); }
  assert.equal(last.status, 429); assert.equal(last.body.error.code, 'rate-limited'); assert.ok(Number(last.headers.get('retry-after')) >= 1);
  assert.equal((await b.act('markSeen', [aw, 'victorian'])).status, 200, 'B has her own bucket');
  for (let i = 0; i < 121; i++) { last = await b.view(); if (last.status === 429) break; assert.equal(last.status, 200); }
  assert.equal(last.status, 429); assert.ok(Number(last.headers.get('retry-after')) >= 1);
  assert.equal((await a.get('/api/join')).status, 405);
  assert.equal((await a.raw('POST', '/api/view')).status, 405);
});

test('T-health: 503 world-down with a stalled tick, and when the journal outgrows LW_SNAPSHOT_MAX_LAG', async (t) => {
  const S = await arena(1, { LW_DEV_STALL_TICK: '1', LW_MIN_PER_SEC: '1' });
  t.after(() => S.close());
  const h = await S.anon.get('/api/health');
  assert.equal(h.status, 503); assert.equal(h.body.error.code, 'world-down'); assert.ok(h.headers.get('retry-after'));
  const G = await arena(1, { LW_MIN_PER_SEC: '1', LW_SNAPSHOT_MAX_LAG: '2', LW_SNAPSHOT_SEC: '3600', LW_SNAPSHOT_ACTIONS: '100000' });
  t.after(() => G.close());
  assert.equal((await G.anon.get('/api/health')).status, 200);
  await sleep(4200); // one tick row a second, no snapshot for an hour
  const g = await G.anon.get('/api/health');
  assert.equal(g.status, 503, g.text); assert.equal(g.body.error.code, 'world-down');
});

test('T-kill: SIGKILL mid-run loses nothing answered; the restart serves the journal\'s replay; a re-posted act is replayed, not applied twice', async (t) => {
  const dir = tmpDir('lw-kill'); const file = path.join(dir, 'lw.sqlite');
  const users = await seedUsers(file, 2);
  let server = await startServer({ LW_DB: file, LW_MIN_PER_SEC: '1', LW_SNAPSHOT_SEC: '3600', LW_SNAPSHOT_ACTIONS: '100000' });
  t.after(async () => { await server.kill(); rmDir(dir); }); // a failed assertion must not leave a child holding the runner open
  let a = client(server, users[0].cookie); let b = client(server, users[1].cookie);
  assert.equal((await a.join('dolly')).status, 201); assert.equal((await b.join('fanny')).status, 201);
  const aw = (await a.view()).body.focus; const bw = (await b.view()).body.focus;
  const answered = []; // { who, action, args, nonce, clock, rev }
  const t0 = Date.now();
  const gentsA = C.TIMELINES.victorian.gents; const gentsB = C.TIMELINES.wildwest.gents;
  let i = 0;
  while (Date.now() - t0 < 2500 && i < 240) { // under the act limiter (300 a minute per account) with the seal to come
    const who = i % 2 ? b : a; const wid = i % 2 ? bw : aw; const gents = i % 2 ? gentsB : gentsA;
    const kind = i % 4 === 3 ? 'dropItem' : i % 3 === 0 ? 'explore' : 'study';
    const args = kind === 'dropItem' ? [wid, 0] : kind === 'explore' ? [wid, C.TIMELINES[i % 2 ? 'wildwest' : 'victorian'].places[i % 3]] : [wid, gents[i % 3]];
    const n = nonce();
    const r = await who.act(kind, args, n);
    if (r.status === 200) answered.push({ who: i % 2, action: kind, args, nonce: n, clock: r.body.clock, rev: r.body.rev, tick: r.body.tick });
    i++;
  }
  assert.ok(answered.length >= 10, `${answered.length} answered`);
  // the last answered act before the kill is A's seal (section 9.3: an action a double apply would change; once it has
  // landed it is no longer legal, so a re-post can only be answered through the nonce)
  const sealNonce = nonce();
  const sealArgs = [aw, bestPlan((await a.view()).body.views[aw])];
  const sealed = await a.act('sealPlan', sealArgs, sealNonce);
  assert.equal(sealed.status, 200, sealed.text);
  answered.push({ who: 0, action: 'sealPlan', args: sealArgs, nonce: sealNonce, clock: sealed.body.clock, rev: sealed.body.rev, tick: sealed.body.tick });
  const seqBefore = (await client(server).get('/api/health')).body.world.seq;
  await server.kill();
  assert.ok(fs.existsSync(path.join(dir, 'world.lock')), 'the lock is left by the kill');
  // an in-process replay of the journal as the file stands (the dead pid makes the lock stale)
  process.env.LW_DEV = '1';
  const db = await openDb(file);
  const w = await openWorld(db, { rate: { num: 1, den: 1 }, log: () => {} });
  const replayed = { tick: w.state.tick, clock: w.state.clock, seq: w.seq, views: J({ a: L.getView(w.state, aw, { logTail: 0 }), b: L.getView(w.state, bw, { logTail: 0 }) }) };
  assert.ok(replayed.seq >= seqBefore, 'the journal holds everything answered');
  w.lock.release(); db.close(); // no stop(): no snapshot, so the child replays the same journal
  server = await startServer({ LW_DB: file, LW_MIN_PER_SEC: '1', LW_SNAPSHOT_SEC: '3600', LW_SNAPSHOT_ACTIONS: '100000' });
  a = client(server, users[0].cookie); b = client(server, users[1].cookie);
  const last = answered[answered.length - 1];
  assert.equal(last.action, 'sealPlan');
  const va = await a.view('tick=0'); const vb = await b.view('tick=0');
  assert.equal(va.status, 200); assert.equal(vb.status, 200);
  assert.ok(va.body.clock >= last.clock && vb.body.clock >= last.clock);
  const h = await client(server).get('/api/health');
  assert.ok(h.body.world.seq >= seqBefore);
  assert.ok(va.body.tick >= replayed.tick);
  const nowViews = J({ a: va.body.views[aw], b: vb.body.views[bw] });
  const expected = JSON.parse(replayed.views); expected.a.clock = va.body.views[aw].clock; expected.b.clock = vb.body.views[bw].clock; expected.a.tick = va.body.views[aw].tick; expected.b.tick = vb.body.views[bw].tick;
  const strip = (v) => { const x = JSON.parse(J(v)); for (const k of ['a', 'b']) { delete x[k].timeline.nextCurtainAt; delete x[k].timeline.earliestCurtainAt; delete x[k].timeline.sealing; delete x[k].account; delete x[k].timeline.rivals; } return J(x); };
  assert.equal(strip(JSON.parse(nowViews)), strip(expected), 'the restarted state is the in-process replay (clock-bearing fields aside)');
  // the last answered act, re-posted with its nonce: no new row, replayed: true
  const seqNow = h.body.world.seq;
  const re = await (last.who ? b : a).act(last.action, last.args, last.nonce);
  assert.equal(re.status, 200, re.text); assert.equal(re.body.replayed, true);
  assert.ok((await a.view()).body.views[aw].whore.plan.sealed, 'still sealed once');
  const seqAfter = (await client(server).get('/api/health')).body.world.seq;
  assert.ok(seqAfter - seqNow <= 2, 'ticks only');
  assert.equal(replayed.seq >= seqBefore, true);
  // the journal, read in-process once the child is gone (a kill, not a stop: a stop's snapshot would prune the rows):
  // exactly one sealPlan row carries that nonce
  await server.kill();
  const db2 = await openDb(file, { exclusive: false });
  const rows = db2.world.journalAfter(1, 0).filter((r) => r.type === 'sealPlan');
  db2.close();
  assert.equal(rows.filter((r) => r.nonce === sealNonce).length, 1, `sealPlan rows with the nonce: ${J(rows.map((r) => r.nonce))}`);
  assert.equal(rows.length, 1, 'one seal in the journal');
});

test('T-lost-answer: a replay carries every live girl\'s view; an act whose answer is lost (the dev hook closes the socket) has landed; 70 more acts and a routine snapshot follow; the re-post of the first is replayed: true with every girl\'s view, and it was applied once', async (t) => {
  const dir = tmpDir('lw-lost'); const file = path.join(dir, 'lw.sqlite');
  const users = await seedUsers(file, 1);
  // the 5th accepted act's answer is dropped: startAssignation, playAssignation, openTimeline, the answered study on her
  // second girl, then the study whose answer is lost. A snapshot every 50 actions, so the journal is pruned under it.
  const server = await startServer({ LW_DB: file, LW_MIN_PER_SEC: '60', LW_DEV_DROP_ACT_REPLY: '5', LW_SNAPSHOT_SEC: '3600', LW_SNAPSHOT_ACTIONS: '50' });
  t.after(async () => { await server.kill(); rmDir(dir); });
  const a = client(server, users[0].cookie);
  assert.equal((await a.join('dolly')).status, 201);
  let v = (await a.view()).body; const w1 = v.focus; const aid = v.account.id;
  // a second slot takes one Assignation and one Curtain
  const sa = v.legal[w1].find((x) => x.type === 'startAssignation'); assert.ok(sa, 'an Assignation on offer');
  assert.equal((await a.act('startAssignation', [w1, sa.gent])).status, 200);
  v = (await a.view()).body;
  const pr = await a.act('playAssignation', [w1, { cards: L.bestGuess(v.views[w1], { gent: sa.gent }).cards }]); assert.equal(pr.status, 200, pr.text);
  const after = await untilCurtain(a, 'victorian', v.curtains.victorian.curtainNo);
  assert.ok(after.account.canOpen.length >= 1, `a second slot after the Curtain (canOpen ${J(after.account.canOpen)})`);
  const starter2 = after.account.canOpen[0];
  const ot = await a.act('openTimeline', [aid, starter2]); assert.equal(ot.status, 200, ot.text);
  const w2 = Object.keys(ot.body.views).find((id) => id !== w1); assert.ok(w2, 'her second girl');
  const tl2 = C.CHARACTERS[starter2].timeline; const [gent, gentG] = C.TIMELINES[tl2].gents;
  const known = (view, g = gent) => { const x = view.timeline.gents.find((y) => y.id === g); return ['secret', 'kink', 'history'].filter((f) => x.known[f]).length; };
  assert.equal(known(ot.body.views[w2]), 0);
  // (Codex 3) an answered act on her second girl, re-posted with its nonce: the replay carries every live girl's view,
  // the acted one included, and that view is the one the act's own answer carried
  const nG = nonce();
  const rg = await a.act('study', [w2, gentG], nG); assert.equal(rg.status, 200, rg.text);
  const rgRe = await a.act('study', [w2, gentG], nG);
  assert.equal(rgRe.status, 200, rgRe.text); assert.equal(rgRe.body.replayed, true);
  assert.deepEqual(Object.keys(rgRe.body.views).sort(), [w1, w2].sort(), 'a replay carries every live girl, the acted one included');
  assert.equal(known(rgRe.body.views[w2], gentG), known(rg.body.views[w2], gentG), 'the acted girl\'s view as the act left her');
  assert.ok(rgRe.body.legal[w1] && rgRe.body.legal[w2], 'her legal moves for each');
  // the study on the second girl: the action lands, the answer is lost
  const nA = nonce();
  await assert.rejects(a.act('study', [w2, gent], nA), 'the socket closed before the answer');
  // 70 more acts land after it, and a routine snapshot (every 50) prunes the journal under A
  const nB = nonce();
  const rb = await a.act('markSeen', [aid, tl2], nB); assert.equal(rb.status, 200, rb.text); assert.equal(rb.body.account.lastNonce, nB);
  for (let i = 0; i < 69; i++) { const r = await a.act('markSeen', [aid, tl2]); assert.equal(r.status, 200, r.text); }
  const h = (await client(server).get('/api/health')).body.world;
  assert.ok(h.snapSeq > 0 && h.seq - h.snapSeq < 50, `a routine snapshot came after A (${J(h)})`);
  // the re-post of the first: replayed, every girl's view, the second girl's carrying the study applied once (n facts, not 2n)
  const re = await a.act('study', [w2, gent], nA);
  assert.equal(re.status, 200, re.text); assert.equal(re.body.replayed, true); assert.deepEqual(re.body.events, []);
  assert.deepEqual(Object.keys(re.body.views).sort(), [w1, w2].sort(), 'every live girl, the acted one included');
  const n = re.body.views[w2].whore.charm === 'good-listener' ? 2 : 1;
  assert.equal(known(re.body.views[w2]), n, 'the study landed exactly once');
  assert.equal(known((await a.view(`focus=${encodeURIComponent(w2)}`)).body.views[w2]), n);
  assert.equal((await a.act('markSeen', [aid, tl2], nB)).body.replayed, true, 'an older nonce replays too');
  // the receipts (a kill, so the file is as a crash leaves it): one per nonce, A's with the seq it landed at
  await server.kill();
  const db = await openDb(file, { exclusive: false });
  const receipts = db.raw.prepare('SELECT nonce, seq FROM world_nonces WHERE world_id = 1 AND account = ?').all(aid);
  const journal = db.world.journalAfter(1, 0);
  db.close();
  assert.equal(receipts.filter((r) => r.nonce === nA).length, 1); assert.equal(receipts.filter((r) => r.nonce === nB).length, 1);
  assert.equal(receipts.length, 75, 'one receipt per accepted act of hers (startAssignation, playAssignation, openTimeline, two studies, 70 markSeen)');
  assert.ok(!journal.some((r) => r.nonce === nA), 'A\'s journal row was pruned by the snapshot; its receipt was not');
});

test('T-too-many-moves: an account holding 5000 receipts younger than 48 hours has a new act refused 429 too-many-moves, with Retry-After and the line, while a re-post of a receipted act still replays', async (t) => {
  const dir = tmpDir('lw-cap'); const file = path.join(dir, 'lw.sqlite');
  t.after(() => rmDir(dir));
  const users = await seedUsers(file, 1);
  let server = await startServer({ LW_DB: file });
  let a = client(server, users[0].cookie);
  assert.equal((await a.join('dolly')).status, 201);
  const aid = (await a.view()).body.account.id;
  const nA = nonce();
  assert.equal((await a.act('markSeen', [aid, 'victorian'], nA)).status, 200);
  await server.stop();
  // 4999 more receipts of hers, all inside the 48 hours (written into the file as a flood of acts would leave them)
  const db = await openDb(file, { exclusive: false });
  const ins = db.raw.prepare('INSERT INTO world_nonces (world_id, account, nonce, seq, at) VALUES (1, ?, ?, ?, ?)');
  const t0 = Date.now();
  db.raw.exec('BEGIN'); for (let i = 0; i < 4999; i++) ins.run(aid, nonce(), 100000 + i, t0 - 60_000 + i); db.raw.exec('COMMIT');
  db.close();
  server = await startServer({ LW_DB: file }); a = client(server, users[0].cookie);
  t.after(() => server.stop());
  const r = await a.act('markSeen', [aid, 'victorian']);
  assert.equal(r.status, 429, r.text.slice(0, 200)); assert.equal(r.body.error.code, 'too-many-moves');
  assert.equal(r.body.error.message, 'Your girls have made more moves in two days than the clerk can file. Try again later.');
  const ra = Number(r.headers.get('retry-after'));
  assert.ok(ra > 47 * 3600 && ra <= 48 * 3600, `Retry-After until her oldest receipt is 48 hours old (${ra} s)`);
  const re = await a.act('markSeen', [aid, 'victorian'], nA);
  assert.equal(re.status, 200, re.text); assert.equal(re.body.replayed, true, 'a receipted act still replays at the cap');
});

test('T-curtain-passed: a move carries the curtainNo it was tapped under; once that Curtain has fallen a new move is refused 409 curtain-passed with the line, while the same nonce that landed before the fall replays 200; account-scoped moves carry none', async (t) => {
  const A = await arena(1, { LW_MIN_PER_SEC: '60' }); // a grid Curtain every 3 s; a lone human's seal brings hers down 20 minutes (0.33 s) on
  t.after(() => A.close());
  const [a] = A.clients;
  assert.equal((await a.join('dolly')).status, 201);
  // start just after a Curtain, so the next one is the one her seal brings down
  const v0 = (await a.view('all=1')).body; const aw = v0.focus; const aid = v0.account.id; const tl = v0.views[aw].whore.timeline;
  const v1 = await untilCurtain(a, tl, v0.curtains[tl].curtainNo);
  const k = v1.curtains[tl].curtainNo;
  const plan = bestPlan((await a.view('all=1')).body.views[aw]);
  // the seal lands under Curtain k (it carries k), and that Curtain falls on it
  const n1 = nonce();
  const s1 = await a.act('sealPlan', [aw, plan], n1, k);
  assert.equal(s1.status, 200, s1.text); assert.equal(s1.body.replayed, false); assert.ok(s1.body.views[aw].whore.plan.sealed);
  const after = await untilCurtain(a, tl, k);
  assert.equal(after.curtains[tl].curtainNo, k + 1);
  // the same nonce re-posted after the fall, still carrying k: it landed before, so it replays, whatever the Curtain
  const re = await a.act('sealPlan', [aw, plan], n1, k);
  assert.equal(re.status, 200, re.text); assert.equal(re.body.replayed, true, 'a landed move replays after its Curtain fell');
  // a seal that never landed, posted with the previous curtainNo: refused, nothing applied
  const fresh = (await a.view('all=1')).body;
  const plan2 = bestPlan(fresh.views[aw]);
  const n2 = nonce();
  const stale = await a.act('sealPlan', [aw, plan2], n2, k);
  assert.equal(stale.status, 409, stale.text); assert.equal(stale.body.error.code, 'curtain-passed');
  assert.equal(stale.body.error.message, 'The Curtain fell before that move went in.');
  const v2 = (await a.view('all=1')).body;
  assert.equal(v2.account.lastNonce, n1, 'the refused seal left no receipt'); assert.ok(!(v2.views[aw].whore.plan && v2.views[aw].whore.plan.sealed), 'nothing is sealed for the next night');
  // a study with the previous curtainNo too (every girl-targeted move), and one from a curtainNo ahead of the street
  assert.equal((await a.act('study', [aw, 'plunkett'], nonce(), k)).body.error.code, 'curtain-passed');
  assert.equal((await a.act('study', [aw, 'plunkett'], nonce(), k + 7)).body.error.code, 'curtain-passed');
  // the handler's own check comes before legalMatch: a stale move whose args are not legal under the new Curtain (a study
  // of a Wild West gent, never on Dolly's street) is answered curtain-passed, not not-legal, and leaves no receipt. The
  // same args under the street's curtainNo now are refused not-legal, so the 409 is the curtain check's answer
  const stray = await a.act('study', [aw, 'vanderbucks'], nonce(), k);
  assert.equal(stray.status, 409, stray.text); assert.equal(stray.body.error.code, 'curtain-passed', stray.text);
  // (a Curtain every 3 s here: if one falls between the view and the post, the control is asked again under the new one)
  let now; let plain;
  for (let i = 0; i < 3; i++) {
    now = (await a.view('all=1')).body;
    plain = await a.act('study', [aw, 'vanderbucks'], nonce(), now.curtains[tl].curtainNo);
    if (!(plain.status === 409 && plain.body.error.code === 'curtain-passed')) break;
  }
  assert.equal(now.account.lastNonce, n1, 'the refused study left no receipt');
  assert.ok(!now.legal[aw].some((d) => d.type === 'study' && d.target === 'vanderbucks'), 'that study is not legal tonight');
  assert.equal(plain.status, 400, plain.text); assert.equal(plain.body.error.code, 'not-legal', plain.text);
  // the stale nonce, re-posted with the right curtainNo, is a new move and lands once
  const ok = await a.act('sealPlan', [aw, plan2], n2, v2.curtains[tl].curtainNo);
  assert.equal(ok.status, 200, ok.text); assert.equal(ok.body.replayed, false); assert.ok(ok.body.views[aw].whore.plan.sealed);
  // account-scoped moves are exempt: markSeen carries no curtain, or any well-formed one
  assert.equal((await a.act('markSeen', [aid, tl], nonce(), null)).status, 200);
  assert.equal((await a.act('markSeen', [aid, tl], nonce(), 0)).status, 200);
  // markSeen's upTo (a tick past 1000 included): she has read only that far, never past the server's tick, never back
  const seen0 = (await a.view()).body.account.seen[tl];
  assert.ok(Number.isSafeInteger(seen0) && seen0 > 0, J(seen0));
  const r0 = await a.act('markSeen', [aid, tl, 0], nonce());
  assert.equal(r0.status, 200, r0.text); assert.equal(r0.body.account.seen[tl], seen0, 'a smaller upTo never moves the cursor back');
  const rBig = await a.act('markSeen', [aid, tl, 2 ** 40], nonce());
  assert.equal(rBig.status, 200, rBig.text);
  assert.equal(rBig.body.account.seen[tl], rBig.body.tick, 'an upTo past the tick is held at the tick');
  // a girl-targeted move without one is a bad request
  assert.equal((await a.act('study', [aw, 'plunkett'], nonce(), null)).body.error.code, 'bad-request');
});

test('T-tick-throw: a tick that throws inside an act kills the child with the line logged; the restart replays to the pre-throw state and runs the minute cleanly', async (t) => {
  const dir = tmpDir('lw-throw'); const file = path.join(dir, 'lw.sqlite');
  t.after(() => rmDir(dir));
  const users = await seedUsers(file, 1);
  let server = await startServer({ LW_DB: file, LW_MIN_PER_SEC: '60', LW_DEV_TICK_THROW: '1' });
  let a = client(server, users[0].cookie);
  assert.equal((await a.join('dolly')).status, 201);
  const aw = (await a.view()).body.focus;
  let r; let tries = 0;
  do { await sleep(30); try { r = await a.act('study', [aw, 'plunkett']); } catch { r = null; } tries++; } while (r && r.status === 200 && tries < 50);
  const exit = await server.exited;
  assert.equal(exit.code, 1, `the child exited ${J(exit)} after ${tries} acts`);
  assert.match(server.stderr(), /tick failed/);
  server = await startServer({ LW_DB: file, LW_MIN_PER_SEC: '60' });
  a = client(server, users[0].cookie);
  const h = await client(server).get('/api/health');
  assert.equal(h.status, 200, h.text);
  const v = await a.view('tick=0');
  assert.equal(v.status, 200); assert.ok(v.body.views[aw]);
  assert.equal((await a.act('study', [aw, 'plunkett'])).status, 200);
  await server.stop();
});

test('T-evict-rejoin over HTTP: after --evict the same starter joins again as <account>:dolly#2, and the act, view and profile routes take the id', async (t) => {
  const dir = tmpDir('lw-rejoin'); const file = path.join(dir, 'lw.sqlite');
  const users = await seedUsers(file, 2);
  let server = await startServer({ LW_DB: file, LW_MIN_PER_SEC: '1' });
  t.after(async () => { await server.kill(); rmDir(dir); });
  let a = client(server, users[0].cookie); const b = () => client(server, users[1].cookie);
  assert.equal((await a.join('dolly')).status, 201); assert.equal((await b().join('dolly')).status, 201);
  const first = (await a.view()).body; const w1 = first.focus; const aid = first.account.id;
  assert.equal((await server.stop()).code, 0);
  const ev = await runScript(WORLD_SCRIPT, ['--evict', users[0].name, file], { LW_MIN_PER_SEC: '1' });
  assert.equal(ev.code, 0, ev.err); assert.match(ev.out, /evicted .*1 girl/);
  server = await startServer({ LW_DB: file, LW_MIN_PER_SEC: '1' });
  a = client(server, users[0].cookie);
  assert.equal((await a.view()).body.error.code, 'not-in-world');
  const r = await a.join('dolly');
  assert.equal(r.status, 201, r.text);
  assert.equal(r.body.account.id, aid, 'the same account'); assert.equal(r.body.focus, `${aid}:dolly#2`);
  assert.deepEqual(Object.keys(r.body.views), [`${aid}:dolly#2`]); assert.deepEqual(r.body.account.whores.map((w) => w.id), [`${aid}:dolly#2`]);
  assert.deepEqual(r.body.events.map((e) => e.type), ['starter-chosen']);
  const w2 = r.body.focus;
  assert.equal((await a.act('study', [w2, 'plunkett'])).status, 200);
  assert.equal((await a.act('study', [w1, 'plunkett'])).body.error.code, 'not-yours', 'the retired girl is nobody\'s to send out');
  assert.equal((await a.view(`focus=${encodeURIComponent(w2)}`)).body.focus, w2);
  assert.equal((await b().get(`/api/profile?whore=${encodeURIComponent(w2)}`)).body.profile.id, w2);
  const vb = (await b().view()).body.views[(await b().view()).body.focus];
  assert.ok(!vb.timeline.rivals.some((x) => x.id === w1) && vb.timeline.rivals.some((x) => x.id === w2), 'B sees the rehire, never the retired girl');
  assert.equal((await client(server).get('/api/players?limit=50')).body.players.filter((p) => p.name === users[0].name).length, 1);
});

// Codex round 3 (finding 3): the Grease Palms bound is the rules' (RULES.sway.grease.max, +1 at each maxUp Notoriety), not a
// literal 2. The world is made in-process first (a girl at Notoriety 8 with Coin to spend, one at Notoriety 2), then the
// server serves it: 4 at Notoriety 8 is 200 as the engine allows, above the rules' top is 400 bad-request, and the engine
// keeps its own eligibility check (Notoriety 2 is illegal-move no-grease).
test('T-grease: the Grease Palms bound follows the rules: a girl at Notoriety 8 greases 4 and gets 200; above the rules\' top is 400 bad-request; the engine still refuses a girl below Notoriety 3', async (t) => {
  const G = L.RULES.sway.grease;
  assert.equal(GREASE_TOP, G.max + (G.maxUp || []).length, 'the top is the rule\'s max plus every step it can rise');
  assert.ok(GREASE_TOP > 2, `this edition lets her grease past 2 (${GREASE_TOP})`);
  assert.equal(VALIDATOR_GREASE_TOP, GREASE_TOP, 'the validator\'s bound is the rules\' top');
  const dir = tmpDir('lw-api'); const file = path.join(dir, 'lw.sqlite');
  const users = await seedUsers(file, 2);
  process.env.LW_DEV = '1';
  const db = await openDb(file);
  const w = await openWorld(db, { log: () => {} });
  const hi = w.join(users[0], 'dolly'); const lo = w.join(users[1], 'dolly');
  const hw = w.state.accounts[hi.accountId].whores[0]; const lw = w.state.accounts[lo.accountId].whores[0];
  Object.assign(w.state.whores[hw], { notoriety: 8, coin: 200 }); Object.assign(w.state.whores[lw], { notoriety: 2, coin: 200 });
  // the engine itself (pure: the world's state is not touched) takes 4 from her
  const v0 = L.getView(w.state, hw); const rough0 = v0.timeline.places.find((p) => p.open && C.PLACES[p.id].kind !== 'posh');
  assert.equal(L.planEvening(w.state, hw, { place: rough0.id, cards: L.bestGuess(v0, rough0.id).cards, grease: 4 }).whores[hw].plan.grease, 4, 'the engine accepts 4');
  w.stop(); db.close(); // the final snapshot carries her Notoriety
  const server = await startServer({ LW_DB: file });
  t.after(async () => { await server.stop(); rmDir(dir); });
  const a = client(server, users[0].cookie); const b = client(server, users[1].cookie);
  const va = (await a.view()).body.views[hw];
  assert.equal(va.whore.notoriety, 8); assert.equal(va.whore.greaseMax, 4, 'the engine offers her 4');
  const rough = va.timeline.places.find((p) => p.open && C.PLACES[p.id].kind !== 'posh');
  assert.ok(rough, 'a Rowdy or Gutter Place open to her');
  const cards = L.bestGuess(va, rough.id).cards;
  const r4 = await a.act('planEvening', [hw, { place: rough.id, cards, grease: 4 }]);
  assert.equal(r4.status, 200, r4.text);
  assert.equal(r4.body.views[hw].whore.plan.grease, 4, 'planned with 4 Grease Palms');
  const rTop = await a.act('planEvening', [hw, { place: rough.id, cards, grease: GREASE_TOP }]);
  assert.equal(rTop.status, 200, rTop.text);
  const rOver = await a.act('planEvening', [hw, { place: rough.id, cards, grease: GREASE_TOP + 1 }]);
  assert.equal(rOver.status, 400, rOver.text); assert.equal(rOver.body.error.code, 'bad-request');
  const vb = (await b.view()).body.views[lw];
  const roughB = vb.timeline.places.find((p) => p.open && C.PLACES[p.id].kind !== 'posh');
  const rLo = await b.act('planEvening', [lw, { place: roughB.id, cards: L.bestGuess(vb, roughB.id).cards, grease: 4 }]);
  assert.equal(rLo.status, 400, rLo.text); assert.equal(rLo.body.error.code, 'illegal-move'); assert.equal(rLo.body.error.reason, 'no-grease');
});

test('T-no-outbound and T-no-omni: nothing in server/ opens a connection out or reaches _omni', () => {
  const files = fs.readdirSync(path.join(REPO, 'server')).filter((f) => f.endsWith('.mjs')).map((f) => path.join(REPO, 'server', f));
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    for (const pat of [/\bfetch\s*\(/, /https?\.request\s*\(/, /\bnet\.connect\s*\(/, /dns\.lookup\s*\(/, /_omni/]) assert.ok(!pat.test(text), `${path.basename(f)} matches ${pat}`);
    assert.ok(!/\blookup\(/.test(text) || f.endsWith('server.mjs'), 'the loopback resolve lives in server.mjs only');
  }
  assert.ok(ID_RE.test('pabcdefghij:dolly') && !ID_RE.test('x'.repeat(49)));
});
