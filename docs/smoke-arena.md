# Arena smoke: two (then three) accounts in one District

The browser smoke of ARENA-SPEC section 9.4, as a checklist a person or an agent can repeat. It needs no repo
dependency: a local server, two or three browser contexts with separate cookie jars (two MCP browsers, or one
browser with a normal and a private window), and the page's `?debug` hook (`window.__lw`) for assertions.
Screenshots go under `.playwright-mcp/lw-arena/` (gitignored). Nothing here is committed.

Every line a player reads is plain English with no em dashes; if a step prints one, that is a finding.

## 0. Start the server

```
LW_DEV=1 LW_DB=/tmp/lw-arena.sqlite LW_MIN_PER_SEC=1 node server/server.mjs
```

- `LW_DEV=1`: dev mode (the `lw_dev` cookie over plain http, the test seams; never on the live box).
- `LW_DB=/tmp/lw-arena.sqlite`: a throwaway world. Delete the file (and its `-wal` and `-shm`) for a fresh run.
- `LW_MIN_PER_SEC=1`: one District minute per real second, so a grid Curtain (every 180 District minutes) falls
  every 3 real minutes. The rate is fixed once the world exists: a different value refuses to start.
- The page is `http://localhost:8091/?debug` (the default `LW_PORT`; the server prints the one it took). `?debug` exposes
  `window.__lw = { ui, L, act, ACTS, render, go, onBackground, openModal, closeModal, net, saveGame, poll,
  enterArena, leaveArena, V, acctView }`.
- Useful reads: `__lw.ui.screen`, `__lw.ui.modal && __lw.ui.modal.type`, `__lw.ui.cache.clock`,
  `__lw.ui.cache.curtains.victorian` (`nextCurtainAt`, `humans`, `humanNames`, `sealing`),
  `__lw.acctView().whores`, `__lw.ui.strip`, `document.querySelector('[role=status]')?.innerText`.
- The District clock on the title page's Purse and the Timelines page is in the device's locale, from the
  server's `clock` and `minPerSec`.

Three accounts: **A** and **B** play; **C** signs up, picks the same starter, does one Study and stays unsealed
(the one the early fall waits for). Names are minted at the sign-up form (the page offers one); write them down.

## 1. A signs up, reads How to play, picks Dolly, plays the welcome evening

1. Context A: open the page. Tap **How to play** on the title; it opens at 375 px wide with no headline printed
   over it. Close it.
2. **Create account** with the offered name and a password. The title shows "Start playing".
3. The pick page shows "0 girls on this street" under each starter (`/api/me` `crowd`). Pick **Dolly**.
4. The welcome evening runs locally: the overview (a newcomer to the device), the tourist Assignation, the stall
   whisper, the front page, Curtain 0 at her seal. `__lw.ui.mode` is `solo` and `__lw.ui.welcome` is set
   throughout; nothing is saved under `lw-scandal-game`.
5. Close Curtain 0's result: `POST /api/join` runs and the arrival card opens (`__lw.ui.mode` is now `arena`).
   Check the card: "DOLLY STEPS OFF THE TRAIN", the travel line "That was the rehearsal ... first Curtain at
   about {time}", and under the photo "You play her as {A}". **The first-Curtain time prints once** on the whole
   card (smoke low: it used to print twice). Screenshot.
6. Close the card. The front page: no "While you were away" strip (she has never been away). The LOGGED OUT
   headline is not on screen.

## 2. B and C sign up and pick Dolly too

7. Context B: sign up, pick Dolly (the pick page now says "1 girl on this street"). Play the welcome evening to
   the arrival card. The card names "{B}, playing Dolly Mopp".
8. Context C: the same; then on C's front page tap one gentleman's **Study** (any cost) and leave C on the
   front page, unsealed. C is "active" for the next 24 District hours.
9. Back on A: wait one poll (5 s). `__lw.ui.cache.curtains.victorian.humans` is 3 and `humanNames` holds the
   three names, sorted.

## 3. The plan screen names the others; the seal line counts people

