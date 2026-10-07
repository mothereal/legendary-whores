# 06 · Roadmap

*What happens after the pick, in order, and every idea that is parked. Parked ideas stay parked until the designer pulls one forward; nothing here is to be built early.*

## 1. Now: The Scandal Sheet, v2

The designer's mix is **house layer C + teaching C**. The first build round turns prototype C into the game's front end, with this round's feedback:

| Item | Chapter | Size |
|---|---|---|
| The Sunday Supplement: a five-page, skippable tabloid overview | 03 §2.1 | Small |
| Collapse the top bar and bottom dock into the Purse (top corner) and the Menu (bottom corner, bottom sheet) | 03 §3.1 | Medium |
| "Show me the ropes" toggle: the headline tips become opt-in | 03 §2.3 | Small |
| "What's this?" outline mode and the Back Issues archive | 03 §2.2 | Small |
| Name the two Roads; the fork spread; Road badge and per-Road titles on the profile; switch headlines | 02 §2 | Medium (UI only) |
| Content rewrite pass: the "Somebody" lines, the Tuesday, Mother and "Nobody" crutches, object-reacts repeats | 04 §3–4 | Small |
| Tone lint in `engine/test.mjs` | 04 §5 | Small |
| A "pleased with the takings" win expression for each starter | 05 §6 | Art batch (through the existing GPU guard) |
| The open balance decisions (T4 Vegas, the Wild West Saloon, and the rest) | 02 §10 | Decision, then a sim run |

## 2. The plan after the pick

### Step 0: The public repository

- A new local project, `legendary-whores`, under git, pushed to a **public GitHub repository under the `mothereal` account**. Source and development are public.
- **Anonymity.** Nothing may reveal the designer's real name or email. The repo uses a **repo-local** git identity (`user.name mothereal`, the account's GitHub noreply address), never the machine's global identity. A **pre-commit hook** refuses any commit whose author or committer is not that identity.
- **Secrets.** Secret scanning runs before every commit and push (pre-commit hook). `.env` files, keys, hosting credentials and API tokens are never committed; `.gitignore` covers them.
- **Private-string scan.** Before the first push, and in CI on every push, scan every file, the whole history and all image metadata for the designer's real name and emails, local home-directory paths, private IP addresses and private hostnames. The prototype files currently contain local absolute paths in 18 files; they are scrubbed before import. Public docs say "the designer".
- **HARD GATE before the first push.** Stop and ask the designer to confirm, signed in to GitHub as `mothereal`, under Settings → Emails, that **"Keep my email addresses private"** and **"Block command line pushes that expose my email"** are both ticked. No first push until the designer confirms. A **pre-push hook** refuses the first push until a local marker file exists, and that file is created only after the confirmation.
- **GitHub security features** (all free for public repos) are turned on: secret scanning with push protection, Dependabot alerts and security updates, private vulnerability reporting, CodeQL and OpenSSF Scorecard.

### Step 1: Infrastructure first

