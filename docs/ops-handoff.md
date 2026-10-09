# Ops hand-off for increment 2 (the world server and the arena client)

The ops repo (`legendary-whores-ops`) is read-only to the build. These are the exact edits it needs for
increment 2, with the numbers measured in this worktree. Line numbers are as of `deploy.sh` and
`infra/systemd/legendarywhores-api.service` on 2026-10-09.

## 1. deploy.sh

Gate 1 gains two lines. Gate 1c sits inside the `GATE_OK` block (it is cheap and tests the exported tree
like the engine tests). Gate 1b sits **outside** the block, after the `fi` that closes it (deploy.sh:80):
inside it the gate is skipped on a repeat commit, and the server tests are the one gate that must run on
every deploy because they start a child server on the exported tree.

After deploy.sh:70 (`grep -E '^[0-9]+ passed, 0 failed' "$WORK/test.out" ...`):

```sh
log "gate 1c: the first Curtain (lever 1, the solo salt)"
(cd "$WORK/src" && node game/find-first-curtain.mjs >"$WORK/curtain.out" 2>&1) || { tail -n 20 "$WORK/curtain.out"; die "first Curtain gate failed"; }
```

After deploy.sh:80 (the `fi` of the `GATE_OK` block), before the static bundle:

```sh
log "gate 1b: server tests (node:test, zero dependencies)"
(cd "$WORK/src" && TZ=UTC node --test 'server/test/*.test.mjs' >"$WORK/server-test.out" 2>&1) || { tail -n 40 "$WORK/server-test.out"; die "server tests failed"; }
grep -E '^ℹ (pass|fail) ' "$WORK/server-test.out" | sed 's/^/[deploy]   /'
```

The glob is quoted so Node expands it itself. Use the glob form, never `node --test server/test/`: Node
22 and 24 take patterns, and Node 25 treats the bare directory as one test file and fails with
`Cannot find module .../server/test` (exit 1), which is what the increment's gate run showed on the
build machine (Node v25.8.1). CI (`.github/workflows/ci.yml`, the `server-tests` job) already uses the
glob on Node 22 and 24.

## 2. ci.yml

Done in this increment: the `engine-tests` job has the step `First Curtain gate`
(`node game/find-first-curtain.mjs`) after the engine tests, and the `server-tests` job runs
`node --test 'server/test/*.test.mjs'` with `TZ=UTC` on Node 22 and 24. Nothing to add in the ops repo.

## 3. The unit (`infra/systemd/legendarywhores-api.service`)

The `Environment=` line (unit:35) gains the world's settings:

```
Environment=LW_PORT=8091 LW_DB=/var/lib/legendarywhores/lw.sqlite LW_ORIGIN=https://legendarywhores.com TZ=<zone> LW_WORLD_CAP=90 LW_TL_CAP=10
```

- `TZ`: the zone the District's 06:00 is aligned to (the designer names it; ARENA-SPEC section 14 K writes
  `TZ=<zone>`). Set once before the world is created: the alignment is written into the world row.
- `LW_WORLD_CAP=90`: the performance ceiling (30 humans per Timeline measured, contract 12.12).
- `LW_TL_CAP=10`: **provisional**. The arena harness (`node engine/sim.mjs --arena --quick`) measures
  T14 (the share of humans paid on a full-pay Curtain) at N=10 as `dolly 49%, fanny 52%, jackie 54%`
  against a 50% target, so Victorian misses it by one point at 10. T14 and T9a stay informational until
  the designer's full-pay lever (ARENA-SPEC section 13 item 2) lands; the number the unit carries is the
  designer's call after that run. Do not treat 10 as measured-good.
- Optional: `LW_MIN_PER_SEC` (default 1/60), `LW_STANDIN_SEAL` (default off), `LW_DAY_START` (default
  06:00), `LW_SNAPSHOT_MAX_LAG` (default per `server/README.md`).

