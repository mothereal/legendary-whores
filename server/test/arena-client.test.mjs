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
// screen) is shown next, and markSeen carries the newest event of the edition shown (never more than the poll cursor),
// so the seen cursor never passes an edition she has not seen and the return digest keeps it; a 401 from a request sent
// under an earlier sign-in never signs out the account signed in now.
// And the lead's round-4 edits (Z7 to Z9): an edition whose Curtain came down while she left the District (the Curtain
// fell inside the leave's own markSeen) or switched girl is never drawn; a markSeen that is not an edition's (the return
// digest's) carries the newest event the page has had, so a Curtain that falls inside its own catch-up stays news; the
// welcome evening's join answered 401 after she logged out and another account logged in leaves the new account as it is.
// And Codex round 5 (Z10 to Z12): markSeen acknowledges only history the page has received in one piece, the poll
// cursor, never an act's events past it: a legal Study that lands past a Curtain the page has not had, then a leave,
// leaves that Curtain news; a return digest closed by a new Curtain's drop acknowledges what it was built from; and a
// leave while a Curtain is coming down acknowledges below it.
// And the Codex round 5 review (Z13): after an answer flagged eventsGap moves the cursor past a Curtain she never saw, a
// digest built at an older tick (the digest poll that should replace it answered 429) acknowledges no further than the
// tick it was built at, so the next return digest still lists the Curtain.
// And round 8 (Z15): after that gap, a new Curtain brought by an ordinary poll is shown and closed, and its edition's
// markSeen holds at the cursor before the gap (the gap floor), so no markSeen passes a Curtain in the gap before the
// digest that covers it lands.
// And round 9 (Z16, Z17): a confirmation that closes by itself advances the headline queue once, so an X tapped
// while its exit runs never discards the line queued behind it; and inside a pop-up a second tap on its text, after the
// first held it, is never the scrim's close-modal.
// And B1a (the rummage cap): the back doors header counts her fresh and picked-over tries from the view, and once both
// are spent says Picked clean until the dawn hour; the view serves staleRummagesLeft beside freshRummagesLeft. A tap past
// the cap (the seventh in a District day) says the same in its headline (the dawn hour in the arena, "dawn" in solo),
// never the Gossip line.
// And B1b (one full-pay string): the front page's Curtain line reads the full-pay count from the view with the dawn hour
// and the real time of her next Curtain, at 0 the After Hours line; the Place cards carry the same string.
// And B2 (first session, driver's seat, read the room, season keep; spec-B2 C1 to C14, each test named B2-...): the
// shorter paper ladder; a market card's back says who likes it; Skip keeps the step-by-step; the Morning Edition once per
// device; the rehearsal named before it starts, with Skip; a countdown on every wait; the Little Black Book page; the
// Study reveal; the hindsight line on the return headline; the crowd forecast on each Place row; the season's end and the
// season-end sheet; and the three small ones: the reason under a greyed-out Buy in both novelty pop-ups (B2-stall-why),
// Learn another with the copy count on a market card she already has (B2-learn), and her own Players row marked and
// scrolled to once (B2-players-me); the whole Curtain line at last call (B2-lastcall) and a TONIGHT headline that outlived
// its Curtain (B2-strip-past). The mock payload carries `forecast` the way server/world.mjs payload() does, and passes the
// wire's own checkForecast once at load. And the third code review (B2-countdown-final): the last minute before a
// Curtain counts down in seconds for a sealed girl and an unsealed one alike, never a floor of 2 min.
// And B3a (the night speaks back, the missed night; spec-B3 4d, 4e and 7, each test named B3-...): the host's line on
// every placing and the winner's own line under a house winner only, never under a real player's nom de plume (B3-a);
// the Curtain she missed replayed in full from its CURTAIN CALL on the return digest, with the hindsight line, then the
// rest of the digest and one markSeen at the digest's mark (B3-b); a Standing Order headline replays only its latest
// night and stays on the sheet that comes back (B3-c). And the tourist's dogear (backlog 20): one plain line under his
// voice line, from the hold itself and from the job screen's own tap (B3-d).
// And B3a's second fix round (B3-g to B3-j): a replay walked out of while its curtain comes down keeps the hindsight
// baseline for the next return, and a sheet with that CURTAIN CALL alone ends the replay with the plain exit and one
// markSeen; Go there from a replayed edition (and the same switch through Let her go at last call) sends one markSeen for
// the street she left, at the kept mark; the results masthead names the Curtain the edition reports on, live and
// replayed; a replayed edition's exit reads Back to your news. And the third fix round (B3-k, B3-l): Seal now at last
// call from a replayed edition brings the rest of the digest back over the plan screen with the pick kept, and a Curtain
// that falls while a replayed edition is read waits for the sheet that comes back to close.
// And B3b (guests in the District; spec-B3 17i, test B3-e): on a device with no game, Play as guest posts the stage name
// alone (a good typed name as typed, else one from names.js, rerolled up to three times on name-taken, then the
// server's words in the form), then goes the way a sign-up goes: the suspects, the arrival card with Skip to the
// District, and the District after it. The kept-until line prints from the expiry /api/me sent, on the welcome, on the
// title desk's Keep this game form and on the ask before a guest logs out; Keep this game posts the name and password
// and the page then reads as a kept account (no line, no form, Log out at once); a device with a solo save keeps its
// carry-on button, signed out and signed in. Its fix rounds (B3-m to B3-t): a page-load read answered after the keep
// brings no guest back; the keep's fields take the shared input handling; 403 not-guest reads the account again; the
// pick page greys a street a guest cannot take; the ask carries the no-password line and no date; Log out never fires
// on the kind the page holds (not known after a reload, or confirmed earlier and another tab's by now): every tap but
// the ask's own reads the account first, and so does Keep this game on the ask when the page does not hold her as a
// guest.
// Run: node --test 'server/test/*.test.mjs' (zero dependencies; each test file runs in its own process).
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import * as L from '../../engine/rules.js';
import { SEEDS, gameOpts } from '../../game/slice-config.js';
import { NOM_RE, allNames } from '../../game/names.js';
import { checkForecast } from './helpers.mjs';

const C = L.CONTENT; const R = L.RULES;
const J = JSON.stringify;

// ---- the page's world: timers that never hold the process open, a clock the test can move, a DOM that renders nothing --
const realSetTimeout = globalThis.setTimeout; const realSetInterval = globalThis.setInterval;
// every poll the page schedules (schedulePoll's timer), with its delay, so a test can read the pace it chose
const pollDelays = [];
globalThis.setTimeout = (fn, ms, ...a) => { if (typeof fn === 'function' && String(fn) === '() => poll()') pollDelays.push(ms); const t = realSetTimeout(fn, ms, ...a); t.unref?.(); return t; };
// every interval the page registers (the District clock among them), kept so a test can run one tick by hand
const intervals = [];
globalThis.setInterval = (fn, ms, ...a) => { if (typeof fn === 'function') intervals.push({ fn, ms }); const t = realSetInterval(fn, ms, ...a); t.unref?.(); return t; };
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
// a test plants a form or a field here under its id (the title's Create account field, the Keep this game form) so the
// page reads what was "typed"; both lookups below resolve it
const byId = { app, layer };
// the headline strip's places (paintHl writes the headline into one of them and empties the others): kept, so the test
// reads what is printed now
const HL_SLOTS = ['.hl-wrap', '#app .hlslot', '#modal .mslot', '#modal .cslot'];
const slots = Object.fromEntries(HL_SLOTS.map((q) => [q, el()]));
// the page's document listeners (its capture-phase click handler among them), kept so a test can deliver a tap
const docOn = {};
globalThis.document = {
  body, documentElement: docEl, hidden: false, activeElement: body,
  querySelector(q) { if (q === '#app') return app; if (q === '#layer') return layer; if (q === '#modal') return layer.children[0] || null; if (slots[q]) return slots[q]; if (q.startsWith('#') && byId[q.slice(1)]) return byId[q.slice(1)]; return el(); },
  querySelectorAll(q) { if (q === '#modal .mslot, #modal .cslot, #app .hlslot') return [slots['#modal .mslot'], slots['#modal .cslot'], slots['#app .hlslot']]; return []; },
  getElementById(id) { return byId[id] || null; },
  createElement(t) { return el(t); }, addEventListener(type, fn) { (docOn[type] ||= []).push(fn); }, removeEventListener() {}, head: el('head'),
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
// the page's own window listeners (pagehide: the unload save), kept so a test can fire one
const winOn = {};
globalThis.addEventListener = (type, fn) => { (winOn[type] ||= []).push(fn); }; globalThis.removeEventListener = () => {};
const fireWindow = (type) => { for (const fn of winOn[type] || []) fn(); };

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
  // GET /api/me open: the starters whose streets have room for the account (a seat, and for a guest a guest seat); null
  // = every street under the cap, as the server derives it for a kept player
  open: null,
  user: 'Ruby_Buckshot', // the nom de plume the session cookie names (GET /api/me, POST /api/login)
  member: true, // GET /api/me user.member: she has a girl in the District (a fresh guest has none until her join)
  // a guest account (B3 17c to 17g): GET /api/me then carries guest: true and guestExpiresAt (ms) for her own session;
  // POST /api/guest makes one (its raw bodies are kept, so a test can read exactly what went up), answered name-taken
  // the next `guestTaken` times, and 429 rate-limited once `guestLeft` requests have come (the server's three an hour
  // for one address, every request counted, a refused name too: a test sets it to 3 for each fresh hour it plays);
  // POST /api/guest/keep keeps it (bodies kept too), 403 not-guest for a kept account; POST /api/logout is counted.
  // guests-full comes from the join alone (17d), see joinFull below
  guest: false, guestExpiresAt: null, guests: [], guestTaken: 0, guestLeft: 3, keeps: [], logouts: 0,
  // the next GET /api/me is answered as the account was when it came, delivered once this promise resolves (a page-load
  // read sent before a keep and answered after it): null = none
  holdMe: null,
  // the next act or join answered 401 not-signed-in once this promise resolves (the session it went up under has gone
  // meanwhile): null = none
  hold401: null,
  // POST /api/join: how many came (B2 C7's Skip posts one), and whether the next is answered 201 with the view payload
  // (the world already holds her girl) rather than 409 already-in-world; joinFull: the next one is a guest's first join
  // with the guest rooms taken, 503 guests-full with the server's line (world-full's), once
  joins: 0, joinOk: false, joinFull: false,
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
  const views = {}; const legal = {}; const forecast = {};
  // the crowd forecast beside legal, the shape server/world.mjs payload() builds (B2 S1): labels, counts and known from crowdHint
  // (the known entries cut to the five fields world.mjs sends, never crowdHint's whole entry with upstage; the one
  // checkForecast run below the join keeps this mock on the wire's shape)
  for (const w of (q.all ? ids : [focus])) { views[w] = L.getView(s, w, { logTail: 0 }); legal[w] = L.legalActions(s, w); const { labels, counts, known } = L.crowdHint(s, w); forecast[w] = { labels, counts, known: Object.fromEntries(Object.entries(known).map(([pid, ks]) => [pid, ks.map(({ id, name, short, why, lastSway }) => ({ id, name, short, why, lastSway }))])) }; }
  const curtains = {};
  for (const tl of C.TIMELINE_IDS) { const T = s.timelines[tl]; curtains[tl] = { curtainNo: T.curtainNo, lastCurtainAt: T.lastCurtainAt, nextCurtainAt: L.nextForcedAt(s, T), earliestCurtainAt: T.lastCurtainAt + R.curtain.minGapMin, humans: 1, humanNames: [], sealing: L.sealingOf(s, tl), ready: L.curtainReady(s, tl) }; }
  const evs = L.eventsFor(s, ACC, q.tick || 0);
  const p = { boot: srv.boot, rev: srv.rev, tick: s.tick, serverNow: Date.now(), clock: s.clock, day: s.day, season: s.season, minPerSec: '0.016666667', epochMs: Date.now() - s.clock * 60000,
    account: { ...acct, id: ACC, lastNonce: srv.lastNonce }, focus, views, legal, forecast, curtains, events: evs.slice(-200), eventsGap: evs.length > 200, replayed: false };
  if (q.boards) { p.whorescore = L.whorescore(s, ACC); p.boards = L.leaderboards(s); }
  if (q.digest) { p.digest = {}; for (const w of acct.whores) p.digest[w.timeline] = L.awayDigest(s, w.id, acct.seen[w.timeline] || 0, { tonight: true }); }
  return p;
}
// the mock's forecast passes the wire's own walk (helpers.mjs checkForecast, the walk T-privacy-http and T-swarm run over
// server/world.mjs payload()), so the mock can never drift from the wire's shape again (third code review, finding 6)
checkForecast(payload({ all: 1 }), { humans: [], whores: srv.state.whores, own: [`${ACC}:dolly`] });
// the actions whose args[0] is the account (validate.mjs ACCOUNT_SCOPED): no curtain; every other carries the curtainNo
// of her Timeline when the tap was made, and the server refuses it once that Curtain has fallen (server.mjs act)
const ACCOUNT_SCOPED = ['chooseStarter', 'openTimeline', 'markSeen'];
const answer = (status, data, hdr = {}) => ({ ok: status < 400, status, headers: { get: (h) => (h === 'content-type' ? 'application/json' : hdr[h] ?? null) }, json: async () => data });
const lose = () => { throw new TypeError('fetch failed'); };
globalThis.fetch = async (url, opts) => {
  const u = new URL(url, 'http://localhost');
  if (srv.down && u.pathname !== '/api/act') lose();
  if (u.pathname === '/api/me') {
    srv.meRequests++;
    const user = { name: srv.user, member: srv.member, ...(srv.guest ? { guest: true, guestExpiresAt: srv.guestExpiresAt } : {}) };
    if (srv.holdMe) { const h = srv.holdMe; srv.holdMe = null; await h; }
    const open = srv.open ? [...srv.open] : ['dolly', 'fanny', 'jackie'].filter((c) => (srv.crowd[C.CHARACTERS[c].timeline] || 0) < 10);
    return answer(200, { user, crowd: { ...srv.crowd }, tlCap: 10, open });
  }
  if (u.pathname === '/api/login') return answer(200, { user: { name: srv.user, member: false } });
  if (u.pathname === '/api/logout') { srv.logouts++; return answer(200, {}); }
  if (u.pathname === '/api/guest') {
    srv.guests.push(String(opts.body));
    const b = JSON.parse(opts.body);
    // the limiter first, as the server has it (before the body): every request counts
    if (srv.guestLeft <= 0) return answer(429, { error: { code: 'rate-limited', message: 'Too many requests. Try again later.' } }, { 'retry-after': '3600' });
    srv.guestLeft--;
    if (typeof b.name !== 'string' || !NOM_RE.test(b.name)) return answer(400, { error: { code: 'name-format', message: 'Letters, numbers and underscores, 3 to 24 of them.' } });
    if (srv.guestTaken > 0) { srv.guestTaken--; return answer(409, { error: { code: 'name-taken', message: 'That name is already on the street.' } }); }
    srv.user = b.name; srv.guest = true; srv.member = false; srv.guestExpiresAt = srv.guestExpiresAt || Date.now() + 7 * 24 * 3600 * 1000;
    return answer(201, { user: { name: b.name, saveUpdatedAt: null, guest: true } });
  }
  if (u.pathname === '/api/guest/keep') {
    srv.keeps.push(String(opts.body));
    const b = JSON.parse(opts.body);
    if (!srv.guest) return answer(403, { error: { code: 'not-guest', message: 'This account is already kept.' } });
    if (typeof b.name !== 'string' || !NOM_RE.test(b.name)) return answer(400, { error: { code: 'name-format', message: 'Letters, numbers and underscores, 3 to 24 of them.' } });
    if (typeof b.password !== 'string' || b.password.length < 8 || b.password.length > 128) return answer(400, { error: { code: 'password-short', message: 'Eight characters or more.' } });
    srv.user = b.name; srv.guest = false; srv.guestExpiresAt = null;
    return answer(200, { user: { name: b.name, saveUpdatedAt: null, member: srv.member } });
  }
  if (u.pathname === '/api/join') {
    srv.joins++;
    if (srv.joinFull) { srv.joinFull = false; return answer(503, { error: { code: 'guests-full', message: 'Every room on the street is taken tonight. Try again after the next Curtain.' } }, { 'retry-after': '600' }); }
    if (srv.joinOk) { srv.joinOk = false; srv.member = true; return answer(201, payload({ all: 1, digest: 1, boards: 1 })); }
    if (srv.hold401) { const h = srv.hold401; srv.hold401 = null; srv.held++; await h; return answer(401, { error: { code: 'not-signed-in', message: 'Your name\'s not on tonight\'s list. Log in on the title page.' } }); }
    return answer(409, { error: { code: 'already-in-world', message: 'You\'re already on the street.' } });
  }
  if (u.pathname === '/api/act') {
    const b = JSON.parse(opts.body);
    srv.acts.push({ action: b.action, nonce: b.nonce, args: b.args, curtain: b.curtain });
    if (srv.hold401) { const h = srv.hold401; srv.hold401 = null; srv.held++; await h; return answer(401, { error: { code: 'not-signed-in', message: 'Your name\'s not on tonight\'s list. Log in on the title page.' } }); }
    if (srv.down) lose(); // the attempt is counted; nothing reaches the server
    if (srv.acts.length - 1 === srv.act429At) { srv.act429At = -1; return answer(429, { error: { code: 'rate-limited', message: 'Too many requests. Try again later.' } }, { 'retry-after': srv.act429Ra }); }
    const girl = !ACCOUNT_SCOPED.includes(b.action);
    if (girl ? !Number.isSafeInteger(b.curtain) || b.curtain < 0 : b.curtain !== undefined && !(Number.isSafeInteger(b.curtain) && b.curtain >= 0)) return answer(400, { error: { code: 'bad-request', message: 'The server couldn\'t read that. Send it again.' } });
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
  const LINE = 'Can\'t reach the District. Your move will go in when it\'s back.';
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
  assert.match(t, new RegExp(`^Sealed for ${esc(C.PLACES[place].short)}\\. The Curtain falls at about [^]+?\\. \\d+ of \\d+ sealed\\. The Curtain falls early once everyone who played today has sealed\\.$`), t);
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
  const SET_BACK = 'The District was restored from a backup, so your move didn\'t go in. Try it again.';
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
const PASSED_SO = 'The Curtain fell before your move went in. She went out by Standing Order instead.';
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
// the season-end sheet shown on this device, forgotten: the device's storage and the page's own memory of it (ui.seasonShown,
// per account), so a test can roll a season number the page has already shown
const forgetSeason = () => { localStorage.removeItem(`lw-scandal-season-shown:${ACC}`); delete ui.seasonShown[ACC]; };

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
  assert.ok(!textOf(printed()).includes('She went out by Standing Order instead.'), textOf(printed()));
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

const HAND_CHANGED_KEPT = 'Your hand changed. The move you sent before the wire came back has landed.';
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
    // the page's poll cursor as the third edition's markSeen reaches the server
    let cursorAt = null;
    srv.beforeApply = (b) => { if (b.action === 'markSeen' && b.args[1] === tl && cursorAt === null) cursorAt = ui.cache.tick; return false; };
    lw.ACTS['after-results']();
    assert.ok(await until(() => ui.result && ui.result.curtain.id === third[0], 6000), `the third edition is shown next (${ui.result && ui.result.curtain.id})`);
    assert.equal(ui.screen, 'results');
    const newest = ui.result.evs.reduce((m, e) => (e && Number.isSafeInteger(e.id) && e.id > m ? e.id : m), third[0]);
    assert.ok(await until(() => seenActs().length === m0 + 2 && !ui.cache.busy, 3000), `marked seen once it is shown (${seenActs().length - m0})`);
    srv.beforeApply = null;
    const upTo2 = seenActs()[m0 + 1].args[2];
    // Codex round 5: this edition came in an act's answer, so it may lie past the poll cursor with events between the two
    // that the page has not had. Its markSeen carries the newest event of its edition, but never more than the cursor: the
    // result she watched may then be listed again on her return, and nothing she has not seen is ever passed over.
    assert.ok(Number.isSafeInteger(cursorAt), 'the cursor was read as the markSeen went up');
    assert.equal(upTo2, Math.min(newest, cursorAt), `with its own edition's events, held at the poll cursor (${upTo2}; newest ${newest}, cursor ${cursorAt}, Curtain ${third[0]})`);
    assert.equal(srv.state.accounts[ACC].seen[tl], Math.min(upTo2, srv.state.tick), 'the cursor moves on to it');
    const after = L.awayDigest(srv.state, wid, srv.state.accounts[ACC].seen[tl], { tonight: true }).headlines;
    if (upTo2 >= third[0]) assert.ok(!after.some(fell), `and the third is no longer news (${J(after.map((h) => h.type))})`);
    else assert.ok(after.some(fell), `and the third, held past the cursor, is listed again rather than passed over (${J(after.map((h) => h.type))})`);
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

// Codex round 5: the seen cursor moves only over history the page has received in one piece. An act's answer brings its
// own events past the poll cursor, but that is no proof the page has the events between the cursor and them, so markSeen
// never goes past the cursor on their account. A digest acknowledges what it was built from, not what the page holds when
// it closes, and nothing acknowledges a Curtain whose edition is still coming down.
// her return digest as a sheet: she read everything, left, and a Curtain fell while she was out
async function returnWithDigest() {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const tl = herTl(); const wid = ui.active;
  srv.state = L.markSeen(srv.state, ACC, tl); srv.rev++;
  lw.leaveArena();
  srv.state = L.advanceClock(srv.state, L.nextForcedAt(srv.state, srv.state.timelines[tl]) - srv.state.clock + 1); srv.rev++;
  const p = payload({ all: 1, digest: 1, boards: 1 });
  assert.ok(p.digest[tl].headlines.some(fellH), `the missed Curtain is news (${J(p.digest[tl].headlines.map((h) => h.type))})`);
  lw.enterArena(p, 'resume');
  await wait(30); // the poll enterArena sends at once has come back (it brings nothing new)
  await until(() => !ui.cache.busy);
  assert.equal(ui.modal && ui.modal.type, 'digest', 'the return digest is a sheet');
  return { tl, wid };
}
const seenOf = (tl) => srv.acts.filter((a) => a.action === 'markSeen' && a.args[1] === tl);
// a Curtain on the clock in Timeline tl, server side, with no poll: its curtain event ids
function curtainOnClock(tl) {
  const t0 = srv.state.tick;
  srv.state = L.advanceClock(srv.state, L.nextForcedAt(srv.state, srv.state.timelines[tl]) - srv.state.clock + 1); srv.rev++;
  return L.eventsFor(srv.state, ACC, t0).filter((e) => e.type === 'curtain' && e.timeline === tl).map((e) => e.id);
}

test('Z10: the return digest closes, a legal Study lands past a Curtain the page has not had, she leaves: the leave acknowledges no further than the poll cursor, below that Curtain, and the next return digest still lists it', async () => {
  const { tl, wid } = await returnWithDigest();
  const m0 = seenOf(tl).length;
  const cursor = ui.cache.tick; // the poll cursor (105 in Codex's run)
  // a Curtain falls on the server and no poll brings it (134 in Codex's run)
  const ids = curtainOnClock(tl);
  assert.equal(ids.length, 1, `one Curtain (${J(ids)})`); const unseen = ids[0];
  assert.ok(unseen > cursor);
  // she closes the digest: its markSeen (an account-scoped act) carries her girl's view, so the page learns the new
  // curtainNo without the Curtain's events, and the cursor stays
  lw.closeModal();
  assert.ok(await until(() => seenOf(tl).length === m0 + 1 && !ui.cache.busy), 'the digest\'s markSeen went up');
  assert.ok(seenOf(tl)[m0].args[2] < unseen, `the digest acknowledges below the Curtain (${J(seenOf(tl)[m0].args)}; ${unseen})`);
  assert.equal(lw.V().timeline.curtainNo, curNo(), 'her page shows the new curtainNo');
  assert.equal(ui.cache.tick, cursor, 'and the cursor has not moved');
  try {
    // a legal Study: its events (195 and 196 in Codex's run) come back past the Curtain
    const evs = await lw.act(...aMove());
    assert.ok(Array.isArray(evs) && evs.length > 0, 'the move landed');
    assert.ok(evs.every((e) => e.id > unseen), `its events are past the Curtain (${J(evs.map((e) => e.id))})`);
    assert.equal(ui.cache.tick, cursor);
    // she leaves at once
    await lw.ACTS.leave();
    assert.notEqual(ui.mode, 'arena', 'she has left');
    assert.equal(seenOf(tl).length, m0 + 2, 'the leave\'s markSeen went up');
    const upTo = seenOf(tl)[m0 + 1].args[2];
    assert.ok(Number.isSafeInteger(upTo) && upTo <= cursor && upTo < unseen, `the leave acknowledges no further than the poll cursor (${upTo}; cursor ${cursor}, unseen Curtain ${unseen}, Study ${J(evs.map((e) => e.id))})`);
    const seen = srv.state.accounts[ACC].seen[tl];
    assert.ok(seen < unseen, `the seen cursor (${seen}) is short of the Curtain (${unseen})`);
    assert.ok(L.awayDigest(srv.state, wid, seen, { tonight: true }).headlines.some(fellH), 'the Curtain she never saw is news');
    // the next return digest lists it, and the page prints it
    const p2 = payload({ all: 1, digest: 1, boards: 1 });
    assert.ok(p2.digest[tl].headlines.some(fellH), `the next return digest lists it (${J(p2.digest[tl].headlines.map((h) => h.type))})`);
    lw.enterArena(p2, 'resume'); await wait(30);
    const shown = ui.modal && ui.modal.type === 'digest' ? ui.modal.data.headlines : ui.strip ? ui.strip.headlines : [];
    assert.ok(shown.some(fellH), `and the page prints it (${J(shown.map((h) => h.type))})`);
  } finally {
    if (ui.modal) lw.closeModal();
    await until(() => !ui.cache.busy);
  }
});

test('Z11: a return digest closed by a new Curtain\'s drop acknowledges what it was built from, not the cursor the poll moved past that Curtain; the edition, once shown, acknowledges its Curtain', async () => {
  const { tl } = await returnWithDigest();
  const m0 = seenOf(tl).length;
  const built = ui.cache.tick; // the watermark the digest was built at
  const cur = curtainFalls();
  const id = cur.curtainIds[0];
  try {
    await lw.poll(true); // brings the Curtain: the digest closes and the curtain comes down
    assert.ok(ui.cache.tick >= id, 'the poll moved the cursor past the Curtain');
    assert.ok(dropping(), 'the curtain is coming down'); assert.equal(ui.result, null, 'its edition is not shown yet');
    assert.ok(await until(() => seenOf(tl).length === m0 + 1 && !ui.cache.busy), 'the digest\'s markSeen went up as it closed');
    const upTo = seenOf(tl)[m0].args[2];
    assert.equal(upTo, built, `the digest acknowledges the watermark it was built at (${upTo}; built at ${built}, Curtain ${id}, cursor ${ui.cache.tick})`);
    assert.ok(srv.state.accounts[ACC].seen[tl] < id, `the seen cursor is short of the Curtain coming down (${srv.state.accounts[ACC].seen[tl]} < ${id})`);
    // the edition is shown and acknowledges its own Curtain
    assert.ok(await until(() => ui.result && ui.result.curtain.id === id, 6000), 'the edition is shown');
    assert.ok(await until(() => seenOf(tl).length === m0 + 2 && !ui.cache.busy), 'the edition\'s markSeen went up');
    assert.ok(seenOf(tl)[m0 + 1].args[2] >= id, `with its Curtain (${J(seenOf(tl)[m0 + 1].args)}; ${id})`);
    assert.ok(srv.state.accounts[ACC].seen[tl] >= id, 'the seen cursor is at the Curtain now');
    await wait(300);
    assert.equal(seenOf(tl).length, m0 + 2, 'two markSeens, no more');
    lw.ACTS['after-results'](); await wait(10);
  } finally {
    // pass or fail, nothing of this Curtain is left running for the next test: its drop has finished and its edition is
    // closed (a drop left running would send the next test's Curtain into the queue instead of down at once)
    await until(() => !dropping(), 6000);
    if (ui.screen === 'results') { lw.ACTS['after-results'](); await wait(10); }
    if (ui.modal) lw.closeModal();
    await until(() => !ui.cache.busy);
  }
});

test('Z12: leaving the District while a Curtain the poll brought is still coming down acknowledges below it: the edition was never shown, and the next return digest lists it', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const tl = herTl(); const wid = ui.active;
  srv.state = L.markSeen(srv.state, ACC, tl); srv.rev++;
  await lw.poll(true); await wait(10);
  const m0 = seenOf(tl).length;
  const cur = curtainFalls(); const id = cur.curtainIds[0];
  try {
    // nothing is mid-action (midAction: no curtain dropping, no edition on screen, nothing on the wire), so the Curtain
    // the poll brings takes the direct drop path, never the result queue: the leave below is tested against a Curtain
    // that is coming down, whatever ran before this test
    assert.ok(!dropping() && ui.screen !== 'results' && !acting() && !ui.cache.busy && !ui.cache.unsettled,
      `nothing is mid-action before the poll (overlays ${ui.overlays}, screen ${ui.screen}, busy ${ui.cache.busy}, unsettled ${J(ui.cache.unsettled)})`);
    await lw.poll(true);
    assert.ok(ui.cache.tick >= id, 'the poll brought the Curtain');
    assert.ok(dropping(), 'the curtain is coming down'); assert.equal(ui.result, null);
    assert.ok(!acting() && ui.screen !== 'results', 'and it came down at once: nothing else was mid-action to queue it behind');
    await lw.ACTS.leave();
    assert.notEqual(ui.mode, 'arena', 'she has left');
    assert.equal(seenOf(tl).length, m0 + 1, 'the leave\'s markSeen went up');
    const upTo = seenOf(tl)[m0].args[2];
    assert.ok(Number.isSafeInteger(upTo) && upTo < id, `the leave acknowledges below the Curtain coming down (${upTo}; ${id})`);
    const seen = srv.state.accounts[ACC].seen[tl];
    assert.ok(seen < id, `the seen cursor (${seen}) is short of it`);
    await wait(2800); await until(() => !dropping());
    assert.equal(ui.result, null, 'its edition was never shown');
    assert.ok(L.awayDigest(srv.state, wid, seen, { tonight: true }).headlines.some(fellH), 'so it is news for her return');
  } finally {
    if (ui.modal) lw.closeModal();
    await until(() => !ui.cache.busy);
  }
});

test('Z13: an answer flagged eventsGap moves the cursor past Curtains she never saw, and the digest poll that follows is answered 429: closing the digest she has, built at an older tick, acknowledges no further than that tick, and the next return digest still lists them', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const tl = herTl(); const wid = ui.active;
  // the digest she holds was built at the tick of the payload that carried it (enter's), and she has read everything so far
  const builtAt = srv.state.tick;
  srv.state = L.markSeen(srv.state, ACC, tl); srv.rev++;
  await lw.poll(true); await wait(10);
  const cursor0 = ui.cache.tick;
  assert.ok(cursor0 >= builtAt, `the poll cursor (${cursor0}) is at or past the digest's tick (${builtAt})`);
  const m0 = seenOf(tl).length; const v0 = srv.views.length;
  // Curtains fall on the server with no poll, until more events wait than one answer carries (200): the next poll's
  // answer is flagged eventsGap and moves the cursor to the server's tick, past all of them
  const curIds = [];
  for (let i = 0; i < 12 && L.eventsFor(srv.state, ACC, cursor0).length <= 200; i++) curIds.push(...curtainOnClock(tl));
  const gapN = L.eventsFor(srv.state, ACC, cursor0).length;
  assert.ok(gapN > 200, `more events wait than one answer carries (${gapN})`);
  assert.ok(curIds.length > 0 && curIds.every((id) => id > cursor0 && id > builtAt), `Curtains fell past the cursor and the digest's tick (${J(curIds)}; cursor ${cursor0}, digest ${builtAt})`);
  // the digest poll onEventsGap sends (the first view request asking digest=1 from here) is answered 429
  let digestPolls = 0; const f0 = globalThis.fetch;
  globalThis.fetch = async (url, opts) => { const u = new URL(url, 'http://localhost'); if (u.pathname === '/api/view' && u.searchParams.get('digest') === '1' && ++digestPolls === 1) srv.view429 = '1'; return f0(url, opts); };
  try {
    await lw.poll(true);
    assert.ok(await until(() => digestPolls >= 1), 'the digest poll went up');
    await wait(60); await until(() => !ui.cache.busy);
    assert.equal(digestPolls, 1, 'one digest poll, answered 429');
    assert.equal(srv.views.slice(v0).filter((q) => q.digest === '1').length, 1, `the view requests since the gap (${J(srv.views.slice(v0))})`);
    assert.ok(ui.cache.tick >= Math.max(...curIds), `the eventsGap answer moved the cursor past every Curtain (${ui.cache.tick}; ${J(curIds)})`);
    // she closes whatever the page printed from the digest she has (a sheet, a strip, or nothing): its markSeen goes up
    if (ui.modal) lw.closeModal();
    assert.ok(await until(() => seenOf(tl).length > m0 && !ui.cache.busy), 'the digest\'s markSeen went up');
    const acks = seenOf(tl).slice(m0).map((a) => a.args[2]);
    assert.ok(acks.every((u) => Number.isSafeInteger(u) && u <= builtAt), `the digest acknowledges no further than the tick it was built at (${J(acks)}; built at ${builtAt}, cursor ${ui.cache.tick}, Curtains ${J(curIds)})`);
    const seen = srv.state.accounts[ACC].seen[tl];
    assert.ok(curIds.every((id) => seen < id), `the seen cursor (${seen}) is short of every Curtain in the gap (${J(curIds)})`);
    // she closes the tab (no leave): the next return digest lists them, and the page prints it
    lw.leaveArena();
    const p2 = payload({ all: 1, digest: 1, boards: 1 });
    assert.ok(p2.digest[tl].headlines.some(fellH), `the next return digest lists them (${J(p2.digest[tl].headlines.map((h) => h.type))})`);
    lw.enterArena(p2, 'resume'); await wait(30);
    const shown = ui.modal && ui.modal.type === 'digest' ? ui.modal.data.headlines : ui.strip ? ui.strip.headlines : [];
    assert.ok(shown.some(fellH), `and the page prints it (${J(shown.map((h) => h.type))})`);
    assert.equal(wid, ui.active);
  } finally {
    globalThis.fetch = f0; srv.view429 = null;
    if (ui.modal) lw.closeModal();
    await until(() => !ui.cache.busy);
  }
});

