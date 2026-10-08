# 03 · Onboarding and UX

*How a new player learns the game, and how the phone screen stays calm. Built on prototype C, The Scandal Sheet, which the designer scored 5/5 for its house layer and 4/5 for its headline teaching. Everything named in `code` exists in `game/scandal.js` today.*

## 1. What the designer asked for

- **An overview before any step-by-step:** what the game is, the three Timelines, that you unlock things as you progress and it gets more scandalous, that it's a strategy game where study pays, and the main strategy (flip things, play cards that match his tastes, what costs points, what causes Notoriety). **Not all text: tabloid pages. Always skippable.**
- **Learn by exploring.** "I clicked on kink and it said what it was. That was nice." Let players learn as much as they want, by poking.
- **Step-by-step only on request.** The other two prototypes (a coaching Cupid, a ghost hand) felt complicated and overwhelming.
- **A calmer phone screen.** Collapse the fixed top and bottom bars into a corner or menu button the player opens to navigate and see stats; perhaps keep Coin visible in a corner at all times. Make it easier to read.
- **Make the two tracks clear** (02-strategy §2: the High Road and the Low Road).
- **Keep:** the font, the humour, the clarity and the style.

## 2. The learning model: three layers, the player picks the depth

| Layer | What it is | When | Can be skipped? |
|---|---|---|---|
| **1. The Overview** | Five swipeable tabloid pages, one idea each, mostly pictures and headlines | Before a newcomer's first game (not for anyone who has played on this device or logs in to an account) | Yes: a **Skip** on every page; re-readable any time from the menu ("How to play") and from the suspects' page |
| **2. Learn by exploring** | Every bold word, chip, card, face and number can be tapped (one-line explanation) or long-pressed (flip to its back) | Always | It is never in the way: nothing pops up unless tapped |
| **3. Show me the ropes** | The existing headline tips (`teach()`), one line at a time at the moment it matters | Only if the player switches it on (offered at the end of the Overview; a toggle in the menu) | Yes: off by default after the Overview; each tip has a close button and closes itself when the player acts |

Under all three sits **progressive reveal** (`ui.steps`): a stat or section appears only the first time it matters. Standing and Notoriety appear on their first change; the Allure label on cards appears after the first Curtain; locked sections show as a single line, "opens after your first Curtain · peek" (`lockedSec`), which the curious can tap open early. **[Built]**

### 2.1 Layer 1: The Overview ("The Sunday Supplement") [Proposed]

The prototype's title page already has an "Inside today" column of three teaser stories ("Cowboy lost in London", "MP dresses piano"). The Overview grows that into a short supplement. Rules for it:

- **Five pages, one idea each.** A headline in the display face, one picture, at most three short lines of body, one caption joke. No page needs scrolling at 390 px wide.
- **Swipe or tap to turn.** Page dots at the bottom; **Skip** top-right on every page, at least 44 px square; the last page's button starts the game.
- **The pictures do the explaining.** Each page has a single annotated picture (a card with a green tick and a red cross; two doors, one gilded and one in a gutter).
- **Nothing on these pages is needed to play.** Every fact reappears in Layer 2 where it applies.

