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
// digest); after an eviction and a rehire elsewhere, an open tab follows the live girl and keeps polling. And smoke r6
// (S to V): a move carries the curtainNo it was tapped under, and one kept through an outage whose Curtain fell meanwhile
// is refused curtain-passed, cleared, and said in one line (a tap racing the fall too); the outage poll ramps 3 s, 5 s,
// 8 s, then every 10 s; a profile shown as unavailable offers no TRADE GOSSIP or STUDY; a 429 wait is capped at 60 s.
// And the r7 review (Q, W): a move refused after a restored backup asks for the return digest and says the District was
// set back; a tap queued behind a slow move keeps the curtainNo of the tap, so a Curtain that fell meanwhile refuses it.
// And the lead's r8 edits (X, Y): a new night brought to the plan screen by a replayed re-post clears her picks, so the
// next seal names cards of the new hand; a cancel refused curtain-passed stops the Place or gentleman tap that needed it.
// And Codex round 3 (Z to Z3): a new night brought by a quiet answer (a replayed re-post, or a kept move settled after a
// 429) redraws the plan screen with the new hand before the taps are released, and the card tapped then sealed is the
// card shown; one poll bringing two Curtains shows both editions in order and marks the Timeline seen once, after the
// last; patchPlay keeps a card only when its position and its card id are unchanged.
// And the lead's round-3 edit (Z4): a Quick Change kept through a lost answer and settled later the same night redraws
// the plan screen with the new hand, clears her picks and says the kept move has gone in; a live Quick Change keeps her
// other picks for its handler.
// And Codex round 4 (Z5, Z6): a Curtain that falls inside an act's own catch-up tick (the markSeen of the edition on
// screen) is shown next, and markSeen carries the newest event of the edition shown, so the seen cursor never passes an edition she has
// not seen and the return digest keeps it; a 401 from a request sent under an earlier sign-in never signs out the
// account signed in now.
// And the lead's round-4 edits (Z7 to Z9): an edition whose Curtain came down while she left the District (the Curtain
// fell inside the leave's own markSeen) or switched girl is never drawn; a markSeen that is not an edition's (the return
// digest's) carries the newest event the page has had, so a Curtain that falls inside its own catch-up stays news; the
// welcome evening's join answered 401 after she logged out and another account logged in leaves the new account as it is.
// Run: node --test 'server/test/*.test.mjs' (zero dependencies; each test file runs in its own process).
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import * as L from '../../engine/rules.js';

const C = L.CONTENT; const R = L.RULES;
const J = JSON.stringify;

