// The session cookie (docs/server-api.md section 2): only sign-up, the guest sign-up and login set it and only logout
// clears it. An ordinary request never answers with Set-Cookie: a dead or unknown cookie is treated as signed out with no
// clearing cookie, and the sliding renewal moves sessions.expires_at in the database only, as a guest's date slide does.
// So a slow answer to a request sent under one session can never clear or overwrite the cookie of a session that started
// after it (fix round 5).
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

// a guest written straight into the file (the guest limiter is 3 an hour per address): pass_hash 'none', her date as given
function makeGuest(db, expiresAt, name = mintName('G'), now = Date.now()) {
  const token = auth.newToken();
  const user = db.createUser({ name, nameKey: name.toLowerCase(), passHash: 'none', tokenHash: auth.tokenHash(token), oldTokenHash: null, now, expiresAt: now + auth.SESSION_MS, guestExpiresAt: expiresAt });
  if (!user) throw new Error('name taken');
  return { id: user.id, name, token, cookie: `lw_dev=${token}` };
}

test('T-cookie-guest: the guest sign-up is the third point that sets the cookie, for 400 days, for a request with no session only: under a live session, kept or guest, it answers 403 not-guest with no Set-Cookie, the session intact and no users row made; a guest\'s own requests, her date slide included, send no Set-Cookie; keep sends none either', async (t) => {
  const now = Date.now();
  const F = await fresh((db) => ({ sliding: makeGuest(db, now + 5 * DAY) })); // under six days left: the next visit slides it
  t.after(() => F.close());
  const A = { name: mintName('Ja'), password: mintPassword() };
  const jarA = cookieJar(); const jar = cookieJar();
  const setOf = (r) => r.headers.get('set-cookie');
  const SET = new RegExp(`^lw_dev=[A-Za-z0-9_-]{43}; Path=/; Max-Age=${COOKIE_MAX_AGE_S}; HttpOnly; SameSite=Lax$`);
  // A signs up on one browser, then posts a guest sign-up with a name of the form's: refused, with no cookie sent, her
  // session intact and no account made (the fix round of batch 3b: only sign-up and login replace a live session's row)
  assert.equal((await viaJar(F.server, jarA, 'POST', '/api/signup', A)).status, 201);
  const aCookie = jarA.header();
  const GA = mintName('Gu');
  const refusedA = await viaJar(F.server, jarA, 'POST', '/api/guest', { name: GA });
  assert.equal(refusedA.status, 403, `a kept session's guest sign-up is refused (${refusedA.text})`); assert.equal(refusedA.body.error.code, 'not-guest');
  assert.equal(setOf(refusedA), null, `no Set-Cookie on the refusal (${setOf(refusedA)})`);
  assert.equal(jarA.header(), aCookie, 'the jar is as it was');
  const meA = await viaJar(F.server, jarA, 'GET', '/api/me');
  assert.equal(meA.body.user && meA.body.user.name, A.name, 'A\'s session is intact');
  // the same from a guest's session: a second guest account would orphan her first for good
  const s = F.seeded.sliding;
  const GS = mintName('Gu');
  const refusedS = await client(F.server, s.cookie).post('/api/guest', { name: GS });
  assert.equal(refusedS.status, 403, `a guest session's guest sign-up is refused (${refusedS.text})`); assert.equal(refusedS.body.error.code, 'not-guest');
  assert.equal(setOf(refusedS), null);
  assert.equal((await client(F.server, s.cookie).get('/api/me')).body.user.name, s.name, 'her session is intact');
  // a browser with no session: 201, the cookie as sign-up sets it
  const G = mintName('Gu');
  const gu = await viaJar(F.server, jar, 'POST', '/api/guest', { name: G });
  assert.equal(gu.status, 201, gu.text);
  assert.match(String(setOf(gu)), SET, 'the guest sign-up sets');
  assert.deepEqual(gu.body, { user: { name: G, saveUpdatedAt: null, guest: true } });
  assert.notEqual(jar.header(), aCookie, 'a token of its own');
  const me = await viaJar(F.server, jar, 'GET', '/api/me');
  assert.equal(me.body.user && me.body.user.name, G); assert.equal(me.body.user.guest, true);
  assert.equal(me.headers.get('set-cookie'), null, `a guest's /api/me sends no Set-Cookie (${me.headers.get('set-cookie')})`);
  // the slide: under six days left, her visit moved her date on in the database and sends no cookie
  const slid = await client(F.server, s.cookie).get('/api/me');
  assert.equal(slid.status, 200, slid.text);
  assert.ok(slid.body.user.guestExpiresAt > now + 6 * DAY, `slid to seven days (${slid.body.user.guestExpiresAt - now} ms)`);
  assert.equal(slid.headers.get('set-cookie'), null, `the slide sends no Set-Cookie (${slid.headers.get('set-cookie')})`);
  // the keep sends no cookie either: her session goes on
  const K = { name: mintName('Kp'), password: mintPassword() };
  const kp = await viaJar(F.server, jar, 'POST', '/api/guest/keep', K);
  assert.equal(kp.status, 200, kp.text); assert.equal(setOf(kp), null, `keep sends no Set-Cookie (${setOf(kp)})`);
  assert.equal((await viaJar(F.server, jar, 'GET', '/api/me')).body.user.name, K.name);
  // logout clears it, and a login as the kept account sets it again
  const lo = await viaJar(F.server, jar, 'POST', '/api/logout', {});
  assert.equal(setOf(lo), 'lw_dev=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax', 'logout clears');
  const li = await viaJar(F.server, jar, 'POST', '/api/login', K);
  assert.equal(li.status, 200, li.text); assert.match(String(setOf(li)), SET, 'login sets');
  await F.server.stop();
  const db = await openDb(F.file, { exclusive: false });
  try {
    const row = db.sessionUser(auth.tokenHash(s.token), Date.now());
    assert.ok(row, 'the sliding guest\'s session is live'); assert.equal(row.guest_expires_at, slid.body.user.guestExpiresAt, 'the date on the row is the one on the wire');
    assert.ok(db.sessionUser(auth.tokenHash(aCookie.slice('lw_dev='.length)), Date.now()), 'A\'s session row stays: the refused guest sign-up replaced nothing');
    assert.equal(db.userByKey(GA.toLowerCase()), null, 'no users row for the name posted under A\'s session');
    assert.equal(db.userByKey(GS.toLowerCase()), null, 'nor for the one posted under the guest\'s');
  } finally { db.close(); }
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
