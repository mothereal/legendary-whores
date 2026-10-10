#!/usr/bin/env node
// The game server: accounts (a nom de plume and a password), one cloud save per player, Letters to the Editor, the
// Players board and the arena (one world, joined and played over /api/join, /api/act and /api/view; server/world.mjs
// holds it). The contract is docs/server-api.md: change it first, then this. Zero dependencies (node:http, node:sqlite,
// node:crypto), Node 22 or later. Run instructions: server/README.md.

import http from 'node:http';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as auth from './auth.mjs';
import { openDb, SchemaTooNewError } from './db.mjs';
import { ipKeys, limits, sweepAll } from './limits.mjs';
import { staticServer } from './static.mjs';
import { ACCOUNT_SCOPED, checkAct, checkFeedback, checkJoin, checkSave, checkSummary, hasKeys, ID_RE, legalMatch, STARTERS } from './validate.mjs';
import { CurtainPassed, envOpts, IllegalMove, openWorld, TooManyMoves, WorldRefusal } from './world.mjs';
import { CHARACTERS } from '../engine/content.js';
import { MAX_READABLE } from './db.mjs';

// ---- Configuration (section 3). A bad setting stops the server with status 2 and one line on stderr. ------------------

function die(message) {
  console.error(`lw-server: ${message}`);
  process.exit(2);
}
const env = (name) => (process.env[name] === '' ? undefined : process.env[name]);