| Page | Headline (draft) | Picture | The three lines | Caption joke |
|---|---|---|---|---|
| 1. What it is | **EVERY ERA'S NAUGHTIEST STREET, NOW OPEN** | The Eternal District: a gaslit London corner, a saloon's swing doors and a neon sign on one street | You're a working girl climbing from Common to Legendary. Each night: pick a Place, read the gentleman, play your cards. It's a strategy game: the more you know about him, the better you do. | "Previously banned in Belgium, Boston and the better parts of Bath." |
| 2. Three Timelines | **THREE CITIES, ONE GIRL EACH** | Dolly, Fanny and Jackie in their three frames | Victorian London, the Wild West and Las Vegas each run their own nights, rivals and gossip. Start in one; a telegram invites you to the next. While one girl waits for her Curtain, play another. | "Dolly has never seen a cowboy. Fanny has never seen a corset done up properly. Jackie has seen everything. Twice." |
| 3. Read him | **WHAT HE LIKES, WHAT HE CAN'T ABIDE** | A gentleman's card with Tastes (✓), Aversion (✗), Fancy and two Tells, and one card glowing | Cards that suit his Tastes glow and score more. Cards he can't abide cost you 2. Flip him over and Study him to learn the secret taste and the kink he won't admit to. | "Lord Plunkett has put little skirts on his piano legs. Make of that what you will. You should." |
| 4. Two Roads | **SOCIETY PAGES or POLICE GAZETTE?** | Split page: the same girl in pearls at the Salon, and with a blush and a fistful of coin in Wapping | The **High Road** (Standing) opens posh salons and the most fame. The **Low Road** (Notoriety) pays fast money and opens back alleys and the black market, and shuts the posh doors. Naughty cards and gutter deals raise Notoriety; frisky cards on grubby men give you the Itch. You choose, and you can change your mind. | "Both roads lead to the Hall of Legendary Whores. One of them goes in by the back door." |
| 5. It gets richer | **THE HIGHER YOU CLIMB, THE NAUGHTIER IT GETS** | A ladder of era titles from dollymop to grande horizontale, with locked padlocks | Day one is three taps: Place, Best Guess, seal. Novelties, kinks, rivals, rotas and seats arrive as you climb. Tap anything you don't know; it will tell you. | "Want the guided tour? **Show me the ropes** / **I'll find my own way**" |

Two buttons on page 5, both equal weight: **Show me the ropes** (turns Layer 3 on) and **I'll find my own way** (Layer 3 off). Either way the first job starts immediately.

**As built (The Morning Edition, round 5).** The five pages are in `game/scandal.js` (`OV`): 1 *Every era's naughtiest street, now open*; 2 *Play what he fancies* (a live demonstration on Lord Plunkett); 3 *What it costs you* (four clippings); 4 *Society Pages or Police Gazette?* (two road cards, each with one line on how to climb it: "Win at Posh houses; delight clean gentlemen." and "Gutter nights, back alleys, naughty cards in posh rooms."; round 7: *Two ways to be famous*, the same two papers shown with nothing to pick, because her nights decide which paper she is in); 5 *The higher you climb, the naughtier it gets* (the padlocked ladder). Round 5 held every page to **at most 25 words of body**, shortened the caption jokes (page 4's went), and moved page 5's two choices into the fixed foot of the screen, above Next's slot. The foot keeps one layout on every page: **Back** (a labelled chevron) never moves, and on page 5 Next's slot stays, invisible, so a thumb tapping through lands on nothing. **Skip** now means "no hand-holding": it turns Layer 3 off, like *I'll find my own way*. Measured at 375×667 (iPhone SE class): before, four of five pages scrolled (597/537, 607/537, 641/537, 619/537 px); after, none do.

### 2.2 Layer 2: learn by exploring [Built, to extend]

This is the layer the designer liked most, and it should carry most of the teaching.

- **Tap to explain.** The prototype has 49 one-line explanations in `GLOSS`, opened from any dotted-underlined word as a small "EXCLUSIVE" pop-up (headline plus one or two sentences). Rules: every game noun on screen is tappable; the dotted underline is the one consistent sign for "tap me to learn"; the explanation is one sentence of rule plus, at most, one sentence of joke; it closes on any tap outside.
- **Long-press to flip.** Cards, gentlemen, rivals and items have a back with flavour, Tells, History and "?" chips. Tapping a "?" offers a Study.
- **The numbers explain themselves.** The Sway meter breaks down into its parts (each a tappable chip: "Fancy +2", "Seen it −1"). A score badge on each card shows what it adds *tonight*.
- **Empty states teach.** An empty Reticule says "Novelties live here. Try a back door." An empty Black Book says "Study a gentleman to fill this."
- **[Proposed] A "What's this?" mode** in the menu: everything tappable gets a soft outline for five seconds, for players who don't know where to poke.
- **[Proposed] Tips archive.** The prototype already keeps a "Tips (n)" link in the gazette dateline (`ui.tips`); move it into the menu as "How to play", alongside the Overview.

### 2.3 Layer 3: Show me the ropes [Built, made optional]

