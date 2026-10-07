# Modern Las Vegas art (era skin) -- file list

Shared by all three prototypes. File names follow `engine/ASSETS.md` exactly (content.js loads `../art-assets/vegas/<file>.webp`). Generated locally with FLUX.2-klein-4B by `art-src/vegas/generate.py`. Every delivered image was opened at full size and reviewed: no nudity (chest, hips and bottom opaquely covered; necklines low-but-covered at most), every person reads as an adult of 30+, hands and faces sound, no garbled text, on-style. Prompts, seeds and verdicts (including every rejected candidate and why): `manifest.json`. Masters (PNG): `art-src/vegas/accepted/`.

**Budget:** 40 images delivered (budget about 25-35). Only the starter, Jackie Potts, has expression variants (3). Every other file that `engine/ASSETS.md` asks for reuses a related delivered image: see **Stand-ins** below (also machine-readable as `manifest.json` -> `stand_ins`). No duplicate files are written, so map the name in code, e.g. `const STANDINS = manifest.stand_ins; src = STANDINS[path]?.use ?? path`.

Sizes: portraits 675x900 (3:4); places 1200x675 (16:9); items, afflictions and card art 600x600 (1:1); postcards 1200x800 (3:2); `skin-bg` 1024x1024 seamless tile (`background-repeat`); `skin-frame` 768x1024, 9-slice ready (`border-image-slice: 190`); `skin-card` 768x1024, 9-slice ready (`border-image-slice: 130`); in both the sides are even along their length and everything outside the chrome rim is transparent (WebP with alpha); `skin-curtain` 1280x1600.

Expression variants keep the main portrait's sitting (made with the main portrait as a reference image), so a UI can cross-fade between them.

## Jackie Potts (starter)

| Pri | File | Size | What it is | Use |
|---|---|---|---|---|
| P1 | `vegas/jackie.webp` | 675x900 | Jackie Potts (starter, bored Minx), Common 'streetwalker': resting look | Main portrait (resting); character select; Common tier |
| P2 | `vegas/jackie--yawn.webp` | 675x900 | Jackie Potts, expression: yawn | Expression variant (same sitting as jackie.webp) |
| P2 | `vegas/jackie--bubble.webp` | 675x900 | Jackie Potts, expression: bubble | Expression variant (same sitting as jackie.webp) |
| P2 | `vegas/jackie--eyeroll.webp` -> **stand-in:** use `vegas/jackie.webp` | - | Jackie Potts, expression: eyeroll | Expression variant (same sitting as jackie.webp) |
| P2 | `vegas/jackie--surprise.webp` | 675x900 | Jackie Potts, expression: surprise | Expression variant (same sitting as jackie.webp) |
| P2 | `vegas/jackie--won.webp` | 675x900 | Jackie Potts, WINNING plate (money in hand) | Win plate (money in hand): results edition at 1st and the season's end. Not in content.js yet |

## Brass Bettie (rival, AUTOMATON)

| Pri | File | Size | What it is | Use |
|---|---|---|---|---|
| P1 | `vegas/bettie.webp` | 675x900 | Brass Bettie (rival, AUTOMATON, saucy Hustler): resting look | Main portrait (resting); add the brass-key AUTOMATON badge in the UI |
| P2 | `vegas/bettie--showtime.webp` -> **stand-in:** use `vegas/bettie.webp` | - | Brass Bettie, expression: showtime | Expression variant (same sitting as bettie.webp) |
| P2 | `vegas/bettie--pleased.webp` -> **stand-in:** use `vegas/bettie.webp` | - | Brass Bettie, expression: pleased | Expression variant (same sitting as bettie.webp) |
| P2 | `vegas/bettie--caught.webp` -> **stand-in:** use `vegas/bettie.webp` | - | Brass Bettie, expression: caught | Expression variant (same sitting as bettie.webp) |
| P2 | `vegas/bettie--wink.webp` -> **stand-in:** use `vegas/bettie.webp` | - | Brass Bettie, expression: wink | Expression variant (same sitting as bettie.webp) |

## Stand-in whores

| Pri | File | Size | What it is | Use |
|---|---|---|---|---|
| P2 | `vegas/krystal.webp` | 675x900 | Krystal Chandelier [STAND-IN], 'the Lobby Legend': haughty Siren | Stand-in whore portrait |
| P2 | `vegas/ivy.webp` | 675x900 | Ivy League [STAND-IN], 'the Law Student': scheming Bluestocking | Stand-in whore portrait |
| P2 | `vegas/candy.webp` | 675x900 | Candy Floss [STAND-IN], 'the Pool Party Princess': sweet Minx | Stand-in whore portrait |
| P2 | `vegas/dee.webp` | 675x900 | Dee Scretion [STAND-IN], 'the Woman in the Sunglasses': deadpan Enigma | Stand-in whore portrait |

