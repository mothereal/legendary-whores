// Legendary Whores · shared rules engine (v2 prototype)
// Plain ES module, no dependencies, browser and Node. Whole numbers only. Seeded RNG only (no Math.random).
// Rulebook: ../docs/rules-core.md. Content and every balance number: ./content.js.
//
// API style: every action is PURE. It takes a state and returns a NEW state (the input is never mutated).
// The events an action produced are on `newState.lastEvents` (also appended to `newState.log`).
// Illegal actions throw RulesError { code, message }.
// For simulations, `mut.<action>` runs the same action in place (no copy) and returns the same state object.

import * as C from './content.js';
export const CONTENT = C;
export const RULES = C.RULES;
const R = C.RULES;

export class RulesError extends Error {
  constructor(code, message) { super(message); this.code = code; this.name = 'RulesError'; }
}
const fail = (code, msg) => { throw new RulesError(code, msg); };

// ---------------------------------------------------------------------------
// Seeded RNG (mulberry32; state is one uint32 kept in state.rng)
// ---------------------------------------------------------------------------
function hashSeed(seed) {
  const str = String(seed);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h || 1;
}
function rnd(s) {
  let t = (s.rng = (s.rng + 0x6D2B79F5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}
const rint = (s, n) => (n <= 1 ? 0 : rnd(s) % n);
const pick = (s, arr) => arr[rint(s, arr.length)];
function shuffle(s, arr) {
  for (let i = arr.length - 1; i > 0; i--) { const j = rint(s, i + 1); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
  return arr;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
const dayOf = (clock) => Math.floor(clock / 1440);
const isAffl = (cid) => !!C.AFFLICTIONS[cid];
const cardOf = (cid) => C.CARDS[cid] || C.AFFLICTIONS[cid];
const TIER_ORDER = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4 };
const maxTier = (a, b) => (TIER_ORDER[a] >= TIER_ORDER[b] ? a : b);
const clone = (x) => (typeof structuredClone === 'function' ? structuredClone(x) : JSON.parse(JSON.stringify(x)));
const placeKindOf = (pid) => C.PLACES[pid].kind;

export function hostsFor(tl, k) {
  const g = C.TIMELINES[tl].gents; const P = C.TIMELINES[tl].places; const m = {};
  P.forEach((p, i) => { m[p] = g[(((i - k) % 3) + 3) % 3]; });
  return m;
}
export const isRaidCurtain = (k) => (k + 1) % R.raidEvery === 0;

function placeOfKind(tl, kind) { return C.TIMELINES[tl].places.find((p) => C.PLACES[p].kind === kind); }
function whoresIn(s, tl) { return Object.values(s.whores).filter((w) => w.timeline === tl && !w.retired); }
const isNPC = (s, w) => s.accounts[w.account].kind !== 'human';
const routeOf = (w) => (w.notoriety > w.standing ? 'notoriety' : 'standing');
/**
 * roadOf(whore) — the road Best Guess, the smileys and the Standing Order steer by: the road she declared ('standing', the
 * Society Pages, or 'notoriety', the Police Gazette), else the one she is on (Standing >= Notoriety: 'standing').
 * Takes a whore view (view.whore) or the state's whore. Round 4: the classy-or-notorious choice is the player's, not a default.
 */
/** greaseMax(whore) — the most Grease Palms she may buy at one Curtain: RULES.sway.grease.max, +1 at each maxUp Notoriety. */
export function greaseMax(w) { const G = R.sway.grease; return (w.notoriety >= G.at ? G.max : 0) + (G.maxUp || []).filter((n) => w.notoriety >= n).length; }
/** canBribe(whore, placeId, raidPlaceId) — may she square the Peelers here tonight (a raided Gutter Place, Notorious)? */
export function canBribe(w, pid, raidPid) { return !!(R.raidBribe && raidPid && pid === raidPid && placeKindOf(pid) === 'gutter' && w.notoriety >= R.raidBribe.at); }
export function roadOf(w) { return w.road === 'standing' || w.road === 'notoriety' ? w.road : (w.standing >= w.notoriety ? 'standing' : 'notoriety'); }
/** greasePer(whore) — Coin per +1 Grease Palms at her tier (RULES.sway.grease.costByTier; Born in a Gin Shop pays 1 less, at least 1). */
export function greasePer(w) {
  const G = R.sway.grease; const base = (G.costByTier && G.costByTier[tierOf(w)]) || G.costPer;
  return w.charm === 'born-in-a-gin-shop' ? Math.max(1, base - 1) : base;
}
/** gamblerTerms(whore) — the Gambler's { stake, payout } at her tier (RULES.gambler, byTier above Common). */
export function gamblerTerms(w) { const G = R.gambler; return (G.byTier && G.byTier[tierOf(w)]) || { stake: G.stake, payout: G.payout }; }
// a number from the seed and a key, with no draw from the game's RNG stream (so adding a daily feature moves no seed)
function hashKey(s, key) { let t = (hashSeed(`${s.seed}|${key}`) + 0x6D2B79F5) >>> 0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return (t ^ (t >>> 14)) >>> 0; }
/** specialOf(state, timelineId, day) — the Morning Special: one novelty from the Timeline's stalls, the same all day. */
export function specialOf(state, tl, day = dayOf(state.clock)) {
  const pool = C.TIMELINES[tl].places.flatMap((p) => C.PLACES[p].stall);
  return pool[hashKey(state, `special|${tl}|${day}`) % pool.length];
}
/** digsNext(whore) — the next rung of the Ladder on the Road she is on, or null at the top: { road, n, rung } (n = 0-based). */
export function digsNext(w) {
  const road = roadOf(w); const ladder = C.DIGS[w.timeline] && C.DIGS[w.timeline][road];
  const n = (w.digs && w.digs[road]) || 0;
  return ladder && n < ladder.length ? { road, n, rung: ladder[n] } : null;
}
/** milestoneOf(whore) — her Renown sub-title (ERA_MILESTONES) and the next milestone: { at, title, next } (at/title null below the first). */
export function milestoneOf(w) {
  const ms = R.milestones || []; const got = ms.filter((m) => w.renown >= m); const at = got.length ? got[got.length - 1] : null;
  const M = C.ERA_MILESTONES && C.ERA_MILESTONES[w.timeline];
  const route = w.notoriety > w.standing ? 'notoriety' : 'standing';
  return { at, title: at && M && M[at] ? M[at][route] : null, next: ms.find((m) => w.renown < m) || null };
}

function tierOf(w) {
  if (w.seat === 'crown') return 'mythic';
  if (w.seat === 'salon' || w.seat === 'gutter') return 'legendary';
  if (w.renown >= R.tiers.epic) return 'epic';
  if (w.renown >= R.tiers.rare) return 'rare';
  return 'common';
}
/** seatName(seatId, timelineId) — each Timeline names its seats in its own period (the Salon Seat is Victorian). */
export function seatName(id, tl) { const S = C.SEATS[id]; return (S.names && tl && S.names[tl]) || S.name; }
export function eraTitle(tl, tier, route) {
  const t = C.ERA_TITLES[tl][tier];
  return route === 'notoriety' ? t.notoriety : t.standing;
}

// The Timeline whose Curtain is being resolved right now (synchronous; cleared when its Curtain number moves on).
let RESOLVING = null;
function emit(s, ev) {
  const e = { id: ++s.tick, clock: s.clock, day: s.day, vis: 'all', ...ev };
  if (e.timeline && s.timelines[e.timeline]) e.curtain = s.timelines[e.timeline].curtainNo;
  // events emitted while Curtain k resolves (payouts, seats, promotions...) carry curtain k but happen at its fall,
  // the same moment as the events emitted just after the Curtain number moves to k+1; the digest ages them alike
  if (e.timeline && e.timeline === RESOLVING) e.atCurtain = true;
  s.log.push(e);
  if (s._ev) s._ev.push(e);
  if (s.opts.logLimit && s.log.length > s.opts.logLimit * 2) s.log.splice(0, s.log.length - s.opts.logLimit);
  return e;
}
const priv = (w) => [w.account];

// ---------------------------------------------------------------------------
// Game creation
// ---------------------------------------------------------------------------
function freshDaily(day) {
  return { day, curtains: 0, assigns: 0, assignRenown: 0, studies: 0, rummages: 0, regular: {}, special: false, invited: false };
}
function daily(s, w) {
  const d = dayOf(s.clock);
  if (w.daily.day !== d) {
    w.daily = freshDaily(d);
    if (s.opts.talentOncePerDay) w.talentUsed = false; // opts.talentOncePerDay: the Talent refreshes at dawn, not at every Curtain
    // the High Road's Patron (round 5, finding 2): Standing 7+ (and Standing >= Notoriety) brings a stipend with each new day
    const HR = R.highRoad;
    if (HR && w.standing >= HR.patronAt && w.standing >= w.notoriety) {
      addCoin(w, HR.patronCoin);
      emit(s, { type: 'patron', vis: priv(w), timeline: w.timeline, whores: [w.id], data: { coin: HR.patronCoin }, text: `A Patron calls: an envelope for ${w.name}, unsigned, with ${HR.patronCoin} Coin in it.` });
    }
  }
  return w.daily;
}
// Is her Talent spent right now? (with opts.talentOncePerDay a Talent spent yesterday is fresh again today)
const talentSpent = (s, w) => !!w.talentUsed && !(s.opts.talentOncePerDay && w.daily.day !== dayOf(s.clock));
const talentSpentMsg = (s) => (s.opts.talentOncePerDay ? 'Your Talent is spent until dawn.' : 'Your Talent is spent until the next Curtain.');

function createWhore(s, accountId, charId) {
  const ch = C.CHARACTERS[charId];
  if (!ch) fail('no-character', `Unknown character ${charId}`);
  if (s.whores[charId]) fail('taken', `${ch.name} is already on the street`);
  if (!s.timelines[ch.timeline]) fail('no-timeline', `${ch.timeline} is not open in this world`);
  const acct = s.accounts[accountId];
  if (acct.whores.some((id) => s.whores[id] && s.whores[id].timeline === ch.timeline && !s.whores[id].retired)) fail('one-per-timeline', 'One whore per Timeline.');
  const w = {
    id: charId, char: charId, account: accountId, timeline: ch.timeline, name: ch.name,
    type: ch.type, signature: ch.signature, charm: ch.charm, talent: ch.talent, vice: ch.vice,
    renown: 0, coin: R.start.coin, coinEarned: 0,
    standing: R.start.standing, notoriety: R.start.notoriety, peakStanding: R.start.standing, peakNotoriety: R.start.notoriety,
    itch: 0, itchCycle: 0, braveFace: 0, gossip: 0,
    draw: shuffle(s, [...C.SHARED_DECK, ...ch.cards]), discard: [], hand: [],
    items: [], offer: null, collectibles: [],
    history: {}, known: { gents: {}, rivals: {} }, blackBook: [],
    daily: freshDaily(dayOf(s.clock)), plan: null, talentUsed: false, assignation: null,
    tier: 'common', best: 'common', seat: null, lastPlace: null, places: [], lastBeatenBy: null,
    lastActiveAt: s.clock, curtains: 0, assignations: 0, caught: 0, frontPage: false, frolicked: {},
    touristMet: false, lastTouristCurtain: -99, nextAssignCoin: 0, slummed: false, freshTaken: -1, road: null,
    failed: {}, retired: false, lentHold: null,
    digs: { standing: 0, notoriety: 0 }, milestone: 0, societyPages: false,
    stats: { cardPlays: {}, placeVisits: {}, kinkHits: 0, catches: 0 },
  };
  if (w.charm === 'old-flame') hist(w, C.TIMELINES[w.timeline].gents[0]).regular = 1;
  s.whores[charId] = w;
  acct.whores.push(charId);
  deal(s, w);
  return w;
}

function hist(w, gid) {
  return (w.history[gid] ||= { regular: 0, grudge: 0, seen: [], wait: 0, visits: 0, satisfied: 0, delighted: 0, catches: 0 });
}

function drawOne(s, w) {
  if (!w.draw.length) { if (!w.discard.length) return null; w.draw = shuffle(s, w.discard); w.discard = []; }
  return w.draw.pop();
}
function deal(s, w) {
  w.hand = [];
  for (let i = 0; i < R.handSize; i++) { const c = drawOne(s, w); if (c === null) break; w.hand.push(c); }
}

/**
 * newGame(seed, opts)
 * opts.humans: [{ id, name, whores?: [charId...] }] (default one human 'you' with no whore yet)
 * opts.starter: charId for the first human (convenience)
 * opts.timelines: subset of ['victorian','wildwest','vegas'] (default all)
 * opts.rivals / opts.standins: false to leave them out
 * opts.scriptRival: true = the Timeline's rival goes where the human goes (prototype slice), every Curtain;
 *   { curtains: n } = only for a Timeline's first n Curtains, after which her Habit drives her (see isScriptedCurtain);
 *   { curtains: n, perWhore: true } = only for the first n Curtains the human's whore plays IN that Timeline, so a Timeline
 *   opened later still gets its scripted clash on her first night there (B-arcade round 3, finding 2)
 * opts.stageRivals: { [whoreId]: { hand: [cardIds], regular: { gentId: n }, standing, quietCurtains } } — prototype staging of
 *   an NPC (the worked example's rival at Curtain 1): replaces her opening hand (no RNG used), sets History/Standing,
 *   and keeps her Talent unused for her Timeline's first `quietCurtains` Curtains
 * opts.minGapMin / opts.maxGapMin: Curtain clock overrides (prototype: minGapMin 0)
 * opts.logLimit: keep at most ~2x this many log entries (sims)
 * opts.talentOncePerDay: a whore's Talent is used once per district day (refreshes at dawn) instead of once per Curtain
 *   (prototype option; default false = the rulebook's once per Curtain, which the sim measures)
 * opts.standinSeal: { min, max, from } — prototype option: once a human seals, each stand-in in that Timeline seals
 *   min..max district minutes later (no RNG draw: a hash of the seed, her id and the Curtain), from the Timeline's Curtain
 *   No. `from` (0-based) on; Automatons still seal at once. The Curtain falls early only when the last one has sealed
 *   (or at its clock, as ever), so a prototype can show the wait. view.timeline.sealing reports it. Default off.
 */
export function newGame(seed = 1, opts = {}) {
  const tls = opts.timelines || C.TIMELINE_IDS;
  const s = {
    v: 1, seed: String(seed), rng: hashSeed(seed), clock: 0, day: 0, season: 1, tick: 0,
    opts: {
      scriptRival: !!opts.scriptRival,
      // null = every Curtain (opts.scriptRival === true); n = only a Timeline's first n Curtains
      scriptCurtains: opts.scriptRival && typeof opts.scriptRival === 'object' && Number.isInteger(opts.scriptRival.curtains) ? opts.scriptRival.curtains : null,
      // { curtains: n, perWhore: true }: count the human whore's OWN Curtains in that Timeline, not the Timeline's
      scriptPerWhore: !!(opts.scriptRival && typeof opts.scriptRival === 'object' && opts.scriptRival.perWhore),
      scriptItch: !!opts.scriptItch,
      talentOncePerDay: !!opts.talentOncePerDay,
      standinSeal: opts.standinSeal && Number.isInteger(opts.standinSeal.min) && Number.isInteger(opts.standinSeal.max)
        ? { min: opts.standinSeal.min, max: Math.max(opts.standinSeal.min, opts.standinSeal.max), from: opts.standinSeal.from || 0 } : null,
      minGapMin: opts.minGapMin ?? R.curtain.minGapMin,
      maxGapMin: opts.maxGapMin ?? R.curtain.maxGapMin,
      logLimit: opts.logLimit ?? 0,
      timelines: tls,
    },
    accounts: {}, whores: {}, timelines: {}, log: [], lastEvents: [],
  };
  s._ev = [];
  for (const tl of tls) {
    s.timelines[tl] = {
      id: tl, curtainNo: 0, lastCurtainAt: 0, freshStall: pick(s, C.TIMELINES[tl].places),
      seats: Object.fromEntries(Object.keys(C.SEATS).map((k) => [k, { id: k, holder: null, graceUntil: 0, since: null }])),
      challenges: [], lastCharmed: {}, results: null, resultsHistory: [], hostOverride: null, table: [],
    };
  }
  const humans = opts.humans || [{ id: 'you', name: opts.playerName || 'You' }];
  const claimed = new Set(humans.flatMap((h) => h.whores || []));
  for (const h of humans) s.accounts[h.id] = { id: h.id, name: h.name, kind: 'human', whores: [], slots: 1, pastWhorescore: h.pastWhorescore || 0, seen: {} };
  for (const a of C.NPC_ACCOUNTS) {
    const ws = a.whores.filter((c) => !claimed.has(c) && tls.includes(C.CHARACTERS[c].timeline)
      && !(C.CHARACTERS[c].role === 'rival' && opts.rivals === false)
      && !(C.CHARACTERS[c].role === 'standin' && opts.standins === false));
    if (!ws.length) continue;
    s.accounts[a.id] = { id: a.id, name: a.name, kind: a.kind, whores: [], slots: 3, pastWhorescore: a.pastWhorescore, seen: {} };
    for (const c of ws) {
      createWhore(s, a.id, c);
      const sd = a.season && a.season[c]; const w = s.whores[c];
      if (sd && opts.seedBoards !== false) {
        w.coinEarned = Math.max(w.coinEarned, sd.coinEarned || 0);
        w.peakStanding = Math.max(w.peakStanding, sd.peakStanding || 0);
        w.peakNotoriety = Math.max(w.peakNotoriety, sd.peakNotoriety || 0);
      }
    }
  }
  for (const h of humans) {
    if (h.whores && h.whores.length) { s.accounts[h.id].slots = Math.max(1, h.whores.length); for (const c of h.whores) createWhore(s, h.id, c); }
  }
  // prototype staging (no RNG is used, so every other deal on the seed is unchanged)
  for (const [wid, st] of Object.entries(opts.stageRivals || {})) {
    const w = s.whores[wid]; if (!w || !st) continue;
    if (Array.isArray(st.hand) && st.hand.every((c) => C.CARDS[c])) { w.discard.push(...w.hand); w.hand = [...st.hand]; }
    for (const [gid, n] of Object.entries(st.regular || {})) if (C.GENTS[gid]) hist(w, gid).regular = n;
    if (Number.isInteger(st.standing)) { w.standing = st.standing; w.peakStanding = Math.max(w.peakStanding, w.standing); }
    if (Number.isInteger(st.quietCurtains)) w.quietUntil = st.quietCurtains;
  }
  emit(s, { type: 'game-start', text: 'The Eternal District opens its doors.' });
  if (opts.starter) chooseStarterM(s, humans[0].id, opts.starter);
  s.lastEvents = s._ev; delete s._ev;
  return s;
}

// ---------------------------------------------------------------------------
// Encounter maths (the heart of the matchup). Pure on a context object.
// ---------------------------------------------------------------------------
function effArts(cid, pos, talent) {
  const a = cardOf(cid).arts || [];
  if (talent && talent.kind === 'double-entendre' && talent.pos === pos && talent.art && !a.includes(talent.art)) return [...a, talent.art];
  return a;
}
function distinctArtsOk(arts) {
  if (arts.length !== 3) return false;
  for (const x of arts[0]) for (const y of arts[1]) for (const z of arts[2]) if (x !== y && y !== z && x !== z) return true;
  return false;
}
export function kinkTriggered(kink, cardIds, arts, item) {
  if (!kink) return false;
  if (item && item === kink.item) return true;
  const t = kink.trigger;
  // withArt: the trigger card must be Worked alongside another card carrying that Art (Drinks on the House with a Frolic card)
  if (t.cards) return cardIds.some((c) => t.cards.includes(c)) && (!t.withArt || cardIds.some((c, i) => !t.cards.includes(c) && (arts[i] || []).includes(t.withArt)));
  if (t.artCount) return arts.filter((a) => a.includes(t.artCount.art)).length >= t.artCount.n;
  if (t.arts) return t.arts.every((x) => arts.some((a) => a.includes(x)));
  if (t.distinctArts) return distinctArtsOk(arts);
  return false;
}

/**
 * computeEncounter(ctx) -> { sway, cards, parts, itch, noto, kinkHit, secretHit, aversionHit, unknown }
 * ctx.w: { type, signature, charm, vice, standing, notoriety, braveFace, lastPlace }
 * ctx.gent: { tastes, aversion, fancy, freshness, secretTaste|null, kink|null, regularCap, secretKnown, kinkKnown }
 * ctx.place: placeId | null (null = Assignation), ctx.cards: [cardId] in Worked order, ctx.curse: [affliction ids in hand]
 * ctx.item: itemId|null, ctx.talent: { kind, pos, art }|null, ctx.hist: { regular, grudge, seen, wait }
 * ctx.others: number at the Place besides you (-1 = unknown), ctx.leastRenown, ctx.nemesis, ctx.grease
 */
export function computeEncounter(ctx) {
  const { w, gent, cards } = ctx;
  const talent = ctx.talent || null;
  const place = ctx.place ? C.PLACES[ctx.place] : null;
  const house = place ? place.house : null;
  const arts = cards.map((c, i) => effArts(c, i, talent));
  const nFrolic = arts.filter((a) => a.includes('frolic')).length;
  const curse = ctx.curse || [];
  const cardOut = []; const parts = [];
  let sway = 0; let silverUsed = false; let secretHit = false; let aversionHit = false;
  for (let i = 0; i < cards.length; i++) {
    const card = C.CARDS[cards[i]]; const a = arts[i]; const fx = card.effects || [];
    let al = card.allure;
    if (house) for (const art of a) al += house.arts[art] || 0;
    if (fx.includes('plusIfTasteWit') && gent.tastes.includes('wit')) al += 1;
    if (fx.includes('plusPerOtherFrolic')) al += nFrolic - (a.includes('frolic') ? 1 : 0);
    if (fx.includes('plusIfOtherFrolic') && nFrolic - (a.includes('frolic') ? 1 : 0) >= 1) al += 1;
    if (fx.includes('plusIfCrowd') && place && ctx.others !== 0) al += 1;
    if (fx.includes('plusRowdyGutter') && place && place.kind !== 'posh') al += 1;
    for (const af of curse) { const sym = C.AFFLICTIONS[af].symptom; if (sym.kind === 'artAllure' && a.includes(sym.art)) al -= sym.amount; }
    if (al < 0) al = 0;
    let t = 0; const ticks = [];
    if (a.some((x) => gent.tastes.includes(x))) { t += R.card.taste; ticks.push('taste'); }
    else if (w.charm === 'silver-tongue' && a.includes('wit') && !silverUsed) { silverUsed = true; t += R.card.taste; ticks.push('silver-tongue'); }
    if (gent.secretTaste && a.includes(gent.secretTaste)) { t += R.card.secret; ticks.push('secret'); secretHit = true; }
    if (a.includes(w.signature)) { t += R.card.signature; ticks.push('signature'); }
    if (gent.aversion && a.includes(gent.aversion) && !fx.includes('noAversion')) { t -= R.card.aversion; ticks.push('aversion'); aversionHit = true; }
    cardOut.push({ id: cards[i], arts: a, allure: al, ticks, score: al + t });
    sway += al + t;
  }
  const bonus = (key, n) => { if (n) { parts.push({ key, n }); sway += n; } };
  const h = ctx.hist || { regular: 0, grudge: 0, seen: [], wait: 0 };
  if (gent.fancy && w.type === gent.fancy) bonus('fancy', R.sway.fancy);
  const kinkHit = kinkTriggered(gent.kink, cards, arts, ctx.item);
  if (kinkHit) bonus('kink', R.sway.kink);
  bonus('regular', Math.min(h.regular, gent.regularCap || R.sway.regularCap));
  bonus('grudge', -R.sway.grudge * h.grudge);
  if (w.vice !== 'bored-stiff') bonus('seen-it', -R.sway.seenIt * cards.filter((c) => h.seen.includes(c)).length);
  if (h.wait) bonus('make-him-wait', 4);
  if (talent && talent.kind === 'make-him-wait') bonus('make-him-wait-now', -3);
  if (w.charm === 'dimples' && gent.tastes.includes('silk')) bonus('dimples', 1);
  if (w.vice === 'vanity' && arts.length) {
    if (arts[0].includes('silk')) bonus('vanity', 1); else if (!arts[0].includes('wit')) bonus('vanity', -2);
  }
  if (place) {
    if (place.kind === 'posh' && w.standing >= R.sway.respectable.at) bonus('respectable', R.sway.respectable.bonus);
    if (place.kind !== 'posh' && w.notoriety >= R.sway.notorious.at) bonus('notorious', R.sway.notorious.bonus);
    if (ctx.grease) bonus('grease-palms', ctx.grease);
    if (w.braveFace) bonus('brave-face', R.sway.braveFace);
    if (w.charm === 'knows-which-fork' && place.kind === 'posh') bonus('knows-which-fork', 2);
    if (w.charm === 'born-in-a-gin-shop' && place.kind === 'gutter') bonus('born-in-a-gin-shop', 2);
    if (w.vice === 'mothers-ruin' && place.kind === 'posh') bonus('mothers-ruin', -1);
    if (w.vice === 'bored-stiff' && w.lastPlace === ctx.place) bonus('bored-stiff', -2);
    if (w.charm === 'underestimated' && ctx.leastRenown && ctx.others > 0) bonus('underestimated', 2);
    if (w.vice === 'jealousy') { if (ctx.nemesis) bonus('jealousy', 2); else if (ctx.others === 0) bonus('jealousy', -1); }
  }
  const item = ctx.item ? C.ITEMS[ctx.item] : null;
  if (item && item.kind === 'sway') bonus('item', item.sway);
  for (const af of curse) { const sym = C.AFFLICTIONS[af].symptom; if (sym.kind === 'sway') bonus('affliction', -sym.amount); }
  if (sway < 0) sway = 0;

  // Itch
  let nf = 0;
  cards.forEach((c, i) => { const fx = C.CARDS[c].effects || []; if (arts[i].includes('frolic') && !fx.includes('noItch')) nf += fx.includes('doubleItch') ? 2 : 1; });
  let itch = 0;
  if (gent.freshness === 'fair') itch = nf * R.itch.fair;
  else if (gent.freshness === 'ripe') itch = nf * R.itch.ripe + (nf > 0 ? R.itch.ripeExtra : 0);
  const itchRaw = itch;
  const prot = (w.charm === 'iron-constitution' ? 1 : 0) + (item && item.kind === 'protection' ? item.protection : 0);
  itch = Math.max(0, itch - prot);
  if (talent && talent.kind === 'smokescreen') itch = 0;

  // Notoriety from this encounter (before the seesaw)
  let noto = 0;
  if (place && place.kind === 'posh' && !house.nda) cards.forEach((c, i) => { const fx = C.CARDS[c].effects || []; if (arts[i].includes('frolic') && !fx.includes('noItch')) noto += 1; }); // house.nda: a Posh Place whose Frolic costs no Notoriety (a lever; unused unless content sets it)
  if (place && place.kind === 'gutter') noto += 1;
  cards.forEach((c) => { if ((C.CARDS[c].effects || []).includes('notorietyOnWork')) noto += 1; });
  if (talent && talent.kind === 'smokescreen') noto += 1;
  if (item && item.notorietyPerUse) noto += item.notorietyPerUse;
  if (item && item.notorietyAtPosh && place && place.kind === 'posh') noto += item.notorietyAtPosh;
  if (cards.some((c) => (C.CARDS[c].effects || []).includes('noNotoriety'))) noto = 0;
  cards.forEach((c) => { if ((C.CARDS[c].effects || []).includes('notorietyDownOnWork')) noto -= 1; });

  const unknown = [];
  if (gent.secretKnown === false) unknown.push('secret');
  if (gent.kinkKnown === false) unknown.push('kink');
  return { sway, cards: cardOut, parts, itch, itchRaw, noto, kinkHit, secretHit, aversionHit, unknown, nFrolicItch: nf };
}

// Gentleman knowledge object: truth (all facts) or as one whore knows him.
function gentCtx(gid, known, truth) {
  const tour = C.TOURISTS[gid];
  if (tour) return { id: gid, tastes: [tour.taste], aversion: null, fancy: null, freshness: tour.freshness, secretTaste: null, kink: null, regularCap: R.sway.regularCap, tourist: true };
  const g = C.GENTS[gid]; const k = known || {};
  const sk = truth || !!k.secret; const kk = truth || !!k.kink;
  return {
    id: gid, tastes: g.tastes, aversion: g.aversion, fancy: g.fancy, freshness: g.freshness,
    secretTaste: sk ? g.secretTaste : null, kink: kk ? g.kink : null,
    regularCap: g.hook && g.hook.kind === 'regularCap' ? g.hook.value : R.sway.regularCap,
    secretKnown: sk, kinkKnown: kk,
  };
}
function wCtx(w) {
  return { type: w.type, signature: w.signature, charm: w.charm, vice: w.vice, standing: w.standing, notoriety: w.notoriety, braveFace: w.braveFace, lastPlace: w.lastPlace, itch: w.itch };
}
function histCtx(w, gid) { const h = w.history[gid]; return h ? { regular: h.regular, grudge: h.grudge, seen: h.seen, wait: h.wait } : { regular: 0, grudge: 0, seen: [], wait: 0 }; }

// ---------------------------------------------------------------------------
// Meters
// ---------------------------------------------------------------------------
function raiseMeter(s, w, meter, n, why) {
  if (!n) return;
  const before = { standing: w.standing, notoriety: w.notoriety };
  if (n > 0) {
    for (let i = 0; i < n; i++) {
      if (meter === 'standing') { w.standing = Math.min(R.meterMax, w.standing + 1); w.notoriety = Math.max(0, w.notoriety - 1); }
      else { w.notoriety = Math.min(R.meterMax, w.notoriety + 1); w.standing = Math.max(0, w.standing - 1); }
    }
  } else {
    w[meter] = Math.max(0, w[meter] + n);
  }
  w.peakStanding = Math.max(w.peakStanding, w.standing);
  w.peakNotoriety = Math.max(w.peakNotoriety, w.notoriety);
  if (before.standing !== w.standing || before.notoriety !== w.notoriety) {
    emit(s, { type: 'meter', vis: priv(w), timeline: w.timeline, whores: [w.id], data: { meter, n, why, before, after: { standing: w.standing, notoriety: w.notoriety } },
      text: meter === 'notoriety' && n > 0 ? `SCANDAL! ${w.name}: Notoriety ${w.notoriety}.` : `${w.name}: Standing ${w.standing}, Notoriety ${w.notoriety}.` });
  }
  if (w.notoriety >= R.frontPageAt && !w.frontPage) {
    w.frontPage = true; w.collectibles.push('front-page');
    emit(s, { type: 'front-page', timeline: w.timeline, whores: [w.id], text: `FRONT PAGE: ${w.name} is the talk of ${C.TIMELINES[w.timeline].short}.` });
  }
  // the High Road's twin of the Front Page (round 5, finding 2)
  const HR = R.highRoad;
  if (HR && w.standing >= HR.societyPagesAt && !w.societyPages) {
    w.societyPages = true; w.collectibles.push('society-pages');
    emit(s, { type: 'society-pages', timeline: w.timeline, whores: [w.id], text: `SOCIETY PAGES: ${w.name} is photographed at a charity luncheon in ${C.TIMELINES[w.timeline].short}.` });
  }
}
function addCoin(w, n) {
  if (n > 0) w.coinEarned += n;
  w.coin = Math.max(0, w.coin + n);
}

function gainItch(s, w, n, gid) {
  if (n <= 0) return null;
  w.itch += n; w.itchCycle += n;
  if (w.itch < R.itchMax) {
    emit(s, { type: 'itch', vis: priv(w), timeline: w.timeline, whores: [w.id], gents: [gid], data: { itch: w.itch }, text: `${w.name} has the Itch (${w.itch}/${R.itchMax}). Mind how you go.` });
    return null;
  }
  const g = C.GENTS[gid];
  const aff = g && g.carries;
  w.itch = 0;
  if (!aff) return null;
  w.discard.push(aff); w.caught++; w.stats.catches++;
  hist(w, gid).catches++;
  const A = C.AFFLICTIONS[aff];
  emit(s, { type: 'catch', timeline: w.timeline, whores: [w.id], gents: [gid], data: { affliction: aff }, text: `Oh dear. ${w.name} has caught ${A.name}. ${A.gag}` });
  raiseMeter(s, w, 'notoriety', 1, 'caught');
  return aff;
}

// ---------------------------------------------------------------------------
// Doors and boards
// ---------------------------------------------------------------------------
function placeOpenFor(w, pid) {
  const kind = placeKindOf(pid);
  if (kind === 'posh') return w.standing >= R.places.posh.standingMin && w.standing >= w.notoriety;
  return true;
}
// Why a Posh door is shut: 'standing' (Standing below the minimum) or 'notoriety' (Notoriety above Standing); null when open.
export function poshShutWhy(standing, notoriety) {
  if (standing < R.places.posh.standingMin) return 'standing';
  if (standing < notoriety) return 'notoriety';
  return null;
}
function placeShutWhy(w, pid) { return placeKindOf(pid) === 'posh' ? poshShutWhy(w.standing, w.notoriety) : null; }
// The Standing / Notoriety seesaw after n Notoriety points (each point also costs a point of Standing).
export function seesawAfter(standing, notoriety, n) {
  let st = standing; let nt = notoriety;
  for (let i = 0; i < n; i++) { nt = Math.min(R.meterMax, nt + 1); st = Math.max(0, st - 1); }
  return { standing: st, notoriety: nt };
}
// Is she invited (the High Road's Assignation): a Scrubbed gentleman, Standing at least highRoad.invitationAt and >= Notoriety
function isInvited(w, gid) { const HR = R.highRoad; const g = C.GENTS[gid]; return !!(HR && g && g.freshness === 'scrubbed' && w.standing >= HR.invitationAt && w.standing >= w.notoriety); }
function assignationBoardOf(s, w) {
  const T = s.timelines[w.timeline]; const TL = C.TIMELINES[w.timeline];
  const out = [];
  for (const gid of TL.gents) {
    const g = C.GENTS[gid];
    const backAlley = g.freshness === 'ripe';
    if (backAlley && w.notoriety < R.backAlleyAt) continue;
    const refused = g.freshness === 'scrubbed' && w.notoriety >= R.assign.notorietyRefuseScrubbedAt;
    // the High Road's invitations (round 5, finding 2): Standing 3+ and Standing >= Notoriety, a Scrubbed gentleman invites her
    const invitation = isInvited(w, gid);
    out.push({ gent: gid, bar: R.assign.bar[g.freshness], backAlley, refused, tourist: false, invitation });
  }
  const touristHere = !w.touristMet || (T.curtainNo % R.assign.tourist.every === 0 && w.lastTouristCurtain !== T.curtainNo);
  if (touristHere) out.push({ gent: TL.tourist, bar: R.assign.bar.tourist, backAlley: false, refused: false, tourist: true });
  return out;
}

// ---------------------------------------------------------------------------
// Views (what one account can see). Hidden preferences are masked until known.
// ---------------------------------------------------------------------------
function maskedGent(s, w, gid, omni) {
  const g = C.GENTS[gid];
  const k = (w && w.known.gents[gid]) || {};
  const sk = omni || !!k.secret; const kk = omni || !!k.kink; const hk = omni || !!k.history;
  const T = s.timelines[g.timeline];
  return {
    id: gid, name: g.name, short: g.short, timeline: g.timeline, freshness: g.freshness, carries: g.carries,
    tastes: g.tastes, aversion: g.aversion, aversionLine: g.aversionLine, fancy: g.fancy, tells: g.tells,
    hook: g.hook.text, regularCap: g.hook.kind === 'regularCap' ? g.hook.value : R.sway.regularCap,
    voice: g.voice, temperament: g.temperament, art: g.art,
    secretTaste: sk ? g.secretTaste : null,
    kink: kk ? { name: g.kink.name, item: g.kink.item, trigger: g.kink.trigger, hint: g.kink.hint } : null,
    lastCharmed: hk && T ? (T.lastCharmed[gid] || null) : null,
    known: { secret: sk, kink: kk, history: hk },
    assignBar: R.assign.bar[g.freshness],
  };
}
function maskedItem(w, iid, omni) {
  const it = C.ITEMS[iid];
  let kinkFor = null;
  if (it.kinkFor && (omni || (w && w.known.gents[it.kinkFor] && w.known.gents[it.kinkFor].kink))) kinkFor = it.kinkFor;
  const { kinkFor: _hidden, ...pub } = it;
  // A Kink novelty answers to one gentleman's PUBLIC Tell (content ITEM_TELLS): tell quotes it and tellOf names him,
  // so a player can solve the puzzle from free clues. His Kink itself (name, +3 in the preview) stays hidden until known.
  const tellOf = it.kind === 'kink' ? it.kinkFor : null;
  const ti = tellOf && C.ITEM_TELLS ? C.ITEM_TELLS[iid] : null;
  return { ...pub, kinkFor, tellOf, tell: tellOf && ti != null ? C.GENTS[tellOf].tells[ti] : null };
}
/**
 * isScriptedCurtain(state, tl) — true while the prototype script makes the Timeline's rival follow the human at this
 * Timeline's next Curtain (opts.scriptRival: every Curtain if true; only the first n with { curtains: n }).
 */
export function isScriptedCurtain(state, tl) {
  const s = state; if (!s.opts.scriptRival) return false;
  const n = s.opts.scriptCurtains;
  if (n == null) return true;
  const T = s.timelines[tl]; if (!T) return false;
  if (s.opts.scriptPerWhore) { const h = whoresIn(s, tl).find((w) => !isNPC(s, w)); return !!h && h.curtains < n; }
  return T.curtainNo < n;
}
/**
 * stageRival(state, whoreId, st) — prototype staging of an NPC at any time (newGame's opts.stageRivals does it at the start):
 * st = { hand: [cardIds] (replaces her hand; the old one goes to her discard), regular: { gentId: n }, standing,
 *   quietCurtains: n (no Upstage for the next n Curtains of her Timeline, counted from now) }. Uses no RNG.
 */
function stageRivalM(s, wid, st) {
  const w = s.whores[wid]; if (!w || !st) fail('no-whore', `No whore ${wid}`);
  if (!isNPC(s, w)) fail('not-npc', 'Only an NPC can be staged.');
  if (Array.isArray(st.hand) && st.hand.length && st.hand.every((c) => C.CARDS[c])) { w.discard.push(...w.hand); w.hand = [...st.hand]; if (w.plan && !w.plan.sealed) w.plan = null; }
  for (const [gid, n] of Object.entries(st.regular || {})) if (C.GENTS[gid]) hist(w, gid).regular = n;
  if (Number.isInteger(st.standing)) { w.standing = st.standing; w.peakStanding = Math.max(w.peakStanding, w.standing); }
  if (Number.isInteger(st.quietCurtains)) w.quietUntil = s.timelines[w.timeline].curtainNo + st.quietCurtains;
  w.staged = { at: s.timelines[w.timeline].curtainNo };
  return s;
}
// What a rival's Habit says. While the prototype scripts the Timeline's rival to follow the human, her Habit says so.
function habitOf(s, w) {
  const ch = C.CHARACTERS[w.char];
  if (isScriptedCurtain(s, w.timeline) && ch.role === 'rival') return { kind: 'follows', text: 'Follows you about (scripted for the prototype).' };
  return ch.habit || { kind: 'casual', text: 'Goes wherever she feels comfortable; plays it safe.' };
}
function publicWhore(s, viewerW, w, omni) {
  const ch = C.CHARACTERS[w.char]; const acct = s.accounts[w.account];
  const kr = (viewerW && viewerW.known.rivals[w.id]) || {};
  const tier = tierOf(w);
  const sealed = !!(w.plan && w.plan.sealed);
  const revealsPlace = sealed && w.hand.some((c) => c === 'what-happens');
  return {
    id: w.id, name: w.name, epithet: ch.epithet, account: w.account, accountName: acct.name,
    automaton: acct.kind === 'automaton', standin: acct.kind === 'standin', label: ch.label || null,
    type: w.type, signature: w.signature, charm: w.charm, temperament: ch.temperament, art: ch.art,
    renown: w.renown, tier, title: eraTitle(w.timeline, tier, routeOf(w)), seat: w.seat,
    standing: w.standing, notoriety: w.notoriety, timeline: w.timeline,
    sealed, revealedPlace: revealsPlace || omni ? (w.plan ? w.plan.place : null) : null,
    lastPlace: w.vice === 'loose-lips' || kr.last || omni ? w.lastPlace : null,
    habit: kr.habit || omni ? habitOf(s, w) : null,
    // A rival's Talent is public (it can cost you Sway at a Curtain, and hidden things only ever help). Her Vice stays hidden until Studied.
    vice: kr.vice || omni ? w.vice : null, talent: w.talent,
    last3: kr.last || omni ? [...w.places] : null,
    lastSway: kr.lastSway != null ? kr.lastSway : null,
    // where Gossip said she is heading THIS Curtain (null once that Curtain has fallen, or if nobody asked)
    heading: kr.heading && s.timelines[w.timeline] && kr.heading.curtain === s.timelines[w.timeline].curtainNo ? kr.heading.place : null,
    known: { habit: !!kr.habit || omni, vice: !!kr.vice || omni, last: !!kr.last || omni },
    curtains: w.curtains, collectibles: w.collectibles.length,
  };
}

function rotaView(s, tl, n = 4) {
  const T = s.timelines[tl]; const out = [];
  for (let i = 0; i < n; i++) {
    const k = T.curtainNo + i;
    const hosts = i === 0 && T.hostOverride ? { ...hostsFor(tl, k), ...T.hostOverride } : hostsFor(tl, k);
    out.push({ curtain: k, hosts, raid: isRaidCurtain(k) ? placeOfKind(tl, 'gutter') : null });
  }
  return out;
}

/**
 * getView(state, who, opts) — who = whoreId or accountId. Returns only what that player may see.
 */
export function getView(state, who, opts = {}) {
  const s = state; let acct; let w = null;
  if (s.whores[who]) { w = s.whores[who]; acct = s.accounts[w.account]; }
  else if (s.accounts[who]) { acct = s.accounts[who]; const ids = acct.whores.filter((id) => !s.whores[id].retired); w = ids.length ? s.whores[opts.focus && ids.includes(opts.focus) ? opts.focus : ids[0]] : null; }
  else fail('no-such', `No account or whore ${who}`);
  const omni = opts._omni === true;
  const view = {
    clock: s.clock, day: s.day, season: s.season, tick: s.tick,
    account: accountSummary(s, acct),
    whore: null, timeline: null, board: [],
    log: s.log.filter((e) => e.vis === 'all' || e.vis.includes(acct.id)).slice(-(opts.logTail || 40)),
  };
  if (!w) return view;
  const T = s.timelines[w.timeline]; const TL = C.TIMELINES[w.timeline];
  const d = w.daily.day === dayOf(s.clock) ? w.daily : freshDaily(dayOf(s.clock));
  const rota = rotaView(s, w.timeline);
  view.whore = {
    id: w.id, char: w.char, name: w.name, timeline: w.timeline, type: w.type, signature: w.signature,
    charm: w.charm, talent: w.talent, vice: w.vice, temperament: C.CHARACTERS[w.char].temperament, art: C.CHARACTERS[w.char].art,
    renown: w.renown, coin: w.coin, coinEarned: w.coinEarned, standing: w.standing, notoriety: w.notoriety,
    itch: w.itch, braveFace: w.braveFace, gossip: w.gossip, tier: tierOf(w), best: w.best, seat: w.seat,
    title: eraTitle(w.timeline, tierOf(w), routeOf(w)), route: routeOf(w),
    hand: rowCards(w, w.hand), cardPlays: { ...((w.stats && w.stats.cardPlays) || {}) },
    deck: [...w.draw, ...w.discard, ...w.hand].sort(), drawCount: w.draw.length, discardCount: w.discard.length,
    afflictions: [...new Set([...w.draw, ...w.discard, ...w.hand].filter(isAffl))].sort().map((aid) => ({ ...cardPublic(aid), copies: [...w.draw, ...w.discard, ...w.hand].filter((c) => c === aid).length, inHand: w.hand.includes(aid) })),
    items: w.items.map((it, i) => ({ idx: i, ...maskedItem(w, it.id, omni), usesLeft: it.uses, readyAt: it.readyAt || 0, ready: (it.readyAt || 0) <= T.curtainNo })),
    offer: w.offer ? { ...w.offer, item: maskedItem(w, w.offer.item, omni) } : null,
    plan: w.plan ? clone(w.plan) : null, talentUsed: talentSpent(s, w), talentPer: s.opts.talentOncePerDay ? 'day' : 'curtain', slummed: !!w.slummed, road: w.road || null, greaseMax: greaseMax(w), greasePer: greasePer(w), gambler: gamblerTerms(w),
    digs: { standing: (w.digs && w.digs.standing) || 0, notoriety: (w.digs && w.digs.notoriety) || 0 }, digsNext: digsNext(w), milestone: milestoneOf(w), societyPages: !!w.societyPages,
    invited: TL.gents.filter((gid) => isInvited(w, gid)),
    assignation: w.assignation ? { gent: w.assignation.gent, lent: rowCards(w, w.assignation.lent), invitation: !!w.assignation.invitation } : null,
    // the 3 cards your deck will lend at your next Assignation, once dealt with dealLent (same cards whichever gentleman you book)
    lentNext: !w.assignation && w.lentHold && multisetIn(w.lentHold, [...w.draw, ...w.discard]) ? rowCards(w, w.lentHold) : null,
    daily: { curtains: d.curtains, assigns: d.assigns, assignRenown: d.assignRenown, studies: d.studies, rummages: d.rummages,
      fullPayLeft: Math.max(0, R.curtain.fullPayPerDay - d.curtains), freeStudiesLeft: Math.max(0, R.study.freePerDay - d.studies),
      freshRummagesLeft: Math.max(0, R.rummage.freshPerDay - d.rummages), assignRenownLeft: Math.max(0, R.assign.renownCapPerDay - d.assignRenown),
      regularToday: Object.keys(d.regular || {}), invitedToday: !!d.invited, specialToday: !!d.special }, // gentlemen whose once-a-day Regular bump she has already had today
    history: clone(w.history), blackBook: [...w.blackBook], collectibles: [...w.collectibles],
    lastPlace: w.lastPlace, places: [...w.places], lastBeatenBy: w.lastBeatenBy,
    curtains: w.curtains, assignations: w.assignations, caught: w.caught, frontPage: w.frontPage,
    peakStanding: w.peakStanding, peakNotoriety: w.peakNotoriety, frolicked: Object.keys(w.frolicked),
    challengeable: Object.keys(C.SEATS).filter((k) => canChallenge(s, w, k).ok),
  };
  view.timeline = {
    id: w.timeline, name: TL.name, short: TL.short, curtainNo: T.curtainNo, lastCurtainAt: T.lastCurtainAt,
    nextCurtainAt: T.lastCurtainAt + s.opts.maxGapMin, earliestCurtainAt: T.lastCurtainAt + s.opts.minGapMin,
    sealing: sealingOf(s, w.timeline), // who has sealed for the next Curtain (stand-ins seal later under opts.standinSeal)
    rota, freshStall: T.freshStall, raidSquad: TL.raidSquad, gazette: TL.gazette,
    // freshFor: the fresh stall if a rummage there now would bring its fresh stock to her (she can buy it, has a fresh rummage
    // left, and has not had it this Curtain), else null; freshWhy says why not: 'black-market' | 'taken' | 'no-fresh'
    ...(() => {
      const ok = C.PLACES[T.freshStall].stall.filter((iid) => !C.ITEMS[iid].blackMarket || w.notoriety >= R.rummage.blackMarketAt);
      const why = !ok.length ? 'black-market' : w.freshTaken === T.curtainNo ? 'taken' : d.rummages >= R.rummage.freshPerDay ? 'no-fresh' : null;
      return { freshFor: why ? null : T.freshStall, freshWhy: why };
    })(),
    // the Morning Special (round 5, finding 1): one novelty on the counter each day; why: 'black-market' | 'bought' | null
    special: (() => {
      const iid = specialOf(s, w.timeline); const it = C.ITEMS[iid];
      const why = d.special ? 'bought' : it.blackMarket && w.notoriety < R.rummage.blackMarketAt ? 'black-market' : null;
      return { item: maskedItem(w, iid, omni), price: it.cost, why };
    })(),
    places: TL.places.map((pid) => ({ ...C.PLACES[pid], rules: R.places[C.PLACES[pid].kind], host: rota[0].hosts[pid], open: placeOpenFor(w, pid), shutWhy: placeShutWhy(w, pid), raid: rota[0].raid === pid,
      stall: C.PLACES[pid].stall.map((iid) => maskedItem(w, iid, omni)) })),
    gents: TL.gents.map((gid) => maskedGent(s, w, gid, omni)),
    tourist: { ...C.TOURISTS[TL.tourist] },
    market: TL.market.map((cid) => cardPublic(cid)),
    afflictions: TL.afflictions.map((aid) => ({ ...cardPublic(aid), carriedBy: C.AFFLICTIONS[aid].carriedBy })),
    seats: Object.values(T.seats).map((st) => ({ id: st.id, name: seatName(st.id, w.timeline), tier: C.SEATS[st.id].tier, holder: st.holder, holderName: st.holder ? s.whores[st.holder].name : null, graceUntil: st.graceUntil })),
    rivals: whoresIn(s, w.timeline).filter((x) => x.id !== w.id).map((x) => publicWhore(s, w, x, omni)),
    table: whoresIn(s, w.timeline).map((x) => ({ id: x.id, name: x.name, renown: x.renown })).sort((a, b) => b.renown - a.renown || (a.id < b.id ? -1 : 1)),
    challenges: T.challenges.map((c) => ({ ...c })),
    results: T.results ? clone(T.results) : null,
    resultsHistory: clone(T.resultsHistory),
    skin: TL.skin,
  };
  view.board = assignationBoardOf(s, w);
  return view;
}
/**
 * cardFlavour(cardId, timelineId, n) — a card's joke line. Shared starters carry `flavours[timeline]` (3-4 lines per era);
 * n picks one (getView passes the copy's position among same cards in the hand + how often she has played it, so two
 * copies side by side never repeat a line). Falls back to the card's single `flavour`.
 */
export function cardFlavour(cid, tl = null, n = 0) {
  const c = cardOf(cid); if (!c) return '';
  const fl = tl && c.flavours && c.flavours[tl];
  return fl && fl.length ? fl[((n % fl.length) + fl.length) % fl.length] : (c.flavour || '');
}
function cardPublic(cid, tl = null, n = 0) {
  const c = cardOf(cid);
  if (isAffl(cid)) return { id: cid, name: c.name, affliction: true, arts: [], allure: 0, pocket: 0, text: c.symptomText, flavour: c.flavour, cure: c.cure, art: c.art };
  const art = (tl && c.artByTimeline && c.artByTimeline[tl]) || c.art || null;
  return { id: cid, name: c.name, arts: c.arts, allure: c.allure, pocket: c.pocket, cost: c.cost || null, text: c.text, flavour: cardFlavour(cid, tl, n), position: !!c.position, art, timeline: c.timeline || null, affliction: false };
}
// cardPublic for a card in a row (hand, lent): the n-th copy of its id in that row, plus how often she has played it
const rowCards = (w, row) => row.map((cid, idx) => ({ idx, ...cardPublic(cid, w.timeline, row.slice(0, idx).filter((x) => x === cid).length + ((w.stats && w.stats.cardPlays[cid]) || 0)) }));
function accountSummary(s, acct) {
  const ws = acct.whores.map((id) => s.whores[id]).filter((w) => !w.retired);
  const takenTls = new Set(ws.map((w) => w.timeline));
  const canOpen = acct.kind === 'human' && ws.length < Math.min(acct.slots, R.unlock.cap)
    ? Object.keys(s.timelines).filter((tl) => !takenTls.has(tl)).map((tl) => C.TIMELINES[tl].starter).filter((c) => !s.whores[c])
    : [];
  return {
    id: acct.id, name: acct.name, kind: acct.kind, slots: acct.slots, canOpen, seen: { ...acct.seen },
    whores: ws.map((w) => ({ id: w.id, name: w.name, timeline: w.timeline, tier: tierOf(w), title: eraTitle(w.timeline, tierOf(w), routeOf(w)), renown: w.renown, coin: w.coin, sealed: !!(w.plan && w.plan.sealed), art: C.CHARACTERS[w.char].art,
      waiting: !!(w.plan && w.plan.sealed), fullPayLeft: Math.max(0, R.curtain.fullPayPerDay - (w.daily.day === dayOf(s.clock) ? w.daily.curtains : 0)) })),
    whorescore: whorescoreM(s, acct.id).total,
  };
}

// ---------------------------------------------------------------------------
// View-based helpers (what the UI's Sway meter, Best Guess and bots use)
// ---------------------------------------------------------------------------
function viewGentCtx(view, gid) {
  if (C.TOURISTS[gid]) return gentCtx(gid, null, true);
  const g = view.timeline.gents.find((x) => x.id === gid);
  return {
    id: gid, tastes: g.tastes, aversion: g.aversion, fancy: g.fancy, freshness: g.freshness,
    secretTaste: g.secretTaste, kink: g.kink, regularCap: g.regularCap, secretKnown: g.known.secret, kinkKnown: g.known.kink,
  };
}
/**
 * previewEncounter(view, opts) — the live Sway meter, from what this whore knows.
 * opts: { place (curtain) | gent (assignation), cards: [hand or lent indexes], item: itemId, talent: {kind, card (index), art}, grease, others }
 */
export function previewEncounter(view, opts) {
  const vw = view.whore;
  const mode = opts.place ? 'curtain' : 'assign';
  const src = mode === 'curtain' ? vw.hand.map((c) => c.id) : vw.assignation ? vw.assignation.lent.map((c) => c.id) : [];
  const gid = mode === 'curtain' ? view.timeline.rota[0].hosts[opts.place] : (opts.gent || (vw.assignation && vw.assignation.gent));
  const idxs = opts.cards || [];
  const cards = idxs.map((i) => src[i]);
  const talent = opts.talent ? { ...opts.talent, pos: opts.talent.card != null ? idxs.indexOf(opts.talent.card) : -1 } : null;
  const h = vw.history[gid];
  const res = computeEncounter({
    w: { type: vw.type, signature: vw.signature, charm: vw.charm, vice: vw.vice, standing: vw.standing, notoriety: vw.notoriety, braveFace: mode === 'curtain' ? vw.braveFace : 0, lastPlace: vw.lastPlace },
    gent: viewGentCtx(view, gid), place: mode === 'curtain' ? opts.place : null, cards, curse: src.filter(isAffl),
    item: opts.item || null, talent, hist: h ? { regular: h.regular, grudge: h.grudge, seen: h.seen, wait: h.wait } : null,
    others: opts.others != null ? opts.others : -1, leastRenown: !!opts.leastRenown, nemesis: !!opts.nemesis, grease: opts.grease || 0,
  });
  const tour = C.TOURISTS[gid];
  const bar = mode === 'curtain' ? R.places[C.PLACES[opts.place].kind].bar : tour ? R.assign.bar.tourist : R.assign.bar[C.GENTS[gid].freshness];
  // an Assignation that fizzles builds no Itch (playAssignation: itch only on Satisfied or Delighted), so the preview says so
  const fizzles = mode === 'assign' && !tour && res.sway < bar;
  const itch = fizzles ? 0 : res.itch;
  const itchAfter = vw.itch + itch;
  const catches = itchAfter >= R.itchMax ? (C.GENTS[gid] && C.GENTS[gid].carries) || null : null;
  return { ...res, itch, itchIfSatisfied: res.itch, gent: gid, bar, margin: res.sway - bar, itchAfter, catches, mode, fizzles };
}

function combos(n, k) {
  const out = []; const cur = [];
  const rec = (start) => { if (cur.length) out.push([...cur]); if (cur.length === k) return; for (let i = start; i < n; i++) { cur.push(i); rec(i + 1); cur.pop(); } };
  rec(0);
  return out;
}
/**
 * bestGuess(view, placeId) — every set of 1-3 cards; highest visible Sway; never takes the Itch to 3;
 * on the Standing road (roadOf: declared, or Standing >= Notoriety) each Notoriety point the play would cost counts as -1
 * (Pick His Pocket -2); a Curtain play that ends below the Bar never buys Itch (it pays nothing, so any Itch it adds ranks it last).
 * For an Assignation pass { gent } instead of a placeId (1-2 lent cards).
 * Also returns `gamble` (or null): the better play the Itch guard held back, the Sway it would gain and the
 * Affliction it would catch, so a UI can offer it as a visible "Fancy it?" choice. It never changes `cards`.
 * extra (optional): { item } — the same search with that novelty in play (a UI's "what would have won" line).
 */
export function bestGuess(view, placeOrOpts, extra = {}) {
  const vw = view.whore;
  const assign = typeof placeOrOpts === 'object' && placeOrOpts !== null;
  const place = assign ? null : placeOrOpts;
  const src = assign ? vw.assignation.lent : vw.hand;
  const idx = src.filter((c) => !c.affliction).map((c) => c.idx);
  const maxN = assign ? R.assignMaxCards : R.maxCurtainCards;
  let best = null; let risky = null;
  for (const set of combos(idx.length, maxN)) {
    const cards = set.map((i) => idx[i]);
    const p = previewEncounter(view, assign ? { ...extra, gent: placeOrOpts.gent, cards } : { ...extra, place, cards });
    let adj = p.sway;
    if (roadOf(vw) === 'standing') {
      const placeNoto = place && placeKindOf(place) === 'gutter' ? 1 : 0;
      adj -= Math.max(0, p.noto - placeNoto);
      adj -= cards.filter((i) => src[i].id === 'pick-his-pocket').length;
    }
    // a Curtain play that ends below the Bar pays nothing but still builds Itch, so it never buys Itch: any Itch it adds
    // ranks it below every play that adds none (an Assignation that fizzles builds no Itch at all; see previewEncounter)
    if (p.margin < 0 && p.itch > 0) adj -= 100 * p.itch;
    if (vw.itch + p.itch >= R.itchMax) {
      if (p.catches && (!risky || adj > risky.adj || (adj === risky.adj && p.sway > risky.sway))) risky = { cards, sway: p.sway, adj, catches: p.catches };
      continue;
    }
    if (!best || adj > best.adj || (adj === best.adj && p.sway > best.sway)) best = { cards, sway: p.sway, adj, preview: p };
  }
  const out = best || { cards: [], sway: 0, adj: 0, preview: null };
  out.gamble = risky && risky.sway > out.sway ? { cards: risky.cards, sway: risky.sway, gain: risky.sway - out.sway, catches: risky.catches, heldBack: risky.cards.filter((i) => !out.cards.includes(i)).map((i) => src[i].id) } : null;
  return out;
}
/**
 * placeOutlook(view, placeId) — what one Place is worth to this whore tonight, from what she can see:
 * smileys (0..3) score what she would actually take home: the Best Guess play's Sway minus the Bar, minus 1 per point of
 * Notoriety the visit costs while Standing >= Notoriety (the same guard Best Guess uses for cards), one smiley fewer on
 * Raid Night at that Place, and at most 1 smiley for a first visit to the Gutter (casualPlace declines those).
 * smileysRaw: the same score before that first-Gutter clamp (what the matchup is really worth).
 * Also: the real (raid-halved) Renown shares, Applause where the Place pays it, the visit's Notoriety cost, the meters after
 * it, and whether it would shut the Posh door (shutsPosh, shutWhy 'standing' | 'notoriety').
 */
export function placeOutlook(view, placeId) {
  const vw = view.whore; const P = C.PLACES[placeId]; const PR = R.places[P.kind];
  const raid = !!(view.timeline.rota[0].raid === placeId);
  const bg = bestGuess(view, placeId);
  const noto = Math.max(0, bg.preview ? bg.preview.noto : (P.kind === 'gutter' ? 1 : 0));
  let margin = bg.sway - PR.bar;
  if (roadOf(vw) === 'standing') margin -= noto;
  let sm = margin >= 4 ? 3 : margin >= 1 ? 2 : margin >= -1 ? 1 : 0;
  if (raid) sm = Math.max(0, sm - 1);
  const slumming = P.kind === 'gutter' && !vw.slummed;
  const smileysRaw = sm; // before the first-Gutter-visit clamp: the true matchup, for a UI's "Slumming?" label
  // a first Gutter visit is capped at 1 smiley unless she has declared the Police Gazette road (then it is her road)
  if (slumming && vw.road !== 'notoriety') sm = Math.min(sm, 1);
  const renown = PR.renown.map((r) => (raid ? Math.floor(r / R.raidRenownDivisor) : r));
  const applause = P.house.applause != null ? P.house.applause : PR.applause;
  const after = seesawAfter(vw.standing, vw.notoriety, noto);
  const poshNow = poshShutWhy(vw.standing, vw.notoriety) === null;
  const shutWhy = poshNow ? poshShutWhy(after.standing, after.notoriety) : null;
  return { place: placeId, kind: P.kind, smileys: sm, smileysRaw, margin, sway: bg.sway, bar: PR.bar, raid, renown, coin: [...PR.coin], applause, doorGift: PR.doorGift,
    noto, slumming, capped: slumming && smileysRaw > sm, road: roadOf(vw),
    bribe: canBribe(vw, placeId, view.timeline.rota[0].raid) ? { cost: R.raidBribe.cost, renown: [...PR.renown] } : null, standingAfter: after.standing, notorietyAfter: after.notoriety, shutsPosh: !!shutWhy, shutWhy };
}
/**
 * placeBoost(view, placeId) — placeOutlook's smileys come from plain Best Guess (no novelty, no Talent), which is right for
 * the casual default and the Standing Order. This scores the best play at that Place with each ready novelty in her Reticule
 * and her unused Double Entendre (best card and Art), so a UI can say "With your Bonnet: 3 smileys (his Kink!)".
 * Returns { sway, smileys, margin, item, itemName, talent, kink, gain, cards } when it beats plain Best Guess, else null.
 * Same smiley scale as placeOutlook (Notoriety cost while Standing >= Notoriety, Raid Night, first Gutter visit).
 */
export function placeBoost(view, placeId) {
  const vw = view.whore; const P = C.PLACES[placeId]; const PR = R.places[P.kind];
  const raid = !!(view.timeline.rota[0].raid === placeId);
  const slumming = P.kind === 'gutter' && !vw.slummed;
  const smileOf = (sway, notoCost) => {
    let m = sway - PR.bar;
    if (roadOf(vw) === 'standing') m -= notoCost;
    let n = m >= 4 ? 3 : m >= 1 ? 2 : m >= -1 ? 1 : 0;
    if (raid) n = Math.max(0, n - 1);
    if (slumming && vw.road !== 'notoriety') n = Math.min(n, 1);
    return { margin: m, smileys: n };
  };
  const base = bestGuess(view, placeId);
  const items = (vw.items || []).filter((it) => it.ready);
  const talentOk = vw.talent === 'double-entendre' && !vw.talentUsed;
  const tries = [...items.map((it) => ({ item: it })), ...(talentOk ? [{ item: null, talent: true }] : []), ...(talentOk ? items.map((it) => ({ item: it, talent: true })) : [])];
  let best = null;
  for (const t of tries) {
    const extra = t.item ? { item: t.item.id } : {};
    const b = bestGuess(view, placeId, extra);
    if (!b.cards.length) continue;
    let sway = b.sway; let p = b.preview;
    if (t.talent) {
      const de = bestDoubleEntendre(view, { place: placeId, cards: b.cards, ...extra });
      if (!de) continue;
      sway = de.sway; p = previewEncounter(view, { place: placeId, cards: b.cards, ...extra, talent: { kind: 'double-entendre', card: de.card, art: de.art } });
    }
    if (sway <= base.sway || (best && sway <= best.sway)) continue;
    const o = smileOf(sway, Math.max(0, p ? p.noto : 0));
    best = { sway, smileys: o.smileys, margin: o.margin, item: t.item ? t.item.id : null, itemName: t.item ? t.item.name : null, talent: !!t.talent, kink: !!(p && p.kinkHit), gain: sway - base.sway, cards: b.cards };
  }
  return best;
}
/** smileys(view, placeId) -> 0..3: see placeOutlook (what she would actually take home, not the bare Sway margin). */
export function smileys(view, placeId) {
  return placeOutlook(view, placeId).smileys;
}
/**
 * casualPlace(view, {slumming, followSmileys}) — most smileys; ties go to a Place on her road (roadOf: the road she declared,
 * else Standing >= Notoriety: Posh or Rowdy; otherwise Gutter or Rowdy), then to the bigger (raid-adjusted) 1st-place Renown, so Best Guess never drifts
 * her off her route on a tie. Declines a first Gutter visit unless slumming (or followSmileys: a player who follows the smileys).
 */
export function casualPlace(view, opts = {}) {
  let best = null;
  const standingRoute = roadOf(view.whore) === 'standing';
  for (const p of view.timeline.places) {
    if (!p.open) continue;
    if (p.kind === 'gutter' && !opts.slumming && !opts.followSmileys && view.whore.notoriety === 0 && view.whore.road !== 'notoriety') continue;
    const o = placeOutlook(view, p.id);
    const onRoute = p.kind === 'rowdy' || (standingRoute ? p.kind === 'posh' : p.kind === 'gutter');
    const key = o.smileys * 100 + (onRoute ? 50 : 0) + o.renown[0];
    if (!best || key > best.key) best = { key, place: p.id, smileys: o.smileys };
  }
  if (!best) best = { place: view.timeline.places.find((p) => p.open).id, smileys: 0 };
  return best.place;
}
/**
 * kinkOffer(view) — the plan screen's one-tap Kink offer (round 6, findings 1-2; shared by The Scandal Sheet and the sim so
 * the bots play the offer the page shows): a Kink novelty on tonight's fresh stall whose gentleman hosts an open Place at
 * tonight's Curtain. Uses only what she can see (the stall quotes his public Tell). Returns { item, stall, place, gent }
 * or null. Buy it with explore(s, wid, stall, { want: item.id }) then buyOffer: the stallholder hands over that item.
 */
// opts.firstOnly (what the page ships, designer's call 2026-10-07; round 6 finding 2): the offer only appears on her first
// Curtain in this Timeline, as the tutorial. Without it the one-tap offer outscored the planners on Kinks (T11). (A "once she has Studied him" gate was measured too and
// barely moved the casual Kink rate, 0.35 vs 0.37 for Dolly in the quick sim; by the code, likely because buying his novelty
// decodes his Kink and back-door gossip can decode it, so the gate opens by itself.)
export function kinkOffer(view, opts = {}) {
  const pid = view.timeline.freshFor; if (!pid || view.whore.offer) return null;
  if (opts.firstOnly && view.whore.curtains > 0) return null;
  const stall = view.timeline.places.find((p) => p.id === pid);
  const hosts = view.timeline.rota[0].hosts;
  for (const it of stall.stall) {
    if (it.kind !== 'kink' || view.whore.items.some((x) => x.id === it.id)) continue;
    if (it.blackMarket && view.whore.notoriety < R.rummage.blackMarketAt) continue;
    const gid = it.kinkFor || it.tellOf; if (!gid) continue;
    const place = view.timeline.places.find((p) => hosts[p.id] === gid && p.open);
    if (place) return { item: it, stall, place, gent: gid };
  }
  return null;
}
/**
 * bestDoubleEntendre(view, opts) — for a Double Entendre whore: given a plan or Assignation opts with cards chosen,
 * which Worked card should receive which Art. Scored like Best Guess (Notoriety cost counts while Standing >= Notoriety;
 * never takes the Itch to 3). Returns { card, art, sway, gain } or null when no Art helps.
 */
export function bestDoubleEntendre(view, opts) {
  const vw = view.whore; const cards = opts.cards || [];
  if (!cards.length || vw.talent !== 'double-entendre' || vw.talentUsed) return null;
  const score = (p) => { let a = p.sway; if (roadOf(vw) === 'standing') a -= Math.max(0, p.noto - (opts.place && placeKindOf(opts.place) === 'gutter' ? 1 : 0)); return a; };
  const base = previewEncounter(view, { ...opts, talent: undefined });
  let best = null;
  for (const card of cards) for (const art of C.ART_IDS) {
    const p = previewEncounter(view, { ...opts, talent: { kind: 'double-entendre', card, art } });
    if (vw.itch + p.itch >= R.itchMax) continue;
    const sc = score(p);
    if (sc > score(base) && (!best || sc > best.sc)) best = { card, art, sway: p.sway, gain: p.sway - base.sway, sc };
  }
  if (!best) return null;
  const { sc: _sc, ...out } = best;
  return out;
}
/**
 * boardOutlook(view) — once the next lent cards are dealt (view.whore.lentNext), what Best Guess would score with them
 * against each gentleman on the Assignation board: [{ gent, sway, bar, outcome, cards }] (same order as view.board).
 */
export function boardOutlook(view) {
  const lent = view.whore.lentNext; if (!lent) return [];
  return view.board.map((b) => {
    const v2 = { ...view, whore: { ...view.whore, assignation: { gent: b.gent, lent } } };
    const bg = bestGuess(v2, { gent: b.gent });
    const outcome = bg.sway >= b.bar + R.assign.delightMargin ? 'delighted' : bg.sway >= b.bar ? 'satisfied' : b.tourist ? 'satisfied' : 'fizzled';
    return { gent: b.gent, sway: bg.sway, bar: b.bar, outcome, cards: bg.cards, refused: b.refused };
  });
}

/**
 * curtainWhatIf(result, placeId, whoreId, sway, opts) — hindsight for a Curtain that has fallen: where a Sway of `sway`
 * would have ranked at that Place against the others' printed results, and the Renown it would have paid.
 * result: the public Curtain data (the 'curtain' event's data, or view.timeline.results). Upstage is applied the way the
 * Curtain applies it: if a whore who played Upstage there would sit directly below you, you lose 2.
 * opts: { fullPay (default true), bribe (she squared the Peelers: no Raid Night halving) }. Returns { rank, sway, upstaged, renown, coin }.
 */
export function curtainWhatIf(result, placeId, whoreId, sway, opts = {}) {
  const P = C.PLACES[placeId]; const PR = R.places[P.kind];
  const pr = result.places.find((x) => x.place === placeId);
  const others = (pr ? pr.entries : []).filter((e) => e.whore !== whoreId);
  let mine = sway; let upstaged = 0;
  for (const u of others.filter((e) => e.upstage && e.sway != null)) {
    const above = [...others.filter((e) => e.whore !== u.whore && e.sway != null && e.sway > u.sway).map((e) => e.sway), mine > u.sway ? mine : null].filter((x) => x != null);
    if (mine > u.sway && mine === Math.min(...above)) { mine = Math.max(0, mine - 2); upstaged += 2; }
  }
  let rank = null;
  if (mine >= PR.bar) rank = others.filter((e) => e.sway != null && e.sway > mine).length;
  const raid = result.raid === placeId;
  let renown = 0; let coin = PR.doorGift;
  if (rank !== null && rank < 3) {
    // dead heat: split the shares of the places the tied whores occupy, rounded up (as the Curtain pays)
    const tied = 1 + others.filter((e) => e.sway != null && e.sway === mine).length;
    const shareOf = (arr) => { let t = 0; for (let i = rank; i < rank + tied && i < 3; i++) t += arr[i]; return Math.ceil(t / tied); };
    renown = shareOf(PR.renown); if (raid && P.kind === 'gutter' && !opts.bribe) renown = Math.floor(renown / R.raidRenownDivisor);
    coin += shareOf(PR.coin);
    if (rank === 0 && others.length >= 1) renown += Math.ceil((P.house.applause != null ? P.house.applause : PR.applause) / tied);
  }
  if (opts.fullPay === false) renown = 0;
  return { rank, sway: mine, upstaged, renown, coin };
}
/**
 * assignationPay(view, sway, cards) — what an Assignation at this Sway pays the whore now (before she plays it), for the
 * gentleman she is with: { outcome, renown, coin }. Mirrors playAssignation's Renown bands, daily cap and the back-alley
 * Frolic Coin (pass the lent-card indexes as `cards`); no gentleman hooks.
 */
export function assignationPay(view, sway, cards = []) {
  const vw = view.whore; const A = vw.assignation; if (!A) return { outcome: null, renown: 0, coin: 0 };
  const tour = C.TOURISTS[A.gent]; const bar = tour ? R.assign.bar.tourist : R.assign.bar[C.GENTS[A.gent].freshness];
  let outcome = sway >= bar + R.assign.delightMargin ? 'delighted' : sway >= bar ? 'satisfied' : 'fizzled';
  if (tour && outcome === 'fizzled') outcome = 'satisfied';
  let renown = 0; let coin = 0;
  if (tour) { renown = R.assign.tourist.renown + (outcome === 'delighted' ? R.assign.tourist.delightRenown : 0); coin = R.assign.tourist.coin; }
  else if (outcome !== 'fizzled') {
    const band = R.assign.bands.find((b) => vw.daily.assigns + 1 <= b.upTo);
    renown = band.renown + (outcome === 'delighted' ? band.delightRenown : 0);
    coin = C.GENTS[A.gent].freshness === 'ripe' ? band.backAlleyCoin : band.coin;
    if (C.GENTS[A.gent].freshness === 'ripe' && !band.gossipOnly) coin += (R.ripeFrolicCoin || 0) * cards.filter((i) => A.lent[i] && A.lent[i].arts.includes('frolic')).length;
    if (band.gossipOnly) return { outcome, renown: 0, coin: 0, gossip: band.gossip || 1 };
  }
  renown = Math.max(0, Math.min(renown, vw.daily.assignRenownLeft));
  // the first invitation she Delights each day: +Renown on top of the cap (the High Road's Assignation, round 5)
  if (A.invitation && outcome === 'delighted' && !vw.daily.invitedToday) renown += R.highRoad.invitationRenown;
  return { outcome, renown, coin, invitation: !!A.invitation };
}

// ---------------------------------------------------------------------------
// describeMatchup(target, character) — plain-English hints
// target: a gentleman view (from getView().timeline.gents) or gentleman id, or a place id/view.
// character: a whore view (getView().whore) or character id.
// ---------------------------------------------------------------------------
const artName = (a) => `${C.ARTS[a].icon} ${C.ARTS[a].name}`;
const list = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
export function describeMatchup(target, character) {
  const ch = typeof character === 'string' ? { ...C.CHARACTERS[character], itch: 0, hand: null } : character;
  const typeName = C.TYPES[ch.type].name;
  const lines = []; const good = []; const bad = [];
  if (typeof target === 'string' && C.PLACES[target]) target = C.PLACES[target];
  if (target && target.house) {
    const P = target;
    const ups = Object.entries(P.house.arts).filter(([, v]) => v > 0).map(([a]) => a);
    const downs = Object.entries(P.house.arts).filter(([, v]) => v < 0).map(([a]) => a);
    if (ups.length) { lines.push(`House Rule, ${P.house.name}: ${list(ups.map(artName))} cards get +1 here.`); good.push(...ups); }
    if (downs.length) { lines.push(`${list(downs.map(artName))} cards get -1 here.`); bad.push(...downs); }
    if (P.house.pocket) lines.push(`Every card you keep in your purse pays +${P.house.pocket} Coin here.`);
    const PR = R.places[P.kind];
    lines.push(`${C.PLACE_KINDS[P.kind].name}: you need ${PR.bar} Sway to take a share. 1st takes ${PR.renown[0]} Renown${PR.coin[0] ? ` and ${PR.coin[0]} Coin` : ''}.`);
    if (P.kind === 'posh') lines.push('Frolic cards here cost you Notoriety ("people talk").');
    if (P.kind === 'gutter') lines.push('Coming here costs 1 Notoriety. It pays well in Coin.');
    if (ups.includes(ch.signature)) lines.push(`Your Signature (${artName(ch.signature)}) gets the house bonus. Lovely.`);
    return { kind: 'place', lines, good, bad, fancy: false };
  }
  const g = typeof target === 'string' ? (C.GENTS[target] ? { ...C.GENTS[target], secretTaste: null, kink: null } : null) : target;
  if (!g) fail('no-target', 'Unknown matchup target');
  if (C.TOURISTS[g.id]) {
    const t = C.TOURISTS[g.id];
    return { kind: 'tourist', lines: [`${t.aside ? `${t.aside} ` : ''}He likes ${artName(t.taste)}.`], good: [t.taste], bad: [], fancy: false };
  }
  lines.push(`He likes ${list(g.tastes.map(artName))}: each card with one gets a tick (+1).`);
  good.push(...g.tastes);
  lines.push(`He can't abide ${artName(g.aversion)} (${g.aversionLine}): -2 per card. Leave those in your purse.`);
  bad.push(g.aversion);
  const fancy = g.fancy === ch.type;
  lines.push(fancy ? `He's weak for a ${C.TYPES[g.fancy].name}. That's you: +2 Sway the moment you walk in.` : `He's weak for a ${C.TYPES[g.fancy].name}. You're a ${typeName}; no help there.`);
  if (g.tastes.includes(ch.signature)) lines.push(`Your Signature is ${artName(ch.signature)} and he likes it: double tick.`);
  else if (g.aversion === ch.signature) lines.push(`Your Signature is ${artName(ch.signature)}, which he can't abide. Pick your cards carefully.`);
  if (ch.charm === 'silver-tongue' && !g.tastes.includes('wit') && g.aversion !== 'wit') lines.push('Silver Tongue: your first Wit card counts as a tick anyway.');
  if (ch.charm === 'dimples' && g.tastes.includes('silk')) lines.push('Dimples: +1 Sway, he likes Silk.');
  const fr = { scrubbed: 'Scrubbed: Frolic cards give you no Itch with him.', fair: 'Fair: each Frolic card gives you +1 Itch.', ripe: 'Ripe: each Frolic card gives +1 Itch, and +1 more. Hold your nose.' };
  lines.push(fr[g.freshness]);
  if (g.freshness !== 'scrubbed' && ch.itch >= 2) lines.push(`You're at Itch ${ch.itch}. One more and you'll catch ${C.AFFLICTIONS[g.carries].name}.`);
  if (g.secretTaste) { lines.push(`Secretly he likes ${artName(g.secretTaste)}: another tick.`); good.push(g.secretTaste); }
  else lines.push('Secret Taste: ? Study him, or read his Tells.'); // the Tells themselves print once, on his card (round 5, finding 16)
  if (g.kink) lines.push(`Kink: ${g.kink.name}. Bring ${g.kink.hint} (+3).`);
  else lines.push('Kink: ? Study him twice, or buy what the stallholder is selling.');
  if (ch.history && ch.history[g.id]) {
    const h = ch.history[g.id];
    if (h.regular) lines.push(`You're a Regular: +${Math.min(h.regular, g.regularCap || R.sway.regularCap)}.`);
    if (h.grudge) lines.push('He has a Grudge from last time: -1 until you please him.');
    if (h.seen && h.seen.length) lines.push(`He's Seen It: ${h.seen.map((c) => cardOf(c).name).join(', ')} (-1 each).`);
  }
  let hand = null;
  if (ch.hand) {
    const sc = ch.hand.filter((c) => !c.affliction).map((c) => {
      let v = 0; if (c.arts.some((a) => g.tastes.includes(a))) v += 1; if (g.secretTaste && c.arts.includes(g.secretTaste)) v += 1; if (c.arts.includes(g.aversion) && c.id !== 'poker-face') v -= 2; return { c, v };
    });
    const top = sc.filter((x) => x.v > 0).map((x) => x.c.name); const avoid = sc.filter((x) => x.v < 0).map((x) => x.c.name);
    if (top.length) lines.push(`From your hand, he'll like: ${list([...new Set(top)])}.`);
    if (avoid.length) lines.push(`Avoid: ${list([...new Set(avoid)])}.`);
    hand = { top, avoid };
  }
  return { kind: 'gentleman', lines, good: [...new Set(good)], bad, fancy, hand };
}

// ---------------------------------------------------------------------------
// Actions (mutating cores). Public pure wrappers are exported below.
// ---------------------------------------------------------------------------
function whoreOf(s, wid) { const w = s.whores[wid]; if (!w || w.retired) fail('no-whore', `No whore ${wid}`); return w; }
function touch(s, w) { if (!isNPC(s, w)) w.lastActiveAt = s.clock; daily(s, w); }

function chooseStarterM(s, accountId, charId) {
  const acct = s.accounts[accountId]; if (!acct) fail('no-account', 'No such account');
  const live = acct.whores.filter((id) => !s.whores[id].retired);
  if (live.length >= Math.min(acct.slots, R.unlock.cap)) fail('no-slot', live.length ? 'Your next Timeline is still locked.' : 'No slot');
  const ch = C.CHARACTERS[charId];
  if (!ch || ch.role !== 'starter') fail('not-starter', 'Pick one of the starters.');
  const w = createWhore(s, accountId, charId);
  emit(s, { type: live.length ? 'timeline-opened' : 'starter-chosen', vis: [accountId], timeline: w.timeline, whores: [w.id], text: `${w.name} steps into ${C.TIMELINES[w.timeline].name}.` });
  return s;
}

function checkUnlocks(s, w) {
  const acct = s.accounts[w.account]; if (acct.kind !== 'human') return;
  const ws = acct.whores.map((id) => s.whores[id]);
  if (acct.slots < 2 && ws.some((x) => x.curtains >= 1 && x.assignations >= 1)) {
    acct.slots = 2;
    const next = Object.keys(s.timelines).find((tl) => !ws.some((x) => x.timeline === tl));
    emit(s, { type: 'timeline-unlocked', vis: [acct.id], timeline: next || w.timeline, whores: [w.id], data: { slots: 2, invite: next || null }, text: next ? C.TIMELINES[next].telegram : 'A second Timeline is open to you.' });
  }
  if (acct.slots < 3 && ws.some((x) => x.renown >= R.tiers.rare)) {
    acct.slots = 3;
    const next = Object.keys(s.timelines).find((tl) => !ws.some((x) => x.timeline === tl));
    emit(s, { type: 'timeline-unlocked', vis: [acct.id], timeline: next || w.timeline, whores: [w.id], data: { slots: 3, invite: next || null }, text: next ? C.TIMELINES[next].telegram : 'A third Timeline is open to you.' });
  }
}

function checkPromotion(s, w) {
  const t = tierOf(w);
  if (TIER_ORDER[t] > TIER_ORDER[w.tier]) {
    w.tier = t; w.best = maxTier(w.best, t === 'legendary' || t === 'mythic' ? w.best : t);
    const title = eraTitle(w.timeline, t, routeOf(w));
    emit(s, { type: 'promoted', timeline: w.timeline, whores: [w.id], data: { tier: t, title }, text: `RISING STAR: ${w.name} is now a ${title} (${C.TIER_NAMES[t]}).` });
  } else if (TIER_ORDER[t] < TIER_ORDER[w.tier]) w.tier = t;
  if (t === 'rare' || t === 'epic' || t === 'common') w.best = maxTier(w.best, t);
  // Renown milestones between Rare and Epic (round 5, finding 2): an era sub-title, once each per season
  for (const m of R.milestones || []) {
    if (w.renown >= m && (w.milestone || 0) < m) {
      w.milestone = m; const mo = milestoneOf(w);
      emit(s, { type: 'milestone', timeline: w.timeline, whores: [w.id], data: { at: m, title: mo.title }, text: `MAKING A NAME: ${w.name} is now ${mo.title}.` });
    }
  }
  checkUnlocks(s, w);
}

// ---- The road she aims for (round 4, finding 3): reversible, free, private; it steers Best Guess, the smileys and the
// Standing Order, never her meters. 'standing' (the Society Pages), 'notoriety' (the Police Gazette), null (undecided).
function setRoadM(s, wid, road) {
  const w = whoreOf(s, wid); touch(s, w);
  const r = road === 'standing' || road === 'notoriety' ? road : null;
  if (road != null && road !== 'undecided' && !r) fail('bad-road', 'Pick the Society Pages, the Police Gazette, or neither.');
  w.road = r;
  emit(s, { type: 'road', vis: priv(w), timeline: w.timeline, whores: [w.id], data: { road: r }, text: r === 'standing' ? `${w.name} sets her cap at the Society Pages.` : r === 'notoriety' ? `${w.name} is aiming for the Police Gazette.` : `${w.name} keeps her options open.` });
  return s;
}

// ---- Study ----
const GENT_FACTS = ['secret', 'kink', 'history'];
const RIVAL_FACTS = ['habit', 'vice', 'last'];
// only: reveal that one fact (e.g. buying a Kink novelty decodes the Tell its whisper quoted: his Kink), else the next n in order
function revealGent(s, w, gid, n, why, only = null) {
  const k = (w.known.gents[gid] ||= {}); const got = [];
  for (const f of only ? [only] : GENT_FACTS) { if (got.length >= n) break; if (!k[f]) { k[f] = true; got.push(f); } }
  if (got.length) {
    const g = C.GENTS[gid]; const T = s.timelines[w.timeline];
    // round 6 (finding 16): plain words, one colon. "Lord Plunkett's Kink: A Stern Word. Bring the Headmistress's Cane, or
    // play Strict Governess." (the content hint reads "the X, or Work Y" / "the X, and nothing else will do")
    const bring = `Bring ${g.kink.hint.replace(/, or Work /, ', or play ')}.`;
    const say = got.map((f) => f === 'secret' ? `Secretly he likes ${artName(g.secretTaste)}.` : f === 'kink' ? `His Kink is ${g.kink.name}. ${bring}` : `Last charmed by: ${T.lastCharmed[gid] ? s.whores[T.lastCharmed[gid].whore].name : 'nobody yet'}.`);
    const text = got.length === 1 && got[0] === 'kink' ? `${g.short}'s Kink: ${g.kink.name}. ${bring}` : `${g.short}: ${say.join(' ')}`;
    emit(s, { type: 'learned', vis: priv(w), timeline: w.timeline, whores: [w.id], gents: [gid], data: { facts: got, why, secretTaste: got.includes('secret') ? g.secretTaste : undefined, kink: got.includes('kink') ? g.kink.name : undefined }, text });
  }
  return got;
}
function studyM(s, wid, target) {
  const w = whoreOf(s, wid); touch(s, w); const d = daily(s, w);
  const n = w.charm === 'good-listener' ? 2 : 1;
  let unknownLeft;
  if (C.GENTS[target]) {
    if (C.GENTS[target].timeline !== w.timeline) fail('wrong-timeline', 'He is in another Timeline.');
    const k = w.known.gents[target] || {}; unknownLeft = GENT_FACTS.some((f) => !k[f]);
  } else if (s.whores[target] && s.whores[target].timeline === w.timeline && target !== wid) {
    const k = w.known.rivals[target] || {}; unknownLeft = RIVAL_FACTS.some((f) => !k[f]);
  } else fail('bad-target', 'Study a gentleman or a rival in this Timeline.');
  if (!unknownLeft) fail('nothing-left', 'You already know everything worth knowing.');
  const paid = d.studies >= R.study.freePerDay;
  if (paid && w.coin < R.study.extraCost) fail('no-coin', 'Bribing the maid costs 1 Coin.');
  if (paid) addCoin(w, -R.study.extraCost);
  d.studies++;
  if (C.GENTS[target]) {
    emit(s, { type: 'study', vis: priv(w), timeline: w.timeline, whores: [w.id], gents: [target], data: { paid }, text: `${w.name} watches ${C.GENTS[target].short} from the bar. ${C.GENTS[target].tells[d.studies % 2]}` });
    revealGent(s, w, target, n, 'study');
  } else {
    const r = s.whores[target]; const k = (w.known.rivals[target] ||= {}); const got = [];
    for (const f of RIVAL_FACTS) { if (got.length >= n) break; if (!k[f]) { k[f] = true; got.push(f); } }
    const ch = C.CHARACTERS[r.char];
    const say = got.map((f) => f === 'habit' ? `Habit: ${habitOf(s, r).text}` : f === 'vice' ? `Vice: ${C.VICES[r.vice].name}; Talent: ${C.TALENTS[r.talent].name}.` : `Last Places: ${r.places.map((p) => C.PLACES[p].short).join(', ') || 'none yet'}.`);
    emit(s, { type: 'study', vis: priv(w), timeline: w.timeline, whores: [w.id, target], data: { paid, facts: got }, text: `${r.name}. ${say.join(' ')}` });
  }
  return s;
}

// ---- Rummage (Exploration) ----
// opts.want (round 6, finding 1): the plan screen's Kink offer asks the stallholder for one item by name. On the guaranteed
// fresh roll she gets it when it is on the stall and eligible; the random draw is still made (and discarded), so the RNG
// stream, the seeds and every replay stay exactly as they were. Without opts.want, or on any other roll, nothing changes.
function exploreM(s, wid, placeId, opts = {}) {
  const w = whoreOf(s, wid); touch(s, w); const d = daily(s, w);
  const P = C.PLACES[placeId];
  if (!P || P.timeline !== w.timeline) fail('bad-place', 'That back door is in another Timeline.');
  const T = s.timelines[w.timeline];
  d.rummages++;
  const fresh = d.rummages <= R.rummage.freshPerDay;
  const eligible = P.stall.filter((iid) => !C.ITEMS[iid].blackMarket || w.notoriety >= R.rummage.blackMarketAt);
  let roll; let freshStock = false;
  if (fresh && T.freshStall === placeId && w.freshTaken !== T.curtainNo && eligible.length) { roll = 2; w.freshTaken = T.curtainNo; freshStock = true; }
  else roll = fresh ? rint(s, 6) : 6 + rint(s, 2);
  const found = { coin: 0, offer: null, gossip: 0, postcard: null, learned: null };
  if (roll <= 1 || ((roll === 2 || roll === 3) && !eligible.length)) found.coin = R.rummage.freshCoin;
  else if (roll === 2 || roll === 3) { let iid = pick(s, eligible); if (freshStock && opts.want && eligible.includes(opts.want)) iid = opts.want; w.offer = { item: iid, price: C.ITEMS[iid].cost, place: placeId }; found.offer = iid; }
  else if (roll === 4 || roll === 7) {
    found.gossip = 1; w.gossip++;
    const unknown = C.TIMELINES[w.timeline].gents.filter((g) => GENT_FACTS.slice(0, 2).some((f) => !(w.known.gents[g] || {})[f]));
    if (unknown.length && rint(s, 2) === 0) { const g = pick(s, unknown); found.learned = g; }
  } else if (roll === 5) {
    const have = new Set(w.collectibles);
    const pcs = C.POSTCARDS[w.timeline].filter((p) => !have.has(p.id));
    if (pcs.length) { found.postcard = pick(s, pcs).id; w.collectibles.push(found.postcard); } else found.coin = 1;
  } else found.coin = R.rummage.staleCoin;
  if (found.coin) addCoin(w, found.coin);
  const txt = found.offer ? `Psst. ${C.ITEMS[found.offer].name}, ${C.ITEMS[found.offer].cost} Coin. ${C.ITEMS[found.offer].inspect}`
    : found.coin ? `${found.coin} Coin under a loose floorboard.` : found.postcard ? `A saucy postcard: ${C.POSTCARDS[w.timeline].find((p) => p.id === found.postcard).name}.` : 'A juicy bit of Gossip.';
  emit(s, { type: 'explore', vis: priv(w), timeline: w.timeline, whores: [w.id], data: { place: placeId, fresh, ...found }, text: `${w.name} rummages behind ${P.short}. ${txt}` });
  if (found.learned) revealGent(s, w, found.learned, 1, 'tell-decoded');
  return s;
}
function buyOfferM(s, wid) {
  const w = whoreOf(s, wid); touch(s, w);
  if (!w.offer) fail('no-offer', 'Nobody is offering you anything. Yet.');
  if (w.coin < w.offer.price) fail('no-coin', 'Not enough Coin.');
  if (w.items.length >= R.reticule) fail('reticule-full', 'Your Reticule holds 3 novelties. Drop one first.');
  const it = C.ITEMS[w.offer.item];
  addCoin(w, -w.offer.price);
  w.items.push({ id: it.id, uses: it.uses, readyAt: 0 });
  emit(s, { type: 'buy-item', vis: priv(w), timeline: w.timeline, whores: [w.id], data: { item: it.id, price: w.offer.price }, text: `${w.name} buys ${it.name}. Into the Reticule it goes.` });
  w.offer = null;
  // the stall's whisper quoted his public Tell; buying the thing decodes it (rules-core §3.2: a Kink is learned by Study, a Tell, or accident)
  if (it.kind === 'kink' && it.kinkFor && C.GENTS[it.kinkFor] && C.GENTS[it.kinkFor].timeline === w.timeline) revealGent(s, w, it.kinkFor, 1, 'tell-decoded', 'kink');
  return s;
}
function passOfferM(s, wid) { const w = whoreOf(s, wid); touch(s, w); w.offer = null; return s; }
function dropItemM(s, wid, idx) { const w = whoreOf(s, wid); touch(s, w); if (!w.items[idx]) fail('no-item', 'No such item'); const [it] = w.items.splice(idx, 1); emit(s, { type: 'drop-item', vis: priv(w), timeline: w.timeline, whores: [w.id], data: { item: it.id }, text: `${C.ITEMS[it.id].name} left on a park bench.` }); return s; }

function buyCardM(s, wid, cid) {
  const w = whoreOf(s, wid); touch(s, w);
  const card = C.CARDS[cid];
  if (!card || !C.TIMELINES[w.timeline].market.includes(cid)) fail('not-for-sale', 'Not sold in this Timeline.');
  if (w.coin < card.cost) fail('no-coin', 'Not enough Coin.');
  addCoin(w, -card.cost); w.discard.push(cid);
  emit(s, { type: 'buy-card', vis: priv(w), timeline: w.timeline, whores: [w.id], data: { card: cid }, text: `${w.name} learns ${card.name}. ${card.flavour}` });
  return s;
}
// ---- Round 5 (finding 1): things Coin buys that show ----
// The Morning Special: today's novelty on the counter (specialOf), one per whore per day, at its stall price.
function buySpecialM(s, wid) {
  const w = whoreOf(s, wid); touch(s, w); const d = daily(s, w);
  const iid = specialOf(s, w.timeline); const it = C.ITEMS[iid];
  if (d.special) fail('special-gone', 'One Morning Special a day, and you have had today\'s.');
  if (it.blackMarket && w.notoriety < R.rummage.blackMarketAt) fail('black-market', `Under the counter: Notoriety ${R.rummage.blackMarketAt}+ only.`);
  if (w.coin < it.cost) fail('no-coin', 'Not enough Coin.');
  if (w.items.length >= R.reticule) fail('reticule-full', 'Your Reticule holds 3 novelties. Drop one first.');
  addCoin(w, -it.cost); d.special = true;
  w.items.push({ id: it.id, uses: it.uses, readyAt: 0 });
  emit(s, { type: 'buy-item', vis: priv(w), timeline: w.timeline, whores: [w.id], data: { item: it.id, price: it.cost, special: true }, text: `${w.name} buys the Morning Special: ${it.name}.` });
  // the same rule as the stall: buying a Kink novelty decodes the Tell it answers to
  if (it.kind === 'kink' && it.kinkFor && C.GENTS[it.kinkFor] && C.GENTS[it.kinkFor].timeline === w.timeline) revealGent(s, w, it.kinkFor, 1, 'tell-decoded', 'kink');
  return s;
}
// The Ladder: the next rung of lodgings and finery on the Road she is on (digsNext). Cosmetic; kept if she changes Road.
function buyDigsM(s, wid) {
  const w = whoreOf(s, wid); touch(s, w);
  const nx = digsNext(w); if (!nx) fail('top-rung', 'She has everything this Road can sell her.');
  if (w.coin < nx.rung.cost) fail('no-coin', `${nx.rung.name} costs ${nx.rung.cost} Coin.`);
  addCoin(w, -nx.rung.cost);
  (w.digs ||= { standing: 0, notoriety: 0 })[nx.road] = nx.n + 1;
  emit(s, { type: 'digs', vis: priv(w), timeline: w.timeline, whores: [w.id], data: { road: nx.road, rung: nx.rung.id, n: nx.n + 1, cost: nx.rung.cost }, text: `${w.name} goes up in the world: ${nx.rung.name}. ${nx.rung.line}` });
  return s;
}
function cureM(s, wid, aid) {
  const w = whoreOf(s, wid); touch(s, w);
  const A = C.AFFLICTIONS[aid]; if (!A) fail('bad-affliction', 'No such affliction');
  if (w.coin < A.cure.cost) fail('no-coin', 'The quack wants paying first.');
  let where = w.hand.indexOf(aid);
  if (where >= 0) { w.hand.splice(where, 1); if (w.plan) w.plan = null; const c = drawOne(s, w); if (c !== null) w.hand.push(c); }
  else if ((where = w.draw.indexOf(aid)) >= 0) w.draw.splice(where, 1);
  else if ((where = w.discard.indexOf(aid)) >= 0) w.discard.splice(where, 1);
  else fail('not-afflicted', "You haven't got that. Count your blessings.");
  addCoin(w, -A.cure.cost);
  emit(s, { type: 'cure', vis: priv(w), timeline: w.timeline, whores: [w.id], data: { affliction: aid, cure: A.cure.id }, text: `${A.cure.name}: ${w.name} is cured of ${A.name}. ${A.flavour}` });
  if (A.cure.notoriety) raiseMeter(s, w, 'notoriety', A.cure.notoriety, 'seen-buying-cure');
  return s;
}
function spendGossipM(s, wid, rid) {
  const w = whoreOf(s, wid); touch(s, w);
  const r = s.whores[rid]; if (!r || r.timeline !== w.timeline || rid === wid) fail('bad-target', 'Gossip about a rival in this Timeline.');
  if (w.gossip < 1) fail('no-gossip', 'You have no Gossip to trade.');
  w.gossip--;
  const T = s.timelines[w.timeline];
  let lastSway = null;
  if (T.sways && T.sways[rid] != null && r.lastPlace) lastSway = T.sways[rid];
  const kr = (w.known.rivals[rid] ||= {}); kr.lastSway = lastSway;
  // forward-looking: where she is heading THIS Curtain (a human's sealed Place; an NPC's Habit pick, as it stands now)
  const follows = isNPC(s, r) && C.CHARACTERS[r.char].role === 'rival' && isScriptedCurtain(s, w.timeline);
  const tonight = follows ? null : isNPC(s, r) ? npcPlace(s, r) : (r.plan && r.plan.sealed ? r.plan.place : null);
  const ahead = follows ? ' Tonight she is following you about.' : tonight ? ` Tonight she has her cap set at ${C.PLACES[tonight].short}.` : ' Tonight she has not made up her mind.';
  kr.heading = { place: tonight, follows, curtain: T.curtainNo }; // what the little bird said holds until this Curtain falls
  emit(s, { type: 'gossip-spent', vis: priv(w), timeline: w.timeline, whores: [w.id, rid], data: { rival: rid, lastPlace: r.lastPlace, lastSway, tonight, follows }, text: `A little bird says ${r.name} was at ${r.lastPlace ? C.PLACES[r.lastPlace].short : 'nowhere'} last Curtain${lastSway != null ? ` with ${lastSway} Sway` : ''}.${ahead}` });
  return s;
}

// ---- Talents used while planning ----
function useTalentM(s, wid, t) {
  const w = whoreOf(s, wid); touch(s, w);
  if (talentSpent(s, w)) fail('talent-used', talentSpentMsg(s));
  if (t.kind !== w.talent) fail('not-your-talent', 'That is not your Talent.');
  if (t.kind === 'quick-change') {
    if (w.plan && w.plan.sealed) fail('sealed', 'Unseal first.');
    const i = t.card; if (w.hand[i] == null) fail('bad-card', 'No such card');
    const c = drawOne(s, w); if (c === null) fail('empty-deck', 'Your deck is empty.');
    const old = w.hand[i]; w.hand[i] = c; w.discard.push(old); w.talentUsed = true; w.plan = null;
    emit(s, { type: 'talent', vis: priv(w), timeline: w.timeline, whores: [w.id], data: { kind: t.kind, out: old, in: c }, text: `Quick Change: ${cardOf(old).name} out, ${cardOf(c).name} in.` });
  } else if (t.kind === 'read-the-room') {
    const place = (w.plan && w.plan.place) || t.place; if (!place) fail('no-place', 'Pick a Place first.');
    const gid = rotaView(s, w.timeline, 1)[0].hosts[place];
    const got = revealGent(s, w, gid, 1, 'read-the-room');
    if (!got.length) fail('nothing-left', 'You already know everything about him.');
    w.talentUsed = true;
  } else fail('use-in-plan', 'That Talent is used inside a plan or an Assignation.');
  return s;
}

// ---- Assignations ----
function startAssignationM(s, wid, gid) {
  const w = whoreOf(s, wid); touch(s, w);
  if (w.assignation) fail('busy', 'Finish your current Assignation first.');
  const slot = assignationBoardOf(s, w).find((b) => b.gent === gid);
  if (!slot) fail('not-on-board', 'He is not on your Assignation board.');
  if (slot.refused) fail('refused', C.LINES.scrubbedRefuse);
  const pool = [...w.draw, ...w.discard];
  let lent = [];
  // Cards lent before a cancelled Assignation stay lent (no free reroll by cancelling).
  if (w.lentHold && multisetIn(w.lentHold, pool)) lent = [...w.lentHold];
  else {
    const idxs = pool.map((_, i) => i); shuffle(s, idxs);
    for (const i of idxs.slice(0, R.assignLend)) lent.push(pool[i]);
  }
  // Prototype script (opts.scriptItch): the first back-alley Assignation always lends enough Frolic for the Itch bet to be
  // on the table (your own Frolic cards first; the alley lends its Timeline's Frolic market card if your deck is short).
  if (s.opts.scriptItch && C.GENTS[gid] && C.GENTS[gid].freshness === 'ripe' && !w.itchScripted) {
    w.itchScripted = true;
    const itchy = (c) => C.CARDS[c] && C.CARDS[c].arts.includes('frolic') && !(C.CARDS[c].effects || []).includes('noItch');
    const mine = pool.filter(itchy).slice(0, 2);
    const loaner = C.TIMELINES[w.timeline].market.find(itchy);
    while (mine.length < 2 && loaner) mine.push(loaner);
    const rest = pool.filter((c) => !itchy(c) && !isAffl(c));
    lent = [...mine, ...rest.filter((c) => !mine.includes(c)).slice(0, R.assignLend - mine.length)].slice(0, R.assignLend);
  }
  w.lentHold = null;
  w.assignation = { gent: gid, lent, tourist: slot.tourist, invitation: !!slot.invitation };
  const who = C.GENTS[gid] || C.TOURISTS[gid];
  emit(s, { type: 'assignation-start', vis: priv(w), timeline: w.timeline, whores: [w.id], gents: [gid], data: { lent, tourist: slot.tourist }, text: `${who.short} is waiting.` });
  return s;
}
function cancelAssignationM(s, wid) { const w = whoreOf(s, wid); if (w.assignation) w.lentHold = [...w.assignation.lent]; w.assignation = null; return s; }
// Deal the next Assignation's 3 lent cards now, face up, before a gentleman is chosen (startAssignation then uses them).
// Same RNG draw startAssignation would make; a no-op when cards are already held for you.
function dealLentM(s, wid) {
  const w = whoreOf(s, wid);
  if (w.assignation) fail('busy', 'Finish your current Assignation first.');
  const pool = [...w.draw, ...w.discard];
  if (w.lentHold && multisetIn(w.lentHold, pool)) return s;
  const idxs = pool.map((_, i) => i); shuffle(s, idxs);
  w.lentHold = idxs.slice(0, R.assignLend).map((i) => pool[i]);
  return s;
}
function multisetIn(xs, pool) {
  const n = {}; for (const c of pool) n[c] = (n[c] || 0) + 1;
  for (const c of xs) { if (!n[c]) return false; n[c]--; }
  return true;
}

function itemUsable(s, w, iid) {
  const idx = w.items.findIndex((it) => it.id === iid && (it.readyAt || 0) <= s.timelines[w.timeline].curtainNo);
  return idx;
}
function consumeItem(s, w, iid, mode) {
  const idx = w.items.findIndex((it) => it.id === iid);
  if (idx < 0) return;
  const it = w.items[idx]; const I = C.ITEMS[iid]; const k = s.timelines[w.timeline].curtainNo;
  it.uses--;
  if (I.cooldownCurtains) it.readyAt = mode === 'curtain' ? k + 2 : k + 1;
  if (it.uses <= 0) w.items.splice(idx, 1);
}
function validateTalent(w, talent, idxs, s = null) {
  if (!talent) return null;
  if (s ? talentSpent(s, w) : w.talentUsed) fail('talent-used', s ? talentSpentMsg(s) : 'Your Talent is spent until the next Curtain.');
  if (talent.kind !== w.talent) fail('not-your-talent', 'That is not your Talent.');
  if (talent.kind === 'quick-change' || talent.kind === 'read-the-room') fail('use-now', 'Use that Talent while planning (useTalent).');
  const t = { kind: talent.kind };
  if (talent.kind === 'double-entendre') {
    if (!idxs.includes(talent.card)) fail('bad-card', 'Double Entendre must target a Worked card.');
    if (!C.ARTS[talent.art]) fail('bad-art', 'Pick an Art.');
    t.card = talent.card; t.art = talent.art;
  }
  return t;
}

function playAssignationM(s, wid, play = {}) {
  const w = whoreOf(s, wid); touch(s, w); const d = daily(s, w);
  const A = w.assignation; if (!A) fail('no-assignation', 'Start an Assignation first.');
  const idxs = play.cards || [];
  if (idxs.length < 1 || idxs.length > R.assignMaxCards) fail('bad-cards', `Work 1 or ${R.assignMaxCards} cards.`);
  if (new Set(idxs).size !== idxs.length || idxs.some((i) => A.lent[i] == null || isAffl(A.lent[i]))) fail('bad-cards', 'Pick cards you were lent (not Afflictions).');
  if (play.item && itemUsable(s, w, play.item) < 0) fail('no-item', 'That item is not in your Reticule (or is resting).');
  const talent = validateTalent(w, play.talent, idxs, s);
  const gid = A.gent; const tourist = !!C.TOURISTS[gid];
  const cards = idxs.map((i) => A.lent[i]);
  const ctxTal = talent ? { ...talent, pos: talent.card != null ? idxs.indexOf(talent.card) : -1 } : null;
  const enc = computeEncounter({ w: { ...wCtx(w), braveFace: 0 }, gent: gentCtx(gid, null, true), place: null, cards, curse: A.lent.filter(isAffl), item: play.item || null, talent: ctxTal, hist: histCtx(w, gid), others: 0, grease: 0 });
  const bar = tourist ? R.assign.bar.tourist : R.assign.bar[C.GENTS[gid].freshness];
  let outcome = enc.sway >= bar + R.assign.delightMargin ? 'delighted' : enc.sway >= bar ? 'satisfied' : 'fizzled';
  if (tourist && outcome === 'fizzled') outcome = 'satisfied';
  let renown = 0; let coin = 0; let gossip = 0; let gossipOnlyBand = false;
  const backAlley = !tourist && C.GENTS[gid].freshness === 'ripe';
  if (tourist) {
    w.touristMet = true; w.lastTouristCurtain = s.timelines[w.timeline].curtainNo;
    for (const c of cards) w.stats.cardPlays[c] = (w.stats.cardPlays[c] || 0) + 1; // a Tourist has no History, but the card's joke moves on
    renown = R.assign.tourist.renown + (outcome === 'delighted' ? R.assign.tourist.delightRenown : 0);
    coin = R.assign.tourist.coin; gossip = outcome === 'delighted' ? R.assign.tourist.delightGossip : 0;
  } else {
    const n = d.assigns + 1; const band = R.assign.bands.find((b) => n <= b.upTo);
    d.assigns = n;
    if (outcome !== 'fizzled') {
      renown = band.renown + (outcome === 'delighted' ? band.delightRenown : 0);
      coin = backAlley ? band.backAlleyCoin : band.coin;
      if (outcome === 'delighted') gossip = band.delightGossip;
      if (band.gossipOnly) gossip = Math.max(gossip, band.gossip || 1); // 7+ today: a Gossip and no Coin (B-arcade finding 4)
      else {
        if (gid === 'hank' && hist(w, 'hank').delighted > 0) coin *= C.GENTS.hank.hook.value;
        if (w.nextAssignCoin) { coin += w.nextAssignCoin; w.nextAssignCoin = 0; }
      }
    }
    gossipOnlyBand = !!band.gossipOnly;
  }
  renown = Math.max(0, Math.min(renown, R.assign.renownCapPerDay - d.assignRenown));
  d.assignRenown += renown;
  // the High Road's invitation (round 5, finding 2): the first one she Delights each day adds Renown on top of the cap
  let invitationRenown = 0;
  if (A.invitation && outcome === 'delighted' && !d.invited) { d.invited = true; invitationRenown = R.highRoad.invitationRenown; renown += invitationRenown; }
  if (outcome === 'delighted' && w.vice === 'loose-lips') gossip += 1;
  if (!gossipOnlyBand) {
    cards.forEach((c) => { const fx = C.CARDS[c].effects || []; if (fx.includes('coinOnWork1')) coin += 1; if (fx.includes('coinOnWork2')) coin += 2; });
    if (!tourist && outcome !== 'fizzled' && C.GENTS[gid].freshness === 'ripe') coin += (R.ripeFrolicCoin || 0) * enc.cards.filter((c) => c.arts.includes('frolic')).length;
  }
  w.renown += renown; addCoin(w, coin); w.gossip += gossip;
  // meters
  let noto = enc.noto; if (backAlley && outcome !== 'fizzled') noto += 1;
  if (noto > 0) raiseMeter(s, w, 'notoriety', noto, 'assignation'); else if (noto < 0) raiseMeter(s, w, 'notoriety', noto, 'assignation');
  if (outcome === 'delighted' && !tourist && C.GENTS[gid].freshness === 'scrubbed') raiseMeter(s, w, 'standing', 1, 'delighted-a-gentleman');
  // history & discoveries
  if (!tourist) afterEncounter(s, w, gid, cards, enc, outcome !== 'fizzled', outcome, talent);
  if (play.item) consumeItem(s, w, play.item, 'assign');
  if (talent) w.talentUsed = true;
  const who = C.GENTS[gid] || C.TOURISTS[gid];
  // his own reaction line, chosen from what is already in state (no RNG draw, so seeded games and the sim are unchanged)
  // round 6 (finding 11): from his 4th job with her in one District day, his `again` pool (outcome-neutral lines) turns the
  // repeat into the joke
  const dd = daily(s, w); const withHim = ((dd.withGent ||= {})[gid] = (dd.withGent[gid] || 0) + 1);
  const again = !tourist && withHim >= 4 && who.again && who.again.length ? who.again : null;
  const lines = again || (who.reactions && who.reactions[outcome]) || null;
  const react = lines && lines.length ? (again ? again[(withHim - 4) % again.length] : lines[nextReaction(w, gid) % lines.length]) : null;
  const head = outcome === 'delighted' ? 'Delighted!' : outcome === 'satisfied' ? 'Satisfied.' : 'Fizzled.';
  const body = react || (outcome === 'delighted' ? `${who.short} is beside himself.` : outcome === 'satisfied' ? `${who.short} tips his hat.` : `${who.short} remembers an urgent appointment.`);
  const ev = emit(s, { type: 'assignation', vis: priv(w), timeline: w.timeline, whores: [w.id], gents: [gid], data: { outcome, sway: enc.sway, bar, renown, coin, gossip, cards, breakdown: enc, backAlley, invitation: !!A.invitation, invitationRenown, tourist, item: play.item || null, talent: talent ? talent.kind : null, reaction: body },
    text: outcome === 'fizzled' ? `${head} ${body}` : `${head} ${body} +${renown} Renown.` });
  if (tourist && outcome === 'delighted') emit(s, { type: 'gag', vis: priv(w), timeline: w.timeline, whores: [w.id], gents: [gid], data: { tourist: true }, text: C.TOURISTS[gid].gag });
  if (outcome === 'delighted' && !tourist) emit(s, { type: 'delight', timeline: w.timeline, whores: [w.id], gents: [gid], text: `${w.name} delighted ${who.short}.` });
  if (outcome !== 'fizzled' && !tourist) itchAndCatch(s, w, gid, enc);
  w.assignation = null; w.assignations++;
  checkPromotion(s, w);
  return { s, ev };
}

// his reaction lines take turns: a per-gentleman counter that rises once per reaction shown (no RNG, so seeds are unchanged)
function nextReaction(w, gid) { const r = (w.reacted ||= {}); r[gid] = (r[gid] || 0) + 1; return r[gid] - 1; }
function itchAndCatch(s, w, gid, enc) {
  if (enc.nFrolicItch > 0 && C.GENTS[gid]) w.frolicked[gid] = true;
  gainItch(s, w, enc.itch, gid);
}

// Shared after-encounter bookkeeping: History, discoveries, hooks, gags.
function afterEncounter(s, w, gid, cards, enc, success, outcome, talent, curtainRank, place = null) {
  const h = hist(w, gid); const d = daily(s, w); const g = C.GENTS[gid];
  h.visits++;
  if (success) {
    let bump = h.wait ? 2 : 1;
    if (d.regular[gid] && !h.wait) bump = 0;
    h.regular += bump; d.regular[gid] = true; h.grudge = 0; h.satisfied++;
    if (outcome === 'delighted' || curtainRank === 0) h.delighted++;
  } else if (!(g.hook.kind === 'forgetsFizzle')) h.grudge = 1;
  h.wait = talent && talent.kind === 'make-him-wait' ? 1 : 0;
  h.seen = [...cards];
  for (const c of cards) w.stats.cardPlays[c] = (w.stats.cardPlays[c] || 0) + 1;
  const k = (w.known.gents[gid] ||= {});
  if (enc.secretHit && !k.secret) {
    k.secret = true; w.blackBook.push({ gent: gid, fact: 'secret', how: 'accident' }); emit(s, { type: 'learned', vis: priv(w), timeline: w.timeline, whores: [w.id], gents: [gid], data: { facts: ['secret'], why: 'accident', secretTaste: g.secretTaste }, text: `Well, well. ${g.short} secretly likes ${artName(g.secretTaste)}. Into the Little Black Book.` });
    // a lucky Secret Taste brings a short gag of its own (round 5, finding 7): the lazy player sees some of the comedy too
    if (success && C.LUCKY && C.LUCKY[gid]) emit(s, { type: 'gag', vis: priv(w), timeline: w.timeline, whores: [w.id], gents: [gid], data: { lucky: true, title: 'Happy accident', punchline: C.LUCKY[gid], place }, text: `Happy accident: ${C.LUCKY[gid]}` });
  }
  if (enc.kinkHit) {
    w.stats.kinkHits++;
    if (!k.kink) { k.kink = true; w.blackBook.push({ gent: gid, fact: 'kink', how: 'accident' }); emit(s, { type: 'learned', vis: priv(w), timeline: w.timeline, whores: [w.id], gents: [gid], data: { facts: ['kink'], why: 'accident', kink: g.kink.name }, text: `Oh! ${g.short}'s Kink: ${g.kink.name}. Noted, discreetly.` }); }
  }
  if (enc.aversionHit && !success && !w.blackBook.some((b) => b.gent === gid && b.fact === 'aversion')) w.blackBook.push({ gent: gid, fact: 'aversion', how: 'stamped' });
  const win = curtainRank === 0 || outcome === 'delighted';
  if (success) {
    const hk = g.hook;
    if (hk.kind === 'gossipOnWin' && win) w.gossip += hk.value;
    if (hk.kind === 'coinNextAssignation' && win) w.nextAssignCoin = hk.value;
    if (hk.kind === 'siding' && h.satisfied >= hk.value && !w.collectibles.includes('siding')) w.collectibles.push('siding');
    if (hk.kind === 'horse' && win && !w.collectibles.includes('horse')) w.collectibles.push('horse');
    if (hk.kind === 'oddCoin' && outcome === 'delighted' && !w.collectibles.includes('odd-coin')) w.collectibles.push('odd-coin');
    if (hk.kind === 'forgetsFizzle' && win) w.gossip += 1;
    if (hk.kind === 'tipOff' && win) {
      const rivals = whoresIn(s, w.timeline).filter((x) => x.id !== w.id && !(w.known.rivals[x.id] || {}).habit);
      if (rivals.length) { const r = pick(s, rivals); (w.known.rivals[r.id] ||= {}).habit = true; emit(s, { type: 'learned', vis: priv(w), timeline: w.timeline, whores: [w.id, r.id], gents: [gid], data: { rivalHabit: r.id }, text: `Slots leans in: "${r.name}? Creature of habit, that one." (Her Habit is now in your Black Book.)` }); }
    }
    if (enc.kinkHit && win) {
      const gag = Object.values(C.GAGS).find((x) => x.trigger.kind === 'kinkWin' && x.trigger.gent === gid);
      if (gag) {
        if (!w.collectibles.includes(gag.id)) w.collectibles.push(gag.id);
        // full gag (it describes the Kink) only to the winner; the district hears a discreet version
        // the title follows the Place it happened at; the punchline rotates so a repeat still lands
        const n = ((w.gagCounts ||= {})[gag.id] = (w.gagCounts[gag.id] || 0) + 1);
        const title = gag.title && place && C.PLACES[place] ? fill(gag.title, { where: C.PLACES[place].where }) : gag.name;
        const punchline = gag.punchlines && gag.punchlines.length ? gag.punchlines[(n - 1) % gag.punchlines.length] : gag.punchline;
        emit(s, { type: 'gag', vis: priv(w), timeline: w.timeline, whores: [w.id], gents: [gid], data: { gag: gag.id, title, punchline, place, nth: n, see: gag.see }, text: `${title}: ${punchline}` }); // `see` (the art brief's set-up) rides in data, for "tap for more"
        const heard = gag.see ? `OVERHEARD at ${place && C.PLACES[place] ? C.PLACES[place].short : 'a back room'}: ${gag.see.charAt(0).toLowerCase()}${gag.see.slice(1)} ${w.name} is suspected.` : `Something extraordinary happened behind a curtain with ${w.name}. The front row is still fanning itself.`;
        emit(s, { type: 'gag', timeline: w.timeline, whores: [w.id], data: { discreet: true }, text: heard });
      }
    }
  }
}

// ---- Plans and the Curtain ----
function validatePlan(s, w, plan) {
  const pid = plan.place;
  if (!C.PLACES[pid] || C.PLACES[pid].timeline !== w.timeline) fail('bad-place', 'Pick a Place in your Timeline.');
  if (!placeOpenFor(w, pid)) fail('door-shut', C.LINES.postShut);
  const idxs = plan.cards || [];
  if (idxs.length > R.maxCurtainCards) fail('bad-cards', 'Up to 3 cards.');
  if (new Set(idxs).size !== idxs.length || idxs.some((i) => w.hand[i] == null || isAffl(w.hand[i]))) fail('bad-cards', 'Pick cards from your hand (not Afflictions).');
  if (plan.item && itemUsable(s, w, plan.item) < 0) fail('no-item', 'That item is not in your Reticule (or is resting).');
  const talent = validateTalent(w, plan.talent, idxs, s);
  let grease = plan.grease || 0;
  if (grease) {
    if (w.notoriety < R.sway.grease.at || placeKindOf(pid) === 'posh') fail('no-grease', 'Grease Palms needs Notoriety 3+ at a Rowdy or Gutter Place.');
    grease = Math.min(grease, greaseMax(w));
    if (w.coin < grease * greasePer(w)) fail('no-coin', 'Not enough Coin to grease those palms.');
  }
  const perG = greasePer(w);
  if (plan.bribe) {
    const T = s.timelines[w.timeline];
    const raidPid = isRaidCurtain(T.curtainNo) ? placeOfKind(w.timeline, 'gutter') : null;
    if (!R.raidBribe) fail('no-bribe', 'Nobody squares the Peelers in this edition.');
    if (!canBribe(w, pid, raidPid)) fail('no-bribe', `Only a Notorious whore (Notoriety ${R.raidBribe.at}+) can square the Peelers, and only at a raided Gutter Place.`);
    if (w.coin < R.raidBribe.cost + grease * perG) fail('no-coin', `Squaring the Peelers costs ${R.raidBribe.cost} Coin.`);
  }
  const gt = gamblerTerms(w);
  if (plan.stake && (w.vice !== 'gambler' || w.coin < gt.stake + grease * perG)) fail('no-stake', `Only a Gambler can stake, and she needs ${gt.stake} Coin.`);
  // the stake's terms and the Grease price are fixed when she plans (her tier may change at the Curtain itself)
  const out = { place: pid, cards: [...idxs], item: plan.item || null, talent, grease, stake: !!plan.stake, bribe: !!plan.bribe, sealed: false, ...(plan.stake ? { stakeTerms: gt } : {}), ...(grease ? { greasePer: perG } : {}) };
  // optional hindsight baselines (see hindsightFor): card ids Best Guess picked from her dawn hand, per Place
  if (Array.isArray(plan.baseline)) {
    const bl = plan.baseline.slice(0, 3).filter((b) => b && C.PLACES[b.place] && C.PLACES[b.place].timeline === w.timeline && Array.isArray(b.cards)
      && b.cards.length <= R.maxCurtainCards && b.cards.every((c) => C.CARDS[c]))
      .map((b) => ({ key: String(b.key || b.place), place: b.place, cards: [...b.cards], hand: Array.isArray(b.hand) ? b.hand.filter((c) => C.CARDS[c] || C.AFFLICTIONS[c]).slice(0, 12) : null,
        known: b.known ? { secret: !!b.known.secret, kink: !!b.known.kink } : null }));
    if (bl.length) out.baseline = bl;
  }
  return out;
}
function planEveningM(s, wid, plan) {
  const w = whoreOf(s, wid); touch(s, w);
  w.plan = validatePlan(s, w, plan);
  if (placeKindOf(w.plan.place) === 'gutter' && !w.slummed) w.plan.slumming = true;
  emit(s, { type: 'plan', vis: priv(w), timeline: w.timeline, whores: [w.id], data: { place: w.plan.place, cards: w.plan.cards }, text: `${w.name} sets her cap at ${C.PLACES[w.plan.place].short}.` });
  return s;
}
function sealPlanM(s, wid, plan) {
  const w = whoreOf(s, wid);
  if (plan) planEveningM(s, wid, plan);
  if (!w.plan) fail('no-plan', 'Plan your evening first.');
  touch(s, w);
  w.plan.sealed = true;
  startStandinSeals(s, w);
  emit(s, { type: 'seal', vis: priv(w), timeline: w.timeline, whores: [w.id], data: { place: w.plan.place }, text: C.LINES.seal });
  maybeCloseCurtain(s, w.timeline);
  return s;
}
// opts.standinSeal: a human's seal starts the stand-ins' seal timers for this Curtain (once; kept if she unseals and reseals)
const isStandin = (s, w) => s.accounts[w.account].kind === 'standin';
function startStandinSeals(s, w) {
  const o = s.opts.standinSeal; const T = s.timelines[w.timeline];
  if (!o || isNPC(s, w) || T.curtainNo < o.from || T.standinSealAt) return;
  T.standinSealAt = {};
  for (const x of whoresIn(s, w.timeline)) if (isNPC(s, x) && isStandin(s, x)) T.standinSealAt[x.id] = s.clock + o.min + (hashSeed(`${s.seed}:${x.id}:${T.curtainNo}`) % (o.max - o.min + 1));
}
function standinsSealed(s, T) {
  if (!s.opts.standinSeal || T.curtainNo < s.opts.standinSeal.from) return true;
  return !!T.standinSealAt && Object.values(T.standinSealAt).every((at) => at <= s.clock);
}
/** Who has sealed for a Timeline's next Curtain: { sealed, total, lastAt (district minute the last stand-in seals, or null) }. */
function sealingOf(s, tl) {
  const T = s.timelines[tl]; const ws = whoresIn(s, tl); const timed = !standinsSealed(s, T) || !!T.standinSealAt;
  let sealed = 0;
  for (const x of ws) {
    if (!isNPC(s, x)) { if (x.plan && x.plan.sealed) sealed++; continue; }
    if (!isStandin(s, x) || !s.opts.standinSeal || T.curtainNo < s.opts.standinSeal.from) { sealed++; continue; }
    if (T.standinSealAt && T.standinSealAt[x.id] <= s.clock) sealed++;
  }
  const lastAt = timed && T.standinSealAt ? Math.max(...Object.values(T.standinSealAt), s.clock) : null;
  return { sealed, total: ws.length, lastAt };
}
function unsealM(s, wid) { const w = whoreOf(s, wid); touch(s, w); if (!w.plan || !w.plan.sealed) fail('not-sealed', 'Not sealed.'); w.plan.sealed = false; return s; }

function activeHumansIn(s, tl) {
  return whoresIn(s, tl).filter((w) => !isNPC(s, w) && s.clock - w.lastActiveAt <= R.curtain.activeWindowMin);
}
/**
 * The Curtain clock in words, for display only (no rule reads it): 'later' (more than 120 district minutes left),
 * 'soon' (61-120), 'near' (2-60), 'due' (1 or less: last call). The words are LINES.curtainWhen. The bands are fixed
 * district minutes, not shares of the gap: at the Scandal Sheet's pace (one district minute per real second of play)
 * each band lasts one real minute, so the words change at most once a minute.
 */
export function curtainWhen(minutesLeft) {
  const m = minutesLeft;
  return m <= 1 ? 'due' : m <= 60 ? 'near' : m <= 120 ? 'soon' : 'later';
}
/** True when the Curtain may fall early (everyone active has sealed and the minimum gap has passed). */
export function curtainReady(state, tl) {
  const s = state; const T = s.timelines[tl];
  const act = activeHumansIn(s, tl);
  if (!act.length) return false;
  return act.every((w) => w.plan && w.plan.sealed) && s.clock - T.lastCurtainAt >= s.opts.minGapMin && standinsSealed(s, T);
}
function maybeCloseCurtain(s, tl) { if (curtainReady(s, tl)) resolveCurtainM(s, tl); }

function syncDay(s) {
  const d = dayOf(s.clock);
  while (s.day < d) {
    s.day++;
    for (const T of Object.values(s.timelines)) for (const st of Object.values(T.seats)) {
      if (st.holder) { const w = s.whores[st.holder]; w.best = maxTier(w.best, C.SEATS[st.id].tier); }
    }
  }
}
// Prototype convenience: sleep until the next 06:00. The day turns (3 fresh full-pay Curtains, Assignation Renown cap,
// free Studies), and every Timeline's Curtain clock restarts at dawn: nothing resolves overnight, no Standing Orders run.
function sleepTillDawnM(s) {
  // always the 06:00 of the NEXT district day: going to bed before 06:00 used to land on the same day's 06:00, so the day
  // never turned and nobody got her fresh full-pay Curtains (B-arcade review round 2, found while replaying finding 2)
  // a sealed human plan is not thrown away by going to bed: each such Curtain falls first, at its due time (finding A5)
  const dueOf = (T) => Math.max(s.clock, T.lastCurtainAt + s.opts.minGapMin, sealingOf(s, T.id).lastAt || 0);
  const sealedHuman = (T) => whoresIn(s, T.id).some((x) => !isNPC(s, x) && x.plan && x.plan.sealed);
  for (const T of Object.values(s.timelines).filter(sealedHuman).sort((a, b) => dueOf(a) - dueOf(b))) {
    if (!sealedHuman(T)) continue; // already fallen while the clock moved for another Timeline
    const due = dueOf(T); const k = T.curtainNo;
    if (due > s.clock) advanceClockM(s, due - s.clock);
    if (T.curtainNo === k) resolveCurtainM(s, T.id);
  }
  const dawn = (dayOf(s.clock) + 1) * 1440 + R.dawnMin;
  s.clock = dawn; syncDay(s);
  for (const T of Object.values(s.timelines)) T.lastCurtainAt = s.clock;
  emit(s, { type: 'dawn', data: { day: s.day }, text: 'Dawn over the Eternal District. Fresh Curtains, fresh punters, fresh regrets.' });
  return s;
}
function advanceClockM(s, minutes, opts = {}) {
  if (minutes < 0) fail('time', 'Time only runs forwards, dear.');
  const target = s.clock + minutes;
  if (opts.autoCurtains === false) { s.clock = target; syncDay(s); return s; }
  for (;;) {
    let next = null; let ntl = null;
    for (const T of Object.values(s.timelines)) { const due = T.lastCurtainAt + s.opts.maxGapMin; if (due <= target && (next === null || due < next)) { next = due; ntl = T.id; } }
    if (next === null) break;
    s.clock = Math.max(s.clock, next); syncDay(s); resolveCurtainM(s, ntl);
  }
  s.clock = target; syncDay(s);
  for (const tl of Object.keys(s.timelines)) maybeCloseCurtain(s, tl);
  return s;
}

// NPC behaviour (uses only the NPC's own view, except stand-in Lady Lavinia who replays a strong player).
function npcView(s, w) { return getView(s, w.id, { _omni: !!C.CHARACTERS[w.char].knowsAll }); }
function npcPlace(s, w, v) {
  const ch = C.CHARACTERS[w.char]; const T = s.timelines[w.timeline];
  const open = (kind) => { const p = placeOfKind(w.timeline, kind); return placeOpenFor(w, p) ? p : null; };
  const habit = ch.habit ? ch.habit.kind : 'casual';
  // The Timeline's rival is the Notoriety route's nemesis too: while a human whore here has more Notoriety than Standing,
  // she works the Gutter (B-arcade review, finding 1). The prototype's scripted Curtains relocate her later, as before.
  // (not on Raid Night: the law is about, and she is a lady, after a fashion)
  if (ch.role === 'rival' && !isScriptedCurtain(s, w.timeline) && humanOnNotorietyRoute(s, w.timeline) && !isRaidCurtain(T.curtainNo)) { const g = open('gutter'); if (g) return g; }
  if (habit === 'posh') return open('posh') || open('rowdy');
  if (habit === 'rowdy2of3') return T.curtainNo % 3 !== 2 ? open('rowdy') : open('posh') || open('rowdy');
  // Gutter two Curtains in three; on Raid Night (every 3rd Curtain) she lies low at the Rowdy Place
  if (habit === 'gutter2of3') return !isRaidCurtain(T.curtainNo) ? open('gutter') || open('rowdy') : open('rowdy') || open('gutter');
  if (habit === 'biggestPot') {
    // the biggest 1st-place pot she can enter: Renown (halved at the Gutter on Raid Night) plus Coin
    const raid = isRaidCurtain(T.curtainNo); let best = null;
    for (const kind of ['posh', 'gutter', 'rowdy']) {
      const p = open(kind); if (!p) continue; const PR = R.places[kind];
      const pot = (raid && kind === 'gutter' ? Math.floor(PR.renown[0] / R.raidRenownDivisor) : PR.renown[0]) + PR.coin[0];
      if (!best || pot > best.pot) best = { p, pot };
    }
    return best ? best.p : null;
  }
  return casualPlace(v || npcView(s, w));
}
function humanOnNotorietyRoute(s, tl) { return whoresIn(s, tl).some((h) => !isNPC(s, h) && h.notoriety > h.standing); }
// Will this NPC play Upstage at the next Curtain? (posh-Habit Upstagers do, unless staged quiet for the prototype)
// place (optional): she keeps her Upstage for the Posh Place, the room her Habit is about (B-arcade finding 1)
function npcUpstages(s, w, place = null) {
  if (place && placeKindOf(place) !== 'posh') return false;
  const habit = (C.CHARACTERS[w.char].habit || {}).kind || 'casual';
  const quiet = w.quietUntil != null && s.timelines[w.timeline].curtainNo < w.quietUntil; // prototype staging
  return w.talent === 'upstage' && habit === 'posh' && !quiet;
}
// An NPC whose Talent is Read the Room spends it on tonight's host before she picks her cards (B-arcade round 3, finding 2:
// Clockwork Clementine never used it, so her Talent never bound). Same effect as useTalent: his next unknown fact.
function npcReadRoom(s, w, pid) {
  if (w.talent !== 'read-the-room' || talentSpent(s, w) || !pid) return false;
  const gid = rotaView(s, w.timeline, 1)[0].hosts[pid]; if (!gid) return false;
  const got = revealGent(s, w, gid, 1, 'read-the-room');
  if (got.length) w.talentUsed = true;
  return got.length > 0;
}
function npcPlan(s, w) {
  const ch = C.CHARACTERS[w.char]; let v = npcView(s, w);
  const habit = ch.habit ? ch.habit.kind : 'casual';
  const place = npcPlace(s, w, v);
  // a scripted follower reads the room where she ends up (relocate), not where her Habit would have taken her
  if (!(ch.role === 'rival' && isScriptedCurtain(s, w.timeline)) && npcReadRoom(s, w, place)) v = npcView(s, w);
  const bg = bestGuess(v, place);
  const talent = npcUpstages(s, w, place) ? { kind: 'upstage' } : null;
  w.plan = { place, cards: bg.cards, item: null, talent, grease: 0, stake: false, sealed: true, npc: true };
}
/**
 * crowdHint(state, whoreId) — a coarse forecast of tonight's crowd at each Place in her Timeline, from the
 * Automatons' and stand-ins' habits (what Study would tell you). Other humans' sealed plans stay private.
 * Returns { counts: {placeId: n}, labels: {placeId: 'quiet' | 'a few' | 'busy'}, follower: rival id or null }.
 * follower = the prototype's scripted rival, who turns up wherever the human goes.
 * known: { placeId: [{ id, name, short, why: 'gossip' | 'habit', lastSway, upstage }] } — rivals this whore KNOWS are heading
 *   there (a Gossip read for this Curtain, or a Studied Habit that names a Place); followerUpstage: the scripted follower will
 *   play Upstage tonight; followerCan: { placeId: bool } whether her doors let her follow you there. `upstage` = she will play Upstage there (her Talent is public; whether she plays it follows her Habit).
 * possible: { placeId: [{ id, name, short, upstage: true, likely }] } — every rival (bar the scripted follower) who would play
 *   Upstage at that Place if she came and whose doors let her in, known or not; likely = her Habit takes her there tonight.
 */
export function crowdHint(state, whoreId) {
  const s = state; const me = s.whores[whoreId]; if (!me) fail('no-whore', `No whore ${whoreId}`);
  const counts = Object.fromEntries(C.TIMELINES[me.timeline].places.map((p) => [p, 0]));
  let follower = null; let followerUpstage = false; let followerCan = null;
  const known = Object.fromEntries(C.TIMELINES[me.timeline].places.map((p) => [p, []]));
  const possible = Object.fromEntries(C.TIMELINES[me.timeline].places.map((p) => [p, []]));
  const T = s.timelines[me.timeline];
  for (const w of whoresIn(s, me.timeline)) {
    if (w.id === me.id || !isNPC(s, w)) continue;
    if (isScriptedCurtain(s, me.timeline) && C.CHARACTERS[w.char].role === 'rival' && !isNPC(s, me)) { follower = w.id; followerUpstage = npcUpstages(s, w); followerCan = Object.fromEntries(C.TIMELINES[me.timeline].places.map((p) => [p, placeOpenFor(w, p)])); continue; }
    const p = npcPlace(s, w); if (p) counts[p]++;
    // promise 1: her Talent is public, so where she would play Upstage (and her doors let her in) is printed whether or not you
    // know she is coming; `likely`: her Habit takes her there tonight (what Study would tell you)
    for (const pid of C.TIMELINES[me.timeline].places) if (npcUpstages(s, w, pid) && placeOpenFor(w, pid)) possible[pid].push({ id: w.id, name: w.name, short: C.CHARACTERS[w.char].short || w.name, upstage: true, likely: p === pid });
    const kr = me.known.rivals[w.id] || {};
    const habit = (C.CHARACTERS[w.char].habit || {}).kind;
    const gossip = kr.heading && kr.heading.curtain === T.curtainNo && kr.heading.place ? kr.heading.place : null;
    const where = gossip || (kr.habit && ['posh', 'rowdy2of3', 'biggestPot', 'gutter2of3'].includes(habit) ? p : null);
    if (where && known[where]) known[where].push({ id: w.id, name: w.name, short: C.CHARACTERS[w.char].short || w.name, why: gossip ? 'gossip' : 'habit', lastSway: kr.lastSway != null ? kr.lastSway : null, upstage: npcUpstages(s, w, where) });
  }
  const labels = Object.fromEntries(Object.entries(counts).map(([p, n]) => [p, n >= 3 ? 'busy' : n >= 1 ? 'a few' : 'quiet']));
  return { counts, labels, follower, followerUpstage, followerCan, known, possible };
}
function npcBetween(s, w) {
  // one Assignation per Curtain cycle, cures when affordable, an occasional market card
  const d = daily(s, w);
  for (const aid of [...new Set([...w.hand, ...w.draw, ...w.discard].filter(isAffl))]) if (w.coin >= C.AFFLICTIONS[aid].cure.cost) cureM(s, w.id, aid);
  if (d.assigns < R.curtain.fullPayPerDay) {
    const board = assignationBoardOf(s, w).filter((b) => !b.refused && !b.backAlley);
    if (board.length) {
      let bestPick = null;
      const v0 = npcView(s, w);
      for (const b of board) {
        const fresh = b.tourist ? 'scrubbed' : C.GENTS[b.gent].freshness;
        const score = (b.tourist ? 2 : 0) - b.bar + (v0.whore.type === (C.GENTS[b.gent] || {}).fancy ? 2 : 0) - (fresh === 'scrubbed' ? 0 : 1);
        if (!bestPick || score > bestPick.score) bestPick = { score, gent: b.gent };
      }
      startAssignationM(s, w.id, bestPick.gent);
      const v = npcView(s, w);
      const bg = bestGuess(v, { gent: bestPick.gent });
      if (bg.cards.length) playAssignationM(s, w.id, { cards: bg.cards }); else w.assignation = null;
    }
  }
  if (d.day !== w._npcShopDay) {
    w._npcShopDay = d.day;
    const mk = C.TIMELINES[w.timeline].market.map((c) => C.CARDS[c]).filter((c) => w.coin >= c.cost + 3);
    if (mk.length && w.draw.length + w.discard.length + w.hand.length < 16) {
      mk.sort((a, b) => b.allure - a.allure || (a.id < b.id ? -1 : 1));
      buyCardM(s, w.id, mk[0].id);
    }
  }
}
/**
 * standingOrderPick(view) — where an unsealed whore goes when her Curtain falls without her (rules-core §4.1/§4.2):
 * the Place with the most smileys tonight (ties to the bigger 1st-place Renown; a first Gutter visit is declined),
 * playing Best Guess. Returns { place, cards, sway, smileys, host }. The UI can show it before the Curtain falls.
 */
export function standingOrderPick(view) {
  const place = casualPlace(view, { slumming: !!view.whore.slummed });
  const bg = bestGuess(view, place);
  return { place, cards: bg.cards, sway: bg.sway, smileys: smileys(view, place), host: view.timeline.rota[0].hosts[place] };
}
function standingOrder(s, w) {
  const pick = standingOrderPick(getView(s, w.id));
  w.plan = { place: pick.place, cards: pick.cards, item: null, talent: null, grease: 0, stake: false, sealed: true, standingOrder: true };
}

// Seats and Duels
export function canChallenge(state, w, seatId) {
  const s = state; const T = s.timelines[w.timeline]; const st = T.seats[seatId]; const S = C.SEATS[seatId];
  if (!st) return { ok: false, why: 'No such seat.' };
  if (st.holder === w.id) return { ok: false, why: 'You already sit in it.' };
  if (T.challenges.some((c) => c.seat === seatId)) return { ok: false, why: 'Someone has already called her out this Curtain.' };
  if (T.challenges.some((c) => c.challenger === w.id)) return { ok: false, why: 'One challenge at a time, dear.' };
  if (st.graceUntil > T.curtainNo) return { ok: false, why: 'The holder has just defended; give her a breather.' };
  if ((w.failed[seatId] || -1) >= dayOf(s.clock)) return { ok: false, why: 'You lost a Duel for this seat recently. Wait two days.' };
  if (S.tier === 'legendary') {
    if (w.seat) return { ok: false, why: 'You already hold a seat.' };
    if (w.renown < R.tiers.epic) return { ok: false, why: `You must be Epic (${R.tiers.epic} Renown).` };
    if (S.route === 'standing' && w.standing < R.seats.salon.standing) return { ok: false, why: `Standing ${R.seats.salon.standing}+ needed.` };
    if (S.route === 'notoriety' && w.notoriety < R.seats.gutter.notoriety) return { ok: false, why: `Notoriety ${R.seats.gutter.notoriety}+ needed.` };
  } else {
    if (w.seat !== 'salon' && w.seat !== 'gutter') return { ok: false, why: 'Hold a Legendary seat first.' };
    if (w.standing < R.seats.crown.meter && w.notoriety < R.seats.crown.meter) return { ok: false, why: `Standing or Notoriety ${R.seats.crown.meter}+ needed.` };
  }
  return { ok: true };
}
function challengeSeatM(s, wid, seatId) {
  const w = whoreOf(s, wid); touch(s, w);
  const c = canChallenge(s, w, seatId); if (!c.ok) fail('cannot-challenge', c.why);
  const T = s.timelines[w.timeline]; const st = T.seats[seatId];
  T.challenges.push({ challenger: w.id, seat: seatId, holder: st.holder });
  const holder = st.holder ? s.whores[st.holder] : null;
  emit(s, { type: 'seat-challenged', timeline: w.timeline, whores: holder ? [w.id, holder.id] : [w.id], data: { seat: seatId, holder: st.holder }, text: holder ? `SEAT UNDER SIEGE: ${w.name} demands ${holder.name}'s chair (${seatName(seatId, w.timeline)}). Pistols at the next Curtain.` : `${w.name} makes a bid for the empty ${seatName(seatId, w.timeline)}.` });
  return s;
}
function npcChallenges(s, tl) {
  for (const w of whoresIn(s, tl)) {
    if (!isNPC(s, w)) continue;
    for (const k of ['crown', 'salon', 'gutter']) if (canChallenge(s, w, k).ok) { challengeSeatM(s, w.id, k); break; }
  }
}
function seatPlace(tl, seatId) { return placeOfKind(tl, C.SEATS[seatId].placeKind); }

function setupDuels(s, T, hosts) {
  const duels = [];
  for (const c of T.challenges) {
    const ch = s.whores[c.challenger]; const st = T.seats[c.seat];
    if (!ch || ch.retired || st.holder !== c.holder) continue;
    if (!st.holder) {
      const pid = seatPlace(T.id, c.seat);
      if (ch.plan.place !== pid) relocate(s, ch, pid);
      duels.push({ seat: c.seat, challenger: ch.id, holder: null, place: pid });
      continue;
    }
    const h = s.whores[st.holder]; const pid = ch.plan.place;
    // the holder picks the judge: the gentleman under whom her own best play scores highest
    let best = null;
    for (const gid of C.TIMELINES[T.id].gents) {
      const v = getView(s, h.id, { _omni: isNPC(s, h) && !!C.CHARACTERS[h.char].knowsAll });
      v.timeline.rota[0].hosts = { ...v.timeline.rota[0].hosts, [pid]: gid };
      const bg = bestGuess(v, pid);
      if (!best || bg.sway > best.sway) best = { gid, sway: bg.sway };
    }
    hosts[pid] = best.gid; T.hostOverride = { ...(T.hostOverride || {}), [pid]: best.gid };
    relocate(s, h, pid);
    duels.push({ seat: c.seat, challenger: ch.id, holder: h.id, place: pid, judge: best.gid });
  }
  return duels;
}
function relocate(s, w, pid) {
  if (isNPC(s, w) || !w.plan) {
    if (isNPC(s, w)) npcReadRoom(s, w, pid);
    const v = getView(s, w.id, { _omni: isNPC(s, w) && !!C.CHARACTERS[w.char].knowsAll });
    const bg = bestGuess(v, pid);
    w.plan = { ...(w.plan || {}), place: pid, cards: bg.cards, item: null, talent: w.plan && w.plan.talent && w.plan.talent.kind === 'upstage' ? w.plan.talent : null, grease: 0, stake: false, sealed: true };
  } else {
    w.plan = { ...w.plan, place: pid, grease: placeKindOf(pid) === 'posh' ? 0 : w.plan.grease };
  }
}

/**
 * placeField(ctx, pid, me, meSway, o) — where a whore at raw Sway `meSway` would finish at Place pid against the rest of the
 * real field (everyone else's raw Sway that Curtain, below-Bar entrants included), with every Upstage cut applied exactly as the
 * Curtain applies it, dead heats split, Applause, Raid Night, the Wheelbarrow bonus and After Hours. Private: it reads true Sways.
 */
function placeField(ctx, pid, me, meSway, o = {}) {
  const L = (ctx.byPlace[pid] || []).filter((x) => x.id !== me.id);
  const all = [...L, me];
  const raw = Object.fromEntries(L.map((x) => [x.id, ctx.encs[x.id].enc.sway])); raw[me.id] = meSway;
  const ups = L.filter((x) => x.plan.talent && x.plan.talent.kind === 'upstage').map((x) => x.id);
  if (o.upstage) ups.push(me.id);
  const cut = {};
  for (const u of ups) {
    const above = all.filter((x) => raw[x.id] > raw[u]).map((x) => raw[x.id]);
    if (above.length) { const lo = Math.min(...above); for (const x of all) if (raw[x.id] === lo) cut[x.id] = (cut[x.id] || 0) + 2; }
  }
  const sw = (id) => Math.max(0, raw[id] - (cut[id] || 0));
  const P = C.PLACES[pid]; const PR = R.places[P.kind]; const mine = sw(me.id);
  let rank = null; let renown = 0; let coin = PR.doorGift;
  if (mine >= PR.bar) {
    rank = L.filter((x) => sw(x.id) >= PR.bar && sw(x.id) > mine).length;
    if (rank < 3) {
      const tied = 1 + L.filter((x) => sw(x.id) === mine).length;
      const shareOf = (arr) => { let t = 0; for (let i = rank; i < rank + tied && i < 3; i++) t += arr[i]; return Math.ceil(t / tied); };
      renown = shareOf(PR.renown); if (ctx.raid && P.kind === 'gutter') renown = Math.floor(renown / R.raidRenownDivisor);
      coin += shareOf(PR.coin);
      if (rank === 0 && all.length >= 2) renown += Math.ceil((P.house.applause != null ? P.house.applause : PR.applause) / tied);
    }
    if (rank === 0 && (o.cards || []).some((c) => (C.CARDS[c].effects || []).includes('firstBonus'))) renown += R.wheelbarrowFirstBonus;
  }
  if (o.fullPay === false) renown = 0;
  return { sway: mine, rank, renown, coin, upstaged: cut[me.id] || 0 };
}
/**
 * hindsightFor(s, w, ctx) — for a human whose sealed plan carries `baseline` sets ({ key, place, cards: [card ids], hand?, known? }):
 * each set is scored at its Place with the real encounter maths (his hidden Secret Taste and Kink, her Charms and Vices, the
 * real crowd), no novelty, Talent or Grease, and placed against the real field (placeField). Her own play and each set are
 * also scored with only what she knew of the host (`known` as recorded, else her Black Book now), so the gap between her play
 * and Best Guess splits into thinking (known vs known) and luck (the rest: secrets nobody had found).
 */
function hindsightFor(s, w, ctx) {
  const d = daily(s, w); const fullPay = d.curtains < R.curtain.fullPayPerDay;
  const encAt = (pid, cards, gent, x = {}) => {
    const L = (ctx.byPlace[pid] || []).filter((o) => o.id !== w.id); const minR = L.length ? Math.min(...L.map((o) => o.renown)) : Infinity;
    return computeEncounter({ w: wCtx(w), gent, place: pid, cards, curse: w.hand.filter(isAffl), item: x.item || null, talent: x.talent || null, hist: histCtx(w, ctx.hosts[pid]),
      others: L.length, leastRenown: w.renown <= minR, nemesis: !!(w.lastBeatenBy && L.some((o) => o.id === w.lastBeatenBy)), grease: x.grease || 0 });
  };
  const knownOf = (gid, k) => gentCtx(gid, k || w.known.gents[gid] || {}, false);
  const E = ctx.encs[w.id]; const home = w.plan.place;
  const youKnown = encAt(home, E.cards, knownOf(ctx.hosts[home]), { item: E.item, talent: E.tal, grease: E.grease }).sway;
  const yk = placeField(ctx, home, w, youKnown, { upstage: !!(w.plan.talent && w.plan.talent.kind === 'upstage'), cards: E.cards, fullPay });
  const baselines = w.plan.baseline.map((b) => {
    const host = ctx.hosts[b.place];
    const real = placeField(ctx, b.place, w, encAt(b.place, b.cards, gentCtx(host, null, true)).sway, { cards: b.cards, fullPay });
    const kn = placeField(ctx, b.place, w, encAt(b.place, b.cards, knownOf(host, b.known)).sway, { cards: b.cards, fullPay });
    // Coin as the Curtain pays it: shares + door gift, pockets of the dawn-hand cards kept back, Worked-card Coin, Vice, Lodgers
    const hand = [...(b.hand || w.hand)]; for (const c of b.cards) { const i = hand.indexOf(c); if (i >= 0) hand.splice(i, 1); }
    const P = C.PLACES[b.place];
    let coin = real.coin + hand.filter((c) => !isAffl(c)).reduce((t, c) => t + C.CARDS[c].pocket + (P.house.pocket || 0), 0);
    b.cards.forEach((c) => { const fx = C.CARDS[c].effects || []; if (fx.includes('coinOnWork1')) coin += 1; if (fx.includes('coinOnWork2')) coin += 2; });
    if (w.vice === 'mothers-ruin') coin += 1;
    coin -= (b.hand || w.hand).filter((c) => c === 'lodgers').length;
    return { key: b.key, place: b.place, host, cards: [...b.cards], sway: real.sway, rank: real.rank, renown: real.renown, coin, upstaged: real.upstaged, knownSway: kn.sway, knownRank: kn.rank, knownRenown: kn.renown };
  });
  return { fullPay, you: { knownSway: yk.sway, knownRank: yk.rank, knownRenown: yk.renown }, baselines };
}
/** finishHindsight: add her real result; thinking = her play vs the baseline at her Place, both as she knew them; luck = the rest. */
function finishHindsight(h, place, me) {
  const here = h.baselines.find((b) => b.place === place) || null;
  if (!here) return { ...h, you: { ...h.you, ...me }, here: null, thinking: null, luck: null, coinGap: null };
  const thinking = h.you.knownRenown - here.knownRenown;
  return { ...h, you: { ...h.you, ...me }, here: here.key, thinking, luck: (me.renown - here.renown) - thinking, coinGap: me.coin - here.coin };
}
function resolveCurtainM(s, tl) {
  const outer = RESOLVING; RESOLVING = tl;
  try { return resolveCurtainInner(s, tl); } finally { RESOLVING = outer; }
}
function resolveCurtainInner(s, tl) {
  syncDay(s);
  const T = s.timelines[tl]; if (!T) fail('bad-timeline', 'No such Timeline.');
  const k = T.curtainNo;
  T.standinSealAt = null; // opts.standinSeal timers belong to this Curtain
  const ws = whoresIn(s, tl);
  for (const w of ws) daily(s, w);
  const tableBefore = ws.map((w) => ({ id: w.id, renown: w.renown })).sort((a, b) => b.renown - a.renown);
  // between-Curtain life of NPCs, then plans
  for (const w of ws) if (isNPC(s, w) && !(w.plan && w.plan.sealed)) npcBetween(s, w);
  npcChallenges(s, tl);
  T.hostOverride = null;
  const hosts = hostsFor(tl, k);
  const standingOrders = [];
  for (const w of ws) {
    if (w.plan && w.plan.sealed) continue;
    if (isNPC(s, w)) npcPlan(s, w); else { standingOrder(s, w); standingOrders.push(w.id); }
  }
  if (isScriptedCurtain(s, tl)) {
    const human = ws.find((w) => !isNPC(s, w)); const riv = ws.find((w) => C.CHARACTERS[w.char].role === 'rival' && isNPC(s, w));
    if (human && riv && riv.plan.place !== human.plan.place && placeOpenFor(riv, human.plan.place)) { relocate(s, riv, human.plan.place); riv.plan.scripted = true; }
    if (riv) riv.lastScripted = k; // she follows by script tonight (wherever the human is): not a change of habit later
  }
  const duels = setupDuels(s, T, hosts);
  // encounters
  const byPlace = {};
  for (const w of ws) (byPlace[w.plan.place] ||= []).push(w);
  const raid = isRaidCurtain(k);
  const results = { curtain: k, raid: raid ? placeOfKind(tl, 'gutter') : null, places: [] };
  const sways = {};
  const encs = {};
  for (const pid of C.TIMELINES[tl].places) {
    const L = byPlace[pid] || [];
    results.places.push({ place: pid, host: hosts[pid], entries: [] });
    if (!L.length) continue;
    const minR = Math.min(...L.map((x) => x.renown));
    for (const w of L) {
      const p = w.plan; const cards = p.cards.map((i) => w.hand[i]);
      const usableItem = p.item && itemUsable(s, w, p.item) >= 0 ? p.item : null;
      const tal = p.talent ? { ...p.talent, pos: p.talent.card != null ? p.cards.indexOf(p.talent.card) : -1 } : null;
      let grease = p.grease || 0; const per = p.greasePer || greasePer(w);
      while (grease && w.coin < grease * per) grease--;
      // Raid Night: a Notorious whore who sealed a bribe (and can still pay it) keeps her full Gutter Renown
      const bribe = !!(p.bribe && raid && canBribe(w, pid, placeOfKind(tl, 'gutter')) && w.coin >= R.raidBribe.cost + grease * per);
      const enc = computeEncounter({
        w: wCtx(w), gent: gentCtx(hosts[pid], null, true), place: pid, cards, curse: w.hand.filter(isAffl), item: usableItem, talent: tal,
        hist: histCtx(w, hosts[pid]), others: L.length - 1, leastRenown: w.renown === minR, nemesis: !!(w.lastBeatenBy && L.some((x) => x.id === w.lastBeatenBy)), grease,
      });
      encs[w.id] = { enc, cards, item: usableItem, grease, per, tal, bribe };
      sways[w.id] = enc.sway;
    }
    // Upstage: the rival placed directly above you loses 2
    const cuts = {}; const cutBy = {};
    for (const w of L) {
      if (!(w.plan.talent && w.plan.talent.kind === 'upstage')) continue;
      const above = L.filter((x) => sways[x.id] > sways[w.id]).sort((a, b) => sways[a.id] - sways[b.id]);
      if (above.length) { const lowest = sways[above[0].id]; for (const x of above) if (sways[x.id] === lowest) { cuts[x.id] = (cuts[x.id] || 0) + 2; (cutBy[x.id] ||= []).push(w.id); } }
    }
    for (const id of Object.keys(cuts)) { sways[id] = Math.max(0, sways[id] - cuts[id]); encs[id].upstaged = cuts[id]; encs[id].upstagedBy = cutBy[id]; }
  }
  // Hindsight (private to her payout): baselines scored with the real encounter maths, and her own play and each baseline
  // scored with only what she knew, all placed against the real field with Upstage applied (see hindsightFor).
  const hind = {};
  for (const w of ws) if (!isNPC(s, w) && w.plan && Array.isArray(w.plan.baseline) && w.plan.baseline.length) hind[w.id] = hindsightFor(s, w, { hosts, byPlace, encs, raid });
  // rank and pay
  const pays = {};
  for (const pid of C.TIMELINES[tl].places) {
    const L = byPlace[pid] || []; if (!L.length) continue;
    const P = C.PLACES[pid]; const PR = R.places[P.kind];
    const qual = L.filter((w) => sways[w.id] >= PR.bar).sort((a, b) => sways[b.id] - sways[a.id]);
    const rankOf = {};
    for (const w of qual) rankOf[w.id] = qual.filter((x) => sways[x.id] > sways[w.id]).length;
    const winner = qual.find((w) => rankOf[w.id] === 0);
    const entries = [];
    for (const w of L) {
      const d = daily(s, w); const E = encs[w.id]; const enc = E.enc;
      const rank = rankOf[w.id] != null ? rankOf[w.id] : null;
      const fullPay = d.curtains < R.curtain.fullPayPerDay;
      let renown = 0; let coin = 0; let applause = 0;
      // Dead heat: the tied whores split the combined shares of the places they occupy, rounded up. No coin flips,
      // but drawing level is worth less than winning outright, so one more point of Sway still pays.
      const tied = rank !== null ? qual.filter((x) => rankOf[x.id] === rank).length : 0;
      const shareOf = (arr) => { let t = 0; for (let i = rank; i < rank + tied && i < 3; i++) t += arr[i]; return Math.ceil(t / tied); };
      if (rank !== null && rank < 3) {
        renown = shareOf(PR.renown);
        if (raid && P.kind === 'gutter' && !E.bribe) renown = Math.floor(renown / R.raidRenownDivisor);
        coin += shareOf(PR.coin);
      }
      if (rank === 0 && L.length >= 2) applause = Math.ceil((P.house.applause != null ? P.house.applause : PR.applause) / tied);
      if (rank === 0 && E.cards.some((c) => (C.CARDS[c].effects || []).includes('firstBonus'))) renown += R.wheelbarrowFirstBonus;
      renown += applause;
      if (!fullPay) renown = 0;
      coin += PR.doorGift;
      const playedIdx = new Set(w.plan.cards);
      w.hand.forEach((c, i) => { if (!playedIdx.has(i) && !isAffl(c)) coin += C.CARDS[c].pocket + (P.house.pocket || 0); });
      E.cards.forEach((c) => { const fx = C.CARDS[c].effects || []; if (fx.includes('coinOnWork1')) coin += 1; if (fx.includes('coinOnWork2')) coin += 2; });
      if (w.plan.stake && w.vice === 'gambler') { const gt = w.plan.stakeTerms || gamblerTerms(w); coin += rank === 0 ? gt.payout - gt.stake : -gt.stake; }
      coin -= w.hand.filter((c) => c === 'lodgers').length;
      if (w.vice === 'mothers-ruin') coin += 1;
      coin -= E.grease * E.per;
      if (E.bribe) coin -= R.raidBribe.cost;
      w.renown += renown; addCoin(w, coin);
      pays[w.id] = { renown, coin, rank, applause, fullPay };
      entries.push({ whore: w.id, rank, sway: rank !== null ? sways[w.id] : null, renown, trueSway: sways[w.id], upstaged: E.upstaged || 0, upstage: !!(w.plan.talent && w.plan.talent.kind === 'upstage'), fullPay });
      // meters: an After Hours Curtain pays only Coin, door gifts and History (rules-core §4.2), so it moves neither meter
      // and builds no Itch; letting time pass can't farm Standing or Notoriety (B-arcade review, finding 3)
      if (fullPay && enc.noto) raiseMeter(s, w, 'notoriety', enc.noto, 'curtain');
      if (P.kind === 'gutter') w.slummed = true;
      if (fullPay && P.kind === 'posh' && rank !== null && rank <= 1) raiseMeter(s, w, 'standing', 1, 'posh-placing');
      // brave face, history, discoveries
      w.braveFace = rank === null ? 1 : 0;
      afterEncounter(s, w, hosts[pid], E.cards, enc, rank !== null, null, E.tal, rank, pid);
      if (fullPay) itchAndCatch(s, w, hosts[pid], enc);
      if (E.item) consumeItem(s, w, E.item, 'curtain');
      if (E.tal && s.opts.talentOncePerDay) w.talentUsed = true; // spent until dawn (the default rule refreshes it below)
      if (rank !== 0 && winner) w.lastBeatenBy = winner.id;
      w.stats.placeVisits[pid] = (w.stats.placeVisits[pid] || 0) + 1;
      w.lastPlace = pid; w.places = [...w.places, pid].slice(-3);
      w.curtains++; d.curtains++;
      const outcome = rank === 0 ? 'delighted' : rank !== null ? 'satisfied' : 'fizzled';
      const rlines = (C.GENTS[hosts[pid]].reactions || {})[outcome] || null;
      const reaction = rlines && rlines.length ? rlines[nextReaction(w, hosts[pid]) % rlines.length] : null;
      emit(s, { type: 'payout', vis: priv(w), timeline: tl, whores: [w.id], gents: [hosts[pid]], data: { outcome, reaction, kinkHit: !!enc.kinkHit, place: pid, host: hosts[pid], rank, sway: sways[w.id], bar: PR.bar, renown, coin, applause, fullPay, breakdown: enc, upstaged: E.upstaged || 0, upstagedBy: E.upstagedBy || [], standingOrder: !!w.plan.standingOrder, raid: raid && P.kind === 'gutter', bribe: !!E.bribe,
        hindsight: hind[w.id] ? finishHindsight(hind[w.id], w.plan.place, { sway: sways[w.id], rank, renown, coin }) : null },
        text: rank === 0 ? `${w.name} takes 1st at ${P.short}! +${renown} Renown.` : rank !== null ? `${w.name} places ${rank + 1}${['st', 'nd', 'rd'][rank] || 'th'} at ${P.short}. +${renown} Renown.` : `${w.name} falls short of the Bar at ${P.short}. Door gift and a Brave Face.` });
    }
    if (winner) {
      T.lastCharmed[hosts[pid]] = { whore: winner.id, cards: encs[winner.id].cards, curtain: k };
      if (pid === 'tuppenny' && L.length >= 3) { const gag = C.GAGS.encore; if (!winner.collectibles.includes(gag.id)) winner.collectibles.push(gag.id); emit(s, { type: 'gag', timeline: tl, whores: [winner.id], data: { gag: gag.id, see: gag.see }, text: `${gag.name}: ${gag.punchline}` }); }
      emit(s, { type: 'delight', timeline: tl, whores: [winner.id], gents: [hosts[pid]], data: { curtain: true, place: pid }, text: `${winner.name} charmed ${C.GENTS[hosts[pid]].short} at ${P.short}.` });
    }
    entries.sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
    results.places.find((x) => x.place === pid).entries = entries;
  }
  // public report (Sway printed only for share-takers)
  const pub = clone(results); for (const pr of pub.places) for (const e of pr.entries) delete e.trueSway;
  emit(s, { type: 'curtain', timeline: tl, whores: ws.map((w) => w.id), data: pub, text: `The Curtain falls on ${C.TIMELINES[tl].short}.` });
  if (raid) emit(s, { type: 'raid', timeline: tl, data: { place: results.raid }, text: `RAID NIGHT: ${C.TIMELINES[tl].raidSquad} descend on ${C.PLACES[results.raid].short}. Renown halved; Coin, curiously, unaffected.` });
  if (standingOrders.length) for (const id of standingOrders) {
    const w = s.whores[id]; const pr = results.places.find((x) => x.place === w.plan.place); const win = pr.entries.find((e) => e.rank === 0);
    emit(s, { type: 'standing-order', vis: priv(w), timeline: tl, whores: [id], data: { place: w.plan.place, host: pr.host, sway: sways[id], winner: win ? win.whore : null, winnerName: win ? s.whores[win.whore].name : null, crowd: pr.entries.length, ...pays[id] }, text: `Standing Order: ${w.name} went to ${C.PLACES[w.plan.place].short} without you.` });
  }
  // Duels
  for (const du of duels) resolveDuel(s, T, du, sways, pays);
  T.challenges = [];
  // housekeeping
  for (const w of ws) {
    if (w.itchCycle === 0) w.itch = Math.max(0, w.itch - 1);
    w.itchCycle = 0;
    w.discard.push(...w.hand); w.hand = [];
    w.plan = null; if (!s.opts.talentOncePerDay) w.talentUsed = false; w.lentHold = null;
    deal(s, w);
    checkPromotion(s, w);
  }
  T.sways = Object.fromEntries(Object.entries(sways));
  T.results = pub; T.resultsHistory = [pub, ...T.resultsHistory].slice(0, 3);
  RESOLVING = null;
  T.curtainNo++; T.lastCurtainAt = s.clock; T.hostOverride = null;
  T.freshStall = pick(s, C.TIMELINES[tl].places);
  emit(s, { type: 'fresh-stall', timeline: tl, data: { place: T.freshStall, items: C.PLACES[T.freshStall].stall }, text: `Fresh stock behind ${C.PLACES[T.freshStall].short}.` });
  // overtakes and habit changes
  const after = whoresIn(s, tl).map((w) => ({ id: w.id, renown: w.renown })).sort((a, b) => b.renown - a.renown);
  const posB = Object.fromEntries(tableBefore.map((x, i) => [x.id, i])); const posA = Object.fromEntries(after.map((x, i) => [x.id, i]));
  for (const me of ws) {
    if (isNPC(s, me)) continue;
    for (const r of ws) if (r.id !== me.id && posB[r.id] > posB[me.id] && posA[r.id] < posA[me.id]) emit(s, { type: 'overtaken', vis: priv(me), timeline: tl, whores: [me.id, r.id], data: { rival: r.id }, text: `PIPPED: ${r.name} edges past ${me.name} on the ${C.TIMELINES[tl].short} table.` });
  }
  for (const r of ws) {
    if (r.places.length < 3) continue;
    // she followed the human by script in one of these Curtains: not a change of habit
    if (s.opts.scriptRival && C.CHARACTERS[r.char].role === 'rival' && (s.opts.scriptCurtains == null || (s.opts.scriptPerWhore ? r.lastScripted != null && r.lastScripted >= T.curtainNo - 3 : T.curtainNo - 3 < s.opts.scriptCurtains))) continue;
    const prev = r.places.slice(0, -1); const now = r.places[r.places.length - 1];
    if (prev.every((p) => p === prev[0]) && now !== prev[0]) emit(s, { type: 'habit-changed', timeline: tl, whores: [r.id], data: { place: now }, text: `CHANGE OF HABIT: ${r.name} seen at ${C.PLACES[now].short}. Most irregular.` });
  }
  T.table = after;
  const gi = drawGossip(s, T, rnd(s));
  emit(s, { type: 'gossip', timeline: tl, data: { line: gi }, text: C.GOSSIP[tl][gi] });
  for (const w of ws) checkUnlocks(s, w);
  return s;
}

// The district gossip line, from a shuffle bag kept in state (round 4, humour audit): every line once before any repeats,
// and a fresh bag never opens with the line that closed the last one. Exactly one rnd() per Curtain, as the old
// `rint` draw consumed, so every seeded game keeps its RNG stream; the roll seeds the bag's own shuffle when it refills.
function drawGossip(s, T, roll) {
  const n = C.GOSSIP[T.id].length;
  if (!Array.isArray(T.gossipBag) || !T.gossipBag.length || T.gossipBag.some((i) => i >= n)) {
    const bag = Array.from({ length: n }, (_, i) => i);
    let a = roll >>> 0 || 1;
    const r = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return (t ^ (t >>> 14)) >>> 0; };
    for (let i = n - 1; i > 0; i--) { const j = r() % (i + 1); const x = bag[i]; bag[i] = bag[j]; bag[j] = x; }
    // the bag is drawn from the end: never open a new bag with the line that ended the last
    if (n > 1 && bag[n - 1] === T.gossipLast) { const x = bag[n - 1]; bag[n - 1] = bag[0]; bag[0] = x; }
    T.gossipBag = bag;
  }
  const i = T.gossipBag.pop();
  T.gossipLast = i;
  return i;
}

function resolveDuel(s, T, du, sways, pays) {
  const st = T.seats[du.seat]; const ch = s.whores[du.challenger]; const S = { ...C.SEATS[du.seat], name: seatName(du.seat, T.id) };
  let won;
  if (!du.holder) won = pays[ch.id] && pays[ch.id].rank === 0;
  else won = (sways[ch.id] || 0) > (sways[du.holder] || 0) + R.seats.holderBonus;
  if (won) {
    if (du.holder) { const h = s.whores[du.holder]; h.seat = null; emit(s, { type: 'seat-lost', timeline: T.id, whores: [h.id, ch.id], data: { seat: du.seat }, text: `TOPPLED: ${h.name} loses ${S.name} to ${ch.name}. The chair is still warm.` }); checkPromotion(s, h); }
    if (ch.seat && du.seat === 'crown') { const old = ch.seat; T.seats[old].holder = null; T.seats[old].since = null; }
    ch.seat = du.seat; st.holder = ch.id; st.since = s.clock; st.graceUntil = T.curtainNo + 1;
    emit(s, { type: 'seat-won', timeline: T.id, whores: du.holder ? [ch.id, du.holder] : [ch.id], data: { seat: du.seat }, text: `CROWNED: ${ch.name} takes ${S.name}. ${(C.DIGEST.crowned && C.DIGEST.crowned[T.id]) || ''}`.trim() });
    checkPromotion(s, ch);
  } else {
    ch.failed[du.seat] = dayOf(s.clock) + R.seats.failedWaitDays - 1;
    if (du.holder) { st.graceUntil = T.curtainNo + 1 + R.seats.defenceGraceCurtains; const h = s.whores[du.holder]; emit(s, { type: 'seat-defended', timeline: T.id, whores: [h.id, ch.id], data: { seat: du.seat }, text: `SEE YOU LATER, PRETENDER: ${h.name} keeps ${S.name} against ${ch.name}.` }); }
    else emit(s, { type: 'seat-missed', vis: priv(ch), timeline: T.id, whores: [ch.id], data: { seat: du.seat }, text: `${ch.name} missed the empty ${S.name}. Another night.` });
  }
}

// ---------------------------------------------------------------------------
// Whorescore and the boards
// ---------------------------------------------------------------------------
function whorescoreM(s, accountId) {
  const acct = s.accounts[accountId];
  const per = acct.whores.map((id) => s.whores[id]).map((w) => {
    const best = maxTier(w.best, TIER_ORDER[tierOf(w)] <= TIER_ORDER.epic ? tierOf(w) : w.best);
    // a whore scores for the best result she HELD: none until her first result (a Curtain played or Renown earned),
    // so merely opening a Timeline is worth nothing (depth beats breadth)
    const played = w.curtains > 0 || w.renown > 0 || !!w.seat;
    return { whore: w.id, name: w.name, timeline: w.timeline, best, points: played ? R.whorescore[best] : 0 };
  }).sort((a, b) => b.points - a.points || (a.whore < b.whore ? -1 : 1));
  let season = 0;
  per.forEach((p, i) => { p.counted = i < R.whorescore.fullCount ? p.points : Math.floor(p.points / 2); season += p.counted; });
  return { total: acct.pastWhorescore + season, past: acct.pastWhorescore, season, perWhore: per };
}
export function whorescore(state, accountId) { return whorescoreM(state, accountId); }

export function leaderboards(state) {
  const s = state;
  // valueFn returns a number, or [best, second] for the road boards (ranked by the best single whore, the second whore
  // breaking ties: depth beats breadth, round 5 finding 5); total Renown breaks any tie left
  const rowsFor = (valueFn) => {
    const rows = Object.values(s.accounts).filter((a) => a.kind !== 'automaton').map((a) => {
      const v = valueFn(a); const [value, second] = Array.isArray(v) ? v : [v, 0];
      return {
      account: a.id, name: a.name, kind: a.kind, value, second, tiebreak: a.whores.reduce((t, id) => t + s.whores[id].renown, 0),
      whores: a.whores.map((id) => s.whores[id]).filter((w) => !w.retired).map((w) => ({ id: w.id, name: w.name, timeline: w.timeline, timelineName: C.TIMELINES[w.timeline].short, tier: tierOf(w), title: eraTitle(w.timeline, tierOf(w), routeOf(w)), art: C.CHARACTERS[w.char].art, seat: w.seat,
        coinEarned: w.coinEarned, peakStanding: w.peakStanding, peakNotoriety: w.peakNotoriety })),
      };
    });
    rows.sort((x, y) => y.value - x.value || y.second - x.second || y.tiebreak - x.tiebreak || (x.account < y.account ? -1 : 1));
    rows.forEach((r, i) => { r.rank = i + 1; });
    return rows;
  };
  const ws = (a) => a.whores.map((id) => s.whores[id]);
  const top2 = (xs) => { const v = [...xs].sort((x, y) => y - x); return [v[0] || 0, v[1] || 0]; };
  return {
    whorescore: rowsFor((a) => whorescoreM(s, a.id).total),
    richest: rowsFor((a) => top2(ws(a).map((w) => w.coinEarned))),
    notorious: rowsFor((a) => top2(ws(a).map((w) => w.peakNotoriety))),
    respectable: rowsFor((a) => top2(ws(a).map((w) => w.peakStanding))),
    automatons: Object.values(s.accounts).filter((a) => a.kind === 'automaton').map((a) => ({ account: a.id, name: a.name, kind: a.kind, label: 'AUTOMATON',
      whores: ws(a).map((w) => ({ id: w.id, name: w.name, timeline: w.timeline, tier: tierOf(w), title: eraTitle(w.timeline, tierOf(w), routeOf(w)), renown: w.renown, coinEarned: w.coinEarned, art: C.CHARACTERS[w.char].art })) })),
  };
}
/** publicProfile(state, viewerAccountId, whoreId) — what anyone may see; Talent and Vice only once Studied. */
export function publicProfile(state, viewerAccountId, whoreId) {
  const s = state; const w = s.whores[whoreId]; if (!w) fail('no-whore', 'No such whore');
  const viewerW = viewerAccountId ? s.accounts[viewerAccountId].whores.map((id) => s.whores[id]).find((x) => x.timeline === w.timeline) : null;
  const pub = publicWhore(s, viewerW || null, w, false);
  const T = s.timelines[w.timeline];
  const last3 = T.resultsHistory.map((r) => { for (const pr of r.places) for (const e of pr.entries) if (e.whore === whoreId) return { curtain: r.curtain, place: pr.place, rank: e.rank }; return null; }).filter(Boolean);
  return { ...pub, ch: { look: C.CHARACTERS[w.char].look, voice: C.CHARACTERS[w.char].voice, temperamentText: C.CHARACTERS[w.char].temperamentText },
    charmInfo: C.CHARMS[w.charm], talentInfo: pub.talent ? C.TALENTS[pub.talent] : null, viceInfo: pub.vice ? C.VICES[pub.vice] : null,
    lastResults: last3, collectibles: [...w.collectibles], frontPage: w.frontPage, hall: [] };
}

// ---------------------------------------------------------------------------
// While You Were Away: digest ranked by relevance to YOU
// ---------------------------------------------------------------------------
function fill(tpl, vars) { return tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : '')); }
/**
 * awayDigest(state, who, sinceTick, opts) — who = accountId (all your Timelines) or whoreId (that Timeline only).
 * Returns { headlines: [{ type, text, relevance, detail, events, timeline }] } with 1..5 headlines, best first.
 * opts.tonight (opt-in): also rank a TONIGHT line (her best matchup at the next Curtain, `place` set) and LAST CALL for
 *   each of your whores who has not sealed, so the digest always says what matters on return.
 */
