// The Scandal Sheet · prototype C of Legendary Whores.
// House layer: tabloid collage; teaching UX: headlines + a 3-panel comic strip + EXCLUSIVE explainers on anything dotted.
// Every rule comes from ../engine/rules.js; this file only renders views and animates the event log.
import * as L from '../engine/rules.js';
import { EXISTS, STANDINS } from './assets.js';
import { SEEDS, gameOpts } from './slice-config.js';

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
const FLASH_LOOK = { dolly: 'pleased', fanny: 'pleased', jackie: 'bubble' }; // the pick screen's slow idle flash
const END_LINE = {
  victorian: 'Our correspondent has been sent to bed without any supper. He is drafting a strongly worded letter about it, in green ink.',
  wildwest: 'Our correspondent rode off into the sunset. The horse came back alone, looking pleased with itself.',
  vegas: 'Our correspondent lost his notes at the craps table. What happened in Vegas is, regrettably, all on page three.',
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
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

const store = {
  get(k, d) { try { const v = localStorage.getItem(`lw-scandal-${k}`); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`lw-scandal-${k}`, JSON.stringify(v)); } catch { /* storage refused: fine */ } },
};

// ---------------------------------------------------------------------------
// UI state (game state lives only in ui.S, produced by the engine)
// ---------------------------------------------------------------------------
const ui = {
  screen: 'title', S: null, active: null, name: 'Anonymous',
  introStep: 0, pickId: null, pickSaid: {},
  sel: [], item: null, talentOn: false, deArt: null, stake: false, grease: 0, slumOk: false,
  place: null, tab: 'whorescore',
  taught: new Set(), steps: new Set(), studied: null,
  modal: null, overlays: 0, lastCall: false, result: null, aResult: null, news: new Set(),
  leaning: {}, unfold: new Set(), secSeen: new Set(), secShown: new Set(), secOpen: new Set(), why: false, lastSway: null, hind: null, think: { renown: 0 }, delightedOnce: new Set(),
  muted: store.get('muted', false), hist0: {}, hinds: {}, leftAt: {}, strip: null, tips: [],
};