function isBareOrigin(o) {
  if (!/^https?:\/\/[^/?#\s]+$/.test(o)) return false;
  try { return new URL(o).origin === o; } catch { return false; }
}

const DEV = env('LW_DEV') === '1';
if (env('LW_DEV') !== undefined && !DEV) die('LW_DEV must be 1 or unset');
const PORT_TEXT = env('LW_PORT') ?? '8091';
const PORT = /^[0-9]{1,5}$/.test(PORT_TEXT) ? Number(PORT_TEXT) : 0;
if (PORT < 1 || PORT > 65535) die('LW_PORT must be an integer from 1 to 65535');
const DB_FILE = env('LW_DB');
if (!DB_FILE) die('LW_DB is required: the SQLite file, outside the repository (or :memory: for a throwaway run)');
const ORIGIN = env('LW_ORIGIN') ?? (DEV ? `http://localhost:${PORT}` : 'https://legendarywhores.com');
if (!isBareOrigin(ORIGIN)) die('LW_ORIGIN must be a bare origin, http(s)://host[:port], with nothing after it');
if (DEV && ORIGIN.startsWith('https:')) die('LW_DEV=1 with an https origin: dev mode is never for the live site');
if (!DEV && ORIGIN.startsWith('http:')) die('an http origin needs LW_DEV=1');

// The world's settings (LW_MIN_PER_SEC, LW_DAY_START, LW_LOG_LIMIT, LW_WORLD_CAP, LW_TL_CAP, LW_STANDIN_SEAL, LW_SNAPSHOT_*,
// LW_BACKUP_KEEP, LW_WORLD_RESET), each refused with one line (world.mjs envOpts)
let WORLD_OPTS;
try { WORLD_OPTS = envOpts(); } catch (err) { die(err.message); }
// dev-only hooks for the server tests: the next tick a request runs throws; the timer tick never stamps lastTickAt; the
// N-th accepted action's answer is dropped on the floor (the action landed, the socket closes), for the tests of a lost answer
for (const name of ['LW_DEV_TICK_THROW', 'LW_DEV_STALL_TICK', 'LW_DEV_DROP_ACT_REPLY']) {
  if (env(name) !== undefined && !DEV) die(`${name} needs LW_DEV=1`);
  if (name !== 'LW_DEV_DROP_ACT_REPLY' && env(name) !== undefined && env(name) !== '1') die(`${name} must be 1 or unset`);
}
const DEV_HOOKS = DEV ? { throwNextRequestTick: env('LW_DEV_TICK_THROW') === '1', stallTick: env('LW_DEV_STALL_TICK') === '1' } : undefined;
const DROP_ACT_REPLY_AT = env('LW_DEV_DROP_ACT_REPLY') === undefined ? 0 : (/^[1-9][0-9]{0,5}$/.test(env('LW_DEV_DROP_ACT_REPLY')) ? Number(env('LW_DEV_DROP_ACT_REPLY')) : NaN);
if (Number.isNaN(DROP_ACT_REPLY_AT)) die('LW_DEV_DROP_ACT_REPLY must be a count from 1 to 999999 or unset');
let actsAnswered = 0;

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOUR = 3_600_000;
const SMALL_BODY = 16 * 1024;
const SAVE_BODY = 1024 * 1024;

// ---- Errors (section 8): a code, a status and a line in the game's voice; never an internal detail -------------------

const ERRORS = {
  'bad-origin': [403, 'Letters for the Editor come through the front door of this paper, not the tradesmen\'s entrance.'],
  'bad-content-type': [403, 'The compositor only sets copy marked application/json.'],
  'bad-json': [400, 'The telegram arrived in pieces, and the boy swears he ran all the way.'],
  'too-large': [413, 'That parcel won\'t fit through the letterbox.'],
  'bad-request': [400, 'The clerk has sent your form back with every wrong box circled in red.'],
  'name-format': [400, 'Letters, numbers and underscores, 3 to 24. No spaces: the printer\'s run out.'],
  'name-reserved': [400, 'That name belongs to the house. Tap the dice for another.'],
  'name-taken': [409, 'That name\'s taken.'],
  'password-short': [400, 'Eight characters at least, or a corset would be harder to get into.'],
  'password-long': [400, '128 characters at most. The rest belongs in your memoirs.'],
  'password-name': [400, 'A password that matches your name is the first thing a blackmailer tries.'],
  'password-common': [400, 'Every pickpocket in town already knows that password.'],
  'bad-login': [401, 'Wrong name or wrong password. We won\'t say which.'],
  'not-signed-in': [401, 'Your name\'s not on tonight\'s list. Log in at the front desk.'],
  'bad-save': [400, 'The pages came back out of order, so that save didn\'t go through.'],
  'bad-summary': [400, 'The society column won\'t print a title it\'s never heard of.'],
  'bad-feedback': [400, 'Letters to the Editor take a bug, an idea or one to five stars, in under two thousand characters.'],
  'rate-limited': [429, 'Too many requests. Try again later.'],
  'busy': [503, 'Every clerk is checking passwords at once, so try again in a few seconds.'],
  'not-found': [404, 'No such page in this edition.'],
  'method-not-allowed': [405, 'This desk doesn\'t handle that kind of business.'],
  'server-error': [500, 'The presses have jammed. Give it a minute and try again.'],
  'down': [503, 'The presses are stopped for now. Back soon.'],
  // the arena (section 12)
  'not-in-world': [403, 'You haven\'t picked a girl yet. See the front desk.'],
  'already-in-world': [409, 'You\'re already on the street.'],
  'world-full': [503, 'Every room on the street is taken tonight. Try again after the next Curtain.'],
  'timeline-full': [503, 'That street is full tonight. The other two have room.'],
  'unknown-action': [400, 'No such move in this edition.'],
  'not-yours': [403, 'That girl isn\'t yours to send out.'],
  'not-legal': [400, 'She can\'t do that just now.'],
  'illegal-move': [400, 'She can\'t do that just now.'], // the engine's own line replaces this one (sendError's override)
  'too-many-moves': [429, 'Your girls have made more moves in two days than the clerk can file. Try again later.'],
  'curtain-passed': [409, 'The Curtain fell before that move went in.'],
  'world-down': [503, 'The street is closed for repairs. Back soon.'],
};

// Thrown by handlers to answer with an error code (and any extra headers). `message` overrides the fixed line for
// illegal-move only (the engine's RulesError text, with its code as `reason`); `data` is an extra object on the answer
// (timeline-full's `open`).
class Fail extends Error {
  constructor(code, headers = {}, { message = null, reason = null, data = null } = {}) {
    super(code);
    this.code = code;
    this.headers = headers;
    this.override = message;
    this.reason = reason;
    this.data = data;
  }
}
// For a limiter's answer: 0 goes ahead, anything else is the wait in seconds.
function rateCheck(seconds) {
  if (seconds) throw new Fail('rate-limited', { 'Retry-After': String(seconds) });
}

// Stack frames only: an error message can quote input (a name, a body), and nothing a player sent is ever logged.
function logError(err) {
  const frames = String(err?.stack ?? '').split('\n').filter((l) => /^\s+at /.test(l)).join('\n');
  console.error(`lw-server: server-error ${err?.name ?? 'Error'}${err?.code ? ` ${err.code}` : ''}\n${frames}`);
}

// ---- Responses: JSON, no-store, nosniff, and no CORS headers at all ----------------------------------------------------

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

// ctx.cookie is a Set-Cookie value to send with whatever the answer turns out to be; ctx.close ends the connection after
// it (a refused body is not read to the end).
function send(res, ctx, status, body, extra = {}) {
  if (res.headersSent || res.destroyed) return;
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  const headers = { ...JSON_HEADERS, ...extra, 'Content-Length': Buffer.byteLength(text) };
  if (ctx.cookie) headers['Set-Cookie'] = ctx.cookie;
  if (ctx.close) headers.Connection = 'close';
  res.writeHead(status, headers);
  res.end(text);
}

function sendError(res, ctx, code, extra = {}, { message: override = null, reason = null, data = null } = {}) {
  const [status, message] = ERRORS[code];
  const error = { code, message: code === 'illegal-move' && override ? override : message };
  if (reason) error.reason = reason;
  if (data) error.data = data;
  send(res, ctx, status, { error }, extra);
}

// ---- Request hygiene for POST and PUT (section 1), in the contract's order ---------------------------------------------

const JSON_TYPE = /^application\/json\s*(?:;\s*charset\s*=\s*"?utf-8"?\s*)?$/i;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const utf8 = new TextDecoder('utf-8', { fatal: true });

// Request hygiene for a non-GET request, from its headers alone (section 1, steps 1 to 3). Nothing is read yet, so a
// request turned away here or by the rate and session checks that follow costs no parsing.
function admit(req, ctx, cap) {
  ctx.unread = true;
  if (req.headers.origin !== ORIGIN) throw new Fail('bad-origin');
  if (!JSON_TYPE.test(req.headers['content-type'] ?? '')) throw new Fail('bad-content-type');
  const declared = req.headers['content-length'];
  if (declared !== undefined && Number(declared) > cap) { ctx.close = true; throw new Fail('too-large'); }
}

// The body, read up to the cap and parsed (section 1, steps 3 and 4). Call admit first.
async function readJson(req, res, ctx, cap, { allowEmpty = false } = {}) {
  ctx.unread = false;
  if (req.expectsContinue) res.writeContinue(); // every check passed: now the client may send the body
  const buf = await readBody(req, ctx, cap);
  if (buf.length === 0 && allowEmpty) return {};
  let body;
  try {
    body = JSON.parse(utf8.decode(buf), (key, value) => {
      if (FORBIDDEN_KEYS.has(key)) throw new Error('forbidden key');
      return value;
    });
  } catch {
    throw new Fail('bad-json');
  }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new Fail('bad-json');
  return body;
}

function readBody(req, ctx, cap) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;
    const settle = (err, value) => {
      if (settled) return;
      settled = true;
      if (err) reject(err); else resolve(value);
    };
    req.on('data', (chunk) => {
      if (settled) return; // past the cap: the rest is let through and dropped
      size += chunk.length;
      if (size > cap) { ctx.close = true; chunks.length = 0; settle(new Fail('too-large')); return; }
      chunks.push(chunk);
    });
    req.on('end', () => settle(null, Buffer.concat(chunks, size)));
    req.on('error', () => settle(new Fail('bad-json')));
    req.on('close', () => settle(new Fail('bad-json'))); // the client left before the body ended
  });
}

