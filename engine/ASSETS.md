# Legendary Whores · Art asset list (engine contract)

Generated from `engine/content.js` (do not hand-edit filenames; change content.js and regenerate). Every path below is relative to `art-assets/`; content.js references them as `../art-assets/<era>/<file>.webp` (relative to a prototype folder such as `proto/a-theatre/`).

- **Format:** `.webp`. Portraits 3:4 (e.g. 768×1024); places 16:9 (e.g. 1280×720); items, afflictions and cards 1:1 (e.g. 768×768); postcards 3:2; skin textures: bg tileable 1024×1024, frame/card 9-slice friendly 768×1024, curtain 1280×1600.
- **Heat level: saucy postcard.** Winks, corsets, stockings, garters, bare shoulders, low-but-covered necklines; comic novelties as comic objects. NEVER nipples, genitals, bare bottoms, sex acts, or anyone not clearly an adult. Low tiers look shabby (darned, laddered, second-hand).
- **Eras:** `victorian` (gilded oil, candlelit, gaslight) · `wildwest` (painterly realism in the spirit of RDR2 key art and Frederic Remington, sepia dusk) · `vegas` (neon synthwave / cyberpunk-glam, magenta and cyan, chrome, glossy airbrush).
- **Priority:** P1 = the slice cannot look right without it. P2 = shown in the slice but UIs fall back gracefully (expression variants fall back to the main portrait; card art falls back to the Art icon; textures fall back to CSS). Edo Yoshiwara and every other era: none (parked).
- UIs must tolerate a missing file (show the era frame plus the name).

## Victorian London (`victorian/`)

Skin: Gilded oil painting, candlelit, gaslight. Illustration: Oil-painting brushwork in the manner of Victorian genre painting: warm chiaroscuro key light, gold rim light, dark varnished backgrounds, faces lit like a portrait sitting. Palette: soot #1E140F · velvet #3B0F1A · oxblood #6B1E23 · gilt #C9A24A · giltHighlight #E8C877 · candle #F4DFAE · parchment #EFE3C8 · gaslight #4F6B4A.