export function awayDigest(state, who, sinceTick = 0, opts = {}) {
  const s = state; let acct; let onlyTl = opts.timeline || null;
  if (s.whores[who]) { acct = s.accounts[s.whores[who].account]; onlyTl = onlyTl || s.whores[who].timeline; } else acct = s.accounts[who];
  if (!acct) fail('no-such', 'No such account');
  const D = C.DIGEST; const W = D.weights; const RD = R.digest;
  const mine = acct.whores.map((id) => s.whores[id]).filter((w) => !w.retired && (!onlyTl || w.timeline === onlyTl));
  const mineIds = new Set(acct.whores);
  const myByTl = Object.fromEntries(mine.map((w) => [w.timeline, w]));
  const cands = [];
  const visible = s.log.filter((e) => e.id > sinceTick && (e.vis === 'all' || e.vis.includes(acct.id)) && (!onlyTl || e.timeline === onlyTl));
  const curNow = (tl) => (s.timelines[tl] ? s.timelines[tl].curtainNo : 0);
  const relevance = (base, e, me, extra = {}) => {
    let r = base * 100;
    const names = (e.whores || []).some((id) => mineIds.has(id)) || (me && (e.gents || []).some((g) => me.history[g] && me.history[g].regular > 0));
    if (names || extra.mine) r = Math.floor((r * RD.selfPct) / 100);
    if (me && me.lastBeatenBy && (e.whores || []).includes(me.lastBeatenBy)) r = Math.floor((r * RD.nemesisPct) / 100);
    const age = Math.max(0, curNow(e.timeline) - (e.curtain != null ? e.curtain : curNow(e.timeline)) - (e.atCurtain ? 1 : 0));
    for (let i = 0; i < Math.min(age, 40); i++) r = Math.floor((r * RD.decayPct) / 100);
    return r;
  };
  const name = (id) => (s.whores[id] ? s.whores[id].name : '');
  for (const e of visible) {
    // account-level news (e.g. the telegram for a Timeline you have not opened yet) is read through the whore it names
    const me = myByTl[e.timeline] || (!onlyTl ? (e.whores || []).map((id) => (mineIds.has(id) ? s.whores[id] : null)).find(Boolean) : null)
      || (onlyTl && e.type === 'timeline-unlocked' && e.timeline === onlyTl ? mine[0] || s.whores[(e.whores || [])[0]] : null);
    if (!me) continue;
    let type = null; let vars = {}; let subject = e.id; let base = 0;
    switch (e.type) {
      case 'seat-challenged': case 'seat-won': case 'seat-lost': case 'seat-defended': case 'seat-missed': {
        // e.whores is positional: challenged [challenger, holder?], won [winner, old holder?], lost [loser, winner],
        // defended [holder, challenger], missed [challenger]. Headlines are told from YOUR whore's side.
        const ws = e.whores || []; const first = mineIds.has(ws[0]); const second = ws.length > 1 && mineIds.has(ws[1]);
        if (!first && !second) { type = 'gossip'; base = W.gossip; vars = { text: e.text }; break; }
        if (e.type === 'seat-challenged') type = second ? 'seat-challenged' : e.data.holder ? 'seat-challenging' : 'seat-bid';
        else if (e.type === 'seat-defended') type = first ? 'seat-defended' : 'seat-repelled';
        else if (e.type === 'seat-won' || e.type === 'seat-lost') type = first ? e.type : null; // a topple is told once, by the event that names you first
        else type = 'seat-missed';
        if (!type) break;
        base = W[type]; subject = `${type}:${e.data.seat}`;
        vars = { whore: name(first ? ws[0] : ws[1]), rival: name(first ? ws[1] : ws[0]), seat: seatName(e.data.seat, e.timeline) };
        break;
      }
      case 'promoted': if (mineIds.has(e.whores[0])) { type = 'promoted'; base = W.promoted; vars = { whore: name(e.whores[0]), title: e.data.title }; subject = `promoted:${e.whores[0]}`; } break;
      case 'timeline-unlocked': type = 'timeline-unlocked'; base = W['timeline-unlocked']; vars = { timeline: C.TIMELINES[e.data.invite || e.timeline].name }; subject = 'unlock'; break;
      case 'payout': if (mineIds.has(e.whores[0]) && !e.data.standingOrder && D.templates['curtain-result']) {
        const lab = e.data.rank === 0 ? '1st' : e.data.rank === 1 ? '2nd' : e.data.rank === 2 ? '3rd' : null;
        type = 'curtain-result'; base = W['curtain-result'] || W['standing-order']; subject = `cr:${e.whores[0]}:${e.curtain}`;
        vars = { whore: name(e.whores[0]), place: C.PLACES[e.data.place].short, placing: lab ? `took ${lab}` : 'fell short of the Bar', renown: e.data.renown || 0, host: C.GENTS[e.data.host] ? C.GENTS[e.data.host].short : '',
          // never "+0 Renown" (B-arcade finding 7)
          tail: e.data.renown ? `+${e.data.renown} Renown.` : e.data.fullPay === false ? 'After Hours: door gift only.' : 'Door gift only.' };
      } break;
      case 'standing-order': type = 'standing-order'; base = W['standing-order']; subject = `so:${e.timeline}`; vars = { whore: name(e.whores[0]), data: e.data }; break;
      case 'overtaken': type = 'overtaken'; base = W.overtaken; subject = `ov:${e.data.rival}`; vars = { rival: name(e.data.rival), whore: name(e.whores[0]), timeline: C.TIMELINES[e.timeline].short }; break;
      case 'delight': {
        const g = (e.gents || [])[0]; const by = e.whores[0];
        if (!mineIds.has(by) && g && me.history[g] && me.history[g].regular > 0) { type = 'rival-delighted-regular'; base = W['rival-delighted-regular']; subject = `rd:${by}:${g}`; vars = { rival: name(by), gent: C.GENTS[g].short }; }
        break;
      }
      case 'fresh-stall': {
        const forKnown = e.data.items.find((iid) => C.ITEMS[iid].kinkFor && (me.known.gents[C.ITEMS[iid].kinkFor] || {}).kink);
        if (forKnown && e.curtain === curNow(e.timeline)) { type = 'fresh-stall-kink'; base = W['fresh-stall-kink']; subject = `fs:${e.timeline}`; vars = { gent: C.GENTS[C.ITEMS[forKnown].kinkFor].short, place: C.PLACES[e.data.place].short }; }
        break;
      }
      case 'raid': if (me.places.includes(e.data.place)) { type = 'raid'; base = W.raid; subject = `raid:${e.curtain}`; vars = { raidSquad: C.TIMELINES[e.timeline].raidSquad, place: C.PLACES[e.data.place].short }; } break;
      case 'habit-changed': if (!mineIds.has(e.whores[0]) && (me.known.rivals[e.whores[0]] || {}).habit) { type = 'habit-changed'; base = W['habit-changed']; subject = `hc:${e.whores[0]}`; vars = { rival: name(e.whores[0]), place: C.PLACES[e.data.place].short }; } break;
      case 'catch': {
        const g = (e.gents || [])[0];
        if (!mineIds.has(e.whores[0]) && g && me.frolicked[g]) { type = 'caught-from-yours'; base = W['caught-from-yours']; subject = `cf:${e.whores[0]}:${g}`; vars = { rival: name(e.whores[0]), gent: C.GENTS[g].short, affliction: C.AFFLICTIONS[e.data.affliction].name }; }
        else if (!mineIds.has(e.whores[0])) { type = 'gossip'; base = W.gossip; vars = { text: e.text }; }
        break;
      }
      case 'gossip': type = 'gossip'; base = W.gossip; vars = { text: e.text }; break;
      case 'gag': if (!mineIds.has((e.whores || [])[0])) { type = 'gag'; base = W.gag; vars = { text: e.text }; } break;
      case 'society-pages': type = mineIds.has(e.whores[0]) ? 'society-pages' : 'gossip'; base = mineIds.has(e.whores[0]) ? 80 : W['society-pages']; vars = type === 'gossip' ? { text: e.text } : { whore: name(e.whores[0]), timeline: C.TIMELINES[e.timeline].short }; break;
      case 'milestone': if (mineIds.has(e.whores[0])) { type = 'milestone'; base = W.milestone; vars = { whore: name(e.whores[0]), title: e.data.title }; subject = `ms:${e.whores[0]}`; } break;
      case 'patron': if (mineIds.has(e.whores[0])) { type = 'patron'; base = W.patron; vars = { whore: name(e.whores[0]), n: e.data.coin }; subject = `patron:${e.whores[0]}`; } break;
      case 'front-page': type = mineIds.has(e.whores[0]) ? 'front-page' : 'gossip'; base = mineIds.has(e.whores[0]) ? 80 : W['front-page']; vars = type === 'gossip' ? { text: e.text } : { whore: name(e.whores[0]), timeline: C.TIMELINES[e.timeline].short }; break;
      default: break;
    }
    if (!type) continue;
    cands.push({ type, subject, base, vars, rel: relevance(base, e, me), events: [e.id], timeline: e.timeline, event: e });
  }
  // synthesized: rota tip. A gentleman whose Fancy is your Type hosts a Place in the next 3 Curtains, and it is worth your while:
  // the door is open, it is not Raid Night there, it fits your route (while Standing >= Notoriety no Gutter tips; while Notoriety
  // leads no Posh tips) and Best Guess with your hand scores at least 2 smileys against him there.
  for (const me of mine) {
    const rota = rotaView(s, me.timeline, 4).slice(1);
    const v = getView(s, me.id);
    const standingRoute = me.standing >= me.notoriety;
    let tip = null;
    // only Curtains she still has full pay for (rota[i] is the (i+1)th Curtain from now): no tips for After Hours nights
    const payLeft = v.whore.daily.fullPayLeft;
    for (const [ri, r] of rota.entries()) {
      if (ri + 1 >= payLeft) break;
      for (const [pid, gid] of Object.entries(r.hosts)) {
        if (C.GENTS[gid].fancy !== me.type || !placeOpenFor(me, pid) || r.raid === pid) continue;
        const kind = placeKindOf(pid);
        if ((standingRoute && kind === 'gutter') || (!standingRoute && kind === 'posh')) continue;
        const vf = { ...v, timeline: { ...v.timeline, rota: [{ ...v.timeline.rota[0], hosts: { ...r.hosts }, raid: r.raid }, ...v.timeline.rota.slice(1)] } };
        if (smileys(vf, pid) < 2) continue;
        tip = { r, pid, gid }; break;
      }
      if (tip) break;
    }
    if (tip) cands.push({ type: 'rota-fancy', subject: `rota:${me.timeline}`, base: W['rota-fancy'], vars: { gent: C.GENTS[tip.gid].short, place: C.PLACES[tip.pid].short, curtain: tip.r.curtain + 1, pick: tip.r.curtain + C.TIMELINES[me.timeline].gents.indexOf(tip.gid) }, rel: Math.floor((W['rota-fancy'] * 100 * RD.selfPct) / 100), events: [], timeline: me.timeline, tip: true });
  }
  // synthesized (opts.tonight, opt-in): what matters on return, for each of your whores who has not sealed. Tonight's best
  // matchup on rota[0] (her ready Kink novelty's host first, then the most smileys, a Regular breaking ties), raised when she
  // carries his novelty or is his Regular; and LAST CALL when her Curtain is due. Same voice as the logged headlines.
  if (opts.tonight) for (const me of mine) {
    if (me.plan && me.plan.sealed) continue;
    const v = getView(s, me.id); const hosts = v.timeline.rota[0].hosts;
    let pick = null;
    for (const p of v.timeline.places) {
      if (!p.open) continue;
      const gid = hosts[p.id]; const o = placeOutlook(v, p.id); const b = placeBoost(v, p.id);
      const kit = v.whore.items.find((it) => it.ready && it.kind === 'kink' && (it.kinkFor || it.tellOf) === gid) || null;
      const reg = !!(me.history[gid] && me.history[gid].regular > 0);
      const sm = Math.max(o.smileys, b && b.item ? b.smileys : 0);
      // round 6 (finding 3): a declared road steers the pick. Her road's own kind of Place gets a nudge, and the other
      // paper's (Posh for the Police Gazette, Gutter for the Society Pages) is a last resort unless she carries his Kink.
      const kind = placeKindOf(p.id);
      const onRoad = (me.road === 'notoriety' && kind === 'gutter') || (me.road === 'standing' && kind === 'posh');
      const offRoad = (me.road === 'notoriety' && kind === 'posh') || (me.road === 'standing' && kind === 'gutter');
      const key = (kit ? 1000 : 0) + sm * 10 + (reg ? 5 : 0) + (onRoad ? 5 : 0) - (offRoad ? 100 : 0);
      if (!pick || key > pick.key) pick = { key, pid: p.id, gid, sm, kit, reg };
    }
    if (!pick) continue;
    const due = s.timelines[me.timeline].lastCurtainAt + s.opts.maxGapMin - s.clock;
    const last = due <= 1;
    const type = last ? 'last-call' : 'tonight';
    const base = last ? W['last-call'] : pick.kit ? W['tonight-kink'] : pick.reg ? W['tonight-regular'] : W.tonight;
    if (!base) continue;
    const when = last ? '' : `Curtain ${C.LINES.curtainWhen[curtainWhen(due)]}.`;
    const extra = pick.kit ? `You carry his ${pick.kit.name.replace(/^the /i, '')}. ` : pick.reg ? 'You are his Regular. ' : '';
    cands.push({ type, subject: `tonight:${me.id}`, base, vars: { whore: me.name, gent: C.GENTS[pick.gid].short, place: C.PLACES[pick.pid].short, mood: C.LINES.smileys[pick.sm], extra, when },
      rel: Math.floor((base * 100 * RD.selfPct) / 100), events: [], timeline: me.timeline, tip: true, place: pick.pid });
  }
  // your own challenge is only a reminder while it is pending: drop it once its Duel has been decided
  const decided = new Set(cands.filter((c) => /^seat-(won|lost|repelled|missed)$/.test(c.type)).map((c) => `${c.event.data.seat}:${c.event.curtain}`));
  const pending = (c) => (c.type === 'seat-challenging' || c.type === 'seat-bid') && decided.has(`${c.event.data.seat}:${c.event.curtain}`);
  // collapse duplicates (same type + subject)
  const groups = new Map();
  for (const c of cands.filter((x) => !pending(x))) {
    // at most one headline per template: district gossip and overheard gags collapse into one line each
    // ... and at most one POACHER line (B-arcade finding 7)
    const key = c.type === 'gossip' || c.type === 'gag' || c.type === 'rival-delighted-regular' ? c.type : `${c.type}:${c.subject}`;
    const g = groups.get(key);
    if (!g) groups.set(key, { ...c, events: [...c.events], members: [c] });
    else {
      g.members.push(c); g.events.push(...c.events);
      if (c.rel > g.rel || (c.rel === g.rel && (c.type === 'gossip' || c.type === 'gag'))) { g.rel = c.rel; if (c.type === 'gossip' || c.type === 'gag') { g.vars = c.vars; g.event = c.event; } }
    }
  }
  const items = [...groups.values()].map((g) => {
    let vars = g.vars;
    if (g.type === 'standing-order') {
      const ds = g.members.map((m) => m.vars.data);
      const label = (d) => (d.rank === 0 ? '1st' : d.rank === 1 ? '2nd' : d.rank === 2 ? '3rd' : 'door gift');
      vars = { ...g.vars, n: ds.length, times: ds.length === 1 ? 'once' : ds.length === 2 ? 'twice' : `${ds.length} times`, list: ds.map(label).join(', '), renown: ds.reduce((t, d) => t + (d.renown || 0), 0) };
      // never "+0 Renown": After Hours nights say so, and a night with no share says what it did pay
      if (ds.every((d) => d.fullPay === false) && D.templates['standing-order-after']) g.tpl = D.templates['standing-order-after'];
      else if (!vars.renown && D.templates['standing-order-none']) g.tpl = D.templates['standing-order-none'];
      // the detail names each night: Place, host, how she did and who won
      g.detail = ds.map((d) => {
        const P = C.PLACES[d.place]; const host = d.host && C.GENTS[d.host] ? ` (host ${C.GENTS[d.host].short})` : '';
        const how = d.rank === 0 ? 'took 1st' : d.rank != null ? `came ${label(d)}${d.winnerName ? `, behind ${d.winnerName}` : ''}` : `fell short${d.winnerName ? `; ${d.winnerName} won` : ''}`;
        return `${P ? P.short : d.place}${host}: ${how}${d.sway != null ? ` with ${d.sway} Sway` : ''}. ${d.fullPay === false ? 'After Hours: door gift only.' : `+${d.renown || 0} Renown.`}`;
      }).join(' ');
    }
    let tpl = g.tpl || D.templates[g.type] || '{text}';
    // each Timeline sends its own telegram (B-arcade finding 7)
    if (g.type === 'timeline-unlocked' && D.telegrams && g.event && D.telegrams[(g.event.data && g.event.data.invite) || g.event.timeline]) tpl = D.telegrams[(g.event.data && g.event.data.invite) || g.event.timeline];
    const gagNames = g.type === 'gag' ? [...new Set(g.members.map((m) => (m.event.whores || [])[0]).filter(Boolean))].map(name) : [];
    if (gagNames.length > 1) {
      const N = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'][gagNames.length] || String(gagNames.length);
      tpl = D.templates['gag-many'] || tpl; vars = { ...vars, n: N, list: list(gagNames) };
    }
    if (g.type === 'rota-fancy' && D.rotaTemplates && D.rotaTemplates.length) tpl = D.rotaTemplates[g.vars.pick % D.rotaTemplates.length];
    // round 6 (finding 17): shared templates end on their own era's punchline ({eratail}), never a Victorian prop in Vegas
    { const tl = g.timeline || (g.event && g.event.timeline); const et = D.eraTails && D.eraTails[g.type]; if (et) vars = { ...vars, eratail: (tl && et[tl]) || et.victorian }; }
    return { type: g.type, text: fill(tpl, vars), relevance: Math.floor(g.rel / 100), _rel: g.rel, ...(g.place ? { place: g.place } : {}), detail: g.detail || D.details[g.type] || (g.type === 'gag' && g.event && g.event.data && g.event.data.see) || (g.event ? g.event.text : ''), events: g.events, timeline: g.timeline, count: g.members.length };
  });
  items.sort((a, b) => b._rel - a._rel || (a.events[0] || 0) - (b.events[0] || 0));
  const threshold = RD.threshold * 100;
  let shown = items.filter((x) => x._rel >= threshold).slice(0, RD.max);
  if (shown.length < RD.topUpTo) {
    const extra = items.filter((x) => x._rel < threshold && (x.type === 'gossip' || x.type === 'gag')).slice(0, RD.topUpTo - shown.length);
    shown = [...shown, ...extra];
  }
  if (!shown.length) shown = [{ type: 'nothing', text: D.templates.nothing, relevance: 0, _rel: 0, detail: '', events: [], timeline: onlyTl, count: 0 }];
  return { headlines: shown.map(({ _rel, ...x }) => x), considered: items.length, sinceTick };
}
function markSeenM(s, accountId, tl) { const a = s.accounts[accountId]; if (!a) fail('no-account', 'No such account'); a.seen[tl || 'all'] = s.tick; return s; }