// ---- Who is asking -----------------------------------------------------------------------------------------------------

// Rate-limit keys for the client's address, { ip, wide } (limits.mjs ipKeys: an IPv6 client is keyed on its /64). Live:
// CF-Connecting-IP and nothing else; when it is missing or malformed the socket address (the front web server's) stands
// in, putting all such requests in one shared bucket. Dev: the socket.
let warnedNoClientIp = false;
function clientKeys(req) {
  let ip;
  if (!DEV) {
    const header = req.headers['cf-connecting-ip'];
    if (typeof header === 'string' && isIP(header)) ip = header;
    else if (!warnedNoClientIp) {
      warnedNoClientIp = true;
      console.warn('lw-server: warning: a request came without a valid CF-Connecting-IP; such requests share one rate-limit bucket');
    }
  }
  return ipKeys(ip ?? req.socket.remoteAddress ?? 'unknown');
}

const jar = auth.cookieJar(DEV);

// The signed-in player, or null. A dead cookie is cleared; a live one is renewed at most once a day (section 2).
function signedIn(req, ctx) {
  const token = jar.read(req.headers.cookie);
  if (!token) return null;
  const tokenHash = auth.tokenHash(token);
  const now = Date.now();
  const row = db.sessionUser(tokenHash, now);
  if (!row) { ctx.cookie = jar.clear(); return null; }
  if (row.expires_at < now + auth.RENEW_BEFORE_MS) {
    db.renewSession({ userId: row.id, tokenHash, now, expiresAt: now + auth.SESSION_MS });
    ctx.cookie = jar.set(token);
  }
  return { id: row.id, name: row.name, saveUpdatedAt: row.save_updated_at ?? null };
}

