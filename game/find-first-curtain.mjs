// Replays The Scandal Sheet's first evening on each starter's seed (tourist, the fresh back door, buy its novelty, Tonight's
// Curtain at the novelty's host) and prints what Best Guess, Best Guess with the novelty, and the scripted rival score.
// Use it to tune the staged first Curtain (STAGE in scandal.js): the rival should land between Best Guess (a paid 2nd) and
// the taught novelty path (a clear 1st). Re-run after any engine change that moves the RNG or the numbers:
//   node C-scandal/find-first-curtain.mjs
import * as L from '../engine/rules.js';
const { SEEDS, STAGE, gameOpts } = await import('./slice-config.js');
const C = L.CONTENT;
const SEARCH = process.argv.includes('--search');
const rivalOf = (id) => Object.keys(C.CHARACTERS).find((r) => C.CHARACTERS[r].role === 'rival' && C.CHARACTERS[r].timeline === C.CHARACTERS[id].timeline);
let bad = 0;
function replay(id, stage) {
  let s = L.newGame(SEEDS[id], { ...gameOpts(id), stageRivals: stage });
  let v = L.getView(s, id);
  const t = v.board.find((b) => b.tourist).gent;
  s = L.startAssignation(s, id, t); v = L.getView(s, id);
  s = L.playAssignation(s, id, { cards: L.bestGuess(v, { gent: t }).cards });
  s = L.explore(s, id, v.timeline.freshStall); v = L.getView(s, id);
  const offer = v.whore.offer ? v.whore.offer.item : null;
  if (offer) s = L.buyOffer(s, id);
  s = L.advanceClock(s, 30);
  v = L.getView(s, id);
  const it = v.whore.items.find((x) => x.kind === 'kink' && x.ready);
  const gid = it ? (it.kinkFor || it.tellOf) : null;
  const hosts = v.timeline.rota[0].hosts;
  const place = Object.keys(hosts).find((p) => hosts[p] === gid) || L.casualPlace(v);
  const bg = L.bestGuess(v, place); const bgi = it ? L.bestGuess(v, place, { item: it.id }) : bg;
  const run = (plan) => {
    const s2 = L.sealPlan(s, id, plan);
    const cur = s2.lastEvents.find((e) => e.type === 'curtain' && e.timeline === C.CHARACTERS[id].timeline);
    if (!cur) return { note: 'Curtain did not fall at the seal' };
    const pr = cur.data.places.find((x) => x.place === place);
    const me = pr.entries.find((e) => e.whore === id); const others = pr.entries.filter((e) => e.whore !== id);
    const rv = others.find((e) => e.whore === rivalOf(id));
    const tied = others.some((e) => e.sway != null && e.sway === me.sway);
    return { me: `${me.sway} (${me.rank === null ? 'short' : `${tied ? 'tied ' : ''}rank ${me.rank + 1}`}${me.upstaged ? `, upstaged ${me.upstaged}` : ''}, +${me.renown} Renown)`,
      others: others.map((e) => `${e.whore} ${e.sway ?? 'short'}${e.upstage ? ' [Upstage]' : ''}`).join(', '),
      rival: !!rv, rivalSway: rv ? rv.sway : null, mySway: me.sway, rank: me.rank === null ? null : me.rank + 1 + (tied ? 0.5 : 0) - (tied ? 0.5 : 0),
      // rank as 1, 2...; a tie at 1st does not count as a clear 1st (margin over the best other)
      margin: me.sway - Math.max(0, ...others.map((e) => e.sway || 0)) };
  };
  const a = run({ place, cards: bg.cards }); const b = run({ place, cards: bgi.cards, item: it ? it.id : undefined });
  return { s, t, offer, place, hosts, bg, bgi, it, a, b };
}
for (const id of Object.keys(SEEDS)) {
  const rv = rivalOf(id);
  if (SEARCH) {
    // every 3-card hand from her signatures, the shared deck and her Timeline's market, Regular 0..2 with the host
    const pool = [...new Set([...C.NPC_SIGNATURES[C.CHARACTERS[rv].signature] || [], ...C.SHARED_DECK, ...C.TIMELINES[C.CHARACTERS[rv].timeline].market])].filter((c) => C.CARDS[c]);
    const r0 = replay(id, {}); const host = r0.hosts[r0.place];
    const found = [];
    for (let i = 0; i < pool.length; i++) for (let j = i; j < pool.length; j++) for (let k = j; k < pool.length; k++) for (let reg = 0; reg <= 2; reg++) {
      const st = { [rv]: { hand: [pool[i], pool[j], pool[k]], regular: reg ? { [host]: reg } : {}, quietCurtains: 1 } };
      const r = replay(id, st);
      if (!r.a.rival || !r.b.rival) continue;
      if (r.a.rank === 2 && r.b.rank === 1 && r.b.margin >= 1) found.push({ st, rs: r.b.rivalSway, me: r.a.mySway, mi: r.b.mySway });
    }
    found.sort((x, y) => (y.mi - y.rs) - (x.mi - x.rs) || x.rs - y.rs);
    const sig = found.filter((f) => f.st[rv].hand.some((c) => (C.NPC_SIGNATURES[C.CHARACTERS[rv].signature] || []).includes(c)));
    console.log(id, rv, `${found.length} stagings (${sig.length} with her signature)`, JSON.stringify((sig.length ? sig : found).slice(0, 4).map((f) => [f.st[rv].hand.join("+"), f.st[rv].regular, f.rs, f.me, f.mi])));
    continue;
  }
  const { t, offer, place, hosts, bg, bgi, it, a, b } = replay(id, STAGE);
  const okk = a.rank === 2 && b.rank === 1 && b.margin >= 1;
  if (!okk) bad++;
  console.log(`${id} (${SEEDS[id]}): tourist ${t}; bought ${offer ? offer.name : 'nothing'}; Curtain at ${place} (host ${hosts[place]})`);
  console.log(`  Best Guess ${bg.sway}: ${a.me}; at the table: ${a.others}`);
  console.log(`  + ${it ? it.name : 'no novelty'} ${bgi.sway}: ${b.me}; at the table: ${b.others}`);
  console.log(`  Best Guess takes a paid 2nd and the novelty path a clear 1st: ${okk ? 'yes' : 'NO'}`);
}
process.exitCode = bad ? 1 : 0;
