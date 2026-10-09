# 04 · Tone and Humour

*The voice of Legendary Whores, what reads as AI slop, and keep-or-cut examples taken from the real content in `engine/content.js`. The designer's verdict on the prototypes: "Some of the humour was lame and AI slop, while some of it was great." And of prototype A: "some of the humour was good, but the repetition was irritating."*

## Voice (2026-10-07)

The designer's direction, which wins wherever the older sections below sound posher: "Overall in the game we are being too classy and bougie. Let's just be normal: normal English, fun language, casual language. It doesn't have to be prudish." Players are normal people, not a classy crowd.

- **Plain and casual.** Normal modern English, short sentences, contractions. Funny, not fancy. Keep the naughtiness and the innuendo; make lines funnier, not tamer.
- **London (Victorian):** a light period flavour only, a "guv'nor" here, a "quid" there. A bit subtle suits the era. No purple prose, no archaic sentence structure.
- **Wild West:** a pinch of the lingo of the time ("reckon", "y'all", "sugar", "saloon", "greenhorn"). Don't go too hard; never a parody accent.
- **Las Vegas:** modern, casual and slangy. Funny without being cringe or try-hard. No dated meme speak, no pile of emojis.
- **UI, menus, buttons, tips, errors and explainers:** clear first, a light wink at most. A new player must get it instantly.
- **Don't over-explain.** No meta-commentary and no clause that explains the joke. Let the player work it out.
- **No filler, no repeats.** No stock phrases, no joke or phrase used twice. Filler "Tuesday", "Somebody", "Nobody" and "Mother" are out.
- **Never change** names, mechanics, numbers, rules keywords, placeholders or markup when rewording.

## 1. The voice in one paragraph

A very proper narrator describing very improper goings-on, with a perfectly straight face. Think seaside postcards, *Carry On*, *Blackadder*, a Victorian gossip column. The narrator never leers, never explains, never uses a rude word when a polite one will do the job better. The reader finishes the joke in their own head, which is both funnier and keeps us on the saucy-postcard side of the line.

## 2. The rules

| # | Rule | Example that follows it |
|---|---|---|
| 1 | **Understate.** Say less than happened. | "Talks about his track. Its length. Its gauge." |
| 2 | **Be specific.** Real numbers, real places, real objects beat adjectives. | "Six thousand pearl buttons and not one done up properly." |
| 3 | **Keep a straight face.** The narrator is formal; the facts are absurd. | "Never used, just waved about. The waving is booked up a fortnight ahead." |
| 4 | **Euphemism over vocabulary.** A polite word the reader decodes is funnier than the rude one. | "A night with Venus, a lifetime with Mercury." (a real Victorian saying) |
| 5 | **Let the character carry it.** A line only one person could say. | Mr Pooter: "I have never seen an ankle. I now appear to have seen all of them." |
| 6 | **Use the period.** The joke lives in the era's own manners, money and slang. | "Vows at 10:02. Annulment booked for 10:15. Elvis gave her away." |
| 7 | **Never explain the joke.** If a line needs its last clause to be understood, cut the clause or the line. | (see §4, "He was a baker. It still worked.") |
| 8 | **Rare beats constant.** A gag event is an event. A prim girl's wink is worth ten saucy ones. | Dolly's wink is listed as "rare, devastating" |
| 9 | **Punch at the job, the era and the punters.** Never at ethnicity or religion; never at the women for being women. Clergy may appear as hypocritical punters (a postcard staple), never faith itself. | "Lord P. seen purchasing a SECOND piano-leg skirt. Questions in the House." |
| 10 | **Heat line:** implied, off-screen, and every character clearly an adult. A cherub or a dowager covers her eyes; the door closes; a sound effect does the rest. | "A squeaky wheel behind the curtain; a brass band strikes up; a portrait of the Duke turns to face the wall." |

## 3. What reads as AI slop