// The session the request's cookie names, live or not: sign-up and login delete it before starting a new one.
function oldTokenHash(req) {
  const token = jar.read(req.headers.cookie);
  return token ? auth.tokenHash(token) : null;
}

// ---- Endpoints (section 4) ---------------------------------------------------------------------------------------------

function nameAndPassword(body) {
  if (!hasKeys(body, ['name', 'password']) || typeof body.name !== 'string' || typeof body.password !== 'string') {
    throw new Fail('bad-request');
  }
  return body;
}

function health(req, res, ctx) {
  let ok = false;
  try { ok = db.ping(); } catch { ok = false; }
  if (!ok) throw new Fail('down', { 'Retry-After': '30' });
  // the world: loaded, ticking (lastTickAt within 10 s) and its journal bounded (seq - snapSeq within LW_SNAPSHOT_MAX_LAG)
  const h = world ? world.health() : { ok: false };
  if (!h.ok) throw new Fail('world-down', { 'Retry-After': '30' });
  send(res, ctx, 200, { ok: true, world: h.world });
}

async function signup(req, res, ctx) {
  admit(req, ctx, SMALL_BODY);
  const key = clientKeys(req);
  if (key.wide) rateCheck(limits.signupWide.hit(key.wide));
  rateCheck(limits.signup.hit(key.ip));
  const { name, password } = nameAndPassword(await readJson(req, res, ctx, SMALL_BODY));
  const nameErr = auth.nameProblem(name);
  if (nameErr) throw new Fail(nameErr);
  const pw = password.normalize('NFC');
  const pwErr = auth.passwordProblem(pw, name);
  if (pwErr) throw new Fail(pwErr);
  const nameKey = name.toLowerCase();
  if (db.nameTaken(nameKey)) throw new Fail('name-taken'); // before hashing; createUser re-checks after it
  const passHash = await auth.hashPassword(pw);
  const token = auth.newToken();
  const now = Date.now();
  const user = db.createUser({
    name, nameKey, passHash, tokenHash: auth.tokenHash(token), oldTokenHash: oldTokenHash(req), now,
    expiresAt: now + auth.SESSION_MS,
  });
  if (!user) throw new Fail('name-taken');
  ctx.cookie = jar.set(token);
  send(res, ctx, 201, { user: { name, saveUpdatedAt: null } });
}

async function login(req, res, ctx) {
  admit(req, ctx, SMALL_BODY);
  rateCheck(limits.loginIp.hit(clientKeys(req).ip));
  const { name, password } = nameAndPassword(await readJson(req, res, ctx, SMALL_BODY));
  if (!auth.NAME_RE.test(name)) throw new Fail('name-format');
  const nameKey = name.toLowerCase();
  // Counted as a failure before the hash starts, so logins running side by side cannot pass the limit together; taken
  // back below if the password matches, or if it was never checked because the hash queue was full.
  rateCheck(limits.loginName.hit(nameKey));
  const pw = password.normalize('NFC');
  let user = null;
  try {
    if (auth.passwordLength(pw) <= auth.PASSWORD_MAX) {
      const found = db.userByKey(nameKey);
      // one scrypt whether or not the name exists (an unknown name hashes against the start-up dummy)
      if (await auth.verifyPassword(pw, found ? found.pass_hash : null)) user = found;
    }
  } catch (err) {
    if (err instanceof auth.BusyError) limits.loginName.refund(nameKey);
    throw err;
  }
  if (!user) throw new Fail('bad-login');
  limits.loginName.refund(nameKey);
  const token = auth.newToken();
  const now = Date.now();
  db.startSession({
    userId: user.id, tokenHash: auth.tokenHash(token), oldTokenHash: oldTokenHash(req), now,
    expiresAt: now + auth.SESSION_MS,
  });
  ctx.cookie = jar.set(token);
  send(res, ctx, 200, { user: { name: user.name, saveUpdatedAt: db.saveUpdatedAt(user.id) } });
}