test('ZL: she taps Leave after the Z13 gap: an answer flagged eventsGap moves the cursor past Curtains she never saw, and the digest poll that follows is answered 429: closing the digest she has, built at an older tick, acknowledges no further than that tick, then her leave acknowledges no further than the cursor before the gap, and the next return digest still lists them', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const tl = herTl(); const wid = ui.active;
  // the digest she holds was built at the tick of the payload that carried it (enter's), and she has read everything so far
  const builtAt = srv.state.tick;
  srv.state = L.markSeen(srv.state, ACC, tl); srv.rev++;
  await lw.poll(true); await wait(10);
  const cursor0 = ui.cache.tick;
  assert.ok(cursor0 >= builtAt, `the poll cursor (${cursor0}) is at or past the digest's tick (${builtAt})`);
  const m0 = seenOf(tl).length; const v0 = srv.views.length;
  // Curtains fall on the server with no poll, until more events wait than one answer carries (200): the next poll's
  // answer is flagged eventsGap and moves the cursor to the server's tick, past all of them
  const curIds = [];
  for (let i = 0; i < 12 && L.eventsFor(srv.state, ACC, cursor0).length <= 200; i++) curIds.push(...curtainOnClock(tl));
  const gapN = L.eventsFor(srv.state, ACC, cursor0).length;
  assert.ok(gapN > 200, `more events wait than one answer carries (${gapN})`);
  assert.ok(curIds.length > 0 && curIds.every((id) => id > cursor0 && id > builtAt), `Curtains fell past the cursor and the digest's tick (${J(curIds)}; cursor ${cursor0}, digest ${builtAt})`);
  // the digest poll onEventsGap sends (the first view request asking digest=1 from here) is answered 429
  let digestPolls = 0; const f0 = globalThis.fetch;
  globalThis.fetch = async (url, opts) => { const u = new URL(url, 'http://localhost'); if (u.pathname === '/api/view' && u.searchParams.get('digest') === '1' && ++digestPolls === 1) srv.view429 = '1'; return f0(url, opts); };
  try {
    await lw.poll(true);
    assert.ok(await until(() => digestPolls >= 1), 'the digest poll went up');
    await wait(60); await until(() => !ui.cache.busy);
    assert.equal(digestPolls, 1, 'one digest poll, answered 429');
    assert.equal(srv.views.slice(v0).filter((q) => q.digest === '1').length, 1, `the view requests since the gap (${J(srv.views.slice(v0))})`);
    assert.ok(ui.cache.tick >= Math.max(...curIds), `the eventsGap answer moved the cursor past every Curtain (${ui.cache.tick}; ${J(curIds)})`);
    // she closes whatever the page printed from the digest she has (a sheet, a strip, or nothing): its markSeen goes up
    if (ui.modal) lw.closeModal();
    assert.ok(await until(() => seenOf(tl).length > m0 && !ui.cache.busy), 'the digest\'s markSeen went up');
    const acks = seenOf(tl).slice(m0).map((a) => a.args[2]);
    assert.ok(acks.every((u) => Number.isSafeInteger(u) && u <= builtAt), `the digest acknowledges no further than the tick it was built at (${J(acks)}; built at ${builtAt}, cursor ${ui.cache.tick}, Curtains ${J(curIds)})`);
    const seen = srv.state.accounts[ACC].seen[tl];
    assert.ok(curIds.every((id) => seen < id), `the seen cursor (${seen}) is short of every Curtain in the gap (${J(curIds)})`);
    // she taps Leave: its markSeen holds below the gap (no digest has covered it), the seen cursor stays short of every
    // Curtain in it, the next return digest lists them, and the page prints it
    await lw.ACTS.leave();
    const acks2 = seenOf(tl).slice(m0).map((a) => a.args[2]);
    assert.ok(acks2.every((u) => Number.isSafeInteger(u) && u <= cursor0), `the leave acknowledges no further than the cursor before the gap (${J(acks2)}; cursor before the gap ${cursor0}, Curtains ${J(curIds)})`);
    const seen2 = srv.state.accounts[ACC].seen[tl];
    assert.ok(curIds.every((id) => seen2 < id), `after the leave the seen cursor (${seen2}) is still short of every Curtain in the gap (${J(curIds)})`);
    const p2 = payload({ all: 1, digest: 1, boards: 1 });
    assert.ok(p2.digest[tl].headlines.some(fellH), `the next return digest lists them (${J(p2.digest[tl].headlines.map((h) => h.type))})`);
    lw.enterArena(p2, 'resume'); await wait(30);
    const shown = ui.modal && ui.modal.type === 'digest' ? ui.modal.data.headlines : ui.strip ? ui.strip.headlines : [];
    assert.ok(shown.some(fellH), `and the page prints it (${J(shown.map((h) => h.type))})`);
    assert.equal(wid, ui.active);
  } finally {
    globalThis.fetch = f0; srv.view429 = null;
    if (ui.modal) lw.closeModal();
    await until(() => !ui.cache.busy);
  }
});

test('Z15: after the Z13 gap (an answer flagged eventsGap moves the cursor past Curtains she never saw, and the digest poll that follows is answered 429), a new Curtain brought by an ordinary poll is shown and closed: its edition\'s markSeen holds at the cursor before the gap, the seen cursor stays short of every Curtain in the gap, and the covering digest that lands later lists them', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const tl = herTl(); const wid = ui.active;
  // the digest she holds was built at the tick of the payload that carried it (enter's), and she has read everything so far
  const builtAt = srv.state.tick;
  srv.state = L.markSeen(srv.state, ACC, tl); srv.rev++;
  await lw.poll(true); await wait(10);
  const cursor0 = ui.cache.tick;
  assert.ok(cursor0 >= builtAt, `the poll cursor (${cursor0}) is at or past the digest's tick (${builtAt})`);
  const m0 = seenOf(tl).length; const v0 = srv.views.length;
  // Curtains fall on the server with no poll, until more events wait than one answer carries (200): the next poll's
  // answer is flagged eventsGap and moves the cursor to the server's tick, past all of them
  const curIds = [];
  for (let i = 0; i < 12 && L.eventsFor(srv.state, ACC, cursor0).length <= 200; i++) curIds.push(...curtainOnClock(tl));
  const gapN = L.eventsFor(srv.state, ACC, cursor0).length;
  assert.ok(gapN > 200, `more events wait than one answer carries (${gapN})`);
  assert.ok(curIds.length > 0 && curIds.every((id) => id > cursor0 && id > builtAt), `Curtains fell past the cursor and the digest's tick (${J(curIds)}; cursor ${cursor0}, digest ${builtAt})`);
  // the digest poll onEventsGap sends (the first view request asking digest=1 from here) is answered 429
  let digestPolls = 0; const f0 = globalThis.fetch;
  globalThis.fetch = async (url, opts) => { const u = new URL(url, 'http://localhost'); if (u.pathname === '/api/view' && u.searchParams.get('digest') === '1' && ++digestPolls === 1) srv.view429 = '1'; return f0(url, opts); };
  try {
    await lw.poll(true);
    assert.ok(await until(() => digestPolls >= 1), 'the digest poll went up');
    await wait(60); await until(() => !ui.cache.busy);
    assert.equal(digestPolls, 1, 'one digest poll, answered 429');
    assert.equal(srv.views.slice(v0).filter((q) => q.digest === '1').length, 1, `the view requests since the gap (${J(srv.views.slice(v0))})`);
    const gapTick = ui.cache.tick;
    assert.ok(gapTick >= Math.max(...curIds), `the eventsGap answer moved the cursor past every Curtain (${gapTick}; ${J(curIds)})`);
    assert.ok(ui.cache.gapFloor[tl] && ui.cache.gapFloor[tl].floor === cursor0, `the gap floor holds at the cursor before the gap (${J(ui.cache.gapFloor[tl])}; ${cursor0})`);
    // she closes whatever the page printed from the digest she has (a sheet, a strip, or nothing)
    if (ui.modal) lw.closeModal();
    await until(() => !ui.cache.busy);
    // a new Curtain falls on her girl and an ordinary poll (no digest asked) brings it: nothing is mid-action, so it comes
    // down at once and its edition is shown
    const cur = curtainFalls(); const id = cur.curtainIds[0];
    assert.ok(id > gapTick, `the new Curtain (${id}) lies past the gap answer's tick (${gapTick})`);
    assert.ok(!dropping() && ui.screen !== 'results' && !acting() && !ui.cache.busy && !ui.cache.unsettled,
      `nothing is mid-action before the poll (overlays ${ui.overlays}, screen ${ui.screen}, busy ${ui.cache.busy}, unsettled ${J(ui.cache.unsettled)})`);
    const v1 = srv.views.length;
    await lw.poll(true);
    assert.ok(srv.views.slice(v1).every((q) => q.digest !== '1'), `the poll that brought it asked for no digest (${J(srv.views.slice(v1))})`);
    assert.ok(ui.cache.tick >= id, 'the poll brought the Curtain');
    assert.ok(ui.cache.gapFloor[tl], 'no digest has covered the gap yet');
    assert.ok(await until(() => ui.result && ui.result.curtain.id === id, 6000), 'its edition is shown');
    await wait(300); await until(() => !ui.cache.busy);
    lw.ACTS['after-results'](); await wait(10);
    await until(() => !ui.cache.busy);
    // every markSeen sent since the gap (the digest's, the edition's) holds at or below the cursor before the gap
    const acks = seenOf(tl).slice(m0).map((a) => a.args[2]);
    assert.ok(acks.length > 0, 'a markSeen went up');
    assert.ok(acks.every((u) => Number.isSafeInteger(u) && u <= cursor0), `every markSeen holds at or below the cursor before the gap (${J(acks)}; cursor before the gap ${cursor0}, gap Curtains ${J(curIds)}, the edition's Curtain ${id})`);
    const seen = srv.state.accounts[ACC].seen[tl];
    assert.ok(curIds.every((g) => seen < g), `the seen cursor (${seen}) is short of every Curtain in the gap (${J(curIds)})`);
    // the covering digest lands (a poll asking digest=1, answered this time): it lists the Curtains in the gap, and the floor goes
    await lw.poll(true, { digest: 1, all: 1 }); await until(() => !ui.cache.busy);
    assert.equal(ui.cache.gapFloor[tl], undefined, 'a digest built past the gap clears its floor');
    const hs = (ui.cache.digest[tl] || { headlines: [] }).headlines;
    assert.ok(hs.some(fellH), `the covering digest the page holds lists them (${J(hs.map((h) => h.type))})`);
    assert.ok(L.awayDigest(srv.state, wid, srv.state.accounts[ACC].seen[tl], { tonight: true }).headlines.some(fellH), 'and the server\'s digest from her seen cursor lists them');
    assert.equal(wid, ui.active);
  } finally {
    globalThis.fetch = f0; srv.view429 = null;
    await until(() => !dropping(), 6000);
    if (ui.screen === 'results') { lw.ACTS['after-results'](); await wait(10); }
    if (ui.modal) lw.closeModal();
    await until(() => !ui.cache.busy);
  }
});

test('Z14: a confirmation that asks nothing (auto) closes by itself after HL.autoMs; a tap on it means she is reading it and it stays; it never closes while a result holds the strip; a warning without auto stays', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const BACK = 'The wire is back.'; const DOWN = 'Can\'t reach the District';
  const shows = (s) => textOf(printed()).includes(s);
  const tap = (target) => { for (const f of docOn.click || []) f({ target, preventDefault() {}, stopPropagation() {} }); };
  // the wire comes back after more than 30 seconds down: the page prints WIRE_BACK, an auto headline
  const wireBack = async () => { ui.cache.wire = 'down'; ui.cache.downSince = Date.now() - 31000; await lw.poll(true); assert.ok(await until(() => shows(BACK), 3000), `the wire-back line prints (${textOf(printed())})`); };
  // the strip is cleared first: a tip printed on entering (a teaching headline never makes way) would hold the queue
  const clearStrip = async () => { for (let i = 0; i < 20 && textOf(printed()); i++) { lw.ACTS['hl-close'](); await wait(350); } assert.equal(textOf(printed()), '', 'the strip is clear'); };
  const ms0 = lw.HL.autoMs; lw.HL.autoMs = 150;
  try {
    assert.ok(docOn.click && docOn.click.length, 'the page listens for taps');
    await clearStrip();
    // (1) on its own it closes after HL.autoMs
    await wireBack();
    assert.ok(await until(() => !shows(BACK), 2000), 'the wire-back line closes by itself');
    // (2) a tap on its body (not a button) holds it: past several autoMs it is still printed, and its X closes it
    await wireBack();
    tap({ closest: (q) => (q === '.hl' ? {} : null) });
    await wait(600);
    assert.ok(shows(BACK), 'a headline she tapped to read stays');
    lw.ACTS['hl-close']();
    assert.ok(await until(() => !shows(BACK), 2000), 'its X closes it');
    // (3) a result opens over it: it goes back in the queue and its clock stops; it prints again when the result closes,
    // then closes by itself
    await wireBack();
    lw.openModal('result', { html: '<p>Result</p>' });
    assert.ok(!shows(BACK), 'nothing prints over a result');
    await wait(600);
    lw.closeModal();
    assert.ok(await until(() => shows(BACK), 2000), 'the line prints again once the result has closed (its clock never ran out behind it)');
    assert.ok(await until(() => !shows(BACK), 2000), 'and then closes by itself');
    // (4) a warning (the wire is down: DOWN_LINE, no auto) keeps today's behaviour: it stays until her tap or its X
    srv.down = true; ui.cache.wire = 'ok';
    await lw.poll(true);
    assert.ok(await until(() => shows(DOWN), 3000), `the wire-down line prints (${textOf(printed())})`);
    await wait(600);
    assert.ok(shows(DOWN), 'a warning does not close by itself');
    lw.ACTS['hl-close']();
    assert.ok(await until(() => !shows(DOWN), 2000), 'its X closes it');
  } finally {
    lw.HL.autoMs = ms0; srv.down = false;
    if (ui.modal) lw.closeModal();
    await lw.poll(true); await until(() => !ui.cache.busy);
  }
});

test('Z16: a confirmation that closes by itself (auto) advances the queue once: its clock runs out and starts the exit, she taps its X while it fades, and a second headline queued meanwhile shows and stays', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const BACK = 'The wire is back.'; const DOWN = 'Can\'t reach the District';
  const shows = (s) => textOf(printed()).includes(s);
  const clearStrip = async () => { for (let i = 0; i < 20 && textOf(printed()); i++) { lw.ACTS['hl-close'](); await wait(350); } assert.equal(textOf(printed()), '', 'the strip is clear'); };
  // the strip is cleared first (with the stub DOM's instant close), then the exit is modelled: the stub DOM holds no
  // elements, so closeHl would skip the fade; inside this test '.hl' answers with one element while a headline is printed,
  // so a close runs the exit (HL.outMs) as on a phone, and the X is still there to tap while it fades
  await clearStrip();
  const hlEl = el(); const qsa0 = document.querySelectorAll;
  document.querySelectorAll = (q) => (q === '.hl' ? (printed().includes('class="hl"') ? [hlEl] : []) : qsa0.call(document, q));
  const ms0 = lw.HL.autoMs; const out0 = lw.HL.outMs; lw.HL.autoMs = 150; lw.HL.outMs = 600;
  try {
    ui.cache.wire = 'down'; ui.cache.downSince = Date.now() - 31000; await lw.poll(true);
    assert.ok(await until(() => shows(BACK), 3000), `the wire-back line prints (${textOf(printed())})`);
    // its clock runs out: the exit begins
    assert.ok(await until(() => hlEl.classList.contains('out'), 2000), 'its clock ran out and the exit began');
    assert.ok(shows(BACK), 'still on screen while it fades');
    // she taps its X during the exit, and the wire goes down meanwhile: a warning (no auto) joins the queue
    lw.ACTS['hl-close']();
    srv.down = true; ui.cache.wire = 'ok';
    await lw.poll(true);
    // the test only means something if the warning was queued while the first exit was still running
    assert.ok(hlEl.classList.contains('out') && shows(BACK), 'the second headline was queued while the exit was still running');
    assert.ok(await until(() => shows(DOWN), 3000), `the second headline prints once the exit ends (${textOf(printed())})`);
    // past the end of a second exit (the X's): the queue moved on once, so the warning is still printed
    await wait(1500);
    assert.ok(shows(DOWN), `the second headline was not lost (${textOf(printed())})`);
  } finally {
    document.querySelectorAll = qsa0; lw.HL.autoMs = ms0; lw.HL.outMs = out0; srv.down = false;
    await lw.poll(true); await until(() => !ui.cache.busy);
    for (let i = 0; i < 20 && textOf(printed()); i++) { lw.ACTS['hl-close'](); await wait(50); }
  }
});

test('Z17: inside a pop-up, taps on the text of a confirmation she is reading (auto) are never the scrim\'s close-modal: the first holds it, the second leaves it and the pop-up open, and its X closes it', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const BACK = 'The wire is back.';
  const shows = (s) => textOf(printed()).includes(s);
  const tap = (target) => { for (const f of docOn.click || []) f({ target, preventDefault() {}, stopPropagation() {} }); };
  const clearStrip = async () => { for (let i = 0; i < 20 && textOf(printed()); i++) { lw.ACTS['hl-close'](); await wait(350); } assert.equal(textOf(printed()), '', 'the strip is clear'); };
  // a tap on the headline's text inside a pop-up: the nearest [data-act] above it is the scrim (close-modal), as in
  // modalShell, where the headline prints in the scrim's .mslot or the card's .cslot
  const scrim = { dataset: { act: 'close-modal' }, classList: { contains: (c) => c === 'scrim' } };
  const hl = { contains: () => false };
  const textTap = () => tap({ closest: (q) => (q === '.hl' ? hl : q.includes('[data-act]') ? scrim : null) });
  const ms0 = lw.HL.autoMs; lw.HL.autoMs = 150;
  try {
    await clearStrip();
    lw.openModal('profile', lw.V().timeline.rivals[0].id);
    assert.equal(ui.modal && ui.modal.type, 'profile', 'a pop-up is open');
    ui.cache.wire = 'down'; ui.cache.downSince = Date.now() - 31000; await lw.poll(true);
    assert.ok(await until(() => shows(BACK), 3000), `the wire-back line prints in the pop-up (${textOf(printed())})`);
    textTap(); await wait(450);
    assert.ok(shows(BACK), 'the first tap on its text holds it past HL.autoMs');
    textTap(); await wait(450);
    assert.ok(shows(BACK), 'a second tap on its text leaves it printed');
    assert.equal(ui.modal && ui.modal.type, 'profile', 'and the pop-up open');
    lw.ACTS['hl-close']();
    assert.ok(await until(() => !shows(BACK), 2000), 'its X closes it');
    assert.equal(ui.modal && ui.modal.type, 'profile', 'the pop-up stays open after the X');
  } finally {
    lw.HL.autoMs = ms0;
    if (ui.modal) lw.closeModal();
    await lw.poll(true); await until(() => !ui.cache.busy);
  }
});

test('B1a: the back doors header reads "{f} fresh, {n} picked-over tries left" from the view, and once both are 0 "Picked clean until {dawn time}" in the arena; the view serves staleRummagesLeft', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  ui.unfold.add('doors'); // the section is on the page whatever her rung (the peek opens it)
  const header = () => { const m = app.innerHTML.match(/id="doors">[\s\S]*?data-x="rummage">([^<]*)<\/button>/); return m ? textOf(m[1]) : null; };
  // one canned view with the counts set, served to the next poll at a new rev, nothing else changed (no events past the cursor)
  const show = async (fresh, stale) => {
    srv.rev++;
    const p = payload({ focus: ui.active, tick: ui.cache.tick });
    p.views[ui.active].whore.daily.freshRummagesLeft = fresh; p.views[ui.active].whore.daily.staleRummagesLeft = stale;
    srv.staleView = p;
    await lw.poll(true); await wait(10);
    assert.equal(ui.cache.rev, srv.rev, 'the canned view was adopted');
    assert.equal(ui.screen, 'front', 'still on the front page');
  };
  await show(3, 3);
  assert.ok(header() !== null, `the doors header is on the front page (curtains ${lw.V().whore.curtains}, peek ${ui.unfold.has('doors')})`);
  assert.equal(header(), '3 fresh, 3 picked-over tries left');
  await show(0, 3);
  assert.equal(header(), '0 fresh, 3 picked-over tries left');
  // both spent: the next day turn on the District clock as a real time of day (realTimeOf), read before and after the render
  const dawn = () => textOf(new Date(Date.now() + ((Math.floor(ui.cache.clock / 1440) + 1) * 1440 - ui.cache.clock) / ui.cache.minPerSec * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
  const before = dawn();
  await show(0, 0);
  const got = header(); const after = dawn();
  assert.match(got, /^Picked clean until \d{1,2}:\d{2}/, got);
  assert.doesNotMatch(got, /until dawn/, 'the arena names the hour, never "dawn"');
  assert.ok([before, after].includes(got.replace(/^Picked clean until /, '')), `${got} names the next day turn (${before} or ${after})`);
  // the counts come from the view: the engine serves staleRummagesLeft beside freshRummagesLeft (not a ?? fallback)
  assert.equal(typeof L.getView(srv.state, ui.active).whore.daily.staleRummagesLeft, 'number', 'the view serves staleRummagesLeft');
});

test('B1a: a back door tapped a seventh time in one District day (past the fresh and the picked-over tries) prints "Picked clean until {dawn time}" in the arena and "Picked clean until dawn" in solo, never the Gossip line', async () => {
  const clearStrip = async () => { for (let i = 0; i < 20 && textOf(printed()); i++) { lw.ACTS['hl-close'](); await wait(350); } assert.equal(textOf(printed()), '', 'the strip is clear'); };
  // every gentleman of her Timeline has his first two facts known, so no capped tap can overhear a Tell (exploreM's
  // learned path): the seventh tap's line is the cap's own
  const noTells = (w) => { for (const g of C.TIMELINES[w.timeline].gents) Object.assign((w.known.gents[g] ||= {}), { secret: true, kink: true }); };
  // seven taps on one back door: an offer (a pop-up) is passed and a postcard (a result) closed, so each tap ends on the
  // page; the strip is cleared before the seventh, so what prints then is that tap's own headline
  const sevenTaps = async (place, day) => {
    const day0 = day();
    for (let i = 1; i <= 6; i++) {
      await lw.ACTS.rummage({ id: place });
      if (ui.modal && ui.modal.type === 'offer') await lw.ACTS.pass();
      else if (ui.modal) lw.closeModal();
    }
    const d = lw.V().whore.daily;
    assert.deepEqual([d.freshRummagesLeft, d.staleRummagesLeft], [0, 0], 'six taps spent the fresh and the picked-over tries');
    await clearStrip();
    await lw.ACTS.rummage({ id: place });
    assert.equal(day(), day0, 'all seven taps fell in one District day');
    assert.ok(!ui.modal, 'the seventh tap opens nothing: its line prints on the page');
    return textOf(printed());
  };
  // the arena: her girl in the District, the line names the next day turn as a real time of day (realTimeOf of
  // clockNow), read before and after the tap
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  noTells(srv.state.whores[ui.active]); srv.rev++;
  const place = C.TIMELINES[lw.V().whore.timeline].places[0]; const short = C.PLACES[place].short;
  const dawn = () => { const now = ui.cache.clock + Math.floor((Date.now() - ui.cache.at) * ui.cache.minPerSec / 1000); return textOf(new Date(Date.now() + ((Math.floor(now / 1440) + 1) * 1440 - now) / ui.cache.minPerSec * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })); };
  const before = dawn();
  const got = await sevenTaps(place, () => Math.floor(srv.state.clock / 1440));
  const after = dawn();
  assert.doesNotMatch(got, /gossip/i, `the seventh tap claims no Gossip (${got})`);
  assert.ok(got.startsWith(`Behind ${short} Picked clean until `), `the seventh tap says the door is picked clean (${got})`);
  assert.ok([before, after].includes(got.replace(`Behind ${short} Picked clean until `, '')), `${got} names the next day turn (${before} or ${after})`);
  // solo: a local game on the page's own set-up (hire()), the same seven taps; the line says "dawn", never an hour
  lw.leaveArena();
  try {
    ui.S = L.newGame(SEEDS.dolly, gameOpts('dolly', 'Anonymous', 'x')); ui.active = 'dolly';
    noTells(ui.S.whores.dolly);
    lw.go('front'); await wait(10);
    const soloPlace = C.TIMELINES[ui.S.whores.dolly.timeline].places[0];
    const solo = await sevenTaps(soloPlace, () => Math.floor(ui.S.clock / 1440));
    assert.doesNotMatch(solo, /gossip/i, `the seventh tap claims no Gossip in solo (${solo})`);
    assert.equal(solo, `Behind ${C.PLACES[soloPlace].short} Picked clean until dawn`, 'the solo line says dawn');
  } finally {
    if (ui.modal) lw.closeModal();
    ui.S = null; ui.active = null;
  }
});

