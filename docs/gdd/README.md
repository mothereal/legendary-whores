# Legendary Whores · Game Design v2

*The editable source for everything after the prototype round. Written on 7 October 2026, after the designer scored the three prototypes and picked **The Scandal Sheet** (prototype C) for both the house layer and the teaching.*

## The pitch

**Legendary Whores** is a phone-first strategy game set in the **Eternal District**, a street where every era's red-light quarter stands side by side. You run a working girl in Victorian London, the Wild West or modern Las Vegas, and each evening you pick a Place, read the gentleman hosting it and play up to three cards on him. Cards that suit his tastes score; cards he can't abide cost you; a card that hits his secret kink brings the house down (behind a curtain, with a dowager covering her eyes). A casual player who taps **Best Guess** climbs at a fair clip. A player who studies the punters, buys the right novelty and plans three nights ahead climbs a third to a half again as fast, and is the one who takes the seats at the top. Choose the **High Road** (Standing, posh salons, the Hall of Legendary Whores) or the **Low Road** (Notoriety, gutter money, the Rogues' Gallery). It is saucy-postcard naughty: implied, never shown, and funny in a classy British way.

## The chapters

| File | What it covers |
|---|---|
| [01-overview.md](01-overview.md) | The pitch, the joke, the three Timelines, who it's for, the fun pillars |
| [02-strategy.md](02-strategy.md) | The core loop, the two Roads (tracks), matchups, how depth arrives in layers, depth beats breadth, time buys insight, seats, Whorescore, and the current simulation evidence and open balance decisions |
| [03-onboarding-and-ux.md](03-onboarding-and-ux.md) | The learning model: a skippable tabloid overview, then learn by exploring (tap anything to have it explained), with an optional step-by-step; phone layout rules |
| [04-tone-and-humour.md](04-tone-and-humour.md) | The voice, what reads as AI slop, keep and cut examples from the real content |
| [05-content-bible.md](05-content-bible.md) | Cast, Places, gentlemen, items, afflictions and gags per Timeline |
| [06-roadmap.md](06-roadmap.md) | The plan after the pick (public repo, hosting, continuous shipping, the balance gate) and every parked idea |

## Sources of truth

- **Rules and numbers:** `docs/rules-core.md` (the canonical prototype rulebook) and `engine/content.js` (`RULES`). Where this design and the rulebook disagree on a number, the rulebook and engine win until a change is made, simulated and logged there.
- **Engine:** `engine/rules.js` (pure, seeded, whole numbers), `engine/test.mjs` (tests), `engine/sim.mjs` (the balance simulation and its targets T1 to T11).
- **The chosen prototype:** `game/` (The Scandal Sheet).

Paths are relative to the repository root.

## Status markers used in these chapters

- **[Built]** works in the engine or prototype C today.
- **[Proposed]** a v2 change described here, not yet built; anything that touches rules or numbers must pass the simulation before it lands.
- **[Decision]** a choice the designer still has to make.
- **[Parked]** an idea kept for later; not to be built in the current round.

## Ground rules that apply to every chapter

- **Heat level: saucy postcard.** Winks, corsets, stockings, double meanings, comic novelties shown as objects, implied acts off-screen. Never nipples, genitals, bare bottoms, sex acts depicted or described graphically, or anyone not clearly an adult.
- **Who the jokes hit:** the job, the era and the punters. Never anyone's ethnicity or religion.
- **Fun first.** Low effort is playable; thinking is rewarded; time buys insight, not power.
- **Scope this round:** Victorian London, the Wild West and Modern Las Vegas only.
- **These docs will be public.** They name the owner only as "the designer" and contain no personal names, emails, home paths, addresses or private hostnames.
