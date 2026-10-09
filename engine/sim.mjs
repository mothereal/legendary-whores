// Legendary Whores · strategy simulation (rules-core.md §14)
// Run: node sim.mjs            (full run; prints every target's metrics and PASS/FAIL)
//      node sim.mjs --quick    (fewer runs, for tuning iterations)
//      node sim.mjs --only=jackie[,dolly]   (just those starters)
//
// Bots see the game ONLY through getView(state, whore) and the exported view helpers
// (bestGuess, previewEncounter, smileys, casualPlace) plus the public rulebook numbers (RULES).
// They never read hidden content (secret Tastes, Kinks, other whores' hands) directly.
//
//   CASUAL-GAZETTE (round 7; was casual-notoriety, who declared the road): the same lazy player, but she likes the dives.
//             She goes to the Gutter until her meters put her in the Police Gazette (two nights from the start), then just
//             follows the smileys, which now read her road; she takes any gentleman on the board, back alleys included (so T7
//             also covers a lazy player in the back alley, where Best Guess's Itch guard matters most).
//   CASUAL-REFORM (informational T12b): casual-gazette for 10 evenings, then she cleans up: no more Gutter or back alleys,
//             the best of the other Places by the smileys, and a Scrubbed gentleman whenever one will see her.
//   CASUAL  : sensible but matchup-blind. Best Guess at the Place with the most smileys. Never Studies,
//             never buys or uses items, never uses her Talent, never starts a Duel. Takes the Tourist when
//             he is on the board, otherwise a random (non back-alley) gentleman. Buys the highest-Allure
//             market card when she has spare Coin. Cures afflictions when she can afford it.
//   CASUAL-TAP (round 6): the lazy player the page produces: follows the smileys, taps the plan screen's one-tap Kink offer
//             (L.kinkOffer) and the page's Best Guess (packs the best ready novelty). T11 is gated on her.
//   CASUAL-TAP-EVERY (informational T11b): the same, if the offer showed every evening (the rejected option; the page
//             shows it on her first Curtain in a Timeline only).
//   GREEDY  : max immediate points. Biggest 1st-place pot whose door is open; the 3 highest printed Allure
//             cards (blind to Tastes, Aversions and the Itch). Lowest-Bar Assignation, 2 highest-Allure cards.
//   PLANNER : Studies (3 free a day, then 1 Coin), reads its own Black Book, rummages for and uses Kink items,
//             uses its Talent, predicts rivals from public results and Studied Habits, manages the Itch and
//             Afflictions by expected value, and keeps to a chosen route (Standing or Notoriety).
//
// Evening = 1 full-pay Curtain + 1 full-pay Assignation (3 evenings per district day).

import * as L from './rules.js';

const R = L.RULES;
const QUICK = process.argv.includes('--quick');
// --talent-per-day: measure the prototype option talentOncePerDay (a Talent once per district day, not once per Curtain)
const TALENT_DAY = process.argv.includes('--talent-per-day');
// --levers=house,crowd[=N]: the variety levers (ARENA-SPEC §7) merged into BOTH newGame calls (runEvenings, where T1-T4 and
// T6-T13 run, and seasonRun, T5), so a lever is gated on every target. Printed in the header and the ALL TARGETS line so a
// commit can quote it. `crowd=6` sets the crowd rate (read once lever 4 lands); the opts are stored by the engine now.
const LEVERS_ARG = (process.argv.find((a) => a.startsWith('--levers=')) || '').slice(9);
const LEVERS = Object.fromEntries(LEVERS_ARG.split(',').filter(Boolean).map((x) => { const [k, v] = x.split('='); return [k, v == null ? true : Number(v)]; }));
const LEVER_OPTS = { ...(LEVERS.house ? { houseRules: true } : {}), ...(LEVERS.crowd ? { crowd: true } : {}) };
const LEVER_STR = LEVERS_ARG || 'none';
// --arena: also run the multi-human harness (ARENA-SPEC §9.2: T14, T9a, T2a, the herd and lone-player lines), informational in I1
const ARENA = process.argv.includes('--arena');
const RUNS = QUICK ? 40 : 150;
const EVENINGS = 30;