async function logout(req, res, ctx) {
  admit(req, ctx, SMALL_BODY);
  const body = await readJson(req, res, ctx, SMALL_BODY, { allowEmpty: true });
  if (!hasKeys(body, [])) throw new Fail('bad-request');
  const old = oldTokenHash(req);
  if (old) db.deleteSession(old);
  ctx.cookie = jar.clear();
  send(res, ctx, 200, { ok: true });
}

function me(req, res, ctx) {
  const user = signedIn(req, ctx);
  send(res, ctx, 200, {
    user: user && { name: user.name, saveUpdatedAt: user.saveUpdatedAt, member: world.isMember(user.id) },
    crowd: world.crowd(), tlCap: world.tlCap,
  });
}

function getSave(req, res, ctx) {
  const user = signedIn(req, ctx);
  if (!user) throw new Fail('not-signed-in');
  const row = db.getSave(user.id);
  if (!row) return send(res, ctx, 200, { save: null, updatedAt: null });
  // data is JSON.stringify of an object this server checked, so it is spliced in as it is
  send(res, ctx, 200, `{"save":${row.data},"updatedAt":${row.updated_at}}`);
}

// Save bodies being read or parsed at once, across all players: each is up to 1 MiB in memory, so a burst of uploads
// waits its turn (503 busy, and the client tries again at its next save) instead of filling the heap.
const MAX_SAVE_BODIES = 8;
let saveBodies = 0;

async function putSave(req, res, ctx) {
  // The headers, the session and the upload limit come first: a stranger's body is never read or parsed.
  admit(req, ctx, SAVE_BODY);
  const user = signedIn(req, ctx);
  if (!user) throw new Fail('not-signed-in');
  if (saveBodies >= MAX_SAVE_BODIES) throw new Fail('busy', { 'Retry-After': '2' });
  rateCheck(limits.save.hit(user.id));
  saveBodies++;
  let body;
  try {
    body = await readJson(req, res, ctx, SAVE_BODY);
  } finally {
    saveBodies--;
  }
  if (!hasKeys(body, ['save', 'summary'])) throw new Fail('bad-request');
  if (!checkSave(body.save)) throw new Fail('bad-save');
  const summary = checkSummary(body.summary);
  if (!summary) throw new Fail('bad-summary');
  // Re-serialised from the parsed object, so a rejected key can never be stored. The cap applies to what is stored as
  // well as to what was sent: numbers can come back longer (1e20 is 4 bytes in and 21 out).
  const data = JSON.stringify(body.save);
  if (Buffer.byteLength(data) > SAVE_BODY) throw new Fail('too-large');
  const updatedAt = db.putSave(user.id, data, JSON.stringify(summary), Date.now());
  send(res, ctx, 200, { updatedAt });
}

function parseLimit(query) {
  const params = new URLSearchParams(query);
  const keys = [...params.keys()];
  if (keys.length === 0) return 50;
  if (keys.length !== 1 || keys[0] !== 'limit') throw new Fail('bad-request');
  const value = params.get('limit');
  const n = /^[0-9]{1,3}$/.test(value) ? Number(value) : 0;
  if (n < 1 || n > 100) throw new Fail('bad-request');
  return n;
}

// The board comes from the world (section 12): every account on the Whorescore board, house players tagged. The cloud
// saves are no longer read here (db.players stays prepared for the record).
function players(req, res, ctx, query) {
  rateCheck(limits.players.hit(clientKeys(req).ip));
  const limit = parseLimit(query);
  send(res, ctx, 200, { players: world.players(limit) });
}

// ---- The arena (section 12) -------------------------------------------------------------------------------------------

// The session's account in the world, or 403 not-in-world (a member whose every girl is retired is not in the world either).
function memberAccount(user) {
  const id = world.memberOf(user.id);
  if (!id || !world.hasLiveWhore(id)) throw new Fail('not-in-world');
  return id;
}

// The whole view payload for an account (world.payload), with `events` from `tickBefore` and the gap rule of section 12.3.
function answerView(res, ctx, status, accountId, opts) {
  send(res, ctx, status, world.payload(accountId, opts));
}

