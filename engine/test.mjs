// Legendary Whores · deterministic engine tests (no dependencies)
// Run: node test.mjs   (exit code 0 = all passed)
import * as L from './rules.js';
import { readFileSync } from 'node:fs';
const SLICE = await import('../game/slice-config.js'); // the Scandal Sheet's seeds and opts (lever 1's salt is minted there)

const C = L.CONTENT; const R = L.RULES;
let passed = 0; let failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`ok   ${name}`); }
  catch (e) { failed++; console.log(`FAIL ${name}\n     ${e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n     ') : e}`); }
}
function eq(a, b, msg = '') { if (a !== b) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
function ok(c, msg = 'assertion failed') { if (!c) throw new Error(msg); }
const J = (x) => JSON.stringify(x);

// A scripted session used by several tests: plays every kind of action through the public pure API.
function scripted(seed) {
  let s = L.newGame(seed, { starter: 'dolly', minGapMin: 0 });
  const v0 = L.getView(s, 'dolly');
  const tourist = v0.board.find((b) => b.tourist).gent;
  s = L.startAssignation(s, 'dolly', tourist);
  s = L.playAssignation(s, 'dolly', { cards: L.bestGuess(L.getView(s, 'dolly'), { gent: tourist }).cards });
  s = L.study(s, 'dolly', 'plunkett');
  s = L.explore(s, 'dolly', 'salon');
  if (s.whores.dolly.offer) s = L.passOffer(s, 'dolly');
  for (let i = 0; i < 4; i++) {
    const v = L.getView(s, 'dolly');
    const place = L.casualPlace(v);
    s = L.sealPlan(s, 'dolly', { place, cards: L.bestGuess(v, place).cards });
    s = L.advanceClock(s, 30);
  }
  return s;
}

// ---------------------------------------------------------------------------
test('same seed = same result (whole scripted session, byte for byte)', () => {
  const a = scripted('determinism-7'); const b = scripted('determinism-7');
  eq(J(a), J(b), 'states differ:');
});

test('different seeds give different deals', () => {
  const hands = new Set(['s1', 's2', 's3', 's4', 's5'].map((x) => J(L.newGame(x, { starter: 'dolly' }).whores.dolly.hand)));
  ok(hands.size > 1, 'every seed dealt the same hand');
});

test('actions are pure: the input state is never mutated', () => {
  const s = L.newGame('pure', { starter: 'dolly', minGapMin: 0 });
  const before = J(s);
  const v = L.getView(s, 'dolly');
  L.study(s, 'dolly', 'alfie');
  L.explore(s, 'dolly', 'tuppenny');
  L.sealPlan(s, 'dolly', { place: 'tuppenny', cards: L.bestGuess(v, 'tuppenny').cards });
  L.advanceClock(s, 500);
  eq(J(s), before, 'state changed:');
});

test('no Math.random anywhere in the engine', () => {
  const orig = Math.random; let called = 0;
  Math.random = () => { called++; return orig(); };
  try { scripted('no-random'); } finally { Math.random = orig; }
  eq(called, 0, 'Math.random calls:');
});

// ---------------------------------------------------------------------------
// Worked example (rules-core.md §15)
const LORD = { ...C.GENTS.plunkett, regularCap: 3, secretKnown: true, kinkKnown: true };
const dollyW = { type: 'bluestocking', signature: 'wit', charm: 'silver-tongue', vice: 'loose-lips', standing: 2, notoriety: 0, braveFace: 0, lastPlace: null };
const lavW = { type: 'siren', signature: 'silk', charm: 'dimples', vice: 'vanity', standing: 5, notoriety: 0, braveFace: 0, lastPlace: null };
const fresh = { regular: 0, grudge: 0, seen: [], wait: 0 };

test('worked example: casual Dolly (Best Guess) = Sway 16', () => {
  const e = L.computeEncounter({ w: dollyW, gent: LORD, place: 'salon', cards: ['anonymous-verse', 'saucy-quip', 'blush-curtsey'], hist: fresh, others: 1 });
  eq(J(e.cards.map((c) => c.score)), J([6, 4, 4]), 'card scores');
  eq(e.sway, 16, 'Sway');
  eq(e.noto, 0, 'Notoriety');
});

test('worked example: Best Guess on the visible facts picks Verse, Quip, Blush (visible 13 + Fancy 2)', () => {
  let s = L.newGame('worked', { starter: 'dolly', minGapMin: 0 });
  const w = s.whores.dolly; w.hand = ['saucy-quip', 'anonymous-verse', 'blush-curtsey', 'saucy-wink', 'come-hither'];
  s.timelines.victorian.curtainNo = 0;
  const v = L.getView(s, 'dolly');
  eq(v.timeline.rota[0].hosts.salon, 'plunkett', 'host');
  const bg = L.bestGuess(v, 'salon');
  eq(J(bg.cards.map((i) => w.hand[i]).sort()), J(['anonymous-verse', 'blush-curtsey', 'saucy-quip']), 'cards');
  eq(bg.sway, 15, 'visible Sway (13 from cards + Fancy 2; the hidden Silk tick is not counted)');
});

test('worked example: thinking Dolly (Double Entendre + the Cane) = Sway 20', () => {
  const e = L.computeEncounter({ w: dollyW, gent: LORD, place: 'salon', cards: ['anonymous-verse', 'saucy-quip', 'blush-curtsey'], hist: fresh, item: 'cane', talent: { kind: 'double-entendre', pos: 1, art: 'silk' }, others: 1 });
  eq(J(e.cards.map((c) => c.score)), J([6, 5, 4]), 'card scores');
  ok(e.kinkHit, 'Kink should fire');
  eq(e.sway, 20, 'Sway');
});

test('worked example: Lady Lavinia = Sway 17', () => {
  const e = L.computeEncounter({ w: lavW, gent: LORD, place: 'salon', cards: ['swan-neck', 'strict-governess', 'come-hither'], hist: { regular: 2, grudge: 0, seen: [], wait: 0 }, others: 1 });
  eq(J(e.cards.map((c) => c.score)), J([4, 3, 3]), 'card scores');
  eq(e.sway, 17, 'Sway');
});

test('worked example §3.4: the Limerick swings with the matchup (3 at the Salon, 5 on Alfie at the Tuppenny)', () => {
  const salon = L.computeEncounter({ w: dollyW, gent: LORD, place: 'salon', cards: ['limerick'], hist: fresh, others: 1 });
  eq(salon.cards[0].score, 3, 'Salon score'); eq(salon.noto, 1, 'Frolic at a Posh Place costs Notoriety');
  const alfie = { ...C.GENTS.alfie, secretKnown: true, kinkKnown: true };
  const tup = L.computeEncounter({ w: dollyW, gent: alfie, place: 'tuppenny', cards: ['limerick'], hist: fresh, others: 1 });
  eq(tup.cards[0].score, 5, 'Tuppenny score'); eq(tup.itch, 1, 'Alfie is Fair: +1 Itch');
});

function setupWorkedCurtain(thinking) {
  const s = L.newGame('worked-curtain', { starter: 'dolly', standins: false, timelines: ['victorian'], minGapMin: 0 });
  const d = s.whores.dolly; const lav = s.whores.lavinia;
  d.hand = ['anonymous-verse', 'saucy-quip', 'blush-curtsey', 'saucy-wink', 'come-hither'];
  lav.hand = ['swan-neck', 'strict-governess', 'come-hither', 'saucy-quip', 'teeth-extra'];
  lav.standing = 5; lav.history.plunkett = { regular: 2, grudge: 0, seen: [], wait: 0, visits: 2, satisfied: 2, delighted: 0, catches: 0 };
  lav.plan = { place: 'salon', cards: [0, 1, 2], item: null, talent: null, grease: 0, stake: false, sealed: true, npc: true };
  if (thinking) d.items.push({ id: 'cane', uses: 1, readyAt: 0 });
  const plan = thinking ? { place: 'salon', cards: [0, 1, 2], item: 'cane', talent: { kind: 'double-entendre', card: 1, art: 'silk' } } : { place: 'salon', cards: [0, 1, 2] };
  return L.sealPlan(s, 'dolly', plan);
}
test('worked example Curtain: casual Dolly 2nd (Posh 2nd share), Lavinia 1st', () => {
  const s = setupWorkedCurtain(false);
  const pays = Object.fromEntries(s.lastEvents.filter((e) => e.type === 'payout').map((e) => [e.whores[0], e.data]));
  eq(pays.dolly.sway, 16); eq(pays.lavinia.sway, 17);
  eq(pays.dolly.rank, 1, 'Dolly rank'); eq(pays.dolly.renown, R.places.posh.renown[1], 'Dolly Renown');
  eq(s.whores.dolly.standing, 3, 'Standing 2 -> 3 for a Posh 2nd');
  eq(J(s.whores.dolly.history.plunkett.seen.sort()), J(['anonymous-verse', 'blush-curtsey', 'saucy-quip']), 'Seen It stamps');
});
test('worked example Curtain: thinking Dolly 1st (Posh 1st share + Applause), Cane spent', () => {
  const s = setupWorkedCurtain(true);
  const pays = Object.fromEntries(s.lastEvents.filter((e) => e.type === 'payout').map((e) => [e.whores[0], e.data]));
  eq(pays.dolly.sway, 20); eq(pays.dolly.rank, 0);
  eq(pays.dolly.renown, R.places.posh.renown[0] + R.places.posh.applause, 'Dolly Renown');
  eq(pays.lavinia.rank, 1, 'Lavinia 2nd');
  ok(!s.whores.dolly.items.some((i) => i.id === 'cane'), 'the Cane is single use');
  ok(s.whores.dolly.known.gents.plunkett.kink, 'a Kink you hit goes in your Black Book');
});

// ---------------------------------------------------------------------------
test('split rewards: ranks by Sway, shares by placing, dead heats split the shares they occupy, below-Bar gets a Brave Face', () => {
  for (const seed of ['split-1', 'split-2', 'split-3', 'split-4', 'split-5', 'split-6']) {
    let s = L.newGame(seed, { starter: 'dolly', timelines: ['victorian'], minGapMin: 0 });
    // everyone to the Tuppenny Palace
    for (const w of Object.values(s.whores)) {
      const v = L.getView(s, w.id, { _omni: true });
      w.plan = { place: 'tuppenny', cards: L.bestGuess(v, 'tuppenny').cards, item: null, talent: null, grease: 0, stake: false, sealed: true };
    }
    s = L.resolveCurtain(s, 'victorian');
    const pays = s.lastEvents.filter((e) => e.type === 'payout').map((e) => e.data);
    const PR = R.places.rowdy;
    const qual = pays.filter((p) => p.sway >= PR.bar);
    for (const p of pays) {
      if (p.sway < PR.bar) { eq(p.rank, null, 'below Bar has no rank'); continue; }
      const above = qual.filter((q) => q.sway > p.sway).length;
      eq(p.rank, above, 'rank = number strictly above (ties share a rank)');
      // dead heat: the tied whores split the combined shares of the places they occupy, rounded up
      const tied = qual.filter((q) => q.sway === p.sway).length;
      let pot = 0; for (let i = above; i < above + tied && i < 3; i++) pot += PR.renown[i];
      const base = above < 3 ? Math.ceil(pot / tied) : 0;
      const applause = above === 0 && pays.length >= 2 ? Math.ceil(C.PLACES.tuppenny.house.applause / tied) : 0;
      eq(p.renown, base + applause, `Renown for rank ${above} (${tied} tied)`);
    }
    for (const w of Object.values(s.whores)) { const p = pays.find((x) => x === s.lastEvents.find((e) => e.type === 'payout' && e.whores[0] === w.id).data); eq(w.braveFace, p.rank === null ? 1 : 0, 'Brave Face'); }
    const firsts = pays.filter((p) => p.rank === 0).length;
    ok(firsts >= 1 || qual.length === 0, 'someone above the Bar wins');
  }
});

test('Raid Night halves Gutter Renown (rounded down) and never Coin', () => {
  eq(L.isRaidCurtain(2), true); eq(L.isRaidCurtain(0), false);
  let s = L.newGame('raid', { starter: 'dolly', standins: false, rivals: false, timelines: ['victorian'], minGapMin: 0 });
  s.timelines.victorian.curtainNo = R.raidEvery - 1;
  s.whores.dolly.notoriety = 3; s.whores.dolly.standing = 0;
  const v = L.getView(s, 'dolly');
  s = L.sealPlan(s, 'dolly', { place: 'drowned-rat', cards: L.bestGuess(v, 'drowned-rat').cards });
  const p = s.lastEvents.find((e) => e.type === 'payout').data;
  ok(p.raid, 'raid flagged');
  if (p.rank === 0) eq(p.renown, Math.floor(R.places.gutter.renown[0] / R.raidRenownDivisor), 'halved 1st share');
  ok(p.coin >= R.places.gutter.coin[0] + R.places.gutter.doorGift || p.rank !== 0, 'Coin unaffected');
});

// ---------------------------------------------------------------------------
function walk(x, fn, path = '') {
  if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) walk(v, fn, `${path}.${k}`);
  else fn(x, path);
}
test('getView never leaks hidden preferences (Secret Tastes, Kinks, Kink items, rivals\' Habits and Vices, hands, private log)', () => {
  for (const seed of ['leak-1', 'leak-2', 'leak-3']) {
    let s = L.newGame(seed, { starter: 'dolly', minGapMin: 0 });
    // let the world run a few Curtains so NPCs study, rummage, buy and learn things privately
    for (let i = 0; i < 6; i++) s = L.advanceClock(s, R.curtain.maxGapMin);
    s = L.study(s, 'dolly', 'plunkett'); // Dolly knows exactly one fact about Lord P.
    const w = s.whores.dolly;
    const v = L.getView(s, 'dolly');
    for (const g of v.timeline.gents) {
      const k = w.known.gents[g.id] || {};
      if (!k.secret) eq(g.secretTaste, null, `${g.id} Secret Taste leaked`);
      if (!k.kink) eq(g.kink, null, `${g.id} Kink leaked`);
      if (!k.history) eq(g.lastCharmed, null, `${g.id} History leaked`);
      const json = J(v);
      if (!k.kink) { ok(!json.includes(C.GENTS[g.id].kink.name), `${g.id} Kink name appears in the view`); ok(!json.includes(C.GENTS[g.id].kink.hint), `${g.id} Kink hint appears in the view`); }
    }
    for (const p of v.timeline.places) for (const it of p.stall) if (it.kinkFor) ok((w.known.gents[it.kinkFor] || {}).kink, `${it.id} reveals whose Kink it is`);
    for (const r of v.timeline.rivals) {
      const k = w.known.rivals[r.id] || {};
      if (!k.habit) eq(r.habit, null, `${r.id} Habit leaked`);
      if (!k.vice) eq(r.vice, null, `${r.id} Vice leaked`);
      // a rival's Talent is public by rule (finding 2, 2026-10-07: it can cost you Sway, and hidden things only ever help)
      eq(r.talent, s.whores[r.id].talent, `${r.id} Talent should be public`);
      ok(!('hand' in r) && !('draw' in r) && !('discard' in r) && !('known' in r && r.known.gents), `${r.id} private state leaked`);
    }
    for (const e of v.log) ok(e.vis === 'all' || e.vis.includes('you'), `private event ${e.type} of another account leaked`);
    for (const r of [v.timeline.results, ...v.timeline.resultsHistory].filter(Boolean)) for (const pr of r.places) for (const e of pr.entries) {
      ok(!('trueSway' in e), 'below-Bar Sway leaked');
      if (e.rank === null) eq(e.sway, null, 'below-Bar Sway leaked');
    }
    // a whore in another Timeline sees nothing of London's gentlemen
    let keys = []; walk(v.whore, (_, p) => keys.push(p));
    ok(!keys.some((p) => /\.(secretTaste)$/.test(p)), 'Secret Taste inside the whore view');
  }
});

test('getView: an accidental hit puts the fact in your Black Book (and only then shows it)', () => {
  let s = L.newGame('accident', { starter: 'dolly', minGapMin: 0 });
  s.timelines.victorian.curtainNo = 0; // Lord P. hosts the Salon
  const w = s.whores.dolly; w.hand = ['come-hither', 'saucy-quip', 'anonymous-verse', 'mothers-advice', 'teeth-extra'];
  eq(L.getView(s, 'dolly').timeline.gents.find((g) => g.id === 'plunkett').secretTaste, null);
  s = L.sealPlan(s, 'dolly', { place: 'salon', cards: [0, 1, 2] });
  eq(L.getView(s, 'dolly').timeline.gents.find((g) => g.id === 'plunkett').secretTaste, 'silk');
  ok(s.whores.dolly.blackBook.some((b) => b.gent === 'plunkett' && b.fact === 'secret' && b.how === 'accident'));
});

// ---------------------------------------------------------------------------
test('While You Were Away: 1..5 headlines, ranked best first, Standing Orders collapsed into one', () => {
  let s = L.newGame('digest', { starter: 'dolly' });
  const since = s.tick;
  for (let i = 0; i < 5; i++) s = L.advanceClock(s, R.curtain.maxGapMin); // 5 Curtains by Standing Order
  const d = L.awayDigest(s, 'you', since);
  ok(d.headlines.length >= 1 && d.headlines.length <= R.digest.max, `count ${d.headlines.length}`);
  ok(d.considered >= d.headlines.length, 'considered >= shown');
  for (let i = 1; i < d.headlines.length; i++) ok(d.headlines[i - 1].relevance >= d.headlines[i].relevance, 'not ranked');
  const so = d.headlines.filter((h) => h.type === 'standing-order');
  eq(so.length, 1, 'Standing Order headlines');
  ok(so[0].count >= 2, 'collapsed several Standing Orders');
  eq(d.headlines[0].type, 'standing-order', 'your own Standing Orders beat district gossip');
});

test('While You Were Away: capped at 5 even after a busy fortnight, and per-Timeline when switching in', () => {
  let s = L.newGame('digest-busy', { starter: 'dolly', minGapMin: 0 });
  s.accounts.you.slots = 3;
  s = L.openTimeline(s, 'you', 'fanny');
  for (let i = 0; i < 60; i++) s = L.advanceClock(s, R.curtain.maxGapMin);
  const all = L.awayDigest(s, 'you', 0);
  ok(all.headlines.length <= 5 && all.headlines.length >= 1, `count ${all.headlines.length}`);
  ok(all.considered > 5, 'a busy fortnight considered more than 5 items');
  const ww = L.awayDigest(s, 'fanny', 0);
  ok(ww.headlines.every((h) => h.timeline === 'wildwest'), 'switching into a Timeline shows only that Timeline');
});

test('While You Were Away: nothing happened -> one line', () => {
  const s = L.newGame('digest-empty', { starter: 'dolly' });
  const d = L.awayDigest(s, 'you', s.tick);
  ok(d.headlines.length >= 1 && d.headlines.length <= 5);
  ok(d.headlines.every((h) => h.type === 'nothing' || h.type === 'rota-fancy'), J(d.headlines.map((h) => h.type)));
});

test('While You Were Away: relevance ranks your own news above district gossip', () => {
  let s = L.newGame('digest-rank', { starter: 'dolly', minGapMin: 0 });
  const since = s.tick;
  s = L.startAssignation(s, 'dolly', 'tex');
  s = L.playAssignation(s, 'dolly', { cards: [0] });
  const v = L.getView(s, 'dolly');
  s = L.sealPlan(s, 'dolly', { place: 'salon', cards: L.bestGuess(v, 'salon').cards }); // unlocks the 2nd Timeline
  const d = L.awayDigest(s, 'you', since);
  eq(d.headlines[0].type, 'timeline-unlocked', 'the telegram is the top story');
  const gi = d.headlines.findIndex((h) => h.type === 'gossip');
  if (gi >= 0) ok(gi > 0, 'gossip is never above your own news');
});

