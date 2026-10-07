# AGENTS.md

Guide for AI coding agents (and humans in a hurry) working on **Legendary Whores**, a saucy-postcard
deck-building strategy game that runs in the browser: <https://legendarywhores.com>.

Read this first, then `CONTRIBUTING.md`. For game design, `docs/gdd/` is the vision and
`docs/rules-core.md` is the canonical rulebook.

## Layout

| Path | What it is |
|---|---|
| `game/` | The browser client ("The Scandal Sheet"): `index.html`, `scandal.js` (screens and UI), `scandal.css`, `notes.js`, `assets.js` (art map and stand-ins), `names.js` (random stage names) |
| `engine/` | The shared rules engine: `rules.js` (pure actions), `content.js` (all numbers, cards, gentlemen, places, text), `test.mjs` (tests), `sim.mjs` (bot balance simulation) |
| `art-assets/` | Published art per era (`victorian/`, `wildwest/`, `vegas/`), WebP only |
| `server/` | The game server: accounts, one cloud save per player, Letters to the Editor, the Players board. Node 22+, zero npm dependencies (`node:http`, `node:sqlite`, `node:crypto`). Contract: `docs/server-api.md`; details: `server/README.md` |
| `site/` | The landing page served at the site root (`index.html`, `og-card.jpg`, favicons, `landing/` for its CSS, JS and art). `og-card.html` is the source of the link-preview image |
| `docs/` | `gdd/` design chapters 01–06, `rules-core.md` rulebook, `licensing-options.md` |
| `scripts/` | `scan-public.mjs` (privacy and secret scanner), `hooks/` (pre-commit, pre-push), `setup-repo.sh` |
| `.github/` | CI (tests, balance sim, scanner), CodeQL, Scorecard, dependency review, ZAP baseline, Dependabot |

## Commands

```sh
node engine/test.mjs            # engine tests: must end "N passed, 0 failed"
node engine/sim.mjs --quick     # balance gate, ~80 s: must print "ALL TARGETS: MET"
node engine/sim.mjs             # full balance gate, ~4-5 min (CI runs this)
node game/names.test.mjs        # stage-name generator tests
node game/find-first-curtain.mjs  # replays each starter's first evening
node scripts/scan-public.mjs --staged   # what the pre-commit hook runs
sh scripts/setup-repo.sh        # installs the git hooks (run once per clone)
python3 -m http.server 8000     # then open http://localhost:8000/game/ (guest play, no server)
LW_DEV=1 LW_DB=/tmp/lw-dev.sqlite node server/server.mjs   # game + API on http://localhost:8091/game/
(cd site && python3 -m http.server 8001)                 # the landing page
```

There is no build step and no package manager: plain ES modules, Node 22+ for the scripts.

## Rules that CI or review will enforce

**Engine**
- `engine/` has no dependencies. Actions are pure (state in, new state out), use whole numbers only,
  and take randomness only from the seeded RNG. Same seed, same game.
- Balance numbers live in `engine/content.js`; the rules they implement are described in
  `docs/rules-core.md`. Change both together.
- Any change to rules or content must keep the balance gate green. If a target fails, fix the design
  (usually content), don't loosen the target. Changing a target is a design decision for the
  designer, made on purpose and recorded in the Balance log in `docs/rules-core.md`.

**Browser client**
- The live site sends a strict Content-Security-Policy. No inline `<script>` blocks, no inline event
  handlers (`onclick=` etc.), no `eval` or `new Function`, no external scripts, images or iframes.
  External CSS is allowed from Google Fonts only. Inline `style` attributes are fine.
- Phone first. Layouts also exist for tablet and desktop (breakpoints around 760, 1000, 1100 and
  1600 px). Check 390×844, 820×1180 and 1440×900 at least; no horizontal scroll, 44 px touch targets,
  respect `prefers-reduced-motion`.
- Escape everything that comes from a player or a server before it reaches the DOM.
- Stage names match `^[A-Za-z0-9_]{3,24}$`; typed spaces become underscores.

**Content and tone** (see `docs/gdd/04-tone-and-humour.md`)
- Saucy seaside postcard: naughty, implied, never explicit. No nudity in art or words.
- Every character is clearly an adult. Jokes punch at the trade, the era, the punters and hypocrisy,
  never at ethnicity or religion. Real historical victims are never punchlines.
- No filler. The designer cuts stock phrases and repeated jokes on sight.

**Privacy and security**
- The pre-commit and pre-push hooks run `scripts/scan-public.mjs`. It rejects secrets and tokens,
  email addresses (other than GitHub noreply), home-directory paths and non-documentation IP
  addresses. Write `localhost`, not a loopback IP literal. Never bypass the hooks (`--no-verify`).
- Never commit credentials, `.env` files, certificates or tunnel credentials. `.gitignore` covers
  the usual names; don't rely on it.
- This repository contains the game only. Hosting and deployment details (servers, networks,
  tunnels, proxy configs, deploy scripts) are deliberately kept out of it. Don't add them.
- Security problems go through private vulnerability reporting (`SECURITY.md`), not public issues.

**Server** (`server/`, contract in `docs/server-api.md`)
- Change the contract first, then both sides. Every route, field rule, error code and limit is defined there.
- Every non-GET request needs the site's exact `Origin` and `Content-Type: application/json`. No CORS headers.
- Check the session and the rate limit before reading a request body; never parse an unauthenticated large body.
- SQL only through prepared statements. Never log or store raw IP addresses, passwords or session tokens.
- Treat stored text (names, letters, saves) as untrusted wherever it is rendered: escape it.

**Dependencies**
- Avoid them. If one is truly needed: commit its lockfile, pin a release at least 7 days old, and
  never accept install scripts that fetch from the network.

## Commits and pull requests

- Open an issue before a large pull request; the designer decides what goes in.
- Commit with your GitHub **noreply** address, or the privacy check fails the PR.
- Small, focused commits with plain descriptive messages. Say what changed and why.
- A PR is ready when tests pass, the balance gate is green and the scanner is clean. Include
  screenshots at phone and desktop width for any UI change.

## Licence

Apache-2.0 for code, art and writing (`LICENSE`, `NOTICE`). The name, logo and domain are not
licensed (`TRADEMARKS.md`).