async function join(req, res, ctx) {
  admit(req, ctx, SMALL_BODY);
  const user = signedIn(req, ctx);
  if (!user) throw new Fail('not-signed-in');
  rateCheck(limits.joinIp.hit(clientKeys(req).ip));
  rateCheck(limits.join.hit(user.id));
  const body = await readJson(req, res, ctx, SMALL_BODY);
  const starter = checkJoin(body);
  if (!starter) throw new Fail('bad-request');
  const existing = world.memberOf(user.id);
  if (existing && world.hasLiveWhore(existing)) throw new Fail('already-in-world');
  if (!existing && world.members.size >= world.cap) throw new Fail('world-full', { 'Retry-After': '600' });
  const crowd = world.crowd();
  if (crowd[CHARACTERS[starter].timeline] >= world.tlCap) {
    const open = STARTERS.filter((c) => crowd[CHARACTERS[c].timeline] < world.tlCap);
    throw new Fail('timeline-full', { 'Retry-After': '600' }, { data: { open } });
  }
  const { tickBefore, accountId } = world.join(user, starter);
  answerView(res, ctx, 201, accountId, { all: true, tick: tickBefore });
}

async function act(req, res, ctx) {
  admit(req, ctx, SMALL_BODY);
  const user = signedIn(req, ctx);
  if (!user) throw new Fail('not-signed-in');
  const accountId = memberAccount(user);
  rateCheck(limits.act.hit(user.id));
  const body = await readJson(req, res, ctx, SMALL_BODY);
  const checked = checkAct(body);
  if (checked.code) throw new Fail(checked.code);
  const { action, nonce } = checked;
  const all = action === 'chooseStarter' || action === 'openTimeline';
  // the nonce before anything else (section 12.4): a re-post of an action that already landed (any receipt of the
  // account's in world_nonces, however many actions came after) is answered with the current payload, every live girl's
  // view and replayed: true, whatever the street's count or her legal moves say NOW (a landed sealPlan is no longer legal,
  // a landed openTimeline may have filled the street). Every view, because args[0] has not been validated yet and the
  // girl the action was for must come back fresh. world.apply keeps the same check as a second guard, and the table's
  // primary key is the last word on the pair.
  if (world.nonceSeen(accountId, nonce)) return answerView(res, ctx, 200, accountId, { replayed: true, all: true });
  // then the storage cap (section 12.4): an account holding NONCE_KEEP_PER_ACCOUNT receipts younger than NONCE_KEEP_MS
  // lands nothing new until its oldest leaves the window (a receipt a re-post may need is never deleted to make room)
  const full = world.movesWait(accountId);
  if (full) throw new Fail('too-many-moves', { 'Retry-After': String(full) });
  const args = [...checked.args];
  let who;
  if (ACCOUNT_SCOPED.includes(action)) {
    args[0] = accountId; who = accountId;
    // a full street is not offered (canOpen is filtered in the payload) and not taken either: the same count as join's
    if (action === 'chooseStarter' || action === 'openTimeline') {
      const crowd = world.crowd(); const ch = CHARACTERS[args[1]];
      if (ch && crowd[ch.timeline] >= world.tlCap) throw new Fail('timeline-full', { 'Retry-After': '600' }, { data: { open: STARTERS.filter((c) => crowd[CHARACTERS[c].timeline] < world.tlCap) } });
    }
  } else {
    // her own live girl, or 403: the engine's assertOwns, before any mutator
    if (!world.owns(accountId, args[0])) throw new Fail('not-yours');
    who = args[0];
    // the move was tapped under her Timeline's Curtain `curtain` (section 12.4): once that Curtain has fallen it is refused,
    // never applied to the next night. After the nonce, so a move that landed before the fall replays; world.apply checks
    // again after its catch-up tick, which may bring the Curtain down inside this request.
    if (world.curtainOf(who) !== checked.curtain) throw new Fail('curtain-passed');
  }
  if (!legalMatch(action, args, world.legalFor(who))) throw new Fail('not-legal');
  let out;
  try { out = world.apply(accountId, action, args, nonce, ACCOUNT_SCOPED.includes(action) ? null : checked.curtain); } catch (err) {
    if (err instanceof IllegalMove) throw new Fail('illegal-move', {}, { message: err.message, reason: err.reason });
    if (err instanceof TooManyMoves) throw new Fail('too-many-moves', { 'Retry-After': String(err.retryAfter) });
    if (err instanceof CurtainPassed) throw new Fail('curtain-passed');
    throw err;
  }
  if (out.replayed) return answerView(res, ctx, 200, accountId, { replayed: true, all: true });
  if (DROP_ACT_REPLY_AT && ++actsAnswered === DROP_ACT_REPLY_AT) { req.socket.destroy(); return; } // dev only: the answer is lost, the action landed
  answerView(res, ctx, 200, accountId, { all, tick: out.tickBefore, focus: ACCOUNT_SCOPED.includes(action) ? null : who });
}

