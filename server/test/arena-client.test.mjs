// The arena client headless (docs/server-api.md section 12.14): game/scandal.js and game/net.js loaded with a stubbed DOM,
// localStorage and fetch, against a mock of the server that ships (a receipt for every accepted nonce, a replay that
// carries every view, a `boot` per server process). Covers: the rev compared within one boot only (a restored backup at a
// lower rev is adopted with one request; a late answer of the same boot is dropped and the poll keeps its pace); an act
// whose answer was lost is settled with its own nonce before anything new goes up, play taps held meanwhile, and one
// older than a day is dropped with a poll instead; a failed profile fetch waits for Retry-After, then asks once more; the
// event cursor moves on polls only, so a Curtain that fell before her act (or inside a dropped poll) still reaches her,
// once; the boot fence drops a late answer from a server process already replaced, and a wrong guess about which boot is
// newer mends itself on the next answer. And the smoke round's lines (I to O): the Standing Order headline prints on the
// front page once the edition closes, once, and the last call goes with its Curtain; a move kept through an outage shows
// one plain line until it settles; a return with only a forecast prints no While You Were Away; the seal line says
// "Sealed" once; the pick page asks /api/me for its street counts each time it opens; an unsettled act stamped more than a
// day ahead is dropped; a replayed answer moves no cursor, so the next poll brings its events and the Curtain before it.
// And the round-2 review (P to R): a re-post answered 429 keeps the move unsettled under its nonce through Retry-After,
// taps held, and the next re-post replays it; the first act answer after a server restart moves no cursor and sends the
// next poll at once from the old one (a restored backup below the cursor adopts the server's tick and asks for the
// digest); after an eviction and a rehire elsewhere, an open tab follows the live girl and keeps polling.
// Run: node --test 'server/test/*.test.mjs' (zero dependencies; each test file runs in its own process).
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import * as L from '../../engine/rules.js';

const C = L.CONTENT; const R = L.RULES;
const J = JSON.stringify;

// ---- the page's world: timers that never hold the process open, a clock the test can move, a DOM that renders nothing --
const realSetTimeout = globalThis.setTimeout; const realSetInterval = globalThis.setInterval;
globalThis.setTimeout = (fn, ms, ...a) => { const t = realSetTimeout(fn, ms, ...a); t.unref?.(); return t; };
globalThis.setInterval = (fn, ms, ...a) => { const t = realSetInterval(fn, ms, ...a); t.unref?.(); return t; };
const wait = (ms = 5) => new Promise((r) => realSetTimeout(r, ms));
const realNow = Date.now.bind(Date); let skewMs = 0;
Date.now = () => realNow() + skewMs;
// waits until cond() holds (true) or `ms` real milliseconds pass (false): no fixed sleep where an answer is awaited
async function until(cond, ms = 3000) { const t0 = realNow(); while (!cond()) { if (realNow() - t0 > ms) return false; await wait(5); } return true; }

function el(tag = 'div') {
  const kids = []; const attrs = {};
  const e = {
    tagName: String(tag).toUpperCase(), id: '', className: '', hidden: false, inert: false, disabled: false, readOnly: false, value: '', textContent: '', _html: '',
    dataset: {}, style: { setProperty() {}, removeProperty() {}, getPropertyValue() { return ''; } }, children: kids, childNodes: kids, parentElement: null, isConnected: true,
    classList: { _s: new Set(), add(...a) { a.forEach((x) => this._s.add(x)); }, remove(...a) { a.forEach((x) => this._s.delete(x)); }, toggle(c, f) { if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c) { return this._s.has(c); } },
    get innerHTML() { return this._html; }, set innerHTML(v) { this._html = String(v); },
    set outerHTML(v) { this._html = String(v); },
    getAttribute(k) { return k in attrs ? attrs[k] : null; }, setAttribute(k, v) { attrs[k] = String(v); }, removeAttribute(k) { delete attrs[k]; }, hasAttribute(k) { return k in attrs; }, closest() { return null; }, matches() { return false; },
    querySelector() { return el(); }, querySelectorAll() { return []; }, appendChild(c) { kids.push(c); c.parentElement = e; return c; }, append() {}, after() {}, remove() {}, replaceWith() {}, insertAdjacentHTML() {},
    addEventListener() {}, removeEventListener() {}, focus() {}, blur() {}, click() {}, scrollIntoView() {}, scrollTo() {}, contains() { return false; },
    getBoundingClientRect() { return { top: 0, bottom: 100, left: 0, right: 100, height: 100, width: 100 }; }, offsetWidth: 100, offsetHeight: 100, clientWidth: 390, clientHeight: 800, scrollTop: 0, scrollLeft: 0, scrollHeight: 800, scrollWidth: 390,
    getClientRects() { return [1]; }, tabIndex: 0,
  };
  return e;
}
const body = el('body'); const app = el('main'); app.id = 'app'; const layer = el('div'); layer.id = 'layer'; const docEl = el('html');
docEl.dataset = { era: 'house' }; docEl.classList = body.classList;
const byId = { app, layer };
// the headline strip's places (paintHl writes the headline into one of them and empties the others): kept, so the test
// reads what is printed now
const HL_SLOTS = ['.hl-wrap', '#app .hlslot', '#modal .mslot', '#modal .cslot'];
const slots = Object.fromEntries(HL_SLOTS.map((q) => [q, el()]));
globalThis.document = {
  body, documentElement: docEl, hidden: false, activeElement: body,
  querySelector(q) { if (q === '#app') return app; if (q === '#layer') return layer; if (q === '#modal') return layer.children[0] || null; if (slots[q]) return slots[q]; return el(); },
  querySelectorAll(q) { if (q === '#modal .mslot, #modal .cslot, #app .hlslot') return [slots['#modal .mslot'], slots['#modal .cslot'], slots['#app .hlslot']]; return []; },
  getElementById(id) { return byId[id] || null; },
  createElement(t) { return el(t); }, addEventListener() {}, removeEventListener() {}, head: el('head'),
};
const storage = new Map();
globalThis.localStorage = { getItem: (k) => (storage.has(k) ? storage.get(k) : null), setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) };
globalThis.window = globalThis; globalThis.innerHeight = 844; globalThis.innerWidth = 390; globalThis.scrollY = 0;
Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });
globalThis.matchMedia = () => ({ matches: false, addEventListener() {} });
globalThis.history = { pushState() {} }; globalThis.location = { search: '?debug', reload() {} };
globalThis.requestAnimationFrame = (f) => setTimeout(f, 0); globalThis.cancelAnimationFrame = () => {};
globalThis.scrollTo = () => {}; globalThis.scrollBy = () => {}; globalThis.getSelection = () => ({ removeAllRanges() {} });
globalThis.getComputedStyle = () => ({ fontSize: '16px', overflowY: 'visible', overflowX: 'visible', getPropertyValue: () => '44' });
globalThis.CSS = { escape: (x) => x }; globalThis.Image = class { set src(v) { setTimeout(() => this.onload && this.onload(), 0); } };
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {};