10. A: tap **Plan tonight** at any Place. Under the pay chips the crowd note reads "The forecast counts the
    house. 2 other girls are in this era tonight. Also here tonight: {B} and {C}. Their plans are their own."
    **Names only**: nowhere on A's screens, in `__lw.ui.cache` or in any `/api/view` answer is B's or C's hand,
    plan, Place or seal (search the JSON for their whore ids followed by `.hand`, `.plan`, `.known`).
11. A: pick cards and **Seal it**. (When Best Guess is under the gentleman's Bar, Seal opens a "SHORT OF HIS BAR"
    sheet first: tap **SEAL ANYWAY** (`data-act="short-seal"`), or no act is posted. A script that only taps Seal
    seals nothing on that sheet.) The seal line on the front page reads "Sealed for {place}. The Curtain falls at
    about {time}. **1 of 3 sealed**; it falls sooner only once everyone who played today has." "Sealed" prints once
    (smoke low: it used to read "Sealed for The Salon. Sealed. The Curtain falls ..."). The count is humans, never
    the house girls (smoke2 low: it used to say "6 of 7"). The time is the grid time (`nextCurtainAt`) in the
    device's locale.
12. B: seal too. The seal line says "2 of 3 sealed". The Curtain does **not** fall early: C is active and
    unsealed (`__lw.ui.cache.curtains.victorian.ready` stays `false`).

## 4. The grid Curtain falls while everyone is on the page

13. Wait for the District clock to reach `nextCurtainAt` (at most 3 real minutes). Within one poll (5 s) A and B
    each see the curtain drop on screen ("The Curtain falls.") and then the result screen with A's own breakdown
    ("How she did it"). `__lw.ui.screen` is `results` on both. Screenshot both.
14. C, who never sealed, **also** sees the curtain drop and her result screen, with the line "Dolly went out by
    Standing Order. The Curtain falls." Nothing prints over her standings: not the Standing Order line, and not
    the LAST CALL tip, which goes when its Curtain falls (smoke lows). When C taps **Back to the front page**, the
    headline "STANDING ORDER / DOLLY WENT OUT WITHOUT YOU / {Place}: took {Nth}. Seal next time to choose the
    Place yourself." prints there, once (smoke medium). **No "While you were away" strip and no "Nothing stirred"
    digest appears on A, B or C**: they never left (smoke2 medium 1). `__lw.ui.strip` is `null` on all three.
15. Close the editions. On every front page the new deal is in the hand; the seal line is gone.
16. The tip strip on the arena front page at last call never says "The house is holding the curtain for her"
    (the server keeps the clock; the arena lines say "Seal now, or her Standing Order goes on for her").

## 5. B leaves and comes back; the digest reports only what she missed

17. B: close the tab (or Menu, Your account, Log out). Note the District clock.
18. A: plan and seal, let two more grid Curtains fall (6 real minutes), watch both editions.
19. B: open the page again (Log in if logged out) and tap **Back to the District**. WHILE YOU WERE AWAY opens (a
    sheet, since it is about her) with a Standing Order line for each Curtain she missed, naming A where A
    placed above her. **The Curtain B watched in step 13 is not listed** (smoke2 medium 2: her seen cursor moved
    when she watched it). Screenshot.
20. Close the sheet. The strip, if any, reads "Back in the District." and only real news; never "Nothing stirred"
    alone.

## 6. After Hours, the boards, a profile

21. A: at `LW_MIN_PER_SEC=1` run the clock past three forced Curtains in one District day (seal each or let the
    Standing Order play). The front page and the plan screen show the After Hours banner: the heading "After
    Hours in London" and under it "Curtains here pay Coin only. Full pay again at {time}." **The phrase "After
    Hours in London" prints once** (smoke low), and the banner never says "to bed".
22. Menu, **Players**: the board ranks all three humans and the house rows carry the house tag. Tap B's row: her
    public profile opens (name, tier, title, Timelines; no hand, no plan).
23. How to play opens from the pick page and from the Menu at 375 px with no headline over it.

## 7. Log out and back in: no stale headline

24. A: Menu, Your account, **Log out**. The title shows "Logged out / The District keeps your girls; your
    Standing Orders run."