| Pri | Kind | File | Subject | Brief |
|---|---|---|---|---|
| P1 | character | `victorian/dolly.webp` | Dolly Mopp | shy; A housemaid's cap worn at a hopeful angle, a darned apron over a corset two sizes too ambitious, ink on her fingers, one stocking laddered. Resting expression. |
| P2 | expression | `victorian/dolly--blush.webp` | Dolly Mopp: blushing behind a fan | Same sitting as the main portrait; expression: blushing behind a fan. |
| P2 | expression | `victorian/dolly--pleased.webp` | Dolly Mopp: a tiny triumphant smile | Same sitting as the main portrait; expression: a tiny triumphant smile. |
| P2 | expression | `victorian/dolly--caught.webp` | Dolly Mopp: mortified | Same sitting as the main portrait; expression: mortified. |
| P2 | expression | `victorian/dolly--wink.webp` | Dolly Mopp: the wink (rare, devastating) | Same sitting as the main portrait; expression: the wink (rare, devastating). |
| P1 | character | `victorian/lavinia.webp` | Lady Lavinia Loosely-Laced [STAND-IN] | haughty; Swan neck, opera gloves, a lorgnette she looks down through at everyone, a bodice laced by committee. Resting expression. |
| P2 | expression | `victorian/lavinia--disdain.webp` | Lady Lavinia Loosely-Laced: looking down the lorgnette | Same sitting as the main portrait; expression: looking down the lorgnette. |
| P2 | expression | `victorian/lavinia--pleased.webp` | Lady Lavinia Loosely-Laced: a thin smile | Same sitting as the main portrait; expression: a thin smile. |
| P2 | expression | `victorian/lavinia--caught.webp` | Lady Lavinia Loosely-Laced: outraged | Same sitting as the main portrait; expression: outraged. |
| P2 | expression | `victorian/lavinia--scheme.webp` | Lady Lavinia Loosely-Laced: scheming behind a fan | Same sitting as the main portrait; expression: scheming behind a fan. |
| P2 | character | `victorian/polly.webp` | Polly Perkins-Upp [STAND-IN] | sweet; A violet seller's shawl slipping off one shoulder, a basket of slightly wilted posies, darned mittens. Resting expression. |
| P2 | character | `victorian/agatha.webp` | Agatha Primm-Rose [STAND-IN] | prim; Black mourning dress buttoned to the jaw, a veil, a hymn book with a racing paper tucked inside. Resting expression. |
| P2 | character | `victorian/bess.webp` | Bess Bunbury [STAND-IN] | saucy; A frilled music-hall skirt, red stockings with a ladder she calls "ventilation", a feather boa past its best. Resting expression. |
| P2 | character | `victorian/lottie.webp` | Lottie Ledger [STAND-IN] | scheming; Ink-stained cuffs, a pencil in her hair, a bodice with a hidden purse, a pawnbroker's ticket for a tiara. Resting expression. |
| P1 | gentleman | `victorian/gent-plunkett.webp` | Lord Percival Plunkett-Bottomsworth, MP | flustered, scrubbed. Tells: Has put little skirts on the piano legs. Flinches pleasantly whenever a door slams. (Do not depict his secret kink.) |
| P1 | gentleman | `victorian/gent-alfie.webp` | Alfie Barrow, Pearly King of Cheapside | jolly, fair. Tells: Six thousand pearl buttons and not one done up properly. Keeps patting his barrow and sighing. (Do not depict his secret kink.) |
| P1 | gentleman | `victorian/gent-nobby.webp` | Nobby Nickit, fence and cracksman | shifty, ripe. Tells: Counts the spoons when he comes in and when he leaves. Goes misty-eyed at a police whistle. (Do not depict his secret kink.) |
| P1 | tourist | `victorian/tourist-tex.webp` | Tex Tumbleweed, a lost cowboy | A The Wild West visitor lost in Victorian London, painted in the Victorian London style. Ma'am, which way's Texas? And what's a 'crumpet'? |
| P1 | place | `victorian/place-salon.webp` | Mrs Featherstonehaugh's Salon | posh. Gaslight, aspidistras and a piano player who never saw a thing. |
| P1 | place | `victorian/place-tuppenny.webp` | The Tuppenny Palace of Varieties | rowdy. Sawdust, a chairman with a gavel, and a four-piece band. |
| P1 | place | `victorian/place-drowned-rat.webp` | The Drowned Rat, Wapping | gutter. Low beams, a river smell, a landlord who answers to "Oi". |
| P1 | item | `victorian/item-cane.webp` | The Headmistress's Cane | Comic object, still life. Never used. Merely brandished. That's rather the point. |
| P1 | item | `victorian/item-bonnet.webp` | The Pearly Queen's Bonnet | Comic object, still life. Two thousand mother-of-pearl buttons and an ostrich feather. Weighs more than the lady wearing it. |
| P1 | item | `victorian/item-helmet.webp` | Bobby's Helmet (Borrowed) | Comic object, still life. 'Evening all.' The constable is still looking for it. He's looked everywhere but up. |
| P1 | item | `victorian/item-wand.webp` | Dr Quackenbush's Electro-Galvanic Vibratory Wand | Comic object, still life. For nerves, vapours and the Thursday-afternoon slump. Plugs into the wall. The wall is unimpressed. |
| P1 | affliction | `victorian/affliction-lodgers.webp` | The Covent Garden Lodgers | Comic curse card, no bodies shown below the waist. A tiny top hat bobs across the sheet. Then another. Then a whole family. |
| P1 | affliction | `victorian/affliction-wobbles.webp` | The Cheapside Wobbles | Comic curse card, no bodies shown below the waist. Her knees knock out the first bars of "Knees Up Mother Brown". |
| P2 | postcard (gag) | `victorian/postcard-wellington.webp` | The Duke of Wellington's Wheelbarrow | Implied only, off-screen: A squeaky wheel behind the curtain; a brass band strikes up; a portrait of the Duke turns to face the wall. |
| P2 | postcard (gag) | `victorian/postcard-encore.webp` | Encore! Encore! | Implied only, off-screen: The curtain falls; the crowd shouts for more; a bed leg gives way. |
| P2 | postcard (gag) | `victorian/postcard-stern-word.webp` | Detention, Mayfair | Implied only, off-screen: A door slams; a gentleman says "Oh!" in three keys; a ruler snaps. |
| P2 | postcard (gag) | `victorian/postcard-fair-cop.webp` | It's a Fair Cop | Implied only, off-screen: A police whistle; running boots; a helmet rolls out from under the door. |
| P2 | postcard | `victorian/postcard-bathing.webp` | Bathing Machine, Margate | "Wish you were here. Wish I had my other bloomers." |
| P2 | postcard | `victorian/postcard-piano.webp` | The Piano Legs | "Lord P. has dressed the furniture again." |
| P2 | postcard | `victorian/postcard-gaslight.webp` | By Gaslight | "Having a lovely time. Lost my gloves, my hat and my reputation." |
| P2 | card | `victorian/card-anonymous-verse.webp` | Anonymous Verse | Printed in the Gazette under 'A Lady'. Read aloud in three clubs and the Admiralty. |
| P2 | card | `victorian/card-blush-curtsey.webp` | A Blush and a Curtsey | She went pink to the ears. He went pink to the wallet. |
| P2 | card | `victorian/card-strict-governess.webp` | Strict Governess | You've been a very naughty Chancellor of the Exchequer. |
| P2 | card | `victorian/card-limerick.webp` | A Limerick from Nantucket | There once was a man from... no, we'd best not. |
| P2 | card | `victorian/card-pick-his-pocket.webp` | Pick His Pocket | He came with a purse. He left lighter in every sense. |
| P2 | card | `victorian/card-wheelbarrow.webp` | The Wheelbarrow | Requires one wheelbarrow, two consenting adults and a gardener sworn to secrecy. |
| P2 | card | `victorian/card-charity-bazaar.webp` | The Charity Bazaar | She ran the kissing booth for the orphans. The orphans did very well. |
| P2 | skin texture | `victorian/skin-bg.webp` | Victorian London bg | Craquelure varnish, flocked damask wallpaper, gilt frame bevels, candle-smoke vignette, foxed paper. |
| P2 | skin texture | `victorian/skin-frame.webp` | Victorian London frame | Craquelure varnish, flocked damask wallpaper, gilt frame bevels, candle-smoke vignette, foxed paper. |
| P2 | skin texture | `victorian/skin-curtain.webp` | Victorian London curtain | Red velvet with gold fringe. |
| P2 | skin texture | `victorian/skin-card.webp` | Victorian London card | Craquelure varnish, flocked damask wallpaper, gilt frame bevels, candle-smoke vignette, foxed paper. |