// ---------------------------------------------------------------------------
// legalActions(state, who) — what the UI can offer right now (whoreId or accountId)
// ---------------------------------------------------------------------------
export function legalActions(state, who) {
  const s = state; const out = [];
  const acct = s.whores[who] ? s.accounts[s.whores[who].account] : s.accounts[who];
  if (!acct) fail('no-such', 'No such account or whore');
  const summary = accountSummary(s, acct);
  for (const c of summary.canOpen) out.push({ type: acct.whores.length ? 'openTimeline' : 'chooseStarter', character: c, timeline: C.CHARACTERS[c].timeline });
  const w = s.whores[who] || (acct.whores.length ? s.whores[acct.whores[0]] : null);
  if (!w) return out;
  const v = getView(s, w.id);
  const T = s.timelines[w.timeline];
  if (!(w.plan && w.plan.sealed)) {
    for (const p of v.timeline.places) if (p.open) out.push({ type: 'planEvening', place: p.id, smileys: smileys(v, p.id), slumming: p.kind === 'gutter' && !w.slummed });
  }
  if (w.plan && !w.plan.sealed) out.push({ type: 'sealPlan' });
  if (w.plan && w.plan.sealed) out.push({ type: 'unseal' });
  if (!talentSpent(s, w) && (w.talent === 'quick-change' || w.talent === 'read-the-room') && !(w.plan && w.plan.sealed)) out.push({ type: 'useTalent', kind: w.talent });
  if (w.assignation) out.push({ type: 'playAssignation', gent: w.assignation.gent }, { type: 'cancelAssignation' });
  else for (const b of v.board) if (!b.refused) out.push({ type: 'startAssignation', gent: b.gent, bar: b.bar, tourist: b.tourist, backAlley: b.backAlley });
  const studyCost = v.whore.daily.freeStudiesLeft > 0 ? 0 : R.study.extraCost;
  for (const g of v.timeline.gents) if (!(g.known.secret && g.known.kink && g.known.history) && w.coin >= studyCost) out.push({ type: 'study', target: g.id, cost: studyCost });
  for (const r of v.timeline.rivals) if (!(r.known.habit && r.known.vice && r.known.last) && w.coin >= studyCost) out.push({ type: 'study', target: r.id, cost: studyCost });
  for (const p of C.TIMELINES[w.timeline].places) out.push({ type: 'explore', place: p, fresh: v.whore.daily.freshRummagesLeft > 0, freshStall: T.freshStall === p });
  if (w.offer) { if (w.coin >= w.offer.price && w.items.length < R.reticule) out.push({ type: 'buyOffer', item: w.offer.item, price: w.offer.price }); out.push({ type: 'passOffer' }); }
  for (const c of C.TIMELINES[w.timeline].market) if (w.coin >= C.CARDS[c].cost) out.push({ type: 'buyCard', card: c, cost: C.CARDS[c].cost });
  if (!v.timeline.special.why && w.coin >= v.timeline.special.price && w.items.length < R.reticule) out.push({ type: 'buySpecial', item: v.timeline.special.item.id, price: v.timeline.special.price });
  if (v.whore.digsNext && w.coin >= v.whore.digsNext.rung.cost) out.push({ type: 'buyDigs', road: v.whore.digsNext.road, rung: v.whore.digsNext.rung.id, cost: v.whore.digsNext.rung.cost });
  for (const aid of new Set([...w.hand, ...w.draw, ...w.discard].filter(isAffl))) if (w.coin >= C.AFFLICTIONS[aid].cure.cost) out.push({ type: 'cure', affliction: aid, cost: C.AFFLICTIONS[aid].cure.cost });
  if (w.gossip > 0) for (const r of v.timeline.rivals) out.push({ type: 'spendGossip', rival: r.id });
  for (const k of v.whore.challengeable) out.push({ type: 'challengeSeat', seat: k });
  for (const x of acct.whores) if (x !== w.id && !s.whores[x].retired) out.push({ type: 'switchTimeline', whore: x, timeline: s.whores[x].timeline });
  return out;
}

