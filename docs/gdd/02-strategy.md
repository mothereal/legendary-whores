# 02 · Strategy

*The core loop, the two Roads, matchups, and how depth arrives in layers. Numbers come from `docs/rules-core.md` and `engine/content.js` (`RULES`); nothing here changes them. Items marked **[Proposed]** are v2 changes to build and simulate; **[Decision]** items wait for the designer.*

**The promise in one line:** play the cards that glow and you'll do fine; read the gentleman and you'll do splendidly.

---

## 1. The core loop, in plain words

1. **Dawn.** Your girl draws five cards. The rota lights up: which gentleman hosts which Place tonight, and for the next three Curtains.
2. **Between Curtains, do as much or as little as you like.** Take a quick **Assignation** (a private job, resolved on the spot). **Rummage** behind a back door for coin, gossip, saucy postcards and novelties. **Study** a gentleman to learn a secret. Shop. Flip anything over to read its back. Or hop to your girl in another Timeline.
3. **Plan.** Pick a Place. Each one shows **smileys** (none to three) for how well it suits you tonight. Drag up to three cards onto the host, or tap **Best Guess**. Add one novelty and your Talent if you like. A live **Sway** meter shows exactly what you'll score from what you know; unknowns show as "?".
4. **Seal** with wax. You can unseal and change your mind until the Curtain falls.
5. **Curtain.** Everyone at each Place is ranked. 1st takes the big share and the Applause, 2nd and 3rd take smaller shares, everyone who came gets a door gift. Below the Place's **Bar** you get the door gift and a **Brave Face** (+1 Sway next time).
6. **Repeat**, up to three full-pay Curtains a day per girl. After that it's **After Hours** (coin and door gifts only), which is the signal to play another Timeline or go to bed.

A casual evening is **three taps**: Place, Best Guess, seal. **[Built]**

### The three promises to the casual player (design law) [Built]

1. **Hidden things only ever help.** Everything that can cost you (his Aversion, a card he's seen before, your Itch, a door about to close, a rival's Upstage) is printed face up. Secrets you uncover are only bonuses.
2. **One button is always good enough.** Best Guess picks the highest-scoring cards on what you can see and never pushes your Itch to the point of catching something.
3. **Absence is not punished.** Miss a Curtain and your **Standing Order** plays Best Guess at the Place with the most smileys. Door gifts pay everyone who turns up.

---

## 2. The two Roads (the tracks, made explicit)

Every girl has two opposed meters, **Standing** (respect, class) and **Notoriety** (cheap tricks, gutter deals), each 0 to 10. They sit on a **seesaw**: each time one rises by 1, the other falls by 1. That seesaw already makes two distinct ways to play **[Built]**. v2 gives them names, a moment of choice and their own identity on screen **[Proposed: naming and UI only, no rule change]**.

