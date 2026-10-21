// The Scandal Sheet · the paper's own server: the nom de plume and password, the arena (one shared District for every
// account), Letters to the Editor and the street's Players board. The contract is docs/server-api.md (section 10 is the
// sign-in half, section 12 the arena).
// This module never touches the page: it calls the server and tells scandal.js what happened through one hook (init's
// `on`). Every call has a timeout and a catch, and none of them throws: an unreachable server, a proxy's error page or a
// timeout all come back as { ok: false, code: 'unreachable' }, so the page always knows what to say.
// A guest game never leaves the device. A logged-in player plays in the arena: her moves go up as actions (POST /api/act)
// and her screens come down as views (GET /api/view); nothing is uploaded as a save. A guest account (B3, backlog 17) is
// a logged-in player too, with a nom de plume and no password, kept seven days past her last visit unless she keeps it.
import * as L from '../engine/rules.js';

const C = L.CONTENT;
const ME_MS = 8000; // the page-load "who am I"
const CALL_MS = 15000; // sign-in, letters, the board, an action
const VIEW_MS = 20000; // a full view with every Timeline, digest and boards
const JOIN_MS = 30000; // joining builds the whole first view
const BOARD_MS = 30000; // the street board is not fetched again within this
const UNREACHABLE = 'Can\'t reach our server. Try again in a minute.';
const JAMMED = 'The presses have jammed. Give it a minute and try again.';

let hooks = { store: null, on: () => {} };
const st = {
  name: null, // the signed-in nom de plume, confirmed by the server this page load (its spelling); null = a guest
  hint: null, // the name this device is signed in as (store 'acct'): shown while the server is silent, never trusted
  down: false, // the last call could not reach the server
  member: false, // she has a girl in the arena (GET /api/me user.member)
  crowd: null, // live human whores per Timeline (GET /api/me crowd), for the pick page's street counts
  tlCap: 0, // humans per Timeline the street takes (GET /api/me tlCap); 0 = unknown
  // the starters whose streets have room for this account (GET /api/me open: a seat, and for a guest a guest seat too;
  // the list a 503 timeline-full would carry), so the pick page greys a street she would be steered from; null = not
  // said (signed out, or an older server), and the counts alone decide
  open: null,
  // a guest account (POST /api/guest: a nom de plume and no password, kept seven days past her last visit) until she
  // keeps it with a password (POST /api/guest/keep); the expiry (ms) is hers alone, GET /api/me sends it for her own
  // session only, and it is never computed here. Three values: true, false, and null for not yet said this page load
  // (the device's hint stands, GET /api/me has not answered): the page cannot tell a guest's hint from a kept
  // account's. A value confirmed earlier can be stale too (another tab logged out and started a guest under the same
  // cookie), so every Log out but the ask's own reads the account first, on null and on a kind held already (fix
  // rounds 5 and 6 of batch 3b)
  guest: null, guestExpiresAt: null,
};
const board = { at: 0, rows: null, err: null, p: null };
// The sign-in generation: bumped when a login or a new account is accepted, when a log-out is, and when the page adopts
// the account a login named. Every call that can sign her out (an arena call, GET /api/me) notes the generation it went up
// under; an answer from an earlier one (a request sent before she logged out and someone logged in) has no say over the
// account signed in now: its 401 forgets no one and emits nothing.
let gen = 0;
export const authGen = () => gen;
// The account-read generation: bumped when a guest game is kept (the session is the same one, so `gen` stays and a
// pending act's 401 fence holds), so a GET /api/me sent before the keep and answered after it (the page-load read, say,
// carrying the guest flag, the old name and the date) has no say over the kept account the page has adopted.
let acctGen = 0;

export function init(h) {
  hooks = { ...hooks, ...h };
  st.hint = hooks.store.get('acct', null);
  // 'lastname' is written once the server confirms a kept account's session (known, through start), never from the hint
  // here: at this point the page cannot tell a guest's hint from a kept account's, and a guest's name must not open the
  // Log in form, since no password logs it in. Whether the hint is a guest's is not known until GET /api/me answers
  // (guest null, account() below): the page's Log out reads the account first on that
  st.guest = null; st.guestExpiresAt = null;
  hooks.store.del('synced'); // the cloud-save sync record of older builds: no longer kept
}

