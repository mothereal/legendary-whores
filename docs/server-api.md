# Server API v1: accounts, cloud save, letters, the Players board, the arena

The contract between the game client (`game/`) and the game server (`server/`). Both sides build to
this file; a change to either starts here.

**In scope (the designer's lean v1):** a nom de plume and a password; one cloud save per player, last
write wins; Letters to the Editor (bug, idea or a 1 to 5 star rating, anonymous allowed); a live board of
real players on the Players screen.

**Since schema v2 (the arena, section 12):** one world per server that every account can join and play in
over `/api/join`, `/api/act` and `/api/view`; real players as rivals inside a Curtain; backups and three
operator commands. **Still not in v1:** email, password recovery, editions or a devices list, conflict
handling, an admin page. Lose the password and the game goes with it.

Contents: [1 Conventions](#1-conventions) · [2 The session cookie](#2-the-session-cookie) ·
[3 Environment](#3-environment) · [4 Endpoints](#4-endpoints) · [5 The summary](#5-the-summary) ·
[6 Names and passwords](#6-names-and-passwords) · [7 Rate limits](#7-rate-limits) ·
[8 Error codes](#8-error-codes) · [9 SQLite schema](#9-sqlite-schema) ·
[10 Client contract and hook points](#10-client-contract-and-hook-points) ·
[11 Decisions pinned here](#11-decisions-pinned-here) · [12 The arena](#12-the-arena)

---

## 1. Conventions

**Stack.** Node 22 or later (the live host runs 22.22.2), ES modules, zero npm dependencies:
`node:http`, `node:sqlite` (`DatabaseSync`), `node:crypto`. Entry point `server/server.mjs`. The server
reads tiers, titles, Timeline ids and the cast's names from `engine/content.js`, so `server/` and
`engine/` are deployed side by side and restarted together with the client.

**Where it listens.** The IPv4 loopback address only, port `LW_PORT`. The code resolves `localhost`
with `dns.lookup('localhost', { family: 4 })` and listens on the result, so it never binds IPv6 by
accident and this repository never carries an IP literal. The site's front web server forwards
`/api/*` to it. Outside `LW_DEV`, every other path is a 404.

**Paths.** Exact matches only (no trailing slash). A known path with the wrong method is a 405 with an
`Allow` header. An unknown `/api/*` path is a 404.

**Every response** is JSON with these headers, and no others from the app (no CORS headers at all):

```
Content-Type: application/json; charset=utf-8
Cache-Control: no-store
X-Content-Type-Options: nosniff
```

plus `Set-Cookie` where section 2 says so, `Retry-After` (whole seconds) on 429 and 503, and `Allow` on
405.

**Errors** always have this body. `code` is from section 8. `message` is the in-voice line from section
8, never an internal detail, a stack trace or an echo of the input.

```json
{ "error": { "code": "name-taken", "message": "That name's taken." } }
```

**Request hygiene for every non-GET request** (POST, PUT), checked in this order before anything else:

1. `Origin` must equal `LW_ORIGIN` exactly, else 403 `bad-origin`. A missing `Origin` fails.
2. `Content-Type` must be `application/json`, optionally with a `charset=utf-8` parameter (case-insensitive),
   else 403 `bad-content-type`.
3. Body size cap: 1 MiB (1,048,576 bytes) for `PUT /api/save`, 16 KiB (16,384 bytes) for everything
   else. A `Content-Length` over the cap is refused at once; a streamed body is cut off when it passes the
   cap. Either way 413 `too-large`.
4. **Before the body is read**, the endpoint's own gate: its per-address rate limit (signup, login,
   feedback), or for `PUT /api/save` the session, the upload limit and the save-body budget (section 4).
   Steps 1 to 4 look at headers only, so a request turned away by any of them costs no parsing.
5. The body is parsed with `JSON.parse` and a reviver that rejects any key named `__proto__`,
   `constructor` or `prototype` at any depth. Unparseable JSON, a rejected key, or a top level that is
   not a plain object: 400 `bad-json`. (`POST /api/logout` also accepts an empty body.)
6. Each endpoint then rejects unknown top-level keys and wrong types with 400 (`bad-request` unless the
   endpoint names a more specific code).

A request turned away before its body is read gets its answer at once. With a declared `Content-Length`
(at most the cap, by step 3) the server then reads the rest and drops it unparsed, so a client still
sending is not cut off mid-answer; a body with no declared length is not waited for and the connection
closes. With `Expect: 100-continue` the client is invited to send the body only after step 4 passes.

GET requests carry no body and need no `Origin` or `Content-Type`.

**Timeouts.** `headersTimeout` 10 s, `requestTimeout` 30 s (a phone uploading a 400 KB save on a weak
signal), `keepAliveTimeout` 5 s, Node's default 16 KiB header cap. Node answers a timed-out request
itself (408, no body).

**The client's IP** is used only as a rate-limit key and never logged or stored. Outside `LW_DEV` it is
read from the `CF-Connecting-IP` header and nothing else (no `X-Forwarded-For`, no `X-Real-IP`). If that
header is missing or is not a valid IP (`net.isIP`), the socket address is used instead, which puts all
such requests in one shared bucket, and the server writes one warning line per process (without the
address). Under `LW_DEV` the socket address is used and the header is ignored. The key is
`HMAC-SHA256(secret, ip)` as hex, where `secret` is 32 random bytes made at start-up and held only in
memory, and `ip` is what one client holds: an IPv4 address on its own, but for an IPv6 address only its
first four groups (its /64), because a home line, a phone or a rented server is given a whole /64 and can
use a different address inside it for every request. An IPv4-mapped IPv6 address is keyed as the IPv4
address it carries. The sign-up ceiling of section 7 also keys an IPv6 address on its first three groups
(its /48).

**Logging.** No access log. Start-up and shutdown lines go to stdout. Errors go to stderr as the error
code and stack, and never include a request body, a cookie, a token, a password, a name or an address.

**Times** are integers: milliseconds since the Unix epoch.

---

## 2. The session cookie

| | Live site | `LW_DEV=1` (plain http) |
|---|---|---|
| Set | `__Host-lw=<token>; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax` | `lw_dev=<token>; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax` |
| Clear | `__Host-lw=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` | `lw_dev=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax` |

**Why the dev cookie differs.** A `__Host-` cookie must carry `Secure`, and browsers drop `Secure`
cookies set over plain http. Chrome and Firefox make an exception for `http://localhost` only; Safari
makes none, and a phone testing the dev server over the local network is on plain http too. So the dev
server uses a different name without `Secure`. The production server refuses to start with `LW_DEV`
set and an https origin (section 3), so the weaker cookie can never reach the live site.

- **Token:** 32 bytes from `crypto.randomBytes`, base64url without padding (43 characters). A cookie
  value that does not match `^[A-Za-z0-9_-]{43}$` is ignored.
- **Stored:** only `sha256(token)` as 64 hex characters (`sessions.token_hash`), with `expires_at`. The
  token itself is never stored or logged.
- **Lifetime:** 30 days (2,592,000 s). **Sliding renewal, at most once a day:** when an authenticated
  request finds `expires_at < now + 29 days`, the server sets `expires_at = now + 30 days`, sets
  `users.last_seen_at = now`, and re-sends the cookie with the full `Max-Age`.
- **A fresh token at every sign-up and login** (no fixation). If the request already carried a live
  session cookie, that session row is deleted first.
- **Logout** deletes the session row and clears the cookie.
- **A dead cookie** (unknown token, expired row): the request is treated as signed out and the response
  clears the cookie. Expired rows are swept once an hour.
- The client never reads the cookie (it is `HttpOnly`); it learns who it is from `GET /api/me`.

---

## 3. Environment

| Variable | Default | Meaning |
|---|---|---|
| `LW_PORT` | `8091` | TCP port on the loopback address. |
| `LW_DB` | none: required | Path of the SQLite file. The server exits with status 2 if it is unset. `:memory:` works for a throwaway run. Never point it inside this repository. |
| `LW_ORIGIN` | `https://legendarywhores.com`; under `LW_DEV=1`, `http://localhost:<LW_PORT>` | The only `Origin` accepted on non-GET requests. |
| `LW_DEV` | unset | `1` turns on dev mode, below. Never set on the live server. |
| `LW_MIN_PER_SEC` | `1/60` | The world's clock rate, District minutes per real second, as `a/b` or a decimal with at most 6 places (section 12.6). Must equal the world row's pair once a world exists. |
| `LW_DAY_START` | `06:00` | Local time of District clock 0 at world creation (the day turns then). `HH:MM`. |
| `LW_LOG_LIMIT` | `8000` | The world's event log limit (the engine keeps up to twice this). 100 to 100000. |
| `LW_WORLD_CAP` | `90` | Members per world; past it `POST /api/join` answers 503 `world-full`. |
| `LW_TL_CAP` | `10` | Live human girls per Timeline; past it a join into that Timeline answers 503 `timeline-full` and `canOpen` leaves the street out. |
| `LW_STANDIN_SEAL` | unset (off) | `min,max` whole minutes: the house seals that long after the first human seal, so a lone player cannot fall a Curtain every 20 minutes. Read at world creation only; `node server/world.mjs --standin-seal` changes a live world. |
| `LW_SNAPSHOT_SEC` | `60` | Seconds between state snapshots when anything happened (section 12.7). |
| `LW_SNAPSHOT_ACTIONS` | `50` | Accepted actions that force a snapshot. |
| `LW_SNAPSHOT_MAX_LAG` | `5000` | Journal rows past the snapshot before `/api/health` answers 503 `world-down`. |
| `LW_BACKUP_KEEP` | `96,14` | Backups kept: quarter-hourly copies, then one a day (section 12.9). |
| `LW_WORLD_RESET` | unset | `1` for one start: a world whose `state_v` is behind this server is reset after a backup instead of refusing to start (section 12.8). |
| `LW_DEV_TICK_THROW`, `LW_DEV_STALL_TICK` | unset | Dev-only hooks for the server tests (`1`; refused without `LW_DEV=1`): the next tick an act runs throws; the timer never stamps `lastTickAt`. |

**Start-up guards (exit status 2, one line on stderr):** `LW_DB` unset; `LW_PORT` not an integer from 1
to 65535; `LW_ORIGIN` not a bare `http(s)://host[:port]` origin; `LW_DEV=1` with an `https://` origin;
no `LW_DEV` with an `http://` origin; a `schema_version` newer than this server knows (`MAX_READABLE`, 2);
any world setting above out of its range; a world row whose rate differs from `LW_MIN_PER_SEC`; a world
row whose `state_v` is behind this server (unless `LW_WORLD_RESET=1`); a world whose snapshot does not
parse or whose journal head disagrees with its row; a replay that throws (section 12.8). Exit status 3:
`world.lock` beside the database is held by a live process (section 12.10).

**Dev mode (`LW_DEV=1`)** exists so the local site and `/api` share one origin:

- Serves the repository's published folders read-only, `GET` and `HEAD` only: `/game/*`,
  `/engine/*`, `/art-assets/*`. `/` and `/game` redirect (302) to `/game/`, and a directory path serves
  its `index.html`. Everything else is a 404: dotfiles, `server/`, `docs/`, `scripts/`, `.git`, the
  database. Paths are decoded once, normalised, and must stay inside one of the three folders; no
  directory listings.
- Static responses send `X-Content-Type-Options: nosniff`, `Cache-Control: no-cache`, a `Content-Type`
  by extension (html, js, mjs, css, json, webp, png, jpg, svg, woff2; anything else
  `application/octet-stream`), and the live site's policy, so CSP mistakes show up in dev:
  `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`
- The session cookie is `lw_dev` (section 2) and the client IP is the socket address.
- Open `http://localhost:8091/game/` (with `LW_ORIGIN` unset). Any other host name for the same server
  is a different origin and its POSTs get 403 `bad-origin`.

Node 22 prints `ExperimentalWarning: SQLite is an experimental feature` once at start;
`--disable-warning=ExperimentalWarning` silences it. On SIGTERM or SIGINT the server stops accepting,
lets requests in flight finish (5 s at most), closes the database and exits 0.

---

## 4. Endpoints

Auth column: **none** = anyone; **optional** = a live session is used if present; **session** = 401
`not-signed-in` without one. Every non-GET row also passes the hygiene checks of section 1 first.

| Method | Path | Auth | Success | Rate limit |
|---|---|---|---|---|
| GET | `/api/health` | none | 200 | none in the app |
| POST | `/api/signup` | none | 201 + cookie | 5 per hour per IP; 20 per hour per IPv6 /48 |
| POST | `/api/login` | none | 200 + cookie | 10 per 15 min per IP; 10 failures per 15 min per name |
| POST | `/api/logout` | optional | 200 + clearing cookie | none in the app |
| GET | `/api/me` | optional | 200 | none in the app |
| GET | `/api/save` | session | 200 | none in the app |
| PUT | `/api/save` | session | 200 | 120 per hour per user |
| GET | `/api/players` | none | 200 | 60 per minute per IP |
| POST | `/api/feedback` | optional | 201 | 10 per hour per IP |
| POST | `/api/join` | session | 201 + the view payload | 3 per hour per user; 5 per hour per IP |
| POST | `/api/act` | session + member | 200 + the view payload | 300 per minute per user |
| GET | `/api/view` | session + member | 200 | 120 per minute per user |
| GET | `/api/profile` | session + member | 200 | counted in the view limit |

The last four are the arena's (section 12). **member** = the session's user has a row in `world_members`
with a live girl; otherwise 403 `not-in-world`.

The `user` object, returned by signup, login and me:

```json
{ "name": "Madam_X", "saveUpdatedAt": 1791374400000 }
```

`name` is the nom de plume as it was typed at sign-up (its capitals kept). `saveUpdatedAt` is
`saves.updated_at`, or `null` if the player has never uploaded a game. `GET /api/me` adds `member`
(section 12.2).

### GET /api/health

Runs `SELECT 1` on the database and checks the world: loaded, its tick timer stamped within 10 s, and
its journal within `LW_SNAPSHOT_MAX_LAG` rows of the snapshot. Reveals nothing about players.

- 200 `{ "ok": true, "world": { "seq": 5678, "snapSeq": 5640, "clock": 1210, "clockBehindMs": 0, "members": 12 } }`
  (`clockBehindMs` > 0 when the real clock stepped back and the District is waiting; never a failure)
- 503 `down` (the database), 503 `world-down` (the world), both with `Retry-After: 30`

### POST /api/signup

```json
{ "name": "Madam_X", "password": "<8-128 chars>" }
```

Exactly these two keys, both strings. Checks, in order (rate limit first, before the body is read, so
nothing is parsed or hashed for a request over the limit):

1. Rate limit, 20 per hour per IPv6 /48 (IPv6 only), then 5 per hour per IP; every request that passed
   the header checks counts. 429 `rate-limited`.
2. `name` matches `^[A-Za-z0-9_]{3,24}$`, else 400 `name-format`.
3. `name` is not reserved or blocked (section 6), else 400 `name-reserved`.
4. The password rules of section 6, else 400 `password-short`, `password-long`, `password-name` or
   `password-common`.
5. `name_key = name.toLowerCase()` is not taken, else 409 `name-taken` (checked before hashing; the race
   with a parallel sign-up is caught by the UNIQUE constraint and gives the same 409).
6. Hash the password (section 6), then in one transaction insert the user and a new session.

- 201 `{ "user": { "name": "Madam_X", "saveUpdatedAt": null } }` and the session cookie.
- 400, 409, 429 as above; 503 `busy` if the hashing queue is full.

### POST /api/login

```json
{ "name": "madam_x", "password": "<8-128 chars>" }
```

Exactly these two keys, both strings. The name is matched case-insensitively.

1. Rate limit, 10 per 15 minutes per IP; every request counts, before the body is read. 429
   `rate-limited`.
2. `name` matches the name pattern, else 400 `name-format` (a malformed name cannot exist, so this
   reveals nothing).
3. Rate limit, 10 **failed** logins per 15 minutes per `name_key`, whether or not the name exists.
   429 `rate-limited`. The attempt is counted as a failure here, before the hash starts, so logins
   running side by side cannot all slip under the limit together; it is taken back if the password
   matches, or if the hash queue was full (503 `busy`, nothing was checked).
4. If the password is longer than 128 characters (section 6): 401 `bad-login` without hashing.
5. Look the user up. Hash the password against that user's stored salt, or, for an unknown name,
   against a dummy hash made at start-up, so both cases cost one scrypt. Compare with
   `crypto.timingSafeEqual`.
6. A mismatch or an unknown name: 401 `bad-login`, the same code and message for both, and the failure
   counted in step 3 stands. A match: delete the request's old session if any, create a new one, set
   `users.last_seen_at = now`.

- 200 `{ "user": { "name": "Madam_X", "saveUpdatedAt": 1791374400000 } }` and the session cookie.
- 400, 401, 429 as above; 503 `busy` if the hashing queue is full.

### POST /api/logout

Body `{}` or empty, with the usual `Origin` and `Content-Type`. Deletes the session named by the cookie,
if any. Idempotent.

- 200 `{ "ok": true }` and the clearing cookie.

### GET /api/me

- 200 `{ "user": { "name": "Madam_X", "saveUpdatedAt": 1791374400000, "member": true }, "crowd": { "victorian": 7, "wildwest": 3, "vegas": 11 }, "tlCap": 10 }`
  when signed in (this request may also renew the cookie, section 2). `member` is whether the user has a
  row in `world_members`; `crowd` is the live human girls per Timeline and `tlCap` the cap, both public,
  so the pick page can say how many girls are on each street and grey a full one (section 12).
- 200 `{ "user": null, "crowd": { ... }, "tlCap": 10 }` when signed out (and a clearing cookie if a dead
  one was sent). Never 401: the page asks on every load and a signed-out visitor is not an error.

### GET /api/save

- 200 `{ "save": { ... }, "updatedAt": 1791374400000 }`: `save` is exactly the object last stored by
  `PUT /api/save`. The server may splice the stored JSON text into the response without parsing it.
- 200 `{ "save": null, "updatedAt": null }` if there is none.
- 401 `not-signed-in`.

### PUT /api/save

```json
{
  "save": { "v": "proto-1|scandal-v2-r5", "at": 1791374399123, "S": { }, "ui": { } },
  "summary": { "tier": "rare", "title": "dress lodger", "road": "standing", "whorescore": 4, "timelines": ["victorian"] }
}
```

Exactly these two keys. Body cap 1 MiB. Measured engine saves (slice options, bot-driven) are 24,720
bytes fresh, 238,261 bytes steady and 391,826 bytes at their peak, so the cap leaves room and the client
sends the save uncompressed.

Checks, in order. The first three use the headers alone: a stranger's body is never read or parsed.

1. The session: 401 `not-signed-in` without one.
2. The save-body budget: at most 8 save bodies are read and parsed at once across all players (each can
   hold 1 MiB in memory). Past that: 503 `busy` with `Retry-After: 2`, and the client tries again at its
   next save.
3. The upload limit, 120 per hour per player: 429 `rate-limited`.
4. Read and parse the body (section 1), then the field checks below.
5. The stored size: `JSON.stringify(save)` must also fit in 1 MiB, else 413 `too-large`. Numbers can
   come back longer than they went in (`1e20` is 4 bytes in and 21 out), and the cap is on what is
   kept as well as what is sent.

`save` is the envelope the game already writes to `localStorage` (section 10), checked only at its top
level; the server never interprets `S` or `ui`:

| Field | Rule |
|---|---|
| `v` | string, 1 to 64 printable ASCII characters (the client's `SAVE_V`) |
| `at` | integer, 0 to 2^53 - 1 (the client's `Date.now()` when it saved; stored, never compared) |
| `S` | a plain object (the engine state) |
| `ui` | a plain object (what the page needs to resume) |

No other keys. A failure here: 400 `bad-save`. `summary` follows section 5 exactly; a failure there:
400 `bad-summary`. The whole request is refused if either part fails.

On success the server stores `JSON.stringify(save)` (re-serialised from the parsed object, so a
rejected key can never be stored) and the canonical summary (the five keys in the order of section 5),
in one upsert. `updated_at` strictly increases per player: it is `max(now, previous + 1)`.

- 200 `{ "updatedAt": 1791374400000 }`
- 400 `bad-save` or `bad-summary`, 401 `not-signed-in`, 413 `too-large`, 429 `rate-limited`, 503 `busy`.

**Untrusted.** `S` and `ui` are whatever a client sent, markup included. They are only ever loaded back
into the game that wrote them; anything that ever shows another player's saved game (an admin view, an
export, real players as rivals inside a Curtain) must escape every string from it, as the Players board
does with `esc()`.

Last write wins: the server keeps no history and does not compare `at` or `updatedAt` on the way in.

### GET /api/players?limit=50

Only `limit` is accepted: an integer from 1 to 100, default 50. Any other query key, or a bad limit:
400 `bad-request`. Since schema v2 the board is the world's Whorescore board (`leaderboards(state)`,
section 12): every account in the arena, humans and house players alike, best first. The cloud saves are
no longer read here.

```json
{ "players": [
  { "rank": 1, "name": "Madam_X", "tier": "rare", "title": "dress lodger", "road": "standing",
    "whorescore": 4, "timelines": ["victorian"], "lastActive": 1791370800000, "house": false }
] }
```

- Order: the engine's (Whorescore descending, then the second girl, then total Renown, then account id).
  `rank` is the 1-based position in that order. Automatons are not listed.
- `tier`, `title`, `road` are the account's face: its girl with the highest-scoring tier; `whorescore` is
  the account's total; `timelines` lists the eras her live girls are in.
- `lastActive` is the real time of the player's newest accepted action (a join counts), rounded
  **down to the hour**; `null` for a house player. It never passes through the District clock, so a
  whole-day catch-up shift (section 12.8) cannot move it.
- `house` is `true` for a house player (the client tags the row "house player").
- Nothing else about a player is ever returned (no ids, no join date).
- 429 `rate-limited`.

### POST /api/feedback

```json
{ "kind": "rating", "rating": 4, "text": "The Cane earned its keep.", "context": { "screen": "players", "version": "proto-1|scandal-v2-r5" } }
```

| Field | Rule |
|---|---|
| `kind` | `"bug"`, `"idea"` or `"rating"` |
| `rating` | an integer from 1 to 5 when `kind` is `"rating"`; absent or `null` otherwise |
| `text` | a string; trimmed, then 1 to 2,000 characters for a bug or idea, 0 to 2,000 for a rating. No control characters except tab, line feed and carriage return. |
| `context` | an object with exactly `screen` (`^[a-z][a-z0-9-]{0,31}$`, the page's `ui.screen`) and `version` (1 to 64 printable ASCII characters, the client's `SAVE_V`) |

No other keys. A failure: 400 `bad-feedback`. If the request carries a live session, the letter is filed
under that player (`user_id`); otherwise it is anonymous. The text is stored as given (trimmed), markup
and all: nothing shows letters today, and any reader built later (an admin page, an export) must escape
it.

- 201 `{ "ok": true }`
- 400 `bad-feedback`, 429 `rate-limited`.

---

## 5. The summary

The client computes it from its own engine state on every upload; the server checks every field and
stores it; the Players board shows it. Cheating is out of scope for v1; garbage and markup are not.

| Field | Type and bounds | Source in the engine |
|---|---|---|
| `tier` | one of `"common"`, `"rare"`, `"epic"`, `"legendary"`, `"mythic"` | `CONTENT.TIERS` (`engine/content.js:457`) |
| `title` | a string from `ERA_TITLES[tl][tier]`, its `standing` or `notoriety` value, for some `tl` in `timelines` | `CONTENT.ERA_TITLES` (`engine/content.js:460`) |
| `road` | `"standing"` or `"notoriety"` | `L.roadOf(whore)` (`engine/rules.js:73`; round 7: the paper her meters put her in); never null |
| `whorescore` | integer, 0 to 1,000,000 | `L.whorescore(S, 'you').total` (`engine/rules.js:2234`) |
| `timelines` | array of 1 to 3 distinct values from `"victorian"`, `"wildwest"`, `"vegas"`, in that order | `CONTENT.TIMELINE_IDS` (`engine/content.js:550`); 3 is `RULES.unlock.cap` |

Exactly these five keys. Integers must pass `Number.isInteger`. The server builds its sets of tiers,
titles and Timelines from `engine/content.js` at start-up. Today's 24 titles (the longest is 23
characters): dollymop, dress lodger, park woman, pretty horsebreaker, thieves' woman, prima donna,
Richest Tart in Wapping, grande horizontale, crib girl, soiled dove, hog-ranch girl, sporting woman,
lady of the line, parlour-house boarder, Queen of Hog Ranch Row, parlour-house madam, streetwalker,
outcall entertainer, card girl, ranch girl, hustler, high-end escort, Off-Strip Royalty, courtesan to
the whales.

**Which whore speaks for the account.** `tier`, `title` and `road` belong to one whore: the first entry
of `L.whorescore(S, 'you').perWhore`, which the engine already sorts by the points she scores, then by
id. The client computes it so (`acctView()` is `scandal.js:303`):

```js
function cloudSummary() {
  const acct = acctView(); // L.getView(ui.S, ME, { focus: ui.active }).account: whores carry tier and title
  const leadId = (L.whorescore(ui.S, ME).perWhore[0] || {}).whore;
  const lead = acct.whores.find((w) => w.id === leadId) || acct.whores[0];
  return {
    tier: lead.tier,
    title: lead.title,
    road: L.roadOf(ui.S.whores[lead.id]),
    whorescore: acct.whorescore,
    timelines: C.TIMELINE_IDS.filter((tl) => acct.whores.some((w) => w.timeline === tl)),
  };
}
```

`tierOf` is not exported by the engine, so tier and title come from the account view
(`accountSummary`, `engine/rules.js:745`), which computes the title with `eraTitle(tl, tier, route)`
exactly as the in-game boards do. A save is only written once a whore has been hired, so `acct.whores`
is never empty when this runs.

---

## 6. Names and passwords

### The nom de plume

- Format `^[A-Za-z0-9_]{3,24}$`, the same rule as the title page (`game/names.js:11`, `NOM_RE`). The
  server does no tidying: the client already turns spaces into underscores.
- Unique case-insensitively: `name_key = name.toLowerCase()`, UNIQUE in the database. `name` keeps the
  capitals typed at sign-up and is what every board shows.
- Public: it appears on the Players board once the player has uploaded a game.

**Reserved and blocked names.** For matching, a name is folded to lowercase with every character other
than a-z and 0-9 removed (so `Lady_Lavinia` folds to `ladylavinia`). Every check below also runs on a
second fold that reads look-alike figures and letters as the letters they pass for (0 o, 1 i, 3 e, 4 a,
5 s, 7 t, 8 b, 9 g, and l as i), so `Adm1n`, `4dmin`, `Admln` and `L4dyLavinia` are caught too.

- **Reserved:** a name is refused if its fold equals a reserved fold, or a reserved fold followed only by
  digits (`admin2`, `LadyLavinia99`). Seven staff words are also refused inside a longer name:
  `administrator`, `moderator`, `official`, `editor` and `system` anywhere in the fold
  (`EditorInChief`, `SYSTEM_BOT`), `admin` and `staff` at its start or end (`TheAdmin`, `Admin_Team`,
  `Official_Staff`; so `Bad_Minx` stays free). Ordinary words holding one of them (creditor, ecosystem,
  distaff, flagstaff, Stafford) are taken out of the fold first. `mod`, `root`, `house` and the cast's
  names are matched whole only (so `Modesty` and `Lady_Lavinia_x` stay free). The reserved folds are: `admin`, `administrator`, `moderator`,
  `mod`, `system`, `root`, `staff`, `support`, `official`, `editor`, `theeditor`, `house`, `automaton`,
  `standin`, `anonymous` (the game's default name before a stage name is set, `scandal.js:129`), `you`
  (the engine's account id for the player), `null`, `undefined`; plus, built at start-up from
  `engine/content.js`, the fold of every `NPC_ACCOUNTS[].name` (`content.js:435`: `LadyLavinia`,
  `Clockwork Clementine`, `Brass Bettie`, `PollyPutTheKettleOn`, `Agatha_Primm`, `BessBunbury`,
  `LottieLedger`, `PrudencePike`, `DustyD`, `WidowP`, `IvyLeague`) and of the `name` and `short` of every
  `CHARACTERS` entry whose `role` is `rival` or `standin` (`content.js:376`).
- **Blocked:** a short list of slurs, kept in the server code and not reproduced here. A name is refused
  if its fold **contains** any of them. Only words that are not part of ordinary words go on the list,
  so no innocent name is caught by accident.
- The game's own bawdy vocabulary (whore, tart, strumpet and friends) is allowed.

Both cases answer 400 `name-reserved`.

### The password

- Normalised with `password.normalize('NFC')` before any check or hash, so the same password typed on
  two keyboards matches.
- Length 8 to 128 characters after normalising, counted in code points (`[...password].length`), so an
  emoji is one character, not two: `password-short`, `password-long`. Login applies the same 128 limit.
  The title page counts the same way.
- Not equal to the name, case-insensitively: `password-name`.
- Not in a list of about 50 common passwords, compared case-insensitively (the usual digit runs and
  keyboard walks, plus the game's own obvious guesses such as the site name), and not nothing but
  spaces or one character over and over (`aaaaaaaa`): `password-common`. The list lives in the server
  code in a form `scripts/scan-public.mjs` passes as written.
- At sign-up the client says, in the game's voice, that there is no recovery: lose the password and the
  game goes with it.

### Hashing

- `crypto.scrypt` with N = 2^15, r = 8, p = 1, keylen 64, a fresh 16-byte random salt per user, and
  `maxmem: 64 * 1024 * 1024`. (Checked on Node 25: at Node's default `maxmem` of 32 MiB these parameters
  throw `ERR_CRYPTO_INVALID_SCRYPT_PARAMS`.) One hash took 46 ms on the dev Mac.
- Stored as `scrypt$32768$8$1$<salt base64url>$<hash base64url>` in `users.pass_hash`, so the
  parameters can be raised later without guessing what old rows used.
- Compared with `crypto.timingSafeEqual`.
- **At most 2 hashes in flight** (a small semaphore), with at most 16 requests waiting behind them. A
  request that finds the queue full gets 503 `busy` with `Retry-After: 2`.
- **Unknown names cost the same as known ones:** login hashes against a dummy record made at start-up.

---

## 7. Rate limits

In memory, fixed windows, per process. A restart forgets them. Limits are checked before any hashing,
and the per-address ones before the body is read. "ip" is an IPv4 address, or an IPv6 address's /64
(section 1).

| What | Limit | Key | Counts |
|---|---|---|---|
| `POST /api/signup` | 20 per hour | HMAC(IPv6 /48); not used for IPv4 | every request past the header checks |
| `POST /api/signup` | 5 per hour | HMAC(ip) | every request past the header checks |
| `POST /api/login` | 10 per 15 minutes | HMAC(ip) | every request past the header checks |
| `POST /api/login` | 10 per 15 minutes | `name_key` | failed logins only, for any name, real or not (counted when the hash starts, taken back on a match) |
| `POST /api/feedback` | 10 per hour | HMAC(ip) | every request past the header checks |
| `PUT /api/save` | 120 per hour | user id | every authenticated upload |
| `GET /api/players` | 60 per minute | HMAC(ip) | every request |
| `POST /api/join` | 5 per hour | HMAC(ip) | every request past the session check |
| `POST /api/join` | 3 per hour | user id | every request past the session check |
| `POST /api/act` | 300 per minute | user id | every request past the session and membership checks |
| `GET /api/view`, `GET /api/profile` | 120 per minute | user id | every request past the session and membership checks |

The arena's limits are keyed on the user id, never on the address: if the front web server ever stopped
passing `CF-Connecting-IP`, every player would otherwise share one bucket. A `view` 429 carries
`Retry-After` and the client slows its poll.

An exceeded limit answers 429 `rate-limited` with `Retry-After` set to the whole seconds left in the
window (at least 1). Expired windows are swept every minute. Each map holds at most 100,000 keys; when a
map is full after a sweep, the oldest window is forgotten to make room. A full map never turns away a
new address: that would let anyone with enough addresses lock every newcomer out.

**A known trade-off: the per-name limit can lock a player out of new sign-ins.** A name can be read off
the Players board (the top 100 accounts with a save) or confirmed by a 409 on Create account, and the
per-name limit counts failures from any address, so anyone who knows a name can send ten wrong
passwords for it and keep its owner from signing in on a new device for 15 minutes, again and again.
Sessions already open (30 days, renewed daily) are not touched, and the lock says nothing about whether
the name exists. This is the limit the brief asked for, and it is what stops a password being guessed
from many addresses at once. If it is ever abused, the change is to count failures per name and address
together (10 per 15 minutes) under a looser ceiling per name alone (for example 100): a designer's call.

---

## 8. Error codes

`message` is what the server sends. The client shows it as it is, or its own line for the same code,
and never shows anything else from a response.

| Code | Status | Message |
|---|---|---|
| `bad-origin` | 403 | Letters for the Editor come through the front door of this paper, not the tradesmen's entrance. |
| `bad-content-type` | 403 | The compositor only sets copy marked application/json. |
| `bad-json` | 400 | The telegram arrived in pieces, and the boy swears he ran all the way. |
| `too-large` | 413 | That parcel won't fit through the letterbox. |
| `bad-request` | 400 | The clerk has sent your form back with every wrong box circled in red. |
| `name-format` | 400 | Letters, numbers and underscores, 3 to 24. No spaces: the printer's run out. |
| `name-reserved` | 400 | That name belongs to the house. Tap the dice for another. |
| `name-taken` | 409 | That name's taken. |
| `password-short` | 400 | Eight characters at least, or a corset would be harder to get into. |
| `password-long` | 400 | 128 characters at most. The rest belongs in your memoirs. |
| `password-name` | 400 | A password that matches your name is the first thing a blackmailer tries. |
| `password-common` | 400 | Every pickpocket in town already knows that password. |
| `bad-login` | 401 | Wrong name or wrong password. We won't say which. |
| `not-signed-in` | 401 | Your name's not on tonight's list. Log in at the front desk. |
| `bad-save` | 400 | The pages came back out of order, so that save didn't go through. |
| `bad-summary` | 400 | The society column won't print a title it's never heard of. |
| `bad-feedback` | 400 | Letters to the Editor take a bug, an idea or one to five stars, in under two thousand characters. |
| `rate-limited` | 429 | Too many requests. Try again later. |
| `busy` | 503 | Every clerk is checking passwords at once, so try again in a few seconds. |
| `not-found` | 404 | No such page in this edition. |
| `method-not-allowed` | 405 | This desk doesn't handle that kind of business. |
| `server-error` | 500 | The presses have jammed. Give it a minute and try again. |
| `down` | 503 | The presses are stopped for now. Back soon. |
| `not-in-world` | 403 | You haven't picked a girl yet. See the front desk. |
| `already-in-world` | 409 | You're already on the street. |
| `world-full` | 503 | Every room on the street is taken tonight. Try again after the next Curtain. |
| `timeline-full` | 503 | That street is full tonight. The other two have room. |
| `unknown-action` | 400 | No such move in this edition. |
| `not-yours` | 403 | That girl isn't yours to send out. |
| `not-legal` | 400 | She can't do that just now. |
| `illegal-move` | 400 | *the engine's own line* (the one code whose message is not fixed; `reason` carries the engine's code) |
| `too-many-moves` | 429 | Your girls have made more moves in two days than the clerk can file. Try again later. |
| `curtain-passed` | 409 | The Curtain fell before that move went in. |
| `world-down` | 503 | The street is closed for repairs. Back soon. |

`illegal-move` is the one code whose `message` is not a fixed line: it is the engine's `RulesError`
message, and `error.reason` is its code (`bad-baseline`, `no-coin`, ...). Nothing a client sent reaches a
response except through that message after the `not-yours` gate and the id shape check have passed, and
the engine's lines quote at most a validated id or a content constant. `timeline-full` adds
`error.data.open`, the starters whose streets still have room.

`too-many-moves` answers a new action from an account that holds 5000 receipts younger than 48 hours (12.4),
with `Retry-After` set to the whole seconds until the oldest of them leaves that window. A re-post of an
action that already landed is still answered `replayed: true`: the nonce is looked up first.

`curtain-passed` answers an action on a girl whose `curtain` (the curtainNo of her Timeline when the tap was
made, 12.2) is not her Timeline's curtainNo now: the Curtain the move was made for has fallen (or, after a
restored backup, not yet come), so it is refused rather than applied to another night. Nothing is applied
and no receipt is written. A re-post of an action that already landed is still answered `replayed: true`,
whatever the Curtain: the nonce is looked up first. Account-scoped actions (`chooseStarter`,
`openTimeline`, `markSeen`) are never refused this way.

`busy` also answers a save upload when 8 save bodies are already being read (section 4); the client never shows
that line for an upload, it just tries again at the next save.

`rate-limited` is shared by every limited route (sign-up, login, letters, the Players board, uploads), so its
line names no route and no wait. On the Log in and Create account forms the client prints its own lines for
`bad-login`, `name-taken` and `rate-limited` instead (section 10, "The flows"), with the wait taken from
`Retry-After`.

`name-format` repeats the title page's own hint (`NOM_HINT`, `scandal.js:981`) on purpose: one rule,
one wording. No message uses an em dash.

---

## 9. SQLite schema

Run at every start, inside one `BEGIN IMMEDIATE` transaction after the pragmas; every statement is
idempotent. Times are integer milliseconds. `STRICT` needs SQLite 3.37 or later (Node 22.22.2 ships
3.51.2; the dev Mac's Node 25 ships 3.53.0). JSON functions are built in.

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER NOT NULL
) STRICT;
INSERT INTO schema_version (version) SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM schema_version);

CREATE TABLE IF NOT EXISTS users (
  id           INTEGER PRIMARY KEY,
  name         TEXT    NOT NULL CHECK (length(name) BETWEEN 3 AND 24),
  name_key     TEXT    NOT NULL UNIQUE CHECK (name_key = lower(name)),
  pass_hash    TEXT    NOT NULL,
  created_at   INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT    PRIMARY KEY CHECK (length(token_hash) = 64),
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
) STRICT, WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS sessions_by_user   ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_by_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS saves (
  user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  summary    TEXT    NOT NULL,  -- canonical JSON: { tier, title, road, whorescore, timelines }
  updated_at INTEGER NOT NULL,
  data       TEXT    NOT NULL   -- JSON.stringify(save): { v, at, S, ui }; last, see below
) STRICT;

CREATE TABLE IF NOT EXISTS feedback (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  kind       TEXT    NOT NULL CHECK (kind IN ('bug', 'idea', 'rating')),
  rating     INTEGER CHECK (rating BETWEEN 1 AND 5),
  text       TEXT    NOT NULL CHECK (length(text) <= 2000),
  context    TEXT    NOT NULL,  -- JSON: { screen, version }
  created_at INTEGER NOT NULL,
  CHECK ((kind = 'rating') = (rating IS NOT NULL))
) STRICT;
```

`lower()` folds ASCII only, which is all a name can hold. On start the server reads
`max(schema_version.version)`; if it is greater than `MAX_READABLE` (2) the server refuses to start. The
v2 tables, the migration runner and the `locking_mode = EXCLUSIVE` pragma are in section 12.11.

**`saves.data` is the last column on purpose.** SQLite reads a row's columns in order, and a saved game
(about 250 KB) spills over many overflow pages; a column stored after it can only be reached by walking
them. With `summary` and `updated_at` first, the Players board and every session lookup (which joins
`saves` for `updated_at`) never touch the saved game. Measured over 2,000 players with 250 KB saves: the
board query took a median 55.2 ms with `data` second and 0.9 ms with it last.

The statements the endpoints rely on:

```sql
-- PUT /api/save: one upsert; updated_at strictly increases per player
INSERT INTO saves (user_id, data, summary, updated_at) VALUES (?, ?, ?, ?)
  ON CONFLICT (user_id) DO UPDATE SET
    data = excluded.data, summary = excluded.summary,
    updated_at = max(excluded.updated_at, saves.updated_at + 1)
  RETURNING updated_at;

-- GET /api/players
SELECT u.name, s.summary, s.updated_at
  FROM saves s JOIN users u ON u.id = s.user_id
  ORDER BY json_extract(s.summary, '$.whorescore') DESC, s.updated_at DESC, u.name_key ASC
  LIMIT ?;

-- hourly sweep
DELETE FROM sessions WHERE expires_at <= ?;
```

---

## 10. Client contract and hook points

### What the client stores

The game already keeps its save in `localStorage` through `store` (`scandal.js:79-83`, every key
prefixed `lw-scandal-`). The cloud save is that same object, unchanged: `store.set('game', ...)` in
`saveGame` (`scandal.js:164-176`) writes `{ v: SAVE_V, at: Date.now(), S, ui: {...} }`, with
`` SAVE_V = `${R.version}|scandal-v2-r5` `` (`scandal.js:160`, `R.version = 'proto-1'` at
`engine/content.js:45`). The client adds these keys:

- `lw-scandal-synced`: **retired with the arena client** (12.14). Older builds kept
  `{ updatedAt, at }` here for the cloud save; the arena client deletes the key at start and never
  uploads a save. The paragraphs of this section that describe the upload and download flows are the
  record of the cloud-save client and are superseded by 12.14; `GET/PUT /api/save` stay served for now.
- `lw-scandal-arena:<accountId>`: the arena client's bookkeeping for one account (12.14). Never the
  engine state.
- `lw-scandal-acct`: the signed-in name, a hint only (so a page that cannot reach the server can still
  say whose game it is). The truth is always `GET /api/me`.
- `lw-scandal-lastname`: the name this device last logged in or created an account with, in the
  server's spelling. Written wherever `acct` is written (`known()` in `game/net.js`), copied from `acct`
  at start-up when it is missing, and **never cleared**: logging out, a lapsed session and "Start a new
  scandal" all keep it. It only picks which form the title opens on (Log in) and pre-fills the Log in
  name. So on a shared device, the next person to open the game sees the last stage name used there in
  the Log in form, even after Log out. It is never a password, but it is not always public: the Players
  board lists only accounts that have uploaded a save, at most 100 of them, highest Whorescore first.

### The flows

- **Page load.** Render at once, as today (`render()`, `scandal.js:4289`); nothing waits for the
  network. Then `GET /api/me` (8 s timeout). Signed out: a guest game, exactly as today. Signed in, with
  `user.saveUpdatedAt !== null` and either no `synced` record or `user.saveUpdatedAt > synced.updatedAt`:
  another device saved since, so `GET /api/save`, write it with `store.set('game', save)`, record
  `synced`, and re-render the title so `continueCard` (`scandal.js:972`) offers it. In every other
  signed-in case, if there is a local game and it is unsent, upload it. Only server times are compared
  with server times; device clocks never decide anything.
- **Log in or Create account, chosen first** (the title page signed out, and the Menu's "Keep your game
  anywhere"). Two buttons, **Log in** and **Create account**, sit above one slot that holds at most one
  form. Each is a real `<form method="post" novalidate>` with its own `action` (`/api/login`,
  `/api/signup`) and its own autocomplete hints, so password managers can tell the two apart:

  | Form | Name input | Password input |
  |---|---|---|
  | `#login` | `#login-name`, `name="username"`, `autocomplete="username"` | `#current-password`, `name="password"`, `autocomplete="current-password"` |
  | `#signup` | `#signup-name`, `name="username"`, `autocomplete="username"` | `#new-password`, `name="new-password"`, `autocomplete="new-password"`, `minlength="8"` |

  Only the chosen form is in the page: choosing or switching inserts it whole (Chrome reads a form's
  fields again when one is added, not when one is un-hidden). Neither password field has `maxlength` or
  `passwordrules`. If the script's submit handler is ever missing, the browser POSTs to the API, which
  refuses it before reading the body (403 `bad-content-type`), so credentials never land in a URL.
  Which form opens: a device with `lastname` opens on Log in with the name filled in. Without it, the
  title shows the two buttons and no form (it asks first), and the Menu sheet, opened mid-game, opens on
  Create account with the guest's stage name filled in. Create account on the title is filled in with
  the stage name of the guest game saved on the device, when there is one. Nothing is focused on load, so no phone keyboard
  covers the page. **Play as guest** sits outside both forms on the title (hidden when a playable game is
  on the device: Continue is the way in then).
- **Log in** (`#login`): the name must match the name pattern and the password must not be empty, or
  nothing is sent. `POST /api/login`. 200: logged in. 401 `bad-login`: "That name and password don't
  match." under the password, which is selected. **A refused login is never turned into a sign-up.**
- **Create account** (`#signup`): the name pattern and the section 6 length and same-as-name rules are
  checked first. `POST /api/signup`. 201: logged in as a new player, with a welcome line that says
  there is no password reset. 409 `name-taken`: "That name's taken." under the name, with a **Log in
  instead?** button that carries the name (not the password) to the Log in form and focuses its empty
  password field; she taps Log in herself.
- **Errors, both forms:** `name-format`, `name-reserved` and `password-*` show the server's line under
  the field they are about. 429 `rate-limited`, in the form's status line, with the wait from
  `Retry-After` (under a minute: "a minute"; under 55 minutes: "N minutes"; else "about an hour"): Log in
  says "Too many tries. Try again in {wait}."; Create account says "Too many new accounts from this
  connection. Try again in {wait}." (on the title: "…, or play as a guest for now."). 503 `busy`: the
  server's line. Unreachable: "Can't reach the server.", then on the title "Play as a guest for now and
  save online later from the Menu." and in the Menu "Keep playing and try again later. Nothing is
  lost." On a title with a playable game (no Play as guest button), "play as a guest" reads "carry on
  with the game on this device".
- **While a request is in flight** the form has `aria-busy="true"`, its inputs are `readOnly` (never
  `disabled`: Chrome treats a form whose fields are all unfocusable as gone, and could take a 2xx
  from any other request as a successful login), and its buttons, the two choice buttons and Play as
  guest are disabled.
- **Success is the form leaving the page after a 2xx response**, which is how Chrome (it watches the
  form with `WebFormElementObserver`: removal or `display: none`) and Firefox (form-removal capture)
  detect a login made with `fetch`. Every success path re-renders the page or closes the sheet; no
  `history.pushState` is added for it.
- **After a login:** `GET /api/save`. A cloud game exists: it replaces the game on this device (the
  explicit login rule). None: upload the local game, if there is one. **After a sign-up:** upload the
  local game, if there is one. Either way set `ui.name` to `user.name`, and if a game is loaded set
  `ui.S.accounts.you.name` to it too, so the in-game boards show the nom de plume.
- **Play as guest:** a guest game that never leaves the device (`ACTS['guest-play']`). A playable game on
  the device is picked up instead (the button is hidden then; this is the safety net). Otherwise the
  stage name is the one in the Create account form if it is open and valid, else a random one from
  `game/names.js` `randomName()`; the Menu's Create account form offers it later. It never reads the
  Log in name.
- **A stale cloud save** (`save.v !== SAVE_V`) is treated like a stale local one (`loadSave`,
  `scandal.js:177-181`): not loaded. The local game, if any, is uploaded over it.
- **Uploads** (the 120-per-hour limit is one upload per 30 s, and the District clock saves locally about
  every 1.2 s while she plays, so a plain 3-second debounce would either never fire or burn the limit in
  six minutes):

  ```
  after every local save:   unsent = true; if no timer, start one for max(3 s, lastUpload + 40 s - now)
  page hidden:              after saveGame() has run (its listener, line 199, comes first),
                            if unsent, cancel the timer and upload now
  upload:                   PUT /api/save { save: <what saveGame just stored>, summary: cloudSummary() }
    200  -> synced = { updatedAt, at: save.at }; lastUpload = now
    401  -> signed out on this device; the gentle notice; the game plays on as a guest game
    429  -> try again after Retry-After (the next upload carries the newest game anyway)
    400  -> do not retry this save; log once to the console
    network failure or 5xx -> try again at the next local save
  ```

  Do not use `fetch(..., { keepalive: true })` or `sendBeacon` on `pagehide`: both cap the body at
  64 KiB and a save is about 240 KB. The upload on `visibilitychange` to hidden (the page is still alive
  then) is the last one; at most about 40 seconds of play can miss the cloud when a tab is killed.
- **Log out** (Menu > Your account, or the title): `POST /api/logout`, forget `synced` and `acct` (not
  `lastname`). The game on this device stays, as a guest game.
- **Start a new scandal while signed in:** wipe the local game only and **keep** `synced`, so the next
  page load does not pull the old cloud game back. The new game's first upload replaces it. (There is no
  DELETE endpoint in v1.)
- **Unreachable server:** every call has a timeout and a catch. The game never blocks; one gentle notice
  per page load says the game is being kept on this device for now.
- **The Players board:** on entering the screen, `GET /api/players?limit=50` (not again within 30 s),
  rendered as its own section, labelled as real players ("From the street" or similar), next to the
  House Automatons. Every name, title and number from the server goes through `esc()`
  (`scandal.js:43`). Rows are not buttons: `profile-acct` (`scandal.js:3580-3584`) looks up local engine
  accounts and has nothing to show for a real player. The player's own row is marked when its name
  matches hers case-insensitively. A failed fetch prints one line in the section; the local boards are
  untouched.
- **Letters to the Editor:** `POST /api/feedback` with `context: { screen: ui.screen, version: SAVE_V }`;
  a thank-you line in voice on 201; on 429 the message.

### Hook points in `game/scandal.js` (line numbers as of the Log in / Create account change)

| Lines | What is there | Its part in this contract |
|---|---|---|
| 43 | `esc()` | Escapes everything that came from the server. |
| 79-83 | `store` (localStorage, prefix `lw-scandal-`) | Keys `synced` and `acct` (net.js), `lastname` (net.js, read by `authOpen`). |
| 128-152 | `ui` state; `name: 'Anonymous'` at 129; `authMode`, `authDraft` at 151 | The game's name (the server's spelling once logged in); the open form and what was typed in each (memory only). |
| 160 | `SAVE_V` | Sent as `save.v` and as `context.version`. |
| 161-163 | `saveTimer`, `saveSoon()` (a 1.2 s throttle, "the District clock acts every second") | The reason for the upload cadence above. |
| 164-176 | `saveGame()`: `store.set('game', { v, at, S, ui })`, then `net.saved()` | Arms the upload. |
| 177-181 | `loadSave()`: stale check `g.v === SAVE_V` | The same check as a cloud save gets. |
| 182-196 | `resumeGame()` | Loads a cloud save once net.js has written it to the local store. |
| 199-200 | `visibilitychange` and `pagehide` call `saveGame` | Upload on hidden (`net.flush()`); no keepalive upload on pagehide. |
| 211-224 | `wearName()`, `reloadOnto()` | The server's spelling on the game; a cloud game that arrives mid-game reloads the page onto it. |
| 231-251 | `retitle()`, `onNet()` | Re-prints the title without losing what was typed (`saveDraft`/`fillDraft`); what net.js reports (`named`, `cloud`, `signed-out`, `down`). |
| 303 | `acctView()` | Feeds `cloudSummary()` (section 5). |
| 972-978 | `continueCard()` | Shows a downloaded cloud game too. |
| 981-1000 | `NOM_HINT`, `NOM_SHORT`, the password lines, `NO_KEY`, `ACCT_LEAD` | `NOM_HINT` doubles as the `name-format` line. |
| 1004-1034 | `blankDrafts()`, `AUTH_IDS`, `authForm()`, `authOpen()`, `saveDraft()`, `fillDraft()` | Which form opens (`lastname`), and keeping what was typed across switches and re-renders. |
| 1037-1060 | `loginForm()`, `signupForm()` | The two forms (section 10, "The flows"). |
| 1063-1090 | `authPick()`, `titleDesk()` | The two choices and the slot for one form; the title's desk, logged in or out; Play as guest. |
| 1091 | `SCREENS.title` | |
| 2296-2325 | `coinOnHand`, `BOARDS`, `SCREENS.players`; House Automatons at 2322 | The real players' section ("From the street", 2353) sits beside the Automatons. |
| 2358 | `streetFetch()` | `GET /api/players` through net.js. |
| 2505-2513 | `go()`; the `players` branch at 2511 | Starts the `/api/players` fetch on entering the screen. |
| 2625-2663 | `MODALS.menu`; the menu list 2638-2647 | "Your account" or "Keep your game anywhere" (2644), "Letters to the Editor", "Start a new scandal" (2646). |
| 2729-2734 | `MODALS.wipe` | Says what a wipe does to the copy on the server. |
| 2737-2759 | `MODALS.acct` | Your account (logged in), or Keep your game anywhere: the same choices and forms as the title, and Not now. |
| 3230 | `ACTS.resume` | Resumes whatever the local store holds. |
| 3233-3269 | `nom-roll`, `fieldState()`, `nomState()`, `tidyNom()`, the `input` and `compositionend` listeners | The name rule as she types; a field's hint doubles as its error line. |
| 3279-3318 | `ACTS['auth-mode']`, `ACTS['auth-switch']`, `addInstead()`, `formLine()` | Choosing or switching forms; "Log in instead?" after a 409. |
| 3322-3380 | `formBusy()`, `readNom()`, `logIn()`, `signUp()`, `waitWords()`, `authFail()` | The two calls and every error line (section 10, "The flows"). |
| 3383-3411 | `signedIn()` | `net.adopt()`, then the success path that takes the form off the page. |
| 3416-3445 | `ACTS['guest-play']`, `ACTS.begin`, `ACTS['sign-out']`, `ACTS.acct` | Play as guest; a new game when logged in; Log out; the Menu sheet opened fresh. |
| 3546-3552 | `ACTS.restart`, `ACTS.wipe` (`store.del('game')`, reload) | Keeps `synced` when wiping (above). |
| 3580-3584 | `ACTS['profile-acct']` | Not used by real-player rows. |
| 4034-4059 | `hire()`; `L.newGame(SEEDS[id], gameOpts(id, ui.name))` at 4036 | `ui.name` is already the server's spelling of the name. |
| 4136-4157 | The click dispatcher (`data-act` to `ACTS`) | New buttons hook in here as new `ACTS`. |
| 4277-4283 | The `submit` handler | `#login` → `logIn()`, `#signup` → `signUp()`, `#letterform` → `postLetter()`. |
| 4286 | `?debug` test hook `window.__lw` | Handy for the end-to-end tests. |
| 4288-4293 | `net.init()`, the first `render()`, the `hello` pick-up after `reloadOnto`, `net.start()` | The page-load `GET /api/me` goes after the first render. |

Elsewhere: `game/names.js` (`NOM_RE` 11, `cleanNom` 15, `randomName` 62); `game/slice-config.js`
(`gameOpts` 14, which puts the name into the engine as account `you`); `engine/rules.js` (`roadOf` 73,
`eraTitle` 132, `getView` 649, `accountSummary` 745, `whorescoreM` 2221, `whorescore` 2234, `leaderboards` 2236);
`engine/content.js` (`RULES.version` 45, `CHARACTERS` 379, `NPC_ACCOUNTS` 438, `TIERS` 455,
`TIER_NAMES` 456, `ERA_TITLES` 458, `TIMELINE_IDS` 548).

The page's CSP stays as it is: no inline scripts or handlers, and every call goes to `/api` on the same
origin (`connect-src 'self'`).

---

## 11. Decisions pinned here

Where the brief left a choice, or two parts of it pulled against each other, this is the choice.

1. **Log in and Create account are separate choices.** A refused login is never turned into a sign-up; a
   409 on Create account offers "Log in instead?", which needs a tap from the player. Login never says
   whether a name exists (one code, the same cost). Sign-up has to refuse a taken name, so a 409 does
   reveal one; that is unavoidable with unique names (and the Players board lists the top 100 accounts
   that have a save) and is slowed to 5 tries an hour per IP, so the client says it plainly: "That name's taken."
   (An earlier client tried a sign-up straight after any refused login. A mistyped name then created a
   new, empty account, and every wrong password spent one of the address's 5 sign-ups an hour.)
2. *(superseded by 12.14: the arena client uploads no save)* **Uploads every 40 seconds at most, first one 3 seconds after a change, and at once when the page is
   hidden.** The brief's 3-second debounce and the 120-per-hour limit cannot both hold while the
   District clock saves every 1.2 s; this keeps a steady player near 90 uploads an hour.
3. *(superseded by 12.14)* **Sync compares server times only** (`saveUpdatedAt` against the stored `synced.updatedAt`). Device
   clocks are never compared, so a phone set to the wrong year cannot win or lose a game.
4. *(superseded by 12.14: a sign-in enters the District)* **An explicit sign-in loads the cloud game if there is one**, replacing the one on the device. A
   sign-up uploads the device's game.
5. *(superseded by 12.14)* **No DELETE.** A wipe while signed in clears the device and keeps `synced`; the new game's first
   upload replaces the old one on the server.
6. **Log out keeps the device's game as a guest game.** Nothing is ever lost by logging out.
7. **The account's face on the board is its top-scoring whore** (`perWhore[0]`); Whorescore is the
   account's total; `timelines` lists the eras the player has opened.
8. *(superseded by 12.2: `lastActive` is the newest accepted action, to the hour)* **`lastActive` is the last upload, to the hour.** Enough for a live board, no finer.
9. **The server reads `engine/content.js`** for tiers, titles, Timeline ids and the cast's names, so the
   summary check and the reserved names can never drift from the game. Server and client deploy together.
10. **The server binds the IPv4 loopback by resolving `localhost` with family 4,** never through an IP
    literal in this repository.
11. **Saves travel uncompressed.** The measured peak (391,826 bytes) fits the 1 MiB cap, and v1 does
    not need the complexity.
12. **`users.last_seen_at`** is written at sign-up, login and the daily cookie renewal, never on every
    request. The board uses the save time instead.

---

## 12. The arena

One world per server (the District: all three Timelines and every account in one engine state, exactly
as `newGame` builds it), held in memory by `server/world.mjs`, joined and played over the four routes
below. Every accepted player action, join and tick is journaled in the same SQLite transaction that moves
the world row's `seq`; the state is snapshotted every 60 s or 50 actions, on every Curtain and on
SIGTERM; a restart replays the journal after the snapshot and catches the clock up. Design and reasoning:
`ARENA-SPEC.md` (the lead's spec of 2026-10-08, section 3); this section is the contract.

### 12.1 Ids and names

- **Account ids** are minted by the server at join: `p` plus 10 base32 characters
  (`/^p[a-z2-7]{10}$/`, 50 bits), never chosen by a client and never `users.id`. `world_members` is the
  only mapping from a user to an account.
- **Whore ids** of a human are `<accountId>:<characterId>` (`pabcdefghij:dolly`); house girls keep their
  character id. Several players may play the same starter. `charOf(id)` in the engine gives the character.
  A retired girl keeps her id for the record (12.10), so the same account hiring the same character again
  gets the next instance id: `<accountId>:<characterId>#2`, then `#3`, and so on (`charOf` drops the `#n`).
- A human girl's `name` is the player's nom de plume, so the paper names the player.
- Every id a client sends must match `ID_RE`: at most 48 characters, either `[A-Za-z0-9_:-]+` or exactly
  the rehire shape `<account>:<character>#n` with `n` a whole number from 2 (no leading zero, at most four
  digits). A `#` anywhere else is 400 `bad-request`. In a query string it travels as `%23`.

### 12.2 Routes

Every non-GET passes the hygiene of section 1 (Origin, Content-Type, declared length), then the session,
then membership, then the per-user limiter, then `readJson` under the 16 KiB cap, then the shape check,
then the `legalActions` match where the engine lists the action, then the engine. In that order, so a
stranger's body is never parsed.

#### POST /api/join

Request: `{ "starter": "dolly" | "fanny" | "jackie" }`, exactly that one key.

Steps: session (401 `not-signed-in`); the address limiter (5 per hour) then the user limiter (3 per hour);
the body; the shape (400 `bad-request`); already a member with a live girl: 409 `already-in-world`;
`WORLD_CAP` reached (a new member): 503 `world-full`; the starter's Timeline at `TL_CAP` live human
girls: 503 `timeline-full` with `error.data.open` listing the starters whose streets have room; then
`joinWorld` + `chooseStarter` in the engine, the member row and both journal rows in one transaction.
A member whose every girl is retired gets `chooseStarter` only (the same character again is
`<account>:<char>#2`, 12.1). Answer: 201 with the view payload built with every view (`all`), no boards,
no digest, and `events` holding `joined` and `starter-chosen`.

#### POST /api/act

Request: `{ "action": "<name>", "args": [ ... ], "nonce": "<uuid>", "curtain": <int> }`: these four keys, and
no others; `curtain` may be left out on an account-scoped action only.

- `action` is one of the allowlist: `chooseStarter, openTimeline, study, explore, buyOffer, passOffer,
  dropItem, buyCard, cure, spendGossip, useTalent, startAssignation, playAssignation, cancelAssignation,
  dealLent, planEvening, sealPlan, unseal, markSeen, buySpecial, buyDigs`. Anything else, including the
  engine's `resolveCurtain, advanceClock, sleepTillDawn, endSeason, stageRival, newGame, joinWorld`, the
  `rummage` alias and (until the seats UI ships) `challengeSeat`: 400 `unknown-action`.
- `args` are the engine function's arguments after the state, 1 to 3 entries, JSON under 2 KiB. For
  `chooseStarter`, `openTimeline` and `markSeen` the server **replaces** `args[0]` with the session's
  account id whatever was sent. For every other action `args[0]` is a whore id that must be the account's
  own live girl (the engine's `assertOwns`), else 403 `not-yours`.
- `nonce` is `crypto.randomUUID()` from the client, `/^[0-9a-f-]{36}$/`, one per tap. Every accepted player
  action leaves a receipt, `(account, nonce)`, in `world_nonces` (12.4), kept 48 hours and never deleted
  sooner (an account holding 5000 of them has new actions refused, 429 `too-many-moves`). When the account has a
  receipt for the nonce, whatever has landed since, the answer is the **replay payload**: the current
  payload with **every live girl's view** (`all`, whatever the action was, so the girl it was for comes back
  fresh), `"replayed": true`, `events: []` and `eventsGap: false`, and nothing is applied: the action already
  landed and its first answer was lost. This check runs first, before the street count, the ownership check
  and the legality match.
- `curtain` is the curtainNo of the girl's Timeline (`views[wid].timeline.curtainNo`) when the tap was made,
  a safe integer `>= 0`. It is required on every action whose `args[0]` is a girl (400 `bad-request` without
  it) and ignored on `chooseStarter`, `openTimeline` and `markSeen`, which may leave it out (when sent it must
  still be a safe integer `>= 0`). After the nonce and the ownership check, a `curtain` that is not her
  Timeline's curtainNo now is 409 `curtain-passed` ("The Curtain fell before that move went in."): a move
  made for one evening is never applied to the next. `apply` checks it again after its catch-up tick (12.4),
  so a Curtain that falls inside the request refuses the move too. A re-post of a landed action replays
  whatever the Curtain (the nonce check comes first). The client keeps `curtain` with an unsettled act and
  re-posts it unchanged (12.14).

Argument shapes (`checkAct` in `validate.mjs`; `INT` is a safe integer in `[0, 1000]`, `ID` matches
`ID_RE`; objects admit the listed keys only):

| action | `args[0]` | `args[1..]` | `legalActions` must list |
|---|---|---|---|
| chooseStarter, openTimeline | replaced by the account id | `[character: ID]` | `type` + `character`; a street at `LW_TL_CAP` answers 503 `timeline-full` with `error.data.open`, the same count as join's |
| markSeen | replaced by the account id | `[timeline]` or `[timeline, upTo]` (a Timeline id; `upTo` a safe integer `>= 0`, no ceiling) | always allowed |
| study | wid | `[target: ID]` | `type` + `target` |
| explore | wid | `[place: ID]` or `[place: ID, { want: ID }]` | `type` + `place` |
| buyOffer, buySpecial, buyDigs, unseal | wid | `[]` | `type` |
| passOffer, cancelAssignation, dealLent | wid | `[]` | always (the engine's refusal is the gate) |
| dropItem | wid | `[idx: INT <= 2]` | always |
| buyCard | wid | `[card: ID]` | `type` + `card` |
| cure | wid | `[affliction: ID]` | `type` + `affliction` |
| spendGossip | wid | `[rival: ID]` | `type` + `rival` |
| useTalent | wid | `[{ kind: ID, card?: INT, gent?: ID, place?: ID }]` | `type` + `kind` |
| startAssignation | wid | `[gent: ID]` | `type` + `gent` |
| playAssignation | wid | `[{ cards: INT[] (1 to 2), item?: ID \| null, talent?: { kind: ID, card?: INT, art?: ART } \| null }]` | `type` |
| planEvening | wid | `[{ place: ID, cards: INT[] (up to 3), item?: ID \| null, talent?: { kind: ID, card?: INT, art?: ART } \| null, grease?: INT <= GREASE_TOP (4), stake?: boolean, slumOk?: boolean, bribe?: boolean, baseline?: [{ key: ID, place: ID, cards: ID[] (up to 3) }] (up to 3) }]` | `type` + `place` |
| sealPlan | wid | `[]` or `[plan as above]` | `sealPlan` listed, or `planEvening` with that `place` when a plan is passed |

`markSeen`'s `upTo` is a tick: the newest event id of the newest edition she has seen in that Timeline (event ids
are ticks). Without it the engine sets her seen cursor for the Timeline to the server's tick, as it always has; with it
the cursor becomes `max(seen, min(upTo, tick))`, so it never moves past what she read, never past the tick and
never back, and a Curtain that fell after the one on her screen (one the request's own catch-up tick brought
down, say) stays news for her return digest. Over the wire a malformed `upTo` (negative, fractional, a string, `null`, past
`Number.MAX_SAFE_INTEGER`) or anything after it is 400 `bad-request`. The engine reads a left-out or `null`
`upTo` as none and refuses any other that is not a safe integer `>= 0` (`bad-tick`).
`markSeen` stays account-scoped and exempt from `curtain`.

`item` is the novelty's id string (the engine matches `it.id`), `talent` is the object the engine's
`validateTalent` reads (`card` and `art` only for Double Entendre) and `bribe` is the Raid Night flag:
exactly what the page's `act(L.sealPlan, wid, plan)` sends, so a plan with a novelty, a Talent or a bribe
is judged by the engine (`no-item`, `not-your-talent`, `no-bribe`), never refused as `bad-request`.
`ART` is an own key of the engine's `ARTS` (`silk`, `wit`, `gold`, `mask`, `frolic`), checked with
`Object.hasOwn`: an inherited name (`__proto__`, `constructor`, `toString`) is 400 `bad-request`, and the
engine refuses it too (`bad-art`, in `validateTalent` and `computeEncounter`). `GREASE_TOP` is the most
Grease Palms any girl may buy: the engine's `greaseMax` at the highest Notoriety, `RULES.sway.grease.max`
plus one for each `maxUp` step (2 + 2 = 4 in this edition; `server/validate.mjs` exports it). A number
above it is 400 `bad-request`; whether she may buy any, and how many, stays the engine's (`no-grease` below
Notoriety 3 or at a Posh Place; her own `greaseMax` caps the number: 2, then 3 at Notoriety 5, 4 at 8).
A baseline entry carrying `hand` or `known` is 400 `bad-request` (the engine substitutes her own). A
shape that passes but the engine refuses (`validatePlan`, `playAssignation`, a card not in her hand): 400
`illegal-move` with the engine's message and `reason`.

Answer (200): the view payload, focus-only unless the action was `chooseStarter` or `openTimeline` (then
every view), with `events` = the newest 200 of everything the account may see since `state.tick` as it
stood before the request's catch-up tick, so the client sees what the action and its catch-up produced,
her own `breakdown` re-attached.

Errors: 400 `unknown-action`, 400 `bad-request`, 403 `not-yours`, 409 `curtain-passed` (the Curtain the move
was made for has fallen), 400 `not-legal`, 400 `illegal-move`, 403 `not-in-world`, 429 `rate-limited`, 429
`too-many-moves` (the account's receipts are at the cap, 12.4).

#### GET /api/view?since=&tick=&focus=&all=&boards=&digest=

Query keys: `since` (integer, the last `rev` seen, default 0), `tick` (integer, the last event id seen,
default 0), `focus` (one of the account's whore ids), `all`, `boards`, `digest` (`0` or `1`, default
`0`). Any other key, a repeated key or a bad value: 400 `bad-request`.

When `since` equals the world's `rev`: `{ "same": true, "boot": "3f9c0a1b2d4e5f60", "rev": 1234,
"serverNow": 1791374400000, "clock": 1210 }` (about 100 bytes). Otherwise the view payload:

```json
{
  "boot": "3f9c0a1b2d4e5f60", "rev": 1234, "tick": 8123, "serverNow": 1791374400000,
  "clock": 1210, "day": 3, "season": 1, "minPerSec": "0.016666667", "epochMs": 1791100800000,
  "account": { "id": "pabcdefghij", "name": "Ruby_Buckshot", "kind": "human", "slots": 1, "canOpen": ["fanny", "jackie"],
               "seen": { "victorian": 4411 }, "lastNonce": "4c1e...",
               "whores": [ { "id": "pabcdefghij:dolly", "char": "dolly", "name": "Ruby_Buckshot", "timeline": "victorian", "tier": "common",
                             "title": "...", "renown": 7, "coin": 4, "road": "standing", "sealed": false, "waiting": false, "art": "...", "fullPayLeft": 3 } ],
               "whorescore": 1 },
  "focus": "pabcdefghij:dolly",
  "views": { "pabcdefghij:dolly": { "...": "getView(state, wid, { logTail: 0 })" } },
  "legal": { "pabcdefghij:dolly": [ { "type": "planEvening", "place": "salon", "smileys": 2, "slumming": false } ] },
  "curtains": { "victorian": { "curtainNo": 5, "lastCurtainAt": 1080, "nextCurtainAt": 1260, "earliestCurtainAt": 1100, "humans": 7,
                               "humanNames": [ "Ruby_Quill", "Smoke_Bea", "Velvet_Ash" ],
                               "sealing": { "sealed": 3, "total": 8, "lastAt": null, "activeSealed": 1, "activeTotal": 2 }, "ready": false },
                "wildwest": { "...": "" }, "vegas": { "...": "" } },
  "events": [ { "id": 4412, "type": "curtain", "timeline": "victorian", "vis": "all", "data": { "...": "" } } ],
  "eventsGap": false, "replayed": false,
  "whorescore": { "...": "with boards=1" }, "boards": { "...": "with boards=1" },
  "digest": { "victorian": { "headlines": [ "..." ], "considered": 6, "sinceTick": 4411, "truncated": false } }
}
```

- `boot` is 16 hex characters minted from `crypto.randomBytes` once per server process start, on every
  view payload, every act answer and the short `same` answer. `rev` is only comparable within one boot:
  a restart starts a new boot, and a restored backup may carry a lower `rev` than a client holds (12.14).
- `rev` is the poll cursor (bumped by player actions, joins, and ticks that emitted events or turned the
  day); `tick` is the event-id cursor. The journal's `seq` is never on the wire; it is in `/api/health`.
- `minPerSec` is the rate as a decimal string for the client's display words only; `epochMs` is the real
  time of District clock 0.
- `account` is the engine's account summary plus `id`, `lastNonce` (the account's newest accepted nonce,
  so a client whose act answer was lost can see that it landed) and `canOpen` filtered by `LW_TL_CAP`.
- `views` holds the focus girl (`focus` if it is hers and live, else her first live girl) by default; with
  `all=1` every live girl of the account. Each is `getView(state, wid, { logTail: 0 })` (`log` empty).
  `legal` has one entry per view: `legalActions(state, wid)`.
- `curtains` covers all three Timelines; every field is public: the Curtain number, the last Curtain's
  minute, the next forced Curtain's minute (`nextForcedAt`, the fixed grid time: 06:00, 09:00, ... local
  at the default rate), the earliest an early Curtain could fall, `humans` (live human girls in the
  Timeline; a count, never a Place), `humanNames` (their nom de plumes, sorted; a name is public on the
  Players board; never a plan, a Place or a seal), `sealing` (`sealingOf`: `sealed`/`total` count the
  whole table, house players included; `activeSealed`/`activeTotal` count humans only, the ones active
  in the last `activeWindowMin`, so the seal line counts people) and `ready` (`curtainReady`).
- `events` are the newest 200 of `eventsFor(state, accountId, tick)`, oldest first: only events with
  `vis: 'all'` or her account in `vis`, her own payouts with `breakdown` re-attached (the stored log
  carries no breakdown; the engine keeps her last three on her girl). `eventsGap` is `true` when the log
  no longer holds everything since her cursor (`tick` below the log's floor) or more than 200 visible
  events lie above it; the client then opens the digest instead of replaying events.
- `whorescore` (`whorescore(state, accountId)`) and `boards` (`leaderboards(state)`, with coin on hand)
  come with `boards=1`; `digest` with `digest=1`: `awayDigest(state, wid, account.seen[tl], { tonight: true })`
  per live girl, keyed by Timeline, with `truncated` true when the log ran out before her cursor.
- `replayed` is `true` only on a replayed act answer (the replay payload of `POST /api/act`, every live
  girl's view).

Errors: 401 `not-signed-in`, 403 `not-in-world`, 400 `bad-request`, 429 `rate-limited`.

#### GET /api/profile?whore=<wid>

`publicProfile(state, accountId, wid)` with the viewer bound to the session: `{ "rev": 1234, "profile": { ... } }`.
Only `whore` is accepted. Unknown whore: 404 `not-found`. Counted in the view limit.

### 12.3 What is private between humans

Everything a rival sees goes through the engine's public views (`publicWhore`, `publicProfile`, the
Curtain results, the boards, the digest), never through another player's `getView`. `getView` is called
only with the session's own ids. In particular: a human's hand, deck, draw and discard, her `known`
facts, her sealed Place (Gossip on a human says where she goes tonight is her own affair), her Sway below
the Bar, a human winner's played cards (`lastCharmed.cards` is `null` for anyone but her), the world's
seed and every `rng` stream, the journal's `seq`, and any event whose `vis` lacks her account. Public, by
rule: Curtain results (rank, Place, Sway for share-takers), delights, afflictions, habit changes,
promotions, titles, seats, the boards, a girl's Talent, and the nom de plume. The server tests walk every
payload for these (`T-privacy-http`, `T-swarm`).

### 12.4 The journal, the queue and the nonce

In memory: `state`, `seq` (the journal head), `rev`, `snapSeq` (what the stored snapshot reflects), the
member map (`users.id` to account id), the newest nonce per account (the payload's `account.lastNonce`),
and `boot`. The receipts live in `world_nonces` only and are read with one primary-key lookup. `apply`, `join`, `tick` and
`snapshot` each run in one synchronous block with no `await` inside, so Node's single thread serialises
every engine call; a reentrancy guard throws `reentrant apply` (a 500, never a half-applied state).

`apply(accountId, type, args, nonce, curtain)`, in order (`curtain` is null for an account-scoped action):

1. The nonce: a receipt for `(account, nonce)` in `world_nonces`, however many actions came after it,
   answers `replayed: true` and touches nothing. The handler makes this check first too, before the street
   count, the ownership check and the legality match, because a landed action is often no longer legal (a
   sealed plan, an opened Timeline, a started Assignation): a re-post of it with its nonce is the replay
   payload, never 400 `not-legal` or 503 `timeline-full`. `apply` keeps the same check as a second guard,
   and the table's primary key is the last word on the pair. A refused move leaves no receipt.
   Then the storage cap: an account holding 5000 receipts younger than 48 hours is refused 429
   `too-many-moves` (the receipt window, below), again in the handler first and in `apply` as a second
   guard, so a re-post of a landed action replays even at the cap.
2. Catch-up first: if the real clock is ahead of `state.clock`, a tick (below) runs before the action, so
   an action is never applied behind the real clock. Then the Curtain: a `curtain` that is not the
   curtainNo of `args[0]`'s Timeline now (the catch-up may just have brought that Curtain down) is 409
   `curtain-passed`. The tick stays (it is its own journal row); the action writes nothing. The handler
   makes the same check before the legality match, against the state as it stood before the catch-up.
3. The pure engine function on the in-memory state (a copy per action). A `RulesError` is 400
   `illegal-move`; anything else is a 500 with the state untouched.
4. One transaction: the journal row (`seq + 1`, the account, the type, the exact arguments as applied, the
   District clock, the real time, the nonce), the receipt (`world_nonces`: the account, the nonce, that
   seq, the real time), the member's `last_nonce`/`last_rev`/`last_active_at`, and
   `UPDATE worlds SET seq = ?, rev = ? WHERE id = ? AND seq = ?`: a compare-and-set whose `changes` must
   be 1. If it is not, the row was written by another process: the server logs one line and exits 1
   rather than continue with a `seq` the row does not carry; the restart replays the file as it is.
5. Only after COMMIT: the new state is adopted, `seq` and `rev` move, the newest nonce is remembered. A
   Curtain among the events snapshots at once. A snapshot that fails never fails the request.

**The receipt window.** A receipt is kept 48 hours (`NONCE_KEEP_MS` in `world.mjs`) and is never deleted
before then: a re-post of any action inside the 48 hours is answered `replayed: true`, however many
actions came after it. The client stops asking about an unsettled act after 24 hours (`UNSETTLED_MAX_MS`
in `game/scandal.js`, 12.14), so every re-post it can send lands inside the window, with a day to spare
for a device clock that runs slow; the two numbers move together, the server's always at least the
client's. Receipts older than 48 hours are pruned at snapshot time (12.7); a snapshot prunes the journal,
never a younger receipt.

**The storage cap.** An account holding 5000 receipts younger than 48 hours (`NONCE_KEEP_PER_ACCOUNT`)
has every NEW action refused with 429 `too-many-moves` and `Retry-After` set to the whole seconds until
the oldest of them is 48 hours old; nothing is applied and no receipt is written. A re-post of a receipted
action still replays (the nonce check comes first). The cap is far above any player's pace (5000 in 48
hours is a move every 35 s for the whole two days), and it bounds the table whatever a hostile client
posts: the act limit lets one account land 300 a minute, which uncapped would be about 860,000 rows in 48
hours; capped, an account's receipts are about 1 MB with their indexes. Refusing new actions, rather than
deleting old receipts to make room, means a flood from one session can never push out the receipt of an
action another session of hers is still settling. `markSeen` keeps its receipt like any action: a re-post
applied afresh would move her seen cursor to a later tick. A reset keeps the receipts too, so an action
that landed before a reset is never applied to the girl hired after it.

`join` does the same with `joinWorld` + `chooseStarter` as two journal rows and the member row in the
same transaction. A tick is one row with `account NULL`, `type 'advanceClock'`, `args [minutes]` and
`clock` = the clock before it; `seq` always moves, `rev` only when events were emitted or the day turned.

The tick is fatal on any throw, on the timer and on a request path alike: `advanceClock` moves the clock
and resolves Curtains in place, so a state after a throw is one no replay reproduces. The server logs one
line and exits 1; the unit's `Restart=on-failure` brings it back on the last snapshot plus journal, losing
at most the tick that threw.

### 12.5 Replay and restart

`SELECT ... FROM world_actions WHERE world_id = ? AND seq > snap_seq ORDER BY seq`; for each row, advance
the clock to the row's `clock` first (`mut.advanceClock`), then the in-place engine function with the
row's arguments. The last row's `seq` must equal `worlds.seq` (or, with no rows, `snap_seq` must); else
the server refuses to start naming the mismatch. A throw during replay refuses to start naming the `seq`
and the engine code; nothing is written and the journal is left for a hand restore. Exit status 2 fails
the deploy's health poll and rolls it back.

### 12.6 The clock

`LW_MIN_PER_SEC` is District minutes per real second as a rational `num/den` in lowest terms (the default
`1/60`: one District minute per real minute), refused unless `0 < num/den <= 60` and a District day
(`1440 * 1000 * den / num` ms) is a whole number of milliseconds. The world row stores the pair; a start
with a different rate is refused (changing it under a live world would move every Curtain).

`clockAt(t) = floor((t - clock_epoch_ms) * num / (1000 * den))`. At the default rate `clock_epoch_ms` is
`LW_DAY_START` (06:00) local on the creation day (the day before when that instant is still ahead), so
the day turns, the daily resets happen and the forced Curtains fall at 06:00, 09:00, ... 03:00 local; the
world is created at `startClock = clockAt(now)`. At any other rate the epoch is `now` and the clock
starts at 0. The server logs its time zone and the epoch at creation. The epoch is fixed: a daylight-saving
change moves dawn by an hour until a world is re-created. Accepted.

A timer runs every second and advances the District by the whole minutes the real clock is ahead
(`tick`, journaled); every request path does the same before its action. A real clock that stepped back
makes the District wait, reported as `clockBehindMs` in `/api/health`, never a failure.

### 12.7 Snapshots

One transaction writes `JSON.stringify(state minus lastEvents)` to the world row with `snap_seq = seq`,
`DELETE FROM world_actions WHERE seq <= snap_seq` and `DELETE FROM world_nonces WHERE at < now - 48 hours`
(the receipts, 12.4: the only time they are pruned, and never one younger than 48 hours). The string is parsed back **before** the DELETE
and must give the same `tick`, `clock` and `seed`; on a throw or a mismatch nothing is written, one line
is logged and the journal is kept (the DELETE prunes the only journal that could rebuild a snapshot). A
snapshot that fails for any other reason logs one line, sets a failure time and retries at the next
trigger; the server never stops and no request fails for it.

When: 50 accepted actions (`LW_SNAPSHOT_ACTIONS`); 60 s since the last snapshot (`LW_SNAPSHOT_SEC`) when
anything happened or the day turned; any `curtain` event (a Curtain falls inside a seal as well as inside
a tick); SIGTERM, before the database closes; before every backup; after a reset. An idle world's journal
is one 60-byte tick row a minute.

### 12.8 Start-up, the reset and the catch-up

Before anything listens: `openDb` with the migration runner (section 12.11); the world row (none: create
one as section 12.6, with `crypto.randomBytes(16)` as the seed, stored only inside `worlds.state`); the
rate check; `JSON.parse` of the state and a shape check (`seed`, `rng`, `timelines`, `accounts`, `whores`,
`tick`, `clock`); a mismatch or a parse failure refuses to start with one line naming the newest backup
and the restore recipe (never reset, never continue); `state_v` against the server's `STATE_V`
(`world.mjs`, 1; bumped only by a change that breaks the state shape); the members and their last nonces;
the replay (12.5); the catch-up; the timers (tick, snapshot checks, backups); `listen`.

**A `state_v` behind the server refuses to start** with the line `lw-server: world state_v <old> !=
STATE_V <new>; back up and reset with: LW_WORLD_RESET=1 node server/server.mjs (one start) or node
server/world.mjs --reset <db>; the last backup is <path>`. The deploy's health poll then fails and rolls
back: a constant bump in a push can never wipe accepted state through an automatic restart. With
`LW_WORLD_RESET=1` for that one start, or through the operator command, the reset runs: a
`pre-reset-sv<old>-*` backup; every member's banked score (`whorescore(old, id).total`) read; the journal
cleared; a fresh world with a fresh seed; one `joinWorld` per member with the carried `pastWhorescore`;
one snapshot. Members re-pick a starter from the pick page. The receipts in `world_nonces` stay.

**The scores carried are read after the journal.** `old` is the snapshot with the journal after it
replayed onto it, so a Curtain paid after the last snapshot is part of the score carried. The journal is
replayed through this build's engine only when the snapshot is of this build's shape: when the journal
after the snapshot is not empty and `state_v` differs, or when a row does not replay (an engine refusal,
an unknown action, a journal head that disagrees with `worlds.seq`), the reset is **refused** before any
backup or write, exit 2, with one line naming the seq and both ways on:

```
lw-server: the reset was refused at seq 6: the journal does not replay (replay failed at seq 6: no-whore);
nothing was changed; start the old build once and stop it with SIGTERM to fold the journal, or run --reset
--from-snapshot to carry the snapshot's scores and drop the journaled ones since seq 5
```

(For another `state_v` the reason reads `the journal after the snapshot (seq N to M) was written under
state_v <old> and this build reads state_v <new>, so it is not replayed`; `since seq N` is always the first
seq after the snapshot.) The old build folds its own journal into the snapshot on SIGTERM; a journal left
by an old server that crashed is the one case this exists for. `node server/world.mjs --reset
--from-snapshot <db>` is the operator's choice to carry the snapshot's scores and drop the journal after
it: it logs one line, `world reset --from-snapshot: the snapshot's scores are carried and the K journaled
row(s) since seq N (to seq M) are DROPPED; accounts whose journaled actions are dropped: <account ids>`
(ids, never names), then resets as above.

**The catch-up**, capped at a day: `gap = clockAt(now) - state.clock`; if `gap > 1440`, the epoch moves
forward by whole District days (`ceil((gap - 1440) / 1440)` of them, persisted) so `clock % 1440` and the
06:00 alignment are kept; then the remaining gap (at most 1440) is one tick. A deploy restart costs 0 or 1
minute of District time; an outage just over 24 h costs 1 minute and one just under costs 1439 (phase is
kept, not elapsed time). A long outage resolves at most one day of Curtains, with Standing Orders for
everyone. `saved_at` is informational; the catch-up reads `clock_epoch_ms` and the real clock only.

On SIGTERM or SIGINT: stop accepting, let requests finish (5 s at most), clear the timers, snapshot,
release the lock, close the database, exit 0.

### 12.9 Backups

`server/backup.mjs`: node:sqlite's `backup()` of the live connection into
`<dir>/.lwtmp-<12 hex of sha256(the database's full path)>-<label>-YYYYMMDD-HHMM.sqlite.tmp`, opened and
checked with `PRAGMA integrity_check`, then renamed to `<label>-YYYYMMDD-HHMM.sqlite` (a counter is added
for a second copy in the same minute). A temp file a crash left behind is removed by the next copy, only by
the process that holds `world.lock` for that database (the pre-migration copy runs before the lock is taken
and removes nothing), only with this database's own prefix and the `.sqlite.tmp` suffix, and only once it
is 10 minutes old: a copy in flight, or another database's temp file in a shared folder, is never touched. Labels: `lw` (the routine copy), `pre-migrate-v1-v2`,
`pre-reset-sv1`. `dir` is `backups/` beside the database file, created at start (none for `:memory:`);
files are 0600. In-process every 15 minutes: a snapshot, one copy, then pruning to the newest 96 files
plus, of the files older than 24 h, the first of each calendar day for the 14 most recent such days
(`LW_BACKUP_KEEP=96,14`). A failed backup logs one line and never stops the server. The journal is pruned
only in the snapshot transaction, so a copy taken at any instant replays.

Restore: stop the unit, copy the chosen file over the live file (remove its `-wal` and `-shm` files),
start; the server replays the journal tail inside the copy. `PRAGMA synchronous` stays at the WAL default
(FULL): one fsync per commit, so a power cut loses nothing that was answered.

### 12.10 The lock and the operator commands

`<dir of LW_DB>/world.lock` holds the live server's pid and, on a second line, the boot it was taken in
(Linux's `boot_id`, elsewhere the boot time in seconds), opened with `O_EXCL` after removing a stale file.
Stale: the pid is dead, or the file is from another boot (a pid handed out again after a power cut or a
reboot), or the pid is not ours to signal (`EPERM`: another user's process, never the world server), or
on Linux `/proc/<pid>/cmdline` names none of the server scripts. A file from a build that wrote only the
pid is judged by the pid alone. The server takes the lock when the world opens and removes it on stop;
after a crash nothing has to be deleted by hand. The server's
connection also runs `PRAGMA locking_mode = EXCLUSIVE`, so any other process fails at its first statement
(`database is locked`); if the lock file were ever removed by hand, the compare-and-set of 12.4 still
exits the server rather than let two writers share a row.

`node server/world.mjs <command> [db]` (`db` defaults to `LW_DB`), each taking the lock first and
refusing with one line naming the live pid (exit 3) while the server holds it:

- `--reset`: the 12.8 reset, after a backup; exit 0, or 2 when it is refused (a journal that does not
  replay, or one under another `state_v`).
- `--reset --from-snapshot`: the 12.8 reset carrying the snapshot's scores and dropping the journal after
  it, with the loud log line naming the seqs and the account ids; exit 0.
- `--standin-seal <min>,<max>|off`: load and replay, snapshot, set `state.opts.standinSeal`, snapshot again
  with `snap_seq = seq`, so no replay ever crosses the change; exit 0.
- `--backup [label]`: one copy into `backups/` beside the file.
- `--evict <name>`: load and replay, snapshot, retire every live girl of the human account with that nom
  de plume (case-insensitive) by the retirement rule below, snapshot again; exit 0, or 2 when no such
  account. The remedy for a squatter: `LW_TL_CAP` counts live human girls per Timeline and nothing in play
  retires one, so a street filled by throwaway accounts stays full until they are evicted. Her account and
  banked score stay; her next `POST /api/join` hires a fresh girl under the same account id (until then she
  is 403 `not-in-world`); the same character again is `<account>:<char>#2`, then `#3`.

**The retirement rule** (one rule everywhere; the engine's `retireWhore(state, wid)`, the only way a girl
retires, never a player's move and never journaled). At the moment she retires, her season tier points
are banked into her account's `pastWhorescore`, so the account's Whorescore is the same the moment after
as the moment before; a seat she holds is vacated and the challenges for it dropped; her plan and
Assignation go. From then on she is skipped by `whorescore` (so a rehire never raises the account's
total), every board row, the road boards (`richest`, `notorious`, `respectable`) and the Renown tiebreak,
`publicProfile`'s choice of the viewer's girl (a retired girl's Studies are not her successor's), `canOpen`,
the seats and the Hall. Her id, history and log stay for the record.

`node server/backup.mjs <db> <dir> [label]` is the script form of a backup, taking the same lock.

### 12.11 Schema v2 (additive)

`SCHEMA_VERSION` is 2 and `MAX_READABLE` is 2. `world_nonces` is part of the v2 DDL itself (schema 2
never shipped without it, so there is no version 3 and production's rollback target, which reads at most
2, still opens the file); opening any v2 file also runs its idempotent `CREATE TABLE IF NOT EXISTS` and
`CREATE INDEX IF NOT EXISTS`, so a dev file written before it existed gains it. The runner reads `max(version)` from `schema_version`,
refuses anything above `MAX_READABLE`, and for each missing version in order takes a backup copy of the
file (`pre-migrate-v<from>-v<to>-*`, skipped for an empty file) and runs that version's DDL plus
`INSERT INTO schema_version (version) VALUES (?)` in one `BEGIN IMMEDIATE`. Migrations are additive only;
each version's DDL is a string in `db.mjs` (`MIGRATIONS[v]`). The pragma line gains
`locking_mode = EXCLUSIVE` on the server's connection.

```sql
-- v2: the arena. One row per world, one world per server. The engine state is the snapshot.
CREATE TABLE IF NOT EXISTS worlds (
  id             INTEGER PRIMARY KEY,
  season         INTEGER NOT NULL,            -- mirrors state.season at the last snapshot
  seq            INTEGER NOT NULL,            -- journal head: the seq of the newest world_actions row ever written
  rev            INTEGER NOT NULL,            -- view revision
  snap_seq       INTEGER NOT NULL,            -- the seq the snapshot in `state` reflects (<= seq)
  clock_epoch_ms INTEGER NOT NULL,            -- real time of District clock 0; moved only by whole District days
  rate_num       INTEGER NOT NULL,            -- LW_MIN_PER_SEC as a rational: minutes per second = rate_num / rate_den
  rate_den       INTEGER NOT NULL,            -- (1, 60) at the default
  engine_v       TEXT    NOT NULL,            -- RULES.version the snapshot was written by; for the record
  state_v        INTEGER NOT NULL,            -- world.mjs STATE_V; a mismatch at start refuses to start
  created_at     INTEGER NOT NULL,
  saved_at       INTEGER NOT NULL,            -- real time of the last snapshot
  state          TEXT    NOT NULL             -- JSON.stringify(state minus lastEvents); last column on purpose
) STRICT;

-- Append-only journal. Every accepted player action, join and tick is one row, in the order it was applied.
CREATE TABLE IF NOT EXISTS world_actions (
  world_id   INTEGER NOT NULL REFERENCES worlds(id),
  seq        INTEGER NOT NULL,
  account    TEXT,                            -- engine account id; NULL for a tick
  type       TEXT    NOT NULL,                -- an engine action name, 'joinWorld', or 'advanceClock' for a tick
  args       TEXT    NOT NULL,                -- JSON array: the exact engine arguments after the state
  clock      INTEGER NOT NULL,                -- District clock when the engine call started; replay advances to it first
  at         INTEGER NOT NULL,                -- real time applied
  nonce      TEXT,                            -- the client's nonce for a player action; NULL for a tick or a join
  PRIMARY KEY (world_id, seq)
) STRICT, WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS world_members (
  world_id       INTEGER NOT NULL REFERENCES worlds(id),
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id     TEXT    NOT NULL UNIQUE,      -- minted, opaque; never the name, never users.id
  joined_at      INTEGER NOT NULL,
  last_nonce     TEXT,                        -- the nonce of her newest accepted action (account.lastNonce on the wire)
  last_rev       INTEGER,                     -- the world rev after that action
  last_active_at INTEGER,                     -- real time of her newest accepted action (the join counts)
  PRIMARY KEY (world_id, user_id)
) STRICT, WITHOUT ROWID;

-- The receipts: one row per accepted player action, written in the same transaction as its journal row. A re-post
-- of a nonce with a row here is replayed. Pruned at snapshot time only, and only rows older than 48 hours; an
-- account holding 5000 younger rows has new actions refused (429 too-many-moves) instead (12.4).
CREATE TABLE IF NOT EXISTS world_nonces (
  world_id   INTEGER NOT NULL,
  account    TEXT    NOT NULL,                -- engine account id
  nonce      TEXT    NOT NULL,                -- the client's nonce
  seq        INTEGER NOT NULL,                -- the journal seq the action landed at (of the world before a reset)
  at         INTEGER NOT NULL,                -- real time accepted
  PRIMARY KEY (world_id, account, nonce)
) STRICT, WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS world_nonces_by_at ON world_nonces (world_id, at);
CREATE INDEX IF NOT EXISTS world_nonces_by_account ON world_nonces (world_id, account, at, seq); -- the per-account cap
```

`users`, `sessions`, `saves` and `feedback` are untouched; the cloud-save routes stay (the arena client
does not use them). The seed is inside `worlds.state` and its backups and nowhere else; nothing logs it,
and `getView` never returns it.

### 12.12 Limits and memory

Members per world 90 (`LW_WORLD_CAP`, a performance ceiling: 30 humans per Timeline measured at 2 to 6 ms
per Curtain); live human girls per Timeline 10 (`LW_TL_CAP`, the pace lever, provisional until the arena
sim sets it). The state is about 2.5 to 5 MB at `LW_LOG_LIMIT` 8000; one copy per action; a focus-only
poll payload is about 35 KB raw. The swarm test (`server/test/swarm.test.mjs`, 30 bots for 7 District
days) prints the state bytes, heap, RSS, act p95 and payload bytes on every run.

### 12.13 What the server logs

As section 3's rule: one line at creation (the epoch and the time zone), one per catch-up that skipped
days, one per failed snapshot or backup, the refusals above, the fatal lines of 12.4, and the
`--from-snapshot` line of 12.8 (seqs and account ids). Never an action's arguments, a nonce, the seed or a
player's name.

### 12.14 The arena client (what `game/scandal.js` and `game/net.js` keep and do)

The page in arena mode holds no engine state: everything it shows comes from the last payload adopted
(`ui.cache`: `boot`, `rev`, `tick`, `clock`, `acct`, `views`, `legal`, `curtains`, `whorescore`, `boards`,
`digest`, `profiles`).

**Which answer is adopted.** Every arena call is tagged with the cache it was made for and the account;
an answer that comes back for an earlier cache (she left and came back) or another account is dropped
unread, and a payload whose `account.id` is not hers is never adopted. `rev` is compared within one
`boot` only. A payload from a newer boot (the server restarted, or a backup was restored, whose `rev` may
be lower than hers) is the world as it is now and is adopted whole: its `rev` replaces hers, and the next
poll asks for every view; its `tick` replaces her cursor when it came with a poll (the event cursor,
below). Within one boot a payload below her `rev` (a poll
answered before her act landed but delivered after it) is dropped. A dropped answer never re-polls at
once: the next poll comes at its normal pace; a dropped answer that asked for every view leaves the ask
standing. A short `same` answer from another boot makes the next poll ask for the whole payload
(`since=0`).

**The boot fence.** Boots have no order of their own, but the world lock gives one: a server process
answers nothing once the next has started (it releases the lock only after its last connection closes),
so an answer from the old process is always to a request sent before the page heard anything from the
new one. The cache keeps `fence`: the newest boot it has heard from (a payload adopted from it, or a
`same` naming it) and the last request number sent before it did. An answer from any other boot to a
request numbered at or below the fence is a late answer from a process already replaced (it answered
before it stopped, and the answer was delivered late): dropped, its `same` ignored, nothing in it shown.
A request sent after the fence is answered by whatever process is running and is adopted; if that is her
own boot after another boot's `same`, the other was the older one, and the fence moves back to hers.

**The event cursor.** `tick` moves on a poll's answer (whose `events` are everything after the `tick` it
asked with), never on an act's answer, whose `events` start at the server's tick before the act and so
leave out whatever fell between her last poll and her tap. That holds on a new boot too: the first act
answer after a restart leaves the cursor where it was and sends the next poll at once, asking from the old
cursor, so a Curtain that fell before the restart still reaches her. Only when the new boot's tick is
below her cursor (a restored backup, where the events past its tick never happened) does an act's answer
move the cursor, to the server's tick, and the page asks for the digest (`digest=1`, `all=1`) and prints
it as the return digest. The ids of the events an act's
answer brought past the cursor are kept (`evAhead`), the act's caller shows them, and the next poll, which
brings them again, skips them; past the cursor they are forgotten. Every act's answer also sends its events
through the same Curtain routing as a poll's: a Curtain that fell inside the request's own catch-up tick,
whatever the move (a `markSeen`, an opening, a purchase), is queued and shown in turn if it is her girl's
(deduped by event id, so the poll never shows it twice), and another era's Curtain prints its wire line and
makes the next poll ask for every view. The one Curtain left to the caller is her own seal's (the table was
complete and it fell at once): the seal's handler shows it through the same queue, with its own line and the
hindsight it keeps. A move on a girl is refused `curtain-passed` when her Curtain falls in its catch-up, so a
Curtain of that girl's Timeline in a seal's answer is always the seal's own. While the cursor is behind the
server's tick in the newest payload (`srvTick`), the poll asks for the whole payload (`since=0`), since a
`same` would bring none of the events in between. So a Curtain that fell before her tap, or inside a poll
her act overtook, is shown once, with the next poll. On disk, under `lw-scandal-arena:<accountId>`, only its bookkeeping: the uiBook
(steps, tips, what she has read), the hindsight baselines per girl, a title-desk summary (`last`), and
`unsettled` (below). `lw-scandal-acct` and `lw-scandal-lastname` are as in section 10. A guest game under
`lw-scandal-game` is never uploaded and never touched by the arena.

The poll: `GET /api/view?since=<rev>&tick=<tick>&focus=<wid>` every 5 s while the tab is visible, at once
after an action's answer, 60 s while hidden; after a 429 the poll waits `Retry-After` (at least 15 s, at
most 60 s) and stays at 15 s for a minute. While the wire is down the poll ramps: 3 s after the first poll
that finds the District unreachable (no answer, or an answer that puts the wire down, a 5xx included),
then 5 s, then 8 s, then every 10 s; the first answer that does not (a view, a `same`, a 401, a 403 or a
429) starts the ramp over, so after a short outage (a restart) the page is back within seconds, and after
an outage longer than about 16 s within 10 s of the District answering again. `all=1`, `boards=1` and `digest=1` go on
the wire only when the screen needs them. A poll whose `events` carry a payout for the girl on screen
(her sealed plan, or her Standing Order) shows the Curtain and the edition at once, as a solo Curtain
does (queued if she is mid-action); once the edition is on screen the page posts `markSeen` for that
Timeline with `upTo` set to the newest event id among the events that edition was built from (its Curtain and
the aftermath logged just after it, such as her Standing Order notice; the slice ends before the next Curtain of
that Timeline), so the digest on her next return starts after the Curtain she watched, its Standing Order notice
included, and never past one she has not. A poll that brings
several Curtains for her girl shows every edition, oldest first (each with its own events: those after the
Curtain before it, up to its own), one after another through the same queue (closing one opens the next;
an event id already shown or queued is skipped), and posts `markSeen` once, when the last is on screen,
with that last edition's newest event id as `upTo`. When a further Curtain falls inside that `markSeen`'s own catch-up
tick, its answer queues the edition (above), the cursor stays at the edition on screen, the return digest
still tells of the new one, and its own `markSeen` goes up once it is shown. A new night that reaches
her plan screen by any answer (a poll, or an act's quiet answer such as a replayed re-post or a kept move
settled after a 429) clears her picks and draws the plan screen afresh with the new hand before the taps
are released, so the card she taps is the card she sees, at its position in the hand she now holds; when
the play screen is patched in place, a card is kept only if both its position and its card id are
unchanged (`data-idx`, `data-id`), so a new hand of the same length never keeps an old name or picture. The page prints no
While You Were Away strip from a poll: she never left. A Curtain that sent her girl out by Standing Order
adds one headline ("{Name} went out without you", the Place and her place in it) on the front page when she
closes that edition, once, never over the standings; a last call is dropped when its Curtain falls. On a
return to the District (a page load, a log in) a While You Were Away strip or sheet prints only when
something fell while she was away: a digest holding only the tips about what is coming (TONIGHT, LAST
CALL, ON THE ROTA) or "nothing stirred" prints none. A short hop to another of her girls prints its
one-line strip on the same rule.

An action: `POST /api/act` with one v4 UUID nonce per tap, serialised through one chain so her moves go
up in the order tapped. A move on a girl carries `curtain`, her Timeline's curtainNo as the page shows it
when the tap is made (`views[wid].timeline.curtainNo`), read at the tap and never again: a tap queued
behind a slow move, or behind a settle whose poll brings the next Curtain, still carries the Curtain she
tapped under and is refused `curtain-passed` if it fell; an account-scoped one carries none. No answer at all (a timeout, no connection, a proxy's page, a 500) means the
answer was lost, not necessarily the action: the page polls once, and if `account.lastNonce` equals the
nonce the action landed; otherwise it re-posts the same body once, which the server answers `replayed:
true`, applies once, or refuses. On a first post, a 503 carrying one of the server's own codes is an
answer: `timeline-full` and `world-full` print the front desk's line and refetch the view; `world-down`
and a 429 put the wire down; `too-many-moves` prints its line (the move did not land). Once the first
answer was lost, the move is settled only by a definite answer to a re-post: a 200 (applied, or
replayed), or a 4xx other than 408 and 429, which means the move did not land (the server looks the nonce
up before anything else) and the line says so plainly; `timeline-full` and `too-many-moves` count as such
refusals too, being given after the nonce check. Anything else (no answer, a 408, a 429, a 5xx) keeps
`{ nonce, name, args, curtain, at }` as `unsettled`, in memory and in the bookkeeping, and every re-post
sends that `curtain` unchanged. After a 429 the next try waits for its `Retry-After` (at most 60 s) and
then sends the same nonce again; after the rest the page prints the wire
line ("the page is checking what went through"), and when the wire answers again (the next good poll, or
the next page load) sends it once more with the same nonce through the same chain: landed means
`replayed: true` ("Your last move went through"), never applied means applied once now, refused means
the District moved on and the line says so. `curtain-passed` is a definite refusal on a first post and on a
re-post alike (a tap that raced the fall, or a kept move whose Curtain fell during the outage): the
unsettled move is cleared, the page polls, and one line says "The Curtain fell before your move went in.
Her Standing Order went out for her." when her girl went out by Standing Order at the Curtain the move was
made for (a payout for her with `standingOrder` and that `curtain`, among the events the page has had),
else only the first sentence. When the poll after the refusal is the first answer from a restored backup (a
new boot whose `tick` is below her cursor), no Curtain fell: the cursor takes the server's tick, the page
asks for the digest (`digest=1`, `all=1`) and prints it as the return digest, and the line reads "The
District was set back to an earlier hour, so your move did not go in. Have another look." instead. Nothing new goes up while an act is unsettled: a tap first
re-posts the unsettled act with its own nonce (unless a 429's wait is still running; until it is answered
for certain the tap is not sent), and the play taps are held (`body.acting`) until it is settled. While
it is unsettled one plain line stays on whatever screen she is on (`p.keptline`, `role=status`, outside
the headline strip): "Can't reach the District. Your move is kept and goes in when it's back.", or inside
a 429's wait "The District is busy just now. Your move is kept and goes in shortly."; it goes when the act
settles or she leaves the District. An unsettled act
whose `at` is more than 24 hours from now, either way (older, or ahead because the device clock was moved
back), is dropped instead, on a page load with a poll for every view, since it is past the window the page
trusts (the server keeps receipts 48 hours, 12.4). So is a kept move on a girl that has no `curtain`
(kept by a build before it was sent): the server refuses such a body before it looks the nonce up, and a
curtainNo read now could put a move made before a Curtain on the night after it. A replayed answer carries no events and moves no
cursor, so the poll at once brings the act's own events and anything that fell since her last poll. A tap never carries an old nonce, so a repeatable move (Study, a rummage, a
purchase) is never applied twice.

**Who is signed in.** `game/net.js` keeps a sign-in generation, bumped when a login or a new account is
accepted, when a log-out is, and when the page adopts the account a login named. Every call that can sign
her out (each arena call, and `GET /api/me`) notes the generation it went up under; an answer from an
earlier generation has no say over the account signed in now. So a request sent before she logged out,
answered 401 after someone else logged in on the same page, signs no one out: the account stays the new
one, the device keeps her name (`lw-scandal-acct`), and no signed-out notice prints. The page's own guard
drops that answer too (it was made for a cache she has left).

**The girl on screen.** Before every render the page checks that the girl it shows (`ui.active`) is one
the account still has. After an eviction and a rehire elsewhere (`dolly` retired, `dolly#2` live) a
payload no longer carries her, so the page moves to the first live girl whose view it holds, or to the
pick page when the account has no girl left. The poll schedules the next poll in a `finally`, so no
error while an answer is drawn can stop the polling.

**Public profiles** are fetched on demand, one request in flight per girl. A failed fetch leaves
`{ error: true, retryAt }` in `profiles` (a 429 sets `retryAt` from `Retry-After`, anything else 15 s on)
and the sheet shows one plain line ("Her file is not available right now. Try again in a minute.") and
offers neither TRADE 1 GOSSIP nor STUDY HER until the file comes; a rev
change empties `profiles` but keeps those, so nothing asks again before `retryAt`; the first open or
re-render after it asks once more.