## Wild West (`wildwest/`)

Skin: Painterly realism in the spirit of Red Dead Redemption 2 key art and Frederic Remington; sepia dusk; woodtype. Illustration: Painterly realism: long low dusk light, strong rim light, atmospheric haze, loose confident brushwork, wide skies. Palette: gunmetal #2E3238 · saddle #5A3A22 · sepia #7A5C3E · sunsetRed #C8553D · duskAmber #E9A25B · dust #D9C3A0 · bone #F2E6CF · sage #8A9A6B · shadowViolet #4B3B5C.

| Pri | Kind | File | Subject | Brief |
|---|---|---|---|---|
| P1 | character | `wildwest/fanny.webp` | Fanny Faro | deadpan; A frayed velvet bodice, sleeve garters, a green eyeshade, a derringer and a spare ace in the garter, one bare shoulder she hasn't noticed. Resting expression. |
| P2 | expression | `wildwest/fanny--poker.webp` | Fanny Faro: poker face | Same sitting as the main portrait; expression: poker face. |
| P2 | expression | `wildwest/fanny--pleased.webp` | Fanny Faro: poker face (pleased) | Same sitting as the main portrait; expression: poker face (pleased). |
| P2 | expression | `wildwest/fanny--caught.webp` | Fanny Faro: poker face (caught) | Same sitting as the main portrait; expression: poker face (caught). |
| P2 | expression | `wildwest/fanny--eyebrow.webp` | Fanny Faro: one raised eyebrow | Same sitting as the main portrait; expression: one raised eyebrow. |
| P1 | character | `wildwest/clementine.webp` | Clockwork Clementine [AUTOMATON] | prim; A player-piano saloon girl; porcelain face, buttoned to the chin, a brass key in her back. Ticks when shocked. Resting expression. |
| P2 | expression | `wildwest/clementine--prim.webp` | Clockwork Clementine: prim | Same sitting as the main portrait; expression: prim. |
| P2 | expression | `wildwest/clementine--pleased.webp` | Clockwork Clementine: a click of approval | Same sitting as the main portrait; expression: a click of approval. |
| P2 | expression | `wildwest/clementine--shocked.webp` | Clockwork Clementine: ticking furiously | Same sitting as the main portrait; expression: ticking furiously. |
| P2 | expression | `wildwest/clementine--wink.webp` | Clockwork Clementine: a porcelain wink (malfunction?) | Same sitting as the main portrait; expression: a porcelain wink (malfunction?). |
| P2 | character | `wildwest/rose.webp` | Prairie Rose Hipps [STAND-IN] | sweet; A gingham dress let out at the seams, a sunbonnet, a ribbon garter she made from a flour sack. Resting expression. |
| P2 | character | `wildwest/prudence.webp` | Prudence Pike [STAND-IN] | prim; A high collar, wire spectacles, a ruler, a bustle that has seen two winters. Resting expression. |
| P2 | character | `wildwest/dusty.webp` | Dusty Drawers [STAND-IN] | bored; A patched petticoat, cowboy boots two sizes wrong, a hat with a bullet hole she calls "air conditioning". Resting expression. |
| P2 | character | `wildwest/widow.webp` | The Widow Pettigrew [STAND-IN] | haughty; Black lace, a parasol, a locket with three portraits and room for a fourth. Resting expression. |
| P1 | gentleman | `wildwest/gent-vanderbucks.webp` | Cornelius Vanderbucks, railroad baron | pompous, scrubbed. Tells: Talks about his track. Its length. Its gauge. Has never been told no. Secretly dying to hear it. (Do not depict his secret kink.) |
| P1 | gentleman | `wildwest/gent-hank.webp` | Hank "Six-Shooter" McGraw | swaggering, fair. Tells: Hasn't bathed since the Gold Rush. Possibly the one before. His spurs jingle in an oddly hopeful way. (Do not depict his secret kink.) |
| P1 | gentleman | `wildwest/gent-rusty.webp` | "Rattlesnake" Rusty Colt, horse thief | shifty, ripe. Tells: Used to being tied up. Mostly by the sheriff. Wears his bandana even to eat soup. (Do not depict his secret kink.) |
| P1 | tourist | `wildwest/tourist-darren.webp` | Darren, on a Wild West coach tour | A Modern Las Vegas visitor lost in The Wild West, painted in the The Wild West style. Is this the re-enactment? Only the brochure said there'd be a buffet. (Round 4: recast from the stag do, which is Gaz's; the existing painting, a sunburnt British tourist in an inflatable cowboy hat with a pint, still fits.) |
| P1 | place | `wildwest/place-velvet-spur.webp` | The Velvet Spur Parlour House | posh. Piano, linen, a madam with a ledger and a shotgun. |
| P1 | place | `wildwest/place-last-chance.webp` | The Last Chance Saloon | rowdy. Swinging doors, a piano player who has learned to duck. |
| P1 | place | `wildwest/place-hog-ranch.webp` | Hog Ranch Row | gutter. The cribs by the fort. Mud, lanterns and a goat with opinions. |
| P1 | item | `wildwest/item-spike.webp` | The Golden Spike (Souvenir) | Comic object, still life. Marks the day two great lines finally met. It took a lot of hammering. |
| P1 | item | `wildwest/item-spurs.webp` | Jingling Spurs | Comic object, still life. Silver spurs, polished bright. The whole street will hear you coming. |
| P1 | item | `wildwest/item-lasso.webp` | Lasso of the Lonesome Prairie | Comic object, still life. Thirty feet of rope and a whole lot of ambition. |
| P1 | item | `wildwest/item-lambskin.webp` | Lambskin Sheath, with Ribbon | Comic object, still life. 'Reusable,' says the mail-order catalogue. The catalogue is a liar. |
| P1 | affliction | `wildwest/affliction-drip.webp` | The Gold-Rush Drip | Comic curse card, no bodies shown below the waist. A prospector pans the washbasin. Shakes his head. Moves on. |
| P1 | affliction | `wildwest/affliction-saddle-sores.webp` | Saddle Sores | Comic curse card, no bodies shown below the waist. She drinks her whiskey standing up this week. |
| P2 | postcard (gag) | `wildwest/postcard-golden-spike.webp` | The Golden Spike Ceremony | Implied only, off-screen: Bunting, a ribbon cut, a steam whistle, a locomotive enters a tunnel; a dowager in the front row covers her eyes. |
| P2 | postcard (gag) | `wildwest/postcard-prairie.webp` | The Prairie Schooner, Fully Laden | Implied only, off-screen: Saloon doors swing; a lasso flies out; a distant "yee-haw"; a long creak of timber. |
| P2 | postcard (gag) | `wildwest/postcard-jingle.webp` | Jingle All the Way | Implied only, off-screen: A rhythmic jingling through the wall; the piano player keeps time; a cuckoo clock gives up. |
| P2 | postcard | `wildwest/postcard-wanted.webp` | Wanted: For Being Too Handsome | "Reward: one kiss. Paid in instalments." |
| P2 | postcard | `wildwest/postcard-bathhouse.webp` | Saturday at the Bathhouse | "Hank went in. Hank came out. The water did not." |
| P2 | postcard | `wildwest/postcard-sunset.webp` | Riding Off Into the Sunset | "He forgot his trousers. I kept them as a souvenir." |
| P2 | card | `wildwest/card-ace-up-garter.webp` | Ace Up the Garter | Where else would a lady keep it? |
| P2 | card | `wildwest/card-poker-face.webp` | Poker Face | She's thinking about you. Or tax. You'll never know. |
| P2 | card | `wildwest/card-ambitious-corset.webp` | Corset of Uncommon Ambition | Laced by two maids and a mule. |
| P2 | card | `wildwest/card-drinks-on-house.webp` | Drinks on the House | The whole saloon cheers. The whole saloon is now your problem. |
| P2 | card | `wildwest/card-bucking-bronco.webp` | The Bucking Bronco | Eight seconds is the record. She's going for nine. |
| P2 | card | `wildwest/card-masked-stranger.webp` | The Masked Stranger | Who was that masked woman? He'd like to know. He'd pay to know. |
| P2 | card | `wildwest/card-temperance-pledge.webp` | The Temperance Pledge | She signed the pledge in front of the whole Temperance League, then bought them a round to celebrate. |
| P2 | skin texture | `wildwest/skin-bg.webp` | The Wild West bg | Canvas weave, sun-bleached planks, wanted-poster paper, woodtype ink bleed, dust motes in low sun. |
| P2 | skin texture | `wildwest/skin-frame.webp` | The Wild West frame | Canvas weave, sun-bleached planks, wanted-poster paper, woodtype ink bleed, dust motes in low sun. |
| P2 | skin texture | `wildwest/skin-curtain.webp` | The Wild West curtain | A canvas wagon cover drawn shut. |
| P2 | skin texture | `wildwest/skin-card.webp` | The Wild West card | Canvas weave, sun-bleached planks, wanted-poster paper, woodtype ink bleed, dust motes in low sun. |

