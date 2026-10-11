// The session cookie (docs/server-api.md section 2): only sign-up and login set it and only logout clears it. An ordinary
// request never answers with Set-Cookie: a dead or unknown cookie is treated as signed out with no clearing cookie, and
// the sliding renewal moves sessions.expires_at in the database only. So a slow answer to a request sent under one
// session can never clear or overwrite the cookie of a session that started after it (Codex round 5).
// Run: node --test 'server/test/*.test.mjs'.

import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import * as auth from '../auth.mjs';
import { openDb } from '../db.mjs';
import { client, makeUser, mintName, mintPassword, rmDir, startServer, tmpDir } from './helpers.mjs';

const DAY = 24 * 3600 * 1000;
const COOKIE_MAX_AGE_S = 34560000; // 400 days: the browsers' cap on a cookie's lifetime

// A browser-style cookie jar for the dev cookie: it sends what it holds and applies every Set-Cookie it is answered with.
function cookieJar() {
  let value = null;
  return {
    header: () => (value ? `lw_dev=${value}` : null),
    apply(res) {
      const sc = res.headers.get('set-cookie');
      if (!sc) return;
      const m = /^lw_dev=([^;]*);/.exec(sc);
      if (!m) return;
      const maxAge = /Max-Age=(\d+)/.exec(sc);
      value = m[1] && !(maxAge && Number(maxAge[1]) === 0) ? m[1] : null;
    },
  };
}
// one request with whatever the jar holds now, its answer applied to the jar
async function viaJar(server, jar, method, pathname, body) {
  const r = await client(server, jar.header()).raw(method, pathname, body);
  jar.apply(r);
  return r;
}

async function fresh(seed = () => {}) {
  const dir = tmpDir('lw-cookie');
  const file = path.join(dir, 'lw.sqlite');
  const db = await openDb(file, { exclusive: false });
  const seeded = seed(db);
  db.close();
  const server = await startServer({ LW_DB: file });
  return { dir, file, server, seeded, close: async () => { await server.stop(); rmDir(dir); } };
}

test('T-cookie-dead: a dead or unknown cookie is signed out with no Set-Cookie, on /api/me and on an arena route', async (t) => {
  const now = Date.now();
  const F = await fresh((db) => ({ expired: makeUser(db, mintName('Ex'), now - 40 * DAY) })); // its row expired 10 days ago
  t.after(() => F.close());
  const unknown = `lw_dev=${auth.newToken()}`;
  for (const cookie of [F.seeded.expired.cookie, unknown]) {
    const c = client(F.server, cookie);
    const me = await c.get('/api/me');
    assert.equal(me.status, 200, me.text);
    assert.equal(me.body.user, null, 'treated as signed out');
    assert.equal(me.headers.get('set-cookie'), null, `no Set-Cookie on /api/me (${me.headers.get('set-cookie')})`);
    const v = await c.view();
    assert.equal(v.status, 401, v.text);
    assert.equal(v.headers.get('set-cookie'), null, `no Set-Cookie on a 401 (${v.headers.get('set-cookie')})`);
  }
});

test('T-cookie-renew: the sliding renewal moves sessions.expires_at in the database and sends no Set-Cookie', async (t) => {
  const now = Date.now();
  // a session with one day left (seeded 29 days ago): past the renewal point (less than 29 days left)
  const F = await fresh((db) => makeUser(db, mintName('Rn'), now - 29 * DAY));
  t.after(() => F.close());
  const u = F.seeded;
  const me = await client(F.server, u.cookie).get('/api/me');
  assert.equal(me.status, 200, me.text);
  assert.equal(me.body.user && me.body.user.name, u.name, 'signed in');
  assert.equal(me.headers.get('set-cookie'), null, `the renewal sends no Set-Cookie (${me.headers.get('set-cookie')})`);
  await F.server.stop();
  const db = await openDb(F.file, { exclusive: false });
  try {
    const row = db.sessionUser(auth.tokenHash(u.token), Date.now());
    assert.ok(row, 'the session is live');
    assert.ok(row.expires_at > now + auth.RENEW_BEFORE_MS, `expires_at moved on to about 30 days from now (${row.expires_at - now} ms)`);
    assert.ok(row.expires_at <= Date.now() + auth.SESSION_MS);
  } finally { db.close(); }
});

test('T-cookie-auth: sign-up and login set the cookie for 400 days, logout clears it', async (t) => {
  const F = await fresh();
  t.after(() => F.close());
  const A = { name: mintName('Ja'), password: mintPassword() };
  const jar = cookieJar();
  const setOf = (r) => r.headers.get('set-cookie');
  const SET = new RegExp(`^lw_dev=[A-Za-z0-9_-]{43}; Path=/; Max-Age=${COOKIE_MAX_AGE_S}; HttpOnly; SameSite=Lax$`);
  const su = await viaJar(F.server, jar, 'POST', '/api/signup', A);
  assert.equal(su.status, 201, su.text);
  assert.match(String(setOf(su)), SET, 'sign-up sets');
  assert.equal((await viaJar(F.server, jar, 'GET', '/api/me')).body.user.name, A.name);
  const lo = await viaJar(F.server, jar, 'POST', '/api/logout', {});
  assert.equal(lo.status, 200, lo.text);
  assert.equal(setOf(lo), 'lw_dev=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax', 'logout clears');
  assert.equal(jar.header(), null, 'the jar dropped it');
  const li = await viaJar(F.server, jar, 'POST', '/api/login', A);
  assert.equal(li.status, 200, li.text);
  assert.match(String(setOf(li)), SET, 'login sets');
  assert.equal((await viaJar(F.server, jar, 'GET', '/api/me')).body.user.name, A.name);
});

test('T-cookie-race: A\'s request held on the wire while the same browser logs in as B; its late 401 leaves B\'s cookie in the jar', async (t) => {
  const F = await fresh();
  t.after(() => F.close());
  const A = { name: mintName('Ja'), password: mintPassword() };
  const B = { name: mintName('Jb'), password: mintPassword() };
  const jar = cookieJar();
  assert.equal((await viaJar(F.server, jar, 'POST', '/api/signup', A)).status, 201);
  assert.equal((await client(F.server).post('/api/signup', B)).status, 201, 'B\'s account, made from another device');
  // A's request goes up with A's cookie and is held on the wire; meanwhile she logs in as B on the same jar (the login
  // deletes A's session, the one the jar named) and the jar takes B's cookie
  const inFlight = jar.header();
  const li = await viaJar(F.server, jar, 'POST', '/api/login', B);
  assert.equal(li.status, 200, li.text);
  assert.notEqual(jar.header(), inFlight, 'the jar holds B\'s cookie');
  // A's request reaches the server now: her session has gone, so it is a 401, and whatever it carries goes into the jar
  const late = await client(F.server, inFlight).view();
  assert.equal(late.status, 401, late.text);
  jar.apply(late);
  const me = await viaJar(F.server, jar, 'GET', '/api/me');
  assert.equal(me.body.user && me.body.user.name, B.name, `the jar still holds B's session (${me.text})`);
  assert.equal(late.headers.get('set-cookie'), null, `the stale 401 carried no Set-Cookie (${late.headers.get('set-cookie')})`);
});