// the designer's question 3 answer (2026-10-18): past the cap she hears nothing, and the page says only that
test('B1b: a tap past the day\'s cap prints "Picked clean until {dawn time}" as its one headline, with no Gossip or Coin line and no reveal, and the doors header says the same', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  ui.unfold.add('doors');
  const place = lw.V().timeline.places[0].id;
  const header = () => { const m = app.innerHTML.match(/id="doors">[\s\S]*?data-x="rummage">([^<]*)<\/button>/); return m ? textOf(m[1]) : null; };
  const clearLines = () => { for (let i = 0; i < 8 && printed(); i++) lw.ACTS['hl-close'](); };
  // an offer left over from an earlier tap is put away first, so the only pop-up a tap can open is its own
  if (lw.V().whore.offer) { lw.openModal('offer'); await lw.ACTS.pass(); }
  // her taps through the page until one comes back capped (3 fresh and 3 picked-over at most, so the eighth at the latest),
  // each offer passed and each postcard put away
  let ex = null; let taps = 0;
  for (let i = 0; i < 8 && !(ex && ex.data.capped); i++) {
    clearLines();
    const t0 = srv.state.tick;
    await lw.ACTS.rummage({ id: place }); taps++;
    ex = L.eventsFor(srv.state, ACC, t0).find((e) => e.type === 'explore');
    assert.ok(ex, `tap ${taps} landed`);
    if (ex.data.capped) break;
    if (ui.modal && ui.modal.type === 'offer') await lw.ACTS.pass(); else if (ui.modal) lw.closeModal();
  }
  assert.ok(ex && ex.data.capped && ex.data.coin === 0 && ex.data.gossip === 0 && ex.data.learned === null, `the engine says the tap is past the cap and gave nothing (${J(ex && ex.data)})`);
  assert.ok(!ui.modal, `no pop-up on a capped tap (${ui.modal && ui.modal.type})`);
  // the one headline: the doors header's own line, with the dawn hour (read a minute either side of the render, since the
  // real clock moves), and nothing else printed or queued behind it
  const dawnAt = (ms) => textOf(new Date(ms + ((Math.floor(ui.cache.clock / 1440) + 1) * 1440 - ui.cache.clock) / ui.cache.minPerSec * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
  const got = textOf(printed()); const now = Date.now();
  assert.match(got, /Picked clean until \d{1,2}:\d{2}/, `the picked-clean line (${got})`);
  assert.ok([dawnAt(now), dawnAt(now - 60000), dawnAt(now + 60000)].some((t) => got.includes(t)), `${got} names the next day turn (${dawnAt(now)})`);
  assert.doesNotMatch(got, /gossip|juicy|Trade it|Coin|Decoded|Noted|until dawn/i, `nothing but the picked-clean line (${got})`);
  assert.match(header(), /^Picked clean until \d{1,2}:\d{2}/, `the doors header agrees (${header()})`);
  lw.ACTS['hl-close'](); await wait(400); // its exit moves the queue on: nothing follows it
  assert.equal(textOf(printed()), '', `nothing queued behind it (${textOf(printed())})`);
});

test('B1b: the front page Curtain line reads "Full pay: {n} of {max} left until {dawn time}. Next Curtain {time}." from the view in the arena, at 0 "After Hours: Coin only until about {dawn time}. Next Curtain {time}.", and the Place cards carry the same string', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const line = () => { const m = app.innerHTML.match(/<p class="small fullpay">([^<]*)<\/p>/); return m ? textOf(m[1]) : null; };
  // the first open Place card's pay tag ("paytag " with full pay left, "paytag ah" at 0; a shut one wears "paytag back")
  const paytag = () => { const m = app.innerHTML.match(/<span class="paytag (?:ah)?">([^<]*)<\/span>/); return m ? textOf(m[1]) : null; };
  // one canned view with the count set, served to the next poll at a new rev, nothing else changed (no events past the cursor)
  const show = async (left) => {
    srv.rev++;
    const p = payload({ focus: ui.active, tick: ui.cache.tick });
    p.views[ui.active].whore.daily.fullPayLeft = left;
    srv.staleView = p;
    await lw.poll(true); await wait(10);
    assert.equal(ui.cache.rev, srv.rev, 'the canned view was adopted');
    assert.equal(ui.screen, 'front', 'still on the front page');
  };
  // a District minute as a real time of day, the way realTimeOf reads it; taken before and after each render, since the
  // real clock moves between them
  const at = (m) => textOf(new Date(Date.now() + (m - ui.cache.clock) / ui.cache.minPerSec * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
  const tl = herTl();
  const dawnM = () => (Math.floor(ui.cache.clock / 1440) + 1) * 1440; const nextM = () => ui.cache.curtains[tl].nextCurtainAt;
  assert.ok(nextM() > ui.cache.clock, 'her next Curtain is ahead');
  const max = R.curtain.fullPayPerDay;
  let before = [at(dawnM()), at(nextM())];
  await show(2);
  let got = line(); let after = [at(dawnM()), at(nextM())];
  assert.ok(got !== null, 'the Curtain line is on the front page');
  let m = got.match(/^Full pay: 2 of (\d+) left until (.+)\. Next Curtain (.+)\.$/);
  assert.ok(m, got);
  assert.equal(Number(m[1]), max, `${got} counts out of ${max}`);
  assert.match(m[2], /^\d{1,2}:\d{2}/, `${m[2]} is a clock time`);
  assert.ok([before[0], after[0]].includes(m[2]), `${got} names the next day turn (${before[0]} or ${after[0]})`);
  assert.ok([before[1], after[1]].includes(m[3]), `${got} names her next Curtain (${before[1]} or ${after[1]})`);
  assert.doesNotMatch(got, /dawn|today|tonight|paid/i, `the arena names the hour, never dawn, today, tonight or paid (${got})`);
  // the Place cards print the same string (one string for the count)
  assert.equal(paytag(), `Full pay: 2 of ${max} left until ${m[2]}`, `the Place card's pay tag is the same string (${paytag()})`);
  // at 0 the After Hours line as before, still with her next Curtain
  before = [at(dawnM()), at(nextM())];
  await show(0);
  got = line(); after = [at(dawnM()), at(nextM())];
  m = got && got.match(/^After Hours: Coin only until about (.+)\. Next Curtain (.+)\.$/);
  assert.ok(m, String(got));
  assert.ok([before[0], after[0]].includes(m[1]), `${got} names the next day turn (${before[0]} or ${after[0]})`);
  assert.ok([before[1], after[1]].includes(m[2]), `${got} names her next Curtain (${before[1]} or ${after[1]})`);
  assert.equal(paytag(), `After Hours: Coin only until about ${m[1]}`, `the Place card's pay tag is the same string (${paytag()})`);
});

// ---- B2 (spec-B2, client rows): each test stands alone on enter() and canned views, in the file's order of rows ----
test('B2-rungs: after one Curtain the front page has the market; at 10 Renown with one Curtain, the competition', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  for (const k of ['market', 'rivals', 'hand']) ui.unfold.delete(k); // nothing peeked open from an earlier test
  // one canned view with her Curtains and Renown set, served to the next poll at a new rev, nothing else changed
  const show = async (curtains, renown) => {
    srv.rev++;
    const p = payload({ focus: ui.active, tick: ui.cache.tick });
    p.views[ui.active].whore.curtains = curtains; p.views[ui.active].whore.renown = renown;
    srv.staleView = p;
    await lw.poll(true); await wait(10);
    assert.equal(ui.cache.rev, srv.rev, 'the canned view was adopted');
    assert.equal(ui.screen, 'front', 'still on the front page');
  };
  // the market section (its id) and the competition (its fold header or its open rivals row); a peek button or the rung
  // teaser naming a section does not count
  const market = () => app.innerHTML.includes('<section class="sheet" id="market">');
  const rivals = () => app.innerHTML.includes('data-act="fold" data-id="rivals"') || app.innerHTML.includes('<div class="rivals">');
  const hand = () => app.innerHTML.includes('data-sec="hand"');
  await show(1, 0);
  assert.ok(market(), 'after one Curtain the market is in the paper');
  assert.ok(!rivals(), 'the competition waits for the 2nd Curtain or 10 Renown');
  assert.ok(!hand(), 'her hand waits for the 3rd Curtain');
  await show(1, 10);
  assert.ok(rivals(), 'at 10 Renown with one Curtain the competition is in the paper');
  assert.ok(market(), 'and the market stays');
  // a Timeline's first evening shows only the Curtain and the gentlemen, whatever her Renown
  await show(0, 10);
  assert.ok(!market() && !rivals() && !hand(), 'nothing opens before her own first Curtain there');
});

test('B2-likedby: a market card\'s back says who likes it', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const v = lw.V();
  const idx = v.timeline.market.findIndex((c) => Array.isArray(c.arts) && c.arts.length);
  assert.ok(idx >= 0, 'a market card with an Art');
  if (ui.modal) lw.closeModal();
  lw.openModal('card', ['market', idx]);
  assert.ok(ui.modal && ui.modal.type === 'card', 'the card is open');
  const back = textOf(sheet());
  assert.match(back, /Liked by |likes? it secretly|can't abide it|No gentleman in /, `the market card's back says who likes it (${back.slice(0, 200)})`);
  lw.closeModal();
});

test('B2-stall-why: a greyed-out Buy prints its reason in both novelty pop-ups (a full reticule, a short purse), and a Buy she can afford prints none', async () => {
  // a fresh first evening of her own, so the Kink offer (stallitem) is on the plan screen whatever the earlier tests did to the shared world
  const keep = srv.state;
  srv.state = L.chooseStarter(L.joinWorld(L.newGame('harness-seed-0001', { arena: true, humans: [], startClock: 30, seasonDays: R.seasonDays, logLimit: 8000, minGapMin: R.curtain.minGapMin, maxGapMin: R.curtain.maxGapMin, scriptRival: false, scriptItch: true, curtainGrid: true }), { id: ACC, name: 'Ruby_Buckshot', pastWhorescore: 0 }), ACC, 'dolly');
  srv.rev++;
  try {
    await enter(); lw.go('front');
    await lw.poll(true); await wait(10);
    const wid = ui.active; const w = srv.state.whores[wid];
    const filler = () => ({ id: 'lambskin', uses: C.ITEMS.lambskin.uses, readyAt: 0 });
    // put her purse and reticule where the case needs them, and serve the view
    const set = async ({ coin, items, offer = null }) => {
      w.coin = coin; w.items = Array.from({ length: items }, filler); w.offer = offer;
      srv.rev++; await lw.poll(true); await wait(10);
      assert.equal(ui.cache.rev, srv.rev, 'the view was adopted');
    };
    const open = (type, data) => { if (ui.modal) lw.closeModal(); lw.openModal(type, data); assert.ok(ui.modal && ui.modal.type === type, `${type} is open`); return sheet(); };
    const why = (html) => { const m = html.match(/<p class="small need modal-why" id="buy-why">([^<]*)<\/p>/); return m ? textOf(m[1]) : null; };
    const buy = (html, act) => html.match(new RegExp(`<button class="btn primary" data-act="${act}"([^>]*)>`));
    const FULL = 'Your reticule is full: leave a novelty on a bench first.';

    // (1) the plan screen's Kink offer, read first in a pop-up (MODALS.stallitem)
    await set({ coin: 99, items: 0 });
    const k = L.kinkOffer(lw.V(), { firstOnly: true });
    assert.ok(k, 'the first evening has a Kink novelty behind a back door');
    const cost = k.item.cost; const act = 'plan-buy';
    let html = open('stallitem', k.item.id);
    assert.equal(why(html), null, 'a Buy she can afford prints no reason');
    assert.ok(buy(html, act) && !/disabled/.test(buy(html, act)[1]), 'and the button is live');
    await set({ coin: 99, items: R.reticule });
    html = open('stallitem', k.item.id);
    assert.equal(why(html), FULL, `a full reticule says so (${why(html)})`);
    assert.ok(/disabled/.test(buy(html, act)[1]) && /aria-describedby="buy-why"/.test(buy(html, act)[1]), 'the greyed-out button points at its reason');
    await set({ coin: 0, items: 0 });
    html = open('stallitem', k.item.id);
    assert.equal(why(html), `Need ${cost} Coin, you have 0.`, `a short purse says what is missing (${why(html)})`);
    assert.ok(/disabled/.test(buy(html, act)[1]));
    lw.closeModal();

    // (2) a back-door offer on the counter (MODALS.offer); a Kink offer is not shown while one is held, so the offer is nothing special
    const offer = { item: 'wand', price: C.ITEMS.wand.cost, place: k.stall.id };
    await set({ coin: 99, items: 0, offer });
    html = open('offer');
    assert.equal(why(html), null, 'an offer she can afford prints no reason');
    assert.ok(buy(html, 'buy') && !/disabled/.test(buy(html, 'buy')[1]), 'and the button is live');
    await set({ coin: 99, items: R.reticule, offer });
    html = open('offer');
    assert.equal(why(html), FULL, `a full reticule says so (${why(html)})`);
    assert.ok(/disabled/.test(buy(html, 'buy')[1]), 'the Buy is greyed out');
    await set({ coin: 0, items: 0, offer });
    html = open('offer');
    assert.equal(why(html), `Need ${offer.price} Coin, you have 0.`, `a short purse says what is missing (${why(html)})`);
    // both short: the reticule is named first, as the plan screen's line does
    await set({ coin: 0, items: R.reticule, offer });
    assert.equal(why(open('offer')), FULL, 'a full reticule outranks a short purse');
    lw.closeModal();
  } finally {
    if (ui.modal) lw.closeModal();
    srv.state = keep; srv.rev++;
  }
});

test('B2-learn: after a buy the market button says Learn another with the copy count, and a card she has none of still says Learn', async () => {
  const keep = structuredClone(srv.state);
  try {
    await enter(); lw.go('front');
    const wid = ui.active; const w = srv.state.whores[wid];
    w.curtains = Math.max(4, w.curtains); w.coin = 99; // past every rung, so the market is on the page whichever rung it sits at (B2-rungs pins that); Coin for three Learns
    srv.rev++;
    await lw.poll(true); await wait(10);
    ui.secOpen.add('market'); lw.render({ keepScroll: true }); // open, not a one-line fold
    const copies = (id) => lw.V().whore.deck.filter((x) => x === id).length;
    const mk = lw.V().timeline.market;
    const c = mk.find((x) => copies(x.id) === 0); const other = mk.find((x) => x.id !== (c && c.id) && copies(x.id) === 0);
    assert.ok(c && other, 'two market cards she has none of');
    // the market column of one card: its button (label, disabled) and its copies line
    const col = (id) => {
      const html = app.innerHTML; const i = html.indexOf(`data-act="buy-card" data-id="${id}"`);
      assert.ok(i >= 0, `the market sells ${id} on the front page`);
      const seg = html.slice(html.lastIndexOf('<div class="mcol">', i), html.indexOf('<div class="mcol">', i) < 0 ? undefined : html.indexOf('<div class="mcol">', i));
      const b = seg.match(/<button class="btn small" data-act="buy-card" data-id="[^"]*"([^>]*)>([^<]*)<\/button>/);
      const n = seg.match(/<span class="small copies">([^<]*)<\/span>/);
      return { label: textOf(b[2]), disabled: /disabled/.test(b[1]), copies: n ? textOf(n[1]) : null };
    };
    const closeLines = () => { for (let i = 0; i < 8 && printed(); i++) lw.ACTS['hl-close'](); };
    let r = col(c.id);
    assert.equal(r.label, `Learn · ${c.cost} Coin`, `none in her deck: Learn (${r.label})`);
    assert.equal(r.copies, null, 'and no copies line');
    // one buy
    await lw.ACTS['buy-card']({ id: c.id }); closeLines();
    assert.equal(copies(c.id), 1, 'one copy joined her deck');
    r = col(c.id);
    assert.equal(r.label, `Learn another · ${c.cost} Coin`, `after a buy: Learn another (${r.label})`);
    assert.equal(r.copies, 'In your deck: 1 copy', `the count, singular (${r.copies})`);
    assert.equal(r.disabled, false, 'the copy stays for sale');
    // two
    await lw.ACTS['buy-card']({ id: c.id }); closeLines();
    r = col(c.id);
    assert.equal(copies(c.id), 2, 'a second copy joined her deck');
    assert.equal(r.label, `Learn another · ${c.cost} Coin`);
    assert.equal(r.copies, 'In your deck: 2 copies', `the count, plural (${r.copies})`);
    // another card is untouched
    r = col(other.id);
    assert.equal(r.label, `Learn · ${other.cost} Coin`, `a card she has none of still says Learn (${r.label})`);
    assert.equal(r.copies, null);
  } finally {
    if (printed()) for (let i = 0; i < 8 && printed(); i++) lw.ACTS['hl-close']();
    srv.state = keep; srv.rev++;
  }
});

test('B2-skip: Skip on the Morning Edition leaves Show me the ropes on', async () => {
  if (ui.mode === 'arena') lw.leaveArena();
  if (ui.modal) lw.closeModal();
  ui.ovReturn = null;
  ui.guided = true; localStorage.setItem('lw-scandal-guided', 'true');
  lw.ACTS['ov-done']({ id: 'skip' });
  assert.equal(ui.guided, true, 'Skip keeps the step-by-step on');
  assert.equal(localStorage.getItem('lw-scandal-guided'), 'true', 'and the device remembers it on');
  assert.equal(ui.screen, 'pick', 'Skip goes on to the pick page');
  // the two named buttons still decide it
  lw.ACTS['ov-done']({ id: 'own' });
  assert.equal(ui.guided, false, '"I\'ll find my own way" turns it off');
  lw.ACTS['ov-done']({ id: 'ropes' });
  assert.equal(ui.guided, true, '"Show me the ropes" turns it on');
  if (printed()) lw.ACTS['hl-close']();
});

test('B2-ov-once: a second begin after the overview was opened but never closed goes to the pick page; guest then sign-up on one device shows it once', async () => {
  if (ui.mode === 'arena') lw.leaveArena();
  if (ui.modal) lw.closeModal();
  const cold = () => { ui.met = false; for (const k of ['met', 'ovSeen', 'game']) localStorage.removeItem(`lw-scandal-${k}`); };
  const closeLines = () => { for (let i = 0; i < 8 && printed(); i++) lw.ACTS['hl-close'](); };
  // (1) the Morning Edition opened and never closed, then begin again: the pick page
  cold();
  lw.ACTS.begin();
  assert.equal(ui.screen, 'overview', 'a cold device opens the Morning Edition');
  lw.ACTS.begin();
  assert.equal(ui.screen, 'pick', 'a second begin with the Edition opened but never closed goes to the pick page');
  closeLines();
  // (2) a guest on a cold device, then a sign-up on the same device: the Edition shows once (a pin: met covers it)
  cold();
  await lw.net.signOut();
  assert.equal(lw.net.account().name, null, 'a guest');
  lw.ACTS.begin();
  assert.equal(ui.screen, 'overview', 'the guest reads the Edition');
  await lw.net.adopt({ name: 'Ruby_Buckshot', member: true });
  assert.equal(lw.net.account().name, 'Ruby_Buckshot', 'signed up on the same device');
  lw.ACTS.begin();
  assert.equal(ui.screen, 'pick', 'the Edition is not shown again');
  closeLines();
});

test('B2-rehearsal: the card says rehearsal on this device before it starts; the rehearsal\'s plan and results carry the Rehearsal kicker and the District\'s do not; Skip posts one join and no sealPlan; WELCOME_DONE never says practice or zero', async () => {
  if (ui.mode === 'arena') lw.leaveArena();
  if (ui.modal) lw.closeModal();
  await lw.net.adopt({ name: 'Ruby_Buckshot', member: true }); // signed up: hire() rehearses first
  const kicker = () => /<p class="kicker rehearse">Rehearsal<\/p>/.test(app.innerHTML);
  ui.pickId = 'dolly'; lw.ACTS.hire(); // the pick page's button (the old client has no __lw.hire, so the copy assertion below is reached there too)
  assert.ok(ui.welcome && ui.welcome.starter === 'dolly', 'a signed-up hire is the welcome evening');
  assert.ok(ui.modal && ui.modal.type === 'result', 'the arrival card');
  const card = textOf(sheet());
  assert.match(card, /First, a rehearsal night on this device: one gentleman, one Curtain\. Nothing from it carries over\. Then she starts for real in the District\./, card);
  assert.ok(sheet().includes('data-act="welcome-skip"') && /Skip to the District/.test(card), `a Skip to the District button (${card.slice(-160)})`);
  // (a) she plays it: the plan screen and the results sheet wear the Rehearsal kicker
  ui.modal.onClose = null; lw.closeModal(); // not the tourist Assignation: straight to her Curtain
  lw.go('front');
  assert.ok(await lw.act(L.advanceClock, 30), 'past the minimum gap, so the Curtain falls at her seal');
  const v0 = lw.V(); const place = v0.timeline.places.find((p) => p.open && p.kind !== 'gutter').id;
  await lw.ACTS.plan({ id: place });
  assert.equal(ui.screen, 'plan');
  assert.ok(kicker(), 'the rehearsal plan screen wears the Rehearsal kicker');
  ui.sel = L.bestGuess(lw.V(), place).cards;
  await lw.ACTS.seal();
  assert.ok(await until(() => ui.screen === 'results', 6000), `Curtain 0 falls at her seal and the edition shows (${ui.screen}, ${ui.modal && ui.modal.type})`);
  assert.ok(kicker(), 'the rehearsal results sheet wears the Rehearsal kicker');
  assert.ok(ui.welcome, 'still the rehearsal');
  // (b) Skip: one join, no seal, and the District's own plan screen and results carry no kicker
  const acts0 = srv.acts.length; const joins0 = srv.joins;
  srv.joinOk = true;
  assert.equal(typeof lw.hire, 'function', '__lw carries hire (debug)');
  lw.hire('dolly');
  assert.ok(ui.modal && ui.modal.type === 'result' && sheet().includes('data-act="welcome-skip"'), 'the card again');
  lw.ACTS['welcome-skip']();
  assert.ok(await until(() => ui.mode === 'arena' && !!ui.active, 4000), 'Skip joins the District');
  assert.equal(srv.joins - joins0, 1, 'one join');
  assert.ok(!srv.acts.slice(acts0).some((a) => a.action === 'sealPlan'), 'no sealPlan went up');
  assert.equal(ui.welcome, null, 'the rehearsal is over');
  assert.ok(ui.modal && ui.modal.type === 'arrive', `the arrival card in the District (${ui.modal && ui.modal.type})`);
  const arrive = textOf(sheet());
  assert.match(arrive, /Welcome to the District\. Her first Curtain here is at about \d{1,2}:\d{2}/, arrive);
  assert.doesNotMatch(arrive, /practice|zero/i, 'never practice or zero');
  assert.doesNotMatch(lw.S.WELCOME_DONE('9:00'), /practice|zero/i, 'WELCOME_DONE never says practice or zero');
  lw.closeModal();
  lw.go('front'); await lw.poll(true); await wait(10);
  await lw.ACTS.plan({ id: L.casualPlace(lw.V()) });
  assert.equal(ui.screen, 'plan');
  assert.ok(!kicker(), 'no kicker on the District plan screen');
  lw.go('front');
  const c0 = curtainFalls(); await lw.poll(true);
  assert.ok(await until(() => ui.screen === 'results' && ui.result && c0.curtainIds.includes(ui.result.curtain.id), 6000), 'the District edition');
  assert.ok(!kicker(), 'no kicker on the District results');
  lw.ACTS['after-results']();
});

test('B2-countdown: the front page Curtain line and chip show a duration, the seal line time and duration, a dueAt headline its duration; no later on, soon or any minute now; an arena due Curtain shows Last call with a duration; leftWords(25) is 25 sec solo, 25 min arena', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const DUR = '(\\d+h \\d+m|\\d+ min|\\d+ sec)'; const SHORT = '(\\d+h \\d+m|\\d+m|\\d+s)';
  const BAND = /later on|any minute now|\bsoon\b/;
  const tl = herTl();
  const cd = () => { const m = app.innerHTML.match(new RegExp(`data-cd="${tl}">([^<]*)<`)); return m ? textOf(m[1]) : null; };
  const chip = () => { const t = body.children.find((c) => c.className === 'chrome-top'); const m = t && t.innerHTML.match(/data-short="1">([^<]*)</); return m ? textOf(m[1]) : null; };
  const seal = () => { const m = app.innerHTML.match(/data-seal="[^"]*">([^<]*)<\/span>/); return m ? textOf(m[1]) : null; };
  // (1) a Curtain some way off: the line and the chip count it down
  const c0 = curtainFalls(); await lw.poll(true); await editionRead(c0);
  lw.go('title'); lw.go('front'); // the Purse is rebuilt on a fresh front page
  assert.ok(ui.cache.curtains[tl].nextCurtainAt - ui.cache.clock > 10, 'the next Curtain is more than last call away');
  assert.match(cd(), new RegExp(`^in ${DUR}$`), `the Curtain line is a duration (${cd()})`);
  assert.doesNotMatch(cd(), BAND, 'no band word');
  assert.match(chip(), new RegExp(`^${SHORT}$`), `the chip is a short duration (${chip()})`);
  assert.doesNotMatch(chip(), /later|soon|ready|now/, 'no word on the chip');
  // (2) a digest headline with dueAt ends with the wait to its Curtain
  const hs = L.awayDigest(srv.state, ui.active, 0, { tonight: true }).headlines;
  const due = hs.find((h) => h.dueAt != null);
  assert.ok(due, `a TONIGHT headline with dueAt (${J(hs.map((h) => h.type))})`);
  if (ui.modal) lw.closeModal();
  lw.openModal('digest', { wid: ui.active, headlines: hs, travel: null });
  const sheetText = textOf(sheet());
  assert.ok(sheetText.includes(textOf(due.text)), 'the headline is printed');
  assert.match(sheetText, new RegExp(`\\. Curtain in ${DUR}\\.`), `the dueAt headline carries its duration (${sheetText.slice(0, 240)})`);
  assert.doesNotMatch(sheetText, BAND, 'no band word in the sheet');
  lw.closeModal();
  // (3) sealed: the seal line names the time of day and the duration
  assert.ok(Array.isArray(await sealNow()), 'the seal landed'); assert.ok(sealedOnServer(), 'and holds (one has just fallen, so no early fall)');
  lw.go('front'); await wait(10);
  assert.match(seal(), new RegExp(`^The Curtain falls at about \\d{1,2}:\\d{2}[^,]*, in ${DUR}\\. `), `the seal line (${seal()})`);
  assert.doesNotMatch(seal(), BAND, 'no band word on the seal line');
  assert.ok(Array.isArray(await lw.act(L.unseal, ui.active)), 'unsealed again');
  // (4) last call in the District: "Last call: {left}", the chip the duration alone
  const T = srv.state.timelines[tl];
  srv.state = L.advanceClock(srv.state, L.nextForcedAt(srv.state, T) - srv.state.clock - 5); srv.rev++;
  await lw.poll(true); await wait(10);
  lw.go('title'); lw.go('front');
  assert.match(cd(), /^Last call: [45] min$/, `a due Curtain in the District (${cd()})`);
  assert.match(chip(), /^[45]m$/, `the chip (${chip()})`);
  for (let i = 0; i < 6 && printed(); i++) lw.ACTS['hl-close']();
  // (5) leftWords at each rate
  assert.equal(typeof lw.leftWords, 'function', '__lw carries leftWords (debug)');
  assert.equal(lw.leftWords(25), '25 min', 'the arena: a District minute is a real minute');
  lw.leaveArena();
  assert.equal(lw.leftWords(25), '25 sec', 'solo: a District minute is a real second');
});

test('B2-lastcall: the plan screen Curtain line, the Purse label, the Timelines row, the stats menu head and the locked era rows read Curtain in {left} before last call and Last call: {left} alone, no Curtain before it, once a District Curtain is due', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const DUR = '(\\d+h \\d+m|\\d+ min|\\d+ sec)';
  const tl = herTl();
  // the locked era rows' Curtain lines (the round-3 code review, finding 2: they read "Curtain Last call: 5 min"), each
  // up to the real time of day; the grid keeps every Timeline's Curtain in step with hers. Every era she does not hold is
  // drawn locked for the read (no invitation: the server leaves canOpen empty when the street is full, LW_TL_CAP)
  const lockedRows = () => {
    const acct = ui.cache.acct; const can = acct.canOpen; acct.canOpen = [];
    try { lw.go('timelines'); return [...app.innerHTML.matchAll(/<div class="tl (\w+) locked">[\s\S]*?<span class="tsub">([^<]*?)\s\(about/g)].map((m) => [m[1], textOf(m[2])]); } finally { acct.canOpen = can; }
  };
  // the whole line beside Back (its words, whatever spans it is made of)
  const planLine = () => { const m = app.innerHTML.match(/data-id="front">Back<\/button><span class="type"[^>]*>([\s\S]*?)<\/span><\/div>/); return m ? textOf(m[1]) : null; };
  const label = () => { const t = body.children.find((c) => c.className === 'chrome-top'); const m = t && t.innerHTML.match(/class="purse[^>]*aria-label="([^"]*)"/); return m ? textOf(m[1]) : null; };
  const openPlan = async () => { lw.go('front'); await wait(10); await lw.ACTS.plan({ id: L.casualPlace(lw.V()) }); assert.equal(ui.screen, 'plan', 'on the plan screen'); };
  // her Timelines row's Curtain line, the whole tsub up to the real time of day (its words, whatever spans it is made of)
  const tlRow = () => { lw.go('timelines'); const m = app.innerHTML.match(new RegExp(`<span class="tsub">([^(]*?data-cd(?:line)?="${tl}"[^(]*?)\\s\\(`)); return m ? textOf(m[1]) : null; };
  // the stats menu head's Timeline line, the whole small span (the Timeline's name, then the Curtain line)
  const statsHead = () => { if (ui.modal) lw.closeModal(); lw.ACTS.menu({ id: 'stats' }); const m = sheet().match(new RegExp(`<span class="small">([^<]*<span data-cd(?:line)?="${tl}">[^<]*</span>)</span>`)); lw.closeModal(); return m ? textOf(m[1]) : null; };
  // (1) a Curtain some way off: "Curtain in {left}" on all four
  const c0 = curtainFalls(); await lw.poll(true); await editionRead(c0);
  lw.go('title'); lw.go('front'); // the Purse is rebuilt on a fresh front page
  assert.ok(ui.cache.curtains[tl].nextCurtainAt - ui.cache.clock > 10, 'the next Curtain is more than last call away');
  assert.match(label(), new RegExp(`, Curtain in ${DUR}\\. Open her stats$`), `the Purse label before last call (${label()})`);
  assert.match(tlRow(), new RegExp(`^Curtain in ${DUR}$`), `the Timelines row before last call (${tlRow()})`);
  assert.match(statsHead(), new RegExp(` · Curtain in ${DUR}$`), `the stats menu head before last call (${statsHead()})`);
  const locked0 = lockedRows();
  assert.ok(locked0.length >= 1, `a locked era row (${J(locked0)})`);
  for (const [era, line] of locked0) {
    assert.ok(ui.cache.curtains[era].nextCurtainAt - ui.cache.clock > 10, `${era}'s Curtain is more than last call away`);
    assert.match(line, new RegExp(`^Curtain in ${DUR}$`), `the locked ${era} row before last call (${line})`);
  }
  await openPlan();
  assert.match(planLine(), new RegExp(`^Curtain in ${DUR}$`), `the plan screen line before last call (${planLine()})`);
  // (2) last call in the District: "Last call: {left}" alone, no Curtain before it, on all four
  const T = srv.state.timelines[tl];
  srv.state = L.advanceClock(srv.state, L.nextForcedAt(srv.state, T) - srv.state.clock - 5); srv.rev++;
  await lw.poll(true); await wait(10);
  lw.go('title'); lw.go('front');
  for (let i = 0; i < 6 && printed(); i++) lw.ACTS['hl-close']();
  assert.match(label(), /, Last call: [45] min\. Open her stats$/, `the Purse label at last call (${label()})`);
  assert.doesNotMatch(label(), /Curtain Last call/, 'no Curtain before Last call in the label');
  assert.match(tlRow(), /^Last call: [45] min$/, `the Timelines row at last call (${tlRow()})`);
  assert.doesNotMatch(tlRow(), /Curtain/, 'no Curtain before Last call on the Timelines row');
  // the row's full-pay words after the time of day begin with a spaced middle dot (third code review, finding 3: the
  // space after the dot had gone, so the row read "(7:00 PM) ·full pay 3 of 3 left")
  const tlTail = app.innerHTML.match(new RegExp(`data-cdline="${tl}"[^(]*\\([^)]*\\)([^<]*)`));
  assert.ok(tlTail && tlTail[1].startsWith(' · '), `the Timelines row after the time of day starts with a spaced dot (${J(tlTail && tlTail[1])})`);
  assert.match(statsHead(), / · Last call: [45] min$/, `the stats menu head at last call (${statsHead()})`);
  assert.doesNotMatch(statsHead(), /Curtain Last call/, 'no Curtain before Last call in the stats menu head');
  const locked1 = lockedRows();
  assert.equal(locked1.length, locked0.length, `the same locked era rows (${J(locked1)})`);
  for (const [era, line] of locked1) {
    assert.match(line, /^Last call: [45] min$/, `the locked ${era} row at last call (${line})`);
    assert.doesNotMatch(line, /Curtain/, `no Curtain before Last call on the locked ${era} row`);
  }
  await openPlan();
  assert.match(planLine(), /^Last call: [45] min$/, `the plan screen line at last call (${planLine()})`);
  assert.doesNotMatch(planLine(), /^Curtain/, 'no Curtain before Last call on the plan screen');
  lw.go('front');
});

test('B2-strip-past: a TONIGHT headline whose dueAt is already past prints its text alone, without Curtain in, on the strip and in the digest sheet', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const hs = L.awayDigest(srv.state, ui.active, 0, { tonight: true }).headlines;
  const due = hs.find((h) => h.dueAt != null);
  assert.ok(due, `a TONIGHT headline with dueAt (${J(hs.map((h) => h.type))})`);
  const past = { ...due, dueAt: ui.cache.clock - 10 };
  // the digest sheet
  if (ui.modal) lw.closeModal();
  lw.openModal('digest', { wid: ui.active, headlines: [past], travel: null });
  const sheetText = textOf(sheet());
  assert.ok(sheetText.includes(textOf(past.text)), 'the headline is printed');
  assert.doesNotMatch(sheetText, /Curtain in/, `no Curtain in on a past headline in the sheet (${sheetText.slice(0, 240)})`);
  lw.closeModal();
  // the strip
  ui.strip = { wid: ui.active, headlines: [past], travel: null };
  lw.go('front'); await wait(10);
  const m = app.innerHTML.match(/<div class="awaystrip">([\s\S]*?)<\/div>/);
  assert.ok(m, 'the strip prints');
  const stripText = textOf(m[1]);
  assert.ok(stripText.includes(textOf(past.text)), `the headline is on the strip (${stripText})`);
  assert.doesNotMatch(stripText, /Curtain in/, `no Curtain in on a past headline on the strip (${stripText})`);
  ui.strip = null;
});

test('B2-players-me: one .prow.me with (you) and aria-current, and opening Players scrolls to it once, whenever the boards arrive', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  // one element stands in for her row, there only while the page on screen has her row: it counts the scrolls the page asks for
  const realQ = document.querySelector; const row = el(); let scrolls = 0; let lastArg = null;
  row.scrollIntoView = (o) => { scrolls++; lastArg = o; };
  document.querySelector = function (q) { return /\.prow\.me/.test(q) ? (app.innerHTML.includes('class="prow me"') ? row : null) : realQ.call(document, q); };
  const keepBoards = ui.cache.boards; const keepTab = ui.tab;
  try {
    // (1) the boards are there when Players opens
    ui.scrolledTo = null;
    lw.go('players');
    const html = app.innerHTML;
    assert.equal((html.match(/class="prow me"/g) || []).length, 1, 'one row is hers');
    const tag = html.match(/<button class="prow me"[^>]*>/);
    assert.ok(tag && /aria-current="true"/.test(tag[0]), `her row carries aria-current (${tag && tag[0]})`);
    assert.equal((html.match(/aria-current="true"/g) || []).length, 1, 'and no other row does');
    const seg = html.slice(html.indexOf(tag[0]), html.indexOf('</button>', html.indexOf(tag[0])));
    assert.match(textOf(seg), /\(you\)/, 'her row says (you)');
    assert.equal(scrolls, 1, 'opening Players scrolled to her row');
    assert.equal(ui.scrolledTo, ACC, 'and ui.scrolledTo remembers it');
    assert.ok(lastArg && lastArg.block === 'center', 'to the middle of the screen');
    // (2) once: a tab, a re-render and a poll scroll no more
    lw.ACTS.tab({ id: 'richest' }); lw.render({ keepScroll: true });
    srv.rev++; await lw.poll(true); await wait(10);
    assert.equal(scrolls, 1, 'a tab switch, a re-render and a poll leave the page where she put it');
    // (3) each opening scrolls once
    lw.go('front'); lw.go('players');
    assert.equal(scrolls, 2, 'opening Players again scrolls again');
    await wait(30); // the boards poll that opening starts
    assert.equal(scrolls, 2, 'and the poll it starts adds none');
    // (4) the boards arrive after the page does: the scroll waits for her row
    lw.go('front'); ui.cache.boards = null; lw.go('players');
    assert.equal(scrolls, 2, 'no boards yet: nothing to scroll to');
    assert.equal(ui.scrolledTo, null, 'and nothing remembered');
    ui.cache.boards = keepBoards; lw.render({ keepScroll: true });
    assert.equal(scrolls, 3, 'the render that brings her row scrolls to it');
    assert.equal(ui.scrolledTo, ACC);
    lw.render({ keepScroll: true });
    assert.equal(scrolls, 3, 'once');
  } finally {
    document.querySelector = realQ; ui.cache.boards = keepBoards; ui.tab = keepTab; lw.go('front');
  }
});

test('B2-blackbook: the page lists every gentleman; a Studied Secret Taste shows, an unknown one says not yet', async () => {
  await enter(); lw.go('front');
  const wid = ui.active; const gents = L.getView(srv.state, wid).timeline.gents;
  assert.ok(gents.length >= 2, 'two gentlemen at least');
  // one Secret Taste known, one not (the engine's known flags, as Study sets them), served by the next poll
  const kw = srv.state.whores[wid].known.gents;
  (kw[gents[0].id] ||= {}).secret = true; (kw[gents[1].id] ||= {}).secret = false; srv.rev++;
  await lw.poll(true); await wait(10);
  const v = lw.V(); const g0 = v.timeline.gents.find((g) => g.id === gents[0].id); const g1 = v.timeline.gents.find((g) => g.id === gents[1].id);
  assert.ok(g0.known.secret && g0.secretTaste && !g1.known.secret, 'the view shows one Secret Taste and masks the other');
  if (ui.modal) lw.closeModal();
  lw.openModal('blackbook');
  assert.ok(ui.modal && ui.modal.type === 'blackbook', 'the page opens');
  const page = sheet(); const text = textOf(page);
  for (const g of gents) assert.ok(text.includes(g.short) && page.includes(`data-act="bb-gent" data-id="${g.id}"`), `${g.short} is listed with His card`);
  assert.equal((page.match(/data-act="bb-gent"/g) || []).length, gents.length, 'one His card per gentleman');
  const row = (g) => { const i = page.indexOf(`data-id="${g.id}"`); return textOf(page.slice(page.lastIndexOf('<div class="bbrow">', i), i)); };
  assert.match(row(g0), new RegExp(`Secret Taste: ${C.ARTS[g0.secretTaste].name}\\.`), `the Studied one shows (${row(g0)})`);
  assert.match(row(g1), /Secret Taste: not yet\./, `the unknown one says not yet (${row(g1)})`);
  assert.match(text, /Tastes: /, 'his Tastes'); assert.match(text, /Kink: (not yet|[A-Z])/, 'his Kink or not yet');
  lw.closeModal();
  // from the album: the hub carries the button
  lw.openModal('things', 'album');
  assert.ok(sheet().includes('data-act="blackbook"') && /Open the Little Black Book/.test(textOf(sheet())), 'the album offers the book');
  lw.closeModal();
});

test('B2-study: ACTS.study opens the reveal with both Tells and what was learnt', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const legal = L.legalActions(srv.state, ui.active).find((a) => a.type === 'study');
  assert.ok(legal, 'a Study is legal');
  const g = lw.V().timeline.gents.find((x) => x.id === legal.target);
  assert.ok(g && g.tells.length >= 2, 'he has two Tells');
  if (ui.modal) lw.closeModal();
  const t0 = srv.state.tick;
  await lw.ACTS.study({ id: g.id });
  const evs = L.eventsFor(srv.state, ACC, t0);
  const learned = evs.filter((e) => e.type === 'learned'); const st = evs.find((e) => e.type === 'study');
  assert.ok(ui.modal && ui.modal.type === 'result', `the reveal opens (${ui.modal && ui.modal.type})`);
  const text = textOf(sheet());
  assert.match(text, /Studied at the bar/, text.slice(0, 120));
  assert.ok(text.includes(g.short), 'his name');
  for (const t of g.tells) assert.ok(text.includes(textOf(t)), `his Tell "${t}" is on the sheet`);
  const learnt = learned.length ? learned.map((e) => e.text).join(' ') : (st ? st.text : '');
  assert.ok(learnt && text.includes(textOf(learnt)), `what was learnt is on the sheet (${learnt})`);
  assert.ok(sheet().includes('data-act="close-modal"') && /Close/.test(text), 'Close (she did not come from his card)');
  lw.closeModal();
  // from his card: the button goes back to it
  const legal2 = L.legalActions(srv.state, ui.active).find((a) => a.type === 'study' && a.target === g.id);
  if (legal2) {
    lw.openModal('gent', g.id);
    await lw.ACTS.study({ id: g.id });
    assert.ok(ui.modal && ui.modal.type === 'result', 'the reveal again');
    assert.ok(sheet().includes(`data-act="study-back" data-id="${g.id}"`) && /Back to his card/.test(textOf(sheet())), 'Back to his card');
    lw.ACTS['study-back']({ id: g.id });
    assert.ok(ui.modal && ui.modal.type === 'gent' && ui.modal.data === g.id, `Back to his card opens his card (${ui.modal && ui.modal.type})`);
    lw.closeModal();
  }
  for (let i = 0; i < 6 && printed(); i++) lw.ACTS['hl-close']();
});