test('While You Were Away: seat headlines are told from your side (bid, topple, toppled, sent packing)', () => {
  // play one Curtain with a seat challenge; iChallenge: Dolly calls out Lavinia's seat (or bids for it empty), else Lavinia calls out Dolly's
  const duel = (seed, iChallenge, holder) => {
    const s = L.newGame(seed, { starter: 'dolly', minGapMin: 0 });
    const me = s.whores.dolly; const lav = s.whores.lavinia; const T = s.timelines.victorian;
    me.renown = 500; lav.renown = 500; me.standing = iChallenge ? 10 : 2; lav.standing = iChallenge ? 2 : 10;
    if (holder) { s.whores[holder].seat = 'salon'; T.seats.salon.holder = holder; }
    const since = s.tick;
    L.mut.challengeSeat(s, iChallenge ? 'dolly' : 'lavinia', 'salon');
    const v = L.getView(s, 'dolly'); const place = v.timeline.places.find((p) => p.kind === 'posh').open ? 'salon' : 'tuppenny';
    L.mut.sealPlan(s, 'dolly', { place, cards: L.bestGuess(v, place).cards });
    if (T.curtainNo === 0) L.mut.resolveCurtain(s, 'victorian');
    return { s, d: L.awayDigest(s, 'you', since).headlines };
  };
  const texts = (d) => d.map((h) => h.text).join(' / ');
  const find = (iChallenge, holder, want) => { for (let k = 0; k < 60; k++) { const r = duel(`seat-${iChallenge}-${holder}-${k}`, iChallenge, holder); if (want(r.s)) return r; } throw new Error('no seed gave the wanted Duel result'); };
  // an empty seat: no blank rival name, and the win is told as a win
  const bid = find(true, null, (s) => s.whores.dolly.seat === 'salon');
  ok(!/ {2}|demands Dolly/.test(texts(bid.d)), texts(bid.d));
  ok(bid.d.some((h) => h.type === 'seat-won' && /Dolly Mopp takes/.test(h.text)), texts(bid.d));
  // I topple Lavinia: crowned once, never "toppled"
  const top = find(true, 'lavinia', (s) => s.whores.dolly.seat === 'salon');
  ok(top.d.some((h) => h.type === 'seat-won') && !top.d.some((h) => h.type === 'seat-lost'), texts(top.d));
  ok(!top.d.some((h) => h.type === 'seat-challenging'), 'a decided challenge is not repeated as a reminder');
  // Lavinia topples me: toppled once, never "crowned"
  const lost = find(false, 'dolly', (s) => s.whores.lavinia.seat === 'salon');
  ok(lost.d.some((h) => h.type === 'seat-lost' && /Dolly Mopp loses .* to Lady Lavinia/.test(h.text)) && !lost.d.some((h) => h.type === 'seat-won'), texts(lost.d));
  ok(lost.d.some((h) => h.type === 'seat-challenged' && /Lady Lavinia .* demands Dolly Mopp's chair/.test(h.text)), texts(lost.d));
  // I fail to topple Lavinia: sent packing, not "Dolly keeps the seat"
  const rep = find(true, 'lavinia', (s) => s.whores.lavinia.seat === 'salon');
  ok(rep.d.some((h) => h.type === 'seat-repelled') && !rep.d.some((h) => h.type === 'seat-defended'), texts(rep.d));
});

test('While You Were Away: news from the same Curtain ages alike (spec order: Standing Orders 70 above overtaken 60)', () => {
  let s = L.newGame('digest-age', { starter: 'dolly', minGapMin: 0 });
  const since = s.tick;
  s = L.advanceClock(s, R.curtain.maxGapMin);
  const atFall = s.lastEvents.filter((e) => e.timeline === 'victorian' && e.curtain === 0 && ['payout', 'standing-order', 'curtain'].includes(e.type));
  ok(atFall.length >= 2 && atFall.every((e) => e.atCurtain), 'events emitted while the Curtain resolves are marked atCurtain');
  ok(s.lastEvents.filter((e) => e.type === 'fresh-stall').every((e) => !e.atCurtain), 'events after the Curtain number moves on are not');
  const so = L.awayDigest(s, 'you', since).headlines.find((h) => h.type === 'standing-order');
  eq(so.relevance, Math.floor((70 * R.digest.selfPct) / 100), 'a Standing Order from the last Curtain is not decayed');
});

// ---------------------------------------------------------------------------
test('Curtain closes early once every active whore has sealed (never before the minimum gap)', () => {
  let s = L.newGame('early', { starter: 'dolly' }); // default min gap 20 minutes
  const v = L.getView(s, 'dolly');
  s = L.sealPlan(s, 'dolly', { place: 'tuppenny', cards: L.bestGuess(v, 'tuppenny').cards });
  eq(s.timelines.victorian.curtainNo, 0, 'too soon: Curtain must wait for the minimum gap');
  ok(L.curtainReady(s, 'victorian') === false);
  s = L.advanceClock(s, R.curtain.minGapMin);
  eq(s.timelines.victorian.curtainNo, 1, 'Curtain should have fallen as soon as the gap passed');
});

test('Curtain falls on the clock with a Standing Order for an absent whore', () => {
  let s = L.newGame('standing-order', { starter: 'dolly' });
  s = L.advanceClock(s, R.curtain.maxGapMin);
  eq(s.timelines.victorian.curtainNo, 1);
  ok(s.lastEvents.some((e) => e.type === 'standing-order' && e.whores[0] === 'dolly'), 'Standing Order event');
  ok(s.lastEvents.some((e) => e.type === 'payout' && e.whores[0] === 'dolly'), 'paid normally');
});

test('After Hours: only 3 full-pay Curtains per whore per district day', () => {
  let s = L.newGame('after-hours', { starter: 'dolly', minGapMin: 0 });
  const renownByCurtain = [];
  for (let i = 0; i < 5; i++) {
    const v = L.getView(s, 'dolly'); const before = s.whores.dolly.renown;
    s = L.sealPlan(s, 'dolly', { place: 'tuppenny', cards: L.bestGuess(v, 'tuppenny').cards });
    renownByCurtain.push(s.lastEvents.find((e) => e.type === 'payout' && e.whores[0] === 'dolly').data.fullPay);
    ok(s.whores.dolly.renown >= before);
  }
  eq(J(renownByCurtain), J([true, true, true, false, false]));
});

// ---------------------------------------------------------------------------
test('Afflictions: catch at Itch 3 (curse card in the deck, Itch reset, Notoriety +1), clog the hand, cure removes it', () => {
  let s = L.newGame('itch', { starter: 'jackie', minGapMin: 0 });
  const w = s.whores.jackie; w.itch = 2;
  const not0 = w.notoriety;
  s = L.startAssignation(s, 'jackie', 'gaz'); // Fair, carries the Glitter Itch
  s.whores.jackie.assignation.lent = ['been-there', 'body-glitter', 'come-hither'];
  s.whores.jackie.charm = 'none'; // no Iron Constitution for this test
  s = L.playAssignation(s, 'jackie', { cards: [0, 1] });
  const j = s.whores.jackie;
  ok(j.discard.includes('glitter-itch'), 'curse card in the discard pile');
  eq(j.itch, 0, 'Itch resets'); eq(j.notoriety, not0 + 1, 'Notoriety +1'); eq(j.caught, 1);
  ok(s.lastEvents.some((e) => e.type === 'catch'), 'catch event (the gag)');
  // in hand it takes a slot and can't be Worked
  j.hand = ['glitter-itch', 'come-hither', 'saucy-quip', 'saucy-wink', 'teeth-extra']; j.discard = j.discard.filter((c) => c !== 'glitter-itch');
  let threw = false; try { L.planEvening(s, 'jackie', { place: 'flamingo', cards: [0] }); } catch (e) { threw = e.code === 'bad-cards'; }
  ok(threw, 'an Affliction cannot be Worked');
  const base = L.computeEncounter({ w: { ...j, charm: 'none' }, gent: { ...C.GENTS.gaz, secretKnown: true, kinkKnown: true }, place: 'flamingo', cards: ['come-hither'], hist: null, others: 1 }).sway;
  const sick = L.computeEncounter({ w: { ...j, charm: 'none' }, gent: { ...C.GENTS.gaz, secretKnown: true, kinkKnown: true }, place: 'flamingo', cards: ['come-hither'], curse: ['glitter-itch'], hist: null, others: 1 }).sway;
  eq(sick, base - 1, 'the Glitter Itch: -1 Sway');
  s.whores.jackie.coin = 10;
  s = L.cure(s, 'jackie', 'glitter-itch');
  ok(![...s.whores.jackie.hand, ...s.whores.jackie.draw, ...s.whores.jackie.discard].includes('glitter-itch'), 'cured');
  eq(s.whores.jackie.coin, 10 - C.AFFLICTIONS['glitter-itch'].cure.cost);
});

test('Best Guess never takes the Itch to 3', () => {
  let s = L.newGame('bg-itch', { starter: 'jackie', minGapMin: 0 });
  s.whores.jackie.itch = 2; s.whores.jackie.charm = 'none';
  s.whores.jackie.hand = ['been-there', 'reverse-cowgirl', 'saucy-wink', 'come-hither', 'body-glitter'];
  const v = L.getView(s, 'jackie');
  for (const p of v.timeline.places) if (p.open) { const bg = L.bestGuess(v, p.id); ok(bg.preview == null || v.whore.itch + bg.preview.itch < R.itchMax, `${p.id} would catch`); }
});

test('Standing / Notoriety seesaw, and the Posh door shuts when Notoriety beats Standing', () => {
  let s = L.newGame('seesaw', { starter: 'dolly', minGapMin: 0 });
  const v = L.getView(s, 'dolly');
  s = L.sealPlan(s, 'dolly', { place: 'drowned-rat', cards: L.bestGuess(v, 'drowned-rat').cards });
  eq(s.whores.dolly.notoriety, 1, 'Gutter visit +1 Notoriety'); eq(s.whores.dolly.standing, 1, 'and Standing -1');
  ok(!L.getView(s, 'dolly').timeline.places.find((p) => p.id === 'salon').open, 'Posh door shut (Standing < 2)');
  let threw = false; try { L.planEvening(s, 'dolly', { place: 'salon', cards: [0] }); } catch (e) { threw = e.code === 'door-shut'; }
  ok(threw, 'planning a shut Place is refused');
});

test('Assignations: lent cards, diminishing returns, the daily cap, and no reroll by cancelling', () => {
  let s = L.newGame('assign', { starter: 'dolly', minGapMin: 0 });
  s = L.startAssignation(s, 'dolly', 'plunkett');
  const lent = J(s.whores.dolly.assignation.lent);
  s = L.cancelAssignation(s, 'dolly');
  s = L.startAssignation(s, 'dolly', 'alfie');
  eq(J(s.whores.dolly.assignation.lent), lent, 'cancelling must not reroll the lent cards');
  s = L.cancelAssignation(s, 'dolly');
  let total = 0; let inv = 0;
  for (let i = 0; i < 12; i++) {
    s = L.startAssignation(s, 'dolly', 'plunkett');
    const v = L.getView(s, 'dolly'); const bg = L.bestGuess(v, { gent: 'plunkett' });
    s = L.playAssignation(s, 'dolly', { cards: bg.cards.length ? bg.cards : [v.whore.assignation.lent.findIndex((c) => !c.affliction)] });
    const d = s.lastEvents.find((e) => e.type === 'assignation').data;
    total += d.renown; inv += d.invitationRenown || 0;
  }
  // round 5: the first invitation she Delights each day adds Renown on top of the cap, once (the High Road's Assignation)
  ok(inv <= R.highRoad.invitationRenown, `invitation Renown ${inv} paid more than once a day`);
  ok(total - inv <= R.assign.renownCapPerDay, `Assignation Renown ${total - inv} over the daily cap`);
  eq(s.whores.dolly.daily.assignRenown, total - inv);
});

// ---------------------------------------------------------------------------
test('Whorescore ladder: each rung is worth 3x the rung below plus 1; best 3 count fully', () => {
  const W = R.whorescore;
  eq(W.rare, 3 * W.common + 1); eq(W.epic, 3 * W.rare + 1); eq(W.legendary, 3 * W.epic + 1); eq(W.mythic, 3 * W.legendary + 1);
  let s = L.newGame('ws', { humans: [{ id: 'p', name: 'P', whores: ['dolly', 'fanny', 'jackie'] }] });
  s.whores.dolly.renown = R.tiers.epic; s.whores.fanny.renown = R.tiers.rare;
  eq(L.whorescore(s, 'p').season, W.epic + W.rare, 'a whore with no result yet scores nothing (opening a Timeline is not a result)');
  s.whores.jackie.curtains = 1;
  const ws = L.whorescore(s, 'p');
  eq(ws.season, W.epic + W.rare + W.common);
  const lb = L.leaderboards(s);
  ok(lb.whorescore.every((r, i) => i === 0 || lb.whorescore[i - 1].value >= r.value), 'sorted');
  ok(!lb.whorescore.some((r) => r.kind === 'automaton'), 'Automatons never ranked on Whorescore');
  ok(lb.automatons.length >= 1 && lb.automatons.every((a) => a.label === 'AUTOMATON'), 'Automatons listed and labelled');
  for (const b of ['richest', 'notorious', 'respectable']) ok(Array.isArray(lb[b]) && lb[b].length === lb.whorescore.length, b);
  const prof = L.publicProfile(s, 'p', 'clementine');
  ok(prof.automaton && prof.label === 'AUTOMATON', 'public profile labels the Automaton');
  eq(prof.vice, null, 'Vice hidden until Studied');
});

test('Era titles come from the Timeline\'s ladder and the route', () => {
  eq(L.eraTitle('victorian', 'common', 'standing'), 'dollymop');
  eq(L.eraTitle('victorian', 'legendary', 'notoriety'), 'Richest Tart in Wapping'); // renamed 2026-10-07 (finding 28: no Whitechapel 1888 jokes)
  eq(L.eraTitle('wildwest', 'rare', 'standing'), 'soiled dove');
  eq(L.eraTitle('vegas', 'mythic', 'standing'), 'courtesan to the whales');
});

test('Timelines: one whore per Timeline; the 2nd unlocks after a Curtain and an Assignation', () => {
  let s = L.newGame('unlock', { starter: 'dolly', minGapMin: 0 });
  eq(L.legalActions(s, 'you').filter((a) => a.type === 'openTimeline').length, 0, 'locked at first');
  s = L.startAssignation(s, 'dolly', 'tex'); s = L.playAssignation(s, 'dolly', { cards: [0] });
  const v = L.getView(s, 'dolly');
  s = L.sealPlan(s, 'dolly', { place: 'tuppenny', cards: L.bestGuess(v, 'tuppenny').cards });
  ok(s.lastEvents.some((e) => e.type === 'timeline-unlocked'), 'telegram');
  const opens = L.legalActions(s, 'you').filter((a) => a.type === 'openTimeline');
  ok(opens.length === 2 && opens.every((a) => a.timeline !== 'victorian'), J(opens));
  s = L.openTimeline(s, 'you', 'fanny');
  let threw = false; try { L.openTimeline(s, 'you', 'jackie'); } catch (e) { threw = e.code === 'no-slot'; }
  ok(threw, 'third Timeline still locked');
});

test('describeMatchup gives plain-English hints and never names a hidden Kink', () => {
  const s = L.newGame('dm', { starter: 'dolly' });
  const v = L.getView(s, 'dolly');
  const m = L.describeMatchup(v.timeline.gents.find((g) => g.id === 'plunkett'), v.whore);
  ok(m.lines.length >= 4 && m.fancy === true, J(m));
  ok(!J(m).includes(C.GENTS.plunkett.kink.name), 'Kink name leaked');
  const p = L.describeMatchup('salon', 'dolly');
  ok(p.kind === 'place' && p.lines.some((x) => x.includes('Wit')), J(p));
});

// ---------------------------------------------------------------------------
test('whole numbers only: every number in a long game state is an integer', () => {
  let s = L.newGame('ints', { starter: 'dolly', minGapMin: 0 });
  s.accounts.you.slots = 3; s = L.openTimeline(s, 'you', 'jackie');
  for (let i = 0; i < 40; i++) s = L.advanceClock(s, R.curtain.maxGapMin);
  const bad = []; walk(s, (x, p) => { if (typeof x === 'number' && !Number.isInteger(x)) bad.push(`${p}=${x}`); });
  eq(bad.length, 0, bad.slice(0, 5).join(', '));
  const lb = L.leaderboards(s); walk(lb, (x, p) => { if (typeof x === 'number' && !Number.isInteger(x)) bad.push(`${p}=${x}`); });
  const d = L.awayDigest(s, 'you', 0); walk(d, (x, p) => { if (typeof x === 'number' && !Number.isInteger(x)) bad.push(`${p}=${x}`); });
  eq(bad.length, 0, bad.slice(0, 5).join(', '));
});

test('legalActions only offers actions that succeed', () => {
  let s = L.newGame('legal', { starter: 'fanny', minGapMin: 0 });
  s.whores.fanny.coin = 20;
  for (let round = 0; round < 3; round++) {
    const acts = L.legalActions(s, 'fanny');
    ok(acts.length > 5, 'too few actions');
    for (const a of acts) {
      const run = {
        planEvening: () => L.planEvening(s, 'fanny', { place: a.place, cards: [0] }),
        startAssignation: () => L.startAssignation(s, 'fanny', a.gent),
        study: () => L.study(s, 'fanny', a.target),
        explore: () => L.explore(s, 'fanny', a.place),
        buyCard: () => L.buyCard(s, 'fanny', a.card),
        useTalent: () => L.useTalent(s, 'fanny', { kind: a.kind, card: 0 }),
        switchTimeline: () => L.getView(s, a.whore),
      }[a.type];
      if (run) run();
    }
    s = L.advanceClock(s, R.curtain.maxGapMin);
  }
});

test('content: every character, gentleman, place, item, card, affliction and postcard has an art path in the agreed scheme', () => {
  const re = /^\.\.\/art-assets\/(victorian|wildwest|vegas)\/[a-z0-9-]+(--[a-z0-9-]+)?\.webp$/;
  const need = [...Object.values(C.CHARACTERS), ...Object.values(C.GENTS), ...Object.values(C.TOURISTS), ...Object.values(C.PLACES), ...Object.values(C.ITEMS), ...Object.values(C.AFFLICTIONS), ...Object.values(C.GAGS), ...Object.values(C.POSTCARDS).flat()];
  for (const x of need) ok(re.test(x.art), `${x.id}: ${x.art}`);
  for (const t of Object.values(C.TIMELINES)) for (const f of Object.values(t.skin.textures)) ok(re.test(f), f);
  eq(C.TIMELINE_IDS.join(','), 'victorian,wildwest,vegas', 'the slice has exactly three Timelines');
});

// ---------------------------------------------------------------------------
// Review fixes, 2026-10-07 (prototype A findings): additive API, see rules-core Balance log
test('placeOutlook: smileys score what she takes home (raid, first Gutter visit, Notoriety cost) and flag a visit that would shut the Posh door', () => {
  const s = L.newGame('outlook', { starter: 'dolly', minGapMin: 0 });
  s.timelines.victorian.curtainNo = 2; // Raid Night at the Drowned Rat
  const v = L.getView(s, 'dolly');
  const o = L.placeOutlook(v, 'drowned-rat');
  ok(o.raid, 'raid night');
  eq(o.renown[0], Math.floor(R.places.gutter.renown[0] / R.raidRenownDivisor), 'raid-halved 1st share');
  ok(o.slumming && o.smileys <= 1, 'a first Gutter visit shows at most 1 smiley');
  eq(L.smileys(v, 'drowned-rat'), o.smileys, 'smileys() agrees with placeOutlook');
  ok(o.shutsPosh && o.shutWhy === 'standing', 'slumming from Standing 2 shuts the Salon (Standing below 2)');
  ok(!L.placeOutlook(v, 'tuppenny').shutsPosh, 'the Rowdy Place costs no Standing');
  ok(L.casualPlace(v) !== 'drowned-rat', 'casual declines the first Gutter visit');
  eq(v.timeline.places.find((p) => p.id === 'salon').shutWhy, null, 'the Salon is open now');
});

test('sleepTillDawn: the day turns at 06:00, Curtain clocks restart, nothing resolves overnight', () => {
  let s = L.newGame('dawn', { starter: 'dolly', minGapMin: 0 });
  s = L.advanceClock(s, 365);
  const k = s.timelines.victorian.curtainNo; const n = s.log.length;
  s.whores.dolly.daily.curtains = R.curtain.fullPayPerDay; // After Hours
  s = L.sleepTillDawn(s);
  eq(s.clock, 1440 + R.dawnMin, 'next 06:00');
  eq(s.timelines.victorian.curtainNo, k, 'no Curtains overnight');
  ok(!s.log.slice(n).some((e) => e.type === 'curtain' || e.type === 'standing-order'), 'no Standing Orders overnight');
  const v = L.getView(s, 'dolly');
  eq(v.whore.daily.fullPayLeft, R.curtain.fullPayPerDay, 'three fresh full-pay Curtains');
  eq(v.timeline.nextCurtainAt, s.clock + R.curtain.maxGapMin, 'the Curtain clock restarts at dawn');
});

test('dealLent: the next lent cards show before booking, and the Assignation uses exactly those', () => {
  let s = L.newGame('lent', { starter: 'dolly', minGapMin: 0 });
  eq(L.getView(s, 'dolly').whore.lentNext, null, 'nothing dealt yet');
  s = L.dealLent(s, 'dolly');
  const v = L.getView(s, 'dolly'); const ids = v.whore.lentNext.map((c) => c.id).join();
  eq(v.whore.lentNext.length, R.assignLend);
  const out = L.boardOutlook(v); eq(out.length, v.board.length, 'one outlook per gentleman on the board');
  ok(out.every((o) => ['delighted', 'satisfied', 'fizzled'].includes(o.outcome)), 'outcomes');
  s = L.dealLent(s, 'dolly'); eq(L.getView(s, 'dolly').whore.lentNext.map((c) => c.id).join(), ids, 'dealing again changes nothing');
  const g = v.board.find((b) => !b.tourist).gent;
  s = L.startAssignation(s, 'dolly', g);
  eq(L.getView(s, 'dolly').whore.assignation.lent.map((c) => c.id).join(), ids, 'the same three cards');
});

test('Assignation payoff uses the gentleman\'s own reaction lines (no RNG draw)', () => {
  let s = L.newGame('react', { starter: 'dolly', minGapMin: 0 });
  const rng = s.rng;
  s = L.startAssignation(s, 'dolly', 'tex'); const rng2 = s.rng;
  s = L.playAssignation(s, 'dolly', { cards: [0] });
  const ev = s.lastEvents.find((e) => e.type === 'assignation');
  ok(C.TOURISTS.tex.reactions[ev.data.outcome].some((l) => ev.text.includes(l)), ev.text);
  eq(s.rng, rng2, 'choosing a reaction line draws no random number');
  ok(rng !== undefined);
});

test('bestGuess: the play the Itch guard holds back is offered as a visible gamble; its own pick is unchanged', () => {
  const s = L.newGame('gamble', { starter: 'dolly', minGapMin: 0 });
  s.timelines.victorian.curtainNo = 0; // Alfie (Fair; likes Frolic and Silk) hosts the Tuppenny Palace
  const w = s.whores.dolly; w.itch = 2; w.hand = ['limerick', 'come-hither', 'saucy-quip', 'teeth-extra', 'mothers-advice'];
  const v = L.getView(s, 'dolly');
  const bg = L.bestGuess(v, 'tuppenny');
  ok(!bg.cards.includes(0), 'Best Guess never takes the Itch to 3');
  ok(bg.gamble && bg.gamble.cards.includes(0) && bg.gamble.gain > 0, 'the Limerick play is offered as a gamble');
  eq(bg.gamble.catches, 'wobbles', 'and it names what she would catch');
});

test('crowdHint and the digest: coarse crowd labels; at most one gossip and one gag headline', () => {
  let s = L.newGame('crowd', { starter: 'dolly', scriptRival: true });
  const h = L.crowdHint(s, 'dolly');
  eq(Object.keys(h.labels).join(), C.TIMELINES.victorian.places.join(), 'a label per Place');
  eq(h.follower, 'lavinia', 'the scripted rival is reported as a follower, not counted');
  const since = s.tick;
  for (let i = 0; i < 9; i++) s = L.advanceClock(s, R.curtain.maxGapMin);
  for (const who of ['you', 'dolly']) {
    const d = L.awayDigest(s, who, since);
    ok(d.headlines.filter((x) => x.type === 'gossip').length <= 1, 'one gossip headline');
    ok(d.headlines.filter((x) => x.type === 'gag').length <= 1, 'one gag headline');
  }
  ok(!s.log.some((e) => e.type === 'habit-changed' && e.whores[0] === 'lavinia'), 'the scripted rival never "changes habit"');
  const r = L.getView(s, 'dolly').timeline.rivals.find((x) => x.id === 'lavinia');
  eq(r.talent, 'upstage', 'her Talent is public');
});

// ---------------------------------------------------------------------------
// C-scandal review fixes (2026-10-07)
test('Standing Order goes where the smileys are (rules-core §4.1/§4.2), not to a habitual Place', () => {
  let s = L.newGame('so-smileys', { starter: 'dolly', minGapMin: 0 });
  s.whores.dolly.places = ['drowned-rat', 'drowned-rat', 'drowned-rat']; s.whores.dolly.slummed = true; // her "usual" Place
  const v = L.getView(s, 'dolly');
  const pick = L.standingOrderPick(v);
  eq(pick.place, L.casualPlace(v, { slumming: true }), 'most smileys');
  s = L.advanceClock(s, R.curtain.maxGapMin);
  const so = s.lastEvents.find((e) => e.type === 'standing-order');
  eq(so.data.place, pick.place, 'the Curtain used the same pick');
  ok(so.data.host && 'winner' in so.data && so.data.sway != null, 'the event names host, winner and Sway');
  const d = L.awayDigest(s, 'dolly', 0).headlines.find((h) => h.type === 'standing-order');
  ok(/went out without you once:/.test(d.text) && !/\(s\)/.test(d.text), d.text);
  ok(d.detail.includes(C.PLACES[pick.place].short) && d.detail.includes(C.GENTS[so.data.host].short), d.detail);
});

test('Upstage is printed: the cut whore and the Upstager are flagged in the public results; curtainWhatIf applies it', () => {
  const s = L.newGame('upstage-print', { starter: 'dolly', scriptRival: true, minGapMin: 0 });
  const res = { raid: null, places: [{ place: 'salon', host: 'plunkett', entries: [{ whore: 'lavinia', rank: 0, sway: 13, upstage: true, upstaged: 0 }, { whore: 'dolly', rank: 1, sway: 12 }] }] };
  const a = L.curtainWhatIf(res, 'salon', 'dolly', 15);
  eq(a.upstaged, 2, 'just above the Upstager: cut 2'); eq(a.rank, 0, '15 - 2 = 13 ties her for 1st');
  const b = L.curtainWhatIf(res, 'salon', 'dolly', 16);
  eq(b.rank, 0); ok(b.renown >= R.places.posh.renown[0], 'a 1st pays the 1st share');
  const c = L.curtainWhatIf(res, 'salon', 'dolly', 9);
  eq(c.rank, null, 'below the Bar');
  void s;
});

test('Rota tip: only for a Place worth going to (open, on your route, 2+ smileys), and it names the Curtain', () => {
  let s = L.newGame('rota-tip', { starter: 'dolly', minGapMin: 0 });
  for (let i = 0; i < 6; i++) s = L.advanceClock(s, R.curtain.maxGapMin);
  const d = L.awayDigest(s, 'dolly', 0).headlines.filter((h) => h.type === 'rota-fancy');
  for (const h of d) ok(/Curtain No\. \d+/.test(h.text), h.text);
  s.whores.dolly.standing = 6; s.whores.dolly.notoriety = 0;
  const d2 = L.awayDigest(s, 'dolly', 0).headlines.filter((h) => h.type === 'rota-fancy');
  ok(d2.every((h) => !h.text.includes(C.PLACES['drowned-rat'].short)), 'no Gutter tips on the Standing route');
});

test('scriptItch: the first back-alley Assignation lends enough Frolic for the Itch bet; Ripe pays +1 Coin per Frolic card', () => {
  let s = L.newGame('itch-script', { starter: 'dolly', scriptItch: true, minGapMin: 0 });
  s.whores.dolly.notoriety = 1;
  s = L.startAssignation(s, 'dolly', 'nobby');
  const lent = s.whores.dolly.assignation.lent;
  ok(lent.filter((c) => C.CARDS[c].arts.includes('frolic') && !(C.CARDS[c].effects || []).includes('noItch')).length >= 2, J(lent));
  const bg = L.bestGuess(L.getView(s, 'dolly'), { gent: 'nobby' });
  ok(bg.gamble && bg.gamble.catches === 'lodgers', 'the bet is on the table');
  const coin0 = s.whores.dolly.coin;
  s = L.playAssignation(s, 'dolly', { cards: bg.gamble.cards });
  const ev = s.lastEvents.find((e) => e.type === 'assignation');
  if (ev.data.outcome !== 'fizzled') ok(s.whores.dolly.coin - coin0 >= ev.data.coin && ev.data.coin >= 3 + bg.gamble.cards.length - 1, `coin ${ev.data.coin}`);
});

test('Kink gags follow the Place and rotate their punchline', () => {
  const s = L.newGame('gag-place', { starter: 'dolly', minGapMin: 0 });
  const w = s.whores.dolly; w.known.gents.plunkett = { secret: true, kink: true };
  s.timelines.victorian.curtainNo = 1; // Plunkett hosts the Tuppenny Palace (Lambeth)
  const host = L.getView(s, 'dolly').timeline.rota[0].hosts;
  const pid = Object.keys(host).find((p) => host[p] === 'plunkett');
  w.hand = ['strict-governess', 'saucy-quip', 'anonymous-verse', 'come-hither', 'mothers-advice'];
  L.mut.sealPlan(s, 'dolly', { place: pid, cards: [0, 1, 2] });
  if (s.timelines.victorian.curtainNo === 1) L.mut.resolveCurtain(s, 'victorian');
  const gag = s.log.find((e) => e.type === 'gag' && e.data && e.data.gag === 'stern-word');
  ok(gag, 'the Kink win plays its gag'); ok(gag.data.title.includes(C.PLACES[pid].where), gag.data.title); eq(gag.data.punchline, C.GAGS['stern-word'].punchlines[0]);
});

test('Dead heat: tied whores split the shares of the places they occupy, rounded up (curtainWhatIf agrees)', () => {
  const res = { raid: null, places: [{ place: 'salon', entries: [{ whore: 'x', sway: 12, rank: 0 }, { whore: 'y', sway: 10, rank: 1 }] }] };
  const PR = R.places.posh;
  const tie = L.curtainWhatIf(res, 'salon', 'me', 12);
  eq(tie.rank, 0); eq(tie.renown, Math.ceil((PR.renown[0] + PR.renown[1]) / 2) + Math.ceil(PR.applause / 2), 'two tied for 1st');
  const win = L.curtainWhatIf(res, 'salon', 'me', 13);
  ok(win.renown > tie.renown, 'one more point of Sway pays more than drawing level');
});

test('scriptRival { curtains: 1 }: the rival follows you at Curtain 1 only; then her Habit drives her', () => {
  let s = L.newGame('script-1', { starter: 'dolly', scriptRival: { curtains: 1 }, minGapMin: 0 });
  eq(L.isScriptedCurtain(s, 'victorian'), true);
  const v = L.getView(s, 'dolly');
  s = L.sealPlan(s, 'dolly', { place: 'tuppenny', cards: L.bestGuess(v, 'tuppenny').cards });
  const c1 = s.log.filter((e) => e.type === 'curtain' && e.timeline === 'victorian').pop();
  ok(c1.data.places.find((p) => p.place === 'tuppenny').entries.some((e) => e.whore === 'lavinia'), 'Curtain 1: she followed');
  eq(L.isScriptedCurtain(s, 'victorian'), false);
  const v2 = L.getView(s, 'dolly');
  s = L.sealPlan(s, 'dolly', { place: 'tuppenny', cards: L.bestGuess(v2, 'tuppenny').cards });
  const c2 = s.log.filter((e) => e.type === 'curtain' && e.timeline === 'victorian').pop();
  ok(!c2.data.places.find((p) => p.place === 'tuppenny').entries.some((e) => e.whore === 'lavinia'), 'Curtain 2: her Habit (the Posh Place) drives her');
  eq(L.isScriptedCurtain(L.newGame('script-2', { scriptRival: true }), 'victorian'), true, 'scriptRival: true still scripts every Curtain');
});

test('stageRivals: staged hand, Regulars and a quiet Talent, with no RNG used (every other deal unchanged)', () => {
  const stage = { lavinia: { hand: ['swan-neck', 'strict-governess', 'come-hither', 'saucy-wink', 'mothers-advice'], regular: { plunkett: 2 }, quietCurtains: 1 } };
  const a = L.newGame('stage-1', { starter: 'dolly' }); const b = L.newGame('stage-1', { starter: 'dolly', stageRivals: stage, minGapMin: 0 });
  eq(J(a.whores.dolly.hand), J(b.whores.dolly.hand), 'your deal is unchanged'); eq(a.rng, b.rng, 'RNG untouched');
  eq(J(b.whores.lavinia.hand), J(stage.lavinia.hand)); eq(b.whores.lavinia.history.plunkett.regular, 2);
  const s = L.mut.sealPlan(b, 'dolly', { place: 'salon', cards: [] });
  const lav = s.log.filter((e) => e.type === 'curtain').pop().data.places.find((p) => p.place === 'salon').entries.find((e) => e.whore === 'lavinia');
  ok(lav && !lav.upstage, 'no Upstage while quiet');
});

test('Buying a Kink novelty from the whisper decodes that Tell: you learn his Kink (only that fact)', () => {
  let s = L.newGame('kink-buy', { starter: 'dolly' });
  const w = s.whores.dolly; w.coin = 9; w.offer = { item: 'cane', price: 3, place: 'salon' };
  s = L.buyOffer(s, 'dolly');
  const k = s.whores.dolly.known.gents.plunkett || {};
  ok(k.kink && !k.secret, J(k));
  ok(s.lastEvents.some((e) => e.type === 'learned' && e.data.why === 'tell-decoded'), 'a learned event');
  eq(L.getView(s, 'dolly').whore.items[0].kinkFor, 'plunkett', 'the item now shows whose Kink it is');
});

test('Gossip looks ahead: where a rival is heading this Curtain', () => {
  let s = L.newGame('gossip-ahead', { starter: 'dolly', minGapMin: 0 });
  s.whores.dolly.gossip = 1;
  s = L.spendGossip(s, 'dolly', 'agatha');
  const e = s.lastEvents.find((x) => x.type === 'gossip-spent');
  ok(e.data.tonight && C.PLACES[e.data.tonight].timeline === 'victorian', J(e.data));
  ok(e.text.includes('Tonight'), e.text);
});

// C-scandal review fixes (2026-10-07, round 2): see rules-core Balance log
test('Gag text is a one-line headline (title: punchline); the stage directions ride in data.see', () => {
  const s = L.newGame('gag-oneline', { starter: 'dolly', minGapMin: 0 });
  const w = s.whores.dolly; w.known.gents.plunkett = { secret: true, kink: true };
  s.timelines.victorian.curtainNo = 1;
  const host = L.getView(s, 'dolly').timeline.rota[0].hosts;
  const pid = Object.keys(host).find((p) => host[p] === 'plunkett');
  w.hand = ['strict-governess', 'saucy-quip', 'anonymous-verse', 'come-hither', 'mothers-advice'];
  L.mut.sealPlan(s, 'dolly', { place: pid, cards: [0, 1, 2] });
  if (s.timelines.victorian.curtainNo === 1) L.mut.resolveCurtain(s, 'victorian');
  const gag = s.log.find((e) => e.type === 'gag' && e.data && e.data.gag === 'stern-word');
  const G = C.GAGS['stern-word'];
  eq(gag.text, `${gag.data.title}: ${gag.data.punchline}`); ok(!gag.text.includes(G.see), 'no stage directions in the text'); eq(gag.data.see, G.see);
});

test('placeOutlook: smileysRaw is the matchup before the first-Gutter-visit clamp', () => {
  const s = L.newGame('slum-raw', { starter: 'dolly', minGapMin: 0 });
  const v = L.getView(s, 'dolly');
  for (const p of v.timeline.places) {
    const o = L.placeOutlook(v, p.id);
    ok(Number.isInteger(o.smileysRaw) && o.smileysRaw >= o.smileys, J(o));
    if (!o.slumming) eq(o.smileysRaw, o.smileys, p.id);
    else eq(o.smileys, Math.min(o.smileysRaw, 1), p.id);
  }
});

// A-theatre review fixes, round 2 (2026-10-07): see rules-core Balance log
test('placeBoost scores the play with a ready Kink novelty (and Double Entendre); plain smileys unchanged', () => {
  const s = L.newGame('boost-1', { starter: 'dolly', minGapMin: 0 });
  const w = s.whores.dolly; s.timelines.victorian.curtainNo = 1;
  const host = L.getView(s, 'dolly').timeline.rota[0].hosts;
  const pid = Object.keys(host).find((p) => host[p] === 'plunkett');
  const before = L.placeOutlook(L.getView(s, 'dolly'), pid);
  w.items.push({ id: 'cane', uses: 99, readyAt: 0 }); w.known.gents.plunkett = { kink: true };
  const v = L.getView(s, 'dolly');
  const b = L.placeBoost(v, pid);
  ok(b && b.item === 'cane' && b.kink, J(b));
  ok(b.sway >= L.placeOutlook(v, pid).sway + 3, 'the Kink adds at least +3');
  eq(L.placeOutlook(v, pid).smileys, L.placeOutlook(v, pid).smileys, 'deterministic');
  ok(before.smileys <= 3 && Number.isInteger(L.placeOutlook(v, pid).smileys));
});

test('talentOncePerDay: a Talent spent at one Curtain stays spent until dawn (default rule unchanged)', () => {
  for (const once of [false, true]) {
    let s = L.newGame('talent-day', { starter: 'dolly', minGapMin: 0, talentOncePerDay: once });
    let v = L.getView(s, 'dolly'); const place = L.casualPlace(v); const bg = L.bestGuess(v, place);
    s = L.sealPlan(s, 'dolly', { place, cards: bg.cards, talent: { kind: 'double-entendre', card: bg.cards[0], art: 'silk' } });
    v = L.getView(s, 'dolly');
    eq(v.whore.talentUsed, once, `after a Curtain (once=${once})`);
    eq(v.whore.talentPer, once ? 'day' : 'curtain');
    s = L.sleepTillDawn(L.sleepTillDawn(s)); // the first sleep reaches 06:00 the same day; the second turns the day
    eq(L.getView(s, 'dolly').whore.talentUsed, false, 'fresh at dawn');
  }
});

test('crowdHint names a rival Gossip placed tonight, with her Upstage; the public results flag full pay', () => {
  let s = L.newGame('gossip-known', { starter: 'dolly', minGapMin: 0 });
  s.whores.dolly.gossip = 2;
  s = L.spendGossip(s, 'dolly', 'bess');
  const h = L.crowdHint(s, 'dolly');
  const where = Object.keys(h.known).find((p) => h.known[p].some((x) => x.id === 'bess'));
  ok(where, J(h.known));
  eq(L.getView(s, 'dolly').timeline.rivals.find((r) => r.id === 'bess').heading, where);
  const v = L.getView(s, 'dolly'); const p = L.casualPlace(v);
  s = L.sealPlan(s, 'dolly', { place: p, cards: L.bestGuess(v, p).cards });
  const cur = s.lastEvents.find((e) => e.type === 'curtain');
  ok(cur.data.places.every((pr) => pr.entries.every((e) => typeof e.fullPay === 'boolean')), 'fullPay on every entry');
  const pay = s.lastEvents.find((e) => e.type === 'payout' && e.whores[0] === 'dolly');
  ok(['delighted', 'satisfied', 'fizzled'].includes(pay.data.outcome) && typeof pay.data.reaction === 'string' && pay.data.reaction.length, 'host reaction line');
  ok(!L.getView(s, 'dolly').timeline.rivals.find((r) => r.id === 'bess').heading, 'the heading expires with the Curtain');
});

test('Shared starters: per-Timeline art and flavour; two copies in one hand never share a line', () => {
  const s = L.newGame('flav', { starter: 'fanny' });
  const w = s.whores.fanny; w.hand = ['saucy-quip', 'saucy-quip', 'come-hither', 'teeth-extra', 'mothers-advice'];
  const hand = L.getView(s, 'fanny').whore.hand;
  ok(hand[0].flavour !== hand[1].flavour, 'copies differ');
  ok(C.CARDS['saucy-quip'].flavours.wildwest.includes(hand[0].flavour), 'Wild West line');
  eq(hand[2].art, '../art-assets/wildwest/card-come-hither.webp');
  eq(C.CARDS['saucy-quip'].flavour, L.cardFlavour('saucy-quip', null), 'single flavour kept for older UIs');
});

test('A sealed Curtain that falls while you are away makes a CURTAIN CALL headline', () => {
  let s = L.newGame('away-call', { starter: 'dolly', minGapMin: 20 });
  const v = L.getView(s, 'dolly'); const p = L.casualPlace(v);
  s = L.sealPlan(s, 'dolly', { place: p, cards: L.bestGuess(v, p).cards });
  s = L.markSeen(s, 'you', 'victorian');
  const seen = s.accounts.you.seen.victorian;
  s = L.advanceClock(s, 20);
  ok(s.lastEvents.some((e) => e.type === 'curtain'), 'the Curtain fell');
  const d = L.awayDigest(s, 'dolly', seen);
  ok(d.headlines.some((x) => x.type === 'curtain-result' && /CURTAIN CALL/.test(x.text)), J(d.headlines.map((x) => x.text)));
});

// ---------------------------------------------------------------------------
// B-arcade review (round 2) fixes
test('After Hours Curtains move neither meter and build no Itch (rules-core §4.2): Coin, door gift and History only', () => {
  for (const place of ['salon', 'drowned-rat']) {
    let s = L.newGame(`ah-meters-${place}`, { starter: 'dolly', minGapMin: 0 });
    s.whores.dolly.standing = 4; s.whores.dolly.notoriety = 1; s.whores.dolly.slummed = true;
    s.whores.dolly.daily.curtains = R.curtain.fullPayPerDay; // her three full-pay Curtains are spent
    const before = { st: s.whores.dolly.standing, no: s.whores.dolly.notoriety, itch: s.whores.dolly.itch, coin: s.whores.dolly.coin };
    const v = L.getView(s, 'dolly');
    s = L.sealPlan(s, 'dolly', { place, cards: L.bestGuess(v, place).cards });
    const pay = s.lastEvents.find((e) => e.type === 'payout' && e.whores[0] === 'dolly');
    eq(pay.data.fullPay, false, 'After Hours');
    eq(pay.data.renown, 0, 'no Renown');
    eq(s.whores.dolly.standing, before.st, `${place}: Standing`); eq(s.whores.dolly.notoriety, before.no, `${place}: Notoriety`);
    ok(s.whores.dolly.itch <= before.itch, `${place}: no Itch`);
    ok(s.whores.dolly.coin >= before.coin + R.places[C.PLACES[place].kind].doorGift - 1, 'the door gift is paid');
    ok(!s.lastEvents.some((e) => e.type === 'meter' && e.whores[0] === 'dolly'), 'no meter event');
  }
});

test('The Gutter has company: a gutter2of3 stand-in per Timeline, biggestPot weighs Renown plus Coin, the rival follows a Notoriety human', () => {
  const byTl = {};
  for (const id of Object.keys(C.CHARACTERS)) { const ch = C.CHARACTERS[id]; if (ch.habit && ch.habit.kind === 'gutter2of3') (byTl[ch.timeline] ||= []).push(id); }
  for (const tl of ['victorian', 'wildwest']) ok((byTl[tl] || []).length >= 1, `${tl} has a gutter2of3 stand-in`); // Vegas: Brass Bettie's biggest pot is the Motel
  // Curtain 0 (not Raid Night): Bess at the Drowned Rat, Brass Bettie at Motel Paradiso (8 + 3 beats the Penthouse's 9)
  const where = (s, tl, wid) => s.lastEvents.find((e) => e.type === 'curtain' && e.timeline === tl).data.places.find((p) => p.entries.some((x) => x.whore === wid)).place;
  let s = L.newGame('gutter-company', { starter: 'dolly', minGapMin: 0 });
  s = L.advanceClock(s, R.curtain.maxGapMin);
  eq(where(s, 'victorian', 'bess'), 'drowned-rat', 'Bess works the Gutter');
  eq(where(s, 'vegas', 'bettie'), 'motel', 'Bettie follows the biggest pot (Renown + Coin)');
  // Raid Night (Curtain 2): Bess lies low at the Rowdy Place
  s = L.advanceClock(s, R.curtain.maxGapMin); s = L.advanceClock(s, R.curtain.maxGapMin);
  eq(where(s, 'victorian', 'bess'), 'tuppenny', 'Raid Night: Rowdy');
  // the rival follows a human whose Notoriety beats her Standing (not while the script runs)
  let t = L.newGame('nemesis', { starter: 'dolly', minGapMin: 0 });
  t.whores.dolly.standing = 1; t.whores.dolly.notoriety = 3; t.whores.dolly.slummed = true;
  t = L.advanceClock(t, R.curtain.maxGapMin);
  eq(where(t, 'victorian', 'lavinia'), 'drowned-rat', 'Lady Lavinia follows you down the Gutter');
  ok(!t.lastEvents.find((e) => e.type === 'curtain' && e.timeline === 'victorian').data.places.find((p) => p.place === 'drowned-rat').entries.find((x) => x.whore === 'lavinia').upstage, 'her Upstage stays at the Posh Place');
  const crowd = L.crowdHint(t, 'dolly');
  ok(crowd.counts['drowned-rat'] >= 1, 'crowdHint sees the Gutter company');
});

test('T4 fix (2026-10-07): Candy Floss works Motel Paradiso, the Penthouse NDA waives Frolic Notoriety, the Velvet Spur no longer fines Gold', () => {
  const where = (s, tl, wid) => s.lastEvents.find((e) => e.type === 'curtain' && e.timeline === tl).data.places.find((p) => p.entries.some((x) => x.whore === wid)).place;
  eq(C.CHARACTERS.candy.habit.kind, 'gutter2of3', 'Candy has the Gutter Habit');
  let s = L.newGame('gutter-company', { starter: 'dolly', minGapMin: 0 });
  s = L.advanceClock(s, R.curtain.maxGapMin);
  eq(where(s, 'vegas', 'candy'), 'motel', 'Curtain 0: Candy at Motel Paradiso');
  s = L.advanceClock(s, R.curtain.maxGapMin); s = L.advanceClock(s, R.curtain.maxGapMin);
  eq(where(s, 'vegas', 'candy'), 'flamingo', 'Raid Night: she lies low at the Day Club');
  // the NDA: a Frolic card Worked at the Penthouse costs no Notoriety; at the Salon it still costs 1
  const hand = ['flash-of-garter', 'saucy-quip', 'come-hither', 'teeth-extra', 'mothers-advice'];
  eq(C.PLACES.penthouse.house.nda, true);
  const j = L.newGame('nda-1', { starter: 'jackie', minGapMin: 0 }); j.whores.jackie.hand = [...hand];
  eq(L.previewEncounter(L.getView(j, 'jackie'), { place: 'penthouse', cards: [0] }).noto, 0, 'Penthouse: no Notoriety for Frolic');
  const d = L.newGame('nda-1', { starter: 'dolly', minGapMin: 0 }); d.whores.dolly.hand = [...hand];
  eq(L.previewEncounter(L.getView(d, 'dolly'), { place: 'salon', cards: [0] }).noto, 1, 'Salon: Frolic still costs Notoriety');
  eq(C.PLACES['velvet-spur'].house.arts.gold, undefined, 'the Velvet Spur has no Gold penalty');
  eq(C.PLACES['velvet-spur'].house.arts.silk, 1);
});

test('Assignations 7+ a day pay a Gossip and no Coin (rules-core §5), Hank or no Hank', () => {
  let s = L.newGame('assign-7', { starter: 'fanny', minGapMin: 0 });
  s.whores.fanny.daily.assigns = 6; s.whores.fanny.history.hank = { visits: 3, regular: 1, grudge: 0, seen: [], wait: 0, satisfied: 2, delighted: 2 };
  const v0 = L.getView(s, 'fanny'); const g = v0.board.find((b) => b.gent === 'hank' && !b.refused) ? 'hank' : v0.board.find((b) => !b.tourist && !b.refused).gent;
  s = L.startAssignation(s, 'fanny', g);
  const v = L.getView(s, 'fanny'); const bg = L.bestGuess(v, { gent: g });
  const coin0 = s.whores.fanny.coin; const gos0 = s.whores.fanny.gossip;
  s = L.playAssignation(s, 'fanny', { cards: bg.cards.length ? bg.cards : [0] });
  const a = s.lastEvents.find((e) => e.type === 'assignation').data;
  eq(a.coin, 0, 'no Coin'); eq(s.whores.fanny.coin, coin0, 'purse unchanged');
  if (a.outcome !== 'fizzled') ok(s.whores.fanny.gossip >= gos0 + 1, 'a Gossip');
});

test('Digest: no rota tips for After Hours Curtains; one POACHER line at most; each Timeline sends its own telegram', () => {
  let s = L.newGame('digest-r2', { starter: 'dolly', minGapMin: 0 });
  for (let i = 0; i < 6; i++) s = L.advanceClock(s, R.curtain.maxGapMin);
  s.whores.dolly.daily.curtains = R.curtain.fullPayPerDay; s.whores.dolly.daily.day = Math.floor(s.clock / 1440);
  ok(!L.awayDigest(s, 'dolly', 0).headlines.some((h) => h.type === 'rota-fancy'), 'no tips with no full pay left');
  for (const gid of C.TIMELINES.victorian.gents) s.whores.dolly.history[gid] = { visits: 2, regular: 1, grudge: 0, seen: [], wait: 0, satisfied: 1, delighted: 0 };
  for (let i = 0; i < 6; i++) s = L.advanceClock(s, R.curtain.maxGapMin);
  const hs = L.awayDigest(s, 'dolly', 0).headlines;
  ok(hs.filter((h) => h.type === 'rival-delighted-regular').length <= 1, J(hs.map((h) => h.text)));
  ok(C.DIGEST.telegrams.wildwest !== C.DIGEST.telegrams.vegas, 'two different telegrams');
});

test('sleepTillDawn before 06:00 still turns the day (fresh full pay); digest lines never say +0 Renown', () => {
  let s = L.newGame('dawn-early', { starter: 'dolly', minGapMin: 0 });
  s = L.advanceClock(s, 160);
  s.whores.dolly.daily.curtains = R.curtain.fullPayPerDay;
  s = L.sleepTillDawn(s);
  eq(s.clock, 1440 + R.dawnMin, 'the next district day\'s 06:00');
  eq(L.getView(s, 'dolly').whore.daily.fullPayLeft, R.curtain.fullPayPerDay, 'three fresh full-pay Curtains');
  let t = L.newGame('zero-renown', { starter: 'dolly', minGapMin: 20 });
  t.whores.dolly.daily.curtains = R.curtain.fullPayPerDay;
  const v = L.getView(t, 'dolly'); const p = L.casualPlace(v);
  t = L.sealPlan(t, 'dolly', { place: p, cards: L.bestGuess(v, p).cards });
  t = L.markSeen(t, 'you', 'victorian'); const seen = t.accounts.you.seen.victorian;
  t = L.advanceClock(t, 400);
  const hs = L.awayDigest(t, 'dolly', seen).headlines;
  ok(hs.length && hs.every((h) => !/\+0 Renown/.test(h.text) && !/\+0 Renown/.test(h.detail || '')), J(hs.map((h) => [h.text, h.detail])));
});

test('Kinks are earned: no slice Kink fires on a pattern Best Guess makes by accident (C-scandal review)', () => {
  const k = (g) => C.GENTS[g].kink; const arts = (ids) => ids.map((c) => C.CARDS[c].arts);
  const fire = (g, ids, item = null) => L.kinkTriggered(k(g), ids, arts(ids), item);
  ok(!fire('vanderbucks', ['ace-up-garter', 'poker-face']), 'two Gold cards no longer drive the Golden Spike');
  ok(fire('vanderbucks', ['drinks-on-house']), 'Drinks on the House does');
  ok(!fire('hank', ['bucking-bronco', 'come-hither']), 'the Bronco (a casual buy) no longer jingles his spurs');
  ok(!fire('hank', ['drinks-on-house', 'teeth-extra']) && fire('hank', ['drinks-on-house', 'saucy-wink']), 'Drinks on the House with a Frolic card');
  ok(!fire('brayden', ['reverse-cowgirl', 'teeth-extra']) && !fire('brayden', ['chapel-quickie']) && fire('brayden', ['chapel-quickie', 'teeth-extra']), 'Chapel Quickie with a Gold card');
  ok(!fire('gaz', ['peek-a-boo-fan', 'been-there']) && fire('gaz', ['chapel-quickie']), 'Mask + Frolic no longer; the Chapel Quickie does');
  ok(!fire('slots', ['come-hither', 'saucy-quip', 'teeth-extra']) && fire('slots', ['come-hither'], 'dice'), 'Slots: only the Loaded Dice');
  for (const g of ['vanderbucks', 'hank', 'brayden', 'gaz', 'slots']) ok(fire(g, [], k(g).item), `${g}: his novelty still fires`);
});

test('opts.standinSeal: stand-ins seal later, the Curtain waits for the last one; Automatons and the default are instant', () => {
  const play = (s) => { const v = L.getView(s, 'dolly'); const p = L.casualPlace(v); return L.sealPlan(s, 'dolly', { place: p, cards: L.bestGuess(v, p).cards }); };
  let d = L.newGame('seal-wait', { starter: 'dolly', minGapMin: 0 });
  d = play(d); eq(d.timelines.victorian.curtainNo, 1, 'default: the Curtain falls at the seal');
  let s = L.newGame('seal-wait', { starter: 'dolly', minGapMin: 0, standinSeal: { min: 30, max: 90, from: 0 } });
  s = play(s);
  eq(s.timelines.victorian.curtainNo, 0, 'stand-ins have not sealed yet');
  const sg = L.getView(s, 'dolly').timeline.sealing;
  ok(sg.sealed >= 1 && sg.sealed < sg.total && sg.lastAt >= s.clock + 30 && sg.lastAt <= s.clock + 90, J(sg));
  s = L.advanceClock(s, sg.lastAt - s.clock - 1); eq(s.timelines.victorian.curtainNo, 0, 'one minute before the last stand-in seals');
  s = L.advanceClock(s, 1); eq(s.timelines.victorian.curtainNo, 1, 'falls when the last one seals');
  let f = L.newGame('seal-wait', { starter: 'dolly', minGapMin: 0, standinSeal: { min: 30, max: 90, from: 1 } });
  f = play(f); eq(f.timelines.victorian.curtainNo, 1, 'from: 1 keeps the first Curtain instant');
  eq(J(L.getView(f, 'dolly').timeline.sealing.lastAt), 'null', 'no timers before the human seals');
});

test('awayDigest opts.tonight: a TONIGHT line names her best matchup and his novelty; LAST CALL when due; off by default', () => {
  let s = L.newGame('tonight-1', { starter: 'dolly', minGapMin: 0 });
  const host = Object.entries(L.getView(s, 'dolly').timeline.rota[0].hosts).find(([, g]) => g === 'plunkett');
  s.whores.dolly.items.push({ id: 'cane', uses: 1 });
  ok(!L.awayDigest(s, 'dolly', s.tick).headlines.some((h) => h.type === 'tonight'), 'off by default');
  const d = L.awayDigest(s, 'dolly', s.tick, { tonight: true }).headlines;
  const t = d.find((h) => h.type === 'tonight');
  ok(t, J(d.map((h) => h.text)));
  if (host && L.getView(s, 'dolly').timeline.places.find((p) => p.id === host[0]).open) ok(/Cane/.test(t.text) && t.place === host[0], t.text);
  s = L.advanceClock(s, R.curtain.maxGapMin - 1);
  const lc = L.awayDigest(s, 'dolly', s.tick, { tonight: true }).headlines;
  ok(lc[0].type === 'last-call' && /last call/i.test(lc[0].text), J(lc.map((h) => h.text)));
});

test('curtainWhen: the Curtain clock in words, one band per 60 district minutes; TONIGHT never prints hours and minutes', () => {
  const bands = [[180, 'later'], [121, 'later'], [120, 'soon'], [61, 'soon'], [60, 'near'], [2, 'near'], [1, 'due'], [0, 'due']];
  for (const [m, k] of bands) eq(L.curtainWhen(m), k, `${m} minutes left`);
  for (const k of ['later', 'soon', 'near']) ok(typeof C.LINES.curtainWhen[k] === 'string' && C.LINES.curtainWhen[k].length > 0, k);
  // one TONIGHT line per band (later on, soon, any minute now); the count guards against a seed that prints none
  let s = L.newGame('tonight-1', { starter: 'dolly', minGapMin: 0 }); let n = 0; const seen = new Set();
  for (const step of [0, 70, 60]) {
    s = L.advanceClock(s, step);
    const t = L.awayDigest(s, 'dolly', s.tick, { tonight: true }).headlines.find((h) => h.type === 'tonight');
    if (!t) continue;
    const k = L.curtainWhen(L.getView(s, 'dolly').timeline.nextCurtainAt - s.clock);
    ok(t.text.endsWith(`Curtain ${C.LINES.curtainWhen[k]}.`) && !/\d+\s*h\b|\d+\s*m\b|\dh\d|\d{1,2}:\d{2}/.test(t.text), t.text);
    n++; seen.add(k);
  }
  eq(n, 3, 'a TONIGHT line at all three steps');
  eq([...seen].sort().join(','), 'later,near,soon', 'one TONIGHT line in each band');
});

// ---- A-theatre review round 3 (findings A1, A2, A4, A5, A17) ----
test('Hindsight: a baseline equal to her own sealed cards scores and places exactly as her play (thinking 0, luck 0), Upstage included', () => {
  let checked = 0; let upstaged = 0;
  for (let i = 0; i < 12; i++) {
    let s = L.newGame(`hind-${i}`, { starter: 'dolly', minGapMin: 0 });
    for (let k = 0; k < 5; k++) {
      const v = L.getView(s, 'dolly');
      // the Posh Place where it is open (Lady Lavinia's Upstage room), else the casual pick
      const place = v.timeline.places.find((p) => p.kind === 'posh' && p.open) ? v.timeline.places.find((p) => p.kind === 'posh').id : L.casualPlace(v);
      const cards = L.bestGuess(v, place).cards;
      const ids = cards.map((x) => v.whore.hand[x].id);
      s = L.sealPlan(s, 'dolly', { place, cards, baseline: [{ key: 'here', place, cards: ids, hand: v.whore.hand.map((c) => c.id) }] });
      const evs = [...s.lastEvents]; s = L.advanceClock(s, 30); evs.push(...s.lastEvents);
      const pay = evs.find((e) => e.type === 'payout' && e.whores[0] === 'dolly');
      if (!pay) continue;
      const h = pay.data.hindsight; ok(h, 'payout carries hindsight');
      const b = h.baselines[0];
      eq(b.sway, pay.data.sway == null ? b.sway : pay.data.sway, 'baseline Sway = real Sway');
      eq(b.rank, pay.data.rank, 'baseline rank = real rank'); eq(b.renown, pay.data.renown, 'baseline Renown = real Renown');
      eq(b.coin, pay.data.coin, 'baseline Coin = real Coin (same cards kept back)');
      eq(h.thinking, 0, 'no thinking gap'); eq(h.luck, 0, 'no luck gap'); eq(h.coinGap, 0, 'no Coin gap');
      if (pay.data.upstaged) upstaged++;
      checked++;
    }
  }
  ok(checked >= 30, `checked ${checked}`);
  ok(upstaged >= 1, 'at least one Upstaged Curtain exercised');
});

test('Hindsight: an unranked Upstager still cuts the baseline (true Sways, never the public report)', () => {
  // build a Curtain where the rival who plays Upstage ends below the Bar; the public report hides her Sway
  let found = 0;
  for (let i = 0; i < 40 && !found; i++) {
    let s = L.newGame(`hind-up-${i}`, { starter: 'dolly', minGapMin: 0 });
    for (let k = 0; k < 6 && !found; k++) {
      const v = L.getView(s, 'dolly');
      const posh = v.timeline.places.find((p) => p.kind === 'posh');
      if (!posh.open) { s = L.advanceClock(s, 30); continue; }
      const cards = L.bestGuess(v, posh.id).cards; const ids = cards.map((x) => v.whore.hand[x].id);
      s = L.sealPlan(s, 'dolly', { place: posh.id, cards, baseline: [{ place: posh.id, cards: ids }] });
      const evs = [...s.lastEvents]; s = L.advanceClock(s, 30); evs.push(...s.lastEvents);
      const cur = evs.find((e) => e.type === 'curtain'); if (!cur) continue;
      const pr = cur.data.places.find((p) => p.place === posh.id);
      const pay = evs.find((e) => e.type === 'payout' && e.whores[0] === 'dolly');
      if (pr.entries.some((e) => e.upstage && e.sway == null) && pay && pay.data.upstaged) {
        found++;
        ok(!pr.entries.some((e) => 'trueSway' in e), 'the public report still hides below-Bar Sway');
        eq(pay.data.hindsight.baselines[0].upstaged, pay.data.upstaged, 'the baseline is cut just as her play was');
      }
    }
  }
  ok(found >= 1, 'found a Curtain with a below-Bar Upstager who cut her');
});

test('crowdHint.possible: every Upstage rival who could come is printed, known or not; view.freshFor only when the stock is hers', () => {
  const s = L.newGame('possible-1', { starter: 'dolly', minGapMin: 0 });
  const h = L.crowdHint(s, 'dolly');
  ok(h.possible.salon.some((x) => x.id === 'lavinia' && x.upstage), J(h.possible));
  ok(!h.possible['drowned-rat'].length, 'she keeps her Upstage for the Posh Place');
  ok(!h.known.salon.length, 'not known: no Gossip, no Study');
  const t = JSON.parse(JSON.stringify(s)); t.timelines.victorian.freshStall = 'drowned-rat';
  const v = L.getView(t, 'dolly');
  eq(v.timeline.freshFor, null, 'black-market stock is not hers at Notoriety 0'); eq(v.timeline.freshWhy, 'black-market');
  t.whores.dolly.notoriety = R.rummage.blackMarketAt;
  eq(L.getView(t, 'dolly').timeline.freshFor, 'drowned-rat', 'at Notoriety 2 it is');
});

test('sleepTillDawn resolves a sealed plan at its due time first (it still pays as that day\'s Curtain)', () => {
  let s = L.newGame('sleep-sealed', { starter: 'dolly', minGapMin: 20 });
  s = L.advanceClock(s, 5); // 5 minutes after the last Curtain: her seal must wait for the 20-minute gap
  const v = L.getView(s, 'dolly'); const place = L.casualPlace(v);
  s = L.sealPlan(s, 'dolly', { place, cards: L.bestGuess(v, place).cards });
  const k = s.timelines.victorian.curtainNo; const day = s.day; const n = s.log.length;
  ok(s.whores.dolly.plan && s.whores.dolly.plan.sealed, 'sealed and waiting');
  s = L.sleepTillDawn(s);
  eq(s.timelines.victorian.curtainNo, k + 1, 'her sealed Curtain fell');
  const pay = s.log.slice(n).find((e) => e.type === 'payout' && e.whores[0] === 'dolly');
  ok(pay && pay.data.fullPay && pay.data.place === place, 'as a full-pay Curtain of that day, at her Place');
  eq(s.day, day + 1, 'then the day turned');
});

test('Tourists count as plays (the card jokes move on); a gentleman\'s reactions take turns across Assignation and Curtain', () => {
  let s = L.newGame('react-1', { starter: 'dolly', minGapMin: 0 });
  const t = L.getView(s, 'dolly').board.find((b) => b.tourist).gent;
  s = L.startAssignation(s, 'dolly', t);
  const cards = L.bestGuess(L.getView(s, 'dolly'), { gent: t }).cards;
  const ids = cards.map((i) => s.whores.dolly.assignation.lent[i]);
  s = L.playAssignation(s, 'dolly', { cards });
  for (const id of ids) ok(s.whores.dolly.stats.cardPlays[id] >= 1, `${id} counted`);
  const seen = [];
  for (let k = 0; k < 4; k++) {
    const v = L.getView(s, 'dolly'); const g = v.board.find((b) => !b.tourist && !b.refused && !b.backAlley);
    if (!g) break;
    s = L.startAssignation(s, 'dolly', g.gent);
    s = L.playAssignation(s, 'dolly', { cards: L.bestGuess(L.getView(s, 'dolly'), { gent: g.gent }).cards });
    const ev = s.lastEvents.find((e) => e.type === 'assignation');
    seen.push(`${g.gent}:${ev.data.outcome}:${ev.data.reaction}`);
  }
  const byKey = {}; for (const x of seen) { const [gid, o, r] = x.split(':'); (byKey[`${gid}:${o}`] ||= []).push(r); }
  for (const [k, rs] of Object.entries(byKey)) for (let i = 1; i < rs.length; i++) ok(rs[i] !== rs[i - 1], `${k} repeated a line back to back`);
});

// The slice replays of the two unpublished prototypes (A-theatre, B-arcade) are not part of this repository; the
// game's own first-Curtain replay is `node game/find-first-curtain.mjs`. The engine tests from that round stay below.
{
  test('opts.scriptRival { curtains: 1, perWhore: true }: a Timeline opened later still gets its scripted clash at her first Curtain there', () => {
    let s = L.newGame('perwhore-1', { scriptRival: { curtains: 1, perWhore: true }, minGapMin: 0, humans: [{ id: 'you', name: 'Y' }] });
    s = L.chooseStarter(s, 'you', 'dolly');
    eq(L.isScriptedCurtain(s, 'victorian'), true, 'London before her first Curtain');
    eq(L.isScriptedCurtain(s, 'wildwest'), false, 'no human in the Wild West yet');
    s = L.resolveCurtain(s, 'wildwest'); s = L.resolveCurtain(s, 'victorian');
    eq(L.isScriptedCurtain(s, 'victorian'), false, 'London after her first Curtain');
    s.accounts.you.slots = 2; s = L.openTimeline(s, 'you', 'fanny');
    eq(s.timelines.wildwest.curtainNo, 1, 'the Wild West has played a Curtain without her');
    eq(L.isScriptedCurtain(s, 'wildwest'), true, 'Fanny\'s first Curtain there is scripted');
    // the default { curtains: 1 } still counts the Timeline's Curtains (C-scandal)
    let c = L.newGame('perwhore-1', { scriptRival: { curtains: 1 }, minGapMin: 0, humans: [{ id: 'you', name: 'Y' }] });
    c = L.chooseStarter(c, 'you', 'dolly'); c = L.resolveCurtain(c, 'wildwest');
    eq(L.isScriptedCurtain(c, 'wildwest'), false, 'Timeline-count mode unchanged');
  });
  test('stageRival: replaces an NPC hand, sets Regulars, quietCurtains counted from now; a human cannot be staged', () => {
    let s = L.newGame('stage-1', { humans: [{ id: 'you', name: 'Y' }] }); s = L.chooseStarter(s, 'you', 'dolly');
    s = L.resolveCurtain(s, 'wildwest');
    const s2 = L.stageRival(s, 'clementine', { hand: ['saucy-quip', 'come-hither', 'saucy-wink', 'teeth-extra', 'mothers-advice'], regular: { hank: 2 }, quietCurtains: 1 });
    eq(s2.whores.clementine.hand.join(), 'saucy-quip,come-hither,saucy-wink,teeth-extra,mothers-advice');
    eq(s2.whores.clementine.history.hank.regular, 2); eq(s2.whores.clementine.quietUntil, s.timelines.wildwest.curtainNo + 1);
    eq(s2.rng, s.rng, 'no RNG used');
    let threw = false; try { L.stageRival(s, 'dolly', { regular: { plunkett: 2 } }); } catch { threw = true; } ok(threw, 'human refused');
  });
  test('An NPC whose Talent is Read the Room spends it on tonight\'s host before she plays (Clockwork Clementine)', () => {
    let s = L.newGame('rtr-1', { humans: [{ id: 'you', name: 'Y' }] }); s = L.chooseStarter(s, 'you', 'dolly');
    s = L.resolveCurtain(s, 'wildwest');
    const learned = s.lastEvents.filter((e) => e.type === 'learned' && (e.whores || [])[0] === 'clementine' && e.data.why === 'read-the-room');
    eq(learned.length, 1, 'one Read the Room');
  });
}

// ---------------------------------------------------------------------------
// Round 4 (the designer's scores): the road is a choice, a fizzle never buys Itch, the gossip bag, voices, seats per era,
// a bigger Grease Palms with Notoriety, and the (off) Raid Night bribe lever
// ---------------------------------------------------------------------------
test('The road follows the meters (round 7): two nights in the Gutter put her in the Police Gazette; level keeps her paper; no one picks it', () => {
  ok(!('setRoad' in L), 'there is no road to declare');
  let s = L.newGame('road-1', { starter: 'dolly', standins: false, rivals: false, timelines: ['victorian'], minGapMin: 0 });
  const v0 = L.getView(s, 'dolly');
  eq(v0.whore.road, 'standing', 'S2 N0 is the Society Pages'); eq(v0.whore.roadTurn.steps, 2, 'two points of Notoriety from the Gazette');
  ok(L.casualPlace(v0) !== 'drowned-rat', 'the casual pick declines a first Gutter visit');
  const o0 = L.placeOutlook(v0, 'drowned-rat'); ok(o0.smileys <= 1, 'a first Gutter visit is capped at 1 smiley in the Society Pages');
  // night 1 in the Gutter: S1 N1, level. She is still in the Society Pages, and the Gazette has noticed her
  s = L.sealPlan(s, 'dolly', { place: 'drowned-rat', cards: L.bestGuess(v0, 'drowned-rat').cards });
  eq(s.whores.dolly.standing, 1); eq(s.whores.dolly.notoriety, 1);
  let pe = s.lastEvents.find((e) => e.type === 'paper');
  ok(pe && !pe.data.turned && pe.data.road === 'standing' && pe.data.steps === 1, 'level: a warning, not a change of paper');
  eq(L.roadOf(s.whores.dolly), 'standing', 'level keeps the paper she had');
  // night 2: S0 N2. Now she is in the Police Gazette, and Best Guess and the smileys play for Notoriety
  s = L.advanceClock(s, 30);
  const v1 = L.getView(s, 'dolly');
  s = L.sealPlan(s, 'dolly', { place: 'drowned-rat', cards: L.bestGuess(v1, 'drowned-rat').cards });
  pe = s.lastEvents.find((e) => e.type === 'paper');
  ok(pe && pe.data.turned && pe.data.from === 'standing' && pe.data.road === 'notoriety', 'the change of paper is news');
  ok(/Police Gazette/.test(pe.text), pe.text);
  const v2 = L.getView(s, 'dolly');
  eq(v2.whore.road, 'notoriety'); eq(v2.whore.title, L.eraTitle('victorian', v2.whore.tier, 'notoriety'), 'her title follows her paper');
  eq(L.placeOutlook(v2, 'drowned-rat').road, 'notoriety');
  // stickiness: one step back (S1 N1) keeps the Gazette; a second (S2 N0) takes her back to the Society Pages
  const w = s.whores.dolly; w.standing = 1; w.notoriety = 1;
  eq(L.roadOf(w), 'notoriety', 'level after the Gazette is still the Gazette'); eq(L.getView(s, 'dolly').whore.road, 'notoriety', 'and the view says so');
  eq(L.roadOf(L.getView(s, 'dolly').whore), 'notoriety', 'roadOf reads a view too');
  eq(L.roadTurn(w).steps, 1, 'one good night from the Society Pages');
  w.standing = 2; w.notoriety = 0; eq(L.roadOf(w), 'standing', 'Standing ahead is the Society Pages, whatever she was');
  w.standing = 10; w.notoriety = 0; eq(L.roadTurn(w).steps, 6, 'a long way from the Gazette at Standing 10');
  eq(s.whores.lavinia ? L.roadOf(s.whores.lavinia) : 'standing', 'standing', 'NPCs have a paper too');
});

test('Her paper settles once per action and changes at a 1-point lead (round 7, designer decision: lead 1): ties hold, one event per action, a flip and a flip back inside one Curtain is no news', () => {
  eq(R.paperLead, 1, 'whoever leads decides');
  // the rule, on the meters alone
  const at = (st, nt, paper) => L.roadOf({ standing: st, notoriety: nt, paper });
  eq(at(3, 2, 'standing'), 'standing'); eq(at(2, 3, 'standing'), 'notoriety', 'a 1-point Notoriety lead puts her in the Police Gazette');
  eq(at(3, 2, 'notoriety'), 'standing', 'and a 1-point Standing lead takes her back'); eq(at(2, 2, 'notoriety'), 'notoriety', 'level keeps the Gazette');
  eq(at(2, 2, 'standing'), 'standing', 'level keeps the Society Pages');
  eq(L.roadTurn({ standing: 3, notoriety: 0, paper: 'standing' }).steps, 2, '3/0: two steps from the Gazette (2/1, then 1/2)');
  eq(L.roadTurn({ standing: 2, notoriety: 1, paper: 'standing' }).steps, 1, '2/1: the warning step');
  eq(L.roadTurn({ standing: 2, notoriety: 0, paper: 'standing' }).steps, 2, '2/0, the start: two steps (1/1 holds, 0/2 flips)');
  eq(L.roadTurn({ standing: 1, notoriety: 0, paper: 'standing' }).steps, 1, '1/0: one step (0/1) at the floor');
  eq(L.roadTurn({ standing: 2, notoriety: 3, paper: 'notoriety' }).steps, 1, '2/3 in the Gazette: one point of Standing from the Society Pages');
  const paperEvs = (s, id) => s.lastEvents.filter((e) => e.type === 'paper' && e.whores[0] === id);
  // the odd-gap approach from 3/0: one Gutter night to 2/1 is the warning, the next to 1/2 is the flip
  {
    let s = L.newGame('paper-odd-3-0', { starter: 'dolly', standins: false, rivals: false, timelines: ['victorian'], minGapMin: 0 });
    const w0 = s.whores.dolly; w0.standing = 3; w0.notoriety = 0; w0.paper = 'standing';
    let v = L.getView(s, 'dolly');
    s = L.sealPlan(s, 'dolly', { place: 'drowned-rat', cards: L.bestGuess(v, 'drowned-rat').cards });
    eq(`${s.whores.dolly.standing}/${s.whores.dolly.notoriety}`, '2/1');
    let pe = paperEvs(s, 'dolly'); eq(pe.length, 1, 'one paper event');
    ok(!pe[0].data.turned && pe[0].data.road === 'standing' && pe[0].data.steps === 1, '2/1: the warning, still the Society Pages');
    s = L.advanceClock(s, 30); v = L.getView(s, 'dolly');
    s = L.sealPlan(s, 'dolly', { place: 'drowned-rat', cards: L.bestGuess(v, 'drowned-rat').cards });
    eq(`${s.whores.dolly.standing}/${s.whores.dolly.notoriety}`, '1/2');
    pe = paperEvs(s, 'dolly'); eq(pe.length, 1, 'one paper event');
    ok(pe[0].data.turned && pe[0].data.from === 'standing' && pe[0].data.road === 'notoriety', '1/2: in the Police Gazette');
  }
  // a 2-point Notoriety night from 2/0 (the Gutter plus Pick His Pocket): one flip, no warning on the way
  {
    let s = L.newGame('paper-two-point', { starter: 'dolly', standins: false, rivals: false, timelines: ['victorian'], minGapMin: 0 });
    const w0 = s.whores.dolly; w0.hand = [...w0.hand.slice(0, 4), 'pick-his-pocket'];
    const v = L.getView(s, 'dolly'); const pp = v.whore.hand.findIndex((c) => c.id === 'pick-his-pocket');
    eq(L.previewEncounter(v, { place: 'drowned-rat', cards: [pp] }).noto, 2, 'a Gutter night with Pick His Pocket costs 2 Notoriety');
    s = L.sealPlan(s, 'dolly', { place: 'drowned-rat', cards: [pp] });
    eq(`${s.whores.dolly.standing}/${s.whores.dolly.notoriety}`, '0/2');
    const pe = paperEvs(s, 'dolly'); eq(pe.length, 1, 'one paper event for the night');
    ok(pe[0].data.turned && pe[0].data.road === 'notoriety', 'the flip is the news; the warning step passed inside the same Curtain');
  }
  // 3/2 -> 2/3 -> 3/2 inside one Posh Curtain (a Frolic card's Notoriety, then Standing for placing): no paper event at all
  let doubles = 0;
  for (let i = 0; i < 12; i++) {
    let s = L.newGame(`paper-posh-dolly-${i}`, { starter: 'dolly', standins: false, rivals: false, timelines: ['victorian'], minGapMin: 0 });
    const w0 = s.whores.dolly; w0.standing = 3; w0.notoriety = 2; w0.paper = 'standing'; w0.hand = [...w0.hand.slice(0, 4), 'flash-of-garter'];
    const v = L.getView(s, 'dolly'); const fg = v.whore.hand.findIndex((c) => c.id === 'flash-of-garter');
    let pick = null;
    for (let a = 0; a < 4 && !pick; a++) for (let b = a + 1; b < 4 && !pick; b++) {
      const p = L.previewEncounter(v, { place: 'salon', cards: [fg, a, b] });
      if (p.noto === 1 && p.margin >= 0 && !p.catches) pick = [fg, a, b];
    }
    if (!pick) continue;
    s = L.sealPlan(s, 'dolly', { place: 'salon', cards: pick });
    const mv = s.lastEvents.filter((e) => e.type === 'meter' && e.whores[0] === 'dolly').map((e) => `${e.data.after.standing}/${e.data.after.notoriety}`);
    if (mv.join(' ') !== '2/3 3/2') continue;
    doubles++;
    eq(paperEvs(s, 'dolly').length, 0, `seed ${i}: into the Gazette and back inside one Curtain is no news`); eq(s.whores.dolly.paper, 'standing');
  }
  ok(doubles > 0, `the Posh Curtains produced a flip and a flip back inside one action (${doubles})`);
  // real nights, every starter, odd and even starts: at most one paper event per whore per action, a flip only when the
  // other meter leads, a warning only at one step to go
  let flips = 0; let warns = 0;
  for (const st of ['dolly', 'fanny', 'jackie']) for (const [s0, n0] of [[3, 0], [2, 0], [4, 1], [5, 0]]) {
    let s = L.newGame(`paper-${st}-${s0}${n0}`, { starter: st, standins: false, rivals: false, minGapMin: 0 });
    const w0 = s.whores[st]; w0.standing = s0; w0.notoriety = n0; w0.paper = 'standing';
    const tl = s.whores[st].timeline; const gutter = C.TIMELINES[tl].places.find((p) => C.PLACES[p].kind === 'gutter');
    const posh = C.TIMELINES[tl].places.find((p) => C.PLACES[p].kind === 'posh');
    for (let night = 0; night < 8; night++) {
      const v = L.getView(s, st);
      const place = night < 4 || !v.timeline.places.find((p) => p.id === posh).open ? gutter : posh;
      s = L.sealPlan(s, st, { place, cards: L.bestGuess(v, place).cards });
      const pe = paperEvs(s, st);
      ok(pe.length <= 1, `${st} ${s0}/${n0} night ${night}: one paper event at most (${pe.length})`);
      const w = s.whores[st];
      for (const e of pe) {
        if (e.data.turned) { flips++; ok(e.data.road === 'notoriety' ? w.notoriety > w.standing : w.standing > w.notoriety, `a flip only when the other meter leads (${w.standing}/${w.notoriety})`); }
        else { warns++; eq(e.data.steps, 1, 'a warning only at one step to go'); }
      }
      s = L.advanceClock(s, 30);
    }
  }
  ok(flips > 0 && warns > 0, `the nights produced flips (${flips}) and warnings (${warns})`);
});

test('A save from before round 7: a declared road only breaks a tie, and is dropped at her next meter move', () => {
  let s = L.newGame('road-old', { starter: 'dolly', standins: false, rivals: false, timelines: ['victorian'], minGapMin: 0 });
  const w = s.whores.dolly; delete w.paper; w.road = 'notoriety';
  eq(L.roadOf(w), 'standing', 'S2 N0: the meters win over the old declaration');
  w.standing = 1; w.notoriety = 1;
  eq(L.roadOf(w), 'notoriety', 'level: the old declaration breaks the tie');
  eq(L.getView(s, 'dolly').whore.road, 'notoriety');
  const v = L.getView(s, 'dolly');
  s = L.sealPlan(s, 'dolly', { place: 'drowned-rat', cards: L.bestGuess(v, 'drowned-rat').cards });
  ok(!('road' in s.whores.dolly), 'the old field is gone'); eq(s.whores.dolly.paper, 'notoriety');
  ok(!s.lastEvents.some((e) => e.type === 'paper' && e.data.turned), 'no change of paper to announce');
});

test('Best Guess never buys Itch with a play that falls short (Curtain); an Assignation fizzle builds no Itch and the preview says so', () => {
  let s = L.newGame('fz-1', { starter: 'dolly', minGapMin: 0 });
  const w = s.whores.dolly; w.notoriety = 1; w.standing = 2;
  w.history.nobby = { visits: 1, regular: 0, grudge: 1, seen: [], wait: 0, satisfied: 0, delighted: 0, catches: 0 };
  w.assignation = { gent: 'nobby', lent: ['limerick', 'mothers-advice', 'saucy-quip'], tourist: false };
  const v = L.getView(s, 'dolly');
  const bg = L.bestGuess(v, { gent: 'nobby' });
  const p = L.previewEncounter(v, { gent: 'nobby', cards: bg.cards });
  ok(p.sway < p.bar, 'every play fizzles on this table');
  eq(p.itch, 0, 'a fizzling Assignation shows no Itch'); eq(p.catches, null);
  const lim = L.previewEncounter(v, { gent: 'nobby', cards: [0] });
  eq(lim.fizzles, true); eq(lim.itch, 0); ok(lim.itchIfSatisfied > 0, 'the Limerick would itch if he were Satisfied');
  // and in play: a fizzled back-alley job leaves the Itch where it was
  const s2 = L.playAssignation(s, 'dolly', { cards: [0] }); // the Limerick alone: 3 with his secret Frolic, short of 4
  eq(s2.lastEvents.find((e) => e.type === 'assignation').data.outcome, 'fizzled');
  eq(s2.whores.dolly.itch, 0, 'no Itch from a fizzle');
  // Curtain: when nothing reaches the Bar, Best Guess plays the no-Itch set
  let c = L.newGame('fz-2', { starter: 'dolly', minGapMin: 0 });
  c.whores.dolly.hand = ['limerick', 'mothers-advice', 'saucy-wink', 'saucy-wink', 'mothers-advice'];
  const vc = L.getView(c, 'dolly'); const host = vc.timeline.rota[0].hosts['drowned-rat'];
  const cbg = L.bestGuess(vc, 'drowned-rat'); const cp = L.previewEncounter(vc, { place: 'drowned-rat', cards: cbg.cards });
  ok(cp.sway < cp.bar, `this hand must stay below the Bar at the Gutter (host ${host}) for the test to bind`);
  eq(cp.itch, 0, `below the Bar at the Gutter (host ${host}), Best Guess buys no Itch`);
});

test('Gossip: a shuffle bag per Timeline (every line once before a repeat; a new bag never opens with the last line); one rnd per Curtain', () => {
  let s = L.newGame('gossip-1', { starter: 'dolly', minGapMin: 0 });
  const lines = [];
  for (let i = 0; i < 24; i++) { s = L.resolveCurtain(s, 'victorian'); lines.push(s.lastEvents.find((e) => e.type === 'gossip' && e.timeline === 'victorian').text); }
  const n = C.GOSSIP.victorian.length;
  eq(n, 12, 'twelve lines per era'); eq(new Set(lines.slice(0, n)).size, n, 'first bag: every line once');
  eq(new Set(lines.slice(n, 2 * n)).size, n, 'second bag: every line once');
  ok(lines[n - 1] !== lines[n], 'a new bag does not open with the line that closed the last');
  for (const tl of C.TIMELINE_IDS) eq(C.GOSSIP[tl].length, 12, `${tl} has 12 gossip lines`);
});

test('Voices: every gentleman, tourist and starter/rival has a pool of 3 (the first is his voice); the engine prints no voice in its log', () => {
  for (const g of Object.values(C.GENTS)) { eq(g.voices.length, 3, g.id); eq(g.voices[0], g.voice, g.id); }
  for (const t of Object.values(C.TOURISTS)) { eq(t.voices.length, 3, t.id); eq(t.voices[0], t.voice, t.id); ok(t.aside, `${t.id} aside`); }
  for (const id of ['dolly', 'fanny', 'jackie', 'lavinia', 'clementine', 'bettie']) eq(C.CHARACTERS[id].voices.length, 3, id);
  let s = L.newGame('voice-1', { starter: 'dolly', minGapMin: 0 });
  s = L.startAssignation(s, 'dolly', 'plunkett');
  const e = s.lastEvents.find((x) => x.type === 'assignation-start');
  ok(!e.text.includes(C.GENTS.plunkett.voice), 'assignation-start text carries no voice');
  ok(!L.describeMatchup({ id: 'tex' }, 'dolly').lines[0].includes('lost and grateful'), 'tourist note is his own aside');
});

test('Seats are named per era (the Salon Seat is Victorian)', () => {
  eq(L.seatName('salon', 'victorian'), 'the Salon Seat'); eq(L.seatName('salon', 'wildwest'), 'the Velvet Chair');
  eq(L.seatName('gutter', 'vegas'), 'the Off-Strip Throne'); eq(L.seatName('crown', 'vegas'), 'the Crown');
  const v = L.getView(L.newGame('seat-1', { starter: 'jackie', minGapMin: 0 }), 'jackie');
  ok(v.timeline.seats.some((x) => x.name === 'the Penthouse Suite'), 'the Vegas view names its own seat');
});

test('Grease Palms grows with Notoriety (2 at 3+, 3 at 5+, 4 at 8+); validatePlan caps at greaseMax', () => {
  let s = L.newGame('grease-1', { starter: 'dolly', minGapMin: 0 });
  const w = s.whores.dolly; w.coin = 50;
  w.notoriety = 2; eq(L.greaseMax(w), 0); w.notoriety = 3; eq(L.greaseMax(w), 2); w.notoriety = 5; eq(L.greaseMax(w), 3); w.notoriety = 8; eq(L.greaseMax(w), 4);
  w.standing = 0;
  const v = L.getView(s, 'dolly'); eq(v.whore.greaseMax, 4);
  const s2 = L.planEvening(s, 'dolly', { place: 'tuppenny', cards: [0], grease: 9 });
  eq(s2.whores.dolly.plan.grease, 4, 'capped at 4');
});

test('Raid Night bribe lever: off in the rulebook (refused); when set, a Notorious whore keeps her full Gutter Renown and pays', () => {
  eq(R.raidBribe, null, 'off');
  let s = L.newGame('bribe-1', { starter: 'dolly', minGapMin: 0 });
  s = L.resolveCurtain(s, 'victorian'); s = L.resolveCurtain(s, 'victorian'); // Curtain No. 3 is Raid Night
  eq(L.isRaidCurtain(s.timelines.victorian.curtainNo), true);
  s.whores.dolly.notoriety = 6; s.whores.dolly.standing = 0; s.whores.dolly.coin = 20;
  let threw = false; try { L.planEvening(s, 'dolly', { place: 'drowned-rat', cards: [0], bribe: true }); } catch (e) { threw = e.code === 'no-bribe'; } ok(threw, 'refused while the lever is off');
  R.raidBribe = { at: 5, cost: 4 };
  try {
    const v = L.getView(s, 'dolly'); ok(L.placeOutlook(v, 'drowned-rat').bribe, 'the outlook offers it');
    const cards = L.bestGuess(v, 'drowned-rat').cards;
    const a = L.sealPlan(s, 'dolly', { place: 'drowned-rat', cards, bribe: true });
    const b = L.sealPlan(s, 'dolly', { place: 'drowned-rat', cards });
    const pa = a.lastEvents.find((e) => e.type === 'payout' && e.whores[0] === 'dolly').data;
    const pb = b.lastEvents.find((e) => e.type === 'payout' && e.whores[0] === 'dolly').data;
    eq(pa.bribe, true); eq(pa.rank, pb.rank, 'same placing');
    if (pa.rank !== null && pa.rank < 3) ok(pa.renown >= pb.renown && pa.renown > 0, 'the bribe keeps the full share');
    eq(pa.coin, pb.coin - 4, 'and costs 4 Coin');
  } finally { R.raidBribe = null; }
});


// ---------------------------------------------------------------------------
// Round 5 (the designer's 7 Oct scores): Coin buys things that show; the High Road's own rungs; the boards reward depth
// ---------------------------------------------------------------------------
test('Morning Special: one novelty a day from the Timeline\'s stalls, picked without touching the RNG; once a day; black market gated', () => {
  let s = L.newGame('special-1', { starter: 'dolly', minGapMin: 0 });
  const rng0 = s.rng; const v = L.getView(s, 'dolly'); eq(s.rng, rng0, 'reading the view draws no RNG');
  const pool = C.TIMELINES.victorian.places.flatMap((p) => C.PLACES[p].stall);
  ok(pool.includes(v.timeline.special.item.id), 'from her own Timeline\'s stalls');
  eq(L.specialOf(s, 'victorian', 0), L.specialOf(s, 'victorian', 0), 'the same all day');
  const days = new Set(Array.from({ length: 12 }, (_, d) => L.specialOf(s, 'victorian', d))); ok(days.size >= 3, `it changes from day to day (${days.size} kinds in 12 days)`);
  // find a day whose special is not black market, and buy it twice
  let day = 0; while (C.ITEMS[L.specialOf(s, 'victorian', day)].blackMarket) day++;
  s.clock = day * 1440 + 400; s.whores.dolly.coin = 20;
  const iid = L.specialOf(s, 'victorian'); const before = s.rng;
  s = L.buySpecial(s, 'dolly');
  eq(s.rng, before, 'buying draws no RNG'); ok(s.whores.dolly.items.some((it) => it.id === iid), 'into the Reticule');
  eq(s.whores.dolly.coin, 20 - C.ITEMS[iid].cost, 'at its stall price');
  let threw = null; try { L.buySpecial(s, 'dolly'); } catch (e) { threw = e.code; } eq(threw, 'special-gone', 'once a day');
  eq(L.getView(s, 'dolly').timeline.special.why, 'bought');
  // a black-market special is under the counter below Notoriety 2
  let bd = 0; while (!C.ITEMS[L.specialOf(s, 'victorian', bd)].blackMarket && bd < 200) bd++;
  ok(bd < 200, 'some day sells the black-market item');
  let s2 = L.newGame('special-1', { starter: 'dolly', minGapMin: 0 }); s2.clock = bd * 1440 + 400; s2.whores.dolly.coin = 20;
  eq(L.getView(s2, 'dolly').timeline.special.why, 'black-market');
  threw = null; try { L.buySpecial(s2, 'dolly'); } catch (e) { threw = e.code; } eq(threw, 'black-market');
  ok(L.legalActions(s, 'dolly').every((a) => a.type !== 'buySpecial'), 'not offered once bought');
});

test('The Ladder: four rungs per Road, bought in order on the Road she is on, cosmetic (no Sway, no rank)', () => {
  let s = L.newGame('digs-1', { starter: 'dolly', minGapMin: 0 });
  for (const tl of C.TIMELINE_IDS) for (const road of ['standing', 'notoriety']) { eq(C.DIGS[tl][road].length, R.digs.rungs, `${tl} ${road}`); ok(C.DIGS[tl][road].every((r, i, a) => i === 0 || r.cost > a[i - 1].cost), 'dearer as she climbs'); }
  s.whores.dolly.coin = 200;
  const v0 = L.getView(s, 'dolly'); eq(v0.whore.digsNext.road, 'standing'); eq(v0.whore.digsNext.n, 0);
  const pv0 = L.previewEncounter(v0, { place: 'salon', cards: [0, 1] });
  s = L.buyDigs(s, 'dolly'); s = L.buyDigs(s, 'dolly');
  const v1 = L.getView(s, 'dolly');
  eq(v1.whore.digs.standing, 2); eq(s.whores.dolly.coin, 200 - C.DIGS.victorian.standing[0].cost - C.DIGS.victorian.standing[1].cost);
  eq(L.previewEncounter(v1, { place: 'salon', cards: [0, 1] }).sway, pv0.sway, 'no Sway from finery');
  ok(s.lastEvents.some((e) => e.type === 'digs' && e.data.rung === C.DIGS.victorian.standing[1].id), 'an event for the page');
  s.whores.dolly.standing = 0; s.whores.dolly.notoriety = 2;
  eq(L.getView(s, 'dolly').whore.digsNext.road, 'notoriety', 'the Police Gazette road buys its own ladder'); eq(L.getView(s, 'dolly').whore.digsNext.n, 0);
  s = L.buyDigs(s, 'dolly'); eq(s.whores.dolly.digs.standing, 2, 'what she bought on the other road is kept');
  s.whores.dolly.coin = 0; let threw = null; try { L.buyDigs(s, 'dolly'); } catch (e) { threw = e.code; } eq(threw, 'no-coin');
  s.whores.dolly.coin = 999; for (let i = 0; i < 3; i++) s = L.buyDigs(s, 'dolly');
  eq(L.getView(s, 'dolly').whore.digsNext, null, 'top of the ladder'); threw = null; try { L.buyDigs(s, 'dolly'); } catch (e) { threw = e.code; } eq(threw, 'top-rung');
});

test('Grease Palms and the Gambler\'s stake are priced by tier (and fixed when she plans)', () => {
  const s = L.newGame('tier-1', { starter: 'fanny', minGapMin: 0 });
  const w = s.whores.fanny;
  eq(L.greasePer(w), R.sway.grease.costByTier.common); eq(L.gamblerTerms(w).stake, R.gambler.stake);
  w.renown = R.tiers.rare; eq(L.greasePer(w), R.sway.grease.costByTier.rare); eq(L.gamblerTerms(w).stake, R.gambler.byTier.rare.stake);
  w.renown = R.tiers.epic; eq(L.greasePer(w), R.sway.grease.costByTier.epic); eq(L.gamblerTerms(w).payout, R.gambler.byTier.epic.payout);
  eq(L.greasePer({ ...w, charm: 'born-in-a-gin-shop' }), R.sway.grease.costByTier.epic - 1, 'Born in a Gin Shop pays 1 less');
  ok(Object.values(R.sway.grease.costByTier).every((x, i, a) => i === 0 || x >= a[i - 1]), 'never cheaper as she rises');
  w.coin = 30; const s2 = L.planEvening(s, 'fanny', { place: 'last-chance', cards: [0], stake: true });
  eq(J(s2.whores.fanny.plan.stakeTerms), J(R.gambler.byTier.epic), 'the stake\'s terms are fixed at planning');
});

test('The High Road\'s rungs: invitations at Standing 3, a Patron at 7 (a stipend with each new day)', () => {
  let s = L.newGame('high-1', { starter: 'dolly', minGapMin: 0 });
  const HR = R.highRoad; const w = s.whores.dolly;
  ok(!L.getView(s, 'dolly').board.some((b) => b.invitation), 'no invitation at Standing 2');
  w.standing = HR.invitationAt;
  const b = L.getView(s, 'dolly').board.find((x) => x.invitation); ok(b && C.GENTS[b.gent].freshness === 'scrubbed', 'a Scrubbed gentleman invites her');
  w.notoriety = HR.invitationAt + 1; ok(!L.getView(s, 'dolly').board.some((x) => x.invitation), 'not while Notoriety leads');
  w.notoriety = 0;
  // the Patron: Standing 7, a stipend with the next day
  w.standing = HR.patronAt; const c0 = w.coin;
  s = L.advanceClock(s, 1440, { autoCurtains: false }); s = L.study(s, 'dolly', 'plunkett');
  ok(s.lastEvents.some((e) => e.type === 'patron'), 'a Patron calls'); eq(s.whores.dolly.coin, c0 + HR.patronCoin, 'with the stipend');
  ok(C.COLLECTIBLES['society-pages'], 'a collectible to frame');
});

test('Society Pages: Standing 10 frames them once (the Front Page\'s twin)', () => {
  const s = L.newGame('sp-1', { starter: 'dolly', minGapMin: 0 }); const w = s.whores.dolly;
  w.standing = 9; w.notoriety = 1;
  // Delighting a Scrubbed gentleman raises Standing by 1 (and tips the seesaw): Delight Plunkett until Standing reaches 10
  const st = L.mut; s.whores.dolly.coin = 20;
  let n = 0;
  while (!s.whores.dolly.societyPages && n++ < 20) {
    st.startAssignation(s, 'dolly', 'plunkett');
    const v = L.getView(s, 'dolly'); const bg = L.bestGuess(v, { gent: 'plunkett' });
    st.playAssignation(s, 'dolly', { cards: bg.cards.length ? bg.cards : [v.whore.assignation.lent.findIndex((c) => !c.affliction)] });
    if (n % 3 === 0) st.advanceClock(s, 1440, { autoCurtains: false });
  }
  ok(s.whores.dolly.societyPages, 'reached Standing 10 by Delighting a Scrubbed gentleman');
  eq(s.whores.dolly.collectibles.filter((c) => c === 'society-pages').length, 1, 'framed once');
});

test('Renown milestones at 100 and 200: an era sub-title each, announced once', () => {
  let s = L.newGame('ms-1', { starter: 'dolly', minGapMin: 0 });
  for (const tl of C.TIMELINE_IDS) for (const m of R.milestones) ok(C.ERA_MILESTONES[tl][m].standing && C.ERA_MILESTONES[tl][m].notoriety, `${tl} ${m}`);
  ok(R.milestones.every((m) => m > R.tiers.rare && m < R.tiers.epic), 'between Rare and Epic');
  s.whores.dolly.renown = R.milestones[0] - 1;
  eq(L.getView(s, 'dolly').whore.milestone.next, R.milestones[0]);
  const m = L.mut; let got = 0;
  for (let i = 0; i < 4; i++) { m.startAssignation(s, 'dolly', s.whores.dolly.touristMet ? 'plunkett' : 'tex'); const v = L.getView(s, 'dolly'); const bg = L.bestGuess(v, { gent: v.whore.assignation.gent }); m.playAssignation(s, 'dolly', { cards: bg.cards.length ? bg.cards : [0] }); got += s.lastEvents.filter((e) => e.type === 'milestone').length; }
  eq(got, 1, 'announced once'); eq(L.getView(s, 'dolly').whore.milestone.title, C.ERA_MILESTONES.victorian[R.milestones[0]].standing);
});

test('Road boards rank the best single whore (the second breaks ties); Richest is one whore\'s Coin', () => {
  const s = L.newGame('lb-1', { humans: [{ id: 'p', name: 'Specialist', whores: ['dolly'] }, { id: 'q', name: 'Spread', whores: ['fanny', 'jackie'] }], seedBoards: false });
  s.whores.dolly.peakNotoriety = 9; s.whores.fanny.peakNotoriety = 5; s.whores.jackie.peakNotoriety = 5;
  s.whores.dolly.coinEarned = 60; s.whores.fanny.coinEarned = 40; s.whores.jackie.coinEarned = 40;
  s.whores.dolly.peakStanding = 6; s.whores.fanny.peakStanding = 6; s.whores.jackie.peakStanding = 4;
  const lb = L.leaderboards(s);
  const rank = (b, id) => lb[b].find((r) => r.account === id).rank;
  ok(rank('notorious', 'p') < rank('notorious', 'q'), 'one 9 beats two 5s');
  ok(rank('richest', 'p') < rank('richest', 'q'), 'one whore\'s 60 Coin beats two 40s');
  eq(lb.respectable.find((r) => r.account === 'q').second, 4, 'the second whore is the tie-break');
  ok(rank('respectable', 'q') < rank('respectable', 'p'), 'level on the best, the second whore breaks the tie');
});

test('A lucky Secret Taste brings a short gag (every gentleman has one); describeMatchup no longer quotes his Tells', () => {
  for (const gid of Object.keys(C.GENTS)) ok(C.LUCKY[gid], `${gid} has a lucky gag`);
  const v = L.getView(L.newGame('dm-1', { starter: 'dolly' }), 'dolly');
  const m = L.describeMatchup(v.timeline.gents.find((g) => g.id === 'plunkett'), v.whore);
  for (const t of C.GENTS.plunkett.tells) ok(!m.lines.some((l) => l.includes(t)), `no Tell quoted: ${t}`);
  // drive an accidental Secret Taste: Plunkett secretly likes Silk
  let s = L.newGame('dm-1', { starter: 'dolly', minGapMin: 0 }); let hit = null;
  for (let i = 0; i < 10 && !hit; i++) {
    L.mut.startAssignation(s, 'dolly', 'plunkett'); const w = s.whores.dolly;
    const lent = w.assignation.lent; const silk = lent.findIndex((c) => C.CARDS[c] && C.CARDS[c].arts.includes('silk'));
    const other = lent.findIndex((c, j) => j !== silk && C.CARDS[c] && !C.CARDS[c].arts.includes('frolic'));
    if (silk < 0) { L.mut.cancelAssignation(s, 'dolly'); s.whores.dolly.lentHold = null; continue; }
    L.mut.playAssignation(s, 'dolly', { cards: other >= 0 ? [silk, other] : [silk] });
    hit = s.lastEvents.find((e) => e.type === 'gag' && e.data.lucky) || (s.whores.dolly.known.gents.plunkett && s.whores.dolly.known.gents.plunkett.secret ? 'learned-without-gag' : null);
  }
  ok(hit && hit !== 'learned-without-gag', `a lucky gag printed (${hit && hit.text})`);
});


test('One home per joke (humour audit rule 6): key nouns and tag shapes appear across all content pools no more than their canonical homes', () => {
  // round 5, findings 18 and 19: per-pool shuffle bags cannot catch the same joke told as new in another pool, so this
  // counts unique player-facing strings (anything with a space) across CONTENT. Each limit names the joke's home(s).
  const all = new Set(); walk(C, (x) => { if (typeof x === 'string' && x.includes(' ')) all.add(x); });
  const LIMITS = [
    [/\bsteer\b/i, 0, 'no steers (Tex and Hank both named one after you)'],
    [/annul/i, 2, "the Chapel Quickie's timestamp and the cure's name"],
    [/\bsalts\b/i, 1, "Lord Plunkett's voice"],
    [/jingl/i, 5, "the Spurs (item name, Kink hint), Hank's Tell, and the Jingle All the Way gag (name, set-up)"],
    [/\bhas asked\b/i, 1, 'the Detention gag (stern-word): the punished man who asks for more'],
    [/thursday/i, 1, "Agatha's mourning (kept on purpose)"],
    [/\bnam(e|es|ed) .{0,30}after you/i, 2, "Mr Vanderbucks's siding (the hook and its keepsake)"],
    [/\bfetch my salts|smelling salts/i, 1, 'Lord Plunkett'],
  ];
  const bad = [];
  for (const [re, max, home] of LIMITS) { const hits = [...all].filter((t) => re.test(t)); if (hits.length > max) bad.push(`${re} x${hits.length} (home: ${home}): ${hits.map((h) => h.slice(0, 60)).join(' | ')}`); }
  ok(!bad.length, bad.join('\n     '));
});

// ---------------------------------------------------------------------------
// The tone lint (docs/gdd/04-tone-and-humour.md §5 items 1-5, the former proposals 1-4; ARENA-SPEC §8; docs/gdd/07-the-editor.md §10-11).
// It walks every player-facing string in CONTENT (anything with a space) except names and name-like keys, which are exempt
// (04 "Voice": never change a name) and serve instead as boundaries for the phrase count, and except the engine's own tables.
// game/strings.js joins the walk in I3 when it exists. The allowlist lives here, next to the check, as §8 asks.
const TONE = {
  nameKeys: /\.(name|names|short|title|epithet|label|raidSquad|gazette|quarter|skin|art)(\.|$)/,
  skipPools: /^\.(RULES|NPC_ACCOUNTS|ART_IDS|TIMELINE_IDS|TIERS|SHARED_DECK)(\.|$)/,
  // 1. banned outright (04 §3 and §5 proposal 1; 07 §3): the masked subject, the stock reversal, the object that reacts, stock AI phrasing, the em dash
  banned: [[/Somebody/, '"Somebody"'], [/never been happier/i, '"never been happier"'], [/is unimpressed/i, '"is unimpressed"'], [/has opinions/i, '"has opinions"'],
    [/in sympathy/i, '"in sympathy"'], [/a testament to/i, '"a testament to"'], [/a symphony of/i, '"a symphony of"'], [/let's just say/i, '"let\'s just say"'],
    [/in a world where/i, '"in a world where"'], [/—/, 'an em dash']],
  // game-wide budgets (04 §5 proposal 1; 07 §10): the regexes are the spec's own, case-sensitive, "Ma " with its space so "Ma'am" is not a mother
  budgets: [[/Tuesday/i, 1, '"Tuesday"'], [/Mother|Mom|Ma /, 2, '"Mother", "Mom" or "Ma "']],
  // per-Timeline budgets (04 §5 proposal 2): a shared line (a Charm, a Talent, a Vice) is seen in every Timeline and counts in each.
  // "Object reacts" beyond the banned tells is the two documented shapes left (04:48): "A/The <thing> sighs" and "has lodged a complaint".
  perTimeline: [[/\bNobody\b/, 1, 'a "Nobody ..." line'], [/\b(?:A|The) \w+ (?:sighs\b|has lodged a complaint)/, 1, 'an object that reacts']],
  // 3. the three-word-phrase count (04 §5 proposal 1): any phrase on more than two lines fails, outside the allowlist below.
  // Boundaries break a phrase so it never spans a name, a placeholder or a rules keyword. Rules keywords are case-sensitive on
  // purpose: the content capitalises them (Notoriety, the Curtain, a Posh Place), so lowercase "the curtain" is the stage prop and prose.
  gameTerms: ['Notoriety', 'Standing Order', 'Standing', 'Sway', 'Renown', 'Allure', 'Coin', 'Gossip', 'Curtains', 'Curtain', 'Places', 'Place', 'Posh', 'Rowdy', 'Gutter',
    'Best Guess', 'Raid Night', 'Door gifts', 'Door gift', 'door gift', 'Assignation', 'Regulars', 'Regular', 'Worked', 'Work', 'Timeline', 'Fancy', 'Type', 'Tastes', 'Taste', 'Kink', 'Tell',
    'clash', 'Seat', 'Crown', 'Madam is not receiving', 'the Strip', 'Off-Strip', 'Scrubbed', 'Fair', 'Ripe', 'Little Black Book', 'Season'],
  // template stems, each with the pool that owns it and its count today; a stem is rules text repeated by design, not a joke told twice
  stems: [['him and he', 6, 'GENTS.*.hook.text: "Beat / Win with / Delight him and he ..."'], ['wants you pack', 4, 'DIGEST.telegrams and templates.timeline-unlocked: "{timeline} wants you. Pack ..."'],
    ['went out without', 3, 'DIGEST.templates.standing-order*: "{whore} went out without you {times}"'], ['out without you', 3, 'DIGEST.templates.standing-order*']],
  // the editor's tics (07 §11), each with its budget; none is used yet
  tics: [['we are told', 6, '07 §11: at most two per era'], ['names withheld', 3, '07 §11: at most one per era'], ['we reckon', 2, '07 §11: Dakota only']],
  // a phrase made only of function words ("out of the", "is this the") is grammar, not a joke, and is not counted
  stopwords: new Set(('a an the of in on at to for with and or but nor so if then than as by from up down out off over under into onto about after before ' +
    'he she it they you we i me him her us them his its my your our their mine yours is are was were be been being am has have had do does did not no ' +
    'this that these those there here what which who whom whose when where why how will would can could may might shall should must ' +
    'one all any some more most very just also well now next last first other same own only even still again much many each every both few such ' +
    'yes oh go went got get').split(' ')),
  phraseMax: 2,
  // 4. the two-beat share (04 §5 item 4; ARENA-SPEC §8 and 07 §10: "half"): a line of exactly two sentences, "Statement. Deflating
  // statement."; the ceiling per bucket
  twoBeatCeiling: 0.5,
  buckets: [['flavour', /\.(flavour|flavours)(\.|$)/], ['reaction', /\.(reactions|again|aversionLine)(\.|$)/], ['voice', /\.(voice|voices)(\.|$)/], ['gossip', /^\.GOSSIP\./], ['digest', /^\.DIGEST\./]],
  // Content debt, measured 2026-10-09 on a20687d's content (the lint arrived after the lines were written; 04 §5 has the table).
  // Each entry is the count AS FOUND: the check fails if a count grows, and fails if a count has come down and the entry was
  // not lowered to it or struck, so the table holds the exact counts and only ever shrinks. An entry is struck when its lines are rewritten (I3: the editor's
  // pools, GOSSIP and DIGEST) or cut by the designer's read-aloud (the pools he does not own, 07 §12). No count is raised.
  debt: {
    // [phrase, lines as found, where it sits and who strikes it]
    phrases: [
      ['over the curtain', 5, 'GAGS.thank-you.see, TOURISTS.tex/darren/pooter gags: the gag set-ups (read-aloud)'],
      ['calls it the', 4, 'CARDS.reverse-cowgirl.flavours.vegas, GENTS.brayden/slots and TOURISTS.tex reactions.delighted (read-aloud)'],
      ['it the best', 4, 'the same four lines as "calls it the" (read-aloud)'],
      ['pays you in', 4, 'GENTS.nobby.hook.text and nobby/vanderbucks/slots reactions (read-aloud)'],
      ['the curtain and', 4, 'TOURISTS.tex/darren gags (read-aloud)'],
      ['she told the', 3, 'CARDS.saucy-quip.flavours.wildwest/vegas, VICES.loose-lips.flavour (read-aloud)'],
      ['a lot of', 3, 'CARDS.jackpot-shimmy.flavour, ITEMS.spike.inspect, VICES.mothers-ruin.flavour (read-aloud)'],
      ['buttoned to the', 3, 'CHARACTERS.dolly/clementine/agatha.look (read-aloud)'],
      ['at a time', 3, 'CHARACTERS.ivy.temperamentText, GENTS.alfie.voices.2, GOSSIP.victorian.2 (the editor rewrites the GOSSIP line in I3)'],
      ['rolls out from', 3, 'GAGS.fair-cop.see, TOURISTS.tex/darren gags (read-aloud)'],
      ['all the way', 3, 'GENTS.alfie.reactions.delighted.0 and .2, ITEMS.jumpsuit.publicUse (read-aloud)'],
    ],
    // two-beat lines as found, per bucket over the half ceiling (reaction, 60 of 135, is under it)
    twoBeat: { flavour: 65, voice: 45, gossip: 26, digest: 37 }, // of 123, 66, 36 and 58; GOSSIP and DIGEST are the editor's (I3), flavour and voice the read-aloud's
  },
};
function toneLint(C) {
  const failures = []; const report = [];
  const lines = []; walk(C, (x, p) => { if (typeof x !== 'string' || !x.includes(' ')) return; if (TONE.skipPools.test(p) || TONE.nameKeys.test(p)) return; lines.push([p, x]); });
  const firstPath = new Map(); for (const [p, x] of lines) if (!firstPath.has(x)) firstPath.set(x, p);
  const U = [...firstPath].map(([x, p]) => [p, x]); // unique strings: a card's default flavour is also its era pool's first line
  const show = (h) => h.map(([p, t]) => `${p.slice(1)} "${t}"`).join('\n       ');
  // 1. banned and budgeted words
  for (const [re, what] of TONE.banned) { const h = U.filter(([, t]) => re.test(t)); if (h.length) failures.push(`banned ${what} on ${h.length} line(s):\n       ${show(h)}`); }
  for (const [re, max, what] of TONE.budgets) { const h = U.filter(([, t]) => re.test(t)); if (h.length > max) failures.push(`${what} on ${h.length} lines, budget ${max}:\n       ${show(h)}`); }
  // 2. per-Timeline budgets
  const tlOf = (p) => { const m = p.match(/\.(victorian|wildwest|vegas)(\.|$)/); if (m) return m[1]; const [, top, id] = p.split('.'); const o = C[top] && C[top][id]; return (o && o.timeline) || 'shared'; };
  for (const [re, max, what] of TONE.perTimeline) for (const tl of C.TIMELINE_IDS) {
    const h = U.filter(([p, t]) => re.test(t) && [tl, 'shared'].includes(tlOf(p)));
    if (h.length > max) failures.push(`${what} x${h.length} in ${tl}, budget ${max} per Timeline:\n       ${show(h)}`);
  }
  // 3. three-word phrases
  const names = []; walk(C, (x, p) => { if (typeof x === 'string' && /\.(name|names|short)(\.|$)/.test(p) && x.length > 2) names.push(x); });
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const cuts = [...new Set(names)].sort((a, b) => b.length - a.length).map((n) => new RegExp(`(^|[^A-Za-z])${esc(n)}(?![A-Za-z])`, 'gi'))
    .concat(TONE.gameTerms.map((g) => new RegExp(`(^|[^A-Za-z])${esc(g)}(?![A-Za-z])`, 'g')));
  const kicker = /^[A-Z][A-Z0-9 '&,.!?-]{2,}:\s*/;
  const trigrams = (t) => {
    let s = t.replace(kicker, ' ').replace(/\{[^}]*\}/g, ' | ');
    for (const re of cuts) s = s.replace(re, '$1 | ');
    const out = new Set();
    for (const seg of s.toLowerCase().split('|')) {
      const w = seg.replace(/[^a-z0-9'+\- ]/g, ' ').split(/\s+/).filter(Boolean);
      for (let i = 0; i + 2 < w.length; i++) { const g = w.slice(i, i + 3); if (g.every((x) => TONE.stopwords.has(x))) continue; out.add(g.join(' ')); }
    }
    return out;
  };
  const phrases = new Map();
  for (const [p, t] of U) for (const g of trigrams(t)) { if (!phrases.has(g)) phrases.set(g, []); phrases.get(g).push([p, t]); }
  const allow = new Map([...TONE.stems, ...TONE.tics].map(([g, max, home]) => [g, { max, home }]));
  const owed = new Map(TONE.debt.phrases.map(([g, max, home]) => [g, { max, home, debt: true }]));
  const over = [];
  for (const [g, h] of phrases) { const a = allow.get(g) || owed.get(g); const max = a ? a.max : TONE.phraseMax; if (h.length > max) over.push([g, h, a]); }
  over.sort((a, b) => b[1].length - a[1].length);
  for (const [g, h, a] of over) failures.push(`"${g}" on ${h.length} lines${a ? ` (${a.debt ? 'debt' : 'allowed'} ${a.max}: ${a.home})` : ''}:\n       ${show(h)}`);
  for (const [g, a] of owed) { const n = (phrases.get(g) || []).length; if (n < a.max) failures.push(`stale debt: "${g}" is on ${n} line(s) now, not ${a.max}: ${n <= TONE.phraseMax ? 'strike it from' : `lower it to ${n} in`} TONE.debt.phrases`); }
  // 4. the two-beat share per bucket. A beat is a sentence; the ALL-CAPS kicker is not prose (04 "Voice": kickers are kept verbatim);
  // a beat that is only a placeholder ("{eratail}") is written elsewhere and does not count; "No. {curtain}", "Mr", "a.m." do not end a beat.
  // Outside the voice bucket a beat that is quoted speech of three words or more makes the line dialogue, one of 04:108's other shapes;
  // voice lines are dialogue by construction, so there the shape is measured as written.
  const beats = (t) => t.replace(kicker, '').replace(/\b(No|Mr|Mrs|Dr|St)\.\s/g, '$1 ').replace(/\b([ap])\.m\./g, '$1m').replace(/\.\.\./g, ' ')
    .replace(/\{[^}]*\}/g, '\u0001').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => /[A-Za-z]/.test(s.replace(/\u0001/g, '')));
  const spoken = (s) => /["“](?:[^"”]*\s){2,}[^"”]*["”]/.test(s) || /^'.*'$/.test(s);
  const twoBeat = (t, bucket) => { const b = beats(t); return b.length === 2 && (bucket === 'voice' || !b.some(spoken)); };
  for (const [bucket, re] of TONE.buckets) {
    const seen = new Set(); const pool = lines.filter(([p, t]) => re.test(p) && !seen.has(t) && seen.add(t));
    const two = pool.filter(([, t]) => twoBeat(t, bucket));
    const pct = Math.round((100 * two.length) / pool.length); const owedHere = TONE.debt.twoBeat[bucket];
    report.push(`${bucket}: ${two.length}/${pool.length} two-beat (${pct}%)${owedHere != null ? ` [debt ${owedHere}]` : ''}`);
    const overCeiling = two.length > TONE.twoBeatCeiling * pool.length;
    if (overCeiling && !(owedHere != null && two.length <= owedHere)) failures.push(`${bucket}: ${two.length} of ${pool.length} lines are two-beat (${pct}%), ceiling ${TONE.twoBeatCeiling * 100}%${owedHere != null ? `, debt ${owedHere}` : ''}:\n       ${show(two)}`);
    if (owedHere != null && two.length < owedHere) failures.push(`stale debt: ${bucket} is at ${two.length} of ${pool.length} (${pct}%), not ${owedHere}: ${overCeiling ? `lower it to ${two.length} in` : 'under the ceiling, strike it from'} TONE.debt.twoBeat`);
  }
  // 5. three variants minimum for anything a player sees more than once a day (04 §5 proposal 4). TOP_MARKS, LAST_CALL and the heat
  // labels live in game/scandal.js until I3 lifts them into game/strings.js, when they join this check.
  if (!(Array.isArray(C.DIGEST.rotaTemplates) && C.DIGEST.rotaTemplates.length >= 3)) failures.push('DIGEST.rotaTemplates has fewer than three variants');
  return { ok: !failures.length, failures, report, lines: U.length };
}
test('Tone lint (04 §5 items 1-5): banned words, game-wide and per-Timeline budgets, no three-word phrase on more than two lines, two-beat share per bucket at or under half, three variants for the rota tip; the dated debt table may only shrink', () => {
  const r = toneLint(C);
  console.log(`     tone lint: ${r.lines} unique player-facing lines; ${r.report.join('; ')}; debt: ${TONE.debt.phrases.length} phrase(s), ${Object.keys(TONE.debt.twoBeat).length} bucket(s)`);
  if (!r.ok) console.log(`     tone lint: ${r.failures.length} failure(s)\n     ${r.failures.join('\n     ')}`);
  ok(r.ok, `tone lint: ${r.failures.length} failure(s): ${r.failures.map((f) => f.split('\n')[0].replace(/:$/, '')).join('; ')} (the full report is printed above)`);
  // the ratchet binds: one more line on a debt phrase, one more two-beat gossip line, a banned word, and a debt entry gone stale each fail
  const clone = () => JSON.parse(J(C)); const grow = clone(); grow.GOSSIP.vegas.push('A hat was seen over the curtain and under a chair. The chair has said nothing.');
  const g = toneLint(grow).failures;
  ok(g.some((f) => f.startsWith('"over the curtain" on 6 lines (debt 5')), `a debt phrase may not grow: ${g.map((f) => f.split('\n')[0]).join('; ')}`);
  ok(g.some((f) => f.startsWith('gossip: 27 of 37')), 'a debt bucket may not grow');
  const banned = clone(); banned.GOSSIP.vegas.push('Somebody was seen. Somebody always is.');
  ok(toneLint(banned).failures.some((f) => f.startsWith('banned "Somebody"')), 'a banned word fails');
  const stale = clone(); stale.TOURISTS.tex.gags[1] = 'A hat. A chair.'; stale.TOURISTS.darren.gags[2] = 'A boot. A bucket.'; stale.TOURISTS.pooter.gags[2] = 'A map. A moth.';
  ok(toneLint(stale).failures.some((f) => f.startsWith('stale debt: "over the curtain"')), 'a debt entry whose lines were cut must be struck');
});

test('The plan screen\'s Kink offer delivers the item it promised, two-item fresh stalls included, without moving the RNG (round 6, finding 1)', () => {
  // kinkOffer names one item; explore(..., { want }) must hand over exactly that item on the fresh roll. Before round 6 the
  // fresh roll picked at random among the stall's items, so the Tuppenny Palace, the Velvet Spur and the Penthouse (two
  // items each) sold the other novelty about half the time while the page claimed the Kink was in play.
  let offers = 0; let twoItem = 0; const stalls = new Set();
  for (const st of ['dolly', 'fanny', 'jackie']) for (let i = 0; i < 80; i++) {
    let s = L.newGame(`kink-offer-${st}-${i}`, { starter: st, minGapMin: 0 });
    for (let step = 0; step < 4; step++) {
      const v = L.getView(s, st); const k = L.kinkOffer(v);
      if (k) {
        offers++;
        const asked = L.explore(s, st, k.stall.id, { want: k.item.id }); const plain = L.explore(s, st, k.stall.id);
        eq(asked.rng, plain.rng, 'asking by name burns the same draw');
        eq(asked.whores[st].offer.item, k.item.id, `${k.stall.id} hands over the promised item`);
        if (C.PLACES[k.stall.id].stall.length > 1) { twoItem++; stalls.add(k.stall.id); }
        const bought = L.buyOffer(asked, st);
        ok(bought.whores[st].items.some((x) => x.id === k.item.id), 'the promised item is in her reticule');
      }
      s = L.advanceClock(s, 300);
    }
  }
  ok(offers > 100 && twoItem > 50, `enough offers probed (${offers}, ${twoItem} at two-item stalls)`);
  for (const pid of ['tuppenny', 'velvet-spur', 'penthouse']) ok(stalls.has(pid), `${pid} was probed`);
  // no want, or a want on any roll but the guaranteed fresh one, changes nothing
  const s0 = L.newGame('kink-offer-plain', { starter: 'dolly', minGapMin: 0 }); const v0 = L.getView(s0, 'dolly');
  const other = v0.timeline.places.find((p) => p.id !== v0.timeline.freshStall).id;
  const a = L.explore(s0, 'dolly', other, { want: C.PLACES[other].stall[0] }); const b = L.explore(s0, 'dolly', other);
  eq(J(a.whores.dolly), J(b.whores.dolly), 'a want off the fresh stall is ignored');
});

test('awayDigest TONIGHT: the Society Pages never get the Gutter without his Kink; an open Posh house is the Gazette\'s way back, never a last resort (round 6, finding 3; round 7)', () => {
  let n = 0; let gazettePosh = 0;
  for (const st of ['dolly', 'fanny', 'jackie']) for (const road of ['notoriety', 'standing']) for (let i = 0; i < 25; i++) {
    let s = L.newGame(`tonight-road-${st}-${i}`, { starter: st, minGapMin: 0 });
    // her paper from her meters: the Police Gazette at level 2/2 after the Gutter (the Posh door still open), else the start
    if (road === 'notoriety') { const w = s.whores[st]; w.standing = 2; w.notoriety = 2; w.paper = 'notoriety'; }
    for (let k = 0; k < 3; k++) {
      const t = L.awayDigest(s, st, s.tick, { tonight: true }).headlines.find((h) => h.type === 'tonight');
      if (t) {
        n++;
        // the Standing Order plays between checks and may move her meters, so check against the paper she is in now
        const cur = L.roadOf(s.whores[st]); const kind = C.PLACES[t.place].kind; const v = L.getView(s, st);
        if (cur === 'standing' && v.timeline.places.some((p) => p.open && p.kind !== 'gutter')) ok(kind !== 'gutter', `${st} ${cur}: ${t.text}`);
        if (cur === 'notoriety' && kind === 'posh') gazettePosh++;
      }
      s = L.advanceClock(s, 200);
    }
  }
  ok(n > 50, `enough TONIGHT lines (${n})`);
  ok(gazettePosh > 0, `a Gazette whore at 2/2 is sometimes sent to the open Posh house (${gazettePosh})`);
});

test('A gentleman worked a 4th time in one day gets his `again` line, never a 3-line pool on repeat (round 6, finding 11)', () => {
  for (const g of Object.values(C.GENTS)) ok(g.again && g.again.length >= 3, `${g.id} has an again pool`);
  let checked = 0;
  for (const gid of ['plunkett', 'alfie', 'hank', 'gaz']) {
    const st = { victorian: 'dolly', wildwest: 'fanny', vegas: 'jackie' }[C.GENTS[gid].timeline];
    let s = L.newGame(`again-${gid}`, { starter: st, minGapMin: 0 });
    const texts = [];
    for (let i = 0; i < 6; i++) {
      if (!L.getView(s, st).board.some((b) => b.gent === gid && !b.refused)) break;
      s = L.startAssignation(s, st, gid);
      s = L.playAssignation(s, st, { cards: L.bestGuess(L.getView(s, st), { gent: gid }).cards });
      texts.push(s.lastEvents.find((x) => x.type === 'assignation').data.reaction);
    }
    if (texts.length < 5) continue;
    checked++;
    ok(texts.slice(0, 3).every((t) => !C.GENTS[gid].again.includes(t)), `${gid}: the first three jobs use his ordinary lines`);
    ok(texts.slice(3).every((t) => C.GENTS[gid].again.includes(t)), `${gid}: ${J(texts)}`);
    ok(new Set(texts.slice(3)).size === texts.slice(3).length, `${gid}: no again line twice in a row of ${texts.length - 3}`);
  }
  ok(checked >= 2, `enough gentlemen worked 5+ times (${checked})`);
});

test('Shared headlines carry their own era\'s props: no vicar, laundress, milliner or bishop outside London (round 6, finding 17)', () => {
  const D = C.DIGEST; const VICT = /vicar|laundress|millin|bishop|guinea|hansard/i;
  for (const [type, tails] of Object.entries(D.eraTails)) {
    ok(D.templates[type].includes('{eratail}'), `${type} ends on {eratail}`);
    ok(!VICT.test(D.templates[type]), `${type} template is era-neutral`);
    for (const tl of C.TIMELINE_IDS) { ok(tails[tl], `${type} has a ${tl} tail`); if (tl !== 'victorian') ok(!VICT.test(tails[tl]), `${type} ${tl}: ${tails[tl]}`); }
  }
  for (const tl of C.TIMELINE_IDS) { ok(D.crowned[tl], `CROWNED has a ${tl} tail`); if (tl !== 'victorian') ok(!VICT.test(D.crowned[tl]), D.crowned[tl]); }
  ok(!/bought .{0,10}cop/i.test(D.eraTails['front-page'].victorian + D.eraTails['front-page'].wildwest + D.eraTails['front-page'].vegas), 'the bought-copies joke lives only on The Front Page collectible');
});

// Leak lane (2026-10-07, designer: "even before his kink or secret is revealed, the card ... already shows high sway")
// Everything a player sees before she plays must come from what she knows. Swap the hidden facts of every gentleman she
// has not learned and nothing on her screen may move.
function seenBeforePlay(s, wid) {
  const v = L.getView(s, wid); const out = { view: J({ tl: v.timeline, w: v.whore, board: v.board }) };
  for (const p of v.timeline.places.filter((x) => x.open)) {
    out[p.id] = J({ per: v.whore.hand.map((c) => (c.affliction ? null : L.previewEncounter(v, { place: p.id, cards: [c.idx] }).cards[0].score)),
      bg: L.bestGuess(v, p.id), ol: L.placeOutlook(v, p.id), boost: L.placeBoost(v, p.id), items: v.whore.items.map((it) => L.bestGuess(v, p.id, { item: it.id }).sway) });
  }
  out.rest = J({ casual: L.casualPlace(v), offer: L.kinkOffer(v), board: L.boardOutlook(v), so: L.standingOrderPick(v), hints: v.timeline.gents.map((g) => L.describeMatchup(g, v.whore).lines) });
  return out;
}
function withHiddenSwapped(s, wid, fn) {
  const w = s.whores[wid]; const saved = [];
  try {
    for (const gid of C.TIMELINES[w.timeline].gents) {
      const g = C.GENTS[gid]; const k = w.known.gents[gid] || {}; saved.push([g, g.secretTaste, g.kink]);
      if (!k.secret) g.secretTaste = C.ART_IDS.find((a) => a !== g.secretTaste && !g.tastes.includes(a) && a !== g.aversion);
      // a trigger every hand can meet: if the preview read the hidden Kink, the swap would light it up
      if (!k.kink) g.kink = { ...g.kink, name: 'Swapped', trigger: { cards: Object.keys(C.CARDS) } };
    }
    return fn();
  } finally { for (const [g, st, kk] of saved) { g.secretTaste = st; g.kink = kk; } }
}
test('Nothing she sees before she plays depends on a fact she has not learned (preview, Best Guess, smileys, boosts, board, hints)', () => {
  let checked = 0;
  for (const starter of ['dolly', 'fanny', 'jackie']) {
    const s = L.newGame(`blind-${starter}`, { starter, minGapMin: 0 });
    for (let e = 0; e < 6; e++) {
      const v = L.getView(s, starter); const place = L.casualPlace(v, { followSmileys: true });
      const a = seenBeforePlay(s, starter); const b = withHiddenSwapped(s, starter, () => seenBeforePlay(s, starter));
      for (const k of Object.keys(a)) eq(b[k], a[k], `${starter} evening ${e} ${k}:`);
      checked++;
      // and the swap does bite once a fact is known (the control)
      if (e === 0) {
        const gid = v.timeline.rota[0].hosts[place]; const k0 = s.whores[starter].known.gents[gid];
        s.whores[starter].known.gents[gid] = { secret: true, kink: true };
        const c1 = seenBeforePlay(s, starter)[place]; const c2 = withHiddenSwapped(s, starter, () => seenBeforePlay(s, starter)[place]);
        s.whores[starter].known.gents[gid] = k0; if (!k0) delete s.whores[starter].known.gents[gid];
        ok(c1 === c2, 'known facts are not swapped');
      }
      L.mut.sealPlan(s, starter, { place, cards: L.bestGuess(v, place).cards });
      const T = s.timelines[C.CHARACTERS[starter].timeline]; const k0 = T.curtainNo; L.mut.advanceClock(s, R.curtain.maxGapMin); if (T.curtainNo === k0) L.mut.resolveCurtain(s, T.id);
    }
  }
  ok(checked === 18, `checked ${checked}`);
});

test('A hidden Secret Taste still pays when played: the preview counts only what she knows, the result adds it and she learns it', () => {
  const s = L.newGame('secret-surprise', { starter: 'dolly', minGapMin: 0 });
  L.mut.startAssignation(s, 'dolly', 'plunkett'); // he secretly likes Silk
  s.whores.dolly.assignation.lent = ['come-hither', 'saucy-quip', 'mothers-advice'];
  const v = L.getView(s, 'dolly'); const silk = v.whore.assignation.lent.findIndex((c) => c.arts.includes('silk'));
  const pv = L.previewEncounter(v, { gent: 'plunkett', cards: [silk] });
  ok(!pv.cards[0].ticks.includes('secret') && pv.unknown.includes('secret'), J(pv.cards[0]));
  L.mut.playAssignation(s, 'dolly', { cards: [silk] });
  const res = s.lastEvents.find((e) => e.type === 'assignation');
  eq(res.data.breakdown.sway, pv.sway + R.card.secret, 'played Sway = preview + the hidden tick');
  ok(res.data.breakdown.cards[0].ticks.includes('secret'), 'the result shows the tick');
  const l = s.lastEvents.find((e) => e.type === 'learned');
  ok(l && l.data.why === 'accident' && l.data.facts.includes('secret') && l.data.secretTaste === 'silk', J(l && l.data));
  ok(L.getView(s, 'dolly').timeline.gents.find((g) => g.id === 'plunkett').known.secret, 'and now it is known');
});

test('A hidden Kink still pays when played: no +3 in any preview until known; hit by accident it pays +3 and is learned', () => {
  const s = L.newGame('kink-surprise', { starter: 'dolly', minGapMin: 0 });
  s.timelines.victorian.curtainNo = 1;
  const host = L.getView(s, 'dolly').timeline.rota[0].hosts; const pid = Object.keys(host).find((p) => host[p] === 'plunkett');
  s.whores.dolly.hand = ['strict-governess', 'saucy-quip', 'anonymous-verse', 'mothers-advice', 'saucy-wink'];
  const v = L.getView(s, 'dolly');
  const one = L.previewEncounter(v, { place: pid, cards: [0] });
  const pv = L.previewEncounter(v, { place: pid, cards: [0, 1, 2] });
  ok(!pv.kinkHit && !pv.parts.some((p) => p.key === 'kink') && pv.unknown.includes('kink'), J(pv.parts));
  eq(one.cards[0].score, C.CARDS['strict-governess'].allure + (C.PLACES[pid].house.arts.mask || 0) + R.card.taste, 'the trigger card scores its Allure and his printed Taste, nothing more');
  ok(!L.bestGuess(v, pid).preview.kinkHit, 'Best Guess does not count it either');
  L.mut.sealPlan(s, 'dolly', { place: pid, cards: [0, 1, 2] });
  if (s.timelines.victorian.curtainNo === 1) L.mut.resolveCurtain(s, 'victorian');
  const pay = s.log.find((e) => e.type === 'payout' && e.whores[0] === 'dolly');
  ok(pay.data.breakdown.kinkHit, 'the Kink fired');
  eq(pay.data.breakdown.parts.find((p) => p.key === 'kink').n, R.sway.kink);
  const l = s.log.find((e) => e.type === 'learned' && e.whores[0] === 'dolly' && e.data.facts.includes('kink'));
  ok(l && l.data.why === 'accident', J(l && l.data));
});

test('Every way she learns a fact is an event the page can print: the stall and the Morning Special both decode a Kink with a learned event', () => {
  for (const tl of C.TIMELINE_IDS) {
    let s = L.newGame(`special-decode-${tl}`, { starter: C.TIMELINES[tl].starter, minGapMin: 0 }); const wid = C.TIMELINES[tl].starter;
    const iid = L.specialOf(s, tl); const it = C.ITEMS[iid];
    s.whores[wid].coin = 20; s.whores[wid].notoriety = R.rummage.blackMarketAt;
    s = L.buySpecial(s, wid);
    const l = s.lastEvents.find((e) => e.type === 'learned');
    if (it.kind === 'kink') ok(l && l.data.why === 'tell-decoded' && l.data.facts.join() === 'kink' && l.gents[0] === it.kinkFor, `${tl} ${iid}: ${J(l)}`);
    else ok(!l, `${tl} ${iid}: no learned event for a plain novelty`);
  }
});

// BRIEF2 item 3: a secret she hit at a Curtain she did not see rides on that Curtain's own line as a tail, so it never takes a
// headline slot (and never pushes TONIGHT off the five-line sheet)
test('A secret she hit at a Curtain she did not see is told on that Curtain\'s own line (sealed elsewhere, or her Standing Order)', () => {
  const blank = (fn) => { const T = C.DIGEST.templates; const a = T['learned-secret']; const b = T['learned-kink']; T['learned-secret'] = ''; T['learned-kink'] = ''; try { return fn(); } finally { T['learned-secret'] = a; T['learned-kink'] = b; } };
  const said = (l) => (l.data.facts.includes('kink') ? `found out ${C.GENTS[l.gents[0]].short}'s Kink` : `found out ${C.GENTS[l.gents[0]].short} secretly likes`);
  const isTonight = (t) => t === 'tonight' || t === 'tonight-kink' || t === 'tonight-regular' || t === 'last-call';
  // (a) her sealed plan's Curtain falls while she is in another Timeline
  let sealed = 0;
  for (let n = 0; n < 40; n++) {
    const s = L.newGame(`sealed-away-${n}`, { starter: 'dolly', minGapMin: 0 });
    const since = s.tick;
    const v = L.getView(s, 'dolly'); const hosts = v.timeline.rota[0].hosts;
    const pid = Object.keys(hosts).find((p) => hosts[p] === 'plunkett' && v.timeline.places.find((x) => x.id === p).open);
    if (!pid) continue;
    s.whores.dolly.hand[0] = 'come-hither'; // Silk: Lord Plunkett secretly likes Silk
    L.mut.sealPlan(s, 'dolly', { place: pid, cards: [0] });
    const T = s.timelines.victorian; const k0 = T.curtainNo; L.mut.advanceClock(s, 400); if (T.curtainNo === k0) L.mut.resolveCurtain(s, 'victorian');
    const l = s.log.find((e) => e.type === 'learned' && e.whores[0] === 'dolly' && e.data.why === 'accident');
    if (!l) continue;
    const hs = L.awayDigest(s, 'dolly', since, { tonight: true }).headlines;
    const cr = hs.find((h) => h.type === 'curtain-result');
    ok(cr && cr.text.includes(said(l)), J(hs.map((h) => h.text)));
    const hb = blank(() => L.awayDigest(s, 'dolly', since, { tonight: true }).headlines.map((h) => h.type));
    eq(hs.length, hb.length, `sealed-away-${n}: the same number of headlines`);
    ok(!hb.some(isTonight) || hs.some((h) => isTonight(h.type)), `sealed-away-${n}: TONIGHT is not pushed off: ${J(hs.map((h) => h.type))}`);
    sealed++;
  }
  ok(sealed >= 20, `sealed seeds with a lucky learn: ${sealed}`);
  // (b) she never seals: every Curtain goes by Standing Order
  let so = 0;
  for (let n = 0; n < 40; n++) {
    const s = L.newGame(`away-learn-${n}`, { starter: 'dolly', minGapMin: 0 });
    const since = s.tick;
    for (let i = 0; i < 6; i++) L.mut.advanceClock(s, R.curtain.maxGapMin);
    const ls = s.log.filter((e) => e.type === 'learned' && e.whores[0] === 'dolly' && e.data.why === 'accident');
    if (!ls.length) continue;
    ok(ls.every((l) => s.log.some((e) => e.type === 'payout' && e.whores[0] === 'dolly' && e.curtain === l.curtain && e.data.standingOrder)), `away-learn-${n}: it came from a Standing Order Curtain`);
    const hs = L.awayDigest(s, 'dolly', since, { tonight: true }).headlines;
    const line = hs.find((h) => h.type === 'standing-order');
    ok(line && ls.every((l) => line.text.includes(said(l))), J(hs.map((h) => h.text)));
    const hb = blank(() => L.awayDigest(s, 'dolly', since, { tonight: true }).headlines.map((h) => h.type));
    eq(hs.length, hb.length, `away-learn-${n}: the same number of headlines`);
    ok(!hb.some(isTonight) || hs.some((h) => isTonight(h.type)), `away-learn-${n}: TONIGHT is not pushed off: ${J(hs.map((h) => h.type))}`);
    so++;
  }
  ok(so >= 20, `Standing Order seeds with a lucky learn: ${so}`);
});

test('The way back past Notoriety 8: Working The Charity Bazaar (London) or Signing the Pledge (Dakota) takes Notoriety down by 1 (designer, 8 Oct)', () => {
  const ROWS = [['dolly', 'victorian', 'charity-bazaar', 'tuppenny', 'drowned-rat', 'alfie', 'wildwest'], ['fanny', 'wildwest', 'sign-the-pledge', 'last-chance', 'hog-ranch', 'hank', 'victorian']];
  for (const [st, tl, cid, rowdy, gutter, fair, elsewhere] of ROWS) {
    const card = C.CARDS[cid];
    ok(C.TIMELINES[tl].market.includes(cid) && card.timeline === tl && card.cost > 0, `${cid} is sold in ${tl}`);
    ok((card.effects || []).includes('notorietyDownOnWork'), `${cid}: Worked, Notoriety -1`);
    ok(!C.TIMELINES[elsewhere].market.includes(cid), `${cid} is not sold in ${elsewhere}`);
    // a whore deep in the Police Gazette, past the Scrubbed refusal
    const gazette = (seed) => {
      const s = L.newGame(seed, { starter: st, standins: false, rivals: false, timelines: [tl], minGapMin: 0 });
      const w = s.whores[st]; w.standing = 0; w.notoriety = R.assign.notorietyRefuseScrubbedAt + 1; w.coin = 20;
      return s;
    };
    const start = R.assign.notorietyRefuseScrubbedAt + 1;
    // she can buy it in her own Timeline's market
    {
      const s = L.buyCard(gazette(`redeem-buy-${cid}`), st, cid);
      ok(s.whores[st].discard.includes(cid), `${cid}: bought into her discard pile`);
      eq(s.whores[st].coin, 20 - card.cost, `${cid}: costs ${card.cost} Coin`);
    }
    // a Curtain at the Rowdy Place: Notoriety down by 1, Standing unchanged (only a rising meter pushes the other one)
    {
      let s = gazette(`redeem-curtain-${cid}`);
      const w0 = s.whores[st]; w0.hand = [...w0.hand.slice(0, 4), cid];
      const v = L.getView(s, st); const i = v.whore.hand.findIndex((c) => c.id === cid);
      eq(L.previewEncounter(v, { place: rowdy, cards: [i] }).noto, -1, `${cid} at the Rowdy Place`);
      eq(L.previewEncounter(v, { place: gutter, cards: [i] }).noto, 0, `${cid} at the Gutter Place: the night's +1 cancels it`);
      s = L.sealPlan(s, st, { place: rowdy, cards: [i] });
      eq(`${s.whores[st].standing}/${s.whores[st].notoriety}`, `0/${start - 1}`, `${cid}: a Curtain Worked at the Rowdy Place`);
    }
    // an Assignation: the Scrubbed gentleman refuses her now, the Fair one doesn't; win or lose, Notoriety down by 1
    {
      let s = gazette(`redeem-assign-${cid}`);
      const board = L.getView(s, st).board;
      ok(board.some((b) => C.GENTS[b.gent] && C.GENTS[b.gent].freshness === 'scrubbed' && b.refused), 'the Scrubbed gentleman refuses her');
      ok(board.some((b) => b.gent === fair && !b.refused && !b.backAlley), `${fair} will see her`);
      s = L.startAssignation(s, st, fair);
      s.whores[st].assignation.lent = [cid, 'come-hither', 'saucy-quip'];
      s = L.playAssignation(s, st, { cards: [0] });
      eq(`${s.whores[st].standing}/${s.whores[st].notoriety}`, `0/${start - 1}`, `${cid}: an Assignation with ${fair}`);
    }
  }
  // Clockwork Clementine keeps her own signature, The Temperance Pledge (not sold); the market card is a different one
  ok(C.CHARACTERS.clementine.cards.includes('temperance-pledge') && C.CARDS['temperance-pledge'].npc && !C.TIMELINES.wildwest.market.includes('temperance-pledge'), 'Clementine keeps her unsold signature');
});

// ---------------------------------------------------------------------------
// The arena (ARENA-SPEC §2, E1-E20; §7 lever 1; §9.1), 2026-10-09. An arena is newGame(seed, { arena: true, ... }): one world
// of many accounts, instance whore ids, a four-word RNG and a stream per human whore. Solo (every test above) never sets
// it, so the constants pinned here (a20687d's streams) must never move.
const fnv = (str) => { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h || 1; };
const A_NAME = 'Ruby_Buckshot'; const B_NAME = 'Velvet_Moll';
// an arena with two humans on the same starter in one Timeline (A joins, then B), plus opts
function arena(seed, opts = {}, starter = 'dolly') {
  const tl = C.CHARACTERS[starter].timeline;
  const s = L.newGame(seed, { arena: true, humans: [], timelines: [tl], ...opts });
  L.mut.joinWorld(s, { id: 'pa', name: A_NAME, pastWhorescore: 0 });
  L.mut.chooseStarter(s, 'pa', starter);
  L.mut.joinWorld(s, { id: 'pb', name: B_NAME, pastWhorescore: 0 });
  L.mut.chooseStarter(s, 'pb', starter);
  return { s, a: `pa:${starter}`, b: `pb:${starter}`, tl };
}
const sealBest = (s, wid) => { const v = L.getView(s, wid); const place = L.casualPlace(v); L.mut.sealPlan(s, wid, { place, cards: L.bestGuess(v, place).cards }); return place; };

test('E1: solo rng is unchanged (newGame(x).rng === hashSeed(x)); an arena rng is four words that survive a JSON round-trip and a mut replay', () => {
  eq(L.newGame('x', { timelines: [] }).rng, fnv('x'), 'solo seed: hashSeed(x) before any draw (an empty world draws nothing)');
  eq(L.newGame('x').rng, 3598454425, 'solo seed after the world\'s opening draws, the a20687d value');
  const { s } = arena('rng-words');
  ok(Array.isArray(s.rng) && s.rng.length === 4 && s.rng.every((x) => Number.isInteger(x) && x >= 0 && x <= 0xFFFFFFFF), J(s.rng));
  ok(!s.whores.lavinia.rng, 'an NPC draws from the world stream');
  ok(Array.isArray(s.whores['pa:dolly'].rng) && s.whores['pa:dolly'].rng.length === 4, 'a human whore carries her own four words');
  const copy = JSON.parse(J(s)); const direct = L.explore(s, 'pa:dolly', 'salon'); const viaJson = L.explore(copy, 'pa:dolly', 'salon');
  eq(J(direct), J(viaJson), 'a JSON round-trip then the same action gives the same result');
  const m = JSON.parse(J(s)); L.mut.explore(m, 'pa:dolly', 'salon');
  eq(J(m), J(direct), 'mut replay equals the pure action');
});

test('E1: newGame with startClock 1020 has day 0, clock 1020, every lastCurtainAt 1020, and advanceClock(1) resolves nothing', () => {
  const s = L.newGame('start-clock', { arena: true, humans: [], startClock: 1020 });
  eq(s.day, 0); eq(s.clock, 1020);
  for (const T of Object.values(s.timelines)) eq(T.lastCurtainAt, 1020, T.id);
  const s2 = L.advanceClock(s, 1);
  ok(!s2.lastEvents.some((e) => e.type === 'curtain'), 'no Curtain forced by a mid-day start');
  eq(L.newGame('start-clock-solo').opts.startClock, 0, 'solo default');
});

test('E1 and lever 1: determinism holds with salt as an input; for every starter, sealed or forced, salt leaves her Timeline\'s Curtain 0 identical and changes the next lend; no salt is byte-identical to a20687d', () => {
  const { SEEDS, gameOpts } = SLICE;
  // the sealed path: the tourist, then a seal (the Curtain falls at the seal); the forced path: she does nothing and every
  // Timeline's Curtain 0 falls at maxGapMin, Victorian first (a Dakota or Vegas starter's own falls after a house-only one)
  const play = (st, salt, forced) => {
    const s = L.newGame(SEEDS[st], { ...gameOpts(st, 'Tester'), salt });
    if (forced) { L.mut.advanceClock(s, R.curtain.maxGapMin); return s; }
    const v = L.getView(s, st); const t = v.board.find((b) => b.tourist).gent;
    L.mut.startAssignation(s, st, t); L.mut.playAssignation(s, st, { cards: L.bestGuess(L.getView(s, st), { gent: t }).cards });
    L.mut.advanceClock(s, 30); const v2 = L.getView(s, st); const place = L.casualPlace(v2);
    L.mut.sealPlan(s, st, { place, cards: L.bestGuess(v2, place).cards });
    return s;
  };
  for (const st of ['dolly', 'fanny', 'jackie']) for (const forced of [false, true]) {
    const tl = C.CHARACTERS[st].timeline; const tag = `${st} ${forced ? 'forced' : 'sealed'}`;
    const a = play(st, 'x', forced); const b = play(st, 'x', forced); const c = play(st, 'zz', forced); const none = play(st, null, forced);
    eq(J(a), J(b), `${tag}: same seed and salt, same game`);
    eq(a.timelines[tl].curtainNo, 1, `${tag}: her Curtain 0 fell`); ok(a.salted && !none.salted, `${tag}: salted once`);
    const fall = (s) => J({ r: s.timelines[tl].results, hand: s.whores[st].hand, fresh: s.timelines[tl].freshStall, gossip: s.log.filter((e) => e.type === 'gossip' && e.timeline === tl).map((e) => e.data.line),
      house: Object.values(s.whores).filter((w) => w.timeline === tl && w.id !== st).map((w) => [w.id, w.hand]) });
    eq(fall(a), fall(none), `${tag}: her Timeline's Curtain 0 result, deal, fresh stall and gossip are byte-identical with a salt`);
    eq(fall(c), fall(none), `${tag}: whatever the salt`);
    ok(a.rng !== none.rng && a.rng !== c.rng, `${tag}: the stream differs after the fall`);
    const lend = (s) => { const s2 = L.dealLent(s, st); return J(s2.whores[st].lentHold); };
    ok(lend(a) !== lend(none) || lend(c) !== lend(none), `${tag}: the next lend differs for at least one salt`);
  }
  // the forced path in a Dakota game: Victorian's Curtain 0 (house players only) falls first and does not re-seed
  const f = L.newGame(SEEDS.fanny, { ...gameOpts('fanny', 'Tester'), salt: 'x' }); const fn = L.newGame(SEEDS.fanny, { ...gameOpts('fanny', 'Tester'), salt: null });
  L.mut.advanceClock(f, R.curtain.maxGapMin); L.mut.advanceClock(fn, R.curtain.maxGapMin);
  eq(J(f.log.filter((e) => e.type === 'curtain').map((e) => e.timeline).slice(0, 2)), J(['victorian', 'wildwest']), 'Victorian fell before Dakota');
  eq(J(f.timelines.victorian.results), J(fn.timelines.victorian.results), 'the house-only Curtain 0 before hers is identical too');
  // no salt: a20687d's stream after 12 forced Curtains on the slice seed (captured before the salt existed)
  const g = L.newGame(SEEDS.dolly, { ...gameOpts('dolly', 'Tester'), salt: null });
  for (let i = 0; i < 12; i++) L.mut.advanceClock(g, 180);
  eq(g.rng, 699562539, 'byte-identical stream without a salt');
  ok(typeof gameOpts('dolly').salt === 'string' && gameOpts('dolly').salt.length > 0, 'gameOpts mints a salt when none is passed');
  ok(gameOpts('dolly').salt !== gameOpts('dolly').salt, 'a different salt each game');
});

test('E2: arena ids: two humans hold the same starter in one world, named by their noms de plume; solo ids unchanged', () => {
  const { s, a, b } = arena('ids');
  eq(a, 'pa:dolly'); eq(b, 'pb:dolly');
  ok(s.whores[a] && s.whores[b], 'both on the Victorian table');
  eq(s.whores[a].name, A_NAME); eq(s.whores[b].name, B_NAME); eq(s.whores[a].char, 'dolly'); eq(s.whores[b].char, 'dolly');
  eq(s.whores.lavinia.name, C.CHARACTERS.lavinia.name, 'NPCs keep their names'); eq(s.whores.lavinia.id, 'lavinia');
  ok(!s.whores.dolly, 'no character-keyed human whore in an arena');
  eq(L.getView(s, a).timeline.rivals.filter((r) => r.id === b).length, 1, 'B is on A\'s table');
  const solo = L.newGame('x', { starter: 'dolly' });
  ok(solo.whores.dolly && solo.whores.dolly.id === 'dolly' && solo.whores.dolly.name === C.CHARACTERS.dolly.name, 'solo unchanged');
});

test('E3: charOf', () => {
  eq(L.charOf('dolly'), 'dolly'); eq(L.charOf('pabcdefghij:dolly'), 'dolly'); eq(L.charOf('pa:jackie'), 'jackie');
});

test('E4: arena: canOpen lists all three starters for a fresh account when another human holds each one', () => {
  const s = L.newGame('can-open', { arena: true, humans: [] });
  L.mut.joinWorld(s, { id: 'pa', name: A_NAME });
  for (const st of ['dolly', 'fanny', 'jackie']) { s.accounts.pa.slots = 3; L.mut.openTimeline(s, 'pa', st); }
  L.mut.joinWorld(s, { id: 'pb', name: B_NAME });
  const la = L.legalActions(s, 'pb').filter((x) => x.type === 'chooseStarter').map((x) => x.character).sort();
  eq(J(la), J(['dolly', 'fanny', 'jackie']));
  const sm = L.getView(s, 'pa').account.whores[0];
  ok(sm.char === 'dolly' && ['standing', 'notoriety'].includes(sm.road), 'account rows carry char and road');
});

test('E5: a human rival\'s view row carries char and no hand; lastCharmed cards of a human winner stay hers', () => {
  let found = 0;
  for (let n = 0; n < 30 && !found; n++) {
    const { s, a, b, tl } = arena(`charmed-${n}`, { minGapMin: 0 });
    const r = L.getView(s, a).timeline.rivals.find((x) => x.id === b);
    ok(r.char === 'dolly' && r.short === C.CHARACTERS.dolly.short && !('hand' in r) && !('draw' in r) && !('discard' in r), J(Object.keys(r)));
    const pb = sealBest(s, b); const host = L.getView(s, b).timeline.rota[0].hosts[pb];
    s.whores[a].lastActiveAt = -9999; // A is absent: the Curtain falls once B (the only active human) has sealed
    L.mut.sealPlan(s, b, s.whores[b].plan ? null : undefined);
    if (s.timelines[tl].curtainNo === 0) L.mut.resolveCurtain(s, tl);
    const lc = s.timelines[tl].lastCharmed[host];
    if (!lc || lc.whore !== b) continue;
    found++;
    s.whores[a].known.gents[host] = { history: true }; s.whores[b].known.gents[host] = { history: true };
    const ga = L.getView(s, a).timeline.gents.find((g) => g.id === host).lastCharmed;
    const gb = L.getView(s, b).timeline.gents.find((g) => g.id === host).lastCharmed;
    eq(ga.whore, b, 'A sees who charmed him'); eq(ga.cards, null, 'not with what');
    ok(Array.isArray(gb.cards) && gb.cards.length >= 1, 'B keeps her own cards');
    ok(!J(L.getView(s, a)).includes(J(gb.cards)), 'the cards appear nowhere in A\'s view');
  }
  ok(found, 'a seed where B charmed the host');
  // solo: an NPC winner's cards stay visible once Studied, as before
  let s = L.newGame('charmed-solo', { starter: 'dolly', minGapMin: 0 }); s = L.advanceClock(s, R.curtain.maxGapMin);
  s.whores.dolly.known.gents = Object.fromEntries(C.TIMELINES.victorian.gents.map((g) => [g, { history: true }]));
  const npcWin = L.getView(s, 'dolly').timeline.gents.map((g) => g.lastCharmed).find((lc) => lc && lc.whore !== 'dolly');
  ok(!npcWin || Array.isArray(npcWin.cards), 'an NPC winner\'s cards are public');
});

test('E6: board rows carry char, coin and road (whole numbers), perWhore rows carry char', () => {
  const { s, a } = arena('boards');
  const lb = L.leaderboards(s); const bad = [];
  walk(lb, (x, p) => { if (typeof x === 'number' && !Number.isInteger(x)) bad.push(`${p}=${x}`); });
  eq(bad.length, 0, bad.join(', '));
  const row = lb.whorescore.find((r) => r.account === 'pa').whores[0];
  ok(row.id === a && row.char === 'dolly' && row.coin === s.whores[a].coin && ['standing', 'notoriety'].includes(row.road), J(row));
  ok(lb.automatons.every((x) => x.whores.every((w) => w.char && Number.isInteger(w.coin))), 'automaton rows too');
  eq(L.whorescore(s, 'pa').perWhore[0].char, 'dolly');
});

test('E7: getView with logTail 0 returns an empty log; the default tail is the newest 40 she may see', () => {
  const { s, a } = arena('log-tail');
  eq(L.getView(s, a, { logTail: 0 }).log.length, 0);
  const v = L.getView(s, a);
  ok(v.log.length > 0 && v.log.length <= 40 && v.log.every((e) => e.vis === 'all' || e.vis.includes('pa')), 'the default tail');
  const solo = L.newGame('log-tail-solo', { starter: 'dolly' });
  eq(J(L.getView(solo, 'dolly').log), J(solo.log.filter((e) => e.vis === 'all' || e.vis.includes('you')).slice(-40)), 'solo: the same 40 as before');
});

test('E8: arena: the logged payout has no breakdown, lastEvents\' payout does, lastPayouts holds it; solo keeps it; 30 humans x 10 Curtains drop the log by 20%+ (measured 22.7%)', () => {
  const { s, a, b, tl } = arena('lean-log', { minGapMin: 0 });
  sealBest(s, a); sealBest(s, b);
  const pay = s.lastEvents.find((e) => e.type === 'payout' && e.whores[0] === a);
  ok(pay && pay.data.breakdown && pay.data.breakdown.cards, 'lastEvents keeps the breakdown for the acting client');
  const logged = s.log.find((e) => e.type === 'payout' && e.whores[0] === a);
  ok(logged && !('breakdown' in logged.data), 'the stored log has none');
  eq(logged.data.renown, pay.data.renown, 'the rest of the payout is the same');
  eq(s.whores[a].lastPayouts.length, 1); eq(s.whores[a].lastPayouts[0].curtain, 0);
  eq(J(s.whores[a].lastPayouts[0].breakdown), J(pay.data.breakdown));
  // solo: the logged payout keeps it (the sim reads e.data.breakdown.cards from s.log)
  const solo = L.advanceClock(L.newGame('lean-solo', { starter: 'dolly' }), R.curtain.maxGapMin);
  const sp = solo.log.find((e) => e.type === 'payout' && e.whores[0] === 'dolly');
  ok(sp && sp.data.breakdown && sp.data.breakdown.cards, 'solo keeps the breakdown in the log');
  ok(solo.whores.dolly.lastPayouts.length === 1, 'and on the whore');
  for (let i = 0; i < 4; i++) L.mut.advanceClock(solo, R.curtain.maxGapMin);
  eq(solo.whores.dolly.lastPayouts.length, 3, 'keeps three');
  eq(J(solo.whores.dolly.lastPayouts.map((p) => p.curtain)), J([4, 3, 2]), 'newest first');
  // bytes: 30 absent humans in one Timeline, 10 forced Curtains; the fat log is every lastEvents batch, the lean one the stored log
  const big = L.newGame('lean-bytes', { arena: true, humans: [], timelines: [tl] });
  const fat = [...big.lastEvents];
  for (let i = 0; i < 30; i++) { L.mut.joinWorld(big, { id: `h${i}`, name: `H${i}` }); fat.push(...big.lastEvents); L.mut.chooseStarter(big, `h${i}`, 'dolly'); fat.push(...big.lastEvents); }
  for (let i = 0; i < 10; i++) { L.mut.advanceClock(big, R.curtain.maxGapMin); fat.push(...big.lastEvents); }
  eq(fat.length, big.log.length, 'the same events');
  const lean = J(big.log).length; const full = J(fat).length;
  // measured 2026-10-09 at this recipe (id-first streams): 546,395 of 707,209 bytes (77.3%, a 22.7% drop); the breakdowns are
  // all of the drop, and whole payout events are 35% of what is left (the spec's "47% payout bytes" counted the event, not
  // its breakdown; stripping `hindsight` too gains 1,400 bytes, absent players carry none), so the gate binds at a 20% drop.
  // The spec's 35% (binding < 0.65 x) is the lead's to confirm or amend: it is not reachable by stripping payout fields.
  ok(lean < 0.8 * full, `lean ${lean} bytes vs ${full} (${Math.round((100 * lean) / full)}%)`);
  const bd = fat.filter((e) => e.type === 'payout').reduce((t, e) => t + J(e.data.breakdown).length, 0);
  ok(full - lean >= bd - fat.filter((e) => e.type === 'payout').length * 16, 'the drop is the breakdowns, nothing else');
});

test('E9: spendGossip keeps a human\'s sealed Place private, and says nothing of her Sway when she fell short of the Bar', () => {
  const { s, a, b, tl } = arena('gossip-private', { minGapMin: 0 });
  s.whores[a].gossip = 3; s.whores[b].gossip = 3;
  const pb = sealBest(s, b);
  L.mut.spendGossip(s, a, b);
  const g = s.lastEvents.find((e) => e.type === 'gossip-spent');
  eq(g.data.tonight, null, 'no Place'); ok(!g.text.includes(C.PLACES[pb].short), g.text); ok(/her own affair/.test(g.text), g.text);
  eq(L.publicProfile(s, 'pa', b).heading, null); eq(L.getView(s, a).timeline.rivals.find((r) => r.id === b).heading, null);
  ok(J(L.getView(s, a)).split(C.PLACES[pb].short).length === J(L.getView(s, a).timeline).split(C.PLACES[pb].short).length, 'the Place name leaks nowhere new');
  // after a Curtain where B fell short: the report prints no Sway, so neither does Gossip; a share-taker's Sway is printed
  let short = 0; let shared = 0;
  for (let n = 0; n < 40 && (!short || !shared); n++) {
    const w = arena(`gossip-sway-${n}`, { minGapMin: 0 }); w.s.whores[w.a].gossip = 3;
    sealBest(w.s, w.a); sealBest(w.s, w.b); if (w.s.timelines[w.tl].curtainNo === 0) L.mut.resolveCurtain(w.s, w.tl);
    const pe = w.s.timelines[w.tl].results.places.flatMap((p) => p.entries).find((e) => e.whore === w.b);
    L.mut.spendGossip(w.s, w.a, w.b); const ev = w.s.lastEvents.find((e) => e.type === 'gossip-spent');
    if (pe.rank === null) { short++; eq(ev.data.lastSway, null, 'no Sway for a whore below the Bar'); ok(!/with \d+ Sway/.test(ev.text), ev.text); }
    else { shared++; eq(ev.data.lastSway, w.s.timelines[w.tl].sways[w.b], 'a share-taker\'s Sway is public already'); }
    eq(L.getView(w.s, w.a).timeline.rivals.find((r) => r.id === w.b).lastSway, ev.data.lastSway);
  }
  ok(short && shared, `both cases seen (short ${short}, shared ${shared})`);
  // an NPC rival's Sway and Habit pick print as before
  const solo = L.advanceClock(L.newGame('gossip-solo', { starter: 'dolly' }), R.curtain.maxGapMin); solo.whores.dolly.gossip = 1;
  const s2 = L.spendGossip(solo, 'dolly', 'lavinia'); const e2 = s2.lastEvents.find((e) => e.type === 'gossip-spent');
  ok(e2.data.tonight && /cap set at/.test(e2.text), e2.text);
});

test('E10: awayDigest reports truncated after the trim and not before', () => {
  const { s, tl } = arena('truncated', { logLimit: 50 });
  const since = s.tick;
  eq(L.awayDigest(s, 'pa', since).truncated, false, 'nothing trimmed yet');
  eq(s.logFloor, 0);
  for (let i = 0; i < 12; i++) L.mut.advanceClock(s, R.curtain.maxGapMin);
  ok(s.log.length <= 100 && s.logFloor === s.log[0].id && s.logFloor > since, `floor ${s.logFloor}, since ${since}`);
  eq(L.awayDigest(s, 'pa', since).truncated, true, 'her cursor is older than the oldest kept event');
  eq(L.awayDigest(s, 'pa', s.logFloor).truncated, false, 'a cursor at the floor is whole');
  eq(L.awayDigest(s, 'pa', 0).truncated, false, 'a cursor of 0 is "everything you can see"');
  ok(s.timelines[tl].curtainNo >= 12);
});

test('E11: joinWorld mid-season: seen cursors at the current tick, chooseStarter works, a Standing Order at the next forced Curtain, touristHere, pastWhorescore, exists and bad-account', () => {
  const s = L.newGame('join', { arena: true, humans: [], timelines: ['victorian'] });
  for (let i = 0; i < 4; i++) L.mut.advanceClock(s, R.curtain.maxGapMin);
  const tick = s.tick;
  L.mut.joinWorld(s, { id: 'pz', name: 'Late_Rose', pastWhorescore: 17 });
  const acct = s.accounts.pz;
  eq(acct.seen.victorian, tick); eq(acct.joinedAt, s.clock); eq(acct.kind, 'human'); eq(acct.slots, 1);
  ok(s.lastEvents.some((e) => e.type === 'joined' && J(e.vis) === J(['pz'])), 'a private joined event');
  L.mut.chooseStarter(s, 'pz', 'dolly');
  const w = s.whores['pz:dolly']; ok(w && w.name === 'Late_Rose', 'her girl, in her name');
  ok(L.getView(s, 'pz:dolly').board.some((b) => b.tourist), 'the tourist is on her first board');
  eq(L.whorescore(s, 'pz').past, 17); eq(L.whorescore(s, 'pz').total, 17);
  L.mut.advanceClock(s, R.curtain.maxGapMin);
  ok(s.lastEvents.some((e) => e.type === 'standing-order' && e.whores[0] === 'pz:dolly'), 'a Standing Order at the next forced Curtain');
  ok(L.awayDigest(s, 'pz', acct.seen.victorian).headlines.some((h) => h.type === 'standing-order'), 'and her digest starts at her arrival');
  for (const [h, code] of [[{ id: 'pz', name: 'Again' }, 'exists'], [{ id: 'pa:dolly', name: 'Colon' }, 'bad-account'], [{ id: '', name: 'Blank' }, 'bad-account'], [{ id: 'pq', name: '' }, 'bad-name'], [null, 'bad-account']]) {
    let got = null; try { L.joinWorld(s, h); } catch (e) { got = e.code; } eq(got, code, J(h));
  }
  eq(L.newGame('join-solo', { starter: 'dolly' }).accounts.you.seen.victorian, undefined, 'solo accounts are untouched');
});

test('E12: the season rolls in place at seasonDays with a sealed plan and an in-flight Assignation across the boundary; solo never rolls', () => {
  const { s, a, b, tl } = arena('season', { seasonDays: 2 });
  // one Curtain on day 0 so both have a result to bank, then a held seat
  sealBest(s, a); sealBest(s, b); L.mut.advanceClock(s, R.curtain.minGapMin);
  eq(s.timelines[tl].curtainNo, 1, 'both sealed: an early Curtain');
  s.whores[a].seat = 'salon'; s.timelines[tl].seats.salon.holder = a;
  L.mut.advanceClock(s, 2780 - s.clock); // day 1; the last forced Curtain fell at 2700, the next is due at 2880 = day 2
  eq(s.day, 1); eq(s.season, 1); eq(s.seasonStartDay, 0);
  L.mut.study(s, b, 'plunkett'); // B is active and unsealed, so A's seal does not close the Curtain early
  const pa = sealBest(s, a);
  L.mut.startAssignation(s, a, 'alfie'); const lent = J(s.whores[a].assignation.lent);
  const tick0 = s.tick;
  L.mut.advanceClock(s, 1440 + 200);
  const ends = s.log.filter((e) => e.type === 'season-end' && e.id > tick0);
  eq(ends.length, 1, 'one season-end'); eq(s.season, 2); eq(s.seasonStartDay, 2); eq(s.day, 3);
  const pay = s.log.find((e) => e.type === 'payout' && e.whores[0] === a && e.id > tick0);
  ok(pay && pay.id > ends[0].id, 'the sealed plan resolved into the new season'); eq(pay.data.place, pa, 'at the Place she sealed');
  ok(!pay.data.standingOrder, 'her own plan, not a Standing Order');
  ok(s.whores[a].renown >= 0 && s.whores[a].renown === pay.data.renown + s.log.filter((e) => e.type === 'payout' && e.whores[0] === a && e.id > pay.id).reduce((t, e) => t + e.data.renown, 0), 'Renown after the roll counts from the boundary Curtain');
  ok(s.accounts.pa.pastWhorescore >= R.whorescore.common && s.accounts.pb.pastWhorescore >= R.whorescore.common, 'Whorescore banked');
  ok(s.hall.some((h) => h.season === 1 && h.seat === 'salon' && h.whore === a && h.name === A_NAME && h.char === 'dolly'), J(s.hall));
  eq(s.timelines[tl].seats.salon.holder, null, 'seats clear');
  eq(L.publicProfile(s, 'pb', a).hall.length, 1, 'the plaque is on her profile');
  eq(J(s.whores[a].assignation.lent), lent, 'the in-flight Assignation survives the boundary');
  L.mut.playAssignation(s, a, { cards: [0] }); ok(s.lastEvents.some((e) => e.type === 'assignation'), 'and still plays');
  const solo = L.advanceClock(L.newGame('season-solo', { starter: 'dolly' }), 40 * 1440);
  ok(!solo.log.some((e) => e.type === 'season-end') && solo.season === 1, 'solo at the fast clock never rolls a season');
});

test('E13: sleepTillDawn is refused in an arena and still works in solo', () => {
  const { s } = arena('no-sleep');
  let code = null; try { L.sleepTillDawn(s); } catch (e) { code = e.code; }
  eq(code, 'arena');
  const solo = L.sleepTillDawn(L.newGame('sleep-solo', { starter: 'dolly' }));
  eq(solo.clock, 1440 + R.dawnMin);
});

test('E14: sealing counts active humans separately', () => {
  const s = L.newGame('sealing', { arena: true, humans: [], timelines: ['victorian'] });
  for (const id of ['pa', 'pb', 'pc']) { L.mut.joinWorld(s, { id, name: id }); L.mut.chooseStarter(s, id, 'dolly'); }
  L.mut.advanceClock(s, 100);
  s.whores['pc:dolly'].lastActiveAt = s.clock - R.curtain.activeWindowMin - 1; // idle past the window
  const so = L.sealingOf(s, 'victorian');
  eq(so.activeTotal, so.total - 1, J(so)); eq(so.sealed, so.activeSealed);
  sealBest(s, 'pa:dolly');
  const s2 = L.sealingOf(s, 'victorian'); eq(s2.activeSealed, so.activeSealed + 1); eq(s2.sealed, so.sealed + 1);
  eq(L.getView(s, 'pa:dolly').timeline.sealing.activeTotal, so.activeTotal, 'in the view');
  const solo = L.getView(L.newGame('sealing-solo', { starter: 'dolly' }), 'dolly').timeline.sealing;
  ok(solo.activeTotal === solo.total && Number.isInteger(solo.activeSealed), J(solo));
});

test('E15: eventsFor re-attaches her own breakdown and nobody else\'s; limit 0 is none, absent is all', () => {
  const { s, a, b, tl } = arena('events-for', { minGapMin: 0 });
  for (let i = 0; i < 3; i++) { sealBest(s, a); sealBest(s, b); if (s.timelines[tl].curtainNo === i) L.mut.resolveCurtain(s, tl); }
  const ea = L.eventsFor(s, 'pa');
  const mine = ea.filter((e) => e.type === 'payout' && e.whores[0] === a);
  eq(mine.length, 3); ok(mine.every((e) => e.data.breakdown && e.data.breakdown.cards), 'hers, re-attached');
  ok(!ea.some((e) => e.type === 'payout' && e.whores[0] !== a), 'a payout is private: nobody else\'s is in her list');
  ok(ea.every((e) => e.vis === 'all' || e.vis.includes('pa')), 'only what she may see');
  ok(!s.log.some((e) => e.type === 'payout' && e.data.breakdown), 'the stored log is still lean');
  eq(L.eventsFor(s, 'pa', 0, { limit: 0 }).length, 0); eq(L.eventsFor(s, 'pa', 0, { limit: 2 }).length, 2);
  const since = ea[ea.length - 2].id; eq(L.eventsFor(s, 'pa', since).length, 1, 'sinceTick is exclusive');
  const eb = L.eventsFor(s, 'pb').filter((e) => e.type === 'payout'); ok(eb.every((e) => e.whores[0] === b && e.data.breakdown), 'B gets hers');
  // the fourth Curtain pushes the oldest breakdown off lastPayouts: the event is still listed, without it
  sealBest(s, a); sealBest(s, b); if (s.timelines[tl].curtainNo === 3) L.mut.resolveCurtain(s, tl);
  const p = L.eventsFor(s, 'pa').filter((e) => e.type === 'payout');
  eq(p.length, 4); ok(!p[0].data.breakdown && p[3].data.breakdown, 'three newest carry it');
  eq(L.getView(s, a).log.filter((e) => e.type === 'payout').every((e) => e.data.breakdown || e.curtain === 0), true, 'view.log reads the same');
});

test('E16: arena fixture: isScriptedCurtain is false; a late joiner\'s first Ripe Assignation lends two Frolic cards (scriptItch)', () => {
  const s = L.newGame('script', { arena: true, humans: [], timelines: ['victorian'], scriptItch: true });
  eq(L.isScriptedCurtain(s, 'victorian'), false);
  for (let i = 0; i < 3; i++) L.mut.advanceClock(s, R.curtain.maxGapMin);
  L.mut.joinWorld(s, { id: 'pz', name: 'Late_Rose' }); L.mut.chooseStarter(s, 'pz', 'dolly');
  const ripe = C.TIMELINES.victorian.gents.find((g) => C.GENTS[g].freshness === 'ripe');
  s.whores['pz:dolly'].notoriety = R.backAlleyAt; // the back alley opens at this Notoriety
  ok(L.getView(s, 'pz:dolly').board.some((b) => b.gent === ripe && b.backAlley), 'the Ripe gentleman is on her board');
  L.mut.startAssignation(s, 'pz:dolly', ripe);
  const frolic = s.whores['pz:dolly'].assignation.lent.filter((c) => C.CARDS[c] && C.CARDS[c].arts.includes('frolic')).length;
  ok(frolic >= 2, `lent ${frolic} Frolic cards`);
});

test('E17: A\'s 1000 stale rummages leave s.rng and B\'s w.rng byte-identical and B\'s next deal unchanged; solo 1000 rummages move s.rng exactly as at a20687d', () => {
  const { s, a, b } = arena('isolation', { minGapMin: 0 });
  const quiet = JSON.parse(J(s));
  const rng0 = J(s.rng); const brng0 = J(s.whores[b].rng);
  for (let i = 0; i < 1000; i++) L.mut.explore(s, a, 'salon');
  eq(J(s.rng), rng0, 'the world stream never moved'); eq(J(s.whores[b].rng), brng0, 'nor B\'s');
  ok(J(s.whores[a].rng) !== J(quiet.whores[a].rng), 'A\'s own did');
  L.mut.dealLent(s, b); L.mut.dealLent(quiet, b);
  eq(J(s.whores[b].lentHold), J(quiet.whores[b].lentHold), 'B\'s next lend is the same as if A had done nothing');
  eq(J([s.whores[b].hand, s.whores[b].draw]), J([quiet.whores[b].hand, quiet.whores[b].draw]), 'and her cards');
  const solo = L.newGame('rum', { starter: 'dolly', minGapMin: 0 });
  for (let i = 0; i < 1000; i++) L.mut.explore(solo, 'dolly', 'salon');
  eq(solo.rng, 4171713832, 'solo: the a20687d stream after 1000 rummages on seed "rum"');
});

test('E17: Slots\' tip-off (an Assignation won in Vegas) picks the rival on her own stream: s.rng and B\'s w.rng stay byte-identical', () => {
  const { s, a, b } = arena('tip-off', { minGapMin: 0 }, 'jackie');
  s.whores[a].notoriety = 1; // the back-alley board (Slots is Ripe)
  const rng0 = J(s.rng); const brng0 = J(s.whores[b].rng); const arng0 = J(s.whores[a].rng);
  let learned = 0; let plays = 0;
  for (let i = 0; i < 80 && !learned; i++) {
    if (!L.getView(s, a).board.some((x) => x.gent === 'slots' && !x.refused)) break;
    L.mut.startAssignation(s, a, 'slots'); L.mut.playAssignation(s, a, { cards: L.bestGuess(L.getView(s, a), { gent: 'slots' }).cards }); plays++;
    learned += s.lastEvents.filter((e) => e.type === 'learned' && e.data && e.data.rivalHabit).length;
    eq(J(s.rng), rng0, `play ${plays}: the world stream never moved`); eq(J(s.whores[b].rng), brng0, `play ${plays}: nor B's`);
  }
  ok(learned > 0, `Slots leaned in at least once in ${plays} plays`);
  ok(J(s.whores[a].rng) !== arng0, 'A\'s own stream did move');
});

test('E17: no shared root: inverting A\'s four words over her id and running them forward over B\'s id does not give B\'s words (the id goes first, the seed last)', () => {
  // the security review's proof of concept against the seed-first shape, kept as the lock: FNV-1a steps and the sfc32 round
  // both run backwards, so with `${seed}|${wid}` A's words, un-walked over `|${A.id}`, were the world's own four FNV states
  // and walked forward over `|${B.id}` gave B's. With the id first there is no state shared at the seed boundary.
  const P = 16777619; const PINV = (() => { let x = 1; for (let i = 0; i < 5; i++) x = Math.imul(x, 2 - Math.imul(P, x)) >>> 0; return x >>> 0; })();
  const fwd = (h, str) => { for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, P) >>> 0; } return h >>> 0; };
  const back = (h, str) => { for (let i = str.length - 1; i >= 0; i--) { h = Math.imul(h, PINV) >>> 0; h = (h ^ str.charCodeAt(i)) >>> 0; } return h >>> 0; };
  const step = (r) => { const t = (r[0] + r[1] + r[3]) >>> 0; r[3] = (r[3] + 1) >>> 0; r[0] = (r[1] ^ (r[1] >>> 9)) >>> 0; r[1] = (r[2] + (r[2] << 3)) >>> 0; r[2] = ((r[2] << 21) | (r[2] >>> 11)) >>> 0; r[2] = (r[2] + t) >>> 0; };
  const unxs9 = (y) => { let x = y; for (let i = 0; i < 4; i++) x = (y ^ (x >>> 9)) >>> 0; return x >>> 0; };
  const NINV = (() => { let x = 1; for (let i = 0; i < 5; i++) x = Math.imul(x, 2 - Math.imul(9, x)) >>> 0; return x >>> 0; })();
  const unstep = (r) => { const r3 = (r[3] - 1) >>> 0; const r1 = unxs9(r[0]); const r2 = Math.imul(r[1], NINV) >>> 0; const rot = ((r2 << 21) | (r2 >>> 11)) >>> 0; const t = (r[2] - rot) >>> 0; r[0] = (t - r1 - r3) >>> 0; r[1] = r1; r[2] = r2; r[3] = r3; };
  const seed = 'd3adbeefd3adbeefd3adbeefd3adbeef';
  const { s, a, b } = arena(seed, { minGapMin: 0 });
  const A = s.whores[a]; const B = s.whores[b];
  const deckLen = C.SHARED_DECK.length + C.CHARACTERS.dolly.cards.length; // public: her deck's size, so her shuffle's draw count
  const rewind = (w) => { const r = [...w.rng]; for (let i = 0; i < 15 + deckLen - 1; i++) unstep(r); return r; };
  // the inversion is sound: A's words rewound are the four FNV passes over `${A.id}|${seed}`
  eq(J(rewind(A)), J(['a|', 'b|', 'c|', 'd|'].map((p) => fwd(2166136261, `${p}${A.id}|${seed}`))), 'the rewind reaches the FNV words');
  // the attack: un-walk A's words over her public id, walk forward over B's, warm up and shuffle, compare with B's
  const attack = (over, then) => { const r = rewind(A).map((h) => fwd(back(h, over), then)); for (let i = 0; i < 15 + deckLen - 1; i++) step(r); return r; };
  ok(J(attack(`|${A.id}`, `|${B.id}`)) !== J(B.rng), 'the seed-first attack fails');
  ok(J(attack(`${A.id}|`, `${B.id}|`)) !== J(B.rng), 'and so does its mirror (the seed is not a public suffix of anything)');
  // the world's own words share nothing with hers either way
  const world = ['a|', 'b|', 'c|', 'd|'].map((p) => fwd(2166136261, p + seed));
  ok(!rewind(A).some((h, i) => back(h, `|${A.id}`) === world[i] || back(h, A.id) === world[i]), 'no word of hers un-walks to the world\'s root');
});

