// Field rules for what players send (docs/server-api.md sections 4 and 5). Cheating is out of scope for v1; garbage and
// markup are not. Tiers, titles and Timelines come from engine/content.js, so the checks cannot drift from the game.

import { ARTS, CARDS, CHARACTERS, ERA_TITLES, RULES, TIERS, TIMELINE_IDS } from '../engine/content.js';
import { greaseMax } from '../engine/rules.js';

export const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// True when `obj` has every key in `required`, and nothing outside required + optional.
export function hasKeys(obj, required, optional = []) {
  const keys = Object.keys(obj);
  return required.every((k) => Object.hasOwn(obj, k)) && keys.every((k) => required.includes(k) || optional.includes(k));
}

const PRINTABLE_64 = /^[\x20-\x7E]{1,64}$/;

// The save envelope the game already writes to localStorage: { v, at, S, ui }. Only its top level is checked; the server
// never interprets S or ui.
export function checkSave(save) {
  return isPlainObject(save) && hasKeys(save, ['v', 'at', 'S', 'ui'])
    && typeof save.v === 'string' && PRINTABLE_64.test(save.v)
    && Number.isInteger(save.at) && save.at >= 0 && save.at <= Number.MAX_SAFE_INTEGER
    && isPlainObject(save.S) && isPlainObject(save.ui);
}

const ROADS = ['standing', 'notoriety'];
const MAX_WHORESCORE = 1_000_000;

// The board's summary of a player. Returns it rebuilt with its keys in canonical order, or null.
export function checkSummary(s) {
  if (!isPlainObject(s) || !hasKeys(s, ['tier', 'title', 'road', 'whorescore', 'timelines'])) return null;
  const { tier, title, road, whorescore, timelines } = s;
  if (!TIERS.includes(tier) || !ROADS.includes(road)) return null;
  if (!Number.isInteger(whorescore) || whorescore < 0 || whorescore > MAX_WHORESCORE) return null;
  if (!Array.isArray(timelines) || timelines.length < 1 || timelines.length > TIMELINE_IDS.length) return null;
  // distinct known Timelines in game order: each one's index is higher than the one before
  let prev = -1;
  for (const tl of timelines) {
    const i = TIMELINE_IDS.indexOf(tl);
    if (i <= prev) return null;
    prev = i;
  }
  // the title must be one this tier can wear in one of her Timelines
  const fits = timelines.some((tl) => {
    const t = ERA_TITLES[tl][tier];
    return typeof title === 'string' && (t.standing === title || t.notoriety === title);
  });
  if (!fits) return null;
  return { tier, title, road, whorescore, timelines: [...timelines] };
}

const KINDS = ['bug', 'idea', 'rating'];
const MAX_TEXT = 2000;
// control characters other than tab, line feed and carriage return
const CONTROL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/;
const SCREEN = /^[a-z][a-z0-9-]{0,31}$/;

// A letter to the Editor. Returns { kind, rating, text, context } ready to store, or null.
export function checkFeedback(b) {
  if (!isPlainObject(b) || !hasKeys(b, ['kind', 'text', 'context'], ['rating'])) return null;
  const { kind, text, context } = b;
  if (!KINDS.includes(kind)) return null;
  const rating = b.rating ?? null;
  if (kind === 'rating' ? !(Number.isInteger(rating) && rating >= 1 && rating <= 5) : rating !== null) return null;
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  const min = kind === 'rating' ? 0 : 1;
  if (trimmed.length < min || trimmed.length > MAX_TEXT || CONTROL.test(trimmed) || !trimmed.isWellFormed()) return null;
  if (!isPlainObject(context) || !hasKeys(context, ['screen', 'version'])) return null;
  if (typeof context.screen !== 'string' || !SCREEN.test(context.screen)) return null;
  if (typeof context.version !== 'string' || !PRINTABLE_64.test(context.version)) return null;
  return { kind, rating, text: trimmed, context: JSON.stringify({ screen: context.screen, version: context.version }) };
}

// ---- The arena (docs/server-api.md section 12): the allowlist and the argument schemas ------------------------------------