// ---- one call: JSON in, JSON out, never throws ----
async function call(method, path, body, ms = CALL_MS) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try {
    const opts = { method, credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: ctl.signal, headers: {} };
    if (method !== 'GET') { opts.headers['Content-Type'] = 'application/json'; opts.body = typeof body === 'string' ? body : JSON.stringify(body ?? {}); }
    const res = await fetch(path, opts);
    let data = null;
    if (/^application\/json\b/i.test(res.headers.get('content-type') || '')) { try { data = await res.json(); } catch { data = null; } }
    // anything that is not our server's JSON (a proxy's error page, the static host's 404) means the server is not there
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, status: res.status, code: 'unreachable', data: {} };
    const err = data.error && typeof data.error === 'object' ? data.error : null;
    const code = err && typeof err.code === 'string' ? err.code : res.ok ? null : 'server-error';
    const ra = Number(res.headers.get('retry-after'));
    const r = { ok: res.ok && !err, status: res.status, code, data, retryAfter: Number.isFinite(ra) && ra > 0 ? ra : 0,
      message: err && typeof err.message === 'string' ? err.message.slice(0, 300) : '',
      reason: err && typeof err.reason === 'string' ? err.reason.slice(0, 40) : '' };
    // a 5xx that carries one of our own codes (busy, world-full, timeline-full, world-down) is the server speaking and
    // the page acts on the code; only the presses-jammed 500 means the call told us nothing, like no answer at all
    if (res.status >= 500 && code === 'server-error') r.code = 'unreachable';
    return r;
  } catch {
    return { ok: false, status: 0, code: 'unreachable', data: {} };
  } finally { clearTimeout(t); }
}
// The line to show for a failed call: the server's own message for its code (contract §8), else ours. The page escapes it.
export function msg(r) {
  if (!r || r.code === 'unreachable') return UNREACHABLE;
  return r.message || JAMMED;
}

// ---- the sign-in record ----
const save1 = (k, v) => (v == null ? hooks.store.del(k) : hooks.store.set(k, v));
// Logged out on this device. 'lastname' stays: it is the device's own memory of the name last used here, which opens the
// title on Log in with that name filled in (scandal.js authDefault). It is public on the Players board anyway.
function forget() {
  st.name = null; st.hint = null; st.member = false; st.crowd = null; st.open = null; st.guest = false; st.guestExpiresAt = null;
  save1('acct', null);
}
// the name this device is now known by, in the server's spelling: the hint shown while the server is silent ('acct') and
// the name the Log in form offers next time ('lastname', never cleared). A guest's name never goes into 'lastname': no
// password logs it in, so the Log in form must not offer it; the keep writes the kept name (kept, below). The callers
// read the guest flag (readGuest) before they come here.
function known(name) { st.hint = name; save1('acct', name); if (st.guest === false) save1('lastname', name); }
function signedIn(name) { st.name = name; st.down = false; known(name); }
const emit = (type, data) => { try { hooks.on(type, data); } catch (e) { console.error(e); } };
const int = (v) => (Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0);