## Gentlemen and the Tourist

| Pri | File | Size | What it is | Use |
|---|---|---|---|---|
| P1 | `vegas/gent-brayden.webp` | 675x900 | Brayden Bullion III, crypto whale (smug, Scrubbed) | Gentleman portrait (Posh host / Assignation) |
| P1 | `vegas/gent-gaz.webp` | 675x900 | Gaz Pickering, stag do, from Leeds (merry, Fair) | Gentleman portrait (Rowdy host / Assignation) |
| P1 | `vegas/gent-slots.webp` | 675x900 | "Slots" McGee, banned from fourteen casinos (twitchy, Ripe) | Gentleman portrait (Gutter host / back-alley Assignation) |
| P1 | `vegas/tourist-pooter.webp` | 675x900 | Mr Charles Pooter, bank clerk of Holloway (Victorian Tourist lost in Vegas) | Tourist portrait (tutorial punter in Vegas) |

## Places

| Pri | File | Size | What it is | Use |
|---|---|---|---|---|
| P1 | `vegas/place-penthouse.webp` | 1200x675 | The Velvet Rope Penthouse (Posh) | Place backdrop (infinity pool, butler, the NDA on the pillow) |
| P1 | `vegas/place-flamingo.webp` | 1200x675 | The Neon Flamingo Day Club (Rowdy) | Place backdrop (flamingos, the DJ, the lifeguard who has given up) |
| P1 | `vegas/place-motel.webp` | 1200x675 | Motel Paradiso, Off-Strip (Gutter) | Place backdrop (flickering sign, ice machine, the manager) |

## Novelty items