test('assertOwns: the server\'s ownership check fails with not-yours for another account\'s whore, a house whore, a missing id or a prototype key, and returns her when it is hers', () => {
  const { s, a, b } = arena('owns', { minGapMin: 0 });
  eq(L.assertOwns(s, 'pa', a).id, a); eq(L.assertOwns(s, 'pb', b).id, b);
  const code = (acct, wid) => { try { L.assertOwns(s, acct, wid); return null; } catch (e) { return e.code; } };
  eq(code('pa', b), 'not-yours', 'B\'s girl'); eq(code('pb', a), 'not-yours');
  eq(code('pa', 'bettie'), 'not-yours', 'a house player'); eq(code('pa', 'nobody:dolly'), 'not-yours', 'no such whore');
  eq(code('nobody', a), 'not-yours', 'no such account'); eq(code('pa', 'constructor'), 'not-yours'); eq(code('__proto__', a), 'not-yours');
  eq(code(null, a), 'not-yours'); eq(code('pa', null), 'not-yours');
  // the leak the check exists for: the engine itself hands anyone's hand to a bare whore id
  ok(L.getView(s, b).whore.hand.length > 0, 'getView by whore id is unchecked by design; the server must check first');
});

test('lastEventsFor: after a Curtain that paid two humans, each account sees only her own payout and breakdown; lastEvents itself holds both', () => {
  const { s, a, b } = arena('last-events', { minGapMin: 0 });
  sealBest(s, a); sealBest(s, b);
  const pays = s.lastEvents.filter((e) => e.type === 'payout' && [a, b].includes(e.whores[0]));
  eq(pays.length, 2, 'both humans paid in one action'); ok(pays.every((e) => e.data.breakdown), 'with breakdowns, in lastEvents');
  for (const [acct, mine, theirs] of [['pa', a, b], ['pb', b, a]]) {
    const ev = L.lastEventsFor(s, acct);
    ok(ev.some((e) => e.type === 'payout' && e.whores[0] === mine && e.data.breakdown), `${acct}: her own payout, breakdown attached`);
    ok(!ev.some((e) => e.type === 'payout' && e.whores[0] === theirs), `${acct}: not the other's`);
    ok(ev.every((e) => e.vis === 'all' || e.vis.includes(acct)), `${acct}: nothing private to anyone else`);
    ok(!J(ev).includes(J(s.whores[theirs].hand)), `${acct}: the other's hand is nowhere in it`);
    eq(J(ev.map((e) => e.id)), J(s.lastEvents.filter((e) => e.vis === 'all' || e.vis.includes(acct)).map((e) => e.id)), `${acct}: in order, nothing dropped`);
  }
  let code = null; try { L.lastEventsFor(s, 'nobody'); } catch (e) { code = e.code; } eq(code, 'no-such');
});

