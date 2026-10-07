// The lists behind the name and password rules (docs/server-api.md section 6). Kept apart from the logic so they can be
// read and changed in one place.

import { CHARACTERS, NPC_ACCOUNTS } from '../engine/content.js';

// For matching, a name is folded to lowercase with everything but a-z and 0-9 removed: Lady_Lavinia -> ladylavinia.
export const fold = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

// The second fold: figures and letters that pass for other letters are read as those letters, so Adm1n, 4dmin and
// Admln all come out as admin. Every check runs on both folds.
const LOOKS_LIKE = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', 9: 'g', l: 'i' };
export const leet = (folded) => folded.replace(/[0134579l8]/g, (c) => LOOKS_LIKE[c]);

// Reserved: the house's own words, the engine's word for the player ("you"), the game's word for an unsigned player
// ("anonymous"), and every name the cast wears on a board, read from engine/content.js so the list never drifts from
// the game. A name is refused if its fold is one of these, or one of these followed only by digits (admin2,
// LadyLavinia99).
const HOUSE_WORDS = [
  'admin', 'administrator', 'moderator', 'mod', 'system', 'root', 'staff', 'support', 'official', 'editor',
  'theeditor', 'house', 'automaton', 'standin', 'anonymous', 'you', 'null', 'undefined',
];
// Staff words that also stand out inside a longer name (TheAdmin, Admin_Team, EditorInChief, Official_Staff). The
// long ones are refused anywhere in the fold; admin and staff only at its start or end, so Bad_Minx and Mad_Minnie stay
// free. Ordinary words that hold one of them are taken out of the fold first.
const HOUSE_ANYWHERE = ['administrator', 'moderator', 'official', 'editor', 'system'];
const HOUSE_AT_EDGE = ['admin', 'staff'];
const HOUSE_INNOCENT = ['creditor', 'ecosystem', 'distaff', 'flagstaff', 'stafford'];
const CAST_NAMES = [
  ...NPC_ACCOUNTS.map((a) => a.name),
  ...Object.values(CHARACTERS).filter((c) => c.role === 'rival' || c.role === 'standin').flatMap((c) => [c.name, c.short]),
];
export const RESERVED = new Set([...HOUSE_WORDS, ...CAST_NAMES.map(fold)].filter(Boolean));
const RESERVED_LEET = new Set([...RESERVED].map(leet));

// Blocked: slurs and hate words, refused anywhere inside the fold. Stored in ROT13 so the source does not print them.
// Only words that do not occur inside ordinary words go on the list (no "spic" for "spicy"); where an ordinary word does
// contain one, that word is listed in INNOCENT and taken out of the fold before the check, so "snigger" stays free.
const rot13 = (s) => s.replace(/[a-z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 97 + 13) % 26) + 97));
const BLOCKED = [
  'avttre', 'avttn', 'snttb', 'genaal', 'jrgonpx', 'enturnq', 'gbjryurnq', 'wvtnobb', 'wvttnobb', 'fcrnepuhpxre',
  'cbepuzbaxrl', 'mvccreurnq', 'tbyyvjbt', 'ergneq', 'furznyr', 'uvgyre', 'fvrturvy', 'crqbcuvyr', 'cnrqbcuvyr',
].map(rot13);
const INNOCENT = ['favttre', 'avttneq', 'ergneqnag'].map(rot13);

const BLOCKED_LEET = BLOCKED.map(leet);
const INNOCENT_LEET = INNOCENT.map(leet);
const without = (f, words) => words.reduce((s, w) => s.split(w).join('-'), f);

export function isReserved(name) {
  const f = fold(name);
  const bare = f.replace(/[0-9]+$/, ''); // admin2, LadyLavinia99
  if (RESERVED.has(f) || RESERVED.has(bare) || RESERVED_LEET.has(leet(f)) || RESERVED_LEET.has(leet(bare))) return true;
  return [[bare, (w) => w], [leet(bare), leet]].some(([g, as]) => {
    const h = without(g, HOUSE_INNOCENT.map(as));
    return HOUSE_ANYWHERE.some((w) => h.includes(as(w))) || HOUSE_AT_EDGE.some((w) => h.startsWith(as(w)) || h.endsWith(as(w)));
  });
}

export function isBlocked(name) {
  const f = fold(name);
  const plain = without(f, INNOCENT);
  const looks = without(leet(f), INNOCENT_LEET);
  return BLOCKED.some((b) => plain.includes(b)) || BLOCKED_LEET.some((b) => looks.includes(b));
}

// Common passwords, compared lowercased. Only entries of 8 or more characters: anything shorter is already refused as
// too short. The usual digit runs and keyboard walks, then the game's own obvious guesses.
export const COMMON_PASSWORDS = new Set([
  '12345678', '123456789', '1234567890', '12345678910', '87654321', '987654321', '11111111', '00000000', '88888888',
  '66666666', '11223344', '12341234', '12121212', '123123123', '147258369', 'password', 'password1', 'password12',
  'password123', 'passw0rd', 'p@ssw0rd', 'iloveyou', 'iloveyou1', 'qwertyui', 'qwertyuiop', 'qwerty123', 'qwerty12',
  '1q2w3e4r', '1q2w3e4r5t', '1qaz2wsx', 'zaq12wsx', 'asdfghjk', 'asdfghjkl', 'asdfasdf', 'abcd1234', 'abc12345',
  'abcdefgh', 'letmein1', 'welcome1', 'sunshine', 'princess', 'football', 'baseball', 'superman', 'trustno1',
  'starwars', 'whatever', 'legendary', 'legendarywhore', 'legendarywhores', 'scandalsheet', 'thescandalsheet',
  'stopthepresses', 'nomdeplume', 'whorescore', 'pickoneforme',
]);
