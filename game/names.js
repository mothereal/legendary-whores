// The Scandal Sheet · the nom de plume: its format, the live tidy-up as she types, and "Pick one for me" (a random stage
// name for players who would rather not think of one). The nom de plume is also the login name and the public leaderboard
// name, so it is letters, digits and underscores only, 3 to 24 of them (NOM_RE); a space becomes an underscore.
// The names are saucy-postcard heat (docs/gdd/04-tone-and-humour.md): the joke is in the pun, never in a rude word; every
// name is a grown woman's stage name; no real people, nobody's ethnicity or religion, and no names already worn by the
// cast (engine/content.js). Two styles per era: a period first name and a punning surname (with a title where it fits),
// and a handful of whole-name puns. Checked by game/names.test.mjs.

export const MIN_LEN = 3;
export const MAX_LEN = 24; // the sign-up field's maxlength (it does not clamp a value set from script, so the lists must)
export const NOM_RE = /^[A-Za-z0-9_]{3,24}$/;

// The field as she types: each space becomes an underscore, anything else outside [A-Za-z0-9_] is dropped, and the caret
// stays after the character she just typed. Returns the tidied value and where the caret goes.
export function cleanNom(raw, caret = String(raw ?? '').length) {
  const s = String(raw ?? ''); let value = ''; let at = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i] === ' ' ? '_' : s[i];
    if (!/[A-Za-z0-9_]/.test(ch)) continue;
    value += ch; if (i < caret) at++;
  }
  value = value.slice(0, MAX_LEN);
  return { value, caret: Math.min(at, value.length) };
}

export const ERAS = {
  victorian: {
    titles: ['', 'Lady', 'Miss', 'Mrs', 'Madame'],
    first: ['Arabella', 'Euphemia', 'Honoria', 'Letitia', 'Rosamund', 'Winifred', 'Cordelia', 'Clarissa', 'Ottilie', 'Augusta', 'Violetta', 'Philippa', 'Maud', 'Ada', 'Effie', 'Edith'],
    last: ['Petticoat', 'Featherbed', 'Ticklebury', 'Winkworth', 'Garterly', 'Bustleworth', 'Fancourt', 'Cuddlesby', 'Pinchbeck', 'Spoonsworth', 'Flutterby', 'Ruffleton', 'Swoonsby', 'Blushington', 'Corsetfield', 'Unlacey'],
    puns: ['Miss_D_Meanour', 'Lady_Ava_Gander', 'Ophelia_Cheek', 'Miss_Molly_Coddle', 'Constance_Courting', 'Lady_Gilda_Lily', 'Cora_Spondence', 'Miss_Bea_Having', 'Lady_Petticoat_Lane', 'Miss_Fortune', 'Lady_Bella_Donna', 'Hon_Tilly_Vation'],
  },
  wildwest: {
    titles: ['', 'Miss', 'Madam'],
    first: ['Ruby', 'Etta', 'Lulu', 'Goldie', 'Sadie', 'Trixie', 'Opal', 'Peaches', 'Daisy', 'Maybelle', 'Honey', 'Clover', 'Hattie', 'Birdie', 'Della', 'Pearlie'],
    last: ['Ridewell', 'Holster', 'Rodeo', 'Bronco', 'Wildoats', 'Longhorn', 'Stampede', 'Mustang', 'Hayloft', 'Lasso', 'Buckshot', 'Gallop', 'TwoStep', 'Spurwell', 'Hitchings', 'Yeehaw'],
    puns: ['Rhoda_Bronco', 'Della_Cards', 'Belle_Ringer', 'Miss_Sal_Loon', 'Lotta_Leg', 'Wanda_Yonder', 'Ginny_Mills', 'Birdie_Bedspring', 'Penny_Ante', 'Madam_Hornswoggle', 'Doris_Swinging', 'Lacey_Chaps'],
  },
  vegas: {
    titles: ['', 'Miss'],
    first: ['Roxy', 'Bambi', 'Destiny', 'Starla', 'Cherry', 'Lexi', 'Tiffani', 'Coco', 'Bubbles', 'Fawn', 'Electra', 'Mimi', 'Jewel', 'Sapphire', 'Misty', 'Bunny'],
    last: ['Jackpot', 'Rhinestone', 'Sequins', 'Highroller', 'Doubledown', 'AllNighter', 'KissMeQuick', 'VaVaVoom', 'Bigspender', 'Feathers', 'Roulette', 'Afterparty', 'SnakeEyes', 'Showboat', 'Comped', 'NeonBliss'],
    puns: ['Chastity_Belt', 'Sheila_Blige', 'Anita_Drink', 'Carrie_Oakey', 'Ella_Vator', 'Mona_Lott', 'Holly_Wood', 'Ginger_Snap', 'Brandy_Alexander', 'Fay_Bulous', 'Misty_Buffet', 'Sue_Ducer'],
  },
};

const build = (t, f, l) => [t, f, l].filter(Boolean).join('_');

// Every name the generator can print: [title_]first_last, kept only when it fits the format, then the whole-name puns.
export function allNames() {
  const out = new Set();
  for (const e of Object.values(ERAS)) {
    for (const t of e.titles) for (const f of e.first) for (const l of e.last) { const n = build(t, f, l); if (NOM_RE.test(n)) out.add(n); }
    for (const p of e.puns) if (NOM_RE.test(p)) out.add(p);
  }
  return [...out];
}

const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length) % arr.length];
// One name, never the one already in the field (`prev`): an era at random, then a whole-name pun about one roll in three,
// else a built name; a build too long for the field drops its title, then tries again.
export function randomName(rnd = Math.random, prev = '') {
  for (let tries = 0; tries < 50; tries++) {
    const e = ERAS[pick(Object.keys(ERAS), rnd)];
    let n;
    if (rnd() < 1 / 3) n = pick(e.puns, rnd);
    else {
      const f = pick(e.first, rnd); const l = pick(e.last, rnd);
      n = build(pick(e.titles, rnd), f, l);
      if (!NOM_RE.test(n)) n = build('', f, l);
    }
    if (NOM_RE.test(n) && n !== prev) return n;
  }
  return prev === 'Madam_X' ? 'Miss_Molly_Coddle' : 'Madam_X';
}
