// Field rules for what players send (docs/server-api.md sections 4 and 5). Cheating is out of scope for v1; garbage and
// markup are not. Tiers, titles and Timelines come from engine/content.js, so the checks cannot drift from the game.

import { ERA_TITLES, TIERS, TIMELINE_IDS } from '../engine/content.js';

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