// ---- the mock server: a receipt for every accepted nonce (world_nonces), a replay with every view, a boot per process ----
const ACC = 'pabcdefghij';
const srv = {
  state: null, rev: 1, boot: 'b0000000000000a1', receipts: new Set(), lastNonce: null,
  lossy: false, // every answer is lost (an act still lands): the wire is down
  staleView: null, // one canned view answer, served once
  profile429: false, profileSlowMs: 0,
  // an accepted act's answer is computed at once (by the process running now, its boot) and held until this promise
  // resolves: an answer the old process sent before it stopped, delivered after the new one has answered
  holdAct: null, held: 0,
  // past this many profile requests the file is "gone" (404), so a client that asks in a loop stops and its count stands
  // (a loop of answered promises would otherwise starve every timer and hang the test)
  profileLimit: 50,
  applied: {}, replays: {}, acts: [], views: [], profileRequests: 0,
  loseNext: 0, // the next this many act or view answers are lost (each still lands on the server)
  // the act request at this index of srv.acts is answered 429 with Retry-After 1, before the receipt check (the real
  // server's rate check runs before its nonce check): -1 = none
  act429At: -1,
  crowd: { victorian: 1, wildwest: 0, vegas: 0 }, meRequests: 0, // GET /api/me: the street counts, and how often it was asked
};
const loseOne = () => { if (srv.loseNext > 0) { srv.loseNext--; lose(); } };
srv.state = L.newGame('harness-seed-0001', { arena: true, humans: [], startClock: 30, seasonDays: R.seasonDays, logLimit: 8000, minGapMin: R.curtain.minGapMin, maxGapMin: R.curtain.maxGapMin, scriptRival: false, scriptItch: true, curtainGrid: true });
srv.state = L.joinWorld(srv.state, { id: ACC, name: 'Ruby_Buckshot', pastWhorescore: 0 });
srv.state = L.chooseStarter(srv.state, ACC, 'dolly'); srv.rev = 2;
function payload(q = {}) {
  const s = srv.state;
  const acct = L.getView(s, ACC, { focus: q.focus, logTail: 0 }).account;
  const ids = acct.whores.map((w) => w.id); const focus = q.focus && ids.includes(q.focus) ? q.focus : ids[0];
  const views = {}; const legal = {};
  for (const w of (q.all ? ids : [focus])) { views[w] = L.getView(s, w, { logTail: 0 }); legal[w] = L.legalActions(s, w); }
  const curtains = {};
  for (const tl of C.TIMELINE_IDS) { const T = s.timelines[tl]; curtains[tl] = { curtainNo: T.curtainNo, lastCurtainAt: T.lastCurtainAt, nextCurtainAt: L.nextForcedAt(s, T), earliestCurtainAt: T.lastCurtainAt + R.curtain.minGapMin, humans: 1, humanNames: [], sealing: L.sealingOf(s, tl), ready: L.curtainReady(s, tl) }; }
  const evs = L.eventsFor(s, ACC, q.tick || 0);
  const p = { boot: srv.boot, rev: srv.rev, tick: s.tick, serverNow: Date.now(), clock: s.clock, day: s.day, season: s.season, minPerSec: '0.016666667', epochMs: Date.now() - s.clock * 60000,
    account: { ...acct, id: ACC, lastNonce: srv.lastNonce }, focus, views, legal, curtains, events: evs.slice(-200), eventsGap: evs.length > 200, replayed: false };
  if (q.boards) { p.whorescore = L.whorescore(s, ACC); p.boards = L.leaderboards(s); }
  if (q.digest) { p.digest = {}; for (const w of acct.whores) p.digest[w.timeline] = L.awayDigest(s, w.id, acct.seen[w.timeline] || 0, { tonight: true }); }
  return p;
}
const answer = (status, data, hdr = {}) => ({ ok: status < 400, status, headers: { get: (h) => (h === 'content-type' ? 'application/json' : hdr[h] ?? null) }, json: async () => data });
const lose = () => { throw new TypeError('fetch failed'); };
globalThis.fetch = async (url, opts) => {
  const u = new URL(url, 'http://localhost');
  if (u.pathname === '/api/me') { srv.meRequests++; return answer(200, { user: { name: 'Ruby_Buckshot', member: true }, crowd: { ...srv.crowd }, tlCap: 10 }); }
  if (u.pathname === '/api/act') {
    const b = JSON.parse(opts.body);
    srv.acts.push({ action: b.action, nonce: b.nonce, args: b.args });
    if (srv.acts.length - 1 === srv.act429At) { srv.act429At = -1; return answer(429, { error: { code: 'rate-limited', message: 'Too many requests. Try again later.' } }, { 'retry-after': '1' }); }
    if (srv.receipts.has(b.nonce)) {
      srv.replays[b.nonce] = (srv.replays[b.nonce] || 0) + 1;
      if (srv.lossy) lose(); loseOne();
      return answer(200, { ...payload({ all: 1 }), replayed: true, events: [], eventsGap: false });
    }
    const tickBefore = srv.state.tick;
    try { srv.state = L[b.action](srv.state, ...b.args); } catch (e) { if (e.name === 'RulesError') { if (srv.lossy) lose(); return answer(400, { error: { code: 'illegal-move', message: e.message, reason: e.code } }); } throw e; }
    srv.receipts.add(b.nonce); srv.lastNonce = b.nonce; srv.rev++;
    srv.applied[b.nonce] = (srv.applied[b.nonce] || 0) + 1;
    if (srv.lossy) lose(); loseOne();
    const evs = L.eventsFor(srv.state, ACC, tickBefore);
    const res = answer(200, { ...payload({ all: ['chooseStarter', 'openTimeline'].includes(b.action) ? 1 : 0, focus: b.args[0] }), events: evs.slice(-200), eventsGap: evs.length > 200 });
    if (srv.holdAct) { const h = srv.holdAct; srv.holdAct = null; srv.held++; await h; }
    return res;
  }
  if (u.pathname === '/api/view') {
    const q = Object.fromEntries(u.searchParams.entries());
    srv.views.push(q);
    if (srv.lossy) lose(); loseOne();
    if (srv.staleView) { const x = srv.staleView; srv.staleView = null; return answer(200, x); }
    if (Number(q.since) === srv.rev) return answer(200, { same: true, boot: srv.boot, rev: srv.rev, serverNow: Date.now(), clock: srv.state.clock });
    return answer(200, payload({ ...q, all: q.all === '1', boards: q.boards === '1', digest: q.digest === '1', tick: Number(q.tick) || 0 }));
  }
  if (u.pathname === '/api/profile') {
    srv.profileRequests++;
    if (srv.profileRequests > srv.profileLimit) return answer(404, { error: { code: 'not-found', message: 'No such page in this edition.' } });
    if (srv.profileSlowMs) await wait(srv.profileSlowMs);
    if (srv.profile429) return answer(429, { error: { code: 'rate-limited', message: 'Too many requests. Try again later.' } }, { 'retry-after': '60' });
    return answer(200, { rev: srv.rev, profile: L.publicProfile(srv.state, ACC, u.searchParams.get('whore')) });
  }
  if (u.pathname === '/api/players') return answer(200, { players: [] });
  return answer(404, { error: { code: 'not-found', message: 'No such page in this edition.' } });
};