// ---- the page's world: timers that never hold the process open, a clock the test can move, a DOM that renders nothing --
const realSetTimeout = globalThis.setTimeout; const realSetInterval = globalThis.setInterval;
// every poll the page schedules (schedulePoll's timer), with its delay, so a test can read the pace it chose
const pollDelays = [];
globalThis.setTimeout = (fn, ms, ...a) => { if (typeof fn === 'function' && String(fn) === '() => poll()') pollDelays.push(ms); const t = realSetTimeout(fn, ms, ...a); t.unref?.(); return t; };
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
  down: false, // the server is not running: every request fails and nothing lands
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
  act429At: -1, act429Ra: '1', // and its Retry-After
  view429: null, // the next view request is answered 429 with this Retry-After (a string), once
  crowd: { victorian: 1, wildwest: 0, vegas: 0 }, meRequests: 0, // GET /api/me: the street counts, and how often it was asked
  user: 'Ruby_Buckshot', // the nom de plume the session cookie names (GET /api/me, POST /api/login)
  // the next act or join answered 401 not-signed-in once this promise resolves (the session it went up under has gone
  // meanwhile): null = none
  hold401: null,
  // run once inside the next accepted act, after the server's tick before it is read and before the move applies: the
  // request's own catch-up tick (world.apply), so whatever it brings down comes back among the act's events
  beforeApply: null,
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
// the actions whose args[0] is the account (validate.mjs ACCOUNT_SCOPED): no curtain; every other carries the curtainNo
// of her Timeline when the tap was made, and the server refuses it once that Curtain has fallen (server.mjs act)
const ACCOUNT_SCOPED = ['chooseStarter', 'openTimeline', 'markSeen'];
const answer = (status, data, hdr = {}) => ({ ok: status < 400, status, headers: { get: (h) => (h === 'content-type' ? 'application/json' : hdr[h] ?? null) }, json: async () => data });
const lose = () => { throw new TypeError('fetch failed'); };
globalThis.fetch = async (url, opts) => {
  const u = new URL(url, 'http://localhost');
  if (srv.down && u.pathname !== '/api/act') lose();
  if (u.pathname === '/api/me') { srv.meRequests++; return answer(200, { user: { name: srv.user, member: true }, crowd: { ...srv.crowd }, tlCap: 10 }); }
  if (u.pathname === '/api/login') return answer(200, { user: { name: srv.user, member: false } });
  if (u.pathname === '/api/logout') return answer(200, {});
  if (u.pathname === '/api/join') {
    if (srv.hold401) { const h = srv.hold401; srv.hold401 = null; srv.held++; await h; return answer(401, { error: { code: 'not-signed-in', message: 'Your name\'s not on tonight\'s list. Log in at the front desk.' } }); }
    return answer(409, { error: { code: 'already-in-world', message: 'You\'re already on the street.' } });
  }
  if (u.pathname === '/api/act') {
    const b = JSON.parse(opts.body);
    srv.acts.push({ action: b.action, nonce: b.nonce, args: b.args, curtain: b.curtain });
    if (srv.hold401) { const h = srv.hold401; srv.hold401 = null; srv.held++; await h; return answer(401, { error: { code: 'not-signed-in', message: 'Your name\'s not on tonight\'s list. Log in at the front desk.' } }); }
    if (srv.down) lose(); // the attempt is counted; nothing reaches the server
    if (srv.acts.length - 1 === srv.act429At) { srv.act429At = -1; return answer(429, { error: { code: 'rate-limited', message: 'Too many requests. Try again later.' } }, { 'retry-after': srv.act429Ra }); }
    const girl = !ACCOUNT_SCOPED.includes(b.action);
    if (girl ? !Number.isSafeInteger(b.curtain) || b.curtain < 0 : b.curtain !== undefined && !(Number.isSafeInteger(b.curtain) && b.curtain >= 0)) return answer(400, { error: { code: 'bad-request', message: 'The clerk has sent your form back with every wrong box circled in red.' } });
    if (srv.receipts.has(b.nonce)) {
      srv.replays[b.nonce] = (srv.replays[b.nonce] || 0) + 1;
      if (srv.lossy) lose(); loseOne();
      return answer(200, { ...payload({ all: 1 }), replayed: true, events: [], eventsGap: false });
    }
    if (girl && srv.state.whores[b.args[0]] && srv.state.timelines[srv.state.whores[b.args[0]].timeline].curtainNo !== b.curtain) {
      srv.passed = (srv.passed || 0) + 1;
      if (srv.lossy) lose();
      return answer(409, { error: { code: 'curtain-passed', message: 'The Curtain fell before that move went in.' } });
    }
    const tickBefore = srv.state.tick;
    // the hook names the act it is for (it answers false for any other, and stays armed)
    if (srv.beforeApply && srv.beforeApply(b) !== false) {
      srv.beforeApply = null;
      // world.apply checks the curtain again after its catch-up tick: a Curtain that fell inside the request refuses a girl's move
      if (girl && srv.state.timelines[srv.state.whores[b.args[0]].timeline].curtainNo !== b.curtain) return answer(409, { error: { code: 'curtain-passed', message: 'The Curtain fell before that move went in.' } });
    }
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
    if (srv.view429) { const ra = srv.view429; srv.view429 = null; return answer(429, { error: { code: 'rate-limited', message: 'Too many requests. Try again later.' } }, { 'retry-after': ra }); }
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
// the curtainNo of her girl's Timeline on the server now (what a tap made now carries)
const curNo = () => { const w = srv.state.whores[ui.active || `${ACC}:dolly`] || Object.values(srv.state.whores).find((x) => x.account === ACC && !x.retired); return srv.state.timelines[w.timeline].curtainNo; };
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
  book.unsettled = { nonce: nC, name: 'study', args: [book.ui.active || `${ACC}:dolly`, gents[2]], curtain: curNo(), at: Date.now() - 3_600_000 };
  localStorage.setItem(key, J(book));
  lw.enterArena(payload({ all: 1 }), 'resume'); if (ui.modal) lw.closeModal();
  assert.equal(ui.cache.unsettled && ui.cache.unsettled.nonce, nC); assert.equal(acting(), true, 'held from the reload');
  await until(() => ui.cache.unsettled === null);
  assert.equal(srv.applied[nC], 1, 'the re-post applied it once'); assert.equal(ui.cache.unsettled, null); assert.equal(acting(), false);
  // a reload with one left more than a day ago: dropped, never re-posted, and a poll shows what the District holds
  const nD = randomUUID();
  lw.leaveArena();
  book = JSON.parse(localStorage.getItem(key));
  book.unsettled = { nonce: nD, name: 'study', args: [`${ACC}:dolly`, gents[2]], curtain: curNo(), at: Date.now() - 25 * 3_600_000 };
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
// A move on her girl carries the curtainNo her page shows, so one tapped after a Curtain the page has not heard of is
// refused curtain-passed (test S). For a move that lands after a Curtain whose events she has not had yet, her page
// first learns the new curtainNo without them: an account-scoped act's answer (markSeen of a street she is not on)
// carries her girl's view and, being an act's answer, never moves the event cursor.
async function learnCurtainNo() {
  const other = C.TIMELINE_IDS.find((tl) => tl !== srv.state.whores[ui.active].timeline);
  assert.ok(Array.isArray(await lw.act(L.markSeen, ACC, other)), 'the account-scoped act landed');
  assert.equal(lw.V().timeline.curtainNo, curNo(), 'her page shows the new curtainNo');
}
const onScreen = () => J({ whore: lw.V().whore, timeline: lw.V().timeline });
const markSeens = (from, tl) => srv.acts.slice(from).filter((a) => a.action === 'markSeen' && a.args[1] === tl).length;

test('G: the event cursor moves on polls only: a Curtain that fell before her act, or inside a poll the act overtook, reaches her once; the act\'s own events are not printed twice; a dropped all=1 answer asks again', async () => {
  // (1) no poll in flight: the Curtain falls on the clock, then her act lands; its answer carries only the act's events
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const T0 = ui.cache.tick;
  const cur = curtainFalls();
  await learnCurtainNo();
  assert.equal(ui.cache.tick, T0);
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
  await learnCurtainNo();
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
  book.unsettled = { nonce: nF, name: 'study', args: [wid, gid], curtain: curNo(), at: Date.now() + 25 * 3_600_000 };
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
  book.unsettled = { nonce: nNear, name: 'study', args: [wid, gid], curtain: curNo(), at: Date.now() + 3_600_000 };
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
  await learnCurtainNo();
  assert.equal(ui.cache.tick, T0);
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

test('Q: the first act answer after a server restart moves no cursor: an immediate poll asks from the old cursor and a payout that fell in between shows; a move on her girl after a restored backup below the cursor is refused curtain-passed (it carries the curtainNo of the world the restore took back), and the poll that follows adopts the server\'s tick, asks for the return digest and says the District was set back, not that a Curtain fell', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const T0 = ui.cache.tick;
  const backup = { state: srv.state, tick: srv.state.tick };
  const cur = curtainFalls();
  const pay = L.eventsFor(srv.state, ACC, T0).filter((e) => e.type === 'payout' && e.whores[0] === ui.active);
  assert.ok(pay.length > 0 && pay.every((e) => e.id > T0), 'a payout of hers past the cursor');
  await learnCurtainNo();
  assert.equal(ui.cache.tick, T0);
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
  // a restored backup: the server's tick is below her cursor, and its Curtain is behind the one her page shows. Her next
  // move on her girl carries the page's curtainNo, so the server refuses it curtain-passed; the poll that follows is the
  // first answer from the restored boot: it adopts the server's tick as the cursor, asks for the return digest (digest=1)
  // and the line says the District was set back, never that a Curtain fell
  const cursor = ui.cache.tick; const shown = lw.V().timeline.curtainNo;
  srv.state = backup.state; srv.rev = Math.max(1, ui.cache.rev - 3); srv.boot = 'b00000000000f0a2';
  assert.ok(srv.state.tick < cursor, `the restored world (tick ${srv.state.tick}) is behind her cursor (${cursor})`);
  assert.ok(curNo() < shown, `the restored Curtain (${curNo()}) is behind the one on her page (${shown})`);
  const views1 = srv.views.length; const acts1 = srv.acts.length; const passed1 = srv.passed || 0; const rev1 = srv.rev;
  assert.equal(await lw.act(...aMove()), null, 'her move on her girl is refused');
  const sent = srv.acts.slice(acts1);
  assert.equal(sent.length, 1, `posted once (${J(sent.map((a) => a.action))})`); assert.equal(sent[0].curtain, shown, 'carrying the curtainNo her page showed');
  assert.equal(srv.passed, passed1 + 1, 'refused curtain-passed');
  assert.ok(!srv.receipts.has(sent[0].nonce) && !srv.applied[sent[0].nonce] && srv.rev === rev1, 'nothing landed on the restored world');
  assert.equal(ui.cache.boot, srv.boot, 'the restored boot is adopted');
  assert.equal(ui.cache.tick, srv.state.tick, 'the cursor is the restored world\'s tick');
  assert.ok(await until(() => srv.views.slice(views1).some((x) => x.digest === '1'), 2000), `the return digest is asked for (${J(srv.views.slice(views1))})`);
  const SET_BACK = 'The District was set back to an earlier hour, so your move did not go in. Have another look.';
  // every headline printed on the way to it is read (and moved on, as her taps would): none says a Curtain fell
  const seen = [];
  const shows = await until(() => { const t = textOf(printed()); if (t) seen.push(t); if (t.includes(SET_BACK)) return true; if (printed()) lw.ACTS['hl-close'](); return false; }, 4000);
  assert.ok(shows, `the line says the District was set back (${J(seen)})`);
  assert.ok(!seen.some((t) => t.includes('The Curtain fell before your move went in.')), `never that a Curtain fell (${J(seen)})`);
  lw.ACTS['hl-close']();
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

// the in-voice lines of the curtain-passed refusal (docs/server-api.md 12.14)
const PASSED = 'The Curtain fell before your move went in.';
const PASSED_SO = 'The Curtain fell before your move went in. Her Standing Order went out for her.';
const keptLine = () => body.children.find((c) => c.className === 'keptline' && !c.hidden);
// true once `want` is in the headline strip, moving on any other headline in front of it (as her taps would); false after `ms`
async function lineShows(want, ms = 8000) {
  return until(() => { const t = textOf(printed()); if (t.includes(want)) return true; if (printed()) lw.ACTS['hl-close'](); return false; }, ms);
}
// a Curtain on the server, shown to her (the edition), then closed: back on the front page
async function editionRead(cur) {
  assert.ok(await until(() => ui.result && cur.curtainIds.includes(ui.result.curtain.id), 6000), 'the edition is shown');
  lw.ACTS['after-results'](); lw.go('front'); await wait(10);
}
const sealNow = () => { const v = lw.V(); const place = L.casualPlace(v); return lw.act(L.sealPlan, ui.active, { place, cards: L.bestGuess(v, place).cards, grease: 0 }); };
const sealedOnServer = () => { const w = srv.state.whores[ui.active]; return !!(w.plan && w.plan.sealed); };

test('S: a move kept through an outage and re-posted after its Curtain fell is refused curtain-passed: the kept move is cleared, the line says so (with the Standing Order sentence when she went out by it), nothing lands on the next night, and the next seal works; a fresh tap racing the fall gets the same line; a kept move without its curtain (an older build) is dropped', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  // just after a Curtain, its edition read, so her seal cannot bring the next one down early
  const c0 = curtainFalls(); await lw.poll(true); await editionRead(c0);
  // (1) the server is killed just before the Curtain; she taps Seal: kept, carrying the curtainNo she tapped under
  const k = curNo();
  assert.equal(lw.V().timeline.curtainNo, k);
  srv.down = true;
  const a0 = srv.acts.length;
  assert.equal(await sealNow(), null, 'no answer');
  const u = ui.cache.unsettled;
  assert.ok(u && u.name === 'sealPlan', 'the seal is kept'); assert.equal(u.curtain, k, 'with the curtainNo of the tap');
  const n = u.nonce;
  assert.ok(srv.acts.slice(a0).length >= 1 && srv.acts.slice(a0).every((a) => a.nonce === n && a.curtain === k), J(srv.acts.slice(a0)));
  assert.ok(!srv.receipts.has(n), 'nothing reached the server'); assert.equal(acting(), true); assert.ok(keptLine(), 'the kept line prints');
  // the Curtain falls while the server is down; with no seal she goes out by Standing Order
  const t0 = srv.state.tick;
  const cur = curtainFalls();
  assert.ok(L.eventsFor(srv.state, ACC, t0).some((e) => e.type === 'payout' && e.whores[0] === ui.active && e.data.standingOrder), 'by Standing Order');
  // the server is back after the fall: the good poll settles the kept seal, which the server refuses
  srv.down = false;
  const passed0 = srv.passed || 0;
  await lw.poll(true);
  assert.ok(await until(() => ui.cache.unsettled === null, 4000), 'the kept seal is cleared');
  assert.equal(srv.passed, passed0 + 1, 'the re-post was refused curtain-passed, once');
  assert.ok(srv.acts.slice(a0).every((a) => a.nonce === n), 'nothing else went up');
  assert.ok(!srv.receipts.has(n) && !srv.applied[n], 'never applied'); assert.equal(sealedOnServer(), false, 'nothing is sealed for the next night');
  assert.equal(acting(), false, 'the taps are free'); assert.equal(keptLine(), undefined, 'the kept line goes');
  await until(() => !ui.cache.busy);
  assert.equal(ui.cache.wire, 'ok');
  await editionRead(cur);
  assert.ok(await lineShows(PASSED_SO), `the line (${textOf(printed())})`);
  lw.ACTS['hl-close']();
  // the next seal works, under the new Curtain
  const a1 = srv.acts.length;
  assert.ok(Array.isArray(await sealNow()), 'the next seal lands');
  assert.equal(srv.acts.length, a1 + 1); assert.equal(srv.acts[a1].curtain, k + 1, 'carrying the new curtainNo');
  assert.equal(sealedOnServer(), true); assert.ok(lw.V().whore.plan && lw.V().whore.plan.sealed, 'sealed on screen');
  // (2) a fresh tap that races the fall: the Curtain falls on the server between her last poll and her tap
  assert.ok(Array.isArray(await lw.act(L.unseal, ui.active)), 'unsealed');
  const cur2 = curtainFalls();
  const a2 = srv.acts.length; const passed1 = srv.passed;
  assert.equal(await lw.act(...aMove()), null, 'refused');
  assert.equal(srv.acts.length, a2 + 1, 'posted once, never re-posted'); assert.equal(srv.passed, passed1 + 1);
  assert.equal(ui.cache.unsettled, null, 'a refusal is not kept'); assert.equal(acting(), false);
  await editionRead(cur2);
  assert.ok(await lineShows(PASSED_SO), `the same line (${textOf(printed())})`);
  lw.ACTS['hl-close']();
  // (3) sealed before the outage: the kept move (an unseal) is refused after the Curtain fell on her sealed plan, and the
  // line is the first sentence only
  assert.ok(Array.isArray(await sealNow()), 'sealed');
  srv.down = true;
  assert.equal(await lw.act(L.unseal, ui.active), null);
  assert.ok(ui.cache.unsettled && ui.cache.unsettled.name === 'unseal');
  const t3 = srv.state.tick;
  const cur3 = curtainFalls();
  assert.ok(L.eventsFor(srv.state, ACC, t3).some((e) => e.type === 'payout' && e.whores[0] === ui.active && !e.data.standingOrder), 'on her sealed plan');
  srv.down = false;
  await lw.poll(true);
  assert.ok(await until(() => ui.cache.unsettled === null, 4000), 'cleared');
  await editionRead(cur3);
  assert.ok(await lineShows(PASSED), `the first sentence (${textOf(printed())})`);
  assert.ok(!textOf(printed()).includes('Her Standing Order went out for her.'), textOf(printed()));
  lw.ACTS['hl-close']();
  // (4) a kept move from a build that did not record its curtain: dropped on entry, never re-posted
  const key = `lw-scandal-arena:${ACC}`; const nOld = randomUUID(); const wid = ui.active;
  lw.leaveArena();
  const book = JSON.parse(localStorage.getItem(key));
  book.unsettled = { nonce: nOld, name: 'study', args: [wid, C.TIMELINES[srv.state.whores[wid].timeline].gents[0]], at: Date.now() - 60_000 };
  localStorage.setItem(key, J(book));
  lw.enterArena(payload({ all: 1 }), 'resume'); if (ui.modal) lw.closeModal();
  assert.equal(ui.cache.unsettled, null, 'dropped'); assert.equal(acting(), false);
  await wait(100);
  assert.ok(!srv.acts.some((a) => a.nonce === nOld), 'never re-posted');
  lw.go('front');
});

test('T: while the District is unreachable the poll ramps 3 s, 5 s, 8 s, then every 10 s, and the first answer resets it; after a short outage the first poll goes within 3 to 5 s', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  srv.down = true;
  const d0 = pollDelays.length;
  for (let i = 0; i < 5; i++) await lw.poll(true);
  assert.deepEqual(pollDelays.slice(d0), [3000, 5000, 8000, 10000, 10000], 'the ramp');
  assert.equal(ui.cache.wire, 'down');
  srv.down = false;
  const d1 = pollDelays.length;
  await lw.poll(true);
  assert.deepEqual(pollDelays.slice(d1), [5000], 'an answer: the normal pace');
  srv.down = true;
  const d2 = pollDelays.length;
  await lw.poll(true);
  assert.deepEqual(pollDelays.slice(d2), [3000], 'the next outage starts the ramp over');
  // the server restarts at once: the scheduled poll finds it
  srv.down = false;
  const v0 = srv.views.length; const t0 = realNow();
  assert.ok(await until(() => srv.views.length > v0, 6000), 'a poll went');
  const took = realNow() - t0;
  assert.ok(took >= 2500 && took <= 5000, `the first poll after the restart went after ${took} ms`);
  assert.ok(await until(() => ui.cache.wire === 'ok', 2000), 'the wire is back');
});

test('U: a profile shown as unavailable offers neither TRADE GOSSIP nor STUDY; the buttons come back with the file', async () => {
  await enter();
  const rival = lw.V().timeline.rivals[0].id;
  delete ui.cache.profiles[rival];
  srv.profile429 = true; srv.profileRequests = 0; srv.profileSlowMs = 0;
  lw.openModal('profile', rival);
  assert.ok(await until(() => ui.cache.profiles[rival] && ui.cache.profiles[rival].error), 'the fetch failed');
  await wait(10);
  assert.match(sheet(), /Her file is not available right now/);
  assert.doesNotMatch(sheet(), /data-act="gossip"/, 'no TRADE GOSSIP');
  assert.doesNotMatch(sheet(), /data-act="study"/, 'no STUDY');
  lw.closeModal(); lw.openModal('profile', rival); await wait(10);
  assert.doesNotMatch(sheet(), /data-act="gossip"|data-act="study"/, 'nor on a reopen inside the wait');
  // past the wait the file comes, and with it the buttons
  srv.profile429 = false; skewMs += 61_000;
  try {
    lw.closeModal(); lw.openModal('profile', rival);
    assert.ok(await until(() => ui.cache.profiles[rival] && !ui.cache.profiles[rival].error), 'the file came');
    await wait(10);
    assert.match(sheet(), /data-act="gossip"/, 'TRADE GOSSIP is back');
  } finally { skewMs -= 61_000; lw.closeModal(); }
});

test('W: a tap queued behind a slow move while the Curtain falls keeps the curtainNo of the tap: a Seal tapped while a kept move\'s curtain-passed poll is out is refused curtain-passed too, never sealed with the old hand on the next night', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  // just after a Curtain, its edition read, so her seal cannot bring the next one down early
  const c0 = curtainFalls(); await lw.poll(true); await editionRead(c0);
  const k = curNo();
  assert.equal(lw.V().timeline.curtainNo, k);
  // her Seal's answer is lost, the poll that asks is lost, and the re-post is answered 429 (Retry-After 1): kept, waiting
  const realFetch = globalThis.fetch; let phase = 'lose'; let lostActs = 0; let armed = false; let tapped = null; let tapCurtain = null;
  globalThis.fetch = async (url, opts) => {
    const u = new URL(url, 'http://localhost');
    if (phase === 'lose') {
      if (u.pathname === '/api/act') { lostActs++; if (lostActs === 1) lose(); phase = 'live'; return answer(429, { error: { code: 'rate-limited', message: 'Too many requests. Try again later.' } }, { 'retry-after': '1' }); }
      if (u.pathname === '/api/view') lose();
    }
    // the settle timer re-posts the kept seal, the server refuses it curtain-passed, and while the poll that follows is out
    // she taps Seal again on the screen she still sees (the old Curtain, the old hand): queued behind the settle
    if (armed && u.pathname === '/api/view' && !tapped) { tapCurtain = lw.V().timeline.curtainNo; tapped = sealNow(); }
    const r = await realFetch(url, opts);
    if (u.pathname === '/api/act' && r.status === 409) armed = true;
    return r;
  };
  try {
    assert.equal(await sealNow(), null, 'no answer');
    const u = ui.cache.unsettled;
    assert.ok(u && u.name === 'sealPlan' && u.curtain === k && Number.isFinite(u.waitUntil), 'kept, waiting on a 429');
    // the Curtain falls on the server; the page has not polled since
    curtainFalls();
    const a0 = srv.acts.length; const passed0 = srv.passed || 0;
    assert.ok(await until(() => tapped !== null, 6000), 'the settle timer fired, the re-post was refused, and she tapped while its poll was out');
    assert.equal(tapCurtain, k, 'the page still showed the old Curtain when she tapped');
    assert.equal(await tapped, null, 'the tap is refused');
    const sent = srv.acts.slice(a0);
    assert.deepEqual(sent.map((a) => [a.action, a.curtain]), [['sealPlan', k], ['sealPlan', k]], `the kept seal and the tap, each with the curtainNo of its tap (${J(sent.map((a) => [a.action, a.curtain]))})`);
    assert.notEqual(sent[0].nonce, sent[1].nonce);
    assert.equal(srv.passed, passed0 + 2, 'both refused curtain-passed');
    assert.ok(sent.every((a) => !srv.receipts.has(a.nonce) && !srv.applied[a.nonce]), 'neither landed');
    assert.equal(sealedOnServer(), false, 'nothing is sealed for the next night');
    assert.equal(ui.cache.unsettled, null, 'nothing is kept');
    assert.ok(await lineShows(PASSED), `the curtain-passed line (${textOf(printed())})`);
    lw.ACTS['hl-close']();
  } finally { globalThis.fetch = realFetch; }
  await until(() => !ui.cache.busy);
  if (ui.result) { lw.ACTS['after-results'](); }
  if (ui.modal) lw.closeModal();
  lw.go('front');
});

const HAND_CHANGED = 'Your hand changed with the Curtain.';
test('X: a Curtain brought to the plan screen by a replayed re-post (a quiet act answer) clears her picks and says so: the next seal carries the new curtainNo and positions picked in the new hand, never her picks from the old one', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  // just after a Curtain, its edition read, so her seal cannot bring the next one down early
  const c0 = curtainFalls(); await lw.poll(true); await editionRead(c0);
  const k = curNo();
  assert.equal(lw.V().timeline.curtainNo, k);
  // on the plan screen with two cards picked from tonight's hand
  const place = L.casualPlace(lw.V());
  await lw.ACTS.plan({ id: place });
  assert.equal(ui.screen, 'plan'); assert.equal(ui.place, place);
  const oldPicks = L.bestGuess(lw.V(), place).cards.slice(0, 2);
  assert.equal(oldPicks.length, 2, `two cards to pick (${J(oldPicks)})`);
  for (const i of oldPicks) lw.ACTS.pick({ idx: i });
  assert.deepEqual([...ui.sel].sort(), [...oldPicks].sort(), 'her picks are on the plan screen');
  // a move whose answer and the next poll are lost; the Curtain falls on the server before the re-post, which is answered
  // replayed (the receipt is looked up before the curtain) with every view of the new night. The poll the replay asks for
  // at once is held until her seal has gone up: what she sees and taps in between is the replay's
  const realFetch = globalThis.fetch; let cur = null; let fallErr = null; let replayedSeen = false; let release; const gate = new Promise((r) => { release = r; });
  const a0 = srv.acts.length;
  globalThis.fetch = async (url, opts) => {
    const u = new URL(url, 'http://localhost');
    if (u.pathname === '/api/act' && srv.acts.length === a0 + 1 && !cur) { try { cur = curtainFalls(); } catch (e) { fallErr = e; } }
    if (u.pathname === '/api/view' && replayedSeen) await gate;
    const r = await realFetch(url, opts);
    if (u.pathname === '/api/act' && cur && !replayedSeen) replayedSeen = true;
    return r;
  };
  try {
    srv.loseNext = 2; // the move's answer, then the poll that asks whether it landed
    const r = await lw.act(...aMove());
    assert.equal(fallErr, null, `the Curtain fell before the re-post (${fallErr && fallErr.message})`);
    assert.ok(cur, 'the Curtain fell before the re-post');
    const posted = srv.acts.slice(a0); const n = posted[0].nonce;
    assert.equal(posted.length, 2, `posted, then re-posted (${J(posted.map((a) => a.action))})`); assert.ok(posted.every((a) => a.nonce === n && a.curtain === k));
    assert.equal(srv.applied[n], 1); assert.equal(srv.replays[n], 1, 'the re-post was answered replayed');
    assert.deepEqual(r, [], 'a replay hands the caller no events');
    assert.equal(ui.cache.unsettled, null, 'settled');
    assert.equal(lw.V().timeline.curtainNo, k + 1, 'the replay carried the new night');
    assert.equal(ui.screen, 'plan', 'still on the plan screen');
    assert.deepEqual(ui.sel, [], `her picks from the old hand are cleared (${J(ui.sel)})`);
    assert.ok(await lineShows(HAND_CHANGED, 3000), `the hand-changed line (${textOf(printed())})`);
    lw.ACTS['hl-close']();
    assert.equal(ui.screen, 'plan'); assert.deepEqual(ui.sel, [], 'and they stay cleared');
    // she picks one card in the new hand (not at a position she had picked before) and taps Seal
    const newHand = lw.V().whore.hand;
    const fresh = L.bestGuess(lw.V(), place).cards.find((i) => !oldPicks.includes(i)) ?? newHand.findIndex((c, i) => !c.affliction && !oldPicks.includes(i));
    assert.ok(Number.isSafeInteger(fresh) && fresh >= 0, `a card to pick in the new hand (${fresh})`);
    lw.ACTS.pick({ idx: fresh });
    ui.slumOk = true; ui.shortOk = true; // her answers to the slumming and short-of-the-Bar asks, were they put
    const a1 = srv.acts.length;
    await lw.ACTS.seal();
    const seals = srv.acts.slice(a1);
    assert.deepEqual(seals.map((a) => a.action), ['sealPlan'], `one seal went up (${J(seals.map((a) => a.action))})`);
    assert.equal(seals[0].curtain, k + 1, 'carrying the new curtainNo');
    const cards = seals[0].args[1].cards;
    assert.deepEqual(cards, [fresh], `the seal names only the card picked in the new hand (${J(cards)}; old picks ${J(oldPicks)})`);
    assert.ok(cards.every((i) => i < newHand.length && !oldPicks.includes(i)), 'positions in the new hand, none of her old picks');
    assert.ok(srv.receipts.has(seals[0].nonce) && sealedOnServer(), 'sealed on the new night');
    const w = srv.state.whores[ui.active];
    assert.deepEqual(w.plan.cards.map((i) => w.hand[i]), [newHand[fresh].id], 'the server sealed the card she picked in the new hand');
  } finally { release(); globalThis.fetch = realFetch; }
  // the held poll brings the Curtain: its edition, then back to the front page, unsealed for the tests after
  await editionRead(cur);
  assert.ok(Array.isArray(await lw.act(L.unseal, ui.active)), 'unsealed again');
  await until(() => !ui.cache.busy);
  if (ui.modal) lw.closeModal();
  lw.go('front');
});

test('Y: with an Assignation open, a cancel refused curtain-passed stops the tap that needed it: a Place tapped (ACTS.plan) or another gentleman (ACTS[\'start-assign\']) leaves the screen as it was, and nothing more goes up', async () => {
  for (const how of ['plan', 'start-assign']) {
    await enter(); lw.go('front');
    await lw.poll(true); await wait(10);
    // just after a Curtain, its edition read
    const c0 = curtainFalls(); await lw.poll(true); await editionRead(c0);
    const board = lw.V().board.filter((b) => !b.refused);
    assert.ok(board.length >= 2, `${how}: two gentlemen on her board (${board.length})`);
    assert.ok(Array.isArray(await lw.act(L.startAssignation, ui.active, board[0].gent)), `${how}: an Assignation opened`);
    assert.equal(lw.V().whore.assignation && lw.V().whore.assignation.gent, board[0].gent);
    lw.go('front'); await wait(10);
    const k = curNo(); assert.equal(lw.V().timeline.curtainNo, k);
    const place = lw.V().timeline.places.find((p) => p.open);
    assert.ok(place, `${how}: an open Place`);
    const screen0 = ui.screen; const place0 = ui.place;
    // the Curtain falls on the server; the page has not polled since, so the cancel carries the old curtainNo
    const cur = curtainFalls();
    const a0 = srv.acts.length; const passed0 = srv.passed || 0;
    if (how === 'plan') await lw.ACTS.plan({ id: place.id }); else await lw.ACTS['start-assign']({ id: board[1].gent });
    const sent = srv.acts.slice(a0);
    assert.deepEqual(sent.map((a) => [a.action, a.curtain]), [['cancelAssignation', k]], `${how}: only the cancel went up (${J(sent.map((a) => [a.action, a.curtain]))})`);
    assert.equal(srv.passed, passed0 + 1, `${how}: the cancel was refused curtain-passed`);
    assert.equal(ui.screen, screen0, `${how}: the screen is unchanged (${ui.screen})`);
    assert.equal(ui.place, place0, `${how}: no Place taken`);
    await editionRead(cur);
    assert.notEqual(ui.screen, 'plan'); assert.notEqual(ui.screen, 'assign');
    assert.ok(!srv.acts.slice(a0 + 1).some((a) => ['startAssignation', 'planEvening', 'sealPlan'].includes(a.action)), `${how}: no startAssignation or plan posted after the refusal (${J(srv.acts.slice(a0 + 1).map((a) => a.action))})`);
    // a sheet the edition left open (a telegram holds the headlines) is closed, as her tap would
    const shows = await until(() => { if (ui.modal) lw.closeModal(); const t = textOf(printed()); if (t.includes(PASSED)) return true; if (printed()) lw.ACTS['hl-close'](); return false; }, 8000);
    assert.ok(shows, `${how}: the curtain-passed line (${textOf(printed())})`);
    lw.ACTS['hl-close']();
    await until(() => !ui.cache.busy);
    if (lw.V().whore.assignation) assert.ok(Array.isArray(await lw.act(L.cancelAssignation, ui.active)), `${how}: the Assignation closed for the tests after`);
    if (ui.modal) lw.closeModal();
    lw.go('front');
  }
});

// the plan screen's hand as the page shows it (app.innerHTML: the harness DOM keeps what render writes): each card's
// position, the act a tap on it runs, and its name, in the order shown
const unesc = (x) => String(x).replace(/&#39;/g, '\'').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function shownHand() {
  const m = app.innerHTML.match(/<div class="hand play">([\s\S]*?)<\/div>\s*<div class="dyn">/);
  if (!m) return null;
  return [...m[1].matchAll(/<button class="card[^"]*" data-act="([^"]+)" data-src="hand" data-idx="(\d+)"[\s\S]*?<span class="nm">([^<]*)<\/span>/g)].map((x) => ({ act: x[1], idx: Number(x[2]), name: unesc(x[3]) }));
}
test('Z: a new night brought to the plan screen by a quiet answer (a replayed re-post, or a kept move settled after a 429) redraws the hand before the taps are released: the cards shown are the new hand\'s, and the first card tapped then sealed is that card at its position in the new hand, sealed by id on the server', async () => {
  for (const how of ['replay', 'settle']) {
    await enter(); lw.go('front');
    await lw.poll(true); await wait(10);
    // just after a Curtain, its edition read, so her seal cannot bring the next one down early
    const c0 = curtainFalls(); await lw.poll(true); await editionRead(c0);
    const k = curNo();
    const place = L.casualPlace(lw.V());
    await lw.ACTS.plan({ id: place });
    assert.equal(ui.screen, 'plan', `${how}: on the plan screen`);
    const oldHand = lw.V().whore.hand.map((c) => c.name);
    assert.deepEqual((shownHand() || []).map((c) => c.name), oldHand, `${how}: the plan screen shows tonight's hand`);
    for (const i of L.bestGuess(lw.V(), place).cards.slice(0, 2)) lw.ACTS.pick({ idx: i });
    assert.ok(ui.sel.length >= 1, `${how}: her picks are on the plan screen`);
    // what the page shows at the moment the taps are released (the tap gate reads wireBusy, body.acting mirrors it)
    const atRelease = []; const toggle0 = body.classList.toggle; let wasOn = acting();
    body.classList.toggle = function (c, f) { const r = toggle0.call(this, c, f); if (c === 'acting') { const on = this.contains('acting'); if (wasOn && !on) atRelease.push({ night: lw.V().timeline.curtainNo, shown: (shownHand() || []).map((x) => x.name), hand: lw.V().whore.hand.map((x) => x.name) }); wasOn = on; } return r; };
    // the polls are held once the Curtain has fallen, until her seal has gone up: what she sees and taps comes from the
    // quiet answer alone
    const realFetch = globalThis.fetch; let cur = null; let fallErr = null; let gateOn = false; let release; const gate = new Promise((r) => { release = r; });
    const fall = () => { try { cur = curtainFalls(); } catch (e) { fallErr = e; } gateOn = true; };
    const a0 = srv.acts.length;
    globalThis.fetch = async (url, opts) => {
      const u = new URL(url, 'http://localhost');
      if (how === 'replay' && u.pathname === '/api/act' && srv.acts.length === a0 + 1 && !cur) fall();
      if (u.pathname === '/api/view' && gateOn) await gate;
      return realFetch(url, opts);
    };
    try {
      srv.loseNext = 2; // the move's answer, then the poll that asks whether it landed
      if (how === 'settle') { srv.act429At = a0 + 1; srv.act429Ra = '1'; } // and the re-post is answered 429 Retry-After 1
      const r = await lw.act(...aMove());
      if (how === 'settle') {
        assert.equal(r, null, 'settle: no answer yet');
        assert.ok(ui.cache.unsettled && Number.isFinite(ui.cache.unsettled.waitUntil), 'settle: the move is kept through the Retry-After');
        fall();
        assert.ok(await until(() => ui.cache.unsettled === null, 5000), 'settle: settled after the wait');
      } else assert.deepEqual(r, [], 'replay: a replay hands the caller no events');
      assert.equal(fallErr, null, `${how}: the Curtain fell (${fallErr && fallErr.message})`); assert.ok(cur, `${how}: the Curtain fell`);
      const n = srv.acts[a0].nonce;
      assert.equal(srv.applied[n], 1); assert.equal(srv.replays[n], 1, `${how}: the last re-post was answered replayed`);
      assert.equal(lw.V().timeline.curtainNo, k + 1, `${how}: the quiet answer carried the new night`);
      assert.equal(ui.screen, 'plan'); assert.deepEqual(ui.sel, [], `${how}: her picks are cleared`);
      const newHand = lw.V().whore.hand;
      assert.notDeepEqual(newHand.map((c) => c.name), oldHand, `${how}: the new night dealt another hand (the check below means something)`);
      // the taps were released on the new hand
      const rel = atRelease.filter((x) => x.night === k + 1);
      assert.ok(rel.length >= 1, `${how}: the taps were released after the new night arrived (${J(atRelease.map((x) => x.night))})`);
      assert.deepEqual(rel[0].shown, rel[0].hand, `${how}: at the release the hand shown is the new hand (${J(rel[0].shown)} vs ${J(rel[0].hand)})`);
      // and so it is now: the same names, in order
      const shown = shownHand();
      assert.deepEqual(shown.map((c) => c.name), newHand.map((c) => c.name), `${how}: the cards shown are the new hand's`);
      // she taps the first card she can pick, as shown, and seals
      lw.ACTS['hl-close']();
      const first = shown.find((c) => c.act === 'pick');
      assert.ok(first, `${how}: a card to pick`);
      assert.equal(newHand[first.idx].name, first.name, `${how}: the card shown at position ${first.idx} is the new hand's card there`);
      lw.ACTS.pick({ idx: first.idx });
      ui.slumOk = true; ui.shortOk = true; // her answers to the slumming and short-of-the-Bar asks, were they put
      const a1 = srv.acts.length;
      await lw.ACTS.seal();
      const seals = srv.acts.slice(a1);
      assert.deepEqual(seals.map((a) => a.action), ['sealPlan'], `${how}: one seal went up (${J(seals.map((a) => a.action))})`);
      assert.equal(seals[0].curtain, k + 1, `${how}: carrying the new curtainNo`);
      assert.deepEqual(seals[0].args[1].cards, [first.idx], `${how}: the seal names the position of the card she tapped`);
      assert.ok(srv.receipts.has(seals[0].nonce) && sealedOnServer(), `${how}: sealed on the new night`);
      const w = srv.state.whores[ui.active];
      assert.deepEqual(w.plan.cards.map((i) => w.hand[i]), [newHand[first.idx].id], `${how}: the server sealed the card she tapped, by id`);
    } finally { release(); globalThis.fetch = realFetch; body.classList.toggle = toggle0; srv.act429At = -1; }
    // the poll brings the Curtain: its edition, then back to the front page, unsealed for the tests after
    await lw.poll(true); await editionRead(cur);
    assert.ok(Array.isArray(await lw.act(L.unseal, ui.active)), `${how}: unsealed again`);
    await until(() => !ui.cache.busy);
    if (ui.modal) lw.closeModal();
    lw.go('front');
  }
});

test('Z2: one poll bringing two Curtains for her girl shows both editions in order (ids ascending), marks the Timeline seen once, after the last, and closing the first opens the second', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const c0 = curtainFalls(); await lw.poll(true); await editionRead(c0);
  await until(() => !ui.cache.busy);
  const tl = herTl();
  // two Curtains fall on the server with no poll between
  const c1 = curtainFalls(); const c2 = curtainFalls();
  const ids = [...c1.curtainIds, ...c2.curtainIds];
  assert.equal(ids.length, 2, `two Curtains (${J(ids)})`); assert.ok(ids[0] < ids[1]);
  assert.ok(L.eventsFor(srv.state, ACC, ui.cache.tick).length <= 200, 'one untruncated batch carries both');
  const seenActs = () => srv.acts.filter((a) => a.action === 'markSeen' && a.args[1] === tl);
  const m0 = seenActs().length;
  await lw.poll(true);
  assert.ok(await until(() => ui.result && ui.result.curtain.id === ids[0], 6000), `the older edition first (${ui.result && ui.result.curtain.id})`);
  await wait(300); await until(() => !ui.cache.busy);
  assert.equal(seenActs().length, m0, `the Timeline is not marked seen while a later edition waits (${seenActs().length - m0})`);
  assert.equal(ui.result.curtain.id, ids[0]);
  // closing the first opens the second
  lw.ACTS['after-results']();
  assert.ok(await until(() => ui.result && ui.result.curtain.id === ids[1], 6000), `the newer edition next (${ui.result && ui.result.curtain.id})`);
  assert.equal(ui.screen, 'results');
  assert.ok(await until(() => seenActs().length === m0 + 1 && !ui.cache.busy, 3000), `marked seen once the last is shown (${seenActs().length - m0})`);
  await wait(300);
  assert.equal(seenActs().length, m0 + 1, 'once');
  assert.ok(srv.state.accounts[ACC].seen[tl] >= ids[1], `seen at the newer Curtain's tick (${srv.state.accounts[ACC].seen[tl]} >= ${ids[1]})`);
  lw.ACTS['after-results'](); await wait(10);
  assert.equal(ui.screen, 'front', 'no third edition');
  if (ui.modal) lw.closeModal();
});

test('Z3: patchPlay replaces a card by identity (its position and its card id), never by count alone: a hand of the same length with other cards shows the new names; an unchanged hand is patched in place', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const place = L.casualPlace(lw.V());
  await lw.ACTS.plan({ id: place });
  assert.equal(ui.screen, 'plan');
  // a small DOM for the hand alone: an element whose innerHTML is parsed into card buttons (data-idx, data-id, the name)
  const card = (html) => { const e = el('button'); const g = (a) => (html.match(new RegExp(`data-${a}="([^"]*)"`)) || [])[1]; e.dataset = { idx: g('idx'), id: g('id') }; e.nm = unesc((html.match(/<span class="nm">([^<]*)<\/span>/) || [])[1] || ''); return e; };
  const mk = () => { const e = el('div'); let h = ''; let kids = []; Object.defineProperty(e, 'innerHTML', { get: () => h, set: (v) => { h = String(v); kids = [...h.matchAll(/<button class="card[\s\S]*?<\/button>/g)].map((m) => card(m[0])); }, configurable: true }); Object.defineProperty(e, 'children', { get: () => kids, configurable: true }); return e; };
  const hand = mk(); hand.innerHTML = app.innerHTML.match(/<div class="hand play">([\s\S]*?)<\/div>\s*<div class="dyn">/)[1];
  const q0 = document.querySelector; const c0 = document.createElement;
  document.querySelector = (q) => (q === '.hand.play' ? hand : q0.call(document, q));
  document.createElement = (t) => (t === 'div' ? mk() : c0.call(document, t));
  const v0 = ui.cache.views[ui.active];
  try {
    const names0 = v0.whore.hand.map((c) => c.name);
    assert.deepEqual(hand.children.map((x) => x.nm), names0, 'the hand shows tonight\'s cards');
    // unchanged: patched in place (the same elements)
    const els0 = [...hand.children];
    lw.ACTS.why();
    assert.ok(hand.children.every((x, i) => x === els0[i]), 'an unchanged hand keeps its card elements');
    // the same number of cards, other cards at the positions (as a new night or a Quick Change brings)
    const n = v0.whore.hand.length;
    const rotated = v0.whore.hand.map((c, i) => ({ ...v0.whore.hand[(i + 1) % n], idx: c.idx }));
    assert.notDeepEqual(rotated.map((c) => c.name), names0, 'another hand of the same length');
    ui.cache.views[ui.active] = { ...v0, whore: { ...v0.whore, hand: rotated } };
    lw.ACTS.why();
    assert.equal(hand.children.length, n);
    assert.deepEqual(hand.children.map((x) => x.nm), rotated.map((c) => c.name), `the new names show (${J(hand.children.map((x) => x.nm))})`);
    assert.deepEqual(hand.children.map((x) => x.dataset.id), rotated.map((c) => c.id), 'each card carries its id');
  } finally { document.querySelector = q0; document.createElement = c0; ui.cache.views[ui.active] = v0; ui.why = false; }
  lw.go('front');
});

const HAND_CHANGED_KEPT = 'Your hand changed: the move you made while the District was away has gone in.';
test('Z4: a Quick Change on the plan screen kept through a lost answer and settled later the same night redraws the hand with the swapped card, clears her picks and says the kept move has gone in; a live Quick Change (answered at once) keeps her other picks and prints no hand-changed line', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  // just after a Curtain, its edition read: a fresh night with no Curtain due before the move settles
  const c0 = curtainFalls(); await lw.poll(true); await editionRead(c0);
  await until(() => !ui.cache.busy);
  const k = curNo(); const wid = ui.active;
  // her girl carries Quick Change for this test (the harness girl is Dolly, whose Talent is Double Entendre), unspent
  const talent0 = srv.state.whores[wid].talent; const used0 = srv.state.whores[wid].talentUsed;
  srv.state.whores[wid].talent = 'quick-change'; srv.state.whores[wid].talentUsed = false; srv.rev++;
  await lw.poll(true); await wait(10);
  assert.equal(lw.V().whore.talent, 'quick-change', 'her page shows Quick Change');
  // the picks resetPicks clears besides ui.sel
  const others = () => J({ stake: ui.stake, slumOk: ui.slumOk, shortOk: ui.shortOk });
  const setOthers = () => { ui.stake = true; ui.slumOk = true; ui.shortOk = true; };
  const place = L.casualPlace(lw.V());
  await lw.ACTS.plan({ id: place });
  assert.equal(ui.screen, 'plan', 'on the plan screen');
  const oldNames = lw.V().whore.hand.map((c) => c.name);
  assert.deepEqual((shownHand() || []).map((c) => c.name), oldNames, 'the plan screen shows tonight\'s hand');
  const picks = L.bestGuess(lw.V(), place).cards.slice(0, 2);
  assert.equal(picks.length, 2, `two cards to pick (${J(picks)})`);
  for (const i of picks) lw.ACTS.pick({ idx: i });
  setOthers();
  assert.deepEqual(ui.sel, picks, 'her picks are on the plan screen'); assert.equal(others(), J({ stake: true, slumOk: true, shortOk: true }));
  const swapAt = ui.sel[ui.sel.length - 1];
  // the polls are held once the move is kept, so the settled re-post alone brings the new hand to the screen
  const realFetch = globalThis.fetch; let gateOn = false; let release; const gate = new Promise((r) => { release = r; });
  globalThis.fetch = async (url, opts) => { const u = new URL(url, 'http://localhost'); if (u.pathname === '/api/view' && gateOn) await gate; return realFetch(url, opts); };
  const a0 = srv.acts.length;
  try {
    // the Quick Change lands, its answer and the poll that asks whether it landed are lost, the re-post is answered 429
    srv.loseNext = 2; srv.act429At = a0 + 1; srv.act429Ra = '1';
    await lw.ACTS['quick-change']();
    gateOn = true;
    const posted = srv.acts.slice(a0); const n = posted[0].nonce;
    assert.deepEqual(posted.map((a) => a.action), ['useTalent', 'useTalent'], `posted, then re-posted (${J(posted.map((a) => a.action))})`);
    assert.ok(posted.every((a) => a.nonce === n && a.curtain === k), 'the re-post carries its own nonce and tonight\'s curtainNo');
    assert.deepEqual(posted[0].args[1], { kind: 'quick-change', card: swapAt }, 'a Quick Change of her last pick');
    assert.equal(srv.applied[n], 1, 'it landed once');
    assert.ok(ui.cache.unsettled && ui.cache.unsettled.nonce === n && Number.isFinite(ui.cache.unsettled.waitUntil), 'kept through the Retry-After');
    const srvHand = srv.state.whores[wid].hand;
    assert.notEqual(C.CARDS[srvHand[swapAt]] ? C.CARDS[srvHand[swapAt]].name : srvHand[swapAt], oldNames[swapAt], 'the server swapped the card for another (the checks below mean something)');
    assert.deepEqual(ui.sel, picks, 'while kept, her picks stand');
    // settled after the wait: replayed, on the same night
    assert.ok(await until(() => ui.cache.unsettled === null, 5000), 'settled after the wait');
    assert.equal(srv.replays[n], 1, 'the next re-post was answered replayed'); assert.equal(srv.applied[n], 1, 'applied once');
    assert.equal(curNo(), k, 'no Curtain fell on the server'); assert.equal(lw.V().timeline.curtainNo, k, 'the same night on her page');
    assert.equal(ui.screen, 'plan', 'still on the plan screen');
    const newHand = lw.V().whore.hand;
    assert.deepEqual(newHand.map((c) => c.id), srv.state.whores[wid].hand, 'her page holds the server\'s hand');
    assert.notEqual(newHand[swapAt].name, oldNames[swapAt], 'her page holds the swapped card');
    const shown = shownHand();
    assert.deepEqual(shown.map((c) => c.name), newHand.map((c) => c.name), `the cards shown are the new hand's (${J(shown.map((c) => c.name))})`);
    assert.equal(shown[swapAt].name, newHand[swapAt].name, 'the swapped card shows at its position');
    assert.deepEqual(ui.sel, [], `her picks are cleared (${J(ui.sel)})`);
    assert.equal(others(), J({ stake: false, slumOk: false, shortOk: false }), 'and her other picks with them');
    assert.ok(await lineShows(HAND_CHANGED_KEPT, 3000), `the kept-move hand line (${textOf(printed())})`);
    lw.ACTS['hl-close']();
  } finally { release(); globalThis.fetch = realFetch; srv.act429At = -1; srv.act429Ra = '1'; }
  await wait(30); await until(() => !ui.cache.busy);
  for (let i = 0; i < 10 && printed(); i++) lw.ACTS['hl-close']();
  // a live Quick Change the same night (her Talent unspent again on the server), answered at once
  srv.state.whores[wid].talentUsed = false; srv.rev++;
  await lw.poll(true); await wait(10);
  assert.equal(ui.screen, 'plan');
  const hand1 = lw.V().whore.hand.map((c) => c.name);
  const picks2 = L.bestGuess(lw.V(), place).cards.slice(0, 2);
  assert.equal(picks2.length, 2, `two cards to pick (${J(picks2)})`);
  for (const i of picks2) lw.ACTS.pick({ idx: i });
  setOthers();
  assert.deepEqual(ui.sel, picks2);
  const swap2 = ui.sel[ui.sel.length - 1];
  const a1 = srv.acts.length;
  await lw.ACTS['quick-change']();
  const live = srv.acts.slice(a1);
  assert.deepEqual(live.map((a) => a.action), ['useTalent'], `one Quick Change went up (${J(live.map((a) => a.action))})`);
  assert.equal(srv.applied[live[0].nonce], 1); assert.equal(srv.replays[live[0].nonce], undefined, 'answered at once, not replayed');
  assert.equal(ui.cache.unsettled, null);
  const hand2 = lw.V().whore.hand;
  assert.notEqual(hand2[swap2].name, hand1[swap2], 'the live Quick Change swapped the card');
  assert.deepEqual(shownHand().map((c) => c.name), hand2.map((c) => c.name), 'the cards shown are the hand after the swap');
  assert.equal(others(), J({ stake: true, slumOk: true, shortOk: true }), 'a live Quick Change keeps her other picks');
  // the headlines it printed, in order: its handler's, and no hand-changed line
  const seen = [];
  assert.ok(await until(() => { const t = textOf(printed()); if (t && seen[seen.length - 1] !== t) seen.push(t); if (t.includes('Quick Change!')) return true; if (t) lw.ACTS['hl-close'](); return false; }, 3000), `its handler's headline (${J(seen)})`);
  assert.ok(!seen.some((t) => t.includes('Your hand changed')), `no hand-changed line for a live Quick Change (${J(seen)})`);
  srv.state.whores[wid].talent = talent0; srv.state.whores[wid].talentUsed = used0; srv.rev++;
  await lw.poll(true); await wait(10);
  for (let i = 0; i < 10 && printed(); i++) lw.ACTS['hl-close']();
  if (ui.modal) lw.closeModal();
  lw.go('front');
});

// a Curtain on the clock in Timeline `tl`, brought down inside the next markSeen of that Timeline (the request's own
// catch-up tick, world.apply): `got.ids` are its curtain event ids, `got.before` the District as the markSeen found it
function curtainInMarkSeen(tl) {
  const got = { ids: null, before: null };
  srv.beforeApply = (b) => {
    if (b.action !== 'markSeen' || b.args[1] !== tl) return false;
    got.before = srv.state;
    const T = srv.state.timelines[tl]; const t0 = srv.state.tick;
    srv.state = L.advanceClock(srv.state, L.nextForcedAt(srv.state, T) - srv.state.clock + 1);
    got.ids = L.eventsFor(srv.state, ACC, t0).filter((e) => e.type === 'curtain' && e.timeline === tl).map((e) => e.id);
    return true;
  };
  return got;
}
const fellH = (h) => h.type === 'curtain-result' || h.type === 'standing-order';
// a curtain is coming down (an open sheet counts as an overlay too: midAction)
const dropping = () => ui.overlays > (ui.modal ? 1 : 0);

test('Z7: an edition whose Curtain is coming down when she switches girl, or leaves the District (a Curtain that fell inside the leave\'s own markSeen), is never drawn: no results screen, ui.result stays unset', async () => {
  // (1) switching girl while the curtain comes down: a second girl on another street
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const tl = herTl(); const wid = ui.active;
  const other = Object.keys(C.CHARACTERS).find((id) => C.CHARACTERS[id].role === 'starter' && C.CHARACTERS[id].timeline !== tl);
  srv.state.accounts[ACC].slots = Math.max(2, srv.state.accounts[ACC].slots);
  srv.state = L.openTimeline(srv.state, ACC, other); srv.rev++;
  const second = srv.state.accounts[ACC].whores.find((id) => !srv.state.whores[id].retired && srv.state.whores[id].timeline !== tl);
  assert.ok(second, 'a second girl on another street');
  ui.cache.wantAll = true; await lw.poll(true); await wait(10);
  assert.ok(lw.V(second), 'her view is on hand'); assert.equal(ui.active, wid);
  try {
    const cur = curtainFalls();
    await lw.poll(true);
    assert.ok(dropping(), 'the curtain is coming down on the girl on screen');
    assert.equal(ui.result, null);
    lw.ACTS.switch({ id: second }, null, null, true);
    await wait(2800); // past the drop (1.7 s and the 0.65 s lift)
    assert.ok(await until(() => !dropping()), 'the curtain has lifted');
    assert.equal(ui.active, second, 'she is with her other girl');
    assert.equal(ui.result, null, `no edition is drawn for the girl she left (${J(ui.result && { tl: ui.result.tl, id: ui.result.curtain.id })}; ${J(cur.curtainIds)})`);
    assert.notEqual(ui.screen, 'results');
    if (ui.modal) lw.closeModal();
    await until(() => !ui.cache.busy);
  } finally {
    // the second girl goes again: the tests after this one have the one girl
    L.retireWhore(srv.state, second); srv.rev++;
  }
  // (2) leaving the District: the leave's markSeen brings down her Curtain inside its own catch-up tick
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  assert.equal(herTl(), tl);
  const got = curtainInMarkSeen(tl);
  // the edition's drawing code must not run on the page she left either (it would read a District that is gone)
  const errs = []; const onErr = (e) => errs.push(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : String(e));
  process.on('unhandledRejection', onErr);
  try {
    await lw.ACTS.leave();
    assert.ok(got.ids && got.ids.length === 1, `a Curtain fell inside the leave's markSeen (${J(got.ids)})`);
    assert.notEqual(ui.mode, 'arena', 'she has left'); assert.equal(ui.screen, 'title');
    assert.ok(dropping(), 'its curtain had begun to come down as she left');
    await wait(2800);
    assert.ok(await until(() => !dropping()), 'the curtain has lifted');
    assert.equal(ui.result, null, `no edition is drawn after she left (${J(ui.result && { tl: ui.result.tl, id: ui.result.curtain.id })})`);
    assert.equal(ui.screen, 'title', 'no results screen');
    assert.notEqual(ui.mode, 'arena');
    assert.deepEqual(errs, [], 'and nothing of it ran after she left');
  } finally { srv.beforeApply = null; process.off('unhandledRejection', onErr); }
});

test('Z8: a Curtain that falls inside the catch-up of a markSeen that is not an edition\'s (the return digest\'s) stays news: the markSeen carries the newest event the page had, below that Curtain, the seen cursor stops short of it, and the next return digest lists it', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const tl = herTl(); const wid = ui.active;
  srv.state = L.markSeen(srv.state, ACC, tl); srv.rev++; // she has read everything
  lw.leaveArena();
  // a Curtain falls while she is out: her return digest has news
  srv.state = L.advanceClock(srv.state, L.nextForcedAt(srv.state, srv.state.timelines[tl]) - srv.state.clock + 1); srv.rev++;
  const seenActs = () => srv.acts.filter((a) => a.action === 'markSeen' && a.args[1] === tl);
  const m0 = seenActs().length;
  const got = curtainInMarkSeen(tl);
  try {
    const p = payload({ all: 1, digest: 1, boards: 1 });
    assert.ok(p.digest[tl].headlines.some(fellH), `the missed Curtain is news (${J(p.digest[tl].headlines.map((h) => h.type))})`);
    lw.enterArena(p, 'resume');
    // the return digest: a sheet (marked seen when it closes) or a strip (marked seen at once)
    if (ui.modal && ui.modal.type === 'digest') lw.closeModal();
    assert.ok(await until(() => seenActs().length === m0 + 1 && got.ids !== null && !ui.cache.busy, 3000), `the return digest's markSeen went up (${seenActs().length - m0})`);
    assert.equal(got.ids.length, 1, `a Curtain fell inside it (${J(got.ids)})`);
    const fell = got.ids[0];
    const upTo = seenActs()[m0].args[2];
    assert.ok(Number.isSafeInteger(upTo) && upTo < fell, `markSeen carries the newest event the page had, below the Curtain that fell in its catch-up (${J(seenActs()[m0].args)}; Curtain ${fell})`);
    const seen = srv.state.accounts[ACC].seen[tl];
    assert.ok(seen < fell, `the seen cursor (${seen}) is short of that Curtain (${fell})`);
    assert.equal(seen, upTo, 'it stands where the markSeen said');
    assert.ok(!L.awayDigest(got.before, wid, seen, { tonight: true }).headlines.some(fellH), 'the Curtain she was told of is behind her');
    assert.ok(L.awayDigest(srv.state, wid, seen, { tonight: true }).headlines.some(fellH), 'the one that fell in the catch-up is news');
    // she leaves before its edition is shown (so no edition's markSeen moves the cursor): the next return digest lists it
    lw.leaveArena();
    assert.equal(seenActs().length, m0 + 1, 'no other markSeen went up');
    const p2 = payload({ all: 1, digest: 1, boards: 1 });
    assert.ok(p2.digest[tl].headlines.some(fellH), `the next return digest lists it (${J(p2.digest[tl].headlines.map((h) => h.type))})`);
    lw.enterArena(p2, 'resume'); await wait(30);
    const shown = ui.modal && ui.modal.type === 'digest' ? ui.modal.data.headlines : ui.strip ? ui.strip.headlines : [];
    assert.ok(shown.some(fellH), `and the page prints it (${J(shown.map((h) => h.type))})`);
    if (ui.modal) lw.closeModal();
    assert.ok(await until(() => seenActs().length === m0 + 2 && !ui.cache.busy, 3000), 'read now');
    await wait(2800); await until(() => !dropping());
    if (ui.screen === 'results') lw.ACTS['after-results']();
    if (ui.modal) lw.closeModal();
  } finally { srv.beforeApply = null; }
});

test('Z9: the welcome evening\'s join held on the wire; she logs out and Second_Player logs in and goes into the District; the join\'s 401 arrives: nothing signs out, the account stays Second_Player and she stays in the District', async () => {
  if (ui.mode === 'arena') lw.leaveArena();
  lw.go('title');
  await lw.net.start();
  assert.equal(lw.net.account().name, 'Ruby_Buckshot', 'First_Player is signed in');
  let release = () => {}; srv.hold401 = new Promise((r) => { release = r; }); const held0 = srv.held;
  // Curtain 0 of the rehearsal is closed: finishWelcome sends her girl to the District
  ui.welcome = { starter: 'dolly' };
  lw.ACTS['after-results']();
  try {
    assert.ok(await until(() => srv.held === held0 + 1), 'the join is on the wire');
    await lw.ACTS['sign-out']();
    assert.equal(lw.net.account().name, null, 'logged out');
    srv.user = 'Second_Player';
    const r = await lw.net.login('Second_Player', 'a fine long password');
    assert.ok(r.ok, J(r));
    assert.equal(await lw.net.adopt(r.data.user), true, 'she has a girl in the District');
    await lw.ACTS.enter(); // the page's way in for a member who has logged in
    assert.equal(ui.mode, 'arena', 'Second_Player is in the District'); const wid = ui.active; assert.ok(wid);
    // the old session's 401 is delivered now
    release();
    const lines = [];
    await until(() => { const t = textOf(printed()); if (t) lines.push(t); if (printed()) lw.ACTS['hl-close'](); return false; }, 600);
    const a = lw.net.account();
    assert.equal(a.name, 'Second_Player', `the account stays Second_Player (${J(a)})`);
    assert.equal(a.hint, 'Second_Player');
    assert.equal(JSON.parse(localStorage.getItem('lw-scandal-acct')), 'Second_Player', 'and this device still names her');
    assert.ok(!lines.some((t) => /not on tonight's list|Logged out on this device/.test(t)), `no signed-out line (${J(lines)})`);
    assert.equal(ui.mode, 'arena', 'she is still in the District');
    assert.equal(ui.active, wid, 'with her girl on screen');
    assert.notEqual(ui.screen, 'title');
    assert.equal(ui.welcome, null);
  } finally {
    release(); srv.hold401 = null; srv.user = 'Ruby_Buckshot'; ui.welcome = null;
    await lw.net.adopt({ name: 'Ruby_Buckshot', member: true });
  }
  assert.equal(lw.net.account().name, 'Ruby_Buckshot');
});

// last in the file: a 429 on the poll slows the poll for a minute
test('V: a 429 wait is capped at 60 s: a re-post answered Retry-After 3600 is asked again within a minute, and so is a poll answered the same', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const acts0 = srv.acts.length;
  srv.loseNext = 2; srv.act429At = acts0 + 1; srv.act429Ra = '3600';
  try {
    assert.equal(await lw.act(...aMove()), null);
    const u = ui.cache.unsettled;
    assert.ok(u && Number.isFinite(u.waitUntil), 'kept, waiting');
    const w = u.waitUntil - Date.now();
    assert.ok(w > 55_000 && w <= 60_000, `the wait is capped at 60 s (${w} ms)`);
    // a minute on, the same nonce goes up and is replayed
    skewMs += 61_000;
    await lw.poll(true);
    assert.ok(await until(() => ui.cache.unsettled === null, 4000), 'settled after the capped wait');
    assert.equal(srv.replays[u.nonce], 1); assert.equal(srv.applied[u.nonce], 1);
  } finally { skewMs -= 61_000; srv.act429Ra = '1'; }
  srv.view429 = '3600';
  const d0 = pollDelays.length;
  await lw.poll(true);
  const after = pollDelays.slice(d0);
  assert.deepEqual(after, [60_000], `the next poll in 60 s, not an hour (${J(after)})`);
});

test('Z5: a Curtain that falls inside an act\'s own catch-up tick (the markSeen posted for the edition on screen) is shown next, once; markSeen carries the newest event of the edition shown, so her seen cursor never passes an edition she has not seen and the return digest keeps it', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const c0 = curtainFalls(); await lw.poll(true); await editionRead(c0);
  await until(() => !ui.cache.busy);
  const tl = herTl(); const wid = ui.active;
  // two Curtains fall with no poll between: two editions to show
  const c1 = curtainFalls(); const c2 = curtainFalls();
  const ids = [...c1.curtainIds, ...c2.curtainIds];
  assert.equal(ids.length, 2, `two Curtains (${J(ids)})`); assert.ok(ids[0] < ids[1]);
  // a third falls inside the markSeen her page posts once the second edition is on screen: that request's own catch-up
  let third = null; let before = null;
  srv.beforeApply = (b) => {
    if (b.action !== 'markSeen' || b.args[1] !== tl) return false;
    before = srv.state; // the District as it stood when her page posted the markSeen (immutable: the engine is pure)
    const T = srv.state.timelines[tl]; const t0 = srv.state.tick;
    srv.state = L.advanceClock(srv.state, L.nextForcedAt(srv.state, T) - srv.state.clock + 1);
    third = L.eventsFor(srv.state, ACC, t0).filter((e) => e.type === 'curtain' && e.timeline === tl).map((e) => e.id);
    return true;
  };
  const seenActs = () => srv.acts.filter((a) => a.action === 'markSeen' && a.args[1] === tl);
  const m0 = seenActs().length;
  try {
    await lw.poll(true);
    assert.ok(await until(() => ui.result && ui.result.curtain.id === ids[0], 6000), `the older edition first (${ui.result && ui.result.curtain.id})`);
    await wait(300); await until(() => !ui.cache.busy);
    assert.equal(seenActs().length, m0, 'not marked seen while a later edition waits');
    lw.ACTS['after-results']();
    assert.ok(await until(() => ui.result && ui.result.curtain.id === ids[1], 6000), `the second edition (${ui.result && ui.result.curtain.id})`);
    assert.ok(await until(() => seenActs().length === m0 + 1 && third !== null && !ui.cache.busy, 3000), `the markSeen for the second edition went up (${seenActs().length - m0})`);
    assert.equal(third.length, 1, `a third Curtain fell inside that markSeen (${J(third)})`); assert.ok(third[0] > ids[1]);
    // the seen cursor stops at the newest edition she has seen (its Curtain and the aftermath the edition was built from):
    // never past the third, which is not on screen yet
    const upTo1 = seenActs()[m0].args[2];
    assert.ok(Number.isSafeInteger(upTo1) && upTo1 >= ids[1] && upTo1 < third[0], `markSeen carries the newest event of the edition shown (${J(seenActs()[m0].args)}; editions ${J(ids)}, unseen ${J(third)})`);
    const seen1 = srv.state.accounts[ACC].seen[tl];
    assert.ok(seen1 < third[0], `the seen cursor (${seen1}) is short of the unseen Curtain (${third[0]})`);
    assert.equal(seen1, upTo1, 'it stands at the edition on screen');
    // the return digest from that cursor: the two editions she watched are behind her (their Standing Order notices
    // included), and the third Curtain is still news
    const fell = (h) => h.type === 'curtain-result' || h.type === 'standing-order';
    const was = L.awayDigest(before, wid, seen1, { tonight: true }).headlines;
    assert.ok(!was.some(fell), `before the third fell, nothing she watched is news again (${J(was.map((h) => h.type))})`);
    const dg = L.awayDigest(srv.state, wid, seen1, { tonight: true }).headlines;
    assert.ok(dg.some(fell), `the digest keeps the unseen Curtain (${J(dg.map((h) => h.type))})`);
    assert.ok(!L.awayDigest(srv.state, wid, srv.state.tick, { tonight: true }).headlines.some(fell), 'a cursor at the tick would have emptied it of the Curtain');
    // she is still reading the second edition: the third waits its turn, then shows when she closes it
    await wait(300);
    assert.equal(ui.result.curtain.id, ids[1], 'the edition she is reading stays on screen');
    lw.ACTS['after-results']();
    assert.ok(await until(() => ui.result && ui.result.curtain.id === third[0], 6000), `the third edition is shown next (${ui.result && ui.result.curtain.id})`);
    assert.equal(ui.screen, 'results');
    assert.ok(await until(() => seenActs().length === m0 + 2 && !ui.cache.busy, 3000), `marked seen once it is shown (${seenActs().length - m0})`);
    const upTo2 = seenActs()[m0 + 1].args[2];
    assert.ok(upTo2 >= third[0], `with its own edition's events (${upTo2} >= ${third[0]})`);
    assert.equal(srv.state.accounts[ACC].seen[tl], Math.min(upTo2, srv.state.tick), 'the cursor moves on to it');
    const after = L.awayDigest(srv.state, wid, srv.state.accounts[ACC].seen[tl], { tonight: true }).headlines;
    assert.ok(!after.some(fell), `and the third is no longer news (${J(after.map((h) => h.type))})`);
    // once: the poll that brings its events again does not show it a second time
    lw.ACTS['after-results'](); await wait(10);
    assert.equal(ui.screen, 'front', 'no fourth edition');
    await lw.poll(true); await wait(300);
    assert.equal(ui.screen, 'front', 'the poll does not show it again');
    assert.equal(seenActs().length, m0 + 2, 'and posts no more markSeen');
  } finally { srv.beforeApply = null; }
  if (ui.modal) lw.closeModal();
});

test('Z6: a 401 answering a request sent under an earlier sign-in is ignored: First_Player\'s move held on the wire, she logs out, Second_Player logs in, the old 401 arrives: the account stays Second_Player and nothing signs out', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  await lw.net.start();
  assert.equal(lw.net.account().name, 'Ruby_Buckshot', 'First_Player is signed in');
  let release = () => {}; srv.hold401 = new Promise((r) => { release = r; }); const held0 = srv.held;
  const pending = lw.act(...aMove());
  try {
    assert.ok(await until(() => srv.held === held0 + 1), 'her move is on the wire');
    await lw.ACTS['sign-out']();
    assert.notEqual(ui.mode, 'arena'); assert.equal(lw.net.account().name, null, 'logged out');
    srv.user = 'Second_Player';
    const r = await lw.net.login('Second_Player', 'a fine long password');
    assert.ok(r.ok, J(r));
    await lw.net.adopt(r.data.user);
    assert.equal(lw.net.account().name, 'Second_Player', 'Second_Player is signed in');
    // the old session's 401 is delivered now
    release();
    assert.equal(await pending, null, 'the old answer is not taken');
    const lines = [];
    await until(() => { const t = textOf(printed()); if (t) lines.push(t); if (printed()) lw.ACTS['hl-close'](); return false; }, 600);
    const a = lw.net.account();
    assert.equal(a.name, 'Second_Player', `the account stays Second_Player (${J(a)})`);
    assert.equal(a.hint, 'Second_Player');
    assert.equal(JSON.parse(localStorage.getItem('lw-scandal-acct')), 'Second_Player', 'and this device still names her');
    assert.ok(!lines.some((t) => /Logged out on this device|not on tonight's list/.test(t)), `no signed-out line (${J(lines)})`);
  } finally {
    release(); srv.hold401 = null; srv.user = 'Ruby_Buckshot';
    await lw.net.adopt({ name: 'Ruby_Buckshot', member: true });
  }
  assert.equal(lw.net.account().name, 'Ruby_Buckshot');
});