// Study her: a rival uses the same ACTS.study from her profile pop-up; the reveal sheet is a gentleman's, so a rival keeps the
// headline, and the pop-up behind it is redrawn with what she just learnt and one free Study fewer
test('B2-study-rival: Study her on a rival\'s profile prints the From the bar headline (auto) and redraws the profile with the Study her count one lower', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const wid = ui.active;
  // three free Studies and a rival with everything still to learn, so the count and the button are deterministic; the
  // mock's profile-request count starts again, so an earlier test's fetches never push this one past its 404 limit
  const w = srv.state.whores[wid]; w.daily.studies = 0; srv.profileRequests = 0; srv.profile429 = false; srv.profileSlowMs = 0;
  const rival = lw.V().timeline.rivals.find((r) => srv.state.whores[r.id] && srv.state.whores[r.id].account !== ACC);
  assert.ok(rival, 'a rival on her street');
  delete w.known.rivals[rival.id]; srv.rev++;
  await lw.poll(true); await wait(10);
  assert.ok(L.legalActions(srv.state, wid).some((a) => a.type === 'study' && a.target === rival.id), 'Study her is legal');
  const free = lw.V().whore.daily.freeStudiesLeft;
  assert.equal(free, R.study.freePerDay, `${free} free Studies`);
  if (ui.modal) lw.closeModal();
  for (let i = 0; i < 6 && printed(); i++) lw.ACTS['hl-close']();
  delete ui.cache.profiles[rival.id];
  lw.openModal('profile', rival.id);
  assert.ok(await until(() => ui.cache.profiles[rival.id] && !ui.cache.profiles[rival.id].error), 'her file came');
  await wait(10);
  assert.ok(sheet().includes(`data-act="study" data-id="${rival.id}"`) && textOf(sheet()).includes(`Study her · ${free} free`), `the profile offers Study her with the count (${textOf(sheet()).slice(-200)})`);
  const t0 = srv.state.tick;
  await lw.ACTS.study({ id: rival.id });
  const st = L.eventsFor(srv.state, ACC, t0).find((e) => e.type === 'study');
  assert.ok(st && st.whores[1] === rival.id && st.data.facts.length >= 1, `the Study landed on her (${J(st && st.data)})`);
  assert.ok(ui.modal && ui.modal.type === 'profile', `the profile stays open (${ui.modal && ui.modal.type})`);
  const line = textOf(printed());
  assert.ok(line.includes('From the bar') && line.includes('Watched and noted') && line.includes(textOf(st.text)), `the headline carries what the bar said (${line})`);
  // the profile behind it is redrawn (the act's rev clears the cached file, so it is fetched again): one free Study fewer
  assert.ok(await until(() => ui.cache.profiles[rival.id] && !ui.cache.profiles[rival.id].error), 'her file came again');
  await wait(10);
  const after = textOf(sheet());
  assert.ok(after.includes(`Study her · ${free - 1} free`), `the profile's count is one lower (${after.slice(-200)})`);
  assert.ok(lw.V().timeline.rivals.find((r) => r.id === rival.id).known.habit, 'her Habit is known now');
  // a second Study (her Vice and Talent): the profile shows them in place of the question, and the count drops again
  for (let i = 0; i < 6 && printed(); i++) lw.ACTS['hl-close']();
  await lw.ACTS.study({ id: rival.id });
  assert.ok(await until(() => ui.cache.profiles[rival.id] && !ui.cache.profiles[rival.id].error), 'her file came after the second Study');
  await wait(10);
  const after2 = textOf(sheet());
  assert.ok(after2.includes(`Study her · ${free - 2} free`), `the count is two lower (${after2.slice(-200)})`);
  assert.ok(after2.includes(C.VICES[srv.state.whores[rival.id].vice].name), `her Vice is on the profile (${after2.slice(0, 400)})`);
  assert.ok(textOf(printed()).includes('Watched and noted'), 'the second headline');
  lw.closeModal();
  for (let i = 0; i < 6 && printed(); i++) lw.ACTS['hl-close']();
});

test('B2-hind-return: seal a losing plan via ACTS.seal, leave, the Curtain falls, enter: the return headline carries the hindsight line once, a second enter does not print it again, ui.hinds[wid] is still there, and a later Standing Order Curtain at the same Place shown on screen prints no hindsight', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const wid = ui.active; const tl = herTl();
  const c0 = curtainFalls(); await lw.poll(true); await editionRead(c0); // one has just fallen: her seal brings no early Curtain
  // a losing plan through the page's own seal: no cards at all, at an open Place that is not her first Gutter visit
  const v = lw.V(); const place = v.timeline.places.find((p) => p.open && p.kind !== 'gutter').id;
  // the test's own preconditions, whatever the tests before it taught her: the host's Kink is still a secret (a no-card
  // plan then always has a line to print: the Kink tip at the least) and the night is full pay, so the loss is scorable
  const host = v.timeline.rota[0].hosts[place];
  const kg = srv.state.whores[wid].known.gents[host]; if (kg) delete kg.kink;
  srv.state.whores[wid].daily.curtains = 0; srv.rev++;
  await lw.poll(true); await wait(10);
  assert.ok(!lw.V().timeline.gents.find((g) => g.id === host).known.kink, `${host}'s Kink is a secret to her`);
  assert.ok(lw.V().whore.daily.fullPayLeft > 0, 'a full-pay night');
  await lw.ACTS.plan({ id: place });
  assert.equal(ui.screen, 'plan');
  ui.sel = [];
  await lw.ACTS.seal();
  assert.ok(sealedOnServer(), 'the seal landed and holds');
  const kept = ui.hinds[wid];
  assert.ok(kept && kept.place === place && kept.curtain === lw.V().timeline.curtainNo, `the baseline is kept with its Curtain number (${J(kept && { place: kept.place, curtain: kept.curtain })})`);
  // she leaves; the Curtain falls on her sealed plan
  await lw.ACTS.leave();
  assert.equal(ui.mode, 'solo', 'out of the District');
  const T = srv.state.timelines[tl]; const t0 = srv.state.tick;
  srv.state = L.advanceClock(srv.state, L.nextForcedAt(srv.state, T) - srv.state.clock + 1); srv.rev++;
  const pay = L.eventsFor(srv.state, ACC, t0).find((e) => e.type === 'payout' && e.whores[0] === wid);
  assert.ok(pay && !pay.data.standingOrder && pay.data.place === place && pay.data.rank !== 0, `her sealed plan went out and lost (${J(pay && { so: pay.data.standingOrder, place: pay.data.place, rank: pay.data.rank })})`);
  assert.equal(pay.data.fullPay, true, 'a full-pay loss');
  assert.equal(pay.curtain, kept.curtain, 'the payout carries the Curtain number the seal did');
  // back in (enter() would close the digest it opens, so the page's own way in): the CURTAIN CALL carries the hindsight line
  const back = async () => { srv.lossy = false; srv.staleView = null; if (ui.mode === 'arena') lw.leaveArena(); lw.enterArena(payload({ all: 1, digest: 1, boards: 1 }), 'resume'); await wait(30); assert.ok(ui.mode === 'arena' && ui.active, 'in the arena'); };
  await back();
  assert.ok(ui.modal && ui.modal.type === 'digest', `the return digest (${ui.modal && ui.modal.type})`);
  const hs = ui.modal.data.headlines; const cr = hs.find((h) => h.type === 'curtain-result');
  assert.ok(cr, `a CURTAIN CALL headline (${J(hs.map((h) => h.type))})`);
  assert.ok(typeof cr.hind === 'string' && cr.hind.length > 0, `it carries the hindsight line (${J(cr)})`);
  assert.match(cr.hind, /^(What would have won|Next time|Thinking pays|Left in the reticule|Happy accident)[^:]*: .+/, cr.hind);
  assert.ok(textOf(sheet()).includes(textOf(cr.hind)), 'printed on the sheet');
  assert.ok(ui.hinds[wid] && ui.hinds[wid].curtain === kept.curtain && ui.hinds[wid].shown === kept.curtain, 'the baseline is kept, marked shown');
  lw.closeModal(); await wait(20);
  // a second enter does not print it again, and the baseline is still there
  await back();
  if (ui.modal && ui.modal.type === 'digest') { assert.ok(!ui.modal.data.headlines.some((h) => h.hind), 'not printed again'); lw.closeModal(); }
  assert.ok(!ui.strip || !ui.strip.headlines.some((h) => h.hind), 'not on the strip either');
  assert.ok(ui.hinds[wid] && ui.hinds[wid].curtain === kept.curtain, 'ui.hinds[wid] is still there');
  // a later Standing Order Curtain, shown on screen: no hindsight, whatever the Place
  lw.go('front'); await lw.poll(true); await wait(10);
  const c2 = curtainFalls(); await lw.poll(true);
  assert.ok(await until(() => ui.screen === 'results' && ui.result && c2.curtainIds.includes(ui.result.curtain.id), 6000), 'the later edition');
  assert.ok(ui.result.pay.standingOrder, 'a Standing Order night');
  const HIND = /<div class="clip (?:hind|win)"><b class="h3">(What would have won|Next time|Thinking pays|Left in the reticule|Happy accident)/;
  assert.ok(!HIND.test(app.innerHTML), 'no hindsight on a later Curtain');
  assert.ok(ui.hind && ui.hind.curtain === kept.curtain && ui.hind.curtain !== ui.result.curtain.curtain, 'the consumed baseline is the older Curtain\'s');
  // and at the same Place in particular: the old baseline moved onto this result's Place, re-drawn
  ui.hind = { ...ui.hind, place: ui.result.place };
  lw.render();
  assert.ok(!HIND.test(app.innerHTML), 'a kept baseline never lands on a later Curtain at the same Place');
  lw.ACTS['after-results']();
});

test('B2-forecast: each Place row prints the Stand-ins count and a known rival\'s last Sway; the beat line sits on the Place of the loss only, names the Curtain, and is gone after she takes 1st there', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const wid = ui.active; const tl = herTl(); const places = lw.V().timeline.places.map((p) => p.id);
  // one Place card's text: from its plan button to the next card
  const rowOf = (pid) => { const h = app.innerHTML; const i = h.indexOf(`data-act="plan" data-id="${pid}"`); assert.ok(i >= 0, `the ${pid} card`); const j = h.indexOf('<div class="place ', i + 1); return textOf(h.slice(i, j < 0 ? i + 4000 : j)); };
  for (const pid of places) assert.match(rowOf(pid), /Stand-ins: (quiet|a few|busy) \(\d+\)\./, `${pid}: ${rowOf(pid).slice(-240)}`);
  assert.ok(ui.cache.forecast && ui.cache.forecast[wid] && ui.cache.forecast[wid].labels && ui.cache.forecast[wid].counts && ui.cache.forecast[wid].known, 'the page keeps the payload\'s forecast (labels, counts, known)');
  // a rival she knows is heading to one Place (a Gossip read for this Curtain), with the Sway she last saw her at
  const rival = Object.values(srv.state.whores).find((x) => x.timeline === tl && x.id !== wid && x.account !== ACC && !x.retired);
  const kr = (srv.state.whores[wid].known.rivals[rival.id] ||= {});
  kr.heading = { curtain: srv.state.timelines[tl].curtainNo, place: places[0] }; kr.lastSway = 7; srv.rev++;
  await lw.poll(true); await wait(10);
  const short = C.CHARACTERS[rival.char].short || rival.name;
  assert.ok(rowOf(places[0]).includes(`${short} is heading here, last seen at 7 Sway.`), `the known rival with her last Sway (${rowOf(places[0]).slice(-240)})`);
  assert.ok(!places.slice(1).some((pid) => rowOf(pid).includes(`${short} is heading here`)), 'on that Place only');
  // the beat line, from the view: the Place of the loss only, the Curtain as the paper numbers it, the winner by her board name
  const rv = lw.V().timeline.rivals.find((r) => r.id === rival.id); assert.ok(rv && rv.name, 'the rival is on the board');
  const show = async (lastBeatenAt) => { srv.rev++; const p = payload({ focus: wid, tick: ui.cache.tick }); p.views[wid].whore.lastBeatenAt = lastBeatenAt; srv.staleView = p; await lw.poll(true); await wait(10); assert.equal(ui.cache.rev, srv.rev, 'the canned view was adopted'); };
  await show({ place: places[1], curtain: 3, by: rival.id });
  assert.ok(rowOf(places[1]).includes(`${rv.name} beat you here at Curtain No. 4.`), `the beat line on the Place of the loss (${rowOf(places[1]).slice(-240)})`);
  assert.ok(!places.filter((pid) => pid !== places[1]).some((pid) => rowOf(pid).split('Stand-ins:').pop().includes('beat you here')), 'nowhere else');
  await show(null); // she took 1st there: the engine clears it
  assert.ok(!app.innerHTML.includes('beat you here'), 'gone after she takes 1st there');
  // the plan screen's crowd note says the same
  await lw.ACTS.plan({ id: places[0] });
  assert.equal(ui.screen, 'plan');
  assert.match(textOf(app.innerHTML), new RegExp(`Stand-ins: (quiet|a few|busy) \\(\\d+\\)\\. ${short} is heading here, last seen at 7 Sway\\.`), 'the crowd note carries the line');
  lw.go('front');
});

// Fix round of 2026-10-18, finding 4: two unread sealed Curtains on her return, the older sealed here (its baseline kept)
// and the newer sealed from another device (no baseline): the hindsight line sits on the CURTAIN CALL whose events carry
// the older Curtain's payout, never on the newer one, which sorts first; and with that headline gone the baseline stays
// unshown
test('B2-hind-curtain: with two unread sealed Curtains the return hindsight attaches to the headline of the Curtain the baseline was kept for, not the first CURTAIN CALL; without that headline the baseline stays unshown', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const wid = ui.active; const tl = herTl();
  const c0 = curtainFalls(); await lw.poll(true); await editionRead(c0);
  // the older night, sealed on the page with no cards (as B2-hind-return sets it up: the host's Kink a secret, full pay)
  const v = lw.V(); const place = v.timeline.places.find((p) => p.open && p.kind !== 'gutter').id;
  const host = v.timeline.rota[0].hosts[place];
  const kg = srv.state.whores[wid].known.gents[host]; if (kg) delete kg.kink;
  srv.state.whores[wid].daily.curtains = 0; srv.rev++;
  await lw.poll(true); await wait(10);
  await lw.ACTS.plan({ id: place });
  assert.equal(ui.screen, 'plan');
  ui.sel = [];
  await lw.ACTS.seal();
  assert.ok(sealedOnServer(), 'the seal landed and holds');
  const kept = ui.hinds[wid]; const k = kept.curtain;
  await lw.ACTS.leave();
  assert.equal(ui.mode, 'solo', 'out of the District');
  // advanceClock returns a new state: the Timeline is read afresh each time
  const fall = () => { const t0 = srv.state.tick; srv.state = L.advanceClock(srv.state, L.nextForcedAt(srv.state, srv.state.timelines[tl]) - srv.state.clock + 1); srv.rev++; return L.eventsFor(srv.state, ACC, t0).find((e) => e.type === 'payout' && e.whores[0] === wid); };
  const payK = fall();
  assert.ok(payK && !payK.data.standingOrder && payK.curtain === k && payK.data.place === place && payK.data.rank !== 0, `the older sealed night went out and lost (${J(payK && { so: payK.data.standingOrder, curtain: payK.curtain, rank: payK.data.rank })})`);
  // the newer night, sealed from another device: straight on the server, no baseline on this page
  const v2 = L.getView(srv.state, wid); const place2 = L.casualPlace(v2); const t1 = srv.state.tick;
  srv.state = L.sealPlan(srv.state, wid, { place: place2, cards: L.bestGuess(v2, place2).cards }); srv.rev++;
  // the table complete, the seal may bring the Curtain down at once; else it falls on the grid
  const payK1 = L.eventsFor(srv.state, ACC, t1).find((e) => e.type === 'payout' && e.whores[0] === wid) || fall();
  assert.ok(payK1 && !payK1.data.standingOrder && payK1.curtain === k + 1, `the newer sealed night went out too (${J(payK1 && { so: payK1.data.standingOrder, curtain: payK1.curtain })})`);
  assert.ok(ui.hinds[wid] && ui.hinds[wid].curtain === k && ui.hinds[wid].shown !== k, 'the baseline is the older Curtain\'s, unshown');
  srv.lossy = false; srv.staleView = null; if (ui.mode === 'arena') lw.leaveArena();
  lw.enterArena(payload({ all: 1, digest: 1, boards: 1 }), 'resume'); await wait(30);
  assert.ok(ui.mode === 'arena' && ui.active, 'in the arena');
  assert.ok(ui.modal && ui.modal.type === 'digest', `the return digest (${ui.modal && ui.modal.type})`);
  const hs = ui.modal.data.headlines; const crs = hs.filter((h) => h.type === 'curtain-result');
  assert.equal(crs.length, 2, `two CURTAIN CALL headlines (${J(hs.map((h) => [h.type, h.events]))})`);
  const older = crs.find((h) => h.events.includes(payK.id)); const newer = crs.find((h) => h.events.includes(payK1.id));
  assert.ok(older && newer && older !== newer, 'one for each Curtain, by its payout');
  assert.equal(crs[0], newer, 'the newer Curtain sorts first');
  assert.ok(typeof older.hind === 'string' && older.hind.length > 0, `the hindsight line is on the older Curtain's headline (${J(older)})`);
  assert.ok(!newer.hind, `and not on the newer one (${J(newer.hind)})`);
  assert.ok(ui.hinds[wid] && ui.hinds[wid].shown === k, 'the baseline is marked shown');
  lw.closeModal(); await wait(20);
  // the baseline's own headline absent (a digest that no longer carries it): nothing is shown and the baseline stays unshown
  ui.hinds[wid].shown = null;
  const d = ui.cache.digest[tl]; d.headlines = d.headlines.filter((h) => !(h.type === 'curtain-result' && h.events.includes(payK.id)));
  if (ui.modal) lw.closeModal();
  lw.returnDigest(true);
  const shown = ui.modal && ui.modal.type === 'digest' ? ui.modal.data.headlines : (ui.strip ? ui.strip.headlines : []);
  assert.ok(!shown.some((h) => h.hind), `no hindsight on another Curtain's headline (${J(shown.map((h) => [h.type, h.hind]))})`);
  assert.equal(ui.hinds[wid].shown, null, 'the baseline stays unshown');
  if (ui.modal) lw.closeModal();
  ui.strip = null; ui.hinds[wid].shown = k;
  lw.go('front'); await wait(10);
  for (let i = 0; i < 6 && printed(); i++) lw.ACTS['hl-close']();
});

// Fix round of 2026-10-18, finding 5: a dueAt headline's wait on an open digest sheet keeps counting. The sheet is never
// redrawn by the poll (adopt skips a digest), so the wait lives in a data-due node that updateCountdowns writes, as the
// Curtain line's data-cd. The stub's querySelectorAll answers nothing, so the test hands it the node the sheet printed.
test('B2-digest-tick: the wait on an open digest headline moves on with the clock (1h 30m to 1h 0m after 30 District minutes), the sheet itself untouched; once the Curtain has fallen the node empties', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const tl = herTl();
  const c0 = curtainFalls(); await lw.poll(true); await editionRead(c0);
  const T = srv.state.timelines[tl];
  // 90 District minutes before the next Curtain
  srv.state = L.advanceClock(srv.state, L.nextForcedAt(srv.state, T) - srv.state.clock - 90); srv.rev++;
  await lw.poll(true); await wait(10);
  const hs = L.awayDigest(srv.state, ui.active, 0, { tonight: true }).headlines;
  const due = hs.find((h) => h.dueAt != null);
  assert.ok(due, `a TONIGHT headline with dueAt (${J(hs.map((h) => h.type))})`);
  assert.equal(Number(due.dueAt) - ui.cache.clock, 90, 'its Curtain is 90 District minutes off');
  if (ui.modal) lw.closeModal();
  lw.openModal('digest', { wid: ui.active, headlines: [due], travel: null });
  const modal0 = ui.modal; const html0 = sheet();
  const m = html0.match(/<span data-due="(\d+)">([^<]*)<\/span>/);
  assert.ok(m && Number(m[1]) === Number(due.dueAt), `the wait is in its own data-due node (${html0.slice(0, 300)})`);
  assert.equal(textOf(m[2]), 'Curtain in 1h 30m.', `the wait as printed (${m[2]})`);
  // the node the sheet printed, handed to updateCountdowns the way the page finds it
  const node = el('span'); node.dataset.due = m[1]; node.textContent = m[2];
  const qsa0 = document.querySelectorAll;
  document.querySelectorAll = (q) => (q === '[data-due]' ? [node] : qsa0.call(document, q));
  try {
    // 30 District minutes pass; the poll adopts the clock and ticks the countdowns, and leaves the open digest alone
    srv.state = L.advanceClock(srv.state, 30); srv.rev++;
    await lw.poll(true); await wait(10);
    assert.equal(ui.cache.clock, Number(due.dueAt) - 60, 'the page clock moved 30 minutes');
    assert.equal(textOf(node.textContent), 'Curtain in 1h 0m.', `the wait moved on (${node.textContent})`);
    assert.ok(ui.modal === modal0 && ui.modal.type === 'digest', 'the same sheet is still up');
    assert.equal(sheet(), html0, 'the sheet was not redrawn');
    // its Curtain falls: the node empties and the sheet is closed by the edition (the Curtain fell on her girl)
    const c1 = curtainFalls(); await lw.poll(true);
    assert.equal(node.textContent, '', `nothing once the Curtain has fallen (${node.textContent})`);
    await editionRead(c1);
  } finally { document.querySelectorAll = qsa0; }
  if (ui.modal) lw.closeModal();
  for (let i = 0; i < 6 && printed(); i++) lw.ACTS['hl-close']();
});

// Fix round of 2026-10-18, finding 7: Study from his card inside the Black Book keeps the book's way back. Things > Album >
// Black Book > His card > Study > Back to his card > Close lands on the book, and the book's Close on Things.
test('B2-bb-study: Things > Album > Black Book > His card > Study > Back to his card > Close returns to the Black Book, and its Close to Things', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const wid = ui.active;
  // a gentleman with something left to Study, and a free Study today
  const w = srv.state.whores[wid]; w.daily.studies = 0;
  const gid = L.getView(srv.state, wid).timeline.gents[0].id;
  delete w.known.gents[gid]; srv.rev++;
  await lw.poll(true); await wait(10);
  assert.ok(L.legalActions(srv.state, wid).some((a) => a.type === 'study' && a.target === gid), 'a Study of him is legal');
  if (ui.modal) lw.closeModal();
  lw.openModal('things', 'album');
  assert.ok(ui.modal && ui.modal.type === 'things' && ui.modal.data === 'album', 'the Album tab of Things');
  lw.ACTS.blackbook();
  assert.ok(ui.modal && ui.modal.type === 'blackbook', `the Black Book (${ui.modal && ui.modal.type})`);
  assert.ok(sheet().includes(`data-act="bb-gent" data-id="${gid}"`), 'His card is offered');
  lw.ACTS['bb-gent']({ id: gid });
  assert.ok(ui.modal && ui.modal.type === 'gent' && ui.modal.data === gid, 'his card');
  await lw.ACTS.study({ id: gid });
  assert.ok(ui.modal && ui.modal.type === 'result', `the reveal (${ui.modal && ui.modal.type})`);
  assert.ok(sheet().includes(`data-act="study-back" data-id="${gid}"`), 'Back to his card');
  lw.ACTS['study-back']({ id: gid });
  assert.ok(ui.modal && ui.modal.type === 'gent' && ui.modal.data === gid, `his card again (${ui.modal && ui.modal.type})`);
  lw.closeModal();
  assert.ok(ui.modal && ui.modal.type === 'blackbook', `Close on his card returns to the Black Book (${ui.modal && ui.modal.type})`);
  lw.closeModal();
  assert.ok(ui.modal && ui.modal.type === 'things' && ui.modal.data === 'album', `the book's Close returns to Things, Album (${ui.modal && ui.modal.type})`);
  lw.closeModal();
  assert.equal(ui.modal, null, 'and Things closes to the page');
  // the reveal put away by its scrim instead of the button goes back the same way
  w.daily.studies = 0; delete w.known.gents[gid]; srv.rev++;
  await lw.poll(true); await wait(10);
  lw.openModal('things', 'album'); lw.ACTS.blackbook(); lw.ACTS['bb-gent']({ id: gid });
  await lw.ACTS.study({ id: gid });
  assert.ok(ui.modal && ui.modal.type === 'result', 'the reveal');
  lw.closeModal();
  assert.ok(ui.modal && ui.modal.type === 'blackbook', `the reveal's own close returns to the Black Book (${ui.modal && ui.modal.type})`);
  lw.closeModal(); lw.closeModal();
  assert.equal(ui.modal, null);
  for (let i = 0; i < 6 && printed(); i++) lw.ACTS['hl-close']();
});

// Fix round 3 of 2026-10-18, finding 4: the District clock's own tick (the page's one-second interval, run here by hand,
// no poll) moves a dueAt headline's wait on an open digest sheet. The interval returned before updateCountdowns whenever
// a pop-up was open, so the wait stood still between polls.
test('B2-digest-local-tick: the one-second clock tick moves the wait on an open digest sheet by itself, with no poll, and leaves the sheet up and unredrawn', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const tl = herTl();
  const c0 = curtainFalls(); await lw.poll(true); await editionRead(c0);
  const T = srv.state.timelines[tl];
  srv.state = L.advanceClock(srv.state, L.nextForcedAt(srv.state, T) - srv.state.clock - 90); srv.rev++;
  await lw.poll(true); await wait(10);
  const hs = L.awayDigest(srv.state, ui.active, 0, { tonight: true }).headlines;
  const due = hs.find((h) => h.dueAt != null);
  assert.ok(due, `a TONIGHT headline with dueAt (${J(hs.map((h) => h.type))})`);
  assert.equal(Number(due.dueAt) - ui.cache.clock, 90, 'its Curtain is 90 District minutes off');
  const clock = intervals.find((x) => x.ms === 1000 && String(x.fn).includes('updateCountdowns'));
  assert.ok(clock, `the page's District clock interval (${intervals.map((x) => x.ms).join(', ')})`);
  if (ui.modal) lw.closeModal();
  lw.openModal('digest', { wid: ui.active, headlines: [due], travel: null });
  const modal0 = ui.modal; const html0 = sheet();
  const m = html0.match(/<span data-due="(\d+)">([^<]*)<\/span>/);
  assert.ok(m && Number(m[1]) === Number(due.dueAt), `the wait is in its own data-due node (${html0.slice(0, 300)})`);
  assert.equal(textOf(m[2]), 'Curtain in 1h 30m.', `the wait as printed (${m[2]})`);
  const node = el('span'); node.dataset.due = m[1]; node.textContent = m[2];
  const qsa0 = document.querySelectorAll; const views0 = srv.views.length; const skew0 = skewMs;
  document.querySelectorAll = (q) => (q === '[data-due]' ? [node] : qsa0.call(document, q));
  try {
    assert.ok(ui.modal && ui.overlays > 0, 'the sheet is up and counts as an overlay');
    // two real minutes pass (two District minutes at this world's pace): the tick alone moves the wait
    skewMs += 120000;
    clock.fn();
    assert.equal(textOf(node.textContent), 'Curtain in 1h 28m.', `the wait moved on by the tick (${node.textContent})`);
    assert.equal(srv.views.length, views0, 'no poll was sent');
    assert.ok(ui.modal === modal0 && ui.modal.type === 'digest', 'the same sheet is still up');
    assert.equal(sheet(), html0, 'the sheet was not redrawn');
    // and again a minute later
    skewMs += 60000;
    clock.fn();
    assert.equal(textOf(node.textContent), 'Curtain in 1h 27m.', `the wait keeps moving (${node.textContent})`);
    assert.equal(srv.views.length, views0, 'still no poll');
  } finally { document.querySelectorAll = qsa0; skewMs = skew0; }
  if (ui.modal) lw.closeModal();
  await wait(10);
  for (let i = 0; i < 6 && printed(); i++) lw.ACTS['hl-close']();
});

// Fix round 3 of 2026-10-18, finding 5: a season-end sheet pending behind the Menu survives Menu > Her things. closeModal
// opened the sheet at once, inside ACTS.things, which then replaced it with Her things before a paint, the season marked
// shown and the sheet gone for good. Before B2-season: it rolls no season (the event is the engine's shape, by hand).
test('B2-season-things: Menu > Her things with a season-end sheet pending keeps the sheet pending, unshown, and opens it once Her things closes', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const key = `lw-scandal-season-shown:${ACC}`;
  forgetSeason();
  const closing = Number(srv.state.season) || 1;
  const ev = { id: 'season-by-hand', type: 'season-end', vis: 'all', data: { season: closing, banked: { [ACC]: 3 }, hall: [], top: { whorescore: [{ name: 'Ruby_Buckshot', value: 3 }], richest: [], notorious: [], respectable: [] } } };
  try {
    if (ui.modal) lw.closeModal();
    await wait(10);
    lw.ACTS.menu({ id: 'menu' });
    assert.ok(ui.modal && ui.modal.type === 'menu', `the Menu (${ui.modal && ui.modal.type})`);
    lw.onBackground([ev], true);
    assert.ok(ui.seasonEnd && ui.seasonEnd.season === closing, 'the sheet waits behind the Menu');
    assert.equal(localStorage.getItem(key), null, 'not marked shown while it waits');
    lw.ACTS.things({ id: 'cards' });
    assert.ok(ui.modal && ui.modal.type === 'things', `Her things is up (${ui.modal && ui.modal.type})`);
    await wait(10);
    assert.ok(ui.modal && ui.modal.type === 'things', `Her things stays up a tick later (${ui.modal && ui.modal.type})`);
    assert.ok(ui.seasonEnd && ui.seasonEnd.season === closing, `the sheet still waits (pending ${J(ui.seasonEnd && ui.seasonEnd.season)})`);
    assert.equal(localStorage.getItem(key), null, 'still not marked shown');
    lw.closeModal();
    await wait(10);
    assert.ok(ui.modal && ui.modal.type === 'season', `the season-end sheet opens once Her things closes (${ui.modal && ui.modal.type})`);
    assert.equal(ui.seasonEnd, null, 'nothing left pending');
    assert.ok(textOf(sheet()).replace(/\s+/g, '').includes(`SEASON${closing}ISOVER`), 'the season that closed');
    assert.equal(localStorage.getItem(key), String(closing), 'marked shown on this device once it was');
    lw.closeModal(); await wait(10);
    assert.equal(ui.modal, null);
  } finally { forgetSeason(); ui.seasonEnd = null; }
  for (let i = 0; i < 6 && printed(); i++) lw.ACTS['hl-close']();
});