// an id: a character, a gentleman, a Place, an account, or a whore instance `<account>:<character>`; the rehire of a
// character the account retired is `<account>:<character>#n` with n a whole number from 2 (engine createWhore), the
// only place a `#` is admitted. 48 characters at most either way.
export const ID_RE = /^(?=.{1,48}$)(?:[A-Za-z0-9_:-]+|[A-Za-z0-9_-]+:[A-Za-z0-9_-]+#(?:[2-9]|[1-9][0-9]{1,3}))$/;
export const NONCE_RE = /^[0-9a-f-]{36}$/;
export const MAX_ARGS_BYTES = 2048;
export const STARTERS = TIMELINE_IDS.map((tl) => Object.values(CHARACTERS).find((c) => c.role === 'starter' && c.timeline === tl).id);

// The player's moves. Everything else in the engine (resolveCurtain, advanceClock, sleepTillDawn, endSeason, stageRival,
// newGame, joinWorld, the rummage alias) answers unknown-action, exactly like a name that does not exist.
const ARENA_ACTIONS = ['chooseStarter', 'openTimeline', 'study', 'explore', 'buyOffer', 'passOffer', 'dropItem', 'buyCard', 'cure', 'spendGossip',
  'useTalent', 'startAssignation', 'playAssignation', 'cancelAssignation', 'dealLent', 'planEvening', 'sealPlan', 'unseal', 'challengeSeat', 'markSeen', 'buySpecial', 'buyDigs'];
// Held out until the seats UI ships (the client prints "coming soon"): deleting the entry restores the move over the wire.
export const HELD_BACK = ['challengeSeat'];
export const ALLOWED = ARENA_ACTIONS.filter((a) => !HELD_BACK.includes(a));
// Account-scoped actions: the server replaces args[0] with the session's account id, whatever the client sent.
export const ACCOUNT_SCOPED = ['chooseStarter', 'openTimeline', 'markSeen'];

const isId = (v) => typeof v === 'string' && ID_RE.test(v);
const isInt = (v, max = 1000) => Number.isInteger(v) && v >= 0 && v <= max;
const isTick = (v) => Number.isSafeInteger(v) && v >= 0; // a tick has no ceiling of 1000: it counts every event
const isIntArray = (v, maxLen, maxVal = 1000) => Array.isArray(v) && v.length <= maxLen && v.every((x) => isInt(x, maxVal));
const isIdArray = (v, maxLen) => Array.isArray(v) && v.length <= maxLen && v.every(isId);
const optional = (v, check) => v === undefined || v === null || check(v);
const isBool = (v) => typeof v === 'boolean';
// Exactly what the engine takes (the one rule of section 12.2): an item is its id (itemUsable matches `it.id === iid`), a
// Talent is the object validateTalent reads ({ kind, card?, art? }: card and art for Double Entendre), and bribe is the
// Raid Night flag validatePlan reads. The engine does the semantic checks (no-item, not-your-talent, bad-card, no-bribe).
// An Art is an own key of ARTS: "__proto__", "constructor" and "toString" are inherited names, not Arts.
const isArt = (v) => typeof v === 'string' && Object.hasOwn(ARTS, v);
const isTalent = (t) => isPlainObject(t) && hasKeys(t, ['kind'], ['card', 'art']) && isId(t.kind) && optional(t.card, (v) => isInt(v)) && optional(t.art, isArt);
// The most Grease Palms any girl may buy: the engine's greaseMax at the highest Notoriety (RULES.sway.grease.max, +1 at
// each maxUp step). Whether she may buy that many, or any, is the engine's check (no-grease, and greaseMax for her own
// Notoriety); a number above every girl's ceiling is a malformed body.
export const GREASE_TOP = greaseMax({ notoriety: Number.MAX_SAFE_INTEGER });

function checkPlan(p) {
  if (!isPlainObject(p) || !hasKeys(p, ['place', 'cards'], ['item', 'talent', 'grease', 'stake', 'slumOk', 'baseline', 'bribe'])) return false;
  if (!isId(p.place) || !isIntArray(p.cards, RULES.maxCurtainCards)) return false;
  if (!optional(p.item, isId) || !optional(p.talent, isTalent) || !optional(p.grease, (v) => isInt(v, GREASE_TOP))) return false;
  if (!optional(p.stake, isBool) || !optional(p.slumOk, isBool) || !optional(p.bribe, isBool)) return false;
  if (p.baseline !== undefined) {
    if (!Array.isArray(p.baseline) || p.baseline.length > 3) return false;
    // a baseline entry admits key, place and cards only: the engine substitutes her own hand and known (E20)
    // own keys only: "__proto__" and "constructor" are inherited names, not cards
    for (const b of p.baseline) if (!isPlainObject(b) || !hasKeys(b, ['key', 'place', 'cards']) || !isId(b.key) || !isId(b.place) || !isIdArray(b.cards, 3) || !b.cards.every((c) => Object.hasOwn(CARDS, c))) return false;
  }
  return true;
}

// args[1..] per action (args[0] is the whore id or the replaced account id, checked by the handler)
const REST = {
  chooseStarter: (a) => a.length === 1 && isId(a[0]),
  openTimeline: (a) => a.length === 1 && isId(a[0]),
  // [timeline] or [timeline, upTo]: upTo is a tick (the newest Curtain event she has seen), a non-negative safe integer;
  // the engine moves her seen cursor only that far (never past the tick, never back)
  markSeen: (a) => (a.length === 1 || (a.length === 2 && isTick(a[1]))) && TIMELINE_IDS.includes(a[0]),
  study: (a) => a.length === 1 && isId(a[0]),
  explore: (a) => (a.length === 1 && isId(a[0])) || (a.length === 2 && isId(a[0]) && isPlainObject(a[1]) && hasKeys(a[1], ['want']) && isId(a[1].want)),
  buyOffer: (a) => a.length === 0, passOffer: (a) => a.length === 0, cancelAssignation: (a) => a.length === 0, dealLent: (a) => a.length === 0,
  buySpecial: (a) => a.length === 0, buyDigs: (a) => a.length === 0, unseal: (a) => a.length === 0,
  dropItem: (a) => a.length === 1 && isInt(a[0], 2),
  buyCard: (a) => a.length === 1 && isId(a[0]),
  cure: (a) => a.length === 1 && isId(a[0]),
  spendGossip: (a) => a.length === 1 && isId(a[0]),
  useTalent: (a) => a.length === 1 && isPlainObject(a[0]) && hasKeys(a[0], ['kind'], ['card', 'gent', 'place']) && isId(a[0].kind)
    && optional(a[0].card, (v) => isInt(v)) && optional(a[0].gent, isId) && optional(a[0].place, isId),
  startAssignation: (a) => a.length === 1 && isId(a[0]),
  playAssignation: (a) => a.length === 1 && isPlainObject(a[0]) && hasKeys(a[0], ['cards'], ['item', 'talent']) && isIntArray(a[0].cards, RULES.assignMaxCards)
    && a[0].cards.length >= 1 && optional(a[0].item, isId) && optional(a[0].talent, isTalent),
  planEvening: (a) => a.length === 1 && checkPlan(a[0]),
  sealPlan: (a) => a.length === 0 || (a.length === 1 && checkPlan(a[0])),
  challengeSeat: (a) => a.length === 1 && isId(a[0]),
};

// What `legalActions` must list for the action to go ahead: the descriptor key matched against args, or null (always).
export const LEGAL_MATCH = {
  chooseStarter: ['character', 1], openTimeline: ['character', 1], study: ['target', 1], explore: ['place', 1], buyOffer: null, buyCard: ['card', 1],
  cure: ['affliction', 1], spendGossip: ['rival', 1], useTalent: ['kind', 1, 'kind'], startAssignation: ['gent', 1], playAssignation: [null, 0], planEvening: ['place', 1, 'place'],
  buySpecial: [null, 0], buyDigs: [null, 0], unseal: [null, 0], challengeSeat: ['seat', 1],
};

// The act body: { action, args, nonce }, exactly these keys. Returns { code } for a refusal ('unknown-action' |
// 'bad-request') or { action, args, nonce } with args as sent (the handler fixes args[0]).
// `curtain`: the curtainNo of her girl's Timeline when the tap was made (section 12.2). Required on every action that
// targets a girl; an account-scoped action may leave it out, and it is never read for one. Wherever it is sent it is a
// non-negative safe integer.
const isCurtain = (v) => Number.isSafeInteger(v) && v >= 0;

export function checkAct(body) {
  if (!isPlainObject(body) || !hasKeys(body, ['action', 'args', 'nonce'], ['curtain'])) return { code: 'bad-request' };
  const { action, args, nonce } = body;
  if (typeof action !== 'string' || !/^[a-zA-Z]{1,32}$/.test(action)) return { code: 'bad-request' };
  if (!ALLOWED.includes(action)) return { code: 'unknown-action' };
  if (typeof nonce !== 'string' || !NONCE_RE.test(nonce)) return { code: 'bad-request' };
  if (!Array.isArray(args) || args.length < 1 || args.length > 3) return { code: 'bad-request' };
  if (Buffer.byteLength(JSON.stringify(args)) > MAX_ARGS_BYTES) return { code: 'bad-request' };
  if (!isId(args[0]) && !ACCOUNT_SCOPED.includes(action)) return { code: 'bad-request' };
  if (!REST[action](args.slice(1))) return { code: 'bad-request' };
  const scoped = ACCOUNT_SCOPED.includes(action);
  if (Object.hasOwn(body, 'curtain') ? !isCurtain(body.curtain) : !scoped) return { code: 'bad-request' };
  return { action, args, nonce, curtain: scoped ? null : body.curtain };
}

// The join body: { starter }, one of the three starters.
export function checkJoin(body) {
  if (!isPlainObject(body) || !hasKeys(body, ['starter']) || !STARTERS.includes(body.starter)) return null;
  return body.starter;
}

// True when legalActions (the engine's list for the whore or the account) admits the action with these args.
export function legalMatch(action, args, legal) {
  // sealPlan: listed as sealPlan when no plan is passed, else planEvening with that place
  if (action === 'sealPlan') return args.length === 1 ? legal.some((d) => d.type === 'sealPlan') : legal.some((d) => d.type === 'planEvening' && d.place === args[1].place);
  const m = LEGAL_MATCH[action];
  if (m === undefined || m === null) return true;
  const [key, idx, sub] = m;
  return legal.some((d) => d.type === action && (key === null || d[key] === (sub ? args[idx] && args[idx][sub] : args[idx])));
}
