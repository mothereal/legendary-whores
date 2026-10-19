// Shared by the server tests (node:test, zero dependencies): temp folders, accounts made straight in the database, a
// child server on a free port, a small HTTP client. Names and passwords are built at runtime, never literals.

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as L from '../../engine/rules.js';
import * as auth from '../auth.mjs';
import { openDb } from '../db.mjs';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SERVER = path.join(REPO, 'server', 'server.mjs');
export const WORLD_SCRIPT = path.join(REPO, 'server', 'world.mjs');
export const BACKUP_SCRIPT = path.join(REPO, 'server', 'backup.mjs');

export function tmpDir(label = 'lw-test') {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${label}-`));
}
export const rmDir = (dir) => fs.rmSync(dir, { recursive: true, force: true });

// A nom de plume in the title page's shape, random so no fixture name is ever a literal.
export const mintName = (prefix = 'T') => `${prefix}_${randomBytes(6).toString('hex')}`;
export const mintPassword = () => randomBytes(12).toString('base64url');
export const nonce = () => `${randomBytes(4).toString('hex')}-${randomBytes(2).toString('hex')}-${randomBytes(2).toString('hex')}-${randomBytes(2).toString('hex')}-${randomBytes(6).toString('hex')}`;

// A user row with a live session, written straight into the file (the sign-up limiter is 5 an hour per address).
// Returns { id, name, token, cookie }.
export function makeUser(db, name = mintName(), now = Date.now()) {
  const token = auth.newToken();
  const user = db.createUser({ name, nameKey: name.toLowerCase(), passHash: 'test', tokenHash: auth.tokenHash(token), oldTokenHash: null, now, expiresAt: now + auth.SESSION_MS });
  if (!user) throw new Error('name taken');
  return { id: user.id, name, token, cookie: `lw_dev=${token}` };
}

// Opens the file without the exclusive lock (the test's own connection), makes `n` users, closes it.
export async function seedUsers(file, n) {
  const db = await openDb(file, { exclusive: false });
  const users = [];
  for (let i = 0; i < n; i++) users.push(makeUser(db));
  db.close();
  return users;
}

export const freePort = () => 20000 + Math.floor(Math.random() * 20000);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let loopback = null;
export async function loopbackAddress() {
  if (!loopback) loopback = (await lookup('localhost', { family: 4 })).address;
  return loopback;
}

// Starts server.mjs as a child with `env` on top of a dev baseline, waits for /api/health (any status) or exit.
// Returns { port, origin, url, child, exited (Promise<{ code, signal }>), stderr(), stdout(), stop(), kill() }.
export async function startServer(env = {}, { waitMs = 8000, health = true } = {}) {
  const port = env.LW_PORT ? Number(env.LW_PORT) : freePort();
  const origin = `http://localhost:${port}`;
  const child = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', SERVER], {
    env: { PATH: process.env.PATH, TZ: process.env.TZ ?? 'UTC', LW_DEV: '1', LW_PORT: String(port), ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = ''; let err = '';
  child.stdout.on('data', (c) => { out += c; });
  child.stderr.on('data', (c) => { err += c; });
  const exited = new Promise((resolve) => child.on('exit', (code, signal) => resolve({ code, signal })));
  let done = false;
  exited.then(() => { done = true; });
  const address = await loopbackAddress();
  const url = `http://${address}:${port}`;
  const t0 = Date.now();
  if (health) {
    while (Date.now() - t0 < waitMs && !done) {
      try { await fetch(`${url}/api/health`); break; } catch { await sleep(50); }
    }
  }
  return {
    port, origin, url, child, exited,
    stderr: () => err, stdout: () => out,
    stop: async () => { if (!done) child.kill('SIGTERM'); return exited; },
    kill: async () => { if (!done) child.kill('SIGKILL'); return exited; },
  };
}

// A client bound to one server and one cookie. get/post return { status, headers, body (parsed JSON or null), text }.
// The actions whose args[0] is the account, not a girl: they carry no `curtain` (docs/server-api.md 12.2).
const ACCOUNT_SCOPED = ['chooseStarter', 'openTimeline', 'markSeen'];

export function client(server, cookie = null) {
  // what the client last heard (every answer that carries views and curtains): each of her girls' Timeline and each
  // Timeline's curtainNo, so an act sent without an explicit `curtain` carries the one a page tapping now would send
  const heard = { tlOf: {}, curtains: {} };
  function learn(b) {
    if (!b || typeof b !== 'object') return;
    if (b.account && Array.isArray(b.account.whores)) for (const w of b.account.whores) if (w && w.id) heard.tlOf[w.id] = w.timeline;
    if (b.views && typeof b.views === 'object') for (const [wid, v] of Object.entries(b.views)) if (v && v.whore) heard.tlOf[wid] = v.whore.timeline;
    if (b.curtains && typeof b.curtains === 'object') for (const [tl, c] of Object.entries(b.curtains)) heard.curtains[tl] = c.curtainNo;
  }
  async function call(method, pathname, body, extraHeaders = {}) {
    const headers = { ...extraHeaders };
    if (cookie) headers.Cookie = cookie;
    if (method !== 'GET') { headers.Origin = server.origin; headers['Content-Type'] = 'application/json'; }
    const res = await fetch(server.url + pathname, { method, headers, body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)) });
    const text = await res.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch { /* not JSON */ }
    if (res.status === 200 || res.status === 201) learn(parsed);
    return { status: res.status, headers: res.headers, body: parsed, text };
  }
  const curtainOf = (wid) => { const tl = heard.tlOf[wid]; return tl && Number.isInteger(heard.curtains[tl]) ? heard.curtains[tl] : null; };
  // An act. `curtain` given (a number, or null for none): sent exactly as given, nothing else done; the tests of the
  // curtain-passed rule pass it. Left out: a girl-targeted act carries her Timeline's curtainNo as last heard (one view
  // first when nothing has been heard of her; 0 for a girl not hers, whom the not-yours gate refuses first), as a page
  // tapping now would. When a Curtain fell since the last answer and the act is refused 409 curtain-passed, the view is
  // asked once and the same body goes up again with the new curtainNo and the same nonce (a refused move leaves no
  // receipt): the tests that do not set `curtain` are about other rules, at a District rate where a Curtain falls every
  // three seconds.
  async function act(action, args, n = nonce(), curtain) {
    if (curtain !== undefined || ACCOUNT_SCOPED.includes(action)) {
      const b = { action, args, nonce: n };
      if (curtain !== undefined && curtain !== null) b.curtain = curtain;
      return call('POST', '/api/act', b);
    }
    const wid = args[0];
    if (curtainOf(wid) === null && typeof wid === 'string') await call('GET', '/api/view?all=1');
    const first = await call('POST', '/api/act', { action, args, nonce: n, curtain: curtainOf(wid) ?? 0 });
    if (first.status !== 409 || !first.body || !first.body.error || first.body.error.code !== 'curtain-passed') return first;
    await call('GET', '/api/view?all=1');
    return call('POST', '/api/act', { action, args, nonce: n, curtain: curtainOf(wid) ?? 0 });
  }
  return {
    get: (p) => call('GET', p),
    post: (p, body, h) => call('POST', p, body, h),
    raw: call,
    act,
    join: (starter) => call('POST', '/api/join', { starter }),
    view: (q = '') => call('GET', `/api/view${q ? `?${q}` : ''}`),
  };
}