// The round-3 code review, finding 5: the sheet was deduplicated through the device's storage alone, so when storage
// refused the write (a full or private browser) the same season-end event opened the sheet again on every delivery, in
// one page load. The page now also keeps the highest season shown per account in memory (ui.seasonShown), which a leave
// and a return do not clear, and consults both before queuing. The event is the engine's shape, by hand; the setItem
// stub throws the way a browser does when its quota is spent.
test('B2-season-storage: with storage refusing writes, a season-end sheet opens once per season per page load: not again for the same event, not on a return with the event in the entry payload, and the next season still opens', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const key = `lw-scandal-season-shown:${ACC}`;
  forgetSeason();
  const closing = Number(srv.state.season) || 1;
  const evOf = (n) => ({ id: `season-by-hand-${n}`, type: 'season-end', vis: 'all', data: { season: n, banked: { [ACC]: 3 }, hall: [], top: { whorescore: [{ name: 'Ruby_Buckshot', value: 3 }], richest: [], notorious: [], respectable: [] } } });
  const ev = evOf(closing);
  const set0 = localStorage.setItem;
  localStorage.setItem = () => { const e = new Error('the quota is spent'); e.name = 'QuotaExceededError'; throw e; };
  const seasonUp = () => !!(ui.modal && ui.modal.type === 'season');
  try {
    if (ui.modal) lw.closeModal();
    await wait(10);
    lw.onBackground([ev], true);
    assert.ok(seasonUp(), `the season-end sheet opens the first time (${ui.modal && ui.modal.type})`);
    assert.ok(textOf(sheet()).replace(/\s+/g, '').includes(`SEASON${closing}ISOVER`), 'the season that closed');
    assert.equal(localStorage.getItem(key), null, 'storage took nothing');
    lw.closeModal(); await wait(10);
    // the same event again, in the same page load
    lw.onBackground([ev], true);
    assert.ok(!seasonUp() && ui.seasonEnd === null, `not opened again by the same event (${ui.modal && ui.modal.type}, pending ${J(ui.seasonEnd && ui.seasonEnd.season)})`);
    // a leave and a return with the event in the entry payload, without a reload
    lw.leaveArena();
    assert.equal(ui.mode, 'solo', 'out of the District');
    const entry = payload({ all: 1, digest: 1, boards: 1 }); entry.events = [...entry.events, ev];
    lw.enterArena(entry, 'resume'); await wait(30);
    assert.ok(ui.mode === 'arena' && ui.active, 'back in the arena');
    if (ui.modal && ui.modal.type === 'digest') { lw.closeModal(); await wait(10); }
    await wait(10);
    assert.ok(!seasonUp() && ui.seasonEnd === null, `not opened again on the return (${ui.modal && ui.modal.type}, pending ${J(ui.seasonEnd && ui.seasonEnd.season)})`);
    // the season after it is news
    if (ui.modal) lw.closeModal();
    lw.onBackground([evOf(closing + 1)], true);
    assert.ok(seasonUp(), `the next season's sheet opens (${ui.modal && ui.modal.type})`);
    assert.ok(textOf(sheet()).replace(/\s+/g, '').includes(`SEASON${closing + 1}ISOVER`), 'the next season');
    lw.closeModal(); await wait(10);
  } finally { localStorage.setItem = set0; forgetSeason(); ui.seasonEnd = null; if (ui.modal) lw.closeModal(); }
  for (let i = 0; i < 6 && printed(); i++) lw.ACTS['hl-close']();
});

// last in the file: it rolls the shared world's season
test('B2-season: the line prints on Players and, in the last 3 days, on the front page, with a day and a time and what resets; a real season-end event (engine world with seasonDays 1) opens the sheet once', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const wid = ui.active;
  const RESETS = 'Renown, tiers and seats start again; she keeps her Coin, her deck and all she knows.';
  const LINE = new RegExp(`^Season (\\d+) ends (.+?) at (\\d{1,2}:\\d{2}[^:]*): ${RESETS.replace(/[.;]/g, '\\$&')}$`);
  const WEEKDAY = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/;
  const line = () => { const m = app.innerHTML.match(/<p class="small season">([^<]*)<\/p>/); return m ? textOf(m[1]) : null; };
  const v0 = lw.V();
  assert.ok(Number(v0.seasonDays) > 6 && Number.isSafeInteger(v0.seasonStartDay), `the view carries the season's bounds (${v0.seasonStartDay}, ${v0.seasonDays})`);
  // one canned view with the season's start moved, served to the next poll at a new rev
  const show = async (startDay) => { srv.rev++; const p = payload({ focus: wid, tick: ui.cache.tick }); p.views[wid].seasonStartDay = startDay; srv.staleView = p; await lw.poll(true); await wait(10); assert.equal(ui.cache.rev, srv.rev, 'the canned view was adopted'); };
  const day = Math.floor(ui.cache.clock / 1440); const n = Number(v0.seasonDays);
  // ten days to go: Players says it (a date, since it is more than 6 days off); the front page does not
  await show(day - n + 10);
  assert.equal(line(), null, `the front page says nothing with 10 days to go (${line()})`);
  lw.go('players'); await wait(10);
  let m = line() && line().match(LINE);
  assert.ok(m, `Players always says it (${line()})`);
  assert.equal(Number(m[1]), Number(lw.V().season), 'the season number');
  assert.doesNotMatch(m[2], WEEKDAY, `a date, not a weekday, when more than 6 days off (${m[2]})`); assert.match(m[2], /\d/, `a date (${m[2]})`);
  // two days to go: the front page says it too, with the weekday and the clock time of the end minute
  lw.go('front');
  const endMin = (day - n + 2 + n) * 1440;
  const at = () => textOf(new Date(Date.now() + (endMin - ui.cache.clock) / ui.cache.minPerSec * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
  const before = at();
  await show(day - n + 2);
  m = line() && line().match(LINE); const after = at();
  assert.ok(m, `the front page says it in the last 3 days (${line()})`);
  assert.match(m[2], WEEKDAY, `the weekday (${m[2]})`);
  assert.ok([before, after].includes(textOf(m[3])), `the clock time of the end minute (${m[3]}, expected ${before} or ${after})`);
  // a real roll: a one-day season from today in the engine world; the next day turn rolls it (rules.js rollSeasons)
  const was = srv.state.opts.seasonDays;
  srv.state.opts.seasonDays = 1; srv.state.seasonStartDay = srv.state.day;
  try {
    forgetSeason();
    const closing = srv.state.season; const turn = (srv.state.day + 1) * 1440;
    // to just before the day turn while she is out (her Curtains of the day reach her as a digest, not as editions)
    lw.leaveArena();
    srv.state = L.advanceClock(srv.state, turn - 2 - srv.state.clock); srv.rev++;
    assert.equal(srv.state.season, closing, 'not rolled before the day turn');
    await enter(); lw.go('front'); await lw.poll(true); await wait(20);
    // across the turn: the roll, its season-end event in the next poll
    const t0 = srv.state.tick;
    srv.state = L.advanceClock(srv.state, 3); srv.rev++;
    assert.equal(srv.state.season, closing + 1, 'the day turn rolled the season');
    const ev = L.eventsFor(srv.state, ACC, t0).find((e) => e.type === 'season-end');
    assert.ok(ev && ev.data && ev.data.season === closing && ev.data.hall && ev.data.top && ev.data.banked, `the engine's season-end event (${J(ev && Object.keys(ev.data || {}))})`);
    await lw.poll(true);
    const opened = await until(() => { if (ui.screen === 'results') lw.ACTS['after-results'](); return !!(ui.modal && ui.modal.type === 'season'); }, 10000);
    assert.ok(opened, `the season-end sheet opens (${ui.screen}, ${ui.modal && ui.modal.type})`);
    const t = textOf(sheet());
    assert.ok(t.replace(/\s+/g, '').includes(`SEASON${closing}ISOVER`), `names the season that closed (${t.slice(0, 80)})`);
    assert.match(t, new RegExp(`You banked ${Number(ev.data.banked[ACC]) || 0} Whorescore\\.`), t.slice(0, 200));
    assert.ok(/No seats were held at the close\./.test(t) || ev.data.hall.every((h) => t.includes(`${h.name}, ${L.seatName(h.seat, h.timeline)} (${C.TIMELINES[h.timeline].short})`)), 'the Hall rows, or that none were held');
    for (const k of ['whorescore', 'richest', 'notorious', 'respectable']) for (const r of ev.data.top[k].slice(0, 3)) assert.ok(t.includes(`${r.name}: ${r.value}`), `${k}: ${r.name} ${r.value} is on the sheet`);
    assert.match(t, /She keeps her Coin, her deck and everything she knows about the gentlemen\. Renown, tiers and seats start again; Standing and Notoriety halve\./, 'what the roll keeps');
    assert.ok(sheet().includes('data-act="close-modal"') && t.includes(`On to Season ${closing + 1}`), 'On to the next season');
    assert.equal(localStorage.getItem(`lw-scandal-season-shown:${ACC}`), String(closing), 'remembered on this device');
    lw.closeModal(); await wait(20);
    // once: the same event again (a replayed answer, a second device-side pass) opens nothing
    lw.onBackground([ev], true);
    assert.ok(!(ui.modal && ui.modal.type === 'season') && ui.seasonEnd === null, 'not opened again');
    // the usual case: the season rolls while she is out (the roll fires at the day turn). Its event comes in the entry
    // payload, which no poll hands to onBackground, so enterArena asks for the sheet itself: it waits behind the return
    // digest and opens once it closes, once
    lw.leaveArena();
    assert.equal(ui.mode, 'solo', 'out of the District');
    const closing2 = srv.state.season; const turn2 = (srv.state.day + 1) * 1440; const t1 = srv.state.tick;
    srv.state = L.advanceClock(srv.state, turn2 + 1 - srv.state.clock); srv.rev++;
    assert.equal(srv.state.season, closing2 + 1, 'the day turn rolled the season while she was out');
    const ev2 = L.eventsFor(srv.state, ACC, t1).find((e) => e.type === 'season-end');
    assert.ok(ev2 && ev2.data.season === closing2, 'its season-end event');
    srv.lossy = false; srv.staleView = null;
    const entry = payload({ all: 1, digest: 1, boards: 1 });
    assert.ok(entry.events.some((e) => e.id === ev2.id), 'the entry payload carries it');
    lw.enterArena(entry, 'resume'); await wait(30);
    assert.ok(ui.mode === 'arena' && ui.active, 'in the arena');
    if (ui.modal && ui.modal.type === 'digest') {
      assert.ok(ui.seasonEnd && ui.seasonEnd.season === closing2, 'the sheet waits behind the return digest');
      lw.closeModal();
    }
    const opened2 = await until(() => { if (ui.screen === 'results') lw.ACTS['after-results'](); return !!(ui.modal && ui.modal.type === 'season'); }, 10000);
    assert.ok(opened2, `the season-end sheet opens on her return (${ui.screen}, ${ui.modal && ui.modal.type})`);
    assert.ok(textOf(sheet()).replace(/\s+/g, '').includes(`SEASON${closing2}ISOVER`), 'the season that closed while she was out');
    assert.equal(localStorage.getItem(`lw-scandal-season-shown:${ACC}`), String(closing2), 'remembered on this device');
    lw.closeModal(); await wait(20);
    // once: a second entry with the same payload, and the event again, open nothing
    lw.leaveArena(); lw.enterArena(payload({ all: 1, digest: 1, boards: 1 }), 'resume'); await wait(30);
    if (ui.modal && ui.modal.type === 'digest') lw.closeModal();
    await wait(20);
    assert.ok(!(ui.modal && ui.modal.type === 'season') && ui.seasonEnd === null, `not opened again on a second entry (${ui.modal && ui.modal.type})`);
    lw.onBackground([ev2], true);
    assert.ok(!(ui.modal && ui.modal.type === 'season') && ui.seasonEnd === null, 'nor by the event again');
  } finally { srv.state.opts.seasonDays = was; }
});

// Fix round of 2026-10-18, finding 6: a season that rolls inside a request's own catch-up tick, with no Curtain of hers in
// the same answer (the grid is moved off the day turn for this), reaches the page while the wire is busy: showSeasonSoon
// defers, and the sheet must open the moment the request settles, with no poll or Curtain after it. Last in the file
// after B2-season: it rolls the shared world's season again.
test('B2-season-busy: a season-end brought by an act\'s own answer (the roll inside its catch-up, no Curtain with it) opens the sheet a tick after the act settles, with no poll after it', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const tl = herTl(); const T = () => srv.state.timelines[tl]; // advanceClock returns a new state: read the Timeline afresh
  const wasDays = srv.state.opts.seasonDays; const wasGap = srv.state.opts.maxGapMin;
  try {
    // a one-day season from today; the grid off the day turn (every 200 minutes), so no Curtain falls with the roll
    srv.state.opts.seasonDays = 1; srv.state.seasonStartDay = srv.state.day; srv.state.opts.maxGapMin = 200;
    forgetSeason();
    const closing = srv.state.season; const turn = (srv.state.day + 1) * 1440;
    lw.leaveArena();
    srv.state = L.advanceClock(srv.state, turn - 2 - srv.state.clock); srv.rev++;
    assert.equal(srv.state.season, closing, 'not rolled before the day turn');
    assert.ok(L.nextForcedAt(srv.state, T()) > turn, `no Curtain at the day turn (next at ${L.nextForcedAt(srv.state, T())}, the turn at ${turn})`);
    await enter(); lw.go('front'); await lw.poll(true); await wait(20);
    assert.equal(ui.modal, null, 'nothing on screen'); assert.equal(ui.seasonEnd, null, 'no sheet pending');
    // the roll inside the next act's catch-up: its answer carries the season-end event and no Curtain
    const t0 = srv.state.tick; const k = T().curtainNo;
    srv.beforeApply = () => { srv.state = L.advanceClock(srv.state, 3); srv.rev++; };
    const evs = await lw.act(L.markSeen, ACC, tl, ui.cache.tick);
    assert.ok(Array.isArray(evs), 'the act landed');
    assert.equal(srv.state.season, closing + 1, 'the day turn rolled the season');
    assert.equal(T().curtainNo, k, 'and no Curtain fell with it');
    const ev = L.eventsFor(srv.state, ACC, t0).find((e) => e.type === 'season-end');
    assert.ok(ev && evs.some((e) => e.id === ev.id), 'the act\'s answer carried the season-end event');
    // the sheet is up a tick later (it waits for the act's caller to finish): not after another poll or a Curtain
    await wait(10);
    assert.ok(ui.modal && ui.modal.type === 'season', `the season-end sheet opens as the act settles (${ui.modal && ui.modal.type}, pending ${J(ui.seasonEnd && ui.seasonEnd.season)})`);
    assert.equal(ui.seasonEnd, null, 'nothing left pending');
    assert.ok(textOf(sheet()).replace(/\s+/g, '').includes(`SEASON${closing}ISOVER`), 'the season that closed');
    assert.equal(localStorage.getItem(`lw-scandal-season-shown:${ACC}`), String(closing), 'remembered on this device');
    lw.closeModal(); await wait(20);
  } finally { srv.state.opts.seasonDays = wasDays; srv.state.opts.maxGapMin = wasGap; srv.beforeApply = null; }
});

// Third code review, finding 1: the numeric countdowns overstated the final wait. curtainLeft kept a floor of two minutes
// for a sealed girl and every line read whole District minutes, so with ten seconds left the sealed girl read "2 min" and
// the unsealed one "1 min". The number now reads the fractional clock (clockExact, leftShown); the due state, the band
// words and the alarms keep the whole minutes and the floor. Last in the file: it joins a second human to her street (so
// her seal cannot bring the Curtain down early) and leaves her there.
test('B2-countdown-final: an unsealed girl and a sealed girl at 60 s, 10 s and 0 s before a forced District Curtain read the true wait on the plan screen, the Purse label, the seal line, the open digest and the strip (1 min, 10 sec, 0 sec), never 2 min', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const tl = herTl();
  const planLine = () => { const m = app.innerHTML.match(/data-id="front">Back<\/button><span class="type"[^>]*>([\s\S]*?)<\/span><\/div>/); return m ? textOf(m[1]) : null; };
  const label = () => { const t = body.children.find((c) => c.className === 'chrome-top'); const m = t && t.innerHTML.match(/class="purse[^>]*aria-label="([^"]*)"/); return m ? textOf(m[1]) : null; };
  const seal = () => { const m = app.innerHTML.match(/data-seal="[^"]*">([^<]*)<\/span>/); return m ? textOf(m[1]) : null; };
  // the wait on a dueAt headline's data-due node (the round-3 code review, findings 1 and 4: dueText read the floored
  // clock, so the digest and the strip said 1 min beside a label saying 10 sec): on the open digest sheet, and on the strip
  const dueNode = (html) => { const m = String(html).match(/<span data-due="\d+">([^<]*)<\/span>/); return m ? textOf(m[1]) : null; };
  const digestDue = (h) => { if (ui.modal) lw.closeModal(); lw.openModal('digest', { wid: ui.active, headlines: [h], travel: null }); const t = dueNode(sheet()); lw.closeModal(); return t; };
  const stripDue = (h) => { ui.strip = { wid: ui.active, headlines: [h], travel: null }; lw.go('front'); const m = app.innerHTML.match(/<div class="awaystrip">([\s\S]*?)<\/div>/); ui.strip = null; return m ? dueNode(m[1]) : null; };
  // the three lines as drawn now, with no timer in between (a poll's answer would put the clock back to the server's
  // whole minute); the Purse is rebuilt on a fresh front page
  const draw = () => { lw.go('title'); lw.go('front'); for (let i = 0; i < 6 && printed(); i++) lw.ACTS['hl-close'](); };
  const onPlan = async () => { lw.go('front'); await lw.ACTS.plan({ id: L.casualPlace(lw.V()) }); assert.equal(ui.screen, 'plan', 'on the plan screen'); };
  const c0 = curtainFalls(); await lw.poll(true); await editionRead(c0);
  // a second human on her street, active and never sealing, so the Curtain waits for the clock and not for her seal
  const OTHER = 'pkkkkkkkkkk';
  srv.state = L.joinWorld(srv.state, { id: OTHER, name: `Other_${randomUUID().slice(0, 8)}`, pastWhorescore: 0 });
  srv.state = L.chooseStarter(srv.state, OTHER, 'dolly'); srv.rev++;
  // one real minute before the forced Curtain
  const T = srv.state.timelines[tl];
  srv.state = L.advanceClock(srv.state, L.nextForcedAt(srv.state, T) - srv.state.clock - 1); srv.rev++;
  await lw.poll(true); await wait(10);
  assert.equal(ui.cache.curtains[tl].nextCurtainAt - ui.cache.clock, 1, 'the forced Curtain is one District minute off');
  // the LAST CALL headline for this Curtain, with its dueAt (the Curtain's District minute)
  const due = L.awayDigest(srv.state, ui.active, 0, { tonight: true }).headlines.find((h) => h.dueAt != null);
  assert.ok(due && Number(due.dueAt) === ui.cache.curtains[tl].nextCurtainAt, `a headline due at the Curtain (${J(due && [due.type, due.dueAt])})`);
  const skew0 = skewMs;
  try {
    const readAll = async (want, who) => {
      draw();
      assert.match(label(), new RegExp(`, Last call: ${want}\\. Open her stats$`), `the Purse label, ${who} (${label()})`);
      if (who === 'sealed') assert.match(seal(), new RegExp(`^The Curtain falls at about \\d{1,2}:\\d{2}[^,]*, in ${want}\\. `), `the seal line (${seal()})`);
      else assert.equal(seal(), null, 'no seal line while unsealed');
      // the digest and the strip say the same number as the label, and nothing at all at 0 sec
      const dueWant = want === '0 sec' ? '' : `Curtain in ${want}.`;
      assert.equal(digestDue(due), dueWant, `the open digest's wait, ${who}`);
      assert.equal(stripDue(due), dueWant, `the strip's wait, ${who}`);
      await onPlan();
      assert.equal(planLine(), `Last call: ${want}`, `the plan screen line, ${who}`);
      lw.go('front');
    };
    // (1) unsealed: 60 s, 10 s, 0 s
    await readAll('1 min', 'unsealed');
    skewMs += 50_000; await readAll('10 sec', 'unsealed');
    skewMs += 10_000; await readAll('0 sec', 'unsealed');
    // (2) sealed: the seal's answer re-reads the server clock (one minute off again); she holds, since the other human has not sealed
    skewMs = skew0;
    assert.ok(Array.isArray(await sealNow()), 'the seal landed'); assert.ok(sealedOnServer(), 'and holds');
    assert.equal(ui.cache.curtains[tl].nextCurtainAt - ui.cache.clock, 1, 'still one District minute off');
    await readAll('1 min', 'sealed');
    skewMs += 50_000; await readAll('10 sec', 'sealed');
    skewMs += 10_000; await readAll('0 sec', 'sealed');
    for (const f of [label, planLine, seal]) assert.doesNotMatch(String(f()), /2 min/, 'never 2 min');
  } finally { skewMs = skew0; }
  assert.ok(Array.isArray(await lw.act(L.unseal, ui.active)), 'unsealed again');
  lw.go('front');
});

// The round-3 code review, finding 3: the printed wait counted from the whole District minute of the last answer, so every
// poll put the fraction back to zero and the final minute ran "10 sec", then "1 min" again after the next five-second
// poll. The number now counts from the server's epoch (payload.epochMs) at the server's rate and the calibrated server
// time, which no answer moves; only a payload with a new epoch (a reset, a skipped day) re-anchors it. The mock's
// payload() re-derives epochMs from the clock on every call (a full payload there snaps to the whole minute, which the real
// server never does), so the full-payload leg serves a canned payload holding the epoch the page already has.
test('B2-countdown-poll: the final minute keeps counting through normal polling: a short same answer and a full payload at the same epoch leave 10 sec at 10 sec on the Purse label, the plan screen and the digest, never back to 1 min', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const tl = herTl();
  const planLine = () => { const m = app.innerHTML.match(/data-id="front">Back<\/button><span class="type"[^>]*>([\s\S]*?)<\/span><\/div>/); return m ? textOf(m[1]) : null; };
  const label = () => { const t = body.children.find((c) => c.className === 'chrome-top'); const m = t && t.innerHTML.match(/class="purse[^>]*aria-label="([^"]*)"/); return m ? textOf(m[1]) : null; };
  const draw = () => { lw.go('title'); lw.go('front'); for (let i = 0; i < 6 && printed(); i++) lw.ACTS['hl-close'](); };
  const onPlan = async () => { lw.go('front'); await lw.ACTS.plan({ id: L.casualPlace(lw.V()) }); assert.equal(ui.screen, 'plan', 'on the plan screen'); };
  const digestDue = (h) => { if (ui.modal) lw.closeModal(); lw.openModal('digest', { wid: ui.active, headlines: [h], travel: null }); const m = sheet().match(/<span data-due="\d+">([^<]*)<\/span>/); lw.closeModal(); return m ? textOf(m[1]) : null; };
  const c0 = curtainFalls(); await lw.poll(true); await editionRead(c0);
  const T = srv.state.timelines[tl];
  srv.state = L.advanceClock(srv.state, L.nextForcedAt(srv.state, T) - srv.state.clock - 1); srv.rev++;
  await lw.poll(true); await wait(10);
  assert.equal(ui.cache.curtains[tl].nextCurtainAt - ui.cache.clock, 1, 'the forced Curtain is one District minute off');
  assert.ok(Number.isFinite(ui.cache.epochMs), `the page holds the server's epoch (${ui.cache.epochMs})`);
  const due = L.awayDigest(srv.state, ui.active, 0, { tonight: true }).headlines.find((h) => h.dueAt != null);
  assert.ok(due && Number(due.dueAt) === ui.cache.curtains[tl].nextCurtainAt, `a headline due at the Curtain (${J(due && [due.type, due.dueAt])})`);
  const readAll = async (want, when) => {
    draw();
    assert.match(label(), new RegExp(`, Last call: ${want}\\. Open her stats$`), `the Purse label ${when} (${label()})`);
    assert.equal(digestDue(due), want === '0 sec' ? '' : `Curtain in ${want}.`, `the open digest's wait ${when}`);
    await onPlan();
    assert.equal(planLine(), `Last call: ${want}`, `the plan screen line ${when}`);
    lw.go('front');
  };
  // the page's clock pinned at a real moment plus `ms` (several reads and two polls happen at one instant, so real time
  // running under them never turns 10 sec into 9 sec)
  const skew0 = skewMs; const rev0 = ui.cache.rev; const r0 = realNow();
  const pin = (ms) => { skewMs = skew0 + r0 + ms - realNow(); };
  try {
    pin(0); await readAll('1 min', 'at 60 s');
    pin(50_000); await readAll('10 sec', 'at 10 s');
    // a normal poll, not forced: the mock answers "same" (her rev is the server's), with the server's whole minute
    let v0 = srv.views.length;
    await lw.poll(); await wait(10);
    assert.equal(srv.views.length - v0, 1, 'one poll went up');
    assert.equal(Number(srv.views[srv.views.length - 1].since), rev0, 'it asked from her rev, so the answer was the short same');
    assert.equal(ui.cache.rev, rev0, 'the rev stands');
    assert.equal(ui.cache.clock, srv.state.clock, 'the same answer brought the server\'s whole minute');
    pin(50_000); await readAll('10 sec', 'after a same answer');
    // a full payload at a new rev, with the epoch the page already holds (the real server's epoch never moves on its own)
    srv.rev++; const p = payload({ focus: ui.active, tick: ui.cache.tick }); p.epochMs = ui.cache.epochMs; srv.staleView = p;
    v0 = srv.views.length;
    await lw.poll(); await wait(10);
    assert.equal(srv.views.length - v0, 1, 'one poll went up');
    assert.equal(ui.cache.rev, srv.rev, 'the full payload was adopted');
    pin(50_000); await readAll('10 sec', 'after a full payload at the same epoch');
    pin(60_000); await readAll('0 sec', 'at 0 s');
    await lw.poll(); await wait(10);
    pin(60_000); await readAll('0 sec', 'at 0 s after another same answer');
    for (const f of [label, planLine]) assert.doesNotMatch(String(f()), /1 min|2 min/, 'never a whole minute again');
  } finally { skewMs = skew0; srv.staleView = null; }
  lw.go('front');
  for (let i = 0; i < 6 && printed(); i++) lw.ACTS['hl-close']();
});

// ---- B3a: the night speaks back (4d, 4e), the missed night (7a to 7d) ----
// what the page printed, as plain text with the quotes a voice line carries put back
const plainOf = (html) => textOf(html).replace(/&quot;/g, '"');
// the text of the digest sheet from headline i to the next one (or the sheet's end): where that headline's buttons sit
const headlineSeg = (html, i) => { const a = html.indexOf(`data-act="digest-more" data-id="${i}"`); assert.ok(a >= 0, `headline ${i} on the sheet`); const b = html.indexOf(`data-act="digest-more" data-id="${i + 1}"`); return html.slice(a, b < 0 ? undefined : b); };
// back in the District the page's own way (enter() closes the digest it opens, and this one is wanted open)
async function backIn() {
  srv.lossy = false; srv.staleView = null; if (ui.mode === 'arena') lw.leaveArena();
  lw.enterArena(payload({ all: 1, digest: 1, boards: 1 }), 'resume');
  await wait(30); await until(() => !ui.cache.busy);
  assert.ok(ui.mode === 'arena' && ui.active, 'in the arena');
  assert.ok(ui.modal && ui.modal.type === 'digest', `the return digest (${ui.modal && ui.modal.type})`);
}
// the replay from the open digest sheet: the sheet closes with no markSeen, the Curtain comes down and the full sheet shows
async function replayFrom(tl, curId) {
  const mark = ui.modal.data.mark; const m0 = seenOf(tl).length;
  assert.ok(Number.isSafeInteger(mark), `the sheet carries its mark (${mark})`);
  lw.ACTS['replay-night']();
  assert.equal(ui.modal, null, 'the digest closed');
  assert.ok(await until(() => ui.screen === 'results' && ui.result && ui.result.curtain.id === curId, 6000), `the full sheet for the missed Curtain (${ui.screen}, ${J(ui.result && ui.result.curtain.id)})`);
  assert.ok(ui.result.replay && ui.result.after && ui.result.soSaid, 'a replay: no aftermath or Standing Order line of its own');
  assert.equal(seenOf(tl).length, m0, 'the replay sends no markSeen');
  return { mark, m0 };
}
// the digest comes back after the replayed edition; its close sends the one markSeen at the mark
async function digestBack(tl, mark, m0) {
  lw.ACTS['after-results']();
  assert.ok(ui.modal && ui.modal.type === 'digest', `the rest of the digest comes back (${ui.modal && ui.modal.type})`);
  assert.doesNotMatch(sheet(), /replay-night/, 'no See her last Curtain on the sheet that comes back');
  assert.equal(seenOf(tl).length, m0, 'still no markSeen');
  const hs = ui.modal.data.headlines;
  lw.closeModal();
  assert.ok(await until(() => seenOf(tl).length > m0 && !ui.cache.busy), 'the markSeen went up');
  const acks = seenOf(tl).slice(m0);
  assert.equal(acks.length, 1, `one markSeen (${J(acks.map((a) => a.args[2]))})`);
  assert.equal(acks[0].args[2], mark, `at the kept mark (${acks[0].args[2]}, mark ${mark})`);
  return hs;
}

test('B3-a: a loss to a house player prints the host\'s line and the winner\'s own line under her name; the same loss to a real player prints the host\'s line and no scripted line under her nom de plume', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const wid = ui.active;
  // a night she lost with a winner at her Place and his line in the payout, no gag: her Standing Order nights, one at a
  // time, until one is (a seeded world makes the same nights each run)
  let found = null;
  for (let i = 0; i < 10 && !found; i++) {
    const t0 = srv.state.tick;
    const c = curtainFalls();
    const evs = L.eventsFor(srv.state, ACC, t0);
    const pay = evs.find((e) => e.type === 'payout' && e.whores[0] === wid);
    const cur = evs.find((e) => e.type === 'curtain' && c.curtainIds.includes(e.id));
    const win = cur.data.places.find((x) => x.place === pay.data.place).entries.find((e) => e.rank === 0);
    const gag = evs.some((e) => e.type === 'gag' && (e.whores || [])[0] === wid && e.data && e.data.gag);
    await lw.poll(true);
    assert.ok(await until(() => ui.result && c.curtainIds.includes(ui.result.curtain.id), 6000), 'the edition is shown');
    if (pay.data.rank !== 0 && win && win.whore !== wid && pay.data.reaction && !gag) { found = { pay, win }; break; }
    lw.ACTS['after-results'](); lw.go('front'); await wait(10);
  }
  assert.ok(found, 'a night lost to another girl, with the host\'s line and no gag');
  assert.equal(ui.screen, 'results');
  const { pay, win } = found;
  const rv = lw.V().timeline.rivals.find((x) => x.id === win.whore);
  assert.ok(rv && (rv.standin || rv.automaton), `the winner is a house player (${J(rv && { name: rv.name, standin: rv.standin, automaton: rv.automaton })})`);
  const ch = C.CHARACTERS[L.charOf(win.whore)]; const pool = ch.voices && ch.voices.length ? ch.voices : [ch.voice];
  const line = pool[pay.curtain % pool.length];
  const t1 = plainOf(app.innerHTML);
  assert.ok(t1.includes(pay.data.reaction), `the host's line on a loss (${pay.data.reaction}) in: ${t1.slice(0, 400)}`);
  assert.ok(t1.includes(`${rv.name}: ${line}`), `the winner's own line under her name (${rv.name}: ${line}) in: ${t1.slice(0, 600)}`);
  assert.ok(t1.includes(`${rv.name}: ${win.sway}`), 'How she did it still names her Sway');
  assert.ok(t1.includes(`${rv.name} charmed `), 'the night\'s own line names her');
  // the same loss to a real player: the rivals view names her by nom de plume and carries neither house flag
  srv.rev++; const p = payload({ focus: wid, tick: ui.cache.tick });
  const pv = p.views[wid].timeline.rivals.find((x) => x.id === win.whore);
  pv.standin = false; pv.automaton = false; pv.name = 'Second_Player';
  srv.staleView = p; await lw.poll(true); await wait(10);
  assert.equal(ui.cache.rev, srv.rev, 'the canned view was adopted');
  assert.equal(ui.screen, 'results', 'still on the edition');
  lw.render();
  const t2 = plainOf(app.innerHTML);
  assert.ok(t2.includes(pay.data.reaction), 'the host\'s line still prints');
  assert.ok(t2.includes('Second_Player charmed ') && t2.includes(`Second_Player: ${win.sway}`), `she is named by nom de plume (${t2.slice(0, 600)})`);
  assert.ok(!pool.some((l) => t2.includes(`Second_Player: ${l}`)), `no scripted line under a real player's name (${t2.slice(0, 600)})`);
  assert.ok(!pool.some((l) => t2.includes(`${rv.name}: ${l}`)), 'nor under the character\'s');
  // the winner gone from the rivals view (retired since the night: the view lists no retired girl): nobody's to speak
  // for, so no scripted line under her character's name either, while the night's own line still names her by it
  srv.rev++; const p3 = payload({ focus: wid, tick: ui.cache.tick });
  p3.views[wid].timeline.rivals = p3.views[wid].timeline.rivals.filter((x) => x.id !== win.whore);
  srv.staleView = p3; await lw.poll(true); await wait(10);
  assert.equal(ui.cache.rev, srv.rev, 'the second canned view was adopted');
  assert.ok(!lw.V().timeline.rivals.some((x) => x.id === win.whore), 'the winner is gone from the rivals view');
  assert.equal(ui.screen, 'results', 'still on the edition');
  lw.render();
  const t3 = plainOf(app.innerHTML);
  assert.ok(t3.includes(pay.data.reaction) && t3.includes(`${ch.name} charmed `), `the host's line and the night's own line, by her character's name (${t3.slice(0, 600)})`);
  assert.ok(!pool.some((l) => t3.includes(`${ch.name}: ${l}`) || t3.includes(`${rv.name}: ${l}`) || t3.includes(`Second_Player: ${l}`)), `no scripted line for a girl gone from the view (${t3.slice(0, 600)})`);
  lw.ACTS['after-results'](); lw.go('front'); await wait(10);
  for (let i = 0; i < 6 && printed(); i++) lw.ACTS['hl-close']();
});

test('B3-b: back in after more than 200 events (eventsGap) with her sealed Curtain lost inside the last 200: its CURTAIN CALL headline carries See her last Curtain; the tap drops that Curtain in full with What would have won from the kept baseline, then the rest of the digest comes back without that headline, and its close sends one markSeen at the digest\'s mark', async () => {
  // more events than one answer carries, all read on the server: Curtains on her street with no poll
  const w0 = Object.values(srv.state.whores).find((x) => x.account === ACC && !x.retired); const tl = w0.timeline;
  for (let i = 0; i < 40 && L.eventsFor(srv.state, ACC, 0).length <= 200; i++) curtainOnClock(tl);
  assert.ok(L.eventsFor(srv.state, ACC, 0).length > 200, `more events than one answer carries (${L.eventsFor(srv.state, ACC, 0).length})`);
  srv.state = L.markSeen(srv.state, ACC, tl); srv.rev++;
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const wid = ui.active;
  const c0 = curtainFalls(); await lw.poll(true); await editionRead(c0); // one has just fallen: her seal brings no early Curtain
  // a losing plan through the page's own seal (B2-hind-return's recipe): no cards, the host's Kink a secret, full pay; and
  // an empty reticule, so the hindsight line is What would have won, not Left in the reticule
  const v = lw.V(); const place = v.timeline.places.find((p) => p.open && p.kind !== 'gutter').id;
  const host = v.timeline.rota[0].hosts[place];
  const kg = srv.state.whores[wid].known.gents[host]; if (kg) delete kg.kink;
  srv.state.whores[wid].daily.curtains = 0; srv.state.whores[wid].items = []; srv.rev++;
  await lw.poll(true); await wait(10);
  assert.ok(!lw.V().timeline.gents.find((g) => g.id === host).known.kink, `${host}'s Kink is a secret to her`);
  await lw.ACTS.plan({ id: place });
  assert.equal(ui.screen, 'plan');
  ui.sel = [];
  await lw.ACTS.seal();
  assert.ok(sealedOnServer(), 'the seal landed and holds');
  const kept = ui.hinds[wid];
  assert.ok(kept && kept.place === place && kept.curtain === lw.V().timeline.curtainNo, 'the baseline is kept with its Curtain number');
  await lw.ACTS.leave();
  assert.equal(ui.mode, 'solo', 'out of the District');
  const t0 = srv.state.tick;
  srv.state = L.advanceClock(srv.state, L.nextForcedAt(srv.state, srv.state.timelines[tl]) - srv.state.clock + 1); srv.rev++;
  const evs = L.eventsFor(srv.state, ACC, t0);
  const pay = evs.find((e) => e.type === 'payout' && e.whores[0] === wid); const cur = evs.find((e) => e.type === 'curtain' && e.timeline === tl);
  assert.ok(pay && cur && !pay.data.standingOrder && pay.data.place === place && pay.data.rank !== 0 && pay.data.fullPay === true, `her sealed plan went out and lost, full pay (${J(pay && { so: pay.data.standingOrder, place: pay.data.place, rank: pay.data.rank, fullPay: pay.data.fullPay })})`);
  assert.equal(pay.curtain, kept.curtain, 'the payout carries the Curtain number the seal did');
  // the entry payload: more than 200 events wait, the last 200 come, her Curtain among them
  const p = payload({ all: 1, digest: 1, boards: 1 });
  assert.equal(p.eventsGap, true, 'eventsGap'); assert.equal(p.events.length, 200, 'the last 200 events');
  assert.ok(p.events.some((e) => e.id === pay.id) && p.events.some((e) => e.id === cur.id), 'her payout and its Curtain are inside them');
  srv.lossy = false; srv.staleView = null; if (ui.mode === 'arena') lw.leaveArena();
  lw.enterArena(p, 'resume'); await wait(30); await until(() => !ui.cache.busy);
  assert.ok(ui.mode === 'arena' && ui.active === wid, 'in the arena');
  assert.ok(ui.modal && ui.modal.type === 'digest', `the return digest (${ui.modal && ui.modal.type})`);
  assert.ok(ui.replay && ui.replay.wid === wid && ui.replay.cur.id === cur.id && ui.replay.pay.id === pay.id, `the missed Curtain is kept for the replay (${J(ui.replay && { cur: ui.replay.cur.id, pay: ui.replay.pay.id })})`);
  assert.ok(ui.replay.evs.some((e) => e.id === pay.id) && ui.replay.evs.some((e) => e.id === cur.id), 'with its events');
  const hs = ui.modal.data.headlines;
  const i = hs.findIndex((h) => h.type === 'curtain-result' && h.events.includes(pay.id));
  assert.ok(i >= 0, `the CURTAIN CALL for it (${J(hs.map((h) => [h.type, h.events]))})`);
  assert.ok(typeof hs[i].hind === 'string' && hs[i].hind.length > 0, 'the return headline carries the hindsight line');
  const html = sheet();
  assert.equal((html.match(/data-act="replay-night"/g) || []).length, 1, 'one See her last Curtain button');
  assert.match(headlineSeg(html, i), /data-act="replay-night">See her last Curtain</, 'on that headline, matched by its payout');
  const { mark, m0 } = await replayFrom(tl, cur.id);
  assert.equal(ui.result.curtain.curtain, kept.curtain, 'the sealed night');
  assert.match(app.innerHTML, /<div class="clip hind"><b class="h3">What would have won/, `the hindsight line from the kept baseline (${textOf(app.innerHTML).slice(0, 300)})`);
  assert.ok(ui.hind && ui.hind.curtain === kept.curtain, 'the consumed baseline is the sealed night\'s');
  const hs2 = await digestBack(tl, mark, m0);
  assert.ok(!hs2.some((h) => h.type === 'curtain-result' && h.events.includes(pay.id)), `without that CURTAIN CALL (${J(hs2.map((h) => h.type))})`);
  assert.equal(hs2.length, hs.length - 1, 'the other headlines stay');
  lw.go('front'); await wait(10);
  for (let i = 0; i < 6 && printed(); i++) lw.ACTS['hl-close']();
});

test('B3-c: two nights by Standing Order while she was out: the WHILE YOU SLEPT headline carries See her last Curtain and replays only the latest of them; the sheet that comes back keeps the headline without its button, no Standing Order line prints, and its close sends one markSeen at the mark', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const wid = ui.active; const tl = herTl();
  await lw.ACTS.leave();
  assert.equal(ui.mode, 'solo', 'out of the District');
  const nights = [];
  for (let n = 0; n < 2; n++) {
    const t0 = srv.state.tick; curtainOnClock(tl);
    const evs = L.eventsFor(srv.state, ACC, t0);
    nights.push({ cur: evs.find((e) => e.type === 'curtain' && e.timeline === tl), pay: evs.find((e) => e.type === 'payout' && e.whores[0] === wid) });
  }
  assert.ok(nights.every((x) => x.cur && x.pay && x.pay.data.standingOrder), `two Standing Order nights (${J(nights.map((x) => x.pay && x.pay.data.standingOrder))})`);
  await backIn();
  assert.equal(ui.active, wid);
  const hs = ui.modal.data.headlines;
  assert.ok(!hs.some((h) => h.type === 'curtain-result'), `no CURTAIN CALL for a Standing Order night (${J(hs.map((h) => h.type))})`);
  const i = hs.findIndex((h) => h.type === 'standing-order');
  assert.ok(i >= 0 && hs[i].count === 2, `one WHILE YOU SLEPT headline for both nights (${J(hs.map((h) => [h.type, h.count]))})`);
  assert.ok(ui.replay && ui.replay.cur.id === nights[1].cur.id && ui.replay.pay.id === nights[1].pay.id, `the latest night is the one kept (${J(ui.replay && ui.replay.cur.id)}, nights ${J(nights.map((x) => x.cur.id))})`);
  const html = sheet();
  assert.equal((html.match(/data-act="replay-night"/g) || []).length, 1, 'one See her last Curtain button');
  assert.match(headlineSeg(html, i), /data-act="replay-night">See her last Curtain</, 'on the Standing Order headline');
  const { mark, m0 } = await replayFrom(tl, nights[1].cur.id);
  assert.ok(ui.result.pay.standingOrder, 'a Standing Order night');
  assert.notEqual(ui.result.curtain.id, nights[0].cur.id, 'not the older one');
  const hs2 = await digestBack(tl, mark, m0);
  assert.ok(hs2.some((h) => h.type === 'standing-order' && h.count === 2), `the Standing Order headline stays, both nights (${J(hs2.map((h) => [h.type, h.count]))})`);
  assert.equal(hs2.length, hs.length, 'nothing taken out');
  lw.go('front'); await wait(600);
  assert.doesNotMatch(printed(), /went out without you/, `no Standing Order line after a replay (${textOf(printed())})`);
  // the fallback is for a Standing Order night alone: a sealed night whose CURTAIN CALL the sheet's cap cut gets no
  // button on the WHILE YOU SLEPT headline (not one of its nights), while a Standing Order night still does
  const fake = { wid, evs: [], cur: { id: -1 }, pay: { id: -1, data: { standingOrder: false } } };
  const canned = { wid, headlines: hs2, travel: null, truncated: false, mark };
  ui.replay = fake; lw.openModal('digest', canned);
  assert.doesNotMatch(sheet(), /replay-night/, 'no button for a sealed night with no CURTAIN CALL on the sheet');
  fake.pay.data.standingOrder = true; lw.openModal('digest', canned);
  assert.match(headlineSeg(sheet(), hs2.findIndex((h) => h.type === 'standing-order')), /replay-night/, 'the Standing Order headline takes it for a Standing Order night');
  ui.modal.onClose = null; lw.closeModal(); ui.replay = null;
  for (let i = 0; i < 6 && printed(); i++) lw.ACTS['hl-close']();
});

test('B3-f: the replayed edition left by the Menu (Contents, Front page) instead of its own button: the rest of the digest comes back all the same, its close sends the one markSeen at the kept mark, the replay is put away, a later sheet for her (an events gap while she is here) offers no See her last Curtain, and nor does a sheet over an open Assignation', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const wid = ui.active; const tl = herTl();
  await lw.ACTS.leave();
  assert.equal(ui.mode, 'solo', 'out of the District');
  for (let n = 0; n < 2; n++) curtainOnClock(tl);
  await backIn();
  assert.equal(ui.active, wid);
  assert.ok(ui.replay && /data-act="replay-night"/.test(sheet()), 'the return sheet offers the replay');
  const hs0 = ui.modal.data.headlines; const curId = ui.replay.cur.id;
  const { mark, m0 } = await replayFrom(tl, curId);
  // the Purse opens the Menu over the edition; Contents, then Front page
  lw.ACTS.menu({ id: 'stats' }); lw.ACTS['menu-tab']({ id: 'menu' });
  assert.ok(ui.modal && ui.modal.type === 'menu', 'the Menu over the edition');
  lw.ACTS.go({ id: 'front' });
  assert.equal(ui.screen, 'front', 'the front page');
  assert.ok(ui.modal && ui.modal.type === 'digest', `the rest of the digest comes back (${ui.modal && ui.modal.type})`);
  assert.doesNotMatch(sheet(), /replay-night/, 'without the button');
  assert.equal(ui.replay, null, 'the replay is put away');
  assert.equal(ui.result && ui.result.replay, false, 'the edition is a replay no more');
  assert.equal(seenOf(tl).length, m0, 'no markSeen yet');
  lw.closeModal();
  assert.ok(await until(() => seenOf(tl).length > m0 && !ui.cache.busy), 'the markSeen went up');
  const acks = seenOf(tl).slice(m0);
  assert.equal(acks.length, 1, `one markSeen (${J(acks.map((a) => a.args[2]))})`);
  assert.equal(acks[0].args[2], mark, `at the kept mark (${acks[0].args[2]}, mark ${mark})`);
  // a later sheet for her while she is here (an events gap: returnDigest with present): no button
  lw.returnDigest(true);
  assert.ok(ui.modal && ui.modal.type === 'digest', `a later sheet for her (${ui.modal && ui.modal.type})`);
  assert.doesNotMatch(sheet(), /replay-night/, 'offers no replay');
  assert.equal(ui.replay, null, 'nothing kept to offer');
  lw.closeModal(); await until(() => !ui.cache.busy);
  // the return sheet over an open Assignation offers none either (the replay would walk away from the job); once the job
  // is put down the same sheet offers it
  const slot = lw.V().board.find((b) => !b.tourist && !b.refused);
  assert.ok(slot, `a gentleman on her board (${J(lw.V().board.map((b) => [b.gent, b.tourist, b.refused]))})`);
  await lw.ACTS['start-assign']({ id: slot.gent });
  assert.equal(ui.screen, 'assign', 'on the job');
  assert.ok(lw.V().whore.assignation, 'the job is open');
  const fake = { wid, evs: [], cur: { id: -2 }, pay: { id: -2, data: { standingOrder: true } } };
  const canned = { wid, headlines: hs0, travel: null, truncated: false, mark };
  ui.replay = fake; lw.openModal('digest', canned);
  assert.doesNotMatch(sheet(), /replay-night/, 'no replay over an open job');
  ui.modal.onClose = null; lw.closeModal();
  assert.ok(Array.isArray(await lw.act(L.cancelAssignation, ui.active)), 'the job is put down');
  lw.go('front');
  ui.replay = fake; lw.openModal('digest', canned);
  assert.match(sheet(), /replay-night/, 'and offered once the job is down');
  ui.modal.onClose = null; lw.closeModal(); ui.replay = null;
  for (let i = 0; i < 6 && printed(); i++) lw.ACTS['hl-close']();
});

