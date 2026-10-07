# Legendary Whores

A phone-first strategy game in the spirit of a saucy seaside postcard: naughty, implied, never
explicit. Every character is an adult, and the jokes are about the trade, the era and the
punters, never anyone's ethnicity or religion.

You run a whore across three Timelines (Victorian London, the Wild West and modern Las Vegas) and
climb from Common to Mythic. You play cards that match what your target likes, choose between a
classy Standing route and a profitable Notoriety route, and pick your Places to suit. Anyone can
play casually. Players who study and plan do clearly better: time spent buys insight, not power.

Play it at **https://legendarywhores.com** (once it's live).

## Repository layout

```
game/          the playable client, v2 of The Scandal Sheet: index.html, CSS, render/UI code (plain ES modules)
engine/        the shared rules engine: rules.js, content.js (all balance numbers), test.mjs, sim.mjs
art-assets/    published art, per era: victorian/, wildwest/, vegas/ (optimised .webp + manifest.json)
docs/          the rulebook (rules-core.md), design notes, roadmap and parked ideas
scripts/       scan-public.mjs (privacy/secret scanner), hooks/, setup-repo.sh
.github/       CI, CodeQL, Scorecard, dependency review, ZAP baseline, Dependabot
```

`game/` imports `../engine/rules.js` and loads art from `../art-assets/`, so these three folders
are deployed side by side and are the only things the web server sees.

## Run it locally

No build and no dependencies. Serve the repository root with any static server and open
`/game/`:

```sh
python3 -m http.server 8000      # then open http://localhost:8000/game/
```

## Tests and the balance gate

```sh
node engine/test.mjs             # rules engine: determinism, no hidden-info leaks, saves still load
node engine/sim.mjs --quick      # bot simulation against the balance targets (about a minute)
node engine/sim.mjs              # full run, as CI does on main
```

The simulation pits a casual bot, a greedy bot and a matchup-aware planner against each other and
checks the targets in `docs/rules-core.md` §14.1: thinking pays 1.3–1.7×, casual play still
climbs, no card, Place or route dominates, and time can't buy rank. Every change to `main` has
to pass it. It is a deck-builder, so a new card can quietly break old balance.

> **Current status (2026-10-07): v2 of The Scandal Sheet; the balance gate is green.** The plan
> screen's one-tap Kink offer now shows only on her first Curtain in a Timeline (the designer's
> call), and the full run passes every gated target. From `node engine/sim.mjs`, verbatim:
>
> ```
> T11 Kinks are earned (casual-tap Kink hits/evening <= half the better planner's; casual-tap taps the plan screen's Kink offer and the page's Best Guess): dolly 0.10 vs 0.24 (casual 0.09), fanny 0.01 vs 0.29 (casual 0.00), jackie 0.01 vs 0.29 (casual 0.00) -> PASS
> ALL TARGETS: MET (none failing)  [252 s]
> ```
>
> The T11b line is informational (the rejected option, the offer every evening). It prints FAIL by
> design and is not part of the gate.

## Privacy and security tooling

This repository is public, and its author stays anonymous.

- `scripts/setup-repo.sh`: run once after cloning. It sets the repo-local identity
  (`mothereal` with the GitHub noreply address), installs the hooks, and creates an empty,
  gitignored `.private-denylist` for words that must never appear here.
- `scripts/hooks/pre-commit`: refuses commits with any other author or committer, and scans
  staged files.
- `scripts/hooks/pre-push`: refuses every push until the email-privacy settings have been
  confirmed on GitHub (local marker file), checks each outgoing commit's identity, and scans the
  whole tree and history.
- `scripts/scan-public.mjs`: dependency-free scanner for keys and tokens, emails other than the
  noreply address, home-directory paths, non-documentation IPv4 addresses and deny-listed words.
  It never prints what it matched.
- CI runs the same scanner (the deny-list comes from the `PRIVATE_DENYLIST` secret), along with
  CodeQL, OpenSSF Scorecard, dependency review, and a weekly OWASP ZAP baseline scan of the live
  site. Every action is pinned to a commit SHA, and Dependabot updates them after a 7-day
  cooldown.

Report vulnerabilities privately: see [SECURITY.md](SECURITY.md).

## Hosting

The site is hosted behind Cloudflare, with its WAF and rate limits in front. Hosting
configuration and runbooks are kept outside this public repository.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

Not chosen yet. See `docs/licensing-options.md`. Until a licence file is added, all rights are
reserved.