// ---------------------------------------------------------------------------
// Season end (banks Whorescore; renown resets; meters halve)
// ---------------------------------------------------------------------------
function endSeasonM(s) {
  syncDay(s);
  for (const T of Object.values(s.timelines)) for (const st of Object.values(T.seats)) if (st.holder) { const w = s.whores[st.holder]; w.best = maxTier(w.best, C.SEATS[st.id].tier); }
  const banked = {};
  for (const a of Object.values(s.accounts)) { const ws = whorescoreM(s, a.id); banked[a.id] = ws.season; a.pastWhorescore += ws.season; }
  for (const w of Object.values(s.whores)) {
    w.renown = 0; w.standing = Math.floor(w.standing / 2); w.notoriety = Math.floor(w.notoriety / 2);
    w.peakStanding = w.standing; w.peakNotoriety = w.notoriety; w.coinEarned = 0; w.best = 'common'; w.tier = 'common'; w.seat = null;
    w.history = {}; w.known = { gents: {}, rivals: {} }; w.frontPage = false; w.societyPages = false; w.milestone = 0; w.itch = 0;
    if (w.charm === 'old-flame') hist(w, C.TIMELINES[w.timeline].gents[0]).regular = 1;
  }
  for (const T of Object.values(s.timelines)) { for (const st of Object.values(T.seats)) { st.holder = null; st.since = null; st.graceUntil = 0; } T.challenges = []; T.lastCharmed = {}; }
  s.season++;
  emit(s, { type: 'season-end', data: { banked }, text: `Season ${s.season - 1} closes. The Hall hangs new portraits.` });
  return s;
}