Slop is not "a bad joke". It is a joke-shaped sentence produced by habit. The tells, with counts from `content.js` as of 7 October 2026:

| Tell | What it looks like | Count in content.js |
|---|---|---|
| **The crutch word** | The same comic word reached for again and again: "Tuesday" | 6 |
| **The masked subject** | "Somebody finds it irresistible." (used on novelties so the text doesn't reveal which gentleman's Kink the item is for) | 8 (7 of them on novelties) |
| **The stock reversal** | "He has never been happier." | 4 |
| **The family member** | "Mother", "Ma", "Mom" as the punchline | 8 |
| **"Nobody …"** | "Nobody knows why." "Nobody asks." "Nobody blinks." | 13 |
| **The object reacts** | "The wall is unimpressed." "The shredder is unimpressed." "The horse has lodged a complaint." "A cushion sighs." "It has opinions." "Paid out in sympathy" (twice); "a goat with opinions" | 8 |
| **The two-beat** | Statement. Deflating statement. On its own it is the house rhythm; on every line it is a metronome | most flavour lines |
| **The template** | "Her grin is VIP. Your table is not." A shape filled with words, with no picture behind it | several |
| **The explained joke** | A last clause that tells the reader it was a joke | several |
| **Stock AI phrasing** | "a testament to", "a symphony of", "let's just say", "in a world where", "it's not X, it's Y", padded triples, em dashes in game text | none found; keep it that way |

*This audit predates the plain-English rewrite of 7 October 2026: the example lines quoted in it are no longer in the game.*

**Why the masked subject happened (and the fix).** A novelty's public description must not name the gentleman whose Kink it triggers (that is hidden information until the player Studies him or buys the item from a whisper). The shortcut, seven times over, was the same pronoun. The fix is to joke about the *object*, as the Cane already does ("Swish. A whole generation of Cabinet ministers sits up straight."), not about an unnamed admirer.

## 4. Keep and cut, from the actual content

### Keep (these land)

| Line | Where | Why it works |
|---|---|---|
| "The smile is free. The teeth are extra." | Teeth Extra (card) | Six words, a price list, a picture |
| "She's thinking about you. Or beef prices in Chicago. Hard to say." | Poker Face (Fanny) | Character, deadpan, a real surprise in the middle |
| "Printed in the Gazette under 'A Lady'. Read aloud in three clubs and the Admiralty." | Anonymous Verse (Dolly) | Period-specific; "the Admiralty" is the punchline |
| "Talks about his track. Its length. Its gauge." | Vanderbucks (Tell) | Innuendo by pure understatement, and it doubles as a clue |
| "Has put little skirts on the piano legs." | Lord Plunkett (Tell) | A real Victorian myth used as a character note and a clue |
| "I have never seen an ankle. I now appear to have seen all of them." | Mr Pooter (Tourist) | Character voice; the reader does the work |
| "Lips that touch liquor shall... oh, go on then. Tick." | Clockwork Clementine | A prim automaton cracking is the joke; "Tick" is the button |
| "A night with Venus, a lifetime with Mercury." | The Cheapside Wobbles | A real period saying, perfectly placed |
| "Vows at 10:02. Annulment booked for 10:15. Elvis gave her away." | The Chapel Quickie | Specific times, an escalating list, a final image |
| "Motel Paradiso's ice machine works. Management investigating." | Vegas gossip | Headline grammar; the joke is the investigation |
| "The fan says 'go away'. The eyebrows say 'Tuesday'." | Peek-a-Boo Fan | The one good Tuesday: it's specific and it's an appointment |
| "Gor blimey, look at the apples and pears on 'er. The stairs, love. I meant the stairs." | Alfie Barrow | Rhyming slang where the correction *is* the joke |

### Cut or rewrite (these don't)

