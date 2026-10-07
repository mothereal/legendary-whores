// The Scandal Sheet · the paper's own server: the nom de plume and password, the cloud save, Letters to the Editor and the
// street's half of the Players board. The contract is docs/server-api.md (section 10 is this file's half of it).
// This module never touches the page: it calls the server, keeps the sync record and tells scandal.js what happened
// through one hook (init's `on`). Every call has a timeout and a catch, and none of them throws: an unreachable server,
// a proxy's error page or a timeout all come back as { ok: false, code: 'unreachable' }, so the game always plays on.
import * as L from '../engine/rules.js';

const C = L.CONTENT;
const ME = 'you';
// Uploads (contract §10, decision 2): the first 3 s after a change, then at most one every 40 s, so a player whose
// District clock saves every 1.2 s sends about 90 an hour against the server's 120. A failure waits for the same cadence.
const FIRST_MS = 3000;
const GAP_MS = 40000;
const ME_MS = 8000; // the page-load "who am I"
const CALL_MS = 15000; // sign-in, letters, the board
const SAVE_MS = 30000; // a 400 KB save on a weak signal
const BOARD_MS = 30000; // the street board is not fetched again within this
const UNREACHABLE = 'The paper\'s own server is not answering, so the game is being kept on this device for now.';
const JAMMED = 'The presses have jammed and a boy has been sent for the engineer.';

let hooks = { store: null, version: '', stored: () => null, on: () => {} };
const st = {
  name: null, // the signed-in nom de plume, confirmed by the server this page load (its spelling); null = a guest game
  hint: null, // the name this device last signed in as (store 'acct'): shown while the server is silent, never trusted
  down: false, // the last call could not reach the server
  synced: null, // { updatedAt, at } of the last upload or download (store 'synced'): server time, then the save's own `at`
  game: null, // the save object saveGame() last wrote
  timer: null, busy: false, again: false, lastUpload: 0, badAt: null, warned: new Set(),
};
const taken = new Set(); // name keys a sign-up found taken this page load (decision 1)
const board = { at: 0, rows: null, err: null, p: null };

export function init(h) {
  hooks = { ...hooks, ...h };
  st.hint = hooks.store.get('acct', null);
  st.synced = hooks.store.get('synced', null);
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
      message: err && typeof err.message === 'string' ? err.message.slice(0, 300) : '' };
    if (res.status >= 500 && code !== 'busy') r.code = 'unreachable';
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

// ---- the sync record ----
const save1 = (k, v) => (v == null ? hooks.store.del(k) : hooks.store.set(k, v));
function setSynced(updatedAt, at) { st.synced = { updatedAt, at }; save1('synced', st.synced); }
// the local game is unsent when nothing has been synced, or it was saved after the last sync (contract §10)
const unsent = (g) => !!g && (!st.synced || g.at > st.synced.at);
// a save this build can read: the same envelope and SAVE_V as the page's own (a stale one is never loaded)
const current = (g) => !!g && typeof g === 'object' && g.v === hooks.version && !!g.S && typeof g.S === 'object' && !!g.ui && typeof g.ui === 'object' && Number.isFinite(g.at);
function forget() {
  st.name = null; st.hint = null; st.again = false; st.synced = null;
  clearTimeout(st.timer); st.timer = null;
  save1('synced', null); save1('acct', null);
}
function signedIn(name) { st.name = name; st.hint = name; st.down = false; save1('acct', name); }
function once(key, ...args) { if (st.warned.has(key)) return; st.warned.add(key); console.warn(...args); }
const emit = (type, data) => { try { hooks.on(type, data); } catch (e) { console.error(e); } };

export function account() {
  return { name: st.name, hint: st.hint, down: st.down, synced: st.synced, unsent: !!st.name && unsent(st.game) };
}

// ---- the summary the Players board shows (contract §5): the account's top-scoring whore speaks for it ----
export function cloudSummary(S) {
  try {
    if (!S || !S.accounts || !S.accounts[ME]) return null;
    const acct = L.getView(S, ME).account;
    const leadId = (L.whorescore(S, ME).perWhore[0] || {}).whore;
    const lead = acct.whores.find((w) => w.id === leadId) || acct.whores[0];
    if (!lead || !S.whores[lead.id]) return null; // every whore retired: nothing to show, so nothing goes up
    return {
      tier: lead.tier, title: lead.title, road: L.roadOf(S.whores[lead.id]), whorescore: acct.whorescore,
      timelines: C.TIMELINE_IDS.filter((tl) => acct.whores.some((w) => w.timeline === tl)),
    };
  } catch { return null; }
}