// ---- the page ----
await import(new URL('../../game/scandal.js', import.meta.url).href);
const lw = globalThis.__lw; const ui = lw.ui;
await wait(50); // net.start()
const acting = () => document.body.classList.contains('acting');
const sheet = () => layer.children.map((c) => c.innerHTML).join('\n');
async function enter() {
  srv.lossy = false; srv.staleView = null;
  if (ui.mode === 'arena') lw.leaveArena();
  lw.enterArena(payload({ all: 1, digest: 1, boards: 1 }), 'resume');
  if (ui.modal) lw.closeModal();
  await wait(30);
  assert.ok(ui.mode === 'arena' && ui.active, 'in the arena');
}
const markSeen = () => { srv.state = L.markSeen(srv.state, ACC, 'victorian'); srv.rev++; };
const knownOf = (view, gid) => { const g = view.timeline.gents.find((x) => x.id === gid); return J(g.known); };
after(() => { if (ui.mode === 'arena') lw.leaveArena(); Date.now = realNow; });

test('A: revs are compared within one boot: a restored backup (a new boot, a lower rev) is adopted with one request; a late answer of the same boot is dropped and the poll keeps its pace; another account\'s answer is dropped', async () => {
  await enter();
  assert.equal(ui.cache.boot, srv.boot, 'the first payload names the boot');
  const gid = lw.V().timeline.gents[0].id;
  // rev 3: the operator's backup is taken here
  srv.rev = 3; markSeen(); srv.rev = 3;
  const backup = { state: srv.state, rev: 3 };
  // rev 6 on screen: a study the backup never saw
  srv.state = L.study(srv.state, ui.active, gid); srv.rev = 6;
  await lw.poll(true); await wait(10);
  assert.equal(ui.cache.rev, 6); const studied = knownOf(lw.V(), gid);
  assert.notEqual(studied, knownOf(L.getView(backup.state, ui.active), gid), 'the study shows');
  // the server is restored to the backup and restarted: rev 3, a new boot
  srv.state = backup.state; srv.rev = backup.rev; srv.boot = 'b0000000000000b2';
  const v0 = srv.views.length;
  await lw.poll(true); await wait(200);
  assert.equal(srv.views.length - v0, 1, `one request adopts the restored world (${srv.views.length - v0} in 200 ms)`);
  assert.equal(ui.cache.rev, 3, 'the page is at the restored rev'); assert.equal(ui.cache.boot, 'b0000000000000b2');
  assert.equal(ui.cache.tick, srv.state.tick, 'the event cursor is the restored world\'s');
  assert.equal(knownOf(lw.V(), gid), knownOf(L.getView(backup.state, ui.active), gid), 'the screen shows the restored world');
  assert.equal(ui.cache.wantAll, true, 'the next poll brings every view of the restored world');
  // same boot: rev 10 adopted, then her seal lands at 11; a poll answered at 10 and delivered late is dropped
  for (let i = 0; i < 6; i++) markSeen(); srv.rev = 10;
  await lw.poll(true); await wait(10);
  assert.equal(ui.cache.rev, 10);
  const late = payload({ focus: ui.active }); assert.equal(late.rev, 10);
  const v = lw.V(); const place = L.casualPlace(v);
  const evs = await lw.act(L.sealPlan, ui.active, { place, cards: L.bestGuess(v, place).cards, grease: 0 });
  assert.ok(Array.isArray(evs), 'the seal landed'); assert.equal(ui.cache.rev, 11); assert.ok(lw.V().whore.plan && lw.V().whore.plan.sealed);
  srv.staleView = late;
  const v1 = srv.views.length;
  await lw.poll(true); await wait(200);
  assert.equal(ui.cache.rev, 11, 'the late rev 10 is dropped'); assert.ok(lw.V().whore.plan && lw.V().whore.plan.sealed, 'the plan stays sealed on screen');
  assert.equal(srv.views.length - v1, 1, `a dropped answer polls at the normal pace, never at once (${srv.views.length - v1} requests in 200 ms)`);
  // an answer for another account is dropped too
  const other = payload({ focus: ui.active }); other.rev = 99; other.account = { ...other.account, id: 'pzzzzzzzzzz' };
  srv.staleView = other;
  await lw.poll(true); await wait(10);
  assert.equal(ui.cache.acct.id, ACC); assert.equal(ui.cache.rev, 11);
  // the seal's answer left the event cursor behind the server's tick, so this poll asks whole and catches it up; from here
  // a quiet poll is a short "same"
  await lw.poll(true); await wait(10);
  assert.equal(ui.cache.tick, srv.state.tick); assert.equal(ui.cache.rev, 11);
  // a short "same" answer from another boot (a restart at the very rev she holds) is not her world: the next poll asks whole
  srv.boot = 'b0000000000000c3';
  await lw.poll(true); await wait(10);
  assert.equal(ui.cache.staleBoot, true);
  await lw.poll(true); await wait(10);
  assert.equal(srv.views[srv.views.length - 1].since, '0', 'the whole payload was asked for');
  assert.equal(ui.cache.boot, 'b0000000000000c3'); assert.equal(ui.cache.staleBoot, false);
});