| | **The High Road** (Standing) | **The Low Road** (Notoriety) |
|---|---|---|
| The fantasy | The toast of the salon; kept by a duke; painted by society portraitists | The richest tart in Wapping; queen of the cribs; on every front page |
| Lives at | Posh and Rowdy Places | Gutter and Rowdy Places |
| Pays | The most Renown per win, Applause, Standing; **invitations** (+1 Renown a day) and a **Patron** (2 Coin a day) **[Built, round 5]** | Fast Coin (Gutter pays 3 / 2 / 1 Coin), back-alley Assignations, black-market toys, bribes |
| Opens | **Posh doors** (Standing 2+ and Standing ≥ Notoriety); **invitations** at 3+ (the first Scrubbed gentleman she Delights each day adds +1 Renown above the daily cap); **Respectable** at 5+: +1 Sway at Posh Places and the right to challenge for the **Salon Seat**; a **Patron** at 7+ (2 Coin each morning); **the Society Pages, framed** at 10 **[Built, round 5]** | **Back-alley** Assignations at 1+; **black-market** novelties at 2+; **Grease Palms** at 3+ (2 Coin per +1 Sway, max +2, at Rowdy or Gutter); **Notorious** at 5+: +1 Sway at Rowdy and Gutter and the right to challenge for the **Gutter Throne**; the **Front Page** at 10 |
| Closes | Nothing, but every Frolic card Worked at a Posh Place costs 1 Notoriety ("people talk") | Posh doors, once Notoriety beats Standing; at 8+ Scrubbed gentlemen refuse your Assignations ("His Lordship is not at home") |
| Watch out for | Rival toffs crowding the Posh Place; Frolic cards leaking Notoriety | Raid Night every third Curtain halves Gutter Renown; Ripe gentlemen give the Itch; the Timeline's rival follows a notorious girl into the Gutter |
| Tops out at | The **Salon Seat** (Legendary), then the **Crown** (Mythic) | The **Gutter Throne** (Legendary), then the **Crown** (Mythic) |
| Hall | The **Hall of Legendary Whores** | The Hall's **Rogues' Gallery** wing |
| Leaderboard | **Most Respectable** (her best single whore's season-peak Standing) | **Most Notorious** (best single whore's season-peak Notoriety) and **Richest** (the most Coin one whore earned this season) **[Built, round 5]** |
| Coin buys | **The Ladder, Society Pages side**: e.g. a gown from Worth, a carriage and pair, a box at Covent Garden, a villa in St John's Wood | **The Ladder, Police Gazette side**: e.g. a room over the pie shop, a parlour with a piano, the Forty Elephants' protection, a house of her own in Wapping |
| On her portrait | A pearl necklace that lengthens | A blush that deepens |

Both Roads count the same on **Whorescore**, the main board. The simulation shows them close in strength for every starter (weaker Road earns 88% to 93% of the stronger after round 5; §9).

### 2.1 Titles per Road [Built]

Each tier wears the Timeline's real period term. Common and Mythic are shared; the middle rungs split by Road. *Invented* titles are ours; the rest are historically grounded (sources in rules-core).

| Tier | Victorian London: High / Low | Wild West: High / Low | Las Vegas: High / Low |
|---|---|---|---|
| Common | dollymop | crib girl | streetwalker |
| Rare | dress lodger / park woman | soiled dove / hog-ranch girl | outcall entertainer / card girl (*invented*) |
| Epic | pretty horsebreaker / thieves' woman | sporting woman / lady of the line | ranch girl / hustler |
| Legendary (seat) | prima donna (Salon Seat) / Richest Tart in Wapping (*invented*, Gutter Throne) | parlour-house boarder / Queen of Hog Ranch Row (*invented*) | high-end escort / Off-Strip Royalty (*invented*) |
| Mythic (Crown) | grande horizontale | parlour-house madam | courtesan to the whales |

### 2.2 How a player chooses [Built, round 7]

*Round 7:* nobody picks a paper. Her nights do: whichever of Standing and Notoriety leads puts her in its paper (a 1-point lead is enough), and while they are level she stays where she was (`roadOf`, rules-core §4.1 and §9). It is settled once per action, so a flip and a flip back inside one Curtain is no news. A headline says when she changes papers, and warns her when one more point the other way would do it. The strip on her front page and Her stats say which paper she is in and how far the other one is; in the Police Gazette, Her stats also says how she gets back. Page 4 of the overview shows both papers without a picker, and the two-page spread (*Both papers* in Her stats) is read-only. Removed: the picker on page 4, the arrival card's road choice, the fork card, *Decide later* and the *Wrong paper* line.

*Round 5 (superseded by round 7):* the overview's page 4 offers both papers (Society Pages / Standing, Police Gazette / Notoriety) with one line on how to climb each; **every whore's arrival card** offers the road again, with the player's last choice ticked; a whore with no road meets **her own fork card** on her front page the first time a meter moves (it stays until she picks a paper or taps *Decide later*; *Read all about it* opens the two-page spread below); a whore who has chosen a road and moves against it gets a plain *Wrong paper* line. On newcomer surfaces the two roads carry one pair of names only; *High/Low Road*, *classy/notorious* and *Posh/Gutter* live in the explainers. The original design:

