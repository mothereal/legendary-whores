#!/usr/bin/env node
// The game server: accounts (a nom de plume and a password), one cloud save per player, Letters to the Editor and the
// Players board. The contract is docs/server-api.md: change it first, then this. Zero dependencies (node:http,
// node:sqlite, node:crypto), Node 22 or later. Run instructions: server/README.md.

import http from 'node:http';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as auth from './auth.mjs';
import { openDb, SchemaTooNewError } from './db.mjs';
import { ipKeys, limits, sweepAll } from './limits.mjs';
import { staticServer } from './static.mjs';
import { checkFeedback, checkSave, checkSummary, hasKeys } from './validate.mjs';

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
  'name-taken': [409, 'That name\'s already on the guest list. If it\'s yours, the password was wrong.'],
  'password-short': [400, 'Eight characters at least, or a corset would be harder to get into.'],
  'password-long': [400, '128 characters at most. The rest belongs in your memoirs.'],
  'password-name': [400, 'A password that matches your name is the first thing a blackmailer tries.'],
  'password-common': [400, 'Every pickpocket in town already knows that password.'],
  'bad-login': [401, 'Wrong name or wrong password. We won\'t say which.'],
  'not-signed-in': [401, 'Your name\'s not on tonight\'s list. Sign in at the front desk.'],
  'bad-save': [400, 'The pages came back out of order, so that save didn\'t go through.'],
  'bad-summary': [400, 'The society column won\'t print a title it\'s never heard of.'],
  'bad-feedback': [400, 'Letters to the Editor take a bug, an idea or one to five stars, in under two thousand characters.'],
  'rate-limited': [429, 'Steady on: too many requests at once. Give it a minute.'],
  'busy': [503, 'Every clerk is checking passwords at once, so try again in a few seconds.'],
  'not-found': [404, 'No such page in this edition.'],
  'method-not-allowed': [405, 'This desk doesn\'t handle that kind of business.'],
  'server-error': [500, 'The presses have jammed. Give it a minute and try again.'],
  'down': [503, 'The presses are stopped for now. Back soon.'],
};

// Thrown by handlers to answer with an error code (and any extra headers).
class Fail extends Error {
  constructor(code, headers = {}) {
    super(code);
    this.code = code;
    this.headers = headers;
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

function sendError(res, ctx, code, extra = {}) {
  const [status, message] = ERRORS[code];
  send(res, ctx, status, { error: { code, message } }, extra);
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
  send(res, ctx, 200, { ok: true });
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
  send(res, ctx, 200, { user: user && { name: user.name, saveUpdatedAt: user.saveUpdatedAt } });
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

function players(req, res, ctx, query) {
  rateCheck(limits.players.hit(clientKeys(req).ip));
  const limit = parseLimit(query);
  const list = db.players(limit).map((row, i) => {
    const s = JSON.parse(row.summary); // canonical, written by putSave
    return {
      rank: i + 1, name: row.name, tier: s.tier, title: s.title, road: s.road, whorescore: s.whorescore,
      timelines: s.timelines, lastActive: Math.floor(row.updated_at / HOUR) * HOUR,
    };
  });
  send(res, ctx, 200, { players: list });
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
    if (err instanceof Fail) return sendError(res, ctx, err.code, err.headers);
    if (err instanceof auth.BusyError) return sendError(res, ctx, 'busy', { 'Retry-After': '2' });
    logError(err);
    sendError(res, ctx, 'server-error');
  }
}

// ---- Start -------------------------------------------------------------------------------------------------------------

let db;
try {
  db = openDb(DB_FILE);
} catch (err) {
  if (err instanceof SchemaTooNewError) die(`the database is newer than this server (${err.message}; this server knows 1)`);
  console.error(`lw-server: cannot open the database (${err?.code ?? err?.name ?? 'error'})`);
  process.exit(1);
}
process.on('uncaughtException', (err) => { logError(err); process.exit(1); });
process.on('unhandledRejection', (err) => { logError(err); process.exit(1); });

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

// SIGTERM or SIGINT: stop accepting, let requests in flight finish (5 s at most), close the database, exit 0.
let stopping = false;
function stop(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`lw-server: ${signal}: finishing requests in flight`);
  clearInterval(limitSweep);
  clearInterval(sessionSweep);
  setTimeout(() => server.closeAllConnections(), 5_000).unref();
  server.close(() => {
    db.close();
    console.log('lw-server: stopped');
    process.exit(0);
  });
  server.closeIdleConnections();
}
process.on('SIGTERM', () => stop('SIGTERM'));
process.on('SIGINT', () => stop('SIGINT'));