// ---- B3a, the second fix round: the replay walked out of, Go there from a replay, the masthead, the exit label ----
// out of the District, n Standing Order nights on her street, and back in with the return digest open
async function awayNights(tl, n) {
  await lw.ACTS.leave();
  assert.equal(ui.mode, 'solo', 'out of the District');
  for (let i = 0; i < n; i++) curtainOnClock(tl);
  await backIn();
  assert.ok(ui.replay && /data-act="replay-night"/.test(sheet()), 'the return sheet offers the replay');
}
// the text of the edition's exit button
const exitLabel = () => (app.innerHTML.match(/data-act="after-results">([^<]*)</) || [])[1];
// the Curtain number the masthead prints (the gazette sits at the top of the sheet, so the first match is its dateline)
const masthead = () => { const m = app.innerHTML.match(/Curtain No\. (\d+)/); return m ? Number(m[1]) : null; };

test('B3-g: the page goes while a replayed Curtain comes down (a reload, a closed tab): the hindsight baseline stays, back in the sheet offers the replay again and its full sheet prints the hindsight line; a return sheet with that CURTAIN CALL alone ends the replay with Back to the front page and one markSeen at the mark, at once', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const wid = ui.active; const tl = herTl();
  const c0 = curtainFalls(); await lw.poll(true); await editionRead(c0); // one has just fallen: her seal brings no early Curtain
  // a losing plan through the page's own seal (B3-b's recipe): no cards, the host's Kink a secret, full pay, an empty reticule
  const v = lw.V(); const place = v.timeline.places.find((p) => p.open && p.kind !== 'gutter').id;
  const host = v.timeline.rota[0].hosts[place];
  const kg = srv.state.whores[wid].known.gents[host]; if (kg) delete kg.kink;
  srv.state.whores[wid].daily.curtains = 0; srv.state.whores[wid].items = []; srv.rev++;
  await lw.poll(true); await wait(10);
  await lw.ACTS.plan({ id: place });
  assert.equal(ui.screen, 'plan');
  ui.sel = [];
  await lw.ACTS.seal();
  assert.ok(sealedOnServer(), 'the seal landed and holds');
  const kept = ui.hinds[wid];
  assert.ok(kept && kept.place === place && Number.isSafeInteger(kept.curtain), 'the baseline is kept with its Curtain number');
  await lw.ACTS.leave();
  assert.equal(ui.mode, 'solo', 'out of the District');
  const t0 = srv.state.tick; curtainOnClock(tl);
  const evs = L.eventsFor(srv.state, ACC, t0);
  const pay = evs.find((e) => e.type === 'payout' && e.whores[0] === wid); const cur = evs.find((e) => e.type === 'curtain' && e.timeline === tl);
  assert.ok(pay && cur && !pay.data.standingOrder && pay.data.place === place, `her sealed plan went out (${J(pay && { so: pay.data.standingOrder, place: pay.data.place, rank: pay.data.rank })})`);
  assert.equal(cur.curtain, kept.curtain, 'the Curtain the baseline was kept for');
  await backIn();
  assert.ok(ui.replay && ui.replay.cur.id === cur.id && ui.replay.pay.id === pay.id, 'the missed Curtain is kept for the replay');
  assert.ok(ui.modal.data.headlines.some((h) => h.type === 'curtain-result' && h.events.includes(pay.id)), 'its CURTAIN CALL is on the sheet');
  const m0 = seenOf(tl).length;
  lw.ACTS['replay-night']();
  assert.equal(ui.modal, null, 'the digest closed');
  assert.ok(dropping(), 'the curtain is coming down');
  // the page goes while it comes down (a reload, a closed tab): no act goes up, the arena ui is saved as it stands, the
  // baseline among it, and the Curtain stays news (the Leave button's own markSeen would cover her payout, which the log
  // holds before the curtain event, so that road offers no replay again). The unload hook first (pagehide: saveGame),
  // then the page's own way out
  fireWindow('pagehide');
  const stored = JSON.parse(localStorage.getItem(`lw-scandal-arena:${ACC}`));
  assert.ok(stored && stored.hinds && stored.hinds[wid] && stored.hinds[wid].curtain === kept.curtain && stored.hinds[wid].place === place, `the unload save keeps the baseline (${J(stored && stored.hinds)})`);
  lw.leaveArena();
  assert.equal(ui.mode, 'solo', 'out of the District');
  await wait(2800); // past the drop (1.7 s and the 0.65 s lift)
  assert.ok(await until(() => !dropping()), 'the curtain has lifted');
  assert.notEqual(ui.screen, 'results', 'no sheet was drawn');
  assert.equal(seenOf(tl).length, m0, 'nothing was acknowledged');
  assert.ok(ui.hinds[wid] && ui.hinds[wid].curtain === kept.curtain && ui.hinds[wid].place === place, `the baseline survives the replay she walked out of (${J(ui.hinds[wid])})`);
  await backIn();
  assert.ok(ui.replay && ui.replay.cur.id === cur.id, `the missed Curtain is offered again (${J(ui.replay && ui.replay.cur.id)})`);
  assert.ok(ui.hinds[wid] && ui.hinds[wid].curtain === kept.curtain, 'the baseline is still there for it');
  // the return sheet with that CURTAIN CALL alone (a canned copy of it, its mark kept): nothing comes back after the edition
  const d = ui.modal.data; ui.modal.onClose = null; lw.closeModal();
  const only = d.headlines.find((h) => h.type === 'curtain-result' && h.events.includes(pay.id));
  lw.openModal('digest', { ...d, headlines: [only] });
  assert.match(sheet(), /data-act="replay-night"/, 'the lone headline carries the button');
  const { mark, m0: m1 } = await replayFrom(tl, cur.id);
  assert.equal(ui.result.curtain.curtain, kept.curtain, 'the sealed night');
  assert.ok(ui.hind && ui.hind.curtain === kept.curtain && ui.hind.place === place, `the consumed baseline is the sealed night's (${J(ui.hind)})`);
  assert.match(app.innerHTML, /<div class="clip hind">/, `the hindsight line from the kept baseline (${textOf(app.innerHTML).slice(0, 300)})`);
  assert.ok(!ui.hinds[wid], 'consumed once the sheet has drawn');
  assert.equal(exitLabel(), 'Back to the front page', 'nothing left to read: the plain exit');
  lw.ACTS['after-results']();
  assert.equal(ui.screen, 'front', 'the front page');
  assert.ok(!ui.modal || ui.modal.type !== 'digest', `no digest comes back (${ui.modal && ui.modal.type})`);
  assert.ok(await until(() => seenOf(tl).length > m1 && !ui.cache.busy), 'the markSeen went up at once');
  const acks = seenOf(tl).slice(m1);
  assert.equal(acks.length, 1, `one markSeen (${J(acks.map((a) => a.args[2]))})`);
  assert.equal(acks[0].args[2], mark, `at the kept mark (${acks[0].args[2]}, mark ${mark})`);
  if (ui.modal) lw.closeModal(); await until(() => !ui.cache.busy);
  for (let i = 0; i < 6 && printed(); i++) lw.ACTS['hl-close']();
});

test('B3-h: Go there from a replayed edition (the After Hours banner\'s switch), and the same switch through Let her go at last call: one markSeen for the street she left, at the kept mark, never a second at the cursor', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const wid = ui.active; const tl = herTl();
  // a second girl on another street (Z7's recipe)
  const other = Object.keys(C.CHARACTERS).find((id) => C.CHARACTERS[id].role === 'starter' && C.CHARACTERS[id].timeline !== tl);
  srv.state.accounts[ACC].slots = Math.max(2, srv.state.accounts[ACC].slots);
  srv.state = L.openTimeline(srv.state, ACC, other); srv.rev++;
  const second = srv.state.accounts[ACC].whores.find((id) => !srv.state.whores[id].retired && srv.state.whores[id].timeline !== tl);
  assert.ok(second, 'a second girl on another street');
  ui.cache.wantAll = true; await lw.poll(true); await wait(10);
  assert.ok(lw.V(second), 'her view is on hand'); assert.equal(ui.active, wid);
  const switched = async () => {
    assert.ok(await until(() => ui.active === second && ui.screen !== 'results' && !ui.cache.busy, 6000), `with her other girl (${ui.active}, ${ui.screen})`);
    if (ui.modal) lw.closeModal(); await until(() => !ui.cache.busy);
  };
  try {
    // (1) the banner's Go there is the switch itself
    await awayNights(tl, 2);
    assert.equal(ui.active, wid);
    const { mark, m0 } = await replayFrom(tl, ui.replay.cur.id);
    lw.ACTS.switch({ id: second }, null, null, true);
    await switched();
    let acks = seenOf(tl).slice(m0);
    assert.equal(acks.length, 1, `one markSeen for the street she left (${J(acks.map((a) => a.args[2]))})`);
    assert.equal(acks[0].args[2], mark, `at the kept mark (${acks[0].args[2]}, mark ${mark})`);
    assert.equal(ui.replay, null, 'the replay is put away');
    assert.ok(!(ui.result && ui.result.replay), 'the edition is a replay no more');
    // (2) the same switch at last call: Let her go sends the one markSeen, the switch after it none
    lw.ACTS.switch({ id: wid }, null, null, true);
    assert.ok(await until(() => ui.active === wid && !ui.cache.busy, 6000), 'back with her first girl');
    if (ui.modal) lw.closeModal(); await until(() => !ui.cache.busy);
    await awayNights(tl, 2);
    assert.equal(ui.active, wid);
    // her next Curtain due within the last call (10 District minutes in the arena): the clock to 5 minutes before it
    srv.state = L.advanceClock(srv.state, L.nextForcedAt(srv.state, srv.state.timelines[tl]) - srv.state.clock - 5); srv.rev++;
    await lw.poll(true); await wait(10);
    const r2 = await replayFrom(tl, ui.replay.cur.id);
    lw.ACTS.switch({ id: second });
    assert.ok(ui.modal && ui.modal.type === 'confirm', `the last call asks first (${ui.modal && ui.modal.type})`);
    lw.ACTS['lc-let']();
    await switched();
    acks = seenOf(tl).slice(r2.m0);
    assert.equal(acks.length, 1, `one markSeen through Let her go (${J(acks.map((a) => a.args[2]))})`);
    assert.equal(acks[0].args[2], r2.mark, `at the kept mark (${acks[0].args[2]}, mark ${r2.mark})`);
    assert.equal(ui.replay, null, 'the replay is put away');
  } finally {
    // the second girl goes again: the tests after this one have the one girl
    L.retireWhore(srv.state, second); srv.rev++;
  }
  for (let i = 0; i < 6 && printed(); i++) lw.ACTS['hl-close']();
});

test('B3-i: the results masthead names the Curtain the edition reports on, from its Curtain event: the live edition while the view already counts the next Curtain, and after a poll moves it again; the next edition by its own; a replayed edition of an older night', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const tl = herTl();
  const c = curtainFalls(); await lw.poll(true);
  assert.ok(await until(() => ui.screen === 'results' && ui.result && c.curtainIds.includes(ui.result.curtain.id), 6000), 'the edition is shown');
  const k = ui.result.curtain.curtain;
  assert.ok(Number.isSafeInteger(k), 'the Curtain event carries its number');
  assert.equal(lw.V().timeline.curtainNo, k + 1, 'the view already counts the next Curtain');
  assert.equal(masthead(), k + 1, `the live edition names its own Curtain (masthead ${masthead()}, Curtain ${k})`);
  // a Curtain on the server while she reads (its edition waits its turn): the view moves again, the masthead does not
  curtainOnClock(tl); await lw.poll(true); await wait(10);
  assert.equal(ui.screen, 'results', 'still on the edition');
  assert.equal(lw.V().timeline.curtainNo, k + 2, 'the view moved again');
  lw.render();
  assert.equal(masthead(), k + 1, `the masthead stays (${masthead()})`);
  lw.ACTS['after-results']();
  assert.ok(await until(() => ui.screen === 'results' && ui.result && ui.result.curtain.curtain === k + 1, 6000), `the next edition comes down (${ui.screen}, ${J(ui.result && ui.result.curtain.curtain)})`);
  assert.equal(masthead(), k + 2, `named by its own Curtain (${masthead()})`);
  lw.ACTS['after-results'](); lw.go('front'); await wait(10);
  // a replayed edition of an older night
  await awayNights(tl, 2);
  const { mark, m0 } = await replayFrom(tl, ui.replay.cur.id);
  const kr = ui.result.curtain.curtain;
  assert.notEqual(lw.V().timeline.curtainNo, kr, 'the view would name another Curtain');
  assert.equal(masthead(), kr + 1, `the replay names the night it replays (masthead ${masthead()}, Curtain ${kr}, view ${lw.V().timeline.curtainNo})`);
  await digestBack(tl, mark, m0);
  lw.go('front'); await wait(10);
  for (let i = 0; i < 6 && printed(); i++) lw.ACTS['hl-close']();
});

test('B3-j: a replayed edition\'s exit reads Back to your news (the rest of the digest is where it goes), never the promotion or the telegram it keeps for the digest; a live edition keeps its own exit', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const tl = herTl();
  const c = curtainFalls(); await lw.poll(true);
  assert.ok(await until(() => ui.screen === 'results' && ui.result && c.curtainIds.includes(ui.result.curtain.id), 6000), 'the live edition');
  const live = exitLabel();
  assert.ok(live === 'Back to the front page' || live === 'Open your telegram' || /'s promotion$/.test(live), `the live exit is its own (${live})`);
  lw.ACTS['after-results'](); lw.go('front'); await wait(10);
  await awayNights(tl, 2);
  // the kept night promoted her (a promoted event in its slice, as the engine logs one after the payout): a live edition
  // of it would promise her promotion; the replay keeps that for the digest
  const wid = ui.active; const evs = ui.replay.evs;
  const top = evs.reduce((m, e) => (Number.isSafeInteger(e.id) && e.id > m ? e.id : m), 0);
  evs.push({ id: top + 1, type: 'promoted', timeline: tl, whores: [wid], data: { tier: 1, title: '' }, text: '' });
  const { mark, m0 } = await replayFrom(tl, ui.replay.cur.id);
  assert.ok(ui.result.evs.some((e) => e.type === 'promoted' && e.whores[0] === wid), 'the replayed night carries her promotion');
  assert.equal(exitLabel(), 'Back to your news', `the replay's exit (${exitLabel()})`);
  assert.doesNotMatch(app.innerHTML, /'s promotion<|Open your telegram</, 'no promise of the aftermath');
  await digestBack(tl, mark, m0);
  await wait(400); // past the promotion sheet's own delay (aftermath opens it 300 ms after a live edition)
  assert.ok(!ui.modal || ui.modal.type !== 'promo', `no promotion sheet after the digest (${ui.modal && ui.modal.type})`);
  lw.go('front'); await wait(10);
  for (let i = 0; i < 6 && printed(); i++) lw.ACTS['hl-close']();
});

test('B3-k: Seal now at last call from a replayed edition (Go there, then the confirm sheet): the replay is put away, the plan screen opens with her Standing Order pick kept, the rest of the digest comes back over it, and its close sends one markSeen at the kept mark; the seal then lands', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const wid = ui.active; const tl = herTl();
  // a second girl on another street (B3-h's recipe)
  const other = Object.keys(C.CHARACTERS).find((id) => C.CHARACTERS[id].role === 'starter' && C.CHARACTERS[id].timeline !== tl);
  srv.state.accounts[ACC].slots = Math.max(2, srv.state.accounts[ACC].slots);
  srv.state = L.openTimeline(srv.state, ACC, other); srv.rev++;
  const second = srv.state.accounts[ACC].whores.find((id) => !srv.state.whores[id].retired && srv.state.whores[id].timeline !== tl);
  assert.ok(second, 'a second girl on another street');
  ui.cache.wantAll = true; await lw.poll(true); await wait(10);
  assert.ok(lw.V(second), 'her view is on hand'); assert.equal(ui.active, wid);
  try {
    await awayNights(tl, 2);
    assert.equal(ui.active, wid);
    // her next Curtain due within the last call: the clock to 5 minutes before it
    srv.state = L.advanceClock(srv.state, L.nextForcedAt(srv.state, srv.state.timelines[tl]) - srv.state.clock - 5); srv.rev++;
    await lw.poll(true); await wait(10);
    const { mark, m0 } = await replayFrom(tl, ui.replay.cur.id);
    const rest = ui.replay.digest.headlines.filter((h) => !(h.type === 'curtain-result' && h.events.includes(ui.replay.pay.id))).length;
    assert.ok(rest > 0, `the digest has more to read (${rest})`);
    const pick = L.standingOrderPick(lw.V());
    lw.ACTS.switch({ id: second });
    assert.ok(ui.modal && ui.modal.type === 'confirm', `the last call asks first (${ui.modal && ui.modal.type})`);
    await lw.ACTS['lc-seal']();
    assert.equal(ui.replay, null, 'the replay is put away');
    assert.ok(!(ui.result && ui.result.replay), 'the edition is a replay no more');
    assert.equal(ui.active, wid, 'still with her');
    assert.equal(ui.screen, 'plan', 'the plan screen');
    assert.equal(ui.place, pick.place, 'her Standing Order Place');
    assert.deepEqual(ui.sel, pick.cards, 'and its cards');
    assert.ok(ui.modal && ui.modal.type === 'digest', `the rest of the digest comes back over the plan (${ui.modal && ui.modal.type})`);
    assert.equal(ui.modal.data.headlines.length, rest, 'the headlines left to read');
    assert.doesNotMatch(sheet(), /replay-night/, 'no See her last Curtain on the sheet that comes back');
    assert.equal(seenOf(tl).length, m0, 'still no markSeen');
    lw.closeModal();
    assert.ok(await until(() => seenOf(tl).length > m0 && !ui.cache.busy), 'the markSeen went up');
    const acks = seenOf(tl).slice(m0);
    assert.equal(acks.length, 1, `one markSeen (${J(acks.map((a) => a.args[2]))})`);
    assert.equal(acks[0].args[2], mark, `at the kept mark (${acks[0].args[2]}, mark ${mark})`);
    assert.equal(ui.screen, 'plan', 'the plan screen is still hers');
    assert.equal(ui.place, pick.place, 'with the Place kept');
    ui.slumOk = true; ui.shortOk = true; // past the seal's own asks (a gutter Place, a play short of the Bar)
    await lw.ACTS.seal();
    const sealed = srv.acts.filter((a) => a.action === 'sealPlan').pop();
    assert.ok(sealed && sealed.args[0] === wid && sealed.args[1].place === pick.place, `her seal went out with the kept pick (${J(sealed && sealed.args)})`);
    assert.deepEqual(sealed.args[1].cards, pick.cards, 'and its cards');
    // at last call everyone else has sealed: her seal closes the Curtain at once, and its edition is a live one
    assert.ok(await until(() => ui.screen === 'results' && ui.result && !ui.result.replay && !ui.cache.busy, 6000), `her Curtain fell with the seal (${ui.screen})`);
    assert.ok(ui.result.pay.place === pick.place && !ui.result.pay.standingOrder, `she went out on her own seal (${J({ place: ui.result.pay.place, so: ui.result.pay.standingOrder })})`);
    lw.ACTS['after-results']();
    if (ui.modal) lw.closeModal(); await until(() => !ui.cache.busy);
  } finally {
    // the second girl goes again: the tests after this one have the one girl
    L.retireWhore(srv.state, second); srv.rev++;
  }
  lw.go('front'); await wait(10);
  for (let i = 0; i < 6 && printed(); i++) lw.ACTS['hl-close']();
});

