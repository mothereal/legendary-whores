// Rate limits (docs/server-api.md section 7): fixed windows, in memory, per process. A restart forgets them.

import { createHmac, randomBytes } from 'node:crypto';
import { isIP } from 'node:net';

const MAX_KEYS = 100_000;

export class Limiter {
  constructor(limit, windowMs) {
    this.limit = limit;
    this.windowMs = windowMs;
    // key -> { count, resetAt }. Every window has the same length and a renewed one goes to the back, so the Map's
    // insertion order is also the order the windows end in: the first entry is always the oldest.
    this.windows = new Map();
  }

  // Counts one request. Returns 0 when it may go ahead, else the whole seconds to wait.
  hit(key, now = Date.now()) {
    const w = this.#window(key, now);
    if (w.count >= this.limit) return this.#secondsLeft(w, now);
    w.count++;
    return 0;
  }

  // Takes back one request counted by hit, if its window is still open: a login counts as a failure from the moment
  // it starts hashing, and is taken back if the password matched or was never checked.
  refund(key, now = Date.now()) {
    const w = this.windows.get(key);
    if (w && w.resetAt > now && w.count > 0) w.count--;
  }

  // Drops the windows that have ended. They sit at the front of the Map, so this stops at the first open one.
  sweep(now = Date.now()) {
    for (const [key, w] of this.windows) {
      if (w.resetAt > now) break;
      this.windows.delete(key);
    }
  }

  #window(key, now) {
    let w = this.windows.get(key);
    if (w && w.resetAt > now) return w;
    if (w) this.windows.delete(key); // ended: its new window goes to the back
    else if (this.windows.size >= MAX_KEYS) {
      this.sweep(now);
      // Still full: forget the oldest window rather than grow, or turn away every new address.
      if (this.windows.size >= MAX_KEYS) this.windows.delete(this.windows.keys().next().value);
    }
    w = { count: 0, resetAt: now + this.windowMs };
    this.windows.set(key, w);
    return w;
  }

  #secondsLeft(w, now) {
    return Math.max(1, Math.ceil((w.resetAt - now) / 1000));
  }
}

const MIN = 60_000;
export const limits = {
  signup: new Limiter(5, 60 * MIN), // per address key, every request
  signupWide: new Limiter(20, 60 * MIN), // per IPv6 /48, every request (IPv4: not used)
  loginIp: new Limiter(10, 15 * MIN), // per address key, every request
  loginName: new Limiter(10, 15 * MIN), // per name_key, failed logins (counted while the hash runs, see refund)
  feedback: new Limiter(10, 60 * MIN), // per address key
  save: new Limiter(120, 60 * MIN), // per user id, every authenticated upload
  players: new Limiter(60, MIN), // per address key
};

export function sweepAll(now = Date.now()) {
  for (const l of Object.values(limits)) l.sweep(now);
}

// The 8 groups of 16 bits of an IPv6 address, or null. Takes the forms net.isIP accepts: "::" shorthand, a zone after
// "%", and a dotted IPv4 tail (an IPv4-mapped or translated address).
function hextets(ip) {
  let s = ip.split('%')[0].toLowerCase();
  const dot = s.lastIndexOf(':');
  if (s.includes('.', dot)) {
    const b = s.slice(dot + 1).split('.').map(Number);
    s = `${s.slice(0, dot + 1)}${((b[0] << 8) | b[1]).toString(16)}:${((b[2] << 8) | b[3]).toString(16)}`;
  }
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  const all = [...head, ...Array(Math.max(0, fill)).fill('0'), ...tail].map((h) => parseInt(h, 16));
  return all.length === 8 && all.every((n) => n >= 0 && n <= 0xffff) ? all : null;
}

// The client's address is only ever a rate-limit key, and only as HMAC-SHA256 under a secret made at start-up and held
// in memory: never logged, never stored.
//
// What one client holds: an IPv4 address on its own, but a whole IPv6 /64 (a home line, a phone or a rented server
// gets at least that much, and can pick any address inside it for each request). So an IPv6 address is keyed on its
// first four groups. An IPv4-mapped IPv6 address is keyed as the IPv4 address it carries. `wide` is the IPv6 /48 (one
// site, or a free tunnel's whole allocation) for the sign-up ceiling; null for IPv4.
const SECRET = randomBytes(32);
const hmac = (text) => createHmac('sha256', SECRET).update(text).digest('hex');

export function ipKeys(ip) {
  if (isIP(ip) === 6) {
    const h = hextets(ip);
    if (h) {
      const mapped = h.slice(0, 5).every((n) => n === 0) && h[5] === 0xffff;
      if (!mapped) {
        const hex = h.map((n) => n.toString(16));
        return { ip: hmac(`6/64 ${hex.slice(0, 4).join(':')}`), wide: hmac(`6/48 ${hex.slice(0, 3).join(':')}`) };
      }
      return { ip: hmac(`4 ${h[6] >> 8}.${h[6] & 255}.${h[7] >> 8}.${h[7] & 255}`), wide: null };
    }
  }
  return { ip: hmac(isIP(ip) === 4 ? `4 ${ip}` : `? ${ip}`), wide: null };
}