// `guest`: what the server said of the account it confirmed (true or false); null while the device's hint stands and no
// GET /api/me has answered this page load (a reload, or the read failed), so the page knows the kind is not known yet
// rather than reading the hint as a kept account's; false when no one is signed in here
export function account() {
  return { name: st.name, hint: st.hint, down: st.down, member: !!st.name && st.member, crowd: st.crowd, tlCap: st.tlCap,
    open: st.name ? st.open : null, guest: st.name ? st.guest === true : st.hint ? null : false,
    guestExpiresAt: st.name && st.guest === true ? st.guestExpiresAt : null };
}
// what GET /api/me (or the guest route's answer) says about her own account being a guest's, and when it expires
function readGuest(user) {
  st.guest = user.guest === true;
  st.guestExpiresAt = st.guest && Number.isFinite(user.guestExpiresAt) ? user.guestExpiresAt : null;
}
// what GET /api/me said about the street (the pick page's counts): crowd per Timeline and the cap, both whole numbers,
// and `open`, the starters with room for this account (known starters only; absent = null, the counts alone decide)
function readMe(data) {
  const crowd = data.crowd && typeof data.crowd === 'object' ? Object.fromEntries(C.TIMELINE_IDS.map((tl) => [tl, int(data.crowd[tl])])) : null;
  st.crowd = crowd; st.tlCap = int(data.tlCap);
  st.open = Array.isArray(data.open) ? data.open.filter((c) => typeof c === 'string' && Object.prototype.hasOwnProperty.call(C.CHARACTERS, c)) : null;
}

// ---- page load: who am I, and is she in the arena? (contract §10 "Page load", §12) ----
export async function start() {
  const g = gen; const a = acctGen;
  const r = await call('GET', '/api/me', null, ME_MS);
  if (g !== gen) return; // a login or a log-out landed while it was out: its answer is about a session that has gone
  if (a !== acctGen) return; // a keep landed while it was out: its answer names the guest the account no longer is
  if (!r.ok || !('user' in r.data)) { st.down = true; if (st.hint) emit('down'); return; }
  st.down = false;
  readMe(r.data);
  const user = r.data.user;
  if (!user || typeof user.name !== 'string') { if (st.hint) { forget(); emit('signed-out'); } else { st.name = null; st.member = false; } emit('member', false); return; }
  st.member = user.member === true;
  readGuest(user);
  signedIn(user.name); emit('named', user.name); emit('member', st.member);
}

// ---- logging in, creating an account, logging out (two separate calls: a refused login is never turned into a sign-up) ----
const bumpIf = (r) => { if (r && r.ok) gen++; return r; };
export const login = (name, password) => call('POST', '/api/login', { name, password }).then(bumpIf);
export const signup = (name, password) => call('POST', '/api/signup', { name, password }).then(bumpIf);
// A guest account (docs/server-api.md, B3 17c): the body is the nom de plume alone, the one the page picked from the
// Create account field or names.js; nothing this device stores, the cookie or an account id ever goes in it. The answer
// sets the session cookie as a sign-up does, so the page adopts the user it names.
export const guest = (name) => call('POST', '/api/guest', { name }).then(bumpIf);
// Keeping a guest game (17g): a name and a password, checked as a sign-up is; the session stays the same one, so the
// sign-in generation does not move. 403 not-guest means the account is already kept.
export const keep = (name, password) => call('POST', '/api/guest/keep', { name, password });
// After a successful login or sign-up: the name in the server's spelling, then /api/me again for `member` and the street
// counts (the login answer does not carry them). Returns true when she has a girl in the arena.
export async function adopt(user) {
  gen++;
  readGuest(user); // before the name is known: a guest's name stays out of 'lastname'
  signedIn(user.name);
  st.member = user.member === true;
  await start();
  return st.member;
}
// After a guest game is kept: the account under its new name, no longer a guest's (so the name goes into 'lastname' now),
// then /api/me again (it stops sending the expiry). Returns true when she has a girl in the arena.
export async function kept(user) {
  acctGen++; // an account read still out (sent before the keep) is dropped when it lands: it would bring the guest back
  st.guest = false; st.guestExpiresAt = null;
  signedIn(user.name);
  if (user.member === true) st.member = true;
  await start();
  return st.member;
}
// The keep answered 403 not-guest: the account was kept already (in another tab, say), under a name this page does not
// know. Nothing typed here names it, so no identity is built from the form: the account is read again and the page
// wears what the server confirms. Returns that name, or null when the read did not land (the page is left as it was).
export async function reconcile() {
  acctGen++; // a read still out, sent before, could name the guest she no longer is
  await start();
  return st.down ? null : st.name;
}
// Log out: the session ends. A guest game, if any, stays on the device.
export async function signOut() {
  const r = await call('POST', '/api/logout', {});
  if (r.ok) { gen++; forget(); }
  return r;
}