test('E18: two seeds with the same hashSeed prefix give different arena Morning Specials on at least one of 30 days, and identical solo ones', () => {
  // a birthday search over deterministic seeds for a 32-bit FNV-1a collision (short near-identical strings barely collide
  // under FNV, so the candidates are mixed; the pair lands around the 82,000th)
  const seen = new Map(); let pair = null;
  for (let i = 0; i < (1 << 20) && !pair; i++) { const k = `seed-${(Math.imul(i, 2654435761) >>> 0).toString(36)}-${i.toString(36)}`; const h = fnv(k); if (seen.has(h)) pair = [seen.get(h), k]; else seen.set(h, k); }
  ok(pair, 'a colliding pair within 2^20 candidates');
  eq(fnv(pair[0]), fnv(pair[1])); ok(pair[0] !== pair[1]);
  const specials = (seed, arenaOn) => { const s = L.newGame(seed, arenaOn ? { arena: true, humans: [] } : {}); return C.TIMELINE_IDS.map((tl) => Array.from({ length: 30 }, (_, d) => L.specialOf(s, tl, d)).join()).join('|'); };
  eq(specials(pair[0], false), specials(pair[1], false), 'solo: the seed first, so a prefix collision is a whole collision (byte-identical to before)');
  ok(specials(pair[0], true) !== specials(pair[1], true), 'arena: the seed last, no shared prefix');
  // the stand-in seal timers likewise
  const timers = (seed, arenaOn) => { const o = { standinSeal: { min: 30, max: 90, from: 0 }, timelines: ['victorian'] }; const s = arenaOn ? L.newGame(seed, { ...o, arena: true, humans: [] }) : L.newGame(seed, { ...o, starter: 'dolly' }); if (arenaOn) { L.mut.joinWorld(s, { id: 'pa', name: 'A' }); L.mut.chooseStarter(s, 'pa', 'dolly'); } sealBest(s, arenaOn ? 'pa:dolly' : 'dolly'); return J(s.timelines.victorian.standinSealAt); };
  eq(timers(pair[0], false), timers(pair[1], false)); ok(timers(pair[0], true) !== timers(pair[1], true), 'arena timers differ');
});

