// Shared by the server tests (node:test, zero dependencies): temp folders, accounts made straight in the database, a
// child server on a free port, a small HTTP client. Names and passwords are built at runtime, never literals.

import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
export function client(server, cookie = null) {
  async function call(method, pathname, body, extraHeaders = {}) {
    const headers = { ...extraHeaders };
    if (cookie) headers.Cookie = cookie;
    if (method !== 'GET') { headers.Origin = server.origin; headers['Content-Type'] = 'application/json'; }
    const res = await fetch(server.url + pathname, { method, headers, body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)) });
    const text = await res.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch { /* not JSON */ }
    return { status: res.status, headers: res.headers, body: parsed, text };
  }
  return {
    get: (p) => call('GET', p),
    post: (p, body, h) => call('POST', p, body, h),
    raw: call,
    act: (action, args, n = nonce()) => call('POST', '/api/act', { action, args, nonce: n }),
    join: (starter) => call('POST', '/api/join', { starter }),
    view: (q = '') => call('GET', `/api/view${q ? `?${q}` : ''}`),
  };
}

// Walks every leaf of a JSON value with (value, path).
export function walk(x, fn, p = '') {
  if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) walk(v, fn, `${p}.${k}`);
  else fn(x, p);
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