1. **Before the fork, she is "Undecided".** A new girl starts at Standing 2, Notoriety 0, which leans High but commits to nothing. Best Guess keeps her there (it counts every point of Notoriety a play would cost as −1 Sway while Standing ≥ Notoriety, so it never drifts her off the High Road by accident) **[Built]**.
2. **The fork appears the first time either meter moves** (in practice, after the first Curtain at a Posh Place, the first "Go slumming?" or the first back-alley offer). It is a two-page tabloid spread: left page *"SOCIETY PAGES: The High Road"*, right page *"POLICE GAZETTE: The Low Road"*, each with three lines (what it pays, what it opens, its seat and board) and a portrait of her in each future. Buttons: **Take the High Road**, **Take the Low Road**, **Decide later**.
3. **What declaring does (display only):** it sets her Road badge and which Road's titles show on her profile, puts her Road's leaderboard first on the Players screen, and words her headlines for that Road. It **does not** change smileys, Best Guess, any number, or any door: the meters alone decide doors and seats, so a player can never be trapped by a menu choice.
4. **[Built, round 7]** Smileys and Best Guess's Notoriety guard follow the paper she is in, and her meters decide it (there is no declared Road any more). A Gazette player taps Best Guess without fighting it, and an idle player is never pushed out of the Society Pages: Best Guess and the Standing Order alone never move her paper (T12). Full sim: all gated targets met (rules-core Balance log, round 7).

### 2.3 Switching Roads [Built mechanics, Proposed wording]

Switching is allowed, costs time and is never instant, which is what makes the choice mean something:

| Going bad (High → Low) | Going straight (Low → High) |
|---|---|
| Walk into a Gutter Place (Notoriety +1, Standing −1; the first visit asks "Go slumming?") | Delight a Scrubbed gentleman in an Assignation (Standing +1) |
| Work a Frolic card at a Posh Place; Pick His Pocket; catch an Affliction; Smokescreen; the Vibratory Wand; the Rhinestone Stopper at a Posh Place; Doc Pruitt's Snake Oil | Place 1st or 2nd at a Posh Place (while the door is still open to you) |
| Win a back-alley Assignation | Work the era's Notoriety −1 market card: The Charity Bazaar (London: "good works, in public"), Signing the Pledge (Dakota: "signed in front of witnesses"), The Chapel Quickie (Vegas: "you're married now; it's respectable"). From Notoriety 8, when Scrubbed gentlemen stop seeing her, this is the way back |
| | Sign the NDA stops Notoriety rising for one encounter |

- The moment Notoriety passes Standing the Posh doors shut, and the game says why in plain words ("Your Notoriety is higher than your Standing. Delight a Scrubbed gentleman to tip the seesaw back."). **[Built]**
- **Seat eligibility follows the meters.** Switching Roads mid-season costs you the right to challenge for your old seat (Salon Seat needs Standing 5+, Gutter Throne Notoriety 5+). A seat-holder who drifts below her meter keeps her seat but can't use it as the step to the Crown (which needs Standing or Notoriety 7+).
- **Season end halves both meters**, so every season is a gentle chance to choose again.
- **[Built, round 7]** The game names the switch when it happens, and her paper changes with it (nothing to accept): *"You're in the Police Gazette"* or *"You're back in the Society Pages"*, with a warning one point before. While she is away, the digest prints *"IN THE GAZETTE: …"* or *"BACK IN SOCIETY: …"*.

---

## 3. Matchups (the heart of the game)

The fun is in reading *this* gentleman with *this* girl at *this* Place tonight. Everything is whole numbers. No dice in any clash, ever; the only unknown at a Curtain is what your rivals chose. **[Built]**

### 3.1 What a card scores

```
card score = printed Allure
           + the Place's House Rule (e.g. Wit +1)   } never below 0
           + card text (e.g. "+1 if he lists Wit")   }
           + 1  ✓ it carries one of his Tastes        (printed on his card)
           + 1  ✓ it carries his Secret Taste         (hidden until Studied; counts even if you don't know it)
           + 1  ✓ it carries your Signature Art       (printed)
           − 2  ✗ it carries his Aversion             (printed)
```