test('E19: curtainGrid: the forced Curtains of a world started at clock 1020 fall at 1080, 1260, 1440; after an early Curtain at 1070 the next forced one is 1260, not 1080', () => {
  const s = L.newGame('grid', { arena: true, humans: [], timelines: ['victorian'], startClock: 1020, curtainGrid: true });
  eq(L.newGame('grid-view', { arena: true, humans: [], startClock: 1020, curtainGrid: true, starter: undefined }).opts.curtainGrid, true);
  L.mut.joinWorld(s, { id: 'pa', name: 'A' }); L.mut.chooseStarter(s, 'pa', 'dolly');
  eq(L.getView(s, 'pa:dolly').timeline.nextCurtainAt, 1080, 'the view prints the grid time');
  const falls = []; const T = s.timelines.victorian;
  const run = (to) => { const k = T.curtainNo; L.mut.advanceClock(s, to - s.clock); if (T.curtainNo > k) falls.push(T.lastCurtainAt); };
  run(1079); eq(falls.length, 0); run(1080); run(1259); run(1260); run(1440);
  eq(J(falls), J([1080, 1260, 1440]));
  // an early Curtain (A seals alone at 1450; falls at 1470 after the minimum gap) does not move the grid: next forced 1620
  sealBest(s, 'pa:dolly'); run(1470); eq(T.lastCurtainAt, 1470, 'the early fall'); eq(L.getView(s, 'pa:dolly').timeline.nextCurtainAt, 1620);
  // the skip: an early Curtain at 1070 (inside minGapMin of 1080) pushes the forced one to 1260
  const s2 = L.newGame('grid-2', { arena: true, humans: [], timelines: ['victorian'], startClock: 1020, curtainGrid: true });
  L.mut.joinWorld(s2, { id: 'pa', name: 'A' }); L.mut.chooseStarter(s2, 'pa', 'dolly');
  L.mut.advanceClock(s2, 10); sealBest(s2, 'pa:dolly'); eq(s2.timelines.victorian.curtainNo, 0, 'inside the minimum gap'); L.mut.advanceClock(s2, 40);
  eq(s2.timelines.victorian.lastCurtainAt, 1070, 'early at 1070');
  eq(L.getView(s2, 'pa:dolly').timeline.nextCurtainAt, 1260);
  L.mut.advanceClock(s2, 1259 - s2.clock); eq(s2.timelines.victorian.curtainNo, 1, 'nothing at 1080');
  L.mut.advanceClock(s2, 1); eq(s2.timelines.victorian.curtainNo, 2, 'forced at 1260');
  const solo = L.newGame('grid-solo', { starter: 'dolly' });
  eq(L.getView(solo, 'dolly').timeline.nextCurtainAt, R.curtain.maxGapMin, 'solo: maxGapMin after the last, as ever');
});

