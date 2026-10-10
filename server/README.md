# The game server

Accounts (a nom de plume and a password), one cloud save per player, Letters to the Editor, the live Players
board and the arena: one world per server that every account joins and plays in, held in memory, journaled to
SQLite and snapshotted. The contract with the browser client is [`docs/server-api.md`](../docs/server-api.md):
every route, field rule, error code and limit is defined there (the arena is its section 12), and a change to
either side starts there.

Node 22 or later, ES modules, **no npm dependencies** (`node:http`, `node:sqlite`, `node:crypto`). There is nothing
to install.

| File | What it does |
|---|---|
| `server.mjs` | Entry point: configuration and start-up checks, the HTTP server and its timeouts, routing, request hygiene (Origin, Content-Type, body caps, rate limits and the session checked before any body is read, the JSON reviver), the endpoints (the arena's four included), shutdown |
| `world.mjs` | The arena: loads or creates the world, holds it in memory, applies player actions with the engine's pure functions, journals every accepted action in the same transaction that moves the world row's `seq` (a compare-and-set), ticks the clock, snapshots, replays the journal at start, catches the clock up, holds the lock file. Also the operator commands (below) |
| `backup.mjs` | Backups with node:sqlite's `backup()`: a checked copy every 15 minutes, pruning, the pre-migration and pre-reset copies, the lock file; runnable as a script |
| `db.mjs` | SQLite: the schema as versioned additive migrations (`MIGRATIONS[1]`, `[2]`), the runner with its pre-migration backup, `locking_mode = EXCLUSIVE`, and every query as a prepared statement |
| `auth.mjs` | scrypt hashing behind a two-slot queue, session tokens and the cookie, the name and password rules |
| `blocklists.mjs` | Reserved names (house words plus the cast, read from `engine/content.js`), blocked words, common passwords |
| `limits.mjs` | In-memory fixed-window rate limits; the client address only ever as an HMAC under a per-process secret, an IPv6 address keyed on its /64 |
| `validate.mjs` | The save envelope, the Players-board summary, the letter rules, the arena's allowlist and per-action argument shapes |
| `static.mjs` | Dev mode only: serves `game/`, `engine/` and `art-assets/` so the page and `/api` share one origin |
| `test/` | `node --test 'server/test/*.test.mjs'`: the world in-process (journal, replay after a crash, snapshots, the catch-up, the reset, the lock), migration and backups, the routes over HTTP in a child, the arena client headless against a mock server (`arena-client.test.mjs`), and a 30-bot swarm. Zero dependencies, under 60 s |

The server reads tiers, titles, Timelines and the cast's names from `engine/content.js` and runs the rules in
`engine/rules.js` for the arena, so `server/` and `engine/` always sit side by side, and the server is deployed
and restarted together with the client.

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
| `LW_MIN_PER_SEC` | `1/60` | The arena's clock: District minutes per real second, `a/b` or a decimal. `1` makes a District minute a real second for a local run; `60` is the fastest. Fixed once the world exists: a different value refuses to start. |
| `LW_DAY_START` | `06:00` | Local time of District clock 0 when the world is created (the day turns then, and the forced Curtains fall at 06:00, 09:00, ... 03:00). Set `TZ` on the live unit so the zone is on record. |
| `LW_WORLD_CAP`, `LW_TL_CAP` | `90`, `10` | Members per world; live human girls per Timeline. |
| `LW_STANDIN_SEAL` | unset | `min,max` minutes: the house seals that long after the first human seal (the lone-player brake). Read at creation; change a live world with `--standin-seal`. |
| `LW_LOG_LIMIT`, `LW_SNAPSHOT_SEC`, `LW_SNAPSHOT_ACTIONS`, `LW_SNAPSHOT_MAX_LAG`, `LW_BACKUP_KEEP` | `8000`, `60`, `50`, `5000`, `96,14` | The world's log size, the snapshot cadence, the journal lag that turns `/api/health` 503, the backups kept. |
| `LW_WORLD_RESET` | unset | `1` for one start: reset a world whose `state_v` is behind this server (after a backup) instead of refusing. |

The server also refuses to start with an `http://` origin outside dev mode, with a database written by a newer
version of the server, with a world at another clock rate, with a world state that does not parse or whose
journal disagrees with its row, or with a `state_v` behind this server (see the reset below). It refuses with
exit status 3 when `world.lock` beside the database is held by a live process.

On the live server only `/api/*` is answered; every other path is a 404, because the front web server serves the
site and forwards `/api/*` here. The client's address is taken from `CF-Connecting-IP` and nothing else; requests
without a valid one share a single rate-limit bucket, and the server prints one warning (without any address) the
first time it happens.

Node 22 prints `ExperimentalWarning: SQLite is an experimental feature` once at start;
`node --disable-warning=ExperimentalWarning server/server.mjs` silences it.

SIGTERM or SIGINT: the server stops accepting connections, lets requests in flight finish (5 seconds at most),
snapshots the world, releases the lock, closes the database and exits 0.

## The world on disk

Beside the database file: `world.lock` (the server's pid and the boot it was taken in, while it runs) and `backups/` (0600 copies named
`lw-YYYYMMDD-HHMM.sqlite`, plus `pre-migrate-v1-v2-*` and `pre-reset-sv1-*` when those ran). The world row holds
the state snapshot; `world_actions` is the journal after it; `world_members` maps users to the opaque account
ids; `world_nonces` holds one receipt per accepted player action (account, nonce, seq, time), so a re-posted action
is answered `replayed` however many actions came after it. A snapshot prunes the journal, never a receipt younger than
48 hours (the client gives up on an unsettled move after 24); older ones go at snapshot time. An account holding 5000
receipts younger than 48 hours has new actions refused (429 `too-many-moves`, with `Retry-After`) until its oldest
leaves the window: only a client posting in a loop meets it, and the table stays bounded without deleting a receipt
that a re-post may still need. A copy is written to `backups/.lwtmp-<hash of the database path>-<name>.tmp`
first; one left by a crash is removed by the next copy that holds `world.lock`, once it is 10 minutes old, and a
temp file of another database sharing the folder is never touched. A restart replays the journal after the snapshot, then catches the District clock up to the real clock,
capped at one District day: a longer outage moves the clock's epoch forward by whole days first, so
`clock % 1440` and the 06:00 alignment are kept. An outage just over 24 h therefore advances the District one
minute, and one just under advances 1439: phase is kept, not elapsed time.

**Restore from a backup.** Stop the unit; copy the chosen file over the live one and remove the live
`-wal` and `-shm` files; start. The server replays the journal tail inside the copy. The newest file in
`backups/` is named in the refusal line when a snapshot cannot be read.

**The lock.** `world.lock` is stale, and removed on the way in, when its pid is dead, when it was taken in an earlier
boot (the pid may have been handed out again after a power cut or a reboot), when the pid is not ours to signal
(another user's process), or on Linux when `/proc/<pid>/cmdline` names none of the server scripts. A live server
of ours refuses with exit 3. Nothing to delete by hand after a crash.

**Operator commands**, each run while the unit is stopped (they take `world.lock` first and refuse with one line
naming the live pid; the server's `EXCLUSIVE` SQLite lock is the second barrier):

```sh
node server/world.mjs --backup [label] [db]           # one checked copy into backups/ beside the file
node server/world.mjs --standin-seal 45,90 [db]       # the lone-player brake on (or `off`); snapshotted so no replay crosses it
node server/world.mjs --reset [db]                    # a backup, then a fresh world carrying every member's banked score
node server/world.mjs --reset --from-snapshot [db]    # the same, carrying the snapshot's scores and DROPPING what was journaled after it
node server/world.mjs --evict <name> [db]             # retire that account's girls (a squatter holding a street's slot); their points are banked, her next join hires afresh
node server/backup.mjs <db> <dir> [label]             # the script form of a backup, into any folder
```

`[db]` defaults to `LW_DB`. The reset is also what `LW_WORLD_RESET=1` does for one start when a push bumped
`STATE_V` in `world.mjs`; without it such a start refuses, prints the command and the last backup, and the
deploy's health check rolls the push back rather than wipe accepted state.

**The reset and the journal.** The scores a reset carries are read after the journal is replayed onto the snapshot,
so a Curtain paid after the last snapshot counts. The old server normally folds its journal into the snapshot on
SIGTERM. When it did not (it crashed), the journal is replayed through this build's engine only if the snapshot is of
this build's `state_v`; a journal that does not replay, or one written under another `state_v`, refuses the reset
before any backup or write, naming the seq, with two ways on:

1. Start the old build once and stop it with SIGTERM: it replays its own journal and folds it into the snapshot.
   Then run `--reset` again.
2. `node server/world.mjs --reset --from-snapshot [db]`: carry the snapshot's scores and drop everything journaled
   after it. It logs one loud line naming the seqs dropped and the account ids whose actions they were.

**Eviction and the rehire.** `--evict` retires the account's live girls through the engine's one retirement rule:
each girl's season points are banked into the account (its Whorescore is the same before and after), her seat is
vacated, and from then on she counts on no board, tiebreak or profile. Her id and history stay for the record. Her
next join hires afresh under the same account; the same character again is `<account>:<character>#2`, then `#3`.

## Running the tests

```sh
node --test 'server/test/*.test.mjs'    # Node 22 or 24; TZ=UTC in CI; under 60 s
```

The suite spawns the server as a child on a temp file for the HTTP tests and drives `world.mjs` in-process for the
crash and replay tests (`LW_DEV=1` admits the test seams: a fake clock, a lock takeover, a `fatal()` that throws).
The swarm test prints the state bytes, heap and act p95 it measured.

## What it logs

One line at start (and one at world creation naming the epoch and the time zone), one or two at shutdown, one per
catch-up that skipped days, one per failed snapshot or backup, and for an unexpected failure the error's name, code
and stack frames on stderr. Never a request body, an action's arguments, a nonce, the world's seed, a cookie, a
token, a password, a name or an address. There is no access log.
