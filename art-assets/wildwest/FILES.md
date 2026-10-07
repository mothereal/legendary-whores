# Wild West era-skin art: file map

Shared by all three prototypes. Paths are relative to `proto/art-assets/` and match `engine/ASSETS.md` exactly (content.js: `../art-assets/wildwest/<file>`). Every image was opened and reviewed before acceptance; prompts, seeds, review notes and rejected attempts are in `manifest.json`.

**Budget:** 43 painted of 43 planned (rule: about 25-35 per era; expression variants only for the starter, max 3). 10 contract files are **stand-ins**: they are NOT on disk; map each to the image named in the Stand-ins table (machine-readable: `manifest.json` → `stand_ins`).

- Portraits 600x800 (3:4); `manifest.json` gives each a `css_object_position` for face-centred crops (chips, tokens, the Players screen).
- Places 1280x720 (16:9); items, afflictions and cards 600x600; postcards 900x600 (3:2).
- `skin-bg` is a seamless 1024 tile (dark: bone text sits on it). `skin-frame` and `skin-card` are 768x1024 and 9-slice friendly (even borders, plain centre); measured slice insets: frame 90px, card 140px (`nine_slice_inset` in manifest.json). `skin-curtain` is 1280x1600.
- `x-*` files are extras the art brief asked for (the wanted-poster / woodtype texture set); content.js does not reference them yet. `x-orn-divider` is transparent (sepia-black ink #2B1E14); `x-tex-*` are seamless tiles.

## Fanny Faro (starter, deadpan Hustler, Common: shabby)

| Pri | File | Size | What it is |
|---|---|---|---|
| P1 | `wildwest/fanny.webp` | 600x800 | Fanny Faro · Common · crib girl · resting (deadpan) |
| P2 | `wildwest/fanny--pleased.webp` | 600x800 | Fanny Faro · Common · crib girl · poker face (pleased) |
| P2 | `wildwest/fanny--caught.webp` | 600x800 | Fanny Faro · Common · crib girl · poker face (caught) |
| P2 | `wildwest/fanny--eyebrow.webp` | 600x800 | Fanny Faro · Common · crib girl · one raised eyebrow |
| x | `wildwest/fanny--won.webp` | 600x800 | Fanny Faro · Common · crib girl · WON (chips and a nugget pouch in hand) |

## Clockwork Clementine (rival, AUTOMATON, prim Enigma)

| Pri | File | Size | What it is |
|---|---|---|---|
| P1 | `wildwest/clementine.webp` | 600x800 | Clockwork Clementine · AUTOMATON · resting |
| P2 | `wildwest/clementine--wink.webp` | 600x800 | Clockwork Clementine · AUTOMATON · a porcelain wink (malfunction?) |

## Stand-in whores (STAND-IN label in the UI)

| Pri | File | Size | What it is |
|---|---|---|---|
| P2 | `wildwest/rose.webp` | 600x800 | Prairie Rose Hipps [STAND-IN] · sweet · shabby |
| P2 | `wildwest/prudence.webp` | 600x800 | Prudence Pike [STAND-IN] · prim · plain |
| P2 | `wildwest/dusty.webp` | 600x800 | Dusty Drawers [STAND-IN] · bored · shabby |
| P2 | `wildwest/widow.webp` | 600x800 | The Widow Pettigrew [STAND-IN] · haughty and scheming · splendid |

## Gentlemen and the Tourist

| Pri | File | Size | What it is |
|---|---|---|---|
| P1 | `wildwest/gent-vanderbucks.webp` | 600x800 | Cornelius Vanderbucks, railroad baron (Scrubbed host) · pompous |
| P1 | `wildwest/gent-hank.webp` | 600x800 | Hank "Six-Shooter" McGraw (Fair host) · swaggering |
| P1 | `wildwest/gent-rusty.webp` | 600x800 | "Rattlesnake" Rusty Colt, horse thief (Ripe host) · shifty |
| P1 | `wildwest/tourist-darren.webp` | 600x800 | Darren, from the stag do (Tourist; the tutorial punter) |

## Places

| Pri | File | Size | What it is |
|---|---|---|---|
| P1 | `wildwest/place-velvet-spur.webp` | 1280x720 | The Velvet Spur Parlour House · Posh (piano, linen, the madam's ledger and shotgun) |
| P1 | `wildwest/place-last-chance.webp` | 1280x720 | The Last Chance Saloon · Rowdy (swinging doors; the piano player has learned to duck) |
| P1 | `wildwest/place-hog-ranch.webp` | 1280x720 | Hog Ranch Row · Gutter (the cribs by the fort: mud, lanterns, a goat with opinions) |

## Novelty items

| Pri | File | Size | What it is |
|---|---|---|---|
| P1 | `wildwest/item-spike.webp` | 600x600 | The Golden Spike (Souvenir) · Vanderbucks's Kink |
| P1 | `wildwest/item-spurs.webp` | 600x600 | Jingling Spurs · Hank's Kink |
| P1 | `wildwest/item-lasso.webp` | 600x600 | Lasso of the Lonesome Prairie [black market] · Rusty's Kink |
| P1 | `wildwest/item-lambskin.webp` | 600x600 | Lambskin Sheath, with Ribbon · Protection 2 (2 uses) |

## Afflictions (curse cards)

| Pri | File | Size | What it is |
|---|---|---|---|
| P1 | `wildwest/affliction-drip.webp` | 600x600 | The Gold-Rush Drip · a prospector pans the washbasin, shakes his head, moves on |
| P1 | `wildwest/affliction-saddle-sores.webp` | 600x600 | Saddle Sores · she sits down very, very carefully; a cushion sighs |

## Postcards (gag events and collectibles)

| Pri | File | Size | What it is |
|---|---|---|---|
| P2 | `wildwest/postcard-golden-spike.webp` | 900x600 | The Golden Spike Ceremony (gag: win with Vanderbucks's Kink) |
| P2 | `wildwest/postcard-prairie.webp` | 900x600 | The Prairie Schooner, Fully Laden (gag: win with Rusty's Kink) |
| P2 | `wildwest/postcard-jingle.webp` | 900x600 | Jingle All the Way (gag: win with Hank's Kink) |

## Card art

| Pri | File | Size | What it is |
|---|---|---|---|
| P2 | `wildwest/card-ace-up-garter.webp` | 600x600 | Ace Up the Garter (Fanny's signature card) |
| P2 | `wildwest/card-poker-face.webp` | 600x600 | Poker Face (Fanny's signature card) |
| P2 | `wildwest/card-ambitious-corset.webp` | 600x600 | Corset of Uncommon Ambition (market card) |
| P2 | `wildwest/card-come-hither.webp` | 600x600 | Come-Hither Look (shared starter) |
| P2 | `wildwest/card-saucy-quip.webp` | 600x600 | Saucy Quip (shared starter) |
| P2 | `wildwest/card-teeth-extra.webp` | 600x600 | Teeth Extra (shared starter) |
| P2 | `wildwest/card-peek-a-boo-fan.webp` | 600x600 | Peek-a-Boo Fan (shared starter) |
| P2 | `wildwest/card-saucy-wink.webp` | 600x600 | A Saucy Wink (shared starter; saucy, but sanitary) |
| P2 | `wildwest/card-mothers-advice.webp` | 600x600 | Mother's Advice (shared starter) |

## Skin textures (engine contract)

| Pri | File | Size | What it is |
|---|---|---|---|
| P2 | `wildwest/skin-bg.webp` | 1024x1024 | bg · dark warm saloon planks (seamless tile; bone text #F2E6CF sits on it) |
| P2 | `wildwest/skin-frame.webp` | 768x1024 | frame · dark walnut moulding, brass bead, brass star corner plates (9-slice: 90px corners) |
| P2 | `wildwest/skin-curtain.webp` | 1280x1600 | curtain · a canvas wagon cover drawn shut, lantern glow through the lacing (1280x1600) |
| P2 | `wildwest/skin-card.webp` | 768x1024 | card · bone card stock, sepia double rule, a star in each corner (9-slice: 140px corners; the stars reach 128px in) |

## Extra: wanted-poster paper and woodtype-ink tiles (not in content.js yet)

| Pri | File | Size | What it is |
|---|---|---|---|
| x | `wildwest/x-tex-wanted-paper.webp` | 1024x1024 | Wanted-poster paper (seamless, light) |
| x | `wildwest/x-tex-woodtype-ink.webp` | 1024x1024 | Woodtype ink speckle on cream (seamless; use as a mix-blend-mode: multiply grain over flat colour) |

## Extra: woodtype ornaments, transparent (not in content.js yet)

| Pri | File | Size | What it is |
|---|---|---|---|
| x | `wildwest/x-orn-divider.webp` | 699x105 | Horizontal divider with a star (transparent) |

## Stand-ins (contract files not painted: map them)

Several cross aspect ratios (a 16:9 place or a 3:4 portrait standing in for a 3:2 postcard or a 1:1 card): show them with `object-fit: cover` and the given `object-position`.

| Pri | Contract file (not on disk) | Use instead | object-position | Why |
|---|---|---|---|---|
| P2 | `wildwest/fanny--poker.webp` | `wildwest/fanny.webp` | 50% 24% | starter variants capped at 3 (pleased, caught, eyebrow); her resting portrait already IS the blank poker face |
| P2 | `wildwest/clementine--prim.webp` | `wildwest/clementine.webp` | 40% 20% | expression variants only for the starter; her resting portrait is already prim |
| P2 | `wildwest/clementine--pleased.webp` | `wildwest/clementine.webp` | 40% 20% | expression variants only for the starter |
| P2 | `wildwest/clementine--shocked.webp` | `wildwest/clementine.webp` | 40% 20% | expression variants only for the starter |
| P2 | `wildwest/postcard-wanted.webp` | `wildwest/gent-rusty.webp` | 52% 24% | collectible postcard over budget; the Territory's most-wanted face (use its css_object_position) |
| P2 | `wildwest/postcard-bathhouse.webp` | `wildwest/gent-hank.webp` | 48% 20% | collectible postcard over budget; Hank himself, pre-bath (use its css_object_position) |
| P2 | `wildwest/postcard-sunset.webp` | `wildwest/place-hog-ranch.webp` | centre | collectible postcard over budget; the big red sunset and the washing line |
| P2 | `wildwest/card-drinks-on-house.webp` | `wildwest/place-last-chance.webp` | centre | market card over budget; the saloon it buys a round for |
| P2 | `wildwest/card-bucking-bronco.webp` | `wildwest/postcard-prairie.webp` | centre | market card over budget; the wagon and the lasso (never another player's named whore on a position card) |
| P2 | `wildwest/card-masked-stranger.webp` | `wildwest/place-velvet-spur.webp` | centre | market card over budget; the parlour house, where the masked woman was last seen (no man on a woman's card) |

## Extras not painted (outside the engine contract; nothing to map)

- `x-fanny-rare`: Fanny Faro · Rare · soiled dove (tier-ladder extra)
- `x-fanny-epic`: Fanny Faro · Epic · sporting woman (tier-ladder extra)
- `x-fanny-legendary`: Fanny Faro · Legendary · parlour-house boarder (tier-ladder extra)
- `x-fanny-mythic`: Fanny Faro · Mythic · parlour-house madam (tier-ladder extra)
- `x-fanny-queen`: Fanny Faro · Legendary (Notoriety) · Queen of Hog Ranch Row (tier-ladder extra)
- `x-tex-planks`: Sun-bleached boardwalk planks (seamless, light)
- `x-tex-saloon-wood`: Polished saloon mahogany (seamless)
- `x-tex-canvas`: Canvas weave (seamless)
- `x-tex-leather`: Tooled saddle leather (seamless)
- `x-dust-motes`: Dust motes in low sun (overlay; mix-blend-mode: screen)
- `x-orn-divider-rope`: Rope divider (transparent)
- `x-orn-corner`: Corner flourish (transparent)
- `x-orn-star`: Marshal's star badge (transparent)
- `x-orn-horseshoe`: Lucky horseshoe (transparent)
- `x-orn-pointing-hand`: Pointing hand (transparent)