test('B3-l: a Curtain falls on the server while a replayed edition is read: Back to your news brings the rest of the digest, the queued Curtain waits for its close (no drop, no markSeen over the sheet), the close sends the one markSeen at the kept mark, and then the queued edition comes down as a live one', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  const tl = herTl();
  await awayNights(tl, 2);
  const { mark, m0 } = await replayFrom(tl, ui.replay.cur.id);
  const rest = ui.replay.digest.headlines.filter((h) => !(h.type === 'curtain-result' && h.events.includes(ui.replay.pay.id))).length;
  assert.ok(rest > 0, `the digest has more to read (${rest})`);
  // a Curtain on the server while she reads the replay (B3-i's move): its edition waits its turn
  const ids = curtainOnClock(tl); await lw.poll(true); await wait(10);
  assert.equal(ids.length, 1, `one Curtain (${J(ids)})`);
  assert.equal(ui.screen, 'results', 'still on the replayed edition');
  assert.ok(ui.result.replay, 'the replay');
  assert.equal(exitLabel(), 'Back to your news', `the exit still promises the news (${exitLabel()})`);
  lw.ACTS['after-results']();
  await wait(30);
  assert.ok(ui.modal && ui.modal.type === 'digest', `the rest of the digest stays up while the queued Curtain waits (${ui.modal && ui.modal.type}, ${ui.screen}, dropping ${dropping()})`);
  assert.equal(ui.modal.data.headlines.length, rest, 'the headlines left to read');
  assert.ok(!dropping(), 'no curtain comes down over it');
  assert.equal(seenOf(tl).length, m0, 'no markSeen over the sheet');
  lw.closeModal();
  assert.ok(await until(() => seenOf(tl).length > m0, 3000), 'the markSeen went up');
  assert.equal(seenOf(tl)[m0].args[2], mark, `at the kept mark (${seenOf(tl)[m0].args[2]}, mark ${mark})`);
  // then the queued edition: the Curtain that fell while she read, live, with its own markSeen after it
  assert.ok(await until(() => ui.screen === 'results' && ui.result && ui.result.curtain.id === ids[0], 6000), `the queued edition comes down (${ui.screen}, ${J(ui.result && ui.result.curtain.id)})`);
  assert.ok(!ui.result.replay, 'a live edition');
  assert.ok(await until(() => seenOf(tl).length > m0 + 1 && !ui.cache.busy, 6000), 'its own markSeen went up');
  const acks = seenOf(tl).slice(m0);
  assert.equal(acks.length, 2, `two markSeens in all (${J(acks.map((a) => a.args[2]))})`);
  assert.ok(acks[1].args[2] >= ids[0], `the second at the Curtain she just watched (${acks[1].args[2]}, Curtain ${ids[0]})`);
  lw.ACTS['after-results']();
  if (ui.modal) lw.closeModal(); await until(() => !ui.cache.busy);
  lw.go('front'); await wait(10);
  for (let i = 0; i < 6 && printed(); i++) lw.ACTS['hl-close']();
});