// ---------------------------------------------------------------------------
// Engine glue
// ---------------------------------------------------------------------------
const mine = (evs) => (evs || []).filter((e) => e.vis === 'all' || (Array.isArray(e.vis) && e.vis.includes(ME)));
function act(fn, ...args) {
  try {
    ui.S = fn(ui.S, ...args);
    snapAfterCurtains(ui.S.lastEvents);
    return mine(ui.S.lastEvents);
  } catch (e) {
    if (e && e.name === 'RulesError') {
      headline({ kicker: 'Correction', head: 'Not so fast, dear', sub: e.message });
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
function fmtMins(m) {
  if (m <= 1) return 'last call!';
  const h = Math.floor(m / 60); const mm = m % 60;
  return `in ${h ? `${h}h ${String(mm).padStart(2, '0')}m` : `${mm}m`}`;
}
// A due Curtain is only an alarm when it is holding something up: another of your Timelines (the District clock waits for
// it), or once the first Curtain has been played. On the first evening it simply waits for you.
function lastCallUrgent() {
  if (ui.steps.has('curtain')) return true;
  try { return acctView().whores.length > 1; } catch { return false; }
}
function cdText(tl) {
  const m = curtainIn(tl);
  return m <= 1 && !lastCallUrgent() ? 'when you\'re ready' : fmtMins(m);
}
// the topbar's stat block: "2h57", "41m", "now"
function cdShort(tl) {
  const m = curtainIn(tl);
  if (m <= 1) return lastCallUrgent() ? 'now!' : 'ready';
  const h = Math.floor(m / 60); const mm = m % 60;
  return h ? `${h}h${String(mm).padStart(2, '0')}` : `${mm}m`;
}

// ---------------------------------------------------------------------------
// Art (shared era art, with the stand-in map; a missing file shows the era frame and the name)
// ---------------------------------------------------------------------------
// The real painting is always tried first, so a stale EXISTS list can never hide finished art: a file EXISTS lists loads
// as is; anything else is requested too, and only if it fails does the image error handler fall back to its stand-in
// (fb), then to the era frame and the name (or, for a card thumb, the Art emblem). make-assets.mjs keeps the list fresh.
function artOf(p) {
  if (!p) return null;
  const k = p.replace(/^\.\.\/art-assets\//, '');
  const src = `../art-assets/${k}`;
  if (EXISTS.has(k)) return { src };
  const s = STANDINS[k];
  return s ? { src, fb: `../art-assets/${s.use}`, fbPos: s.pos || '' } : { src };
}
const fbAttrs = (a) => (a.fb ? ` data-fb="${a.fb}" data-fbpos="${a.fbPos}"` : '');
function img(p, alt, o = {}) {
  const a = artOf(p);
  if (!a) return `<div class="miss ${o.cls || ''}">${esc(alt)}</div>`;
  const pos = o.pos;
  const load = o.eager ? ' loading="eager" fetchpriority="high"' : ' loading="lazy"';
  return `<img class="${o.cls || ''}" src="${a.src}" alt="${esc(alt)}" decoding="async"${load}${fbAttrs(a)}${pos ? ` style="object-position:${pos}"` : ''}>`;
}
document.addEventListener('error', (e) => {
  const t = e.target;
  if (!t || t.tagName !== 'IMG' || t.dataset.dead) return;
  if (t.dataset.fb) { // the painting is not there yet: show its stand-in
    const fb = t.dataset.fb; const pos = t.dataset.fbpos; delete t.dataset.fb;
    if (pos) t.style.objectPosition = pos;
    t.src = fb; return;
  }
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
  renderChrome();
}

// ---------------------------------------------------------------------------
// Glossary: every dotted word opens an EXCLUSIVE
// ---------------------------------------------------------------------------
const GLOSS = {
  sway: ['How smitten is he?', 'Sway is your score in one encounter. Every card adds its Allure, plus a tick for each thing he likes. Highest Sway at a Place wins.'],
  bar: ['Mind the Bar', 'The Sway a Place or a gentleman demands before paying you anything. Fall short and you get the door gift and a Brave Face. In an Assignation, beat his Bar by 3 and he is Delighted.'],
  tick: ['Tick! He likes it', 'A card earns +1 for each of his Tastes it carries, +1 for his Secret Taste, and +1 for your Signature Art. Glowing cards are safe bets.'],
  aversion: ["Crossed! He can't abide it", 'A card carrying his Aversion loses 2. Leave it in your purse: cards you keep can still pay Coin.'],
  fancy: ['His Fancy', 'The Type he is weak for. If it is yours, +2 Sway the moment you walk in.'],
  type: ['Her Type', 'Siren (Silk), Bluestocking (Wit), Hustler (Gold), Enigma (Mask) or Minx (Frolic). Every gentleman has a Fancy for one of them.'],
  signature: ['Signature Art', 'Her speciality. Every card carrying it scores +1, whoever she is working on.'],
  secret: ['Secret Taste', 'An Art he likes but would never admit to. Hidden until you Study him or hit it by accident. Secrets only ever help you.'],
  kink: ['The Kink', 'His private passion. Bring the right novelty, or work the right cards, for +3 Sway. Study him twice to learn it. Win with it and something unspeakable happens behind a curtain.'],
  tell: ['Read his Tells', 'Free clues on every gentleman. They hint at his Secret Taste and his Kink.'],
  freshness: ['How fresh is he?', 'Scrubbed, Fair or Ripe. It decides how much Itch your Frolic cards give you. Scrubbed gentlemen carry nothing.'],
  itch: ['The Itch', 'A meter from 0 to 3. Frolic cards on a Fair or Ripe gentleman raise it. At 3 you catch his Affliction. It fades after a quiet Curtain, and Best Guess never takes you to 3.'],
  affliction: ['Afflictions', 'Comic curse cards that clog your deck and cost you until a quack cures you. Catching one is always a choice you could see coming.'],
  standing: ['Standing', 'Respect and class. It opens Posh doors and rich patrons, and rises when you shine somewhere respectable. Every point of Standing pushes Notoriety down, and the other way round.'],
  notoriety: ['Notoriety', 'Cheap tricks and gutter deals. It pays Coin fast and opens back alleys and the black market, but Posh doors shut while it beats your Standing.'],
  renown: ['Renown', `Fame. Climb from Common to Rare at ${R.tiers.rare} and Epic at ${R.tiers.epic}. Legendary and Mythic are seats you must win from whoever sits in them.`],
  coin: ['Coin', 'Money. It buys novelties, cards, cures and bribes. Gold cards you keep in your purse pay Coin.'],
  whorescore: ['Whorescore', 'Your lifetime score across every whore and season. Each rung is worth three of the one below, plus one: Common 1, Rare 4, Epic 13, Legendary seat 40, Mythic seat 121. One mastered Timeline beats three skimmed ones.'],
  timeline: ['Timelines', 'Each era is its own little world with its own Curtain clock, rivals and gossip. You run one whore per Timeline. While one waits for her Curtain, play another.'],
  curtain: ['The Curtain', 'When it falls, everyone at each Place is ranked. It falls early once everyone has sealed, or three hours after the last one.'],
  split: ['The split', 'Not winner-takes-all. 1st takes the lion\'s share and the Applause, 2nd and 3rd take smaller shares, and everyone who came gets a door gift.'],
  assignation: ['Assignations', 'Quick private jobs between Curtains. Your deck lends you 3 cards; work 1 or 2. Resolved on the spot. They pay less after the first few each day.'],
  study: ['Study', 'Watch him from the bar. Each Study reveals one hidden fact: his Secret Taste first, then his Kink. Three free a day.'],
  rummage: ['Back doors', 'Rummage behind a Place for Coin, gossip, saucy postcards and odd novelties. The door marked FRESH STOCK always has something under the counter.'],
  bestguess: ['Best Guess', 'One button that picks the cards scoring best on what you can see. It never pushes your Itch to 3. Thinking harder (Study, novelties, Talents) beats it.'],
  seal: ['Seal it', 'Lock in tonight\'s plan. You may unseal until the Curtain falls.'],
  automaton: ['Automatons', 'Clockwork rivals run by the house. They always wear the brass key and are never ranked on Whorescore.'],
  standin: ['Stand-ins', 'Prototype players run by the house, so the District feels as busy as it will with real people. In this prototype your Timeline\'s rival is scripted to follow you to your first Curtain, so it opens with a clash. After that she goes where her Habit takes her: Study her to learn it, or trade Gossip to hear where she is heading.'],
  upstage: ['Upstage', 'A Talent: at a Curtain, whoever finishes directly above her loses 2 Sway. Beat her by 3 or more, or be nowhere near her.'],
  fullpay: ['Full pay', 'Each whore\'s first 3 Curtains a day pay Renown. After that it is After Hours: Coin and door gifts only. That is the moment to play another Timeline.'],
  lastcall: ['Last call', 'Her Curtain is due. The District clock waits for you while any of your whores is at last call; if you leave her, her Standing Order takes her to the Place with the most smileys.'],
  regular: ['Regulars and Grudges', 'Each earlier visit where you reached his Bar is +1 next time (usually up to +2). Fall short and he holds a Grudge: -1 until you please him.'],
  seenit: ['Seen It', 'A card you worked on him last time scores -1. Rotate your repertoire, dear.'],
  house: ['House Rules', 'Each Place boosts some Arts and frowns on others. The Salon loves Wit; the Saloon prefers Gold.'],
  smileys: ['Smileys', 'How well a Place suits you tonight on what you can see, from none to three. Best Guess and the Standing Order use the same sums.'],
  eratitle: ['Era titles', 'Your tier wears your Timeline\'s real period word: a Victorian dollymop, a frontier crib girl, a Vegas streetwalker, climbing to grande horizontale, parlour-house madam or courtesan to the whales.'],
  gossip: ['Gossip', 'You earn it from Delights and back doors. Trade a piece on a rival\'s profile (tap her in The competition) to learn where she went last Curtain, with how much Sway, and where she is heading tonight.'],
  doorgift: ['The door gift', 'One Coin for everyone who turns up. Showing up pays.'],
  braveface: ['Brave Face', 'Fell short of the Bar? +1 Sway at your next Curtain. Chin up.'],
  arts: ['The five Arts', 'Silk is finery, Wit is banter, Gold is money talk, Mask is discretion, Frolic is a bawdy romp: strong, but it gives you the Itch.'],
  allure: ['Allure', 'A card\'s own strength, before ticks and crosses. The +N in the corner is what it adds tonight, ticks and all: that is the number the Sway meter adds up.'],
  pocket: ['Kept in the purse', 'Some cards pay Coin if you keep them instead of playing them.'],
  digest: ['While You Were Away', 'A short gossip sheet of what changed since you left, most important to you first. Never more than five headlines.'],
  talent: ['Charms, Talents and Vices', 'A Charm is always on. A Talent is a trick you may use once per Curtain. A Vice is a habit with an upside and a downside.'],
  raid: ['Raid Night', 'Every third Curtain the Gutter Place is raided: Renown shares halved, Coin curiously unaffected.'],
  posh: ['Posh Places', 'Bar 10. The best Renown. Open only while your Standing is 2 or more and at least your Notoriety. Frolic cards here cost Notoriety.'],
  rowdy: ['Rowdy Places', 'Bar 7. Always open, always loud. A little Coin for 1st.'],
  gutter: ['Gutter Places', 'Bar 6. Always open. Pays well in Coin. Walking in costs 1 Notoriety.'],
  boards: ['The boards', 'Whorescore ranks everyone. Richest counts Coin earned this season, Most Notorious and Most Respectable count your whores\' peak meters. Every route is a real way to be famous.'],
};

// ---------------------------------------------------------------------------
// Headlines: the house teaching UX. One line at a time, at the moment it matters.
// ---------------------------------------------------------------------------
// Rules of the strip: a teaching headline belongs to the screen it was written for (it is spiked if you have moved on);
// wire news (a Curtain falling elsewhere) may cross screens. Nothing prints over a result, a curtain or a telegram:
// the queue waits. With a card open, the headline prints inside the pop-up, above the card, never over it.
const hlq = []; let hlBusy = false; let hlTimer = null; let hlCur = null; let hlRetry = null;
function hlWrap() { let w = $('.hl-wrap'); if (!w) { w = document.createElement('div'); w.className = 'hl-wrap'; document.body.appendChild(w); } return w; }
const HOLDING_MODALS = ['result', 'telegram', 'spin', 'confirm', 'digest']; // nothing prints over these: the queue waits
// the Curtain results page holds the strip while the paper spins in and the standings are read
const hlBlocked = () => ui.overlays > (ui.modal ? 1 : 0) || !!(ui.modal && HOLDING_MODALS.includes(ui.modal.type)) || (ui.screen === 'results' && Date.now() < (ui.resultsHoldUntil || 0));
function headline(h) {
  // every headline belongs to the screen (and pop-up) it was written on, except wire news (wire: true)
  h.t = Date.now(); h.born = h.t; h.screen = ui.screen; h.modal = ui.modal && !HOLDING_MODALS.includes(ui.modal.type) ? ui.modal.type : null; if (!h.wire) h.scoped = true;
  // the same news twice in a row (a Study's "Secret Taste revealed" and "A secret, darling") prints once
  if (h.sub && ((hlCur && hlCur.sub === h.sub) || hlq.some((x) => x.sub === h.sub))) return;
  hlq.push(h);
  // a teaching tip stays until it is dismissed or acted on; other headlines make way faster when a queue builds up
  if (!hlBusy) nextHl(); else if (hlq.length > 1 && hlCur && !hlCur.teach) { clearTimeout(hlTimer); hlTimer = setTimeout(closeHl, 1600); }
}
function hlHTML(h) {
  return `<div class="hl" role="status">
    <span class="kicker">${esc(h.kicker || 'Stop press')}</span>
    <div class="h2">${escE(h.head)}</div>
    ${h.sub ? `<p>${escE(h.sub)}</p>` : ''}
    ${h.x ? `<button class="link excl" data-x="${h.x}">Exclusive: read all about it</button>` : ''}
    <button class="close" data-act="hl-close" aria-label="Dismiss headline">&times;</button></div>`;
}
// Where a headline prints: inside an open pop-up (above the card); on the play screens in the page flow, between the
// cards and the tray (it pushes, never covers); elsewhere in the strip above the nav bar.
function paintHl() {
  const slot = ui.modal ? $('#modal .mslot') : $('#app .hlslot');
  const html = hlCur ? hlHTML(hlCur) : '';
  document.querySelectorAll('#modal .mslot, #app .hlslot').forEach((x) => { if (x !== slot) x.innerHTML = ''; });
  if (slot) {
    // the slot keeps the height of the last headline it held on this screen, so the buttons under it never jump when a
    // headline closes; the words fade instead (the reservation goes with the screen or pop-up)
    if (html) slot.innerHTML = html;
    else { const h = slot.getBoundingClientRect().height; if (h) slot.style.minHeight = `${Math.round(h)}px`; slot.innerHTML = ''; }
    hlWrap().innerHTML = '';
    if (html && slot.matches('#app .hlslot')) requestAnimationFrame(() => slot.scrollIntoView({ block: 'nearest', behavior: calm() ? 'auto' : 'smooth' }));
  } else hlWrap().innerHTML = html;
  if (ui.screen === 'assign' || ui.screen === 'plan') setTrayH();
}
function nextHl() {
  clearTimeout(hlRetry);
  if (hlBlocked()) {
    hlBusy = false; hlCur = null; paintHl();
    const now = Date.now(); hlq.forEach((x) => { x.t = now; }); // waiting behind a result is not going stale
    if (hlq.length) hlRetry = setTimeout(nextHl, 400);
    return;
  }
  // spike the stale and the ones whose screen has gone; a page tip waits while a pop-up is open (and vice versa)
  for (let i = hlq.length - 1; i >= 0; i--) if ((!hlq[i].teach && (Date.now() - hlq[i].t > 9000 || Date.now() - hlq[i].born > 30000)) || (hlq[i].scoped && hlq[i].screen !== ui.screen)) hlq.splice(i, 1);
  const idx = hlq.findIndex(hlFits);
  const h = idx >= 0 ? hlq.splice(idx, 1)[0] : null;
  if (!h) { hlBusy = false; hlCur = null; paintHl(); if (hlq.length) hlRetry = setTimeout(nextHl, 500); return; }
  hlBusy = true; hlCur = h; sfx('clack');
  paintHl();
  clearTimeout(hlTimer);
  // teaching tips have no timer: they close on X, on the player's next action, or when she leaves the screen
  if (!h.teach) hlTimer = setTimeout(closeHl, hlq.length ? 2600 : (h.ms || 5200));
}
function closeHl() {
  clearTimeout(hlTimer);
  const els = document.querySelectorAll('.hl');
  hlCur = null;
  if (!els.length) { nextHl(); return; }
  els.forEach((el) => el.classList.add('out'));
  setTimeout(() => { els.forEach((el) => el.remove()); nextHl(); }, calm() ? 10 : 280);
}
// call when the screen, a modal or an overlay changes: a held or stale headline goes back in the queue or is spiked
const hlFits = (h) => !h.scoped || (ui.modal ? h.modal === ui.modal.type : !h.modal);
function hlReflow() {
  if (hlCur && hlCur.scoped && hlCur.screen !== ui.screen) { closeHl(); return; }
  if (hlCur && (hlBlocked() || !hlFits(hlCur))) { hlq.unshift(hlCur); clearTimeout(hlTimer); hlCur = null; hlBusy = false; paintHl(); hlRetry = setTimeout(nextHl, 400); return; }
  if (hlCur) paintHl(); else if (!hlBusy && hlq.length) nextHl();
}
function teach(key, head, sub, x, kicker) {
  if (ui.taught.has(key)) return;
  ui.taught.add(key);
  ui.tips.push({ key, head, sub, x });
  headline({ head, sub, x, kicker, scoped: true, teach: true });
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
};
function badgeFor(r, tag = 'button') {
  if (!r) return '';
  const x = (k) => (tag === 'button' ? ` data-x="${k}"` : '');
  if (r.automaton) return `<${tag} class="badge-auto"${x('automaton')}>${ICON.key} Automaton</${tag}>`;
  if (r.standin || r.label) return `<${tag} class="badge-stand"${x('standin')}>${esc(r.label === 'PROTOTYPE STAND-IN' ? 'Stand-in' : (r.label || 'Stand-in'))}</${tag}>`;
  return '';
}
function photo(p, alt, cap, o = {}) {
  return `<div class="photo ${o.cls || ''}">${o.pin === false ? '' : '<span class="pin"></span>'}<div class="frame halftone">${img(p, alt, { eager: o.eager })}</div>${cap ? `<div class="cap">${cap}</div>` : ''}</div>`;
}
function eraMini(tl, p, alt) { return `<div class="mini-frame mf-${tl}">${img(p, alt, { eager: true })}</div>`; }

const TICK_LABEL = { taste: '✓ his Taste', secret: '✓ Secret!', signature: '✓ Signature', 'silver-tongue': '✓ Silver Tongue', aversion: '✗ he can\'t abide' };
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
  const score = o.score != null ? `<span class="score ${o.score > c.allure ? 'good' : o.score < c.allure ? 'bad' : ''}" aria-label="Scores ${o.score}">${o.score > 0 ? '+' : ''}${o.score}</span>` : '';
  // every card has the same anatomy: a card without a painting gets the same 4:3 box with its Art's emblem
  const ph = c.affliction ? '!' : c.arts.length ? artIcon(c.arts[0], 'big') : '✦';
  const thumb = a ? `<img class="thumb" src="${a.src}" alt="" decoding="async" loading="lazy" data-ph="${c.affliction ? 'curse' : c.arts[0] || 'none'}"${fbAttrs(a)}>` : `<span class="thumb ph ph-${c.arts[0] || 'none'}" aria-hidden="true">${ph}</span>`;
  // one number at a time: until the first Curtain only the +N the meter adds up shows; after that Allure is labelled
  const allure = c.affliction ? '<span class="allure">!</span>' : ui.steps.has('curtain') ? `<span class="allure"><small>Allure</small>${c.allure}</span>` : '';
  return `<button class="card ${c.affliction ? 'curse' : ''} ${o.sel ? 'sel' : ''} ${o.glow ? 'glow' : ''} ${o.deal ? 'deal' : ''}" data-act="${o.act || 'inspect-card'}" data-src="${o.src || 'hand'}" data-idx="${c.idx}" data-hold="card:${o.src || 'hand'}:${c.idx}" aria-pressed="${o.sel ? 'true' : 'false'}"${o.delay ? ` style="animation-delay:${o.delay}ms"` : ''}>
    <span class="top">${allure}${c.pocket && !o.noPocket && ui.steps.has('curtain') ? `<span class="pocket">+${c.pocket} kept</span>` : ''}</span>
    <span class="nm">${esc(c.name)}</span>
    ${thumb}
    <span class="arts">${arts}</span>
    <span class="marks">${marks}</span>${score}</button>`;
}

// The Sway tray: one compact row (number, verdict, buttons) under a thin meter; the reasons fold behind "Why?".
// m: { sway, bar, delight, bg, parts, unknown, tourist, picked, sub, acts }
function meterVerdict(m) {
  if (!m.picked) return { t: 'Pick a card', cls: '' };
  if (m.tourist) return m.sway >= m.delight ? { t: 'Delighted!', cls: 'good' } : m.sway >= m.bar ? { t: 'Satisfied', cls: 'good' } : { t: 'He\'s grateful already', cls: 'good' };
  if (m.delight) return m.sway >= m.delight ? { t: 'Delighted!', cls: 'good' } : m.sway >= m.bar ? { t: 'Satisfied', cls: 'good' } : { t: 'He\'ll fizzle', cls: 'bad' };
  return m.sway >= m.bar ? { t: 'Takes a share', cls: 'good' } : { t: 'Short of the Bar', cls: 'bad' };
}
function meterTop(m) { return Math.max(m.bar + (m.delight ? R.assign.delightMargin : 0) + 3, m.sway + 2, (m.bg ?? 0) + 2, 8); }
function meterChips(m) {
  const parts = (m.parts || []).map((p) => `<button class="chip ${p.n > 0 ? 'good' : 'bad'}" data-x="${PART_X[p.key] || 'sway'}">${esc(PART_LABEL[p.key] || p.key)} ${p.n > 0 ? '+' : ''}${p.n}</button>`).join('');
  const gap = m.bg == null || !m.picked ? '' : m.sway > m.bg ? `<button class="chip stamp-c" data-x="bestguess">+${m.sway - m.bg} over Best Guess (${m.bg})</button>` : `<button class="chip" data-x="bestguess">┆ Best Guess ${m.bg}</button>`;
  return `${parts}${m.unknown ? '<button class="chip q" data-x="secret">+? his secrets</button>' : ''}${gap}${m.extra || ''}`;
}
function meterEl(m) {
  const top = meterTop(m);
  const pct = (x) => Math.min(100, Math.max(0, (x / top) * 100));
  const v = meterVerdict(m);
  const chips = meterChips(m);
  const from = m.from != null ? m.from : m.sway;
  return `<div class="meter" aria-live="polite">
    <div class="track"><div class="fill ${m.sway >= m.bar && m.picked ? 'ok' : ''}" style="width:${pct(from)}%" data-w="${pct(m.sway)}"></div>
      <div class="mark" style="left:${pct(m.bar)}%"></div>
      ${m.delight ? `<div class="mark del" style="left:${pct(m.delight)}%"></div>` : ''}
      ${m.bg != null ? `<div class="mark bg" style="left:${pct(m.bg)}%" title="Best Guess ${m.bg}"></div>` : ''}
    </div>
    <div class="line">
      <span class="big"><b class="num">${m.sway}</b><small><button class="x" data-x="sway">Sway</button></small></span>
      <span class="vwrap"><span class="verdict ${v.cls}">${esc(v.t)}</span><span class="sub">${m.sub || ''}${chips ? ` <button class="why" data-act="why" aria-expanded="${ui.why ? 'true' : 'false'}">${ui.why ? 'hide' : 'why?'}</button>` : ''}</span></span>
      <span class="acts">${m.acts || ''}</span>
    </div>
    ${chips && ui.why ? `<div class="legend chips">${chips}</div>` : ''}
  </div>`;
}

function marksFor(v, info, cid) {
  const out = (info ? info.ticks : []).map((t) => ({ t: TICK_LABEL[t] || t, cls: t === 'aversion' ? 'bad' : '' }));
  return out;
}
function seenMark(v, gid, cid) {
  const h = v.whore.history[gid];
  return h && h.seen && h.seen.includes(cid) && v.whore.vice !== 'bored-stiff' ? [{ t: '−1 Seen it', cls: 'seen' }] : [];
}

// Progressive reveal: Renown and Coin from the start; the Curtain clock after the first job; the Standing / Notoriety
// seesaw and the Itch only once they first move (or once the first Curtain has fallen, for the seesaw).
function topbar(v) {
  const w = v.whore;
  if (w.standing !== R.start.standing || w.notoriety !== R.start.notoriety || ui.steps.has('curtain')) ui.steps.add('meters');
  if (w.itch > 0) ui.steps.add('itchSeen');
  const showClock = ui.steps.has('tourist') || ui.steps.has('assign') || ui.steps.has('curtain');
  const meters = ui.steps.has('meters'); const itch = ui.steps.has('itchSeen');
  // fixed chrome stays small on a phone: the name and title on one line, the Curtain clock as a third stat block, the Itch as
  // three dots on the face, and Standing / Notoriety as a thin strip along the bottom edge (tap for the numbers)
  return `<header class="topbar ${meters ? 'has-strip' : ''}">
    <button class="face" data-act="profile-me" aria-label="${esc(w.name)}: her public profile">${img(w.art, w.name, { eager: true })}${itch ? `<span class="itchdots" aria-hidden="true">${[0, 1, 2].map((i) => `<i class="${i < w.itch ? 'on' : ''}"></i>`).join('')}</span>` : ''}</button>
    <div class="who"><b>${esc(w.name)}</b><span><button class="x" data-x="eratitle">${esc(w.title)}</button>${itch ? ` · <button class="x" data-x="itch">Itch ${w.itch}/3</button>` : ''}</span></div>
    <div class="stats"><button class="stat" data-x="renown"><b>${w.renown}</b><span>Renown</span></button><button class="stat" data-x="coin"><b>${w.coin}</b><span>Coin</span></button>${w.gossip > 0 ? `<button class="stat" data-x="gossip"><b>${w.gossip}</b><span>Gossip</span></button>` : ''}${showClock ? `<button class="stat clock" data-x="curtain"><b data-cd="${w.timeline}" data-short="1">${cdShort(w.timeline)}</b><span>Curtain</span></button>` : ''}</div>
    ${meters ? `<button class="sstrip" data-x="standing" aria-label="Standing ${w.standing}, Notoriety ${w.notoriety}"><i class="st" style="width:${w.standing * 5}%"></i><i class="no" style="width:${w.notoriety * 5}%"></i><span class="sr">Standing ${w.standing}, Notoriety ${w.notoriety}</span></button>` : ''}
  </header>`;
}
function gazette(v, extra) {
  const TL = C.TIMELINES[v.whore.timeline];
  return `<div class="gazette"><div class="name">${esc(TL.gazette)}</div>
    <div class="dateline"><span>${esc(TL.short)} · ${esc(TL.year === 'now' ? 'Today' : TL.year)}</span><span>Curtain No. ${v.timeline.curtainNo + 1}</span><span>${esc(extra || TL.quarter)}</span>${!extra && ui.tips.length ? `<button class="link tipslink" data-act="tips">Tips (${ui.tips.length})</button>` : ''}</div></div>`;
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------
const SCREENS = {};

SCREENS.title = () => `
  <section class="sheet tilt-l title-sheet">
    <span class="tape tl"></span><span class="tape tr"></span>
    <p class="kicker center">Extra! Extra! · One penny · All the news unfit to print</p>
    <h1 class="center" style="font-size:clamp(30px,10vw,46px);margin-top:10px">${ransom('LEGENDARY WHORES')}</h1>
    <p class="h2 center" style="margin-top:6px">The Scandal Sheet</p>
    <hr class="rule">
    <p class="deck center">Every era's red-light quarter on one street. Sign the visitors' book, darling.</p>
    <form id="signup" class="field" style="gap:10px" autocomplete="off">
      <div class="field"><label for="nom">Your nom de plume</label><input id="nom" name="nom" maxlength="20" placeholder="e.g. Madam X"></div>
      <div class="field"><label for="pw">Password</label><input id="pw" name="pw" type="password" placeholder="A lady never shares it. Or her age."></div>
      <button class="btn primary block" type="submit">Stop the presses</button>
    </form>
    <p class="small center">A prototype: nothing you type is kept or sent anywhere.</p>
  </section>
  <section class="sheet tilt-r">
    <p class="kicker">Inside today</p>
    <div class="clip-list">
      <p class="small" style="margin:0"><b class="h3">Cowboy lost in London</b><br>Asks a policeman the way to Texas, and what a crumpet is. Page 3.</p>
      <p class="small" style="margin:0"><b class="h3">Vegas showgirl “40% brass”</b><br>Remaining 60% declines to comment. Page 5.</p>
      <p class="small" style="margin:0"><b class="h3">MP dresses piano</b><br>Legs now decent. Piano says it has "never felt so supported". Page 7.</p>
    </div>
  </section>`;

// The opening strip sells the heroines and a laugh, not the rules: the first job teaches the rules by doing.
const RIVALS = [['lavinia', 'scheme', 'victorian/place-salon'], ['clementine', 'prim', 'wildwest/place-last-chance'], ['bettie', 'showtime', 'vegas/place-flamingo']];
const PANELS = [
  { cap: 'The Eternal District: every era\'s red-light quarter on one street. The trams are very confused.',
    art: () => `<div class="trio">${[['dolly', 'pleased', 'victorian/place-tuppenny'], ['fanny', 'eyebrow', 'wildwest/place-last-chance'], ['jackie', 'bubble', 'vegas/place-flamingo']].map(([id, look, place]) => `<div class="trio-cell" style="background-image:url('../art-assets/${place}.webp')">${img(exprArt(id, look), C.CHARACTERS[id].name, { eager: true })}<span class="trio-tag">${esc(C.CHARACTERS[id].short)}</span></div>`).join('')}</div>`, balloon: null },
  { cap: 'Lord Plunkett, MP, has spotted an ankle. Parliament is suspended until further notice.', art: () => img('../art-assets/victorian/gent-plunkett.webp', 'Lord Plunkett, flustered', { eager: true, pos: '50% 8%' }), balloon: 'I say. Is that an ankle?' },
  { cap: 'Every era has a rival who has never lost a Curtain. None of them has met you.', art: () => `<div class="trio">${RIVALS.map(([id, look, place]) => `<div class="trio-cell" style="background-image:url('../art-assets/${place}.webp')">${img(exprArt(id, look), C.CHARACTERS[id].name, { eager: true })}<span class="trio-tag">${esc(C.CHARACTERS[id].short || C.CHARACTERS[id].name)}</span></div>`).join('')}</div>`, stamp: '1st' },
];
SCREENS.intro = () => `
  <section class="sheet">
    <p class="kicker">The story so far · in three panels</p>
    <div class="strip">
      ${PANELS.map((p, i) => `<figure class="panel ${i > ui.introStep ? 'dim' : 'deal'}" style="margin:0">
        <span class="num">${i + 1}</span>
        <div class="art">${i <= ui.introStep ? p.art() : ''}${p.balloon ? `<span class="balloon low">${esc(p.balloon)}</span>` : ''}${p.stamp ? `<span class="stamp big" style="position:absolute;left:18px;bottom:16px;color:var(--stamp-d);border-color:var(--stamp-d)">${p.stamp}</span>` : ''}</div>
        <figcaption class="cap">${esc(p.cap)}</figcaption></figure>`).join('')}
    </div>
    <div class="row">
      <button class="btn primary grow" data-act="intro-next">${ui.introStep < PANELS.length - 1 ? 'Next panel' : 'Meet the suspects'}</button>
      ${ui.introStep < PANELS.length - 1 ? '<button class="btn ghost" data-act="intro-skip">Skip</button>' : ''}
    </div>
  </section>`;

SCREENS.pick = () => {
  const sel = ui.pickId ? C.CHARACTERS[ui.pickId] : null;
  return `
  <section class="sheet cork">
    <p class="kicker">Wanted for questioning</p>
    <h1 class="h1">Who will she be?</h1>
    <p class="deck">Three suspects, three eras. Tap one to hear her.</p>
    <div style="position:relative;padding-top:10px">
      <svg class="string" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M16 4 Q33 13 50 8 Q67 16 84 4" fill="none" stroke="var(--pin)" stroke-width="0.7"/></svg>
      <div class="suspects">
        ${STARTERS.map((id, i) => {
          const ch = C.CHARACTERS[id]; const tl = ch.timeline; const on = ui.pickId === id;
          const said = ui.pickSaid[id];
          return `<button class="suspect ${on ? 'on' : ''}" data-act="suspect" data-id="${id}" data-hold="char:${id}" aria-pressed="${on}">
            <div class="photo"><span class="pin"></span><div class="mini-frame mf-${tl} flashy ${said ? 'said' : ''}" style="--flash-delay:${i * 2.3}s">${img(said ? exprArt(id, FLASH_LOOK[id]) : ch.art, ch.name, { eager: true })}${said ? '' : `<span class="flash" aria-hidden="true">${img(exprArt(id, FLASH_LOOK[id]), '', { eager: true })}</span>`}</div><div class="cap"><b>${esc(ch.name)}</b>${esc(C.TIMELINES[tl].short)}</div></div>
            <span class="temper">${esc(ch.temperament)}</span></button>`;
        }).join('')}
      </div>
    </div>
    <div class="bubble" aria-live="polite">${sel ? `${esc(sel.voice)} <span class="small">· ${esc(sel.temperamentText)} ${esc(sel.short)}: ${esc(TYPE_PLAIN[sel.type])}.</span>` : '<span class="small">Nobody has said anything yet. Suspicious.</span>'}</div>
    <div class="row">
      <button class="btn primary grow" data-act="hire" ${sel ? '' : 'disabled'}>${sel ? 'Her. Print it.' : 'Pick a suspect'}</button>
      ${sel ? `<button class="btn ghost" data-act="open-char" data-id="${sel.id}">Her file</button>` : ''}
    </div>
  </section>`;
};

// A single-use Kink novelty you hold, for a gentleman who hosts tonight: worth more at his Curtain than in an Assignation.
// Uses only what the player can see: the Kink once known, or the stall label's Tell (tellOf), never the hidden kinkFor.
function savedItem(v) {
  const hosts = v.timeline.rota[0].hosts;
  for (const it of v.whore.items) {
    if (it.kind !== 'kink' || !it.ready) continue;
    const gid = it.kinkFor || it.tellOf; if (!gid) continue;
    const pid = Object.keys(hosts).find((p) => hosts[p] === gid);
    const place = pid && v.timeline.places.find((p) => p.id === pid);
    if (place && place.open) return { item: it, gent: v.timeline.gents.find((g) => g.id === gid), place };
  }
  return null;
}
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
// then the widest margin. None qualifies: the step is skipped.
function assignTarget(v) {
  const ids = v.board.filter((b) => !b.tourist && !b.refused).map((b) => b.gent);
  const ok = ids.map(assignOutlook).filter((o) => o && o.clears);
  if (!ok.length) return null;
  ok.sort((a, b) => (b.gent === ui.studied) - (a.gent === ui.studied) || (b.sway - b.bar) - (a.sway - a.bar));
  return v.timeline.gents.find((g) => g.id === ok[0].gent);
}
// The first evening follows rules-core §16/§17: the tourist, a back door (buy or wave off), Tonight's Curtain. The
// Assignation and the Study come after the first Curtain (evening 2 in the design), then the telegram and the boards.
function noteFor(v) {
  const s = ui.steps;
  const fs = v.timeline.places.find((p) => p.id === v.timeline.freshStall);
  if (v.whore.offer) return { t: `A stallholder is waiting with ${v.whore.offer.item.name}. Flip it, then buy or wave him off.`, act: 'open-offer', step: 'offer' };
  if (v.whore.plan && v.whore.plan.sealed) {
    // sealed and waiting for her Curtain: the reason to play another Timeline
    const acct = acctView();
    const other = acct.whores.find((x) => x.id !== v.whore.id && !sealedW(x.id));
    if (other) { const ov = V(other.id); const pk = L.casualPlace(ov); return { t: `${C.CHARACTERS[v.whore.id].short} is sealed and waiting. ${C.CHARACTERS[other.id].short}'s ${pk ? bare(C.PLACES[pk].short) : C.TIMELINES[other.timeline].short} is wide open: off you pop.`, act: 'switch', id: other.id, step: 'hop' }; }
    if (acct.canOpen.length) return { t: `${C.CHARACTERS[v.whore.id].short} is sealed and waiting. A telegram came: tap here to open another Timeline meanwhile.`, act: 'nav', id: 'timelines', step: 'second' };
    return { t: `${C.CHARACTERS[v.whore.id].short} is sealed and waiting for the Curtain. Meanwhile: tap here for the gentlemen between Curtains.`, act: 'scroll', id: 'meanwhile', step: 'waiting' };
  }
  if (!s.has('curtain')) {
    if (!s.has('rummage')) return { t: `Psst! Fresh stock behind ${fs.short}. Tap here, then try its back door.`, act: 'scroll', id: 'doors', step: 'rummage' };
    const save = savedItem(v);
    if (save) return { t: `Tonight's Curtain: ${save.gent.short} hosts ${save.place.short}, and you have just the thing in your reticule. Tap here, then pick a Place.`, act: 'scroll', id: 'places', step: 'curtain' };
    return { t: 'Tonight\'s Curtain: tap here, then pick a Place. The smileys say how well it suits you.', act: 'scroll', id: 'places', step: 'curtain' };
  }
  if (!s.has('assign')) {
    const target = assignTarget(v);
    if (target) return { t: `While you wait for the next Curtain: tap here for an Assignation with ${target.short}, a quick private job paid on the spot.`, act: 'open-gent', id: target.id, step: 'assign' };
  }
  if (!s.has('study')) {
    const hosts = Object.values(v.timeline.rota[0].hosts);
    const g = v.timeline.gents.find((x) => !x.known.secret && hosts.includes(x.id)) || v.timeline.gents.find((x) => !x.known.secret);
    if (g) return { t: `Every ? is a secret. Tap here to meet ${g.short}, then press “Study him”.`, act: 'open-gent', id: g.id, step: 'study' };
  }
  if (!s.has('second') && acctView().canOpen.length) return { t: 'A telegram came. Tap here for your Timelines board.', act: 'nav', id: 'timelines', step: 'second' };
  if (!s.has('players')) return { t: 'How do you rank? Tap here for the Players board.', act: 'nav', id: 'players', step: 'players' };
  return { t: 'That\'s the slice, darling. Tap here for the Final Edition.', act: 'end', step: 'end' };
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
  return `<div class="ahbanner"><b class="h3">After Hours in ${esc(v.timeline.short)}</b><p>Curtains here pay Coin only until the day turns at 06:00. ${el ? `${esc(el.text)}.` : ''}</p>${el ? `<button class="btn small primary" data-act="${el.act}" data-id="${el.id}">Go there →</button>` : ''}</div>`;
}
// The way back through a shut Posh door: Delight a Scrubbed gentleman (each Delight: Standing +1, Notoriety -1).
function wayBack(v) {
  const g = v.timeline.gents.find((x) => x.freshness === 'scrubbed');
  return g ? `Back in: Delight ${g.short} in an Assignation.` : 'Back in: raise your Standing.';
}
// First evening only: sections open as the yellow note's steps complete; the rest is a one-line header you can peek into.
const SECTION_OPENS = { punters: null, doors: 'tourist', reticule: 'rummage', hand: 'rummage', market: 'curtain', rivals: 'curtain' };
const SECTION_LOCK = { doors: 'opens after your first job', reticule: 'opens after a back door', hand: 'opens after a back door', market: 'opens after your first Curtain', rivals: 'opens after your first Curtain' };
function sectionOpen(key) { const need = SECTION_OPENS[key]; return !need || ui.steps.has(need) || ui.steps.has('curtain') || ui.unfold.has(key); }
function lockedSec(key, title) { return `<button class="locked-sec" data-act="unfold" data-id="${key}"><span class="h3">${esc(title)}</span><span class="small">${esc(SECTION_LOCK[key])} · peek</span></button>`; }

SCREENS.front = () => {
  const v = V(); const w = v.whore; const T = v.timeline;
  const note = noteFor(v);
  const first = !ui.steps.has('curtain');
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
      <div class="pimg">${img(p.art, p.name)}<span class="kindtag">${esc(C.PLACE_KINDS[p.kind].name)}${p.raid ? ' · Raid night' : ''}</span>
        ${p.open ? '' : '<span class="stamp shutstamp">Not receiving</span>'}</div>
      <button class="host" data-act="open-gent" data-id="${host.id}" aria-label="Tonight's host, ${esc(host.short)}: read his card">${img(host.art, host.short)}</button>
      <div class="pbody"><span class="h3 era-type">${esc(p.short)}</span>
        <span class="small">Host: <b>${esc(host.short)}</b>${fancy ? ' · weak for your sort' : ''}</span>
        ${first ? '' : `<span class="small">House rule: ${esc(p.house.name)}</span>`}
        <span class="smiles">${p.open ? `${'☺'.repeat(sm)}${'·'.repeat(3 - sm)} ${slum ? 'Slumming? Notoriety +1, Standing −1' : esc(C.LINES.smileys[sm])}${withIt ? ` <b class="withit">with your ${esc(withIt.itemName.replace(/^the /i, ''))}${withIt.kink ? ' (his Kink!)' : ''}</b>` : ''}` : 'Your Notoriety is showing.'} · ${first ? `needs ${p.rules.bar}` : `Bar ${p.rules.bar}`}</span>
        ${p.open ? `<span class="paytag ${w.daily.fullPayLeft ? '' : 'ah'}">${esc(fullPayText(w))}</span>` : `<span class="paytag back">${esc(wayBack(v))}</span>`}</div>
    </div>`;
  }).join('');
  const board = v.board.map((b) => {
    if (b.tourist) {
      const t = T.tourist;
      return `<button class="punter" data-act="start-assign" data-id="${b.gent}" data-hold="tourist:${b.gent}">${photo(t.art, t.short, `<b>${esc(t.short)}</b>`)}<span class="tag">Lost tourist · ${ui.taught.has('bar') ? `Bar ${b.bar}` : 'can\'t fail'}</span></button>`;
    }
    const g = gentsById[b.gent];
    const unknown = (g.known.secret ? 0 : 1) + (g.known.kink ? 0 : 1);
    return `<button class="punter" data-act="open-gent" data-id="${g.id}" data-hold="gent:${g.id}">
      ${unknown ? `<span class="qs" aria-label="${unknown} secrets">${'<i>?</i>'.repeat(unknown)}</span>` : ''}
      ${photo(g.art, g.short, `<b>${esc(g.short)}</b>`)}${hostTonight(v, g.id) ? `<span class="tag host">Hosts ${esc(hostTonight(v, g.id).short)} tonight</span>` : ''}<span class="tag">${b.backAlley ? 'Back alley · ' : ''}${ui.taught.has('bar') ? `${esc(C.FRESHNESS[g.freshness].name)} · Bar ${b.bar}` : `${FRESH_PLAIN[g.freshness]} (needs ${b.bar})`}</span></button>`;
  }).join('');
  const hiddenAlley = T.gents.filter((g) => !v.board.some((b) => b.gent === g.id));
  const doors = T.places.map((p) => `<button class="door" data-act="rummage" data-id="${p.id}"><span><b>Behind ${esc(p.short)}</b><br><span class="small">${p.stall.length ? esc(p.stall.map((it) => (it.blackMarket && w.notoriety < R.rummage.blackMarketAt ? 'something under the counter' : it.name)).join(', ')) : 'Odds and ends'}</span></span>${p.id === T.freshStall ? '<span class="fresh">Fresh stock</span>' : '<span class="small">Try it</span>'}</button>`).join('');
  const items = w.items.map((it) => `<button class="item" data-act="open-item" data-id="${it.idx}" data-hold="item:${it.idx}">${img(it.art, it.name)}<b>${esc(it.name)}</b><span class="small">${it.usesLeft > 50 ? 'Reusable' : plural(it.usesLeft, 'use')}${it.ready ? '' : ' · resting'}</span></button>`).join('');
  const offer = w.offer ? `<button class="item on" data-act="open-offer" data-hold="offer:0">${img(w.offer.item.art, w.offer.item.name)}<b>${esc(w.offer.item.name)}</b><span class="small">On offer · ${w.offer.price} Coin</span></button>` : '';
  const curses = w.afflictions.map((a) => `<button class="item" data-act="open-affl" data-id="${a.id}">${img(a.art, a.name)}<b>${esc(a.name)}</b><span class="small">Curse ×${a.copies} · cure ${a.cure.cost} Coin</span></button>`).join('');
  const rivals = T.rivals.map((r) => `<button class="rival" data-act="profile" data-id="${r.id}">${photo(r.art, r.name, `<b>${esc(C.CHARACTERS[r.id].short)}</b>${esc(r.title)}`, { pin: false })}<span class="lbl">${badgeFor(r, 'span')}</span></button>`).join('');
  const curtainSec = `<section class="sheet" data-sec="curtain">
    <div class="sec-head" id="places"><span class="h2">Tonight's Curtain</span><span class="type"><span data-cd="${w.timeline}">${cdText(w.timeline)}</span> · <button class="x" data-x="curtain">how it works</button></span></div>
    ${w.plan && w.plan.sealed ? `<p class="sealwait"><b>Sealed for ${esc(C.PLACES[w.plan.place].short)}.</b> <span data-seal="${w.id}">${esc(sealText(w.id))}</span></p>` : ''}
    ${afterHoursBanner(v)}
    <div class="places">${places}</div>
    ${poshClosed && !first ? `<p class="small">${esc(wayBack(v))} Each Delight: Standing +1, Notoriety −1.</p>` : ''}
  </section>`;
  const meanwhileSec = `<section class="sheet tilt-r" data-sec="meanwhile">
    <div class="sec-head" id="meanwhile"><span class="h2">Meanwhile, between Curtains</span><button class="x type" data-x="assignation">Assignations</button></div>
    <p class="small">Tap a gentleman to read his card, Study him or take him on.</p>
    <div class="punters">${board}</div>
    ${hiddenAlley.length ? `<p class="locked-note">${hiddenAlley.length === 1 ? 'A third gentleman lurks' : 'Gentlemen lurk'} in the back alley. Notoriety 1+ to meet him.</p>` : ''}
    ${sectionOpen('doors') ? `<div class="sec-head" id="doors"><span class="h2">Back doors</span><button class="x type" data-x="rummage">${w.daily.freshRummagesLeft} fresh tries today</button></div>
    <div class="doors">${doors}</div>` : `<div id="doors">${lockedSec('doors', 'Back doors')}</div>`}
  </section>`;
  // Sections already seen fold to a one-line header with a count (tap to open), so the page stays short.
  const shown = (key) => { ui.secShown.add(key); return true; };
  const fold = (key, title, count) => `<button class="fold-sec" data-act="fold" data-id="${key}" aria-expanded="false"><span class="h3">${esc(title)}</span><span class="type">${esc(count)} ▾</span></button>`;
  const folded = (key) => !first && ui.secSeen.has(key) && !ui.secOpen.has(key);
  const unfoldBtn = (key) => (ui.secSeen.has(key) && !first ? `<button class="link type fold-x" data-act="fold" data-id="${key}" aria-expanded="true">fold ▴</button>` : '');
  const handPart = !sectionOpen('hand') ? lockedSec('hand', 'Your hand tonight') : folded('hand') ? fold('hand', 'Your hand tonight', plural(w.hand.length, 'card'))
    : shown('hand') && `<div class="sec-head"><span class="h2">Your hand tonight</span><span class="row tight"><button class="x type" data-x="arts">the five Arts</button>${unfoldBtn('hand')}</span></div>
    <div class="hand">${w.hand.map((c) => cardEl(c, { act: 'inspect-card' })).join('')}</div>`;
  const retPart = !sectionOpen('reticule') ? lockedSec('reticule', 'The reticule') : folded('reticule') && !w.offer ? fold('reticule', 'The reticule', `${w.items.length}/${R.reticule} novelties${curses ? ' · a curse' : ''}`)
    : shown('reticule') && `<div class="sec-head"><span class="h2">The reticule</span><span class="row tight"><span class="type">${w.items.length}/${R.reticule} novelties</span>${unfoldBtn('reticule')}</span></div>
    ${items || offer || curses ? `<div class="reticule">${offer}${items}${curses}</div>` : '<p class="empty-note">Empty, save a hairpin and a mint. Rummage a back door.</p>'}`;
  const handSec = `<section data-sec="hand" class="sheet tilt-l ${sectionOpen('hand') || sectionOpen('reticule') ? '' : 'locked-stack'}">${handPart}${retPart}</section>`;
  const marketSec = !sectionOpen('market') ? '' : `<section class="sheet">${folded('market') ? fold('market', 'The market', `${T.market.length} new tricks`) : shown('market') && `
    <div class="sec-head"><span class="h2">The market</span><span class="row tight"><span class="type">new tricks for your deck</span>${unfoldBtn('market')}</span></div>
    <div class="market">${T.market.map((c, i) => `<div class="mcol">${cardEl({ ...c, idx: i }, { act: 'inspect-market', src: 'market' })}<button class="btn small" data-act="buy-card" data-id="${c.id}" ${w.coin >= c.cost ? '' : 'disabled'}>Learn · ${c.cost}</button></div>`).join('')}</div>`}
  </section>`;
  const rivalSec = !sectionOpen('rivals') ? '' : `<section class="sheet">${folded('rivals') ? fold('rivals', 'The competition', `${T.rivals.length} in ${T.short}${w.gossip ? ` · ${plural(w.gossip, 'Gossip')} to trade` : ''}`) : shown('rivals') && `
    <div class="sec-head"><span class="h2">The competition</span><span class="row tight"><span class="type">${T.rivals.length} in ${esc(T.short)}</span>${unfoldBtn('rivals')}</span></div>
    ${w.gossip ? `<p class="small">You hold ${plural(w.gossip, 'piece')} of <button class="x" data-x="gossip">Gossip</button>: tap a rival to trade it.</p>` : ''}
    <div class="rivals">${rivals}</div>`}
  </section>`;
  const lockedTail = !sectionOpen('market') || !sectionOpen('rivals') ? `<section class="sheet locked-stack">${sectionOpen('market') ? '' : lockedSec('market', 'The market')}${sectionOpen('rivals') ? '' : lockedSec('rivals', 'The competition')}</section>` : '';
  const meanwhileFirst = first && ['rummage', 'offer'].includes(note.step);
  // First evening: the yellow note docks above the bottom bar, so "what next" is always on screen.
  const docked = first;
  const noteBtn = `<button class="note ${docked ? 'docked' : ''}" data-act="note" data-kind="${note.act}" data-id="${note.id || ''}" data-step="${note.step}"><b>Next</b><span>${esc(note.t)}</span><span class="tap" aria-hidden="true">Tap ›</span></button>`;
  return `${topbar(v)}
  <section class="sheet">
    ${gazette(v)}
    ${stripHTML()}
    ${docked ? '' : noteBtn}
  </section>
  ${meanwhileFirst ? meanwhileSec + curtainSec : curtainSec + meanwhileSec}
  ${handSec}${marketSec}${rivalSec}${lockedTail}${docked ? noteBtn : ''}`;
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
  const firstGutter = p.kind === 'gutter' && !w.slummed && !w.places.some((pid) => C.PLACES[pid].kind === 'gutter');
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
    return { kind: t, card: ui.sel[0], art: ui.deArt || bestDEArt(v, mode) };
  }
  if (t === 'smokescreen' || t === 'make-him-wait' || (t === 'upstage' && mode === 'plan')) return { kind: t };
  return null;
}
function bestDEArt(v, mode) {
  let best = null;
  for (const a of C.ART_IDS) {
    const opt = mode === 'plan' ? { place: ui.place } : { gent: v.whore.assignation.gent };
    const p = L.previewEncounter(v, { ...opt, cards: ui.sel, item: ui.item, talent: { kind: 'double-entendre', card: ui.sel[0], art: a } });
    if (!best || p.sway > best.s) best = { a, s: p.sway };
  }
  return best ? best.a : 'wit';
}
function talentBlock(v, mode) {
  const t = v.whore.talent; const T = C.TALENTS[t];
  const usable = { assign: ['double-entendre', 'smokescreen', 'make-him-wait'], plan: ['double-entendre', 'smokescreen', 'make-him-wait', 'upstage', 'quick-change', 'read-the-room'] }[mode];
  if (!usable.includes(t)) return '';
  if (v.whore.talentUsed) return `<p class="small">Talent <b>${esc(T.name)}</b> is spent until the next Curtain.</p>`;
  if (t === 'quick-change') return `<div class="row"><button class="btn small" data-act="quick-change" ${ui.sel.length ? '' : 'disabled'}>Quick Change${ui.sel.length ? `: swap ${esc(v.whore.hand[ui.sel[ui.sel.length - 1]].name)}` : ': pick a card first'}</button><span class="small">${esc(T.text)}</span></div>`;
  if (t === 'read-the-room') return `<div class="row"><button class="btn small" data-act="read-room">Read the Room</button><span class="small">${esc(T.text)}</span></div>`;
  const de = t === 'double-entendre' && ui.talentOn && ui.sel.length;
  const card = de ? (mode === 'plan' ? v.whore.hand[ui.sel[0]] : v.whore.assignation.lent[ui.sel[0]]) : null;
  const art = de ? (ui.deArt || bestDEArt(v, mode)) : null;
  const once = mode === 'assign' ? ' <b>Once per Curtain:</b> use it here and it is spent for tonight\'s Curtain.' : '';
  return `<div class="row"><button class="btn small ${ui.talentOn ? 'primary' : ''}" data-act="talent-toggle" aria-pressed="${ui.talentOn}">${esc(T.name)}: ${ui.talentOn ? 'on' : 'off'}</button>
    <span class="small" style="flex:1 1 160px">${de ? `${esc(card.name)} also counts as <button class="link" data-act="de-art">${artLabel(art)}</button>.` : esc(T.text)}${once}</span></div>`;
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
  return `<div class="taste-row" aria-label="What he likes">${g.tastes.map((a) => `<span class="tg good">✓${artIcon(a)}${esc(C.ARTS[a].name)}</span>`).join('')}<span class="tg bad">✗${artIcon(g.aversion)}${esc(C.ARTS[g.aversion].name)}</span>${g.known.secret ? `<span class="tg good">✓${artIcon(g.secretTaste)}secretly</span>` : ''}<span class="tg ${g.fancy === w.type ? 'solid' : ''}">Fancy: ${esc(C.TYPES[g.fancy].name)}${g.fancy === w.type ? ' (you!)' : ''}</span></div>`;
}
function itchWarn(v, pv) {
  if (pv.catches) return `<p class="warn">Itch ${v.whore.itch} → ${pv.itchAfter}: you'd catch ${esc(C.AFFLICTIONS[pv.catches].name)}. Fancy it?</p>`;
  return '';
}
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
const placeShort = (pid) => C.PLACES[pid].short;
// The push-your-luck, face up: the better play Best Guess held back because it would catch something.
function betBlock(d) {
  const gm = d.bg.gamble; if (!gm || d.tourist || sameSet(ui.sel, gm.cards)) return '';
  const A = C.AFFLICTIONS[gm.catches];
  let coin = '';
  if (d.mode === 'assign') { const c = L.assignationPay(d.v, gm.sway, gm.cards).coin - L.assignationPay(d.v, d.bgPrev.sway, d.bg.cards).coin; if (c > 0) coin = `, +${c} Coin`; }
  return `<div class="bet"><p><b>Fancy a gamble?</b> Itch ${d.v.whore.itch} → 3: you'd catch ${esc(A.name)}. +${gm.gain} Sway${coin}.</p><button class="btn small" data-act="take-bet">Take the bet</button></div>`;
}
// What spending a single-use novelty or tonight's Talent here costs at tonight's Curtain (from Best Guess, visible facts only).
function costLine(d) {
  if (d.mode !== 'assign' || d.tourist) return '';
  const v = d.v; const hosts = v.timeline.rota[0].hosts; const out = [];
  const openPid = (gid) => Object.keys(hosts).find((p) => hosts[p] === gid && v.timeline.places.find((x) => x.id === p).open);
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
    const de = L.bestDoubleEntendre ? L.bestDoubleEntendre(v, { place: pid, cards: L.bestGuess(v, pid).cards }) : null;
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
function gentChips(g, w) {
  return `<div class="chips">
    ${g.tastes.map((a) => `<button class="chip good" data-x="tick">✓ ${artLabel(a)}</button>`).join('')}
    <button class="chip bad" data-x="aversion">✗ ${artLabel(g.aversion)}</button>
    <button class="chip ${g.fancy === w.type ? 'solid' : ''}" data-x="fancy">Fancy: ${esc(C.TYPES[g.fancy].name)}</button>
    <button class="chip" data-x="freshness">${esc(C.FRESHNESS[g.freshness].name)}</button>
    <button class="chip ${g.known.secret ? 'good' : 'q'}" data-x="secret">${g.known.secret ? `Secretly ${artLabel(g.secretTaste)}` : 'Secret: ?'}</button>
    <button class="chip ${g.known.kink ? 'good' : 'q'}" data-x="kink">${g.known.kink ? `Kink: ${esc(g.kink.name)}` : 'Kink: ?'}</button>
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
      ? [{ t: 'He\'ll have Seen It tonight (−1 on your Curtain copy)', cls: 'seen' }] : [];
    return cardEl(c, { src, act: 'pick', sel: pos >= 0, marks: [...marksFor(d.v, info), ...(d.tourist ? [] : seenMark(d.v, d.gid, c.id)), ...tonightSeen], score: info.score, glow, deal: d.mode === 'assign' && !ui.aDealt && !noDeal, delay: c.idx * 120, noPocket: d.tourist });
  }).join('');
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
  if (d.mode === 'assign') sub.push(d.tourist ? `Delighted at ${d.delight}` : `Bar ${d.bar} · Delight ${d.delight}`);
  else sub.push(`Bar ${d.bar}`);
  if (picked && d.pv.itch > 0) sub.push(`<span class="itchd">Itch +${d.pv.itch} → ${Math.min(R.itchMax, d.v.whore.itch + d.pv.itch)}</span>`);
  else if (picked && d.pv.itchRaw > d.pv.itch) sub.push('Itch shrugged off');
  const extra = [];
  if (d.mode === 'plan' && d.v.whore.curtains > 0) extra.push(`<button class="chip ${d.v.whore.daily.fullPayLeft ? '' : 'bad'}" data-x="fullpay">${d.v.whore.daily.fullPayLeft ? `Full pay ${d.v.whore.daily.fullPayLeft} of ${R.curtain.fullPayPerDay} left` : 'After Hours'}</button>`);
  if (d.rival && !(d.mode === 'plan' && d.v.whore.curtains === 0)) extra.push(`<button class="chip bad" data-x="${d.rival.talent === 'upstage' ? 'upstage' : 'standin'}">${esc(C.CHARACTERS[d.rival.id].short)} here${d.rival.talent === 'upstage' ? ' · Upstage −2' : ''}</button>`);
  const sealBlocked = d.mode === 'plan' && ((d.firstGutter && !ui.slumOk) || !d.p.open);
  const acts = d.mode === 'assign'
    ? `<button class="btn small ${picked ? '' : 'primary'}" data-act="best-guess-a">Best Guess</button><button class="btn ${picked ? 'primary' : ''}" data-act="play-assign" ${picked ? '' : 'disabled'}>${picked ? `Work ${ui.sel.length === 2 ? 'them' : 'it'}` : 'Tap a card first'}</button>`
    : `<button class="btn small ${picked ? '' : 'primary'}" data-act="best-guess-p">Best Guess</button><button class="btn ${picked ? 'primary' : ''}" data-act="seal" ${sealBlocked ? 'disabled' : ''}>Seal it${d.v.whore.daily.fullPayLeft === 1 ? '<small class="lastpay">last full pay today</small>' : d.v.whore.daily.fullPayLeft === 0 ? '<small class="lastpay">After Hours</small>' : ''}</button>`;
  return meterEl({ sway: d.pv.sway, from, bar: d.bar, delight: d.mode === 'assign' ? d.delight : null, bg: !d.tourist && d.bg.cards.length ? d.bgPrev.sway : null, parts: d.pv.parts, unknown: d.pv.unknown.length > 0, tourist: d.tourist, picked, sub: sub.join(' · '), acts, extra: extra.join('') });
}
function dynAssign(d) {
  return [
    d.tourist && ui.sel.length === 1 && d.pv.sway < d.delight ? '<p class="type tip">Add the other glowing card for a Delight.</p>' : '',
    d.tourist ? '' : itemsBlock(d), d.tourist ? '' : talentBlock(d.v, 'assign'), costLine(d), betBlock(d), itchWarn(d.v, d.pv),
  ].join('');
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
  if (canStake) out.push(`<div class="row"><button class="btn small ${ui.stake ? 'primary' : ''}" data-act="stake" aria-pressed="${ui.stake}" ${w.coin >= R.gambler.stake ? '' : 'disabled'}>Gambler: stake ${R.gambler.stake} Coin</button><span class="small">Take 1st and collect ${R.gambler.payout}. Otherwise it's gone.</span></div>`);
  if (canGrease) out.push(`<div class="row"><span class="small">Grease palms (+1 Sway per ${w.charm === 'born-in-a-gin-shop' ? 1 : R.sway.grease.costPer} Coin):</span>${[0, 1, 2].map((n) => `<button class="btn small ${ui.grease === n ? 'primary' : ''}" data-act="grease" data-id="${n}">${n}</button>`).join('')}</div>`);
  // doors that will close are printed face up before you commit
  const o = L.placeOutlook ? L.placeOutlook(v, p.id) : null;
  const posh = d.T.places.find((x) => x.kind === 'posh');
  const shuts = !!(o && o.shutsPosh && posh && posh.open);
  const scrubbed = d.T.gents.find((x) => x.freshness === 'scrubbed');
  const shutLine = shuts ? `${posh.short} stops receiving you until you Delight ${scrubbed ? scrubbed.short : 'a Scrubbed gentleman'} in an Assignation.` : '';
  const shutCard = shuts ? `<div class="shut-preview"><div class="mini">${img(posh.art, posh.name)}<span class="tag">Closes if you go</span></div><span class="small"><b>${esc(posh.short)}</b>${d.firstGutter ? ' would shut its door to you tonight.' : ` · ${esc(shutLine)}`}</span></div>` : '';
  if (d.firstGutter) out.push(`<div class="slum"><div class="row"><button class="btn small ${ui.slumOk ? 'primary' : ''}" data-act="slum" aria-pressed="${ui.slumOk}">Go slumming?</button><span class="small">Notoriety +1, Standing −1.${shuts ? ` ${esc(shutLine)}` : ''}</span></div>${shutCard}</div>`);
  else if (shuts) out.push(`<div class="slum">${shutCard}</div>`);
  out.push(betBlock(d), itchWarn(v, d.pv));
  return out.join('');
}
// The plan opens with tonight's host just under the top bar (who the cards are for, and who is competing); the hand
// is pulled up only if it would otherwise sit behind the tray.
function scrollHostIntoView() {
  const host = $('.play-sheet .gent-head'); const bar = $('.topbar');
  if (!host) { scrollHandIntoView(); return; }
  const top = host.getBoundingClientRect().top + window.scrollY - (bar ? bar.getBoundingClientRect().height : 0) - 8;
  window.scrollTo(0, Math.max(0, top));
  const hand = $('.hand.play'); const tray = $('.tray');
  if (hand && tray && hand.getBoundingClientRect().top > window.innerHeight - tray.getBoundingClientRect().height - 66 - 40) scrollHandIntoView();
}
function scrollHandIntoView() {
  const hand = $('.hand.play'); const tray = $('.tray'); if (!hand) return;
  const r = hand.getBoundingClientRect(); const trayH = tray ? tray.getBoundingClientRect().height : 0;
  const dockH = 66; const room = window.innerHeight - dockH - trayH - 8;
  if (r.bottom > room) window.scrollTo(0, window.scrollY + (r.bottom - room));
}
function setTrayH() {
  const t = ['assign', 'plan'].includes(ui.screen) ? $('.tray') : null;
  document.body.style.setProperty('--tray-h', `${t ? Math.round(t.getBoundingClientRect().height) : 0}px`);
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
      el.className = f.className; el.setAttribute('aria-pressed', f.getAttribute('aria-pressed') || 'false');
      const m = el.querySelector('.marks'); const fm = f.querySelector('.marks'); if (m && fm) m.innerHTML = fm.innerHTML;
      const sc = el.querySelector('.score'); const fs = f.querySelector('.score');
      if (sc && fs) sc.replaceWith(fs); else if (fs) el.appendChild(fs); else if (sc) sc.remove();
    });
  }
  const dyn = $('.dyn'); if (dyn) dyn.innerHTML = d.mode === 'assign' ? dynAssign(d) : dynPlan(d);
  const tray = $('.tray');
  const prev = ui.lastSway ?? d.pv.sway;
  if (tray) {
    const tmp = document.createElement('div'); tmp.innerHTML = trayHTML(d);
    const nm = tmp.querySelector('.meter'); const om = tray.querySelector('.meter');
    if (om && nm) {
      const of = om.querySelector('.fill'); const nf = nm.querySelector('.fill');
      of.className = nf.className; of.style.width = `${nf.dataset.w}%`;
      om.querySelectorAll('.mark').forEach((x) => x.remove());
      nm.querySelectorAll('.mark').forEach((x) => om.querySelector('.track').appendChild(x));
      om.querySelector('.line').replaceWith(nm.querySelector('.line'));
      const ol = om.querySelector('.legend'); const nl = nm.querySelector('.legend');
      if (ol) ol.remove(); if (nl) om.appendChild(nl);
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
function countUp(el, from, to) {
  if (!el) return;
  if (calm() || from === to) { el.textContent = to; return; }
  const t0 = performance.now(); const dur = 280;
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
  return `${topbar(v)}
  <section class="sheet play-sheet">
    <div class="row" style="justify-content:space-between"><p class="kicker">${tourist ? 'Stop press · a tourist' : 'Assignation · a private job'}</p>${tourist ? '' : '<button class="btn small ghost" data-act="cancel-assign">Walk away <span class="small">(these 3 cards wait for the next gent)</span></button>'}</div>
    <h2 class="h2">${tourist ? esc(C.LINES.tourist[v.whore.timeline]) : `${esc(g.short)} is waiting`}</h2>
    <div class="gent-head">
      <button class="punter" data-act="${tourist ? 'noop' : 'open-gent'}" data-id="${gid}" aria-label="${esc(who.short)}">${photo(who.art, who.short, `<b>${esc(who.short)}</b>`)}</button>
      <div class="meta">
        <p class="voice">“${esc(who.voice)}”</p>
        ${tourist ? `<div class="chips"><button class="chip good" data-x="tick">✓ Likes ${artLabel(who.taste)}</button><span class="chip">Can't fail with him</span></div>` : `${gentChips(g, v.whore)}${studyBtn(v, g)}`}
      </div>
    </div>
    ${!tourist && hostTonight(v, gid) ? `<p class="hosttag">Hosts ${esc(hostTonight(v, gid).short)} tonight: satisfy him now and you are his Regular, +1 at the Curtain.</p>` : ''}
    <p class="type instr">Tap 1 or ${R.assignMaxCards} cards, then Work them.</p>
    ${tourist ? '' : tasteRow(g, v.whore)}
    <div class="hand play">${cards}</div>
    <div class="hlslot" aria-live="polite"></div>
    <div class="dyn">${dynAssign(d)}</div>
    <div class="hints"><span class="by">Our correspondent writes</span>${lines.map((l) => `<p>${escE(l)}</p>`).join('')}</div>
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
  const applause = p.house.applause != null ? p.house.applause : PR.applause;
  const kinkItem = itemGains(d).some((x) => x.kink);
  // a Timeline's first Curtain shows the decision and nothing else: the pay chips, the rival box, the Talent and the full
  // correspondent's column wait for Curtain 2 (the front page reveals things the same way)
  const firstC = w.curtains === 0;
  const openHints = !firstC && kinkItem && !ui.taught.has('itemhint');
  if (openHints) ui.taught.add('itemhint');
  return `${topbar(v)}
  <section class="sheet">
    <div class="row" style="justify-content:space-between"><button class="btn small ghost" data-act="go" data-id="front">Back</button><span class="type">Curtain <span data-cd="${w.timeline}">${cdText(w.timeline)}</span></span></div>
    <div class="place banner"><div class="pimg">${img(p.art, p.name, { eager: true })}<span class="kindtag"><button class="x" data-x="${p.kind}" style="color:inherit">${esc(C.PLACE_KINDS[p.kind].name)}</button>${p.raid ? ' · Raid night' : ''}</span></div>
      <div class="pbody"><span class="h2 era-type">${esc(p.name)}</span><span class="small">${esc(p.blurb)}</span>
      ${firstC ? '' : `<span class="small"><button class="x" data-x="house">${esc(p.house.name)}</button>: ${esc(p.house.text)}</span>`}</div></div>
    ${firstC ? '' : `<div class="chips"><span class="chip solid">Bar ${PR.bar}</span><button class="chip" data-x="split">1st ${PR.renown[0]}${applause ? `+${applause}` : ''} Renown${PR.coin[0] ? `, ${PR.coin[0]} Coin` : ''}</button><span class="chip">2nd ${PR.renown[1]}</span><span class="chip">3rd ${PR.renown[2]}</span><button class="chip" data-x="doorgift">Door gift ${PR.doorGift} Coin</button><button class="chip ${w.daily.fullPayLeft ? '' : 'bad'}" data-x="fullpay">${esc(fullPayText(w))}</button></div>`}
    ${afterHoursBanner(v)}
    ${rival && !firstC ? `<div class="clip rivalclip"><button class="rface" data-act="profile" data-id="${rival.id}" aria-label="${esc(rival.name)}: her profile">${img(exprArt(rival.id, 'scheme'), rival.name)}</button><div><b class="h3">Rival sighted</b> ${badgeFor(rival)}<p>${esc(rival.name)} ${scripted ? 'has her eye on your Place tonight.' : 'is heading here tonight, says a little bird.'}</p>${rival.talent === 'upstage' ? '<button class="chip bad" data-x="upstage">If you finish just above her, she Upstages you: −2</button>' : ''}</div></div>` : ''}
  </section>
  <section class="sheet play-sheet">
    <p class="kicker">Tonight's host</p>
    <div class="gent-head">
      <button class="punter" data-act="open-gent" data-id="${g.id}" data-hold="gent:${g.id}">${photo(g.art, g.short, `<b>${esc(g.short)}</b>`)}</button>
      <div class="meta"><p class="voice">“${esc(g.voice)}”</p>${gentChips(g, w)}${studyBtn(v, g)}</div>
    </div>
    <div class="sec-head"><span class="h2">Pick up to ${R.maxCurtainCards} cards</span><button class="x type" data-x="tick">ticks &amp; crosses</button></div>
    ${tasteRow(g, w)}
    <div class="hand play">${playCards(d)}</div>
    <div class="hlslot" aria-live="polite"></div>
    <div class="dyn">${dynPlan(d)}</div>
    <details class="hints" ${openHints ? 'open' : ''}><summary class="by">${firstC ? `${esc(oneLiner(d))} <span class="link">more</span>` : 'Our correspondent writes'}</summary>${hintLines(g, w).map((l) => `<p>${escE(l)}</p>`).join('')}${L.describeMatchup(p, w).lines.map((l) => `<p class="small">${escE(l)}</p>`).join('')}</details>
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
  for (const p of v.timeline.places) for (const it of p.stall) {
    if ((it.blackMarket && v.whore.notoriety < R.rummage.blackMarketAt) || v.whore.items.some((x) => x.id === it.id)) continue;
    const b = L.bestGuess(v, place, { item: it.id });
    if (b.sway > bg.sway) alts.push({ name: it.name, where: `behind ${p.short}, ${it.cost} Coin`, cost: it.cost, sway: b.sway });
  }
  const g = v.timeline.gents.find((x) => x.id === host);
  // pure: exactly what an unstudied Best Guess plays, nothing added. Its luck is luck, not thinking.
  const pure = sameSet(plan.cards, blindCards) && !plan.item && !plan.talent && !plan.grease && !plan.stake;
  return { place, bg: bg.sway, bgCards: bg.cards, blindSway, blindCards, planSway, alts, kept, pure, hasItem: !!plan.item, hasTalent: !!plan.talent, unknownKink: !!(g && !g.known.kink), unknownSecret: !!(g && !g.known.secret), host };
}
// A pure Best Guess play that did better than its own preview did so on facts she could not see: luck, not thinking.
function luckLine(bd, known, extra, gentShort) {
  if (bd && bd.kinkHit && !known.kink) return `${gentShort}'s secret Kink fired by luck: +${R.sway.kink}. Study him to make it a plan.`;
  if (bd && bd.secretHit && !known.secret) return `${gentShort}'s Secret Taste ticked by luck. Study him to make it a plan.`;
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
    if (gain > 0 || extra > 0) out.push(happyClip(luckLine(pay.breakdown, { kink: !h.unknownKink, secret: !h.unknownSecret }, extra, host)));
  } else if (gain > 0) {
    // the baseline is a player who never studied him and did no Assignation today; then what each kind of thinking added
    const studied = h.bg - h.blindSway; const extras = h.planSway - h.bg;
    const added = [h.hasItem ? 'novelty' : '', h.hasTalent ? 'Talent' : ''].filter(Boolean).join(' and ') || 'cards';
    const finer = [studied > 0 ? `Study and today's Regulars added +${studied} Sway` : '', extras > 0 ? `your ${added} added +${extras}` : ''].filter(Boolean);
    const fin = finer.join('; ');
    out.push(`<div class="clip win"><b class="h3">Thinking pays</b><p>A player who hadn't studied ${esc(host)}: ${h.blindSway} Sway${blindRes.upstaged ? ` (${blindRes.sway} after her Upstage)` : ''}, ${placed(blindRes)}, ${blindRes.renown} Renown. You: ${pay.renown}.${fin ? ` ${esc(fin.charAt(0).toUpperCase() + fin.slice(1))}.` : ''}</p></div>`);
  }
  // a novelty she carried and left in the reticule, when it would have paid more (even without winning outright)
  const kept = (h.kept || []).map((k) => ({ ...k, res: wi(k.sway) })).filter((k) => k.res.renown > pay.renown).sort((a, b) => b.res.renown - a.res.renown)[0];
  if (kept) out.push(`<div class="clip hind"><b class="h3">Left in the reticule</b><p>The ${esc(kept.name.replace(/^the /i, ''))} stayed in your reticule: it would have scored ${kept.sway}${kept.res.upstaged ? ` (${kept.res.sway} after her Upstage)` : ''}, ${placed(kept.res)}, +${kept.res.renown - pay.renown} Renown more.</p></div>`);
  if (pay.rank === 0 && !tied) return out.join('');
  if (kept) return out.join('');
  // a loss or a dead heat: what would have won it outright (the cheapest novelty first, then the Sway it needed)
  const wins = h.alts.filter((a) => a.cost > 0).map((a) => ({ ...a, res: wi(a.sway) })).filter((a) => sole(a.res)).sort((a, b) => a.cost - b.cost || b.sway - a.sway);
  const title = tied ? 'What would have won it outright' : 'What would have won';
  if (wins.length) {
    const b = wins[0];
    out.push(`<div class="clip hind"><b class="h3">${title}</b><p>${esc(b.name)}, ${esc(b.where)}: ${b.sway}${b.res.upstaged ? ` (${b.res.sway} after her Upstage, still enough)` : ''}, sole 1st, ${tied ? `+${b.res.renown - pay.renown} Renown more` : `+${b.res.renown} Renown`}.</p></div>`);
    return out.join('');
  }
  let need = null;
  for (let s2 = (pay.sway || 0) + 1; s2 <= (pay.sway || 0) + 12; s2++) { if (sole(wi(s2))) { need = s2; break; } }
  const kink = h.unknownKink ? ` ${C.GENTS[h.host].short}'s Kink is still a secret: Study him twice, and the right novelty is worth +${R.sway.kink}.` : '';
  if (need) out.push(`<div class="clip hind"><b class="h3">${title}</b><p>${need} Sway would have taken 1st on your own${need - (pay.sway || 0) >= 2 && others.some((e) => e.upstage) ? ' (Upstage and all)' : ''}.${esc(kink)}</p></div>`);
  else if (kink) out.push(`<div class="clip hind"><b class="h3">${title}</b><p>${esc(kink.trim())}</p></div>`);
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
    if (id === w.id) return { name: w.name, art: exprArt(w.id, pay.rank === 0 ? PLEASED_LOOK[w.id] : pay.rank === null ? CAUGHT_LOOK[w.id] : 'x'), me: true };
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
  const head = tied ? `Dead heat at ${P.short.replace(/^The /, 'the ')}!` : pay.rank === 0 ? `${me} takes ${P.short.replace(/^The /, 'the ')}!` : pay.rank !== null ? `${me} places ${ord(pay.rank)}` : `${me} falls short`;
  const winner = pr.entries.find((e) => e.rank === 0);
  const reacts = C.GENTS[pr.host].reactions && C.GENTS[pr.host].reactions.delighted;
  const glee = reacts && reacts.length ? reacts[(T.curtainNo + pr.entries.length) % reacts.length] : `${C.GENTS[pr.host].short} is in raptures.`;
  // dead heat, worded from the payout: the tied whores split the pots they occupy
  const pots = tied ? [...Array(tiedWith.length + 1).keys()].map((i) => pay.rank + i).filter((k) => k < 3).map(ord) : [];
  const each = tied ? Math.max(pay.renown, ...tiedWith.map((e) => e.renown || 0)) : 0;
  const potWords = pots.length > 1 ? `${pots.slice(0, -1).join(', ')} and ${pots[pots.length - 1]}` : pots[0];
  const sub = tied ? `You and ${tiedWith.map((e) => info(e.whore).name).join(' and ')} share the ${potWords} ${pots.length > 1 ? 'pots' : 'pot'}: +${each} Renown each. One more point of Sway would have paid more.`
    : pay.rank === 0 ? `${glee} The lion's share is hers.` : winner ? `${info(winner.whore).name} charmed ${C.GENTS[pr.host].short}. ${pay.rank !== null ? 'A share all the same.' : 'Door gift and a Brave Face.'}` : 'Nobody reached the Bar. The house keeps the pot.';
  const upstager = pr.entries.find((e) => e.upstage);
  const entries = pr.entries.map((e) => {
    const isMe = e.whore === w.id; const who = info(e.whore, e);
    const sway = isMe ? pay.sway : e.sway;
    const renown = paid(e);
    const ups = isMe ? pay.upstaged : e.upstaged;
    const by = isMe && pay.upstagedBy && pay.upstagedBy.length ? pay.upstagedBy.map((id) => info(id).name).join(' & ') : (upstager ? info(upstager.whore).name : '');
    return `<div class="entry ${isMe ? 'me' : ''} ${e.rank === null ? 'short' : ''}"><div class="face">${img(who.art, who.name)}</div>
      <div class="who"><b>${esc(who.name)}${isMe ? ' (you)' : ''}</b><span>${isMe ? '' : badgeFor(who)}</span><span class="bar"><i data-w="${sway != null ? Math.round((sway / maxSway) * 100) : 0}"></i></span>
      <span class="small">${sway != null ? `${sway} Sway` : 'short of the Bar'}${e.rank !== null && e.rank < 3 ? ` · +${renown} Renown${isMe && !pay.fullPay ? ' (After Hours)' : ''}` : ' · door gift'}</span>
      ${ups ? `<button class="ustamp" data-x="upstage">Upstaged${by ? ` by ${esc(by)}` : ''}: −${ups}</button>` : ''}</div>
      <span class="rk">${e.rank !== null ? `${atRank(e.rank).length > 1 ? '=' : ''}${ord(e.rank)}` : '—'}</span></div>`;
  }).join('');
  // how she did it: your sum, next to what anyone can see of the winner's
  const bd = pay.breakdown || { cards: [], parts: [] };
  const cardsTotal = bd.cards.reduce((t, c) => t + c.score, 0);
  const mine = [`cards ${cardsTotal}`, ...bd.parts.map((p) => `${PART_LABEL[p.key] || p.key} ${p.n > 0 ? '+' : ''}${p.n}`), ...(pay.upstaged ? [`Upstaged −${pay.upstaged}`] : [])];
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
    return `<p class="small" style="margin:0"><b>${esc(C.PLACES[x.place].short)}</b> (${esc(C.GENTS[x.host].short)}): ${win ? `${esc(sh(win.whore))} took it with ${win.sway}` : 'nobody reached the Bar'}. ${x.entries.length} came.</p>`;
  }).join('') || '<p class="small">The other rooms stood empty. Even the cat went home.</p>';
  // the punchline (a Kink win's postcard) goes straight under the stamp; the rest of the edition follows
  const clips = [...r.clips];
  const gi = clips.findIndex((c) => c.startsWith('<div class="postcard'));
  const gag = gi >= 0 ? clips.splice(gi, 1)[0] : '';
  return `${topbar(v)}
  <section class="sheet spinpaper extra">
    ${gazette(v, 'Special edition')}
    <span class="stamp big pop">${pay.rank !== null ? `${tied ? 'Tied ' : ''}${ord(pay.rank)}` : 'Door gift'}</span>
    <h1 class="h1">${esc(head)}</h1>
    ${gag}
    <p class="deck">${esc(sub)}</p>
    <div class="payline"><span>+${pay.renown}<small>Renown</small></span><span>${pay.coin >= 0 ? '+' : ''}${pay.coin}<small>Coin</small></span>${pay.applause && pay.fullPay ? `<span>+${pay.applause}<small>Applause</small></span>` : ''}${pay.fullPay ? '' : '<span><small>After hours: no Renown</small></span>'}</div>
  </section>
  <section class="sheet tilt-l">
    <div class="sec-head"><span class="h2">The clash at ${esc(P.short)}</span><span class="type">Bar ${PR.bar}${raid ? ' · raided' : ''}</span></div>
    ${hindsightLine(r, w)}
    <div class="clash">${entries}</div>
    ${r.splitTip ? `<div class="clip"><b class="h3">Not winner-takes-all</b><p>1st takes the lion's share and the Applause; 2nd and 3rd still eat; everyone gets a door gift. <button class="x" data-x="split">Read all about it</button></p></div>` : ''}
    <details class="sums"><summary class="by">Show the sums</summary>
      ${how}
      <div class="sec-head"><span class="h2">The split</span><button class="x type" data-x="split">not winner-takes-all</button></div>
      <div class="split">${split}</div>
    </details>
  </section>
  <section class="sheet">
    ${afterHoursBanner(v)}
    <div class="sec-head"><span class="h2">Also in this edition</span></div>
    <div class="clip-list">${clips.join('') || '<p class="small">Nothing else to report. Scandalous.</p>'}</div>
    <div class="sec-head"><span class="h2">Elsewhere tonight</span></div>
    ${elsewhere}
    <button class="btn primary block" data-act="after-results">${r.unlock ? 'A telegram for you' : 'Back to the front page'}</button>
  </section>`;
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
  return `${topbar(v)}
  <section class="sheet">
    <p class="kicker">The wire · your whores across the ages</p>
    <h1 class="h1">Timelines</h1>
    <p class="deck">One whore per Timeline. While one waits for her Curtain, play another. <button class="x" data-x="timeline">How it works</button></p>
    <div class="tl-list">${rows}</div>
  </section>
  <section class="sheet tilt-r score-plate">
    <p class="kicker">Your <button class="x" data-x="whorescore">Whorescore</button></p>
    <div class="num">${ws.total}</div>
    <p class="small">${ws.past} banked from past seasons + ${ws.season} this season (your best three whores count in full).</p>
    ${progs.length ? `<p class="small prog">${progs.map(esc).join('<br>')}</p>` : ''}
    <div class="ladder">${tiers.map((t) => `<div class="${t === best ? 'on' : ''}"><b>${R.whorescore[t]}</b>${esc(C.TIER_NAMES[t].replace(' Whore', ''))}</div>`).join('')}</div>
    <p class="small">Depth beats breadth: one Epic (13) outscores three Rares (12).</p>
    <div class="row" style="width:100%"><button class="btn grow" data-act="go" data-id="players">The Players board</button>${ui.steps.has('players') ? '<button class="btn primary grow" data-act="end">Final edition</button>' : ''}</div>
  </section>`;
};

// ----- Players / leaderboards -----
const BOARDS = [['whorescore', 'Whorescore', 'pts'], ['richest', 'Richest', 'Coin'], ['notorious', 'Most Notorious', 'peak'], ['respectable', 'Most Respectable', 'peak']];
SCREENS.players = () => {
  const v = V(); const lb = L.leaderboards(ui.S);
  const [key, label, unit] = BOARDS.find((b) => b[0] === ui.tab);
  const rows = lb[key].map((r) => `<button class="prow ${r.account === ME ? 'me' : ''}" data-act="profile-acct" data-id="${r.account}">
    <span class="rk">${r.rank}</span>
    <span><span class="nm">${esc(r.account === ME ? `${r.name} (you)` : r.name)} ${r.kind === 'standin' ? '<span class="badge-stand">Stand-in</span>' : ''}</span>
      <span class="wchips">${r.whores.map((w) => `<span class="wchip">${img(w.art, w.name)}<span><span class="tlb ${w.timeline}">${esc(w.timelineName)}</span> ${esc(w.name)}<br>${esc(w.title)}</span></span>`).join('')}</span></span>
    <span class="val">${r.value}<br><span class="small">${unit}</span></span></button>`).join('');
  const autos = lb.automatons.map((a) => `<button class="prow" data-act="profile-acct" data-id="${a.account}"><span class="rk">${ICON.key}</span>
    <span><span class="nm">${esc(a.name)} <span class="badge-auto">${ICON.key} Automaton</span></span><span class="wchips">${a.whores.map((w) => `<span class="wchip">${img(w.art, w.name)}<span><span class="tlb ${w.timeline}">${esc(C.TIMELINES[w.timeline].short)}</span> ${esc(w.title)}<br>${w.renown} Renown</span></span>`).join('')}</span></span><span class="val small">not ranked</span></button>`).join('');
  return `${topbar(v)}
  <section class="sheet">
    <p class="kicker">The society pages</p>
    <h1 class="h1">Players</h1>
    <p class="deck">Four ways to be famous. <button class="x" data-x="boards">Which board is which?</button></p>
    <div class="tabs" role="tablist">${BOARDS.map(([k, l]) => `<button role="tab" aria-selected="${k === ui.tab}" data-act="tab" data-id="${k}">${esc(l)}</button>`).join('')}</div>
    <div class="board">${rows}</div>
  </section>
  <section class="sheet tilt-l">
    <div class="sec-head"><span class="h2">House Automatons</span><button class="x type" data-x="automaton">never ranked</button></div>
    <div class="board">${autos}</div>
  </section>`;
};

SCREENS.end = () => {
  const v = V(); const ws = L.whorescore(ui.S, ME); const acct = acctView();
  const t = ui.think.renown;
  const thinkLine = t > 0 ? `Thinking earned you +${t} Renown over Best Guess.` : t < 0 ? `Best Guess would have earned ${-t} more Renown. Study first, then bet.` : 'You matched Best Guess. Study a gentleman twice and bring his novelty to beat it.';
  const progs = acct.whores.map(tierProgress).filter(Boolean);
  return `${topbar(v)}
  <section class="sheet spinpaper endcard">
    <p class="kicker">Final edition · late extra</p>
    <h1 class="h1">${ransom("THAT'S ALL")}</h1>
    <p class="h2">The news unfit to print</p>
    <p class="deck">${esc(END_LINE[ui.firstTl || v.whore.timeline])}</p>
    <div class="clip win"><b class="h3">The thinking column</b><p>${esc(thinkLine)}</p></div>
    <p class="small">${acct.whores.map((w) => `${esc(w.name)}, ${esc(w.title)}, ${w.renown} Renown`).join(' · ')} · Whorescore ${ws.total}</p>
    ${progs.length ? `<p class="small prog">${progs.map(esc).join('<br>')}</p>` : ''}
    <a class="btn primary block" data-hub href="../index.html#score">Rate this prototype</a>
    <button class="btn ghost block" data-act="go" data-id="front">Keep playing</button>
    <span class="stamp">Scandal</span>
  </section>`;
};
// The end card links to the prototypes hub when there is one; otherwise it offers a fresh start (no dead end).
function checkHub() {
  const a = $('a[data-hub]'); if (!a) return;
  const swap = () => { const b = $('a[data-hub]'); if (!b) return; b.outerHTML = '<button class="btn primary block" data-act="restart">Start a new scandal</button>'; };
  fetch('../index.html', { method: 'HEAD', cache: 'no-store' }).then((r) => { if (!r.ok) swap(); }).catch(swap);
}

// ---------------------------------------------------------------------------
// Render and chrome
// ---------------------------------------------------------------------------
const IN_GAME = ['front', 'assign', 'plan', 'results', 'timelines', 'players', 'end'];
function render(opts = {}) {
  const app = $('#app');
  const y = window.scrollY; const a = opts.keepScroll ? anchorOf() : null;
  app.innerHTML = SCREENS[ui.screen]();
  document.body.classList.toggle('has-top', IN_GAME.includes(ui.screen));
  renderChrome();
  if (opts.keepScroll) { window.scrollTo(0, y); restoreAnchor(a, y); } else if (!opts.noScroll) window.scrollTo(0, 0);
  setTrayH(); notePaint(!!opts.keepScroll);
  if (ui.screen === 'results') requestAnimationFrame(() => setTimeout(() => document.querySelectorAll('.entry .bar i').forEach((i) => { i.style.width = `${i.dataset.w}%`; }), calm() ? 0 : 500));
  if (ui.screen === 'end') checkHub();
  hlReflow();
}
// Your own whores whose Curtain is due (the clock waits for them)
const lastCallTls = () => { try { return acctView().whores.filter((x) => !sealedW(x.id)).map((x) => x.timeline).filter((tl) => curtainIn(tl) <= 1); } catch { return []; } };
let dockEl = null; let muteEl = null;
function renderChrome() {
  if (!dockEl) { dockEl = document.createElement('nav'); dockEl.className = 'dock'; dockEl.setAttribute('aria-label', 'Sections'); document.body.appendChild(dockEl); }
  if (!muteEl) { muteEl = document.createElement('button'); muteEl.className = 'mute'; muteEl.dataset.act = 'mute'; document.body.appendChild(muteEl); }
  muteEl.innerHTML = ui.muted ? ICON.mute : ICON.sound;
  muteEl.setAttribute('aria-label', ui.muted ? 'Sound off: turn on' : 'Sound on: turn off');
  const show = IN_GAME.includes(ui.screen) && ui.active;
  dockEl.hidden = !show;
  if (!show) return;
  let invite = false;
  try { invite = acctView().canOpen.length > 0; } catch { invite = false; }
  const alarm = ui.active && lastCallTls().some((tl) => tl !== tlOf(ui.active));
  const cur = (s) => (ui.screen === s || (s === 'front' && ['front', 'assign', 'plan', 'results'].includes(ui.screen)) ? ' aria-current="page"' : '');
  dockEl.innerHTML = `
    <button data-act="go" data-id="front"${cur('front')}>${ICON.paper}Front page</button>
    <button data-act="go" data-id="timelines"${cur('timelines')} class="${alarm ? 'dot alarm' : invite || ui.news.size ? 'dot' : ''}">${ICON.clock}Timelines${alarm ? '<span class="sr"> (last call)</span>' : ''}</button>
    <button data-act="go" data-id="players"${cur('players')}>${ICON.crown}Players</button>
    <button data-act="mute" aria-label="${ui.muted ? 'Turn sound on' : 'Turn sound off'}">${ui.muted ? ICON.mute : ICON.sound}${ui.muted ? 'Sound off' : 'Sound on'}</button>`;
}
function updateCountdowns() {
  if (!ui.S) return;
  document.querySelectorAll('[data-cd]').forEach((el) => { el.textContent = el.dataset.short ? cdShort(el.dataset.cd) : cdText(el.dataset.cd); });
  document.querySelectorAll('[data-seal]').forEach((el) => { el.textContent = sealText(el.dataset.seal); });
}
// "2 of 4 sealed": who has sealed for her next Curtain, and when it falls (the engine's sealing count and clocks)
function sealText(wid) {
  const v = V(wid); const sg = v.timeline.sealing; if (!sg) return '';
  if (sg.sealed >= sg.total) {
    const gap = Math.max(1, v.timeline.earliestCurtainAt - ui.S.clock);
    return `Everyone has sealed. The house keeps ${ui.S.opts.minGapMin} minutes between Curtains: it falls ${fmtMins(gap) === 'last call!' ? 'any moment' : fmtMins(gap)}.`;
  }
  const left = sg.lastAt != null ? Math.max(0, sg.lastAt - ui.S.clock) : null;
  const atClock = curtainIn(v.timeline.id);
  const soon = left != null && left < atClock ? `about ${fmtMins(Math.max(2, left)).replace(/^in /, '')}` : null;
  return `${sg.sealed} of ${sg.total} sealed. The Curtain falls when the last one does${soon ? ` (${soon})` : ''}, or ${fmtMins(atClock)} at the latest.`;
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
function preloadSkin(tl) {
  return Promise.all(['skin-bg', 'skin-card', 'skin-frame'].map((k) => new Promise((res) => {
    const im = new Image(); im.onload = res; im.onerror = res; im.src = `../art-assets/${tl}/${k}.webp`;
    setTimeout(res, 700);
  })));
}
function setEra(tl, wash = true) {
  const root = document.documentElement;
  loadEraFont(tl);
  if (root.dataset.era === tl) return;
  root.dataset.era = tl;
  if (wash && !calm()) {
    const w = document.createElement('div'); w.className = 'wash'; document.body.appendChild(w);
    setTimeout(() => w.remove(), 1200);
  }
  sfx('era', tl);
}
const docEra = () => document.documentElement.dataset.era;
function go(screen, opts) {
  if (screen === 'front') { ui.secShown.forEach((k) => ui.secSeen.add(k)); ui.secShown = new Set(); ui.secOpen = new Set(); }
  ui.screen = screen;
  if (screen !== 'plan' && screen !== 'assign') resetPicks();
  render(opts);
  if (screen === 'front') onFront();
  if (screen === 'players') { ui.steps.add('players'); teach('players', 'Four ways to be famous', 'Whorescore ranks everyone; the side boards crown the richest, the most notorious and the most respectable.', 'boards'); }
  if (screen === 'timelines') { TLS.forEach(loadEraFont); teach('tl', 'One whore per Timeline', 'Each era runs its own Curtain clock. While one waits, play another.', 'timeline'); }
}
function resetPicks() { ui.sel = []; ui.item = null; ui.talentOn = false; ui.deArt = null; ui.stake = false; ui.grease = 0; ui.slumOk = false; ui.aDealt = false; ui.why = false; ui.lastSway = null; }
function onFront() {
  teach('front', 'Your front page', 'The yellow note always says what\'s next. Tap it.', 'curtain', 'Hot off the press');
  if (ui.active && curtainIn(tlOf(ui.active)) <= 1) teach('lastcall', 'Last call', 'The Curtain waits for no one... except you, tonight. Seal when you are ready.', 'lastcall');
}

// ---------------------------------------------------------------------------
// Modals: inspect (flip), EXCLUSIVE, digest, telegram, profiles, offers
// ---------------------------------------------------------------------------
function openModal(type, data) {
  if (!ui.modal) ui.overlays++;
  ui.modal = { type, data, flipped: false };
  renderModal();
  hlReflow();
}
function closeModal() {
  if (!ui.modal) return;
  const m = ui.modal; ui.modal = null; ui.overlays = Math.max(0, ui.overlays - 1);
  const el = $('#modal'); if (el) el.remove();
  if (m.onClose) m.onClose();
  if (ui.screen === 'front' && !ui.modal) rerenderBehind();
  hlReflow();
}
function modalShell(inner, mid = true) {
  let el = $('#modal');
  if (!el) { el = document.createElement('div'); el.id = 'modal'; $('#layer').appendChild(el); }
  // .mslot: headlines print here, above the card, while a pop-up is open
  el.innerHTML = `<div class="scrim ${mid ? 'mid' : ''}" data-act="close-modal" role="dialog" aria-modal="true"><div class="mslot" aria-live="polite"></div>${inner}</div>`;
  const f = el.querySelector('[data-autofocus]') || el.querySelector('.modal-actions button, .sheet-up button, button, a');
  if (f) f.focus({ preventScroll: true });
  if (hlCur && !hlBlocked()) paintHl();
}
function flipShell(front, back, actions) {
  const m = ui.modal;
  return `<div class="modal-card"><div class="flip ${m.flipped ? 'flipped' : ''}" data-act="flip" role="button" tabindex="0" aria-label="Flip the card">
      <div class="faces"><div class="face front inspect">${front}<p class="flip-hint">Tap the card to flip it</p></div><div class="face back inspect">${back}<p class="flip-hint">Tap to flip back</p></div></div></div>
    <div class="modal-actions">${actions}</div></div>`;
}
function renderModal() {
  const m = ui.modal; if (!m) return;
  const R2 = MODALS[m.type];
  if (R2) R2(m);
}
const MODALS = {};
MODALS.excl = (m) => {
  const [head, body] = GLOSS[m.data] || ['Exclusive', 'Our correspondent is still investigating.'];
  modalShell(`<div class="sheet-up"><span class="excl-banner">Exclusive</span><h2 class="h2">${esc(head)}</h2><p style="margin:0;font-size:17px">${esc(body)}</p><button class="btn block" data-act="close-modal" data-autofocus>Got it</button></div>`, false);
};
MODALS.gent = (m) => {
  const v = V(); const g = v.timeline.gents.find((x) => x.id === m.data);
  const h = v.whore.history[g.id];
  const onBoard = v.board.find((b) => b.gent === g.id);
  const studyLeft = v.whore.daily.freeStudiesLeft;
  const allKnown = g.known.secret && g.known.kink && g.known.history;
  const front = `<p class="kicker">Gentleman · ${esc(C.FRESHNESS[g.freshness].name)}</p>${img(g.art, g.name, { cls: 'art-img portrait' })}
    <h2 class="h2">${esc(g.name)}</h2><p class="flav">“${esc(g.voice)}”</p>${gentChips(g, v.whore)}${onBoard && hostTonight(v, g.id) ? `<p class="hosttag">Hosts ${esc(hostTonight(v, g.id).short)} tonight: satisfy him now and you are his Regular, +1 at the Curtain.</p>` : ''}`;
  const back = `<p class="kicker">The small print</p><h3 class="h3">${esc(g.short)}</h3>
    <div class="facts">
      <div class="fact"><span><button class="x" data-x="tell">Tells</button></span><span>${g.tells.map(esc).join('<br>')}</span></div>
      <div class="fact"><span>Secret Taste</span><span>${g.known.secret ? artLabel(g.secretTaste) : '? Study him'}</span></div>
      <div class="fact"><span>Kink</span><span>${g.known.kink ? `${esc(g.kink.name)}: bring ${esc(g.kink.hint)} (+3)` : '? Study him twice'}</span></div>
      <div class="fact"><span>His habit</span><span>${esc(g.hook)}</span></div>
      <div class="fact"><span>History</span><span>${h ? `${h.regular ? `Regular ×${h.regular}. ` : ''}${h.grudge ? 'Holds a Grudge. ' : ''}${h.seen.length ? `Has seen ${h.seen.map((c) => (C.CARDS[c] || C.AFFLICTIONS[c]).name).join(', ')}.` : ''}` || 'Met once.' : 'Never met you.'}</span></div>
      <div class="fact"><span>Last charmed by</span><span>${g.known.history ? (g.lastCharmed ? esc(V().timeline.rivals.concat([{ id: v.whore.id, name: v.whore.name }]).find((r) => r.id === g.lastCharmed.whore)?.name || 'someone') : 'nobody yet') : '? Study him thrice'}</span></div>
      <div class="fact"><span><button class="x" data-x="freshness">Freshness</button></span><span>${esc(C.FRESHNESS[g.freshness].blurb)}</span></div>
    </div>`;
  const actions = `<button class="btn" data-act="study" data-id="${g.id}" ${allKnown ? 'disabled' : ''}>${allKnown ? 'Nothing left to learn' : `Study him · ${studyLeft > 0 ? `${studyLeft} free` : '1 Coin'}`}</button>
    ${onBoard && !v.whore.assignation ? `<button class="btn primary" data-act="start-assign" data-id="${g.id}">Take him on</button>` : '<button class="btn" data-act="close-modal">Close</button>'}`;
  modalShell(flipShell(front, back, actions));
};
function itemFaces(it, v) {
  const forGent = it.kinkFor ? v.timeline.gents.find((g) => g.id === it.kinkFor) : null;
  const front = `<p class="kicker">Novelty · ${it.blackMarket ? 'black market' : 'from the stall'}</p>${img(it.art, it.name, { cls: 'art-img' })}<h2 class="h2">${esc(it.name)}</h2>
    <div class="chips"><span class="chip">${it.cost} Coin</span><span class="chip">${it.uses > 50 ? 'Reusable' : plural(it.uses, 'use')}</span><span class="chip">${it.kind === 'kink' ? 'For a Kink' : it.kind === 'protection' ? 'Protection' : '+Sway'}</span></div>`;
  const back = `<p class="kicker">The small print</p><h3 class="h3">${esc(it.name)}</h3><p class="flav">${esc(it.inspect)}</p><p>${esc(it.publicUse)}</p>
    ${it.kind === 'kink' ? `<p><b>For:</b> ${forGent ? `${esc(forGent.short)}. +3 Sway when you bring it to him.` : it.tell ? `Whose? The one whose Tell reads “${esc(it.tell)}” Buy it and his Kink goes in your Little Black Book.` : '? Study the gentlemen to find out whose Kink this is.'}</p>` : ''}`;
  return { front, back };
}
MODALS.offer = () => {
  const v = V(); const o = v.whore.offer;
  if (!o) { closeModal(); return; }
  const { front, back } = itemFaces(o.item, v);
  const full = v.whore.items.length >= R.reticule;
  const it = o.item;
  const whisper = it.kind === 'kink' && it.tell && !it.kinkFor ? `Psst. For the gent who… “${it.tell}”` : 'Psst. Over here.';
  modalShell(flipShell(`<p class="balloon" style="position:static;max-width:none">${esc(whisper)}</p>${front}`, back,
    `<button class="btn primary" data-act="buy" ${v.whore.coin >= o.price && !full ? '' : 'disabled'}>Buy · ${o.price} Coin</button><button class="btn" data-act="pass">Wave him off</button>`));
};
MODALS.item = (m) => {
  const v = V(); const it = v.whore.items.find((x) => x.idx === Number(m.data));
  if (!it) { closeModal(); return; }
  const { front, back } = itemFaces(it, v);
  modalShell(flipShell(front, back, `<button class="btn" data-act="drop" data-id="${it.idx}">Leave it on a bench</button><button class="btn primary" data-act="close-modal">Keep it</button>`));
};
MODALS.card = (m) => {
  const v = V(); const [src, idx] = m.data;
  const list = src === 'market' ? v.timeline.market.map((c, i) => ({ ...c, idx: i })) : src === 'lent' && v.whore.assignation ? v.whore.assignation.lent : v.whore.hand;
  const c = list.find((x) => x.idx === Number(idx)); if (!c) { closeModal(); return; }
  const front = `<p class="kicker">${c.affliction ? 'Affliction · curse card' : c.position ? 'Card · a position. Our correspondent looked away.' : 'Card'}</p>${c.art ? img(c.art, c.name, { cls: 'art-img' }) : ''}<h2 class="h2">${esc(c.name)}</h2>
    <div class="chips">${c.affliction ? '' : `<button class="chip" data-x="allure">Allure ${c.allure}</button>`}${c.arts.map((a) => `<button class="chip" data-x="arts">${artLabel(a)}</button>`).join('')}${c.pocket ? `<button class="chip" data-x="pocket">Kept: +${c.pocket} Coin</button>` : ''}</div>`;
  const back = `<p class="kicker">The small print</p><h3 class="h3">${esc(c.name)}</h3>${c.text ? `<p>${esc(c.text)}</p>` : '<p>No special rules. Honest work.</p>'}<p class="flav">“${esc(c.flavour)}”</p>
    ${c.arts.length ? `<p class="small">${c.arts.map((a) => `${C.ARTS[a].name}: ${C.ARTS[a].blurb}`).map(esc).join(' ')}</p>` : ''}`;
  modalShell(flipShell(front, back, '<button class="btn" data-act="close-modal" style="grid-column:1/-1">Back to the table</button>'));
};
MODALS.affl = (m) => {
  const v = V(); const a = v.whore.afflictions.find((x) => x.id === m.data) || v.timeline.afflictions.find((x) => x.id === m.data);
  const A = C.AFFLICTIONS[m.data];
  const have = v.whore.afflictions.some((x) => x.id === m.data);
  const front = `<p class="kicker">Affliction · curse card</p>${img(A.art, A.name, { cls: 'art-img' })}<h2 class="h2">${esc(A.name)}</h2><p>${esc(A.symptomText)}</p>`;
  const back = `<p class="kicker">Doctor's note</p><p class="flav">${esc(A.gag)}</p><p>${esc(A.flavour)}</p><p><b>Cure:</b> ${esc(A.cure.name)}, ${A.cure.cost} Coin${A.cure.notoriety ? ', and people will talk (Notoriety +1)' : ''}.</p>`;
  modalShell(flipShell(front, back, have ? `<button class="btn primary" data-act="cure" data-id="${A.id}" ${v.whore.coin >= A.cure.cost ? '' : 'disabled'}>Cure · ${A.cure.cost} Coin</button><button class="btn" data-act="close-modal">Later</button>` : '<button class="btn" data-act="close-modal" style="grid-column:1/-1">Close</button>'));
  void a;
};
MODALS.char = (m) => {
  const ch = C.CHARACTERS[m.data];
  const front = `<p class="kicker">${esc(C.TIMELINES[ch.timeline].name)} · ${esc(ch.temperament)}</p>${eraMini(ch.timeline, ch.art, ch.name)}<h2 class="h2">${esc(ch.name)}</h2><p class="flav">${esc(ch.epithet)}. ${esc(ch.voice)}</p>`;
  const back = `<p class="kicker">Her file</p><h3 class="h3">${esc(ch.name)}</h3><p class="small">${esc(ch.look)}</p>
    <div class="facts">
      <div class="fact"><span><button class="x" data-x="type">Type</button></span><span>${esc(C.TYPES[ch.type].name)}: ${esc(C.TYPES[ch.type].blurb)}</span></div>
      <div class="fact"><span><button class="x" data-x="signature">Signature</button></span><span>${artLabel(ch.signature)}</span></div>
      <div class="fact"><span><button class="x" data-x="talent">Charm</button></span><span><b>${esc(C.CHARMS[ch.charm].name)}</b>: ${esc(C.CHARMS[ch.charm].text)}</span></div>
      <div class="fact"><span>Talent</span><span><b>${esc(C.TALENTS[ch.talent].name)}</b>: ${esc(C.TALENTS[ch.talent].text)}</span></div>
      <div class="fact"><span>Vice</span><span><b>${esc(C.VICES[ch.vice].name)}</b>: ${esc(C.VICES[ch.vice].upside)} ${esc(C.VICES[ch.vice].downside)}</span></div>
      ${ch.plays ? `<div class="fact"><span>Plays</span><span>${esc(ch.plays)}</span></div>` : ''}
    </div>`;
  const actions = ui.screen === 'pick' ? `<button class="btn primary" data-act="hire-from" data-id="${ch.id}">Hire her</button><button class="btn" data-act="close-modal">Not yet</button>` : '<button class="btn" data-act="close-modal" style="grid-column:1/-1">Close</button>';
  modalShell(flipShell(front, back, actions));
};
function profileBlock(wid) {
  const p = L.publicProfile(ui.S, ME, wid);
  const me = C.CHARACTERS[wid] && ui.S.whores[wid] && ui.S.whores[wid].account === ME;
  return `<div class="gent-head" style="grid-template-columns:96px 1fr">${eraMini(p.timeline, p.art, p.name)}
    <div class="meta"><b class="h3">${esc(p.name)}</b><span class="small">${esc(p.epithet)} · ${esc(C.TIMELINES[p.timeline].short)}</span>
      <span>${badgeFor(p)}</span>
      <span class="small"><button class="x" data-x="eratitle">${esc(p.title)}</button> · ${esc(C.TIER_NAMES[p.tier])} · ${p.renown} Renown</span>
      <span class="small">Standing ${p.standing} · Notoriety ${p.notoriety}</span></div></div>
    <p class="flav" style="margin:0">${esc(p.ch.voice)}</p>
    <div class="facts">
      <div class="fact"><span>Temperament</span><span>${esc(p.ch.temperamentText)}</span></div>
      <div class="fact"><span>Charm</span><span><b>${esc(p.charmInfo.name)}</b>: ${esc(p.charmInfo.text)}</span></div>
      <div class="fact"><span>Talent</span><span>${p.talentInfo ? `<b>${esc(p.talentInfo.name)}</b>: ${esc(p.talentInfo.text)}` : me ? '' : '? Study her to find out'}</span></div>
      <div class="fact"><span>Vice</span><span>${p.viceInfo ? `<b>${esc(p.viceInfo.name)}</b>: ${esc(p.viceInfo.upside)} ${esc(p.viceInfo.downside)}` : me ? '' : '? Study her to find out'}</span></div>
      <div class="fact"><span>Last Curtains</span><span>${p.lastResults.length ? p.lastResults.map((r) => `${esc(C.PLACES[r.place].short)}: ${r.rank !== null ? ord(r.rank) : 'door gift'}`).join(' · ') : 'None yet'}</span></div>
      <div class="fact"><span>Collectibles</span><span>${p.collectibles.length ? plural(p.collectibles.length, 'piece') : 'An empty mantelpiece'}${p.frontPage ? ' · made the Front Page' : ''}</span></div>
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
// Every teaching tip shown so far, to read again at leisure (tips never come back on their own)
MODALS.tips = () => {
  modalShell(`<div class="sheet-up"><span class="excl-banner">Tips so far</span><div class="gossip">${ui.tips.map((t) => `<div class="gitem"><span class="h3">${escE(t.head)}</span><span class="more">${escE(t.sub)}${t.x ? ` <button class="x" data-x="${t.x}">Exclusive</button>` : ''}</span></div>`).join('')}</div>
    <button class="btn primary block" data-act="close-modal" data-autofocus>Back to the paper</button></div>`, false);
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
  modalShell(`<div class="sheet-up"><span class="excl-banner">Last call</span><h2 class="h2">${esc(sh)} is due on stage</h2>
    <p style="margin:0;font-size:17px">If you go now, ${esc(sh)} goes out by Standing Order to <b>${esc(P.short)}</b> (host ${esc(C.GENTS[pick.host].short)}; Best Guess ${pick.sway} Sway).</p>
    <div class="row"><button class="btn primary grow" data-act="lc-seal" data-autofocus>Seal now</button><button class="btn grow" data-act="lc-let">Let her</button></div></div>`, false);
};
MODALS.telegram = (m) => {
  const TL = C.TIMELINES[m.data];
  modalShell(`<div class="modal-card"><div class="telegram"><span class="pin"></span><div class="tt">TELEGRAM</div><p class="tg-text" data-full="${esc(TL.telegram)}">${calm() ? esc(TL.telegram) : ''}</p>
    <p class="small" style="color:inherit">A second Timeline is open to you. One whore per Timeline: while one waits for her Curtain, play the other.</p></div>
    <div class="modal-actions"><button class="btn primary" data-act="tg-go" style="grid-column:1/-1" data-autofocus>To the Timelines board</button></div></div>`);
  const el = $('.tg-text'); if (el && !calm()) typewrite(el, el.dataset.full);
};
MODALS.spin = (m) => {
  modalShell(`<div class="spinpaper" data-stop="1">${m.data.html}</div>`);
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
function clipsFor(evs, wid) {
  const out = [];
  for (const e of evs) {
    const mineW = (e.whores || [])[0] === wid;
    if (e.type === 'learned' && mineW) out.push(`<div class="clip"><span class="h3">Into the Little Black Book</span><p>${escE(e.text)}</p></div>`);
    else if (e.type === 'meter' && mineW) out.push(`<div class="clip"><span class="h3">${e.data.after.notoriety > e.data.before.notoriety ? 'Scandal!' : 'Standing up'}</span><p>Standing ${e.data.before.standing} → ${e.data.after.standing} · Notoriety ${e.data.before.notoriety} → ${e.data.after.notoriety}.</p></div>`);
    else if (e.type === 'itch' && mineW) out.push(`<div class="clip"><span class="h3">The Itch</span><p>${escE(e.text)}</p></div>`);
    else if (e.type === 'catch' && mineW) { const A = C.AFFLICTIONS[e.data.affliction]; out.push(`<div class="clip"><span class="h3">Oh dear</span><div class="row" style="flex-wrap:nowrap">${img(A.art, A.name, { cls: '' }).replace('<img ', '<img style="width:84px;flex:none" ')}<p>${escE(e.text)}</p></div></div>`); }
    // the set-up (what is heard behind the curtain) prints before the payoff, as the tourist postcards do
    else if (e.type === 'gag' && mineW && e.data && e.data.gag) { const G = C.GAGS[e.data.gag]; const see = e.data.see || G.see; out.push(`<div class="postcard">${img(G.art, `${G.name}: ${see}`)}${see ? `<p class="overheard"><i>Overheard: ${esc(see)}</i></p>` : ''}<p><b>${esc((e.data.title || G.name).replace(/([^.!?])$/, '$1.'))}</b> <i>${esc(e.data.punchline || G.punchline)}</i></p></div>`); }
    else if (e.type === 'gag' && mineW && e.data && e.data.tourist) out.push(`<div class="postcard tourist">${img(C.TIMELINES[e.timeline].skin.textures.curtain, 'Behind the curtain')}<p><b>Overheard.</b> ${esc(e.text)}</p></div>`);
    else if (e.type === 'promoted' && mineW) out.push(`<div class="clip"><span class="h3">Rising star</span><p>${escE(e.text)}</p></div>`);
    else if (e.type === 'raid') out.push(`<div class="clip"><span class="h3">Raid night</span><p>${escE(e.text)}</p></div>`);
    else if (e.type === 'gossip') out.push(`<div class="clip"><span class="h3">Overheard at the bar</span><p>${escE(e.text)}</p></div>`);
    else if (e.type === 'overtaken' && mineW) out.push(`<div class="clip"><span class="h3">Pipped</span><p>${escE(e.text)}</p></div>`);
  }
  return out;
}
function teachFrom(evs, wid) {
  for (const e of evs) {
    const mineW = (e.whores || [])[0] === wid;
    if (e.type === 'meter' && mineW) {
      if (e.data.after.notoriety > e.data.before.notoriety) teach('noto', 'Scandal! Notoriety up', C.LINES.firstNotoriety, 'notoriety');
      else if (e.data.after.standing > e.data.before.standing) teach('standing', 'Standing up!', C.LINES.firstStanding, 'standing');
    }
    if (e.type === 'itch' && mineW) teach('itch', 'You\'ve got the Itch', C.LINES.firstItch, 'itch');
    if (e.type === 'learned' && mineW && e.data.facts) {
      if (e.data.facts.includes('kink')) teach('kinkL', 'Kink exposed!', e.text, 'kink');
      else if (e.data.facts.includes('secret')) teach('secretL', 'Secret Taste revealed', e.text, 'secret');
    }
  }
}
function catchFrom(evs, wid) {
  const e = evs.find((x) => x.type === 'catch' && (x.whores || [])[0] === wid);
  if (!e) return;
  const A = C.AFFLICTIONS[e.data.affliction];
  setTimeout(() => {
    openModal('result', { html: `<span class="stamp big pop">Oh dear</span><h1 class="h1">${esc(A.name)}</h1>${img(A.art, A.name, { cls: '' })}<p class="deck">${esc(A.gag)}</p><p>${esc(A.symptomText)} It sits in your deck like a lodger until you pay for ${esc(A.cure.name)} (${A.cure.cost} Coin).</p><button class="btn primary block" data-act="close-modal">Mind how you go</button>` });
    teach('affl', 'Afflictions clog your deck', 'A curse card until cured. Find it in your reticule to cure it.', 'affliction');
    sfx('sad');
  }, 400);
}

// Before an Assignation is worked: what (from what she can see) would clear his Bar, for the fizzle page.
function fizzleAdvice(d) {
  const v = d.v; const g = d.g; if (!g) return '';
  const bar = d.bar;
  const studied = g.known.secret;
  // her Talent (Double Entendre) on Best Guess's cards
  const de = L.bestDoubleEntendre ? L.bestDoubleEntendre(v, { gent: d.gid, cards: d.bg.cards }) : null;
  if (de && de.sway >= bar) { const c = d.A.lent[de.card]; return `Double Entendre on ${c.name}, counted as ${C.ARTS[de.art].name}, would have scored ${de.sway}: enough.`; }
  // a novelty she carries
  for (const it of v.whore.items.filter((x) => x.ready)) { const b = L.bestGuess(v, { gent: d.gid }, { item: it.id }); if (b.sway >= bar) return `${it.name} from your reticule would have scored ${b.sway}: enough.`; }
  if (!studied) return `Study ${g.short} first: his secrets only ever help, and he still has some.`;
  return 'Not your gentleman tonight, with these cards: Walk Away costs nothing.';
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
  const f = $('#modal .flip'); if (f) f.classList.toggle('flipped', ui.modal.flipped);
  if (['gent', 'offer', 'item'].includes(ui.modal.type)) { ui.steps.add('flip'); }
  // the back of his card is where the dotted words live: teach them here, the first time it matters
  if (ui.modal.type === 'gent' && ui.modal.flipped) teach('x', 'Read all about it', 'Anything with a dotted underline opens an EXCLUSIVE explainer. Tap one whenever you wonder.', 'tell', 'How this paper works');
};
ACTS['intro-next'] = () => {
  sfx('clack');
  if (ui.introStep < PANELS.length - 1) { ui.introStep++; render({ keepScroll: true }); const p = document.querySelectorAll('.panel')[ui.introStep]; if (p) p.scrollIntoView({ behavior: calm() ? 'auto' : 'smooth', block: 'center' }); }
  else go('pick');
};
ACTS['intro-skip'] = () => go('pick');
ACTS.suspect = (d) => {
  ui.pickId = d.id; ui.pickSaid[d.id] = true;
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
ACTS.restart = () => { location.reload(); };
ACTS.why = () => { ui.why = !ui.why; patchPlay(); };
ACTS['take-bet'] = () => { const d = playData(); if (!d || !d.bg.gamble) return; ui.sel = [...d.bg.gamble.cards]; ui.talentOn = false; ui.item = null; sfx('clack'); patchPlay(); };
ACTS['open-offer'] = () => openModal('offer');
ACTS['open-item'] = (d) => openModal('item', d.id);
ACTS['open-affl'] = (d) => openModal('affl', d.id);
ACTS['inspect-card'] = (d) => openModal('card', [d.src, d.idx]);
ACTS['inspect-market'] = (d) => openModal('card', ['market', d.idx]);
ACTS['buy-card'] = (d) => {
  const evs = act(L.buyCard, ui.active, d.id);
  if (!evs) return;
  sfx('coin'); rerenderBehind();
  const c = C.CARDS[d.id];
  headline({ kicker: 'The market', head: `Learned: ${c.name}`, sub: `Into your discard pile; it joins your hand after the next reshuffle. ${c.flavour}`, x: c.arts.includes('frolic') ? 'itch' : 'arts' });
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
  headline({ kicker: 'From the bar', head: learned.length ? (learned[0].data.facts.includes('kink') ? 'Kink exposed' : learned[0].data.facts.includes('secret') ? 'A secret, darling' : 'Noted') : 'Watched and noted', sub: learned.length ? learned.map((e) => e.text).join(' ') : (st ? st.text : '') });
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
function rerenderBehind() { const y = window.scrollY; const a = anchorOf(); $('#app').innerHTML = SCREENS[ui.screen](); window.scrollTo(0, y); restoreAnchor(a, y); renderChrome(); notePaint(true); }
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
    teach('flip', 'Psst! A novelty', 'Tap the card to flip it and read the small print.', 'kink', 'Under the counter');
  } else if (ex && ex.data.postcard) {
    const pc = C.POSTCARDS[v.whore.timeline].find((p) => p.id === ex.data.postcard);
    openModal('result', { html: `<p class="kicker">Found behind ${esc(C.PLACES[d.id].short)}</p><h2 class="h2">A saucy postcard</h2><div class="postcard">${img(pc.art, pc.name)}<p><b>${esc(pc.name)}.</b> ${esc(pc.caption)}</p></div><button class="btn primary block" data-act="close-modal">Into the album</button>` });
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
  headline({ kicker: 'Into the reticule', head: 'Bought, discreetly', sub: b ? b.text : '' });
};
ACTS.pass = () => { act(L.passOffer, ui.active); closeModal(); rerenderBehind(); headline({ kicker: 'The stallholder', head: 'Suit yourself, love', sub: 'He melts back into the fog.' }); };
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
    teach('bar', 'Mind the Bar', 'Reach his Bar and he is Satisfied. Beat it by 3 and he is Delighted.', 'bar');
  }
};
ACTS.pick = (d) => {
  const i = Number(d.idx);
  const max = ui.screen === 'assign' ? R.assignMaxCards : R.maxCurtainCards;
  const pos = ui.sel.indexOf(i);
  if (pos >= 0) ui.sel.splice(pos, 1);
  else { if (ui.sel.length >= max) ui.sel.shift(); ui.sel.push(i); }
  ui.deArt = null;
  sfx('clack');
  patchPlay();
  const v = V();
  const hasCross = document.querySelector('.hand.play .card.sel .mk.bad');
  if (hasCross) teach('aversion', 'Crossed! He can\'t abide it', 'A card carrying his Aversion loses 2. Leave it in your purse.', 'aversion');
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
  sfx('clack'); patchPlay();
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
ACTS['de-art'] = () => {
  const v = V(); const mode = ui.screen === 'plan' ? 'plan' : 'assign';
  const card = mode === 'plan' ? v.whore.hand[ui.sel[0]] : v.whore.assignation.lent[ui.sel[0]];
  const opts = C.ART_IDS.filter((a) => !card.arts.includes(a));
  const cur = ui.deArt || bestDEArt(v, mode);
  ui.deArt = opts[(opts.indexOf(cur) + 1) % opts.length];
  patchPlay();
};
ACTS.stake = () => { ui.stake = !ui.stake; patchPlay(); };
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
  const fizzleWhy = d.tourist ? '' : fizzleAdvice(d);
  const evs = act(L.playAssignation, ui.active, play);
  if (!evs) return;
  const res = evs.find((e) => e.type === 'assignation');
  const out = res.data.outcome; const tourist = d.tourist;
  ui.steps.add(tourist ? 'tourist' : 'assign');
  if (bgCards.length && !pure) ui.think.renown += res.data.renown - bgPay.renown;
  const bar = res.data.bar;
  const bgOut = { delighted: 'Delighted', satisfied: 'Satisfied', fizzled: 'Fizzled' }[bgPay.outcome] || 'Satisfied';
  const wid = ui.active; const v = V();
  const kinkWin = out !== 'fizzled' && res.data.breakdown && res.data.breakdown.kinkHit;
  if (out === 'delighted' && !tourist) ui.delightedOnce.add(d.gid);
  // the rare look is saved for a Kink win or a gentleman's first Delight; a Delight otherwise gets her pleased look
  const look = out === 'fizzled' ? CAUGHT_LOOK[wid] : (kinkWin || (out === 'delighted' && firstDelight)) ? RARE_LOOK[wid] : out === 'delighted' ? PLEASED_LOOK[wid] : 'rest';
  const clips = clipsFor(evs, wid);
  // the punchline goes first, straight under the stamp; the numbers follow
  const gagIdx = clips.findIndex((c) => c.startsWith('<div class="postcard'));
  const gag = gagIdx >= 0 ? clips.splice(gagIdx, 1)[0] : '';
  const best = out === 'delighted' && (tourist || res.data.sway >= bgSway);
  let cmp = '';
  const gainR = res.data.renown - bgPay.renown;
  if (pure && !tourist && res.data.sway > bgSway) cmp = happyClip(luckLine(res.data.breakdown, knownBefore, res.data.sway - bgSway, d.who.short));
  else if (best) cmp = '<p class="clip win"><b class="h3">Top marks</b> Even our correspondent couldn\'t have done better.</p>';
  else if (bgCards.length && !pure && gainR > 0) cmp = `<p class="clip win"><b class="h3">Thinking pays</b> Best Guess would have scored ${bgSway} (${bgOut}, +${bgPay.renown} Renown). You took +${res.data.renown}.</p>`;
  else if (bgCards.length && TIER_N[bgPay.outcome] > TIER_N[out]) cmp = `<p class="clip"><b class="h3">Hindsight</b> Best Guess would have scored ${bgSway} (${bgOut}).</p>`;
  if (out === 'fizzled' && fizzleWhy) cmp += `<p class="clip hind"><b class="h3">What would have done it</b> ${esc(fizzleWhy)}</p>`;
  else if (!cmp && bgCards.length && !tourist && res.data.sway === bgSway) cmp = `<p class="small">Same as Best Guess (${bgSway}). Study him and bring a novelty to do better.</p>`;
  sfx(out === 'fizzled' ? 'sad' : 'stamp');
  if (out !== 'fizzled') setTimeout(() => sfx(out === 'delighted' ? 'tada' : 'coin'), 250);
  ui.aResult = true;
  openModal('result', { html: `
    <p class="kicker">${esc(C.TIMELINES[v.whore.timeline].gazette)}</p>
    <span class="stamp big pop ${out === 'fizzled' ? '' : 'good'}">${out}</span>
    ${gag ? '' : `<div style="width:120px;margin:0 auto">${photo(exprArt(wid, look), v.whore.name, '', { eager: true })}</div>`}
    <h2 class="h2">${esc(res.text)}</h2>
    <div class="payline" style="justify-content:center"><span>${res.data.sway}<small>Sway (Bar ${bar})</small></span><span>+${res.data.renown}<small>Renown</small></span><span>+${res.data.coin}<small>Coin</small></span>${res.data.gossip ? `<span>+${res.data.gossip}<small>Gossip</small></span>` : ''}</div>
    ${cmp}
    ${gag ? `${gag}<div style="width:100px;margin:0 auto">${photo(exprArt(wid, look), v.whore.name, '', { eager: true })}</div>` : ''}
    <div class="clip-list" style="text-align:left">${clips.join('')}</div>
    <button class="btn primary block" data-act="close-modal" data-autofocus>${tourist ? 'Read the front page' : 'Back to the front page'}</button>` });
  ui.modal.onClose = () => { go('front'); teachFrom(evs, wid); catchFrom(evs, wid); if (evs.some((e) => e.type === 'timeline-unlocked')) setTimeout(() => openModal('telegram', evs.find((e) => e.type === 'timeline-unlocked').data.invite), 300); };
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
  const v = V(); const wid = ui.active; const tl = v.whore.timeline;
  const talent = talentPlay(v, 'plan');
  const plan = { place: ui.place, cards: [...ui.sel], grease: ui.grease };
  if (ui.item) plan.item = ui.item; if (talent) plan.talent = talent; if (ui.stake) plan.stake = true;
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
  headline({ kicker: 'Sealed', head: 'Sealed with a kiss', sub: s ? sealText(wid) : C.LINES.seal, x: 'curtain' });
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
  ui.resultsHoldUntil = Date.now() + (calm() ? 2500 : 3500); // the spin plus a reading pause: no headline prints over it
  ui.screen = 'results'; render();
  setTimeout(hlReflow, calm() ? 2600 : 3600);
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
  $('#layer').appendChild(el);
  sfx('curtain');
  await wait(calm() ? 1300 : 1700, true); // a reading hold: reduced motion keeps it
  el.classList.add('lift');
  await wait(650);
  el.remove();
  ui.overlays = Math.max(0, ui.overlays - 1);
}
ACTS['after-results'] = () => {
  const r = ui.result;
  if (r && !r.taught) { r.taught = true; setTimeout(() => teachFrom(r.evs, ui.active), 600); }
  if (r && r.unlock) { openModal('telegram', r.unlock.data.invite || TLS.find((t) => t !== r.tl)); return; }
  go('front');
};
ACTS['tg-go'] = () => { closeModal(); go('timelines'); };

// Leaving a whore at last call asks first; "Let her" sends her out by Standing Order now, "Seal now" opens her plan.
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
  // the journey takes time: the new Timeline's own Curtain may fall while you travel, so there is news waiting.
  // It never carries one of YOUR Curtains past due: the trip stops a minute short of the first one.
  const tl = tlOf(d.id);
  const mine = acctView().whores.map((x) => curtainIn(x.timeline) - 1);
  const trip = Math.max(0, Math.min(curtainIn(tl) + 1, ...mine));
  if (trip > 0 && trip <= ui.S.opts.maxGapMin) { const bg = act(L.advanceClock, trip); if (bg) onBackground(bg); }
  const evs = act(L.openTimeline, ME, d.id);
  if (!evs) return;
  const travel = `${{ wildwest: 'The night coach to Dakota', vegas: 'The red-eye to Las Vegas', victorian: 'The boat train to London' }[tl]} took ${trip >= 60 ? `${Math.floor(trip / 60)}h ${String(trip % 60).padStart(2, '0')}m` : `${trip} minutes`}. Time passes in every Timeline.`;
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
    if (fresh) headline({ kicker: C.TIMELINES[tl].name, head: `${C.CHARACTERS[wid].name} steps in`, sub: C.CHARACTERS[wid].voice });
    teach('digest', 'While You Were Away', 'At most five headlines, the ones that matter to you first. You get one every time you switch in.', 'digest');
  };
  setEra(tl);
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
  setEra(tlOf(id));
  sfx('stamp');
  const ch = C.CHARACTERS[id]; const TL = C.TIMELINES[ch.timeline];
  ui.screen = 'arrival'; render();
  openModal('result', { html: `
    <p class="kicker">${esc(TL.gazette)}</p>
    <h1 class="h1">${ransom(`${ch.short.toUpperCase()} ARRIVES`)}</h1>
    <p class="h3">${esc(TL.name)} · ${esc(TL.quarter)}</p>
    <div style="width:170px;margin:0 auto">${photo(ch.art, ch.name, `<b>${esc(ch.name)}</b>${esc(ch.epithet)}`, { eager: true })}</div>
    <p class="deck">${esc(ch.voice)}</p>
    <p class="small" style="text-align:center;margin:0">${esc(TYPE_PLAIN[ch.type].replace(/^./, (x) => x.toUpperCase()))}. She is best at ${artLabel(ch.signature)}. For now she is a humble <button class="x" data-x="eratitle">${esc(L.eraTitle(ch.timeline, 'common', 'standing'))}</button>.</p>
    ${rivalLine(ch.timeline)}
    <button class="btn primary block" data-act="close-modal" data-autofocus>Turn the page</button>` });
  ui.modal.onClose = () => {
    const v = V(); const t = v.board.find((b) => b.tourist);
    if (t) ACTS['start-assign']({ id: t.gent }); else go('front');
  };
}
// The arrival names the Timeline's own rival, so the clash at the first Curtain is with someone you have met.
function rivalLine(tl) {
  const rid = Object.keys(C.CHARACTERS).find((r) => C.CHARACTERS[r].role === 'rival' && C.CHARACTERS[r].timeline === tl);
  if (!rid) return '';
  const r = C.CHARACTERS[rid];
  const auto = (C.NPC_ACCOUNTS.find((a) => a.whores.includes(rid)) || {}).kind === 'automaton';
  const look = RIVALS.find((x) => x[0] === rid);
  return `<div class="rivalclip clip"><span class="rface">${img(exprArt(rid, look ? look[1] : 'scheme'), r.name)}</span><p><b>Your rival: ${esc(r.name)}</b>${r.epithet ? `, ${esc(r.epithet)}` : ''}${auto ? ' (a house Automaton)' : ''}. She has her eye on your first Curtain.</p></div>`;
}
SCREENS.arrival = () => `<section class="sheet"><p class="kicker">Hold the front page</p><h1 class="h1">Arriving...</h1></section>`;

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
    if (!ui.lastCall) { ui.lastCall = true; renderChrome(); if (curtainIn(tlOf(ui.active)) <= 1) teach('lastcall', 'Last call', 'The Curtain waits for no one... except you, tonight. Seal when you are ready.', 'lastcall'); }
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
  if (kind === 'card') openModal('card', [a, b]);
  else if (kind === 'gent') openModal('gent', a);
  else if (kind === 'item') openModal('item', a);
  else if (kind === 'offer') openModal('offer');
  else if (kind === 'char') openModal('char', a);
  else if (kind === 'tourist') { const v = V(); const t = v.timeline.tourist; openModal('result', { html: `<p class="kicker">Lost tourist</p>${img(t.art, t.name, { cls: '' })}<h2 class="h2">${esc(t.name)}</h2><p class="deck">“${esc(t.voice)}”</p><p>He likes ${artLabel(t.taste)}. You can't fail with him; you can only delight him more.</p><button class="btn primary block" data-act="close-modal">Close</button>` }); }
  if (ui.modal) { ui.modal.flipped = true; renderModal(); sfx('flip'); if (['gent', 'offer', 'item'].includes(kind)) ui.steps.add('flip'); }
}
document.addEventListener('click', (e) => {
  if (lp && lp.fired) { lp = null; e.preventDefault(); e.stopPropagation(); return; }
  lp = null;
  audioInit();
  const x = e.target.closest('[data-x]');
  if (x) { e.preventDefault(); e.stopPropagation(); const prev = ui.modal; openExcl(x.dataset.x, prev); return; }
  const a = e.target.closest('[data-act]');
  if (!a) return;
  const fn = ACTS[a.dataset.act];
  if (hlCur && hlCur.teach && !['hl-close', 'noop', 'mute', 'flip'].includes(a.dataset.act)) closeHl();
  if (fn) { e.preventDefault(); fn(a.dataset, a, e); }
}, true);
function openExcl(key, prev) {
  // an EXCLUSIVE stacked over another modal returns to it when closed
  if (prev && prev.type !== 'excl') {
    const saved = { ...prev };
    ui.modal = null; ui.overlays = Math.max(0, ui.overlays - 1);
    openModal('excl', key);
    ui.modal.onClose = () => { openModal(saved.type, saved.data); Object.assign(ui.modal, { flipped: saved.flipped, open: saved.open, onClose: saved.onClose }); renderModal(); };
  } else openModal('excl', key);
  sfx('clack');
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && ui.modal) closeModal();
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.flip')) { e.preventDefault(); ACTS.flip(); }
});
document.addEventListener('submit', (e) => {
  if (e.target.id !== 'signup') return;
  e.preventDefault();
  audioInit();
  const n = (e.target.nom.value || '').trim();
  ui.name = n || 'Anonymous';
  // the first comic panel's pictures start loading while the stamp lands
  [['dolly', 'pleased'], ['fanny', 'eyebrow'], ['jackie', 'bubble']].forEach(([id, k]) => { const a = artOf(exprArt(id, k)); if (a) { const im = new Image(); im.src = a.src; } });
  sfx('stamp');
  go('intro');
});
reduceMQ.addEventListener?.('change', () => render({ keepScroll: true }));
// test hook for the browser playthrough (only with ?debug in the URL)
if (/[?&]debug\b/.test(location.search)) window.__lw = { ui, L, act, render, onBackground };

render();