| Pri | File | Size | What it is | Use |
|---|---|---|---|---|
| P1 | `vegas/item-shredder.webp` | 600x600 | Gold Card Shredder (Brayden's Kink item) | Novelty item |
| P1 | `vegas/item-jumpsuit.webp` | 600x600 | Rhinestone Elvis Jumpsuit (Gaz's Kink item) | Novelty item |
| P1 | `vegas/item-dice.webp` | 600x600 | Loaded Dice (Slots's Kink item, black market) | Novelty item |
| P1 | `vegas/item-egg.webp` | 600x600 | The Bluetooth Pleasure Egg (durable novelty) | Novelty item |
| P1 | `vegas/item-stopper.webp` | 600x600 | Rhinestone Stopper (for Decorative Purposes) (black market) | Novelty item |

## Afflictions (curse cards)

| Pri | File | Size | What it is | Use |
|---|---|---|---|---|
| P1 | `vegas/affliction-glitter-itch.webp` | 600x600 | The Glitter Itch (Affliction) | Affliction curse-card art |
| P1 | `vegas/affliction-what-happens.webp` | 600x600 | What Happens in Vegas (Affliction) | Affliction curse-card art (the UI may print her name on the blank billboard) |

## Postcards

| Pri | File | Size | What it is | Use |
|---|---|---|---|---|
| P2 | `vegas/postcard-thank-you.webp` | 1200x800 | Gag postcard: Thank You, Thank You Very Much | Gag event postcard (implied only) |
| P2 | `vegas/postcard-hit-me.webp` | 1200x800 | Gag postcard: Hit Me | Gag event postcard (implied only) |
| P2 | `vegas/postcard-margin-call.webp` | 1200x800 | Gag postcard: Margin Call | Gag event postcard (implied only) |
| P2 | `vegas/postcard-chapel.webp` | 1200x800 | Postcard: Greetings from the Chapel | Collectible saucy postcard |
| P2 | `vegas/postcard-flamingo.webp` | 1200x800 | Postcard: Flamingo Down | Collectible saucy postcard |
| P2 | `vegas/postcard-sign.webp` | 1200x800 | Postcard: Welcome to Fabulous | Collectible saucy postcard |

## Card art

| Pri | File | Size | What it is | Use |
|---|---|---|---|---|
| P2 | `vegas/card-been-there.webp` -> **stand-in:** use `vegas/jackie--bubble.webp` | - | Card art: Been There, Done That (Jackie) | Card art (Jackie's signature) |
| P2 | `vegas/card-reverse-cowgirl.webp` -> **stand-in:** use `vegas/jackie--yawn.webp` | - | Card art: The Reverse Cowgirl, Yawning (Jackie) | Card art (Jackie's signature; a position, implied only) |
| P2 | `vegas/card-bottle-service.webp` -> **stand-in:** use `vegas/place-flamingo.webp` | - | Card art: Bottle Service | Market card art |
| P2 | `vegas/card-sign-the-nda.webp` -> **stand-in:** use `vegas/place-penthouse.webp` | - | Card art: Sign the NDA | Market card art |
| P2 | `vegas/card-body-glitter.webp` -> **stand-in:** use `vegas/postcard-flamingo.webp` | - | Card art: Body Glitter, Everywhere | Market card art |
| P2 | `vegas/card-chapel-quickie.webp` -> **stand-in:** use `vegas/postcard-chapel.webp` | - | Card art: The Chapel Quickie | Market card art (a position, implied only) |
| P2 | `vegas/card-come-hither.webp` | 600x600 | Card art: Come-Hither Look (shared starter) | Card art (shared starter) |
| P2 | `vegas/card-saucy-quip.webp` | 600x600 | Card art: Saucy Quip (shared starter) | Card art (shared starter) |
| P2 | `vegas/card-teeth-extra.webp` | 600x600 | Card art: Teeth Extra (shared starter) | Card art (shared starter) |
| P2 | `vegas/card-peek-a-boo-fan.webp` | 600x600 | Card art: Peek-a-Boo Fan (shared starter) | Card art (shared starter) |
| P2 | `vegas/card-saucy-wink.webp` | 600x600 | Card art: A Saucy Wink (shared starter; saucy, but sanitary) | Card art (shared starter) |
| P2 | `vegas/card-mothers-advice.webp` | 600x600 | Card art: Mother's Advice (shared starter) | Card art (shared starter) |

## Skin textures

| Pri | File | Size | What it is | Use |
|---|---|---|---|---|
| P2 | `vegas/skin-bg.webp` | 1024x1024 | Vegas skin background (tileable 1024) | Page background (background-repeat; 1024 tile) |
| P2 | `vegas/skin-frame.webp` | 768x1024 | Vegas skin frame (9-slice friendly) | Portrait / panel frame (border-image-slice 190; transparent outside the chrome) |
| P2 | `vegas/skin-curtain.webp` | 864x1080 | Vegas skin curtain (sequinned stage curtain with chasing bulbs) | Curtain-drop panel |
| P2 | `vegas/skin-card.webp` | 768x1024 | Vegas skin card face (9-slice friendly) | Card face background (border-image-slice 130; transparent outside the rounded chrome) |

## Stand-ins (beyond the budget)

These contract files are not drawn; show the named delivered image instead.

| Contract file (ASSETS.md) | Use instead | Why / how |
|---|---|---|
| `vegas/jackie--eyeroll.webp` | `vegas/jackie.webp` | her resting look is already jaded and fed-up; only 3 expression variants fit the budget and no eye-roll candidate read clearly |
| `vegas/bettie--showtime.webp` | `vegas/bettie.webp` | rival expressions are outside the budget |
| `vegas/bettie--pleased.webp` | `vegas/bettie.webp` | rival expressions are outside the budget |
| `vegas/bettie--caught.webp` | `vegas/bettie.webp` | rival expressions are outside the budget |
| `vegas/bettie--wink.webp` | `vegas/bettie.webp` | rival expressions are outside the budget (her resting look is already a saucy half-smile) |
| `vegas/card-been-there.webp` | `vegas/jackie--bubble.webp` | deadpan bubble-gum, 'seen it, two stars'; crop the 3:4 portrait to a square on her face |
| `vegas/card-reverse-cowgirl.webp` | `vegas/jackie--yawn.webp` | the yawn is the joke; crop the 3:4 portrait to a square on her face |
| `vegas/card-bottle-service.webp` | `vegas/place-flamingo.webp` | the day club's party; crop the 16:9 place to a square on the cabanas |
| `vegas/card-sign-the-nda.webp` | `vegas/place-penthouse.webp` | the NDA tied with gold ribbon on the satin pillow is in this picture; crop the 16:9 place to a square |
| `vegas/card-body-glitter.webp` | `vegas/postcard-flamingo.webp` | a card you BUY must not show the Glitter Itch affliction (review finding 32): the stag do's flamingo, crop to a square |
| `vegas/card-chapel-quickie.webp` | `vegas/postcard-chapel.webp` | the little chapel with the pink convertible; crop the 3:2 postcard to a square on the door |

## Not made

Optional extras defined in the driver but outside the budget and not in `engine/ASSETS.md` (nothing references them): `extra-jackie-tier-rare`, `extra-jackie-tier-epic`, `extra-jackie-tier-legendary`, `extra-jackie-tier-mythic`, `extra-place-map`.