const VIEW_KEYS = ['since', 'tick', 'focus', 'all', 'boards', 'digest'];
function parseViewQuery(query) {
  const params = new URLSearchParams(query);
  const out = { since: 0, tick: 0, focus: null, all: false, boards: false, digest: false };
  const seen = new Set();
  for (const [k, v] of params) {
    if (!VIEW_KEYS.includes(k) || seen.has(k)) throw new Fail('bad-request');
    seen.add(k);
    if (k === 'since' || k === 'tick') { if (!/^[0-9]{1,15}$/.test(v)) throw new Fail('bad-request'); out[k] = Number(v); } else if (k === 'focus') { if (!ID_RE.test(v)) throw new Fail('bad-request'); out.focus = v; } else { if (v !== '0' && v !== '1') throw new Fail('bad-request'); out[k] = v === '1'; }
  }
  return out;
}

function view(req, res, ctx, query) {
  const user = signedIn(req, ctx);
  if (!user) throw new Fail('not-signed-in');
  const accountId = memberAccount(user);
  rateCheck(limits.view.hit(user.id));
  const q = parseViewQuery(query);
  // `boot` on the short answer too: a restarted server whose rev happens to equal hers is not "the same" world
  if (q.since === world.rev) return send(res, ctx, 200, { same: true, boot: world.boot, rev: world.rev, serverNow: Date.now(), clock: world.state.clock });
  answerView(res, ctx, 200, accountId, { focus: q.focus, all: q.all, boards: q.boards, digest: q.digest, tick: q.tick });
}

function profile(req, res, ctx, query) {
  const user = signedIn(req, ctx);
  if (!user) throw new Fail('not-signed-in');
  const accountId = memberAccount(user);
  rateCheck(limits.view.hit(user.id));
  const params = new URLSearchParams(query);
  const keys = [...params.keys()];
  if (keys.length !== 1 || keys[0] !== 'whore' || !ID_RE.test(params.get('whore'))) throw new Fail('bad-request');
  const out = world.profile(accountId, params.get('whore'));
  if (!out) throw new Fail('not-found');
  send(res, ctx, 200, out);
}

async function feedback(req, res, ctx) {
  admit(req, ctx, SMALL_BODY);
  rateCheck(limits.feedback.hit(clientKeys(req).ip));
  const body = await readJson(req, res, ctx, SMALL_BODY);
  const letter = checkFeedback(body);
  if (!letter) throw new Fail('bad-feedback');
  const user = signedIn(req, ctx);
  db.addFeedback({ userId: user ? user.id : null, ...letter, now: Date.now() });
  send(res, ctx, 201, { ok: true });
}

const ROUTES = new Map([
  ['/api/health', { GET: health }],
  ['/api/signup', { POST: signup }],
  ['/api/login', { POST: login }],
  ['/api/logout', { POST: logout }],
  ['/api/me', { GET: me }],
  ['/api/save', { GET: getSave, PUT: putSave }],
  ['/api/players', { GET: players }],
  ['/api/feedback', { POST: feedback }],
  ['/api/join', { POST: join }],
  ['/api/act', { POST: act }],
  ['/api/view', { GET: view }],
  ['/api/profile', { GET: profile }],
]);