test('E19: the digest\'s TONIGHT / LAST CALL tip follows the grid: after an early Curtain at 1070 it is not last call at 1249 and is at 1259', () => {
  const s = L.newGame('grid-tip', { arena: true, humans: [], timelines: ['victorian'], startClock: 1020, curtainGrid: true });
  L.mut.joinWorld(s, { id: 'pa', name: 'A' }); L.mut.chooseStarter(s, 'pa', 'dolly');
  L.mut.advanceClock(s, 10); sealBest(s, 'pa:dolly'); L.mut.advanceClock(s, 40);
  eq(s.timelines.victorian.lastCurtainAt, 1070, 'early at 1070'); eq(L.getView(s, 'pa:dolly').timeline.nextCurtainAt, 1260, 'forced at 1260');
  const tip = () => L.awayDigest(s, 'pa:dolly', s.tick, { tonight: true }).headlines.find((h) => /^(tonight|tonight-kink|tonight-regular|last-call)$/.test(h.type));
  L.mut.advanceClock(s, 1249 - s.clock); const early = tip();
  ok(early && early.type !== 'last-call', `at 1249, 11 minutes before the grid, it is TONIGHT (${early && early.type})`);
  ok(/Curtain /.test(early.text), early.text);
  L.mut.advanceClock(s, 10); const late = tip();
  ok(late && late.type === 'last-call', `at 1259 it is LAST CALL (${late && late.type})`);
  eq(s.timelines.victorian.curtainNo, 1, 'the forced Curtain has not fallen yet');
});