The headline strip (`headline()`, `teach()`) stays as the step-by-step, because it worked: one line at a time, belonging to the screen it was written for (a tip is dropped if the player has moved on), never printed over a result or a curtain, closing on the player's next action. v2 changes only *who sees it*:

- **On** if the player chose "Show me the ropes"; **off** if she chose "I'll find my own way". Skip on the Overview turns tips off. A returning player who never sees it starts with tips off unless she has set them on this device. A toggle in the menu flips it either way at any time.
- **Even when off**, a few safety headlines still print, because they are about money or risk, not teaching: the Itch warning before a catch, "Madam is not receiving" when a door shuts, last call, and a move against the road she chose (*Wrong paper*, round 5). The Road fork is no longer a headline: it is a card on that whore's front page (02-strategy §2.2).
- **Where tips print (round 5).** On the play screens, between the instruction and the hand (the page shifts by the tip's height so the cards stay under the thumb); inside the gentleman's card, above its buttons; wire news on a browse screen, and any tip whose slot is off-screen, in the fixed strip by the Menu button. Never under the tray.
- **Never the same tip twice**, and never two tips at once. The prototype already de-duplicates identical lines.

## 3. The phone screen

### 3.1 Collapse the chrome into two corners [Proposed]

Today prototype C has a fixed **top bar** (`topbar()`: her face, name and title, Renown, Coin, Gossip and the Curtain clock, plus a Standing/Notoriety strip) and a fixed **bottom dock** (`renderChrome()`: Front page, Timelines, Players, Sound). On a 390 px phone that is a large share of the screen spent on chrome before the game starts. v2 replaces both with two small corner pieces:

| Piece | Where | Shows | Tap |
|---|---|---|---|
| **The Purse** | Top-right corner, always visible | Coin, with a coin-clink and a count-up when it changes | Opens the menu at her stats |
| **The Menu** (a folded newspaper, "Contents") | Bottom-right, in thumb reach (bottom-left for left-handers, a setting) | A red dot when something needs her: last call, a telegram, a new board position | Opens a bottom sheet |

The bottom sheet holds, in order: her portrait, era title and Road badge; Renown and the next tier's progress bar; Standing / Notoriety, Itch, Gossip (each tappable for its explanation); **Timelines** (with Curtain clocks and last-call alarms); **Players** (the boards); Little Black Book; Reticule; **How to play** (Overview and tips); **Show me the ropes** toggle; Sound; Settings. It closes by swipe-down, the close button or a tap outside.

**What stays on the page:** the action tray on planning and Assignation screens (Best Guess, Seal), because that is the thing being done, not chrome. The Curtain clock appears as a small chip only on the planning screen and when a Curtain is close. Her face appears on the front page itself, not in a bar.

**Checks before shipping it:** a first-time player can find the boards and switch Timeline without help (watch two or three people try); the red dot is the only alarm style; nothing important hides behind the menu during a decision (the Sway meter, his card and her hand stay on screen).

### 3.2 Reading on a small screen

These are standard mobile guidelines, applied to the tabloid style. Sources are listed at the end; they were not re-fetched for this document.

| Rule | Why |
|---|---|
| **Body text at least 16 CSS px**, line height about 1.4; captions no smaller than 14 px | Readable at arm's length; iOS zooms into any form field under 16 px |
| **Display faces for headlines only.** The ransom-note lettering and era display fonts (IM Fell, Rye, Monoton, Bungee) are for a few words at a time; body copy stays in the plain serif (Newsreader in C) | Decorative faces are slow to read in sentences |
| **No sentence in all capitals** beyond a short kicker ("STOP PRESS") | Capitals are harder to scan |
| **Contrast at least 4.5:1 for text** (3:1 for large headlines and icons) on every era skin | WCAG 2.2 AA |
| **Touch targets at least 44 × 44 px**, with 8 px between neighbours | Apple's guideline is 44 pt, Material's 48 dp; WCAG 2.2's floor is 24 px |
| **One idea per screen**; secondary detail behind a tap or a flip | Progressive disclosure keeps a small screen calm |
| **Primary actions in the bottom half**, reachable by the thumb; read-only information may live at the top | Most phone use is one-handed or cradled |
| **Never colour alone:** every Art is icon plus word; ticks are ✓ and crosses ✗ as well as green and red | Colour-blind players and bright sunlight |
| **No layout jumps.** Reserve space for headlines and images before they load (C already keeps the headline slot's height) | The designer marked prototype A down for jittery graphics |
| **Highlights sit exactly on their target**, computed from the element's box at render time and re-computed on resize and scroll | The designer marked prototype A down for highlights in the wrong place |
| **Respect the notch and home bar** (`viewport-fit=cover` with safe-area insets), allow pinch-zoom, honour reduced-motion, no horizontal scroll at 390 px | Platform basics |

### 3.3 Making it intuitive so the step-by-step is rarely needed

- **Glow means good, a red stamp means bad, "?" means there's a secret.** Used the same way everywhere.
- **Smileys on every Place** (none to three) are the casual player's compass; tapping them says why ("Made for each other: he likes Wit and you're a Bluestocking").
- **The Sway meter and the Bar line** make the goal visual: get the garter past the line.
- **Say the cost before the tap.** Every action that moves a meter says so on its button ("Go slumming? Notoriety +1, Standing −1").
- **One first-time pulse.** A new button or section glows once, the first time it appears, and never again.
- **Every result explains itself** in one line with the reason ("2nd: Lady Lavinia hit his Kink"). The prototype's hindsight line ("thinking", "luck") stays.
- **A daily gossip sheet, not notifications.** The While You Were Away digest is three to five headlines, most relevant first.

## 4. The first five minutes, revised [Proposed]

| Time | What happens | Teaches |
|---|---|---|
| 0–10 s | Title page; nom de plume and password ("A lady never shares it. Or her age."). | Nothing; sets the tone |
| 10–60 s | The Sunday Supplement, five pages (or Skip). | What the game is, the Timelines, matchups, the two Roads, that depth comes later |
| 60–80 s | Pick a girl: three portraits; tap to hear her line, long-press to flip her. Her Timeline's skin washes over the screen. | Flip-to-inspect; temperaments |
| 80–110 s | A **Tourist** Assignation (Tex in London, Darren in the Wild West, Mr Pooter in Vegas). One card glows. Play two cards; the garter passes the Bar. **Delighted**; a tiny gag; coins clink into the Purse. | Ticks, the Bar, winning feels good, where Coin lives |
| 110–150 s | A stallholder's whisper quotes a gentleman's Tell. Tap the dotted word "Kink" if curious; buy or wave him off. | Items, Tells, tap-to-explain |
| 150 s onwards | The front page: tonight's three Places with smileys, the rival heading for one. "Tonight's Curtain. Where shall we go, dear?" | The evening loop |
| After the first Curtain (round 5) | One new section per edition, with one NEW stamp: the back doors (and the Morning Special) after Curtain 1, the market and the competition after Curtain 2, her hand after Curtain 3; every other section is a one-line fold. A chip row under the Next note jumps to Gents · Back doors · Tonight · Purse. The telegram for a second Timeline has a **Later** button. A whore with no road gets her fork card. | That the paper grows with her, without a wall of stamps |

## 5. Sources for §3.2 (standard guidance, cited from the published guidelines)

- Apple Human Interface Guidelines, Accessibility: minimum hit target 44 × 44 pt. <https://developer.apple.com/design/human-interface-guidelines/accessibility>
- W3C, Understanding WCAG 2.2 Success Criterion 2.5.8 Target Size (Minimum), 24 × 24 CSS px. <https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html>
- W3C, WCAG 2.2 Success Criterion 1.4.3 Contrast (Minimum), 4.5:1. <https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html>
- Material Design 3, accessibility and touch targets (48 × 48 dp).
- Nielsen Norman Group, "Progressive Disclosure". <https://www.nngroup.com/articles/progressive-disclosure/>
- Steven Hoober, "How Do Users Really Hold Mobile Devices?", UXmatters, 2013 (one-handed and cradled grips; the thumb's reach).