// Exact paths only. Unknown path: 404. Known path, wrong method (HEAD and OPTIONS included): 405 with Allow.
async function handle(req, res) {
  const ctx = { cookie: null, close: false, unread: false };
  try {
    const raw = req.url ?? '';
    if (!raw.startsWith('/')) throw new Fail('not-found');
    const q = raw.indexOf('?');
    const pathname = q < 0 ? raw : raw.slice(0, q);
    const query = q < 0 ? '' : raw.slice(q + 1);
    const route = ROUTES.get(pathname);
    if (!route) {
      if (serveStatic && !pathname.startsWith('/api/')) {
        const code = await serveStatic(req, res, pathname);
        if (code) throw new Fail(code, code === 'method-not-allowed' ? { Allow: 'GET, HEAD' } : {});
        return;
      }
      throw new Fail('not-found');
    }
    const handler = Object.hasOwn(route, req.method) ? route[req.method] : null;
    if (!handler) throw new Fail('method-not-allowed', { Allow: Object.keys(route).join(', ') });
    await handler(req, res, ctx, query);
  } catch (err) {
    // Turned away before the body was read (wrong origin, a rate limit, no session). After the answer, Node reads what
    // is left and drops it unparsed, which costs nothing and keeps the answer from being lost to a connection reset
    // under a client that is still sending. admit capped a declared length; a body of no declared length is not
    // waited for: the connection closes instead.
    if (ctx.unread && req.headers['content-length'] === undefined) ctx.close = true;
    if (err instanceof Fail) return sendError(res, ctx, err.code, err.headers, { message: err.override, reason: err.reason, data: err.data });
    if (err instanceof auth.BusyError) return sendError(res, ctx, 'busy', { 'Retry-After': '2' });
    logError(err);
    sendError(res, ctx, 'server-error');
  }
}

// ---- Start -------------------------------------------------------------------------------------------------------------

let db;
try {
  db = await openDb(DB_FILE, { onMigrate: (from, to) => console.log(`lw-server: migrating the database from schema ${from} to ${to} (backup first)`) });
} catch (err) {
  if (err instanceof SchemaTooNewError) die(`the database is newer than this server (${err.message}; this server knows ${MAX_READABLE})`);
  console.error(`lw-server: cannot open the database (${err?.code ?? err?.name ?? 'error'})`);
  process.exit(1);
}
process.on('uncaughtException', (err) => { logError(err); process.exit(1); });
process.on('unhandledRejection', (err) => { logError(err); process.exit(1); });

// The world, before anything listens: load or create, replay the journal, catch the clock up (section 12.8). A refusal is
// one line and exit 2, so the deploy's health poll fails and rolls back rather than wipe accepted state.
let world;
try {
  world = await openWorld(db, { ...WORLD_OPTS, devHooks: DEV_HOOKS, log: (line) => console.error(line) });
} catch (err) {
  if (err instanceof WorldRefusal || err.name === 'LockHeld') { console.error(err.message); process.exit(err.exitCode); }
  logError(err);
  process.exit(1);
}

await auth.initDummy();
const serveStatic = DEV ? staticServer(REPO_ROOT) : null;

const server = http.createServer({ headersTimeout: 10_000, requestTimeout: 30_000, connectionsCheckingInterval: 1_000 }, handle);
server.headersTimeout = 10_000;
server.requestTimeout = 30_000; // a phone uploading a 400 KB save on a weak signal
server.keepAliveTimeout = 5_000;
// With Expect: 100-continue, the header, rate-limit and session checks run before the client is invited to send the
// body; a request turned away is never invited (Node then closes the connection after the answer).
server.on('checkContinue', (req, res) => { req.expectsContinue = true; handle(req, res); });
server.on('error', (err) => { console.error(`lw-server: cannot listen (${err.code ?? err.name})`); process.exit(1); });

// The IPv4 loopback address, found by name: this repository carries no IP literal, and IPv6 is never bound by accident.
const { address } = await lookup('localhost', { family: 4 });
world.start(); // the tick, the snapshot checks and the backups (world.mjs); the lock was taken at open
server.listen(PORT, address, () => {
  console.log(`lw-server: listening on localhost:${PORT}${DEV ? ' (dev mode: also serving game/, engine/, art-assets/)' : ''}`);
});

db.sweepSessions(Date.now());
const limitSweep = setInterval(() => sweepAll(), 60_000);
const sessionSweep = setInterval(() => {
  try { db.sweepSessions(Date.now()); } catch (err) { logError(err); }
}, HOUR);
limitSweep.unref();
sessionSweep.unref();

// SIGTERM or SIGINT: stop accepting, let requests in flight finish (5 s at most), snapshot the world and release its lock,
// close the database, exit 0.
let stopping = false;
function stop(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`lw-server: ${signal}: finishing requests in flight`);
  clearInterval(limitSweep);
  clearInterval(sessionSweep);
  setTimeout(() => server.closeAllConnections(), 5_000).unref();
  server.close(() => {
    world.stop();
    db.close();
    console.log('lw-server: stopped');
    process.exit(0);
  });
  server.closeIdleConnections();
}
process.on('SIGTERM', () => stop('SIGTERM'));
process.on('SIGINT', () => stop('SIGINT'));