Memory, against unit:33 (`--max-old-space-size=256`) and unit:86 (`MemoryMax=512M`). The swarm test
prints its numbers; two runs, verbatim:

```
T-swarm: 30 bots, 7 days, 1069 acts (13 refused), act p95 21.88 ms, state 4597969 bytes, heapUsed 128 MB, rss 558 MB, payloads 280 mean 113708 bytes max 155856 bytes, curtains 56/56/56, seq 1297, log 9798
T-swarm: 30 bots, 7 days, 1083 acts (7 refused), act p95 21.76 ms, state 4549601 bytes, heapUsed 97 MB, rss 551 MB, payloads 280 mean 113434 bytes max 153717 bytes, curtains 56/56/56, seq 1311, log 9688
```

Caveat on `rss 558 MB` / `551 MB`: that is the **test process** (the node:test harness plus 30 in-process bots plus
the world), not the server alone, so it is not a measured breach of `MemoryMax=512M`; `heapUsed 128 MB` / `97 MB`
is the world's own working set and sits inside the 256 MB heap cap. The server's own RSS has not been
measured in this increment. Before the designer's `setup-api.sh` re-run, read it off the box after an
hour with players on (`systemctl status legendarywhores-api` prints `Memory:`), and if it approaches
512 MB raise `MemoryMax` to 768M rather than lower the heap cap.

## 4. The world on the box

- The lock: `/var/lib/legendarywhores/world.lock` holds the unit's pid and the boot id. It is stale, and
  cleared on the way in, after a reboot, a power cut or an OOM kill (dead pid, another boot, a pid that
  is now someone else's). Nothing to delete by hand; `Restart=on-failure` brings the unit back.
- Backups: the server writes one every 15 minutes into `/var/lib/legendarywhores/backups/` (0600,
  `lw-YYYYMMDD-HHMM.sqlite`), keeping the newest 96 plus the first of each of the last 14 days. Check
  after the deploy: `ssh <box> ls -l /var/lib/private/legendarywhores/backups` should list a file within
  15 minutes of the start (DynamicUser puts the state under `/var/lib/private/`).
- Health: `GET /api/health` answers 200 with a `world` block (`clock`, `clockBehindMs`, `members`,
  `seq`, `snapSeq`); 503 `world-down` when the tick stalls or the journal outgrows the snapshot lag.
  deploy.sh's gate 4 polls it as today.
- Operator commands (unit stopped): `node server/world.mjs --backup | --standin-seal | --reset | --evict <name>`
  and `node server/backup.mjs <db> <dir>`; see `server/README.md`. `--evict` is the remedy for a squatter
  holding a street's slot (`LW_TL_CAP` counts live human girls; a retired one no longer counts).

## 5. Rollout order (schema)

`server/db.mjs` in this increment carries `SCHEMA_VERSION = 2` and `MAX_READABLE = 2` together. The
release being deployed from main (`4b20640`) has `SCHEMA_VERSION = 1` and no `MAX_READABLE`, so it
refuses a v2 file. ARENA-SPEC section 3.9 step 1 and section 14 (I2a) put the `MAX_READABLE` bump one
push ahead so deploy.sh's rollback can open a v2 file. Before this increment is deployed, land and deploy
on main a one-line tolerance: `export const MAX_READABLE = 2` and refuse only when `row.v > MAX_READABLE`,
with no DDL. Then deploy this increment. Otherwise a failed health poll after the migration rolls back to
a server that exits 2 on the file (a restart loop) until the `pre-migrate-v1-v2-*` backup is restored by hand.

## 6. Cloudflare

The rule in `cloudflare-api-changes.md:26` admits POST on `/api/`; the new routes are `POST /api/join`,
`POST /api/act`, `GET /api/view`, `GET /api/profile` under the same prefix, so nothing changes there. The
edge limit of 120 requests per 10 s per client stands: the page polls every 5 s (one `GET /api/view`),
15 s after a 429 or while the wire is down, 60 s when the tab is hidden, plus one `POST /api/act` per tap.