// ---- uploads ----
function arm(ms) {
  if (st.timer) return;
  st.timer = setTimeout(() => { st.timer = null; upload(); }, ms ?? Math.max(FIRST_MS, st.lastUpload + GAP_MS - Date.now()));
}
function uploadNow() { clearTimeout(st.timer); st.timer = null; return upload(); }
async function upload() {
  if (!st.name) return;
  if (st.busy) { st.again = true; return; }
  const game = st.game;
  if (!game || !unsent(game) || game.at === st.badAt) return;
  const summary = cloudSummary(game.S);
  if (!summary) { once('summary', 'Cloud save skipped: no whore to summarise.'); return; }
  st.busy = true;
  const r = await call('PUT', '/api/save', JSON.stringify({ save: game, summary }), SAVE_MS);
  st.busy = false; st.lastUpload = Date.now();
  if (!st.name) return; // signed out while it was in flight
  if (r.ok && Number.isFinite(r.data.updatedAt)) { setSynced(r.data.updatedAt, game.at); st.down = false; }
  else if (r.status === 401) { forget(); emit('signed-out'); return; }
  else if (r.status === 429) { clearTimeout(st.timer); st.timer = null; arm(Math.max(1, r.retryAfter || GAP_MS / 1000) * 1000); }
  else if (r.status === 400 || r.status === 413) { st.badAt = game.at; once('bad-save', `Cloud save refused (${r.code}); the next save will try again.`); }
  else { st.down = true; emit('down'); } // network or 5xx: the next local save tries again, on the 40 s cadence
  if (st.again) { st.again = false; if (unsent(st.game)) arm(); }
}
// after every local save (scandal.js saveGame): note it, and if she is signed in, arm the upload
export function saved(game) { st.game = game; if (st.name) arm(); }
// the page is hidden (after saveGame has run): what is unsent goes now; nothing is sent on pagehide (contract §10)
export function flush() { if (st.name && unsent(st.game)) uploadNow(); }
// "Start a new scandal": the device's game is wiped; the sync record stays, so the old cloud game is not pulled back
export function cancel() { clearTimeout(st.timer); st.timer = null; st.game = null; st.again = false; }

// ---- page load: who am I, and has another device saved since? (contract §10, "Page load") ----
// Nothing goes up before this has answered: a newer game from another device must come down first.
export async function start() {
  const r = await call('GET', '/api/me', null, ME_MS);
  if (!r.ok || !('user' in r.data)) { st.down = true; if (st.hint) emit('down'); return; }
  st.down = false;
  const user = r.data.user;
  if (!user || typeof user.name !== 'string') { if (st.hint) { forget(); emit('signed-out'); } return; }
  const upd = user.saveUpdatedAt;
  if (Number.isFinite(upd) && (!st.synced || upd > st.synced.updatedAt)) {
    const g = await call('GET', '/api/save', null, SAVE_MS);
    if (g.status === 401) { forget(); emit('signed-out'); return; }
    // the newer game could not be fetched: nothing from this device goes up over it this time
    // (a browser that will not store it cannot load it either: the same rule)
    if (!g.ok || (current(g.data.save) && !hooks.store.set('game', g.data.save))) {
      st.hint = user.name; save1('acct', user.name); st.down = true; emit('down'); return;
    }
    if (current(g.data.save)) {
      setSynced(g.data.updatedAt, g.data.save.at); st.game = null; signedIn(user.name);
      emit('named', user.name); emit('cloud');
      return;
    }
    // a stale cloud game is not loaded: the local game, if any, goes up over it
  }
  signedIn(user.name); emit('named', user.name);
  if (!st.game) st.game = hooks.stored();
  if (unsent(st.game)) uploadNow();
}

// ---- signing in, up and out ----
export const login = (name, password) => call('POST', '/api/login', { name, password });
export const signup = (name, password) => call('POST', '/api/signup', { name, password });
export const isTaken = (name) => taken.has(String(name).toLowerCase());
export const markTaken = (name) => taken.add(String(name).toLowerCase());
// After a successful login or sign-up. A login brings down the cloud game if there is one, replacing this device's
// (decision 4); otherwise this device's game, if any, goes up. Returns 'cloud' (now in the local store), 'local' (going
// up), 'none' (no game anywhere) or 'down' (signed in, but the cloud game could not be fetched: nothing goes up).
export async function adopt(user, how) {
  if (how === 'login' && Number.isFinite(user.saveUpdatedAt)) {
    const g = await call('GET', '/api/save', null, SAVE_MS);
    if (!g.ok || (current(g.data.save) && !hooks.store.set('game', g.data.save))) {
      st.hint = user.name; save1('acct', user.name); st.down = true; return 'down';
    }
    if (current(g.data.save)) {
      setSynced(g.data.updatedAt, g.data.save.at); st.game = null; signedIn(user.name);
      return 'cloud';
    }
  }
  st.synced = null; save1('synced', null); // a new account on this device: whatever was synced before is not hers
  signedIn(user.name);
  st.game = hooks.stored() || st.game; // the stored copy carries the new name (the page renamed it just before)
  if (st.game) { uploadNow(); return 'local'; }
  return 'none';
}
// Sign out: the last unsent pages go up first, then the session ends. The game stays on the device as a guest game.
export async function signOut() {
  if (st.name && unsent(st.game)) await uploadNow();
  const r = await call('POST', '/api/logout', {});
  if (r.ok) forget();
  return r;
}

// ---- Letters to the Editor ----
export const letter = (body) => call('POST', '/api/feedback', body);

// ---- the street's Players board: fetched on entering the screen, not again within 30 s ----
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const int = (v) => (Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0);
function boardRow(r) {
  if (!r || typeof r !== 'object' || typeof r.name !== 'string') return null;
  return {
    rank: int(r.rank), name: str(r.name, 24), tier: C.TIERS.includes(r.tier) ? r.tier : null, title: str(r.title, 40),
    road: r.road === 'standing' || r.road === 'notoriety' ? r.road : null, whorescore: int(r.whorescore),
    timelines: Array.isArray(r.timelines) ? C.TIMELINE_IDS.filter((tl) => r.timelines.includes(tl)) : [],
    lastActive: Number.isFinite(r.lastActive) ? r.lastActive : null,
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