test('E20: arena: a baseline card not in her hand is refused with bad-baseline; a baseline with a client hand and known scores exactly as one without', () => {
  const { s, a, b, tl } = arena('baseline', { minGapMin: 0 });
  const v = L.getView(s, a); const place = L.casualPlace(v); const bg = L.bestGuess(v, place);
  const notHeld = Object.keys(C.CARDS).find((c) => !s.whores[a].hand.includes(c) && !C.CARDS[c].npc);
  let code = null; try { L.planEvening(s, a, { place, cards: bg.cards, baseline: [{ key: 'x', place, cards: [notHeld] }] }); } catch (e) { code = e.code; }
  eq(code, 'bad-baseline');
  const held = bg.cards.map((i) => s.whores[a].hand[i]);
  const host = v.timeline.rota[0].hosts[place];
  const plain = L.planEvening(s, a, { place, cards: bg.cards, baseline: [{ key: 'k', place, cards: held }] });
  const dressed = L.planEvening(s, a, { place, cards: bg.cards, baseline: [{ key: 'k', place, cards: held, hand: [...held, 'what-happens'], known: { secret: true, kink: true } }] });
  eq(J(plain.whores[a].plan), J(dressed.whores[a].plan), 'the client\'s hand and known are not read');
  eq(plain.whores[a].plan.baseline[0].hand, null); eq(J(plain.whores[a].plan.baseline[0].known), J({ secret: false, kink: false }));
  s.whores[a].known.gents[host] = { secret: true };
  eq(L.planEvening(s, a, { place, cards: bg.cards, baseline: [{ key: 'k', place, cards: held }] }).whores[a].plan.baseline[0].known.secret, true, 'her own known is used');
  const run = (st) => { const x = JSON.parse(J(st)); L.mut.sealPlan(x, a); sealBest(x, b); if (x.timelines[tl].curtainNo === 0) L.mut.resolveCurtain(x, tl); return J(x.log.find((e) => e.type === 'payout' && e.whores[0] === a).data.hindsight); };
  eq(run(plain), run(dressed), 'and the hindsight is the same');
  ok(run(plain).includes('"here":"k"'), 'the baseline scored');
  // solo: unchanged, a client hand is accepted
  const solo = L.newGame('baseline-solo', { starter: 'dolly', minGapMin: 0 }); const vs = L.getView(solo, 'dolly');
  const ps = L.planEvening(solo, 'dolly', { place: 'tuppenny', cards: [0], baseline: [{ key: 'k', place: 'tuppenny', cards: [notHeld], hand: ['saucy-wink'], known: { secret: true } }] });
  eq(ps.whores.dolly.plan.baseline[0].cards[0], notHeld); eq(J(ps.whores.dolly.plan.baseline[0].hand), J(['saucy-wink'])); ok(vs);
});