25. Enter the password, **Log in**. The arena front page resumes. **The LOGGED OUT headline is gone**
    (`document.querySelector('[role=status]')` holds no "Logged out"; smoke low). The digest, if any, lists only
    what fell while she was out: after a logout lasting seconds nothing prints, no strip and no sheet, even when
    the digest holds a TONIGHT or LAST CALL forecast (`__lw.ui.strip` is `null`; smoke low: a strip whose only
    item was "TONIGHT: ..." used to print).

## 8. The server dies mid-session and comes back

26. Find the server's pid and `kill -KILL` it. On B: tap **Seal it** (and **SEAL ANYWAY** if the short-of-Bar sheet
    opens, step 11). The page prints "Can't reach the District"
    and the Purse clock shows "-". On the screen B is on (the plan screen here), within a few seconds of the tap,
    one plain line reads "Can't reach the District. Your move is kept and goes in when it's back."
    (`p.keptline`, `role=status`) and stays through her taps and screen changes until the seal settles (smoke
    medium: no line printed after the tap). The front page strip says "The wire is down. The page is checking
    what went through." Nothing claims the seal was lost.
27. Restart the server with the same command (the world lock is stale and cleared; the journal replays). Within
    a few seconds B's poll recovers (while the District is unreachable the page polls 3 s, 5 s and 8 s apart,
    then every 10 s, so after a short outage the first poll after the restart goes within 3 to 5 s, and after
    one longer than about 16 s within 10 s; "The wire is back" if it was down over 30 s), the kept line goes, and "Your last move
    went through" prints. The seal is re-posted with its nonce and goes through **once**. Before the restart,
    note the nonce from B's page (`__lw.ui.cache.unsettled.nonce`) and her account id (`__lw.ui.cache.acct.id`).
    After the run (the server holds the file with an EXCLUSIVE lock while it is up; stop it first, or copy the
    file) read the receipts, not the journal:
    `sqlite3 /tmp/lw-arena.sqlite "select account, nonce, seq, at from world_nonces where account = '<B account id>' and nonce = '<nonce>'"`
    shows exactly one row (`world_nonces` keeps one row per account and nonce: an accepted act writes one, and a
    replay of the same nonce writes none). Do not count rows in `world_actions`: it is the journal after the last
    snapshot, and every snapshot (including the one SIGTERM takes) prunes it, so after a stop it is usually empty.
    B's front page shows her sealed.
28. A kept move whose Curtain falls during the outage. Run at `LW_MIN_PER_SEC=3` (a grid Curtain every minute;
    a fresh `LW_DB`). Right after a Curtain, B opens the plan screen. Just before the next Curtain
    (`__lw.ui.cache.curtains.victorian.nextCurtainAt` against `__lw.ui.cache.clock`), `kill -KILL` the server;
    B taps **Seal it** (and **SEAL ANYWAY** if asked). The kept line prints and
    `__lw.ui.cache.unsettled.curtain` is the curtainNo B tapped under. Restart the server only after the Curtain's
    time has passed (about 30 s at this rate). The first good poll re-posts the kept seal with its nonce and that
    `curtain`; the server answers 409 `curtain-passed`. On B: the kept line goes,
    `__lw.ui.cache.unsettled` is `null`, the edition of the Curtain that fell shows (her Standing Order went out),
    and the headline reads "The Curtain fell before your move went in. Her Standing Order went out for her."
    **Nothing is sealed for the next night**: no "Sealed for ..." line on B's front page, and
    `__lw.V().whore.plan` is not sealed. The receipts query of step 27 with that nonce returns no row. B's next
    Seal goes in under the new Curtain (smoke r6 medium: the kept seal used to land on the next night with the
    card positions from before the deal).

## 9. A guest game is untouched

29. In a fourth context (no account), **Play as guest**: a local game starts and is saved under `lw-scandal-game`.
    Nothing from it reaches `/api/`. Log in there: the guest game stays on the device; the District is on the
    title page.

## Recording the run

Write the run as a list of steps with pass/fail, the defects with severity, where (file and line), what was
seen (quote the text) and the repro, and the screenshot paths. Any line with an em dash, any inline event
handler in the page, any string reaching the DOM without `esc()`, and any plan or hand of another human in a
payload is a finding whatever the step.