- Put `legendarywhores.com` behind Cloudflare and set up hosting. The designer signs in; the agent does the rest, **with a confirmation at each step**. The hosting plan and its configuration are kept outside this public repository.
- Put The Scandal Sheet live (or a coming-soon page if it isn't ready). From then on, everything ships to the real host.

### Step 2: Grow iteratively, ship continuously

From the slice towards the full content set (about 260 assets, the full card, place and punter pool), in small increments. Each increment is deployed live as soon as it passes the gate, so the designer can play it on the phone and give feedback fast. Nothing is held back for one big release.

Roughly in this order, each its own increment:

1. The slice live, static, single player (the engine runs on the phone; nothing stored on the server).
2. Accounts (username and password only), the authoritative server and saved games.
3. Real rivals in one arena: shared Curtains, Standing Orders, the While You Were Away digest.
4. The Players screen and the four boards; Whorescore across seasons.
5. Seats, Challenges and Duels; the Hall and the Rogues' Gallery.
6. Seasons: the 28-day clock, halving meters, the Hall at season's end.
7. More content per Timeline (cards, novelties, gentlemen, places), each batch through the balance gate.

### Step 3: The balance and regression gate, on every increment

It's a deckbuilder, so a new card or system can break old ones. Every increment must pass:

- **Engine tests** (`engine/test.mjs`): determinism, no hidden-information leaks, old saves and old content still load, the tone lint.
- **The bot simulation** (`engine/sim.mjs`, exit code 0) against its stated bands, T1 to T13 (02-strategy §9; T13, Low Road Coin is spent, gated since round 5).
- **Bounded, not equal:** no card or route above its maximum pick or win share; the thinking-versus-casual gap stays in its band (1.3 to 1.7); the luck-versus-skill mix is measured (how often the better strategy wins over many seeds) and kept where the designer wants it.
- **An increment ships only when the gate passes**, or when the designer accepts a flagged imbalance on purpose (T4 has passed since the T4 fix; none is flagged today).

### 1.1 Decisions waiting on the designer (from the round 4 review fixes)

| Decision | Why it waits | What is in place |
|---|---|---|
| ~~A Coin sink for the Low Road~~ **Built in round 5; one choice left** (02 §10 #7) | Built: the Ladder (cosmetic lodgings and finery per road), the Morning Special, Grease and the Gambler's stake priced by tier; T13 is a gate and passes (17–35% unspent). Left to choose: keep the Ladder cosmetic, give its top rung a small perk, or commission a painted portrait and win picture per rung. | `DIGS`, `buyDigs`, `buySpecial`, `greasePer`, `gamblerTerms`; `RULES.raidBribe` still off |
| **The invitation's shape** (02 §10 #8) | Round 5 built "+1 Renown for the first Delighted invitation each day, above the cap, Coin as usual" because the review's "Renown, not Coin" inside the cap lifted only the casual player (T1 London 1.29). | `RULES.highRoad` |
| **Gate something real at Rare** | Candidates were the market's position cards (Wheelbarrow, Bucking Bronco, Chapel Quickie) unlocked at Rare, or a naughtier gossip pool by tier. The first is a balance change on a knife edge (the Chapel Quickie is a Kink trigger for two Vegas gentlemen, T3 and T11); both brush the parked "more outrageous with seniority" idea (§3.5). | Rare opens a new era title and the third Timeline; the copy now promises only that. The album (postcards, souvenirs, Kink-win stories), the road steps, the Ladder and (round 5) Renown milestones at 100 and 200 with an era sub-title are the visible rungs between Rare and Epic |

## 3. The parking lot

Every parked idea from the spec, grouped and lightly prioritised. **Priority** is a suggestion: **Soon** (small, deepens what exists, fits "learn by exploring"), **Later** (bigger systems that need the balance gate and a sim pass), **Careful** (sensitive or structurally risky; needs a design round of its own).

### 3.1 Exploration and reward

| Idea | Priority | Notes |
|---|---|---|
| **Mystery and Easter-egg layer**: ask the right thing at a certain market, buy a certain item, notice a tiny engraving | Soon | The natural extension of tap-to-explain and long-press flips; rewards the curious without power |
| **Achievements and badges** that persist across seasons | Soon | Cosmetic; good for retention; show on the public profile |
| **Sound**: 1 to 2 second place sounds (a saloon bar clink, a market crowd) and event stings; a calm one-minute ambient loop per era | Soon | Commercial-safe licences only: CC0 libraries, or a local model whose licence allows a public game (Meta's MusicGen and AudioGen weights are non-commercial; Stable Audio Open and Apache-licensed models need checking). Muted until the player's first tap |
| **Permanent unlocks across seasons**: unlocked girls stay in your roster; achievements unlock new eras and places | Later | Must not split a small player base (the one-arena rule holds) |

### 3.2 Character and roster

| Idea | Priority | Notes |
|---|---|---|
| **Draft your girl**: pick 1 of 3 random girls; pay in-game currency (never real money) for a fresh three, price rising each reroll, one sensible pick always guaranteed | Later | Needs a larger cast |
| **Unlimited resets** of a girl, losing her progress | Later | Interacts with Whorescore's "best three count in full" |
| **Self-improvement routes**: school and lessons to gain skills; stripping as a side business, or to pay for school | Later | A source of Charms and Talents beyond tiers |
| **Era-signature side hustles**, one distinct slot per Timeline. Contemporary: online content, cam shows, sugar-dating apps. Victorian: paid companionship and becoming a kept mistress (and Hyde Park's "pretty horsebreakers" riding to be seen). Wild West: "percentage girl" drink commissions and hurdy-gurdy paid dances (historically real), or joining a gang for protection | Later | Each must change strategy differently, not reskin the same bonus |
| **Era-specific client archetypes** with real nuance and comedy (Vegas: the man in his parents' basement; each older era its own period types), researched with care | Later | Same respect bar as everything else |

### 3.3 Pace and structure

| Idea | Priority | Notes |
|---|---|---|
| **Week-long seasons** instead of 28 days, with a **Curtain every 2 hours** | Later | Nobody is expected to play them all; playing more gives more chances, but a deeper thinker who plays less can still win. Needs T9 and T5 re-checked |
| **A weekly cross-Timeline Carnival** and more comic tourist Assignations | Later | In the spec's vision; not in the slice |
| **Kingdom variety**: a pool of about 30 places across eras; each season opens about 10, each with its own market piles, so the best route changes monthly | Later | Needs more eras first |

### 3.4 Social

| Idea | Priority | Notes |
|---|---|---|
| **Alliances and posses** | Careful | Collusion risk in a small world; must keep "one arena, no small groups" |

### 3.5 Heat and darkness

| Idea | Priority | Notes |
|---|---|---|
| **Content that gets more outrageous with seniority**: senior girls get outrageous group set-pieces (a "reverse gangbang" gag); low-tier girls are offered threesomes at higher affliction and reputation risk | Careful | Still saucy-postcard and implied only; off-screen; adults only. Round 4 left it parked: the overview now says "the higher you climb, the higher the stakes", not "the naughtier it gets", and no gossip or card is gated by tier |
| **The serial killer**: a hidden, fictional killer among prospective clients each season (about 1% of girls lost per season); a new **Intuition** trait plus light research lets a girl spot red flags and refuse | Careful | Fictional killer only, never real victims and never a real killer as a joke; the death off-screen and handled with gravity; a clear warning and fair tells so a loss never feels random |

### 3.6 New eras and cities

| Idea | Priority | Notes |
|---|---|---|
| **Edo Yoshiwara** (oiran and tayū, ukiyo-e woodblock skin) | Later | Parked from this build; the same cultural care rules |
| **The rest of the Eternal District**: Ancient Rome, Renaissance Venice, the Qinhuai river, Belle Époque Paris, Mount Olympus | Later | Era titles must be historically grounded and verified |
| **New regions** (South America, Arabia, Russia, …) with fewer, harder, more rewarding girls | Careful | Jokes target the job and the punters, never culture or faith |
| **More contemporary cities**: New York, Los Angeles or Tokyo beside Vegas | Later | Tokyo with the same care as Edo |
| **AI-generated characters at runtime** | Careful | A later version; v1 stays curated, and no language model runs on the server |