## Modern Las Vegas (`vegas/`)

Skin: Neon synthwave and contemporary cyberpunk-glam: magenta and cyan neon, chrome, glossy airbrush, casino glitz. Illustration: 1980s airbrush pin-up gloss meets synthwave key art: hard magenta and cyan rim light, chrome reflections, glossy highlights, grid horizons. Palette: night #0B0620 · plum #2A0E3D · magenta #FF2E9A · cyan #19E6FF · violet #8A3FFC · chrome #CBD5E1 · goldChrome #FFD25E · hotWhite #FFF5FB.

| Pri | Kind | File | Subject | Brief |
|---|---|---|---|---|
| P1 | character | `vegas/jackie.webp` | Jackie Potts | bored; Last night's sequinned minidress, a hotel robe over it, sunglasses at 4 a.m., gum, a phone at 3%. Resting expression. |
| P2 | expression | `vegas/jackie--yawn.webp` | Jackie Potts: yawn | Same sitting as the main portrait; expression: yawn. |
| P2 | expression | `vegas/jackie--bubble.webp` | Jackie Potts: a slow bubble of gum | Same sitting as the main portrait; expression: a slow bubble of gum. |
| P2 | expression | `vegas/jackie--eyeroll.webp` | Jackie Potts: eye-roll | Same sitting as the main portrait; expression: eye-roll. |
| P2 | expression | `vegas/jackie--surprise.webp` | Jackie Potts: genuine surprise (once a season) | Same sitting as the main portrait; expression: genuine surprise (once a season). |
| P1 | character | `vegas/bettie.webp` | Brass Bettie [AUTOMATON] | saucy; Feathers, rhinestones, chrome hinges at the elbows, a coin slot she's very coy about. Resting expression. |
| P2 | expression | `vegas/bettie--showtime.webp` | Brass Bettie: showtime smile | Same sitting as the main portrait; expression: showtime smile. |
| P2 | expression | `vegas/bettie--pleased.webp` | Brass Bettie: jackpot lights | Same sitting as the main portrait; expression: jackpot lights. |
| P2 | expression | `vegas/bettie--caught.webp` | Brass Bettie: tilt! | Same sitting as the main portrait; expression: tilt!. |
| P2 | expression | `vegas/bettie--wink.webp` | Brass Bettie: a hydraulic wink | Same sitting as the main portrait; expression: a hydraulic wink. |
| P2 | character | `vegas/krystal.webp` | Krystal Chandelier [STAND-IN] | haughty; A rhinestone gown with a hemline repaired by stapler, false lashes like awnings, a borrowed fur. Resting expression. |
| P2 | character | `vegas/ivy.webp` | Ivy League [STAND-IN] | scheming; Reading glasses, a cocktail dress with a highlighter in the cleavage, a contract-law textbook. Resting expression. |
| P2 | character | `vegas/candy.webp` | Candy Floss [STAND-IN] | sweet; A pink sarong, a pool float worn as a cape, glitter she can't explain. Resting expression. |
| P2 | character | `vegas/dee.webp` | Dee Scretion [STAND-IN] | deadpan; Oversized sunglasses, a trench coat over sequins, a burner phone, a face like a locked safe. Resting expression. |
| P1 | gentleman | `vegas/gent-brayden.webp` | Brayden Bullion III, crypto whale | smug, scrubbed. Tells: Asks what things cost, then pays double. Calls his accountant 'Mommy'. (Do not depict his secret kink.) |
| P1 | gentleman | `vegas/gent-gaz.webp` | Gaz Pickering, stag do, from Leeds | merry, fair. Tells: Four days in a novelty Elvis quiff and a stag-do sash. He's not even the stag. Sings 'Suspicious Minds' to the slot machines. (Do not depict his secret kink.) |
| P1 | gentleman | `vegas/gent-slots.webp` | "Slots" McGee, banned from fourteen casinos | twitchy, ripe. Tells: Counts everything. Including you. Visor on. Indoors. At night. (Do not depict his secret kink.) |
| P1 | tourist | `vegas/tourist-pooter.webp` | Mr Charles Pooter, bank clerk of Holloway | A Victorian London visitor lost in Modern Las Vegas, painted in the Modern Las Vegas style. I have never seen an ankle. I now appear to have seen all of them. |
| P1 | place | `vegas/place-penthouse.webp` | The Velvet Rope Penthouse | posh. Infinity pool, a butler, an NDA on the pillow. |
| P1 | place | `vegas/place-flamingo.webp` | The Neon Flamingo Day Club | rowdy. Inflatable flamingos, a DJ, a lifeguard who has given up. |
| P1 | place | `vegas/place-motel.webp` | Motel Paradiso, Off-Strip | gutter. A flickering sign, an ice machine of legend, a manager who has seen it all and billed for it. |
| P1 | item | `vegas/item-shredder.webp` | Gold Card Shredder | Comic object, still life. He hands you his black card. You feed it in. He weeps with joy. |
| P1 | item | `vegas/item-jumpsuit.webp` | Rhinestone Elvis Jumpsuit | Comic object, still life. Flared, sequinned, slightly damp. Comes with sideburns. |
| P1 | item | `vegas/item-dice.webp` | Loaded Dice | Comic object, still life. Seven, every time. More reliable than any man on the Strip. |
| P1 | item | `vegas/item-egg.webp` | The Bluetooth Pleasure Egg | Comic object, still life. App-controlled. The app has 1.2 stars and a privacy policy longer than the Bible. |
| P1 | item | `vegas/item-stopper.webp` | Rhinestone Stopper (for Decorative Purposes) | Comic object, still life. A stopper with a rhinestone heart on the end. 'It's decorative,' says the stall guy, for the third time this hour. |
| P1 | affliction | `vegas/affliction-glitter-itch.webp` | The Glitter Itch | Comic curse card, no bodies shown below the waist. She sparkles where nobody should sparkle. A disco ball applauds. |
| P1 | affliction | `vegas/affliction-what-happens.webp` | What Happens in Vegas | Comic curse card, no bodies shown below the waist. A billboard lights up with her name. The billboard is very large. |
| P2 | postcard (gag) | `vegas/postcard-thank-you.webp` | Thank You, Thank You Very Much | Implied only, off-screen: A white cape flies over the curtain; a stick-on sideburn hits the lampshade; a voice: "Elvis has left the building". |
| P2 | postcard (gag) | `vegas/postcard-hit-me.webp` | Hit Me | Implied only, off-screen: A hand taps green felt; a card flips; jackpot bells; coins roll out under the door. |
| P2 | postcard (gag) | `vegas/postcard-margin-call.webp` | Margin Call | Implied only, off-screen: A shredder whirs; a gold card goes in; a grown man sobs with joy; the butler pours a brandy. |
| P2 | postcard | `vegas/postcard-chapel.webp` | Greetings from the Chapel | "Married at 2, annulled at 3, brunch at 4." |
| P2 | postcard | `vegas/postcard-flamingo.webp` | Flamingo Down | "The flamingo didn't make it. Neither did my eyebrows." |
| P2 | postcard | `vegas/postcard-sign.webp` | Welcome to Fabulous | "Lost: dignity. Found: a hundred bucks and a wedding ring." |
| P2 | card | `vegas/card-been-there.webp` | Been There, Done That | Seen it. Rated it. Two stars. |
| P2 | card | `vegas/card-reverse-cowgirl.webp` | Riding Backwards, Yawning | She checks her phone. He doesn't notice. Everyone's happy. |
| P2 | card | `vegas/card-bottle-service.webp` | Bottle Service | A sparkler in the bottle, a sparkle in her eye, $900 on his card. |
| P2 | card | `vegas/card-sign-the-nda.webp` | Sign the NDA | What happens in the suite is legally binding. |
| P2 | card | `vegas/card-body-glitter.webp` | Body Glitter, Everywhere | He'll be finding it at board meetings. His dry-cleaner will be finding it for years. |
| P2 | card | `vegas/card-chapel-quickie.webp` | The Chapel Quickie | Vows at 10:02. Annulment booked for 10:15. Elvis gave her away. |
| P2 | skin texture | `vegas/skin-bg.webp` | Modern Las Vegas bg | Neon-tube bloom, brushed chrome bevels, glossy airbrush gradients, sequin glints, loud casino carpet. |
| P2 | skin texture | `vegas/skin-frame.webp` | Modern Las Vegas frame | Neon-tube bloom, brushed chrome bevels, glossy airbrush gradients, sequin glints, loud casino carpet. |
| P2 | skin texture | `vegas/skin-curtain.webp` | Modern Las Vegas curtain | A sequinned stage curtain with chasing bulbs. |
| P2 | skin texture | `vegas/skin-card.webp` | Modern Las Vegas card | Neon-tube bloom, brushed chrome bevels, glossy airbrush gradients, sequin glints, loud casino carpet. |