test('B: an act whose answer was lost is settled with its own nonce before anything new goes up; play taps are held meanwhile; each act lands once; an unsettled act over a day old is dropped with a poll', async () => {
  await enter();
  const gents = lw.V().timeline.gents.map((g) => g.id);
  srv.lossy = true;
  const mark0 = srv.acts.length;
  const rA = await lw.act(L.study, ui.active, gents[0]);
  const postedA = srv.acts.slice(mark0);
  assert.ok(postedA.length >= 1 && postedA.every((a) => a.action === 'study'), J(postedA.map((a) => a.action)));
  const nA = postedA[0].nonce;
  assert.ok(postedA.every((a) => a.nonce === nA), 'the re-post carries A\'s own nonce');
  assert.equal(rA, null, 'the answer was lost'); assert.equal(srv.applied[nA], 1, 'A landed once');
  assert.equal(ui.cache.unsettled && ui.cache.unsettled.nonce, nA, 'A is kept as unsettled'); assert.ok(Number.isFinite(ui.cache.unsettled.at));
  assert.equal(ui.cache.wire, 'down'); assert.equal(acting(), true, 'play taps are held while A is unsettled');
  // B tapped while A is unsettled and the wire is still down: A is re-posted with its nonce, B never goes up
  const mark1 = srv.acts.length;
  const rB = await lw.act(L.study, ui.active, gents[1]);
  const since = srv.acts.slice(mark1);
  assert.equal(rB, null);
  assert.ok(since.length >= 1 && since.every((a) => a.nonce === nA), `only A went up: ${J(since.map((a) => (a.nonce === nA ? 'A' : 'NEW')))}`);
  assert.equal(ui.cache.unsettled.nonce, nA); assert.equal(acting(), true);
  // the wire is back: the good poll shows A landed (lastNonce) and settles it; the taps are free again
  srv.lossy = false;
  await lw.poll(true); await wait(40);
  assert.equal(ui.cache.unsettled, null, 'A is settled'); assert.equal(acting(), false); assert.equal(ui.cache.wire, 'ok');
  // now B goes up, once
  const mark2 = srv.acts.length;
  const rB2 = await lw.act(L.study, ui.active, gents[1]);
  assert.ok(Array.isArray(rB2), 'B landed');
  const postedB = srv.acts.slice(mark2);
  assert.equal(postedB.length, 1); const nB = postedB[0].nonce;
  assert.notEqual(nB, nA); assert.equal(srv.applied[nA], 1); assert.equal(srv.applied[nB], 1);
  // a reload with an unsettled act from an hour ago that never landed: taps held, settled on the first good poll, once
  const key = `lw-scandal-arena:${ACC}`;
  const nC = randomUUID();
  lw.leaveArena();
  let book = JSON.parse(localStorage.getItem(key));
  book.unsettled = { nonce: nC, name: 'study', args: [book.ui.active || `${ACC}:dolly`, gents[2]], at: Date.now() - 3_600_000 };
  localStorage.setItem(key, J(book));
  lw.enterArena(payload({ all: 1 }), 'resume'); if (ui.modal) lw.closeModal();
  assert.equal(ui.cache.unsettled && ui.cache.unsettled.nonce, nC); assert.equal(acting(), true, 'held from the reload');
  await until(() => ui.cache.unsettled === null);
  assert.equal(srv.applied[nC], 1, 'the re-post applied it once'); assert.equal(ui.cache.unsettled, null); assert.equal(acting(), false);
  // a reload with one left more than a day ago: dropped, never re-posted, and a poll shows what the District holds
  const nD = randomUUID();
  lw.leaveArena();
  book = JSON.parse(localStorage.getItem(key));
  book.unsettled = { nonce: nD, name: 'study', args: [`${ACC}:dolly`, gents[2]], at: Date.now() - 25 * 3_600_000 };
  localStorage.setItem(key, J(book));
  const v0 = srv.views.length;
  lw.enterArena(payload({ all: 1 }), 'resume'); if (ui.modal) lw.closeModal();
  assert.equal(ui.cache.unsettled, null, 'a day-old unsettled act is dropped'); assert.equal(acting(), false);
  await until(() => srv.views.slice(v0).some((q) => q.since === '0' && q.all === '1'));
  assert.ok(srv.views.slice(v0).some((q) => q.since === '0' && q.all === '1'), `a poll for every view instead (${J(srv.views.slice(v0))})`);
  assert.ok(!srv.acts.some((a) => a.nonce === nD), 'never re-posted');
  await until(() => JSON.parse(localStorage.getItem(key)).unsettled === null); // the bookkeeping is saved (saveSoon, 1.2 s)
  assert.equal(JSON.parse(localStorage.getItem(key)).unsettled, null, 'and gone from the bookkeeping');
  assert.ok(!srv.acts.some((a) => a.nonce === nD), 'still never re-posted');
});

test('F: a profile fetch answered 429 with Retry-After 60 asks once, says so in one plain line and waits, a rev change or not; once the clock passes retryAt an open asks once more, never two at a time', async () => {
  await enter();
  const rival = lw.V().timeline.rivals[0].id;
  const reopen = (n = 1) => { for (let i = 0; i < n; i++) { lw.closeModal(); lw.openModal('profile', rival); } };
  srv.profile429 = true; srv.profileRequests = 0;
  lw.openModal('profile', rival);
  await until(() => ui.cache.profiles[rival] && ui.cache.profiles[rival].error);
  for (let i = 0; i < 5; i++) { reopen(); await wait(5); }
  assert.equal(srv.profileRequests, 1, `${srv.profileRequests} profile requests under a 429 with Retry-After 60`);
  assert.equal(ui.modal && ui.modal.type, 'profile');
  assert.match(sheet(), /Her file is not available right now\. Try again in a minute\./);
  const p = ui.cache.profiles[rival]; assert.ok(p && p.error && p.retryAt > Date.now() + 50_000, J(p));
  // the clock passes retryAt with no rev change in between: the next open asks once more (a 429 again: a new wait)
  skewMs += 61_000;
  reopen();
  await until(() => srv.profileRequests === 2 && ui.cache.profiles[rival].retryAt > Date.now() + 50_000);
  assert.equal(srv.profileRequests, 2, `${srv.profileRequests} requests: one more once retryAt has passed`);
  reopen(3); await wait(20);
  assert.equal(srv.profileRequests, 2, 'and none inside the new wait');
  // a new rev empties the profile cache, but not the wait on a failed fetch
  markSeen();
  await lw.poll(true); await wait(20);
  reopen(); await wait(20);
  assert.equal(srv.profileRequests, 2, 'a rev change does not start the asking over');
  assert.match(sheet(), /not available right now/);
  // past the second wait the file comes; re-renders while the request is out ask nothing more
  srv.profile429 = false; srv.profileSlowMs = 100; skewMs += 61_000;
  reopen(4); // four renders while the one request is out (the answer is 100 ms away)
  assert.match(sheet(), /Fetching her file/);
  await until(() => ui.cache.profiles[rival] && !ui.cache.profiles[rival].error);
  await wait(20);
  assert.equal(srv.profileRequests, 3, `${srv.profileRequests} requests: one at a time per girl`);
  assert.ok(ui.cache.profiles[rival] && !ui.cache.profiles[rival].error && ui.cache.profiles[rival].id === rival, 'the file came');
  assert.doesNotMatch(sheet(), /not available/);
  lw.closeModal(); srv.profileSlowMs = 0; skewMs = 0;
});