Then once per encounter: **Fancy** +2 (your Type is the one he's weak for), **Kink** +3 (the right novelty or the right card), **Regular** +1 per earlier good visit (max +2), plus Charms, Talents, Vices, items and meter bonuses. Highest **Sway** wins the Place.

The same card swings by up to six points with the target. Dolly's *Limerick from Nantucket* scores 3 at the Salon on Lord Plunkett (who faints at Frolic) and costs her a point of Notoriety; the same card scores 5 at the Tuppenny Palace on Alfie Barrow (who loves Frolic) and gives her a point of Itch.

### 3.2 Flip, Study, learn [Built]

Every gentleman has a public face and a private one.

| On his card (free) | Behind it (earned) |
|---|---|
| **Tastes** (two Arts he likes, ✓ +1 each) | **Secret Taste** (one more Art, ✓ +1): the 1st Study |
| **Aversion** (one Art he can't abide, ✗ −2) | **Kink** (+3, triggered by a specific novelty or market card): the 2nd Study |
| **Fancy** (the Type he's weak for, +2) | **History** (which rival last charmed him, and how): the 3rd Study |
| **Freshness** (Scrubbed / Fair / Ripe: how much Itch Frolic gives) | |
| **Two Tells** (free one-line clues that hint at the secrets) | |

- **Long-press flips anything** (cards, gentlemen, rivals, items) to show its back. **Tap any bold word** for a one-line explanation (prototype C's "Exclusive" pop-ups).
- **Study** ("watch from the bar"): three free per girl per day, then 1 Coin each ("bribing the maid"). Each Timeline holds only nine gentleman facts and six rival facts, so a keen player soon knows everything there is.
- **Tells are the free route.** The stallholder's whisper for a Kink novelty quotes one of the gentleman's public Tells ("For a gentleman who flinches when doors slam"); buying it decodes that Tell and teaches you his Kink.
- **Accidents teach too.** Hit a Secret Taste or a Kink by accident and it goes in your **Little Black Book** for the season.
- **Kinks are earned, not stumbled on.** Every Kink trigger is a specific novelty or a market card the casual player never buys; the sim checks that casual Kink hits stay under half the planner's (T11).

### 3.3 What costs you points [Built]

| Cost | Size | Always visible? |
|---|---|---|
| A card carrying his **Aversion** | −2 on that card | Yes (✗ on the card before you play it) |
| A **House Rule** against an Art (e.g. Frolic −1 at the Salon) | −1 Allure | Yes |
| **Seen It**: a card you played on him last visit | −1 per card | Yes (stamped on the card) |
| **Grudge**: you fell short of his Bar last time | −1 Sway until you please him | Yes |
| A rival's **Upstage** (if she finishes directly below you, you lose 2) | −2 Sway | Yes: her Talent is public and the tap-to-explain says "beat her by 3 or more, or be nowhere near her" |
| An **Affliction** in your hand | Takes a card slot, plus its symptom (−1 Sway, −1 Allure on an Art, −1 Coin a Curtain, or rivals see your Place) | Yes |
| **Vices** (e.g. Bored Stiff: −2 at last Curtain's Place; Mother's Ruin: −1 at Posh) | as printed | Yes |
| Falling below the **Bar** | No share (door gift and Brave Face only) | Yes (the Bar line on the meter) |

### 3.4 What raises Notoriety [Built]

Each of these adds 1: attending a Gutter Place; winning a back-alley Assignation; each Frolic card Worked at a Posh Place; Pick His Pocket; catching an Affliction; Smokescreen; each use of the Vibratory Wand; the Rhinestone Stopper at a Posh Place; Doc Pruitt's Snake Oil. **Sign the NDA** cancels the Notoriety from one encounter; **The Chapel Quickie** takes 1 off. After Hours Curtains move neither meter.

### 3.5 Afflictions: the push-your-luck [Built]

Frolic cards are about one Allure stronger than their price suggests. The cost is the **Itch** (0 to 3):

| His Freshness | Itch from each Frolic card you Work on him |
|---|---|
| Scrubbed | none |
| Fair | +1 |
| Ripe | +1, and +1 more for the encounter |

At Itch 3 you catch the comic **Affliction** he carries: a curse card that clogs your deck (and costs 1 Notoriety) until a quack cures it. The Sway meter always says so before you seal ("Itch 2 → 3: you'll catch the Saddle Sores. Fancy it?"), Best Guess never takes you to 3, and back-alley Assignations pay +1 Coin per Frolic card, so the gamble has a visible payoff. Catching something is always a choice. Itch fades by 1 after each quiet Curtain.

---

## 4. The strategy gets richer as you progress

Day one is three taps and a laugh. Depth arrives in layers, each introduced the first time it matters, each with one headline and a tap-for-more. The player is told up front (in the overview pages) that *"the game gets richer, and naughtier, the further you climb"*.

| Layer | Arrives | What it adds | Status |
|---|---|---|---|
| **0. Ticks** | First minute (a Tourist Assignation) | Cards that suit him glow; the Bar; Delighted vs Satisfied | [Built] |
| **1. The Curtain** | Evening 1 | Places, the split, rivals, Best Guess, sealing | [Built] |
| **2. Assignations and the second Timeline** | After the first Curtain and first Assignation | Quick solo jobs; a telegram from another era ("Later" allowed) | [Built] |
| **3. Reading him** | Evening 2 | Tells, Study, Secret Tastes, the Little Black Book | [Built] |
| **4. Novelties and Kinks** | First back-door rummage or stallholder whisper | The +3 Kink, the best trade on the street; first gag event behind a curtain | [Built] |
| **5. The Itch** | First Frolic card on a Fair or Ripe man | Push-your-luck, Afflictions, cures | [Built] |
| **6. The Roads** | First time a meter moves | The fork, doors opening and shutting, back alleys at Notoriety 1+, black market at 2+; invitations at Standing 3+, a Patron at 7+ | [Built] (fork card and spread: round 5; round 7: no fork card, her nights move her paper with a headline, and the spread is read-only) |
| **7. The rota and rivals' habits** | Evening 3 or the first Raid Night on the rota | Planning three Curtains ahead; Studying rivals; Gossip that tells you where a rival is heading | [Built] |
| **8. Charms, Talents, Vices in play** | Shown from the start on her card, highlighted the first time each one fires | Character builds; Upstage warnings | [Built]; [Proposed] highlight-on-first-fire |
| **9. Rare** (30 Renown) | Typically evening 4 to 6 | A new era title and the third Timeline | [Built] |
| **9a. A name about town** (100 and 200 Renown) | Between Rare and Epic | An era sub-title at each (e.g. Victorian: *the toast of the Strand* / *the talk of the Ratcliff Highway*, then *a fixture at Ascot* / *well known to Scotland Yard*); plus the Ladder's rungs as Coin comes in | [Built, round 5] |
| **10. Epic** (350 Renown) | About 45 to 58 evenings for a casual player, sooner for a planner | Challenge rights for a Legendary seat (with Standing or Notoriety 5+); Duels | [Built] in the engine and season sim; not in the prototype slice |
| **11. Legendary and Mythic** | Holding a seat; Crown at meter 7+ | Defending a seat, the Crown, the Hall | [Built] in the engine; UI to come |

**It gets more scandalous as you go** without breaking the heat line: back alleys and the black market only open on the Low Road, gag events only fire on a Kink win (which you earn by Studying), the Front Page waits at Notoriety 10, and the Rogues' Gallery is its own wing. Outrageous senior set-pieces are a parked idea (06-roadmap).

---

## 5. Depth beats breadth

Playing three Timelines is variety, not an advantage. **Whorescore** gives each girl tier points for the best result she held this season:

| Best result | Common | Rare | Epic | **Legendary seat** | **Mythic seat** |
|---|---|---|---|---|---|
| Points | 1 | 4 | 13 | 40 | 121 |

Each rung is worth three of the rung below, plus one, so one mastered Timeline always beats three skimmed ones at the rung below (one Epic 13 > three Rares 12; one Legendary 40 > three Epics 39; one Mythic 121 > three Legendaries 120). Your best three girls a season count in full, any others at half. A girl scores only once she has a result. The simulation's T5 checks it: a one-Timeline planner beats a three-Timeline casual player in 90% of seasons (§9). **[Built]**

## 6. Time buys insight, not power

| | Light player (two visits a day) | Heavy player (on all day) |
|---|---|---|
| Curtains | The same 3 full-pay Curtains a day; Standing Orders cover the rest | The same |
| Renown from Assignations | about 2 to 4 a day | capped at 9 a day; the 4th to 6th pay half; the 7th onwards pay a Gossip and no Coin |
| Hidden facts | most within 3 to 4 days (Tells, accidents, free Studies) | all by day 2 |
| Items | 1 or 2 in the Reticule | always the right 3 |
| Net edge | | insight and options; never a bigger hand, extra plays per Curtain or stronger cards |

The sim measures it: six Assignations a day earn 3% more Renown than three (T9). **[Built]**

## 7. Seats [Built in the engine]

Per Timeline: two **Legendary** seats (the **Salon Seat**, Standing 5+; the **Gutter Throne**, Notoriety 5+) and one **Mythic Crown** (hold a Legendary seat and have Standing or Notoriety 7+). An Epic girl who meets the meter **Challenges** the holder: a Duel at the next Curtain; the challenger picks the Place, the holder picks the judge from the Timeline's three gentlemen, and the holder gets +1 Sway (home crowd). Lose and the holder drops to Epic. A seat can be challenged once per Curtain; a holder has two Curtains' grace after a defence; a failed challenger waits two days. Vacant seats go to the first eligible girl to win a Duel night at the seat's Place. Holders at season's end hang in the Hall (Gutter Throne holders in the Rogues' Gallery). Seats are per Timeline and the arena is one world: every player competes with every other, however many there are.

## 8. Whorescore and the boards [Built]

| Board | Ranks players by |
|---|---|
| **Whorescore** | Lifetime Whorescore (§5), cumulative across seasons |
| **Richest** | The most Coin **one** of your girls earned this season (the Low Road's board); your second girl breaks ties |
| **Most Notorious** | Your **best single girl's** season-peak Notoriety; your second girl breaks ties |
| **Most Respectable** | Your **best single girl's** season-peak Standing; your second girl breaks ties |

*Round 5:* the road boards used to sum every girl's peak, so a three-girl player at 4 each (12) beat a specialist at 10. Ranking the best single girl makes them agree with §5, depth beats breadth.

Automatons appear in a separate "House Automatons" section, always with the brass-key badge, never ranked on Whorescore.

---

## 9. The evidence: the shipped engine simulation

`node engine/sim.mjs` runs the real engine (`rules.js` + `content.js`): 150 seeded runs × 30 evenings per row, six-girl tables (the starter, her Timeline's rival, four labelled stand-ins). Bots: **casual** (Best Guess, most smileys, never Studies), **casual-ui** (the same, but follows the smileys on screen even into a first Gutter visit), **greedy** (biggest pot, highest Allure), and **planner** (Studies for real, buys and uses Kink and Sway novelties, uses its Talent, predicts the crowd, picks a Road).

Run on 7 October 2026, after round 5 (the designer's prototype scores: the Ladder, the Morning Special, tier-priced Grease and stakes, the Society Pages road's rungs, best-whore boards). Target block, verbatim (`ALL TARGETS: MET`; T13 is now a gate):

```
== Targets (rules-core.md §14.1) ==
T1 thinking pays (best planner / casual in 1.3..1.7): dolly 1.35, fanny 1.64, jackie 1.48 -> PASS
T2 casual climbs (Rare <= 6, Epic <= 60 evenings): dolly 5/46, fanny 4/58, jackie 5/51 -> PASS
T1u (informational, proposed) thinking pays vs a smiley-follower (best planner / casual-ui in 1.3..1.7): dolly 1.33, fanny 1.58, jackie 1.44 -> PASS
T2u (informational, proposed) a smiley-follower climbs (Rare <= 6, Epic <= 60 evenings): dolly 5/45, fanny 4/55, jackie 4/49 -> PASS
T3 no dominant market card (<= 40% of a planner's Curtain plays): dolly max 35%, fanny max 35%, jackie max 39% -> PASS
T4 no dominant Place (pooled planner visits <= 40%): dolly max 36%, fanny max 34%, jackie max 37% -> PASS
T5 depth beats breadth (planner-1 mean >= 1.1x casual-3, ahead >= 55%): mean 91.60 vs 39.00 (2.35x), ahead 98% -> PASS
T5r (informational) the same with a planner-grade rival in each Timeline: mean 88.30 vs 39.00 (2.26x), ahead 92% -> PASS
T6 both routes viable (weaker >= 85% of stronger; Notoriety richer, Standing more respectable): dolly 0.92 coinEarned N/S 273.61 vs 132.89 peakStanding S/N 10.00 vs 3.23; fanny 0.88 coinEarned N/S 299.75 vs 241.57 peakStanding S/N 10.00 vs 2.33; jackie 0.93 coinEarned N/S 213.41 vs 130.01 peakStanding S/N 10.00 vs 2.00 -> PASS
T7 casual is safe (<= 0.10 afflictions/evening; the Police Gazette casual takes back alleys too): dolly 0.00 (casual-notoriety 0.01), fanny 0.00 (casual-notoriety 0.00), jackie 0.00 (casual-notoriety 0.00) -> PASS
T8 afflictions are seen (Frolic-signature planner 0.05..0.25/evening): jackie 0.10 -> PASS
T9 time can't buy rank (heavy/light <= 1.15): dolly 1.02, fanny 1.03, jackie 1.02 -> PASS
T10 the Gutter has company (other whores she meets at the Gutter Place, per visit, all bots pooled, >= 1; every-Curtain average for the record): dolly 1.43 (notoriety planner 1.48; every Curtain 1.12), fanny 1.62 (notoriety planner 1.78; every Curtain 0.92), jackie 1.86 (notoriety planner 1.99; every Curtain 1.66) -> PASS
T11 Kinks are earned (casual Kink hits/evening <= half the better planner's): dolly 0.09 vs 0.24, fanny 0.00 vs 0.29, jackie 0.00 vs 0.29 -> PASS
T12 the lazy road is a choice (casual-notoriety ends Notoriety > Standing and reaches Rare <= 6 evenings; casual stays Standing >= Notoriety): dolly N/S 9.71/0.13 Renown/evening 6.55 Rare 5 (casual S/N 8.70/0.87); fanny N/S 10.00/0.00 Renown/evening 7.35 Rare 5 (casual S/N 6.58/0.85); jackie N/S 9.77/0.03 Renown/evening 7.20 Rare 5 (casual S/N 9.93/0.00) -> PASS
T13 Low Road Coin is spent (planner-notoriety unspent Coin at evening 30 <= 40% of earned): dolly 18% (Standing planner 23%), fanny 35% (Standing planner 23%), jackie 17% (Standing planner 23%) -> PASS

ALL TARGETS: MET (none failing)  [222 s]
```

Per-starter ratio lines from the same run, verbatim (in order: Dolly, Fanny, Jackie):

```
ratios: planner-standing/casual 1.35  planner-notoriety/casual 1.24  greedy/casual 0.72  best route: standing  weaker/stronger route 0.92
ratios: planner-standing/casual 1.64  planner-notoriety/casual 1.45  greedy/casual 0.94  best route: standing  weaker/stronger route 0.88
ratios: planner-standing/casual 1.48  planner-notoriety/casual 1.38  greedy/casual 0.82  best route: standing  weaker/stronger route 0.93
```

**Reading:** every gated target passes, T13 included: the Notoriety planner now spends all but 17–35% of her Coin (74–85% unspent before round 5). Thinking pays 1.35 to 1.64 times the casual rate; the casual player reaches Epic in 46 to 58 evenings; both Roads are within 12% of each other and each wins its own board; time can't buy rank (1.02 to 1.03). The weaker-route gap widened a little for Fanny (0.88; it was 0.91) because the Society Pages road gained invitations.

### 9.1 The open T4 issue: Motel Paradiso

*Closed since: T4 passes in the round-5 run above (Vegas max 37%). The analysis below is kept for history.*

T4 asks that no single Place takes more than 40% of planner visits in its Timeline. **It fails in Vegas only, at 44%.** From the same run, the Vegas planners' Place lines, verbatim:

```
planner-standing   ... places: The Penthouse 40%, The Day Club 37%, Motel Paradiso 23%
planner-notoriety  ... places: Motel Paradiso 65%, The Day Club 35%, The Penthouse 0%
```

(lines shortened at "..."; the Place shares are unedited). The Low Road can't enter the Penthouse, and even the High Road planner slums at the Motel on almost a quarter of its Curtains, because Jackie (a Frolic Minx) is weak at the Penthouse, where every Frolic card costs Notoriety. The Motel collects the overflow from both Roads. Six rounds of number tuning did not fix it without breaking T1, T2 or another Timeline (balance log in rules-core). The Penthouse NDA lever (Frolic costs no Notoriety there) was measured and rejected (T4 Vegas 52% → 50%, still failing, and it broke T2). It needs a rule-level choice.

## 10. Open decisions for the designer

| # | Decision | Options | Recommendation |
|---|---|---|---|
| 1 | **T4 Vegas: the Motel concentration** | (a) a Motel-specific raid rule (e.g. Metro Vice raid the Motel every 2nd Curtain); (b) a Vegas stand-in whose Habit works the Motel, contesting it; (c) accept a Vegas exception to the 40% band | **(b)**: content only, one Timeline, and it makes Studying and Gossip about her worth something. Re-run the sim (T1, T2, T4, T6, T10) before it lands. Note that giving stand-in Candy the Gutter habit was already tried and pushed T1 Jackie to 1.27; the new stand-in should be weaker or should alternate with the Day Club. |
| 2 | **The Wild West Saloon** is the obvious smiley pick for Fanny on most Curtains (casual Fanny goes there 70% of the time), so a thinking Fanny and a lazy one score about the same there | (a) House Rules travel with the host on the rota (every Place changes character Curtain by Curtain; a new idea to teach; moves the sim everywhere); (b) a Wild West stand-in with a Gold signature and a "Saloon" Habit who contests it | **(b)**, for the same reasons as #1; (a) is attractive later as a Rare-tier layer ("the rota matters more"), not on day one |
| 3 | **Talent once per day** instead of once per Curtain (an option in the engine, `talentOncePerDay`) | Keep per Curtain (the rulebook) or switch | Keep per Curtain for now: per day held T1 and T9 but worsened T4 in London (42% → 44%) and the Wild West (40% → 43%) |
| 4 | **The Upstage floor**: Upstage never pushes a girl below the Bar | Add it or not | Not needed: the printed Upstage warning already keeps promise 1; revisit if playtesters feel robbed |
| 5 | **Which casual bot T2 is measured against**: the Gutter-refusing `casual` or the smiley-following `casual-ui` (what a lazy human actually does) | Either | Gate on **both** (both pass today); keep `casual` as the strict one |
| 6 | **Smileys and Best Guess follow the declared Road** (§2.2) | Yes, or meters only | **Decided, round 7:** there is no declared Road. Her paper follows her meters (whoever leads by 1 point; a tie keeps her paper), and smileys, Best Guess and the Standing Order follow it. T12 was reworded for a lazy player who likes the dives (`casual-gazette`); all gated targets met; Dolly reaches Rare at evening 6 against a gate of 6 (rules-core Balance log, round 7) |
| 7 | **What Coin buys (round 5)**: before round 5 the Notoriety planner ended 30 evenings with 74–85% of her Coin unspent (T13 informational). Built: the **Ladder** (4 cosmetic rungs of lodgings and finery per road, 8 / 20 / 40 / 80 Coin), the **Morning Special** (one stall novelty a day), **Grease Palms and the Gambler's stake priced by tier**; T13 is now a gate and passes | (a) keep the Ladder cosmetic (as built); (b) give the top rung one small once-a-day perk; (c) paint a portrait and win picture per rung (18 images a road across the three eras; today a frame, a label and a caption) | **(a)** for balance (T9 holds); **(c)** as an art job when the designer wants it |
| 8 | **The invitation's shape (round 5)**: the review proposed "pays Renown, not Coin". Measured: inside the daily Assignation cap the planner is already at the cap, so only the casual player gained and T1 London fell to 1.29. Built instead: the first invitation she Delights each day adds +1 Renown **above** the cap, Coin as usual (T1 London 1.35) | Keep as built, or "Renown not Coin" with a different T1 lever | Keep as built |
