# 07 · The Editor

*The one-page bible for the Scandal Sheet's editor, the voice of every line the paper prints. Drafted for the designer's read-aloud cut; the designer edits this page before any line in `engine/content.js` or `game/` is rewritten in his voice. The rules here sit inside [04-tone-and-humour.md](04-tone-and-humour.md), which wins where the two disagree.*

## 1. Who he is

One man edits all three mastheads: *The Illustrated Police Gazette & Tittle-Tattle* in London, *The Lower Bottoms Bugle* in Dakota Territory and *The Strip Tease Daily* on the Strip. He has no name and wants none. He signs as **the Editor**, which the game already uses for Letters to the Editor, and the paper speaks as "we" or not at all. He says "I" only in a signed note, and a signed note is rare.

He disapproves of everything the District does, in print, in a straight voice, and he was obviously there. That is the whole character. He condemns the night in the headline and knows the price, the door code and the second verse by the end of the line. He never admits it and never has to: the reader works it out, which is the house rule (04 §2, rule 7). He is not a leering uncle and not a toff; he is a hack with a notebook, plain casual English, short sentences, a straight face (04 "Voice", §1).

"Our correspondent", who heads every play screen and gets thrown out of the Salon in the three closing lines (`game/scandal.js:35-37`), is him. The correspondent is the third-person dodge he hides behind when he has to explain how the paper knows. He never says so and the game never says so.

## 2. What he notices

Money changing hands, and how much. Who was seen where, and at what hour. What was left behind: a hat, a sock, a ring in a cup holder, a tip folded into a swan. The respectable man at the back who would rather not be in the paper. And the sound and the aftermath of the act, never the act: the band striking up, a bed leg going, a door closing, a portrait turned to the wall (04 §2, rule 10). Real numbers, real places, real objects beat adjectives (rule 2). Say less than happened (rule 1).

## 3. What he never says

The act itself, in any words. Rude words, where a polite one does the job (rule 4). A last clause that explains the joke (rule 7). The crutches "Tuesday", "Somebody", "Nobody" and "Mother" (04 "Voice" and §3). Any joke at the girls for being girls, or at anyone's ethnicity or religion; clergy may appear as hypocritical punters, faith never as the target (rule 9; `docs/rules-core.md` heat line). Stock AI phrasing: "a testament to", "a symphony of", "let's just say", "in a world where", "it's not X, it's Y", padded triples (04 §3). Em dashes, anywhere in game text. He never changes a name, a number, a rules keyword, a placeholder or an ALL-CAPS kicker when a line is reworded (04 "Voice", last point).

He never prints a human player's character name in a headline, a human's sealed Place, or a human's Sway when she fell short of the Bar (section 6).

## 4. His running gag

Evidence of presence, never purchase. He knows the door code at the Penthouse, the price at the Drowned Rat, the second verse of the song the magistrate fined a man for, which stair creaks at the Velvet Spur, which booth the valet keeps free. He knows these the way a man who was there knows them, and he reports them as if everybody does. The denial of presence, when there is one, is a single flat aside and lives in the byline (section 8), never in the news.

He never bought, paid for, subscribed to or kept anything. The "disapprover who secretly buys" beat belongs to The Front Page collectible ("A preacher called it a disgrace and bought six copies", `engine/content.js:593`, pinned by `engine/test.mjs:1565`) and to the Front Page's own era tails (the vicar who preaches against her, the marshal who pins her picture, the billboard). He does not touch that beat, not even as a variation. He also never claims research as an excuse; he claims nothing.

## 5. How he names a player's girl

Everywhere the paper prints a human player, she is her **nom de plume**, the account name, spelt exactly as the server holds it, underscores and all (D2; `docs/server-api.md` "The nom de plume"): "Ruby_Buckshot takes the Salon Seat." The character's name, "Dolly Mopp, the Parlourmaid Poetess", appears only on that player's own page, as "Ruby_Buckshot, playing Dolly Mopp". House players keep their character names. He never puns on, shortens, tidies or comments on a nom de plume: the name is the person, and the paper's gossip is about the character, never the person (D8). The client escapes the name before it reaches the page; he treats it as a string he did not write.

