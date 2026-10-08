// The Scandal Sheet · the NEXT note's pointer for Tonight's Curtain on a Timeline's first evening (round 6, findings 3 and 4).
// One module, shared by scandal.js (which prints it) and find-first-curtain.mjs (which replays every starter on both roads
// and fails if the Place it names would leave her short of the Bar). Pure: it reads a getView() view and the engine's view
// helpers, nothing else.
//
// Rules: ONE pointer per note, and every pointer can be won.
//   1. The Kink lesson leads (a ready Kink novelty, or his Kink in stock behind tonight's back door) unless its Place is on
//      the other paper (Posh for the Police Gazette, Gutter for the Society Pages).
//   2. Her road's own Place is named only when it is open, not raided, has a smiley (or Best Guess clears its Bar) and is at
//      least as good as the best Place tonight.
//   3. Otherwise the note says why and points at the Place Best Guess would pick for her road (casualPlace).
const bare = (name) => String(name).replace(/^the /i, '');
const theLower = (name) => String(name).replace(/^The /, 'the ');

function hostTonight(v, gid) {
  const hosts = v.timeline.rota[0].hosts;
  const pid = Object.keys(hosts).find((p) => hosts[p] === gid);
  const P = pid && v.timeline.places.find((x) => x.id === pid);
  return P && P.open ? P : null;
}
// her ready Kink novelty whose gentleman hosts an open Place tonight
export function savedItem(v) {
  for (const it of v.whore.items) {
    if (it.kind !== 'kink' || !it.ready) continue;
    const gid = it.kinkFor || it.tellOf; if (!gid) continue;
    const place = hostTonight(v, gid);
    if (place) return { item: it, gent: v.timeline.gents.find((g) => g.id === gid), place };
  }
  return null;
}

/** curtainPointer(L, v) -> { place, text }: the Place the note names tonight and the line it prints. */
export function curtainPointer(L, v) {
  const save = savedItem(v);
  const kp = L.kinkOffer(v);
  const road = v.whore.road;
  const roadKind = road === 'notoriety' ? 'gutter' : road === 'standing' ? 'posh' : null;
  const offKind = road === 'notoriety' ? 'posh' : road === 'standing' ? 'gutter' : null;
  const open = v.timeline.places.filter((p) => p.open);
  const mine = roadKind ? open.find((p) => p.kind === roadKind) : null;
  const sm = (p) => L.placeOutlook(v, p.id).smileys;
  const bestSm = Math.max(0, ...open.map(sm));
  const winnable = (p) => { if (sm(p) >= 1) return true; const bg = L.bestGuess(v, p.id); return bg.cards.length > 0 && bg.sway >= p.rules.bar; };
  const lesson = save ? save.place : kp ? kp.place : null;
  if (lesson && lesson.kind !== offKind) {
    if (save) return { place: save.place.id, text: `Tonight's Curtain at ${save.place.short}: bring your ${bare(save.item.name)}` };
    return { place: kp.place.id, text: `Tonight's Curtain at ${kp.place.short}: his Kink is in stock` };
  }
  if (mine && !mine.raid && winnable(mine) && sm(mine) >= bestSm) {
    return { place: mine.id, text: `Tonight's Curtain: ${mine.short}${roadKind === 'gutter' ? ' (+1 Notoriety)' : ''}` };
  }
  if (mine) {
    const alt = open.find((p) => p.id === L.casualPlace(v)) || mine;
    if (alt.id !== mine.id) {
      const why = mine.raid ? 'is raided tonight' : !winnable(mine) ? 'is out of reach tonight' : 'pays less tonight';
      const tail = alt.kind === 'rowdy' ? `${theLower(alt.short)} suits either paper` : `${theLower(alt.short)} pays best`;
      return { place: alt.id, text: `${mine.short} ${why}: ${tail}` };
    }
  }
  return { place: null, text: 'Tonight\'s Curtain: pick a Place' };
}
