# The game server

Accounts (a nom de plume and a password), one cloud save per player, Letters to the Editor and the live Players
board. The contract with the browser client is [`docs/server-api.md`](../docs/server-api.md): every route, field
rule, error code and limit is defined there, and a change to either side starts there.

Node 22 or later, ES modules, **no npm dependencies** (`node:http`, `node:sqlite`, `node:crypto`). There is nothing
to install.

| File | What it does |
|---|---|
| `server.mjs` | Entry point: configuration and start-up checks, the HTTP server and its timeouts, routing, request hygiene (Origin, Content-Type, body caps, rate limits and the session checked before any body is read, the JSON reviver), the endpoints, shutdown |
| `db.mjs` | SQLite: the schema (created at start, idempotent) and every query as a prepared statement |
| `auth.mjs` | scrypt hashing behind a two-slot queue, session tokens and the cookie, the name and password rules |
| `blocklists.mjs` | Reserved names (house words plus the cast, read from `engine/content.js`), blocked words, common passwords |
| `limits.mjs` | In-memory fixed-window rate limits; the client address only ever as an HMAC under a per-process secret, an IPv6 address keyed on its /64 |
| `validate.mjs` | The save envelope, the Players-board summary and the letter rules |
| `static.mjs` | Dev mode only: serves `game/`, `engine/` and `art-assets/` so the page and `/api` share one origin |

The server reads tiers, titles, Timelines and the cast's names from `engine/content.js`, so `server/` and `engine/`
always sit side by side, and the server is deployed and restarted together with the client.

## Run it locally

```sh
LW_DEV=1 LW_DB=/tmp/lw-dev.sqlite node server/server.mjs
```

Then open <http://localhost:8091/game/>. Use that exact address: any other host name for the same server is a
different origin, and its sign-ins are refused (403 `bad-origin`). `LW_DB=:memory:` gives a throwaway database that
is gone when the server stops. Keep the database file outside this repository.

In dev mode every request comes from one address, so testing reaches the limits quickly: 5 sign-ups an hour, 10
logins in 15 minutes. The limits live in memory, per process: restarting the server clears them.

Dev mode differs from the live server in three ways, and only these:

- It also serves the published folders (`game/`, `engine/`, `art-assets/`), read-only, with the live site's
  Content-Security-Policy, so a CSP mistake shows up locally. Nothing else in the repository is reachable.
- The session cookie is `lw_dev` instead of `__Host-lw`, without `Secure`. A `__Host-` cookie must be `Secure`, and
  browsers drop `Secure` cookies set over plain http (Safari even on localhost; a phone on the local network always).
  The server refuses to start in dev mode with an https origin, so the weaker cookie never reaches the live site.
- The client address for rate limits is the socket's, not the `CF-Connecting-IP` header's.

A quick check from another terminal:

```sh
curl -s http://localhost:8091/api/health
curl -s -c /tmp/lw-jar -H 'Origin: http://localhost:8091' -H 'Content-Type: application/json' \
  -d '{"name":"Madam_X","password":"corsets and cognac"}' http://localhost:8091/api/signup
curl -s -b /tmp/lw-jar http://localhost:8091/api/me
```

## Configuration

All by environment variable. A bad value stops the server at once with exit status 2 and one line on stderr.

| Variable | Default | Meaning |
|---|---|---|
| `LW_DB` | none: required | Path of the SQLite file (WAL mode, so `-wal` and `-shm` files appear beside it). |
| `LW_PORT` | `8091` | TCP port. The server listens on the IPv4 loopback address only, found by resolving `localhost`. |
| `LW_ORIGIN` | `https://legendarywhores.com` (dev: `http://localhost:<LW_PORT>`) | The only `Origin` accepted on POST and PUT. A bare origin: scheme, host, optional port. |
| `LW_DEV` | unset | `1` for dev mode (above). Never set on the live server. Any other value is refused. |

The server also refuses to start with an `http://` origin outside dev mode, or with a database written by a newer
version of the server.

On the live server only `/api/*` is answered; every other path is a 404, because the front web server serves the
site and forwards `/api/*` here. The client's address is taken from `CF-Connecting-IP` and nothing else; requests
without a valid one share a single rate-limit bucket, and the server prints one warning (without any address) the
first time it happens.

Node 22 prints `ExperimentalWarning: SQLite is an experimental feature` once at start;
`node --disable-warning=ExperimentalWarning server/server.mjs` silences it.

SIGTERM or SIGINT: the server stops accepting connections, lets requests in flight finish (5 seconds at most), closes
the database and exits 0.

## What it logs

One line at start, one or two at shutdown, and for an unexpected failure the error's name, code and stack frames on
stderr. Never a request body, a cookie, a token, a password, a name or an address. There is no access log.