// a Curtain on the clock in her Timeline (no seal: her Standing Order goes out), server side; its curtain and payout events
function curtainFalls() {
  const tl = srv.state.whores[ui.active].timeline; const T = srv.state.timelines[tl];
  const t0 = srv.state.tick;
  srv.state = L.advanceClock(srv.state, L.nextForcedAt(srv.state, T) - srv.state.clock + 1); srv.rev++;
  const evs = L.eventsFor(srv.state, ACC, t0).filter((e) => (e.type === 'curtain' && e.timeline === tl) || (e.type === 'payout' && e.whores[0] === ui.active));
  assert.ok(evs.some((e) => e.type === 'curtain') && evs.some((e) => e.type === 'payout'), 'a Curtain fell on her girl');
  return { tl, curtainIds: evs.filter((e) => e.type === 'curtain').map((e) => e.id) };
}
// a move she may make now, with its events (a study, or a look round a Place when every study is spent)
function aMove() {
  const legal = L.legalActions(srv.state, ui.active);
  const st = legal.find((a) => a.type === 'study'); if (st) return [L.study, ui.active, st.target];
  const ex = legal.find((a) => a.type === 'explore'); assert.ok(ex, 'a study or a look round is legal'); return [L.explore, ui.active, ex.place];
}
const onScreen = () => J({ whore: lw.V().whore, timeline: lw.V().timeline });
const markSeens = (from, tl) => srv.acts.slice(from).filter((a) => a.action === 'markSeen' && a.args[1] === tl).length;

test('G: the event cursor moves on polls only: a Curtain that fell before her act, or inside a poll the act overtook, reaches her once; the act\'s own events are not printed twice; a dropped all=1 answer asks again', async () => {
  // (1) no poll in flight: the Curtain falls on the clock, then her act lands; its answer carries only the act's events
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const T0 = ui.cache.tick;
  const cur = curtainFalls();
  const evs = await lw.act(...aMove());
  assert.ok(Array.isArray(evs) && evs.length > 0, 'her move landed');
  assert.equal(ui.cache.tick, T0, 'the act\'s answer leaves the event cursor where the poll left it');
  const ahead = [...ui.cache.evAhead];
  assert.ok(ahead.length > 0 && ahead.every((id) => id > T0), `the act's events are kept by id (${J(ahead)})`);
  const acts0 = srv.acts.length; const views0 = srv.views.length;
  await lw.poll(true);
  assert.equal(srv.views[views0].tick, String(T0), 'the poll asks from the cursor before the Curtain');
  assert.equal(srv.views[views0].since, '0', 'and for the whole payload: her rev is the server\'s, so a "same" would bring nothing');
  assert.ok(cur.curtainIds.every((id) => id > T0));
  const again = L.eventsFor(srv.state, ACC, T0).map((e) => e.id);
  assert.ok(ahead.every((id) => again.includes(id)), 'the poll brought the act\'s events again');
  assert.equal(ui.cache.evAhead.size, 0, 'and skipped them: past the cursor they are forgotten');
  assert.equal(ui.cache.tick, srv.state.tick);
  assert.ok(await until(() => ui.result && cur.curtainIds.includes(ui.result.curtain.id), 6000), 'the Curtain and its edition are shown');
  await until(() => markSeens(acts0, cur.tl) > 0);
  await lw.poll(true); await wait(30);
  assert.equal(markSeens(acts0, cur.tl), 1, 'shown once: one markSeen for the edition she read');
  // caught up: the cursor is the server's tick, and a quiet poll is a short "same" again
  const views2 = srv.views.length;
  await lw.poll(true); await wait(10);
  assert.equal(srv.views[views2].since, String(ui.cache.rev), 'a caught-up poll asks from her rev');
  // (2) the race: a poll answered before the Curtain-free act lands, delivered after it: dropped, and its events come again
  lw.go('front'); await wait(10);
  await lw.poll(true); await wait(10);
  const T1 = ui.cache.tick;
  const cur2 = curtainFalls();
  const late = payload({ focus: ui.active, all: true, tick: T1 });
  assert.ok(late.events.some((e) => cur2.curtainIds.includes(e.id)), 'the late answer carries the Curtain');
  assert.ok(Array.isArray(await lw.act(...aMove())), 'the act landed, a rev past the late answer');
  assert.equal(ui.cache.tick, T1);
  ui.cache.wantAll = true; srv.staleView = late;
  const acts1 = srv.acts.length; const views1 = srv.views.length;
  await lw.poll(true); await wait(10);
  assert.equal(srv.views[views1].all, '1');
  assert.equal(ui.cache.rev, srv.rev, 'the late answer is dropped'); assert.equal(ui.cache.tick, T1, 'and the cursor has not moved');
  assert.equal(ui.cache.wantAll, true, 'a dropped answer that asked for every view asks again');
  await lw.poll(true);
  assert.equal(srv.views[views1 + 1].tick, String(T1)); assert.equal(srv.views[views1 + 1].all, '1'); assert.equal(srv.views[views1 + 1].since, '0');
  assert.equal(ui.cache.wantAll, false); assert.equal(ui.cache.evAhead.size, 0);
  assert.ok(await until(() => ui.result && cur2.curtainIds.includes(ui.result.curtain.id), 6000), 'the Curtain inside the dropped answer is shown');
  await until(() => markSeens(acts1, cur2.tl) > 0);
  await lw.poll(true); await wait(30);
  assert.equal(markSeens(acts1, cur2.tl), 1, 'once');
  lw.go('front');
});

test('H: the boot fence: an act answered by the old process before a restore and delivered after it never rolls the page back, whether the new boot was adopted or only heard from in a "same"; a "same" from a boot that turns out older mends on the next answer', async () => {
  for (const how of ['adopted', 'same']) {
    await enter(); lw.go('front');
    await lw.poll(true); await wait(10);
    const backup = { state: srv.state, rev: srv.rev }; const oldBoot = srv.boot;
    const before = onScreen();
    // her study goes up; the old process applies it and answers, and the answer is held on the wire
    let release; srv.holdAct = new Promise((r) => { release = r; }); const held0 = srv.held;
    const pending = lw.act(...aMove());
    assert.ok(await until(() => srv.held === held0 + 1), 'the old process answered');
    // the backup is restored and the server restarted: a new boot, at a lower rev or at the very rev she holds
    srv.state = backup.state; srv.rev = how === 'adopted' ? backup.rev - 1 : ui.cache.rev; srv.boot = how === 'adopted' ? 'b00000000000d0e1' : 'b00000000000d0e2';
    await lw.poll(true); await wait(10);
    if (how === 'adopted') { assert.equal(ui.cache.boot, srv.boot); assert.equal(ui.cache.rev, srv.rev); } else { assert.equal(ui.cache.staleBoot, true); assert.equal(ui.cache.boot, oldBoot); }
    const rev0 = ui.cache.rev;
    release(); const r = await pending;
    assert.deepEqual(r, [], `${how}: the late answer is not taken`);
    assert.equal(ui.cache.rev, rev0, `${how}: the page keeps its rev`); assert.equal(onScreen(), before, `${how}: the move the restore discarded is not on screen`);
    assert.notEqual(ui.cache.boot === oldBoot && ui.cache.rev > backup.rev, true);
    await lw.poll(true); await wait(10);
    assert.equal(ui.cache.boot, srv.boot, `${how}: the restored world is on screen`); assert.equal(ui.cache.staleBoot, false);
    assert.equal(onScreen(), before);
  }
  // a "same" from a boot that is not the newest (the page guessed wrong): her own boot answers the next request, the fence
  // moves back, and the polls go back to asking from her rev
  await enter(); await lw.poll(true); await wait(10);
  const mine = srv.boot;
  srv.staleView = { same: true, boot: 'b00000000000dead', rev: ui.cache.rev, serverNow: Date.now(), clock: srv.state.clock };
  await lw.poll(true); await wait(10);
  assert.equal(ui.cache.staleBoot, true);
  const v0 = srv.views.length;
  await lw.poll(true); await wait(10);
  assert.equal(srv.views[v0].since, '0'); assert.equal(ui.cache.boot, mine); assert.equal(ui.cache.staleBoot, false);
  assert.equal(ui.cache.fence.boot, mine);
  await lw.poll(true); await wait(10);
  assert.equal(srv.views[v0 + 1].since, String(ui.cache.rev), 'the polls ask from her rev again');
});

