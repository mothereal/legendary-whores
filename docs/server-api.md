# Server API v1: accounts, cloud save, letters, the Players board

The contract between the game client (`game/`) and the game server (`server/`). Both sides build to
this file; a change to either starts here.

**In scope (the designer's lean v1):** a nom de plume and a password; one cloud save per player, last
write wins; Letters to the Editor (bug, idea or a 1 to 5 star rating, anonymous allowed); a live board of
real players on the Players screen.

**Not in v1:** email, password recovery, editions or a devices list, conflict handling, backups, an
admin page, real players as rivals inside a Curtain. Lose the password and the game goes with it.

Contents: [1 Conventions](#1-conventions) · [2 The session cookie](#2-the-session-cookie) ·
[3 Environment](#3-environment) · [4 Endpoints](#4-endpoints) · [5 The summary](#5-the-summary) ·
[6 Names and passwords](#6-names-and-passwords) · [7 Rate limits](#7-rate-limits) ·
[8 Error codes](#8-error-codes) · [9 SQLite schema](#9-sqlite-schema) ·
[10 Client contract and hook points](#10-client-contract-and-hook-points) ·
[11 Decisions pinned here](#11-decisions-pinned-here)

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

**Start-up guards (exit status 2, one line on stderr):** `LW_DB` unset; `LW_PORT` not an integer from 1
to 65535; `LW_ORIGIN` not a bare `http(s)://host[:port]` origin; `LW_DEV=1` with an `https://` origin;
no `LW_DEV` with an `http://` origin; a `schema_version` newer than this server knows.

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

The `user` object, returned by signup, login and me:

```json
{ "name": "Madam_X", "saveUpdatedAt": 1791374400000 }
```

`name` is the nom de plume as it was typed at sign-up (its capitals kept). `saveUpdatedAt` is
`saves.updated_at`, or `null` if the player has never uploaded a game.

### GET /api/health

Runs `SELECT 1` on the database. Reveals nothing else (no version, no counts).

- 200 `{ "ok": true }`
- 503 `down`

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

- 200 `{ "user": { "name": "Madam_X", "saveUpdatedAt": 1791374400000 } }` when signed in (this request
  may also renew the cookie, section 2).
- 200 `{ "user": null }` when signed out (and a clearing cookie if a dead one was sent). Never 401: the
  page asks on every load and a signed-out visitor is not an error.

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
400 `bad-request`. Lists players who have uploaded at least one game, best first.

```json
{ "players": [
  { "rank": 1, "name": "Madam_X", "tier": "rare", "title": "dress lodger", "road": "standing",
    "whorescore": 4, "timelines": ["victorian"], "lastActive": 1791370800000 }
] }
```

- Order: `whorescore` descending, then `saves.updated_at` descending, then `name_key` ascending.
  `rank` is the 1-based position in that order.
- `tier`, `title`, `road`, `whorescore`, `timelines` come from the stored summary.
- `lastActive` is the time of the player's last upload, rounded **down to the hour**.
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
| `tier` | one of `"common"`, `"rare"`, `"epic"`, `"legendary"`, `"mythic"` | `CONTENT.TIERS` (`engine/content.js:455`) |
| `title` | a string from `ERA_TITLES[tl][tier]`, its `standing` or `notoriety` value, for some `tl` in `timelines` | `CONTENT.ERA_TITLES` (`engine/content.js:458`) |
| `road` | `"standing"` or `"notoriety"` | `L.roadOf(whore)` (`engine/rules.js:73`; round 7: the paper her meters put her in); never null |
| `whorescore` | integer, 0 to 1,000,000 | `L.whorescore(S, 'you').total` (`engine/rules.js:2234`) |
| `timelines` | array of 1 to 3 distinct values from `"victorian"`, `"wildwest"`, `"vegas"`, in that order | `CONTENT.TIMELINE_IDS` (`engine/content.js:548`); 3 is `RULES.unlock.cap` |

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

An exceeded limit answers 429 `rate-limited` with `Retry-After` set to the whole seconds left in the
window (at least 1). Expired windows are swept every minute. Each map holds at most 100,000 keys; when a
map is full after a sweep, the oldest window is forgotten to make room. A full map never turns away a
new address: that would let anyone with enough addresses lock every newcomer out.

**A known trade-off: the per-name limit can lock a player out of new sign-ins.** Names are public on
the Players board, and the per-name limit counts failures from any address, so anyone can send ten wrong
passwords for a name and keep its owner from signing in on a new device for 15 minutes, again and again.
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
`schema_version.version`; if it is greater than 1 the server refuses to start.

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

- `lw-scandal-synced`: `{ updatedAt, at }`, the server's `updatedAt` and the local save's `at` from the
  last successful upload or download. The local game is **unsent** when there is no `synced` record, or
  when `game.at > synced.at`.
- `lw-scandal-acct`: the signed-in name, a hint only (so a page that cannot reach the server can still
  say whose game it is). The truth is always `GET /api/me`.
- `lw-scandal-lastname`: the name this device last logged in or created an account with, in the
  server's spelling. Written wherever `acct` is written (`known()` in `game/net.js`), copied from `acct`
  at start-up when it is missing, and **never cleared**: logging out, a lapsed session and "Start a new
  scandal" all keep it. It only picks which form the title opens on (Log in) and pre-fills the Log in
  name. Names are public on the Players board, so it reveals nothing.

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
  Create account with the guest's stage name filled in. Nothing is focused on load, so no phone keyboard
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
   reveal one; that is unavoidable with unique public names (they are listed on the Players board
   anyway) and is slowed to 5 tries an hour per IP, so the client says it plainly: "That name's taken."
   (An earlier client tried a sign-up straight after any refused login. A mistyped name then created a
   new, empty account, and every wrong password spent one of the address's 5 sign-ups an hour.)
2. **Uploads every 40 seconds at most, first one 3 seconds after a change, and at once when the page is
   hidden.** The brief's 3-second debounce and the 120-per-hour limit cannot both hold while the
   District clock saves every 1.2 s; this keeps a steady player near 90 uploads an hour.
3. **Sync compares server times only** (`saveUpdatedAt` against the stored `synced.updatedAt`). Device
   clocks are never compared, so a phone set to the wrong year cannot win or lose a game.
4. **An explicit sign-in loads the cloud game if there is one**, replacing the one on the device. A
   sign-up uploads the device's game.
5. **No DELETE.** A wipe while signed in clears the device and keeps `synced`; the new game's first
   upload replaces the old one on the server.
6. **Log out keeps the device's game as a guest game.** Nothing is ever lost by logging out.
7. **The account's face on the board is its top-scoring whore** (`perWhore[0]`); Whorescore is the
   account's total; `timelines` lists the eras the player has opened.
8. **`lastActive` is the last upload, to the hour.** Enough for a live board, no finer.
9. **The server reads `engine/content.js`** for tiers, titles, Timeline ids and the cast's names, so the
   summary check and the reserved names can never drift from the game. Server and client deploy together.
10. **The server binds the IPv4 loopback by resolving `localhost` with family 4,** never through an IP
    literal in this repository.
11. **Saves travel uncompressed.** The measured peak (391,826 bytes) fits the 1 MiB cap, and v1 does
    not need the complexity.
12. **`users.last_seen_at`** is written at sign-up, login and the daily cookie renewal, never on every
    request. The board uses the save time instead.