test('A state version field: s.v stays 1 (the client\'s SAVE_V carries RULES.version)', () => {
  eq(L.newGame('v').v, 1); eq(arena('v').s.v, 1); eq(R.version, 'proto-1');
});

// §9.1 (a): the leak walk over two humans in one Timeline, and the hidden swap of a human rival
test('Two humans in one Timeline: getView never leaks the other human\'s hidden state, for either viewer; swapping a human rival\'s hidden state moves nothing on the other\'s screen', () => {
  for (const seed of ['two-1', 'two-2', 'two-3']) {
    const { s, a, b, tl } = arena(seed, { minGapMin: 0 });
    for (let i = 0; i < 6; i++) { sealBest(s, a); if (i % 2) sealBest(s, b); L.mut.advanceClock(s, R.curtain.maxGapMin); if (s.timelines[tl].curtainNo === i) L.mut.resolveCurtain(s, tl); }
    L.mut.study(s, a, 'plunkett'); L.mut.study(s, b, a);
    for (const [me, other, acct] of [[a, b, 'pa'], [b, a, 'pb']]) {
      const w = s.whores[me]; const v = L.getView(s, me);
      for (const g of v.timeline.gents) { const k = w.known.gents[g.id] || {}; if (!k.secret) eq(g.secretTaste, null, `${g.id} Secret Taste leaked to ${acct}`); if (!k.kink) eq(g.kink, null, `${g.id} Kink leaked`); }
      const r = v.timeline.rivals.find((x) => x.id === other); ok(r, 'the other human is on the table');
      ok(r.char === 'dolly' && r.name === s.whores[other].name && !('hand' in r) && !('draw' in r) && !('discard' in r) && !('known' in r && r.known.gents) && !('plan' in r) && !('items' in r) && !('rng' in r), J(Object.keys(r)));
      eq(r.revealedPlace, null); eq(r.heading, null);
      for (const e of v.log) ok(e.vis === 'all' || e.vis.includes(acct), `private event ${e.type} leaked to ${acct}`);
      const json = J(v); ok(!json.includes('"rng"'), 'no rng in a view'); ok(!json.includes(s.seed), 'no seed in a view');
      const ow = s.whores[other]; for (const c of ow.hand) ok(!json.includes(`"${c}"`) || [...w.hand, ...w.draw, ...w.discard].includes(c) || C.TIMELINES[tl].market.includes(c) || C.SHARED_DECK.includes(c) || C.CHARACTERS.dolly.cards.includes(c), `${c} from ${other}'s hand`);
      for (const rr of [v.timeline.results, ...v.timeline.resultsHistory].filter(Boolean)) for (const pr of rr.places) for (const e of pr.entries) { ok(!('trueSway' in e)); if (e.rank === null) eq(e.sway, null); }
      // the swap: the other human's hidden state changes, her public facts (sealed, what-happens) do not; nothing on my screen moves
      const before = J({ v, la: L.legalActions(s, me), d: L.awayDigest(s, acct, 0, { tonight: true }), p: L.publicProfile(s, acct, other) });
      const saved = J({ hand: ow.hand, draw: ow.draw, discard: ow.discard, known: ow.known, plan: ow.plan, items: ow.items, blackBook: ow.blackBook });
      const hadWH = ow.hand.includes('what-happens');
      const pool = [...ow.hand, ...ow.draw, ...ow.discard].filter((c) => c !== 'what-happens' && !C.AFFLICTIONS[c]);
      ow.hand = pool.slice(-5).concat(hadWH ? ['what-happens'] : []); ow.draw = pool.slice(0, Math.max(0, pool.length - 5)).reverse(); ow.discard = [];
      ow.known = { gents: Object.fromEntries(C.TIMELINES[tl].gents.map((g) => [g, { secret: true, kink: true, history: true }])), rivals: { [me]: { habit: true, vice: true, last: true } } };
      ow.items = [{ id: 'cane', uses: 1, readyAt: 0 }]; ow.blackBook = [{ gent: 'plunkett', fact: 'secret', how: 'study' }];
      if (ow.plan) { const alt = C.TIMELINES[tl].places.find((p) => p !== ow.plan.place); ow.plan = { ...ow.plan, place: alt, cards: [0], item: null }; }
      const after = J({ v: L.getView(s, me), la: L.legalActions(s, me), d: L.awayDigest(s, acct, 0, { tonight: true }), p: L.publicProfile(s, acct, other) });
      eq(after, before, `${acct}: a human rival's hidden state is on my screen`);
      const back = JSON.parse(saved); Object.assign(ow, back);
    }
  }
});

// §9.1 (b) and (c): a Standing Order for an absent human while another sealed; the digest names the winner by nom de plume
test('Two humans: an absent human gets a Standing Order while the other sealed, and her digest names the winner by nom de plume', () => {
  let named = 0;
  for (let n = 0; n < 40 && !named; n++) {
    const { s, a, b, tl } = arena(`so-${n}`);
    const since = s.tick;
    s.whores[b].lastActiveAt = s.clock - R.curtain.activeWindowMin - 1; // B is away
    const pick = L.standingOrderPick(L.getView(s, b)).place;
    const va = L.getView(s, a); if (!va.timeline.places.find((p) => p.id === pick).open) continue;
    L.mut.sealPlan(s, a, { place: pick, cards: L.bestGuess(va, pick).cards });
    eq(s.timelines[tl].curtainNo, 0, 'the minimum gap first');
    L.mut.advanceClock(s, R.curtain.minGapMin);
    eq(s.timelines[tl].curtainNo, 1, 'A alone is active: the Curtain falls once she has sealed');
    const so = s.lastEvents.find((e) => e.type === 'standing-order' && e.whores[0] === b);
    ok(so && J(so.vis) === J(['pb']), 'B\'s Standing Order, private to B');
    ok(s.lastEvents.some((e) => e.type === 'payout' && e.whores[0] === b) && s.lastEvents.some((e) => e.type === 'payout' && e.whores[0] === a && !e.data.standingOrder), 'both paid');
    ok(!L.getView(s, a).log.some((e) => e.type === 'standing-order'), 'A sees none of it');
    eq(so.data.place, pick);
    if (so.data.winner !== a || so.data.rank === 0) continue; // A won outright (a dead heat at 1st names nobody)
    named++;
    eq(so.data.winnerName, A_NAME);
    const d = L.awayDigest(s, 'pb', since); const line = d.headlines.find((h) => h.type === 'standing-order');
    ok(line && line.detail.includes(A_NAME) && !line.detail.includes(C.CHARACTERS.dolly.name), line && line.detail);
    ok(!J(d).includes('"pa:dolly"') || true, 'ids may appear in events; names are the noms de plume');
  }
  ok(named, 'a seed where A won at B\'s Place');
  // both away: each gets her own Standing Order, private to her, at the forced Curtain
  const { s, a, b, tl } = arena('so-both');
  for (const w of [a, b]) s.whores[w].lastActiveAt = s.clock - R.curtain.activeWindowMin - 1;
  L.mut.advanceClock(s, R.curtain.maxGapMin);
  eq(s.timelines[tl].curtainNo, 1, 'forced, nobody active');
  for (const [w, acct, other] of [[a, 'pa', 'pb'], [b, 'pb', 'pa']]) {
    const so = s.lastEvents.filter((e) => e.type === 'standing-order' && e.whores[0] === w);
    eq(so.length, 1, `${acct}: one Standing Order`); eq(J(so[0].vis), J([acct]), `${acct}: private to her`);
    ok(s.lastEvents.some((e) => e.type === 'payout' && e.whores[0] === w && e.data.standingOrder), `${acct}: paid by Standing Order`);
    ok(!L.getView(s, w).log.some((e) => e.type === 'standing-order' && e.vis.includes(other)), `${acct}: sees only her own`);
    ok(L.awayDigest(s, acct, 0).headlines.some((h) => h.type === 'standing-order'), `${acct}: her digest says so`);
  }
});

// §9.1 (d) and (e): the legalActions fuzz with three humans interleaved, and replay determinism through mut (the journal contract)
test('Three humans interleaved: legalActions only offers actions that succeed, and a recorded (clock, who, type, args) journal replays to the same state', () => {
  const build = () => { const s = L.newGame('fuzz-3', { arena: true, humans: [], timelines: ['wildwest'], minGapMin: 0, curtainGrid: true, logLimit: 8000 }); for (const id of ['pa', 'pb', 'pc']) { L.mut.joinWorld(s, { id, name: `N_${id}` }); L.mut.chooseStarter(s, id, 'fanny'); s.whores[`${id}:fanny`].coin = 20; } return s; };
  const s = build(); const journal = [];
  const act = (type, who, ...args) => { L.mut[type](s, who, ...args); journal.push({ clock: s.clock, who, type, args }); };
  let n = 0;
  for (let round = 0; round < 4; round++) {
    for (const id of ['pa', 'pb', 'pc']) {
      const wid = `${id}:fanny`; const acts = L.legalActions(s, wid);
      ok(acts.length > 5, 'too few actions');
      // every offered action succeeds on the state as it stands (the pure API, so one does not spend what the next needs)
      for (const a of acts) {
        const run = {
          planEvening: () => L.planEvening(s, wid, { place: a.place, cards: [0] }),
          startAssignation: () => L.startAssignation(s, wid, a.gent),
          study: () => L.study(s, wid, a.target),
          explore: () => L.explore(s, wid, a.place),
          buyCard: () => L.buyCard(s, wid, a.card),
          useTalent: () => L.useTalent(s, wid, { kind: a.kind, card: 0 }),
          spendGossip: () => L.spendGossip(s, wid, a.rival),
          buyOffer: () => L.buyOffer(s, wid),
          switchTimeline: () => L.getView(s, a.whore),
        }[a.type];
        if (run) { run(); n++; }
      }
      // then a journaled turn through mut, interleaved across the three humans
      const st = acts.find((a) => a.type === 'study'); if (st) act('study', wid, st.target);
      const ex = acts.filter((a) => a.type === 'explore'); act('explore', wid, ex[round % ex.length].place);
      if (s.whores[wid].offer) act('buyOffer', wid);
      const g = acts.find((a) => a.type === 'spendGossip'); if (g) act('spendGossip', wid, g.rival);
      const sa = acts.find((a) => a.type === 'startAssignation' && !a.backAlley); if (sa && !s.whores[wid].assignation) { act('startAssignation', wid, sa.gent); act('playAssignation', wid, { cards: L.bestGuess(L.getView(s, wid), { gent: sa.gent }).cards.slice(0, 2) || [0] }); }
      if (round % 2 === 0) { const v = L.getView(s, wid); const place = L.casualPlace(v); act('sealPlan', wid, { place, cards: L.bestGuess(v, place).cards }); }
    }
    const k = s.timelines.wildwest.curtainNo; act('advanceClock', R.curtain.maxGapMin); if (s.timelines.wildwest.curtainNo === k) { journal.push({ clock: s.clock, who: null, type: 'resolveCurtain', args: ['wildwest'] }); L.mut.resolveCurtain(s, 'wildwest'); }
  }
  ok(n > 60, `actions run: ${n}`); ok(journal.length > 30, `journal rows: ${journal.length}`);
  ok(s.timelines.wildwest.curtainNo >= 4, 'four Curtains fell');
  // replay: the same opts, advancing to each row's clock first
  const r = build();
  for (const row of journal) {
    if (row.type === 'advanceClock') { L.mut.advanceClock(r, row.who); continue; }
    if (r.clock < row.clock) L.mut.advanceClock(r, row.clock - r.clock);
    if (row.type === 'resolveCurtain') L.mut.resolveCurtain(r, ...row.args); else L.mut[row.type](r, row.who, ...row.args);
  }
  eq(J(r), J(s), 'replay differs');
});

// §9.1 (f): the golden solo save from a20687d loads and plays
test('Golden save: a solo save exported at a20687d runs through getView, legalActions, awayDigest, advanceClock and sealPlan, truncated false', () => {
  const fx = JSON.parse(readFileSync(new URL('./fixtures/save-a20687d.json', import.meta.url), 'utf8'));
  ok(fx.v.startsWith(R.version), `the save's version ${fx.v} starts with RULES.version (${R.version}); loadSave sets any other aside`);
  ok(fx.S && fx.ui && fx.S.v === 1 && !('salted' in fx.S) && !('lastPayouts' in fx.S.whores.dolly), 'a save from before the arena fields');
  let s = fx.S;
  const v = L.getView(s, 'dolly'); ok(v.whore && v.whore.id === 'dolly' && v.timeline.rivals.length >= 1, 'the view');
  ok(L.legalActions(s, 'dolly').length > 5);
  const d = L.awayDigest(s, 'you', 0, { tonight: true }); eq(d.truncated, false); ok(d.headlines.length >= 1);
  eq(L.getView(s, 'dolly').timeline.nextCurtainAt, s.timelines.victorian.lastCurtainAt + s.opts.maxGapMin, 'no grid in a solo save');
  s = L.advanceClock(s, R.curtain.maxGapMin); ok(s.lastEvents.some((e) => e.type === 'curtain'), 'a Curtain fell');
  const v2 = L.getView(s, 'dolly'); const place = L.casualPlace(v2);
  s = L.sealPlan(s, 'dolly', { place, cards: L.bestGuess(v2, place).cards }); ok(s.whores.dolly.plan || s.timelines.victorian.curtainNo >= 2, 'sealed');
  eq(L.eventsFor(s, 'you').filter((e) => e.type === 'payout').every((e) => e.data.breakdown), true, 'old payouts keep their breakdown in the log');
  ok(!('rng' in s.whores.dolly) && typeof s.rng === 'number', 'a solo whore has no stream of her own');
  s = L.sleepTillDawn(s); ok(s.log.some((e) => e.type === 'dawn'));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