**The address rule.** A headline is in the third person: the girl by name, the gentleman by name, the paper looking on. The second person is allowed in exactly two places: the detail line that opens under a headline (`DIGEST.details`), and the tips, meaning TONIGHT, LAST CALL, ON THE ROTA and its three rotations, NEW AT THE STALLS, the TELEGRAM that sends for her, and the stall whisper. Headlines that today carry a second-person tail ("went out without you", "Wasn't he yours?", "Weren't you just with him?", "Watch your back") keep the news in the third person when they are rewritten; a short "you" may survive only where it tells her something to do next.

## 6. What he may print about a human

Exactly the public list, in the same words he uses for a house player (D8; ARENA-SPEC §6): Curtain results with rank, Place and Sway, Sway for share-takers only; delights; afflictions caught; habit changes; promotions, titles, seats and the boards; a rival's Talent when it fires; her nom de plume. Nothing else. Not her hand, her items, her plans before or while sealed, her Little Black Book, her coin on hand except where the Richest board already shows it, a winning human's played cards to anyone but herself, her Sway when she fell short of the Bar, or where she is going tonight: Gossip says of a human, "Where she goes tonight is her own affair." The engine withholds these; he does not get to know them, so he cannot let one slip.

## 7. Era register

Inside the caps of 04 "Voice": a light flavour, never a parody accent, no purple prose, no archaic sentence structure.

**London, 1895.** The cadence of a court report: who was seen leaving, by which steps, at what hour, and what the porter was given. A "guv'nor" here and a "quid" there, a shilling or a bob when a price is named, a magistrate when a fine is. The rest is plain.

**Dakota Territory, 1876.** A frontier weekly, set by a man with one case of type: the stage, Main Street, the Marshal, the assay office, prices in dollars. A pinch of "reckon", and "y'all" and "sugar" only in another mouth. Never a drawl written out.

**Las Vegas, now.** A push notification: short, present tense, a number in it, the valet, the butler, the front desk. Modern and casual, funny without trying; no dated meme speak, no pile of emojis. The one text-message line the game has (the Vegas telegram) is not his register for headlines.

## 8. Bylines, heat labels and the signed note

The dateline carries his byline under each masthead, and the While You Were Away sheet carries it under its title. The byline is the one place the denial of presence goes: one flat line per era, written once, never rotated, never a punchline anywhere else. The three heat labels on the sheet ("Hot off the press · about you", "Worth knowing", "Idle gossip" today) become his section headings, three per era, plain, no joke, and the top one always says the news is about her. "Inside today" on the title page is his contents box: a headline and a page number, three per era. A signed note, the only place he says "I", is rare, and the daily sheet has none.

## 9. The heat line

Implied, never shown, never described graphically. Everybody is clearly an adult. Allowed: winks, double meanings, corsets, stockings, garters, bare shoulders, a slipping strap, laddered stockings, comic novelties as objects, absurd named positions described with a straight face. Never: nipples, genitals, bare bottoms, sex acts depicted or described. The target is the job, the era or the punter; never ethnicity, never religion, never a real victim of a real crime (04 §6; `docs/rules-core.md`). One heat line for all three eras; a per-era heat line is still open with the designer (06 §1.2) and he does not anticipate it.

## 10. Budgets

The numbers the tone lint in `engine/test.mjs` enforces (04 §5, proposals 1 to 4; ARENA-SPEC §8), copied here so the writing and the check agree:

The banned list: "Somebody", "never been happier", "is unimpressed", "has opinions", "in sympathy", the em dash. "Tuesday" at most once game-wide. "Mother", "Mom" or "Ma" at most twice game-wide. Per Timeline, at most one "Nobody ..." line and one line where an object reacts. Any three-word phrase at most twice across all player-facing strings, outside the allowlist of game terms ("Notoriety +1", "Curtain No.") and his tics below. The two-beat shape (statement, deflating statement) on at most half the lines of any bucket; the rest as dialogue, lists, headlines, captions or period quotes. Anything a player can see more than once a day (the rota tip, Top marks, Last call, the heat labels) has at least three variants. Names, short names, titles, epithets and labels are exempt (and are boundaries for the phrase count); the lint walks every other player-facing string in `content.js`, his pools and the ones he does not own alike, and `game/strings.js` when I3 creates it. Lines that were over these budgets before the lint existed are carried as a dated debt table (`TONE.debt`, counts as found; 04 §5 lists them): a count may never grow and an entry must be struck once its lines are rewritten or cut.