// what the headline strip prints now, and the same as plain text
const printed = () => HL_SLOTS.map((q) => slots[q].innerHTML).join('\n');
const textOf = (html) => String(html).replace(/<[^>]+>/g, ' ').replace(/&times;/g, ' ').replace(/&#39;/g, '\'').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const herTl = () => srv.state.whores[ui.active].timeline;

test('I: a Standing Order Curtain shows the edition, and "went out without you" prints on the front page once the edition closes, once, never over the standings; the last-call headline goes when its Curtain falls', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  // the last-call tip was taught on an earlier evening: from here last call is a headline (wire news, the form the smoke saw
  // outlive its Curtain)
  ui.taught.add('lastcall'); ui.lastCallFor = null;
  const tl = herTl(); const T = srv.state.timelines[tl];
  srv.state = L.advanceClock(srv.state, L.nextForcedAt(srv.state, T) - srv.state.clock - 5); srv.rev++;
  await lw.poll(true);
  // her taps move the tips ahead of it on (a tip stays until her next tap)
  const lastCallUp = () => { if (/Last call/.test(printed())) return true; if (printed()) lw.ACTS['hl-close'](); return false; };
  assert.ok(await until(lastCallUp, 8000), `last call prints on the front page (${textOf(printed())})`);
  const t0 = srv.state.tick;
  const cur = curtainFalls();
  const pay = L.eventsFor(srv.state, ACC, t0).filter((e) => e.type === 'payout' && e.whores[0] === ui.active).pop();
  assert.equal(pay.data.standingOrder, true, 'she went out by Standing Order');
  await lw.poll(true);
  assert.ok(await until(() => ui.result && cur.curtainIds.includes(ui.result.curtain.id), 6000), 'the edition is on screen');
  assert.equal(ui.screen, 'results');
  skewMs += 4000; // past the results hold (the paper has spun in and the standings are read)
  try {
    await wait(1000);
    assert.doesNotMatch(printed(), /went out without you/, `nothing of the Standing Order prints over the standings (${textOf(printed())})`);
    assert.doesNotMatch(printed(), /Last call/, `the last call went with its Curtain (${textOf(printed())})`);
    lw.ACTS['after-results']();
    assert.equal(ui.screen, 'front');
    assert.ok(await until(() => /went out without you/.test(printed()), 8000), `the Standing Order headline prints on the front page (${textOf(printed())})`);
    const t = textOf(printed());
    assert.match(t, /Standing Order/);
    assert.ok(t.includes(`${C.CHARACTERS[L.charOf(ui.active)].short} went out without you`), t);
    assert.ok(t.includes(`${C.PLACES[pay.data.place].short}: `) && t.includes('Seal next time to choose the Place yourself.'), t);
    assert.doesNotMatch(printed(), /Last call/);
    // once: dismissed, and neither the next poll nor the edition closed again brings it back
    lw.ACTS['hl-close'](); await wait(400);
    await lw.poll(true); lw.ACTS['after-results'](); await wait(1000);
    assert.doesNotMatch(printed(), /went out without you/, `printed once (${textOf(printed())})`);
  } finally { skewMs -= 4000; }
});

test('J: a play tap made while the District is unreachable prints a plain line on the screen she is on, which stays until the move settles; the move goes in once', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const kept = () => body.children.find((c) => c.className === 'keptline' && !c.hidden);
  const LINE = 'Can\'t reach the District. Your move is kept and goes in when it\'s back.';
  assert.equal(kept(), undefined, 'no line while nothing is kept');
  // the wire goes down first (a poll fails, its headline prints and her next tap moves it on), then she taps a move
  srv.lossy = true;
  await lw.poll(true); assert.equal(ui.cache.wire, 'down');
  lw.ACTS['hl-close']();
  const m0 = srv.acts.length;
  const r = await lw.act(...aMove());
  assert.equal(r, null); const n = srv.acts[m0].nonce;
  assert.equal(ui.cache.unsettled && ui.cache.unsettled.nonce, n, 'the move is kept as unsettled');
  assert.ok(kept(), 'the line prints'); assert.equal(kept().textContent, LINE); assert.equal(kept().getAttribute('role'), 'status');
  // it stays: a dismissed headline, a re-render, another screen and back
  lw.ACTS['hl-close'](); lw.render(); lw.go('timelines'); await wait(20);
  assert.ok(kept(), 'still there on the Timelines page'); assert.equal(kept().textContent, LINE);
  lw.go('front'); await wait(20);
  assert.ok(kept(), 'still there on the front page');
  // the wire is back: the move settles (it had landed: once), and the line goes
  srv.lossy = false;
  await lw.poll(true);
  assert.ok(await until(() => ui.cache.unsettled === null), 'settled');
  assert.equal(kept(), undefined, 'the line goes when the move settles');
  assert.equal(srv.applied[n], 1, 'applied once');
});