| Line | Where | Problem | Rewrite or action |
|---|---|---|---|
| "She offered to warm his muffins. He was a baker. It still worked." | Saucy Quip (London) | A copy of the fireman joke, then explains itself | Cut; the fireman line already does this |
| "Wink, wink. Sanitiser." | A Saucy Wink (Vegas) | A slogan, not a joke; no picture | "She winks across the craps table. A grandmother in a visor wins forty dollars." |
| "Mom says: cash, not crypto." | Mother's Advice (Vegas) | A statement; and a Mother crutch | "Never accept payment in a currency named after a dog." |
| "Her grin is VIP. Your table is not." | Teeth Extra (Vegas) | Template, no image | Rewritten 7 October 2026: "His car is leased. Her veneers are paid off." |
| "Has survived worse. Has survived Tuesdays." | Iron Constitution (Charm) | Tuesday crutch; vague | "Has eaten at the Drowned Rat. Twice. By choice." |
| "Alfie says you're the apples and pears of his eye. Nobody knows what that means." | Alfie (reaction) | Mangled slang plus a "Nobody" crutch | "Alfie calls you his Duchess of Fife. Mrs Barrow is not amused." |
| "Gaz remembers the stag. Nobody has seen the stag since Tuesday." | Gaz (reaction) | Two crutches in one line | "Gaz remembers the stag. The stag is currently married to a showgirl in Reno." |
| "Somebody finds this unbearably attractive." and six siblings | Kink novelties (`publicUse`) | The masked subject, seven times | Joke about the object: Loaded Dice "Roll a seven at the casino and you're thrown out. Roll it elsewhere and you're thrown a party."; Jumpsuit "Sequins, flares and a cape. The sideburns are sold separately." |
| "He has never been happier." (the Lorgnette, Brayden's reaction) | NPC card, reaction | Stock reversal, four times | Keep it once, in the *Detention* gag where it is the punchline; rewrite the rest |
| "The wall is unimpressed." / "The shredder is unimpressed." | The Wand, Margin Call | Object reacts, repeated | Keep the wall (the Wand plugs into it, so it earns its place); cut the shredder |
| "Mother is told it's secretarial work." | Promotion headline | Fine alone, but Mother appears eight times | Budget: Mother appears at most twice in the whole game. Rewritten 7 October 2026: "She's had cards printed." |

(Rewrites above are drafts in the house voice; they go through the same review as all other content: heat line, adults only, nobody's ethnicity or religion.)

## 5. Repetition: the mechanisms that stop it

The designer's strongest complaint about prototype A was repetition. The engine already fights it **[Built]**:

- **Reactions rotate per gentleman**: each gentleman and Tourist has three lines per outcome (delighted, satisfied, fizzled), taken in turn on a per-gentleman counter.
- **Shared starter cards have three or four era-specific flavours each**, picked by copy position, so two copies in one hand never show the same line.
- **Gag punchlines rotate** (two or three per gag); the rota tip in the digest rotates through four templates; the digest merges repeated gossip into one headline.
- **Headlines never repeat back to back** (prototype C de-duplicates identical lines in its queue).

**[Built] the tone lint** (9 October 2026): one `test('Tone lint ...')` in `engine/test.mjs`, straight after the "One home per joke" walk, with its `toneLint(C)` helper and its allowlist (the `TONE` table) in the same file. It walks every player-facing string in `content.js` (anything with a space) except names, short names, titles, epithets and labels, which are exempt and instead act as boundaries for the phrase count. `game/strings.js` joins the walk when I3 creates it. The thresholds as shipped:

1. **Banned and budgeted words.** Fails on "Somebody", "never been happier", "is unimpressed", "has opinions", "in sympathy", "a testament to", "a symphony of", "let's just say", "in a world where" and the em dash character anywhere; on "Tuesday" past one use game-wide; on `Mother|Mom|Ma ` (the spec's own pattern, case-sensitive, the space keeping "Ma'am" out) past two uses game-wide.
2. **Per-Timeline budgets.** At most one "Nobody ..." line and one object-reacts line ("A/The <thing> sighs", "has lodged a complaint"; the other object tells are banned outright) per Timeline. A shared line (a Charm, Talent or Vice) counts in every Timeline. The Mother budget is game-wide (item 1) rather than per Timeline, as §8 of the arena spec and 07 §10 state it.
3. **Three-word phrases.** Any three-word phrase on more than two lines fails. Phrases never span a name, a `{placeholder}` or a capitalised rules keyword (Notoriety, Sway, the Curtain, a Posh Place, Best Guess and so on; lowercase "the curtain" is the stage prop and counts as prose). A phrase made only of function words ("out of the") is not counted. The allowlist carries the template stems that repeat by design (the gentlemen's "him and he" hook, "wants you. Pack", "went out without you"), each with the pool that owns it and a maximum, and the editor's tics from 07 §11 with their budgets.
4. **Rhythm budget.** A two-beat line is exactly two sentences, "Statement. Deflating statement."; the ALL-CAPS kicker is not a beat, a beat that is only a placeholder ("{eratail}") is not counted, and outside the voice bucket a beat that is quoted speech makes the line dialogue, one of the other shapes. The share of two-beat lines in each bucket (flavour, reaction, voice, gossip, digest) must be at or under **half**, as the arena spec §8 and 07 §10 say. The ceiling is not raised to pass.
5. **Three variants** for the rota tip (`DIGEST.rotaTemplates`); Top marks, Last call and the heat labels join when they are lifted out of `game/scandal.js`.

**Where the content stands against it, and the debt table (measured 9 October 2026 on a20687d's content):** 0 banned words, 0 "Tuesday", 1 of 2 Mother, 1 of 1 "Nobody" per Timeline; reaction (60 of 135, 44%) is under the rhythm ceiling. Over it: **flavour (65 of 123, 53%), voice (45 of 66, 68%), gossip (26 of 36, 72%) and digest (37 of 58, 64%)**; and eleven three-word phrases sit on three to five lines: "over the curtain" (5) and "the curtain and" (4) in the gag set-ups (`GAGS.thank-you.see`, the Tourists' `gags`), "calls it the" and "it the best" (4, one card flavour and three delighted reactions), "pays you in" (4, Nobby's hook and three reactions), "she told the", "a lot of", "buttoned to the" (three character `look` lines), "at a time", "rolls out from" and "all the way" (3 each). The lint arrived after those lines were written, so it carries them as **debt** (`TONE.debt` in `engine/test.mjs`): each phrase and each over-ceiling bucket with its count **as found**. The test fails if any count grows (one more two-beat gossip line, one more line on a debt phrase) and fails if a count has come down and the entry was not lowered to it or struck, so the table holds the exact counts, only ever shrinks, and no count is ever raised. Who strikes what: the editor's I3 rewrite (arena spec §8) clears **gossip** and **digest** and the one `GOSSIP.victorian` line under "at a time"; every other entry sits in a pool he does not own (07 §12: card flavours, the gentlemen's reactions and voices, item lines, character looks, the gag set-ups), and those are cleared only by the designer's read-aloud cut (item 6 below) or kept by his decision, never by the lint. The full report prints with the test.

**[Proposed]**

6. **A read-aloud pass** before content ships: a human reads every new line aloud once; anything that makes nobody smile is cut, not polished.

## 6. Heat-level checklist (every new line, image prompt and gag)

- Implied, never shown; never described graphically.
- Nobody is anything but clearly an adult, in words or pictures.
- Allowed: winks, double meanings, corsets, stockings, garters, bare shoulders, low but covered necklines, a slipping strap, laddered stockings; comic adult novelties shown as objects; absurd named "positions" described with a straight face.
- Never: nipples, genitals, bare bottoms, sex acts depicted or described graphically.
- The joke's target is the job, the era or the punter; never ethnicity, never religion, never a real victim of a real crime.