// ---------------------------------------------------------------------------
// Public pure API (copy, act, return) and the in-place `mut` API for sims
// ---------------------------------------------------------------------------
function pure(fn) {
  return (state, ...args) => { const s = clone(state); s._ev = []; fn(s, ...args); s.lastEvents = s._ev; delete s._ev; return s; };
}
function inPlace(fn) {
  return (state, ...args) => { state._ev = []; fn(state, ...args); state.lastEvents = state._ev; delete state._ev; return state; };
}
const CORE = {
  chooseStarter: chooseStarterM,
  openTimeline: chooseStarterM,
  study: studyM,
  explore: exploreM,
  rummage: exploreM,
  buyOffer: buyOfferM,
  passOffer: passOfferM,
  dropItem: dropItemM,
  buyCard: buyCardM,
  cure: cureM,
  spendGossip: spendGossipM,
  useTalent: useTalentM,
  startAssignation: startAssignationM,
  playAssignation: (s, wid, play) => playAssignationM(s, wid, play).s,
  cancelAssignation: cancelAssignationM,
  dealLent: dealLentM,
  sleepTillDawn: sleepTillDawnM,
  planEvening: planEveningM,
  sealPlan: sealPlanM,
  unseal: unsealM,
  resolveCurtain: resolveCurtainM,
  advanceClock: advanceClockM,
  challengeSeat: challengeSeatM,
  markSeen: markSeenM,
  endSeason: endSeasonM,
  stageRival: stageRivalM,
  setRoad: setRoadM,
  buySpecial: buySpecialM,
  buyDigs: buyDigsM,
};
export const chooseStarter = pure(CORE.chooseStarter);
export const openTimeline = pure(CORE.openTimeline);
export const study = pure(CORE.study);
export const explore = pure(CORE.explore);
export const rummage = explore;
export const buyOffer = pure(CORE.buyOffer);
export const passOffer = pure(CORE.passOffer);
export const dropItem = pure(CORE.dropItem);
export const buyCard = pure(CORE.buyCard);
export const cure = pure(CORE.cure);
export const spendGossip = pure(CORE.spendGossip);
export const useTalent = pure(CORE.useTalent);
export const startAssignation = pure(CORE.startAssignation);
export const playAssignation = pure(CORE.playAssignation);
export const cancelAssignation = pure(CORE.cancelAssignation);
export const dealLent = pure(CORE.dealLent);
export const sleepTillDawn = pure(CORE.sleepTillDawn);
export const planEvening = pure(CORE.planEvening);
export const sealPlan = pure(CORE.sealPlan);
export const unseal = pure(CORE.unseal);
export const resolveCurtain = pure(CORE.resolveCurtain);
export const advanceClock = pure(CORE.advanceClock);
export const challengeSeat = pure(CORE.challengeSeat);
export const markSeen = pure(CORE.markSeen);
export const endSeason = pure(CORE.endSeason);
export const stageRival = pure(CORE.stageRival);
export const setRoad = pure(CORE.setRoad);
export const buySpecial = pure(CORE.buySpecial);
export const buyDigs = pure(CORE.buyDigs);
export const mut = Object.fromEntries(Object.entries(CORE).map(([k, f]) => [k, inPlace(f)]));