test('K: back in the District after a short logout with nothing fallen: no While You Were Away strip or sheet, though the digest holds a forecast; a Curtain missed while out still prints', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const tl = herTl(); const wid = ui.active;
  srv.state = L.markSeen(srv.state, ACC, tl); srv.rev++; // she has read everything
  lw.leaveArena();
  const p = payload({ all: 1, digest: 1, boards: 1 });
  const hs = p.digest[tl].headlines;
  assert.ok(hs.some((h) => ['tonight', 'last-call'].includes(h.type)) && hs.every((h) => ['tonight', 'last-call', 'rota-fancy'].includes(h.type)), `the digest holds only forecasts (${J(hs.map((h) => h.type))})`);
  lw.enterArena(p, 'resume'); await wait(30);
  assert.equal(ui.strip, null, `no strip (${J(ui.strip)})`);
  assert.notEqual(ui.modal && ui.modal.type, 'digest', 'no sheet');
  // a Curtain falls while she is out: back in, it prints
  lw.leaveArena();
  srv.state = L.advanceClock(srv.state, L.nextForcedAt(srv.state, srv.state.timelines[tl]) - srv.state.clock + 1); srv.rev++;
  lw.enterArena(payload({ all: 1, digest: 1, boards: 1 }), 'resume'); await wait(30);
  assert.ok((ui.strip && ui.strip.wid === wid) || (ui.modal && ui.modal.type === 'digest'), `the missed Curtain prints (${J(ui.strip)} ${ui.modal && ui.modal.type})`);
  if (ui.modal) lw.closeModal();
});

test('L: the seal line says "Sealed" once: "Sealed for {place}. The Curtain falls at about {time}. {n} of {m} sealed; ..."', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  // a Curtain has just fallen (its edition read), so her seal cannot bring the next one down early: she stays sealed
  const cur = curtainFalls(); await lw.poll(true);
  assert.ok(await until(() => ui.result && cur.curtainIds.includes(ui.result.curtain.id), 6000), 'the edition');
  lw.ACTS['after-results']();
  const v = lw.V(); const place = L.casualPlace(v);
  assert.ok(Array.isArray(await lw.act(L.sealPlan, ui.active, { place, cards: L.bestGuess(v, place).cards, grease: 0 })), 'sealed');
  lw.go('front'); await wait(10);
  const m = app.innerHTML.match(/<p class="sealwait">([\s\S]*?)<\/p>/);
  assert.ok(m, 'the seal line is on the front page');
  const t = textOf(m[1]);
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.match(t, new RegExp(`^Sealed for ${esc(C.PLACES[place].short)}\\. The Curtain falls at about [^]+?\\. \\d+ of \\d+ sealed; it falls sooner only once everyone who played today has\\.$`), t);
  assert.equal(t.match(/Sealed/g).length, 1, t);
  assert.ok(Array.isArray(await lw.act(L.unseal, ui.active)), 'unsealed again for the tests after');
});

test('M: the pick page asks /api/me for the street counts each time it opens', async () => {
  lw.leaveArena();
  srv.crowd = { victorian: 1, wildwest: 0, vegas: 0 };
  const m0 = srv.meRequests;
  lw.go('pick');
  assert.ok(await until(() => srv.meRequests === m0 + 1), 'asked once on opening');
  await wait(20);
  assert.match(app.innerHTML, /1 girl on this street/);
  // others join while she reads the overview; the pick page opens again and says so
  srv.crowd = { victorian: 3, wildwest: 2, vegas: 0 };
  lw.go('title');
  const m1 = srv.meRequests;
  lw.go('pick');
  assert.ok(await until(() => /3 girls on this street/.test(app.innerHTML)), `the counts are fresh (${(app.innerHTML.match(/\d+ girls? on this street/g) || []).join(', ')})`);
  assert.match(app.innerHTML, /2 girls on this street/);
  assert.equal(srv.meRequests, m1 + 1, 'one request per opening');
  srv.crowd = { victorian: 1, wildwest: 0, vegas: 0 };
});

test('N: an unsettled act stamped more than a day ahead (the device clock moved back) is dropped, never re-posted; within a day either way it is kept and settled', async () => {
  await enter();
  const key = `lw-scandal-arena:${ACC}`; const wid = ui.active;
  const gid = lw.V().timeline.gents[0].id;
  const nF = randomUUID();
  lw.leaveArena();
  let book = JSON.parse(localStorage.getItem(key));
  book.unsettled = { nonce: nF, name: 'study', args: [wid, gid], at: Date.now() + 25 * 3_600_000 };
  localStorage.setItem(key, J(book));
  const v0 = srv.views.length;
  lw.enterArena(payload({ all: 1 }), 'resume'); if (ui.modal) lw.closeModal();
  assert.equal(ui.cache.unsettled, null, 'an act stamped 25 hours ahead is dropped'); assert.equal(acting(), false);
  await until(() => srv.views.slice(v0).some((q) => q.since === '0' && q.all === '1'));
  await wait(50);
  assert.ok(!srv.acts.some((a) => a.nonce === nF), 'never re-posted');
  const nNear = randomUUID();
  lw.leaveArena();
  book = JSON.parse(localStorage.getItem(key));
  book.unsettled = { nonce: nNear, name: 'study', args: [wid, gid], at: Date.now() + 3_600_000 };
  localStorage.setItem(key, J(book));
  lw.enterArena(payload({ all: 1 }), 'resume'); if (ui.modal) lw.closeModal();
  assert.equal(ui.cache.unsettled && ui.cache.unsettled.nonce, nNear, 'an hour ahead is inside the window: kept');
  assert.ok(await until(() => ui.cache.unsettled === null), 'and settled');
  assert.equal(srv.acts.filter((a) => a.nonce === nNear).length, 1, 're-posted once');
});

test('O: a replayed answer (the act landed, its answer and the next poll were lost) moves no cursor: the poll at once brings the act\'s own events and a Curtain that fell before it, the Curtain shown once', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const T0 = ui.cache.tick;
  const cur = curtainFalls();
  const acts0 = srv.acts.length;
  srv.loseNext = 2; // the act's answer, then the poll that asks whether it landed
  const r = await lw.act(...aMove());
  const posted = srv.acts.slice(acts0); const n = posted[0].nonce;
  assert.equal(posted.length, 2, 'posted, then re-posted with its nonce'); assert.ok(posted.every((a) => a.nonce === n));
  assert.equal(srv.applied[n], 1); assert.equal(srv.replays[n], 1, 'the re-post was answered replayed');
  assert.deepEqual(r, [], 'a replay hands the caller no events');
  assert.equal(ui.cache.tick, T0, 'the replay leaves the event cursor where the last poll left it');
  assert.equal(ui.cache.unsettled, null);
  const views0 = srv.views.length;
  assert.ok(await until(() => ui.result && cur.curtainIds.includes(ui.result.curtain.id), 8000), 'the Curtain and its edition are shown');
  const q = srv.views[views0];
  assert.equal(q.tick, String(T0), 'the next poll asks from the cursor'); assert.equal(q.since, '0', 'for the whole payload');
  const actEvs = L.eventsFor(srv.state, ACC, T0).filter((e) => !cur.curtainIds.includes(e.id) && (e.whores || [])[0] === ui.active && e.id > Math.max(...cur.curtainIds));
  assert.ok(actEvs.length > 0 && actEvs.every((e) => e.id > T0), 'the act\'s own events lie past the cursor, so that poll brought them');
  assert.ok(ui.cache.tick >= Math.max(...actEvs.map((e) => e.id)), 'and the cursor moved past them');
  await until(() => markSeens(acts0, cur.tl) > 0);
  await lw.poll(true); await wait(30);
  assert.equal(markSeens(acts0, cur.tl), 1, 'shown once');
  lw.go('front');
});