// ---- the arena (contract §12): join, act, view, profile ----
// Every answer is the raw { ok, status, code, data } of call(); the page reads the payload through its adapter and
// escapes every string before it reaches the DOM.
export const join = (starter) => call('POST', '/api/join', { starter }, JOIN_MS);
// an action: the engine's own arguments after the state, and one nonce per tap (a lost answer is re-posted with the same
// nonce and the server answers `replayed: true` instead of applying it twice)
// `curtain`: the curtainNo of her girl's Timeline when the tap was made, sent with every move on a girl (the server refuses
// it 409 curtain-passed once that Curtain has fallen); an account-scoped move sends none
export const act = (action, args, nonce, curtain) => call('POST', '/api/act', Number.isSafeInteger(curtain) && curtain >= 0 ? { action, args, nonce, curtain } : { action, args, nonce });
// the view: since = the last rev seen (a tiny `same: true` when nothing changed), tick = the last event id seen; the flags
// ask for every whore's view, the boards and the digest, and go on the wire only when set
export function view(q = {}) {
  const p = new URLSearchParams();
  p.set('since', String(int(q.since))); p.set('tick', String(int(q.tick)));
  if (typeof q.focus === 'string' && q.focus) p.set('focus', q.focus);
  for (const k of ['all', 'boards', 'digest']) if (q[k]) p.set(k, '1');
  return call('GET', `/api/view?${p.toString()}`, null, VIEW_MS);
}
export const profile = (wid) => call('GET', `/api/profile?whore=${encodeURIComponent(String(wid))}`);
// `g`: the sign-in generation the request went up under, read as it was sent; a 401 from an earlier one is ignored here
const signedOutIf = (g) => (r) => { if (r && r.status === 401 && st.name && g === gen) { forget(); emit('signed-out'); } return r; };
// the arena calls above, with a 401 turned into the page's signed-out notice once (for the sign-in in force now only)
export const arena = {
  join: (starter) => join(starter).then(signedOutIf(gen)),
  act: (action, args, nonce, curtain) => act(action, args, nonce, curtain).then(signedOutIf(gen)),
  view: (q) => view(q).then(signedOutIf(gen)),
  profile: (wid) => profile(wid).then(signedOutIf(gen)),
};

// ---- Letters to the Editor ----
export const letter = (body) => call('POST', '/api/feedback', body);

// ---- the street's Players board: fetched on entering the screen, not again within 30 s ----
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
function boardRow(r) {
  if (!r || typeof r !== 'object' || typeof r.name !== 'string') return null;
  return {
    rank: int(r.rank), name: str(r.name, 24), tier: C.TIERS.includes(r.tier) ? r.tier : null, title: str(r.title, 40),
    road: r.road === 'standing' || r.road === 'notoriety' ? r.road : null, whorescore: int(r.whorescore),
    timelines: Array.isArray(r.timelines) ? C.TIMELINE_IDS.filter((tl) => r.timelines.includes(tl)) : [],
    lastActive: Number.isFinite(r.lastActive) ? r.lastActive : null,
    house: r.house === true, // a house player (a stand-in run by the server), never a person
  };
}
export const street = () => board;
// Returns a promise when it fetches, or null when the board in hand is fresh enough (the page then has nothing to wait for).
export function fetchStreet() {
  if (board.p) return board.p;
  if (board.at && Date.now() - board.at < BOARD_MS) return null;
  board.p = call('GET', '/api/players?limit=50').then((r) => {
    board.p = null; board.at = Date.now();
    if (r.ok && Array.isArray(r.data.players)) { board.rows = r.data.players.map(boardRow).filter(Boolean); board.err = null; }
    else board.err = r.code === 'rate-limited' ? 'busy' : 'down';
    return board;
  });
  return board.p;
}