**Totals:** 133 files (46 P1, 87 P2).

Plain file list (one per line, for scripts):

```
P1 victorian/dolly.webp
P2 victorian/dolly--blush.webp
P2 victorian/dolly--pleased.webp
P2 victorian/dolly--caught.webp
P2 victorian/dolly--wink.webp
P1 victorian/lavinia.webp
P2 victorian/lavinia--disdain.webp
P2 victorian/lavinia--pleased.webp
P2 victorian/lavinia--caught.webp
P2 victorian/lavinia--scheme.webp
P2 victorian/polly.webp
P2 victorian/agatha.webp
P2 victorian/bess.webp
P2 victorian/lottie.webp
P1 victorian/gent-plunkett.webp
P1 victorian/gent-alfie.webp
P1 victorian/gent-nobby.webp
P1 victorian/tourist-tex.webp
P1 victorian/place-salon.webp
P1 victorian/place-tuppenny.webp
P1 victorian/place-drowned-rat.webp
P1 victorian/item-cane.webp
P1 victorian/item-bonnet.webp
P1 victorian/item-helmet.webp
P1 victorian/item-wand.webp
P1 victorian/affliction-lodgers.webp
P1 victorian/affliction-wobbles.webp
P2 victorian/postcard-wellington.webp
P2 victorian/postcard-encore.webp
P2 victorian/postcard-stern-word.webp
P2 victorian/postcard-fair-cop.webp
P2 victorian/postcard-bathing.webp
P2 victorian/postcard-piano.webp
P2 victorian/postcard-gaslight.webp
P2 victorian/card-anonymous-verse.webp
P2 victorian/card-blush-curtsey.webp
P2 victorian/card-strict-governess.webp
P2 victorian/card-limerick.webp
P2 victorian/card-pick-his-pocket.webp
P2 victorian/card-wheelbarrow.webp
P2 victorian/card-charity-bazaar.webp
P2 victorian/skin-bg.webp
P2 victorian/skin-frame.webp
P2 victorian/skin-curtain.webp
P2 victorian/skin-card.webp
P1 wildwest/fanny.webp
P2 wildwest/fanny--poker.webp
P2 wildwest/fanny--pleased.webp
P2 wildwest/fanny--caught.webp
P2 wildwest/fanny--eyebrow.webp
P1 wildwest/clementine.webp
P2 wildwest/clementine--prim.webp
P2 wildwest/clementine--pleased.webp
P2 wildwest/clementine--shocked.webp
P2 wildwest/clementine--wink.webp
P2 wildwest/rose.webp
P2 wildwest/prudence.webp
P2 wildwest/dusty.webp
P2 wildwest/widow.webp
P1 wildwest/gent-vanderbucks.webp
P1 wildwest/gent-hank.webp
P1 wildwest/gent-rusty.webp
P1 wildwest/tourist-darren.webp
P1 wildwest/place-velvet-spur.webp
P1 wildwest/place-last-chance.webp
P1 wildwest/place-hog-ranch.webp
P1 wildwest/item-spike.webp
P1 wildwest/item-spurs.webp
P1 wildwest/item-lasso.webp
P1 wildwest/item-lambskin.webp
P1 wildwest/affliction-drip.webp
P1 wildwest/affliction-saddle-sores.webp
P2 wildwest/postcard-golden-spike.webp
P2 wildwest/postcard-prairie.webp
P2 wildwest/postcard-jingle.webp
P2 wildwest/postcard-wanted.webp
P2 wildwest/postcard-bathhouse.webp
P2 wildwest/postcard-sunset.webp
P2 wildwest/card-ace-up-garter.webp
P2 wildwest/card-poker-face.webp
P2 wildwest/card-ambitious-corset.webp
P2 wildwest/card-drinks-on-house.webp
P2 wildwest/card-bucking-bronco.webp
P2 wildwest/card-masked-stranger.webp
P2 wildwest/card-temperance-pledge.webp
P2 wildwest/skin-bg.webp
P2 wildwest/skin-frame.webp
P2 wildwest/skin-curtain.webp
P2 wildwest/skin-card.webp
P1 vegas/jackie.webp
P2 vegas/jackie--yawn.webp
P2 vegas/jackie--bubble.webp
P2 vegas/jackie--eyeroll.webp
P2 vegas/jackie--surprise.webp
P1 vegas/bettie.webp
P2 vegas/bettie--showtime.webp
P2 vegas/bettie--pleased.webp
P2 vegas/bettie--caught.webp
P2 vegas/bettie--wink.webp
P2 vegas/krystal.webp
P2 vegas/ivy.webp
P2 vegas/candy.webp
P2 vegas/dee.webp
P1 vegas/gent-brayden.webp
P1 vegas/gent-gaz.webp
P1 vegas/gent-slots.webp
P1 vegas/tourist-pooter.webp
P1 vegas/place-penthouse.webp
P1 vegas/place-flamingo.webp
P1 vegas/place-motel.webp
P1 vegas/item-shredder.webp
P1 vegas/item-jumpsuit.webp
P1 vegas/item-dice.webp
P1 vegas/item-egg.webp
P1 vegas/item-stopper.webp
P1 vegas/affliction-glitter-itch.webp
P1 vegas/affliction-what-happens.webp
P2 vegas/postcard-thank-you.webp
P2 vegas/postcard-hit-me.webp
P2 vegas/postcard-margin-call.webp
P2 vegas/postcard-chapel.webp
P2 vegas/postcard-flamingo.webp
P2 vegas/postcard-sign.webp
P2 vegas/card-been-there.webp
P2 vegas/card-reverse-cowgirl.webp
P2 vegas/card-bottle-service.webp
P2 vegas/card-sign-the-nda.webp
P2 vegas/card-body-glitter.webp
P2 vegas/card-chapel-quickie.webp
P2 vegas/skin-bg.webp
P2 vegas/skin-frame.webp
P2 vegas/skin-curtain.webp
P2 vegas/skin-card.webp
```