test('P: a re-post answered 429 keeps the move unsettled with its own nonce: a second tap is held through Retry-After, then the same nonce goes up again and is replayed; the move is applied once', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const legal = L.legalActions(srv.state, ui.active).filter((a) => a.type === 'study');
  assert.ok(legal.length >= 2, 'two studies are legal');
  const acts0 = srv.acts.length;
  // the study lands, its answer and the poll that asks whether it landed are lost, and the re-post is answered 429
  srv.loseNext = 2; srv.act429At = acts0 + 1;
  const r = await lw.act(L.study, ui.active, legal[0].target);
  const posted = srv.acts.slice(acts0); const n = posted[0].nonce;
  assert.equal(r, null);
  assert.equal(posted.length, 2, `posted, then re-posted (${J(posted.map((a) => a.action))})`); assert.ok(posted.every((a) => a.nonce === n), 'the re-post carries its own nonce');
  assert.equal(srv.applied[n], 1, 'it landed once'); assert.equal(srv.act429At, -1, 'the re-post was answered 429');
  assert.equal(ui.cache.unsettled && ui.cache.unsettled.nonce, n, 'a 429 to the re-post leaves the move unsettled, its nonce kept');
  assert.equal(acting(), true, 'play taps are held');
  const kept = body.children.find((c) => c.className === 'keptline' && !c.hidden);
  assert.ok(kept, 'the kept-move line prints'); assert.doesNotMatch(kept.textContent, /Can't reach/, `a 429 is not an outage (${kept.textContent})`);
  // a second study tapped inside Retry-After: held, nothing goes up (neither the new move nor an early re-post)
  const acts1 = srv.acts.length;
  const r2 = await lw.act(L.study, ui.active, legal[1].target);
  assert.equal(r2, null, 'the second tap is held');
  assert.equal(srv.acts.length, acts1, `nothing went up inside Retry-After (${J(srv.acts.slice(acts1).map((a) => (a.nonce === n ? 'A' : 'NEW')))})`);
  assert.equal(ui.cache.unsettled && ui.cache.unsettled.nonce, n);
  // past Retry-After the same nonce goes up again and is answered replayed: settled, once
  assert.ok(await until(() => ui.cache.unsettled === null, 4000), 'settled after Retry-After');
  const later = srv.acts.slice(acts1);
  assert.ok(later.length >= 1 && later.every((a) => a.nonce === n), `only the same nonce went up (${J(later.map((a) => (a.nonce === n ? 'A' : 'NEW')))})`);
  assert.equal(srv.replays[n], 1, 'the next re-post was answered replayed');
  assert.equal(srv.applied[n], 1, 'applied once'); assert.equal(acting(), false, 'the taps are free again');
  lw.go('front');
});

test('Q: the first act answer after a server restart moves no cursor: an immediate poll asks from the old cursor and a payout that fell in between shows; an act answer from a restored backup below the cursor adopts the server\'s tick and asks for the return digest', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const T0 = ui.cache.tick;
  const backup = { state: srv.state, tick: srv.state.tick };
  const cur = curtainFalls();
  const pay = L.eventsFor(srv.state, ACC, T0).filter((e) => e.type === 'payout' && e.whores[0] === ui.active);
  assert.ok(pay.length > 0 && pay.every((e) => e.id > T0), 'a payout of hers past the cursor');
  // the server restarts (the same world, a new boot) and her next act is its first answer to her
  srv.boot = 'b00000000000f0a1';
  const acts0 = srv.acts.length; const views0 = srv.views.length;
  const evs = await lw.act(...aMove());
  assert.ok(Array.isArray(evs) && evs.length > 0, 'her move landed');
  assert.equal(ui.cache.boot, srv.boot, 'the new boot is adopted');
  assert.ok(srv.state.tick > T0);
  assert.equal(ui.cache.tick, T0, 'a reboot moves no cursor from an act answer');
  assert.ok(await until(() => srv.views.length > views0, 1500), 'an immediate poll, not one at the normal pace');
  const q = srv.views[views0];
  assert.equal(q.tick, String(T0), 'the poll asks from the old cursor'); assert.equal(q.since, '0', 'for the whole payload');
  assert.ok(await until(() => ui.result && cur.curtainIds.includes(ui.result.curtain.id), 8000), 'the payout\'s Curtain and edition are shown');
  await until(() => markSeens(acts0, cur.tl) > 0);
  await lw.poll(true); await wait(30);
  assert.equal(markSeens(acts0, cur.tl), 1, 'shown once');
  lw.ACTS['after-results'](); lw.go('front'); await wait(10);
  // a restored backup: the server's tick is below her cursor; her act's answer adopts the server's tick, and the return
  // digest is asked for (digest=1)
  const cursor = ui.cache.tick;
  srv.state = backup.state; srv.rev = Math.max(1, ui.cache.rev - 3); srv.boot = 'b00000000000f0a2';
  const views1 = srv.views.length;
  assert.ok(Array.isArray(await lw.act(...aMove())), 'her move landed on the restored world');
  assert.ok(srv.state.tick < cursor, `the restored world (tick ${srv.state.tick}) is behind her cursor (${cursor})`);
  assert.equal(ui.cache.tick, srv.state.tick, 'the cursor is the restored world\'s tick');
  assert.ok(await until(() => srv.views.slice(views1).some((x) => x.digest === '1'), 2000), `the return digest is asked for (${J(srv.views.slice(views1))})`);
  if (ui.modal) lw.closeModal();
  lw.go('front');
});

test('R: after an eviction and a rehire elsewhere, an open tab on the retired girl renders the live one and keeps polling', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const old = ui.active; assert.ok(old.endsWith(':dolly'), old);
  // the operator evicts her and she hires Dolly again from another device: the account's live girl is dolly#2
  L.retireWhore(srv.state, old); srv.state = L.chooseStarter(srv.state, ACC, 'dolly'); srv.rev++;
  const fresh = `${ACC}:dolly#2`;
  assert.deepEqual(L.getView(srv.state, ACC, { logTail: 0 }).account.whores.map((w) => w.id), [fresh]);
  app._html = '';
  const views0 = srv.views.length;
  await lw.poll(true);
  assert.equal(ui.active, fresh, 'the page follows the live girl');
  assert.ok(lw.V() && lw.V().whore.id === fresh, 'her view is on hand');
  assert.ok(app.innerHTML.length > 0, 'the page rendered');
  assert.ok(await until(() => srv.views.length > views0 + 1, 7000), 'and the next poll was scheduled');
});
