// The Scandal Sheet v2 · Legendary Whores, the single direction after the prototype scores (house C + headline teaching).
// Teaching in three layers the player picks the depth of: (1) The Morning Edition, five skippable tabloid front pages;
// (2) learn by exploring: every dotted word, chip, card, face and number opens an EXCLUSIVE; (3) "Show me the ropes",
// the step-by-step headlines, only if the player asks for them (end of the overview, or the menu).
// Phone chrome: a corner Purse chip (Coin and the Curtain clock, always visible) and a corner Menu button; the play tray
// is the only bar. Every rule comes from ../engine/rules.js; this file only renders views and animates the event log.
import * as L from '../engine/rules.js';
import { EXISTS, STANDINS } from './assets.js';
import { SEEDS, gameOpts } from './slice-config.js';
import { curtainPointer, savedItem } from './notes.js';
import { randomName, cleanNom, NOM_RE } from './names.js';
import * as net from './net.js';

const C = L.CONTENT;
const R = L.RULES;
const ME = 'you';
const TLS = C.TIMELINE_IDS;
const STARTERS = ['dolly', 'fanny', 'jackie'];
// The seeds, the staged first Curtain and the game options live in slice-config.js, shared with find-first-curtain.mjs,
// which replays each starter's first evening and checks Best Guess takes a paid 2nd and the taught novelty a clear 1st.
// Expressions are rationed (the temperament design): the rare looks (Dolly's wink, Fanny's eyebrow, Jackie's genuine
// surprise) play only on a Kink win or a gentleman's first Delight. Routine moments use the resting plate or her pleased look.
const RARE_LOOK = { dolly: 'wink', fanny: 'eyebrow', jackie: 'surprise' };
const PLEASED_LOOK = { dolly: 'pleased', fanny: 'pleased', jackie: 'bubble' };
const CAUGHT_LOOK = { dolly: 'caught', fanny: 'caught', jackie: 'yawn' };
// The winning plate (money in hand) is the reward image, kept for a Curtain won outright (round 4: the designer's favourite
// image, so its punch is saved for the win that matters; an Assignation Delight gets her pleased look, or the rare look
// on a gentleman's first Delight).
const WON_LOOK = 'won';
// "Top marks" lines rotate (finding 29); the last-call line has a small pool too
// (round 5, finding 20: "our correspondent" already heads every play screen, so it is not a punchline here)
const TOP_MARKS = ['Even the barman stopped polishing to watch.', 'She should be teaching this. At a price.', 'Not a card wasted, not a blush spared.', 'Tens all round. One judge fainted.'];
const LAST_CALL = ['Last call. The house is holding the curtain for her.', 'The band\'s tuning up. Seal when you\'re ready.', 'The gentlemen are in their seats. Take your time.'];
const END_LINE = {
  victorian: 'Our correspondent got thrown out of the Salon and took the aspidistra with him.',
  wildwest: 'Our correspondent rode off into the sunset. He made it as far as the Velvet Spur.',
  vegas: 'Our correspondent bet the expense account on red. It came up black.',
};

const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
const calm = () => reduceMQ.matches;
const $ = (s, el = document) => el.querySelector(s);
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Reduced motion shortens movement, not reading time: pass read=true for holds that exist so a line can be read.
const wait = (ms, read = false) => new Promise((r) => setTimeout(r, calm() && !read ? Math.min(ms, 150) : ms));
const ord = (r) => ['1st', '2nd', '3rd'][r] || `${r + 1}th`;
// The five Art emblems are drawn, not emoji: Emoji 13 glyphs (Wit, Gold) are tofu on older phones, and emoji ignore the
// era skin. Each is one currentColor stroke, so every skin tints it. The emoji survives only as the accessible name.
const ART_SVG = {
  silk: '<path d="M12 12 4.5 7.5v9zM12 12l7.5-4.5v9z"/><path d="M10.6 13.6 8 20M13.4 13.6 16 20"/><circle cx="12" cy="12" r="1.7"/>',
  wit: '<path d="M20 3.5C12.5 5 7.5 10 5 20"/><path d="M20 3.5c-.5 6-4.5 10.5-11.5 11.5"/><path d="M13 9.5 9.5 13"/><path d="M5 20 3.5 21.5"/>',
  gold: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5.5"/><path d="M12 9v6"/>',
  mask: '<path d="M2.5 8.5c3.5-2.5 15.5-2.5 19 0 0 6.5-3 9-6 9-1.6 0-2.2-2.2-3.5-2.2S10.1 17.5 8.5 17.5c-3 0-6-2.5-6-9z"/><path d="M6.5 11.5c1-.9 2.6-.9 3.5 0M14 11.5c1-.9 2.6-.9 3.5 0"/>',
  frolic: '<path d="M12 2.5c1 4.5 6.5 6.5 6.5 12a6.5 6.5 0 0 1-13 0c0-3.2 2-4.4 2.2-7.5 2 1.2 3.1 3.2 3.2 5.2 1.3-2.2 1.6-6 1.1-9.7z"/>',
};
const artIcon = (a, cls = '') => `<svg class="aico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="${C.ARTS[a].icon}">${ART_SVG[a]}</svg>`;
const artLabel = (a) => `${artIcon(a)}${C.ARTS[a].name}`;
// engine strings (hints, events) still carry the emoji: swap them for the emblems after escaping
const ICON_ART = Object.fromEntries(C.ART_IDS.map((a) => [C.ARTS[a].icon, a]));
const emo = (html) => String(html).replace(new RegExp(Object.keys(ICON_ART).join('|'), 'gu'), (m) => artIcon(ICON_ART[m]));
const escE = (t) => emo(esc(t));
// The Type, in plain words (the pick screen and arrival card): the jargon waits for the first gentleman whose Fancy matches.
const TYPE_PLAIN = { siren: 'gents who love finery go weak for her', bluestocking: 'brainy gents go weak for her', hustler: 'gents who talk money go weak for her', enigma: 'gents who like a mystery go weak for her', minx: 'gents who like a romp go weak for her' };
// Freshness in plain words until "Bar" has been taught
const FRESH_PLAIN = { scrubbed: 'Squeaky clean', fair: 'Easy to please', ripe: 'Back-alley regular' };
const bare = (name) => String(name).replace(/^the /i, ''); // "your Headmistress's Cane", never "your The ..."
const theLower = (name) => String(name).replace(/^The /, 'the '); // "takes the Salon", mid-sentence
// a price on a button: "3 of your 6 Coin" when she can pay, "8 Coin · you have 2" when she can't (round 6, finding 16)
const priceOf = (cost, coin) => (coin >= cost ? `${cost} of your ${coin} Coin` : `${cost} Coin · you have ${coin}`);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

const store = {
  get(k, d) { try { const v = localStorage.getItem(`lw-scandal-${k}`); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`lw-scandal-${k}`, JSON.stringify(v)); return true; } catch { return false; /* storage refused or full */ } },
  del(k) { try { localStorage.removeItem(`lw-scandal-${k}`); } catch { /* fine */ } },
};
// Lines the page picks itself rotate without repeats: a shuffle bag per pool, refilled only when every line has been
// shown (the last line of a bag never opens the next one). Engine-picked lines rotate in the engine (nextReaction, the
// gossip bag). Every pool the page prints more than once goes through fresh() (round 4: the designer's pet hate).
const bags = new Map();
function fresh(key, lines) {
  if (!lines || !lines.length) return '';
  let b = bags.get(key);
  if (!b || !b.left.length) {
    const left = lines.map((_, i) => i);
    for (let i = left.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [left[i], left[j]] = [left[j], left[i]]; }
    if (b && left.length > 1 && left[left.length - 1] === b.last) left.unshift(left.pop());
    b = { left, last: b ? b.last : null }; bags.set(key, b);
  }
  const i = b.left.pop(); b.last = i;
  return lines[i];
}

// Voices (round 4, finding 26; round 6, finding 10): every character has a pool of lines. A voice prints once per District
// day, on the first surface that meets him or her (the next day's first meeting gets the next line in the pool, never the
// one shown last); every other surface that day prints something else (his Tell, or nothing). `surface` names the one place
// it may print. A re-render of the same surface keeps its line; a REOPEN (reopen = true: the modal opened again) moves to
// a line not yet shown today, and once the pool is spent it prints nothing. A day's line is never printed twice.
function voiceFor(id, surface, reopen = false) {
  const src = C.GENTS[id] || C.TOURISTS[id] || C.CHARACTERS[id]; if (!src) return null;
  const pool = src.voices && src.voices.length ? src.voices : [src.voice];
  const day = ui.S ? ui.S.day : -1;
  const rec = ui.voices[id];
  if (rec && rec.day === day) {
    if (rec.at !== surface) return null;
    if (!reopen) return rec.line;
    const shown = rec.shown || [rec.i];
    if (shown.length >= pool.length) { rec.line = null; return null; }
    let i = rec.i; do { i = (i + 1) % pool.length; } while (shown.includes(i));
    ui.voices[id] = { day, at: surface, i, line: pool[i], shown: [...shown, i] };
    return pool[i];
  }
  const i = rec ? (rec.i + 1) % pool.length : 0;
  ui.voices[id] = { day, at: surface, i, line: pool[i], shown: [i] };
  return pool[i];
}

// ---------------------------------------------------------------------------
// UI state (game state lives only in ui.S, produced by the engine)
// ---------------------------------------------------------------------------
const ui = {
  screen: 'title', S: null, active: null, name: 'Anonymous', firstTl: null,
  ovPage: 0, ovReturn: null, pickId: null, pickSaid: {}, pickLine: {},
  sel: [], item: null, talentOn: false, deArt: null, stake: false, grease: 0, slumOk: false, aDealt: false,
  place: null, tab: 'whorescore',
  taught: new Set(), steps: new Set(), studied: null,
  modal: null, overlays: 0, lastCall: false, result: null, resultsHoldUntil: 0, news: new Set(), keepNews: null,
  leaning: {}, unfold: new Set(), secSeen: new Set(), secShown: new Set(), secOpen: new Set(), why: false, lastSway: null, hind: null, think: { renown: 0 }, delightedOnce: new Set(),
  muted: store.get('muted', false), hist0: {}, hinds: {}, leftAt: {}, strip: null, tips: [], lastNoteStep: null,
  // learning layers: guided = "Show me the ropes" (the step-by-step headlines); seenX = EXCLUSIVEs already read
  // "Show me the ropes" is on for a newcomer until she turns it off (page 5's "I'll find my own way", the overview's Skip, or
  // the Menu); a returning player who goes straight to the suspects starts with it off unless she set it here (firstGame)
  guided: store.get('guided', true), seenX: new Set(store.get('seenX', [])), lastCoin: null, lastCoinWho: null,
  ovPicked: new Set(), confirmRestart: false,
  // she has played on this device (store 'met'); kept in memory too, so one page load agrees with itself when storage is refused
  met: false,
  // round 5: the one section stamped (round 7: no road to pick, so no road memory and no fork cards)
  stampKey: null, stamped: new Set(),
  voices: {}, promoted: null, saved: null, lastGlee: {},
  // round 6: Assignations per gentleman today (the NEXT note rotates), advice lines already printed today
  jobs: {}, advised: {},
  // Log in or Create account: the form open (undefined = not worked out yet this page load; null = the title is asking,
  // no form open), and what was typed in each, so switching forms or a re-render loses nothing (memory only, never stored)
  authMode: undefined, authDraft: blankDrafts(),
  // Her things: what she has already looked at, per whore (the rest wears NEW), and the tab she used last
  things: {}, hubTab: null,
};

// ---------------------------------------------------------------------------
// The game is kept on this device (round 4, findings 13 and 44): after each action (debounced) and whenever the page is
// hidden, the engine state (plain data) and what the page needs to pick up where she left off. A save made under another
// rules version is set aside, not loaded. The District clock does not run while she is away. Signed in, the same save
// also goes up to the server (game/net.js, docs/server-api.md), so any device picks up the last game saved.
// ---------------------------------------------------------------------------
const SAVE_V = `${R.version}|scandal-v2-r5`; // r5: the Ladder, the Morning Special, milestones, per-whore road forks
let saveTimer = null;
// a throttle, not a debounce: the District clock acts every second, so a debounce would never fire
function saveSoon() { if (!saveTimer) saveTimer = setTimeout(saveGame, 1200); }
function saveGame() {
  clearTimeout(saveTimer); saveTimer = null;
  if (!ui.S || !ui.active) return;
  const { lastEvents: _drop, ...S } = ui.S;
  const game = { v: SAVE_V, at: Date.now(), S, ui: {
    active: ui.active, name: ui.name, firstTl: ui.firstTl, steps: [...ui.steps], taught: [...ui.taught], tips: ui.tips, hist0: ui.hist0,
    think: ui.think, delightedOnce: [...ui.delightedOnce], secSeen: [...ui.secSeen], unfold: [...ui.unfold], studied: ui.studied, leaning: ui.leaning, voices: ui.voices,
    stamped: [...ui.stamped], jobs: ui.jobs, advised: ui.advised,
    things: Object.fromEntries(Object.entries(ui.things).map(([k, s]) => [k, [...s]])),
  } };
  const ok = store.set('game', game);
  net.saved(game); // signed in, this arms the upload (net.js paces it)
  if (!ok && !ui.saveWarned) { ui.saveWarned = true; headline({ kicker: 'The presses', head: 'This browser won\'t save your game', sub: 'It still plays, but a reload will wipe it.', wire: true }); }
}
function loadSave() {
  const g = store.get('game', null);
  if (!g || !g.S || !g.ui) return null;
  return g.v === SAVE_V ? g : { stale: true };
}
function resumeGame() {
  const g = loadSave(); if (!g || g.stale) return false;
  markMet(); // she has played on this device (also marks saves from before the flag existed)
  ui.S = g.S; ui.S.lastEvents = [];
  const u = g.ui; ui.active = u.active; ui.name = u.name || 'Anonymous'; ui.firstTl = u.firstTl;
  ui.steps = new Set(u.steps || []); ui.taught = new Set(u.taught || []); ui.tips = u.tips || []; ui.hist0 = u.hist0 || {};
  ui.think = u.think || { renown: 0 }; ui.delightedOnce = new Set(u.delightedOnce || []); ui.secSeen = new Set(u.secSeen || []); ui.unfold = new Set(u.unfold || []);
  ui.studied = u.studied || null; ui.leaning = u.leaning || {}; ui.voices = u.voices || {};
  ui.stamped = new Set(u.stamped || []); // a save from before round 7 may carry roadPick and fork: ignored
  ui.jobs = u.jobs || {}; ui.advised = u.advised || {};
  ui.things = Object.fromEntries(Object.entries(u.things || {}).map(([k, a]) => [k, new Set(a)]));
  setEra(tlOf(ui.active), false); armBack();
  // pick up mid-Assignation where she left it
  go(ui.S.whores[ui.active] && ui.S.whores[ui.active].assignation ? 'assign' : 'front');
  return true;
}
// hidden: save, then send what is unsent while the page is still alive (nothing goes up on pagehide: a keepalive request
// caps its body at 64 KiB and a save is about 240 KB)
document.addEventListener('visibilitychange', () => { if (document.hidden) { saveGame(); net.flush(); } });
window.addEventListener('pagehide', saveGame);

// ---------------------------------------------------------------------------
// The nom de plume and the cloud save (game/net.js; the contract is docs/server-api.md). A guest's game lives on this
// device only. Logged in with a password, it is also kept on the server under her nom de plume, last save wins. Nothing
// waits for the server: the page renders at once, and when the server cannot be reached the game plays on as a guest
// game, with one gentle notice per page load.
// ---------------------------------------------------------------------------
let signing = false; // a login, a new account or a log-out is in flight
const acctName = () => { const a = net.account(); return a.name || a.hint; };
// The nom de plume goes on the game itself too (the in-game boards show account `you`), in the server's spelling.
function wearName(name) {
  if (!name) return;
  ui.name = name;
  if (ui.S && ui.active) { const me = ui.S.accounts[ME]; if (me && me.name !== name) { me.name = name; saveGame(); } return; }
  const g = loadSave();
  if (g && !g.stale && g.S.accounts[ME] && (g.S.accounts[ME].name !== name || g.ui.name !== name)) { g.S.accounts[ME].name = name; g.ui.name = name; store.set('game', g); }
}
// A cloud game that arrives while another is on screen: the page reloads and picks it up (store 'hello' carries the
// headline across), so nothing half-swapped survives. The game on screen must not be saved over it on the way out.
function reloadOnto(head, sub) {
  clearTimeout(saveTimer); net.cancel(); ui.S = null; ui.active = null;
  store.set('hello', { head, sub });
  location.reload();
}
let netNoticed = false;
function netNotice() {
  if (netNoticed) return; netNoticed = true;
  headline({ kicker: 'The presses', head: 'Saved on this device for now', sub: 'Can\'t reach our server. Play on: nothing is lost.', wire: true });
}
// Re-print the title page (logged in or out) without losing what she has typed, or which form is open.
function retitle() {
  if (ui.screen !== 'title' || signing) return;
  if (!acctName()) saveDraft(); // logged in, the forms are leaving: what was typed in them is not kept
  render({ noScroll: true });
  fillDraft();
}
// What the server said (net.js calls this).
function onNet(type) {
  if (type === 'named') { wearName(acctName()); retitle(); if (ui.modal && ui.modal.type === 'menu') renderModal(); }
  else if (type === 'cloud') {
    // another device saved since this one last looked: that game is now the one in the local store (last save wins)
    const sub = `Another device saved a newer game under ${acctName()}.`;
    if (ui.S && ui.active) reloadOnto('Newer save loaded', sub);
    else if (ui.screen === 'title') { ui.name = acctName(); retitle(); }
    else headline({ kicker: 'Your account', head: 'A newer save is waiting', sub, go: { act: 'resume', label: 'Load it' }, wire: true });
  } else if (type === 'signed-out') {
    retitle();
    if (ui.modal && ['menu', 'acct'].includes(ui.modal.type)) renderModal();
    headline({ kicker: 'The front desk', head: 'Logged out on this device', sub: 'You can keep playing here as a guest. To log back in: Menu, then Keep your game anywhere.', wire: true });
  } else if (type === 'down') netNotice();
}

// ---------------------------------------------------------------------------
// The back gesture (round 4, finding 44): Android's back and Safari's edge swipe close what is open, or take her back to
// the front page; they never leave the game. One guard entry sits on the history stack and is put back after each use.
// ---------------------------------------------------------------------------
let backArmed = false;
function armBack() { if (backArmed) return; try { history.pushState({ lw: 'guard' }, ''); backArmed = true; } catch { /* fine */ } }
window.addEventListener('popstate', () => {
  backArmed = false;
  if (!ui.S || !ui.active) {
    // the guide read again from the suspects' page: back on its first page closes it, as Close does
    if (ui.screen === 'overview' && ui.ovReturn && ui.ovPage === 0) { ACTS['ov-done']({ id: 'skip' }); return; }
    if (ui.screen === 'overview' && ui.ovPage > 0) { ovGoTo(ui.ovPage - 1); armBack(); }
    return; // before the game, back is the browser's own
  }
  if (ui.overlays > (ui.modal ? 1 : 0)) { armBack(); return; } // the curtain is falling: wait for it
  if (ui.modal) closeModal();
  else if (ui.screen === 'assign') ACTS['cancel-assign']();
  else if (ui.screen === 'plan') go('front');
  else if (ui.screen === 'results') ACTS['after-results']();
  else if (['timelines', 'players', 'end'].includes(ui.screen)) go('front');
  armBack();
});

// ---------------------------------------------------------------------------
// Engine glue
// ---------------------------------------------------------------------------
const mine = (evs) => (evs || []).filter((e) => e.vis === 'all' || (Array.isArray(e.vis) && e.vis.includes(ME)));
function act(fn, ...args) {
  try {
    ui.S = fn(ui.S, ...args);
    snapAfterCurtains(ui.S.lastEvents);
    saveSoon();
    return mine(ui.S.lastEvents);
  } catch (e) {
    if (e && e.name === 'RulesError') {
      headline({ kicker: 'Oops', head: 'Can\'t do that', sub: e.message });
      sfx('thud');
      return null;
    }
    throw e;
  }
}
// Each of your whores' History as it stood when her last Curtain fell: the hindsight's casual baseline starts from it, so
// a Regular or Seen It from today's Assignations counts as thinking, not as something Best Guess knew.
function snapAfterCurtains(evs) {
  const tls = new Set((evs || []).filter((e) => e.type === 'curtain').map((e) => e.timeline));
  if (!tls.size || !ui.S.accounts[ME]) return;
  for (const wid of ui.S.accounts[ME].whores) if (tls.has(tlOf(wid))) ui.hist0[wid] = L.getView(ui.S, wid).whore.history;
}
const V = (who = ui.active) => L.getView(ui.S, who);
const acctView = () => L.getView(ui.S, ME, { focus: ui.active }).account;
const tlOf = (wid) => C.CHARACTERS[wid].timeline;
const curtainIn = (tl) => ui.S.timelines[tl].lastCurtainAt + ui.S.opts.maxGapMin - ui.S.clock;
// a whore who has sealed is waiting for her Curtain, not holding the District clock at last call
const sealedW = (wid) => { const p = ui.S.whores[wid] && L.getView(ui.S, wid).whore.plan; return !!(p && p.sealed); };
// A due Curtain is only an alarm when it is holding something up: another of your Timelines (the District clock waits for
// it), or once the first Curtain has been played. On the first evening it simply waits for you.
function lastCallUrgent() {
  if (ui.steps.has('curtain')) return true;
  return !!(ui.S && ui.S.accounts[ME]) && acctView().whores.length > 1;
}
// The Curtain clock is words, never hours and minutes: the District runs one district minute per real second of play, so
// "2h 50m" meant under three real minutes and ticked every second. The words (L.curtainWhen) change at most once a minute,
// and a due Curtain waits for her: "later on", "soon", "any minute now", then "last call!" or "when you're ready".
// District minutes left before this Timeline's Curtain, as the page tells it. A whore of yours who has sealed waits for the
// stand-ins, not the clock: her Curtain falls when the last of them seals (sealing.lastAt; once everyone has, as soon as
// the house's gap allows) or when it's due, whichever comes first. A sealed whore never holds the clock, so the floor of 2
// keeps her out of last call. The chip, every Curtain line and the seal line all read this, so they always agree.
function curtainLeft(tl) {
  const m = curtainIn(tl); const a = ui.S.accounts[ME];
  const wid = a && a.whores.find((id) => ui.S.whores[id] && !ui.S.whores[id].retired && ui.S.whores[id].timeline === tl);
  if (!wid || !sealedW(wid)) return m;
  const T = V(wid).timeline; const sg = T.sealing;
  const at = sg.sealed >= sg.total ? T.earliestCurtainAt : sg.lastAt;
  return Math.max(2, at == null ? m : Math.min(at - ui.S.clock, m));
}
function cdText(tl) {
  const k = L.curtainWhen(curtainLeft(tl));
  if (k === 'due') return lastCallUrgent() ? 'last call!' : 'when you\'re ready';
  // on the first evening a due Curtain waits for her, so nothing is "any minute now" until it's her move
  if (k === 'near' && !lastCallUrgent()) return C.LINES.curtainWhen.soon;
  return C.LINES.curtainWhen[k];
}
// the Purse chip's clock, one short word: "later", "soon", then "now!" or "ready"
const CHIP_WHEN = { later: 'later', soon: 'soon', near: 'soon' };
function cdShort(tl) {
  const k = L.curtainWhen(curtainLeft(tl));
  if (k === 'due') return lastCallUrgent() ? 'now!' : 'ready';
  return CHIP_WHEN[k];
}

// ---------------------------------------------------------------------------
// Art (shared era art, with the stand-in map; a missing file shows the era frame and the name)
// ---------------------------------------------------------------------------
// v2 trusts the art list (make-assets.mjs rewrites it after every batch): a painting EXISTS lists loads as is; a missing
// one with a stand-in goes straight to the stand-in (no 404 per render); anything else is never requested and shows the
// era frame and the name (or, for a card thumb, the Art emblem). A file that fails anyway falls back the same way. One
// base path for all art (ART_BASE), so a hosted build can move it. Re-run `node game/make-assets.mjs` after an art batch.
const ART_BASE = '../art-assets/';
function artOf(p) {
  if (!p) return null;
  const k = p.replace(/^\.\.\/art-assets\//, '');
  if (EXISTS.has(k)) return { src: `${ART_BASE}${k}` };
  const s = STANDINS[k];
  return s ? { src: `${ART_BASE}${s.use}`, pos: s.pos || '' } : null;
}
// No decoding="async": a re-rendered section re-creates its <img>s, and async decoding flashes them blank for a frame.
function img(p, alt, o = {}) {
  const a = artOf(p);
  if (!a) return `<div class="miss ${o.cls || ''}">${esc(alt)}</div>`;
  const pos = o.pos || a.pos;
  const load = o.eager ? ' loading="eager"' : ' loading="lazy"';
  return `<img class="${o.cls || ''}" src="${a.src}" alt="${esc(alt)}"${load}${pos ? ` style="object-position:${pos}"` : ''}>`;
}
document.addEventListener('error', (e) => {
  const t = e.target;
  if (!t || t.tagName !== 'IMG' || t.dataset.dead) return;
  t.dataset.dead = '1';
  if (t.classList.contains('thumb')) { // a card with no painting keeps the same 4:3 box, with its Art's emblem
    const ph = document.createElement('span'); const art = t.dataset.ph || 'none';
    ph.className = `thumb ph ph-${art}`; ph.setAttribute('aria-hidden', 'true');
    ph.innerHTML = art === 'curse' ? '!' : ART_SVG[art] ? artIcon(art, 'big') : '✦';
    t.replaceWith(ph); return;
  }
  const d = document.createElement('div'); d.className = 'miss'; d.textContent = t.alt || '';
  t.replaceWith(d);
}, true);
const exprArt = (cid, key) => (C.CHARACTERS[cid].expressions && C.CHARACTERS[cid].expressions[key] ? C.CHARACTERS[cid].expressions[key].art : C.CHARACTERS[cid].art);

// ---------------------------------------------------------------------------
// Sound: WebAudio only, created on the first gesture, mutable
// ---------------------------------------------------------------------------
const snd = { ctx: null, master: null };
function audioInit() {
  if (snd.ctx) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    snd.ctx = new AC(); snd.master = snd.ctx.createGain(); snd.master.gain.value = ui.muted ? 0 : 0.5; snd.master.connect(snd.ctx.destination);
  } catch { snd.ctx = null; }
}
function tone(f, t0, dur, type = 'sine', vol = 0.3, slide = 0) {
  const c = snd.ctx; const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(snd.master); o.start(t0); o.stop(t0 + dur + 0.03);
}
function noise(t0, dur, vol = 0.3, hp = 1000) {
  const c = snd.ctx; const n = Math.max(1, Math.floor(c.sampleRate * dur));
  const b = c.createBuffer(1, n, c.sampleRate); const d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = c.createBufferSource(); s.buffer = b; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  const g = c.createGain(); g.gain.value = vol; s.connect(f); f.connect(g); g.connect(snd.master); s.start(t0);
}
function sfx(name, era) {
  if (!snd.ctx || ui.muted) return;
  try {
    if (snd.ctx.state === 'suspended') snd.ctx.resume();
    const t = snd.ctx.currentTime + 0.01;
    switch (name) {
      case 'clack': noise(t, 0.035, 0.22, 2600); noise(t + 0.07, 0.03, 0.16, 2600); break;
      case 'stamp': tone(95, t, 0.28, 'sine', 0.6, 0.5); noise(t, 0.09, 0.35, 400); break;
      case 'thud': tone(70, t, 0.2, 'sine', 0.4, 0.6); break;
      case 'coin': tone(1760, t, 0.12, 'triangle', 0.22); tone(2637, t + 0.07, 0.28, 'triangle', 0.18); break;
      case 'whoosh': noise(t, 0.35, 0.16, 700); break;
      case 'flip': noise(t, 0.05, 0.14, 1800); tone(520, t, 0.07, 'triangle', 0.07, 1.6); break;
      case 'curtain': noise(t, 1.0, 0.1, 140); tone(55, t, 1.0, 'sine', 0.22); break;
      case 'tada': [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.09, 0.32, 'triangle', 0.2)); break;
      case 'sad': [392, 370, 330].forEach((f, i) => tone(f, t + i * 0.2, 0.32, 'sine', 0.18)); break;
      case 'era': eraMotif(era || docEra(), t); break;
      default: break;
    }
  } catch { /* audio is optional */ }
}
function eraMotif(era, t) {
  if (era === 'victorian') [784, 988, 1175, 1568, 1175].forEach((f, i) => tone(f, t + i * 0.12, 0.6, 'sine', 0.13));
  else if (era === 'wildwest') { tone(196, t, 0.5, 'sawtooth', 0.06, 1.5); tone(294, t + 0.28, 0.6, 'sawtooth', 0.05, 0.75); noise(t + 0.62, 0.05, 0.14, 3200); noise(t + 0.7, 0.05, 0.1, 3600); }
  else if (era === 'vegas') [440, 554, 659, 880, 1109, 1319].forEach((f, i) => tone(f, t + i * 0.07, 0.22, 'square', 0.045));
}
function setMuted(m) {
  ui.muted = m; store.set('muted', m);
  if (snd.master) snd.master.gain.value = m ? 0 : 0.5;
  if (ui.modal) renderModal(); else if (ui.screen === 'title') { const b = $('.title-sheet [data-act="mute"]'); if (b) { b.innerHTML = `${m ? ICON.mute : ICON.sound}${m ? 'Sound: off' : 'Sound: on'}`; b.setAttribute('aria-pressed', String(!m)); } }
}

// ---------------------------------------------------------------------------
// Glossary: every dotted word opens an EXCLUSIVE. [headline, body, see-also keys]; every number comes from RULES, so a
// balance change never leaves the glossary lying. The see-also chips are the second (and last) level of detail.
// ---------------------------------------------------------------------------
const PR_ = R.places; const SW = R.sway;
// Rule for every explanation (round 4, finding 25; enforced again in round 6, finding 8): the first sentence uses NO game
// terms at all, so a tap never sends a newcomer down a rabbit hole; the jargon starts in sentence 2,
// the detail comes after, and every term in it that has its own EXCLUSIVE is dotted (linkTerms). {salon} and {gutter} are
// the seats' names in the era she is playing (finding 41: the Salon Seat is Victorian).
const GLOSS = {
  sway: ['How smitten is he?', 'Your score with one gentleman: how hard he\'s fallen for you. Each card adds its Allure, plus a tick for each thing he likes. Highest Sway at a Place wins.', ['tick', 'bar', 'allure']],
  bar: ['Mind the Bar', `How keen he has to be before he pays out. Reach his Bar and he's Satisfied; beat it by ${R.assign.delightMargin} (his Delight) and he's Delighted. Fall short and you get the door gift and a Brave Face.`, ['braveface', 'doorgift']],
  tick: ['Tick! He likes it', `Cards he likes score extra. A card earns +${R.card.taste} if it carries any of his Tastes (once, however many), +${R.card.secret} for his Secret Taste, and +${R.card.signature} for your Signature Art. Glowing cards are safe bets.`, ['aversion', 'secret', 'signature']],
  aversion: ["Crossed! He hates it", `Every man has one thing he can't stand. A card carrying his Aversion loses ${R.card.aversion}. Leave it in your purse: cards you keep can still pay Coin.`, ['tick', 'pocket']],
  fancy: ['His Fancy', `The kind of girl he goes weak for. If it's your Type, +${SW.fancy} Sway the moment you walk in.`, ['type']],
  type: ['Her Type', 'What kind of girl she is: Siren (Silk), Bluestocking (Wit), Hustler (Gold), Enigma (Mask) or Minx (Frolic). Every gentleman has a Fancy for one of them.', ['fancy', 'arts']],
  signature: ['Signature Art', `What she does best. Every card carrying her Signature Art scores +${R.card.signature}, whoever she's working on.`, ['arts']],
  unknown: ['+? His secrets', 'The number counts only what you know about him. His Secret Taste and his Kink, while still secret, can only add to it, never take away. Hit one and it lands as a surprise when you play.', ['secret', 'kink', 'study']],
  secret: ['Secret Taste', 'Something he likes but would never admit. It stays hidden until you Study him or hit it by accident. Secrets only ever help you.', ['study', 'tell']],
  kink: ['The Kink', `His favourite naughty thing, and his biggest weakness. Bring the right novelty, or work the right cards, for +${SW.kink} Sway. Study him twice to learn it, or buy the novelty his Tell points to. Win with it and something unspeakable happens behind a curtain.`, ['study', 'tell', 'rummage', 'market']],
  tell: ['Read his Tells', 'Free clues printed on every gentleman. They hint at his Secret Taste and his Kink. A stallholder who quotes one is selling you his Kink.', ['secret', 'kink']],
  freshness: ['How fresh is he?', 'How clean he is. Scrubbed, Fair or Ripe: it decides how much Itch your Frolic cards give you. Scrubbed gentlemen carry nothing.', ['itch']],
  itch: ['The Itch', `A risk meter for romping with the wrong sort. Frolic cards on a Fair or Ripe gentleman raise it, from 0 to ${R.itchMax}. At ${R.itchMax} you catch whatever he carries. It fades when you behave yourself for a night, and Best Guess never takes you there.`, ['affliction', 'freshness']],
  affliction: ['Afflictions', 'Something you caught. A curse card that clogs your deck and costs you until a quack cures you. You always get a warning first.', ['itch']],
  roads: ['Two papers', 'Two ways to be famous: be admired, or be talked about. The Society Pages follow your Standing; the Police Gazette follows your Notoriety. They sit on a seesaw: when one goes up by 1, the other comes down by 1. Both papers lead to a Legendary seat.', ['roadpick', 'highroad', 'lowroad']],
  roadpick: ['Which paper you\'re in', 'You don\'t pick a paper: your nights do. When your Notoriety passes your Standing, you\'re in the Police Gazette. When your Standing passes your Notoriety, you\'re back in the Society Pages. While they\'re level, you stay where you were. In the Society Pages, Best Guess and the smileys guard your Standing. Your Standing Order picks Places that suit the paper you\'re in.', ['highroad', 'lowroad']],
  highroad: ['The Society Pages', `The admired paper. Standing opens the Posh houses (Standing ${PR_.posh.standingMin}+ and at least your Notoriety). At ${R.highRoad.invitationAt} the clean gentlemen send invitations (+${R.highRoad.invitationRenown} Renown for the first one you Delight each day); at ${SW.respectable.at} you're Respectable (+${SW.respectable.bonus} Sway at Posh Places, a shot at {salon}); at ${R.highRoad.patronAt} a Patron sends ${R.highRoad.patronCoin} Coin each morning; at ${R.highRoad.societyPagesAt}, the Society Pages, framed.`, ['standing', 'posh', 'roads']],
  lowroad: ['The Police Gazette', `The talked-about paper: quick money and low company. Back-alley gentlemen at Notoriety ${R.backAlleyAt}, black-market novelties at ${R.rummage.blackMarketAt}, bribes at ${SW.grease.at} (and bigger bribes at ${(SW.grease.maxUp || []).join(' and ')}). At ${SW.notorious.at} you're Notorious: +${SW.notorious.bonus} Sway at Rowdy and Gutter Places and a shot at {gutter}. The Posh doors shut while Notoriety beats your Standing.`, ['notoriety', 'gutter', 'roads']],
  standing: ['Standing', 'How respectable people think you are. It opens Posh doors and rich patrons, and rises when you shine somewhere respectable. Every point of Standing pushes Notoriety down, and the other way round.', ['highroad', 'roads']],
  notoriety: ['Notoriety', `How much people talk about you. It goes up by 1 when you walk into a Gutter Place, play Frolic cards at a Posh Place, win a back-alley job or catch an Affliction. It pays Coin fast and opens the back alleys, but Posh doors shut while it beats your Standing. At ${R.frontPageAt}: the Front Page.`, ['lowroad', 'roads']],
  renown: ['Renown', `Fame, the score that matters. Climb from Common to Rare at ${R.tiers.rare} and Epic at ${R.tiers.epic}. Legendary and Mythic are seats you must win from whoever sits in them.`, ['eratitle', 'whorescore']],
  coin: ['Coin', 'Money. It buys novelties, cards, cures and bribes. Gold cards you keep in your purse pay Coin. Your Coin is always on screen.', ['pocket']],
  gossip: ['Gossip', 'Dirt you can trade. You earn it from Delights and back doors. Trade a piece on a rival\'s profile (tap her in The competition) to learn where she went last Curtain, with how much Sway, and where she is heading tonight.', ['rivals']],
  whorescore: ['Whorescore', `Your score across every whore and every season. Each rung is worth three of the one below, plus one: Common ${R.whorescore.common}, Rare ${R.whorescore.rare}, Epic ${R.whorescore.epic}, Legendary seat ${R.whorescore.legendary}, Mythic seat ${R.whorescore.mythic}. One mastered Timeline beats three skimmed ones.`, ['renown', 'boards']],
  timeline: ['Timelines', 'A different era\'s red-light street, with its own clock, rivals and gossip. You run one whore in each. While one waits for her Curtain, play another.', ['curtain', 'lastcall']],
  curtain: ['The Curtain', 'A night out ends at the Curtain, several times a District day. Everyone who chose the same Place shows their cards, and the most Sway takes the biggest share. The Curtain falls as soon as everyone has sealed, or when it\'s due. If she hasn\'t sealed by then, it waits for her.', ['split', 'seal', 'fullpay']],
  split: ['The split', 'Not winner-takes-all. 1st takes the lion\'s share and the Applause, 2nd and 3rd take smaller shares, and everyone who came gets a door gift.', ['doorgift', 'curtain']],
  assignation: ['Assignations', `Quick private jobs between the big nights, paid on the spot. Your deck lends you ${R.assignLend} cards; work 1 or ${R.assignMaxCards}. They pay less after the first few each day.`, ['bar', 'study']],
  study: ['Study', `Watch him from the bar to learn his secrets. Each Study reveals one hidden fact: his Secret Taste first, then his Kink. ${R.study.freePerDay} free a day, then ${R.study.extraCost} Coin.`, ['secret', 'kink']],
  rummage: ['Back doors', 'Poke about behind the houses for bargains. You find Coin, gossip, saucy postcards and odd novelties. The door marked FRESH STOCK always has something under the counter.', ['kink', 'gossip', 'album']],
  bestguess: ['Best Guess', `The lazy button, and it's good enough. It picks the cards that score best on what you can see, follows her paper, and never pushes your Itch to ${R.itchMax}. Thinking harder (Study, novelties, Talents) beats it.`, ['study', 'smileys']],
  seal: ['Seal it', 'Lock in tonight\'s plan. You can unseal until the Curtain falls.', ['curtain']],
  automaton: ['Automatons', 'Clockwork rivals run by the house. They always wear the brass key and are never ranked on Whorescore.', ['boards']],
  standin: ['Stand-ins', 'Players run by the house, not real people. Your Timeline\'s rival follows you to your first Curtain, so it opens with a clash. After that she goes where her Habit takes her: Study her to learn it, or trade Gossip to hear where she is heading.', ['gossip', 'rivals']],
  rivals: ['The competition', 'The other girls in your Timeline. Each has a Charm, a Talent and a Vice; Study her or trade Gossip to learn her habits.', ['gossip', 'upstage']],
  upstage: ['Upstage', `A dirty trick. ${C.TALENTS.upstage.text} Beat her by 3 or more, or be nowhere near her.`, ['talent']],
  fullpay: ['Full pay', `The first few nights out each day pay fame. Each whore's first ${R.curtain.fullPayPerDay} Curtains a day pay Renown; after that it's After Hours, Coin and door gifts only, until dawn. Play another Timeline, or go to bed and wake at dawn.`, ['timeline']],
  lastcall: ['Last call', 'Her Curtain is due, and the District waits while any of your whores is at last call. Seal her plan, or let her go: her Standing Order takes her to the Place with the most smileys.', ['curtain', 'smileys']],
  regular: ['Regulars and Grudges', `He remembers you, for better or worse. Each earlier visit where you reached his Bar is +1 next time (up to +${SW.regularCap}). Fall short and he holds a Grudge: −${SW.grudge} until you please him.`, ['seenit']],
  seenit: ['Seen It', `He remembers your act. A card you worked on him last time scores −${SW.seenIt}. Mix it up.`, ['regular']],
  house: ['House Rules', 'Each Place has its own taste. Some Arts score more there and some less: read the rule on the Place card before you pick.', ['arts']],
  smileys: ['Smileys', 'How well a house suits you tonight, from none to three faces, on what you can see. Best Guess and the Standing Order use the same sums, and follow her paper.', ['bestguess', 'roadpick']],
  eratitle: ['Era titles', 'What the period itself called her. A Victorian dollymop, a frontier crib girl, a Vegas streetwalker, climbing to grande horizontale, parlour-house madam or courtesan to the whales. The middle rungs differ by paper.', ['renown', 'roads']],
  doorgift: ['The door gift', `A little something for everyone who turns up: ${PR_.posh.doorGift} Coin. Showing up pays.`, ['split']],
  braveface: ['Brave Face', `A consolation for a near miss. Fell short of the Bar? +${SW.braveFace} Sway at your next Curtain. Chin up.`, ['bar']],
  arts: ['The five Arts', 'The five kinds of charm. Silk is looking good, Wit is banter, Gold is money talk, Mask is discretion, Frolic is a bawdy romp: strong, but it gives you the Itch.', ['tick', 'itch']],
  allure: ['Allure', 'A card\'s own strength, before ticks and crosses. The +N in the corner is what it adds tonight, ticks and all: that is the number the Sway meter adds up.', ['sway', 'tick']],
  pocket: ['Kept in the purse', 'Some cards pay Coin if you keep them instead of playing them.', ['coin']],
  digest: ['While You Were Away', 'What changed while you were elsewhere. A short gossip sheet, most important to you first, never more than five headlines.', ['timeline']],
  talent: ['Charms, Talents and Vices', 'Her quirks, good and bad. A Charm is always on. A Talent is a trick you can use once per Curtain. A Vice is a habit with an upside and a downside.', ['upstage']],
  raid: ['Raid Night', `The police drop in. Every ${['', '', 'second', 'third', 'fourth'][R.raidEvery] || `${R.raidEvery}th`} Curtain the Gutter Place is raided: Renown shares are halved; Coin isn't touched.`, ['gutter']],
  posh: ['Posh Places', `The respectable houses, with the biggest prizes. Bar ${PR_.posh.bar}. Open only while your Standing is ${PR_.posh.standingMin} or more and at least your Notoriety. Frolic cards here cost Notoriety.`, ['highroad', 'standing']],
  rowdy: ['Rowdy Places', `Loud, cheap and always open. Bar ${PR_.rowdy.bar}. A little Coin for 1st. Both papers drink here.`, ['roads']],
  gutter: ['Gutter Places', `The lowest dives in town. Bar ${PR_.gutter.bar}. Always open, and pays well in Coin. Walking in costs 1 Notoriety.`, ['lowroad', 'raid']],
  boards: ['The boards', 'Four ways to be famous. Whorescore ranks everyone. The side boards rank your best single whore, so depth beats breadth: Richest counts the most Coin one whore earned this season; Most Notorious and Most Respectable her peak meter (your second whore breaks a tie).', ['whorescore', 'roads']],
  tiers: ['Climbing the ladder', `How far up she is. Common, then Rare at ${R.tiers.rare} Renown, Epic at ${R.tiers.epic}. Rare brings a new title and a third Timeline; Epic brings the right to challenge for a seat (coming soon). Legendary and Mythic are seats.`, ['renown', 'whorescore', 'album']],
  purse: ['The Purse', 'Her money and her clock. Coin and the Curtain clock are always on screen: in the corner, or in the tray while you play. Tap it for her stats, which paper she\'s in, and what the next rung brings.', ['coin', 'curtain']],
  blackbook: ['The Little Black Book', 'Where she writes down what she learns. Secret Tastes you Study, Kinks you decode and Aversions you trip over go in it for good.', ['secret', 'kink']],
  novelty: ['Novelties', 'Odd objects bought behind the Places. Some add Sway, some protect you, and some are one gentleman\'s Kink.', ['kink', 'rummage']],
  // the better-cards tip (BRIEF2 item 6): the market is the only way to add a good card (rules.js buyCardM); {mkt} is this
  // Timeline's count, prices and its Notoriety -1 card (marketLine), so the tip never lies when the market changes
  market: ['The market', 'New cards for your deck, and the only place to get them. {mkt} A card you buy joins your hand after the next shuffle; an Assignation can borrow it sooner. Pick the Arts your gentlemen like (the ✓ on their cards). A curse clogs your deck until you pay for the cure.', ['arts', 'coin', 'notoriety']],
  place: ['Places', 'Where the night happens: three houses in each Timeline, one Posh, one Rowdy and one Gutter, each with a host tonight.', ['posh', 'rowdy', 'gutter']],
  album: ['The album', 'Keepsakes you collect. Saucy postcards turn up behind the back doors, gentlemen leave souvenirs, and every Kink win leaves a story behind the curtain.', ['rummage', 'kink']],
  deck: ['Her deck', 'All the cards you can play. Each Curtain you are dealt five; the ones you have used rest in a pile, and when the draw runs out the pile is shuffled back in. A card you buy in the market joins that pile, so it joins your hand after the next shuffle.', ['market', 'arts', 'affliction']],
};
// The name each EXCLUSIVE is filed under in the A to Z and the see-also chips (the headline is the joke; this is the term)
const TERM = { sway: 'Sway', bar: 'The Bar', tick: 'Ticks and Tastes', aversion: 'Aversion', fancy: 'Fancy', type: 'Type', signature: 'Signature Art', secret: 'Secret Taste', kink: 'Kink', tell: 'Tells', freshness: 'Freshness', itch: 'The Itch', affliction: 'Afflictions', roads: 'Two papers', roadpick: 'Which paper', highroad: 'The Society Pages', lowroad: 'The Police Gazette', standing: 'Standing', notoriety: 'Notoriety', renown: 'Renown', coin: 'Coin', gossip: 'Gossip', whorescore: 'Whorescore', timeline: 'Timelines', curtain: 'The Curtain', split: 'The split', assignation: 'Assignations', study: 'Study', rummage: 'Back doors', bestguess: 'Best Guess', seal: 'Sealing', automaton: 'Automatons', standin: 'Stand-ins', rivals: 'Rivals', upstage: 'Upstage', fullpay: 'Full pay', lastcall: 'Last call', regular: 'Regulars and Grudges', seenit: 'Seen It', house: 'House Rules', smileys: 'Smileys', eratitle: 'Era titles', doorgift: 'The door gift', braveface: 'Brave Face', arts: 'The five Arts', allure: 'Allure', pocket: 'Kept in the purse', digest: 'While You Were Away', talent: 'Charms, Talents and Vices', raid: 'Raid Night', posh: 'Posh Places', rowdy: 'Rowdy Places', gutter: 'Gutter Places', boards: 'The boards', tiers: 'Tiers', purse: 'The Purse', blackbook: 'The Little Black Book', novelty: 'Novelties', place: 'Places', album: 'The album', market: 'The market', deck: 'Her deck' };
// The seats' names in the era she is playing (falls back to the house's Victorian names before a whore is chosen)
const curTl = () => (ui.S && ui.active ? tlOf(ui.active) : null);
const seatOf = (id) => L.seatName(id, curTl());
function glossOf(k) {
  const g = GLOSS[k]; if (!g) return null;
  return [g[0], g[1].replace(/\{salon\}/g, seatOf('salon')).replace(/\{gutter\}/g, seatOf('gutter')).replace(/\{crown\}/g, seatOf('crown')).replace(/\{mkt\}/g, () => marketLine(curTl())), g[2]];
}
// Dot every term that has its own EXCLUSIVE, the first time it appears in a body (never the body's own term). Escapes the
// text itself, so it takes plain text and returns HTML.
const VOCAB = [['Little Black Book', 'blackbook'], ['Secret Tastes?', 'secret'], ['Signature Art', 'signature'], ['Best Guess', 'bestguess'], ['Raid Night', 'raid'],
  ['Brave Face', 'braveface'], ['House Rules?', 'house'], ['Seen It', 'seenit'], ['Society Pages', 'roadpick'], ['Police Gazette', 'roadpick'], ['High Road', 'highroad'],
  ['Low Road', 'lowroad'], ['After Hours', 'fullpay'], ['door gift', 'doorgift'], ['Posh (?:Places?|houses?|doors?)', 'posh'], ['Rowdy (?:Places?)', 'rowdy'],
  ['Gutter (?:Places?)', 'gutter'], ['Standing Order', 'lastcall'], ['Sway', 'sway'], ['Bar', 'bar'], ['Allure', 'allure'], ['Tastes?', 'tick'], ['Aversions?', 'aversion'],
  ['Fancy', 'fancy'], ['Type', 'type'], ['Kinks?', 'kink'], ['Tells?', 'tell'], ['Scrubbed|Fair|Ripe', 'freshness'], ['Itch', 'itch'], ['Afflictions?', 'affliction'],
  ['Standing', 'standing'], ['Notoriety', 'notoriety'], ['Renown', 'renown'], ['Coin', 'coin'], ['Gossip', 'gossip'], ['Whorescore', 'whorescore'],
  ['Timelines?', 'timeline'], ['Curtains?', 'curtain'], ['Assignations?', 'assignation'], ['Study', 'study'], ['Respectable', 'highroad'], ['Notorious', 'lowroad'],
  ['Regulars?', 'regular'], ['Grudges?', 'regular'], ['smileys', 'smileys'], ['novelt(?:y|ies)', 'novelty'], ['Places?', 'place'], ['Talents?|Charms?|Vices?', 'talent'],
  ['Upstage', 'upstage'], ['Stand-ins?', 'standin'], ['Automatons?', 'automaton'], ['Legendary|Mythic|Epic|Rare', 'tiers'], ['Arts', 'arts'], ['Full pay', 'fullpay'],
  // "the market" (the cards), never the "black market" (novelties under the counter)
  ['(?:the|The) market', 'market']];
const VOCAB_RE = new RegExp(`\\b(${VOCAB.map(([r]) => `(?:${r})`).join('|')})\\b`, 'g');
const VOCAB_ONE = VOCAB.map(([r, k]) => [new RegExp(`^(?:${r})$`), k]);
function linkTerms(text, self) {
  const used = new Set([self]); const src = String(text ?? ''); let out = ''; let last = 0;
  for (const m of src.matchAll(VOCAB_RE)) {
    const hit = VOCAB_ONE.find(([re]) => re.test(m[0])); const k = hit && hit[1];
    if (!k || used.has(k) || !GLOSS[k]) continue;
    used.add(k);
    out += escE(src.slice(last, m.index)) + `<button class="x" data-x="${k}">${esc(m[0])}</button>`;
    last = m.index + m[0].length;
  }
  return out + escE(src.slice(last));
}
const termOf = (k) => TERM[k] || (GLOSS[k] ? GLOSS[k][0] : k);

// ---------------------------------------------------------------------------
// Headlines: the house teaching UX. One line at a time, at the moment it matters.
// ---------------------------------------------------------------------------
// Rules of the strip: a teaching headline belongs to the screen it was written for (it is spiked if you have moved on);
// wire news (a Curtain falling elsewhere) may cross screens. Nothing prints over a result, a curtain or a telegram:
// the queue waits. With a card open, the headline prints inside the pop-up, above the card, never over it.
// v2: nothing is time-boxed. A headline stays until the player's next tap or its X; only a newer headline in the queue
// moves it on early (HL.makeWay). Step-by-step tips print only in "Show me the ropes" mode (ui.guided).
const HL = { makeWay: 1600, staleMs: 20000, maxAgeMs: 60000, retryMs: 400, outMs: 280 };
const hlq = []; let hlBusy = false; let hlTimer = null; let hlCur = null; let hlRetry = null; let lastTapAt = 0; let lastTapScreen = null;
function hlWrap() { let w = $('.hl-wrap'); if (!w) { w = document.createElement('div'); w.className = 'hl-wrap'; document.body.appendChild(w); } return w; }
const HOLDING_MODALS = ['result', 'telegram', 'confirm', 'digest', 'menu', 'things']; // nothing prints over these: the queue waits
// the Curtain results page holds the strip while the paper spins in and the standings are read
const hlBlocked = () => ui.overlays > (ui.modal ? 1 : 0) || !!(ui.modal && HOLDING_MODALS.includes(ui.modal.type)) || (ui.screen === 'results' && Date.now() < (ui.resultsHoldUntil || 0));
function headline(h) {
  // every headline belongs to the screen (and pop-up) it was written on, except wire news (wire: true)
  h.t = Date.now(); h.born = h.t; h.screen = ui.screen; h.modal = ui.modal && !HOLDING_MODALS.includes(ui.modal.type) ? ui.modal.type : null; if (!h.wire) h.scoped = true;
  // the same news twice in a row (a Study's "Secret Taste revealed" and "He gives himself away") prints once
  if (h.sub && ((hlCur && hlCur.sub === h.sub) || hlq.some((x) => x.sub === h.sub))) return;
  hlq.push(h);
  // every headline stays until it is dismissed or acted on; a news line makes way for the next one in the queue
  if (!hlBusy) nextHl(); else if (hlCur && !hlCur.teach) { clearTimeout(hlTimer); hlTimer = setTimeout(closeHl, HL.makeWay); }
}
function hlHTML(h) {
  return `<div class="hl" role="status">
    <span class="kicker">${esc(h.kicker || (h.teach ? 'Tip' : 'News'))}</span>
    <div class="h2">${escE(h.head)}</div>
    ${h.sub ? `<p>${escE(h.sub)}</p>` : ''}
    ${h.x || h.go || h.gos ? `<span class="hl-acts">${(h.gos || (h.go ? [h.go] : [])).map((g) => `<button class="btn small ${g.cls || ''}" data-act="${g.act}" data-id="${g.id || ''}">${esc(g.label)}</button>`).join('')}${h.x ? `<button class="link excl" data-x="${h.x}">More on ${esc(termOf(h.x))}</button>` : ''}</span>` : ''}
    <button class="close" data-act="hl-close" aria-label="Dismiss headline">&times;</button></div>`;
}
// Where a headline prints: inside an open pop-up (above the card); on the play screens in the page flow, between the
// cards and the tray (it pushes, never covers); elsewhere in the strip at the foot of the screen, beside the Menu button.
function paintHl() {
  // round 5: a card that has its own slot (the gentleman's card, findings 14 and 22) prints the tip inside the card, above
  // its buttons, so the sheet never grows past the screen; wire news on a browse screen goes to the fixed strip, and so
  // does a tip whose in-page slot is off-screen when a tap forbids the jump (finding 27)
  const wireStrip = hlCur && hlCur.wire && !ui.modal && !PLAY.includes(ui.screen);
  // round 6 (finding 24): a tip that arrives with a card (the first open) prints ABOVE the card, in the .mslot, so the card
  // opens at its top (portrait, kicker, Flip it) and nothing scrolls; a tip raised later, inside the card, uses its .cslot
  if (ui.modal && hlCur && hlCur.mslotPref == null) hlCur.mslotPref = performance.now() - (ui.modal.bornAt || 0) < 600;
  let slot = ui.modal ? (((hlCur && hlCur.mslotPref) ? null : $('#modal .cslot')) || $('#modal .mslot')) : wireStrip ? null : $('#app .hlslot');
  if (slot && hlCur && !PLAY.includes(ui.screen) && slot.matches('#app .hlslot') && performance.now() - lastTapAt < 450 && lastTapScreen === ui.screen) {
    const r = slot.getBoundingClientRect(); const trayH = ($('.tray') || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height;
    const off = slot.innerHTML ? (r.bottom < topClear() || r.top > window.innerHeight - trayH - 40) : (() => { const p = slot.previousElementSibling || slot.parentElement; const q = p.getBoundingClientRect(); return q.bottom < topClear() || q.bottom > window.innerHeight - trayH - 40; })();
    if (off) slot = null;
  }
  const html = hlCur ? hlHTML(hlCur) : '';
  document.querySelectorAll('#modal .mslot, #modal .cslot, #app .hlslot').forEach((x) => { if (x !== slot) x.innerHTML = ''; });
  const sc = $('#modal .scrim'); if (sc) requestAnimationFrame(() => { const ms = $('#modal .mslot'); sc.style.setProperty('--mslot-h', `${ms && ms.innerHTML ? Math.round(ms.getBoundingClientRect().height) + 8 : 0}px`); });
  if (slot) {
    // round 5 (findings 13 and 24): on the play screens the tip prints above the hand; the page is shifted by the tip's
    // height so the cards stay put under her thumb, and only moves further if the tip would otherwise be off-screen
    const anchor = slot.matches('.play-sheet .hlslot') ? $('.hand.play') : null; const a0 = anchor ? anchor.getBoundingClientRect().top : 0;
    // round 4 (finding 47): a closed headline's slot collapses (closeHl animates it shut), it never holds a blank hole
    if (html) { slot.innerHTML = html; slot.removeAttribute('style'); } else { slot.innerHTML = ''; slot.removeAttribute('style'); }
    if (anchor && html) { const d = anchor.getBoundingClientRect().top - a0; if (d) window.scrollTo(0, window.scrollY + d); }
    hlWrap().innerHTML = '';
    // bring it into view only when it is wholly off-screen, and never in the frame of a tap (finding 49: no jump under her)
    if (html && slot.matches('#modal .cslot')) requestAnimationFrame(() => slot.scrollIntoView({ block: 'nearest' }));
    if (html && slot.matches('#app .hlslot')) requestAnimationFrame(() => {
      // a tap on this very screen: no jump (finding 49), except on the play screens when the tip would otherwise be wholly
      // hidden above the hand (round 5, finding 27: a tip is never silently invisible)
      if (performance.now() - lastTapAt < 450 && lastTapScreen === ui.screen) { const q = slot.getBoundingClientRect(); if (!(PLAY.includes(ui.screen) && q.bottom < topClear())) return; }
      const r = slot.getBoundingClientRect(); const trayH = ($('.tray') || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height;
      // on the play screens a tip must sit wholly above the tray (round 5, finding 13); elsewhere only a wholly off-screen
      // tip is brought into view
      const play = PLAY.includes(ui.screen);
      if (play ? (r.top >= topClear() && r.bottom <= window.innerHeight - trayH - 8) : !(r.bottom < topClear() || r.top > window.innerHeight - trayH - 40)) return;
      // on the play screens the tip may only lift the page as far as the host's ticks-and-crosses row allows: his tastes
      // stay on screen
      const keep = play && (keepRow());
      if (keep && r.top >= topClear()) {
        // the tip must be whole and above the tray; it may lift the page as far as its own top edge
        let delta = Math.min(r.bottom + 8 - (window.innerHeight - trayH), r.top - topClear());
        // never leave the screen's headline half cut at the top edge: keep it whole (finding 18)
        const h2 = $('.play-sheet .h2'); if (h2) { const hr = h2.getBoundingClientRect(); if (hr.top - delta < 0 && hr.bottom - delta > 0) delta = Math.max(0, hr.top - 4); }
        if (delta > 0) window.scrollTo({ top: window.scrollY + delta, behavior: calm() ? 'auto' : 'smooth' });
      } else slot.scrollIntoView({ block: 'nearest', behavior: calm() ? 'auto' : 'smooth' });
    });
  } else hlWrap().innerHTML = html;
  if (ui.screen === 'assign' || ui.screen === 'plan') setTrayH();
}
function nextHl() {
  clearTimeout(hlRetry);
  if (hlBlocked()) {
    hlBusy = false; hlCur = null; paintHl();
    const now = Date.now(); hlq.forEach((x) => { x.t = now; }); // waiting behind a result is not going stale
    if (hlq.length) hlRetry = setTimeout(nextHl, HL.retryMs);
    return;
  }
  // spike the stale and the ones whose screen has gone; a page tip waits while a pop-up is open (and vice versa)
  for (let i = hlq.length - 1; i >= 0; i--) if ((!hlq[i].teach && (Date.now() - hlq[i].t > HL.staleMs || Date.now() - hlq[i].born > HL.maxAgeMs)) || (hlq[i].scoped && hlq[i].screen !== ui.screen)) hlq.splice(i, 1);
  const idx = hlq.findIndex(hlFits);
  const h = idx >= 0 ? hlq.splice(idx, 1)[0] : null;
  if (!h) { hlBusy = false; hlCur = null; paintHl(); if (hlq.length) hlRetry = setTimeout(nextHl, HL.retryMs); return; }
  hlBusy = true; hlCur = h; sfx('clack');
  paintHl();
  clearTimeout(hlTimer);
  // no reading timer: a headline closes on X, on the player's next tap, or when she leaves the screen; a news line with
  // another waiting behind it makes way
  if (!h.teach && hlq.some(hlFits)) hlTimer = setTimeout(closeHl, HL.makeWay * 2);
}
const PLAY_KEEP_TIP = ['pick', 'pick-hint', 'best-guess-a', 'best-guess-p', 'item-toggle', 'talent-toggle', 'de-art', 'stake', 'grease', 'bribe', 'slum', 'take-bet'];
function closeHl() {
  clearTimeout(hlTimer);
  const els = document.querySelectorAll('.hl');
  hlCur = null;
  if (!els.length) { nextHl(); return; }
  // a headline printed in the page flow fades, then its slot folds shut (only what is below it moves, and smoothly)
  els.forEach((el) => el.classList.add('out'));
  setTimeout(() => {
    els.forEach((el) => {
      const sl = el.parentElement;
      // round 6 (finding 18): on the play screens the tip goes at once and the page is scrolled by the same amount in the
      // same frame, so the hand stays exactly where her thumb is (no 220 ms fold under it)
      if (sl && sl.matches('.play-sheet .hlslot')) {
        const hand = $('.hand.play'); const a0 = hand ? hand.getBoundingClientRect().top : 0;
        el.remove(); sl.removeAttribute('style');
        if (hand) { const d = hand.getBoundingClientRect().top - a0; if (d) window.scrollBy(0, d); }
        return;
      }
      if (sl && sl.matches('#app .hlslot') && !calm()) {
        sl.style.height = `${Math.round(sl.getBoundingClientRect().height)}px`; sl.style.overflow = 'hidden';
        void sl.offsetHeight; sl.style.transition = 'height .22s ease'; sl.style.height = '0px';
        setTimeout(() => { if (!sl.querySelector('.hl:not(.out)')) sl.removeAttribute('style'); }, 240);
      }
      el.remove();
    });
    nextHl();
  }, calm() ? 10 : HL.outMs);
}
// call when the screen, a modal or an overlay changes: a held or stale headline goes back in the queue or is spiked
const hlFits = (h) => !h.scoped || (ui.modal ? h.modal === ui.modal.type : !h.modal);
function hlReflow() {
  if (hlCur && hlCur.scoped && hlCur.screen !== ui.screen) { closeHl(); return; }
  if (hlCur && (hlBlocked() || !hlFits(hlCur))) { hlq.unshift(hlCur); clearTimeout(hlTimer); hlCur = null; hlBusy = false; paintHl(); hlRetry = setTimeout(nextHl, HL.retryMs); return; }
  if (hlCur) paintHl(); else if (!hlBusy && hlq.length) nextHl();
}
// Tips that are about money or risk print even when "Show me the ropes" is off; every other tip goes quietly into How to
// play (Menu), where the curious can read the lot.
const SAFETY_TIPS = new Set(['lastcall', 'itchw', 'affl', 'noto', 'standing']);
// a key's first part (before any ':') decides whether it is a safety tip
function teach(key, head, sub, x, kicker, go) {
  if (ui.taught.has(key)) return;
  ui.taught.add(key);
  ui.tips.push({ key, head, sub, x });
  if (!ui.guided && !SAFETY_TIPS.has(String(key).split(':')[0])) return;
  // a tip with somewhere to go (the fork in the road) is news, not a page tip: it survives a screen change
  const gos = Array.isArray(go) ? go : null;
  if (go) headline({ key, head, sub, x, kicker, go: gos ? null : go, gos, wire: true, teach: true });
  else headline({ key, head, sub, x, kicker, scoped: true, teach: true });
}

// ransom-note lettering for the big moments
function ransom(text) {
  let h = 11;
  const words = String(text).split(' ').map((w) => `<span class="w">${[...w].map((ch) => {
    h = (h * 31 + ch.charCodeAt(0) * 7) % 1009;
    return `<span class="l r${h % 6}" style="transform:rotate(${(h % 9) - 4}deg)">${esc(ch)}</span>`;
  }).join('')}</span>`).join('');
  return `<span class="ransom" role="img" aria-label="${esc(text)}"><span aria-hidden="true" style="display:contents">${words}</span></span>`;
}

// ---------------------------------------------------------------------------
// Small renderers
// ---------------------------------------------------------------------------
const ICON = {
  paper: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h13v14H6a2 2 0 0 1-2-2z"/><path d="M17 8h3v9a2 2 0 0 1-2 2"/><path d="M7 9h7M7 12h7M7 15h4"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/></svg>',
  crown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/></svg>',
  sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
  mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
  key: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><circle cx="7" cy="12" r="4"/><path d="M11 12h10M17 12v4M20 12v3"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3.5 6.5 12 4l8.5 2.5v13L12 17l-8.5 2.5z"/><path d="M12 4v13M6.5 9.5h3M6.5 12.5h3M14.5 9.5h3M14.5 12.5h3"/></svg>',
  coin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.2c-.6-.8-1.5-1.2-2.6-1.2-1.6 0-2.7.9-2.7 2.1 0 2.8 5.6 1.5 5.6 4.1 0 1.2-1.2 2-2.8 2-1.2 0-2.2-.5-2.8-1.3M12 6.5V8M12 16v1.5"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="9"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  die: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><circle cx="8.5" cy="8.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1.4" fill="currentColor" stroke="none"/></svg>',
  letter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13"/><path d="m3.5 6.5 8.5 7 8.5-7"/></svg>',
  things: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5.2 9h13.6l1.2 10.5H4z"/><path d="M8.8 9V7.6a3.2 3.2 0 0 1 6.4 0V9"/><path d="M9.5 13.5h5"/></svg>',
};
function badgeFor(r, tag = 'button') {
  if (!r) return '';
  const x = (k) => (tag === 'button' ? ` data-x="${k}"` : '');
  if (r.automaton) return `<${tag} class="badge-auto"${x('automaton')}>${ICON.key} Automaton</${tag}>`;
  if (r.standin || r.label) return `<${tag} class="badge-stand"${x('standin')}>${esc(r.label === 'STAND-IN' ? 'Stand-in' : (r.label || 'Stand-in'))}</${tag}>`;
  return '';
}
function photo(p, alt, cap, o = {}) {
  return `<div class="photo ${o.cls || ''}">${o.pin === false ? '' : '<span class="pin"></span>'}${o.flip ? `<span class="dogear" data-flip="${o.flip}" aria-hidden="true">?</span>` : ''}<div class="frame halftone">${img(p, alt, { eager: o.eager })}</div>${cap ? `<div class="cap">${cap}</div>` : ''}</div>`;
}
function eraMini(tl, p, alt) { return `<div class="mini-frame mf-${tl}">${img(p, alt, { eager: true })}</div>`; }
// a novelty tile (a luggage tag, not a card: see .item in the CSS): the reticule on the front page and the hub's Novelties tab share it
// (o.flag: NEW tag; o.kink: say "for a Kink")
const itemTile = (it, o = {}) => `<button class="item" data-act="open-item" data-id="${it.idx}" data-hold="item:${it.idx}">${o.flag ? '<span class="flagtag">New</span>' : ''}${img(it.art, it.name)}<b>${esc(it.name)}</b><span class="small">${it.usesLeft > 50 ? 'Reusable' : plural(it.usesLeft, 'use')}${it.ready ? '' : ' · resting'}${o.kink && it.kind === 'kink' ? ' · for a Kink' : ''}</span></button>`;

// short enough for the narrowest card (finding 43: the Wild West and Vegas frames leave about 70px of text width)
const TICK_LABEL = { taste: '✓ Taste', secret: '✓ Secret!', signature: '✓ Sig', 'silver-tongue': '✓ Silver', aversion: '✗ Hates it' };
const PART_LABEL = {
  fancy: 'Fancy', kink: 'Kink!', regular: 'Regular', grudge: 'Grudge', 'seen-it': 'Seen it', 'make-him-wait': 'Made him wait', 'make-him-wait-now': 'Make Him Wait',
  respectable: 'Respectable', notorious: 'Notorious', 'grease-palms': 'Greased palms', 'brave-face': 'Brave Face', 'knows-which-fork': 'Knows Which Fork',
  'born-in-a-gin-shop': 'Born in a Gin Shop', 'mothers-ruin': "Mother's Ruin", 'bored-stiff': 'Bored Stiff', underestimated: 'Underestimated', jealousy: 'Jealousy',
  dimples: 'Dimples', vanity: 'Vanity', item: 'Novelty', affliction: 'Affliction',
};
const PART_X = { fancy: 'fancy', kink: 'kink', regular: 'regular', grudge: 'regular', 'seen-it': 'seenit', 'brave-face': 'braveface', item: 'kink', affliction: 'affliction' };

function cardEl(c, o = {}) {
  const arts = c.affliction ? '<span class="art">Affliction</span>' : (c.arts.length ? c.arts.map((a) => `<span class="art">${artLabel(a)}</span>`).join('') : '<span class="art">No Art</span>');
  const a = c.art ? artOf(c.art) : null;
  const marks = (o.marks || []).map((m) => `<span class="mk ${m.cls || ''}">${esc(m.t)}</span>`).join('');
  const score = o.score != null ? `<span class="score ${o.score > c.allure ? 'good' : o.score < c.allure ? 'bad' : ''}"><span class="sr">scores </span>${o.score > 0 ? '+' : ''}${o.score}</span>` : '';
  // every card has the same anatomy: a card without a painting gets the same 4:3 box with its Art's emblem
  const ph = c.affliction ? '!' : c.arts.length ? artIcon(c.arts[0], 'big') : '✦';
  const borrowed = !!(a && !EXISTS.has(c.art.replace(/^\.\.\/art-assets\//, ''))); // a painting still borrowed from another picture (assets.js STANDINS): toned in the CSS
  const thumb = a ? `<img class="thumb${borrowed ? ' borrowed' : ''}" src="${a.src}" alt="" loading="lazy" data-ph="${c.affliction ? 'curse' : c.arts[0] || 'none'}"${a.pos ? ` style="object-position:${a.pos}"` : ''}>` : `<span class="thumb ph ph-${c.arts[0] || 'none'}" aria-hidden="true">${ph}</span>`;
  // one number at a time: until the first Curtain only the +N the meter adds up shows; after that Allure is labelled
  const allure = c.affliction ? '<span class="allure">!</span>' : ui.taught.has('allure') ? `<span class="allure" aria-label="Allure ${c.allure}"><small>Allure</small>${c.allure}</span>` : '';
  // only a card you pick is a toggle (aria-pressed); a card you tap to read opens its inspect sheet
  const pressed = o.act === 'pick' ? ` aria-pressed="${o.sel ? 'true' : 'false'}"` : '';
  return `<button class="card ${c.affliction ? 'curse' : ''} ${o.sel ? 'sel' : ''} ${o.glow ? 'glow' : ''} ${o.deal ? 'deal' : ''}" data-act="${o.act || 'inspect-card'}" data-src="${o.src || 'hand'}" data-idx="${c.idx}" data-hold="card:${o.src || 'hand'}:${c.idx}"${pressed}${o.delay ? ` style="animation-delay:${o.delay}ms"` : ''}>
    <span class="dogear" data-flip="card:${o.src || 'hand'}:${c.idx}" aria-hidden="true">?</span>${o.flag ? `<span class="flagtag">${esc(o.flag)}</span>` : ''}
    <span class="top">${allure}${c.pocket && !o.noPocket && ui.steps.has('curtain') ? `<span class="pocket">+${c.pocket} kept</span>` : ''}${o.count > 1 ? `<span class="ct" aria-label="${o.count} copies">×${o.count}</span>` : ''}</span>
    <span class="nm">${esc(c.name)}</span>
    ${thumb}
    <span class="arts">${arts}</span>
    <span class="marks">${marks}</span>${score}</button>`;
}

// The Sway tray: one compact row (number, verdict, buttons) under a thin meter; the reasons fold behind "Why?".
// m: { sway, bar, delight, bg, parts, unknown, tourist, picked, sub, acts, outcome }
// An Assignation's verdict is the engine's own outcome (L.assignationPay), the same function that pays the result.
function meterVerdict(m) {
  if (!m.picked) return { t: 'No cards yet', cls: '' };
  if (m.outcome) {
    if (m.tourist && m.outcome === 'satisfied' && m.sway < m.bar) return { t: 'He\'s grateful already', cls: 'good' };
    return { delighted: { t: 'Past Delight!', cls: 'good' }, satisfied: { t: 'Over his Bar', cls: 'good' }, fizzled: { t: 'Short of his Bar', cls: 'bad' } }[m.outcome];
  }
  return m.sway >= m.bar ? { t: 'Likely a share', cls: 'good' } : { t: 'Short of his Bar', cls: 'bad' };
}
function meterTop(m) { return Math.max(m.bar + (m.delight ? R.assign.delightMargin : 0) + 3, m.sway + 2, (m.bg ?? 0) + 2, 8); }
function meterChips(m) {
  const parts = (m.parts || []).map((p) => `<button class="chip ${p.n > 0 ? 'good' : 'bad'}" data-x="${PART_X[p.key] || 'sway'}">${esc(PART_LABEL[p.key] || p.key)} ${p.n > 0 ? '+' : ''}${p.n}</button>`).join('');
  const gap = m.bg == null || !m.picked ? '' : m.sway > m.bg ? `<button class="chip stamp-c" data-x="bestguess">+${m.sway - m.bg} over Best Guess (${m.bg})</button>` : `<button class="chip" data-x="bestguess">┆ Best Guess ${m.bg}</button>`;
  return `${parts}${gap}${m.extra || ''}`;
}
// The fill is drawn with transform: scaleX (compositor only), never width, so the meter never triggers layout.
const meterScale = (x, top) => Math.min(1, Math.max(0, x / top)).toFixed(4);
function meterEl(m) {
  const top = meterTop(m);
  const pct = (x) => Math.min(100, Math.max(0, (x / top) * 100));
  const v = meterVerdict(m);
  const chips = meterChips(m);
  const from = m.from != null ? m.from : m.sway;
  return `<div class="meter">
    <div class="track"><div class="fill ${m.sway >= m.bar && m.picked ? 'ok' : ''}" style="transform:scaleX(${meterScale(from, top)})" data-s="${meterScale(m.sway, top)}"></div>
      <div class="mark" style="left:${pct(m.bar)}%"></div>
      ${m.delight ? `<div class="mark del" style="left:${pct(m.delight)}%"></div>` : ''}
      ${m.bg != null ? `<div class="mark bg" style="left:${pct(m.bg)}%"></div>` : ''}
    </div>
    <div class="mlabs" aria-hidden="true"><span style="left:${pct(m.bar)}%">Bar</span>${m.delight ? `<span class="del" style="left:${pct(m.delight)}%">Delight</span>` : ''}</div>
    <div class="line">
      <span class="big"><b class="num">${m.sway}</b><small><button class="x" data-x="sway">Sway</button></small></span>
      <span class="vwrap"><span class="verdict ${v.cls}">${esc(v.t)}</span><span class="subrow"><span class="sub">${m.sub || ''}</span>${m.unknown && !m.tourist ? '<button class="unk" data-x="unknown" aria-label="+? His secrets can only add to this">+?</button>' : ''}${chips ? `<button class="why" data-act="why" aria-expanded="${ui.why ? 'true' : 'false'}">${ui.why ? 'hide' : 'why?'}</button>` : ''}</span></span>
      ${trayPurse()}
    </div>
    ${chips && ui.why ? `<div class="legend chips">${chips}</div>` : ''}
    <span class="sr" aria-live="polite">Sway ${m.sway}. ${esc(v.t)}.</span>
  </div>`;
}

// the Purse, folded into the tray on the play screens (finding 46: the corner chip never covers the host or the cards)
function trayPurse() {
  if (!ui.S || !ui.active || !['assign', 'plan'].includes(ui.screen)) return '';
  const w = V().whore;
  return `<button class="tpurse" data-act="menu" data-id="stats" aria-label="${esc(w.name)}: ${w.coin} Coin. Open her stats"><span>${ICON.coin}<b data-tcoin>${w.coin}</b></span><span>${ICON.clock}<b data-cd="${w.timeline}" data-short="1">${cdShort(w.timeline)}</b></span></button>`;
}
const marksFor = (info) => (info ? info.ticks : []).map((t) => ({ t: TICK_LABEL[t] || t, cls: t === 'aversion' ? 'bad' : '' }));
// the Seen It stamp mirrors the engine's own 'seen-it' preview part (Bored Stiff is exempt there too)
function seenMark(v, gid, cid) {
  const h = v.whore.history[gid];
  return h && h.seen && h.seen.includes(cid) && v.whore.vice !== 'bored-stiff' ? [{ t: `−${R.sway.seenIt} Seen it`, cls: 'seen' }] : [];
}

// ---------------------------------------------------------------------------
// The two roads (the tracks) and the next rung: what the next step each way opens or closes. Thresholds come from RULES.
// ---------------------------------------------------------------------------
// Each road's rungs, perks first (round 4, finding 20: the Low Road is a road you choose, not a list of warnings). The seat
// names follow her era (finding 41).
function roadSteps(tl) {
  const G = R.sway.grease;
  return {
    // round 5 (finding 2): the Society Pages road has rungs of its own, mirroring the Police Gazette's
    standing: [
      { at: R.places.posh.standingMin, t: 'Posh doors open to you (while Standing is at least your Notoriety)', x: 'posh' },
      { at: R.highRoad.invitationAt, t: `Invitations: the first clean gentleman you Delight each day adds +${R.highRoad.invitationRenown} Renown`, x: 'highroad' },
      { at: R.sway.respectable.at, t: `Respectable: +${R.sway.respectable.bonus} Sway at Posh Places, and a shot at ${L.seatName('salon', tl)}`, x: 'highroad' },
      { at: R.highRoad.patronAt, t: `A Patron: ${R.highRoad.patronCoin} Coin in an unsigned envelope every morning`, x: 'highroad' },
      { at: R.seats.crown.meter, t: `Hold a seat and you can go for ${L.seatName('crown', tl)}`, x: 'tiers' },
      { at: R.highRoad.societyPagesAt, t: 'The Society Pages, framed', x: 'standing' },
    ].sort((a, b) => a.at - b.at),
    notoriety: [
      { at: R.backAlleyAt, t: 'Back-alley gentlemen will see you (and pay in Coin)', x: 'lowroad' },
      { at: R.rummage.blackMarketAt, t: 'The black market opens under the counter', x: 'lowroad' },
      { at: G.at, t: `Grease palms: buy up to +${G.max} Sway at Rowdy and Gutter Places`, x: 'lowroad' },
      { at: R.sway.notorious.at, t: `Notorious: +${R.sway.notorious.bonus} Sway at Rowdy and Gutter Places, bigger bribes, and a shot at ${L.seatName('gutter', tl)}`, x: 'lowroad' },
      { at: R.seats.crown.meter, t: `Hold a seat and you can go for ${L.seatName('crown', tl)}`, x: 'tiers' },
      ...(G.maxUp || []).filter((n) => n > R.sway.notorious.at).map((n) => ({ at: n, t: `The biggest bribes: up to +${G.max + (G.maxUp || []).filter((m) => m <= n).length} Sway`, x: 'lowroad' })),
      { at: R.assign.notorietyRefuseScrubbedAt, t: 'Closes a door: Scrubbed gentlemen stop seeing you', bad: true, x: 'notoriety' },
      { at: R.frontPageAt, t: 'The Front Page, framed', x: 'notoriety' },
    ].sort((a, b) => a.at - b.at),
  };
}
const ROAD_NAME = { standing: 'the Society Pages', notoriety: 'the Police Gazette' };
function roadInfo(w) {
  const s = w.standing; const n = w.notoriety; const ST = roadSteps(w.timeline);
  const nextS = ST.standing.find((x) => x.at > s) || null;
  const nextN = ST.notoriety.find((x) => x.at > n) || null;
  // round 7: her paper follows her meters (L.roadOf); say which she is in and, when it is close, how near the other one is
  const road = L.roadOf(w); const turn = w.roadTurn || L.roadTurn(w);
  const nx = road === 'notoriety' ? nextN : nextS;
  const near = turn.steps <= 1 ? (road === 'standing' ? 'The Gazette has noticed you' : 'Society is warming to you') : null;
  const aim = `In ${ROAD_NAME[road]}${near ? ` · ${near}` : nx ? ` · ${road === 'notoriety' ? 'Notoriety' : 'Standing'} ${nx.at} next` : ''}`;
  // said plainly, after the perks: where the seesaw leaves the Posh doors
  const poshWarn = s < n ? 'The Posh doors are shut while Notoriety beats your Standing; the Rowdy and Gutter houses are yours.'
    : s >= R.places.posh.standingMin ? 'The Posh doors stay open while your Standing is at least your Notoriety.' : '';
  return { s, n, nextS, nextN, aim, poshWarn };
}
// The era's market card that takes Notoriety down when Worked (the Charity Bazaar, Signing the Pledge, the Chapel
// Quickie): the way back once Scrubbed gentlemen stop seeing her (designer's decision 2026-10-08).
function redeemCard(tl) {
  const id = C.TIMELINES[tl].market.find((c) => (C.CARDS[c].effects || []).includes('notorietyDownOnWork'));
  return id ? C.CARDS[id] : null;
}
// What a Timeline's market sells, from content (BRIEF2 item 6): how many cards, the price range, its Notoriety -1 card.
// With no Timeline (the A to Z before she is hired) it speaks for all three.
function marketFacts(tl) {
  const tls = tl ? [tl] : Object.keys(C.TIMELINES);
  const counts = tls.map((t) => C.TIMELINES[t].market.length); const costs = tls.flatMap((t) => C.TIMELINES[t].market.map((c) => C.CARDS[c].cost));
  const range = (xs) => { const lo = Math.min(...xs); const hi = Math.max(...xs); return lo === hi ? `${lo}` : `${lo} to ${hi}`; };
  return { count: range(counts).replace(' to ', ' or '), price: `${range(costs)} Coin`, redeem: tl ? redeemCard(tl) : null, redeemAll: tls.every((t) => redeemCard(t)) };
}
// the market's line in the better-cards tip ({mkt} in GLOSS.market)
function marketLine(tl) {
  const f = marketFacts(tl);
  if (tl) return `This Timeline's market sells ${f.count} cards, for ${f.price} each.${f.redeem ? ` ${f.redeem.name} takes Notoriety down when you Work it.` : ''}`;
  return `Each Timeline's market sells ${f.count} cards, for ${f.price} each${f.redeemAll ? ', and one of them takes Notoriety down when you Work it' : ''}.`;
}
// one plain line: which paper she is in, how far the other one is, and (in the Gazette) the way back (round 7)
function turnLine(w) {
  const t = w.roadTurn || L.roadTurn(w); const st = L.roadOf(w) === 'standing';
  if (t.steps <= 1) return st ? 'The Gazette has noticed you. One more point of Notoriety and you\'re in the Police Gazette.' : 'Society is warming to you. One more point of Standing and you\'re back in the Society Pages.';
  if (st) return `You're in the Society Pages. ${t.steps} more points of Notoriety and you're in the Police Gazette.`;
  if (w.notoriety >= R.assign.notorietyRefuseScrubbedAt) {
    const rc = redeemCard(w.timeline);
    return rc ? `You're in the Police Gazette. Scrubbed gentlemen won't see you now. ${rc.name} in the market takes Notoriety down.` : 'You\'re in the Police Gazette. Scrubbed gentlemen won\'t see you now, so the way back is slow.';
  }
  return `You're in the Police Gazette. ${t.steps} more points of Standing and you're back. Delighting a Scrubbed gentleman raises Standing.`;
}
function railBar(r) {
  const half = (x) => `${(Math.min(R.meterMax, x) / R.meterMax) * 100}%`;
  return `<span class="rail" aria-hidden="true"><span class="rh st"><i style="width:${half(r.s)}"></i></span><span class="rmid"></span><span class="rh no"><i style="width:${half(r.n)}"></i></span></span>`;
}
// compact: one tappable strip on the front page (opens the stats sheet); full: the stats sheet's section
function roadRail(v, full = false) {
  const r = roadInfo(v.whore);
  if (!full) {
    return `<button class="roadstrip aim-${L.roadOf(v.whore)}" data-act="menu" data-id="stats" aria-label="Society Pages or Police Gazette: Standing ${r.s}, Notoriety ${r.n}. ${r.aim}. Open her stats">
      <span class="rl st"><b>Society Pages</b><span>Standing ${r.s}</span></span>${railBar(r)}<span class="rl no"><b>Police Gazette</b><span>Notoriety ${r.n}</span></span>
      <span class="rlean">${esc(r.aim)} ›</span></button>`;
  }
  const step = (x, cur, label) => (x ? `<li class="${x.bad ? 'bad' : ''}"><b>${label} ${x.at}</b> <span>${esc(x.t)}</span> <button class="x" data-x="${x.x}">what's this?</button><span class="togo">${x.at - cur} to go</span></li>` : '');
  return `<section class="roads" aria-labelledby="roads-h">
    <div class="sec-head"><span class="h2" id="roads-h">Which paper she's in</span><button class="x type" data-x="roads">how the seesaw works</button></div>
    <p class="small">${esc(turnLine(v.whore))} <button class="x" data-x="roadpick">How it works</button> <button class="x" data-act="fork-spread">Compare the papers</button></p>
    <div class="roadstrip big"><span class="rl st"><b>Society Pages</b><span>Standing ${r.s}</span></span>${railBar(r)}<span class="rl no"><b>Police Gazette</b><span>Notoriety ${r.n}</span></span><span class="rlean">${esc(r.aim)}</span></div>
    <div class="roadcols">
      <div class="roadcol st ${L.roadOf(v.whore) === 'standing' ? 'aim' : ''}"><span class="kicker"><button class="x" data-x="highroad">The Society Pages</button></span><p class="small">Posh houses, patrons and invitations, the biggest Renown, ${esc(L.seatName('salon', v.whore.timeline))}.</p><ul class="steps">${step(r.nextS, r.s, 'Standing') || '<li>All the way up. Now hold your seat.</li>'}</ul></div>
      <div class="roadcol no ${L.roadOf(v.whore) === 'notoriety' ? 'aim' : ''}"><span class="kicker"><button class="x" data-x="lowroad">The Police Gazette</button></span><p class="small">Fast Coin, back alleys, the black market, bribes, ${esc(L.seatName('gutter', v.whore.timeline))}.</p><ul class="steps">${step(r.nextN, r.n, 'Notoriety') || '<li>The Front Page is yours.</li>'}</ul></div>
    </div>
    ${r.poshWarn ? `<p class="small roadnote">${esc(r.poshWarn)}</p>` : ''}
  </section>`;
}
// The album (round 4, finding 7): the keepsakes of her Timeline, with a visible count: saucy postcards from the back
// doors, the gentlemen's souvenirs and the story behind every Kink win. A rung to climb between Rare and Epic.
const HOOK_TL = { siding: 'wildwest', horse: 'wildwest', 'odd-coin': 'vegas' };
function albumOf(w) {
  const tl = w.timeline;
  const ids = [...C.POSTCARDS[tl].map((p) => p.id), ...Object.values(C.GAGS).filter((g) => g.timeline === tl).map((g) => g.id),
    ...Object.keys(HOOK_TL).filter((k) => HOOK_TL[k] === tl), 'front-page', 'society-pages'];
  const have = ids.filter((id) => w.collectibles.includes(id));
  return { have: have.length, total: ids.length, postcards: C.POSTCARDS[tl].filter((p) => w.collectibles.includes(p.id)).length, postcardTotal: C.POSTCARDS[tl].length };
}
// The next rung of the ladder and what it really brings (finding 33: only what is true), plus the nearer rungs on the
// way: the next edition of the paper, the next step on her road, the album (finding 7: show the next rung, not "320 to go")
function nextRung(w) {
  const next = w.tier === 'common' ? 'rare' : w.tier === 'rare' ? 'epic' : null;
  if (!next) return null;
  const at = R.tiers[next]; const need = Math.max(0, at - w.renown);
  const t = (tier) => { const S = L.eraTitle(w.timeline, tier, 'standing'); const N = L.eraTitle(w.timeline, tier, 'notoriety'); return S === N ? S : `${S} on the Society Pages, ${N} in the Police Gazette`; };
  const gifts = next === 'rare'
    ? [`a new title: ${t('rare')}`, ...(R.unlock.third === 'anyRare' && (!ui.S || ui.S.accounts[ME].slots < 3) ? ['a third Timeline'] : [])]
    : [`a new title: ${t('epic')}`, `the right, coming soon, to challenge for ${L.seatName('salon', w.timeline)} or ${L.seatName('gutter', w.timeline)} (Standing or Notoriety ${R.seats.salon.standing}+)`];
  return { next, at, need, gifts, pct: Math.min(100, Math.round((w.renown / at) * 100)), name: C.TIER_NAMES[next] };
}
function nearRungs(v) {
  const w = v.whore; const out = [];
  const ed = nextEdition(v); if (ed) out.push(ed);
  // between Rare and Epic: the next Renown milestone and its era sub-title (round 5, finding 2)
  const ms = w.milestone; if (w.tier === 'rare' && ms && ms.next) out.push(`${ms.next} Renown (${ms.next - w.renown} to go): a name about town, ${milestoneTitle(w, ms.next)}`);
  const r = roadInfo(w); const road = L.roadOf(w);
  const st = road === 'notoriety' ? r.nextN : r.nextS;
  if (st && !st.bad) out.push(`${road === 'notoriety' ? 'Notoriety' : 'Standing'} ${st.at} (${st.at - (road === 'notoriety' ? r.n : r.s)} to go): ${st.t}`);
  const al = albumOf(w); if (al.have < al.total) out.push(`The album: ${al.have} of ${al.total} keepsakes. ${al.postcards < al.postcardTotal ? 'Saucy postcards turn up behind the back doors.' : 'The rest are behind a Kink win, or a gentleman\'s favour.'}`);
  return out.slice(0, 2);
}
// the era sub-title she would wear at a Renown milestone, on the road she leans to
function milestoneTitle(w, at) { const M = C.ERA_MILESTONES[w.timeline] && C.ERA_MILESTONES[w.timeline][at]; return M ? M[L.roadOf(w)] : ''; }
function rungTeaser(v, full = false) {
  const n = nextRung(v.whore); if (!n) return '';
  const near = nearRungs(v);
  return `<div class="rung ${full ? 'full' : ''}">
    <span class="kicker">Next up · <button class="x" data-x="tiers">${esc(n.name)}</button></span>
    <span class="rungbar" aria-hidden="true"><i style="transform:scaleX(${(n.pct / 100).toFixed(3)})"></i></span>
    <span class="small"><b>${v.whore.renown}/${n.at} Renown</b> (${n.need} to go). It brings ${esc(n.gifts.join(', and '))}.</span>
    ${near.length ? `<ul class="near">${near.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
  </div>`;
}
// ---- Round 5 (finding 1): what her Coin buys that shows. The Ladder (lodgings and finery per road) and the Morning Special.
// Her top rung, on the road she is on (else the other): its prop names her win picture and outlines her portrait.
function digsTop(w) {
  const d = w.digs || { standing: 0, notoriety: 0 }; const road = L.roadOf(w);
  const pick = d[road] ? road : (d.standing >= d.notoriety ? 'standing' : 'notoriety');
  const n = d[pick] || 0; if (!n) return null;
  return { n, road: pick, rung: C.DIGS[w.timeline][pick][n - 1] };
}
const digsCls = (w) => { const t = digsTop(w); return t ? `digs-${t.n}` : ''; };
const digsBadge = (w) => { const t = digsTop(w); return t ? `<span class="digsbadge">${esc(t.rung.prop)}</span>` : ''; };
function digsBlock(v) {
  const w = v.whore; const road = L.roadOf(w); const ladder = C.DIGS[w.timeline][road]; const have = (w.digs || {})[road] || 0;
  const other = road === 'standing' ? 'notoriety' : 'standing'; const otherHave = (w.digs || {})[other] || 0;
  const nx = w.digsNext;
  return `<section class="digs" aria-labelledby="digs-h"><div class="sec-head"><span class="h2" id="digs-h">Up in the world</span><span class="type">${esc(road === 'standing' ? 'Society Pages' : 'Police Gazette')} · ${have} of ${ladder.length}</span></div>
    <p class="small">What her Coin buys. It shows on her portrait and in her winning picture; it adds no Sway.</p>
    <ul>${ladder.map((r, i) => `<li class="${i < have ? 'have' : i === have ? 'next' : ''}"><span><b>${esc(r.name)}</b>${i < have || i === have ? `<br><span class="small">${esc(r.line)}</span>` : ''}</span><span class="type">${i < have ? 'hers' : `${r.cost} Coin`}</span></li>`).join('')}</ul>
    ${nx ? `<button class="btn ${w.coin >= nx.rung.cost ? 'primary' : ''}" data-act="buy-digs" ${w.coin >= nx.rung.cost ? '' : 'disabled'}>Buy ${esc(bare(nx.rung.name))} · ${priceOf(nx.rung.cost, w.coin)}</button>` : '<p class="small">She has bought the lot.</p>'}
    ${otherHave ? `<p class="small">From her time in the other paper she keeps ${esc(C.DIGS[w.timeline][other].slice(0, otherHave).map((r) => bare(r.name)).join(', '))}.</p>` : ''}</section>`;
}
function specialBlock(v) {
  const sp = v.timeline.special; const it = sp.item; const w = v.whore;
  const full = w.items.length >= R.reticule; const can = !sp.why && w.coin >= sp.price && !full;
  const why = sp.why === 'bought' ? 'Sold to you this morning. A new one at dawn.' : sp.why === 'black-market' ? `Under the counter: Notoriety ${R.rummage.blackMarketAt}+ only.` : full ? 'Your reticule is full.' : w.coin < sp.price ? `Need ${sp.price} Coin, you have ${w.coin}.` : 'A new one every dawn.';
  return `<div class="special"><button class="ovface" data-act="special-read" aria-label="${esc(it.name)}: read it">${img(it.art, it.name)}</button><div><span class="kicker">The Morning Special</span><br><b>${esc(it.name)}</b><span class="small"> · ${sp.price} Coin</span>
    <div class="row"><button class="btn small ${can ? 'primary' : ''}" data-act="buy-special" ${can ? '' : 'disabled'}>Buy it</button><span class="small">${esc(why)}</span></div></div></div>`;
}
const itchDots = (w) => (w.itch > 0 ? `<span class="itchdots" aria-hidden="true">${Array.from({ length: R.itchMax }, (_, i) => `<i class="${i < w.itch ? 'on' : ''}"></i>`).join('')}</span>` : '');
function gazette(v, extra) {
  const TL = C.TIMELINES[v.whore.timeline];
  return `<div class="gazette"><div class="name">${esc(TL.gazette)}</div>
    <div class="dateline"><span>${esc(TL.short)} · ${esc(TL.year === 'now' ? 'Today' : TL.year)}</span><span>Curtain No. ${v.timeline.curtainNo + 1}</span><span>${esc(extra || TL.quarter)}</span></div></div>`;
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------
const SCREENS = {};

// The title page. Signed out, it asks first: Log in or Create account, two real forms that password managers can tell
// apart (docs/server-api.md §10), and Play as guest, the game that never leaves the device. Logged in, the page shows the
// name instead of the forms. Sound is offered here, at the foot of the desk, not as a floating button over the headline.
const INSIDE_TODAY = [
  ['Chaperone loses her lady at the races', 'Lady found in a jockey\'s silks. Page 3.'],
  ['Croupier asks a gentleman to show his hand', 'The casino asks him to put it away. Page 5.'],
  ['Naval officer loses a bet, and his trousers', 'Both recovered at the Tuppenny Palace. Page 7.'],
];
function continueCard() {
  const g = loadSave(); if (!g) return '';
  if (g.stale) return '<p class="small center resume stale">Your last game is from an older version and can\'t be loaded. Time for a fresh scandal.</p>';
  const ws = (g.S.accounts.you ? g.S.accounts.you.whores : []).map((id) => g.S.whores[id]).filter(Boolean);
  return `<div class="resume"><p class="kicker">Welcome back</p><p class="small">${ws.map((w) => `${esc(w.name)}, ${w.renown} Renown`).join(' · ')}</p>
    <button class="btn primary block" data-act="resume" data-autofocus>Continue your scandal</button></div>`;
}
// The nom de plume is also the login and the leaderboard name: letters, digits and underscores, 3 to 24 (names.js NOM_RE).
// A space typed becomes an underscore as she types; anything else is dropped.
const NOM_HINT = 'Letters, numbers and underscores, 3 to 24. No spaces: the printer\'s run out.';
const NOM_SHORT = 'At least three characters, darling.';
// The password: checked here as the server checks it (docs/server-api.md §6), so most mistakes never leave the page. The
// fields have no maxlength: a long password pasted in must never be cut short without a word, with no way back in. No
// passwordrules either: the floor is 8 and any character goes, which every browser's generated password already meets.
const PW_HINT = 'Eight characters or more.';
const PW_NONE = 'Enter your password.';
const PW_NONE_NEW = 'Saving online needs a password, eight characters or more.';
const PW_SHORT = 'Eight characters at least, or a corset would be harder to get into.';
const PW_LONG = '128 characters at most. The rest belongs in your memoirs.';
const PW_NAME = 'A password that matches your name is the first thing a blackmailer tries.';
const BAD_LOGIN = 'That name and password don\'t match.';
const NAME_TAKEN = 'That name\'s taken.';
const LOGIN_REPLACES = 'If that account has a saved game, it replaces the one on this device.';
const NO_KEY = 'We don\'t take email addresses, so there\'s no reset: lose the password and the game goes with it.';
// Menu > Keep your game anywhere: the lead line says what the open form will do to the game on screen
const ACCT_LEAD = {
  signup: 'Create an account and this game saves online, so any device can pick it up.',
  login: 'Log in to keep this game under your name. If that account has a saved game, it replaces this one.',
};
const muteBtn = () => `<button class="btn ghost block" type="button" data-act="mute" aria-pressed="${!ui.muted}">${ui.muted ? ICON.mute : ICON.sound}${ui.muted ? 'Sound: off' : 'Sound: on'}</button>`;
const playableHere = () => { const g = loadSave(); return !!(g && !g.stale); };

// ---- Log in or Create account: the title (signed out) and Menu > Keep your game anywhere share this markup. The two are
// never on screen together, so the ids are the same in both, and at most one form is in the page at a time: choosing or
// switching inserts the chosen form whole. Chrome reads a form's fields again when one is added to the page, and nothing
// re-reads a form that was merely un-hidden. Each form has its own action and autocomplete hints (username with
// current-password, or with new-password); method="post" means a submit the script never sees (a password manager's
// click() before the listener is attached) goes to the API as a POST, which refuses it unread, never into the URL.
function blankDrafts() { return { login: { name: '', password: '' }, signup: { name: '', password: '' } }; }
const AUTH_IDS = { login: { name: 'login-name', pw: 'current-password' }, signup: { name: 'signup-name', pw: 'new-password' } };
const authForm = () => document.getElementById('login') || document.getElementById('signup');
// Which form opens: a device that has logged in or created an account before (store 'lastname', net.js) opens on Log in
// with that name filled in. Otherwise the title asks first (no form open) and the Menu, mid-game, opens on Create account.
// On the title, a guest game on this device fills in Create account with its stage name (ACTS.acct does the same in the
// Menu, from the game on screen); the title has not loaded the game yet, so the name comes from the save.
function authOpen(where) {
  const last = store.get('lastname', null);
  const known = typeof last === 'string' && NOM_RE.test(last);
  if (known && !ui.authDraft.login.name) ui.authDraft.login.name = last;
  if (where === 'title' && !ui.authDraft.signup.name) {
    const g = loadSave(); const nm = g && !g.stale && g.ui.name;
    if (typeof nm === 'string' && NOM_RE.test(nm) && nm !== 'Anonymous') ui.authDraft.signup.name = nm;
  }
  return known ? 'login' : where === 'menu' ? 'signup' : null;
}
// what is typed in the form on screen goes into ui.authDraft...
function saveDraft() {
  for (const [mode, id] of Object.entries(AUTH_IDS)) {
    const n = document.getElementById(id.name); const p = document.getElementById(id.pw);
    if (n) ui.authDraft[mode].name = n.value;
    if (p) ui.authDraft[mode].password = p.value;
  }
}
// ...and back into the form just drawn. The name is in the markup (escaped); a password never is.
function fillDraft() {
  const f = authForm(); if (!f) return;
  const p = document.getElementById(AUTH_IDS[f.id].pw); const pw = ui.authDraft[f.id].password;
  if (p && pw) p.value = pw;
}
// `replaces`: on the title with a game on this device, the password's hint says what a login does to it (in the Menu, the
// sheet's lead line says it)
const loginForm = (replaces) => {
  const hint = replaces ? LOGIN_REPLACES : '';
  return `<form id="login" class="signup" method="post" action="/api/login" novalidate aria-label="Log in">
      <div class="field"><label for="login-name">Stage name</label><input id="login-name" name="username" type="text" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="24" required aria-describedby="login-name-hint" value="${esc(ui.authDraft.login.name)}">
        <span class="small nomhint" id="login-name-hint" aria-live="polite" data-hint=""></span></div>
      <div class="field"><label for="current-password">Password</label><input id="current-password" name="password" type="password" autocomplete="current-password" required enterkeyhint="go" aria-describedby="current-password-hint">
        <span class="small nomhint" id="current-password-hint" aria-live="polite" data-hint="${esc(hint)}">${esc(hint)}</span></div>
      <p class="small formline" id="login-status" aria-live="polite"></p>
      <button class="btn primary block" type="submit">Log in</button>
      <button class="btn small ghost authswap" type="button" data-act="auth-mode" data-id="signup">New here? Create an account</button>
    </form>`;
};
const signupForm = () => `<form id="signup" class="signup" method="post" action="/api/signup" novalidate aria-label="Create account">
      <p class="small">Pick a name, any name but your own.</p>
      <div class="field"><label for="signup-name">Stage name</label><input id="signup-name" name="username" type="text" autocomplete="username" autocorrect="off" spellcheck="false" maxlength="24" required placeholder="e.g. Madam_X" aria-describedby="signup-name-hint" value="${esc(ui.authDraft.signup.name)}">
        <button class="btn small ghost nomroll" type="button" data-act="nom-roll" aria-controls="signup-name">${ICON.die}Pick one for me</button><span class="sr" aria-live="polite" id="nom-said"></span>
        <span class="small nomhint" id="signup-name-hint" aria-live="polite" data-hint="${esc(NOM_HINT)}">${esc(NOM_HINT)}</span></div>
      <div class="field"><label for="new-password">Password</label><input id="new-password" name="new-password" type="password" autocomplete="new-password" minlength="8" required enterkeyhint="done" aria-describedby="new-password-hint">
        <span class="small nomhint" id="new-password-hint" aria-live="polite" data-hint="${esc(PW_HINT)}">${esc(PW_HINT)}</span></div>
      <p class="small formline" id="signup-status" aria-live="polite"></p>
      <button class="btn primary block" type="submit">Create account</button>
      <p class="small">${esc(NO_KEY)}</p>
      <button class="btn small ghost authswap" type="button" data-act="auth-mode" data-id="login">Already have an account? Log in</button>
    </form>`;
// The two choices. While the title is asking (no form open) they are two full-width buttons, so the question reads as
// one; once a form is open they become a pair of tabs (ACTS['auth-mode'] restyles the same buttons in place).
function authPick(replaces) {
  const m = ui.authMode;
  const b = (id, label) => `<button type="button" class="${m ? '' : 'btn block'}" data-act="auth-mode" data-id="${id}" aria-controls="authform" aria-pressed="${m === id}">${label}</button>`;
  return `<div class="authpick ${m ? 'tabs two' : 'ask'}" role="group" aria-label="Log in or create an account">${b('login', 'Log in')}${b('signup', 'Create account')}</div>
      <div id="authform">${m === 'login' ? loginForm(replaces) : m === 'signup' ? signupForm() : ''}</div>`;
}
function titleDesk() {
  const who = acctName();
  const playable = playableHere();
  if (who) {
    return `<p class="deck center">The whole District on one street. Logged in as <b>${esc(who)}</b>.</p>
    <div class="signup">
      ${playable ? '' : '<button class="btn primary block" data-act="begin">Start playing</button>'}
      <button class="btn block" data-act="sign-out">Log out</button>
      ${muteBtn()}
    </div>
    <p class="small center">Your game is saved on this device and on our server under ${esc(who)}. ${esc(NO_KEY)}</p>`;
  }
  if (ui.authMode === undefined) ui.authMode = authOpen('title');
  // with a game on this device, Continue is the only way in: starting over stays behind the Menu's confirm sheet
  return `<p class="deck center">The whole District on one street.</p>
    <div class="signup authdesk">
      ${authPick(playable)}
      ${playable ? '' : `<button class="btn block" type="button" data-act="guest-play">Play as guest</button>
      <p class="small center">No account needed. Your game stays on this device.</p>`}
      ${muteBtn()}
    </div>`;
}
SCREENS.title = () => `
  <section class="sheet title-sheet">
    <span class="tape tl"></span><span class="tape tr"></span>
    <p class="kicker center">Extra! Extra! · One penny · All the news unfit to print</p>
    <h1 class="center title-ransom">${ransom('LEGENDARY WHORES')}</h1>
    <p class="h2 center">The Scandal Sheet</p>
    <hr class="rule">
    ${continueCard()}
    ${titleDesk()}
  </section>
  <section class="sheet">
    <p class="kicker">Inside today</p>
    <div class="clip-list">${INSIDE_TODAY.map(([h, s]) => `<p class="teaser"><b class="h3">${esc(h)}</b><br>${esc(s)}</p>`).join('')}</div>
  </section>`;

// ---------------------------------------------------------------------------
// The Morning Edition: the overview, five tabloid front pages. One idea a page, a picture doing the explaining, two short
// lines at most, one thing to tap. Swipe (a scroll-snap track, so the swipe is native) or press Next; Skip is always on
// screen. Shown to a newcomer before her first game (firstGame); anyone who has been here before goes straight to the
// suspects. Re-readable from Menu > How to play, and from the suspects' page. Its last page offers the step-by-step, never forces it.
// ---------------------------------------------------------------------------
const OV_PAGES = 5;
const trioCell = (id, look, place, tag) => `<div class="trio-cell" style="background-image:url('${ART_BASE}${place}.webp')">${img(exprArt(id, look), C.CHARACTERS[id].name, { eager: true })}<span class="trio-tag">${esc(tag)}</span></div>`;
// page 2's little demonstration uses the real gentleman and the real card numbers (RULES.card), on Victorian stock
const OV_GENT = 'plunkett';
const OV_CARDS = ['saucy-quip', 'peek-a-boo-fan', 'saucy-wink'];
function ovCardScore(cid) {
  const g = C.GENTS[OV_GENT]; const c = C.CARDS[cid];
  return c.allure + (c.arts.some((a) => g.tastes.includes(a)) ? R.card.taste : 0) - (c.arts.includes(g.aversion) ? R.card.aversion : 0);
}
const OV_BAR = R.assign.bar[C.GENTS[OV_GENT].freshness] - 2; // a demonstration Bar the two good cards clear together
// Page 2's demonstration (round 4, findings 22, 24 and 50): one number per card (its total, "= +2"), the tick or cross
// says why; every card keeps its tag row reserved, so nothing below jumps when one is picked; his face opens his card.
function ovDemo() {
  const g = C.GENTS[OV_GENT]; const picked = ui.ovPicked || new Set();
  const sway = [...picked].reduce((s, cid) => s + ovCardScore(cid), 0);
  const top = Math.max(OV_BAR + 3, 6);
  return `<div class="ov-demo">
    <div class="ov-gent"><button class="ovface" data-act="ov-gent" aria-label="${esc(g.short)}: read his card">${img(g.art, g.short, { eager: true, pos: '50% 10%' })}<span class="dogear" aria-hidden="true">?</span></button><div><b class="h3">${esc(g.short)}</b>
      <span class="tg good">✓${artIcon(g.tastes[0])}${esc(C.ARTS[g.tastes[0]].name)}</span><span class="tg good">✓${artIcon(g.tastes[1])}${esc(C.ARTS[g.tastes[1]].name)}</span><span class="tg bad">✗${artIcon(g.aversion)}${esc(C.ARTS[g.aversion].name)}</span></div></div>
    <div class="ov-cards">${OV_CARDS.map((cid) => {
      const c = C.CARDS[cid]; const sc = ovCardScore(cid); const on = picked.has(cid);
      const mk = c.arts.includes(g.aversion) ? '<span class="mk bad">✗ he hates it</span>' : c.arts.some((a) => g.tastes.includes(a)) ? '<span class="mk">✓ his Taste</span>' : '<span class="mk plain">no tick</span>';
      return `<button class="ovc ${on ? 'on' : ''}" data-act="ov-try" data-id="${cid}" aria-pressed="${on}">${img(`${ART_BASE}victorian/card-${cid}.webp`, '', { eager: true })}<span class="nm">${esc(c.name)}</span>${artLabel(c.arts[0])}<span class="mkrow ${on ? '' : 'off'}">${mk}</span>${on ? `<span class="score ${sc > c.allure ? 'good' : sc < c.allure ? 'bad' : ''}">= ${sc > 0 ? '+' : ''}${sc}</span>` : ''}</button>`;
    }).join('')}</div>
    <div class="ov-meter"><span class="track"><i class="fill ${sway >= OV_BAR ? 'ok' : ''}" style="transform:scaleX(${meterScale(Math.max(0, sway), top)})"></i><i class="mark" style="left:${(OV_BAR / top) * 100}%"></i></span>
      <span class="small"><b>Sway ${sway}</b> · ${picked.size ? (sway >= OV_BAR + R.assign.delightMargin ? 'past Delight. He\'s yours.' : sway >= OV_BAR ? `over his Bar (${OV_BAR}). Delight at ${OV_BAR + R.assign.delightMargin}.` : `short of his Bar (${OV_BAR})`) : 'tap a card he would like'}</span></div>
  </div>`;
}
// Page 4's two papers (round 7: shown, not picked; her nights decide)
function ovRoads() {
  return `<div class="ov-split">
      <div class="ovroad st">${img(`${ART_BASE}victorian/place-salon.webp`, 'The Salon', { eager: true })}<b class="mast">The Society Pages</b><span class="road">Standing</span><span class="small">Classy houses, clean gentlemen.</span><span class="small rpay"><b>Pays:</b> invitations, a Patron, big Renown, ${esc(L.seatName('salon', 'victorian'))}.</span><span class="small rcost"><b>Costs:</b> a naughty card in a classy house, Standing −1.</span></div>
      <div class="ovroad no">${img(`${ART_BASE}victorian/place-drowned-rat.webp`, 'The Drowned Rat', { eager: true })}<b class="mast">The Police Gazette</b><span class="road">Notoriety</span><span class="small">Dives and back alleys.</span><span class="small rpay"><b>Pays:</b> fast Coin, the black market, bribes, ${esc(L.seatName('gutter', 'victorian'))}.</span><span class="small rcost"><b>Costs:</b> first night in a dive, Standing −1; classy doors may shut.</span></div></div>`;
}
const OV = [
  () => ({ k: 'Vol. I · No. 1', h: 'Three eras, one street: council baffled', sub: 'Open all hours, in every century',
    pic: `<div class="trio">${trioCell('dolly', 'pleased', 'victorian/place-tuppenny', 'London 1895')}${trioCell('fanny', 'eyebrow', 'wildwest/place-last-chance', 'Dakota 1876')}${trioCell('jackie', 'bubble', 'vegas/place-flamingo', 'Vegas, now')}</div>`,
    body: `Charm gentlemen with cards, win the night's <button class="x" data-x="curtain">Curtain</button>, earn <button class="x" data-x="renown">Renown</button>, climb to <button class="x" data-x="tiers">Legendary</button>. Three <button class="x" data-x="timeline">Timelines</button>, one girl each: while one waits, play another.`,
    cap: 'Banned in four towns and a monastery. Sold out in all of them.' }),
  () => ({ k: 'Strategy · page 2', h: 'Member for Little Puddle weak at the knees', sub: 'Play what he fancies',
    pic: ovDemo(),
    body: `Cards carrying his <button class="x" data-x="tick">Tastes</button> score more. Tap his face to read his card, and <button class="x" data-x="study">Study</button> him to learn his secrets.`,
    cap: 'Lord Plunkett, MP. Campaigns against sin. Researches it nightly.' }),
  () => ({ k: 'The small print · page 3', h: 'Night out\'s shock cost: full list inside', sub: 'What it costs you',
    pic: `<div class="ov-costs">
      <button class="clipcut bad" data-x="aversion"><b>✗ −${R.card.aversion}</b><span>a card he hates</span></button>
      <button class="clipcut" data-x="seenit"><b>−${R.sway.seenIt}</b><span>a card he has seen before</span></button>
      <button class="clipcut" data-x="itch"><b class="dots3">${Array.from({ length: R.itchMax }, (_, i) => `<i class="${i < R.itchMax - 1 ? 'on' : ''}"></i>`).join('')}</b><span>the Itch: at ${R.itchMax} you catch something</span></button>
      <button class="clipcut" data-x="regular"><b>−${R.sway.grudge}</b><span>a man you left wanting holds a Grudge</span></button></div>`,
    body: 'You see every cost before you play. Tap a clipping for the details.',
    cap: 'Afflictions are curable, and entirely your own fault.' }),
  () => ({ k: 'Your reputation · page 4', h: 'Society beauty or public nuisance? Readers divided', sub: 'Two ways to be famous',
    pic: ovRoads(),
    body: `Admired or talked about, on a <button class="x" data-x="roads">seesaw</button>: as one goes up, the other comes down. Your nights decide which paper you\'re in.`,
    cap: 'The Society Pages print her name. The Police Gazette prints her mugshot.' }),
  () => ({ k: 'Coming soon · page 5', h: 'Moral campaigner warns: “It only gets worse”', sub: 'The higher you climb, the naughtier it gets',
    pic: `<div class="ov-ladder">${[['Seats, Duels, the Crown', false], ['Rare: a new title, a third Timeline', false], ['Rivals and the market', false], ['A second Timeline', false], ['Tonight: three taps, novelties and Kinks', true]].map(([s, open], i, all) => `<span class="rungstamp ${open ? 'open' : ''}" style="--i:${all.length - 1 - i}">${open ? '' : ICON.lock}${esc(s)}</span>`).join('')}
      <div class="ov-won silhouette">${img(exprArt('dolly', WON_LOOK), 'A winner, in silhouette', { eager: true, pos: '50% 30%' })}<span class="cap">Coming soon: this face.</span></div></div>`,
    body: `Day one: a <button class="x" data-x="place">Place</button>, <button class="x" data-x="bestguess">Best Guess</button>, <button class="x" data-x="seal">Seal</button>. More opens up as you climb. Tap any dotted word to learn more.`,
    cap: 'Easily shocked? Hold the page further away.', end: true }),
];
SCREENS.overview = () => {
  const pages = OV.map((f, i) => {
    const p = f();
    return `<article class="ov-page" id="ov-${i}" role="group" aria-roledescription="page" aria-label="Page ${i + 1} of ${OV_PAGES}"${i === ui.ovPage ? '' : ' inert'}>
      <div class="sheet ov-sheet">
        <div class="ov-mast"><span class="name">The Morning Edition</span><span class="kicker">${esc(p.k)}</span></div>
        <h2 class="ov-h">${esc(p.h)}</h2>${p.sub ? `<p class="ov-sub">${esc(p.sub)}</p>` : ''}
        <div class="ov-pic">${p.pic}</div>
        <p class="ov-body">${p.body}</p>
        ${p.cap ? `<p class="ov-cap">${esc(p.cap)}</p>` : ''}
      </div></article>`;
  }).join('');
  return `<section class="ov" aria-label="The Morning Edition, an overview in ${OV_PAGES} pages">
    <div class="ov-top"><span class="kicker">The Morning Edition · <span class="ovn">${ui.ovPage + 1}</span> of ${OV_PAGES}</span><button class="btn small ov-skip" data-act="ov-done" data-id="skip">${ui.ovReturn ? 'Close' : 'Skip'}</button></div>
    <div class="ov-track" id="ovtrack" tabindex="0" aria-label="Swipe for the next page">${pages}</div>
    <div class="hlslot" aria-live="polite"></div>
    <div class="ov-foot ${ui.ovPage === OV_PAGES - 1 ? 'end' : ''}">
      <div class="ov-end" role="group" aria-label="How would you like to learn?"><button class="btn" data-act="ov-done" data-id="own">I'll find my own way</button><button class="btn primary" data-act="ov-done" data-id="ropes">Show me the ropes</button></div>
      <span class="dots" aria-hidden="true">${Array.from({ length: OV_PAGES }, (_, i) => `<i class="${i === ui.ovPage ? 'on' : ''}"></i>`).join('')}</span>
      <button class="btn ov-prev" data-act="ov-go" data-id="-1" ${ui.ovPage === 0 ? 'disabled' : ''} aria-label="Previous page"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>Back</button>
      <button class="btn primary ov-next" data-act="ov-go" data-id="1" ${ui.ovPage === OV_PAGES - 1 ? 'tabindex="-1" aria-hidden="true"' : ''}>Next page ›</button></div>
  </section>`;
};
// the track is native scroll-snap; this keeps the dots, the page count, Next and inert in step with where the swipe landed
function ovSync() {
  const tr = $('#ovtrack'); if (!tr) return;
  const i = Math.max(0, Math.min(OV_PAGES - 1, Math.round(tr.scrollLeft / Math.max(1, tr.clientWidth))));
  if (i === ui.ovPage) return;
  ui.ovPage = i; sfx('clack');
  document.querySelectorAll('.ov-page').forEach((pg, k) => { pg.inert = k !== i; });
  document.querySelectorAll('.ov-foot .dots i').forEach((d, k) => d.classList.toggle('on', k === i));
  const n = $('.ovn'); if (n) n.textContent = String(i + 1);
  const prev = $('.ov-prev'); if (prev) prev.disabled = i === 0;
  // the last page keeps Next's slot (invisible, so Back never slides under the thumb) and shows the two choices above
  const foot = $('.ov-foot'); if (foot) foot.classList.toggle('end', i === OV_PAGES - 1);
  const next = $('.ov-next'); if (next) { if (i === OV_PAGES - 1) { next.setAttribute('tabindex', '-1'); next.setAttribute('aria-hidden', 'true'); } else { next.removeAttribute('tabindex'); next.removeAttribute('aria-hidden'); } }
}
function ovGoTo(i) {
  const tr = $('#ovtrack'); if (!tr) return;
  const k = Math.max(0, Math.min(OV_PAGES - 1, i));
  tr.scrollTo({ left: k * tr.clientWidth, behavior: calm() ? 'auto' : 'smooth' });
  if (calm()) ovSync();
}
let ovRaf = 0;
// a page that still has more below it fades at its foot (finding 53); the fade lifts once she has scrolled to the end
function ovFades() { document.querySelectorAll('.ov-page').forEach((pg) => pg.classList.toggle('scrolls', pg.scrollTop + pg.clientHeight < pg.scrollHeight - 2)); }
document.addEventListener('scroll', (e) => {
  if (e.target && e.target.id === 'ovtrack') { cancelAnimationFrame(ovRaf); ovRaf = requestAnimationFrame(ovSync); }
  else if (e.target && e.target.classList && e.target.classList.contains('ov-page')) ovFades();
}, true);

SCREENS.pick = () => {
  const sel = ui.pickId ? C.CHARACTERS[ui.pickId] : null;
  return `
  <section class="sheet cork">
    <p class="kicker">Wanted for questioning</p>
    <h1 class="h1">Who will she be?</h1>
    <p class="deck">Three suspects, three eras. Tap one to hear her.</p>
    <div class="hlslot" aria-live="polite"></div>
    <div style="position:relative;padding-top:10px">
      <svg class="string" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M16 4 Q33 13 50 8 Q67 16 84 4" fill="none" stroke="var(--pin)" stroke-width="0.7"/></svg>
      <div class="suspects">
        ${STARTERS.map((id, i) => {
          const ch = C.CHARACTERS[id]; const tl = ch.timeline; const on = ui.pickId === id;
          const said = ui.pickSaid[id];
          return `<button class="suspect ${on ? 'on' : ''}" data-act="suspect" data-id="${id}" data-hold="char:${id}" aria-pressed="${on}">
            <div class="photo"><span class="pin"></span><div class="mini-frame mf-${tl} flashy ${said ? 'said' : ''}" style="--flash-delay:${i * 2.3}s">${img(said ? exprArt(id, PLEASED_LOOK[id]) : ch.art, ch.name, { eager: true })}${said ? '' : `<span class="flash" aria-hidden="true">${img(exprArt(id, PLEASED_LOOK[id]), '', { eager: true })}</span>`}</div><div class="cap"><b>${esc(ch.name)}</b>${esc(C.TIMELINES[tl].short)}</div></div>
            <span class="temper">${esc(ch.temperament)}</span></button>`;
        }).join('')}
      </div>
    </div>
    <div class="bubble" aria-live="polite">${sel ? `${esc((ui.pickLine[sel.id]) || sel.voice)} <span class="small">· ${esc(sel.temperamentText)} ${esc(sel.short)}: ${esc(TYPE_PLAIN[sel.type])}.</span>` : '<span class="small">The suspects aren\'t talking. Tap one.</span>'}</div>
    <div class="row">
      <button class="btn primary grow" data-act="hire" ${sel ? '' : 'disabled'}>${sel ? `Play as ${esc(sel.short)}` : 'Pick a suspect'}</button>
      ${sel ? `<button class="btn ghost" data-act="open-char" data-id="${sel.id}">Her file</button>` : ''}
    </div>
    <p class="center" style="margin:12px 0 0"><button class="btn small ghost" data-act="ov-replay">${ICON.paper}How to play</button></p>
  </section>`;
};

// savedItem (game/notes.js): a single-use Kink novelty you hold, for a gentleman who hosts tonight, worth more at his Curtain
// than in an Assignation. Uses only what the player can see: the Kink once known, or the stall's Tell, never the hidden kinkFor.
// What Best Guess would score against a gentleman with the cards she would actually be lent: the engine deals them on a
// throwaway copy of the state (pure functions; nothing is kept), so the note never sends her into a job she can't win.
const outlookMemo = { S: null, map: new Map() };
function assignOutlook(gid) {
  if (outlookMemo.S !== ui.S) { outlookMemo.S = ui.S; outlookMemo.map = new Map(); }
  if (outlookMemo.map.has(gid)) return outlookMemo.map.get(gid);
  let out = null;
  try {
    const cur = ui.S.whores[ui.active].assignation;
    const S2 = cur && cur.gent === gid ? ui.S : L.startAssignation(cur ? L.cancelAssignation(ui.S, ui.active) : ui.S, ui.active, gid);
    const v2 = L.getView(S2, ui.active);
    const bg = L.bestGuess(v2, { gent: gid });
    const p = L.previewEncounter(v2, { gent: gid, cards: bg.cards });
    out = { gent: gid, sway: p.sway, bar: p.bar, clears: bg.cards.length > 0 && p.sway >= p.bar };
  } catch { out = null; }
  outlookMemo.map.set(gid, out);
  return out;
}
// The Assignation the note suggests: only a gentleman whose Best Guess clears his Bar; the one she has studied first,
// then the widest margin. None qualifies: the step is skipped. Round 6 (findings 3 and 11): the Society Pages never sends
// her down a back alley, it says nothing once a job would pay no Renown today, and a gentleman she has already worked today
// goes to the back of the queue. Round 7: in the Police Gazette the note is neutral. It no longer hides the Scrubbed
// gentlemen she could Delight (+1 Standing, her way back) or puts the back alley first.
function assignPaysRenown(v) {
  const w = v.whore; if (w.daily.assignRenownLeft <= 0) return false;
  const band = R.assign.bands.find((b) => (w.daily.assigns || 0) + 1 <= b.upTo);
  return !!band && !band.gossipOnly && band.renown > 0;
}
function jobsToday(wid, gid) { const j = ui.jobs && ui.jobs[wid]; return j && j.day === (ui.S ? ui.S.day : -1) ? j.by[gid] || 0 : 0; }
function assignTarget(v) {
  if (!assignPaysRenown(v)) return null;
  const road = L.roadOf(v.whore);
  const ids = v.board.filter((b) => !b.tourist && !b.refused && !(road === 'standing' && b.backAlley) && !(b.backAlley && acctCurtains() < ALLEY_RUNG)).map((b) => b.gent);
  const ok = ids.map(assignOutlook).filter((o) => o && o.clears);
  if (!ok.length) return null;
  ok.sort((a, b) => jobsToday(v.whore.id, a.gent) - jobsToday(v.whore.id, b.gent) || (b.gent === ui.studied) - (a.gent === ui.studied) || (b.sway - b.bar) - (a.sway - a.bar));
  return v.timeline.gents.find((g) => g.id === ok[0].gent);
}
// The first evening (round 4, finding 19): the tourist, then Tonight's Curtain in three taps (a Place, Best Guess, Seal).
// The Kink lesson the designer liked is an inline offer on the plan screen of the host whose novelty is in stock. The
// Assignation and the Study come after the first Curtain, then the telegram and the boards. Every suggestion follows her
// road (casualPlace reads it).
function noteFor(v) {
  const s = ui.steps;
  if (v.whore.offer) return { t: `A stallholder is waiting with ${v.whore.offer.item.name}.`, act: 'open-offer', step: 'offer' };
  if (v.whore.plan && v.whore.plan.sealed) {
    // sealed and waiting for her Curtain: the reason to play another Timeline
    const acct = acctView();
    const other = acct.whores.find((x) => x.id !== v.whore.id && !sealedW(x.id));
    if (other) return { t: `Sealed. Meanwhile, ${C.CHARACTERS[other.id].short} in ${C.TIMELINES[other.timeline].short} is free`, act: 'switch', id: other.id, step: 'hop' };
    if (acct.canOpen.length) return { t: 'Sealed. Meanwhile, a telegram: another Timeline', act: 'nav', id: 'timelines', step: 'second' };
    return { t: 'Sealed. Meanwhile, the gentlemen between Curtains', act: 'scroll', id: 'meanwhile', step: 'waiting' };
  }
  if (!s.has('curtain') || v.whore.curtains === 0) {
    // round 6 (findings 3 and 4): one pointer, on her road, that can be won (game/notes.js, replayed by find-first-curtain.mjs)
    return { t: curtainPointer(L, v).text, act: 'scroll', id: 'places', step: 'curtain' };
  }
  if (!s.has('assign')) {
    const target = assignTarget(v);
    if (target) return { t: `Meanwhile: a private job with ${target.short}, paid on the spot`, act: 'open-gent', id: target.id, step: 'assign' };
  }
  if (!s.has('study')) {
    const hosts = Object.values(v.timeline.rota[0].hosts);
    const g = v.timeline.gents.find((x) => !x.known.secret && hosts.includes(x.id)) || v.timeline.gents.find((x) => !x.known.secret);
    if (g) return { t: `Every ? is a secret: Study ${g.short}`, act: 'open-gent', id: g.id, step: 'study' };
  }
  if (!s.has('second') && acctView().canOpen.length && acctCurtains() >= TELEGRAM_RUNG) return { t: 'A telegram came: another Timeline', act: 'nav', id: 'timelines', step: 'second' };
  if (!s.has('players')) return { t: 'How do you rank? The Players board', act: 'nav', id: 'players', step: 'players' };
  return { t: 'Your scores so far', act: 'end', step: 'end' };
}
// Full-pay Curtains left today, as words for the Place cards and the plan meter.
const fullPayText = (w) => (w.daily.fullPayLeft > 0 ? `Full pay tonight: ${w.daily.fullPayLeft} of ${R.curtain.fullPayPerDay} left` : 'After Hours: Coin only');
// Another of your whores who still has full-pay Curtains today (the reason to switch), or an invitation to open one.
function afterHoursElsewhere() {
  const acct = acctView();
  const other = acct.whores.find((x) => x.id !== ui.active && x.fullPayLeft > 0);
  if (other) return { id: other.id, act: 'switch', text: `${C.CHARACTERS[other.id].short}'s ${C.TIMELINES[other.timeline].short} pays full` };
  const inv = acct.canOpen[0];
  if (inv) return { id: inv, act: 'open-tl', text: `${C.TIMELINES[C.CHARACTERS[inv].timeline].short} is waiting for you` };
  return null;
}
function afterHoursBanner(v) {
  if (v.whore.daily.fullPayLeft > 0) return '';
  const el = afterHoursElsewhere();
  // every whore spent (round 4, finding 6, rules-core §4.2): to bed, and wake at dawn with three fresh Curtains each
  const allSpent = acctView().whores.every((x) => x.fullPayLeft === 0);
  return `<div class="ahbanner"><b class="h3">After Hours in ${esc(v.timeline.short)}</b><p>Curtains here pay Coin only until dawn. ${el ? `${esc(el.text)}.` : ''}${allSpent ? ` ${esc(C.LINES.toBed)}` : ''}</p><div class="row">${el ? `<button class="btn small ${allSpent ? '' : 'primary'}" data-act="${el.act}" data-id="${el.id}">Go there →</button>` : ''}${allSpent ? '<button class="btn small primary" data-act="bed">To bed: sleep till dawn</button>' : ''}</div></div>`;
}
// The way back through a shut Posh door: Delight a Scrubbed gentleman (each Delight: Standing +1, Notoriety -1). From
// Notoriety 8 he won't see her, so the line points to her era's Notoriety -1 market card instead.
function wayBackCard(v) { return v.whore.notoriety >= R.assign.notorietyRefuseScrubbedAt ? redeemCard(v.whore.timeline) : null; }
function wayBack(v) {
  const rc = wayBackCard(v);
  if (rc) return `Back in: buy ${theLower(rc.name)} in the market and Work it.`;
  const g = v.timeline.gents.find((x) => x.freshness === 'scrubbed');
  return g ? `Back in: Delight ${g.short} in an Assignation.` : 'Back in: raise your Standing.';
}
// The paper grows one rung at a time (round 4, findings 7, 15 and 51), in the Morning Edition's order: each section needs
// the account's Nth Curtain (the competition also opens at 10 Renown), and a Timeline shows only Tonight's Curtain and the
// gentlemen until her own first Curtain there. A section the player's progress opens arrives folded, with a NEW stamp:
// one tap opens it. Anything still locked sits in one "Coming in later editions" row, where a tap peeks early.
// round 5 (finding 11): the editions follow the Morning Edition's own ladder: back doors after the first Curtain, the market
// and the competition together after the second, the hand after the third. The reticule shows once it holds something.
// One NEW stamp per edition (ui.stampKey, chosen in go('front') before the page is drawn); the rest arrive folded.
// round 6 (finding 9): ONE new thing per Curtain (account-wide): back doors after the 1st, the second Timeline's telegram
// after the 2nd (or while she is sealed and waiting), the back alleys after the 3rd, the market after the 4th, the
// competition after the 5th (or at 10 Renown), her hand after the 6th.
const SECTION_RUNG = { punters: 0, doors: 1, reticule: 0, market: 4, rivals: 5, hand: 6 };
const TELEGRAM_RUNG = 2; const ALLEY_RUNG = 3;
const SECTION_ORDER = ['doors', 'market', 'rivals', 'hand'];
const SECTION_TITLE = { doors: 'Back doors', reticule: 'The reticule', hand: 'Your hand', market: 'The market', rivals: 'The competition' };
const acctCurtains = () => (ui.S && ui.S.accounts[ME] ? ui.S.accounts[ME].whores.reduce((t, id) => t + ((ui.S.whores[id] || {}).curtains || 0), 0) : 0);
function sectionEarned(key, w) {
  if (key === 'reticule') return !!(w.items.length || w.offer); // a curse is a card, not a novelty: it has its own row (curseRows)
  const need = SECTION_RUNG[key] || 0; if (!need) return true;
  if (w.curtains === 0) return false;
  return acctCurtains() >= need;
}
// pick this edition's one NEW stamp: the first section (in the paper's order) earned and not yet stamped or seen
function stampEdition() {
  if (!ui.S || !ui.active) return;
  const w = V().whore;
  // the stamp stays for the rest of its edition, unless she has opened it; a new Curtain is a new edition
  if (ui.stampKey && !ui.secSeen.has(ui.stampKey) && ui.stampAt === acctCurtains()) return;
  const next = SECTION_ORDER.find((k) => sectionEarned(k, w) && !ui.stamped.has(k) && !ui.secSeen.has(k) && !ui.unfold.has(k)) || null;
  if (next || ui.stampAt !== acctCurtains()) { ui.stampKey = next; ui.stampAt = acctCurtains(); }
  if (ui.stampKey) ui.stamped.add(ui.stampKey);
}
function sectionOpen(key) { return sectionEarned(key, V().whore) || ui.unfold.has(key); }
// a section the player's progress just opened (not one she peeked into) wears a NEW IN THIS EDITION stamp until she opens it
const sectionNew = (key) => key === ui.stampKey && !ui.unfold.has(key) && !ui.secSeen.has(key) && sectionEarned(key, V().whore);
const newStamp = (key) => (sectionNew(key) ? '<span class="newstamp">New in this edition</span>' : '');
// When a locked section opens, in words: "after your 4th Curtain (3 to go)" (nextEdition's arithmetic), or null once it
// has. Rungs count the account's Curtains, and a Timeline shows no more until her own first Curtain there, so on that
// first evening a section on rung 1 (the back doors) or one the account has already earned opens after tonight's Curtain.
function unlockWhen(key) {
  const w = V().whore; if (sectionEarned(key, w)) return null;
  const need = SECTION_RUNG[key] || 0; const c = acctCurtains();
  if (w.curtains === 0 && Math.max(1, c) >= need) return 'after tonight\'s Curtain here';
  return `after your ${ord(need - 1)} Curtain (${Math.max(1, need - c)} to go)`;
}
function unlockText(key) { const t = unlockWhen(key); return t && `opens ${t}`; }
// BRIEF2 item 6: the market keeps its rung (one new thing per Curtain), but from the back doors on it is named, locked,
// at their foot with Peek, instead of hiding in "N more things unlock" (and the rung teaser doesn't say it twice)
const mktTeased = () => sectionOpen('doors') && !sectionOpen('market');
function marketTease(v) {
  if (!mktTeased()) return '';
  const f = marketFacts(v.whore.timeline);
  return `<div class="mkt-tease"><p><b class="h3">${ICON.lock} <button class="x" data-x="market">The market</button></b> New cards for your deck, ${f.price}. ${unlockText('market').replace(/^./, (x) => x.toUpperCase())}.</p>
    <button class="peek" data-act="show-where" data-id="market">Peek ›</button></div>`;
}
// the next edition of the paper, in words (the rung teaser's nearest rung)
function nextEdition(v) {
  const w = v.whore; const keys = Object.keys(SECTION_TITLE).filter((k) => !sectionEarned(k, w) && !ui.unfold.has(k) && !(k === 'market' && mktTeased()));
  if (!keys.length) return null;
  const names = (ks) => ks.map((k) => SECTION_TITLE[k]).join(' and ');
  if (w.curtains === 0) return `After tonight's Curtain here: ${names(keys.filter((k) => SECTION_RUNG[k] <= Math.max(1, acctCurtains())))|| names(keys.slice(0, 1))}.`;
  const need = Math.min(...keys.map((k) => SECTION_RUNG[k])); const c = acctCurtains();
  // a section on rung 0 (the reticule) opens with what she buys, not with a Curtain (round 6, finding 16)
  if (need === 0) return `${names(keys.filter((k) => SECTION_RUNG[k] === 0))}: in the paper whenever she has a novelty on her.`;
  return `${names(keys.filter((k) => SECTION_RUNG[k] === need))}: in the paper after your ${ord(need - 1)} Curtain (${Math.max(1, need - c)} to go)${keys.includes('rivals') && need === SECTION_RUNG.rivals ? ', or at 10 Renown' : ''}.`;
}
// every section still locked, collapsed into one line ("Coming in later editions"); each name peeks it open early
function lockedRow() {
  const keys = Object.keys(SECTION_TITLE).filter((k) => !sectionOpen(k) && !(k === 'market' && mktTeased()));
  if (!keys.length) return '';
  // round 6 (finding 9): one line, folded; the names wait behind it
  const open = ui.secOpen.has('later');
  return `<div class="later ${open ? 'open' : ''}"><button class="link later-line" data-act="fold" data-id="later" aria-expanded="${open}">${ICON.lock} ${keys.length} more ${keys.length === 1 ? 'thing unlocks' : 'things unlock'} as you climb ›</button>${open ? `<span class="peeks">${keys.map((k) => `<button class="peek" data-act="unfold" data-id="${k}">${esc(SECTION_TITLE[k])}</button>`).join('')}</span><span class="small">Tap a name to peek early.</span>` : ''}</div>`;
}
// round 5 (finding 9): newcomers see one pair of names, the Society Pages (Standing) and the Police Gazette (Notoriety);
// Posh / Gutter, High / Low Road and classy / notorious live in the EXCLUSIVEs
const KIND_ROAD = { posh: 'Society Pages', rowdy: 'Both papers', gutter: 'Police Gazette' };
// a Place on the paper she is in (round 7: always one; her meters decide it)
const onRoad = (w, kind) => (L.roadOf(w) === 'standing' && kind === 'posh') || (L.roadOf(w) === 'notoriety' && kind === 'gutter');
// A stall's goods in words: the black-market ones she can't see yet collapse into one phrase (finding 41). A Kink she
// knows is named ("Jingling Spurs (Hank's Kink)"), from kinkFor only: the engine unmasks it once his Kink is known, while
// tellOf always names him (the stall quotes his public Tell), so it would give the Kink away
function stallWords(stall, w) {
  const hidden = stall.filter((it) => it.blackMarket && w.notoriety < R.rummage.blackMarketAt).length;
  const seen = stall.filter((it) => !(it.blackMarket && w.notoriety < R.rummage.blackMarketAt)).map((it) => (it.kinkFor && C.GENTS[it.kinkFor] ? `${it.name} (${C.GENTS[it.kinkFor].short}'s Kink)` : it.name));
  const under = hidden === 0 ? [] : [hidden === 1 ? 'something under the counter' : `${['', 'one', 'two', 'three'][hidden] || hidden} somethings under the counter`];
  return [...seen, ...under].join(', ');
}

SCREENS.front = () => {
  const v = V(); const w = v.whore; const T = v.timeline;
  const note = noteFor(v);
  // a Timeline's first evening (her own first Curtain there): the decision and the gentlemen, nothing else
  const first = w.curtains === 0;
  const gentsById = Object.fromEntries(T.gents.map((g) => [g.id, g]));
  const poshClosed = T.places.some((p) => !p.open);
  const places = T.places.map((p) => {
    const host = gentsById[p.host];
    const o = p.open ? L.placeOutlook(v, p.id) : null;
    // a first Gutter visit is capped at one smiley (Best Guess and the casual bot decline it); the card shows the true
    // matchup and says what the visit costs, so the Notoriety route is visible
    const slum = !!(o && o.slumming && o.smileysRaw != null);
    // a novelty in her reticule that lifts tonight's play here (his Kink item above all) counts, so the board agrees with
    // the yellow note; the plain smileys still drive Best Guess's Place and the Standing Order
    const boost = p.open ? L.placeBoost(v, p.id) : null;
    const withIt = boost && boost.item && boost.smileys > (o ? o.smileys : 0) ? boost : null;
    const sm = withIt ? withIt.smileys : o ? (slum ? o.smileysRaw : o.smileys) : 0;
    const fancy = host.fancy === w.type;
    return `<div class="place ${p.open ? '' : 'shut'}">
      <button class="place-hit" data-act="plan" data-id="${p.id}" aria-label="Plan tonight at ${esc(p.name)}"></button>
      <div class="pimg">${img(p.art, p.name)}<span class="kindtag k-${p.kind} ${onRoad(w, p.kind) ? 'onroad' : ''}">${KIND_ROAD[p.kind]}${onRoad(w, p.kind) ? ' · her paper' : ''}${p.raid ? ' · Raid night' : ''}</span>
        ${p.open ? '' : '<span class="stamp shutstamp">Not receiving</span>'}</div>
      <button class="host" data-act="open-gent" data-id="${host.id}" data-hold="gent:${host.id}" aria-label="Tonight's host, ${esc(host.short)}: read his card">${img(host.art, host.short)}</button>
      <div class="pbody"><span class="h3 era-type">${esc(p.short)}</span>
        <span class="small">Host: <b>${esc(host.short)}</b>${fancy ? ' · weak for your type' : ''}</span>
        ${first ? '' : `<span class="small">House rule: ${esc(p.house.name)}</span>`}
        <span class="smiles">${p.open ? `${'☺'.repeat(sm)}${'·'.repeat(3 - sm)} ${slum ? `${esc(C.LINES.smileys[sm])} · Police Gazette · Notoriety +1` : esc(C.LINES.smileys[sm])}${withIt ? ` <b class="withit">with your ${esc(withIt.itemName.replace(/^the /i, ''))}${withIt.kink ? ' (his Kink!)' : ''}</b>` : ''}` : esc(C.LINES.notTonight)} · Bar ${p.rules.bar}</span>
        ${p.open ? `<span class="paytag ${w.daily.fullPayLeft ? '' : 'ah'}">${esc(fullPayText(w))}</span>` : `<span class="paytag back">${esc(wayBack(v))}</span>`}</div>
    </div>`;
  }).join('');
  // round 6 (finding 9): the back alleys join the board after the account's 3rd Curtain, one new thing at a time
  const alleyLater = acctCurtains() < ALLEY_RUNG;
  const board = v.board.filter((b) => !(alleyLater && b.backAlley)).map((b) => {
    if (b.tourist) {
      const t = T.tourist;
      return `<button class="punter" data-act="start-assign" data-id="${b.gent}" data-hold="tourist:${b.gent}">${photo(t.art, t.short, `<b>${esc(t.short)}</b>`)}<span class="tag">Lost tourist · Bar ${b.bar} · Delight ${b.bar + R.assign.delightMargin} · can't fail</span></button>`;
    }
    const g = gentsById[b.gent];
    const unknown = (g.known.secret ? 0 : 1) + (g.known.kink ? 0 : 1);
    const hostAt = hostTonight(v, g.id);
    return `<button class="punter" data-act="open-gent" data-id="${g.id}" data-hold="gent:${g.id}">
      ${unknown ? `<span class="qs" aria-label="${unknown} secrets">${'<i>?</i>'.repeat(unknown)}</span>` : ''}
      ${photo(g.art, g.short, `<b>${esc(g.short)}</b>`)}${hostAt ? `<span class="tag host">Hosts ${esc(hostAt.short)} tonight</span>` : ''}<span class="tag">${b.invitation && L.roadOf(w) !== 'notoriety' ? `Invitation · Delight: +${R.highRoad.invitationRenown} Renown · ` : ''}${b.backAlley ? 'Back alley · Notoriety +1 · ' : ''}${ui.taught.has('bar') ? esc(C.FRESHNESS[g.freshness].name) : FRESH_PLAIN[g.freshness]} · Bar ${b.bar} · Delight ${b.bar + R.assign.delightMargin}</span></button>`;
  }).join('');
  const hiddenAlley = T.gents.filter((g) => !v.board.some((b) => b.gent === g.id) || (alleyLater && v.board.some((b) => b.gent === g.id && b.backAlley)));
  const doors = T.places.map((p) => `<button class="door" data-act="rummage" data-id="${p.id}"><span><b>Behind ${esc(p.short)}</b><br><span class="small">${p.stall.length ? esc(stallWords(p.stall, w)) : 'Odds and ends'}</span></span>${p.id === T.freshFor ? '<span class="fresh">Fresh stock</span>' : '<span class="small">Try it</span>'}</button>`).join('');
  const items = w.items.map((it) => itemTile(it, { kink: true })).join('');
  const offer = w.offer ? `<button class="item on" data-act="open-offer" data-hold="offer:0">${img(w.offer.item.art, w.offer.item.name)}<b>${esc(w.offer.item.name)}</b><span class="small">On offer · ${w.offer.price} Coin</span></button>` : '';
  // a curse is a card in her deck (the hub files it under Cards), so the page gives it a row of its own and not a place in the reticule
  const cursesSec = w.afflictions.length ? `<section class="sheet" data-sec="curses"><div class="sec-head"><span class="h2">Curses</span><button class="x type" data-x="affliction">what's this?</button></div><div class="curses">${curseRows(v)}</div></section>` : '';
  const rivals = T.rivals.map((r) => `<button class="rival" data-act="profile" data-id="${r.id}">${photo(r.art, r.name, `<b>${esc(C.CHARACTERS[r.id].short)}</b>${esc(r.title)}`, { pin: false })}<span class="lbl">${badgeFor(r, 'span')}</span></button>`).join('');
  const curtainSec = `<section class="sheet" data-sec="curtain">
    <div class="sec-head" id="places"><span class="h2">Tonight's Curtain</span><span class="type"><span data-cd="${w.timeline}">${cdText(w.timeline)}</span> · <button class="x" data-x="curtain">what's this?</button></span></div>
    ${w.plan && w.plan.sealed ? `<p class="sealwait"><b>Sealed for ${esc(C.PLACES[w.plan.place].short)}.</b> <span data-seal="${w.id}">${esc(sealText(w.id))}</span></p>` : ''}
    ${afterHoursBanner(v)}
    <div class="places">${places}</div>
    ${poshClosed && !first ? `<p class="small">${esc(wayBack(v))} ${wayBackCard(v) ? 'Each time: Notoriety −1.' : 'Each Delight: Standing +1, Notoriety −1.'}</p>` : ''}
  </section>`;
  const meanwhileSec = `<section class="sheet" data-sec="meanwhile">
    <div class="sec-head" id="meanwhile"><span class="h2">Meanwhile, between Curtains</span><button class="x type" data-x="assignation">Assignations</button></div>
    <p class="small">Tap a gentleman to read his card, Study him or take him on.</p>
    <div class="punters">${board}</div>
    ${hiddenAlley.length ? `<p class="locked-note">${hiddenAlley.length === 1 ? 'A third gentleman lurks' : 'Gentlemen lurk'} in the back alley. ${alleyLater && w.notoriety >= R.backAlleyAt ? `He steps out after your ${ord(ALLEY_RUNG - 1)} Curtain.` : `<button class="x" data-x="lowroad">Notoriety ${R.backAlleyAt}+</button> to meet him.`}</p>` : ''}
    ${sectionOpen('doors') ? `<div class="sec-head" id="doors"><span class="h2">Back doors</span>${newStamp('doors')}<button class="x type" data-x="rummage">${w.daily.freshRummagesLeft} fresh tries today</button></div>
    ${specialBlock(v)}<div class="doors">${doors}</div>${marketTease(v)}` : ''}
  </section>`;
  // Sections already seen fold to a one-line header with a count (tap to open), so the page stays short.
  const shown = (key) => { ui.secShown.add(key); return true; };
  const fold = (key, title, count) => `<button class="fold-sec" data-act="fold" data-id="${key}" aria-expanded="false"><span class="h3">${esc(title)}</span>${newStamp(key)}<span class="type">${esc(count)} ▾</span></button>`;
  // a section she has seen, or one her progress has just opened (it arrives folded, with its NEW stamp), is a one-line
  // header until she taps it (finding 51: a new Timeline's front page never opens five sections at once)
  // after her first evening every section arrives folded (a one-line header) until she opens it: the page stays short
  const folded = (key) => !first && !ui.secOpen.has(key) && !(key === 'reticule' && w.offer);
  const unfoldBtn = (key) => (!first ? `<button class="link type fold-x" data-act="fold" data-id="${key}" aria-expanded="true">fold ▴</button>` : '');
  const handPart = !sectionOpen('hand') ? '' : folded('hand') ? fold('hand', 'Your hand tonight', `${w.hand.length} of ${w.deck.length} cards`)
    : shown('hand') && `<div class="sec-head"><span class="h2">Your hand tonight</span>${newStamp('hand')}<span class="row tight"><button class="link type" data-act="things" data-id="cards">her deck ›</button>${unfoldBtn('hand')}</span></div>
    <p class="small">Tap a card to read it.</p>
    <div class="hand">${w.hand.map((c) => cardEl(c, { act: 'inspect-card' })).join('')}</div>`;
  const retPart = !sectionOpen('reticule') ? '' : folded('reticule') && !w.offer ? fold('reticule', 'The reticule', `${w.items.length}/${R.reticule} novelties`)
    : shown('reticule') && `<div class="sec-head"><span class="h2">The reticule</span>${newStamp('reticule')}<span class="row tight"><button class="link type" data-act="things" data-id="novelties">${w.items.length}/${R.reticule} novelties ›</button>${unfoldBtn('reticule')}</span></div>
    ${items || offer ? `<div class="reticule">${offer}${items}</div>` : '<p class="empty-note">Just a hairpin and a mint. Rummage a back door.</p>'}`;
  const handSec = sectionOpen('hand') || sectionOpen('reticule') ? `<section data-sec="hand" class="sheet">${handPart}${retPart}</section>` : '';
  const marketSec = !sectionOpen('market') ? '' : `<section class="sheet" id="market">${folded('market') ? fold('market', 'The market', `${T.market.length} new cards`) : shown('market') && `
    <div class="sec-head"><span class="h2">The market</span>${newStamp('market')}<span class="row tight"><span class="type"><button class="x" data-x="market">New cards for your deck</button>. They join your hand after the next shuffle.</span>${unfoldBtn('market')}</span></div>
    <div class="market">${T.market.map((c, i) => `<div class="mcol">${cardEl({ ...c, idx: i }, { act: 'inspect-market', src: 'market' })}<button class="btn small" data-act="buy-card" data-id="${c.id}" ${w.coin >= c.cost ? '' : 'disabled'}>Learn · ${c.cost} Coin</button>${w.coin >= c.cost ? '' : `<span class="small need">Need ${c.cost}, you have ${w.coin}</span>`}</div>`).join('')}</div>`}
  </section>`;
  const rivalSec = !sectionOpen('rivals') ? '' : `<section class="sheet">${folded('rivals') ? fold('rivals', 'The competition', `${T.rivals.length} in ${T.short}${w.gossip ? ` · ${plural(w.gossip, 'Gossip')} to trade` : ''}`) : shown('rivals') && `
    <div class="sec-head"><span class="h2">The competition</span>${newStamp('rivals')}<span class="row tight"><span class="type">${T.rivals.length} in ${esc(T.short)}</span>${unfoldBtn('rivals')}</span></div>
    ${w.gossip ? `<p class="small">You hold ${plural(w.gossip, 'piece')} of <button class="x" data-x="gossip">Gossip</button>: tap a rival to trade it.</p>` : ''}
    <div class="rivals">${rivals}</div>`}
  </section>`;
  // what's next: the sections still locked, and the next rung of the ladder (the progression teaser)
  const lr = lockedRow(); const rung = rungTeaser(v);
  const lockedTail = lr || rung ? `<section class="sheet whatsnext" data-sec="next">${lr}${rung}</section>` : '';
  // how many pages arrived folded in this edition: one index line, so nothing new hides (finding 51)
  const newCount = Object.keys(SECTION_TITLE).filter((k) => sectionNew(k) && sectionOpen(k) && !ui.secOpen.has(k)).length;
  const newIdx = !first && newCount >= 2 ? `<p class="newidx"><span class="newstamp">New in this edition</span> ${newCount} pages, folded below: tap one to open it.</p>` : '';
  // First evening: the yellow note docks at the foot of the screen, beside the Menu button, so "what next" is always there.
  const docked = first;
  const noteBtn = `<button class="note ${docked ? 'docked' : ''}" data-act="note" data-kind="${note.act}" data-id="${note.id || ''}" data-step="${note.step}"><b>Next</b><span>${esc(note.t)}</span><span class="tap" aria-hidden="true">›</span></button>`;
  return `<section class="sheet masthead">
    ${gazette(v)}
    ${stripHTML()}
    ${roadRail(v)}
    ${docked ? '' : noteBtn}
    ${first ? '' : secChips(v)}
  </section>
  <div class="hlslot" aria-live="polite"></div>
  ${curtainSec}${meanwhileSec}<div class="fp-more">${newIdx}
  ${cursesSec}${handSec}${marketSec}${rivalSec}${lockedTail}</div>${docked ? noteBtn : ''}`;
};

// ----- Assignation and the evening plan share one play layer: hand, decision block, Sway tray -----
function assignData() {
  const v = V(); const A = v.whore.assignation;
  if (!A) return null;
  const gid = A.gent; const tourist = !!C.TOURISTS[gid];
  const g = tourist ? null : v.timeline.gents.find((x) => x.id === gid);
  const who = tourist ? v.timeline.tourist : g;
  const talent = talentPlay(v, 'assign');
  const pv = L.previewEncounter(v, { gent: gid, cards: ui.sel, item: ui.item, talent });
  const bg = L.bestGuess(v, { gent: gid });
  const bgPrev = bg.cards.length ? L.previewEncounter(v, { gent: gid, cards: bg.cards }) : { sway: 0 };
  const bar = pv.bar;
  return { mode: 'assign', v, A, gid, tourist, g, who, pv, bg, bgPrev, talent, bar, delight: bar + R.assign.delightMargin, src: A.lent };
}
function planData() {
  const v = V(); const w = v.whore; const T = v.timeline;
  const p = T.places.find((x) => x.id === ui.place); if (!p) return null;
  const g = T.gents.find((x) => x.id === p.host);
  const talent = talentPlay(v, 'plan');
  const pv = L.previewEncounter(v, { place: p.id, cards: ui.sel, item: ui.item, talent, grease: ui.grease });
  const bg = L.bestGuess(v, p.id);
  const bgPrev = bg.cards.length ? L.previewEncounter(v, { place: p.id, cards: bg.cards }) : { sway: 0 };
  const firstGutter = !!(p.open && L.placeOutlook(v, p.id).slumming); // the engine's own "first Gutter visit" test
  return { mode: 'plan', v, w, T, p, g, gid: g.id, who: g, pv, bg, bgPrev, talent, bar: p.rules.bar, src: w.hand, firstGutter, tourist: false, rival: rivalHere(v, p.id) };
}
const playData = () => (ui.screen === 'assign' ? assignData() : ui.screen === 'plan' ? planData() : null);
// A rival you KNOW will be at this Place tonight: the Timeline's rival while the prototype script makes her follow you (its
// first Curtain only), or one whose leaning you bought with Gossip for this very Curtain. Otherwise nobody is promised.
function rivalHere(v, pid) {
  const T = v.timeline;
  const scripted = L.isScriptedCurtain(ui.S, v.whore.timeline);
  return T.rivals.find((r) => (scripted && C.CHARACTERS[r.id].role === 'rival') || (ui.leaning[r.id] && ui.leaning[r.id].curtainNo === T.curtainNo && ui.leaning[r.id].place === pid)) || null;
}
function talentPlay(v, mode) {
  const t = v.whore.talent;
  if (!ui.talentOn || v.whore.talentUsed) return null;
  if (t === 'double-entendre') {
    if (!ui.sel.length) return null;
    // the player's own pick (the Art button cycles it) wins; otherwise the engine's best card and Art. When no Art helps,
    // the Talent is not played at all, so a once-per-Curtain trick is never sealed for nothing.
    if (ui.deArt && ui.sel.includes(ui.deArt.card)) return { kind: t, card: ui.deArt.card, art: ui.deArt.art };
    const de = bestDE(v, mode);
    return de ? { kind: t, card: de.card, art: de.art } : null;
  }
  if (t === 'smokescreen' || t === 'make-him-wait' || (t === 'upstage' && mode === 'plan')) return { kind: t };
  return null;
}
// L.bestDoubleEntendre searches every picked card and Art (Itch guard and Notoriety cost included); null = nothing helps
function bestDE(v, mode) {
  const opt = mode === 'plan' ? { place: ui.place, grease: ui.grease } : { gent: v.whore.assignation.gent };
  return L.bestDoubleEntendre(v, { ...opt, cards: ui.sel, item: ui.item || undefined });
}
function talentBlock(v, mode) {
  const t = v.whore.talent; const T = C.TALENTS[t];
  const usable = { assign: ['double-entendre', 'smokescreen', 'make-him-wait'], plan: ['double-entendre', 'smokescreen', 'make-him-wait', 'upstage', 'quick-change', 'read-the-room'] }[mode];
  if (!usable.includes(t)) return '';
  if (v.whore.talentUsed) return `<p class="small">Talent <b>${esc(T.name)}</b> is spent until the next Curtain.</p>`;
  if (t === 'quick-change') return `<div class="row"><button class="btn small" data-act="quick-change" ${ui.sel.length ? '' : 'disabled'}>Quick Change${ui.sel.length ? `: swap ${esc(v.whore.hand[ui.sel[ui.sel.length - 1]].name)}` : ': pick a card first'}</button><span class="small">${esc(T.text)}</span></div>`;
  if (t === 'read-the-room') return `<div class="row"><button class="btn small" data-act="read-room">Read the Room</button><span class="small">${esc(T.text)}</span></div>`;
  // round 5 (finding 11): Double Entendre is introduced the first time it would change a score
  if (t === 'double-entendre' && !ui.talentOn && !ui.taught.has('deSeen')) { const de0 = ui.sel.length ? bestDE(v, mode) : null; if (!de0 || !(de0.gain > 0)) return ''; ui.taught.add('deSeen'); }
  const de = t === 'double-entendre' && ui.talentOn && ui.sel.length ? talentPlay(v, mode) : null;
  const src = mode === 'plan' ? v.whore.hand : v.whore.assignation.lent;
  const card = de ? src.find((c) => c.idx === de.card) : null;
  const art = de ? de.art : null;
  const none = t === 'double-entendre' && ui.talentOn && ui.sel.length && !de;
  const once = mode === 'assign' ? ' <b>Once per Curtain:</b> use it here and it\'s spent for tonight\'s Curtain.' : '';
  return `<div class="row"><button class="btn small ${ui.talentOn ? 'primary' : ''}" data-act="talent-toggle" aria-pressed="${ui.talentOn}">${esc(T.name)}: ${ui.talentOn ? 'on' : 'off'}</button>
    <span class="small talent-note">${de ? `${esc(card.name)} also counts as <button class="link" data-act="de-art">${artLabel(art)}</button>.` : none ? 'No Art helps these cards tonight, so it won\'t be used up.' : esc(T.text)}${once}</span></div>`;
}
// A Kink decoded by buying his novelty (rules-core §6.1) is news every time, guided or not: the purchase headline says so,
// so "+3 on him" never appears before the player has been told his Kink.
function decodedLine(evs, wid, tail) {
  const e = (evs || []).find((x) => x.type === 'learned' && (x.whores || [])[0] === wid && x.data.why === 'tell-decoded' && x.data.facts.includes('kink'));
  if (!e) return null;
  const g = C.GENTS[e.gents[0]];
  return `You've cracked ${g.short}'s Kink: ${e.data.kink}. ${tail || `+${R.sway.kink} whenever you bring it to him.`}`;
}
// What each novelty adds against tonight's man, from the engine's preview (your picked cards, or Best Guess's while you
// have picked none). A novelty that fires his Kink glows.
function itemGains(d) {
  return d.v.whore.items.filter((it) => it.ready).map((it) => {
    const cards = ui.sel.length ? ui.sel : d.bg.cards;
    const base = d.mode === 'assign' ? { gent: d.gid, cards } : { place: d.p.id, cards, grease: ui.grease };
    const tal = d.talent && d.talent.kind !== 'double-entendre' ? d.talent : undefined;
    const withIt = L.previewEncounter(d.v, { ...base, item: it.id, talent: tal });
    const without = L.previewEncounter(d.v, { ...base, talent: tal });
    return { it, gain: withIt.sway - without.sway, kink: !!(withIt.kinkHit && !without.kinkHit) };
  });
}
function itemsBlock(d) {
  const gains = itemGains(d);
  if (!gains.length) return '';
  const who = d.who ? d.who.short : 'him';
  return `<div class="row">${gains.map(({ it, gain, kink }) => `<button class="btn small item-btn ${ui.item === it.id ? 'primary' : ''} ${kink ? 'kinkglow' : ''}" data-act="item-toggle" data-id="${it.id}" aria-pressed="${ui.item === it.id}">${esc(it.name)}${gain > 0 ? ` · +${gain} on ${esc(who)}` : gain < 0 ? ` · ${gain}` : ' · no help tonight'}</button>`).join('')}</div>`;
}
// The host's tastes in one non-scrolling row right above the hand, so the cards and whom they are for share a screen.
function tasteRow(g, w) {
  if (!g) return '';
  return `<div class="taste-row" aria-label="What he likes">${g.tastes.map((a) => `<span class="tg good">✓${artIcon(a)}${esc(C.ARTS[a].name)}</span>`).join('')}<span class="tg bad">✗${artIcon(g.aversion)}${esc(C.ARTS[g.aversion].name)}</span>${g.known.secret ? `<span class="tg good">✓${artIcon(g.secretTaste)}secretly</span>` : ''}</div>`;
}
function itchWarn(v, pv) {
  if (pv.catches) return `<p class="warn">Itch ${v.whore.itch} → ${pv.itchAfter}: you'd catch ${esc(C.AFFLICTIONS[pv.catches].name)}. Fancy it?</p>`;
  return '';
}
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
// What a play does to her two roads (round 4, finding 2): the seesaw after `noto` Notoriety points, and whether the Posh
// door would shut. Uses the engine's own seesawAfter / poshShutWhy.
function roadCost(v, noto) {
  const w = v.whore; if (!noto || noto <= 0) return null;
  const after = L.seesawAfter(w.standing, w.notoriety, noto);
  const dn = after.notoriety - w.notoriety; const ds = w.standing - after.standing;
  if (!dn && !ds) return null;
  const posh = v.timeline.places.find((p) => p.kind === 'posh');
  const shuts = !!(posh && L.poshShutWhy(w.standing, w.notoriety) === null && L.poshShutWhy(after.standing, after.notoriety) !== null);
  const text = [dn ? `Notoriety +${dn}` : '', ds ? `Standing −${ds}` : ''].filter(Boolean).join(', ');
  return { after, shuts, posh, text, full: `${text}${shuts ? ` · ${theLower(posh.short)} shuts` : ''}` };
}
// The Notoriety a play would actually cost: its own (Frolic at Posh, the Gutter, novelties, Smokescreen), a back-alley win,
// and a catch (Notoriety +1). An After Hours Curtain moves no meter; an Assignation that fizzles skips the back-alley point.
function playNoto(d, pv) {
  if (d.mode === 'plan' && !d.v.whore.daily.fullPayLeft) return 0;
  const alley = d.mode === 'assign' && !d.tourist && d.g && d.g.freshness === 'ripe' && pv.sway >= pv.bar;
  return Math.max(0, (pv.noto || 0) + (alley ? 1 : 0) + (pv.catches ? 1 : 0));
}
function shutCardHTML(rc, firstGutter) {
  if (!rc || !rc.shuts) return '';
  const v = V(); const scrubbed = v.timeline.gents.find((x) => x.freshness === 'scrubbed');
  return `<div class="shut-preview"><div class="mini">${img(rc.posh.art, rc.posh.name)}<span class="tag">Closes if you go</span></div><span class="small"><b>${esc(rc.posh.short)}</b>${firstGutter ? ' would shut its door to you tonight.' : ` stops receiving you until you Delight ${esc(scrubbed ? scrubbed.short : 'a Scrubbed gentleman')} in an Assignation.`}</span></div>`;
}
const placeShort = (pid) => C.PLACES[pid].short;
// The push-your-luck, face up: the better play Best Guess held back because it would catch something.
function betBlock(d) {
  const gm = d.bg.gamble; if (!gm || d.tourist || sameSet(ui.sel, gm.cards)) return '';
  const A = C.AFFLICTIONS[gm.catches];
  let coin = '';
  if (d.mode === 'assign') { const c = L.assignationPay(d.v, gm.sway, gm.cards).coin - L.assignationPay(d.v, d.bgPrev.sway, d.bg.cards).coin; if (c > 0) coin = `, +${c} Coin`; }
  const gp = L.previewEncounter(d.v, d.mode === 'assign' ? { gent: d.gid, cards: gm.cards } : { place: d.p.id, cards: gm.cards });
  const rc = roadCost(d.v, playNoto(d, { ...gp, catches: gp.catches || gm.catches }));
  return `<div class="bet"><p><b>Fancy a gamble?</b> Itch ${d.v.whore.itch} → ${R.itchMax}: you'd catch ${esc(A.name)}. +${gm.gain} Sway${coin}${rc ? ` · <b class="roadd">${esc(rc.full)}</b>` : ''}.</p>${shutCardHTML(rc)}<button class="btn small" data-act="take-bet">Take the bet</button></div>`;
}
// What spending a single-use novelty or tonight's Talent here costs at tonight's Curtain (from Best Guess, visible facts only).
function costLine(d) {
  if (d.mode !== 'assign' || d.tourist) return '';
  const v = d.v; const out = [];
  const openPid = (gid) => { const P = hostTonight(v, gid); return P ? P.id : null; };
  if (ui.item) {
    const it = v.whore.items.find((x) => x.id === ui.item);
    if (it && (it.usesLeft <= 1 || C.ITEMS[it.id].cooldownCurtains)) {
      const pid = openPid(it.kinkFor || it.tellOf) || L.casualPlace(v);
      const n = L.bestGuess(v, pid, { item: it.id }).sway - L.bestGuess(v, pid).sway;
      if (n > 0) out.push(`${it.name}: tonight's Curtain without it (−${n} Sway at ${placeShort(pid)})`);
    }
  }
  if (d.talent && d.talent.kind === 'double-entendre') {
    const pid = L.casualPlace(v);
    const de = L.bestDoubleEntendre(v, { place: pid, cards: L.bestGuess(v, pid).cards });
    if (de && de.gain > 0) out.push(`Double Entendre: tonight's Curtain without it (−${de.gain} Sway at ${placeShort(pid)})`);
  }
  return out.length ? `<p class="cost">Using it here: ${out.map(esc).join('; ')}.</p>` : '';
}
function hintLines(target, wv, all) {
  const d = L.describeMatchup(target, wv);
  if (all) return d.lines;
  const pick = d.lines.filter((l) => /weak for|From your hand|Avoid|Kink:|Bring|Secret Taste: \?|Secretly|Regular|Grudge|Seen It|can't fail/i.test(l));
  return (pick.length ? pick : d.lines).slice(0, 4);
}
// compact (the play screens): his tastes live in the row right above the hand, so the head carries only the rest, in one
// short row (finding 49: seven 40px chips in four rows pushed the hand behind the tray)
function gentChips(g, w, compact = false) {
  return `<div class="chips ${compact ? 'compact' : ''}">
    ${compact ? '' : g.tastes.map((a) => `<button class="chip good" data-x="tick">✓ ${artLabel(a)}</button>`).join('')}
    ${compact ? '' : `<button class="chip bad" data-x="aversion">✗ ${artLabel(g.aversion)}</button>`}
    <button class="chip ${g.fancy === w.type ? 'solid' : ''}" data-x="fancy">Fancy: ${esc(C.TYPES[g.fancy].name)}</button>
    <button class="chip" data-x="freshness">${esc(C.FRESHNESS[g.freshness].name)}</button>
    <button class="chip ${g.known.secret ? 'good' : 'q'}" data-x="secret">${g.known.secret ? `Secretly ${artLabel(g.secretTaste)}` : 'Secret: ?'}</button>
    <button class="chip ${g.known.kink ? 'good' : 'q'}" data-x="kink">${g.known.kink ? `Kink: ${esc(g.kink.name)}` : 'Kink: ?'}</button>
    ${!compact && g.known.kink ? whereChip(g, V()) : ''}
  </div>`;
}
function studyBtn(v, g) {
  if (g.known.secret && g.known.kink && g.known.history) return '';
  const left = v.whore.daily.freeStudiesLeft;
  return `<button class="btn small" data-act="study" data-id="${g.id}">Study him · ${left > 0 ? `${left} free` : '1 Coin'}</button>`;
}
function playCards(d, noDeal) {
  return d.src.map((c) => {
    const src = d.mode === 'assign' ? 'lent' : 'hand';
    if (c.affliction) return cardEl(c, { src, act: 'inspect-card' });
    const pos = ui.sel.indexOf(c.idx);
    const info = pos >= 0 ? d.pv.cards[pos] : L.previewEncounter(d.v, d.mode === 'assign' ? { gent: d.gid, cards: [c.idx] } : { place: d.p.id, cards: [c.idx] }).cards[0];
    const glow = d.tourist && d.pv.sway < d.delight && d.bg.cards.includes(c.idx) && pos < 0;
    // an Assignation card that is also in her Curtain hand, against tonight's host: Working it here stamps it Seen It
    const tonightSeen = d.mode === 'assign' && !d.tourist && hostTonight(d.v, d.gid) && d.v.whore.hand.some((h) => h.id === c.id) && d.v.whore.vice !== 'bored-stiff'
      ? [{ t: `Seen tonight −${R.sway.seenIt}`, cls: 'seen' }] : [];
    return cardEl(c, { src, act: 'pick', sel: pos >= 0, marks: [...marksFor(info), ...(d.tourist ? [] : seenMark(d.v, d.gid, c.id)), ...tonightSeen], score: info.score, glow, deal: d.mode === 'assign' && !ui.aDealt && !noDeal, delay: c.idx * 120, noPocket: d.tourist });
  }).join('');
}
// ----- Where to get his Kink (BRIEF2 item 5) -----
// Every way to bring his Kink, from the masked view and static content only, so nothing shows before she knows it: his
// novelty (the stall in this Timeline that sells it) and, for 8 of the 9 Kinks, a market card. Each route has a state (first
// match wins) and the show-where id that takes her there. The fresh-stock odds follow exploreM: the sure look at tonight's
// fresh stall picks one of its eligible items at random (it never asks for one by name), so a two-item stall is 1 in 2.
const shortItem = (name) => String(name).replace(/\s*\([^)]*\)$/, '').replace(/,.*$/, ''); // "The Golden Spike (Souvenir)" → "The Golden Spike"
function kinkWays(g, v) {
  if (!g || !g.known || !g.known.kink || !g.kink) return [];
  const w = v.whore; const T = v.timeline; const out = [];
  const it = C.ITEMS[g.kink.item];
  const P = it && T.places.find((p) => p.stall.some((x) => x.id === it.id));
  if (P) {
    const bmAt = R.rummage.blackMarketAt;
    const eligible = P.stall.filter((x) => !x.blackMarket || w.notoriety >= bmAt);
    const state = w.items.some((x) => x.id === it.id) ? 'owned'
      : w.offer && w.offer.item.id === it.id ? 'offer'
        : T.special.item.id === it.id && !T.special.why ? 'special'
          : it.blackMarket && w.notoriety < bmAt ? 'bm'
            : !sectionOpen('doors') ? 'shut'
              : w.daily.freshRummagesLeft === 0 ? 'stale'
                : T.freshFor === P.id ? 'fresh' : 'luck';
    const id = state === 'owned' ? `mine:${it.id}` : state === 'offer' || state === 'special' ? state : `door:${P.id}`;
    out.push({ kind: 'item', it, P, eligible, state, id });
  }
  const cid = g.kink.trigger && g.kink.trigger.cards && g.kink.trigger.cards[0];
  const card = cid && T.market.find((c) => c.id === cid);
  if (card) out.push({ kind: 'card', card, withArt: g.kink.trigger.withArt || null, state: w.deck.includes(cid) ? 'owned' : sectionOpen('market') ? 'open' : 'locked', id: `market:${cid}` });
  return out;
}
// one route in words, its price face up before the tap
function wayText(r, or) {
  const coin = (n) => `${n} Coin`;
  if (r.kind === 'card') {
    const art = r.withArt ? ` (play it with a ${C.ARTS[r.withArt].name} card)` : '';
    if (r.state === 'owned') return `${r.card.name}: in your deck ✓`;
    const lead = `${or ? 'Or learn' : 'Learn'} ${r.card.name}, ${coin(r.card.cost)}, in the market${art}`;
    return r.state === 'open' ? `${lead} ›` : `${lead}. The market ${unlockText('market')}. Peek ›`;
  }
  const nm = r.it.name; const at = `behind ${theLower(r.P.short)}`;
  if (r.state === 'owned') return `${nm}: in your reticule ✓`;
  if (r.state === 'offer') return `${nm}: on the counter now, ${coin(r.it.cost)} ›`;
  const lead = `${nm}, ${coin(r.it.cost)}`;
  if (r.state === 'special') return `${lead}: today's Morning Special ›`;
  if (r.state === 'bm') return `${lead}: under the counter at ${theLower(r.P.short)}, Notoriety ${R.rummage.blackMarketAt}+ only ›`;
  if (r.state === 'shut') return `${lead}: ${at}. The back doors open after tonight's Curtain. Peek ›`;
  if (r.state === 'stale') return `${lead}: ${at}. No fresh tries left today: the stalls restock at dawn ›`;
  if (r.state === 'fresh') return `${lead}: ${at} · Fresh stock tonight: ${r.eligible.length === 1 ? 'a sure find' : `${r.eligible.map((x) => theLower(shortItem(x.name))).join(' or ')}, 1 in ${r.eligible.length}`} ›`;
  return `${lead}: ${at} · try your luck (a look is free) ›`;
}
// the back face of his card: every route as a 44 px row; the whole row is the link (a card in her deck has nowhere to go yet)
function whereRows(g, v) {
  const ways = kinkWays(g, v); if (!ways.length) return '';
  return `<div class="wrows">${ways.map((r, i) => (r.kind === 'card' && r.state === 'owned' ? `<p class="wrow done">${esc(wayText(r, i > 0))}</p>`
    : `<button class="wrow" data-act="show-where" data-id="${esc(r.id)}">${esc(wayText(r, i > 0))}</button>`)).join('')}</div>`;
}
// The one place a "where" link goes, [id, chip label], or null: his novelty unless she has it or it is under the counter,
// then the market card, then the black-market door ("Notoriety 2+ at Hog Ranch Row")
function whereTarget(g, v) {
  const ways = kinkWays(g, v); const it = ways.find((r) => r.kind === 'item'); const cd = ways.find((r) => r.kind === 'card');
  if (it && it.state === 'owned') return null;
  if (it && it.state !== 'bm') return [it.id, it.state === 'offer' ? 'On the counter now' : it.state === 'special' ? 'Today\'s Morning Special' : `Behind ${theLower(it.P.short)}`];
  if (cd && cd.state !== 'owned') return [cd.id, 'In the market'];
  if (it) return [it.id, `Notoriety ${R.rummage.blackMarketAt}+ at ${theLower(it.P.short)}`];
  return null;
}
function whereChip(g, v) { const t = whereTarget(g, v); return t ? `<button class="chip where" data-act="show-where" data-id="${esc(t[0])}">${esc(t[1])} ›</button>` : ''; }
// "Where to get it ›" beside a printed Kink (the correspondent, the Assignation's coaching), from the view as it is now
function whereBtn(gid) {
  const v = V(); const g = v.timeline.gents.find((x) => x.id === gid); const t = g && whereTarget(g, v);
  return t ? `<button class="btn small where-go" data-act="show-where" data-id="${esc(t[0])}">Where to get it ›</button>` : '';
}
// The host's Kink novelty in stock behind a back door tonight (the fresh stall; the seeded first evening has the Cane behind
// the Salon, where Lord Plunkett hosts): the Kink lesson as one optional tap on his plan screen (round 4, finding 19).
// Uses only what she can see: the stall quotes his public Tell (tellOf); his Kink stays hidden until she buys or Studies.
// One source with the sim (L.kinkOffer, round 6): the same offer the casual-tap bot takes. Shown only on her first
// Curtain in a Timeline, as the taster (designer's call 2026-10-07: after that, Kinks are earned by Studying and reading him).
function kinkOfferPlace(v) {
  const k = L.kinkOffer(v, { firstOnly: true }); if (!k) return null;
  return { ...k, host: v.timeline.gents.find((g) => g.id === k.gent) };
}
function kinkOfferBlock(d) {
  if (d.mode !== 'plan') return '';
  const k = kinkOfferPlace(d.v); if (!k || k.place.id !== d.p.id) return '';
  const w = d.v.whore; const full = w.items.length >= R.reticule; const can = w.coin >= k.item.cost && !full;
  return `<div class="kinkoffer"><p><b>His <button class="x" data-x="kink">Kink</button> is sold behind ${esc(theLower(k.stall.short))}.</b> The stallholder quotes his <button class="x" data-x="tell">Tell</button>: “${esc(k.item.tell || '')}”</p>
    <div class="row"><button class="btn small primary" data-act="plan-buy" ${can ? '' : 'disabled'}>Buy · ${priceOf(k.item.cost, w.coin)}</button><button class="btn small ghost" data-act="stall-read" data-id="${k.item.id}">Read it first</button></div>
    ${can ? '' : `<span class="small need">${full ? 'Your reticule is full: leave a novelty on a bench first.' : `Need ${k.item.cost} Coin, you have ${w.coin}.`}</span>`}</div>`;
}
// The Place a gentleman hosts at tonight's Curtain (one she can enter), or null.
function hostTonight(v, gid) {
  const hosts = v.timeline.rota[0].hosts;
  const pid = Object.keys(hosts).find((p) => hosts[p] === gid);
  const P = pid && v.timeline.places.find((x) => x.id === pid);
  return P && P.open ? P : null;
}
function trayHTML(d, from) {
  const picked = ui.sel.length > 0;
  // one line under the number: the Bar (and the Itch when it moves); full pay, Best Guess and the rival wait behind "why?"
  const sub = [];
  if (d.mode === 'assign') sub.push(`Bar ${d.bar} · Delight ${d.delight}${d.tourist && !picked ? ' · can\'t fail' : ''}`);
  else sub.push(`Bar ${d.bar}`);
  if (picked && d.pv.itch > 0) sub.push(`<span class="itchd">Itch +${d.pv.itch} → ${Math.min(R.itchMax, d.v.whore.itch + d.pv.itch)}</span>`);
  else if (picked && d.pv.itchRaw > d.pv.itch && !d.pv.fizzles) sub.push('Itch shrugged off');
  const rcT = picked ? roadCost(d.v, playNoto(d, d.pv)) : null;
  // round 5 (finding 24): the cards already wear PICKED, so the tray says how many (one line, fixed height)
  const npick = picked ? `<span class="npick">${ui.sel.length} picked · </span>` : '';
  if (rcT) sub.push(`<span class="roadd">${esc(rcT.full)}</span>`);
  const extra = [];
  if (d.mode === 'plan' && d.v.whore.curtains > 0) extra.push(`<button class="chip ${d.v.whore.daily.fullPayLeft ? '' : 'bad'}" data-x="fullpay">${d.v.whore.daily.fullPayLeft ? `Full pay ${d.v.whore.daily.fullPayLeft} of ${R.curtain.fullPayPerDay} left` : 'After Hours'}</button>`);
  if (d.rival && !(d.mode === 'plan' && d.v.whore.curtains === 0)) extra.push(`<button class="chip bad" data-x="${d.rival.talent === 'upstage' ? 'upstage' : 'standin'}">${esc(C.CHARACTERS[d.rival.id].short)} here${d.rival.talent === 'upstage' ? ' · Upstage' : ''}</button>`);
  const sealBlocked = d.mode === 'plan' && !d.p.open;
  // two rows: the meter and its verdict across the top; Menu, Best Guess and the main action along the bottom, the main
  // action widest and on the thumb side. Nothing on it is a disabled grey instruction: before a card is picked the main
  // button says "Pick a card" at full contrast and points at the hand.
  const last = d.v.whore.daily.fullPayLeft === 1 ? '<small class="lastpay">last full pay today</small>' : d.v.whore.daily.fullPayLeft === 0 ? '<small class="lastpay">After Hours</small>' : '';
  const main = d.mode === 'assign'
    ? (picked ? `<button class="btn primary main" data-act="play-assign">Work ${ui.sel.length === 2 ? 'them' : 'it'}</button>` : '<button class="btn main hint" data-act="pick-hint">Pick a card</button>')
    : `<button class="btn ${picked ? 'primary' : ''} main" data-act="seal" ${sealBlocked ? 'disabled' : ''}>Seal it${last}</button>`;
  const acts = `<button class="tray-menu" data-act="menu" data-id="menu" aria-label="Menu">${ICON.menu}<span>Menu</span></button>
    <button class="btn ${picked ? '' : 'primary'} bg" data-act="${d.mode === 'assign' ? 'best-guess-a' : 'best-guess-p'}">Best Guess</button>${main}`;
  const outcome = d.mode === 'assign' && picked ? L.assignationPay(d.v, d.pv.sway, ui.sel).outcome : null;
  // round 6 (finding 25): the Kink offer lives on the page (kinkOfferBlock, right under the host), never again in the tray:
  // the tray is the one fixed bar and stays short (the research target is about 80 px of chrome)
  const kchip = '';
  return `${kchip}${meterEl({ sway: d.pv.sway, from, bar: d.bar, delight: d.mode === 'assign' ? d.delight : null, bg: !d.tourist && d.bg.cards.length ? d.bgPrev.sway : null, parts: d.pv.parts, unknown: d.pv.unknown.length > 0, tourist: d.tourist, picked, sub: npick + sub.join(' · '), extra: extra.join(''), outcome })}
  <div class="tray-acts">${acts}</div>`;
}
function dynAssign(d) {
  return [
    // the tourist's hint line keeps its place (hidden) so a pick never changes the page height
    d.tourist ? `<p class="type tip" ${ui.sel.length === 1 && d.pv.sway < d.delight ? '' : 'style="visibility:hidden" aria-hidden="true"'}>Add the other glowing card for a Delight.</p>` : '',
    d.tourist ? '' : itemsBlock(d), d.tourist ? '' : talentBlock(d.v, 'assign'), costLine(d), betBlock(d), itchWarn(d.v, d.pv),
    ui.sel.length ? shutCardHTML(roadCost(d.v, playNoto(d, d.pv))) : '',
  ].join('');
}
// A back-alley job's road cost, before she starts (finding 2): please him and Notoriety +1, and what that shuts
function alleyLine(v, g) {
  if (!g || g.freshness !== 'ripe') return '';
  const rc = roadCost(v, 1);
  return rc ? `<p class="roadd">A back-alley job: please him and it's ${esc(rc.full)}.</p>` : '';
}
// The correspondent in one line, for a first Curtain: "He likes Wit and Mask, hates Frolic. Bring the Cane."
function oneLiner(d) {
  const g = d.g; const nm = (a) => C.ARTS[a].name;
  const likes = [...g.tastes, ...(g.known.secret ? [g.secretTaste] : [])].map(nm);
  const k = itemGains(d).find((x) => x.kink);
  return `He likes ${likes.slice(0, -1).join(', ')}${likes.length > 1 ? ' and ' : ''}${likes[likes.length - 1]}, hates ${nm(g.aversion)}.${k ? ` Bring the ${k.it.name.replace(/^the /i, '')}.` : ''}`;
}
function dynPlan(d) {
  const { v, w, p } = d;
  const canGrease = p.kind !== 'posh' && w.notoriety >= R.sway.grease.at;
  const canStake = w.vice === 'gambler';
  const out = [itemsBlock(d), w.curtains === 0 ? '' : talentBlock(v, 'plan')];
  if (canStake) out.push(`<div class="row"><button class="btn small ${ui.stake ? 'primary' : ''}" data-act="stake" aria-pressed="${ui.stake}" ${w.coin >= w.gambler.stake ? '' : 'disabled'}>Gambler: stake ${w.gambler.stake} Coin</button><span class="small">Take 1st and collect ${w.gambler.payout}. Otherwise it's gone. The stakes rise with her tier.</span></div>`);
  const ob = L.placeOutlook(v, p.id);
  if (ob && ob.bribe) out.push(`<div class="row"><button class="btn small ${ui.bribe ? 'primary' : ''}" data-act="bribe" aria-pressed="${!!ui.bribe}" ${w.coin >= ob.bribe.cost ? '' : 'disabled'}>Square the Peelers · ${ob.bribe.cost} Coin</button><span class="small">Raid Night: keep the full ${ob.bribe.renown[0]} Renown for 1st, not ${ob.renown[0]}.</span></div>`);
  if (canGrease) out.push(`<div class="row"><span class="small"><button class="x" data-x="lowroad">Grease palms</button> (+1 Sway per ${w.greasePer} Coin at her tier):</span>${Array.from({ length: w.greaseMax + 1 }, (_, n) => n).map((n) => `<button class="btn small ${ui.grease === n ? 'primary' : ''}" data-act="grease" data-id="${n}">${n}</button>`).join('')}</div>`);
  // doors that will close are printed face up before you commit
  const o = L.placeOutlook(v, p.id);
  const posh = d.T.places.find((x) => x.kind === 'posh');
  // what the cards she has picked would cost (Frolic at Posh, the Gutter, a catch), else what Best Guess's would
  const rcSel = roadCost(v, playNoto(d, ui.sel.length ? d.pv : (d.bgPrev.cards ? d.bgPrev : { noto: o ? o.noto : 0 })));
  const shuts = !!((rcSel && rcSel.shuts) || (o && o.shutsPosh && posh && posh.open && !ui.sel.length));
  const scrubbed = d.T.gents.find((x) => x.freshness === 'scrubbed');
  const shutLine = shuts ? `${posh.short} stops receiving you until you Delight ${scrubbed ? scrubbed.short : 'a Scrubbed gentleman'} in an Assignation.` : '';
  const shutCard = shuts ? `<div class="shut-preview"><div class="mini">${img(posh.art, posh.name)}<span class="tag">Closes if you go</span></div><span class="small"><b>${esc(posh.short)}</b>${d.firstGutter ? ' would shut its door to you tonight.' : ` · ${esc(shutLine)}`}</span></div>` : '';
  if (d.firstGutter) out.push(`<div class="slum"><p class="small"><b>Police Gazette</b> · your first night here: Notoriety +1, Standing −1. Seal it and we'll ask once.</p>${shutCard}</div>`);
  else if (shuts) out.push(`<div class="slum">${shutCard}</div>`);
  out.push(betBlock(d), itchWarn(v, d.pv));
  return out.join('');
}
// The plan opens with tonight's host near the top (who the cards are for, and who is competing); the hand is pulled up
// only if it would otherwise sit behind the tray. On the play screens the tray is the only chrome (topClear()).
// What the top of the screen must keep clear: on the play screens the Purse rides in the tray (nothing floats at the top);
// elsewhere the corner chip's height (findings 18, 41 and 46).
function topClear() {
  if (document.body.classList.contains('play')) return 8;
  const ch = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--chip-h')) || 44;
  return ch + 16;
}
// The play screen opens on its headline (never half-hidden), then lifts the hand only as far as the host's ticks-and-crosses
// row allows: the tastes stay on screen and the hand peeks if both cannot fit (findings 18 and 49).
// the row the play screen keeps in view: the line just above his ticks-and-crosses (the "Pick up to 3" heading, or the
// Assignation's instruction), so the tastes and what to do with them stay on screen
function keepRow() { const t = $('.play-sheet .taste-row'); return (t && t.previousElementSibling) || t || $('.play-sheet .gent-head'); }
function scrollHostIntoView() {
  const head = $('.play-sheet');
  if (!head) { scrollHandIntoView(); return; }
  window.scrollTo(0, Math.max(0, head.getBoundingClientRect().top + window.scrollY - topClear()));
  scrollHandIntoView();
}
function scrollHandIntoView() {
  const hand = $('.hand.play'); const tray = $('.tray'); if (!hand) return;
  const r = hand.getBoundingClientRect(); const trayH = tray ? tray.getBoundingClientRect().height : 0;
  const room = window.innerHeight - trayH - 8;
  // round 5 (finding 13): a tip printed under the hand must clear the tray too (mobile-ux-research §7: never under it)
  const slot = $('#app .hlslot'); const sb = slot && slot.innerHTML ? slot.getBoundingClientRect().bottom : 0;
  let delta = Math.max(r.bottom, sb) - room; if (delta <= 0) return;
  const keep = keepRow();
  if (keep) delta = Math.min(delta, keep.getBoundingClientRect().top - topClear());
  if (delta > 0) window.scrollTo(0, window.scrollY + delta);
}
// the tray's height, on the column (not the body), for the headline slot's scroll margin
function setTrayH() {
  const t = ['assign', 'plan'].includes(ui.screen) ? $('.tray') : null; const col = $('#app');
  if (col) col.style.setProperty('--tray-h', `${t ? Math.round(t.getBoundingClientRect().height) : 0}px`);
}
// Patch the play layer in place (cards, decision block, tray) so the Sway meter animates and nothing re-decodes.
function patchPlay() {
  const d = playData(); if (!d) { render({ keepScroll: true }); return; }
  const hand = $('.hand.play');
  if (hand) {
    const tmp = document.createElement('div'); tmp.innerHTML = playCards(d, true);
    const fresh = [...tmp.children]; const old = [...hand.children];
    if (fresh.length !== old.length) hand.innerHTML = tmp.innerHTML;
    else old.forEach((el, i) => {
      const f = fresh[i];
      el.className = f.className; if (f.hasAttribute('aria-pressed')) el.setAttribute('aria-pressed', f.getAttribute('aria-pressed'));
      const m = el.querySelector('.marks'); const fm = f.querySelector('.marks'); if (m && fm) m.innerHTML = fm.innerHTML;
      const sc = el.querySelector('.score'); const fs = f.querySelector('.score');
      if (sc && fs) sc.replaceWith(fs); else if (fs) el.appendChild(fs); else if (sc) sc.remove();
    });
  }
  // round 6 (finding 21): the block under the hand never shrinks while she toggles cards on this screen (a shorter page at
  // its scroll limit would clamp scrollY and move the hand under her thumb); it grows when it must
  const dyn = $('.dyn');
  if (dyn) {
    const h0 = dyn.getBoundingClientRect().height; const html = d.mode === 'assign' ? dynAssign(d) : dynPlan(d);
    const keep = Math.max(h0, parseFloat(dyn.style.minHeight) || 0);
    // an emptied block would be display:none (.dyn:empty): hold its place with a hidden spacer instead
    dyn.innerHTML = html.trim() || keep === 0 ? html : '<span hidden></span>';
    dyn.style.minHeight = `${keep}px`;
  }
  const tray = $('.tray');
  const prev = ui.lastSway ?? d.pv.sway;
  if (tray) {
    const tmp = document.createElement('div'); tmp.innerHTML = trayHTML(d);
    const nm = tmp.querySelector('.meter'); const om = tray.querySelector('.meter');
    if (om && nm) {
      const of = om.querySelector('.fill'); const nf = nm.querySelector('.fill');
      of.className = nf.className; of.style.transform = `scaleX(${nf.dataset.s})`;
      om.querySelectorAll('.mark').forEach((x) => x.remove());
      nm.querySelectorAll('.mark').forEach((x) => om.querySelector('.track').appendChild(x));
      const oml = om.querySelector('.mlabs'); const nml = nm.querySelector('.mlabs'); if (oml && nml) oml.replaceWith(nml);
      om.querySelector('.line').replaceWith(nm.querySelector('.line'));
      const ol = om.querySelector('.legend'); const nl = nm.querySelector('.legend');
      if (ol) ol.remove(); if (nl) om.querySelector('.line').after(nl);
      const os = om.querySelector('.sr'); const ns = nm.querySelector('.sr'); if (os && ns) os.textContent = ns.textContent;
      const oa = tray.querySelector('.tray-acts'); const na = tmp.querySelector('.tray-acts'); if (oa && na) oa.replaceWith(na);
    } else tray.innerHTML = tmp.innerHTML;
    countUp(tray.querySelector('.num'), prev, d.pv.sway);
    const crossed = (line) => line != null && prev < line && d.pv.sway >= line && ui.sel.length;
    if (crossed(d.mode === 'assign' ? d.delight : null) || crossed(d.bar)) {
      const vd = tray.querySelector('.verdict'); if (vd) { vd.classList.remove('pop'); void vd.offsetWidth; vd.classList.add('pop'); }
      sfx('stamp');
    }
  }
  ui.lastSway = d.pv.sway;
  setTrayH();
}
const COUNT_MS = 280; // a count-up stays inside the meter fill's own transition time (CSS --t-meter)
function countUp(el, from, to) {
  if (!el) return;
  if (calm() || from === to) { el.textContent = to; return; }
  const t0 = performance.now(); const dur = COUNT_MS;
  const step = (t) => { const k = Math.min(1, (t - t0) / dur); el.textContent = Math.round(from + (to - from) * k); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

SCREENS.assign = () => {
  const d = assignData();
  if (!d) { ui.screen = 'front'; return SCREENS.front(); }
  const { v, gid, tourist, g, who } = d;
  const wv = { ...v.whore, hand: d.A.lent };
  const cards = playCards(d);
  ui.aDealt = true; ui.lastSway = d.pv.sway;
  const lines = tourist ? hintLines({ id: gid }, wv) : hintLines(g, wv);
  // his voice prints once a District day (finding 26); later meetings that day print his first Tell instead
  const said = voiceFor(gid, `assign:${v.whore.assignations}`);
  const line = said ? `“${esc(said)}”` : tourist ? esc(who.aside || '') : `<span class="small">Tell:</span> ${esc(g.tells[0])}`;
  return `  <section class="sheet play-sheet">
    <div class="row" style="justify-content:space-between"><p class="kicker">${tourist ? 'Tourist' : 'Assignation · a private job'}</p>${tourist ? '' : '<button class="btn small ghost" data-act="cancel-assign">Walk away <span class="small">(these 3 cards wait for the next gent)</span></button>'}</div>
    <h2 class="h2">${tourist ? esc(C.LINES.tourist[v.whore.timeline]) : `${esc(g.short)} is waiting`}</h2>
    <div class="gent-head">
      <button class="punter" data-act="${tourist ? 'noop' : 'open-gent'}" data-id="${gid}" aria-label="${esc(who.short)}">${photo(who.art, who.short, `<b>${esc(who.short)}</b>`, { flip: tourist ? `tourist:${gid}` : `gent:${gid}` })}</button>
      <div class="meta">
        <p class="voice">${line}</p>
        ${tourist ? `<div class="chips"><button class="chip good" data-x="tick">✓ Likes ${artLabel(who.taste)}</button><span class="chip">Can't fail with him</span></div>` : `${gentChips(g, v.whore, true)}${studyBtn(v, g)}`}
      </div>
    </div>
    ${!tourist && hostTonight(v, gid) ? `<p class="hosttag">Hosts ${esc(hostTonight(v, gid).short)} tonight: satisfy him now and you're his Regular, +1 at the Curtain.</p>` : ''}
    <p class="type instr">Tap 1 or ${R.assignMaxCards} cards, then Work them. Tap a card's ? to read its back.</p>
    ${tourist ? '' : tasteRow(g, v.whore)}
    <div class="hlslot" aria-live="polite"></div>
    <div class="hand play">${cards}</div>
    <div class="dyn">${dynAssign(d)}</div>
    <div class="hints"><span class="by">Our correspondent writes</span>${alleyLine(v, g)}${lines.map((l) => `<p>${escE(l)}${!tourist && g.known.kink && /^Kink: /.test(l) ? ` ${whereBtn(g.id)}` : ''}</p>`).join('')}</div>
    <div class="tray">${trayHTML(d)}</div>
  </section>`;
};

SCREENS.plan = () => {
  const d = planData();
  if (!d) { ui.screen = 'front'; return SCREENS.front(); }
  const { v, w, T, p, g } = d;
  const PR = p.rules;
  ui.lastSway = d.pv.sway;
  const rival = d.rival;
  const scripted = L.isScriptedCurtain(ui.S, w.timeline);
  const oc = L.placeOutlook(v, p.id);
  const applause = oc.applause;
  const shareTxt = (k) => (oc.renown[k] !== PR.renown[k] ? `<s>${PR.renown[k]}</s> ${oc.renown[k]}` : `${oc.renown[k]}`);
  const kinkItem = itemGains(d).some((x) => x.kink);
  // a Timeline's first Curtain shows the decision and nothing else: the pay chips, the rival box, the Talent and the full
  // correspondent's column wait for Curtain 2 (the front page reveals things the same way)
  const firstC = w.curtains === 0;
  const openHints = !firstC && kinkItem && !ui.taught.has('itemhint');
  if (openHints) ui.taught.add('itemhint');
  return `  <section class="sheet">
    <div class="row" style="justify-content:space-between"><button class="btn small ghost" data-act="go" data-id="front">Back</button><span class="type">Curtain <span data-cd="${w.timeline}">${cdText(w.timeline)}</span></span></div>
    <div class="place banner"><div class="pimg">${img(p.art, p.name, { eager: true })}<span class="kindtag"><button class="x" data-x="${p.kind}" style="color:inherit">${esc(KIND_ROAD[p.kind])}</button>${p.raid ? ' · Raid night' : ''}</span></div>
      <div class="pbody"><span class="h2 era-type">${esc(p.name)}</span><span class="small">${esc(p.blurb)}</span>
      ${firstC ? '' : `<span class="small"><button class="x" data-x="house">${esc(p.house.name)}</button>: ${esc(p.house.text)}</span>`}</div></div>
    ${firstC ? '' : `<div class="chips"><span class="chip solid">Bar ${PR.bar}</span><button class="chip" data-x="${oc.raid ? 'raid' : 'split'}">1st ${shareTxt(0)}${applause ? ` +${applause} Applause` : ''} Renown${PR.coin[0] ? `, ${PR.coin[0]} Coin` : ''}</button><span class="chip">2nd ${shareTxt(1)}</span><span class="chip">3rd ${shareTxt(2)}</span><button class="chip" data-x="doorgift">Door gift ${PR.doorGift} Coin</button><button class="chip ${w.daily.fullPayLeft ? '' : 'bad'}" data-x="fullpay">${esc(fullPayText(w))}</button></div>`}
    ${afterHoursBanner(v)}
    ${rival && !firstC ? `<div class="clip rivalclip"><button class="rface" data-act="profile" data-id="${rival.id}" aria-label="${esc(rival.name)}: her profile">${img(exprArt(rival.id, 'scheme'), rival.name)}</button><div><b class="h3">Rival sighted</b> ${badgeFor(rival)}<p>${esc(rival.name)} ${scripted ? 'has her eye on your Place tonight.' : 'is heading here tonight, says a little bird.'}</p>${rival.talent === 'upstage' ? '<button class="chip bad" data-x="upstage">If you finish just above her, she Upstages you: −2</button>' : ''}</div></div>` : ''}
  </section>
  <section class="sheet play-sheet">
    <p class="kicker">Tonight's host</p>
    <div class="gent-head">
      <button class="punter" data-act="open-gent" data-id="${g.id}" data-hold="gent:${g.id}">${photo(g.art, g.short, `<b>${esc(g.short)}</b>`, { flip: `gent:${g.id}` })}</button>
      <div class="meta"><p class="voice"><span class="small">Tell:</span> ${esc(g.tells[0])}</p>${gentChips(g, w, true)}${studyBtn(v, g)}</div>
    </div>
    ${kinkOfferBlock(d)}
    <div class="sec-head"><span class="h2">Pick up to ${R.maxCurtainCards} cards</span><button class="x type" data-x="tick">ticks &amp; crosses</button></div>
    ${tasteRow(g, w)}
    <div class="hlslot" aria-live="polite"></div>
    <div class="hand play">${playCards(d)}</div>
    <div class="dyn">${dynPlan(d)}</div>
    <details class="hints" ${openHints ? 'open' : ''}><summary class="by">${firstC ? `${esc(oneLiner(d))} <span class="link">more</span>` : 'Our correspondent writes'}</summary>${hintLines(g, w).map((l) => `<p>${escE(l)}${g.known.kink && /^Kink: /.test(l) ? ` ${whereBtn(g.id)}` : ''}</p>`).join('')}${L.describeMatchup(p, w).lines.map((l) => `<p class="small">${escE(l)}</p>`).join('')}</details>
    <div class="tray">${trayHTML(d)}</div>
  </section>`;
};

// ----- Curtain results -----
// Hindsight, captured at the seal from what she could see: Best Guess, and Best Guess with each novelty she carries or
// could have bought tonight. The results screen ranks those against the printed results (Upstage included).
// The casual player's view of tonight's host (finding: the baseline must not include what the thinker earned): his Secret
// Taste and Kink unknown, and his History as it stood when this whore's last Curtain fell (no Regular or Seen It from
// today's Assignations). Best Guess picks its cards on that view; they are then scored on what she knows now, minus the
// same History, so hidden facts still help the casual player by accident.
function blindView(v, hostId) {
  const h0 = (ui.hist0[v.whore.id] || {})[hostId];
  const history = { ...v.whore.history }; if (h0) history[hostId] = h0; else delete history[hostId];
  const gents = v.timeline.gents.map((g) => (g.id === hostId ? { ...g, secretTaste: null, kink: null, known: { ...g.known, secret: false, kink: false } } : g));
  return { blind: { ...v, timeline: { ...v.timeline, gents }, whore: { ...v.whore, history } }, scored: { ...v, whore: { ...v.whore, history } } };
}
function hindsightAt(v, place, plan) {
  const bg = L.bestGuess(v, place);
  const host = v.timeline.rota[0].hosts[place];
  const bv = blindView(v, host);
  const blindCards = L.bestGuess(bv.blind, place).cards;
  const blindSway = blindCards.length ? L.previewEncounter(bv.scored, { place, cards: blindCards }).sway : 0;
  const planSway = L.previewEncounter(v, { place, cards: plan.cards, item: plan.item, talent: plan.talent, grease: plan.grease }).sway;
  const alts = []; const kept = [];
  for (const it of v.whore.items.filter((x) => x.ready)) {
    const b = L.bestGuess(v, place, { item: it.id });
    if (b.sway > bg.sway) alts.push({ name: it.name, where: 'in your reticule', cost: 0, sway: b.sway });
    // a novelty she carried but left in the reticule: what Best Guess with it would have scored (her Talent kept as played)
    if (it.id !== plan.item && b.cards.length) {
      const s2 = L.previewEncounter(v, { place, cards: b.cards, item: it.id, talent: plan.talent && plan.talent.kind !== 'double-entendre' ? plan.talent : undefined, grease: plan.grease }).sway;
      if (s2 > planSway) kept.push({ name: it.name, sway: s2 });
    }
  }
  // what she could have bought tonight (round 4, finding 1): only what she could afford, never a Low Road novelty that
  // costs Notoriety while she is on the Standing road, and the host's own Kink novelty (the stall quotes his Tell) scored
  // with his Kink: Best Guess's cards plus that novelty fire it whatever the cards, so it is Best Guess + the Kink bonus.
  const g = v.timeline.gents.find((x) => x.id === host);
  const standingRoad = L.roadOf(v.whore) === 'standing'; const kindHere = C.PLACES[place].kind;
  for (const p of v.timeline.places) for (const it of p.stall) {
    if ((it.blackMarket && v.whore.notoriety < R.rummage.blackMarketAt) || v.whore.items.some((x) => x.id === it.id)) continue;
    if (it.cost > v.whore.coin) continue;
    if (standingRoad && (it.notorietyPerUse || (it.notorietyAtPosh && kindHere === 'posh'))) continue;
    const forHost = it.kind === 'kink' && (it.kinkFor || it.tellOf) === host;
    const b = L.bestGuess(v, place, { item: it.id });
    const sway = forHost && g && !g.known.kink ? bg.sway + R.sway.kink : b.sway;
    if (sway > bg.sway) alts.push({ name: it.name, where: `behind ${theLower(p.short)}, ${it.cost} Coin`, cost: it.cost, sway, kink: forHost, place: p.short });
  }
  // pure: exactly what an unstudied Best Guess plays, nothing added. Its luck is luck, not thinking.
  const pure = sameSet(plan.cards, blindCards) && !plan.item && !plan.talent && !plan.grease && !plan.stake;
  const itemName = plan.item ? (v.whore.items.find((x) => x.id === plan.item) || {}).name : null;
  return { place, bg: bg.sway, bgCards: bg.cards, blindSway, blindCards, planSway, alts, kept, pure, hasItem: !!plan.item, itemName, hasTalent: !!plan.talent, talentName: plan.talent ? C.TALENTS[plan.talent.kind].name : null, unknownKink: !!(g && !g.known.kink), unknownSecret: !!(g && !g.known.secret), host };
}
// A pure Best Guess play that did better than its own preview did so on facts she could not see: luck, not thinking.
function luckLine(bd, known, extra, gentShort) {
  if ((bd && bd.kinkHit && !known.kink) || (bd && bd.secretHit && !known.secret)) return null; // the "He loved that!" clip tells it
  return `Lady Luck chipped in${extra > 0 ? ` +${extra}` : ''}. Study him to make it a plan.`;
}
const happyClip = (t) => `<div class="clip win"><b class="h3">Happy accident</b><p>${esc(t)}</p></div>`;
// Thinking is measured in Renown against what Best Guess alone would have taken at the same table (Upstage included),
// so a lucky Best Guess is not credited and a thinking play that only changed the ranking is.
function hindsightLine(r, w) {
  const h = ui.hind && ui.hind.place === r.place ? ui.hind : null; const pay = r.pay;
  if (!h) return '';
  const fp = pay.fullPay !== false;
  const pr = r.curtain.data.places.find((x) => x.place === r.place);
  const others = pr.entries.filter((e) => e.whore !== w.id && e.sway != null);
  const wi = (sw) => L.curtainWhatIf(r.curtain.data, r.place, w.id, sw, { fullPay: fp });
  const sole = (res) => res.rank === 0 && !others.some((e) => e.sway === res.sway);
  // a counterfactual placing, in words: a shared rank is a tie, never "came 1st"
  const placed = (res) => (res.rank === null ? 'short of the Bar' : `${others.some((e) => e.sway === res.sway) ? 'tied ' : ''}${ord(res.rank)}`);
  const tied = pay.rank !== null && others.some((e) => e.rank === pay.rank);
  const blindRes = wi(h.blindSway);
  const gain = pay.renown - blindRes.renown;
  const out = [];
  const host = C.GENTS[h.host].short;
  if (h.pure) {
    const extra = (pay.sway ?? 0) - blindRes.sway;
    const luck = luckLine(pay.breakdown, { kink: !h.unknownKink, secret: !h.unknownSecret }, extra, host);
    if ((gain > 0 || extra > 0) && luck) out.push(happyClip(luck));
  } else if (gain > 0) {
    // the baseline is a player who never studied him and did no Assignation today; then what each kind of thinking added
    const studied = h.bg - h.blindSway; const extras = h.planSway - h.bg;
    const added = [h.itemName ? `your ${bare(h.itemName)}` : '', h.talentName ? `your ${h.talentName}` : ''].filter(Boolean).join(' and ') || 'your choice of cards';
    const finer = [extras > 0 ? `${added} added +${extras}` : '', studied > 0 ? `what you knew about him added +${studied}` : ''].filter(Boolean);
    const fin = finer.join('; ');
    const meRes = { rank: pay.rank, sway: pay.sway };
    // the same shape on both sides (finding 22): Sway, placing, Renown; then what made the difference, by name
    out.push(`<div class="clip win"><b class="h3">Thinking pays</b><p>You: ${pay.sway ?? 0} Sway, ${placed(meRes)}, +${pay.renown} Renown. Without your homework: ${h.blindSway} Sway${blindRes.upstaged ? ` (${blindRes.sway} after her Upstage)` : ''}, ${placed(blindRes)}, +${blindRes.renown}.${fin ? ` ${esc(fin.charAt(0).toUpperCase() + fin.slice(1))}.` : ''}</p></div>`);
  }
  // a novelty she carried and left in the reticule, when it would have paid more (even without winning outright)
  const kept = (h.kept || []).map((k) => ({ ...k, res: wi(k.sway) })).filter((k) => k.res.renown > pay.renown).sort((a, b) => b.res.renown - a.res.renown)[0];
  if (kept) out.push(`<div class="clip hind"><b class="h3">Left in the reticule</b><p>The ${esc(kept.name.replace(/^the /i, ''))} stayed in your reticule: it would have scored ${kept.sway}${kept.res.upstaged ? ` (${kept.res.sway} after her Upstage)` : ''}, ${placed(kept.res)}, +${kept.res.renown - pay.renown} Renown more.</p></div>`);
  if (pay.rank === 0 && !tied) return out.join('');
  if (kept) return out.join('');
  // After Hours pays no Renown whatever she plays: no "what would have won" (finding 1), only the homework still to do
  const gname = C.GENTS[h.host].short;
  const kink = h.unknownKink ? `${gname}'s Kink is still a secret. Study him twice, or buy the novelty his Tell points to: it's worth +${R.sway.kink}.` : '';
  const title = tied ? 'What would have won it outright' : 'What would have won';
  if (!fp) { if (kink) out.push(`<div class="clip hind"><b class="h3">Next time</b><p>${esc(kink)}</p></div>`); return out.join(''); }
  // a loss or a dead heat: what would have won it outright. His own Kink novelty first (the lesson), then the cheapest.
  const wins = h.alts.filter((a) => a.cost > 0).map((a) => ({ ...a, res: wi(a.sway) })).filter((a) => sole(a.res)).sort((a, b) => (b.kink - a.kink) || a.cost - b.cost || b.sway - a.sway);
  if (wins.length) {
    const b = wins[0];
    const how = b.kink && h.unknownKink ? `His Tell points to the ${b.name.replace(/^the /i, '')}, ${b.where}. Buy it and you crack his Kink` : `${b.name}, ${b.where}`;
    out.push(`<div class="clip hind"><b class="h3">${title}</b><p>${esc(how)}: ${b.sway} Sway${b.res.upstaged ? ` (${b.res.sway} after her Upstage, still enough)` : ''}, sole 1st, ${tied ? `+${b.res.renown - pay.renown} Renown more` : `+${b.res.renown} Renown`}.${kink && !b.kink ? ` ${esc(kink)}` : ''}</p></div>`);
    return out.join('');
  }
  let need = null;
  for (let s2 = (pay.sway || 0) + 1; s2 <= (pay.sway || 0) + 12; s2++) { if (sole(wi(s2))) { need = s2; break; } }
  if (need) out.push(`<div class="clip hind"><b class="h3">${title}</b><p>${need} Sway would have taken 1st on your own${need - (pay.sway || 0) >= 2 && others.some((e) => e.upstage) ? ' (Upstage and all)' : ''}.${kink ? ` ${esc(kink)}` : ''}</p></div>`);
  else if (kink) out.push(`<div class="clip hind"><b class="h3">${title}</b><p>${esc(kink)}</p></div>`);
  return out.join('');
}
SCREENS.results = () => {
  const r = ui.result; const v = V(); const T = v.timeline; const w = v.whore;
  const P = C.PLACES[r.place]; const PR = R.places[P.kind];
  const pr = r.curtain.data.places.find((x) => x.place === r.place);
  const pay = r.pay; const myRank = pay.rank;
  const sh = (id) => (C.CHARACTERS[id] ? C.CHARACTERS[id].short || C.CHARACTERS[id].name : id);
  // rivals react: caught out when you beat them, pleased when they beat you (painted plates only; others stay resting)
  const rivalLook = (e) => {
    const beatMe = e.rank !== null && (myRank === null || e.rank < myRank);
    const belowMe = myRank !== null && (e.rank === null || e.rank > myRank);
    return beatMe ? 'pleased' : belowMe ? 'caught' : null;
  };
  const info = (id, e) => {
    if (id === w.id) return { name: w.name, art: exprArt(w.id, pay.rank === 0 ? PLEASED_LOOK[w.id] : pay.rank === null ? CAUGHT_LOOK[w.id] : null), me: true };
    const rv = T.rivals.find((x) => x.id === id) || { name: C.CHARACTERS[id].name, art: C.CHARACTERS[id].art };
    const look = e ? rivalLook(e) : null;
    return { ...rv, art: look ? exprArt(id, look) : rv.art };
  };
  const maxSway = Math.max(...pr.entries.map((e) => (e.whore === w.id ? pay.sway : e.sway) || 0), PR.bar, 1);
  const applause = P.house.applause != null ? P.house.applause : PR.applause;
  const raid = r.curtain.data.raid === r.place;
  // the printed share of an EMPTY placing (nobody took it); taken placings use what the engine actually paid (e.renown)
  const share = (rank) => { if (rank === null || rank > 2) return 0; let n = PR.renown[rank]; if (raid && P.kind === 'gutter') n = Math.floor(n / R.raidRenownDivisor); return n + (rank === 0 && pr.entries.length >= 2 ? applause : 0); };
  const paid = (e) => (e.whore === w.id ? pay.renown : e.renown != null ? e.renown : share(e.rank));
  const me = C.CHARACTERS[w.id].short;
  const atRank = (k) => pr.entries.filter((e) => e.rank === k);
  const tiedWith = pay.rank !== null ? atRank(pay.rank).filter((e) => e.whore !== w.id) : [];
  const tied = tiedWith.length > 0;
  const head = tied ? `Dead heat at ${theLower(P.short)}!` : pay.rank === 0 ? `${me} takes ${theLower(P.short)}!` : pay.rank !== null ? `${me} places ${ord(pay.rank)}` : `${me} falls short`;
  const winner = pr.entries.find((e) => e.rank === 0);
  // the payout's own reaction line (the engine rotates it per gentleman with the Assignation lines, so the front page never
  // repeats the line her Assignation with him just printed; round 4, finding 29)
  r.glee ||= pay.reaction || `${C.GENTS[pr.host].short} is over the moon.`;
  const glee = r.glee;
  // the reward image: her winning plate (money in hand) for an outright 1st; pleased for a share; caught for a door gift
  const heroLook = pay.rank === 0 && !tied ? WON_LOOK : pay.rank !== null ? PLEASED_LOOK[w.id] : CAUGHT_LOOK[w.id];
  const heroAlt = pay.rank === 0 && !tied ? `${w.name}, holding up her winnings` : w.name;
  // dead heat, worded from the payout: the tied whores split the pots they occupy
  const pots = tied ? [...Array(tiedWith.length + 1).keys()].map((i) => pay.rank + i).filter((k) => k < 3).map(ord) : [];
  const each = tied ? Math.max(pay.renown, ...tiedWith.map((e) => e.renown || 0)) : 0;
  const potWords = pots.length > 1 ? `${pots.slice(0, -1).join(', ')} and ${pots[pots.length - 1]}` : pots[0];
  // a Kink gag tells tonight's joke on its own: no second reaction line under it (round 5, finding 17)
  const gagFired = (r.evs || []).some((e) => e.type === 'gag' && (e.whores || [])[0] === w.id && e.data && e.data.gag);
  const sub = tied ? `You and ${tiedWith.map((e) => info(e.whore).name).join(' and ')} share the ${potWords} ${pots.length > 1 ? 'pots' : 'pot'}: +${each} Renown each. One more point of Sway would have paid more.`
    : pay.rank === 0 ? (gagFired ? '' : glee) : winner ? `${info(winner.whore).name} charmed ${C.GENTS[pr.host].short}. ${pay.rank !== null ? 'A share all the same.' : 'Door gift and a Brave Face.'}` : 'No one reached the Bar. The house keeps the pot.';
  const upstager = pr.entries.find((e) => e.upstage);
  const entries = pr.entries.map((e) => {
    const isMe = e.whore === w.id; const who = info(e.whore, e);
    const sway = isMe ? pay.sway : e.sway;
    const renown = paid(e);
    const ups = isMe ? pay.upstaged : e.upstaged;
    const by = isMe && pay.upstagedBy && pay.upstagedBy.length ? pay.upstagedBy.map((id) => info(id).name).join(' & ') : (upstager ? info(upstager.whore).name : '');
    return `<div class="entry ${isMe ? 'me' : ''} ${e.rank === null ? 'short' : ''}"><div class="face">${img(who.art, who.name)}</div>
      <div class="who"><b>${esc(who.name)}${isMe ? ' (you)' : ''}</b><span>${isMe ? '' : badgeFor(who)}</span><span class="bar"><i data-s="${sway != null ? (Math.min(1, sway / maxSway)).toFixed(3) : 0}"></i></span>
      <span class="small">${sway != null ? `${sway} Sway` : 'short of the Bar'}${e.rank !== null && e.rank < 3 ? ` · +${renown} Renown${isMe && !pay.fullPay ? ' (After Hours)' : ''}` : ' · door gift'}</span>
      ${ups ? `<button class="ustamp" data-x="upstage">Upstaged${by ? ` by ${esc(by)}` : ''}: −${ups}</button>` : ''}</div>
      <span class="rk">${e.rank !== null ? `${atRank(e.rank).length > 1 ? '=' : ''}${ord(e.rank)}` : '—'}</span></div>`;
  }).join('');
  // how she did it: your sum, next to what anyone can see of the winner's
  const bd = pay.breakdown || { cards: [], parts: [] };
  const secretN = bd.cards.filter((c) => (c.ticks || []).includes('secret')).length * R.card.secret;
  const cardsTotal = bd.cards.reduce((t, c) => t + c.score, 0) - secretN;
  const mine = [`cards ${cardsTotal}`, ...(secretN ? [`Secret Taste +${secretN}`] : []), ...bd.parts.map((p) => `${PART_LABEL[p.key] || p.key} ${p.n > 0 ? '+' : ''}${p.n}`), ...(pay.upstaged ? [`Upstaged −${pay.upstaged}`] : [])];
  let theirs = '';
  if (winner && winner.whore !== w.id) {
    const wc = C.CHARACTERS[winner.whore]; const bits = [];
    if (C.GENTS[pr.host].fancy === wc.type) bits.push('Fancy +2');
    if (winner.upstage && pay.upstaged) bits.push(`her Upstage cost you ${pay.upstaged}`);
    theirs = `<p><b>${esc(info(winner.whore).name)}: ${winner.sway}</b>${bits.length ? ` · ${bits.join(' · ')}` : ''} · the rest is her cards and her Regulars.</p>`;
  }
  const how = `<div class="clip how"><b class="h3">How she did it</b><p><b>You: ${pay.sway ?? 0}</b> = ${mine.map(esc).join(' · ')}</p>${theirs}</div>`;
  // the split, drawn from what each whore was actually paid: a tie shows each whore's share and how many took it
  const splitCols = [0, 1, 2].map((k) => {
    const who = atRank(k);
    if (!who.length) return { k, n: share(k), label: `${share(k)}`, who };
    const per = Math.max(...who.map(paid));
    const app = k === 0 && pr.entries.length >= 2 && per > 0 ? Math.ceil(applause / who.length) : 0;
    const label = who.length > 1 ? `${app && per > app ? `${per - app}+${app}` : per} each ×${who.length}` : `${per}`;
    return { k, n: per, label, who };
  });
  const maxShare = Math.max(...splitCols.map((x) => x.n), 1);
  const split = splitCols.map((x) => `<div class="${x.who.some((e) => e.whore === w.id) ? 'me' : ''}"><b>${x.label}</b><i style="height:${Math.round((x.n / maxShare) * 70) + 6}px"></i>${ord(x.k)}<br>${x.who.length ? esc(x.who.map((e) => sh(e.whore)).join(' & ')) : (splitCols.slice(0, x.k).some((c) => c.who.length > 1 && c.k + c.who.length > x.k) ? 'the tie took it' : 'house')}</div>`).join('')
    + `<div><b>${PR.doorGift}</b><i style="height:8px;background:var(--paper2)"></i>Coin<br>everyone</div>`;
  const elsewhere = r.curtain.data.places.filter((x) => x.place !== r.place && x.entries.length).map((x) => {
    const win = x.entries.find((e) => e.rank === 0);
    return `<p class="small" style="margin:0"><b>${esc(C.PLACES[x.place].short)}</b> (${esc(C.GENTS[x.host].short)}): ${win ? `${esc(sh(win.whore))} took it with ${win.sway}` : 'no one reached the Bar'}. ${x.entries.length === 1 ? 'A quiet night: 1 in the room.' : `${x.entries.length} turned up.`}</p>`;
  }).join('') || '<p class="small">The other rooms stood empty. The bar staff played cards.</p>';
  const won = pay.rank === 0 && !tied;
  // the punchline (a Kink win's postcard) goes straight under the stamp; the rest of the edition follows
  const clips = [...r.clips];
  const gi = clips.findIndex((c) => c.startsWith('<div class="postcard'));
  const gag = gi >= 0 ? clips.splice(gi, 1)[0] : '';
  // a hidden bonus that fired is news about tonight, not the back pages: it sits under the headline with the gag
  const surprise = clips.filter((c) => c.startsWith('<div class="clip win surprise')).join('');
  for (let i = clips.length - 1; i >= 0; i--) if (clips[i].startsWith('<div class="clip win surprise')) clips.splice(i, 1);
  return `  <section class="sheet spinpaper extra ${won ? 'won' : ''}">
    ${gazette(v, 'Special edition')}
    <div class="hero ${won ? 'won' : ''} ${won ? digsCls(w) : ''}">${img(exprArt(w.id, heroLook), heroAlt, { eager: true, pos: '50% 30%' })}${won ? digsBadge(w) : ''}<span class="stamp big pop ${won ? 'good' : ''}">${pay.rank !== null ? `${tied ? 'Tied ' : ''}${ord(pay.rank)}` : 'Door gift'}</span></div>
    ${won && digsTop(w) ? `<p class="wincap small center">${esc(w.name)} and her winnings. The ${esc(digsTop(w).rung.prop)} is paid for.</p>` : ''}
    <h1 class="h1">${esc(head)}</h1>
    ${gag}
    ${sub ? `<p class="deck">${esc(sub)}</p>` : ''}
    ${surprise}
    <div class="payline"><span>+${pay.renown}<small><button class="x" data-x="renown">Renown</button>${pay.applause && pay.fullPay ? ` (incl. +${pay.applause} <button class="x" data-x="split">Applause</button>)` : ''}</small></span><span>${pay.coin >= 0 ? '+' : ''}${pay.coin}<small><button class="x" data-x="coin">Coin</button></small></span>${pay.fullPay ? '' : '<span><small>After hours: no Renown</small></span>'}</div>
  </section>
  <section class="sheet">
    <div class="sec-head"><span class="h2">The clash at ${esc(P.short)}</span><span class="type">Bar ${PR.bar}${raid ? ' · raided' : ''}</span></div>
    ${hindsightLine(r, w)}
    <div class="clash">${entries}</div>
    ${r.splitTip ? `<div class="clip"><b class="h3">Not winner-takes-all</b><p>1st takes the lion's share and the Applause; 2nd and 3rd still eat; everyone gets a door gift. <button class="x" data-x="split">How it works</button></p></div>` : ''}
    <details class="sums"><summary class="by">Show the sums</summary>
      ${how}
      <div class="sec-head"><span class="h2">The split</span><button class="x type" data-x="split">not winner-takes-all</button></div>
      <div class="split">${split}</div>
    </details>
  </section>
  <section class="sheet">
    ${afterHoursBanner(v)}
    <div class="sec-head"><span class="h2">Also in this edition</span></div>
    <div class="clip-list">${clips.join('') || '<p class="small">Nothing else fit to print.</p>'}</div>
    <div class="sec-head"><span class="h2">Elsewhere tonight</span></div>
    ${elsewhere}
  </section>
  <div class="cta-dock"><button class="btn primary block" data-act="after-results">${r.evs.some((e) => e.type === 'promoted' && (e.whores || [])[0] === w.id) ? `${esc(sh(w.id))}'s been promoted` : r.unlock ? 'Open your telegram' : 'Back to the front page'}</button></div>`;
};

// ----- Timelines board -----
// Progress to the next tier, in Whorescore terms (the headline board moves when a whore climbs).
function tierProgress(x) {
  const next = x.tier === 'common' ? 'rare' : x.tier === 'rare' ? 'epic' : null;
  if (!next) return '';
  return `${C.CHARACTERS[x.id].short}: ${x.renown}/${R.tiers[next]} Renown to ${C.TIER_NAMES[next].replace(' Whore', '')} → Whorescore ${R.whorescore[x.tier]} → ${R.whorescore[next]}`;
}
const realNews = (hs) => hs.filter((h) => h.type !== 'nothing' && h.type !== 'rota-fancy').length;
SCREENS.timelines = () => {
  const v = V(); const acct = acctView();
  const ws = L.whorescore(ui.S, ME);
  const best = ws.perWhore.length ? ws.perWhore[0].best : 'common';
  const rows = TLS.map((tl) => {
    const TL = C.TIMELINES[tl];
    const mw = acct.whores.find((x) => x.timeline === tl);
    if (mw) {
      const here = mw.id === ui.active;
      const seen = acct.seen[tl] || 0;
      const news = here ? 0 : realNews(L.awayDigest(ui.S, mw.id, seen).headlines);
      const last = curtainIn(tl) <= 1 && lastCallUrgent();
      return `<button class="tl ${tl}" data-act="switch" data-id="${mw.id}">
        ${eraMini(tl, mw.art, mw.name)}
        <div class="tbody"><span class="tname">${esc(TL.name)}</span>${here ? '<span class="here">You are here</span>' : ''}${last ? '<span class="lastcall">Last call!</span>' : ''}<span class="tsub"><b>${esc(mw.name)}</b> · ${esc(mw.title)} (${esc(C.TIER_NAMES[mw.tier])})</span>
          <span class="tnums"><span><b>${mw.renown}</b> Renown</span><span><b>${mw.coin}</b> Coin</span></span>
          <span class="tsub">Curtain <span class="count" data-cd="${tl}">${cdText(tl)}</span> · ${mw.fullPayLeft ? `full pay ${mw.fullPayLeft} of ${R.curtain.fullPayPerDay} left` : 'After Hours today'}</span>
          ${tierProgress(mw) ? `<span class="tsub prog">${esc(tierProgress(mw))}</span>` : ''}
          ${here ? '' : `<span class="cta">${news ? `Switch in · ${plural(news, 'headline')} waiting` : 'Switch in'}</span>`}</div>
        </button>`;
    }
    const inv = acct.canOpen.find((c) => C.CHARACTERS[c].timeline === tl);
    if (inv) {
      const ch = C.CHARACTERS[inv];
      return `<button class="tl ${tl} invite" data-act="open-tl" data-id="${inv}">
        ${eraMini(tl, ch.art, ch.name)}
        <div class="tbody"><span class="tname">${esc(TL.name)}</span><span class="tsub">${esc(TL.telegram)}</span>
          <span class="tsub"><b>${esc(ch.name)}</b>, ${esc(ch.epithet)} · ${esc(ch.temperament)}</span><span class="cta">Open with ${esc(ch.short || ch.name)}</span></div></button>`;
    }
    return `<div class="tl ${tl} locked">${eraMini(tl, C.CHARACTERS[TL.starter].art, TL.name)}<div class="tbody"><span class="tname">${esc(TL.name)}</span>
      <span class="tsub">${acct.slots < 2 ? 'Locked. Finish one Curtain and one Assignation to get a telegram.' : `Locked. Reach Rare (${R.tiers.rare} Renown) with any whore to open a third Timeline.`}</span></div></div>`;
  }).join('');
  const tiers = ['common', 'rare', 'epic', 'legendary', 'mythic'];
  const progs = acct.whores.map(tierProgress).filter(Boolean);
  return `  <section class="sheet">
    <p class="kicker">The wire · your whores across the ages</p>
    <h1 class="h1">Timelines</h1>
    <p class="deck">${ui.taught.has('tl') || ui.guided ? 'Three eras, a clock each.' : 'One whore per Timeline. While one waits for her Curtain, play another.'} <button class="x" data-x="timeline">How it works</button></p>
    <div class="hlslot" aria-live="polite"></div>
    <div class="tl-list">${rows}</div>
  </section>
  <section class="sheet score-plate">
    <p class="kicker">Your <button class="x" data-x="whorescore">Whorescore</button></p>
    <div class="num">${ws.total}</div>
    <p class="small">${ws.past} banked from past seasons + ${ws.season} this season (your best three whores count in full).</p>
    ${progs.length ? `<p class="small prog">${progs.map(esc).join('<br>')}</p>` : ''}
    <div class="ladder">${tiers.map((t) => `<div class="${t === best ? 'on' : ''}"><b>${R.whorescore[t]}</b>${esc(C.TIER_NAMES[t].replace(' Whore', ''))}</div>`).join('')}</div>
    <p class="small">Depth beats breadth: one Epic (${R.whorescore.epic}) outscores three Rares (${R.whorescore.rare * 3}).</p>
    <div class="row" style="width:100%"><button class="btn grow" data-act="go" data-id="players">The Players board</button>${ui.steps.has('players') ? '<button class="btn primary grow" data-act="end">How am I doing?</button>' : ''}</div>
  </section>`;
};

// ----- Players / leaderboards -----
// Richest counts Coin earned this season; beside it, what is still in the purse (the account's live whores)
// the road boards rank one whore (round 5, finding 5): say which, and what she still has in her purse
function coinOnHand(row) {
  const ids = (ui.S.accounts[row.account] || { whores: [] }).whores.map((id) => ui.S.whores[id]).filter(Boolean);
  const best = ids.sort((a, b) => b.coinEarned - a.coinEarned)[0];
  return best ? `<br>${esc((C.CHARACTERS[best.id] && C.CHARACTERS[best.id].short) || best.name)}: ${best.coin} on hand` : '';
}
const BOARDS = [['whorescore', 'Whorescore', 'pts'], ['richest', 'Richest', 'Coin'], ['notorious', 'Most Notorious', 'peak'], ['respectable', 'Most Respectable', 'peak']];
SCREENS.players = () => {
  const v = V(); const lb = L.leaderboards(ui.S);
  const [key, label, unit] = BOARDS.find((b) => b[0] === ui.tab);
  const rows = lb[key].map((r) => `<button class="prow ${r.account === ME ? 'me' : ''}" data-act="profile-acct" data-id="${r.account}">
    <span class="rk">${r.rank}</span>
    <span><span class="nm">${esc(r.account === ME ? `${r.name} (you)` : r.name)} ${r.kind === 'standin' ? '<span class="badge-stand">Stand-in</span>' : ''}</span>
      <span class="wchips">${r.whores.map((w) => `<span class="wchip">${img(w.art, w.name)}<span><span class="tlb ${w.timeline}">${esc(w.timelineName)}</span> ${esc(w.name)}<br>${esc(w.title)}</span></span>`).join('')}</span></span>
    <span class="val">${r.value}<br><span class="small">${unit}${key === 'richest' ? coinOnHand(r) : ''}</span></span></button>`).join('');
  const autos = lb.automatons.map((a) => `<button class="prow" data-act="profile-acct" data-id="${a.account}"><span class="rk">${ICON.key}</span>
    <span><span class="nm">${esc(a.name)} <span class="badge-auto">${ICON.key} Automaton</span></span><span class="wchips">${a.whores.map((w) => `<span class="wchip">${img(w.art, w.name)}<span><span class="tlb ${w.timeline}">${esc(C.TIMELINES[w.timeline].short)}</span> ${esc(w.title)}<br>${w.renown} Renown</span></span>`).join('')}</span></span><span class="val small">not ranked</span></button>`).join('');
  return `  <section class="sheet">
    <p class="kicker">Who's who</p>
    <h1 class="h1">Players</h1>
    <p class="deck">${ui.taught.has('players') || ui.guided ? 'Whorescore, and a board for each paper.' : 'Four ways to be famous.'} <button class="x" data-x="boards">Which board is which?</button></p>
    <div class="hlslot" aria-live="polite"></div>
    <div class="tabs" role="tablist">${BOARDS.map(([k, l]) => `<button role="tab" aria-selected="${k === ui.tab}" data-act="tab" data-id="${k}">${esc(l)}</button>`).join('')}</div>
    <div class="board">${rows}</div>
  </section>
  ${streetSection()}
  <section class="sheet">
    <div class="sec-head"><span class="h2">House Automatons</span><button class="x type" data-x="automaton">never ranked</button></div>
    <div class="board">${autos}</div>
  </section>`;
};
// From the street: real players, from the server (net.js), beside the boards this device keeps. A row is not a button
// (there is no file to open on a real player), every value is escaped, and a failed fetch is one line here, nothing more.
const STREET_TOP = 10; // the rest wait behind a button, so the Automatons are not pushed off a phone
function agoText(t) {
  const h = Math.floor(Math.max(0, Date.now() - t) / 3600000);
  return h < 1 ? 'this hour' : h < 24 ? `${h}h ago` : h < 48 ? 'yesterday' : `${Math.floor(h / 24)} days ago`;
}
function streetRow(r, me) {
  return `<div class="prow street ${me ? 'me' : ''}"><span class="rk">${r.rank}</span>
    <span><span class="nm">${esc(me ? `${r.name} (you)` : r.name)}</span>
      <span class="small">${esc(r.title)}${r.tier ? `, ${esc(C.TIER_NAMES[r.tier])}` : ''}${r.road ? ` · ${esc(ROAD_NAME[r.road].replace(/^the /, 'The '))}` : ''}</span>
      <span class="small">${r.timelines.map((tl) => `<span class="tlb ${tl}">${esc(C.TIMELINES[tl].short)}</span>`).join(' ')}${r.lastActive != null ? ` Last played ${esc(agoText(r.lastActive))}` : ''}</span></span>
    <span class="val">${r.whorescore}<br><span class="small">pts</span></span></div>`;
}
function streetSection() {
  const b = net.street(); const mine = String(acctName() || '').toLowerCase();
  const rows = b.rows || []; const meAt = mine ? rows.findIndex((r) => r.name.toLowerCase() === mine) : -1;
  const shown = ui.streetAll ? rows : rows.slice(0, STREET_TOP);
  let body;
  if (!b.rows) body = `<p class="small">${b.err === 'busy' ? 'The newsboy\'s out of breath. Try again in a minute.' : b.err ? 'The player list didn\'t turn up. Try again in a bit.' : 'The newsboy\'s running over with the list...'}</p>`;
  else if (!rows.length) body = '<p class="small">No one\'s posted a game here yet.</p>';
  else {
    body = `<div class="board">${shown.map((r, i) => streetRow(r, i === meAt)).join('')}${meAt >= shown.length ? streetRow(rows[meAt], true) : ''}</div>
    ${rows.length > shown.length ? `<button class="btn small" data-act="street-all">All ${rows.length} from the street</button>` : ''}`;
  }
  const join = acctName() ? '' : '<div class="row"><span class="small grow">Keep your game anywhere and your stage name goes up here.</span><button class="btn small" data-act="acct">Put my name up</button></div>';
  return `<section class="sheet street-sheet">
    <div class="sec-head"><span class="h2">From the street</span><span class="type">real players</span></div>
    <p class="small">Real players, ranked by Whorescore, each shown by their best whore.</p>
    ${body}${join}
  </section>`;
}
function streetFetch() {
  const p = net.fetchStreet();
  if (p) p.then(() => { if (ui.screen === 'players') render({ keepScroll: true }); });
}

SCREENS.end = () => {
  const v = V(); const ws = L.whorescore(ui.S, ME); const acct = acctView();
  const t = ui.think.renown;
  const thinkLine = t > 0 ? `Thinking earned you +${t} Renown over Best Guess.` : t < 0 ? `Best Guess would have earned ${-t} more Renown. Study first, then bet.` : 'You matched Best Guess. Study a gentleman twice and bring his novelty to beat it.';
  const progs = acct.whores.map(tierProgress).filter(Boolean);
  return `  <section class="sheet spinpaper endcard">
    <p class="kicker">Your scores</p>
    <h1 class="h1">${ransom('SO FAR, SO SCANDALOUS')}</h1>
    <p class="deck">${esc(END_LINE[ui.firstTl || v.whore.timeline])}</p>
    <div class="clip win"><b class="h3">The thinking column</b><p>${esc(thinkLine)}</p></div>
    <p class="small">${acct.whores.map((w) => `${esc(w.name)}, ${esc(w.title)}, ${w.renown} Renown`).join(' · ')} · Whorescore ${ws.total}</p>
    ${progs.length ? `<p class="small prog">${progs.map(esc).join('<br>')}</p>` : ''}
    ${rungTeaser(v, true)}
    <button class="btn primary block" data-act="go" data-id="front">Keep playing</button>
    <button class="btn ghost block" data-act="restart">Start a new scandal</button>
    <span class="stamp">Scandal</span>
  </section>`;
};

// ---------------------------------------------------------------------------
// Render and chrome
// ---------------------------------------------------------------------------
const IN_GAME = ['front', 'assign', 'plan', 'results', 'timelines', 'players', 'end'];
const PLAY = ['assign', 'plan']; // the play tray carries its own Menu button
function render(opts = {}) {
  const app = $('#app');
  // round 5 (finding 23): at a large text size the play screens reflow (CSS body.bigtext)
  document.body.classList.toggle('bigtext', parseFloat(getComputedStyle(document.documentElement).fontSize) > 20);
  const y = window.scrollY; const a = opts.keepScroll ? anchorOf() : null;
  app.innerHTML = SCREENS[ui.screen]();
  renderChrome();
  if (opts.keepScroll) { window.scrollTo(0, y); restoreAnchor(a, y); } else if (!opts.noScroll) { window.scrollTo(0, 0); if (pinY !== null) pinY = 0; } // a new page under a pop-up starts at its top
  if (ui.screen === 'overview') armBack();
  setTrayH(); notePaint(!!opts.keepScroll);
  if (ui.screen === 'results') requestAnimationFrame(() => setTimeout(() => document.querySelectorAll('.entry .bar i').forEach((i) => { i.style.transform = `scaleX(${i.dataset.s})`; }), calm() ? 0 : 500));
  if (ui.screen === 'overview') { const tr = $('#ovtrack'); if (tr) tr.scrollLeft = ui.ovPage * tr.clientWidth; requestAnimationFrame(ovFades); }
  hlReflow();
}
// Your own whores whose Curtain is due (the clock waits for them)
const lastCallTls = () => (ui.S && ui.active ? acctView().whores.filter((x) => !sealedW(x.id)).map((x) => x.timeline).filter((tl) => curtainIn(tl) <= 1) : []);
// The chrome is two corner pieces. Top right, the Purse: her face, Coin and the Curtain clock, always on screen in the
// game (tap: her stats). Bottom right, in thumb reach, the Menu button (tap: Contents), with a red dot when something
// needs her. On the play screens the tray carries the Menu button instead, and the results page has its own button.
let topEl = null; let footEl = null; let purseKey = '';
function renderChrome() {
  if (!topEl) { topEl = document.createElement('div'); topEl.className = 'chrome-top'; document.body.appendChild(topEl); }
  if (!footEl) { footEl = document.createElement('div'); footEl.className = 'chrome-foot'; document.body.appendChild(footEl); }
  const show = !!(IN_GAME.includes(ui.screen) && ui.active && ui.S);
  const cls = document.body.classList;
  cls.toggle('in-game', show); cls.toggle('play', PLAY.includes(ui.screen)); cls.toggle('ov-mode', ui.screen === 'overview');
  document.body.dataset.screen = ui.screen; // the tablet and desktop layouts (scandal.css, the wide-screen block) key on it
  topEl.hidden = !show || PLAY.includes(ui.screen); footEl.hidden = !show || PLAY.includes(ui.screen) || ui.screen === 'results';
  if (!show) { purseKey = ''; return; }
  const v0 = V(); const w = v0.whore; thingsSeed(v0);
  const alarm = lastCallTls().some((tl) => tl !== tlOf(ui.active));
  const dot = alarm || acctView().canOpen.length > 0 || ui.news.size > 0;
  const urgent = curtainIn(w.timeline) <= 1 && lastCallUrgent();
  // the Purse is only rebuilt when what it shows changes (the clock ticks in place through updateCountdowns)
  const nr = nextRung(w);
  const key = [w.id, w.coin, w.itch, urgent, w.renown].join('|');
  if (key !== purseKey) {
    purseKey = key;
    const head = `${w.name}: ${w.coin} Coin, ${w.renown}${nr ? ` of ${nr.at}` : ''} Renown`;
    topEl.innerHTML = `<button class="purse ${urgent ? 'alarm' : ''}" data-act="menu" data-id="stats" data-head="${esc(head)}" aria-label="${esc(head)}, Curtain ${esc(cdText(w.timeline).replace(/!$/, ''))}. Open her stats">
      <span class="pface ${digsCls(w)}">${img(w.art, '', { eager: true })}${itchDots(w)}</span>
      <span class="pcoin">${ICON.coin}<b data-coin>${w.coin}</b></span>
      <span class="pren" title="Renown to ${nr ? esc(nr.name) : 'the seats'}"><b>${w.renown}${nr ? `<small>/${nr.at}</small>` : ''}</b>${nr ? `<i style="--p:${nr.pct}%"></i>` : ''}</span>
      <span class="pclock">${ICON.clock}<b data-cd="${w.timeline}" data-short="1">${cdShort(w.timeline)}</b></span></button>`;
    if (ui.lastCoin != null && ui.lastCoin !== w.coin && ui.lastCoinWho === w.id) {
      countUp(topEl.querySelector('[data-coin]'), ui.lastCoin, w.coin);
      if (!calm()) topEl.querySelector('.purse').classList.add('bump');
    }
    ui.lastCoin = w.coin; ui.lastCoinWho = w.id;
  }
  // the bottom-right corner piece: Things (from her first Curtain here, with a gold count of what is new) beside Menu
  const nNew = thingsOpen(w) ? thingsCount(v0) : 0;
  footEl.innerHTML = `${thingsOpen(w) ? `<button class="menu-btn things-btn" data-act="things" data-id="auto" aria-label="Her things${nNew ? `, ${nNew} new` : ''}">${ICON.things}<span>Things</span>${nNew ? `<i class="nbadge" aria-hidden="true">${nNew}</i>` : ''}</button>` : ''}<button class="menu-btn ${dot ? 'dot' : ''} ${alarm ? 'alarm' : ''}" data-act="menu" data-id="menu" aria-label="Menu${alarm ? ', last call in another Timeline' : dot ? ', news waiting' : ''}">${ICON.menu}<span>Menu</span></button>`;
}
// the corner Purse folds to a coin-only pill while she scrolls down the page, and opens again when she scrolls up
let lastScrollY = 0;
window.addEventListener('scroll', () => {
  if (pinY !== null) return; // pinned under a pop-up: not a scroll of hers
  const y = window.scrollY; const t = topEl;
  if (t && !t.hidden) { if (y > 80 && y > lastScrollY + 4) t.classList.add('mini'); else if (y < lastScrollY - 4 || y < 40) t.classList.remove('mini'); }
  const n = $('#app .note.docked');
  if (n) {
    const end = y + window.innerHeight >= document.documentElement.scrollHeight - 24;
    if (y > lastScrollY + 4 && y > 40 && !end) n.classList.add('tab'); else if (y < lastScrollY - 4 || end || y < 40) n.classList.remove('tab');
  }
  lastScrollY = y;
}, { passive: true });
// The clock ticks every second but the words move at most once a minute: write only what changed, so neither the page
// nor a screen reader sees per-second churn.
const setText = (el, t) => { if (el.textContent !== t) el.textContent = t; };
function updateCountdowns() {
  if (!ui.S) return;
  // the Purse's spoken label follows the clock (finding 54); its head (name, Coin, Renown) is set when the Purse is drawn
  const pb = $('.chrome-top .purse');
  if (pb && ui.active) {
    const a = `${pb.dataset.head}, Curtain ${cdText(tlOf(ui.active)).replace(/!$/, '')}. Open her stats`;
    if (pb.getAttribute('aria-label') !== a) pb.setAttribute('aria-label', a);
  }
  document.querySelectorAll('[data-cd]').forEach((el) => setText(el, el.dataset.short ? cdShort(el.dataset.cd) : cdText(el.dataset.cd)));
  document.querySelectorAll('[data-seal]').forEach((el) => setText(el, sealText(el.dataset.seal)));
}
// "Waiting on 2 more": who still has to seal for her next Curtain, and when it falls, in the same word as the chip and the
// Curtain line (cdText). Nothing once her plan is no longer sealed (the Curtain has fallen, or she unsealed).
function sealText(wid) {
  if (!sealedW(wid)) return '';
  const v = V(wid); const sg = v.timeline.sealing; if (!sg) return '';
  const when = cdText(v.timeline.id);
  if (sg.sealed >= sg.total) return `Everyone has sealed. The Curtain falls ${when}.`;
  return `Waiting on ${sg.total - sg.sealed} more. The Curtain falls ${when}.`;
}
// Era display fonts load only when an era is worn (the base request carries Anton, Newsreader and Special Elite).
const ERA_FONTS = { victorian: 'IM+Fell+English+SC', wildwest: 'Rye', vegas: 'Bungee&family=Monoton' };
const fontsLoaded = new Set();
function loadEraFont(tl) {
  if (!ERA_FONTS[tl] || fontsLoaded.has(tl)) return;
  fontsLoaded.add(tl);
  const l = document.createElement('link'); l.rel = 'stylesheet';
  l.href = `https://fonts.googleapis.com/css2?family=${ERA_FONTS[tl]}&display=swap`;
  document.head.appendChild(l);
}
// Fetch an era's skin textures before its wash plays, so the new skin never arrives untextured.
// The era's display font is requested here too, so the gazette and Place names never reflow just after the wash.
const PRELOAD_MS = 700; // the most an era change waits for its textures on a slow connection
function preloadSkin(tl) {
  loadEraFont(tl);
  return Promise.all(['skin-bg', 'skin-card', 'skin-frame'].map((k) => new Promise((res) => {
    const im = new Image(); im.onload = res; im.onerror = res; im.src = `${ART_BASE}${tl}/${k}.webp`;
    setTimeout(res, PRELOAD_MS);
  })));
}
function setEra(tl, wash = true) {
  const root = document.documentElement;
  loadEraFont(tl);
  if (root.dataset.era === tl) return;
  root.dataset.era = tl;
  if (wash && !calm()) {
    const w = document.createElement('div'); w.className = 'wash'; document.body.appendChild(w);
    w.addEventListener('animationend', () => w.remove(), { once: true });
    setTimeout(() => w.remove(), 2000); // belt and braces if the animation never runs
  }
  sfx('era', tl);
}
const docEra = () => document.documentElement.dataset.era;
// BRIEF2 5d: leaving the Assignation screen by any road walks away from the job, as its Walk away button does (the 3 lent
// cards wait for the next gentleman), so "Take him on" never vanishes behind a job left open
function leaveAssign() { if (ui.S && ui.active && ui.screen === 'assign' && V().whore.assignation) act(L.cancelAssignation, ui.active); }
function go(screen, opts) {
  if (screen !== 'assign') leaveAssign();
  if (screen === 'front') { ui.secShown.forEach((k) => ui.secSeen.add(k)); ui.secShown = new Set(); ui.secOpen = new Set(); stampEdition(); }
  ui.screen = screen;
  if (screen !== 'plan' && screen !== 'assign') resetPicks();
  render(opts);
  if (screen === 'front') onFront();
  if (screen === 'players') { streetFetch(); ui.steps.add('players'); teach('players', 'Four ways to be famous', 'Whorescore ranks everyone; the side boards crown the richest, the most notorious and the most respectable: each paper has its own board.', 'boards'); }
  if (screen === 'timelines') { TLS.forEach(loadEraFont); teach('tl', 'One whore per Timeline', 'Each era runs its own Curtain clock. While one waits, play another.', 'timeline'); }
}
function resetPicks() { ui.trayKink = null; ui.sel = []; ui.item = null; ui.talentOn = false; ui.deArt = null; ui.stake = false; ui.bribe = false; ui.grease = 0; ui.slumOk = false; ui.shortOk = false; ui.aDealt = false; ui.why = false; ui.lastSway = null; ui.bgPicked = false; }
function onFront() {
  teach('front', 'Your front page', 'The yellow note says what\'s next: tap it. Coin and the clock sit top right; the Menu has the rest.', 'purse', 'Hot off the press');
  if (ui.active && curtainIn(tlOf(ui.active)) <= 1) teach('lastcall', 'Last call', fresh('lastcall', LAST_CALL), 'lastcall');
  if (ui.active && thingsOpen(V().whore)) teach('things', 'Her things', 'Her cards, her novelties and her album, and what her Coin has bought, all in one place. The Things button sits by Menu.', null, 'New in this edition', { act: 'things', id: 'auto', label: 'Have a look', cls: 'primary' });
}

// ---------------------------------------------------------------------------
// Modals: inspect (flip), EXCLUSIVE, digest, telegram, profiles, offers
// ---------------------------------------------------------------------------
// One dialog at a time. While it is open the page behind is inert (no tabbing into it); focus goes to its first control
// on open only (never on a re-render after Study or a tab switch) and returns to whatever opened it on close.
let modalTrigger = null;
// The opener is kept by element and by address (its data-act/-id/-x/-hold/-flip and its place among its twins): the page
// behind and the corner chrome re-render while a pop-up is open, and focus then returns to the new copy of it.
function openerOf(el) {
  const sel = ['act', 'id', 'x', 'hold', 'flip'].filter((k) => el.dataset && el.dataset[k] !== undefined).map((k) => `[data-${k}="${CSS.escape(el.dataset[k])}"]`).join('');
  return { el, sel, i: sel ? [...document.querySelectorAll(sel)].indexOf(el) : -1 };
}
function openerNow(o) {
  if (document.body.contains(o.el)) return o.el;
  return o.sel ? document.querySelectorAll(o.sel)[o.i] || document.querySelector(o.sel) : null;
}
function syncInert() {
  const on = !!ui.modal;
  document.body.classList.toggle('modal-open', on); // the docked note hides behind an open pop-up (finding 17)
  ['#app', '.chrome-top', '.chrome-foot', '.hl-wrap'].forEach((s) => { const el = $(s); if (el) el.inert = on; });
  syncPin();
}
// While a pop-up (or the falling curtain) is up, the page under it never moves: not by drag, wheel, keys or rubber-band.
// iOS Safari scrolls the page through any fixed layer that is not itself scrolling, so the body is pinned in place
// (position: fixed, minus its scroll) and put back at the same pixel when the last one goes. Its own state, not ui.modal:
// a pop-up that replaces another (an EXCLUSIVE, a see-also, onClose) never unpins in between.
let pinY = null;
function syncPin() {
  const on = !!ui.modal || !!$('#layer > .curtain');
  if (on === (pinY !== null)) return;
  const root = document.documentElement;
  if (on) {
    pinY = window.scrollY;
    root.classList.toggle('pin-bar', window.innerWidth > root.clientWidth); // a desktop scrollbar keeps its room: nothing shifts
    root.classList.add('pinned'); document.body.style.top = `${-pinY}px`;
    return;
  }
  const y = pinY; pinY = null;
  root.classList.remove('pinned', 'pin-bar'); document.body.style.top = '';
  window.scrollTo(0, y);
}
function openModal(type, data, extra) {
  if (!ui.modal) { ui.overlays++; modalTrigger = document.activeElement && document.activeElement !== document.body ? openerOf(document.activeElement) : null; }
  ui.modal = { type, data, flipped: false, fresh: true, bornAt: performance.now(), ...extra }; // extra: state the first render needs (the hub's fromHub)
  renderModal(); syncInert();
  hlReflow();
}
function closeModal() {
  if (!ui.modal) return;
  const m = ui.modal; ui.modal = null; ui.overlays = Math.max(0, ui.overlays - 1);
  const el = $('#modal'); if (el) el.remove();
  // the account sheet put away (Not now, the scrim, a drag): what was typed in its forms, a password too, leaves memory
  if (m.type === 'acct') { ui.authMode = undefined; ui.authDraft = blankDrafts(); }
  if (m.onClose) m.onClose();
  syncInert();
  if (ui.screen === 'front' && !ui.modal) rerenderBehind();
  if (!ui.modal && modalTrigger) { const t = openerNow(modalTrigger); if (t) t.focus({ preventScroll: true }); modalTrigger = null; }
  hlReflow();
}
function modalShell(inner, mid = true) {
  let el = $('#modal');
  if (!el) { el = document.createElement('div'); el.id = 'modal'; $('#layer').appendChild(el); armDrag(el); }
  // .mslot: headlines print here, above the card, while a pop-up is open. The dialog role sits on the panel itself (not
  // the click-to-close scrim) and is named by its first heading.
  el.innerHTML = `<div class="scrim ${mid ? 'mid' : ''}" data-act="close-modal"><div class="mslot"></div>${inner}</div>`;
  const panel = el.querySelector('.scrim > :not(.mslot)');
  if (panel) {
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
    const h = panel.querySelector('h1, h2, h3, .h1, .h2, .tt');
    if (h) { h.id ||= 'dlg-h'; panel.setAttribute('aria-labelledby', h.id); } else panel.setAttribute('aria-label', 'Details');
    // every bottom sheet wears the grab handle that says it drags down (the drag itself: "Putting a pop-up down")
    if (panel.classList.contains('sheet-up') && !panel.querySelector('.grab')) panel.insertAdjacentHTML('afterbegin', '<span class="grab" aria-hidden="true"></span>');
  }
  if (ui.modal && ui.modal.fresh) {
    ui.modal.fresh = false;
    const f = el.querySelector('[data-autofocus]') || el.querySelector('.modal-actions button, .sheet-up button, button, a');
    if (f) f.focus({ preventScroll: true });
  }
  if (hlCur && !hlBlocked()) paintHl();
}
// A flippable card: a real Flip button on the card (the faces are not one giant button), and the hidden face is inert.
function flipShell(front, back, actions, o = {}) {
  const m = ui.modal;
  // round 4 (finding 45): a Back button first, at the foot, in thumb reach; the card face itself flips
  const backBtn = o.noBack ? '' : '<button class="btn mback" data-act="close-modal" aria-label="Close">‹ Back</button>';
  return `<div class="modal-card"><div class="flip ${m.flipped ? 'flipped' : ''}" data-act="flip">
      <div class="faces"><div class="face front inspect"${m.flipped ? ' inert' : ''}>${front}<p class="flip-hint">Tap the card to flip it</p></div><div class="face back inspect"${m.flipped ? '' : ' inert'}>${back}<p class="flip-hint">Tap to flip back</p></div></div>
      <button class="flipbtn" data-act="flip" aria-pressed="${m.flipped}">${m.flipped ? 'Front' : 'Flip it'}</button></div>
    ${o.slot ? '<div class="cslot" aria-live="polite"></div>' : ''}
    <div class="modal-actions ${backBtn ? 'has-back' : ''}">${backBtn}${actions}</div></div>`;
}
function renderModal() {
  const m = ui.modal; if (!m) return;
  const R2 = MODALS[m.type];
  if (R2) R2(m);
}
const MODALS = {};
// EXCLUSIVE: the one-tap explainer. Level 1 is the headline and two sentences; level 2 is the see-also chips, each of which
// replaces this EXCLUSIVE (never stacks a third level). Closing returns to whatever was open underneath.
MODALS.excl = (m) => {
  const [head, body, also] = glossOf(m.data) || ['Explainer', 'No entry for that yet.', []];
  const more = (also || []).filter((k) => GLOSS[k]);
  modalShell(`<div class="sheet-up excl"><span class="grab" aria-hidden="true"></span><span class="excl-banner">Explainer</span><h2 class="h2">${esc(head)}</h2><p class="excl-body">${linkTerms(body, m.data)}</p>
    ${more.length ? `<div class="also"><span class="kicker">See also</span><span class="chips">${more.map((k) => `<button class="chip ${ui.seenX.has(k) ? 'read' : ''}" data-x="${k}">${esc(termOf(k))}</button>`).join('')}</span></div>` : ''}
    <button class="btn block" data-act="close-modal" data-autofocus>Got it</button></div>`, false);
};
// The Menu: one bottom sheet, two tabs. Contents = where to go and how to learn; Her stats = the Purse opened up.
MODALS.menu = (m) => {
  const tab = m.data === 'stats' ? 'stats' : 'menu';
  const v = V(); const w = v.whore; const acct = acctView();
  const alarm = lastCallTls().some((tl) => tl !== tlOf(ui.active));
  const tlDot = alarm || acct.canOpen.length > 0 || ui.news.size > 0;
  const read = [...ui.seenX].filter((k) => GLOSS[k]).length;
  const a = net.account(); const who = a.name || a.hint;
  const cur = (s) => (ui.screen === s || (s === 'front' && ['front', 'assign', 'plan', 'results'].includes(ui.screen)) ? ' aria-current="page"' : '');
  const contents = `<div class="navtiles">
      <button class="navtile" data-act="go" data-id="front"${cur('front')}>${ICON.paper}<b>Front page</b><span>${esc(v.timeline.short)} tonight</span></button>
      <button class="navtile ${tlDot ? 'dot' : ''} ${alarm ? 'alarm' : ''}" data-act="go" data-id="timelines"${cur('timelines')}>${ICON.clock}<b>Timelines</b><span>${alarm ? 'Last call elsewhere!' : acct.canOpen.length ? 'A telegram waits' : `${acct.whores.length} of ${R.unlock.cap}`}</span></button>
      <button class="navtile" data-act="go" data-id="players"${cur('players')}>${ICON.crown}<b>Players</b><span>The boards</span></button>
    </div>
    <div class="menulist">
      <button class="mrow" data-act="things" data-id="auto">${ICON.things}<span><b>Her things</b><span>${thingsRowText(v)}</span></span></button>
      <button class="mrow" data-act="codex">${ICON.book}<span><b>The Small Print, A to Z</b><span>Every term, explained. ${read} read so far.</span></span></button>
      <button class="mrow" data-act="tips">${ICON.paper}<span><b>How to play</b><span>The five-page guide again${ui.tips.length ? `, and ${plural(ui.tips.length, 'tip')} so far` : ''}.</span></span></button>
      <button class="mrow toggle" data-act="guided" aria-pressed="${ui.guided}"><span class="sw" aria-hidden="true"></span><span><b>Show me the ropes</b><span>${ui.guided ? 'On: a tip at each first step.' : 'Off: tips wait in How to play.'}</span></span></button>
      <button class="mrow" data-act="whatsthis">${ICON.eye}<span><b>What can I tap?</b><span>Outlines everything on this page that explains itself.</span></span></button>
      <button class="mrow toggle" data-act="mute" aria-pressed="${!ui.muted}"><span class="sw" aria-hidden="true"></span><span><b>Sound</b><span>${ui.muted ? 'Off' : 'On'}</span></span></button>
      <button class="mrow" data-act="acct">${ICON.key}<span><b>${who ? 'Your account' : 'Keep your game anywhere'}</b><span>${a.name ? `Logged in as ${esc(a.name)}.` : who ? `${esc(who)}: the server isn't answering.` : 'A password, and any device can pick up this game.'}</span></span></button>
      <button class="mrow" data-act="letters">${ICON.letter}<span><b>Letters to the Editor</b><span>A bug, an idea, or one to five stars.</span></span></button>
      <button class="mrow quiet" data-act="restart"><span><b>Start a new scandal</b><span>${a.name ? 'Wipes this game here; the copy on our server goes at the new game\'s first save.' : 'Wipes the game kept on this device and starts again from the title page.'}</span></span></button>
    </div>`;
  const stat = (x, label, val) => `<button class="mstat" data-x="${x}"><b>${val}</b><span>${label}</span></button>`;
  const statGo = (tab, label, val) => `<button class="mstat" data-act="things" data-id="${tab}"><b>${val}</b><span>${label}</span></button>`;
  const al = albumOf(w);
  const stats = `<div class="me-head"><div class="${digsCls(w)}" style="position:relative">${eraMini(w.timeline, w.art, w.name)}${digsBadge(w)}</div><div>
      <b class="h3">${esc(w.name)}</b>
      <span class="small"><button class="x" data-x="eratitle">${esc(w.title)}</button>${w.milestone && w.milestone.title ? `, ${esc(w.milestone.title)}` : ''} · <button class="x" data-x="tiers">${esc(C.TIER_NAMES[w.tier])}</button></span>
      <span class="small">${esc(v.timeline.name)} · Curtain <span data-cd="${w.timeline}">${esc(cdText(w.timeline))}</span></span>
      <button class="btn small" data-act="profile-me">Her file</button></div></div>
    <div class="mstats">${stat('renown', 'Renown', w.renown)}${stat('coin', 'Coin', w.coin)}${stat('gossip', 'Gossip', w.gossip)}${stat('itch', `Itch of ${R.itchMax}`, `<span class="dots3">${Array.from({ length: R.itchMax }, (_, i) => `<i class="${i < w.itch ? 'on' : ''}"></i>`).join('')}</span>`)}${stat('study', 'Free Studies', w.daily.freeStudiesLeft)}${stat('fullpay', 'Full-pay Curtains', w.daily.fullPayLeft)}${statGo('album', 'In the album', `${al.have}/${al.total}`)}${w.greaseMax ? stat('lowroad', 'Bribes up to', `+${w.greaseMax}`) : ''}</div>
    ${roadRail(v, true)}
    ${ladderRow(v)}
    ${rungTeaser(v, true)}
    <p class="small"><button class="x" data-x="whorescore">Whorescore</button>: <b>${L.whorescore(ui.S, ME).total}</b> across all your whores.</p>`;
  modalShell(`<div class="sheet-up menu-sheet"><div class="sheet-top"><span class="grab" aria-hidden="true"></span><div class="menu-head"><h2 class="h2" id="menu-h">${tab === 'stats' ? esc(C.CHARACTERS[w.id].short) : 'The menu'}</h2><button class="close" data-act="close-modal" aria-label="Close the menu">&times;</button></div>
    <div class="tabs two" role="tablist"><button role="tab" id="tab-menu" aria-controls="menu-panel" aria-selected="${tab === 'menu'}" data-act="menu-tab" data-id="menu">Contents</button><button role="tab" id="tab-stats" aria-controls="menu-panel" aria-selected="${tab === 'stats'}" data-act="menu-tab" data-id="stats">Her stats</button></div></div>
    <div id="menu-panel" role="tabpanel" aria-labelledby="tab-${tab}">${tab === 'stats' ? stats : contents}</div></div>`, false);
};
// ---------------------------------------------------------------------------
// Her things (the hub). One sheet for everything she owns, in four tabs: Cards (her deck, and the curses she has caught: a
// curse is a card), Novelties (the reticule, and where to find more), Album (postcards, stories, gifts, the framed pages) and
// Status (what her Coin buys to show off: the Ladder). Nothing here is new data: getView already carries deck, drawCount, discardCount, items, collectibles and digs.
// A tile opens the pop-up it always opened (card, novelty, curse, postcard); closing it brings her back to the same tab.
// The tabs and the panel are repainted in place (no sheet re-entry on every tap), and the sheet keeps one height.
// ---------------------------------------------------------------------------
const HUB_TABS = [['cards', 'Cards'], ['novelties', 'Novelties'], ['album', 'Album'], ['status', 'Status']];
const HUB = {};
// the Things button joins the Menu when the back doors do (her first Curtain here); the Menu's own row is the way in before
const thingsOpen = (w) => w.curtains > 0;
// "a, b and c"
const andList = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
// the way to the back doors from the sheet: tonight's fresh stall when a look there would bring its fresh stock, else the doors
const doorsId = (T) => (T.freshFor ? `door:${T.freshFor}` : 'doors');
// her deck as card rows (cardEl and the card pop-up both read them): one row per card, how many copies, how many in hand now
function deckRows(v) {
  const w = v.whore; const tl = w.timeline; const n = {}; const hand = {};
  w.deck.forEach((id) => { n[id] = (n[id] || 0) + 1; });
  w.hand.forEach((c) => { hand[c.id] = (hand[c.id] || 0) + 1; });
  const rows = Object.keys(n).map((id) => {
    const A = C.AFFLICTIONS[id]; const c = C.CARDS[id];
    return A ? { id, name: A.name, affliction: true, arts: [], allure: 0, pocket: 0, text: A.symptomText, flavour: A.flavour, art: A.art, copies: n[id], inHand: hand[id] || 0 }
      : { id, name: c.name, affliction: false, arts: c.arts, allure: c.allure, pocket: c.pocket, text: c.text, flavour: L.cardFlavour(id, tl, 0), position: !!c.position, art: (c.artByTimeline && c.artByTimeline[tl]) || c.art || null, copies: n[id], inHand: hand[id] || 0 };
  });
  rows.sort((a, b) => (a.affliction - b.affliction) || (b.allure - a.allure) || a.name.localeCompare(b.name));
  return rows.map((r, idx) => ({ ...r, idx }));
}
// cards that spring a Kink she has already learned (the view masks every other one): card id -> [{ who, withArt }]
function kinkCards(v) {
  const out = {};
  v.timeline.gents.forEach((g) => {
    if (g.known.kink && g.kink && g.kink.trigger && g.kink.trigger.cards) g.kink.trigger.cards.forEach((c) => { (out[c] ||= []).push({ who: g.short, withArt: g.kink.trigger.withArt || null }); });
  });
  return out;
}
// Who in her Timeline goes for a card, on its back when it is opened from her deck (BRIEF2 item 7, nav.md's "who likes it"):
// the Tastes and Aversions printed on every gentleman, a Secret Taste only once she has learned it (the view masks it until
// then; his Kink card has its own line, kinkCards). A gentleman who likes one of its Arts and can't abide another loses more
// than he gains (an Aversion costs more than a Taste adds), so he is listed as the one who can't abide it.
function likedBy(c, v) {
  if (c.affliction || !c.arts.length) return '';
  const gs = v.timeline.gents; const on = (a) => !!a && c.arts.includes(a);
  const hates = gs.filter((g) => on(g.aversion));
  const likes = gs.filter((g) => !hates.includes(g) && g.tastes.some(on));
  const secretly = gs.filter((g) => !hates.includes(g) && !likes.includes(g) && on(g.secretTaste));
  const parts = [likes.length ? `Liked by ${andList(likes.map((g) => g.short))}.` : secretly.length ? '' : `No gentleman in ${v.timeline.short} is known to like it.`,
    secretly.length ? `${andList(secretly.map((g) => g.short))} ${secretly.length > 1 ? 'like' : 'likes'} it secretly.` : '',
    hates.length ? `${andList(hates.map((g) => g.short))} can't abide it.` : ''].filter(Boolean);
  return `<p class="small likes">${esc(parts.join(' '))}</p>`;
}
// the keepsakes of her Timeline, in the album's order. A slot she has not filled carries no name of its own: a story's title
// would give away a Kink, so nothing but its kind is ever printed for one she has not earned (see hubSlot).
function albumSlots(w) {
  const tl = w.timeline; const have = new Set(w.collectibles);
  const pc = C.POSTCARDS[tl].map((p) => ({ id: p.id, kind: 'postcard', name: p.name, art: p.art, caption: p.caption }));
  const st = Object.values(C.GAGS).filter((g) => g.timeline === tl).map((g) => ({ id: g.id, kind: 'story', name: g.name, art: g.art, see: g.see, punch: g.punchline }));
  const gf = Object.keys(HOOK_TL).filter((k) => HOOK_TL[k] === tl).map((k) => ({ id: k, kind: 'gift', name: C.COLLECTIBLES[k].name, caption: C.COLLECTIBLES[k].caption }));
  const fr = [['front-page', `Notoriety ${R.frontPageAt}`], ['society-pages', `Standing ${R.highRoad.societyPagesAt}`]].map(([k, at]) => ({ id: k, kind: 'framed', name: C.COLLECTIBLES[k].name, caption: C.COLLECTIBLES[k].caption, at }));
  return [...pc, ...st, ...gf, ...fr].map((s) => ({ ...s, have: have.has(s.id) }));
}
// the counts under the tab names
function hubCounts(v) {
  const w = v.whore; const al = albumOf(w); const road = L.roadOf(w); const lad = C.DIGS[w.timeline][road];
  return { cards: String(w.deck.length), novelties: `${w.items.length}/${R.reticule}`, album: `${al.have}/${al.total}`, status: `${(w.digs || {})[road] || 0}/${lad.length}` };
}
// What is new: every thing she owns has a stable id; the ones not yet in her "seen" set wear a NEW tag and light a dot on the
// Things button and on their tab. A whore's set is seeded with all she owns the first time the page is drawn for her (renderChrome
// calls thingsSeed: that is the moment she is hired or opened, so her starter deck is not news and whatever she earns after it is,
// whether or not she ever opened a menu), and a tab marks its things seen when it is shown. The set is saved with the game.
function thingIds(v) {
  const w = v.whore; const d = w.digs || {};
  return {
    cards: [...new Set(w.deck)].map((id) => `c:${id}`),
    novelties: [...new Set(w.items.map((it) => it.id))].map((id) => `n:${id}`),
    album: w.collectibles.map((id) => `a:${id}`),
    status: ['standing', 'notoriety'].flatMap((r) => Array.from({ length: d[r] || 0 }, (_, i) => `r:${r}${i}`)),
  };
}
function thingsSeed(v) { const wid = v.whore.id; if (!ui.things[wid]) ui.things[wid] = new Set(Object.values(thingIds(v)).flat()); }
function thingsNew(v) {
  thingsSeed(v); const ids = thingIds(v); const seen = ui.things[v.whore.id];
  return Object.fromEntries(Object.entries(ids).map(([k, a]) => [k, a.filter((x) => !seen.has(x))]));
}
const thingsCount = (v) => Object.values(thingsNew(v)).reduce((n, a) => n + a.length, 0);
function thingsSee(v, tab) { thingsNew(v); const s = ui.things[v.whore.id]; const before = s.size; thingIds(v)[tab].forEach((x) => s.add(x)); if (s.size !== before) saveSoon(); }
const hubFlag = (m, id) => (m.fresh0 && m.fresh0.has(id) ? '<span class="flagtag">New</span>' : '');

// The curses she has caught, as rows. A curse is a card: it is in her deck and is drawn into her hand. The Cards tab and the front
// page (one row per curse, between the gentlemen and the hand) share these rows, so the two screens say the same thing.
const curseRows = (v, m) => v.whore.afflictions.map((a) => `<button class="curserow" data-act="open-affl" data-id="${a.id}">${m ? hubFlag(m, `c:${a.id}`) : ''}${img(a.art, a.name)}<span><b>${esc(a.name)}${a.copies > 1 ? ` ×${a.copies}` : ''}</b><span class="small">${esc(C.AFFLICTIONS[a.id].symptomText)}</span></span><span class="small cure">Cure · ${a.cure.cost} Coin</span></button>`).join('');

// ----- Cards: how to get better ones first, then the whole deck, one tile per card -----
HUB.cards = (v, m) => {
  const w = v.whore; const T = v.timeline; const rows = deckRows(v); const kink = kinkCards(v);
  const tile = (r) => cardEl(r, { act: 'inspect-card', src: 'deck', count: r.copies, flag: m.fresh0 && m.fresh0.has(`c:${r.id}`) ? 'New' : '',
    marks: [...(r.inHand ? [{ t: r.inHand > 1 ? `${r.inHand} in hand` : 'In hand', cls: 'inhand' }] : []), ...(kink[r.id] ? [{ t: 'Kink card', cls: 'kink' }] : [])] });
  const deck = rows.filter((r) => !r.affliction); const curses = w.afflictions.length;
  // the answer to "how do I get better cards" is the first thing under the pile counts, above every tile. A market that is not in
  // the paper yet says when it opens, and "Peek" opens it early (the page's own "N more things unlock" peek)
  const f = marketFacts(T.id); const sells = `${f.count} new cards in this Timeline, ${f.price} each`; const open = sectionOpen('market');
  const tip = `<button class="door tip" data-act="show-where" data-id="market"><span><b>Better cards: the market</b><br><span class="small">${open ? `${sells}. Pick the Arts your gentlemen like (the ✓ on their cards). A card you buy joins your hand after the next shuffle.` : `Opens ${unlockWhen('market')}. ${sells}.`}</span></span><span class="small">${open ? 'Go there ›' : 'Peek ›'}</span></button>`;
  return `<p class="piles"><b>${plural(w.deck.length, 'card')}</b><span>${w.hand.length} in hand</span><span>${w.drawCount} to draw</span><span>${w.discardCount} used</span><button class="x" data-x="deck">How the deck shuffles</button></p>
    ${tip}
    <div class="hand">${deck.map(tile).join('')}</div>
    ${curses ? `<div class="hubhead"><span class="h3">Curses</span><button class="x type" data-x="affliction">what's this?</button></div>
    <div class="curses">${curseRows(v, m)}</div>` : ''}`;
};

// ----- Novelties: the reticule's three slots, then where the stalls are (on a first evening too: she can see what is sold and peek) -----
HUB.novelties = (v, m) => {
  const w = v.whore; const T = v.timeline; const open = sectionOpen('doors'); const tries = w.daily.freshRummagesLeft;
  // an empty slot is a way to the stalls; with no fresh try left a look cannot turn a novelty up, so it says so
  const slot = (i) => (w.items[i] ? itemTile(w.items[i], { flag: m.fresh0 && m.fresh0.has(`n:${w.items[i].id}`), kink: true })
    : open && !tries ? '<div class="item empty"><span class="plus" aria-hidden="true">+</span><b>Empty</b><span class="small">Back at dawn</span></div>'
      : `<button class="item empty" data-act="show-where" data-id="${doorsId(T)}"><span class="plus" aria-hidden="true">+</span><b>Empty</b><span class="small">Find one</span></button>`);
  const offer = w.offer ? `<button class="item on" data-act="open-offer" data-hold="offer:0">${img(w.offer.item.art, w.offer.item.name)}<b>${esc(w.offer.item.name)}</b><span class="small">On offer · ${w.offer.price} Coin</span></button>` : '';
  const odds = (p) => {
    const el = p.stall.filter((x) => !x.blackMarket || w.notoriety >= R.rummage.blackMarketAt);
    return el.length === 1 ? `Tonight: ${theLower(shortItem(el[0].name))}, a sure find` : `Tonight: ${el.map((x) => theLower(shortItem(x.name))).join(' or ')}, 1 in ${el.length}`;
  };
  const doors = T.places.map((p) => `<button class="door" data-act="show-where" data-id="door:${p.id}"><span><b>Behind ${esc(p.short)}</b><br><span class="small">${p.stall.length ? esc(stallWords(p.stall, w)) : 'Odds and ends'}</span>${p.id === T.freshFor ? `<br><span class="small">${esc(odds(p))}</span>` : ''}</span><span class="go">${p.id === T.freshFor ? '<span class="fresh">Fresh stock</span>' : ''}<span class="small">${open ? 'Go there' : 'Peek'} ›</span></span></button>`).join('');
  const when = open ? (tries ? `${tries} fresh ${tries === 1 ? 'try' : 'tries'} today` : 'No fresh tries left today') : `Opens ${unlockWhen('doors')}`;
  return `<p class="small hubnote">Props for her act. She can carry ${R.reticule}. <button class="x" data-x="novelty">What are novelties?</button></p>
    <div class="reticule">${offer}${Array.from({ length: R.reticule }, (_, i) => slot(i)).join('')}</div>
    <div class="hubhead"><span class="h3">Where to find more</span><span class="small">${when}</span></div>
    ${open ? specialBlock(v) : ''}<div class="doors">${doors}</div>`;
};

// ----- Album: postcards, stories, gifts, framed pages. A slot she has not filled never names itself. -----
function hubSlot(s, m) {
  if (s.have) {
    const flag = hubFlag(m, `a:${s.id}`);
    if (s.art) return `<button class="aslot have" data-act="album-open" data-id="${s.id}">${flag}${img(s.art, s.name)}<b>${esc(s.name)}</b></button>`;
    return `<button class="aslot have plaque" data-act="album-open" data-id="${s.id}">${flag}<b>${esc(s.name)}</b><span class="small">${s.kind === 'framed' ? 'Framed' : 'A gift'}</span></button>`;
  }
  const L0 = { postcard: ['Postcard', 'Behind the back doors'], story: ['A story', 'Behind a curtain'], gift: ['A gift', "A gentleman's favour"], framed: [s.name, s.at] }[s.kind];
  return `<div class="aslot locked" role="group" aria-label="${esc(`${L0[0]}, not found yet. ${L0[1]}`)}"><span class="no" aria-hidden="true">?</span><b>${esc(L0[0])}</b><span class="small">${esc(L0[1])}</span></div>`;
}
HUB.album = (v, m) => {
  const w = v.whore; const slots = albumSlots(w); const al = albumOf(w);
  const group = (kind, title) => {
    const g = slots.filter((s) => s.kind === kind); if (!g.length) return '';
    return `<div class="hubhead"><span class="h3">${title}</span><span class="small">${g.filter((s) => s.have).length} of ${g.length}</span></div><div class="album">${g.map((s) => hubSlot(s, m)).join('')}</div>`;
  };
  const missingPc = al.postcards < al.postcardTotal; const open = sectionOpen('doors');
  const hint = !al.have ? `An empty album. Postcards turn up behind the back doors${open ? '.' : `, which open ${unlockWhen('doors')}.`}` : missingPc ? 'Saucy postcards turn up behind the back doors.' : al.have < al.total ? "The rest are behind a Kink win, or a gentleman's favour." : 'Every page filled.';
  const go = missingPc && open ? `<button class="btn block" data-act="show-where" data-id="${doorsId(v.timeline)}">Try the back doors</button>` : '';
  const teach = !al.have; // an empty album teaches first; a growing one says what is left at the foot
  return `<p class="small hubnote">${al.have} of ${al.total} keepsakes. <button class="x" data-x="album">What goes in the album?</button></p>
    ${teach ? `<p class="small hubnote"><b>${esc(hint)}</b></p>${go}` : ''}
    ${group('postcard', 'Postcards')}${group('story', 'Stories')}${group('gift', 'Gifts')}${group('framed', 'Framed')}
    ${teach ? '' : `<p class="small">${esc(hint)}</p>${go}`}`;
};
// the pop-up for a keepsake she owns: the found-postcard page again, or the story's picture, set-up and punchline
function albumDetail(s) {
  const done = '<button class="btn primary block" data-act="close-modal" data-autofocus>Back to the album</button>';
  if (s.kind === 'postcard') return `<p class="kicker">Postcard</p><div class="postcard">${img(s.art, s.name)}<p><b>${esc(s.name)}.</b> ${esc(s.caption)}</p></div>${done}`;
  if (s.kind === 'story') return `<p class="kicker">Behind the curtain</p><div class="postcard">${img(s.art, `${s.name}: ${s.see}`)}${s.see ? `<p class="pc-cap">${esc(s.see)}</p>` : ''}<b class="h3 pc-title">${esc(s.name)}</b><p><i>${esc(s.punch)}</i></p></div>${done}`;
  return `<p class="kicker">${s.kind === 'framed' ? 'Framed' : 'A gift'}</p><div class="clip win"><b class="h3">${esc(s.name)}</b><p>${esc(s.caption)}</p></div>${done}`;
}

// ----- Status: the Ladder (gown, carriage, villa; hired guns, a limousine, her name in neon), moved here from Her stats -----
HUB.status = (v) => {
  const w = v.whore; const top = digsTop(w);
  return `<div class="me-head"><div class="${digsCls(w)}" style="position:relative">${eraMini(w.timeline, w.art, w.name)}${digsBadge(w)}</div><div>
    <b class="h3">${esc(w.name)}</b><span class="small">${top ? esc(top.rung.line) : 'Nothing yet. Her Coin buys a better address.'}</span></div></div>
    ${digsBlock(v)}`;
};
// Her stats keeps one line for it
function ladderRow(v) {
  const w = v.whore; const road = L.roadOf(w); const lad = C.DIGS[w.timeline][road]; const have = (w.digs || {})[road] || 0; const nx = w.digsNext;
  return `<button class="mrow" data-act="things" data-id="status">${ICON.crown}<span><b>Up in the world</b><span>${have} of ${lad.length} on ${road === 'standing' ? 'the Society Pages' : 'the Police Gazette'}.${nx ? ` Next: ${esc(bare(nx.rung.name))}, ${nx.rung.cost} Coin.` : ' All hers.'}</span></span></button>`;
}

// her Coin, kept in view in the sheet's head: a Morning Special and a rung of the Ladder are bought in here
const hubCoin = (v) => `<span class="hubcoin" id="hub-coin" role="status" aria-label="${v.whore.coin} Coin">${ICON.coin}<b>${v.whore.coin}</b></span>`;
// the Menu's row for it, and the same count the Things button wears
function thingsRowText(v) { const w = v.whore; const al = albumOf(w); const n = thingsCount(v); return `${plural(w.deck.length, 'card')} · ${w.items.length}/${R.reticule} novelties · ${al.have}/${al.total} in the album${n ? ` · ${n} new` : ''}`; }

// ----- the sheet -----
function hubTabs(v, m, tab) {
  const fresh = thingsNew(v); const counts = hubCounts(v);
  return HUB_TABS.map(([k, l]) => `<button role="tab" class="hubtab" id="htab-${k}" aria-controls="hub-panel" aria-selected="${k === tab}" tabindex="${k === tab ? 0 : -1}" data-act="things" data-id="${k}"${k === tab && m.fresh ? ' data-autofocus' : ''}><span>${l}</span><small>${counts[k]}</small>${k !== tab && fresh[k].length ? '<i class="ndot" aria-hidden="true"></i><span class="sr">, new</span>' : ''}</button>`).join('');
}
let hubKeep = null; // set by hubOpen: the reopened sheet keeps its NEW tags and does not slide in again
MODALS.things = (m) => {
  const v = V(); const tab = HUB_TABS.some(([k]) => k === m.data) ? m.data : 'cards'; m.data = tab; ui.hubTab = tab;
  const keep = hubKeep; hubKeep = null;
  if (!m.fresh0) m.fresh0 = keep ? keep.fresh0 : new Set(Object.values(thingsNew(v)).flat()); // what was new when the sheet opened: it keeps its NEW tags until the sheet closes
  modalShell(`<div class="sheet-up hub-sheet${keep ? ' still' : ''}"><div class="sheet-top"><span class="grab" aria-hidden="true"></span><div class="menu-head"><h2 class="h2" id="hub-h">Her things</h2><span class="hubright">${hubCoin(v)}<button class="close" data-act="close-modal" aria-label="Close her things">&times;</button></span></div>
    <div class="tabs four hubtabs" role="tablist" aria-label="Her things">${hubTabs(v, m, tab)}</div></div>
    <div id="hub-panel" role="tabpanel" aria-labelledby="htab-${tab}" tabindex="-1">${HUB[tab](v, m)}</div></div>`, false);
  thingsSee(v, tab); renderChrome();
};
// repaint the tab bar and the panel in place; keep = keep her scroll (an action inside the tab), else back to the top (a new tab)
function hubPaint(keep) {
  const m = ui.modal; if (!m || m.type !== 'things') return;
  const panel = $('#hub-panel'); const bar = $('#modal .hubtabs'); const sheet = $('#modal .sheet-up');
  if (!panel || !bar || !sheet) { renderModal(); return; }
  const v = V(); const y = sheet.scrollTop; const o = document.activeElement && document.activeElement !== document.body && panel.contains(document.activeElement) ? openerOf(document.activeElement) : null;
  ui.hubTab = m.data; bar.innerHTML = hubTabs(v, m, m.data); panel.innerHTML = HUB[m.data](v, m);
  const coin = $('#hub-coin'); if (coin) coin.outerHTML = hubCoin(v);
  panel.setAttribute('aria-labelledby', `htab-${m.data}`);
  sheet.scrollTop = keep ? y : 0;
  const back = o && openerNow(o); if (back) back.focus({ preventScroll: true });
  thingsSee(v, m.data); renderChrome();
}
// open a detail from the hub; closing it brings her back to the same tab, at the same scroll, with focus on the tile she used
function hubOpen(type, data) {
  const m = ui.modal; if (!m || m.type !== 'things') { openModal(type, data); return; }
  const tab = m.data; const y = ($('#modal .sheet-up') || {}).scrollTop || 0; const o = document.activeElement && document.activeElement !== document.body ? openerOf(document.activeElement) : null;
  const trig = modalTrigger; const fresh0 = m.fresh0;
  ui.modal = null; ui.overlays = Math.max(0, ui.overlays - 1);
  openModal(type, data, { fromHub: true }); modalTrigger = trig;
  ui.modal.onClose = () => {
    hubKeep = { fresh0 }; openModal('things', tab); modalTrigger = trig;
    const s = $('#modal .sheet-up'); if (s) s.scrollTop = y;
    const back = o && openerNow(o); if (back) back.focus({ preventScroll: true });
  };
}
const openFrom = (type, data) => (ui.modal && ui.modal.type === 'things' ? hubOpen(type, data) : openModal(type, data));
// The Codex: every EXCLUSIVE in the paper, A to Z; the ones already read are marked
MODALS.codex = () => {
  const keys = Object.keys(GLOSS).sort((a, b) => termOf(a).replace(/^the /i, '').localeCompare(termOf(b).replace(/^the /i, '')));
  modalShell(`<div class="sheet-up"><span class="excl-banner">The Small Print</span><h2 class="h2">A to Z</h2><p class="small">Tap any term. Ones you've read get a tick.</p>
    <div class="codex">${keys.map((k) => `<button class="cx ${ui.seenX.has(k) ? 'read' : ''}" data-x="${k}">${ui.seenX.has(k) ? '✓ ' : ''}${esc(termOf(k))}</button>`).join('')}</div>
    <button class="btn primary block" data-act="menu" data-id="menu" data-autofocus>Back to the menu</button></div>`, false);
};
MODALS.gent = (m) => {
  const v = V(); const g = v.timeline.gents.find((x) => x.id === m.data);
  const h = v.whore.history[g.id];
  const onBoard = v.board.find((b) => b.gent === g.id);
  const studyLeft = v.whore.daily.freeStudiesLeft;
  const allKnown = g.known.secret && g.known.kink && g.known.history;
  const front = `<p class="kicker">Gentleman · ${esc(C.FRESHNESS[g.freshness].name)}</p>${img(g.art, g.name, { cls: 'art-img portrait' })}
    <h2 class="h2">${esc(g.name)}</h2>${(() => { if (m.said === undefined) m.said = voiceFor(g.id, 'card', true); return m.said ? `<p class="flav">“${esc(m.said)}”</p>` : ''; })()}${gentChips(g, v.whore)}${onBoard && hostTonight(v, g.id) ? `<p class="hosttag">Hosts ${esc(hostTonight(v, g.id).short)} tonight: satisfy him now and you're his Regular, +1 at the Curtain.</p>` : ''}`;
  const back = `<p class="kicker">The small print</p><h3 class="h3">${esc(g.short)}</h3>
    <div class="facts">
      <div class="fact"><span><button class="x" data-x="tell">Tells</button></span><span>${g.tells.map(esc).join('<br>')}</span></div>
      <div class="fact"><span><button class="x" data-x="secret">Secret Taste</button></span><span>${g.known.secret ? artLabel(g.secretTaste) : '? Study him'}</span></div>
      <div class="fact"><span><button class="x" data-x="kink">Kink</button></span><span>${g.known.kink ? `${esc(g.kink.name)}: bring ${esc(g.kink.hint)} (+${R.sway.kink})` : '? Study him twice, or buy the novelty his Tell points to'}</span></div>
      ${whereRows(g, v)}
      ${g.known.kink || g.known.secret ? '<div class="fact"><span><button class="x" data-x="blackbook">Little Black Book</button></span><span>What you know is written in it for good.</span></div>' : ''}
      <div class="fact"><span>His habit</span><span>${linkTerms(g.hook, null)}</span></div>
      <div class="fact"><span><button class="x" data-x="regular">History</button></span><span>${h ? `${h.regular ? `Regular ×${h.regular}. ` : ''}${h.grudge ? 'Holds a Grudge. ' : ''}${h.seen.length ? `Has seen ${h.seen.map((c) => (C.CARDS[c] || C.AFFLICTIONS[c]).name).join(', ')}.` : ''}` || 'Met once.' : 'Never met you.'}</span></div>
      <div class="fact"><span>Last charmed by</span><span>${g.known.history ? (g.lastCharmed ? esc(v.timeline.rivals.concat([{ id: v.whore.id, name: v.whore.name }]).find((r) => r.id === g.lastCharmed.whore)?.name || 'someone') : 'nobody yet') : '? Study him three times'}</span></div>
      <div class="fact"><span><button class="x" data-x="freshness">Freshness</button></span><span>${esc(C.FRESHNESS[g.freshness].blurb)}</span></div>
    </div>`;
  const actions = `<button class="btn" data-act="study" data-id="${g.id}" ${allKnown ? 'disabled' : ''}>${allKnown ? 'Nothing left to learn' : `Study him · ${studyLeft > 0 ? `${studyLeft} free` : '1 Coin'}`}</button>
    ${onBoard && !v.whore.assignation ? `<button class="btn primary" data-act="start-assign" data-id="${g.id}">Take him on</button>` : ''}`;
  modalShell(flipShell(front, back, actions, { slot: true }));
};
function itemFaces(it, v) {
  const forGent = it.kinkFor ? v.timeline.gents.find((g) => g.id === it.kinkFor) : null;
  // a stall item she doesn't own (the offer, the plan screen's Kink offer) says where it is sold (BRIEF2 5e)
  const sold = it.idx == null ? v.timeline.places.find((p) => p.stall.some((x) => x.id === it.id)) : null;
  const front = `<p class="kicker">Novelty · ${it.blackMarket ? 'black market' : 'from the stall'}</p>${img(it.art, it.name, { cls: 'art-img' })}<h2 class="h2">${esc(it.name)}</h2>
    <div class="chips"><button class="chip" data-x="coin">${it.cost} Coin</button><span class="chip">${it.uses > 50 ? 'Reusable' : plural(it.uses, 'use')}</span><button class="chip" data-x="${it.kind === 'kink' ? 'kink' : it.kind === 'protection' ? 'itch' : 'sway'}">${it.kind === 'kink' ? 'For a Kink' : it.kind === 'protection' ? 'Protection' : '+Sway'}</button></div>`;
  const back = `<p class="kicker">The small print</p><h3 class="h3">${esc(it.name)}</h3><p class="flav">${esc(it.inspect)}</p><p>${linkTerms(it.publicUse, null)}</p>
    ${sold ? `<p class="small">Sold behind ${esc(theLower(sold.short))}${it.blackMarket ? `, under the counter (Notoriety ${R.rummage.blackMarketAt}+)` : ''}, ${it.cost} Coin.</p>` : ''}
    ${it.kind === 'kink' ? `<p>${forGent ? `<b>For:</b> ${esc(forGent.short)}. +${R.sway.kink} Sway when you bring it to him.` : it.tell ? `<b>Whose?</b> The gentleman whose ${linkTerms('Tell', null)} reads “${esc(it.tell)}” Buy it and his ${linkTerms('Kink', null)} goes in your ${linkTerms('Little Black Book', null)}.` : '<b>Whose?</b> Study the gentlemen to find out.'}</p>` : ''}`;
  return { front, back };
}
MODALS.offer = () => {
  const v = V(); const o = v.whore.offer;
  if (!o) { closeModal(); return; }
  const { front, back } = itemFaces(o.item, v);
  const full = v.whore.items.length >= R.reticule;
  const it = o.item;
  const whisper = it.kind === 'kink' && it.tell && !it.kinkFor ? `Psst. For the gent who… “${it.tell}”` : 'Psst. Over here.';
  const can = v.whore.coin >= o.price && !full;
  modalShell(flipShell(`<p class="balloon" style="position:static;max-width:none">${esc(whisper)}</p>${front}`, back,
    `<button class="btn primary" data-act="buy" ${can ? '' : 'disabled'}>Buy · ${priceOf(o.price, v.whore.coin)}</button><button class="btn" data-act="pass">Wave him off</button>`, { noBack: true }));
};
MODALS.stallitem = (m) => {
  const v = V(); const k = kinkOfferPlace(v);
  const it = k && k.item.id === m.data ? k.item : null; if (!it) { closeModal(); return; }
  const { front, back } = itemFaces(it, v);
  const can = v.whore.coin >= it.cost && v.whore.items.length < R.reticule;
  modalShell(flipShell(front, back, `<button class="btn primary" data-act="plan-buy" ${can ? '' : 'disabled'}>Buy · ${priceOf(it.cost, v.whore.coin)}</button>`));
};
// The first Gutter visit asks once, at the Seal (finding 9): what it costs her roads, face up, and what it shuts
MODALS.slum = () => {
  const d = planData(); if (!d) { closeModal(); return; }
  const rc = roadCost(d.v, playNoto(d, ui.sel.length ? d.pv : { noto: 1 }));
  modalShell(`<div class="sheet-up"><span class="grab" aria-hidden="true"></span><span class="excl-banner">The Police Gazette</span><h2 class="h2">Your first night at ${esc(d.p.short)}</h2>
    <p class="excl-body">${rc ? `${esc(rc.text)}.` : 'Notoriety +1, Standing −1.'} It pays well in Coin, and the back alleys open at Notoriety ${R.backAlleyAt}. <button class="x" data-x="lowroad">The Police Gazette</button></p>
    ${shutCardHTML(rc, true)}
    <div class="row"><button class="btn primary grow" data-act="slum-seal" data-autofocus>Go slumming: seal it</button><button class="btn grow" data-act="close-modal">Not tonight</button></div></div>`, false);
};
MODALS.wipe = () => {
  modalShell(`<div class="sheet-up wipe"><span class="grab" aria-hidden="true"></span><div class="row" style="justify-content:space-between;align-items:center"><span class="excl-banner">Start over?</span><button class="btn small ghost" data-act="wipe">Wipe this game</button></div>
    <h2 class="h2">A fresh scandal wipes this one</h2>
    <p class="excl-body">${net.account().name ? `Every girl, every Coin and every secret on this device goes in the fire, and the copy kept under ${esc(net.account().name)} follows at the new game's first save.` : 'Every girl, every Coin and every secret kept on this device goes in the fire.'} There is no undo.</p>
    <button class="btn primary block" data-act="close-modal" data-autofocus>Keep playing</button></div>`, false);
};
// Menu > Your account (logged in), or Keep your game anywhere (a guest game: Log in or Create account, the title's forms;
// a new account takes this game up under its name, a login replaces it with the account's saved game if there is one).
MODALS.acct = () => {
  saveDraft(); // a re-render (the server answered) keeps what she typed
  const a = net.account(); const who = a.name || a.hint;
  const top = '<span class="grab" aria-hidden="true"></span><span class="excl-banner">The front desk</span>';
  if (who) {
    const when = a.synced && Number.isFinite(a.synced.updatedAt) ? new Date(a.synced.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
    const line = !a.name ? 'Can\'t reach our server, so your game is saved on this device for now.' : a.unsent ? 'Your latest moves reach the server within a minute.' : when ? `Last saved to the server at ${when}.` : 'Saved to the server.';
    modalShell(`<div class="sheet-up acct">${top}<h2 class="h2">Your account</h2>
      <p class="excl-body">Logged in as <b>${esc(who)}</b>. Your game is saved on this device and on our server under that name, so any device can pick it up.</p>
      <p class="small">${esc(line)}</p>
      <p class="small">${esc(NO_KEY)}</p>
      <div class="row">${a.name ? '<button class="btn grow" data-act="sign-out">Log out</button>' : '<button class="btn grow" data-act="acct-retry">Try the server again</button>'}<button class="btn primary grow" data-act="close-modal" data-autofocus>Keep playing</button></div></div>`, false);
    return;
  }
  if (!ui.authMode) ui.authMode = authOpen('menu');
  modalShell(`<div class="sheet-up acct">${top}<h2 class="h2">Keep your game anywhere</h2>
    <p class="excl-body" id="acct-lead">${esc(ACCT_LEAD[ui.authMode])}</p>
    <div class="signup authdesk">
      ${authPick(false)}
      <button class="btn block" type="button" data-act="close-modal">Not now</button>
    </div></div>`, false);
  fillDraft();
};
// Letters to the Editor: a bug, an idea or a rating, anonymous unless she is signed in (the server files it under her).
// The draft survives closing the sheet (ui.letter) until it is posted.
const LETTER = {
  bug: ['A bug', 'What went wrong?', 'Which page, what you tapped, and what happened instead.'],
  idea: ['An idea', 'What should the paper do next?', 'One idea per letter, please.'],
  rating: ['Stars', 'Anything to add?', 'Optional: the stars say the rest.'],
};
const THANKS = ['Got it, thanks. The Editor read it twice and underlined a bit.', 'The post boy ran it up three flights. The Editor tipped him a farthing.', 'Filed under Correspondence, between a complaint about the trams and a proposal of marriage.'];
MODALS.letters = () => {
  const d = ui.letter || (ui.letter = { kind: 'bug', rating: 0, text: '' });
  const [, label, hint] = LETTER[d.kind]; const who = net.account().name;
  modalShell(`<div class="sheet-up letters"><span class="grab" aria-hidden="true"></span><span class="excl-banner">The post room</span><h2 class="h2">Letters to the Editor</h2>
    <form id="letterform" class="signup">
      <div class="tabs three" role="group" aria-label="What kind of letter">${Object.entries(LETTER).map(([k, [l]]) => `<button type="button" aria-pressed="${k === d.kind}" data-act="letter-kind" data-id="${k}">${esc(l)}</button>`).join('')}</div>
      ${d.kind === 'rating' ? `<div class="stars" role="group" aria-label="Stars, one to five">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="${n <= d.rating ? 'on' : ''}" aria-pressed="${n === d.rating}" aria-label="${plural(n, 'star')}" data-act="letter-star" data-id="${n}">★</button>`).join('')}</div>` : ''}
      <div class="field"><label for="letter">${esc(label)}</label><textarea id="letter" name="letter" maxlength="2000" rows="5" aria-describedby="letter-hint">${esc(d.text)}</textarea>
        <span class="small nomhint" id="letter-hint" aria-live="polite">${esc(hint)}</span></div>
      <p class="small">${who ? `Signed ${esc(who)}.` : 'Unsigned: the Editor won\'t know who sent it.'}</p>
      <div class="row"><button class="btn primary grow" type="submit">Post it</button><button class="btn grow" type="button" data-act="close-modal">Not now</button></div>
    </form></div>`, false);
};
MODALS.short = () => {
  const d = planData(); if (!d) { closeModal(); return; }
  const alt = d.T.places.find((p) => p.id === L.casualPlace(d.v));
  const altOk = alt && alt.id !== d.p.id;
  modalShell(`<div class="sheet-up"><span class="grab" aria-hidden="true"></span><div class="arrive-head"><span class="excl-banner">Heads up</span><button class="close" data-act="close-modal" aria-label="Close">&times;</button></div><h2 class="h2">Short of his Bar</h2>
    <p class="excl-body">Sway ${d.pv.sway} against <button class="x" data-x="bar">Bar</button> ${d.bar} at ${esc(d.p.short)}: <button class="x" data-x="doorgift">the door gift</button> only, no Renown.${altOk ? ` ${esc(alt.short)} looks likelier tonight.` : ''}</p>
    <div class="row">${altOk ? `<button class="btn primary grow" data-act="short-try" data-id="${alt.id}" data-autofocus>Try ${esc(alt.short)}</button>` : ''}<button class="btn grow ${altOk ? '' : 'primary'}" data-act="short-seal">Seal anyway</button></div></div>`, false);
};
MODALS.ovgent = () => {
  const g = C.GENTS[OV_GENT];
  const front = `<p class="kicker">Gentleman · ${esc(C.FRESHNESS[g.freshness].name)}</p>${img(g.art, g.name, { cls: 'art-img portrait' })}<h2 class="h2">${esc(g.name)}</h2>
    <div class="chips">${g.tastes.map((a) => `<button class="chip good" data-x="tick">✓ ${artLabel(a)}</button>`).join('')}<button class="chip bad" data-x="aversion">✗ ${artLabel(g.aversion)}</button><button class="chip q" data-x="secret">Secret: ?</button><button class="chip q" data-x="kink">Kink: ?</button></div>`;
  const back = `<p class="kicker">The small print</p><h3 class="h3">${esc(g.short)}</h3><div class="facts">
    <div class="fact"><span><button class="x" data-x="tell">Tells</button></span><span>${g.tells.map(esc).join('<br>')}</span></div>
    <div class="fact"><span><button class="x" data-x="secret">Secret Taste</button></span><span>? Study him</span></div>
    <div class="fact"><span><button class="x" data-x="kink">Kink</button></span><span>? Study him twice, or buy the novelty his Tell points to</span></div></div>`;
  modalShell(flipShell(front, back, ''));
};
MODALS.item = (m) => {
  const v = V(); const it = v.whore.items.find((x) => x.idx === Number(m.data));
  if (!it) { closeModal(); return; }
  const { front, back } = itemFaces(it, v);
  modalShell(flipShell(front, back, `<button class="btn" data-act="drop" data-id="${it.idx}">Leave it on a bench</button><button class="btn primary" data-act="close-modal">Keep it</button>`, { noBack: true }));
};
MODALS.card = (m) => {
  const v = V(); const [src, idx] = m.data;
  const list = src === 'deck' ? deckRows(v) : src === 'market' ? v.timeline.market.map((c, i) => ({ ...c, idx: i })) : src === 'lent' && v.whore.assignation ? v.whore.assignation.lent : v.whore.hand;
  const c = list.find((x) => x.idx === Number(idx)); if (!c) { closeModal(); return; }
  const front = `<p class="kicker">${c.affliction ? 'Affliction · curse card' : c.position ? 'Card · a position. Stretch first.' : 'Card'}</p>${c.art ? img(c.art, c.name, { cls: 'art-img' }) : ''}<h2 class="h2">${esc(c.name)}</h2>
    <div class="chips">${c.affliction ? '' : `<button class="chip" data-x="allure">Allure ${c.allure}</button>`}${c.arts.map((a) => `<button class="chip" data-x="arts">${artLabel(a)}</button>`).join('')}${c.pocket ? `<button class="chip" data-x="pocket">Kept: +${c.pocket} Coin</button>` : ''}</div>`;
  const back = `<p class="kicker">The small print</p><h3 class="h3">${esc(c.name)}</h3>${c.text ? `<p>${linkTerms(c.text, null)}</p>` : '<p>No special rules. Honest work.</p>'}<p class="flav">“${esc(c.flavour)}”</p>
    ${src === 'deck' ? likedBy(c, v) : ''}
    ${src === 'deck' && kinkCards(v)[c.id] ? kinkCards(v)[c.id].map((k) => `<p><b>Kink card.</b> It springs ${esc(k.who)}'s Kink${k.withArt ? ` when you Work it with a ${esc(C.ARTS[k.withArt].name)} card` : ''}: +${R.sway.kink} Sway.</p>`).join('') : ''}
    ${c.arts.length ? `<p class="small">${c.arts.map((a) => `${C.ARTS[a].name}: ${C.ARTS[a].blurb}`).map(esc).join(' ')}</p>` : ''}`;
  modalShell(flipShell(front, back, `<button class="btn" data-act="close-modal" style="grid-column:1/-1">${m.fromHub ? 'Back to her things' : 'Back to the table'}</button>`, { noBack: true }));
};
MODALS.affl = (m) => {
  const v = V();
  const A = C.AFFLICTIONS[m.data];
  const have = v.whore.afflictions.some((x) => x.id === m.data);
  const front = `<p class="kicker">Affliction · curse card</p>${img(A.art, A.name, { cls: 'art-img' })}<h2 class="h2">${esc(A.name)}</h2><p>${esc(A.symptomText)}</p>`;
  const back = `<p class="kicker">Doctor's note</p><p class="flav">${esc(A.gag)}</p><p>${esc(A.flavour)}</p><p><b>Cure:</b> ${esc(A.cure.name)}, ${A.cure.cost} Coin${A.cure.notoriety ? ', and people will talk (Notoriety +1)' : ''}.</p>`;
  modalShell(flipShell(front, back, have ? `<button class="btn primary" data-act="cure" data-id="${A.id}" ${v.whore.coin >= A.cure.cost ? '' : 'disabled'}>Cure · ${priceOf(A.cure.cost, v.whore.coin)}</button><button class="btn" data-act="close-modal">Later</button>` : '<button class="btn" data-act="close-modal" style="grid-column:1/-1">Close</button>', { noBack: true }));
};
MODALS.char = (m) => {
  const ch = C.CHARACTERS[m.data];
  const front = `<p class="kicker">${esc(C.TIMELINES[ch.timeline].name)} · ${esc(ch.temperament)}</p>${eraMini(ch.timeline, ch.art, ch.name)}<h2 class="h2">${esc(ch.name)}</h2><p class="flav">${esc(ch.epithet)}.${(() => { const pool = ch.voices && ch.voices.length ? ch.voices : [ch.voice]; const l = pool.find((x) => x !== ui.pickLine[ch.id] && x !== (ui.voices[ch.id] || {}).line); return l ? ` ${esc(l)}` : ''; })()}</p>`;
  const back = `<p class="kicker">Her file</p><h3 class="h3">${esc(ch.name)}</h3><p class="small">${esc(ch.look)}</p>
    <div class="facts">
      <div class="fact"><span><button class="x" data-x="type">Type</button></span><span>${esc(C.TYPES[ch.type].name)}: ${esc(C.TYPES[ch.type].blurb)}</span></div>
      <div class="fact"><span><button class="x" data-x="signature">Signature</button></span><span>${artLabel(ch.signature)}</span></div>
      <div class="fact"><span><button class="x" data-x="talent">Charm</button></span><span><b>${esc(C.CHARMS[ch.charm].name)}</b>: ${esc(C.CHARMS[ch.charm].text)}</span></div>
      <div class="fact"><span>Talent</span><span><b>${esc(C.TALENTS[ch.talent].name)}</b>: ${esc(C.TALENTS[ch.talent].text)}</span></div>
      <div class="fact"><span>Vice</span><span><b>${esc(C.VICES[ch.vice].name)}</b>: ${esc(C.VICES[ch.vice].upside)} ${esc(C.VICES[ch.vice].downside)}</span></div>
      ${ch.plays ? `<div class="fact"><span>Plays</span><span>${esc(ch.plays)}</span></div>` : ''}
    </div>`;
  const actions = ui.screen === 'pick' ? `<button class="btn primary" data-act="hire-from" data-id="${ch.id}">Play as ${esc(ch.short)}</button><button class="btn" data-act="close-modal">Not yet</button>` : '<button class="btn" data-act="close-modal" style="grid-column:1/-1">Close</button>';
  modalShell(flipShell(front, back, actions, { noBack: true }));
};
function profileBlock(wid) {
  const p = L.publicProfile(ui.S, ME, wid);
  const me = C.CHARACTERS[wid] && ui.S.whores[wid] && ui.S.whores[wid].account === ME;
  return `<div class="gent-head" style="grid-template-columns:96px 1fr">${eraMini(p.timeline, p.art, p.name)}
    <div class="meta"><b class="h3">${esc(p.name)}</b><span class="small">${esc(p.epithet)} · ${esc(C.TIMELINES[p.timeline].short)}</span>
      <span>${badgeFor(p)}</span>
      <span class="small"><button class="x" data-x="eratitle">${esc(p.title)}</button> · ${esc(C.TIER_NAMES[p.tier])} · ${p.renown} Renown</span>
      <span class="small">Standing ${p.standing} · Notoriety ${p.notoriety}</span></div></div>
    ${(() => { const said = voiceFor(wid, 'profile'); return said ? `<p class="flav" style="margin:0">${esc(said)}</p>` : ''; })()}
    <div class="facts">
      <div class="fact"><span>Temperament</span><span>${esc(p.ch.temperamentText)}</span></div>
      <div class="fact"><span>Charm</span><span><b>${esc(p.charmInfo.name)}</b>: ${esc(p.charmInfo.text)}</span></div>
      <div class="fact"><span>Talent</span><span>${p.talentInfo ? `<b>${esc(p.talentInfo.name)}</b>: ${esc(p.talentInfo.text)}` : me ? '' : '? Study her to find out'}</span></div>
      <div class="fact"><span>Vice</span><span>${(() => { const vi = p.viceInfo || (me ? C.VICES[ui.S.whores[wid].vice] : null); return vi ? `<b>${esc(vi.name)}</b>: ${esc(vi.upside)} ${esc(vi.downside)}` : '? Study her to find out'; })()}</span></div>
      <div class="fact"><span>Last Curtains</span><span>${p.lastResults.length ? p.lastResults.map((r) => `${esc(C.PLACES[r.place].short)}: ${r.rank !== null ? ord(r.rank) : 'door gift'}`).join(' · ') : 'None yet'}</span></div>
      <div class="fact"><span>Collectibles</span><span>${p.collectibles.length ? (me ? `<button class="link" data-act="things" data-id="album">${plural(p.collectibles.length, 'piece')} in the album ›</button>` : plural(p.collectibles.length, 'piece')) : 'An empty mantelpiece'}${p.frontPage ? ' · made the Front Page' : ''}</span></div>
    </div>`;
}
MODALS.profile = (m) => {
  const ids = Array.isArray(m.data) ? m.data : [m.data];
  const v = V();
  const canStudy = ids.length === 1 && v.timeline.rivals.some((r) => r.id === ids[0]);
  const r = canStudy ? v.timeline.rivals.find((x) => x.id === ids[0]) : null;
  const left = r ? !(r.known.habit && r.known.vice && r.known.last) : false;
  const gossip = canStudy ? v.whore.gossip : 0;
  const heard = canStudy && ui.leaning[ids[0]] && ui.leaning[ids[0]].curtainNo === v.timeline.curtainNo ? ui.leaning[ids[0]] : null;
  modalShell(`<div class="sheet-up"><span class="excl-banner">Public profile</span>${ids.map(profileBlock).join('<hr class="rule">')}
    ${heard ? `<p class="clip"><b class="h3">A little bird says</b> ${esc(heard.text)}</p>` : ''}
    ${canStudy ? `<div class="row"><button class="btn ${gossip ? 'primary' : ''}" data-act="gossip" data-id="${ids[0]}" ${gossip >= 1 ? '' : 'disabled'}>Trade 1 Gossip: where is she going?</button><button class="x small" data-x="gossip">${gossip ? `you hold ${gossip}` : 'you hold none yet'}</button></div>` : ''}
    <div class="row">${canStudy && left ? `<button class="btn" data-act="study" data-id="${ids[0]}">Study her · ${v.whore.daily.freeStudiesLeft > 0 ? `${v.whore.daily.freeStudiesLeft} free` : '1 Coin'}</button>` : ''}<button class="btn grow" data-act="close-modal" data-autofocus>Close</button></div></div>`, false);
};
// How to play: the overview to read again, and every step-by-step tip met so far (shown or kept quietly), newest first
MODALS.tips = () => {
  modalShell(`<div class="sheet-up"><span class="excl-banner">How to play</span><h2 class="h2">Tips so far</h2>
    <button class="mrow" data-act="ov-replay">${ICON.paper}<span><b>Read the guide again</b><span>What the game is, the two papers, and what things cost.</span></span></button>
    ${ui.tips.length ? `<div class="gossip">${[...ui.tips].reverse().map((t) => `<div class="gitem"><span class="h3">${escE(t.head)}</span><span class="more">${escE(t.sub)}${t.x ? ` <button class="x" data-x="${t.x}">More</button>` : ''}</span></div>`).join('')}</div>` : '<p class="small">No tips yet. They collect here as you meet each part of the game.</p>'}
    <button class="btn primary block" data-act="menu" data-id="menu" data-autofocus>Back to the menu</button></div>`, false);
};
MODALS.digest = (m) => {
  const { wid, headlines, travel } = m.data; const TL = C.TIMELINES[tlOf(wid)];
  const heat = (r) => (r >= 60 ? 'Hot off the press · about you' : r >= 30 ? 'Worth knowing' : 'Idle gossip');
  modalShell(`<div class="sheet-up"><p class="kicker">${esc(TL.gazette)}</p>${travel ? `<p class="travel">${esc(travel)}</p>` : ''}<h1 class="h1">${ransom('WHILE YOU WERE AWAY')}</h1>
    <div class="gossip">${headlines.map((h, i) => `<button class="gitem" data-act="digest-more" data-id="${i}" aria-expanded="${m.open === i}"><span class="rel">${heat(h.relevance)}${h.count > 1 ? ` · ×${h.count}` : ''}</span><span class="h3">${escE(h.text)}</span>${m.open === i && h.detail ? `<span class="more">${escE(h.detail)}</span>` : (h.detail ? '<span class="small">Tap for more</span>' : '')}</button>${h.place && wid === ui.active ? `<button class="btn small" data-act="digest-plan" data-id="${h.place}">Plan it at ${esc(C.PLACES[h.place].short)}</button>` : ''}`).join('')}</div>
    <button class="btn primary block" data-act="close-modal" data-autofocus>To ${esc(C.CHARACTERS[wid].short)}'s front page</button></div>`, false);
};
// Last call: leaving a whore whose Curtain is due asks first (her Standing Order goes where the smileys are).
MODALS.confirm = (m) => {
  const { wid } = m.data; const v = V(wid); const pick = L.standingOrderPick(v);
  const sh = C.CHARACTERS[wid].short; const P = C.PLACES[pick.place];
  modalShell(`<div class="sheet-up"><div class="arrive-head"><span class="excl-banner">Last call</span><button class="close" data-act="close-modal" aria-label="Close">&times;</button></div><h2 class="h2">${esc(sh)} is due on stage</h2>
    <p class="excl-body">If you go now, ${esc(sh)} goes out by Standing Order to <b>${esc(P.short)}</b> (host ${esc(C.GENTS[pick.host].short)}; Best Guess ${pick.sway} Sway).</p>
    <div class="row"><button class="btn primary grow" data-act="lc-seal" data-autofocus>Seal now</button><button class="btn grow" data-act="lc-let">Let her go</button></div></div>`, false);
};
MODALS.telegram = (m) => {
  const TL = C.TIMELINES[m.data && m.data.tl ? m.data.tl : m.data]; m.slots = m.data && m.data.slots;
  modalShell(`<div class="modal-card"><div class="telegram"><span class="pin"></span><div class="tt">TELEGRAM</div><p class="tg-text" data-full="${esc(TL.telegram)}">${calm() ? esc(TL.telegram) : ''}</p>
    <p class="small" style="color:inherit">${(m.slots || 2) >= 3 ? 'A third Timeline is open to you.' : 'A second Timeline is open to you.'}</p></div>
    <div class="modal-actions"><button class="btn" data-act="close-modal">Later</button><button class="btn primary" data-act="tg-go" data-autofocus>To the Timelines board</button></div></div>`);
  const el = $('.tg-text'); if (el && !calm()) typewrite(el, el.dataset.full);
};
// A promotion's own front page (round 4, finding 8): her new era title on each road, and exactly what the rung opened.
// Her rare look, not the money-in-hand plate (that is kept for a Curtain won outright, finding 40).
MODALS.promo = (m) => {
  const { wid, tier, slots } = m.data; const ch = C.CHARACTERS[wid]; const w = ui.S.whores[wid]; const tl = ch.timeline;
  const S = L.eraTitle(tl, tier, 'standing'); const N = L.eraTitle(tl, tier, 'notoriety'); const mine = L.eraTitle(tl, tier, w.notoriety > w.standing ? 'notoriety' : 'standing');
  const opened = [
    `A new title: ${mine}${S !== N ? ` (${mine === S ? `in the Police Gazette she would be a ${N}` : `on the Society Pages she would be a ${S}`})` : ''}.`,
    `Whorescore for this whore: ${R.whorescore[tier === 'epic' ? 'rare' : 'common']} → ${R.whorescore[tier]}.`,
    ...(slots >= 3 ? ['A third Timeline: a telegram is on its way.'] : []),
    ...(tier === 'epic' ? [`Coming soon: the right to challenge for ${L.seatName('salon', tl)} or ${L.seatName('gutter', tl)} (Standing or Notoriety ${R.seats.salon.standing}+).`] : []),
  ];
  const n = tier === 'rare' ? `Next: Epic at ${R.tiers.epic} Renown, and the seats.` : 'Next: a seat. Legendary and Mythic are seats, and seats are won in Duels. Duels are coming soon.';
  modalShell(`<div class="spinpaper"><section class="sheet extra promo"><p class="kicker">${esc(C.TIMELINES[tl].gazette)} · special edition</p>
    <h1 class="h1">${ransom('RISING STAR')}</h1>
    <div class="hero">${img(exprArt(wid, RARE_LOOK[wid]), ch.name, { eager: true, pos: '50% 30%' })}<span class="stamp big pop good">${esc(C.TIER_NAMES[tier].replace(' Whore', ''))}</span></div>
    <h2 class="h2">${esc(ch.name)} is now a ${esc(mine)}</h2>
    <div class="clip win" style="text-align:left"><b class="h3">What it opened</b>${opened.map((x) => `<p>${esc(x)}</p>`).join('')}</div>
    <p class="small">${esc(n)}</p>
    <button class="btn primary block" data-act="close-modal" data-autofocus>Carry on</button></section></div>`);
};
// A new Timeline's first visit (round 4, finding 16): an arrival card, not a While You Were Away sheet for a place she has
// never been
MODALS.arrive = (m) => {
  const { wid, travel } = m.data; const ch = C.CHARACTERS[wid]; const TL = C.TIMELINES[ch.timeline];
  // her first Curtain in the same words as the chip (cdText): "later on", "soon", "any minute now", or due now at last call
  const when = cdText(ch.timeline);
  // round 6 (finding 22): a close x in the head, and the one way on is docked (sticky) so it is never below the fold
  modalShell(`<div class="sheet-up arrive"><span class="grab" aria-hidden="true"></span><div class="arrive-head"><p class="kicker">${esc(TL.gazette)}</p><button class="close" data-act="close-modal" aria-label="Close">&times;</button></div><h1 class="h1">${ransom(`${ch.short.toUpperCase()} STEPS OFF THE ${{ wildwest: 'COACH', vegas: 'PLANE', victorian: 'TRAIN' }[ch.timeline] || 'COACH'}`)}</h1>
    <div class="arrive-photo">${photo(ch.art, ch.name, `<b>${esc(ch.name)}</b>${esc(ch.epithet)}`, { eager: true })}</div>
    ${travel ? `<p class="travel">${esc(travel)}</p>` : ''}
    <p class="small" style="text-align:center;margin:0">${esc(TYPE_PLAIN[ch.type].replace(/^./, (x) => x.toUpperCase()))}. She's best at ${artLabel(ch.signature)}. Her first Curtain here is ${esc(when === 'last call!' ? 'due now' : when)}.</p>
    ${rivalLine(ch.timeline)}
    <div class="cta-dock"><button class="btn primary block" data-act="close-modal" data-autofocus>To ${esc(ch.short)}'s front page</button></div></div>`, false);
};
// The two-page spread (02-strategy §2.2): both papers side by side, what each pays, opens and crowns, her in each future
MODALS.fork = () => {
  const v = V(); const w = v.whore; const tl = w.timeline; const ST = roadSteps(tl);
  const col = (road) => {
    const st = road === 'standing'; const steps = (st ? ST.standing : ST.notoriety).filter((x) => !x.bad).slice(0, 4);
    return `<section class="forkpage ${st ? 'st' : 'no'}"><b class="mast">${st ? 'The Society Pages' : 'The Police Gazette'}</b><span class="road">${st ? 'Standing' : 'Notoriety'}</span>
      <div class="fpic">${img(exprArt(w.id, st ? PLEASED_LOOK[w.id] : RARE_LOOK[w.id]), w.name, { eager: true, pos: '50% 20%' })}</div>
      <p class="small"><b>Pays:</b> ${st ? 'the most Renown per win; invitations and a Patron' : 'fast Coin; the Gutter pays Coin to everyone placed'}.</p>
      <p class="small"><b>How:</b> ${st ? 'win in the smart houses; please the clean gentlemen' : 'nights in the dives, back-alley jobs, naughty cards anywhere'}.</p>
      <ul class="steps">${steps.map((x) => `<li><b>${x.at}</b> ${esc(x.t)}</li>`).join('')}</ul>
      <p class="small"><b>Crown:</b> ${esc(L.seatName(st ? 'salon' : 'gutter', tl))}; the ${st ? 'Most Respectable' : 'Most Notorious and Richest'} board${st ? '' : 's'}.</p>
      ${L.roadOf(w) === road ? '<span class="pickme">She\'s in this one</span>' : ''}</section>`;
  };
  modalShell(`<div class="sheet-up forkspread"><span class="grab" aria-hidden="true"></span><span class="excl-banner">Two papers</span><h2 class="h2">Where ${esc(C.CHARACTERS[w.id].short)}\'s nights can take her</h2>
    <div class="forkpages">${col('standing')}${col('notoriety')}</div>
    <p class="small">${esc(turnLine(w))}</p>
    <button class="btn block" data-act="close-modal" data-autofocus>Close</button></div>`, false);
};
MODALS.result = (m) => {
  modalShell(`<div class="spinpaper"><section class="sheet extra">${m.data.html}</section></div>`);
};
function typewrite(el, text) {
  let i = 0;
  const step = () => { if (!document.body.contains(el)) return; i += 2; el.textContent = text.slice(0, i); if (i % 6 === 0) sfx('clack'); if (i < text.length) setTimeout(step, 28); };
  step();
}

// ---------------------------------------------------------------------------
// Event clippings: turn the engine's events into paper
// ---------------------------------------------------------------------------
// A hidden fact she hit without knowing it: the bonus was not in her preview, so the result says what it added (rules-core §1:
// hidden things only ever help). The Sway comes from the encounter's own breakdown (payout or assignation event).
function surpriseClip(e, evs, wid) {
  const g = C.GENTS[e.gents[0]];
  const res = evs.find((x) => (x.type === 'payout' || x.type === 'assignation') && (x.whores || [])[0] === wid && x.data && x.data.breakdown);
  const bd = res ? res.data.breakdown : null;
  const ticks = bd ? bd.cards.filter((c) => c.ticks.includes('secret')).length * R.card.secret : R.card.secret;
  const say = e.data.facts.includes('kink')
    ? `${g.short}'s Kink is ${e.data.kink}: +${R.sway.kink} Sway you didn't see coming.`
    : `Secretly, ${g.short} likes ${C.ARTS[e.data.secretTaste].name}: +${ticks} Sway you didn't see coming.`;
  const pleased = res ? (res.type === 'assignation' ? res.data.outcome !== 'fizzled' : res.data.rank != null) : true;
  return `<div class="clip win surprise"><b class="h3">${pleased ? 'He loved that!' : 'One thing he did like'}</b><p>${esc(say)} It's in your Little Black Book.</p></div>`;
}
function clipsFor(evs, wid) {
  const out = [];
  // her own Timeline's news only (round 5, finding 15: the District clock can drop another era's gossip into the same
  // tick), and one "Overheard at the bar" per edition
  const tlHere = tlOf(wid); let heard = false;
  for (const e of evs) {
    const mineW = (e.whores || [])[0] === wid;
    if (e.type === 'learned' && mineW && e.data.why === 'accident') out.unshift(surpriseClip(e, evs, wid)); // a surprise leads
    else if (e.type === 'learned' && mineW) out.push(`<div class="clip"><span class="h3">Into the Little Black Book</span><p>${escE(e.text)}</p></div>`);
    else if (e.type === 'meter' && mineW) out.push(`<div class="clip"><span class="h3">${e.data.after.notoriety > e.data.before.notoriety ? 'Scandal!' : 'Standing up'}</span><p>Standing ${e.data.before.standing} → ${e.data.after.standing} · Notoriety ${e.data.before.notoriety} → ${e.data.after.notoriety}.</p></div>`);
    else if (e.type === 'itch' && mineW) out.push(`<div class="clip"><span class="h3">The Itch</span><p>${escE(e.text)}</p></div>`);
    else if (e.type === 'catch' && mineW) { const A = C.AFFLICTIONS[e.data.affliction]; out.push(`<div class="clip"><span class="h3">Oh dear</span><div class="row catchrow">${img(A.art, A.name, { cls: 'catchimg' })}<p>${escE(e.text)}</p></div></div>`); }
    // one beat per moment (round 5, finding 17): the set-up is the picture's small caption, the gag's name is a label, and
    // only the punchline is told
    else if (e.type === 'gag' && mineW && e.data && e.data.gag) { const G = C.GAGS[e.data.gag]; const see = e.data.see || G.see; out.push(`<div class="postcard">${img(G.art, `${G.name}: ${see}`)}${see ? `<p class="pc-cap">${esc(see)}</p>` : ''}<b class="h3 pc-title">${esc(e.data.title || G.name)}</b><p><i>${esc(e.data.punchline || G.punchline)}</i></p></div>`); }
    // a lucky Secret Taste's short gag (round 5, finding 7): the lazy player's share of the comedy
    else if (e.type === 'gag' && mineW && e.data && e.data.lucky) out.push(`<div class="clip win lucky"><b class="h3">Behind the curtain</b><p>${esc(e.data.punchline)}</p></div>`);
    else if (e.type === 'gag' && mineW && e.data && e.data.tourist) { const T0 = C.TOURISTS[(e.gents || [])[0]]; out.push(`<div class="postcard tourist">${img(C.TIMELINES[e.timeline].skin.textures.curtain, 'Behind the curtain')}<p><b>Overheard.</b> ${esc(T0 && T0.gags ? fresh(`tgag:${T0.id}`, T0.gags) : e.text)}</p></div>`); }
    else if (e.type === 'promoted' && mineW) out.push(`<div class="clip"><span class="h3">Rising star</span><p>${escE(e.text)}</p></div>`);
    else if (e.type === 'milestone' && mineW) out.push(`<div class="clip win"><span class="h3">Making a name</span><p>${escE(e.text)}</p></div>`);
    else if ((e.type === 'society-pages' || e.type === 'front-page') && mineW) out.push(`<div class="clip win"><span class="h3">${e.type === 'society-pages' ? 'The Society Pages' : 'The Front Page'}</span><p>${escE(e.text)} Framed, in the album.</p></div>`);
    else if (e.type === 'raid' && e.timeline === tlHere) out.push(`<div class="clip"><span class="h3">Raid night</span><p>${escE(e.text)}</p></div>`);
    else if (e.type === 'gossip' && e.timeline === tlHere && !heard) { heard = true; out.push(`<div class="clip"><span class="h3">Overheard at the bar</span><p>${escE(e.text)}</p></div>`); }
  }
  // every rival who edged past her tonight, in one clip (finding 12: two PIPPED clips repeated their own titles)
  const pipped = evs.filter((e) => e.type === 'overtaken' && (e.whores || [])[0] === wid).map((e) => (C.CHARACTERS[e.data.rival] ? C.CHARACTERS[e.data.rival].name : ''));
  if (pipped.length) { const tl = evs.find((e) => e.type === 'overtaken').timeline; out.push(`<div class="clip"><span class="h3">Overtaken</span><p>By ${esc(pipped.length > 1 ? `${pipped.slice(0, -1).join(', ')} and ${pipped[pipped.length - 1]}` : pipped[0])}, on the ${esc(C.TIMELINES[tl].short)} table.</p></div>`); }
  return out;
}
function teachFrom(evs, wid) {
  for (const e of evs) {
    const mineW = (e.whores || [])[0] === wid;
    // round 7: her paper follows her meters, settled once per action (one 'paper' event at most). A change of paper is news;
    // so is the warning, when one more point the other way would change it.
    if (e.type === 'paper' && mineW) {
      const G = e.data.road === 'notoriety'; const s0 = e.data.standing; const n0 = e.data.notoriety;
      if (e.data.turned) headline({ kicker: G ? 'The Police Gazette' : 'The Society Pages', head: G ? 'You\'re in the Police Gazette' : 'You\'re back in the Society Pages',
        sub: G ? `Notoriety ${n0}, Standing ${s0}. Best Guess stops guarding your Standing. The Posh doors stay shut until your Standing catches up.` : `Standing ${s0}, Notoriety ${n0}. Best Guess guards your Standing again.`, x: 'roadpick', wire: true });
      else headline({ kicker: G ? 'The Society Pages' : 'The Police Gazette', head: G ? 'Society is warming to you' : 'The Gazette has noticed you',
        sub: `Standing ${s0}, Notoriety ${n0}. ${G ? 'One more point of Standing and you\'re back in the Society Pages.' : 'One more point of Notoriety and you\'re in the Police Gazette.'}`, x: 'roadpick', wire: true });
    }
    if (e.type === 'itch' && mineW) teach('itch', 'You\'ve got the Itch', C.LINES.firstItch, 'itch');
    if (e.type === 'learned' && mineW && e.data.facts) {
      // a Kink decoded by a purchase is already the purchase's own headline (decodedLine): no second one
      if (e.data.facts.includes('kink') && e.data.why === 'tell-decoded') continue;
      if (e.data.facts.includes('kink')) teach('kinkL', 'Kink exposed!', e.text, 'kink', 'Into the Little Black Book');
      else if (e.data.facts.includes('secret')) teach('secretL', 'Secret Taste revealed', e.text, 'secret');
    }
  }
}
// After a result: a promotion's own front page first, then the telegram (finding 8); returns false if there was neither
function aftermath(evs, wid) {
  const pro = evs.find((e) => e.type === 'promoted' && (e.whores || [])[0] === wid);
  const tg = evs.find((e) => e.type === 'timeline-unlocked');
  // round 6 (finding 9): the second Timeline's telegram waits for the account's 2nd Curtain; until then the NEXT note
  // brings it up only while she is sealed and waiting (the Timelines tile still says a telegram waits)
  const tele = () => { if (tg && acctCurtains() >= TELEGRAM_RUNG) setTimeout(() => openModal('telegram', { tl: tg.data.invite || TLS.find((t) => !acctView().whores.some((x) => x.timeline === t)), slots: tg.data.slots }), 300); };
  if (pro) { setTimeout(() => { openModal('promo', { wid, tier: pro.data.tier, slots: tg ? tg.data.slots : 0 }); ui.modal.onClose = tele; sfx('tada'); }, 300); return true; }
  if (tg && acctCurtains() >= TELEGRAM_RUNG) { tele(); return true; }
  return false;
}
function catchFrom(evs, wid, then) {
  const e = evs.find((x) => x.type === 'catch' && (x.whores || [])[0] === wid);
  if (!e) { if (then) then(); return; }
  const A = C.AFFLICTIONS[e.data.affliction];
  setTimeout(() => {
    openModal('result', { html: `<span class="stamp big pop">Oh dear</span><h1 class="h1">${esc(A.name)}</h1>${img(A.art, A.name, { cls: '' })}<p class="deck">${esc(A.gag)}</p><p>${esc(A.symptomText)} It sits in your deck like a lodger until you pay for ${esc(A.cure.name)} (${A.cure.cost} Coin).</p><button class="btn primary block" data-act="close-modal">Grin and bear it</button>` });
    if (then) ui.modal.onClose = then;
    teach('affl', 'Afflictions clog your deck', 'A curse card until cured. Find it under Curses on the front page, or in Her things.', 'affliction');
    sfx('sad');
  }, 400);
}

// Round 6 (finding 13): a coaching line prints once per gentleman, per kind, per District day; after that the result shows
// only its numbers. The "Study him" nudge has a few phrasings (a shuffle bag), so the coach never nags in one voice.
function adviceOnce(gid, kind, line) {
  if (!line) return '';
  const day = ui.S ? ui.S.day : -1; const key = `${day}:${gid}:${kind}`;
  if (ui.advised[key]) return '';
  ui.advised[key] = true;
  return line;
}
const STUDY_NUDGE = [
  (g) => `Study ${g.short}: his Secret Taste is still hidden.`,
  (g) => `${g.short} is keeping something back. A Study would find it.`,
  (g) => `There's a ? on ${g.short}'s card. Study him and it turns into Sway.`,
];
// "Same as Best Guess": the next thing that would beat it, from what is still unknown or ready (finding 12)
function nextAdvice(d) {
  const g = d.g; if (!g) return '';
  const ready = d.v.whore.items.find((it) => it.ready && it.kind === 'kink' && (it.kinkFor || it.tellOf) === g.id);
  if (ready) return adviceOnce(g.id, 'kink-ready', `Bring ${theLower(ready.name)} next time: it's his Kink.`);
  if (!g.known.secret) return adviceOnce(g.id, 'study', fresh('study-nudge', STUDY_NUDGE)(g));
  if (!g.known.kink) return adviceOnce(g.id, 'study-kink', `Study ${g.short} once more: his Kink is the biggest bonus there is.`);
  return adviceOnce(g.id, 'known', `You know all his secrets: bring ${g.kink.hint.replace(/, or Work /, ', or play ')}.`);
}
// Before an Assignation is worked: what (from what she can see) would clear his Bar, for the fizzle page. Returns
// [kind, line] (line null: the Study nudge, phrased when shown); the result prints it through adviceOnce.
function fizzleAdvice(d) {
  const v = d.v; const g = d.g; if (!g) return '';
  const bar = d.bar;
  const studied = g.known.secret;
  // her Talent (Double Entendre) on Best Guess's cards
  const de = L.bestDoubleEntendre(v, { gent: d.gid, cards: d.bg.cards });
  if (de && de.sway >= bar) { const c = d.A.lent[de.card]; return ['de', `Double Entendre on ${c.name}, counted as ${C.ARTS[de.art].name}, would have scored ${de.sway}: enough.`]; }
  // a novelty she carries
  for (const it of v.whore.items.filter((x) => x.ready)) { const b = L.bestGuess(v, { gent: d.gid }, { item: it.id }); if (b.sway >= bar) return [`item:${it.id}`, `${it.name} from your reticule would have scored ${b.sway}: enough.`]; }
  if (!studied) return ['study', null];
  return ['walk', 'Not your gentleman tonight, with these cards: Walk Away costs nothing.'];
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
const ACTS = {};
ACTS['hl-close'] = () => closeHl();
ACTS.tips = () => openModal('tips');
ACTS.noop = () => {};
ACTS.mute = () => { audioInit(); setMuted(!ui.muted); if (!ui.muted) sfx('coin'); };
ACTS['close-modal'] = (d, el, e) => {
  if (el.classList.contains('scrim') && e.target !== el) return;
  closeModal();
};
ACTS.flip = () => {
  if (!ui.modal) return;
  ui.modal.flipped = !ui.modal.flipped; sfx('flip');
  const f = $('#modal .flip');
  if (f) {
    f.classList.toggle('flipped', ui.modal.flipped);
    const fr = f.querySelector('.face.front'); const bk = f.querySelector('.face.back'); const b = f.querySelector('.flipbtn');
    if (fr) fr.inert = ui.modal.flipped; if (bk) bk.inert = !ui.modal.flipped;
    if (b) { b.textContent = ui.modal.flipped ? 'Front' : 'Flip it'; b.setAttribute('aria-pressed', String(ui.modal.flipped)); }
  }
  if (['gent', 'offer', 'item'].includes(ui.modal.type)) { ui.steps.add('flip'); }
  if (ui.modal.type === 'offer' && ui.modal.flipped && hlCur && hlCur.key === 'flip') { closeHl(); headline({ kicker: 'Under the counter', head: 'Buy it, or wave him off', scoped: true }); }
  // the back of his card is where the dotted words live: teach them here, the first time it matters
  if (ui.modal.type === 'gent' && ui.modal.flipped) teach('x', 'Dotted words', 'Tap any dotted word to see what it means.', 'tell', 'How this paper works');
};
// The Morning Edition
ACTS['ov-go'] = (d) => ovGoTo(ui.ovPage + Number(d.id));
ACTS['ov-try'] = (d) => {
  const before = [...ui.ovPicked].reduce((s, c) => s + ovCardScore(c), 0);
  if (ui.ovPicked.has(d.id)) ui.ovPicked.delete(d.id); else ui.ovPicked.add(d.id);
  const after = [...ui.ovPicked].reduce((s, c) => s + ovCardScore(c), 0);
  const box = $('.ov-demo'); if (box) box.outerHTML = ovDemo();
  sfx(before < OV_BAR && after >= OV_BAR ? 'stamp' : ovCardScore(d.id) < 0 && ui.ovPicked.has(d.id) ? 'thud' : 'clack');
};
// end of the overview: the step-by-step is offered, never forced. Skip is a vote for no hand-holding, so it turns the
// step-by-step off like "I'll find my own way" (round 5, finding 8); Menu > Show me the ropes turns it back on.
ACTS['ov-done'] = (d) => {
  // read again (How to play): page 5's two buttons still set the step-by-step; Close leaves it as it was
  if (ui.ovReturn) {
    if (d.id === 'own' || d.id === 'ropes') { ui.guided = d.id === 'ropes'; store.set('guided', ui.guided); }
    const back = ui.ovReturn; ui.ovReturn = null; go(back);
    if (back === 'pick') {
      if (ui.guided) teachPick();
      // the page was drawn afresh: focus goes back to the button that opened the guide, not to the top of the page
      const b = $('[data-act="ov-replay"]'); if (b) b.focus({ preventScroll: true });
    }
    return;
  }
  if (d.id === 'own' || d.id === 'skip') ui.guided = false; else if (d.id === 'ropes') ui.guided = true;
  store.set('guided', ui.guided); markMet();
  sfx(d.id === 'skip' ? 'clack' : 'stamp');
  toPick();
};
// Before the first game: a newcomer reads the overview; anyone who has been here before goes straight to the suspects.
// Been here before = the overview was closed or a game was started or picked up on this device ('met', which "Start a new
// scandal" keeps), a game is kept here (even one from an older version), or she logged in to an existing account.
// A skip made for her is not her vote, so a step-by-step setting already stored on this device stands. With none stored,
// it starts off for her (she has played before); Menu > Show me the ropes turns it on.
function markMet() { ui.met = true; store.set('met', true); }
const beenHere = () => ui.met || !!store.get('met', false) || !!loadSave();
function teachPick() { teach('pick', 'Pick your girl', 'Tap a suspect to hear her. Hold her photo to read her file.', 'type', 'Show me the ropes'); }
function toPick() { go('pick'); if (ui.guided) teachPick(); }
// `hello` (a headline) prints in the page before the first tip. It is held (teach: true), so no tip queued behind it can
// push it off; it goes on her next tap or its X, and only then does the tip print.
function firstGame(newcomer, hello) {
  ui.ovPage = 0; ui.ovReturn = null; ui.ovPicked = new Set();
  if (!newcomer && store.get('guided', null) === null) { ui.guided = false; store.set('guided', false); }
  go(newcomer ? 'overview' : 'pick');
  if (hello) headline({ ...hello, teach: true });
  if (!newcomer && ui.guided) teachPick();
}
// every whore is After Hours: to bed, and one account-wide digest at dawn (round 4, finding 6; the B-arcade pattern)
ACTS.bed = () => {
  act(L.markSeen, ME, tlOf(ui.active));
  const acc = ui.S.accounts[ME]; const since = Math.min(...acctView().whores.map((x) => acc.seen[x.timeline] || 0));
  const evs = act(L.sleepTillDawn); if (!evs) return;
  sfx('tada'); go('front');
  let hs = L.awayDigest(ui.S, ME, since).headlines;
  if (!hs.length) hs = [{ type: 'nothing', text: C.DIGEST.templates.nothing, relevance: 0, detail: '' }];
  openModal('digest', { wid: ui.active, headlines: hs, travel: 'Dawn over the Eternal District. Three fresh full-pay Curtains each.' });
  ui.modal.onClose = () => { for (const x of acctView().whores) act(L.markSeen, ME, x.timeline); };
};
// the plan screen's inline Kink offer: one tap rummages the fresh stall and buys his novelty (finding 19)
ACTS['plan-buy'] = () => {
  const v = V(); const k = kinkOfferPlace(v); if (!k) return;
  // ask the stallholder for his Kink novelty by name (round 6, finding 1): the engine hands over that item on the fresh roll
  const evs = act(L.explore, ui.active, k.stall.id, { want: k.item.id }); if (!evs) return;
  ui.steps.add('rummage');
  const offer = V().whore.offer;
  if (!offer) { if (ui.modal) closeModal(); render({ keepScroll: true }); headline({ kicker: `Behind ${k.stall.short}`, head: 'Sold out', sub: 'Someone beat you to it. Try another night.' }); return; }
  // never sell her something she was not promised: if the stall offers anything else, no Coin changes hands
  if (offer.item.id !== k.item.id) {
    act(L.passOffer, ui.active); if (ui.modal) closeModal(); render({ keepScroll: true });
    headline({ kicker: `Behind ${k.stall.short}`, head: 'Not tonight, dear', sub: `He has sold it. Your Coin stays in your purse.` });
    return;
  }
  const bought = act(L.buyOffer, ui.active);
  if (!bought) { act(L.passOffer, ui.active); render({ keepScroll: true }); return; }
  const got = bought.find((e) => e.type === 'buy-item');
  if (ui.modal) closeModal();
  sfx('coin');
  // the tray claims only what the engine actually put in her reticule
  ui.item = got ? got.data.item : null;
  render({ keepScroll: true });
  teachFrom(bought, ui.active);
  const inPlay = ui.item === k.item.id ? `+${R.sway.kink} on him tonight, and it's already in play.` : null;
  headline({ kicker: 'Into the reticule', head: brownPaper(C.ITEMS[ui.item || k.item.id].name), sub: decodedLine(bought, ui.active, inPlay) || (inPlay ? `+${R.sway.kink} on ${k.host.short} tonight, and it's already in play.` : 'In your reticule.'), x: 'kink' });
};
ACTS['stall-read'] = (d) => openModal('stallitem', d.id);
ACTS['fork-spread'] = () => openModal('fork');
ACTS['buy-special'] = () => {
  const evs = act(L.buySpecial, ui.active); if (!evs) return;
  sfx('coin'); rerenderBehind(); teachFrom(evs, ui.active); hubPaint(true);
  const b = evs.find((e) => e.type === 'buy-item');
  headline({ kicker: 'The Morning Special', head: brownPaper(b ? C.ITEMS[b.data.item].name : 'It'), sub: decodedLine(evs, ui.active) || (b ? b.text : ''), x: decodedLine(evs, ui.active) ? 'kink' : 'novelty' });
};
ACTS['special-read'] = () => { const sp = V().timeline.special; openFrom('result', { html: `<p class="kicker">The Morning Special</p>${img(sp.item.art, sp.item.name, { cls: '' })}<h2 class="h2">${esc(sp.item.name)}</h2><p class="flav">${esc(sp.item.inspect)}</p><p>${linkTerms(sp.item.publicUse, null)}</p><button class="btn primary block" data-act="close-modal">Close</button>` }); };
ACTS['buy-digs'] = () => {
  const evs = act(L.buyDigs, ui.active); if (!evs) return;
  const e = evs.find((x) => x.type === 'digs'); sfx('tada');
  if (ui.modal && ui.modal.type === 'menu') renderModal();
  rerenderBehind(); renderChrome(); hubPaint(true);
  if (e) headline({ kicker: 'Up in the world', head: C.DIGS[tlOf(ui.active)][e.data.road][e.data.n - 1].name, sub: C.DIGS[tlOf(ui.active)][e.data.road][e.data.n - 1].line, wire: true });
};
// the section index under the Next note (mobile-ux-research §11): jump to a part of the page, or open her stats
// The Market chip (BRIEF2 item 6) opens the market's fold as it jumps there (show-where), since it arrives folded
function secChips(v) {
  const has = (id) => (id === 'doors' || id === 'market' ? sectionOpen(id) : true);
  const chips = [['meanwhile', 'Gents'], ['doors', 'Back doors'], ['market', 'Market'], ['places', 'Tonight'], ['purse', 'Purse']].filter(([id]) => id === 'purse' || has(id));
  return `<nav class="secchips" aria-label="On this page">${chips.map(([id, l]) => (id === 'purse' ? `<button class="chip" data-act="menu" data-id="stats">${esc(l)}</button>` : id === 'market' ? `<button class="chip" data-act="show-where" data-id="market">${esc(l)}</button>` : `<button class="chip" data-act="jump" data-id="${id}">${esc(l)}</button>`)).join('')}</nav>`;
}
ACTS.jump = (d) => { const t = document.getElementById(d.id); if (t) t.scrollIntoView({ behavior: calm() ? 'auto' : 'smooth', block: 'start' }); };
// "Where" links (BRIEF2 items 5 and 6): close any pop-up, go to the front page (leaving a play screen drops the picks, or walks
// away from the job with its 3 cards kept: leaveAssign), open what is locked or folded, then bring the target into view
// and mark it. Ids: door:<place> | doors | special | offer | market | market:<card> | mine:<novelty>.
let spotEl = null; let spotTimer = null;
function clearSpot() { clearTimeout(spotTimer); if (spotEl) spotEl.classList.remove('spot', 'shake'); spotEl = null; }
ACTS['show-where'] = (d) => {
  const [kind, arg] = String(d.id || '').split(':');
  while (ui.modal) closeModal();
  if (kind === 'offer') { if (V().whore.offer) openModal('offer'); return; }
  // a novelty she already carries: Her things opens on its Novelties tab (BRIEF2 5c, N10), wherever she is
  if (kind === 'mine') { ACTS.things({ id: 'novelties' }); return; }
  if (ui.screen !== 'front') go('front');
  // go('front') folds every section again, so what is opened here comes after it
  if (['door', 'doors', 'special'].includes(kind) && !sectionOpen('doors')) ui.unfold.add('doors');
  if (kind === 'market') { if (!sectionOpen('market')) ui.unfold.add('market'); ui.secOpen.add('market'); }
  render({ keepScroll: true });
  let t = kind === 'door' ? $(`#app [data-act="rummage"][data-id="${CSS.escape(arg || '')}"]`)
    : kind === 'doors' ? $('#app #doors')
      : kind === 'special' ? $('#app .special')
        : kind === 'market' ? (arg ? $(`#app [data-act="buy-card"][data-id="${CSS.escape(arg)}"]`) : $('#app #market .sec-head')) : null;
  if (t && kind === 'market' && arg) t = t.closest('.mcol') || t;
  if (!t) return;
  clearSpot();
  // a section's head goes to the top, so what is under it shows; a door, a card or a novelty to the middle
  t.scrollIntoView({ behavior: calm() ? 'auto' : 'smooth', block: t.classList.contains('sec-head') ? 'start' : 'center' });
  t.classList.add('spot'); if (!calm()) t.classList.add('shake');
  spotEl = t; spotTimer = setTimeout(clearSpot, 2500);
  sfx('flip');
};
// "Wrapped in brown paper" is the house line for the first novelty only; after that the head just names it
function brownPaper(name) { const first = !ui.taught.has('brownpaper'); ui.taught.add('brownpaper'); return first ? 'Wrapped in brown paper' : `${bare(name).replace(/^./, (x) => x.toUpperCase())}, in the reticule`; }
ACTS['slum-seal'] = () => { ui.slumOk = true; closeModal(); ACTS.seal(); };
ACTS['short-seal'] = () => { ui.shortOk = true; closeModal(); ACTS.seal(); };
ACTS['short-try'] = (d) => { closeModal(); ACTS.plan({ id: d.id }); };
ACTS.resume = () => { if (!resumeGame()) render(); };
// Create account's die: a random stage name in the field (game/names.js), never the one already there; no focus, so a
// phone keyboard does not jump up over the page
ACTS['nom-roll'] = () => {
  const el = $('#signup-name'); if (!el || signing) return;
  el.value = randomName(Math.random, cleanNom(el.value).value);
  nomState(el, false); noInstead();
  const said = $('#nom-said'); if (said) said.textContent = `Your stage name: ${el.value}`;
  sfx('clack');
};
// The hint under a field doubles as its error line (aria-describedby), so a correction never moves the page about. With
// no text the hint goes back to its own words (data-hint; the Log in fields have none).
function fieldState(el, text) {
  if (!el) return;
  const hint = document.getElementById(el.getAttribute('aria-describedby'));
  if (text) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  if (hint) { hint.textContent = text || hint.dataset.hint || ''; hint.classList.toggle('need', !!text); }
}
// a name field: `bad` is true (too short) or the server's line (a reserved name, say)
function nomState(el, bad) { fieldState(el, bad ? (typeof bad === 'string' ? bad : NOM_SHORT) : ''); }
// As she types: a space becomes an underscore, anything else outside the format is dropped, the caret stays where it was.
// Not mid-composition (an Android keyboard composes whole words): the tidy-up runs when the word is committed.
function tidyNom(el) {
  const at = el.selectionStart ?? el.value.length;
  const c = cleanNom(el.value, at);
  if (c.value !== el.value) { el.value = c.value; try { el.setSelectionRange(c.caret, c.caret); } catch { /* not focused */ } }
  if (el.getAttribute('aria-invalid')) nomState(el, false);
}
const NOM_IDS = ['login-name', 'signup-name'];
const PW_IDS = ['current-password', 'new-password'];
document.addEventListener('input', (e) => {
  const t = e.target; const id = t && t.id;
  if (NOM_IDS.includes(id) && !e.isComposing) tidyNom(t);
  // a change to a name or a password clears its form's status line: it was about what was typed before
  if (NOM_IDS.includes(id) || PW_IDS.includes(id)) formLine(t.form, '');
  if (PW_IDS.includes(id)) fieldState(t, '');
  if (id === 'signup-name') noInstead();
  if (id === 'letter' && ui.letter) ui.letter.text = t.value;
});
document.addEventListener('compositionend', (e) => { if (e.target && NOM_IDS.includes(e.target.id)) tidyNom(e.target); });

// ---- Log in, or Create account (docs/server-api.md §10 and decision 1): two calls, never chained. A refused login stays a
// refused login; a name taken on Create account offers "Log in instead?", which needs another tap. Errors are patched in
// place: a re-render would wipe the password she typed. Success is the form leaving the page after a 2xx response: every
// success path below re-renders the page or closes the sheet. That is how Chrome (WebFormElementObserver: the form removed
// or display:none) and Firefox (form-removal capture) tell a login made with fetch; nothing is pushed onto the history.
// Choosing a form: what was typed is kept (ui.authDraft), the chosen form goes into the slot whole, and focus goes to its
// first empty field (only on this tap: the page never focuses a field by itself). The name crosses into an empty name
// field; a password never crosses over.
ACTS['auth-mode'] = (d, btn) => {
  const slot = $('#authform'); const mode = d.id;
  if (!slot || signing || !AUTH_IDS[mode]) return;
  const was = ui.authMode;
  if (mode !== was) {
    saveDraft();
    const draft = ui.authDraft[mode];
    if (!draft.name && was) draft.name = cleanNom(ui.authDraft[was].name).value;
    ui.authMode = mode;
    slot.innerHTML = mode === 'login' ? loginForm(!slot.closest('#modal') && playableHere()) : signupForm();
    fillDraft();
    // the two choices become tabs once a form is open: the same buttons, restyled in place
    const pick = slot.parentElement.querySelector('.authpick');
    if (pick) {
      pick.className = 'authpick tabs two';
      pick.querySelectorAll('button').forEach((b) => { b.className = ''; b.setAttribute('aria-pressed', String(b.dataset.id === mode)); });
    }
    const lead = $('#acct-lead'); if (lead) lead.textContent = ACCT_LEAD[mode];
    sfx('flip');
  }
  const n = document.getElementById(AUTH_IDS[mode].name); const p = document.getElementById(AUTH_IDS[mode].pw);
  const f = n && !n.value ? n : p; if (f) f.focus();
};
// "Log in instead?" after a taken name: the name goes across (not the password: a browser may have generated a new one
// in that field), and focus goes to the empty Log in password, so a password manager offers the saved login. She taps
// Log in herself.
ACTS['auth-switch'] = () => {
  if (signing) return;
  saveDraft();
  ui.authDraft.login = { name: cleanNom(ui.authDraft.signup.name).value, password: '' };
  ACTS['auth-mode']({ id: 'login' });
};
function noInstead() { const b = $('#login-instead'); if (b) b.remove(); }
function addInstead(after) {
  if ($('#login-instead') || !after) return;
  const b = document.createElement('button'); // built from nodes, never from what the server said
  b.type = 'button'; b.id = 'login-instead'; b.className = 'btn small'; b.dataset.act = 'auth-switch'; b.textContent = 'Log in instead?';
  after.after(b);
}
function formLine(form, text, bad = false) { const el = form && form.querySelector('.formline'); if (el) { el.textContent = text || ''; el.classList.toggle('need', bad); } }
// While a request is in flight the inputs are read-only, never disabled: Chrome takes a form whose fields are all
// unfocusable as gone, so a 2xx from any other request (the page-load /api/me) could pass for a successful login. The
// buttons, the two choices and Play as guest are disabled; `signing` is the re-entry guard.
function formBusy(form, on, text) {
  signing = on; if (!form || !form.isConnected) return;
  form.setAttribute('aria-busy', String(on));
  form.querySelectorAll('input').forEach((i) => { i.readOnly = on; });
  const desk = form.closest('.authdesk');
  [...form.querySelectorAll('button'), ...(desk ? desk.querySelectorAll('.authpick button, [data-act="guest-play"]') : [])].forEach((b) => { b.disabled = on; });
  formLine(form, on ? text : '');
}
// a name as typed, checked as the server checks it (§6); null after saying what is wrong
function readNom(el) {
  const n = cleanNom(el.value).value;
  if (NOM_RE.test(n)) return n;
  el.value = n; nomState(el, true); el.focus(); sfx('thud'); return null;
}
async function logIn(form) {
  if (signing) return;
  const nom = $('#login-name'); const pw = $('#current-password'); if (!nom || !pw) return;
  const n = readNom(nom); if (!n) return;
  if (!pw.value) { fieldState(pw, PW_NONE); pw.focus(); sfx('thud'); return; }
  formBusy(form, true, 'Logging in...');
  const r = await net.login(n, pw.value);
  formBusy(form, false);
  if (r.ok) signedIn(r.data.user, 'login'); else authFail(form, r, 'login');
}
async function signUp(form) {
  if (signing) return;
  const nom = $('#signup-name'); const pw = $('#new-password'); if (!nom || !pw) return;
  noInstead();
  const n = readNom(nom); if (!n) return;
  const len = [...pw.value.normalize('NFC')].length; // characters as the server counts them: an emoji is one
  const bad = !len ? PW_NONE_NEW : len < 8 ? PW_SHORT : len > 128 ? PW_LONG
    : pw.value.normalize('NFC').toLowerCase() === n.toLowerCase() ? PW_NAME : null;
  if (bad) { fieldState(pw, bad); pw.focus(); sfx('thud'); return; }
  formBusy(form, true, 'Creating your account...');
  const r = await net.signup(n, pw.value);
  formBusy(form, false);
  if (r.ok) signedIn(r.data.user, 'signup'); else authFail(form, r, 'signup');
}
// Retry-After, in words: the login lock lasts up to 15 minutes, the new-account one up to an hour (a wait of 55 minutes or
// more reads "about an hour", never "60 minutes")
const waitWords = (s) => (s < 60 ? 'a minute' : s < 3300 ? plural(Math.ceil(s / 60), 'minute') : 'about an hour');
function authFail(form, r, how) {
  sfx('thud');
  if (!form || !form.isConnected) return;
  const nom = form.querySelector('input[name="username"]'); const pw = form.querySelector('input[type="password"]');
  const onTitle = !form.closest('#modal');
  // on the title, the way to play without the server: Play as guest, or the game already on this device
  const meanwhile = onTitle && playableHere() ? 'carry on with the game on this device' : 'play as a guest';
  if (r.code === 'unreachable') {
    formLine(form, onTitle ? `Can't reach the server. ${meanwhile.replace(/^./, (c) => c.toUpperCase())} for now and save online later from the Menu.` : 'Can\'t reach the server. Keep playing and try again later. Nothing is lost.', true);
  } else if (r.code === 'rate-limited') {
    const wait = waitWords(r.retryAfter || 0);
    formLine(form, how === 'login' ? `Too many tries. Try again in ${wait}.` : `Too many new accounts from this connection. Try again in ${wait}${onTitle ? `, or ${meanwhile} for now` : ''}.`, true);
  } else if (r.code === 'bad-login') { fieldState(pw, BAD_LOGIN); pw.focus(); pw.select(); }
  else if (r.code === 'name-taken') { fieldState(nom, NAME_TAKEN); addInstead(document.getElementById(nom.getAttribute('aria-describedby'))); nom.focus(); }
  else if (r.code === 'name-format' || r.code === 'name-reserved') { fieldState(nom, net.msg(r)); nom.focus(); }
  else if (String(r.code).startsWith('password-')) { fieldState(pw, net.msg(r)); pw.focus(); pw.select(); }
  else formLine(form, net.msg(r), true);
}
// Logged in, or a new account. The game on this device takes the server's spelling of the name first; then a login brings
// the cloud game down if there is one (it replaces this device's), else this device's game goes up (net.adopt).
async function signedIn(user, how) {
  const form = authForm();
  if (!user || typeof user.name !== 'string' || !NOM_RE.test(user.name)) { formLine(form, net.msg({}), true); return; }
  const inGame = !!(ui.S && ui.active);
  formBusy(form, true, how === 'login' ? 'Loading your game...' : 'Setting you up...');
  wearName(user.name); if (inGame) saveGame();
  const got = await net.adopt(user, how);
  formBusy(form, false); sfx('stamp');
  // the passwords leave memory, and the next signed-out page works out its form afresh (Log in, with this name)
  ui.authMode = undefined; ui.authDraft = blankDrafts();
  if (how === 'login') markMet(); // an existing account: she has been here before, on some device
  if (inGame) closeModal();
  const head = how === 'login' ? `Logged in as ${user.name}` : `Account created: ${user.name}`;
  const noReset = 'Keep that password safe: there\'s no reset.';
  if (got === 'cloud') {
    const sub = 'Your saved game, just as you left it.';
    if (inGame) { reloadOnto(head, sub); return; }
    if (resumeGame()) headline({ kicker: 'Your account', head, sub, wire: true }); else retitle();
  } else if (got === 'local') {
    if (!inGame) resumeGame();
    headline({ kicker: 'Your account', head, sub: how === 'signup' ? `This game now saves online too. ${noReset}` : 'This game is going up to our server too, so any device can pick it up.', wire: true });
  } else if (got === 'none') {
    // a new account on a device that has never played: the overview; anyone else (a login, or a new account on a device
    // that has played before) goes straight to the suspects
    // the welcome prints in the page (above Next on the overview; not the strip, which would cover it) and stays until her
    // next tap or its X, or until she leaves the page
    firstGame(how === 'signup' && !beenHere(), { kicker: 'Your account', head, sub: how === 'signup' ? noReset : 'No game saved under this name yet.', wire: false });
  } else { retitle(); headline({ kicker: 'Your account', head, sub: 'Your saved game didn\'t load, so this device keeps its own for now.', wire: true }); }
}
// Play as guest: the game that never leaves this device. A game already here is picked up, never started over (that is
// the Menu's "Start a new scandal", behind its confirm sheet); the title hides this button then, so this is a safety net.
// The stage name is the one in Create account if that form is open and the name is good, else a random one
// (game/names.js), which the Menu's Create account offers later. The Log in name is never used: it is an account's.
const WELCOME_BACK = { kicker: 'Welcome back', head: 'Picked up where you left off', sub: 'To start over: Menu, then Start a new scandal.', wire: true };
ACTS['guest-play'] = () => {
  if (resumeGame()) { ui.authMode = undefined; ui.authDraft = blankDrafts(); sfx('stamp'); headline({ ...WELCOME_BACK }); return; }
  const el = $('#signup-name');
  const n = el ? cleanNom(el.value).value : '';
  if (n && !NOM_RE.test(n)) { el.value = n; nomState(el, true); el.focus(); sfx('thud'); return; }
  ui.name = n || randomName();
  ui.authMode = undefined; ui.authDraft = blankDrafts(); // what was typed (a password too) leaves memory
  sfx('stamp'); firstGame(!beenHere());
};
// logged in with no game on this device: a new one, under her nom de plume
ACTS.begin = () => { ui.name = acctName() || randomName(); sfx('stamp'); firstGame(!beenHere()); };
ACTS['sign-out'] = async (d, btn) => {
  if (signing) return; signing = true; if (btn) btn.disabled = true;
  const r = await net.signOut();
  signing = false; if (btn) btn.disabled = false;
  if (!r.ok) { headline({ kicker: 'The front desk', head: 'Still logged in', sub: r.code === 'unreachable' ? 'Can\'t reach our server to log you out. Try again in a minute.' : net.msg(r), wire: true }); return; }
  if (ui.modal && ui.modal.type === 'acct') closeModal();
  ui.authMode = undefined; ui.authDraft = blankDrafts(); // the title opens on Log in again, with this name filled in
  retitle(); sfx('clack');
  headline({ kicker: 'The front desk', head: 'Logged out', sub: 'The game stays on this device as a guest game.', wire: true });
};
// Menu > Keep your game anywhere opens fresh each time: Log in when this device has logged in before, else Create account
// with the guest's stage name filled in
ACTS.acct = () => {
  if (ui.modal) closeModal();
  ui.authDraft = blankDrafts();
  if (NOM_RE.test(ui.name) && ui.name !== 'Anonymous') ui.authDraft.signup.name = ui.name;
  ui.authMode = authOpen('menu');
  openModal('acct'); sfx('flip');
};
ACTS['acct-retry'] = async (d, btn) => {
  if (btn) btn.disabled = true;
  await net.start();
  sfx(net.account().name ? 'stamp' : 'thud');
  if (ui.modal && ui.modal.type === 'acct') renderModal();
};
ACTS.letters = () => { if (ui.modal) closeModal(); openModal('letters'); sfx('flip'); };
ACTS['letter-kind'] = (d) => {
  if (!LETTER[d.id] || !ui.letter) return;
  ui.letter.kind = d.id; renderModal(); sfx('clack');
  const b = $(`#modal [data-act="letter-kind"][data-id="${d.id}"]`); if (b) b.focus({ preventScroll: true });
};
ACTS['letter-star'] = (d) => {
  const n = Number(d.id); if (!ui.letter || !(n >= 1 && n <= 5)) return;
  ui.letter.rating = n; renderModal(); sfx('clack');
  const b = $(`#modal [data-act="letter-star"][data-id="${n}"]`); if (b) b.focus({ preventScroll: true });
};
let posting = false;
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g; // the server takes tab, line feed and return only
async function postLetter() {
  const d = ui.letter; if (!d || posting) return;
  const text = String(($('#letter') || {}).value || '').replace(CTRL, '').trim();
  const hint = $('#letter-hint');
  const say = (t) => { if (hint) { hint.textContent = t; hint.classList.add('need'); } sfx('thud'); };
  if (d.kind === 'rating' && !(d.rating >= 1 && d.rating <= 5)) { say('Pick one to five stars first.'); return; }
  if (d.kind !== 'rating' && !text) { say('The Editor can\'t print a blank letter.'); return; }
  const body = { kind: d.kind, text, context: { screen: ui.screen, version: SAVE_V } };
  if (d.kind === 'rating') body.rating = d.rating;
  posting = true; const btn = $('#letterform [type="submit"]'); if (btn) btn.disabled = true;
  if (hint) { hint.classList.remove('need'); hint.textContent = 'Off to the post room...'; }
  const r = await net.letter(body);
  posting = false; if (btn) btn.disabled = false;
  if (r.ok) {
    ui.letter = null;
    if (ui.modal && ui.modal.type === 'letters') closeModal();
    sfx('stamp');
    headline({ kicker: 'Letters to the Editor', head: 'Posted', sub: fresh('thanks', THANKS), wire: true });
    return;
  }
  say(r.code === 'unreachable' ? 'The post room isn\'t answering. Your letter\'s still here: try again in a minute.' : net.msg(r));
}
ACTS['street-all'] = () => { ui.streetAll = true; render({ keepScroll: true }); sfx('clack'); };
// page 2's gentleman, read before the game begins (finding 24: "tap his face" really opens his card)
ACTS['ov-gent'] = () => openModal('ovgent');
ACTS['ov-replay'] = () => { if (ui.modal) closeModal(); ui.ovReturn = ui.screen; ui.ovPage = 0; ui.ovPicked = new Set(); go('overview'); };
// the Menu
ACTS.menu = (d) => { const tab = d.id === 'stats' ? 'stats' : 'menu'; if (ui.modal && ui.modal.type === 'menu') { ui.modal.data = tab; renderModal(); } else openModal('menu', tab); sfx('flip'); };
ACTS['menu-tab'] = (d) => { if (!ui.modal) return; ui.modal.data = d.id; renderModal(); const t = $(`#tab-${d.id}`); if (t) t.focus({ preventScroll: true }); sfx('clack'); };
// Her things: one tap from the Things button, or a deep link (the Menu, Her stats, a found postcard). A tab id picks the tab;
// "auto" picks the first tab with something new, else the one she used last.
ACTS.things = (d) => {
  if (!ui.S || !ui.active) return;
  const fresh = thingsNew(V());
  const want = HUB_TABS.some(([k]) => k === d.id) ? d.id : (Object.keys(fresh).find((k) => fresh[k].length) || ui.hubTab || 'cards');
  if (ui.modal && ui.modal.type === 'things') { ui.modal.data = want; hubPaint(false); const t = $(`#htab-${want}`); if (t) t.focus({ preventScroll: true }); sfx('clack'); return; }
  if (ui.modal) closeModal();
  openModal('things', want); sfx('flip');
};
ACTS['album-open'] = (d) => { const s = albumSlots(V().whore).find((x) => x.id === d.id); if (s && s.have) openFrom('result', { html: albumDetail(s) }); };
ACTS.codex = () => openModal('codex');
ACTS.guided = () => {
  ui.guided = !ui.guided; store.set('guided', ui.guided);
  if (ui.modal) renderModal();
  sfx('clack');
};
// "What can I tap?": everything that explains itself gets an outline for a few seconds (on the page, not in the menu)
ACTS.whatsthis = () => {
  if (ui.modal) closeModal();
  document.body.classList.add('reveal');
  clearTimeout(ACTS.whatsthis.t);
  ACTS.whatsthis.t = setTimeout(() => document.body.classList.remove('reveal'), 5000);
  headline({ kicker: 'How this paper works', head: 'Tap anything outlined', sub: 'Dotted words explain themselves; hold a card, a face or a novelty to read its back.', wire: true });
};
// the main tray button before a card is picked: points at the hand instead of sitting there greyed out
ACTS['pick-hint'] = () => {
  scrollHandIntoView();
  document.querySelectorAll('.hand.play .card:not(.sel):not(.curse)').forEach((c) => { c.classList.remove('nudge'); void c.offsetWidth; c.classList.add('nudge'); });
  sfx('clack');
};
ACTS.suspect = (d) => {
  ui.pickId = d.id; ui.pickSaid[d.id] = true;
  { const ch = C.CHARACTERS[d.id]; ui.pickLine[d.id] = fresh(`pick-${d.id}`, ch.voices && ch.voices.length ? ch.voices : [ch.voice]); }
  sfx('era', C.CHARACTERS[d.id].timeline);
  render({ keepScroll: true });
};
ACTS['open-char'] = (d) => openModal('char', d.id);
ACTS.hire = () => hire(ui.pickId);
ACTS['hire-from'] = (d) => { closeModal(); hire(d.id); };
ACTS.go = (d) => { if (ui.modal) closeModal(); go(d.id); };
ACTS.end = () => { ui.steps.add('end'); go('end'); sfx('tada'); };
ACTS.note = (d) => {
  // the District clock may have moved since the note was printed: pick the Assignation again at the moment of the tap
  if (d.step === 'assign') { const t = assignTarget(V()); if (!t) { rerenderBehind(); return; } ACTS['open-gent']({ id: t.id }); return; }
  if (d.kind === 'open-gent') ACTS['open-gent'](d);
  else if (d.kind === 'open-offer') openModal('offer');
  else if (d.kind === 'nav') go(d.id);
  else if (d.kind === 'switch') ACTS.switch({ id: d.id });
  else if (d.kind === 'end') ACTS.end();
  else if (d.kind === 'scroll') { const t = document.getElementById(d.id); if (t) { t.scrollIntoView({ behavior: calm() ? 'auto' : 'smooth', block: 'start' }); t.classList.add('shake'); setTimeout(() => t.classList.remove('shake'), 500); } }
};
ACTS['open-gent'] = (d) => {
  openModal('gent', d.id);
  const firstCard = !ui.taught.has('study');
  teach('study', 'Every ? is a secret', 'Study reveals one: his Secret Taste first, then his Kink. Tap the card to flip it.', 'study', 'Tip');
  if (firstCard) ui.modal.onClose = () => teach('hold', 'Hold to flip', 'Hold any card, photo or novelty to read the small print on the back.', 'tell', 'Tip');
};
ACTS.unfold = (d) => { ui.unfold.add(d.id); render({ keepScroll: true }); sfx('flip'); };
ACTS.fold = (d) => { if (ui.secOpen.has(d.id)) ui.secOpen.delete(d.id); else ui.secOpen.add(d.id); render({ keepScroll: true }); sfx('flip'); };
// Round 6 (finding 19): a confirm sheet, never a button that relabels itself under the thumb. "Keep playing" is the big
// button in the thumb zone; "Wipe this game" is a small ghost button at the top of the sheet, away from the spot just
// tapped, and it ignores taps in the first 700 ms (a double tap can never wipe a save).
ACTS.restart = () => { if (ui.modal) closeModal(); openModal('wipe'); ui.wipeArmedAt = performance.now(); sfx('thud'); };
ACTS.wipe = () => {
  if (!ui.wipeArmedAt || performance.now() - ui.wipeArmedAt < 700) return;
  // signed in, the sync record stays (net.cancel keeps it), so the next load does not pull the old cloud game back
  clearTimeout(saveTimer); net.cancel(); store.del('game'); ui.S = null; ui.active = null;
  location.reload();
};
ACTS.why = () => { ui.why = !ui.why; patchPlay(); };
ACTS['take-bet'] = () => { const d = playData(); if (!d || !d.bg.gamble) return; ui.sel = [...d.bg.gamble.cards]; ui.talentOn = false; ui.item = null; sfx('clack'); patchPlay(); };
ACTS['open-offer'] = () => openFrom('offer');
ACTS['open-item'] = (d) => openFrom('item', d.id);
ACTS['open-affl'] = (d) => openFrom('affl', d.id);
ACTS['inspect-card'] = (d) => openFrom('card', [d.src, d.idx]);
ACTS['inspect-market'] = (d) => openModal('card', ['market', d.idx]);
ACTS['buy-card'] = (d) => {
  const evs = act(L.buyCard, ui.active, d.id);
  if (!evs) return;
  sfx('coin'); rerenderBehind();
  const c = C.CARDS[d.id];
  // where the new card is (BRIEF2 item 6): the played pile, so it reaches her hand after the draw pile runs out and is shuffled
  const dc = V().whore.drawCount;
  headline({ kicker: 'The market', head: `Learned: ${c.name}`, sub: `${dc ? `In your deck now. It joins your hand after the next shuffle (${plural(dc, 'card')} to go).` : 'In your deck now, shuffled in for your next hand.'} ${c.flavour}`, x: c.arts.includes('frolic') ? 'itch' : 'arts' });
};
ACTS.profile = (d) => openModal('profile', d.id);
ACTS.gossip = (d) => {
  const evs = act(L.spendGossip, ui.active, d.id);
  if (!evs) return;
  const e = evs.find((x) => x.type === 'gossip-spent');
  sfx('clack');
  if (e) {
    ui.leaning[d.id] = { curtainNo: V().timeline.curtainNo, place: e.data.follows ? null : e.data.tonight, text: e.text };
    headline({ kicker: 'A little bird says', head: e.data.tonight ? `${C.CHARACTERS[d.id].short}: ${C.PLACES[e.data.tonight].short} tonight` : e.data.follows ? `${C.CHARACTERS[d.id].short} is following you` : `${C.CHARACTERS[d.id].short} hasn't decided`, sub: e.text, x: 'gossip' });
  }
  renderModal(); rerenderBehind();
};
ACTS['profile-me'] = () => openModal('profile', ui.active);
ACTS['profile-acct'] = (d) => {
  const lb = L.leaderboards(ui.S);
  const row = lb.whorescore.find((r) => r.account === d.id) || lb.automatons.find((a) => a.account === d.id);
  if (row) openModal('profile', row.whores.map((w) => w.id));
};
ACTS.tab = (d) => { ui.tab = d.id; render({ keepScroll: true }); sfx('clack'); };

ACTS.study = (d) => {
  const evs = act(L.study, ui.active, d.id);
  if (!evs) return;
  sfx('clack');
  ui.steps.add('study');
  if (C.GENTS[d.id] && !ui.studied) ui.studied = d.id;
  const learned = evs.filter((e) => e.type === 'learned');
  const st = evs.find((e) => e.type === 'study');
  if (learned.length) teachFrom(evs, ui.active);
  // a Kink just exposed says where to get it; wire news, so it isn't spiked when his card closes (BRIEF2 5e)
  const kg = learned.some((e) => e.data.facts.includes('kink')) ? V().timeline.gents.find((x) => x.id === d.id) : null;
  const wt = kg ? whereTarget(kg, V()) : null;
  headline({ kicker: 'From the bar', head: learned.length ? (learned[0].data.facts.includes('kink') ? 'Kink exposed' : learned[0].data.facts.includes('secret') ? 'He gives himself away' : 'Noted') : 'Watched and noted', sub: learned.length ? learned.map((e) => e.text).join(' ') : (st ? st.text : ''), ...(wt ? { go: { act: 'show-where', id: wt[0], label: 'Where to get it' }, wire: true } : {}) });
  if (ui.modal) renderModal();
  if (!ui.modal || ui.modal.type !== 'gent') render({ keepScroll: true }); else rerenderBehind();
};
// Re-rendering keeps the section the player was looking at where it was on screen (sections can change order, e.g. the
// first evening's Back doors move below Tonight's Curtain once a back door is done), not the raw scroll offset.
function anchorOf() {
  // the smallest marked block under the centre line (a Back doors list beats its whole section), else the nearest one
  const mid = window.innerHeight / 2;
  const els = [...document.querySelectorAll('#app [data-sec], #app #doors, #app #places')].map((x) => ({ x, r: x.getBoundingClientRect() }));
  if (!els.length) return null;
  const hit = els.filter((e) => e.r.top <= mid && e.r.bottom >= mid).sort((p, q) => p.r.height - q.r.height)[0]
    || els.sort((p, q) => Math.min(Math.abs(p.r.top - mid), Math.abs(p.r.bottom - mid)) - Math.min(Math.abs(q.r.top - mid), Math.abs(q.r.bottom - mid)))[0];
  return { sel: hit.x.dataset.sec ? `[data-sec="${hit.x.dataset.sec}"]` : `#${hit.x.id}`, top: hit.r.top };
}
function restoreAnchor(a, y) {
  const el = a && document.querySelector(`#app ${a.sel}`);
  if (el) window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - a.top); else window.scrollTo(0, y);
}
function rerenderBehind() {
  const f = document.activeElement && document.activeElement !== document.body ? openerOf(document.activeElement) : null; // keeps a pop-up's returned focus
  const y = window.scrollY; const a = anchorOf(); $('#app').innerHTML = SCREENS[ui.screen](); window.scrollTo(0, y); restoreAnchor(a, y); renderChrome(); notePaint(true); if (hlCur && !ui.modal) paintHl();
  if (f && !document.body.contains(f.el)) { const t = openerNow(f); if (t) t.focus({ preventScroll: true }); }
}
// The yellow note: docked above the bottom bar on the first evening (always on screen); after that, when a step is done
// and the page did not scroll to the top, the next note is brought into view so "what next" is never off-screen.
function notePaint(keptScroll) {
  const n = ui.screen === 'front' ? $('#app .note') : null;
  const docked = !!(n && n.classList.contains('docked'));
  document.body.classList.toggle('note-docked', docked);
  document.body.style.setProperty('--note-h', `${docked ? Math.round(n.getBoundingClientRect().height) + 8 : 0}px`);
  if (!n) return;
  const step = n.dataset.step;
  if (keptScroll && !docked && ui.lastNoteStep && step !== ui.lastNoteStep && !ui.modal) {
    const r = n.getBoundingClientRect();
    if (r.top < 70 || r.bottom > window.innerHeight - 70) n.scrollIntoView({ behavior: calm() ? 'auto' : 'smooth', block: 'start' });
  }
  ui.lastNoteStep = step;
}

ACTS.rummage = (d) => {
  const evs = act(L.explore, ui.active, d.id);
  if (!evs) return;
  ui.steps.add('rummage');
  const ex = evs.find((e) => e.type === 'explore');
  const v = V();
  rerenderBehind();
  if (v.whore.offer) {
    sfx('whoosh');
    openModal('offer');
    teach('flip', 'Something under the counter', '', 'kink', 'Under the counter');
  } else if (ex && ex.data.postcard) {
    const pc = C.POSTCARDS[v.whore.timeline].find((p) => p.id === ex.data.postcard);
    openModal('result', { html: `<p class="kicker">Found behind ${esc(C.PLACES[d.id].short)}</p><h2 class="h2">A saucy postcard</h2><div class="postcard">${img(pc.art, pc.name)}<p><b>${esc(pc.name)}.</b> ${esc(pc.caption)}</p></div><button class="btn primary block" data-act="things" data-id="album">Into the album</button>` });
  } else {
    sfx(ex && ex.data.coin ? 'coin' : 'clack');
    headline({ kicker: `Behind ${C.PLACES[d.id].short}`, head: ex && ex.data.coin ? `${ex.data.coin} Coin under the floorboards` : 'A juicy bit of gossip', sub: ex && ex.data.coin ? 'Finders keepers.' : 'Trade it later to learn where a rival went.', x: ex && ex.data.coin ? 'coin' : 'gossip' });
    evs.filter((e) => e.type === 'learned').forEach((e) => headline({ kicker: 'Decoded a Tell', head: 'Noted, discreetly', sub: e.text }));
  }
};
ACTS.buy = () => {
  const evs = act(L.buyOffer, ui.active);
  if (!evs) return;
  sfx('coin'); closeModal(); rerenderBehind();
  const b = evs.find((e) => e.type === 'buy-item');
  headline({ kicker: 'Into the reticule', head: brownPaper(b ? C.ITEMS[b.data.item].name : 'It'), sub: decodedLine(evs, ui.active) || (b ? b.text : ''), x: decodedLine(evs, ui.active) ? 'kink' : undefined });
};
ACTS.pass = () => { act(L.passOffer, ui.active); closeModal(); rerenderBehind(); headline({ kicker: 'The stallholder', head: 'Suit yourself, love', sub: 'He melts back into the crowd.' }); };
ACTS.drop = (d) => { act(L.dropItem, ui.active, Number(d.id)); closeModal(); rerenderBehind(); };
ACTS.cure = (d) => {
  const evs = act(L.cure, ui.active, d.id);
  if (!evs) return;
  closeModal(); sfx('coin'); rerenderBehind();
  const e = evs.find((x) => x.type === 'cure');
  headline({ kicker: 'The quack', head: 'Cured!', sub: e ? e.text : '' });
};

ACTS['start-assign'] = (d) => {
  if (ui.modal) closeModal();
  const v = V();
  if (v.whore.assignation && v.whore.assignation.gent !== d.id) act(L.cancelAssignation, ui.active);
  if (!V().whore.assignation) { const evs = act(L.startAssignation, ui.active, d.id); if (!evs) return; }
  resetPicks();
  ui.screen = 'assign'; render();
  const tourist = !!C.TOURISTS[d.id];
  if (!(tourist && window.innerHeight < 740)) requestAnimationFrame(scrollHandIntoView);
  sfx('whoosh');
  if (tourist) teach('tick', 'Tick! He likes it', 'Cards carrying his Taste get a ✓ and +1 Sway. Tap the glowing ones: they are safe bets.', 'tick');
  else {
    teach('lazy', 'Best Guess, or better?', 'The dashed mark is what Best Guess would score. Study him and bring a novelty to beat it.', 'bestguess');
    teach('bar', 'Mind the Bar', 'Reach his Bar and he\'s Satisfied. Beat it by 3 and he\'s Delighted.', 'bar');
  }
};
ACTS.pick = (d) => {
  const i = Number(d.idx);
  const max = ui.screen === 'assign' ? R.assignMaxCards : R.maxCurtainCards;
  const pos = ui.sel.indexOf(i);
  if (pos >= 0) ui.sel.splice(pos, 1);
  else { if (ui.sel.length >= max) ui.sel.shift(); ui.sel.push(i); }
  ui.deArt = null; ui.bgPicked = false;
  sfx('clack');
  patchPlay();
  const v = V();
  const hasCross = document.querySelector('.hand.play .card.sel .mk.bad');
  if (hasCross) teach('aversion', 'Crossed! He hates it', 'A card carrying his Aversion loses 2. Leave it in your purse.', 'aversion');
  if (ui.screen === 'plan') {
    const pv = L.previewEncounter(v, { place: ui.place, cards: ui.sel });
    if (pv.itch > 0) teach('itchw', 'Frolic gives you the Itch', 'With a Fair or Ripe gentleman each Frolic card adds Itch. At 3 you catch something.', 'itch');
  }
};
// The Best Guess button replaces the cards only: a novelty or Talent she switched on stays on (the engine's pure Best Guess
// still drives the bots and the smileys). With no novelty on, it packs the ready novelty that scores most, so the Kink
// item the tutorial had her buy is never thrown away. In an Assignation it packs one only when that lifts the outcome
// (Fizzled, Satisfied, Delighted) and it is not the novelty saved for tonight's host.
function bestGuessPick(d) {
  const v = d.v; const base = d.mode === 'assign' ? { gent: d.gid } : d.p.id;
  if (ui.item) return { cards: L.bestGuess(v, base, { item: ui.item }).cards, item: ui.item };
  const plain = L.bestGuess(v, base);
  let best = { cards: plain.cards, sway: plain.sway, item: null };
  const tier = (s) => (d.mode !== 'assign' ? s : s >= d.delight ? 2 : s >= d.bar ? 1 : 0);
  const saved = d.mode === 'assign' ? savedItem(v) : null;
  for (const it of v.whore.items.filter((x) => x.ready)) {
    if (saved && saved.item.id === it.id) continue;
    const b = L.bestGuess(v, base, { item: it.id });
    if (b.cards.length && tier(b.sway) > tier(best.sway)) best = { cards: b.cards, sway: b.sway, item: it.id };
  }
  return best;
}
function bestGuessAct() {
  const d = playData(); if (!d) return null;
  const pick = bestGuessPick(d);
  ui.sel = [...pick.cards]; ui.item = pick.item; ui.deArt = null;
  ui.bgPicked = true;
  sfx('clack'); patchPlay();
  requestAnimationFrame(scrollHandIntoView);
  return pick;
}
ACTS['best-guess-a'] = () => { bestGuessAct(); };
ACTS['best-guess-p'] = () => {
  const pick = bestGuessAct(); if (!pick) return;
  const it = pick.item ? V().whore.items.find((x) => x.id === pick.item) : null;
  teach('bg', 'Three taps will do', it ? `Pick a Place, press Best Guess, seal. Your ${bare(it.name)} stays in play. Thinking harder wins more.` : 'Pick a Place, press Best Guess, seal. Thinking harder wins more.', 'bestguess');
};
ACTS['item-toggle'] = (d) => { ui.item = ui.item === d.id ? null : d.id; sfx('clack'); patchPlay(); };
ACTS['talent-toggle'] = () => { ui.talentOn = !ui.talentOn; ui.deArt = null; sfx('clack'); patchPlay(); teach('talent', 'A Talent: once per Curtain', 'Each whore has one trick. Use it where it counts.', 'talent'); };
// the Double Entendre Art button cycles the Art on the card the Talent is using (the player's override of the engine's pick)
ACTS['de-art'] = () => {
  const v = V(); const mode = ui.screen === 'plan' ? 'plan' : 'assign';
  const tp = talentPlay(v, mode); if (!tp) return;
  const src = mode === 'plan' ? v.whore.hand : v.whore.assignation.lent;
  const card = src.find((c) => c.idx === tp.card); if (!card) return;
  const opts = C.ART_IDS.filter((a) => !card.arts.includes(a));
  ui.deArt = { card: tp.card, art: opts[(opts.indexOf(tp.art) + 1) % opts.length] };
  sfx('clack'); patchPlay();
};
ACTS.stake = () => { ui.stake = !ui.stake; patchPlay(); };
ACTS.bribe = () => { ui.bribe = !ui.bribe; patchPlay(); };
ACTS.grease = (d) => { ui.grease = Number(d.id); patchPlay(); };
ACTS.slum = () => { ui.slumOk = !ui.slumOk; patchPlay(); };
ACTS['quick-change'] = () => {
  const i = ui.sel[ui.sel.length - 1];
  const evs = act(L.useTalent, ui.active, { kind: 'quick-change', card: i });
  if (!evs) return;
  const e = evs.find((x) => x.type === 'talent');
  ui.sel = []; render({ keepScroll: true }); sfx('whoosh');
  headline({ kicker: 'Behind the screen', head: 'Quick Change!', sub: e ? e.text : '' });
};
ACTS['read-room'] = () => {
  const evs = act(L.useTalent, ui.active, { kind: 'read-the-room', place: ui.place });
  if (!evs) return;
  teachFrom(evs, ui.active);
  const l = evs.find((x) => x.type === 'learned');
  headline({ kicker: 'Read the Room', head: 'One glance at his cufflinks', sub: l ? l.text : '' });
  render({ keepScroll: true });
};
ACTS['cancel-assign'] = () => { act(L.cancelAssignation, ui.active); go('front'); };

const TIER_N = { fizzled: 0, satisfied: 1, delighted: 2 };
ACTS['play-assign'] = async () => {
  const d = assignData(); if (!d) return;
  const talent = talentPlay(d.v, 'assign');
  const bgSway = d.bgPrev.sway; const bgCards = d.bg.cards;
  const bgPay = L.assignationPay(d.v, bgSway, bgCards);
  const firstDelight = !d.tourist && !ui.delightedOnce.has(d.gid) && !(d.v.whore.history[d.gid] && d.v.whore.history[d.gid].delighted);
  const play = { cards: [...ui.sel] }; if (ui.item) play.item = ui.item; if (talent) play.talent = talent;
  const pure = bgCards.length > 0 && sameSet(ui.sel, bgCards) && !ui.item && !talent;
  const knownBefore = d.g ? { kink: !!d.g.known.kink, secret: !!d.g.known.secret } : { kink: true, secret: true };
  const fizzleRaw = d.tourist ? null : fizzleAdvice(d);
  const evs = act(L.playAssignation, ui.active, play);
  if (!evs) return;
  const res = evs.find((e) => e.type === 'assignation');
  const out = res.data.outcome; const tourist = d.tourist;
  ui.steps.add(tourist ? 'tourist' : 'assign');
  if (!tourist) { const j = (ui.jobs[ui.active] && ui.jobs[ui.active].day === ui.S.day) ? ui.jobs[ui.active] : (ui.jobs[ui.active] = { day: ui.S.day, by: {} }); j.by[d.gid] = (j.by[d.gid] || 0) + 1; }
  if (bgCards.length && !pure) ui.think.renown += res.data.renown - bgPay.renown;
  const bar = res.data.bar;
  const bgOut = { delighted: 'Delighted', satisfied: 'Satisfied', fizzled: 'Fizzled' }[bgPay.outcome] || 'Satisfied';
  const wid = ui.active; const v = V();
  const kinkWin = out !== 'fizzled' && res.data.breakdown && res.data.breakdown.kinkHit;
  if (out === 'delighted' && !tourist) ui.delightedOnce.add(d.gid);
  // the money-in-hand plate is kept for a Curtain won outright (round 4, finding 40); here the rare look marks a Kink win or a
  // gentleman's first Delight, her pleased look any other success, the caught one a fizzle
  const look = out === 'fizzled' ? CAUGHT_LOOK[wid] : kinkWin || (out === 'delighted' && firstDelight) ? RARE_LOOK[wid] : PLEASED_LOOK[wid];
  const hero = `<div class="hero">${img(exprArt(wid, look), v.whore.name, { eager: true, pos: '50% 30%' })}</div>`;
  const clips = clipsFor(evs, wid);
  // the punchline goes first, straight under the stamp; the numbers follow
  const gagIdx = clips.findIndex((c) => c.startsWith('<div class="postcard'));
  const gag = gagIdx >= 0 ? clips.splice(gagIdx, 1)[0] : '';
  // a hidden bonus that fired: straight under the numbers, before the hindsight (it explains the number)
  const isSurprise = (c) => c.startsWith('<div class="clip win surprise');
  const surprise = clips.filter(isSurprise).join('');
  for (let i = clips.length - 1; i >= 0; i--) if (isSurprise(clips[i])) clips.splice(i, 1);
  const best = out === 'delighted' && (tourist || res.data.sway >= bgSway);
  let cmp = '';
  const gainR = res.data.renown - bgPay.renown;
  // a play that caught something or moved her meters against her road is a gamble that paid, not thinking (finding 11)
  const caught = evs.some((e) => e.type === 'catch' && (e.whores || [])[0] === wid);
  const mv = evs.find((e) => e.type === 'meter' && (e.whores || [])[0] === wid);
  const road = L.roadOf(d.v.whore);
  const against = !!(mv && ((road === 'standing' && mv.data.after.notoriety > mv.data.before.notoriety) || (road === 'notoriety' && mv.data.after.standing > mv.data.before.standing)));
  const luck = pure && !tourist && res.data.sway > bgSway ? luckLine(res.data.breakdown, knownBefore, res.data.sway - bgSway, d.who.short) : null;
  if (pure && !tourist && res.data.sway > bgSway) cmp = luck ? happyClip(luck) : '';
  else if (best && !caught && !against) cmp = `<p class="clip win"><b class="h3">Top marks</b> ${esc(fresh('topmarks', TOP_MARKS))}</p>`;
  else if (bgCards.length && !pure && gainR > 0) cmp = caught || against
    ? `<p class="clip"><b class="h3">A gamble that paid</b> Best Guess: ${bgSway} Sway, ${bgOut}, +${bgPay.renown} Renown. You: ${res.data.sway} Sway, +${res.data.renown} Renown${caught ? ', and something to remember him by' : ''}${against ? `, and a step toward ${road === 'standing' ? 'the Police Gazette' : 'the Society Pages'}` : ''}.</p>`
    : `<p class="clip win"><b class="h3">Thinking pays</b> You: ${res.data.sway} Sway, ${out === 'delighted' ? 'Delighted' : 'Satisfied'}, +${res.data.renown} Renown. Best Guess: ${bgSway} Sway, ${bgOut}, +${bgPay.renown}.</p>`;
  else if (bgCards.length && TIER_N[bgPay.outcome] > TIER_N[out]) cmp = `<p class="clip"><b class="h3">Hindsight</b> Best Guess would have scored ${bgSway} (${bgOut}).</p>`;
  const fizzleWhy = out === 'fizzled' && fizzleRaw && d.g ? adviceOnce(d.g.id, fizzleRaw[0], fizzleRaw[1] || fresh('study-nudge', STUDY_NUDGE)(d.g)) : '';
  if (out === 'fizzled' && fizzleWhy) cmp += `<p class="clip hind"><b class="h3">What would have done it</b> ${esc(fizzleWhy)}</p>`;
  else if (!cmp && bgCards.length && !tourist && res.data.sway === bgSway) { const nx = nextAdvice(d); cmp = `<p class="small">Same as Best Guess (${bgSway}).${nx ? ` ${esc(nx)}` : ''}${nx && d.g.known.secret && d.g.known.kink ? ` ${whereBtn(d.gid)}` : ''}</p>`; }
  sfx(out === 'fizzled' ? 'sad' : 'stamp');
  if (out !== 'fizzled') setTimeout(() => sfx(out === 'delighted' ? 'tada' : 'coin'), 250);
  openModal('result', { html: `
    <p class="kicker">${esc(C.TIMELINES[v.whore.timeline].gazette)}</p>
    <span class="stamp big pop ${out === 'fizzled' ? '' : 'good'}">${out}</span>
    ${gag ? hero.replace('class="hero', 'class="hero mid') : hero}
    <h2 class="h2">${esc(res.data.reaction || res.text)}</h2>
    <div class="payline"><span>${res.data.sway}<small><button class="x" data-x="sway">Sway</button> · <button class="x" data-x="bar">Bar</button> ${bar} · Delight ${bar + R.assign.delightMargin}</small></span><span>+${res.data.renown}<small><button class="x" data-x="renown">Renown</button></small></span><span>+${res.data.coin}<small><button class="x" data-x="coin">Coin</button></small></span>${res.data.gossip ? `<span>+${res.data.gossip}<small><button class="x" data-x="gossip">Gossip</button></small></span>` : ''}</div>
    ${surprise}
    ${cmp}
    ${gag}
    <div class="clip-list">${clips.join('')}</div>
    <button class="btn primary block" data-act="close-modal" data-autofocus>${tourist ? 'Read the front page' : 'Back to the front page'}</button>` });
  ui.modal.onClose = () => { go('front'); teachFrom(evs, wid); catchFrom(evs, wid, () => aftermath(evs, wid)); };
};

ACTS.plan = (d) => {
  const v = V(); const p = v.timeline.places.find((x) => x.id === d.id);
  if (!p.open) { headline({ kicker: 'At the door', head: 'Madam is not receiving', sub: `${C.LINES.postShut} ${wayBack(v)}`, x: 'notoriety' }); sfx('thud'); return; }
  if (v.whore.assignation) act(L.cancelAssignation, ui.active);
  ui.place = d.id; resetPicks();
  const kinkIt = packKinkItem();
  ui.screen = 'plan'; render(); sfx('whoosh');
  requestAnimationFrame(scrollHostIntoView);
  const host = V().timeline.gents.find((g) => g.id === V().timeline.rota[0].hosts[d.id]);
  // round 5 (finding 11): Allure is introduced the first time a House Rule changes a card's Allure here
  { const pd = planData(); if (pd && pd.w.curtains > 0 && !ui.taught.has('allure') && pd.w.hand.some((c) => (c.arts || []).some((a) => pd.p.house.arts[a]))) { teach('allure', 'Allure: a card\'s own strength', `${pd.p.house.name} changes it here: ${pd.p.house.text}`, 'allure'); ui.taught.add('allure'); render({ keepScroll: true }); } }
  if (kinkIt) teach('plan', 'Plan your evening', `Your ${bare(kinkIt.name)} is already in play (+${R.sway.kink} on ${host.short}). Press Best Guess, then Seal it.`, 'kink');
  else teach('plan', 'Plan your evening', 'Pick up to 3 cards for tonight\'s host, or press Best Guess. Then seal it.', 'bestguess');
};
// Entering a plan: a ready novelty that fires tonight's host's Kink goes into play at once (the yellow note promised it).
function packKinkItem() {
  const d = planData(); if (!d || ui.item) return null;
  const k = itemGains(d).find((x) => x.kink);
  if (!k) return null;
  ui.item = k.it.id;
  return k.it;
}

ACTS.seal = async () => {
  const pd = planData();
  if (pd && pd.firstGutter && !ui.slumOk && L.roadOf(pd.v.whore) !== 'notoriety') { openModal('slum'); return; }
  // round 6 (finding 4): a play short of the Bar asks once before it goes out (door gift only), with a Place that can win
  if (pd && ui.sel.length && pd.pv.sway < pd.bar && !ui.shortOk) { openModal('short'); return; }
  const v = V(); const wid = ui.active; const tl = v.whore.timeline;
  const talent = talentPlay(v, 'plan');
  const plan = { place: ui.place, cards: [...ui.sel], grease: ui.grease };
  if (ui.item) plan.item = ui.item; if (talent) plan.talent = talent; if (ui.stake) plan.stake = true; if (ui.bribe) plan.bribe = true;
  // hindsight is taken at the seal from what she could see; a plan that is exactly an unstudied Best Guess earns no credit
  const hind = hindsightAt(v, ui.place, plan);
  const evs = act(L.sealPlan, wid, plan);
  if (!evs) return;
  (ui.hinds ||= {})[wid] = hind;
  sfx('stamp');
  const cur = evs.find((e) => e.type === 'curtain' && e.timeline === tl);
  if (!cur) { onSealedWait(wid); return; }
  await showCurtain(wid, evs, 'Everyone has sealed. The Curtain falls early.');
};
// A sealed whore waits for the stand-ins to seal (or for her Curtain clock): the front page says so, and points elsewhere.
function onSealedWait(wid) {
  const v = V(wid); const s = v.timeline.sealing;
  // the house line once; after that a plain head (round 5, finding 20: chrome lines become the most repeated jokes)
  const first = !ui.taught.has('sealkiss'); ui.taught.add('sealkiss');
  headline({ kicker: 'Sealed', head: first ? 'Sealed with a kiss' : `Sealed for ${C.PLACES[v.whore.plan ? v.whore.plan.place : ui.place].short}`, sub: s ? sealText(wid) : C.LINES.seal, x: 'curtain' });
  go('front');
}
// The Curtain fell on a whore who had sealed (at her seal, or later on the District clock): drop it and print the edition.
async function showCurtain(wid, evs, line) {
  const tl = tlOf(wid);
  const cur = evs.find((e) => e.type === 'curtain' && e.timeline === tl);
  const payEv = evs.find((e) => e.type === 'payout' && e.whores[0] === wid);
  if (!cur || !payEv) return;
  const hind = (ui.hinds || {})[wid] || null; if (ui.hinds) delete ui.hinds[wid];
  ui.hind = hind;
  if (ui.modal) closeModal();
  if (ui.active !== wid) return; // she is not on screen: the wire and the digest carry it
  await curtainDrop(tl, line);
  const pay = payEv.data;
  if (hind && !hind.pure) ui.think.renown += pay.renown - L.curtainWhatIf(cur.data, pay.place, wid, hind.blindSway, { fullPay: pay.fullPay }).renown;
  ui.result = { tl, place: pay.place, curtain: cur, pay, clips: clipsFor(evs, wid), unlock: evs.find((e) => e.type === 'timeline-unlocked') || null, evs };
  // the split lesson prints in the edition itself (under the clash), never over the standings
  ui.result.splitTip = !ui.taught.has('split'); ui.taught.add('split');
  ui.steps.add('curtain');
  const hold = calm() ? 2500 : 3500; // the spin plus a reading pause: no headline prints over it
  ui.resultsHoldUntil = Date.now() + hold;
  leaveAssign(); // the Curtain fell while she was on a job: she walks away from it (BRIEF2 5d)
  ui.screen = 'results'; render();
  setTimeout(hlReflow, hold + HL.retryMs / 4);
  sfx(pay.rank === 0 ? 'tada' : pay.rank === null ? 'sad' : 'coin');
  if (pay.rank === null) teach('brave', 'Chin up', C.LINES.braveFace, 'braveface');
  if (pay.upstaged) {
    const pr = cur.data.places.find((x) => x.place === pay.place);
    const tiedNow = pay.rank !== null && pr.entries.filter((e) => e.rank === pay.rank).length > 1;
    if (tiedNow) teach('upstaged', 'Upstaged!', `She knocked ${pay.upstaged} off you: you tied instead of winning outright. Beat her by 3, or be nowhere near her.`, 'upstage');
    else teach('upstaged', 'Upstaged!', 'Her Talent cut 2 Sway from whoever finished just above her: you. Beat her by 3, or study her before the next Curtain.', 'upstage');
  }
  // Standing / Notoriety / Itch lessons wait until the reader leaves the results (they are already in the edition)
  catchFrom(evs, wid);
}
async function curtainDrop(tl, line) {
  ui.overlays++; hlReflow();
  const a = artOf(C.TIMELINES[tl].skin.textures.curtain);
  const el = document.createElement('div');
  el.className = 'curtain';
  if (a) el.style.setProperty('--curtain-img', `url("${a.src}")`);
  el.innerHTML = `<div><div class="h1">The Curtain falls<br>on ${esc(C.TIMELINES[tl].short)}</div><p class="type" style="color:var(--paper-l);text-align:center;margin-top:10px">${esc(line)}</p></div>`;
  $('#layer').appendChild(el); syncPin();
  sfx('curtain');
  await wait(calm() ? 1300 : 1700, true); // a reading hold: reduced motion keeps it
  el.classList.add('lift');
  await wait(650);
  el.remove(); syncPin();
  ui.overlays = Math.max(0, ui.overlays - 1);
}
ACTS['after-results'] = () => {
  const r = ui.result;
  if (r && !r.taught) { r.taught = true; setTimeout(() => teachFrom(r.evs, ui.active), 600); }
  go('front');
  if (r && !r.after) { r.after = true; aftermath(r.evs, ui.active); }
};
ACTS['tg-go'] = () => { closeModal(); go('timelines'); };

// Leaving a whore at last call asks first; "Let her go" sends her out by Standing Order now, "Seal now" opens her plan.
function guardLastCall(next) {
  const here = ui.active && curtainIn(tlOf(ui.active)) <= 1 && !(V().whore.plan && V().whore.plan.sealed);
  if (!here) return false;
  if (ui.modal) closeModal();
  openModal('confirm', { wid: ui.active, next });
  return true;
}
ACTS['lc-seal'] = () => {
  const v = V(); const pick = L.standingOrderPick(v);
  closeModal();
  if (v.whore.assignation) act(L.cancelAssignation, ui.active);
  ui.place = pick.place; resetPicks(); ui.sel = [...pick.cards]; packKinkItem(); ui.screen = 'plan'; render(); requestAnimationFrame(scrollHostIntoView);
};
ACTS['lc-let'] = () => {
  const m = ui.modal; const next = m && m.data.next; const tl = tlOf(m.data.wid);
  closeModal();
  act(L.markSeen, ME, tl); ui.keepNews = tl; // her Standing Order is news for when you come back to her
  const evs = act(L.advanceClock, Math.max(1, curtainIn(tl)));
  if (evs) { onBackground(evs, true); if (evs.some((x) => x.type === 'curtain' && x.timeline === tl)) ui.news.add(tl); }
  if (next) ACTS[next.act]({ id: next.id }, null, null, true);
};
ACTS['open-tl'] = (d, el, e, confirmed) => {
  if (!confirmed && guardLastCall({ act: 'open-tl', id: d.id })) return;
  // Round 4 (finding 16): the journey only takes time when the new Timeline's Curtain is about to fall (under 45 minutes)
  // AND skipping it leaves every one of her own Curtains at least 30 minutes away; otherwise she goes straight there. No
  // clock is ever bent to make room (the engine stays the authority).
  const tl = tlOf(d.id);
  const cin = curtainIn(tl);
  const minMine = Math.min(...acctView().whores.map((x) => curtainIn(x.timeline)));
  const trip = cin < 45 && cin + 1 <= minMine - 30 ? cin + 1 : 0;
  if (trip > 0) { const bg = act(L.advanceClock, trip); if (bg) onBackground(bg); }
  const evs = act(L.openTimeline, ME, d.id);
  if (!evs) return;
  const travel = trip ? `${{ wildwest: 'The night coach to Dakota', vegas: 'The red-eye to Las Vegas', victorian: 'The boat train to London' }[tl]} got in just as their Curtain came down. The clock kept running everywhere else.` : null;
  ui.steps.add('second');
  switchTo(d.id, true, travel);
};
ACTS.switch = (d, el, e, confirmed) => {
  if (d.id === ui.active) { go('front'); return; }
  if (!confirmed && guardLastCall({ act: 'switch', id: d.id })) return;
  switchTo(d.id, false);
};
// The era change is the skin system's signature moment: textures first, then the wash, then the gossip sheet.
// The digest opens in the same frame as the new skin (the wash plays under its scrim), so the new front page is never
// seen half-drawn first. A short hop with no news about her gets a one-line strip on the front page instead of a pop-up.
async function switchTo(wid, fresh, travel) {
  leaveAssign(); // before ui.active changes, or the job stays open behind her (BRIEF2 5d)
  const old = ui.active;
  if (old && old !== wid && ui.keepNews !== tlOf(old)) act(L.markSeen, ME, tlOf(old));
  if (old && old !== wid) ui.leftAt[tlOf(old)] = ui.S.clock;
  ui.keepNews = null;
  const tl = tlOf(wid);
  await preloadSkin(tl);
  ui.active = wid; ui.news.delete(tl);
  const seen = acctView().seen[tl] || 0;
  // the engine ranks what changed AND what matters now (tonight's matchup, last call); a fresh arrival does not repeat the
  // telegram that brought her
  let hs = L.awayDigest(ui.S, wid, seen, { tonight: true }).headlines;
  if (fresh) hs = hs.filter((h) => h.type !== 'timeline-unlocked');
  if (!hs.length) hs = [{ type: 'nothing', text: C.DIGEST.templates.nothing, relevance: 0, detail: '' }];
  const away = ui.leftAt[tl] != null ? ui.S.clock - ui.leftAt[tl] : Infinity;
  const aboutHer = hs.some((h) => h.relevance >= 60 && h.type !== 'tonight');
  const done = () => {
    act(L.markSeen, ME, tl);
    if (!fresh) teach('digest', 'While You Were Away', 'At most five headlines, the ones that matter to you first. You get one every time you come back.', 'digest');
  };
  setEra(tl);
  // her first visit: the arrival card (While You Were Away is for coming back)
  if (fresh) { ui.strip = null; go('front', { noScroll: false }); openModal('arrive', { wid, travel }); ui.modal.onClose = done; return; }
  if (!fresh && !aboutHer && away < ui.S.opts.maxGapMin) {
    ui.strip = { wid, headlines: hs, travel: `Back in ${C.TIMELINES[tl].short}.` };
    go('front'); done(); return;
  }
  ui.strip = null;
  go('front', { noScroll: false });
  openModal('digest', { wid, headlines: hs, travel: travel || (fresh ? null : `Back in ${C.TIMELINES[tl].short}.`) });
  ui.modal.onClose = done;
}
// the one-line While You Were Away strip (a short hop): top headline, tap for the full sheet, X to dismiss
function stripHTML() {
  const st = ui.strip; if (!st || st.wid !== ui.active) return '';
  const h = st.headlines[0];
  return `<div class="awaystrip"><button class="link" data-act="strip-open"><span class="kicker">While you were away</span> ${escE(h.text)}${st.headlines.length > 1 ? ` <span class="small">+${st.headlines.length - 1} more</span>` : ''}</button><button class="close" data-act="strip-close" aria-label="Dismiss">&times;</button></div>`;
}
ACTS['strip-open'] = () => { const st = ui.strip; if (!st) return; ui.strip = null; openModal('digest', { wid: st.wid, headlines: st.headlines, travel: st.travel }); };
ACTS['strip-close'] = () => { ui.strip = null; rerenderBehind(); };
ACTS['digest-plan'] = (d) => { closeModal(); ACTS.plan({ id: d.id }); };
ACTS['digest-more'] = (d) => { if (!ui.modal) return; const i = Number(d.id); ui.modal.open = ui.modal.open === i ? null : i; renderModal(); };

// ---------------------------------------------------------------------------
// Starting a whore
// ---------------------------------------------------------------------------
function hire(id) {
  if (!id) return;
  ui.S = L.newGame(SEEDS[id], gameOpts(id, ui.name));
  ui.active = id; ui.firstTl = tlOf(id);
  markMet();
  armBack();
  setEra(tlOf(id));
  sfx('stamp');
  const ch = C.CHARACTERS[id]; const TL = C.TIMELINES[ch.timeline];
  ui.screen = 'arrival'; render();
  openModal('result', { html: `
    <p class="kicker">${esc(TL.gazette)}</p>
    <h1 class="h1">${ransom(`${ch.short.toUpperCase()} ARRIVES`)}</h1>
    <p class="h3">${esc(TL.name)} · ${esc(TL.quarter)}</p>
    <div style="width:170px;margin:0 auto">${photo(ch.art, ch.name, `<b>${esc(ch.name)}</b>${esc(ch.epithet)}`, { eager: true })}</div>
    <p class="deck">${esc(ui.pickSaid[id] ? (fresh(`pick-${id}`, ch.voices && ch.voices.length ? ch.voices : [ch.voice]) || `${ch.name}, ${ch.epithet}.`) : (voiceFor(id, 'arrival') || ch.temperamentText))}</p>
    <p class="small" style="text-align:center;margin:0">She's best at ${artLabel(ch.signature)}. For now she's a humble <button class="x" data-x="eratitle">${esc(L.eraTitle(ch.timeline, 'common', 'standing'))}</button>.</p>
    ${rivalLine(ch.timeline)}
    <button class="btn primary block" data-act="close-modal" data-autofocus>Start ${esc(ch.short)}'s first night</button>` });
  ui.modal.onClose = () => {
    const v = V(); const t = v.board.find((b) => b.tourist);
    if (t) ACTS['start-assign']({ id: t.gent }); else go('front');
  };
}
// The arrival names the Timeline's own rival, so the clash at the first Curtain is with someone you have met.
const RIVAL_LOOK = { lavinia: 'scheme', clementine: 'prim', bettie: 'showtime' };
function rivalLine(tl) {
  const rid = Object.keys(C.CHARACTERS).find((r) => C.CHARACTERS[r].role === 'rival' && C.CHARACTERS[r].timeline === tl);
  if (!rid) return '';
  const r = C.CHARACTERS[rid];
  const auto = (C.NPC_ACCOUNTS.find((a) => a.whores.includes(rid)) || {}).kind === 'automaton';
  const look = RIVAL_LOOK[rid];
  return `<div class="rivalclip clip"><span class="rface">${img(exprArt(rid, look || 'scheme'), r.name)}</span><p><b>Your rival: ${esc(r.name)}</b>${r.epithet ? `, ${esc(r.epithet)}` : ''}${auto ? ' (a house Automaton)' : ''}. She has her eye on your first Curtain.</p></div>`;
}
SCREENS.arrival = () => `<section class="sheet"><h1 class="h1">Arriving...</h1></section>`;

// ---------------------------------------------------------------------------
// The District clock: one district minute per real second while you are playing.
// It waits while ANY of your whores is at last call: no Curtain of yours falls behind your back.
// ---------------------------------------------------------------------------
setInterval(() => {
  if (!ui.S || !ui.active || ui.overlays > 0 || ui.modal || document.hidden) return;
  if (!['front', 'timelines', 'players', 'assign', 'plan', 'end'].includes(ui.screen)) return;
  const due = acctView().whores.filter((x) => !sealedW(x.id)).map((x) => curtainIn(x.timeline));
  const step = due.length && Math.min(...due) - 1 < 1 ? 0 : 1;
  if (step === 0) {
    if (!ui.lastCall) { ui.lastCall = true; renderChrome(); if (curtainIn(tlOf(ui.active)) <= 1) teach('lastcall', 'Last call', fresh('lastcall', LAST_CALL), 'lastcall'); }
  } else {
    ui.lastCall = false;
    const evs = act(L.advanceClock, step);
    if (evs && evs.length) onBackground(evs);
  }
  updateCountdowns();
}, 1000);
function onBackground(evs, quiet) {
  const acct = acctView();
  const myTls = new Set(acct.whores.map((w) => w.timeline));
  // the active whore had sealed and the last stand-in has now sealed too: her Curtain falls on screen
  const own = evs.find((e) => e.type === 'curtain' && e.timeline === tlOf(ui.active));
  const ownPay = own && evs.find((e) => e.type === 'payout' && e.whores[0] === ui.active);
  if (ownPay && !ownPay.data.standingOrder && !quiet) { showCurtain(ui.active, evs, 'The last of them has sealed. The Curtain falls.'); return; }
  const curtains = evs.filter((e) => e.type === 'curtain' && myTls.has(e.timeline) && e.timeline !== tlOf(ui.active));
  for (const c of curtains) {
    const w = acct.whores.find((x) => x.timeline === c.timeline);
    const pay = evs.find((e) => e.type === 'payout' && e.whores[0] === w.id);
    ui.news.add(c.timeline);
    const how = pay && pay.data.rank != null ? `took ${ord(pay.data.rank)}` : 'went home with the door gift';
    headline({ kicker: 'On the wire', head: `Curtain falls in ${C.TIMELINES[c.timeline].short}`, sub: pay && !pay.data.standingOrder ? `${w.name} ${how} on the plan you sealed. Switch in for the gossip.` : `${w.name} went out by Standing Order. Switch in for the gossip.`, x: 'curtain', ms: 5000, wire: true });
  }
  if (curtains.length) { if (ui.screen === 'timelines') render({ keepScroll: true }); else renderChrome(); }
}

// ---------------------------------------------------------------------------
// Input: taps, long-press to flip, keyboard
// ---------------------------------------------------------------------------
let lp = null;
document.addEventListener('pointerdown', (e) => {
  const t = e.target.closest('[data-hold]'); if (!t) return;
  lp = { t, x: e.clientX, y: e.clientY, fired: false };
  lp.timer = setTimeout(() => { if (!lp) return; lp.fired = true; if (navigator.vibrate) { try { navigator.vibrate(12); } catch { /* ignore */ } } hold(t.dataset.hold); }, 460);
});
document.addEventListener('pointermove', (e) => { if (lp && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 10) { clearTimeout(lp.timer); lp = null; } });
['pointerup', 'pointercancel'].forEach((ev) => document.addEventListener(ev, () => { if (lp && !lp.fired) { clearTimeout(lp.timer); lp = null; } }));
document.addEventListener('contextmenu', (e) => { if (e.target.closest('[data-hold]')) e.preventDefault(); });
function hold(spec) {
  audioInit();
  const [kind, a, b] = spec.split(':');
  if (kind === 'card') openFrom('card', [a, b]);
  else if (kind === 'gent') openModal('gent', a);
  else if (kind === 'item') openFrom('item', a);
  else if (kind === 'offer') openFrom('offer');
  else if (kind === 'char') openModal('char', a);
  else if (kind === 'tourist') { const v = V(); const t = v.timeline.tourist; const said = voiceFor(t.id, 'card', true); openModal('result', { html: `<p class="kicker">Lost tourist</p>${img(t.art, t.name, { cls: '' })}<h2 class="h2">${esc(t.name)}</h2>${said ? `<p class="deck">“${esc(said)}”</p>` : ''}<p>${esc(t.aside || '')} He likes ${artLabel(t.taste)}. You can't fail with him; you can only delight him more.</p><button class="btn primary block" data-act="close-modal">Close</button>` }); }
  if (ui.modal) { ui.modal.flipped = true; renderModal(); sfx('flip'); if (['gent', 'offer', 'item'].includes(kind)) ui.steps.add('flip'); }
}
document.addEventListener('click', (e) => {
  if (lp && lp.fired) { lp = null; e.preventDefault(); e.stopPropagation(); return; }
  lp = null;
  audioInit();
  lastTapAt = performance.now(); lastTapScreen = ui.screen;
  clearSpot(); // a "where" mark lasts until the next tap
  const fl = e.target.closest('[data-flip]');
  if (fl) { e.preventDefault(); e.stopPropagation(); hold(fl.dataset.flip); return; }
  const x = e.target.closest('[data-x]');
  if (x) { e.preventDefault(); e.stopPropagation(); const prev = ui.modal; openExcl(x.dataset.x, prev); return; }
  const a = e.target.closest('[data-act]');
  if (!a) return;
  const fn = ACTS[a.dataset.act];
  // any action moves the headline on: nothing on the strip is time-boxed, so the player's next tap is its cue
  // round 6 (finding 18): on the play screens a card pick (or Best Guess, a novelty or the Talent toggle) leaves the tip up, so
  // nothing moves under the thumb; the tip goes on its x, on Work it / Seal it, or when she leaves the screen
  const keepTip = PLAY.includes(ui.screen) && PLAY_KEEP_TIP.includes(a.dataset.act);
  if (hlCur && !keepTip && !['hl-close', 'noop', 'mute', 'flip', 'why'].includes(a.dataset.act)) closeHl();
  // a tap inside a pop-up's panel reaches its scrim, whose close-modal is for the backdrop only: leave the tap to the
  // browser (a form's submit button, a label, a text field)
  if (a.classList.contains('scrim') && e.target !== a) return;
  if (fn) { e.preventDefault(); fn(a.dataset, a, e); }
}, true);
function openExcl(key, prev) {
  ui.seenX.add(key); store.set('seenX', [...ui.seenX]);
  // an EXCLUSIVE stacked over another modal returns to it when closed; a see-also EXCLUSIVE replaces the one it came
  // from and keeps its way back (two levels, never three); focus returns to whatever opened the first one
  const trig = modalTrigger;
  // inside Her things an EXCLUSIVE is a detail of the sheet, as a card is: closing it brings her back to the same tab, scroll, NEW tags and focus
  if (prev && prev.type === 'things') { hubOpen('excl', key); sfx('clack'); return; }
  if (prev && prev.type !== 'excl') {
    const saved = { ...prev };
    ui.modal = null; ui.overlays = Math.max(0, ui.overlays - 1);
    openModal('excl', key); modalTrigger = trig;
    // what the pop-up under it needs (flipped, open, its own way back, and fromHub for its Back button) goes in before its first render, so it is drawn once and keeps its focus
    ui.modal.onClose = () => { openModal(saved.type, saved.data, { flipped: saved.flipped, open: saved.open, onClose: saved.onClose, fromHub: saved.fromHub }); modalTrigger = trig; };
  } else if (prev) {
    const back = prev.onClose; openModal('excl', key); ui.modal.onClose = back;
  } else openModal('excl', key);
  sfx('clack');
}
// ---------------------------------------------------------------------------
// Putting a pop-up down: drag it the way it closes (down; the desktop drawer, right) and let go past 30% of it, or flick
// it, and it closes; a shorter drag springs back. A sheet whose own text is scrolled down scrolls first, as on iOS: the
// drag only takes over from the top. Touch goes through touch events on #modal (only a cancelable touchmove keeps the
// browser's own scroll out of it); a mouse or pen through pointer events. Reduced motion: no spring, it just closes.
// ---------------------------------------------------------------------------
const drawerMQ = matchMedia('(min-width: 1100px)');
let drag = null; let dragEndAt = -1e9;
function dragFrom(e, x, y, touch) {
  if (drag && drag.live && drag.panel.isConnected) return;
  drag = null;
  const scrim = ui.modal && e.target.closest('#modal > .scrim'); const panel = scrim && scrim.querySelector(':scope > [role="dialog"]');
  if (!panel || !panel.contains(e.target) || panel.classList.contains('going') || e.target.closest('input, textarea, select')) return;
  drag = { m: ui.modal, scrim, panel, touch, t: e.target, side: drawerMQ.matches && !scrim.classList.contains('mid'), x0: x, y0: y, live: false, d: 0, pts: [] };
}
// true while the drag belongs to the panel (the caller then keeps the browser's scroll out of it)
function dragMove(x, y) {
  const g = drag;
  const along = g.side ? x - g.x0 : y - g.y0; const across = g.side ? y - g.y0 : x - g.x0;
  if (!g.live) {
    if (Math.abs(along) < 5 && Math.abs(across) < 5) return false;
    // the wrong way, sideways, or text between the finger and the scrim still scrolled: the browser scrolls it
    let back = false;
    for (let el = g.t; el && el !== g.scrim.parentElement; el = el.parentElement) if ((g.side ? el.scrollLeft : el.scrollTop) > 0) back = true;
    if (along <= 0 || Math.abs(across) > along || back) { drag = null; return false; }
    g.live = true; g.size = g.side ? g.panel.offsetWidth : g.panel.offsetHeight;
    g.panel.classList.add('held', 'dragging');
  }
  if (!g.touch) getSelection()?.removeAllRanges();
  g.d = Math.max(0, along); // under the finger from where it went down
  const now = performance.now(); g.pts.push([now, g.d]); while (g.pts.length > 2 && now - g.pts[0][0] > 100) g.pts.shift();
  g.panel.style.transform = g.side ? `translateX(${g.d}px)` : `translateY(${g.d}px)`;
  g.scrim.style.backgroundColor = `rgba(8, 5, 3, ${(0.62 * (1 - Math.min(1, g.d / g.size))).toFixed(3)})`;
  return true;
}
function dragEnd(cancel) {
  const g = drag; drag = null;
  if (!g || !g.live) return;
  dragEndAt = performance.now();
  const a = g.pts[0]; const b = g.pts[g.pts.length - 1];
  const v = dragEndAt - b[0] < 100 && b[0] > a[0] ? (b[1] - a[1]) / (b[0] - a[0]) : 0; // px/ms, + = the closing way
  const shut = !cancel && ui.modal === g.m && (v > 0.5 || (g.d > g.size * 0.3 && v > -0.2));
  g.panel.classList.remove('dragging');
  if (!shut) { g.panel.style.transform = ''; g.scrim.style.backgroundColor = ''; return; } // springs back (scandal.css)
  if (calm()) { closeModal(); return; }
  const r = g.panel.getBoundingClientRect();
  const out = g.d + (g.side ? window.innerWidth - r.left : window.innerHeight - r.top);
  g.panel.classList.add('going');
  g.panel.style.transform = g.side ? `translateX(${out}px)` : `translateY(${out}px)`;
  g.scrim.style.backgroundColor = 'rgba(8, 5, 3, 0)';
  const done = (e) => {
    if (e && (e.target !== g.panel || e.propertyName !== 'transform')) return;
    g.panel.removeEventListener('transitionend', done);
    if (ui.modal === g.m) closeModal(); // Esc or a tap may have closed it already
  };
  g.panel.addEventListener('transitionend', done); setTimeout(done, 450);
}
// modalShell arms each new #modal: its listeners go when it does. A finger on something that cannot scroll (the backdrop,
// a short sheet) moves nothing at all: an iOS before 16 ignores overscroll-behavior and would rubber-band the page.
function armDrag(el) {
  let still = false;
  el.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) { still = false; if (drag && drag.touch) dragEnd(true); return; } // a second finger: put it back
    still = true;
    for (let n = e.target; n && n !== el; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if ((n.scrollHeight > n.clientHeight && /auto|scroll/.test(cs.overflowY)) || (n.scrollWidth > n.clientWidth && /auto|scroll/.test(cs.overflowX))) { still = false; break; }
    }
    dragFrom(e, e.touches[0].clientX, e.touches[0].clientY, true);
  }, { passive: true });
  el.addEventListener('touchmove', (e) => {
    const mine = drag && drag.touch && dragMove(e.touches[0].clientX, e.touches[0].clientY);
    if ((mine || (still && e.touches.length === 1)) && e.cancelable) e.preventDefault(); // two fingers: zoom stays free
  }, { passive: false });
  el.addEventListener('touchend', () => { if (drag && drag.touch) dragEnd(false); });
  el.addEventListener('touchcancel', () => { if (drag && drag.touch) dragEnd(true); });
}
document.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'touch' || e.button !== 0) return;
  dragFrom(e, e.clientX, e.clientY, false); if (drag) drag.pid = e.pointerId;
});
document.addEventListener('pointermove', (e) => { if (drag && !drag.touch && e.pointerId === drag.pid) dragMove(e.clientX, e.clientY); });
['pointerup', 'pointercancel'].forEach((ev) => document.addEventListener(ev, (e) => { if (drag && !drag.touch && e.pointerId === drag.pid) dragEnd(ev === 'pointercancel'); }));
document.addEventListener('dragstart', (e) => { if (drag && !drag.touch) e.preventDefault(); }); // a dragged picture, not the panel
// the click that ends a mouse drag is not a tap (on the scrim it would close what just sprang back; on a card, flip it)
window.addEventListener('click', (e) => { if (performance.now() - dragEndAt < 350) { e.preventDefault(); e.stopPropagation(); } }, true);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && ui.modal) closeModal();
  else if (e.key === 'Tab' && ui.modal) { // focus stays in the open pop-up: off either end it wraps round
    const box = $('#modal > .scrim');
    const f = box ? [...box.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')].filter((x) => x.tabIndex >= 0 && !x.disabled && !x.closest('[inert]') && x.getClientRects().length) : [];
    const i = f.indexOf(document.activeElement);
    if (f.length && (i === -1 || i === (e.shiftKey ? 0 : f.length - 1))) { e.preventDefault(); f[e.shiftKey ? f.length - 1 : 0].focus(); }
  }
  // Her things: Left, Right, Home and End move between the tabs, as on any tab list
  else if (ui.modal && ui.modal.type === 'things' && e.target.closest && e.target.closest('[role="tab"]') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
    e.preventDefault(); const ks = HUB_TABS.map(([k]) => k); const i = ks.indexOf(ui.modal.data);
    ACTS.things({ id: ks[e.key === 'Home' ? 0 : e.key === 'End' ? ks.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + ks.length) % ks.length] });
  }
  else if (ui.screen === 'overview' && !ui.modal && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); ovGoTo(ui.ovPage + (e.key === 'ArrowRight' ? 1 : -1)); }
  // a keyboard at the card table: 1-9 picks the hand's cards in order, B is Best Guess (the wide layout prints the numbers)
  else if (PLAY.includes(ui.screen) && !ui.modal && !ui.overlays && !e.metaKey && !e.ctrlKey && !e.altKey && !e.repeat && !(e.target && e.target.closest && e.target.closest('input, textarea, select'))) {
    const card = /^[1-9]$/.test(e.key) ? document.querySelectorAll('.hand.play .card[data-act="pick"]')[Number(e.key) - 1] : null;
    const bg = e.key === 'b' || e.key === 'B' ? $('.tray [data-act^="best-guess"]') : null;
    if (card || bg) { e.preventDefault(); (card || bg).click(); }
  }
});
// The forms: Log in and Create account (their buttons, and Enter in a field) and Letters to the Editor. Play as guest is a
// plain button (ACTS).
document.addEventListener('submit', (e) => {
  const f = e.target; const id = f.id;
  if (id !== 'login' && id !== 'signup' && id !== 'letterform') return;
  e.preventDefault();
  audioInit();
  if (id === 'letterform') postLetter(); else if (id === 'login') logIn(f); else signUp(f);
});
reduceMQ.addEventListener?.('change', () => render({ keepScroll: true }));
// test hook for the browser playthrough (only with ?debug in the URL)
if (/[?&]debug\b/.test(location.search)) window.__lw = { ui, L, act, render, go, onBackground, openModal, closeModal, net, saveGame };

net.init({ store, version: SAVE_V, stored: () => { const g = loadSave(); return g && !g.stale ? g : null; }, on: onNet });
render();
// the page reloaded onto a cloud game (reloadOnto): pick it straight up
{ const hello = store.get('hello', null); if (hello) { store.del('hello'); if (resumeGame()) headline({ kicker: 'Your account', head: String(hello.head || ''), sub: String(hello.sub || ''), wire: true }); } }
// then, without holding anything up: who is signed in, and has another device saved since?
net.start();