## Shared starter cards, per era (`CARDS[id].artByTimeline`)

Added 2026-10-07 (A-theatre review round 2, findings 19/26). Every whore's deck holds these six cards; each era paints them as a comic still life with no people, in that era's skin. `getView` resolves the art for the viewing whore's Timeline.

| Pri | Kind | File | Subject | Brief |
|---|---|---|---|---|
| P2 | card | `victorian/card-come-hither.webp` | Come-Hither Look (shared starter) | Comic still life, no people, no lettering, in the Victorian London skin. |
| P2 | card | `victorian/card-saucy-quip.webp` | Saucy Quip (shared starter) | Comic still life, no people, no lettering, in the Victorian London skin. |
| P2 | card | `victorian/card-teeth-extra.webp` | Teeth Extra (shared starter) | Comic still life, no people, no lettering, in the Victorian London skin. |
| P2 | card | `victorian/card-peek-a-boo-fan.webp` | Peek-a-Boo Fan (shared starter) | Comic still life, no people, no lettering, in the Victorian London skin. |
| P2 | card | `victorian/card-saucy-wink.webp` | A Saucy Wink (shared starter) | Comic still life, no people, no lettering, in the Victorian London skin. |
| P2 | card | `victorian/card-mothers-advice.webp` | Mother's Advice (shared starter) | Comic still life, no people, no lettering, in the Victorian London skin. |
| P2 | card | `wildwest/card-come-hither.webp` | Come-Hither Look (shared starter) | Comic still life, no people, no lettering, in the The Wild West skin. |
| P2 | card | `wildwest/card-saucy-quip.webp` | Saucy Quip (shared starter) | Comic still life, no people, no lettering, in the The Wild West skin. |
| P2 | card | `wildwest/card-teeth-extra.webp` | Teeth Extra (shared starter) | Comic still life, no people, no lettering, in the The Wild West skin. |
| P2 | card | `wildwest/card-peek-a-boo-fan.webp` | Peek-a-Boo Fan (shared starter) | Comic still life, no people, no lettering, in the The Wild West skin. |
| P2 | card | `wildwest/card-saucy-wink.webp` | A Saucy Wink (shared starter) | Comic still life, no people, no lettering, in the The Wild West skin. |
| P2 | card | `wildwest/card-mothers-advice.webp` | Mother's Advice (shared starter) | Comic still life, no people, no lettering, in the The Wild West skin. |
| P2 | card | `vegas/card-come-hither.webp` | Come-Hither Look (shared starter) | Comic still life, no people, no lettering, in the Modern Las Vegas skin. |
| P2 | card | `vegas/card-saucy-quip.webp` | Saucy Quip (shared starter) | Comic still life, no people, no lettering, in the Modern Las Vegas skin. |
| P2 | card | `vegas/card-teeth-extra.webp` | Teeth Extra (shared starter) | Comic still life, no people, no lettering, in the Modern Las Vegas skin. |
| P2 | card | `vegas/card-peek-a-boo-fan.webp` | Peek-a-Boo Fan (shared starter) | Comic still life, no people, no lettering, in the Modern Las Vegas skin. |
| P2 | card | `vegas/card-saucy-wink.webp` | A Saucy Wink (shared starter) | Comic still life, no people, no lettering, in the Modern Las Vegas skin. |
| P2 | card | `vegas/card-mothers-advice.webp` | Mother's Advice (shared starter) | Comic still life, no people, no lettering, in the Modern Las Vegas skin. |