// ---- B3a: the tourist's dogear (backlog 20) ----
test('B3-d: a hold on a tourist\'s dogear opens his card with one plain line under his voice line, "He\'s a tourist: nothing hidden. He likes {Art}.", from the job screen\'s own dogear too; a gentleman\'s dogear still opens his card and prints no tourist line', async () => {
  await enter(); lw.go('front');
  await lw.poll(true); await wait(10);
  assert.equal(typeof lw.hold, 'function', 'the page exports hold on window.__lw');
  const t = lw.V().timeline.tourist;
  assert.ok(t && C.TOURISTS[t.id] && C.ARTS[t.taste], `a tourist stands on her street (${J(t && t.id)})`);
  const line = `He's a tourist: nothing hidden. He likes ${C.ARTS[t.taste].name}.`;
  const closeAll = () => { if (ui.modal) lw.closeModal(); for (let i = 0; i < 6 && printed(); i++) lw.ACTS['hl-close'](); };
  // (a) the hold itself, with his voice line free to print: the plain line sits under it, and the old paragraph is gone
  delete ui.voices[t.id];
  lw.hold(`tourist:${t.id}`);
  assert.ok(ui.modal && ui.modal.type === 'result', `his card opened (${ui.modal && ui.modal.type})`);
  const html = sheet(); const txt = textOf(html);
  assert.ok(txt.includes(line), `the plain line with the Art name (${line}) in: ${txt}`);
  assert.equal((txt.match(/He's a tourist/g) || []).length, 1, 'once');
  const deck = html.indexOf('<p class="deck">');
  assert.ok(deck >= 0 && html.indexOf(line) > deck, `his voice line prints first and the plain line sits under it (deck at ${deck}, line at ${html.indexOf(line)})`);
  assert.ok(!/You can't fail with him|Delight him for extra Renown/.test(txt), `the old paragraph is gone (${txt})`);
  assert.ok(!txt.includes(t.aside), 'and his aside is not repeated under his voice line');
  closeAll();
  // (b) from the job screen: his dogear carries the tourist spec and the page's own tap handler opens the same line
  const slot = lw.V().board.find((b) => b.tourist && !b.refused);
  assert.ok(slot, `a tourist on her board (${J(lw.V().board.map((b) => [b.gent, b.tourist]))})`);
  await lw.ACTS['start-assign']({ id: slot.gent });
  assert.equal(ui.screen, 'assign', 'the tourist\'s job screen');
  assert.ok(app.innerHTML.includes(`data-flip="tourist:${slot.gent}"`), 'his dogear on the job screen names him');
  const flipEl = { dataset: { flip: `tourist:${slot.gent}` } };
  for (const f of docOn.click || []) f({ target: { closest: (q) => (q === '[data-flip]' ? flipEl : null) }, preventDefault() {}, stopPropagation() {} });
  assert.ok(ui.modal && ui.modal.type === 'result', 'the dogear tap opened his card');
  assert.ok(textOf(sheet()).includes(`He's a tourist: nothing hidden. He likes ${C.ARTS[C.TOURISTS[slot.gent].taste].name}.`), `the same line from the tap (${textOf(sheet())})`);
  closeAll();
  assert.ok(Array.isArray(await lw.act(L.cancelAssignation, ui.active)), 'the job is put down again');
  lw.go('front'); await wait(10);
  // (c) a gentleman's dogear is unchanged: his card, flipped, with none of the tourist's words
  const g = lw.V().timeline.gents[0];
  lw.hold(`gent:${g.id}`);
  assert.ok(ui.modal && ui.modal.type === 'gent' && ui.modal.data === g.id && ui.modal.flipped, `his card opened flipped (${J(ui.modal && [ui.modal.type, ui.modal.data, ui.modal.flipped])})`);
  assert.ok(!/He's a tourist|nothing hidden/.test(textOf(sheet())), 'no tourist line on a gentleman\'s card');
  assert.ok(ui.steps.has('flip'), 'the flip lesson still counts');
  closeAll();
});

// B3b (spec-B3 17i): guests play in the District. The page's forms are planted under their ids (byId) so the page reads
// what was typed; the mock keeps every guest and keep body as it went up, so the test reads exactly what the wire saw.
test('B3-e: Play as guest posts {name} alone (a good typed name as typed, an empty or bad field a random one, rerolled twice at most on name-taken so three requests fit the hour\'s count, then the server\'s words), lands on the arrival card with Skip to the District and the District after it; guests-full at the join prints the front desk\'s full line on the title; both guest screens print the kept-until line with the locale date; a guest\'s name never becomes the device\'s last name; Keep this game posts {name, password} and the page then reads as a kept account (no kept-until line, Log out no longer asks, the kept name is the device\'s last name); a guest with no girl logs out from the ask\'s own button with nothing under Logged out; a device with a solo save keeps its carry-on button', async () => {
  if (ui.mode === 'arena') lw.leaveArena();
  if (ui.modal) lw.closeModal();
  const closeLines = () => { for (let i = 0; i < 8 && printed(); i++) lw.ACTS['hl-close'](); };
  closeLines();
  localStorage.removeItem('lw-scandal-game'); ui.S = null; ui.active = null; ui.welcome = null;
  ui.met = true; localStorage.setItem('lw-scandal-met', 'true'); // a device that has played: the suspects, not the Morning Edition
  // the Create account field and its form as the title draws them, and the Keep this game form (each with its status line)
  const nameEl = el('input'); const line = el('p'); const signupForm = el('form'); signupForm.id = 'signup';
  signupForm.querySelector = (q) => (q === '.formline' ? line : null); signupForm.querySelectorAll = () => [];
  const keepName = el('input'); const keepPw = el('input'); const keepLine = el('p'); const keepForm = el('form'); keepForm.id = 'keep';
  keepForm.querySelector = (q) => (q === '.formline' ? keepLine : null); keepForm.querySelectorAll = () => [];
  const weekMs = 7 * 24 * 3600 * 1000;
  const names = allNames();
  const sentNames = (from) => srv.guests.slice(from).map((b) => JSON.parse(b).name);
  const g0 = srv.guests.length; const k0 = srv.keeps.length;
  try {
    await lw.net.signOut();
    assert.equal(lw.net.account().name, null, 'signed out: a device with no game');
    localStorage.setItem('lw-scandal-lastname', J('Ruby_Buckshot')); // what the device remembers: never in a guest body
    byId['signup-name'] = nameEl; byId.signup = signupForm; ui.authMode = 'signup';
    // (1) a good typed name goes up as typed, alone
    nameEl.value = 'Typed_Guest'; srv.guestExpiresAt = Date.now() + weekMs; srv.guestTaken = 0; srv.guestLeft = 3; srv.joinFull = false;
    await lw.ACTS['guest-play']();
    assert.equal(srv.guests.length - g0, 1, 'Play as guest posts /api/guest once');
    assert.equal(localStorage.getItem('lw-scandal-lastname'), J('Ruby_Buckshot'), 'a guest\'s name never becomes the device\'s last name: no password logs it in');
    assert.deepEqual(JSON.parse(srv.guests[g0]), { name: 'Typed_Guest' }, 'the body is {name} alone, the typed name as typed');
    assert.ok(!/Ruby_Buckshot|pabcdefghij|lw-scandal/.test(srv.guests[g0]), `nothing this device holds goes up (${srv.guests[g0]})`);
    assert.equal(typeof lw.S.KEPT_UNTIL, 'function', 'S.KEPT_UNTIL prints the kept-until line');
    const kept = lw.S.KEPT_UNTIL(srv.guestExpiresAt);
    assert.match(kept, /^Kept until .+ unless you keep it\. Seven days after your last visit\.$/, kept);
    assert.equal(kept, `Kept until ${new Date(srv.guestExpiresAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} unless you keep it. Seven days after your last visit.`, 'the date is the expiry /api/me sent, in the device\'s locale');
    const a1 = lw.net.account();
    assert.ok(a1.name === 'Typed_Guest' && a1.guest === true && a1.guestExpiresAt === srv.guestExpiresAt, `a guest, with the expiry /api/me sent (${J(a1)})`);
    assert.equal(ui.screen, 'pick', 'the suspects, as a sign-up on a device that has played');
    assert.ok(textOf(printed()).includes(kept), `the welcome prints the kept-until line (${textOf(printed())})`);
    closeLines();
    // the arrival card with Skip to the District, and the District after it
    ui.pickId = 'dolly'; lw.ACTS.hire();
    assert.ok(ui.welcome && ui.welcome.starter === 'dolly', 'a guest hires as a signed-up player does: the rehearsal');
    assert.ok(ui.modal && ui.modal.type === 'result' && sheet().includes('data-act="welcome-skip"') && /Skip to the District/.test(textOf(sheet())), `the arrival card with Skip to the District (${ui.modal && ui.modal.type})`);
    const joins0 = srv.joins; srv.joinOk = true;
    lw.ACTS['welcome-skip']();
    assert.ok(await until(() => ui.mode === 'arena' && !!ui.active, 4000), 'Skip lands her in the District');
    assert.equal(srv.joins - joins0, 1, 'one join');
    assert.ok(ui.modal && ui.modal.type === 'arrive', `the arrival card in the District (${ui.modal && ui.modal.type})`);
    lw.closeModal();
    // (2) the title desk as a guest: the kept-until line on the Keep this game form, and Log out asks first
    lw.leaveArena(); lw.go('title');
    const desk = app.innerHTML;
    assert.ok(desk.includes('id="keep"') && /Keep this game/.test(desk), 'the title desk carries the Keep this game form');
    assert.ok(textOf(desk).includes(kept), `and the kept-until line (${textOf(desk)})`);
    const lo0 = srv.logouts;
    await lw.ACTS['sign-out']();
    assert.ok(ui.modal && ui.modal.type === 'guest-out', `Log out asks first (${ui.modal && ui.modal.type})`);
    assert.equal(srv.logouts, lo0, 'nothing was posted');
    // fix round 5 of batch 3b: the ask carries the no-password line, not the kept-until date (B3-q has the line verbatim)
    assert.ok(textOf(sheet()).includes(lw.S.GUEST_OUT) && !textOf(sheet()).includes('Kept until'), `the ask carries the no-password line and no kept-until date (${textOf(sheet())})`);
    assert.ok(sheet().includes('data-act="sign-out" data-id="sure"'), 'and its own Log out button');
    lw.closeModal();
    assert.equal(lw.net.account().name, 'Typed_Guest', 'still signed in');
    // (3) Keep this game posts {name, password} through the form's submit; the page then reads as a kept account
    byId['keep-name'] = keepName; byId['keep-password'] = keepPw; byId.keep = keepForm;
    keepName.value = 'Kept_Guest'; keepPw.value = 'corsets and cognac';
    assert.ok(docOn.submit && docOn.submit.length, 'the page listens for a submit');
    for (const f of docOn.submit) f({ target: keepForm, preventDefault() {} });
    assert.ok(await until(() => srv.keeps.length === k0 + 1), 'one keep went up');
    assert.deepEqual(JSON.parse(srv.keeps[k0]), { name: 'Kept_Guest', password: 'corsets and cognac' }, 'the body is {name, password}');
    assert.ok(await until(() => lw.net.account().name === 'Kept_Guest' && lw.net.account().guest === false), `a kept account (${J(lw.net.account())})`);
    assert.equal(lw.net.account().guestExpiresAt, null, 'no expiry any more');
    assert.equal(localStorage.getItem('lw-scandal-lastname'), J('Kept_Guest'), 'the keep writes the kept name as the device\'s last name');
    lw.go('title');
    assert.ok(!app.innerHTML.includes('id="keep"') && !textOf(app.innerHTML).includes('Kept until'), `no kept-until line and no Keep this game form once kept (${textOf(app.innerHTML)})`);
    closeLines();
    await lw.ACTS['sign-out']();
    assert.ok(!ui.modal, `Log out no longer asks (${ui.modal && ui.modal.type})`);
    assert.equal(srv.logouts, lo0 + 1, 'and logs her out at once');
    assert.equal(lw.net.account().name, null);
    closeLines();
    // (4) an empty or bad field sends a random name; name-taken rerolls twice at most, then it stops with the server's
    // words: three requests fit the server's three an hour for one address (every request counts, a refused name too),
    // so the page never spends a request that could only be refused. Each scenario plays in a fresh hour (guestLeft 3).
    const g1 = srv.guests.length;
    nameEl.value = 'x!'; srv.guestTaken = 2; srv.guestLeft = 3; srv.guest = false; srv.guestExpiresAt = Date.now() + weekMs; ui.authMode = 'signup';
    await lw.ACTS['guest-play']();
    assert.equal(srv.guests.length - g1, 3, `a bad field: the random name, then two rerolls on name-taken (${J(sentNames(g1))})`);
    assert.ok(sentNames(g1).every((n) => names.includes(n)), `every name sent is one names.js prints (${J(sentNames(g1))})`);
    assert.ok(sentNames(g1).every((n, i, all) => i === 0 || n !== all[i - 1]), 'each reroll differs from the one before');
    assert.ok(lw.net.account().guest === true && lw.net.account().name === sentNames(g1)[2], `the third is hers (${J(lw.net.account())})`);
    assert.equal(ui.screen, 'pick');
    closeLines();
    await lw.net.signOut(); lw.go('title');
    const g2 = srv.guests.length;
    nameEl.value = ''; srv.guestTaken = 99; srv.guestLeft = 3; srv.guest = false;
    await lw.ACTS['guest-play']();
    assert.equal(srv.guests.length - g2, 3, `an empty field: the random name and two rerolls, then it stops inside the hour's three (${J(sentNames(g2))})`);
    assert.equal(lw.net.account().name, null, 'not signed in');
    assert.equal(line.textContent, 'That name is already on the street.', 'the server\'s words in the form: name-taken, never the limiter\'s');
    assert.equal(ui.screen, 'title', 'and she is still on the title');
    // (4b) the guest rooms are full at her first join (503 guests-full, the server's only guests-full point, 17d): the
    // front desk's full line on the title, as world-full prints it, never the wire's "can't reach" line; she stays a
    // guest with no girl, and logging out from the ask's own button prints Logged out with nothing under it (no girl in
    // the District, no game on this device)
    closeLines();
    const g3 = srv.guests.length;
    nameEl.value = 'Full_Guest'; srv.guestTaken = 0; srv.guestLeft = 3; srv.guest = false; srv.member = false; srv.guestExpiresAt = Date.now() + weekMs;
    await lw.ACTS['guest-play']();
    assert.equal(srv.guests.length - g3, 1, 'one post'); assert.equal(lw.net.account().name, 'Full_Guest');
    assert.equal(ui.screen, 'pick');
    closeLines();
    ui.pickId = 'dolly'; lw.ACTS.hire();
    assert.ok(ui.modal && ui.modal.type === 'result' && sheet().includes('data-act="welcome-skip"'), 'the arrival card');
    const joins1 = srv.joins; srv.joinFull = true;
    lw.ACTS['welcome-skip']();
    assert.ok(await until(() => srv.joins === joins1 + 1 && ui.screen === 'title' && !ui.welcome, 4000), `guests-full at the join leaves her on the title (${ui.screen})`);
    assert.ok(ui.mode !== 'arena' && !ui.active, 'not in the District');
    const fullSaid = textOf(printed());
    assert.ok(fullSaid.includes(lw.S.FULL_LINE.head) && fullSaid.includes(lw.S.FULL_LINE.sub), `the front desk's full line, world-full's (${fullSaid})`);
    assert.ok(!/Can't reach/.test(fullSaid), `never the wire's line: the server answered (${fullSaid})`);
    assert.ok(lw.net.account().guest === true && lw.net.account().name === 'Full_Guest' && !lw.net.account().member, `still a guest, no girl (${J(lw.net.account())})`);
    assert.equal(localStorage.getItem('lw-scandal-lastname'), J('Kept_Guest'), 'her name is not the device\'s last name: that is still the name kept in (3)');
    closeLines();
    const lo1 = srv.logouts;
    await lw.ACTS['sign-out']();
    assert.ok(ui.modal && ui.modal.type === 'guest-out', 'Log out asks first');
    await lw.ACTS['sign-out']({ id: 'sure' });
    assert.equal(srv.logouts, lo1 + 1, 'the ask\'s own button logs her out');
    assert.ok(!ui.modal, 'the ask is gone'); assert.equal(lw.net.account().name, null);
    const outSaid = textOf(printed());
    assert.ok(/Logged out/.test(outSaid), `Logged out (${outSaid})`);
    assert.ok(!/guest game stays|girls stay in the District/.test(outSaid), `and nothing under it: no girl, no game on this device (${outSaid})`);
    assert.equal(localStorage.getItem('lw-scandal-lastname'), J('Kept_Guest'), 'the device still remembers the name it last kept');
    closeLines();
    // (5) a device with a solo save keeps its carry-on button: Continue signed out, Play your guest game signed in
    delete byId['signup-name']; delete byId.signup;
    ui.name = 'Solo_Guest'; lw.hire('dolly');
    assert.ok(ui.S && ui.active === 'dolly' && !ui.welcome, 'a solo game on this device');
    if (ui.modal) { ui.modal.onClose = null; lw.closeModal(); }
    lw.saveGame();
    assert.ok(localStorage.getItem('lw-scandal-game'), 'saved on this device');
    ui.S = null; ui.active = null; lw.go('title');
    assert.ok(app.innerHTML.includes('data-act="resume"') && /Continue your scandal/.test(app.innerHTML), 'signed out: Continue your scandal');
    assert.ok(!app.innerHTML.includes('data-act="guest-play"'), 'and no Play as guest beside a game on this device');
    srv.user = 'Ruby_Buckshot'; srv.guest = false; srv.member = true; srv.guestExpiresAt = null;
    await lw.net.adopt({ name: 'Ruby_Buckshot', member: true });
    lw.go('title');
    assert.ok(app.innerHTML.includes('data-act="guest-play"') && app.innerHTML.includes(lw.S.GUEST_GHOST), `signed in: ${lw.S.GUEST_GHOST}`);
    assert.ok(!textOf(app.innerHTML).includes('Kept until'), 'a kept account: no kept-until line');
    // (6) signed in with no game on this device, Play as guest never posts /api/guest (a second account would delete
    // this session, as any sign-up does): her girl goes to the District the way a signed-in page's does
    localStorage.removeItem('lw-scandal-game'); ui.S = null; ui.active = null; lw.go('title');
    const g6 = srv.guests.length;
    await lw.ACTS['guest-play']();
    assert.equal(srv.guests.length, g6, 'signed in: no /api/guest went up');
    assert.equal(lw.net.account().name, 'Ruby_Buckshot', 'and the session is the same');
    assert.equal(ui.screen, 'pick', 'the suspects, as ACTS.begin takes a signed-in page with no girl');
  } finally {
    srv.guestTaken = 0; srv.guestLeft = 3; srv.joinFull = false; srv.joinOk = false; srv.guest = false; srv.guestExpiresAt = null; srv.member = true; srv.user = 'Ruby_Buckshot';
    for (const k of ['signup-name', 'signup', 'keep-name', 'keep-password', 'keep']) delete byId[k];
    localStorage.removeItem('lw-scandal-game'); ui.S = null; ui.active = null; ui.welcome = null; ui.authMode = undefined;
    if (ui.modal) lw.closeModal();
    if (ui.mode === 'arena') lw.leaveArena();
    await lw.net.adopt({ name: 'Ruby_Buckshot', member: true });
    closeLines();
  }
  assert.equal(lw.net.account().name, 'Ruby_Buckshot');
});

test('B3-m (the code review of batch 3b): a GET /api/me sent before the keep and answered after it (the page-load read, held on the wire) does not bring the guest back: the page keeps the kept name with no guest flag and no date; the keep moves no sign-in generation, so a pending act\'s 401 fence stands', async () => {
  if (ui.mode === 'arena') lw.leaveArena();
  if (ui.modal) lw.closeModal();
  const weekMs = 7 * 24 * 3600 * 1000;
  try {
    srv.user = 'Held_Guest'; srv.guest = true; srv.guestExpiresAt = Date.now() + weekMs; srv.member = false;
    await lw.net.adopt({ name: 'Held_Guest', guest: true, guestExpiresAt: srv.guestExpiresAt, member: false });
    const g = lw.net.account();
    assert.ok(g.name === 'Held_Guest' && g.guest === true && g.guestExpiresAt === srv.guestExpiresAt, `a guest (${J(g)})`);
    const gen0 = lw.net.authGen();
    let release; srv.holdMe = new Promise((r) => { release = r; });
    const early = lw.net.start(); // the page-load read: sent as a guest, held on the wire
    await wait(10);
    assert.equal(srv.holdMe, null, 'the read is out and held');
    const kp = await lw.net.keep('Kept_Held', 'corsets and cognac');
    assert.ok(kp.ok, `the keep (${kp.code})`);
    await lw.net.kept(kp.data.user);
    const k = lw.net.account();
    assert.ok(k.name === 'Kept_Held' && k.guest === false && k.guestExpiresAt === null, `kept (${J(k)})`);
    release(); await early;
    const a = lw.net.account();
    assert.equal(a.name, 'Kept_Held', `the held answer names the guest she no longer is: the page keeps the kept name (${J(a)})`);
    assert.equal(a.guest, false, 'no guest flag'); assert.equal(a.guestExpiresAt, null, 'no date');
    assert.equal(lw.net.authGen(), gen0, 'the keep moved no sign-in generation: the session is the same one');
    // a read sent after the keep lands as usual
    await lw.net.start();
    assert.equal(lw.net.account().name, 'Kept_Held');
  } finally {
    srv.holdMe = null; srv.user = 'Ruby_Buckshot'; srv.guest = false; srv.guestExpiresAt = null; srv.member = true;
    await lw.net.adopt({ name: 'Ruby_Buckshot', member: true });
  }
  assert.equal(lw.net.account().name, 'Ruby_Buckshot');
});

test('B3-n (the code review of batch 3b): the Keep this game fields take the shared input handling: a space typed in the stage name becomes an underscore as she types, not only at the submit, a committed composition is tidied too, and a keystroke in either field clears the form\'s status line and the password\'s error', async () => {
  const keepName = el('input'); keepName.id = 'keep-name'; const keepPw = el('input'); keepPw.id = 'keep-password';
  const keepLine = el('p'); const keepForm = el('form'); keepForm.id = 'keep';
  keepForm.querySelector = (q) => (q === '.formline' ? keepLine : null); keepForm.querySelectorAll = () => [];
  keepName.form = keepForm; keepPw.form = keepForm;
  assert.ok(docOn.input && docOn.input.length && docOn.compositionend && docOn.compositionend.length, 'the page listens for input and compositionend');
  const type = (target) => { for (const f of docOn.input) f({ target, isComposing: false }); };
  keepName.value = 'Kept Guest'; keepLine.textContent = 'That name\'s taken.';
  type(keepName);
  assert.equal(keepName.value, 'Kept_Guest', 'the space becomes an underscore as she types');
  assert.equal(keepLine.textContent, '', 'the status line clears: it was about what was typed before');
  keepName.value = 'Kept Guest';
  for (const f of docOn.input) f({ target: keepName, isComposing: true });
  assert.equal(keepName.value, 'Kept Guest', 'not mid-composition');
  for (const f of docOn.compositionend) f({ target: keepName });
  assert.equal(keepName.value, 'Kept_Guest', 'tidied when the word is committed');
  keepPw.setAttribute('aria-invalid', 'true'); keepLine.textContent = 'Too short. At least 8 characters.';
  type(keepPw);
  assert.equal(keepPw.getAttribute('aria-invalid'), null, 'the password\'s error clears');
  assert.equal(keepLine.textContent, '', 'and the status line');
});

test('B3-o (the fix round of batch 3b): Keep this game answered 403 not-guest (the account was kept in another tab, under a name this page does not know): the page reads the account again and wears the name the server confirms, on the page and on the solo save on this device, never the old guest name or the one typed; one /api/me goes up, the page reads as a kept account, and the kept name is the device\'s last name', async () => {
  if (ui.mode === 'arena') lw.leaveArena();
  if (ui.modal) lw.closeModal();
  const weekMs = 7 * 24 * 3600 * 1000;
  const keepName = el('input'); const keepPw = el('input'); const keepLine = el('p'); const keepForm = el('form'); keepForm.id = 'keep';
  keepForm.querySelector = (q) => (q === '.formline' ? keepLine : null); keepForm.querySelectorAll = () => [];
  const saved = () => JSON.parse(localStorage.getItem('lw-scandal-game'));
  const k0 = srv.keeps.length;
  try {
    // a solo game saved on this device (signed out, as B3-e makes one), not in play, then the page signed in as a
    // guest: the save wears her guest name
    await lw.net.signOut();
    localStorage.removeItem('lw-scandal-game'); ui.S = null; ui.active = null; ui.welcome = null;
    ui.name = 'Solo_Name'; lw.hire('dolly');
    assert.ok(ui.S && ui.active === 'dolly' && !ui.welcome, 'a solo game on this device');
    if (ui.modal) { ui.modal.onClose = null; lw.closeModal(); }
    lw.saveGame();
    ui.S = null; ui.active = null; lw.go('title');
    assert.ok(saved() && saved().S.accounts.you, 'a solo save on this device');
    srv.user = 'Old_Guest'; srv.guest = true; srv.guestExpiresAt = Date.now() + weekMs; srv.member = false;
    await lw.net.adopt({ name: 'Old_Guest', guest: true, guestExpiresAt: srv.guestExpiresAt, member: false });
    assert.ok(lw.net.account().guest === true && lw.net.account().name === 'Old_Guest', `a guest (${J(lw.net.account())})`);
    assert.equal(ui.name, 'Old_Guest'); assert.equal(saved().S.accounts.you.name, 'Old_Guest', 'the save wears the guest name, as the page does');
    // the account is kept in another tab under a name of its own; this page still reads as the guest
    srv.user = 'Actually_Kept'; srv.guest = false; srv.guestExpiresAt = null;
    const me0 = srv.meRequests;
    byId['keep-name'] = keepName; byId['keep-password'] = keepPw; byId.keep = keepForm;
    keepName.value = 'Typed_Name'; keepPw.value = 'corsets and cognac';
    for (const f of docOn.submit) f({ target: keepForm, preventDefault() {} });
    assert.ok(await until(() => srv.keeps.length === k0 + 1), 'one keep went up');
    assert.deepEqual(JSON.parse(srv.keeps[k0]), { name: 'Typed_Name', password: 'corsets and cognac' });
    assert.ok(await until(() => lw.net.account().name === 'Actually_Kept' && lw.net.account().guest === false), `the account read again: the kept name, no guest flag (${J(lw.net.account())})`);
    await wait(20);
    assert.equal(srv.meRequests, me0 + 1, 'one /api/me: the reconcile');
    assert.equal(ui.name, 'Actually_Kept', `the page wears the name the server confirms, never the old guest name or the one typed (${ui.name})`);
    assert.equal(saved().S.accounts.you.name, 'Actually_Kept', `the solo save too (${saved().S.accounts.you.name})`);
    assert.equal(saved().ui.name, 'Actually_Kept');
    assert.equal(lw.net.account().guestExpiresAt, null, 'no date');
    assert.equal(localStorage.getItem('lw-scandal-lastname'), J('Actually_Kept'), 'the kept name is the device\'s last name');
    assert.equal(keepLine.textContent, '', 'nothing in the form\'s line: there is nothing to announce');
    lw.go('title');
    assert.ok(!app.innerHTML.includes('id="keep"') && !textOf(app.innerHTML).includes('Kept until'), `the page reads as a kept account (${textOf(app.innerHTML)})`);
  } finally {
    for (const k of ['keep-name', 'keep-password', 'keep']) delete byId[k];
    localStorage.removeItem('lw-scandal-game'); ui.S = null; ui.active = null; ui.welcome = null; ui.authMode = undefined;
    if (ui.modal) lw.closeModal();
    srv.user = 'Ruby_Buckshot'; srv.guest = false; srv.guestExpiresAt = null; srv.member = true;
    await lw.net.adopt({ name: 'Ruby_Buckshot', member: true });
    for (let i = 0; i < 8 && printed(); i++) lw.ACTS['hl-close']();
  }
  assert.equal(lw.net.account().name, 'Ruby_Buckshot');
});

test('B3-p (fix round 4 of batch 3b): the pick page greys a street a guest cannot take: GET /api/me open (the starters whose streets have a seat and a guest seat for her, the list a 503 timeline-full carries) leaves one out, so its suspect reads Full tonight though the count is under the cap, Play as her is disabled and a tap on hire starts no rehearsal; the street open names stays playable; open moving while the counts stand redraws the page; a kept player with the same counts sees no street greyed', async () => {
  if (ui.mode === 'arena') lw.leaveArena();
  if (ui.modal) lw.closeModal();
  const closeLines = () => { for (let i = 0; i < 8 && printed(); i++) lw.ACTS['hl-close'](); };
  const weekMs = 7 * 24 * 3600 * 1000;
  const fullOn = (id) => new RegExp(`<button class="suspect[^"]*\\bfull\\b[^"]*" data-act="suspect" data-id="${id}"`).test(app.innerHTML);
  const suspects = () => (app.innerHTML.match(/<button class="suspect[^"]*" data-act="suspect" data-id="\w+"/g) || []).join(' ');
  const hireBtn = () => (/<button class="btn primary grow" data-act="hire"[^>]*>[^<]*/.exec(app.innerHTML) || [''])[0];
  try {
    localStorage.removeItem('lw-scandal-game'); ui.S = null; ui.active = null; ui.welcome = null;
    srv.user = 'Open_Guest'; srv.guest = true; srv.guestExpiresAt = Date.now() + weekMs; srv.member = false;
    srv.crowd = { victorian: 2, wildwest: 2, vegas: 0 }; srv.open = ['jackie'];
    await lw.net.adopt({ name: 'Open_Guest', guest: true, guestExpiresAt: srv.guestExpiresAt, member: false });
    assert.deepEqual(lw.net.account().open, ['jackie'], `what /api/me said has room for her (${J(lw.net.account())})`);
    ui.pickId = 'dolly';
    const m0 = srv.meRequests;
    lw.go('pick');
    assert.ok(await until(() => srv.meRequests === m0 + 1), 'the pick page asks /api/me');
    await wait(20);
    assert.ok(fullOn('dolly') && fullOn('fanny'), `victorian and wildwest greyed for her, their guest seats taken under the cap (${suspects()})`);
    assert.ok(!fullOn('jackie'), `vegas has a seat and a guest seat (${suspects()})`);
    assert.equal((app.innerHTML.match(/Full tonight/g) || []).length, 2, 'the two read Full tonight, under the cap or not');
    assert.ok(/disabled/.test(hireBtn()) && /street is full tonight/.test(hireBtn()), `Play as Dolly is disabled (${hireBtn()})`);
    lw.ACTS.hire();
    assert.ok(!ui.welcome && ui.screen === 'pick', `no rehearsal starts for a street she cannot take (${ui.screen})`);
    assert.ok(textOf(printed()).includes(lw.S.TL_FULL_LINE.head), `the front desk's line (${textOf(printed())})`);
    closeLines();
    ui.pickId = 'jackie'; lw.render();
    assert.ok(!/disabled/.test(hireBtn()) && /Play as/.test(hireBtn()), `Play as Jackie (${hireBtn()})`);
    // victorian's guest seat is freed (a keep there) while the counts stand: the page opens again and redraws
    lw.go('title');
    srv.open = ['dolly', 'jackie'];
    ui.pickId = 'dolly';
    lw.go('pick');
    assert.ok(await until(() => !fullOn('dolly')), `victorian has room for her now, the counts unchanged (${suspects()})`);
    assert.ok(fullOn('fanny'), 'wildwest still has none');
    assert.ok(!/disabled/.test(hireBtn()) && /Play as/.test(hireBtn()), `Play as Dolly (${hireBtn()})`);
    // a kept player with the same counts: nothing greyed, the counts under the cap
    srv.user = 'Ruby_Buckshot'; srv.guest = false; srv.guestExpiresAt = null; srv.member = false; srv.open = null;
    await lw.net.adopt({ name: 'Ruby_Buckshot', member: false });
    lw.go('title'); lw.go('pick');
    await wait(20);
    assert.ok(!fullOn('dolly') && !fullOn('fanny') && !fullOn('jackie'), `a kept player: every street with a seat (${suspects()})`);
    assert.match(app.innerHTML, /2 girls on this street/);
  } finally {
    srv.open = null; srv.crowd = { victorian: 1, wildwest: 0, vegas: 0 }; srv.user = 'Ruby_Buckshot'; srv.guest = false; srv.guestExpiresAt = null; srv.member = true;
    ui.pickId = null; ui.welcome = null; ui.S = null; ui.active = null;
    if (ui.modal) lw.closeModal();
    await lw.net.adopt({ name: 'Ruby_Buckshot', member: true });
    closeLines();
  }
  assert.equal(lw.net.account().name, 'Ruby_Buckshot');
});

test('B3-q (fix rounds 4 and 5 of batch 3b): the ask before a guest logs out carries the no-password line verbatim and no kept-until date, while the Play as guest welcome and the Keep this game form (the title desk\'s and Your account\'s) still print the kept-until line; the ask offers Keep this game: on the title its button puts the ask away and takes her to the desk\'s own form (the name field focused, no second form under the ask); in the District it opens Your account, which holds the form; the ask keeps its own Log out and Not now, and nothing is posted', async () => {
  if (ui.mode === 'arena') lw.leaveArena();
  if (ui.modal) lw.closeModal();
  const closeLines = () => { for (let i = 0; i < 8 && printed(); i++) lw.ACTS['hl-close'](); };
  const weekMs = 7 * 24 * 3600 * 1000;
  const keepName = el('input'); let focused = 0; keepName.focus = () => { focused++; };
  // the Create account field and its form as the title draws them, for Play as guest
  const nameEl = el('input'); const line = el('p'); const signupForm = el('form'); signupForm.id = 'signup';
  signupForm.querySelector = (q) => (q === '.formline' ? line : null); signupForm.querySelectorAll = () => [];
  let lo0 = srv.logouts;
  try {
    assert.equal(lw.S.GUEST_OUT, 'A guest game has no password, so there\'s no logging back in once you log out. Keep it first, or it\'s gone.', 'the ask\'s line, verbatim');
    closeLines();
    localStorage.removeItem('lw-scandal-game'); ui.S = null; ui.active = null; ui.welcome = null;
    ui.met = true; localStorage.setItem('lw-scandal-met', 'true'); // a device that has played: the suspects, not the Morning Edition
    // the first spec screen: Play as guest, whose welcome prints the kept-until line
    await lw.net.signOut(); lo0 = srv.logouts;
    assert.equal(lw.net.account().name, null, 'signed out: a device with no game');
    byId['signup-name'] = nameEl; byId.signup = signupForm; ui.authMode = 'signup';
    nameEl.value = 'Ask_Guest'; srv.guestExpiresAt = Date.now() + weekMs; srv.guestTaken = 0; srv.guestLeft = 3; srv.joinFull = false;
    await lw.ACTS['guest-play']();
    const kept = lw.S.KEPT_UNTIL(srv.guestExpiresAt);
    assert.ok(lw.net.account().name === 'Ask_Guest' && lw.net.account().guest === true && lw.net.account().guestExpiresAt === srv.guestExpiresAt, `a guest, with the expiry /api/me sent (${J(lw.net.account())})`);
    assert.ok(textOf(printed()).includes(kept), `the Play as guest welcome prints the kept-until line (${textOf(printed())})`);
    closeLines();
    delete byId['signup-name']; delete byId.signup;
    // the second spec screen: the Keep this game form on the title desk, with the kept-until line
    srv.member = true; // her girl is in the District (enter() below takes her there)
    lw.go('title');
    assert.ok(app.innerHTML.includes('id="keep"'), 'the desk holds the Keep this game form');
    assert.ok(textOf(app.innerHTML).includes(kept), `and the kept-until line (${textOf(app.innerHTML)})`);
    byId['keep-name'] = keepName;
    await lw.ACTS['sign-out']();
    assert.ok(ui.modal && ui.modal.type === 'guest-out', `the ask (${ui.modal && ui.modal.type})`);
    const ask = sheet();
    assert.ok(textOf(ask).includes(lw.S.GUEST_OUT), `the ask carries the no-password line (${textOf(ask)})`);
    assert.ok(!textOf(ask).includes('Kept until') && !textOf(ask).includes(kept), `and no kept-until date: the date read as a promise she could come back before it (${textOf(ask)})`);
    assert.ok(ask.includes('data-act="keep-ask"') && /Keep this game/.test(textOf(ask)), `the ask offers Keep this game (${textOf(ask)})`);
    assert.ok(ask.includes('data-act="sign-out" data-id="sure"') && /Not now/.test(textOf(ask)), `and keeps its Log out and Not now (${textOf(ask)})`);
    assert.ok(!ask.includes('id="keep"'), 'no second form on the title: the desk\'s is behind the ask');
    lw.ACTS['keep-ask']();
    assert.ok(!ui.modal, 'the ask is put away');
    assert.equal(ui.screen, 'title');
    assert.ok(focused >= 1, 'the desk\'s name field is focused');
    assert.equal(srv.logouts, lo0, 'nothing posted');
    assert.equal(lw.net.account().name, 'Ask_Guest', 'still signed in, still a guest');
    // in the District: Your account from the Menu, Log out there, the ask, then Keep this game opens Your account again
    // with the form in it
    delete byId['keep-name'];
    await enter();
    lw.ACTS.acct();
    assert.ok(ui.modal && ui.modal.type === 'acct' && sheet().includes('id="keep"'), 'Your account holds the form');
    assert.ok(textOf(sheet()).includes(kept), `with the kept-until line (${textOf(sheet())})`);
    await lw.ACTS['sign-out']();
    assert.ok(ui.modal && ui.modal.type === 'guest-out' && sheet().includes('data-act="keep-ask"'), `the ask, with Keep this game (${ui.modal && ui.modal.type})`);
    assert.ok(textOf(sheet()).includes(lw.S.GUEST_OUT) && !textOf(sheet()).includes('Kept until'), `the no-password line and no date here either (${textOf(sheet())})`);
    lw.ACTS['keep-ask']();
    assert.ok(ui.modal && ui.modal.type === 'acct' && sheet().includes('id="keep"'), `Your account again, the form in it (${ui.modal && ui.modal.type})`);
    assert.equal(srv.logouts, lo0, 'nothing posted');
    assert.equal(lw.net.account().name, 'Ask_Guest');
    lw.closeModal();
  } finally {
    for (const k of ['signup-name', 'signup', 'keep-name']) delete byId[k];
    srv.guestTaken = 0; srv.guestLeft = 3; srv.joinFull = false;
    if (ui.modal) lw.closeModal();
    if (ui.mode === 'arena') lw.leaveArena();
    localStorage.removeItem('lw-scandal-game'); ui.S = null; ui.active = null; ui.welcome = null; ui.authMode = undefined;
    srv.user = 'Ruby_Buckshot'; srv.guest = false; srv.guestExpiresAt = null; srv.member = true;
    await lw.net.adopt({ name: 'Ruby_Buckshot', member: true });
    closeLines();
  }
  assert.equal(lw.net.account().name, 'Ruby_Buckshot');
});

// a reload of the page as the harness can make one: the net module forgets the account the server confirmed (a log-out,
// which the test counts), the device's own record of the name is put back, and init reads it as a page load does: the
// hint stands, and whether it is a guest's is not known until GET /api/me answers
async function reloadAs(name) {
  await lw.net.signOut();
  localStorage.setItem('lw-scandal-acct', J(name));
  lw.net.init({});
  const a = lw.net.account();
  assert.ok(a.name === null && a.hint === name, `after the reload the hint stands and no name is confirmed (${J(a)})`);
}
test('B3-r (fix round 5 of batch 3b): Log out never fires on an account whose kind is not known: after a reload the hint stands while GET /api/me is out, and one tap reads the account first (net.reconcile) with the button disabled; no /api/logout goes up until the read answers; a guest then gets the ask and nothing is posted; a kept account logs out; a read that fails (the wire is down) opens the ask; a second tap while the read is out does nothing', async () => {
  if (ui.mode === 'arena') lw.leaveArena();
  if (ui.modal) lw.closeModal();
  const closeLines = () => { for (let i = 0; i < 8 && printed(); i++) lw.ACTS['hl-close'](); };
  const weekMs = 7 * 24 * 3600 * 1000;
  // every attempt on the wire, counted before the mock answers or throws (with srv.down it throws before its own counts move)
  const realFetch = globalThis.fetch; let logoutTries = 0; let meTries = 0;
  globalThis.fetch = async (url, opts) => { const p = new URL(url, 'http://localhost').pathname; if (p === '/api/logout') logoutTries++; if (p === '/api/me') meTries++; return realFetch(url, opts); };
  let release = null; let release2 = null;
  try {
    closeLines();
    localStorage.removeItem('lw-scandal-game'); ui.S = null; ui.active = null; ui.welcome = null;
    // (1) a guest's reload, /api/me held on the wire: the page-load read goes out and waits
    await reloadAs('Reload_Guest');
    srv.user = 'Reload_Guest'; srv.guest = true; srv.guestExpiresAt = Date.now() + weekMs; srv.member = true;
    lw.go('title');
    assert.ok(app.innerHTML.includes('data-act="sign-out"') && /Logged in as/.test(textOf(app.innerHTML)), `the title offers Log out on the hint (${textOf(app.innerHTML)})`);
    assert.ok(!app.innerHTML.includes('id="keep"'), 'no Keep this game form yet: the page does not know she is a guest');
    const lo0 = srv.logouts; const tries0 = logoutTries; const me0 = srv.meRequests;
    srv.holdMe = new Promise((r) => { release = r; });
    const early = lw.net.start();
    assert.ok(await until(() => srv.holdMe === null), 'the page-load read is out and held');
    assert.equal(srv.meRequests, me0 + 1);
    // the tap: its own read goes out (held too) and nothing is posted while it is
    srv.holdMe = new Promise((r) => { release2 = r; });
    const btn = el('button');
    const tap = lw.ACTS['sign-out'](undefined, btn);
    await wait(20);
    assert.equal(srv.logouts, lo0, 'no /api/logout goes up while the account is not known');
    assert.equal(logoutTries, tries0, 'not even tried');
    assert.equal(lw.net.account().guest, null, `the kind is not known: the guest flag is null, never false, until the read answers (${J(lw.net.account())})`);
    assert.equal(srv.meRequests, me0 + 2, 'the tap reads the account first');
    assert.equal(srv.holdMe, null, 'its read is out and held');
    assert.equal(btn.disabled, true, 'the button is disabled while the read is out');
    assert.ok(!ui.modal, 'no ask yet');
    // a second tap while the read is out does nothing
    const btn2 = el('button');
    await lw.ACTS['sign-out'](undefined, btn2);
    await wait(10);
    assert.equal(srv.meRequests, me0 + 2, 'a second tap sends no read');
    assert.equal(srv.logouts, lo0); assert.equal(logoutTries, tries0); assert.ok(!ui.modal, 'and opens nothing');
    assert.equal(btn2.disabled, false);
    // the read answers guest: the ask, nothing posted, and the title behind it now holds the Keep this game form
    release2(); await tap; release(); await early;
    assert.ok(ui.modal && ui.modal.type === 'guest-out', `the ask (${ui.modal && ui.modal.type})`);
    assert.ok(textOf(sheet()).includes(lw.S.GUEST_OUT), `with the no-password line (${textOf(sheet())})`);
    assert.equal(srv.logouts, lo0, 'nothing posted'); assert.equal(logoutTries, tries0);
    assert.equal(btn.disabled, false);
    const a1 = lw.net.account();
    assert.ok(a1.name === 'Reload_Guest' && a1.guest === true && a1.guestExpiresAt === srv.guestExpiresAt, `a guest now, with her date (${J(a1)})`);
    assert.ok(app.innerHTML.includes('id="keep"'), 'the desk behind the ask holds the Keep this game form');
    lw.closeModal();
    closeLines();
    // (2) a kept account's reload, the read held: the tap waits for it, then logs out
    await reloadAs('Reload_Kept');
    srv.user = 'Reload_Kept'; srv.guest = false; srv.guestExpiresAt = null; srv.member = true;
    lw.go('title');
    const lo1 = srv.logouts; const me1 = srv.meRequests;
    srv.holdMe = new Promise((r) => { release2 = r; });
    const btnK = el('button');
    const tapK = lw.ACTS['sign-out'](undefined, btnK);
    await wait(20);
    assert.equal(srv.logouts, lo1, 'nothing posted while the read is out');
    assert.equal(srv.meRequests, me1 + 1); assert.equal(btnK.disabled, true);
    release2(); await tapK;
    assert.equal(srv.logouts, lo1 + 1, 'a kept account: the log-out goes up once the read says so');
    assert.ok(!ui.modal, 'no ask');
    assert.equal(lw.net.account().name, null, 'logged out');
    assert.ok(/Logged out/.test(textOf(printed())), `Logged out (${textOf(printed())})`);
    closeLines();
    // (3) the read fails (the wire is down): the ask is shown anyway; a kept player pays one extra tap, a guest loses nothing
    await reloadAs('Reload_Down');
    srv.user = 'Reload_Down'; srv.guest = true; srv.guestExpiresAt = Date.now() + weekMs; srv.member = true;
    lw.go('title');
    const lo2 = srv.logouts; const tries2 = logoutTries; const me2 = meTries;
    srv.down = true;
    const btnD = el('button');
    await lw.ACTS['sign-out'](undefined, btnD);
    assert.equal(meTries, me2 + 1, 'the read went out (and the wire lost it)');
    assert.ok(ui.modal && ui.modal.type === 'guest-out', `the read failed: the ask anyway (${ui.modal && ui.modal.type})`);
    assert.equal(srv.logouts, lo2); assert.equal(logoutTries, tries2, 'no /api/logout was tried');
    const a3 = lw.net.account();
    assert.ok(a3.name === null && a3.hint === 'Reload_Down' && a3.guest === null && a3.down === true, `the hint stands and the kind is still not known (${J(a3)})`);
    assert.equal(btnD.disabled, false);
    lw.closeModal();
    srv.down = false;
  } finally {
    globalThis.fetch = realFetch;
    if (release) release(); if (release2) release2();
    srv.holdMe = null; srv.down = false;
    if (ui.modal) lw.closeModal();
    if (ui.mode === 'arena') lw.leaveArena();
    localStorage.removeItem('lw-scandal-game'); ui.S = null; ui.active = null; ui.welcome = null; ui.authMode = undefined;
    srv.user = 'Ruby_Buckshot'; srv.guest = false; srv.guestExpiresAt = null; srv.member = true;
    await lw.net.adopt({ name: 'Ruby_Buckshot', member: true });
    closeLines();
  }
  assert.equal(lw.net.account().name, 'Ruby_Buckshot');
});
test('B3-s (fix round 6 of batch 3b): a kind the page confirmed earlier is not trusted either: a tab that read a kept account, while another tab logged out and started a guest under the same cookie, reads the account first on Log out (one /api/me, the button disabled meanwhile), gets the ask on the guest the read names and posts nothing, the page wearing the guest now; the ask\'s own Log out then posts with no read; a read that fails on a confirmed kept account opens the ask too (in the District, from Your account) and posts nothing; a read that says the session has gone posts nothing and leaves the title logged out; a read that names another kept account logs out', async () => {
  if (ui.mode === 'arena') lw.leaveArena();
  if (ui.modal) lw.closeModal();
  const closeLines = () => { for (let i = 0; i < 8 && printed(); i++) lw.ACTS['hl-close'](); };
  const weekMs = 7 * 24 * 3600 * 1000;
  // every attempt on the wire, counted before the mock answers or throws (with srv.down it throws before its own counts move)
  const realFetch = globalThis.fetch; let logoutTries = 0; let meTries = 0;
  globalThis.fetch = async (url, opts) => { const p = new URL(url, 'http://localhost').pathname; if (p === '/api/logout') logoutTries++; if (p === '/api/me') meTries++; return realFetch(url, opts); };
  let release = null;
  try {
    closeLines();
    localStorage.removeItem('lw-scandal-game'); ui.S = null; ui.active = null; ui.welcome = null;
    // (1) this tab confirmed a kept account (the page-load read answered) and holds it so
    srv.user = 'Tab_Kept'; srv.guest = false; srv.guestExpiresAt = null; srv.member = true;
    await lw.net.adopt({ name: 'Tab_Kept', member: true });
    lw.go('title');
    const a0 = lw.net.account();
    assert.ok(a0.name === 'Tab_Kept' && a0.guest === false, `a kept account, confirmed (${J(a0)})`);
    // another tab logs out and starts a guest: the cookie names her now, and this tab's page knows nothing of it
    srv.user = 'Tab_Guest'; srv.guest = true; srv.guestExpiresAt = Date.now() + weekMs; srv.member = false;
    const lo0 = srv.logouts; const tries0 = logoutTries; const me0 = srv.meRequests;
    srv.holdMe = new Promise((r) => { release = r; });
    const btn = el('button');
    const tap = lw.ACTS['sign-out'](undefined, btn);
    await wait(20);
    assert.equal(srv.logouts, lo0, 'no /api/logout goes up on the kind the page held: the cookie is the guest\'s now');
    assert.equal(logoutTries, tries0, 'not even tried');
    assert.equal(srv.meRequests, me0 + 1, 'the tap reads the account first, the kind it held notwithstanding');
    assert.equal(srv.holdMe, null, 'its read is out and held');
    assert.equal(btn.disabled, true, 'the button is disabled while the read is out');
    assert.ok(!ui.modal, 'no ask yet');
    release(); await tap;
    assert.ok(ui.modal && ui.modal.type === 'guest-out', `the ask, on the guest the read names (${ui.modal && ui.modal.type})`);
    assert.ok(textOf(sheet()).includes(lw.S.GUEST_OUT), `with the no-password line (${textOf(sheet())})`);
    assert.equal(srv.logouts, lo0, 'nothing posted'); assert.equal(logoutTries, tries0);
    assert.equal(btn.disabled, false);
    const a1 = lw.net.account();
    assert.ok(a1.name === 'Tab_Guest' && a1.guest === true && a1.guestExpiresAt === srv.guestExpiresAt, `the page wears the guest now, with her date (${J(a1)})`);
    assert.ok(/Logged in as/.test(textOf(app.innerHTML)) && textOf(app.innerHTML).includes('Tab_Guest') && app.innerHTML.includes('id="keep"'), `the desk behind the ask names her and holds the Keep this game form (${textOf(app.innerHTML)})`);
    assert.equal(localStorage.getItem('lw-scandal-lastname'), J('Tab_Kept'), 'the guest\'s name is not the device\'s last name');
    // the ask's own Log out posts, with no read of its own: the page holds her as a guest and she has read the line
    const me1 = srv.meRequests;
    await lw.ACTS['sign-out']({ id: 'sure' });
    assert.equal(srv.logouts, lo0 + 1, 'the ask\'s own button logs her out');
    assert.equal(srv.meRequests, me1, 'with no read of its own');
    assert.ok(!ui.modal, 'the ask is gone'); assert.equal(lw.net.account().name, null, 'logged out');
    closeLines();
    // (2) a confirmed kept account in the District, the read failing (the wire is down): the ask anyway, from Your
    // account, the kept name the page wore notwithstanding
    srv.user = 'Tab_Kept'; srv.guest = false; srv.guestExpiresAt = null; srv.member = true;
    await lw.net.adopt({ name: 'Tab_Kept', member: true });
    await enter();
    lw.ACTS.acct();
    assert.ok(ui.modal && ui.modal.type === 'acct' && sheet().includes('data-act="sign-out"'), `Your account offers Log out (${ui.modal && ui.modal.type})`);
    const lo2 = srv.logouts; const tries2 = logoutTries; const me2 = meTries;
    srv.down = true;
    const btnD = el('button');
    await lw.ACTS['sign-out'](undefined, btnD);
    srv.down = false;
    assert.equal(meTries, me2 + 1, 'the read went out (and the wire lost it)');
    assert.ok(ui.modal && ui.modal.type === 'guest-out', `the read failed: the ask anyway (${ui.modal && ui.modal.type})`);
    assert.equal(srv.logouts, lo2); assert.equal(logoutTries, tries2, 'no /api/logout was tried');
    assert.equal(ui.mode, 'arena', 'still in the District');
    assert.equal(lw.net.account().name, 'Tab_Kept', 'the name the page wore stands');
    assert.equal(btnD.disabled, false);
    lw.closeModal();
    lw.leaveArena(); lw.go('title');
    closeLines();
    // (3) the other tab logged out and started nothing: the read says the session has gone, nothing is posted, and the
    // title is logged out with the signed-out notice
    const lo3 = srv.logouts; const tries3 = logoutTries; const me3 = srv.meRequests;
    srv.user = null;
    await lw.ACTS['sign-out'](undefined, el('button'));
    assert.equal(srv.meRequests, me3 + 1, 'read first');
    assert.equal(srv.logouts, lo3); assert.equal(logoutTries, tries3, 'nothing to log out of: nothing posted');
    assert.ok(!ui.modal, 'no ask');
    const a3 = lw.net.account();
    assert.ok(a3.name === null && a3.hint === null, `signed out (${J(a3)})`);
    assert.ok(app.innerHTML.includes('data-act="auth-mode"') && !app.innerHTML.includes('data-act="sign-out"'), `the title offers the forms, no Log out (${textOf(app.innerHTML)})`);
    assert.ok(/Logged out on this device/.test(textOf(printed())), `the signed-out notice (${textOf(printed())})`);
    closeLines();
    // (4) the read names another kept account (the other tab logged in as someone else): a kept account logs out,
    // whichever it is
    srv.user = 'Tab_Kept'; srv.guest = false; srv.guestExpiresAt = null; srv.member = true;
    await lw.net.adopt({ name: 'Tab_Kept', member: true });
    lw.go('title');
    srv.user = 'Other_Kept';
    const lo4 = srv.logouts; const me4 = srv.meRequests;
    await lw.ACTS['sign-out'](undefined, el('button'));
    assert.equal(srv.meRequests, me4 + 1, 'read first');
    assert.equal(srv.logouts, lo4 + 1, 'a kept account: the log-out goes up once the read says so');
    assert.ok(!ui.modal, 'no ask');
    assert.equal(lw.net.account().name, null, 'logged out');
    assert.ok(/Logged out/.test(textOf(printed())), `Logged out (${textOf(printed())})`);
    closeLines();
  } finally {
    globalThis.fetch = realFetch;
    if (release) release();
    srv.holdMe = null; srv.down = false;
    if (ui.modal) lw.closeModal();
    if (ui.mode === 'arena') lw.leaveArena();
    localStorage.removeItem('lw-scandal-game'); ui.S = null; ui.active = null; ui.welcome = null; ui.authMode = undefined;
    srv.user = 'Ruby_Buckshot'; srv.guest = false; srv.guestExpiresAt = null; srv.member = true;
    await lw.net.adopt({ name: 'Ruby_Buckshot', member: true });
    closeLines();
  }
  assert.equal(lw.net.account().name, 'Ruby_Buckshot');
});
test('B3-t (fix round 6 of batch 3b): Keep this game on the ask shown over a kind not known (a reload whose read failed): the tap reads the account first (one /api/me, the button disabled, the ask still up) and, the read landing as a guest, puts the ask away and takes her to the desk\'s form, there now, its name field focused; a read that fails again puts the ask away and leaves the title\'s Try the server again in the form\'s place, which then brings the form; nothing is posted', async () => {
  if (ui.mode === 'arena') lw.leaveArena();
  if (ui.modal) lw.closeModal();
  const closeLines = () => { for (let i = 0; i < 8 && printed(); i++) lw.ACTS['hl-close'](); };
  const weekMs = 7 * 24 * 3600 * 1000;
  const keepName = el('input'); let focused = 0; keepName.focus = () => { focused++; };
  // every attempt on the wire, counted before the mock answers or throws
  const realFetch = globalThis.fetch; let meTries = 0;
  globalThis.fetch = async (url, opts) => { const p = new URL(url, 'http://localhost').pathname; if (p === '/api/me') meTries++; return realFetch(url, opts); };
  let release = null;
  try {
    closeLines();
    localStorage.removeItem('lw-scandal-game'); ui.S = null; ui.active = null; ui.welcome = null;
    // a guest's reload with the wire down: the page-load read fails, the tap's read fails too, the ask anyway (B3-r)
    await reloadAs('Keep_Guest');
    srv.user = 'Keep_Guest'; srv.guest = true; srv.guestExpiresAt = Date.now() + weekMs; srv.member = true;
    srv.down = true;
    await lw.net.start();
    lw.go('title');
    assert.ok(!app.innerHTML.includes('id="keep"') && app.innerHTML.includes('data-act="acct-retry"'), `no form while the server could not be read: Try the server again in its place (${textOf(app.innerHTML)})`);
    await lw.ACTS['sign-out'](undefined, el('button'));
    assert.ok(ui.modal && ui.modal.type === 'guest-out', `the ask (${ui.modal && ui.modal.type})`);
    assert.equal(lw.net.account().guest, null, 'the kind is still not known');
    const lo0 = srv.logouts;
    // (1) the wire back: Keep this game reads the account first, held on the wire, the button disabled and the ask up;
    // the read lands as a guest, and the form is there to go to
    srv.down = false;
    byId['keep-name'] = keepName;
    const me0 = srv.meRequests;
    srv.holdMe = new Promise((r) => { release = r; });
    const btn = el('button');
    const tap = lw.ACTS['keep-ask'](undefined, btn);
    await wait(20);
    assert.equal(srv.meRequests, me0 + 1, 'Keep this game reads the account first: the page does not hold her as a guest');
    assert.equal(srv.holdMe, null, 'its read is out and held');
    assert.equal(btn.disabled, true, 'the button is disabled while the read is out');
    assert.ok(ui.modal && ui.modal.type === 'guest-out', 'the ask stays up meanwhile');
    assert.equal(focused, 0, 'nothing focused yet');
    release(); await tap;
    assert.ok(!ui.modal, 'the ask is put away');
    assert.equal(ui.screen, 'title');
    assert.ok(app.innerHTML.includes('id="keep"'), `the desk holds the Keep this game form now (${textOf(app.innerHTML)})`);
    assert.ok(textOf(app.innerHTML).includes(lw.S.KEPT_UNTIL(srv.guestExpiresAt)), `with the kept-until line (${textOf(app.innerHTML)})`);
    assert.equal(focused, 1, 'its name field is focused');
    const a1 = lw.net.account();
    assert.ok(a1.name === 'Keep_Guest' && a1.guest === true, `a guest now (${J(a1)})`);
    assert.equal(srv.logouts, lo0, 'nothing posted');
    delete byId['keep-name'];
    closeLines();
    // (2) the wire still down at the tap: the read fails again, the ask is put away, Try the server again stands in
    // the form's place, and that then brings the form
    await reloadAs('Keep_Again');
    srv.user = 'Keep_Again'; srv.guest = true; srv.guestExpiresAt = Date.now() + weekMs; srv.member = true;
    srv.down = true;
    await lw.net.start();
    lw.go('title');
    await lw.ACTS['sign-out'](undefined, el('button'));
    assert.ok(ui.modal && ui.modal.type === 'guest-out', `the ask (${ui.modal && ui.modal.type})`);
    const lo1 = srv.logouts; const tries1 = meTries;
    // (no name field registered here: the harness answers getElementById from its own map, not from the markup, and
    // the markup below is what shows the form is not there)
    const btn2 = el('button');
    await lw.ACTS['keep-ask'](undefined, btn2);
    assert.equal(meTries, tries1 + 1, 'the read went out (and the wire lost it)');
    assert.ok(!ui.modal, 'the ask is put away');
    assert.ok(!app.innerHTML.includes('id="keep"') && app.innerHTML.includes('data-act="acct-retry"'), `no form: Try the server again in its place (${textOf(app.innerHTML)})`);
    assert.equal(btn2.disabled, false);
    assert.equal(lw.net.account().guest, null, 'the kind is still not known');
    srv.down = false;
    await lw.ACTS['acct-retry'](undefined, el('button'));
    assert.ok(app.innerHTML.includes('id="keep"'), `Try the server again brings the form (${textOf(app.innerHTML)})`);
    assert.equal(lw.net.account().guest, true);
    assert.equal(srv.logouts, lo1, 'nothing posted');
    closeLines();
  } finally {
    globalThis.fetch = realFetch;
    if (release) release();
    srv.holdMe = null; srv.down = false;
    delete byId['keep-name'];
    if (ui.modal) lw.closeModal();
    if (ui.mode === 'arena') lw.leaveArena();
    localStorage.removeItem('lw-scandal-game'); ui.S = null; ui.active = null; ui.welcome = null; ui.authMode = undefined;
    srv.user = 'Ruby_Buckshot'; srv.guest = false; srv.guestExpiresAt = null; srv.member = true;
    await lw.net.adopt({ name: 'Ruby_Buckshot', member: true });
    closeLines();
  }
  assert.equal(lw.net.account().name, 'Ruby_Buckshot');
});