// Walks every leaf of a JSON value with (value, path).
export function walk(x, fn, p = '') {
  if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) walk(v, fn, `${p}.${k}`);
  else fn(x, p);
}

// The crowd forecast on the wire (spec-B2 S1; server/world.mjs payload): one entry per view, hers, each { labels, counts,
// known } and nothing else; every key of the three a Place of her Timeline (engine/rules.js crowdHint builds all three
// over C.TIMELINES[tl].places; the view's Timeline where it is at hand, else any Place id); every labels value one of the
// three words crowdHint emits, every counts value a whole number of house girls, and every known entry exactly { id,
// name, short, why, lastSway } with those types, naming a house girl of her own street and never a human (`humans`:
// every human whore id, her own included). `own` is required: the whore ids the caller knows the account holds, from
// its own join and never from the payload, and every key of `views` and of `forecast` must be one of them (fix round 3
// of 2026-10-18, finding 3: the exemption was built from the payload's own keys, so another player's view and forecast
// spliced into the payload passed the walk). Returns the one leaf path pattern a privacy walk may let through under
// `.forecast.<own>.known.`: the five scalars at their exact depth, so a descendant such as `.known.<place>.0.plan.place`
// or `.known.<place>.0.hand.0` fails the walk (fix round of 2026-10-18, finding 2: a prefix exemption let every
// descendant through). The whole forecast is walked too: its only leaves are labels.<place>, counts.<place> and the
// five known scalars, so a nested object under a label or a count fails as well (third code review, finding 4: the
// values under labels and counts went unchecked, and the walkers' `.whore.` exemption let an object through there).
// Throws (assert) on the first thing wrong.
const FORECAST_FIELDS = ['id', 'lastSway', 'name', 'short', 'why'];
// the three words crowdHint emits, copied from engine/rules.js crowdHint (`n >= 3 ? 'busy' : n >= 1 ? 'a few' : 'quiet'`;
// the engine exports no list); T-swarm runs this check over the engine's own payloads every run, so a fourth word there fails it
const CROWD_LABELS = ['quiet', 'a few', 'busy'];
const PLACE_IDS = new Set(Object.keys(L.CONTENT.PLACES));
const reEsc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function forecastLeaf(ownWids) {
  const own = (Array.isArray(ownWids) ? ownWids : [ownWids]).map(reEsc).join('|');
  return new RegExp(`^\\.forecast\\.(${own})\\.known\\.[^.]+\\.\\d+\\.(${FORECAST_FIELDS.join('|')})$`);
}
// every leaf the forecast may hold: the known five (forecastLeaf) and a label or a count straight under its Place
function forecastAnyLeaf(ownWids) {
  const own = (Array.isArray(ownWids) ? ownWids : [ownWids]).map(reEsc).join('|');
  return new RegExp(`^\\.forecast\\.(${own})\\.(labels|counts)\\.[^.]+$`);
}
const plainObject = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
export function checkForecast(p, { humans = [], whores = null, own = null } = {}) {
  assert.ok(Array.isArray(own) && own.length && own.every((w) => typeof w === 'string' && w), 'checkForecast needs the whore ids the account is known to hold (own)');
  assert.ok(p && p.forecast && typeof p.forecast === 'object', 'forecast on the wire');
  assert.ok(p && p.views && typeof p.views === 'object', 'views on the wire');
  const mine = new Set(own);
  for (const wid of Object.keys(p.views)) assert.ok(mine.has(wid), `views.${wid}: not a girl of this account`);
  for (const wid of Object.keys(p.forecast)) assert.ok(mine.has(wid), `forecast.${wid}: not a girl of this account`);
  assert.deepEqual(Object.keys(p.forecast), Object.keys(p.views), 'one forecast entry per view, hers');
  const human = new Set(humans);
  for (const [wid, f] of Object.entries(p.forecast)) {
    assert.ok(plainObject(f), `${wid}: the forecast entry is an object`);
    assert.deepEqual(Object.keys(f).sort(), ['counts', 'known', 'labels'], `${wid}: labels, counts and known only`);
    const tl = p.views[wid] && p.views[wid].whore ? p.views[wid].whore.timeline : null;
    const places = tl && L.CONTENT.TIMELINES[tl] ? new Set(L.CONTENT.TIMELINES[tl].places) : PLACE_IDS;
    for (const part of ['labels', 'counts', 'known']) {
      assert.ok(plainObject(f[part]), `${wid}: ${part} is an object keyed by Place`);
      for (const pid of Object.keys(f[part])) assert.ok(places.has(pid), `${wid}: ${part}.${pid} is not a Place of her Timeline`);
    }
    for (const [pid, v] of Object.entries(f.labels)) assert.ok(typeof v === 'string' && CROWD_LABELS.includes(v), `${wid}: labels.${pid} is not a crowd word (${JSON.stringify(v)})`);
    for (const [pid, v] of Object.entries(f.counts)) assert.ok(Number.isInteger(v) && v >= 0, `${wid}: counts.${pid} is not a count (${JSON.stringify(v)})`);
    for (const [pid, ks] of Object.entries(f.known)) {
      assert.ok(Array.isArray(ks), `${wid}: known.${pid} is a list`);
      ks.forEach((k, i) => {
        const at = `${wid}: known.${pid}.${i}`;
        assert.ok(plainObject(k), `${at} is an entry`);
        assert.deepEqual(Object.keys(k).sort(), FORECAST_FIELDS, `${at}: a known entry carries other than its five fields (${Object.keys(k).join(', ')})`);
        assert.equal(typeof k.id, 'string', `${at}.id`); assert.equal(typeof k.name, 'string', `${at}.name`); assert.equal(typeof k.short, 'string', `${at}.short`);
        assert.ok(k.why === 'gossip' || k.why === 'habit', `${at}.why: ${k.why}`);
        assert.ok(k.lastSway === null || Number.isFinite(k.lastSway), `${at}.lastSway: ${k.lastSway}`);
        assert.ok(k.id !== wid, `${at}: her own girl (${k.id}) in a forecast's known`);
        assert.ok(!human.has(k.id), `${at}: a human (${k.id}) in a forecast's known`);
        if (whores) { const w = whores[k.id]; assert.ok(w && !w.retired && (tl === null || w.timeline === tl), `${at}: ${k.id} is not a house girl of her street`); }
      });
    }
  }
  const leaf = forecastLeaf(own); // from the allowlist, never from the payload's keys
  const any = forecastAnyLeaf(own);
  walk(p.forecast, (v, pth) => {
    const full = `.forecast${pth}`;
    if (/\.known\./.test(full)) assert.ok(leaf.test(full), `${full}: under forecast known, not one of the five scalars`);
    assert.ok(leaf.test(full) || any.test(full), `${full}: a leaf under forecast that is no label, count or known scalar`);
  });
  return leaf;
}

// Runs an operator script (world.mjs or backup.mjs) as a child; resolves { code, out, err }.
export function runScript(script, args, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', script, ...args], { env: { PATH: process.env.PATH, TZ: process.env.TZ ?? 'UTC', ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; let err = '';
    child.stdout.on('data', (c) => { out += c; });
    child.stderr.on('data', (c) => { err += c; });
    child.on('exit', (code) => resolve({ code, out, err }));
  });
}