// ---------------------------------------------------------------------------
// Sim-side seeded RNG (bot tie-breaks only; the engine has its own)
// ---------------------------------------------------------------------------
function mkRng(seed) {
  let a = (seed * 2654435761) >>> 0 || 1;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rpick = (rng, xs) => xs[Math.floor(rng() * xs.length)];

function combos(items, k) {
  const out = []; const cur = [];
  const rec = (start) => { if (cur.length) out.push([...cur]); if (cur.length === k) return; for (let i = start; i < items.length; i++) { cur.push(items[i]); rec(i + 1); cur.pop(); } };
  rec(0);
  return out;
}
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

// ---------------------------------------------------------------------------
// Shared bot chores
// ---------------------------------------------------------------------------
function cureAll(s, wid, reserve = 0) {
  const v = L.getView(s, wid);
  let coin = v.whore.coin;
  for (const a of v.whore.afflictions) for (let i = 0; i < a.copies; i++) {
    if (coin - reserve < a.cure.cost) break;
    L.mut.cure(s, wid, a.id); coin -= a.cure.cost;
  }
}
function deckCount(v) { return v.whore.deck.length; }

function rummageOnce(s, wid, placeId, wantItem) {
  L.mut.explore(s, wid, placeId);
  const v = L.getView(s, wid);
  if (v.whore.offer) {
    if (wantItem && wantItem(v.whore.offer.item.id, v) && v.whore.coin >= v.whore.offer.price && v.whore.items.length < R.reticule) L.mut.buyOffer(s, wid);
    else L.mut.passOffer(s, wid);
  }
}

// ---------------------------------------------------------------------------
// CASUAL
// ---------------------------------------------------------------------------
const Casual = {
  name: 'casual',
  between(s, wid, ctx) {
    cureAll(s, wid);
    let v = L.getView(s, wid);
    // one fresh rummage for coins (passes on every item)
    if (v.whore.daily.freshRummagesLeft > 0) rummageOnce(s, wid, v.timeline.freshStall, null);
    v = L.getView(s, wid);
    // market: highest Allure card when there is Coin to spare
    if (deckCount(v) < 14) {
      const owned = (id) => v.whore.deck.filter((c) => c === id).length;
      const mk = v.timeline.market.filter((c) => v.whore.coin >= c.cost + 2 && owned(c.id) < 2);
      const top = Math.max(-1, ...mk.map((c) => c.allure));
      const pickc = mk.filter((c) => c.allure === top);
      if (pickc.length) L.mut.buyCard(s, wid, rpick(ctx.rng, pickc).id);
    }
  },
  assignation(s, wid, ctx) {
    const v = L.getView(s, wid);
    const board = v.board.filter((b) => !b.refused && !b.backAlley);
    if (!board.length) return;
    const t = board.find((b) => b.tourist);
    const gid = t ? t.gent : rpick(ctx.rng, board).gent;
    L.mut.startAssignation(s, wid, gid);
    const v2 = L.getView(s, wid);
    const bg = L.bestGuess(v2, { gent: gid });
    if (bg.cards.length) L.mut.playAssignation(s, wid, { cards: bg.cards }); else L.mut.cancelAssignation(s, wid);
  },
  plan(s, wid) {
    const v = L.getView(s, wid);
    const place = L.casualPlace(v);
    return { place, cards: L.bestGuess(v, place).cards };
  },
};

// CASUAL-UI: the same casual player, but she simply follows the smileys printed on the Place cards
// (casualPlace with followSmileys: no special refusal of a first Gutter visit; the smileys themselves cap it).
// This is what a human who trusts the UI does, so T1/T2 are also reported for her (T1u, T2u).
const CasualUI = { ...Casual, name: 'casual-ui',
  plan(s, wid) {
    const v = L.getView(s, wid);
    const place = L.casualPlace(v, { followSmileys: true });
    return { place, cards: L.bestGuess(v, place).cards };
  },
};

// CASUAL-TAP (round 6, finding 2): the lazy player The Scandal Sheet actually produces. She follows the smileys (as
// casual-ui), taps the plan screen's one-tap Kink offer when it sits at the Place she chose (L.kinkOffer: the same helper
// the page renders it from), and presses the page's Best Guess, which packs the ready novelty that scores most
// (scandal.js bestGuessPick). She does not rummage the fresh stall for Coin while the offer is up (the page shows the offer
// first), and otherwise plays exactly like casual. T11 is gated on her, and T1 is also reported against her.
function uiBestGuess(v, place) {
  const plain = L.bestGuess(v, place);
  let best = { cards: plain.cards, sway: plain.sway, item: null };
  for (const it of v.whore.items.filter((x) => x.ready)) {
    const b = L.bestGuess(v, place, { item: it.id });
    if (b.cards.length && b.sway > best.sway) best = { cards: b.cards, sway: b.sway, item: it.id };
  }
  return best;
}
const makeCasualTap = (name, offerOpts = {}) => ({ ...Casual, name,
  between(s, wid, ctx) {
    const v = L.getView(s, wid);
    if (L.kinkOffer(v, offerOpts)) {
      // leave the fresh stall to the plan screen's offer; the rest of casual's chores as usual
      cureAll(s, wid);
      const v2 = L.getView(s, wid);
      if (deckCount(v2) < 14) {
        const owned = (id) => v2.whore.deck.filter((c) => c === id).length;
        const mk = v2.timeline.market.filter((c) => v2.whore.coin >= c.cost + 2 && owned(c.id) < 2);
        const top = Math.max(-1, ...mk.map((c) => c.allure));
        const pickc = mk.filter((c) => c.allure === top);
        if (pickc.length) L.mut.buyCard(s, wid, rpick(ctx.rng, pickc).id);
      }
      return;
    }
    Casual.between(s, wid, ctx);
  },
  plan(s, wid) {
    let v = L.getView(s, wid);
    const place = L.casualPlace(v, { followSmileys: true });
    const k = L.kinkOffer(v, offerOpts);
    if (k && k.place.id === place && v.whore.coin >= k.item.cost && v.whore.items.length < R.reticule) {
      L.mut.explore(s, wid, k.stall.id, { want: k.item.id });
      const v2 = L.getView(s, wid);
      if (v2.whore.offer && v2.whore.offer.item.id === k.item.id) L.mut.buyOffer(s, wid); else if (v2.whore.offer) L.mut.passOffer(s, wid);
      v = L.getView(s, wid);
    }
    const bg = uiBestGuess(v, place);
    return { place, cards: bg.cards, item: bg.item || undefined };
  },
});
// The page ships the offer on her first Curtain in a Timeline only (kinkOffer opts.firstOnly; designer's call 2026-10-07).
const CasualTap = makeCasualTap('casual-tap', { firstOnly: true });
// Informational T11b: the rejected alternative, the same player if the offer showed every evening.
const CasualTapScarce = makeCasualTap('casual-tap-every');

// CASUAL-GAZETTE (round 7): nobody declares a road any more; the meters decide. A lazy player who likes the dives says yes
// to the Gutter until the Police Gazette has her, then follows the smileys (which read her road) like any casual player.
function anyGentleman(s, wid, ctx, keep = () => true, prefer = () => false) {
  const v = L.getView(s, wid);
  const board = v.board.filter((b) => !b.refused && keep(b));
  if (!board.length) return;
  const t = board.find((b) => b.tourist); const pref = board.filter(prefer);
  const gid = t ? t.gent : rpick(ctx.rng, pref.length ? pref : board).gent;
  L.mut.startAssignation(s, wid, gid);
  const v2 = L.getView(s, wid);
  const bg = L.bestGuess(v2, { gent: gid });
  if (bg.cards.length) L.mut.playAssignation(s, wid, { cards: bg.cards }); else L.mut.cancelAssignation(s, wid);
}
function gazettePlan(s, wid) {
  const v = L.getView(s, wid);
  const gutter = v.timeline.places.find((p) => p.open && p.kind === 'gutter');
  const place = v.whore.road !== 'notoriety' && gutter ? gutter.id : L.casualPlace(v);
  return { place, cards: L.bestGuess(v, place).cards };
}
const CasualGazette = { ...Casual, name: 'casual-gazette',
  assignation(s, wid, ctx) { anyGentleman(s, wid, ctx); },
  plan: gazettePlan,
};
// CASUAL-REFORM (informational T12b): the way back. Ten evenings as casual-gazette, then no Gutter and no back alleys; the
// best of the other Places by the smileys, and a Scrubbed gentleman when one will see her (Delighting one is +1 Standing).
const REFORM_AT = 10;
const CasualReform = { ...Casual, name: 'casual-reform',
  between(s, wid, ctx) { ctx.ev = (ctx.ev || 0) + 1; Casual.between(s, wid, ctx); },
  assignation(s, wid, ctx) {
    if (ctx.ev <= REFORM_AT) { anyGentleman(s, wid, ctx); return; }
    anyGentleman(s, wid, ctx, (b) => !b.backAlley, (b) => (L.CONTENT.GENTS[b.gent] || {}).freshness === 'scrubbed');
  },
  plan(s, wid, ctx) {
    if (ctx.ev <= REFORM_AT) return gazettePlan(s, wid);
    const v = L.getView(s, wid);
    const clean = { ...v, timeline: { ...v.timeline, places: v.timeline.places.filter((p) => p.kind !== 'gutter') } };
    const place = L.casualPlace(clean, { followSmileys: true });
    return { place, cards: L.bestGuess(v, place).cards };
  },
};

// ---------------------------------------------------------------------------
// GREEDY
// ---------------------------------------------------------------------------
const Greedy = {
  name: 'greedy',
  between(s, wid, ctx) {
    cureAll(s, wid);
    let v = L.getView(s, wid);
    if (v.whore.daily.freshRummagesLeft > 0) rummageOnce(s, wid, v.timeline.freshStall, null);
    v = L.getView(s, wid);
    if (deckCount(v) < 14) {
      const mk = v.timeline.market.filter((c) => v.whore.coin >= c.cost).sort((a, b) => b.allure - a.allure || (a.id < b.id ? -1 : 1));
      if (mk.length) L.mut.buyCard(s, wid, mk[0].id);
    }
  },
  assignation(s, wid) {
    const v = L.getView(s, wid);
    const board = v.board.filter((b) => !b.refused).sort((a, b) => a.bar - b.bar || (a.gent < b.gent ? -1 : 1));
    if (!board.length) return;
    const gid = board[0].gent;
    L.mut.startAssignation(s, wid, gid);
    const v2 = L.getView(s, wid);
    const cards = v2.whore.assignation.lent.filter((c) => !c.affliction).sort((a, b) => b.allure - a.allure || a.idx - b.idx).slice(0, R.assignMaxCards).map((c) => c.idx);
    if (cards.length) L.mut.playAssignation(s, wid, { cards }); else L.mut.cancelAssignation(s, wid);
  },
  plan(s, wid) {
    const v = L.getView(s, wid);
    const open = v.timeline.places.filter((p) => p.open).sort((a, b) => b.rules.renown[0] - a.rules.renown[0]);
    const place = open[0].id;
    const cards = v.whore.hand.filter((c) => !c.affliction).sort((a, b) => b.allure - a.allure || a.idx - b.idx).slice(0, R.maxCurtainCards).map((c) => c.idx);
    return { place, cards };
  },
};

// ---------------------------------------------------------------------------
// PLANNER
// ---------------------------------------------------------------------------
const PRIOR = { posh: [13, 11, 10, 3], rowdy: [12, 10, 8, 3], gutter: [10, 8, 7, 2] }; // 1st, 2nd, 3rd Sway, others present
const COIN_W = 0.4;   // Renown-equivalent of 1 Coin
const DIGS_RESERVE = 8; // the planner keeps this much Coin back when she buys a rung of the Ladder
// Experiment switches (round 4, the Low Road Coin sink), for measuring a lever without editing the rulebook:
//   --bribe=N           turn on squaring the Peelers (RULES.raidBribe, off in the rulebook) at N Coin, Notoriety 5+
//   --coin-dim          a planner who values Coin less once her purse is full (full COIN_W up to 25 Coin, then falling,
//                       never below a quarter); measured and not adopted (see rules-core.md, Balance log, round 4)
const EXP_BRIBE = (process.argv.find((a) => a.startsWith('--bribe=')) || '').slice(8);
const COIN_DIM = process.argv.includes('--coin-dim');
if (EXP_BRIBE) R.raidBribe = { at: R.sway.notorious.at, cost: Number(EXP_BRIBE) };
const coinW = (vw) => (COIN_DIM ? COIN_W * Math.max(0.25, Math.min(1, 25 / Math.max(1, vw.coin))) : COIN_W);
function makePlanner(route, opts = {}) {
  const assignsPerEvening = opts.assignsPerEvening || 1;
  return {
    name: `planner-${route}`, route, assignsPerEvening,
    init(ctx) { ctx.mem = { obs: {}, lastCurtainSeen: -1, rivalAt: {}, rivalSway: 12 }; },
    between(s, wid, ctx) {
      learnFromResults(s, wid, ctx);
      const rw = route === 'notoriety';
      cureAll(s, wid, 0);
      studyRound(s, wid, ctx);
      // rummage: up to all fresh rummages today, aimed at the stall that sells a wanted Kink item
      for (let i = 0; i < 2; i++) {
        const v = L.getView(s, wid);
        if (v.whore.daily.freshRummagesLeft <= 0) break;
        const want = wantedItems(v, rw);
        let place = v.timeline.freshStall;
        const fresh = v.timeline.places.find((p) => p.id === v.timeline.freshStall);
        if (!fresh.stall.some((it) => want.has(it.id))) {
          const alt = v.timeline.places.find((p) => p.stall.some((it) => want.has(it.id)));
          if (alt) place = alt.id;
        }
        rummageOnce(s, wid, place, (iid) => want.has(iid));
      }
      buyMarket(s, wid, rw);
      // the Morning Special (round 5): she buys it when it is a novelty she wants (the same test as a stall offer)
      { const v = L.getView(s, wid); const sp = v.timeline.special;
        if (!sp.why && v.whore.coin >= sp.price && v.whore.items.length < R.reticule && wantedItems(v, rw).has(sp.item.id)) L.mut.buySpecial(s, wid); }
      // a second round of cures if Coin came in
      cureAll(s, wid, 0);
      // the Ladder (round 5): Coin she does not need for tonight goes up in the world, keeping DIGS_RESERVE in the purse for
      // cures, Studies, Grease and a stake (a player who wants the next rung; cosmetic, so it moves no Renown)
      for (;;) { const v = L.getView(s, wid); const nx = v.whore.digsNext; if (!nx || v.whore.coin < nx.rung.cost + DIGS_RESERVE) break; L.mut.buyDigs(s, wid); }
    },
    assignation(s, wid, ctx) {
      for (let i = 0; i < this.assignsPerEvening; i++) plannerAssign(s, wid, ctx, route);
    },
    plan(s, wid, ctx) {
      quickChange(s, wid, ctx, route);
      return plannerCurtain(s, wid, ctx, route);
    },
  };
}

// the Timeline's rival: an Automaton, or Lady Lavinia, the stand-in for a human rival (a whore's id is her character's id)
const isMainRival = (r) => r.automaton || (L.CONTENT.CHARACTERS[r.id] || {}).role === 'rival';
function learnFromResults(s, wid, ctx) {
  const v = L.getView(s, wid);
  const res = v.timeline.results;
  if (!res || res.curtain === ctx.mem.lastCurtainSeen) return;
  ctx.mem.lastCurtainSeen = res.curtain;
  const rival = v.timeline.rivals.find(isMainRival);
  const M = ctx.mem;
  for (const pr of res.places) {
    const kind = v.timeline.places.find((p) => p.id === pr.place).kind;
    // the crowd (everyone but me and the Timeline's rival), per Place and per (Place, host)
    const crowd = pr.entries.filter((e) => e.whore !== wid && (!rival || e.whore !== rival.id));
    const sw = crowd.filter((e) => e.sway != null).map((e) => e.sway).sort((a, b) => b - a);
    const now = [sw[0] || 0, sw[1] || 0, sw[2] || 0, crowd.length];
    for (const key of [pr.place, `${pr.place}|${pr.host}`]) {
      const o = M.obs[key] || (M.obs[key] = [...(M.obs[pr.place] || PRIOR[kind])]);
      for (let i = 0; i < 4; i++) o[i] = o[i] * 0.5 + now[i] * 0.5;
    }
    // the rival: where she went (by Curtain number mod 3 and by Place) and how strong she was
    if (rival) {
      const re = pr.entries.find((e) => e.whore === rival.id);
      const slot = `${res.curtain % 3}|${pr.place}`;
      M.rivalAt[slot] = (M.rivalAt[slot] || 0) * 0.5 + (re ? 0.5 : 0);
      if (re) M.rivalSway = M.rivalSway * 0.6 + (re.sway != null ? re.sway : R.places[kind].bar - 1) * 0.4;
    }
  }
}

function studyRound(s, wid, ctx) {
  for (let i = 0; i < 4; i++) {
    const v = L.getView(s, wid);
    const free = v.whore.daily.freeStudiesLeft > 0;
    if (!free && v.whore.coin < 6) return;
    // gentlemen first, in rota order (tonight's hosts first), Secret Taste and Kink only
    const order = [];
    for (const r of v.timeline.rota) for (const gid of Object.values(r.hosts)) if (!order.includes(gid)) order.push(gid);
    const g = order.map((id) => v.timeline.gents.find((x) => x.id === id)).find((x) => !(x.known.secret && x.known.kink));
    if (g) { L.mut.study(s, wid, g.id); continue; }
    // then the Timeline rival's Habit (an Automaton or the stand-in)
    const riv = v.timeline.rivals.find((r) => isMainRival(r) && !r.known.habit);
    if (riv && free) { L.mut.study(s, wid, riv.id); continue; }
    return;
  }
}

function wantedItems(v, notorietyRoute) {
  const want = new Set();
  const have = new Set(v.whore.items.map((it) => it.id));
  if (v.whore.items.length >= R.reticule) return want;
  for (const g of v.timeline.gents) {
    if (!g.kink || !g.kink.item) continue;
    if (have.has(g.kink.item)) continue;
    // only gentlemen hosting a Place we'd go to in the next 2 Curtains
    const soon = v.timeline.rota.slice(0, 2).some((r) => Object.entries(r.hosts).some(([pid, gid]) => gid === g.id && v.timeline.places.find((p) => p.id === pid).open
      && (notorietyRoute ? v.timeline.places.find((p) => p.id === pid).kind !== 'posh' : v.timeline.places.find((p) => p.id === pid).kind !== 'gutter')));
    if (soon) want.add(g.kink.item);
  }
  // Sway novelties when Coin is spare (the Wand and the Stopper only suit the Notoriety route)
  for (const p of v.timeline.places) for (const it of p.stall) {
    if (it.kind !== 'sway' || have.has(it.id) || v.whore.coin < it.cost + 4) continue;
    if (!notorietyRoute && (it.notorietyPerUse || it.notorietyAtPosh)) continue;
    want.add(it.id);
  }
  return want;
}

function cardMatchValue(card, v, notorietyRoute) {
  // average visible tick value over the Timeline's gentlemen, plus Signature, minus Aversions
  let t = 0;
  for (const g of v.timeline.gents) {
    let x = card.allure;
    if (card.arts.some((a) => g.tastes.includes(a))) x += 1;
    if (g.secretTaste && card.arts.includes(g.secretTaste)) x += 1;
    if (card.arts.includes(v.whore.signature)) x += 1;
    if (card.arts.includes(g.aversion) && card.id !== 'poker-face') x -= 2;
    if (g.kink && g.kink.trigger && g.kink.trigger.cards && g.kink.trigger.cards.includes(card.id)) x += 1;
    t += x;
  }
  let val = t / v.timeline.gents.length;
  if (card.arts.includes('frolic') && !notorietyRoute) val -= 0.5; // Posh nights frown on it
  return val;
}
function buyMarket(s, wid, notorietyRoute) {
  const v = L.getView(s, wid);
  if (deckCount(v) >= 15) return;
  const owned = (id) => v.whore.deck.filter((c) => c === id).length;
  const opts = v.timeline.market.map((c) => ({ c, val: cardMatchValue(c, v, notorietyRoute) - 1.2 * owned(c.id) })).sort((a, b) => b.val - a.val || (a.c.id < b.c.id ? -1 : 1));
  const best = opts[0];
  if (best && best.val >= 2.5 && v.whore.coin >= best.c.cost + 3) L.mut.buyCard(s, wid, best.c.id);
}

function quickChange(s, wid, ctx, route) {
  const v = L.getView(s, wid);
  if (v.whore.talent !== 'quick-change' || v.whore.talentUsed || v.whore.drawCount + v.whore.discardCount === 0) return;
  const aff = v.whore.hand.find((c) => c.affliction);
  if (aff) { L.mut.useTalent(s, wid, { kind: 'quick-change', card: aff.idx }); return; }
  let worst = null;
  for (const c of v.whore.hand) {
    let best = -99;
    for (const p of v.timeline.places) if (p.open) best = Math.max(best, L.previewEncounter(v, { place: p.id, cards: [c.idx] }).cards[0].score);
    if (!worst || best < worst.score) worst = { idx: c.idx, score: best };
  }
  if (worst && worst.score <= 1) L.mut.useTalent(s, wid, { kind: 'quick-change', card: worst.idx });
}

function catchCost(v, gid, route) {
  const g = v.timeline.gents.find((x) => x.id === gid);
  if (!g || !g.carries) return 0;
  const cure = v.timeline.afflictions.find((a) => a.id === g.carries).cure; // printed on the public curse card
  return 1.0 + COIN_W * cure.cost + (route === 'standing' ? 3 * (1 + (cure.notoriety || 0)) : -1);
}
function routeValue(route, noto, standingGain, v) {
  if (route === 'standing') return -3 * Math.max(0, noto) + 1.0 * standingGain + (noto < 0 ? 0.5 * -noto : 0);
  const room = Math.max(0, R.meterMax - v.whore.notoriety);
  return 1.0 * Math.min(noto, room) - 1.0 * standingGain;
}

function talentOptions(v, gentView, cardIdxs, src) {
  const out = [null];
  const t = v.whore.talentUsed ? null : v.whore.talent;
  if (t === 'double-entendre' && gentView) {
    const arts = new Set(gentView.tastes);
    if (gentView.secretTaste) arts.add(gentView.secretTaste);
    if (gentView.kink && gentView.kink.trigger && gentView.kink.trigger.arts) gentView.kink.trigger.arts.forEach((a) => arts.add(a));
    if (gentView.kink && gentView.kink.trigger && gentView.kink.trigger.artCount) arts.add(gentView.kink.trigger.artCount.art);
    for (const i of cardIdxs) {
      const have = src.find((c) => c.idx === i).arts;
      for (const a of arts) if (!have.includes(a) && a !== gentView.aversion) out.push({ kind: 'double-entendre', card: i, art: a });
    }
  } else if (t === 'smokescreen') out.push({ kind: 'smokescreen' });
  return out;
}

function plannerCurtain(s, wid, ctx, route) {
  const v = L.getView(s, wid);
  const vw = v.whore;
  const playable = vw.hand.filter((c) => !c.affliction).map((c) => c.idx);
  const sets = combos(playable, R.maxCurtainCards);
  const rot = v.timeline.rota[0];
  const rivalWhere = predictRival(v);
  const lowest = v.timeline.table.filter((x) => x.id !== wid).every((x) => vw.renown <= x.renown);
  const usable = vw.items.filter((it) => it.ready);
  let best = null;
  for (const p of v.timeline.places) {
    if (!p.open) continue;
    const kind = p.kind; const PR = R.places[kind];
    const gid = rot.hosts[p.id];
    const g = v.timeline.gents.find((x) => x.id === gid);
    let o = ctx.mem.obs[`${p.id}|${gid}`] || ctx.mem.obs[p.id] || PRIOR[kind];
    // add the Timeline's rival where her Habit (once Studied) or her record says she'll be tonight
    const rivalHere = rivalWhere[p.id] != null ? rivalWhere[p.id] : (ctx.mem.rivalAt[`${v.timeline.curtainNo % 3}|${p.id}`] || 0) >= 0.5;
    if (rivalHere) { const xs = [o[0], o[1], o[2], ctx.mem.rivalSway].sort((a, b) => b - a); o = [xs[0], xs[1], xs[2], o[3] + 1]; }
    const others = Math.max(1, Math.round(o[3]));
    const raid = rot.raid === p.id;
    const evalPlay = (cards, item, talent, grease, stake, bribe) => {
      const pv = L.previewEncounter(v, { place: p.id, cards, item, talent, grease, others, leastRenown: lowest });
      return { pv, val: valueCurtain(pv, p, PR, o, raid && !bribe, cards, item, grease, stake, vw, v, route, gid, others) - (bribe ? coinW(vw) * R.raidBribe.cost : 0) };
    };
    const base = sets.map((cards) => ({ cards, ...evalPlay(cards, null, null, 0, false, false) })).sort((a, b) => b.val - a.val).slice(0, 5);
    const itemOpts = [null, ...usable.map((it) => it.id).filter((iid, i, a) => a.indexOf(iid) === i)];
    const greaseOpts = route === 'notoriety' && kind !== 'posh' && vw.notoriety >= R.sway.grease.at ? Array.from({ length: L.greaseMax(vw) + 1 }, (_, n) => n) : [0];
    const stakeOpts = vw.vice === 'gambler' ? [false, true] : [false];
    const bribeOpts = route === 'notoriety' && L.canBribe(vw, p.id, rot.raid) ? [false, true] : [false];
    const perG = vw.greasePer; // grows with her tier (round 5, finding 1)
    for (const b of base) {
      for (const item of itemOpts) for (const talent of talentOptions(v, g, b.cards, vw.hand)) for (const grease of greaseOpts) for (const stake of stakeOpts) for (const bribe of bribeOpts) {
        if (grease * perG + (stake ? vw.gambler.stake : 0) + (bribe ? R.raidBribe.cost : 0) > vw.coin) continue;
        const r = evalPlay(b.cards, item, talent, grease, stake, bribe);
        if (!best || r.val > best.val) best = { val: r.val, plan: { place: p.id, cards: b.cards, item: item || undefined, talent: talent || undefined, grease: grease || undefined, stake: stake || undefined, bribe: bribe || undefined } };
      }
    }
  }
  return best.plan;
}

function predictRival(v) {
  // Studied Habits tell us where the Timeline's rival is going tonight: { placeId: true|false }
  const at = {};
  const r = v.timeline.rivals.find(isMainRival);
  if (!r || !r.habit) return at;
  const kinds = v.timeline.places.reduce((m, p) => { m[p.kind] = p.id; return m; }, {});
  const postOpen = r.standing >= R.places.posh.standingMin && r.standing >= r.notoriety;
  let goes = null;
  if (r.habit.kind === 'posh') goes = postOpen ? kinds.posh : kinds.rowdy;
  else if (r.habit.kind === 'rowdy2of3') goes = v.timeline.curtainNo % 3 !== 2 || !postOpen ? kinds.rowdy : kinds.posh;
  else if (r.habit.kind === 'biggestPot') goes = postOpen ? kinds.posh : kinds.gutter;
  if (goes) for (const p of v.timeline.places) at[p.id] = p.id === goes;
  return at;
}

function valueCurtain(pv, place, PR, o, raid, cards, item, grease, stake, vw, v, route, gid, others) {
  const S = pv.sway;
  const pb = (x) => clamp01((S - x + 2) / 4);
  let ren = 0; let coin = PR.doorGift; let standingGain = 0; let p1 = 0;
  if (S >= PR.bar) {
    p1 = pb(o[0]); const p2 = Math.max(p1, pb(o[1])); const p3 = Math.max(p2, pb(o[2]));
    const r = PR.renown.map((x) => (raid ? Math.floor(x / R.raidRenownDivisor) : x));
    const applause = place.house.applause != null ? place.house.applause : PR.applause;
    const first = r[0] + (others > 0 ? applause : 0) + (cards.some((i) => vw.hand[i].id === 'wheelbarrow') ? R.wheelbarrowFirstBonus : 0);
    ren = p1 * first + (p2 - p1) * r[1] + (p3 - p2) * r[2] + 0.4; // +0.4: a Regular visit banked
    coin += p1 * PR.coin[0] + (p2 - p1) * PR.coin[1] + (p3 - p2) * PR.coin[2];
    if (place.kind === 'posh') standingGain = p2;
  } else ren = -0.3;
  // pocketed cards, card text Coin, Gambler stake, Grease
  vw.hand.forEach((c, i) => { if (!cards.includes(i) && !c.affliction) coin += c.pocket + (place.house.pocket || 0); });
  cards.forEach((i) => { const id = vw.hand[i].id; if (id === 'ace-up-garter') coin += 1; if (id === 'pick-his-pocket') coin += 2; });
  if (stake) coin += p1 * (vw.gambler.payout - vw.gambler.stake) - (1 - p1) * vw.gambler.stake;
  coin -= grease * vw.greasePer;
  let val = ren + coinW(vw) * coin + routeValue(route, pv.noto, standingGain, v);
  if (item) { const it = vw.items.find((x) => x.id === item); val -= coinW(vw) * it.cost * (it.durable ? 0.15 : 1); }
  if (pv.catches) val -= catchCost(v, gid, route); else val -= 0.2 * pv.itch;
  return val;
}

function plannerAssign(s, wid, ctx, route) {
  let v = L.getView(s, wid);
  const board = v.board.filter((b) => !b.refused && (route === 'notoriety' || !b.backAlley));
  if (!board.length) return;
  // peek: start with the first gentleman to see the lent cards, then pick the best gentleman for them
  L.mut.startAssignation(s, wid, board[0].gent);
  v = L.getView(s, wid);
  const lent = v.whore.assignation.lent;
  const playable = lent.filter((c) => !c.affliction).map((c) => c.idx);
  if (!playable.length) { L.mut.cancelAssignation(s, wid); return; }
  const n = v.whore.daily.assigns + 1;
  const band = R.assign.bands.find((b) => n <= b.upTo);
  const capLeft = v.whore.daily.assignRenownLeft;
  const usable = v.whore.items.filter((it) => it.ready).map((it) => it.id);
  let best = null;
  for (const b of board) {
    const gview = b.tourist ? null : v.timeline.gents.find((x) => x.id === b.gent);
    for (const cards of combos(playable, R.assignMaxCards)) for (const item of [null, ...usable]) {
      const itv = item ? v.whore.items.find((x) => x.id === item) : null;
      if (itv && itv.kind === 'kink' && !(gview && gview.kink && gview.kink.item === item)) continue;
      const pv = L.previewEncounter(v, { gent: b.gent, cards, item });
      const ok = pv.sway >= b.bar || b.tourist; const del = pv.sway >= b.bar + R.assign.delightMargin;
      let renown = 0; let coin = 0; let standingGain = 0; let noto = pv.noto;
      if (b.tourist) { renown = R.assign.tourist.renown + (del ? R.assign.tourist.delightRenown : 0); coin = R.assign.tourist.coin; }
      else if (ok) {
        renown = band.renown + (del ? band.delightRenown : 0); coin = b.backAlley ? band.backAlleyCoin : band.coin;
        if (b.backAlley) noto += 1;
        if (del && gview.freshness === 'scrubbed') standingGain = 1;
      }
      renown = Math.min(renown, capLeft);
      cards.forEach((i) => { const id = lent[i].id; if (id === 'ace-up-garter') coin += 1; if (id === 'pick-his-pocket') coin += 2; });
      let val = renown + coinW(v.whore) * coin + routeValue(route, ok ? noto : pv.noto, standingGain, v) + (ok && !b.tourist ? 0.3 : -0.3);
      if (itv) val -= coinW(v.whore) * itv.cost * (itv.durable ? 0.15 : 1);
      if (ok && !b.tourist) { if (pv.catches) val -= catchCost(v, b.gent, route); else val -= 0.2 * pv.itch; }
      if (!best || val > best.val) best = { val, gent: b.gent, cards, item };
    }
  }
  if (best.gent !== v.whore.assignation.gent) { L.mut.cancelAssignation(s, wid); L.mut.startAssignation(s, wid, best.gent); }
  L.mut.playAssignation(s, wid, { cards: best.cards, item: best.item || undefined });
}

// ---------------------------------------------------------------------------
// One whore's evening and the run loop
// ---------------------------------------------------------------------------
function blankStats() {
  return { renown: 0, curtainRenown: 0, assignRenown: 0, catches: 0, places: {}, cardPlays: {}, curtainPlays: 0, items: {}, coinEnd: 0, standingEnd: 0, notorietyEnd: 0,
    firstRare: null, firstEpic: null, evenings: 0, notoAtTurn: 0, standingAtTurn: 0, societyEnd: 0, kinkHits: 0, studies: 0, ranks: [0, 0, 0, 0], gutterCurtains: 0, gutterRivals: 0, gutterVisits: 0, gutterCompany: 0 };
}

function eveningFor(s, wid, bot, ctx, st, evening) {
  const T = s.timelines[s.whores[wid].timeline];
  const before = s.whores[wid].renown;
  const k0 = T.curtainNo;
  bot.between(s, wid, ctx);
  bot.assignation(s, wid, ctx);
  const plan = bot.plan(s, wid, ctx);
  L.mut.sealPlan(s, wid, plan);
  if (T.curtainNo === k0) L.mut.resolveCurtain(s, T.id);
  // read what happened from the engine's own log
  for (const e of s.log) {
    if (e.id <= ctx.lastTick || !e.whores || !e.whores.includes(wid)) continue;
    if (e.type === 'payout' && e.whores[0] === wid) {
      st.curtainRenown += e.data.renown; st.places[e.data.place] = (st.places[e.data.place] || 0) + 1; st.curtainPlays++;
      st.ranks[e.data.rank == null ? 3 : Math.min(3, e.data.rank)]++;
      for (const id of new Set(e.data.breakdown.cards.map((c) => c.id))) st.cardPlays[id] = (st.cardPlays[id] || 0) + 1;
      if (e.data.breakdown.kinkHit) st.kinkHits++;
    }
    if (e.type === 'assignation' && e.whores[0] === wid) st.assignRenown += e.data.renown;
    // T10: how many other whores worked this Timeline's Gutter Place at each Curtain (the bot excluded)
    if (e.type === 'curtain' && e.timeline === T.id) {
      const gp = e.data.places.find((p) => L.CONTENT.PLACES[p.place].kind === 'gutter');
      const others = gp ? gp.entries.filter((x) => x.whore !== wid).length : 0;
      st.gutterCurtains++; st.gutterRivals += others;
      if (gp && gp.entries.some((x) => x.whore === wid)) { st.gutterVisits++; st.gutterCompany += others; }
    }
    if (e.type === 'catch' && e.whores[0] === wid) st.catches++;
  }
  ctx.lastTick = s.tick;
  const w = s.whores[wid];
  st.renown += w.renown - before;
  st.evenings++;
  if (st.firstRare == null && w.renown >= R.tiers.rare) st.firstRare = evening + 1;
  if (st.firstEpic == null && w.renown >= R.tiers.epic) st.firstEpic = evening + 1;
}

function runEvenings(starter, bot, seed, evenings = EVENINGS) {
  const tl = L.CONTENT.CHARACTERS[starter].timeline;
  const s = L.newGame(`sim-${starter}-${seed}`, { humans: [{ id: 'p', name: 'Bot', whores: [starter] }], timelines: [tl], minGapMin: 0, maxGapMin: 1e9, logLimit: 400, talentOncePerDay: TALENT_DAY, ...LEVER_OPTS });
  const ctx = { rng: mkRng(seed * 7 + starter.length), lastTick: s.tick };
  if (bot.init) bot.init(ctx);
  const st = blankStats();
  for (let e = 0; e < evenings; e++) {
    L.mut.advanceClock(s, 480, { autoCurtains: false });
    eveningFor(s, starter, bot, ctx, st, e);
    if (e === REFORM_AT - 1) { st.notoAtTurn = s.whores[starter].notoriety; st.standingAtTurn = s.whores[starter].standing; }
  }
  const w = s.whores[starter];
  st.societyEnd = L.roadOf(w) === 'standing' ? 1 : 0;
  st.coinEnd = w.coin; st.coinEarned = w.coinEarned; st.standingEnd = w.standing; st.notorietyEnd = w.notoriety;
  st.peakStanding = w.peakStanding; st.peakNotoriety = w.peakNotoriety;
  return st;
}

// ---------------------------------------------------------------------------
// Season run (T5): 28 days x 3 full-pay Curtains; seats and Duels live
// ---------------------------------------------------------------------------
// rivalBot (optional): one stand-in per Timeline is played by that bot (a planner-grade rival who also challenges for seats),
// so T5 is also measured against real competition at the top (C-scandal review, finding 11).
function seasonRun(kind, starters, seed, bot, rivalBot = null) {
  const tls = starters.map((c) => L.CONTENT.CHARACTERS[c].timeline);
  const s = L.newGame(`season-${kind}-${seed}`, { humans: [{ id: 'p', name: 'Bot', whores: starters }], timelines: tls, minGapMin: 0, maxGapMin: 1e9, logLimit: 400, talentOncePerDay: TALENT_DAY, ...LEVER_OPTS });
  const ctxs = Object.fromEntries(starters.map((c, i) => { const x = { rng: mkRng(seed * 31 + i), lastTick: s.tick }; if (bot.init) bot.init(x); return [c, x]; }));
  const rivals = !rivalBot ? [] : tls.map((tl) => Object.values(s.whores).find((w) => w.timeline === tl && L.CONTENT.CHARACTERS[w.char].role === 'standin')).filter(Boolean).map((w) => w.id);
  const rctx = Object.fromEntries(rivals.map((r, i) => { const x = { rng: mkRng(seed * 37 + i), lastTick: s.tick }; if (rivalBot.init) rivalBot.init(x); return [r, x]; }));
  const sts = Object.fromEntries(starters.map((c) => [c, blankStats()]));
  const days = R.seasonDays;
  for (let e = 0; e < days * 3; e++) {
    L.mut.advanceClock(s, 480, { autoCurtains: false });
    for (const r of rivals) {
      const v = L.getView(s, r);
      const k = ['crown', 'salon', 'gutter'].find((x) => v.whore.challengeable.includes(x));
      if (k) L.mut.challengeSeat(s, r, k);
      rivalBot.between(s, r, rctx[r]); rivalBot.assignation(s, r, rctx[r]);
      L.mut.sealPlan(s, r, rivalBot.plan(s, r, rctx[r]));
    }
    for (const c of starters) {
      if (bot.duels) {
        const v = L.getView(s, c);
        const pref = bot.route === 'notoriety' ? ['crown', 'gutter', 'salon'] : ['crown', 'salon', 'gutter'];
        const k = pref.find((x) => v.whore.challengeable.includes(x));
        if (k) L.mut.challengeSeat(s, c, k);
      }
      eveningFor(s, c, bot, ctxs[c], sts[c], e);
    }
  }
  L.mut.advanceClock(s, 1440, { autoCurtains: false }); // the season's last Dawn (seats held through it count)
  const ws = L.whorescore(s, 'p');
  const seats = starters.map((c) => s.whores[c].seat).filter(Boolean);
  return { season: ws.season, per: ws.perWhore.map((p) => `${p.name.split(' ')[0]}:${p.best}`).join(' '), seats, sts };
}

// ---------------------------------------------------------------------------
// The arena harness (ARENA-SPEC §9.2): N humans in one Timeline of one arena world, a real-time day of 1440 District minutes
// advanced in 60-minute steps under autoCurtains at the Curtain grid (forced at 180, 360, ... = 09:00, 12:00, ... local with
// District clock 0 at 06:00). Each bot acts only in its own window: heavy (every third account) is present at the three paid
// Curtains and seals by planner; light is present 19:00-22:00 local (clock 780-960) and seals Best Guess; absent never comes.
// It cannot reuse eveningFor: that forces the Curtain after one bot's evening and reads breakdown from s.log, which the arena
// strips. The planner's rival model (isMainRival) is blind to human rivals; accepted for this harness.
// Three numbers, binding from I2c's gate: T14 (the field is paid), T9a (time cannot buy rank, arena form) and T2a (the casual
// climbs, arena form); informational here. Plus the herd line and the lone-player line (standinSeal off and on).
// ---------------------------------------------------------------------------
function arenaRun(starter, N, seed, days) {
  const tl = L.CONTENT.CHARACTERS[starter].timeline;
  const s = L.newGame(`arena-${starter}-${seed}`, { arena: true, humans: [], timelines: [tl], curtainGrid: true, logLimit: 8000, talentOncePerDay: TALENT_DAY, ...LEVER_OPTS });
  const kinds = ['heavy', 'light', 'absent'];
  const hs = [];
  for (let i = 0; i < N; i++) {
    const id = `h${i}`; L.mut.joinWorld(s, { id, name: `Bot_${i}` }); L.mut.chooseStarter(s, id, starter);
    const wid = s.accounts[id].whores[0]; const kind = kinds[i % 3];
    hs.push({ id, wid, kind, bot: kind === 'heavy' ? makePlanner('standing') : Casual, ctx: { rng: mkRng(seed * 101 + i), lastTick: s.tick }, renownByDay: [], paid: 0, paidShare: 0, firstRare: null, firstEpic: null, lastTick: s.tick });
    if (kind === 'heavy') s.whores[wid].coin = Math.max(s.whores[wid].coin, 6);
  }
  for (const h of hs) if (h.bot.init) h.bot.init(h.ctx);
  const herd = { curtains: 0, herded: 0 };
  const actsAt = (h, hour) => (h.kind === 'heavy' ? [2, 5, 8].includes(hour) : h.kind === 'light' ? hour === 13 : false);
  const scan = (h) => {
    for (const e of L.eventsFor(s, h.id, h.lastTick)) {
      if (e.type === 'payout' && e.whores[0] === h.wid && e.data.fullPay) { h.paid++; if (e.data.renown > 0) h.paidShare++; }
      if (e.type === 'curtain' && e.timeline === tl && h === hs[0]) { herd.curtains++; if (e.data.places.some((p) => p.entries.filter((x) => String(x.whore).includes(':')).length >= 3)) herd.herded++; }
    }
    h.lastTick = s.tick;
  };
  for (let day = 0; day < days; day++) {
    const r0 = Object.fromEntries(hs.map((h) => [h.id, s.whores[h.wid].renown]));
    for (let hour = 0; hour < 24; hour++) {
      for (const h of hs) {
        if (!actsAt(h, hour)) continue;
        const w = s.whores[h.wid];
        if (w.plan && w.plan.sealed) continue;
        h.bot.between(s, h.wid, h.ctx);
        if (!w.assignation) h.bot.assignation(s, h.wid, h.ctx);
        if (w.assignation) L.mut.cancelAssignation(s, h.wid);
        L.mut.sealPlan(s, h.wid, h.bot.plan(s, h.wid, h.ctx));
      }
      L.mut.advanceClock(s, 60);
      for (const h of hs) scan(h);
    }
    for (const h of hs) {
      const w = s.whores[h.wid]; h.renownByDay.push(w.renown - r0[h.id]);
      if (h.firstRare == null && w.renown >= R.tiers.rare) h.firstRare = day + 1;
      if (h.firstEpic == null && w.renown >= R.tiers.epic) h.firstEpic = day + 1;
    }
  }
  const perDay = (kind) => { const xs = hs.filter((h) => h.kind === kind); return xs.reduce((t, h) => t + h.renownByDay.reduce((a, b) => a + b, 0), 0) / Math.max(1, xs.length * days); };
  const paidShare = hs.reduce((t, h) => t + h.paidShare, 0) / Math.max(1, hs.reduce((t, h) => t + h.paid, 0));
  const light = hs.filter((h) => h.kind === 'light');
  return { heavy: perDay('heavy'), light: perDay('light'), absent: perDay('absent'), paidShare, herd: herd.curtains ? herd.herded / herd.curtains : 0,
    lightRare: median(light.map((h) => h.firstRare)), lightEpic: median(light.map((h) => h.firstEpic)), chars: [...new Set(hs.map((h) => L.charOf(h.wid)))].join(','), ws: L.whorescore(s, hs[0].id).total };
}
// the lone-player line: a sprinter who seals Best Guess every minGapMin for 3 hours while the other human sleeps; how many of
// the sleeper's fullPayPerDay slots her early Curtains spend (standinSeal off), and with the brake { min: 45, max: 90 }
function loneRun(starter, seed, standinSeal) {
  const tl = L.CONTENT.CHARACTERS[starter].timeline;
  const s = L.newGame(`lone-${starter}-${seed}`, { arena: true, humans: [], timelines: [tl], curtainGrid: true, standinSeal });
  for (const id of ['sprinter', 'sleeper']) { L.mut.joinWorld(s, { id, name: id }); L.mut.chooseStarter(s, id, starter); }
  const sp = s.accounts.sprinter.whores[0]; const sl = s.accounts.sleeper.whores[0];
  s.whores[sl].lastActiveAt = -R.curtain.activeWindowMin - 1;
  const T = s.timelines[tl]; const end = s.clock + 180; let early = 0;
  while (s.clock < end) {
    if (!(s.whores[sp].plan && s.whores[sp].plan.sealed)) { const v = L.getView(s, sp); const place = L.casualPlace(v); L.mut.sealPlan(s, sp, { place, cards: L.bestGuess(v, place).cards }); }
    const k = T.curtainNo; L.mut.advanceClock(s, 5); if (T.curtainNo > k && T.lastCurtainAt % s.opts.maxGapMin !== 0) early++;
  }
  const d = s.whores[sl].daily; const spent = d.day === Math.floor(s.clock / 1440) ? Math.min(R.curtain.fullPayPerDay, d.curtains) : 0;
  return { early, spent, curtains: T.curtainNo };
}
function arenaReport(say) {
  const N = 10; const days = QUICK ? 3 : 7; const seeds = QUICK ? 2 : 4;
  say(`\n== Arena harness (informational in I1; binding from I2c): N=${N} humans per Timeline, ${days} District days x ${seeds} seeds, heavy/light/absent by thirds, planner blind to human rivals, levers=${LEVER_STR} ==`);
  const rows = {};
  for (const st of STARTERS) {
    const rs = Array.from({ length: seeds }, (_, i) => arenaRun(st, N, 7000 + i, days));
    const m = (k) => rs.reduce((t, r) => t + r[k], 0) / rs.length;
    rows[st] = { heavy: m('heavy'), light: m('light'), absent: m('absent'), paid: m('paidShare'), herd: m('herd'), rare: median(rs.map((r) => r.lightRare)), epic: median(rs.map((r) => r.lightEpic)), chars: rs[0].chars };
    say(`${st.padEnd(8)} Renown/day heavy ${f2(rows[st].heavy)} light ${f2(rows[st].light)} absent ${f2(rows[st].absent)}; character ${rows[st].chars}`);
  }
  const t14 = STARTERS.every((st) => rows[st].paid >= 0.5);
  say(`T14 the field is paid (humans with a Renown share on a full-pay Curtain >= 50%): ${STARTERS.map((st) => `${st} ${pct(rows[st].paid)}`).join(', ')} -> ${t14 ? 'PASS' : 'FAIL'} (informational)`);
  const t9a = STARTERS.every((st) => rows[st].light > 0 && rows[st].heavy / rows[st].light <= 1.15);
  say(`T9a time cannot buy rank, arena form (heavy/light Renown per day <= 1.15; fails until the designer's full-pay lever lands): ${STARTERS.map((st) => `${st} ${rows[st].light > 0 ? f2(rows[st].heavy / rows[st].light) : 'n/a'}`).join(', ')} -> ${t9a ? 'PASS' : 'FAIL'} (informational)`);
  const t2a = STARTERS.every((st) => rows[st].rare != null && rows[st].rare <= 6 && (days < R.seasonDays || (rows[st].epic != null && rows[st].epic <= R.seasonDays)));
  say(`T2a the casual climbs, arena form (a light human reaches Rare within 6 District days${days >= R.seasonDays ? ' and Epic within a season' : ''}): ${STARTERS.map((st) => `${st} Rare ${rows[st].rare ?? `>${days}`}${days >= R.seasonDays ? `/Epic ${rows[st].epic ?? `>${days}`}` : ''}`).join(', ')} -> ${t2a ? 'PASS' : 'FAIL'} (informational)`);
  say(`herd (share of Curtains with 3+ humans at one Place): ${STARTERS.map((st) => `${st} ${pct(rows[st].herd)}`).join(', ')}`);
  for (const st of STARTERS) {
    const off = loneRun(st, 1, null); const on = loneRun(st, 1, { min: 45, max: 90, from: 0 });
    say(`lone player (${st}): standinSeal off, a sprinter's early Curtains in 3 hours ${off.early} (Curtains ${off.curtains}), the sleeper's full-pay slots spent ${off.spent} of ${R.curtain.fullPayPerDay}; with { min: 45, max: 90 }: early ${on.early} (Curtains ${on.curtains}), slots spent ${on.spent}`);
  }
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------
const f2 = (x) => (Math.round(x * 100) / 100).toFixed(2);
const pct = (x) => `${Math.round(x * 100)}%`;
const median = (xs) => { const a = xs.filter((x) => x != null).sort((p, q) => p - q); if (!a.length) return null; return a[Math.floor(a.length / 2)]; };
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7);
const STARTERS = ONLY ? ONLY.split(',') : ['dolly', 'fanny', 'jackie'];
const ALL_STARTERS = ['dolly', 'fanny', 'jackie'];
const marketIds = new Set(Object.values(L.CONTENT.CARDS).filter((c) => c.cost).map((c) => c.id));
const placeShort = (pid) => L.CONTENT.PLACES[pid].short;

function aggregate(list) {
  const n = list.length; const ev = list.reduce((t, x) => t + x.evenings, 0);
  const sum = (k) => list.reduce((t, x) => t + x[k], 0);
  const places = {}; const cards = {}; let plays = 0;
  for (const x of list) { for (const [p, c] of Object.entries(x.places)) places[p] = (places[p] || 0) + c; for (const [c, m] of Object.entries(x.cardPlays)) cards[c] = (cards[c] || 0) + m; plays += x.curtainPlays; }
  return {
    n, rpe: sum('renown') / ev, cpe: sum('curtainRenown') / ev, ape: sum('assignRenown') / ev, aff: sum('catches') / ev,
    coin: sum('coinEnd') / n, coinEarned: sum('coinEarned') / n, standing: sum('standingEnd') / n, noto: sum('notorietyEnd') / n,
    peakS: sum('peakStanding') / n, peakN: sum('peakNotoriety') / n, kink: sum('kinkHits') / ev,
    ranks: [0, 1, 2, 3].map((i) => list.reduce((t, x) => t + x.ranks[i], 0)),
    places, plays, cards, rare: median(list.map((x) => x.firstRare)), epic: median(list.map((x) => x.firstEpic)),
    notoAtTurn: sum('notoAtTurn') / n, standingAtTurn: sum('standingAtTurn') / n, societyEnd: sum('societyEnd') / n, lockedAtTurn: list.filter((x) => x.notoAtTurn >= R.assign.notorietyRefuseScrubbedAt).length / n,
    gutterCurtains: sum('gutterCurtains'), gutterRivals: sum('gutterRivals'), gutterVisits: sum('gutterVisits'), gutterCompany: sum('gutterCompany'),
  };
}

function main() {
  const t0 = Date.now();
  const out = []; const say = (x) => { out.push(x); console.log(x); };
  say(`Legendary Whores engine sim · ${RUNS} seeded runs x ${EVENINGS} evenings per row (evening = 1 full-pay Curtain + 1 full-pay Assignation), 6-whore tables · levers=${LEVER_STR}`);
  const bots = { casual: Casual, 'casual-ui': CasualUI, 'casual-tap': CasualTap, 'casual-tap-every': CasualTapScarce, 'casual-gazette': CasualGazette, 'casual-reform': CasualReform, greedy: Greedy, 'planner-standing': makePlanner('standing'), 'planner-notoriety': makePlanner('notoriety') };
  const A = {};
  for (const st of STARTERS) {
    A[st] = {};
    for (const [bn, bot] of Object.entries(bots)) {
      const list = []; for (let r = 0; r < RUNS; r++) list.push(runEvenings(st, bot, r + 1));
      A[st][bn] = aggregate(list);
    }
  }
  const verdict = {};
  for (const st of STARTERS) {
    const name = L.CONTENT.CHARACTERS[st].name; const tl = L.CONTENT.TIMELINES[L.CONTENT.CHARACTERS[st].timeline].short;
    say(`\n== ${name} (${tl}) ==`);
    for (const [bn, a] of Object.entries(A[st])) {
      const pl = Object.entries(a.places).sort((x, y) => y[1] - x[1]).map(([p, c]) => `${placeShort(p)} ${pct(c / a.plays)}`).join(', ');
      const mk = Object.entries(a.cards).filter(([c]) => marketIds.has(c)).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([c, m]) => `${L.CONTENT.CARDS[c].name} ${pct(m / a.plays)}`).join(', ');
      say(`${bn.padEnd(18)} Renown/evening ${f2(a.rpe).padStart(5)} (Curtain ${f2(a.cpe)}, Assignation ${f2(a.ape)})  afflictions/evening ${f2(a.aff)}  Kink hits/evening ${f2(a.kink)}  end Coin ${f2(a.coin)} (earned ${f2(a.coinEarned)})  Standing ${f2(a.standing)} Notoriety ${f2(a.noto)}`);
      say(`${''.padEnd(18)} evenings to Rare ${a.rare ?? '>30'}  ranks 1st/2nd/3rd/none ${a.ranks.map((x) => pct(x / a.plays)).join('/')}  places: ${pl}`);
      say(`${''.padEnd(18)} market-card share of Curtain plays: ${mk || 'none'}`);
    }
    const c = A[st].casual; const ps = A[st]['planner-standing']; const pn = A[st]['planner-notoriety'];
    const bestR = ps.rpe >= pn.rpe ? 'standing' : 'notoriety'; const best = Math.max(ps.rpe, pn.rpe); const weak = Math.min(ps.rpe, pn.rpe);
    say(`ratios: planner-standing/casual ${f2(ps.rpe / c.rpe)}  planner-notoriety/casual ${f2(pn.rpe / c.rpe)}  greedy/casual ${f2(A[st].greedy.rpe / c.rpe)}  best route: ${bestR}  weaker/stronger route ${f2(weak / best)}`);
    verdict[st] = { t1: best / c.rpe, t1u: best / A[st]['casual-ui'].rpe, t6: weak / best, bestR,
      t6boards: pn.coinEarned > ps.coinEarned && ps.peakS > pn.peakS,
      t7: c.aff, t7n: A[st]['casual-gazette'].aff, cn: A[st]['casual-gazette'], cr: A[st]['casual-reform'], unspentN: pn.coin / Math.max(1, pn.coinEarned), unspentS: ps.coin / Math.max(1, ps.coinEarned), t8: L.CONTENT.CHARACTERS[st].signature === 'frolic' ? Math.max(ps.aff, pn.aff) : null,
      t3: Math.max(...['planner-standing', 'planner-notoriety'].map((b) => Math.max(0, ...Object.entries(A[st][b].cards).filter(([id]) => marketIds.has(id)).map(([, m]) => m / A[st][b].plays)))),
      t4: (() => { const pooled = {}; let n = 0; for (const b of ['planner-standing', 'planner-notoriety']) { for (const [p, m] of Object.entries(A[st][b].places)) pooled[p] = (pooled[p] || 0) + m; n += A[st][b].plays; } return Math.max(...Object.values(pooled)) / n; })(),
      richest: `${f2(pn.coinEarned)} vs ${f2(ps.coinEarned)}`, respect: `${f2(ps.peakS)} vs ${f2(pn.peakS)}`,
      // T10: the Gutter averages at least one rival per Curtain (pooled over every bot; per route for the record)
      t10: (() => { let c = 0; let r = 0; for (const a of Object.values(A[st])) { c += a.gutterCurtains; r += a.gutterRivals; } return c ? r / c : 0; })(),
      // ... and the company she meets when she goes there herself (the Notoriety route's competition)
      t10v: (() => { let c = 0; let r = 0; for (const a of Object.values(A[st])) { c += a.gutterVisits; r += a.gutterCompany; } return c ? r / c : 0; })(),
      t10n: pn.gutterVisits ? pn.gutterCompany / pn.gutterVisits : 0,
      // T11: Kinks are earned, not stumbled on (C-scandal review): casual Kink hits per evening vs the better planner's
      // round 6 (finding 2): gated on casual-tap, the casual player the shipped page produces (casual never sees the offer)
      t11c: A[st]['casual-tap'].kink, t11c0: c.kink, t11b: A[st]['casual-tap-every'].kink, t11p: Math.max(ps.kink, pn.kink), t1t: best / A[st]['casual-tap'].rpe, t1b: best / A[st]['casual-tap-every'].rpe };
  }

  // T2: casual climb (long runs)
  say('\n== T2 casual climb (60 runs x 90 evenings) ==');
  const t2 = {};
  for (const st of STARTERS) {
    const list = []; for (let r = 0; r < (QUICK ? 20 : 60); r++) list.push(runEvenings(st, Casual, 1000 + r, 90));
    const a = aggregate(list);
    t2[st] = { rare: a.rare, epic: a.epic, rpe: a.rpe };
    say(`${st.padEnd(8)} casual: median evenings to Rare ${a.rare ?? '>90'}, to Epic ${a.epic ?? '>90'} (Renown/evening ${f2(a.rpe)} over 90)`);
    const lu = []; for (let r = 0; r < (QUICK ? 20 : 60); r++) lu.push(runEvenings(st, CasualUI, 1000 + r, 90));
    const au = aggregate(lu);
    t2[st].u = { rare: au.rare, epic: au.epic };
    say(`${st.padEnd(8)} casual-ui: median evenings to Rare ${au.rare ?? '>90'}, to Epic ${au.epic ?? '>90'} (Renown/evening ${f2(au.rpe)} over 90)`);
  }

  // T9: heavy vs light planner (best route), per day
  say('\n== T9 heavy (6 Assignations a day) vs light (3 a day) planner, 10 days ==');
  const t9 = {};
  for (const st of STARTERS) {
    const route = verdict[st].bestR;
    const runs = QUICK ? 20 : 60;
    const light = aggregate(Array.from({ length: runs }, (_, r) => runEvenings(st, makePlanner(route, { assignsPerEvening: 1 }), 2000 + r)));
    const heavy = aggregate(Array.from({ length: runs }, (_, r) => runEvenings(st, makePlanner(route, { assignsPerEvening: 2 }), 2000 + r)));
    t9[st] = heavy.rpe / light.rpe;
    say(`${st.padEnd(8)} light ${f2(light.rpe * 3)} Renown/day, heavy ${f2(heavy.rpe * 3)} Renown/day, heavy/light ${f2(t9[st])}`);
  }

  // T5: season, 1-Timeline planner vs 3-Timeline casual
  say('\n== T5 season (28 days, 84 Curtains per whore): 1-Timeline planner vs 3-Timeline casual, Whorescore ==');
  const seasons = QUICK ? 10 : 30;
  const plannerBot = (route) => ({ ...makePlanner(route), duels: true });
  const t5rows = [];
  for (let r = 0; r < seasons; r++) {
    const cas = seasonRun('casual3', ALL_STARTERS, 5000 + r, Casual);
    for (const st of STARTERS) {
      const pl = seasonRun(`planner1-${st}`, [st], 5000 + r, plannerBot(verdict[st].bestR));
      t5rows.push({ st, p: pl.season, c: cas.season, pPer: pl.per, cPer: cas.per, seats: pl.seats.join('+') });
    }
  }
  for (const st of STARTERS) {
    const rows = t5rows.filter((x) => x.st === st);
    const mp = rows.reduce((t, x) => t + x.p, 0) / rows.length; const mc = rows.reduce((t, x) => t + x.c, 0) / rows.length;
    const ahead = rows.filter((x) => x.p > x.c).length / rows.length;
    const dist = {}; rows.forEach((x) => { dist[x.pPer] = (dist[x.pPer] || 0) + 1; });
    say(`${st.padEnd(8)} planner-1 mean ${f2(mp)} vs casual-3 mean ${f2(mc)}  ratio ${f2(mp / mc)}  planner ahead in ${pct(ahead)}  planner results: ${Object.entries(dist).map(([k, n]) => `${k} x${n}`).join(', ')}`);
  }
  const cdist = {}; t5rows.filter((x) => x.st === 'dolly').forEach((x) => { cdist[x.cPer] = (cdist[x.cPer] || 0) + 1; });
  say(`casual-3 results: ${Object.entries(cdist).map(([k, n]) => `${k} x${n}`).join(', ')}`);
  const mpAll = t5rows.reduce((t, x) => t + x.p, 0) / t5rows.length; const mcAll = t5rows.reduce((t, x) => t + x.c, 0) / t5rows.length;
  const aheadAll = t5rows.filter((x) => x.p > x.c).length / t5rows.length;
  // T5r: the same seasons with a planner-grade rival (a stand-in played by the Standing planner, duelling for seats) in every Timeline
  say('\n== T5r season with a planner-grade rival in each Timeline (informational; same pass rule as T5) ==');
  const t5r = [];
  for (let r = 0; r < seasons; r++) {
    const cas = seasonRun('casual3r', ALL_STARTERS, 5000 + r, Casual, plannerBot('standing'));
    for (const st of STARTERS) {
      const pl = seasonRun(`planner1r-${st}`, [st], 5000 + r, plannerBot(verdict[st].bestR), plannerBot('standing'));
      t5r.push({ st, p: pl.season, c: cas.season, pPer: pl.per });
    }
  }
  for (const st of STARTERS) {
    const rows = t5r.filter((x) => x.st === st);
    const mp = rows.reduce((t, x) => t + x.p, 0) / rows.length; const mc = rows.reduce((t, x) => t + x.c, 0) / rows.length;
    const dist = {}; rows.forEach((x) => { dist[x.pPer] = (dist[x.pPer] || 0) + 1; });
    say(`${st.padEnd(8)} planner-1 mean ${f2(mp)} vs casual-3 mean ${f2(mc)}  ahead in ${pct(rows.filter((x) => x.p > x.c).length / rows.length)}  planner results: ${Object.entries(dist).map(([k, n]) => `${k} x${n}`).join(', ')}`);
  }
  const mpR = t5r.reduce((t, x) => t + x.p, 0) / t5r.length; const mcR = t5r.reduce((t, x) => t + x.c, 0) / t5r.length;
  const aheadR = t5r.filter((x) => x.p > x.c).length / t5r.length;

  // Verdicts
  say('\n== Targets (rules-core.md §14.1) ==');
  const pass = (b) => (b ? 'PASS' : 'FAIL');
  const res = {};
  res.T1 = STARTERS.every((st) => verdict[st].t1 >= 1.3 && verdict[st].t1 <= 1.7);
  say(`T1 thinking pays (best planner / casual in 1.3..1.7): ${STARTERS.map((st) => `${st} ${f2(verdict[st].t1)}`).join(', ')} -> ${pass(res.T1)}`);
  res.T2 = STARTERS.every((st) => t2[st].rare != null && t2[st].rare <= 6 && t2[st].epic != null && t2[st].epic <= 60);
  say(`T2 casual climbs (Rare <= 6, Epic <= 60 evenings): ${STARTERS.map((st) => `${st} ${t2[st].rare}/${t2[st].epic ?? '>90'}`).join(', ')} -> ${pass(res.T2)}`);
  // the same two targets for a casual player who follows the on-screen smileys (prototype A review, finding 1)
  const info = {};
  info.T1u = STARTERS.every((st) => verdict[st].t1u >= 1.3 && verdict[st].t1u <= 1.7);
  say(`T1u (informational, proposed) thinking pays vs a smiley-follower (best planner / casual-ui in 1.3..1.7): ${STARTERS.map((st) => `${st} ${f2(verdict[st].t1u)}`).join(', ')} -> ${pass(info.T1u)}`);
  info.T1t = STARTERS.every((st) => verdict[st].t1t >= 1.3 && verdict[st].t1t <= 1.7);
  say(`T1t (informational, round 6) thinking pays vs the page's casual player (best planner / casual-tap in 1.3..1.7): ${STARTERS.map((st) => `${st} ${f2(verdict[st].t1t)}`).join(', ')} -> ${pass(info.T1t)}`);
  info.T2u = STARTERS.every((st) => t2[st].u.rare != null && t2[st].u.rare <= 6 && t2[st].u.epic != null && t2[st].u.epic <= 60);
  say(`T2u (informational, proposed) a smiley-follower climbs (Rare <= 6, Epic <= 60 evenings): ${STARTERS.map((st) => `${st} ${t2[st].u.rare}/${t2[st].u.epic ?? '>90'}`).join(', ')} -> ${pass(info.T2u)}`);
  res.T3 = STARTERS.every((st) => verdict[st].t3 <= 0.4);
  say(`T3 no dominant market card (<= 40% of a planner's Curtain plays): ${STARTERS.map((st) => `${st} max ${pct(verdict[st].t3)}`).join(', ')} -> ${pass(res.T3)}`);
  res.T4 = STARTERS.every((st) => verdict[st].t4 <= 0.4);
  say(`T4 no dominant Place (pooled planner visits <= 40%): ${STARTERS.map((st) => `${st} max ${pct(verdict[st].t4)}`).join(', ')} -> ${pass(res.T4)}`);
  res.T5 = mpAll >= 1.1 * mcAll && aheadAll >= 0.55;
  say(`T5 depth beats breadth (planner-1 mean >= 1.1x casual-3, ahead >= 55%): mean ${f2(mpAll)} vs ${f2(mcAll)} (${f2(mpAll / mcAll)}x), ahead ${pct(aheadAll)} -> ${pass(res.T5)}`);
  say(`T5r (informational) the same with a planner-grade rival in each Timeline: mean ${f2(mpR)} vs ${f2(mcR)} (${f2(mpR / mcR)}x), ahead ${pct(aheadR)} -> ${pass(mpR >= 1.1 * mcR && aheadR >= 0.55)}`);
  res.T6 = STARTERS.every((st) => verdict[st].t6 >= 0.85 && verdict[st].t6boards);
  say(`T6 both routes viable (weaker >= 85% of stronger; Notoriety richer, Standing more respectable): ${STARTERS.map((st) => `${st} ${f2(verdict[st].t6)} coinEarned N/S ${verdict[st].richest} peakStanding S/N ${verdict[st].respect}`).join('; ')} -> ${pass(res.T6)}`);
  res.T7 = STARTERS.every((st) => verdict[st].t7 <= 0.1 && verdict[st].t7n <= 0.1);
  say(`T7 casual is safe (<= 0.10 afflictions/evening; the Police Gazette casual takes back alleys too): ${STARTERS.map((st) => `${st} ${f2(verdict[st].t7)} (casual-gazette ${f2(verdict[st].t7n)})`).join(', ')} -> ${pass(res.T7)}`);
  const fr = STARTERS.filter((st) => verdict[st].t8 != null);
  res.T8 = fr.every((st) => verdict[st].t8 >= 0.05 && verdict[st].t8 <= 0.25);
  say(`T8 afflictions are seen (Frolic-signature planner 0.05..0.25/evening): ${fr.map((st) => `${st} ${f2(verdict[st].t8)}`).join(', ')} -> ${pass(res.T8)}`);
  res.T9 = STARTERS.every((st) => t9[st] <= 1.15);
  say(`T9 time can't buy rank (heavy/light <= 1.15): ${STARTERS.map((st) => `${st} ${f2(t9[st])}`).join(', ')} -> ${pass(res.T9)}`);
  res.T10 = STARTERS.every((st) => verdict[st].t10v >= 1);
  say(`T10 the Gutter has company (other whores she meets at the Gutter Place, per visit, all bots pooled, >= 1; every-Curtain average for the record): ${STARTERS.map((st) => `${st} ${f2(verdict[st].t10v)} (notoriety planner ${f2(verdict[st].t10n)}; every Curtain ${f2(verdict[st].t10)})`).join(', ')} -> ${pass(res.T10)}`);
  res.T11 = STARTERS.every((st) => verdict[st].t11c <= 0.5 * verdict[st].t11p);
  say(`T11 Kinks are earned (casual-tap Kink hits/evening <= half the better planner's; casual-tap taps the plan screen's Kink offer and the page's Best Guess): ${STARTERS.map((st) => `${st} ${f2(verdict[st].t11c)} vs ${f2(verdict[st].t11p)} (casual ${f2(verdict[st].t11c0)})`).join(', ')} -> ${pass(res.T11)}`);
  say(`T11b (informational: the rejected option, the offer every evening) casual-tap-every Kink hits/evening vs the better planner's, and best planner / casual-tap-every Renown: ${STARTERS.map((st) => `${st} ${f2(verdict[st].t11b)} vs ${f2(verdict[st].t11p)} (T1 ${f2(verdict[st].t1b)})`).join(', ')} -> ${pass(STARTERS.every((st) => verdict[st].t11b <= 0.5 * verdict[st].t11p))}`);
  // T12 (round 4; round 7 rewording): the road follows what she does, not a declaration. A lazy player who likes the dives
  // (casual-gazette) ends in the Police Gazette (Notoriety above Standing) and still climbs (Rare within 6 evenings); a casual
  // player who never picks the Gutter stays in the Society Pages (Standing >= Notoriety): Best Guess and the Standing Order
  // alone never move her paper, so an idle player is never pushed onto the other road.
  res.T12 = STARTERS.every((st) => { const a = verdict[st].cn; const c0 = A[st].casual; return a.noto > a.standing && c0.standing >= c0.noto && a.rare != null && a.rare <= 6; });
  say(`T12 the road follows her nights (casual-gazette ends Notoriety > Standing and reaches Rare <= 6 evenings; casual stays Standing >= Notoriety): ${STARTERS.map((st) => { const a = verdict[st].cn; const c0 = A[st].casual; return `${st} N/S ${f2(a.noto)}/${f2(a.standing)} Renown/evening ${f2(a.rpe)} Rare ${a.rare ?? '>30'} (casual S/N ${f2(c0.standing)}/${f2(c0.noto)})`; }).join('; ')} -> ${pass(res.T12)}`);
  // T12b (informational, round 7): the way back. casual-reform cleans up after 10 evenings in the Gazette; share of runs that
  // end back in the Society Pages, and how many were past the point where Scrubbed gentlemen stop seeing her (Notoriety 8).
  say(`T12b (informational) the way back (casual-reform: 10 evenings in the Gazette, then 20 clean; share back in the Society Pages at evening 30): ${STARTERS.map((st) => { const a = verdict[st].cr; return `${st} ${pct(a.societyEnd)} back (N/S at evening ${REFORM_AT} ${f2(a.notoAtTurn)}/${f2(a.standingAtTurn)}, ${pct(a.lockedAtTurn)} at Notoriety ${R.assign.notorietyRefuseScrubbedAt}+; N/S at 30 ${f2(a.noto)}/${f2(a.standing)}, Renown/evening ${f2(a.rpe)})`; }).join('; ')} -> ${pass(STARTERS.every((st) => verdict[st].cr.societyEnd >= 0.5))}`);
  // T13 (round 4; gated since round 5): the Low Road's Coin has somewhere to go: the Notoriety planner ends 30 evenings with
  // at most 40% of the Coin she earned still in her purse. Round 5 gave Coin things to buy that show (the Ladder of lodgings
  // and finery, the Morning Special, Grease Palms and the Gambler's stake priced by tier), so it is now a gate.
  res.T13 = STARTERS.every((st) => verdict[st].unspentN <= 0.4);
  say(`T13 Low Road Coin is spent (planner-notoriety unspent Coin at evening 30 <= 40% of earned): ${STARTERS.map((st) => `${st} ${pct(verdict[st].unspentN)} (Standing planner ${pct(verdict[st].unspentS)})`).join(', ')} -> ${pass(res.T13)}`);
  const all = Object.values(res).every(Boolean);
  if (ARENA) arenaReport(say);
  say(`\nALL TARGETS: ${all ? 'MET' : 'NOT MET'} (${Object.entries(res).filter(([, v]) => !v).map(([k]) => k).join(', ') || 'none failing'})  levers=${LEVER_STR}  [${((Date.now() - t0) / 1000).toFixed(0)} s]`);
  return all;
}

const ok = main();
process.exitCode = ok ? 0 : 1;