Every new line goes through the designer's read-aloud (04 §5, proposal 5): anything that makes nobody smile is cut, not polished.

## 11. His allowed tics

These are the allowlist the lint carries for him. Each is an exact string with a budget; nothing else of his may pass the three-word count more than twice.

"we are told": the hedge of a man who was not told but was there. At most two per era, six game-wide, never two in one sheet.

"names withheld": the respectable man at the back, protected in print. At most one per era, as a line's last two words.

"we reckon": Dakota only, at most two game-wide.

"our correspondent": the heading of the play-screen hints and the three closing lines, as today (`game/scandal.js:31`, finding 20: it heads every play screen, so it is never a punchline).

"Page {n}.": the last words of an Inside today line, and nowhere else.

## 12. What he does not own

Card flavours, which are the cards' own voices. The gentlemen's Tells and reactions, which are theirs. Item lines, POSTCARDS and the Ladder's DIGS captions. The `teach()` tips and the How-to-play sheet, which are voice-free and clear first. When one of these is rewritten for clarity (04 "Voice", UI point) it is a clarity pass, not his pass, and no joke is added. The gag events' set-ups (what is seen and heard behind the curtain) stay as written; their punchlines and the LUCKY lines get his light voice pass, no jokes added. The debt the lint carries in those pools (04 §5: the gag set-ups' "over the curtain", the reactions' "calls it the best" and "pays you in", the flavour and voice buckets over half two-beat) is not his to clear: it goes to the designer's read-aloud, which cuts or keeps by row; his I3 rewrite clears only GOSSIP and DIGEST.

## 13. Samples for the read-aloud

None of these ship. They are here so the designer can hear the voice before any pool is rewritten, and strike or reword by row. Placeholders and kickers are kept the way the templates keep them (`{whore}`, `{gent}`, `{place}`, `{rival}`, `{seat}`, `{tell}`).

| # | Bucket | Era | Sample |
|---|---|---|---|
| 1 | Digest headline | London | SEEN LEAVING: {gent} came down the area steps of {place} at a quarter past two, counting his change. The porter has had a shilling and a story. |
| 2 | Digest headline | Dakota | TOPPLED: {whore} loses {seat} to {rival}. The chair went out of the back door of the Saloon at nine and came back at ten with a new leg. |
| 3 | Digest tip | Vegas | LAST CALL: {whore} is due on stage. {gent} at {place}: he's told the front desk it's a business dinner. The front desk has met him before. |
| 4 | Gossip | London | A churchwarden was seen at the Drowned Rat on Saturday with a bottle in each pocket and a hymn book in neither. Names withheld. |
| 5 | Gossip | Dakota | Main Street's new boardwalk is done. The planks outside the Velvet Spur squeak, and the Marshal has learned a great deal from them. |
| 6 | Gossip | Vegas | A limo waited outside Motel Paradiso from 2 a.m. to 5 a.m. with the engine running. The driver's tip was folded into a swan. |
| 7 | Stall whisper | London | Psst. For the gent who… “{tell}” Four bob, love, and the Gazette never saw you. |
| 8 | Curtain result, the tail after the numbers | Dakota | One more Sway would have taken it outright. The barkeep had the big jar out ready. He has put it back, slowly. |
| 9 | Inside today | London | A gentleman fined ten shillings for singing in Lambeth. The second verse is worse. Page 4. |
| 10 | Inside today | Vegas | Valet finds a wedding ring in a cup holder. Third this week from the same car. Page 6. |

Row 7 keeps the quoted Tell slot intact because buying the item decodes the Tell (`engine/rules.js:1261`). Row 8 keeps the Sway sentence as the mechanics state it; only the tail is his.
