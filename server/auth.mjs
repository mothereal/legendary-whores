// Passwords, session tokens and cookies, and the name and password rules (docs/server-api.md sections 2 and 6).

import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { COMMON_PASSWORDS, isBlocked, isReserved } from './blocklists.mjs';

// ---- Names and passwords --------------------------------------------------------------------------------------------

export const NAME_RE = /^[A-Za-z0-9_]{3,24}$/; // the title page's rule (game/names.js NOM_RE)
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

// The error code for a nom de plume that cannot be signed up, or null.
export function nameProblem(name) {
  if (!NAME_RE.test(name)) return 'name-format';
  if (isReserved(name) || isBlocked(name)) return 'name-reserved';
  return null;
}

// A password's length in characters as a person counts them (code points), not UTF-16 units: an emoji is one.
export const passwordLength = (password) => [...password].length;

// The error code for a password (already NFC-normalised) that cannot be used, or null.
export function passwordProblem(password, name) {
  const length = passwordLength(password);
  if (length < PASSWORD_MIN) return 'password-short';
  if (length > PASSWORD_MAX) return 'password-long';
  const lower = password.toLowerCase();
  if (lower === name.toLowerCase()) return 'password-name';
  // the list, nothing but spaces, or one character over and over (aaaaaaaa): all guessed first
  if (COMMON_PASSWORDS.has(lower) || /^\s+$/u.test(password) || /^(.)\1+$/su.test(lower)) return 'password-common';
  return null;
}

// ---- Hashing --------------------------------------------------------------------------------------------------------
// scrypt N=2^15 r=8 p=1, 64-byte key, 16-byte salt. One hash needs 32 MiB, and Node's default maxmem (32 MiB) refuses
// these parameters, hence maxmem 64 MiB. Stored as scrypt$N$r$p$<salt>$<hash> (base64url) so the parameters can be
// raised later without guessing what older rows used.

const N = 32768;
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 64 * 1024 * 1024;

export class BusyError extends Error {}

// At most 2 hashes in flight, 16 waiting behind them; past that a request is turned away (503 busy).
const MAX_IN_FLIGHT = 2;
const MAX_WAITING = 16;
let inFlight = 0;
const waiting = [];

function acquire() {
  if (inFlight < MAX_IN_FLIGHT) { inFlight++; return Promise.resolve(); }
  if (waiting.length >= MAX_WAITING) return Promise.reject(new BusyError('hash queue full'));
  return new Promise((resolve) => waiting.push(resolve));
}

function release() {
  const next = waiting.shift();
  if (next) next(); // the slot passes straight to the next in line
  else inFlight--;
}

async function derive(password, salt, n, r, p) {
  await acquire();
  try {
    return await new Promise((resolve, reject) => {
      scrypt(password, salt, KEYLEN, { N: n, r, p, maxmem: MAXMEM }, (err, key) => (err ? reject(err) : resolve(key)));
    });
  } finally {
    release();
  }
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, R, P);
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

function parseHash(stored) {
  const parts = typeof stored === 'string' ? stored.split('$') : [];
  if (parts.length !== 6 || parts[0] !== 'scrypt') return null;
  const [n, r, p] = parts.slice(1, 4).map(Number);
  const salt = Buffer.from(parts[4], 'base64url');
  const key = Buffer.from(parts[5], 'base64url');
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p) || key.length !== KEYLEN || salt.length < 16) return null;
  return { n, r, p, salt, key };
}

// Made once at start-up: a login for a name that does not exist hashes against this, so it costs the same as a real one.
let dummy = null;
export async function initDummy() {
  dummy = parseHash(await hashPassword(randomBytes(24).toString('base64url')));
}

// True only when `password` matches `stored`. Pass stored = null for an unknown name: one scrypt runs either way.
export async function verifyPassword(password, stored) {
  const rec = parseHash(stored);
  const use = rec || dummy;
  const key = await derive(password, use.salt, use.n, use.r, use.p);
  return timingSafeEqual(key, use.key) && rec !== null;
}

// ---- Sessions and the cookie ----------------------------------------------------------------------------------------

export const SESSION_MS = 30 * 24 * 3600 * 1000;
export const RENEW_BEFORE_MS = 29 * 24 * 3600 * 1000; // renew when less than 29 days are left: at most once a day
const MAX_AGE_S = SESSION_MS / 1000;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export const newToken = () => randomBytes(32).toString('base64url'); // 43 characters, no padding
export const tokenHash = (token) => createHash('sha256').update(token).digest('hex');

// The live site uses a __Host- cookie, which must be Secure. Browsers drop Secure cookies set over plain http (Safari even
// on localhost), so dev mode, which is plain http, uses another name without Secure. The server refuses to start in dev
// mode with an https origin, so the weaker cookie never reaches the live site.
export function cookieJar(dev) {
  const name = dev ? 'lw_dev' : '__Host-lw';
  const secure = dev ? '' : '; Secure';
  return {
    // The first well-formed value of our cookie in the Cookie header, or null. Anything malformed is ignored.
    read(header) {
      if (typeof header !== 'string') return null;
      for (const part of header.split(';')) {
        const eq = part.indexOf('=');
        if (eq < 0 || part.slice(0, eq).trim() !== name) continue;
        const value = part.slice(eq + 1).trim();
        if (TOKEN_RE.test(value)) return value;
      }
      return null;
    },
    set: (token) => `${name}=${token}; Path=/; Max-Age=${MAX_AGE_S}; HttpOnly${secure}; SameSite=Lax`,
    clear: () => `${name}=; Path=/; Max-Age=0; HttpOnly${secure}; SameSite=Lax`,
  };
}
