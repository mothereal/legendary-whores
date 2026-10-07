// The Scandal Sheet · tests for the sign-up's "Pick one for me" names (game/names.js). No dependencies.
// Run: node game/names.test.mjs   (exit code 0 = all passed)
import { ERAS, MIN_LEN, MAX_LEN, NOM_RE, allNames, randomName, cleanNom } from './names.js';
import * as C from '../engine/content.js';

let passed = 0; let failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`ok   ${name}`); }
  catch (e) { failed++; console.log(`FAIL ${name}\n     ${e && e.message ? e.message : e}`); }
}
function ok(c, msg = 'assertion failed') { if (!c) throw new Error(msg); }
// a small seeded generator (mulberry32), so a failure can be replayed
function seeded(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const NAMES = allNames();
const LISTED = Object.values(ERAS).flatMap((e) => [...e.titles, ...e.first, ...e.last, ...e.puns]).filter(Boolean);
// Whole words only, any case. The designer's crutch words (docs/gdd/04-tone-and-humour.md §3), anything explicit or
// anatomical, anything that reads young, religion and nationality jokes, and real people a period pun could land on.
const BANNED = [
  'tuesday', 'somebody', 'nobody', 'mother', 'mum', 'mom', 'mama', 'ma', 'granny',
  'sex', 'sexy', 'porn', 'nude', 'naked', 'fuck', 'shag', 'screw', 'hump', 'bang', 'cock', 'dick', 'prick', 'tit', 'tits',
  'boob', 'boobs', 'breast', 'nipple', 'pussy', 'fanny', 'twat', 'butt', 'arse', 'ass', 'bum', 'booty', 'balls', 'nuts',
  'knockers', 'jugs', 'melons', 'thrust', 'horny', 'orgasm', 'climax', 'erect', 'fetish', 'spank', 'kinky', 'moneyshot',
  'slut', 'whore', 'hooker', 'trollop', 'harlot', 'strumpet', 'tramp', 'bitch', 'ho', 'skank', 'bimbo',
  'girl', 'girlie', 'schoolgirl', 'teen', 'young', 'little', 'baby', 'lolita', 'virgin', 'daddy', 'kid', 'junior',
  'nun', 'priest', 'vicar', 'bishop', 'church', 'god', 'jesus', 'christ', 'holy', 'saint', 'sister', 'pope',
  'french', 'gypsy', 'geisha', 'oriental', 'senorita', 'exotic', 'dixie', 'tribal', 'native',
  'langtry', 'gwyn', 'starr', 'calamity', 'oakley', 'godiva', 'pankhurst', 'monroe', 'presley', 'elvis', 'hilton', 'lovelace',
  'nightingale', 'earp', 'hickok', 'cassidy', 'parton', 'piaf', 'cleopatra',
];
const BANNED_RE = new RegExp(`(^|[^a-z])(${BANNED.join('|')})(?=$|[^a-z])`, 'i');
// The cast already wears these words (engine/content.js): a player's name never borrows one
const TITLES = new Set(['lady', 'lord', 'mr', 'mrs', 'miss', 'the', 'mp', 'iii', 'madam', 'madame']);
const castWords = new Set([...Object.values(C.CHARACTERS), ...Object.values(C.GENTS), ...Object.values(C.TOURISTS)]
  .flatMap((x) => x.name.split(',')[0].replace(/["“”]/g, '').split(/[\s-]+/)).map((w) => w.toLowerCase()).filter((w) => w && !TITLES.has(w)));

test('the format is the login and leaderboard rule: ^[A-Za-z0-9_]{3,24}$', () => {
  ok(String(NOM_RE) === String(/^[A-Za-z0-9_]{3,24}$/) && MIN_LEN === 3 && MAX_LEN === 24, `the rule is ${NOM_RE} (${MIN_LEN}-${MAX_LEN})`);
});

test(`every name matches the format, ${MIN_LEN} to ${MAX_LEN} characters, words joined by single underscores`, () => {
  ok(NAMES.length > 0, 'no names at all');
  for (const n of NAMES) {
    ok(/^[A-Za-z0-9_]{3,24}$/.test(n), `not in the format: ${JSON.stringify(n)}`);
    ok(n.length >= MIN_LEN && n.length <= MAX_LEN, `length ${n.length}: ${n}`);
    ok(/^[A-Z][A-Za-z]*(_[A-Z][A-Za-z]*)+$/.test(n), `not Capitalised_Words_With_Single_Underscores: ${JSON.stringify(n)}`);
  }
  for (const s of LISTED) ok(/^[A-Z][A-Za-z_]*$/.test(s) && !/__|_$/.test(s), `a list entry that would break the format: ${JSON.stringify(s)}`);
});

test('at least 30 x 30 different names', () => {
  ok(NAMES.length >= 900, `only ${NAMES.length} names`);
  ok(new Set(NAMES).size === NAMES.length, 'allNames() repeats itself');
});

test('no list repeats an entry (a repeat would print the same joke twice as often)', () => {
  for (const [era, e] of Object.entries(ERAS)) for (const k of ['titles', 'first', 'last', 'puns']) {
    ok(new Set(e[k]).size === e[k].length, `${era}.${k} has a duplicate`);
  }
});

test('three eras, each with its own first names, surnames and puns', () => {
  ok(['victorian', 'wildwest', 'vegas'].every((k) => ERAS[k]), 'an era is missing');
  for (const [era, e] of Object.entries(ERAS)) ok(e.first.length >= 10 && e.last.length >= 10 && e.puns.length >= 8, `${era} is thin`);
});

test('no banned word in any list or any name', () => {
  for (const s of [...LISTED, ...NAMES]) { const m = s.match(BANNED_RE); ok(!m, `"${s}" contains "${m && m[2]}"`); }
});

test('no name borrows a word from the cast (engine/content.js)', () => {
  ok(castWords.has('dolly') && castWords.has('lavinia') && castWords.has('plunkett'), 'cast words were not read');
  for (const n of NAMES) for (const w of n.toLowerCase().split('_')) ok(!castWords.has(w), `"${n}" borrows "${w}" from the cast`);
});

test('a reroll never repeats the name in the field (2000 seeded rolls, three seeds)', () => {
  for (const seed of [1, 42, 20261007]) {
    const rnd = seeded(seed); let prev = '';
    for (let i = 0; i < 2000; i++) {
      const n = randomName(rnd, prev);
      ok(n !== prev, `seed ${seed}, roll ${i}: "${n}" twice in a row`);
      ok(NOM_RE.test(n), `seed ${seed}, roll ${i}: not in the format: ${n}`);
      prev = n;
    }
  }
});

test('a stuck random source still never repeats (the guard holds)', () => {
  for (const r of [0, 0.5, 0.999999]) {
    const rnd = () => r; let prev = '';
    for (let i = 0; i < 6; i++) { const n = randomName(rnd, prev); ok(n !== prev && NOM_RE.test(n), `rnd=${r}: "${n}" twice in a row, or out of format`); prev = n; }
  }
});

test('every roll is a name the lists can print, and the rolls cover all three eras', () => {
  const all = new Set(NAMES); const rnd = seeded(7); const hit = new Set(); let prev = '';
  const eraOf = (n) => Object.keys(ERAS).find((k) => { const e = ERAS[k]; return e.puns.includes(n) || e.last.some((l) => n.endsWith(`_${l}`)); });
  for (let i = 0; i < 600; i++) { prev = randomName(rnd, prev); ok(all.has(prev), `"${prev}" is not in allNames()`); hit.add(eraOf(prev)); }
  ok(hit.size === 3, `600 rolls reached only ${[...hit].join(', ')}`);
});

test('typing: a space becomes an underscore, anything else outside the format is dropped, the caret stays put', () => {
  const cases = [
    ['Madam X', 7, 'Madam_X', 7], ['Lady Lavinia Bottomley', 22, 'Lady_Lavinia_Bottomley', 22], ['Dusty Garters', 5, 'Dusty_Garters', 5],
    ['Miss D. Meanour', 7, 'Miss_D_Meanour', 6], ['Ruby-Rose!', 10, 'RubyRose', 8], ['née Ça', 6, 'ne_a', 4], ['   ', 3, '___', 3],
    ['O\'Hara 💋 99', 11, 'OHara__99', 8], ['', 0, '', 0], ['A'.repeat(30), 30, 'A'.repeat(24), 24], ['ab cd', 2, 'ab_cd', 2],
  ];
  for (const [raw, at, want, wantAt] of cases) {
    const c = cleanNom(raw, at);
    ok(c.value === want && c.caret === wantAt, `cleanNom(${JSON.stringify(raw)}, ${at}) = ${JSON.stringify(c)}, want ${JSON.stringify({ value: want, caret: wantAt })}`);
  }
  for (const n of NAMES.slice(0, 200)) ok(cleanNom(n).value === n, `cleanNom changed a generated name: ${n}`);
});

test('a tidied value only ever falls short of the format by its length (3 at least), never by a character', () => {
  const rnd = seeded(99); const chars = 'aZ09_ -.!é💋\'"<>';
  for (let i = 0; i < 3000; i++) {
    let raw = ''; const len = Math.floor(rnd() * 32); for (let k = 0; k < len; k++) raw += chars[Math.floor(rnd() * chars.length)];
    const v = cleanNom(raw).value;
    ok(/^[A-Za-z0-9_]{0,24}$/.test(v), `cleanNom(${JSON.stringify(raw)}) = ${JSON.stringify(v)}`);
    ok(NOM_RE.test(v) === (v.length >= MIN_LEN), `length is the only gap: ${JSON.stringify(v)}`);
  }
});

console.log(`\n${passed} passed, ${failed} failed (${NAMES.length} names)`);
process.exitCode = failed ? 1 : 0;
