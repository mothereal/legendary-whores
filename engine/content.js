// Legendary Whores · slice content as data (v2 prototype)
// Source of truth for numbers: ../docs/rules-core.md. Balance knobs live in RULES below.
// Heat level: saucy postcard. Implied, never shown. All characters are adults.
// Art paths: ../art-assets/<era>/<file>.webp (eras: victorian, wildwest, vegas). See ASSETS.md.
// Plain data only: no functions, whole numbers only.

const art = (era, file) => `../art-assets/${era}/${file}.webp`;

// ---------------------------------------------------------------------------
// Arts, Types, Freshness, Place kinds
// ---------------------------------------------------------------------------
export const ARTS = {
  silk:   { id: 'silk',   name: 'Silk',   icon: '🎀', blurb: 'Looks and outfits.' },
  wit:    { id: 'wit',    name: 'Wit',    icon: '🪶', blurb: 'Banter, rhymes and songs.' },
  gold:   { id: 'gold',   name: 'Gold',   icon: '🪙', blurb: 'Money talk.' },
  mask:   { id: 'mask',   name: 'Mask',   icon: '🎭', blurb: 'Discretion and role-play.' },
  frolic: { id: 'frolic', name: 'Frolic', icon: '🔥', blurb: 'Bawdy romps. Strong, but they give you the Itch.' },
};
export const ART_IDS = ['silk', 'wit', 'gold', 'mask', 'frolic'];

export const TYPES = {
  siren:        { id: 'siren',        name: 'Siren',        art: 'silk',   blurb: 'Never seen in the same frock twice. Rarely seen in one for long.' },
  bluestocking: { id: 'bluestocking', name: 'Bluestocking', art: 'wit',    blurb: 'Seduces in iambic pentameter.' },
  hustler:      { id: 'hustler',      name: 'Hustler',      art: 'gold',   blurb: 'Can tell a man\'s income from the way he holds his glass.' },
  enigma:       { id: 'enigma',       name: 'Enigma',       art: 'mask',   blurb: 'Answers to four names and signs for none of them.' },
  minx:         { id: 'minx',         name: 'Minx',         art: 'frolic', blurb: 'Has never once used the front door.' },
};

export const FRESHNESS = {
  scrubbed: { id: 'scrubbed', name: 'Scrubbed', blurb: 'Clean as a whistle. No Itch from Frolic.' },
  fair:     { id: 'fair',     name: 'Fair',     blurb: 'So-so. +1 Itch per Frolic card.' },
  ripe:     { id: 'ripe',     name: 'Ripe',     blurb: 'Hold your nose. +1 Itch per Frolic card, and +1 more.' },
};

export const PLACE_KINDS = {
  posh:   { id: 'posh',   name: 'Posh',   blurb: 'Fancy houses. Doors shut to the notorious.' },
  rowdy:  { id: 'rowdy',  name: 'Rowdy',  blurb: 'Always open, always loud.' },
  gutter: { id: 'gutter', name: 'Gutter', blurb: 'Always open. No questions asked, and every answer repeated.' },
};

// ---------------------------------------------------------------------------
// RULES: every balance number in one place (whole numbers only)
// ---------------------------------------------------------------------------
export const RULES = {
  version: 'proto-1',
  handSize: 5,
  maxCurtainCards: 3,
  assignLend: 3,
  assignMaxCards: 2,
  start: { coin: 3, standing: 2, notoriety: 0, itch: 0 },
  meterMax: 10,
  // round 7: her paper changes when the other meter leads by this much. 1 (the designer's call): whoever leads decides;
  // level keeps the paper she had
  paperLead: 1,
  itchMax: 3,
  card: { taste: 1, secret: 1, signature: 1, aversion: 2 },
  sway: {
    fancy: 2, kink: 3, regularCap: 2, grudge: 1, seenIt: 1,
    respectable: { at: 5, bonus: 1 }, notorious: { at: 5, bonus: 1 },
    // Grease Palms: +1 Sway per costPer Coin at a Rowdy or Gutter Place; max +2, +1 more at each maxUp Notoriety (round 4: the
    // Low Road's Coin needs somewhere to go, so the bribes grow with the reputation)
    // costByTier (round 5, finding 1): a bribe costs more Coin as she rises (the Coin climbs with her); costPer is the
    // Common price, kept for readers of the old field
    grease: { at: 3, costPer: 2, max: 2, maxUp: [5, 8], costByTier: { common: 2, rare: 3, epic: 4, legendary: 5, mythic: 5 } }, braveFace: 1,
  },
  itch: { scrubbed: 0, fair: 1, ripe: 1, ripeExtra: 1 },
  curtain: { maxGapMin: 180, minGapMin: 20, fullPayPerDay: 3, activeWindowMin: 1440 },
  dawnMin: 360,             // the District's day starts at 06:00 (sleepTillDawn, a prototype convenience)
  places: {
    posh:   { bar: 10, renown: [9, 4, 2], coin: [0, 0, 0], applause: 1, doorGift: 1, standingMin: 2 },
    rowdy:  { bar: 7,  renown: [6, 3, 1], coin: [1, 0, 0], applause: 1, doorGift: 1 },
    gutter: { bar: 6,  renown: [8, 3, 1], coin: [3, 2, 1], applause: 0, doorGift: 1 },
  },
  raidEvery: 3,             // every Nth Curtain the Gutter Place is raided
  raidRenownDivisor: 2,     // Renown shares halved (rounded down)
  // Squaring the Peelers (a lever, OFF): { at: 5, cost: 4 } lets a Notorious whore pay Coin on Raid Night to keep her full
  // Gutter Renown. Measured in round 4 (sim --quick --bribe=4): it pulls the Notoriety planner back into the Gutter on Raid
  // Nights, so T4 fails (Wild West 47%, Vegas 44%) and T3 fails (Vegas 46%), and she still ends with 77-87% of her Coin
  // unspent. Off until the designer picks a Coin sink; the engine and the UI support it when it is set.
  raidBribe: null,
  wheelbarrowFirstBonus: 2,
  ripeFrolicCoin: 1,        // back-alley (Ripe) Assignations pay +1 Coin per Frolic card Worked (success only): the Itch bet has a payoff
  // the Gambler's stake grows with her tier (round 5, finding 1): stake and payout are the Common terms; byTier the rest
  gambler: { stake: 2, payout: 5, byTier: { rare: { stake: 3, payout: 7 }, epic: { stake: 5, payout: 12 }, legendary: { stake: 8, payout: 19 }, mythic: { stake: 8, payout: 19 } } },
  assign: {
    bar: { scrubbed: 6, fair: 5, ripe: 4, tourist: 3 },
    delightMargin: 3,
    // by today's count (per whore): Satisfied Renown, Coin
    bands: [
      { upTo: 3, renown: 2, coin: 1, backAlleyCoin: 3, delightRenown: 1, delightGossip: 1 },
      { upTo: 6, renown: 1, coin: 1, backAlleyCoin: 1, delightRenown: 0, delightGossip: 1 },
      { upTo: 999, renown: 0, coin: 0, backAlleyCoin: 0, delightRenown: 0, delightGossip: 1, gossip: 1, gossipOnly: true }, // 7+: a Gossip, no Coin (B-arcade finding 4)
    ],
    renownCapPerDay: 9,
    tourist: { renown: 1, coin: 1, delightRenown: 1, delightGossip: 1, every: 4 },
    notorietyRefuseScrubbedAt: 8,
  },
  study: { freePerDay: 3, extraCost: 1 },
  rummage: {
    freshPerDay: 3,
    // fresh roll out of 6: coin(0-1) novelty(2-3) gossip(4) postcard(5)
    freshCoin: 2, staleCoin: 1,
    blackMarketAt: 2,
  },
  reticule: 3,
  backAlleyAt: 1,
  frontPageAt: 10,
  // ---- Round 5 (the designer's 7 Oct scores): Coin buys things you can see, and the High Road has rungs of its own ----
  // The Morning Special: at each Dawn one novelty from the Timeline's own stalls is on the counter (picked by a hash of the
  // seed, the Timeline and the day, so no RNG is drawn and every seeded game is unchanged). One per whore per day.
  special: { perDay: 1 },
  // The Ladder (DIGS): lodgings and finery bought with Coin, one ladder per Road; cosmetic (her portrait, her win picture,
  // her profile), so time and Coin never buy rank (T9). A rung is bought on the Road she is on (roadOf).
  digs: { rungs: 4 },
  // The High Road's own rungs, mirroring the Low Road's back alleys, black market and Front Page:
  //   invitationAt: Standing 3+ (and Standing >= Notoriety): Scrubbed gentlemen send invitations: the first one she Delights
  //     each day adds +invitationRenown Renown on top of the daily Assignation cap (measured: inside the cap a planner is
  //     already at it, so only the casual player gained and T1 fell to 1.29 in London; Coin as usual)
  //   patronAt: Standing 7+ (and Standing >= Notoriety): a Patron pays a stipend of patronCoin Coin at each new day
  //   societyPagesAt: Standing 10: The Society Pages, framed (a collectible, the Front Page's twin)
  highRoad: { invitationAt: 3, invitationRenown: 1, patronAt: 7, patronCoin: 2, societyPagesAt: 10 },
  // Renown milestones between Rare (30) and Epic (350): an era sub-title at each (ERA_MILESTONES), so the long middle has news
  milestones: [100, 200],
  tiers: { rare: 30, epic: 350 }, // 400 -> 350 (C-scandal review 2026-10-07: T2, a visible buff for the casual climb)
  seasonDays: 28,
  seats: {
    salon: { standing: 5 },
    gutter: { notoriety: 5 },
    crown: { meter: 7 },
    holderBonus: 1,
    defenceGraceCurtains: 2,
    failedWaitDays: 2,
  },
  whorescore: { common: 1, rare: 4, epic: 13, legendary: 40, mythic: 121, fullCount: 3 },
  unlock: { second: 'firstCurtainAndAssignation', third: 'anyRare', cap: 3 },
  digest: { min: 1, topUpTo: 3, max: 5, threshold: 25, decayPct: 85, selfPct: 150, nemesisPct: 130 },
};

// ---------------------------------------------------------------------------
// Charms, Talents, Vices
// ---------------------------------------------------------------------------
export const CHARMS = {
  'silver-tongue':     { id: 'silver-tongue', name: 'Silver Tongue', plain: 'Her clever talk charms any man.', text: 'Your first Wit card each encounter counts as matching his Taste, even if he doesn\'t list Wit.', flavour: 'Could talk a bishop out of his trousers.' },
  'underestimated':    { id: 'underestimated', name: 'Underestimated', plain: 'Nobody sees her coming.', text: '+2 Sway in a clash where you have the least Renown at your Place.', flavour: 'Always taken for the friend who came along. The friend goes home richest.' },
  'iron-constitution': { id: 'iron-constitution', name: 'Iron Constitution', plain: 'She hardly ever catches anything.', text: 'Protection 1: blocks 1 Itch per encounter.', flavour: 'Ate the oysters in August and went back for seconds.' },
  'dimples':           { id: 'dimples', name: 'Dimples', plain: 'Men who love finery melt for her.', text: '+1 Sway against anyone whose Tastes include Silk.', flavour: 'Two of them. Lethal at ten paces.' },
  'good-listener':     { id: 'good-listener', name: 'Good Listener', plain: 'She learns twice as much when she watches.', text: 'Each Study reveals 2 facts.', flavour: '"Do go on." And they always do.' },
  'old-flame':         { id: 'old-flame', name: 'Old Flame', plain: 'One gentleman still remembers her fondly.', text: 'Start each season as a Regular (1 visit) with one gentleman of your choice.', flavour: 'He still carries her glove. In a locked drawer.' },
  'knows-which-fork':  { id: 'knows-which-fork', name: 'Knows Which Fork', plain: 'She shines in posh places.', text: '+2 Sway at Posh Places.', flavour: 'Outside in, dear. Always outside in.' },
  'born-in-a-gin-shop':{ id: 'born-in-a-gin-shop', name: 'Born in a Gin Shop', plain: "She's at home in the gutter.", text: '+2 Sway at Gutter Places; Grease Palms costs 1 Coin per +1 instead of 2.', flavour: 'Christened in a tankard. Raised by the regulars.' },
};

export const TALENTS = {
  'double-entendre': { id: 'double-entendre', name: 'Double Entendre', plain: 'Her jokes work twice.', text: 'One Worked card gains an Art of your choice for this encounter.', flavour: 'She asked the parson to hold her muff while she found her purse. He held it through two hymns.' },
  'quick-change':    { id: 'quick-change', name: 'Quick Change', plain: 'She can swap a card at the last minute.', text: 'Swap one card in your Curtain hand for the top card of your deck.', flavour: 'In behind the screen as a schoolmistress, out as a lady detective. He confessed anyway.' },
  'smokescreen':     { id: 'smokescreen', name: 'Smokescreen', plain: 'She can romp without catching anything (people talk, though).', text: 'Your Frolic cards give no Itch this encounter; Notoriety +1.', flavour: 'You were seen leaving by the window.' },
  'read-the-room':   { id: 'read-the-room', name: 'Read the Room', plain: "She can learn a secret about tonight's host.", text: 'While planning, reveal one hidden fact about tonight\'s host.', flavour: 'One glance at his cufflinks: a second wife, a gambling debt and a weakness for nurses.' },
  'upstage':         { id: 'upstage', name: 'Upstage', plain: 'She steals the limelight from the rival just above her.', text: 'In a clash, the rival placed directly above you loses 2 Sway.', flavour: 'A well-timed sneeze during someone else\'s aria.' },
  'make-him-wait':   { id: 'make-him-wait', name: 'Make Him Wait', plain: 'She makes a man wait, so he pays more next time.', text: '-3 Sway now; your next encounter with the same gentleman gets +4 and counts as 2 Regular visits.', flavour: 'Absence makes the wallet grow fonder.' },
};

export const VICES = {
  'loose-lips':   { id: 'loose-lips', name: 'Loose Lips', plain: "She can't keep a secret.", upside: 'Every Delight gives +1 extra Gossip.', downside: 'Rivals can see which Place you chose last Curtain.', flavour: 'She only told one person. Then she told the newspaper.' },
  'gambler':      { id: 'gambler', name: 'Gambler', plain: 'She bets on herself.', upside: 'Once per Curtain, stake 2 Coin: place 1st and collect 5.', downside: 'Otherwise the stake is gone.', flavour: 'Would bet on which raindrop reaches the sill first. Usually wins.' },
  'bored-stiff':  { id: 'bored-stiff', name: 'Bored Stiff', plain: 'The same place twice bores her stiff.', upside: 'Seen It never applies to you (you don\'t remember them either).', downside: '-2 Sway at the Place you played last Curtain ("been there, yawned that").', flavour: 'Slept through a fight over her. Asked who won.' },
  'vanity':       { id: 'vanity', name: 'Vanity', plain: 'She must lead with her looks.', upside: '+1 Sway if your first Worked card is Silk.', downside: '-2 Sway if your first Worked card is neither Silk nor Wit.', flavour: 'Travels with a hand mirror, a pocket mirror and someone to hold the third.' },
  'mothers-ruin': { id: 'mothers-ruin', name: "Mother's Ruin", plain: 'Gin money. Gin breath.', upside: '+1 Coin after every Curtain (gin money).', downside: '-1 Sway at Posh Places (she smells of it).', flavour: 'Purely medicinal. She has a lot of symptoms.' },
  'jealousy':     { id: 'jealousy', name: 'Jealousy', plain: 'She never forgets who beat her.', upside: '+2 Sway in a clash with the rival who beat you last.', downside: '-1 Sway when you\'re alone at a Place.', flavour: 'Keeps a list of every snub, filed by hat.' },
};

// ---------------------------------------------------------------------------
// Cards. effect keys are handled in rules.js. text never names a hidden Kink.
// ---------------------------------------------------------------------------
export const CARDS = {
  // Shared starters
  'come-hither':      { id: 'come-hither', name: 'Come-Hither Look', arts: ['silk'], allure: 1, pocket: 0, text: '', flavour: 'One eyelid, slowly. The rest is commerce.', flavours: {victorian: ["One eyelid, slowly. The rest is commerce.", "She looked at him over her fan. He checked his wallet for courage.", "A glance across the music hall. The chairman dropped his gavel.", "She crooked one finger. Three gentlemen and a cab horse came."], wildwest: ["One eyelid, slowly. The rest is commerce.", "The faro dealer lost count, and the faro dealer never loses count.", "One look and the cavalry forgot who they were meant to be rescuing.", "A look so long the poker game folded."], vegas: ["One eyelid, slowly. The rest is commerce.", "One look across the baccarat table and the whale forgot which hand was his.", "One look and he comped her a suite. He doesn't work here.", "The look is free, like the casino drinks, and for the same reason."]}, artByTimeline: { victorian: art('victorian', 'card-come-hither'), wildwest: art('wildwest', 'card-come-hither'), vegas: art('vegas', 'card-come-hither') } },
  'saucy-quip':       { id: 'saucy-quip', name: 'Saucy Quip', arts: ['wit'], allure: 1, pocket: 0, text: '', flavour: "She only said she'd polish his helmet. He was a fireman.", flavours: {victorian: ["She only said she'd polish his helmet. He was a fireman.", "\"As the actress said to the bishop,\" she began. The real bishop at the next table paid her to stop.", "\"Is that a pocket watch, sir, or are you just early?\"", "She asked the muffin man if he did deliveries. He does now."], wildwest: ["She asked to see his six-shooter. He admitted it was more of a derringer.", "\"Is that a gold nugget in your pocket, mister?\" It was. She took it.", "She told the sheriff he had a lovely big badge. He's polished it every night since.", "She offered to ride shotgun. He handed her the reins as well."], vegas: ["She called it a hostile takeover. He signed anyway.", "She whispered \"blackjack\" in his ear. He paid out three to two.", "She asked if he played the long game. He's more of a four-minute slots guy.", "\"Such deep pockets,\" she told the whale. She was already in them."]}, artByTimeline: { victorian: art('victorian', 'card-saucy-quip'), wildwest: art('wildwest', 'card-saucy-quip'), vegas: art('vegas', 'card-saucy-quip') } },
  'teeth-extra':      { id: 'teeth-extra', name: 'Teeth Extra', arts: ['gold'], allure: 1, pocket: 1, text: '', flavour: 'The smile is free. The teeth are extra.', flavours: {victorian: ["The smile is free. The teeth are extra.", "Her smile cost a quid. She's still paying off the teeth.", "The left gold tooth was a gift from the Lord Mayor. The right was from his wife."], wildwest: ["The smile is free. The teeth are extra.", "Every prospector in town wants to stake a claim on that smile.", "He bit the coin to check it. Then she bit back."], vegas: ["The smile is free. The teeth are extra.", "His car is leased. Her veneers are paid off.", "A twenty-four-carat grin. Service included. Tip expected anyway."]}, artByTimeline: { victorian: art('victorian', 'card-teeth-extra'), wildwest: art('wildwest', 'card-teeth-extra'), vegas: art('vegas', 'card-teeth-extra') } },
  'peek-a-boo-fan':   { id: 'peek-a-boo-fan', name: 'Peek-a-Boo Fan', arts: ['mask'], allure: 1, pocket: 0, text: '', flavour: 'Now you see her. Now you see slightly more of her.', flavours: {victorian: ["Now you see her. Now you see slightly more of her.", "The fan says \"go away\". The eyebrows say \"half past nine\".", "A flutter, a flash of ankle, and a colonel reaches for the brandy."], wildwest: ["Now you see her. Now you see slightly more of her.", "A fan in a dust storm does nothing for the dust. It does wonders for the cowboys.", "The fan opened; three cowboys fell off the rail."], vegas: ["Now you see her. Now you see slightly more of her.", "Two hundred feathers, and not one of them where he hoped.", "One flick of the wrist and the front row spills their drinks."]}, artByTimeline: { victorian: art('victorian', 'card-peek-a-boo-fan'), wildwest: art('wildwest', 'card-peek-a-boo-fan'), vegas: art('vegas', 'card-peek-a-boo-fan') } },
  'saucy-wink':       { id: 'saucy-wink', name: 'A Saucy Wink', arts: ['frolic'], allure: 1, pocket: 0, effects: ['noItch'], text: 'Gives no Itch.', flavour: 'Saucy, but sanitary.', flavours: {victorian: ["Saucy, but sanitary.", "A wink, a nudge and a bar of carbolic soap.", "All the fun of the fair. None of the doctor."], wildwest: ["Saucy, but sanitary.", "A wink across the bar. She washed up after.", "She winks, and the doctor in Deadwood loses another patient."], vegas: ["Saucy, but sanitary.", "A wink from the pool bar. She keeps the hand gel in her garter.", "A wink so clean the health inspector framed it."]}, artByTimeline: { victorian: art('victorian', 'card-saucy-wink'), wildwest: art('wildwest', 'card-saucy-wink'), vegas: art('vegas', 'card-saucy-wink') } },
  'mothers-advice':   { id: 'mothers-advice', name: "Mother's Advice", arts: [], allure: 1, pocket: 0, text: 'No Art, so it can never offend.', flavour: 'Never lose your heart before the second payment.', flavours: {victorian: ["Never lose your heart before the second payment.", "\"Always wear clean drawers, dear. You never know who'll pay to see them.\"", "Men are like omnibuses, love. Another one's along in a minute, and they all want to go on top."], wildwest: ["Never lose your heart before the second payment.", "\"Gold first, honey. Then the boots come off.\"", "Never kiss a man who chews tobacco. Or charge him double."], vegas: ["Never lose your heart before the second payment.", "\"Never date a man whose watch costs more than your rent. Bill him.\"", "Never take payment in a currency named after a dog."]}, artByTimeline: { victorian: art('victorian', 'card-mothers-advice'), wildwest: art('wildwest', 'card-mothers-advice'), vegas: art('vegas', 'card-mothers-advice') } },
  // Starter signatures
  'anonymous-verse':  { id: 'anonymous-verse', name: 'Anonymous Verse', owner: 'dolly', arts: ['wit'], allure: 2, pocket: 0, effects: ['plusIfTasteWit'], text: '+1 Allure if his Tastes list Wit.', flavour: "Printed in the Gazette under 'A Lady'. Read aloud in three clubs and the Admiralty.", flavours: { victorian: ["Printed in the Gazette under 'A Lady'. Read aloud in three clubs and the Admiralty.", "Fourteen lines, two of them about his moustache. He had it framed.", "The censor banned it, then asked for a signed copy."] }, art: art('victorian', 'card-anonymous-verse') },
  'blush-curtsey':    { id: 'blush-curtsey', name: 'A Blush and a Curtsey', owner: 'dolly', arts: ['silk', 'mask'], allure: 2, pocket: 0, text: '', flavour: 'She went pink to the ears. He went for his cheque-book.', flavours: { victorian: ["She went pink to the ears. He went for his cheque-book.", "She curtseyed so low, three gents dropped their monocles.", "She blushed on cue. Her cue was the word \"guineas\"."] }, art: art('victorian', 'card-blush-curtsey') },
  'ace-up-garter':    { id: 'ace-up-garter', name: 'Ace Up the Garter', owner: 'fanny', arts: ['gold'], allure: 2, pocket: 1, effects: ['coinOnWork1'], text: 'Worked: +1 Coin, win or lose.', flavour: 'Where else would a lady keep it?', flavours: { wildwest: ["Where else would a lady keep it?", "The dealer checked her sleeves. Wrong end, dealer.", "Four aces in the deck, five on the table. The dealer's too much of a gentleman to ask."] }, art: art('wildwest', 'card-ace-up-garter') },
  'poker-face':       { id: 'poker-face', name: 'Poker Face', owner: 'fanny', arts: ['mask', 'gold'], allure: 2, pocket: 1, effects: ['noAversion'], text: 'Never crossed by an Aversion.', flavour: "She's thinking about you. Or beef prices in Chicago. Hard to say.", flavours: { wildwest: ["She's thinking about you. Or beef prices in Chicago. Hard to say.", "She took a royal flush and a marriage proposal with the same face.", "One eyebrow moved once, in 1871. The town still talks about it."] }, art: art('wildwest', 'card-poker-face') },
  'been-there':       { id: 'been-there', name: 'Been There, Done That', owner: 'jackie', arts: ['frolic'], allure: 3, pocket: 0, text: '', flavour: 'She already has the T-shirt, the mug and the fridge magnet.', flavours: { vegas: ["She already has the T-shirt, the mug and the fridge magnet.", "She's seen this move in four countries and on one cruise ship.", "Unimpressed, but billed by the hour."] }, art: art('vegas', 'card-been-there') },
  'reverse-cowgirl':  { id: 'reverse-cowgirl', name: 'Riding Backwards, Yawning', owner: 'jackie', position: true, arts: ['frolic', 'gold'], allure: 2, pocket: 1, effects: ['plusPerOtherFrolic'], text: '+1 Allure per other Frolic card Worked with it.', flavour: "She's scrolling her phone. He thinks it's going great.", flavours: { vegas: ["She's scrolling her phone. He thinks it's going great.", "She answers two emails and books a facial. He calls it the best night of his life.", "Eyes on the ceiling mirror. Mind on the brunch reservation."] }, art: art('vegas', 'card-reverse-cowgirl') },
  // Rival and stand-in signatures (not sold)
  'swan-neck':        { id: 'swan-neck', name: 'Swan Neck', npc: true, arts: ['silk'], allure: 2, pocket: 0, text: '', flavour: 'Eighteen inches of disdain, beautifully lit.' },
  'the-lorgnette':    { id: 'the-lorgnette', name: 'Through the Lorgnette', npc: true, arts: ['silk', 'wit'], allure: 2, pocket: 0, text: '', flavour: 'She looks him over like a dodgy oyster and sends him back to the kitchen.' },
  'tick-tock':        { id: 'tick-tock', name: 'Tick, Tock', npc: true, arts: ['mask'], allure: 2, pocket: 0, text: '', flavour: 'Something inside her is ticking. He\'s hoping it\'s a clock.' },
  'insert-coin':      { id: 'insert-coin', name: 'Insert Coin', npc: true, arts: ['gold'], allure: 2, pocket: 1, text: '', flavour: 'The coin slot is purely decorative, says management. It takes quarters.' },
  'jackpot-shimmy':   { id: 'jackpot-shimmy', name: 'Jackpot Shimmy', npc: true, arts: ['gold', 'frolic'], allure: 2, pocket: 0, text: '', flavour: 'Three cherries and a lot of rattling.' },
  'dropped-glove':    { id: 'dropped-glove', name: 'The Dropped Glove', npc: true, arts: ['silk'], allure: 2, pocket: 0, text: '', flavour: 'Dropped once by accident and four times on purpose.' },
  'well-turned-couplet': { id: 'well-turned-couplet', name: 'A Well-Turned Couplet', npc: true, arts: ['wit'], allure: 2, pocket: 0, text: '', flavour: 'It rhymes "bodice" with "goddess", and gets away with it.' },
  'lowered-spectacles':  { id: 'lowered-spectacles', name: 'Spectacles, Lowered', npc: true, arts: ['wit', 'mask'], allure: 2, pocket: 0, text: '', flavour: 'She peers over her spectacles. He confesses to things he hasn\'t even done.' },
  'counting-out-loud':   { id: 'counting-out-loud', name: 'Counting Out Loud', npc: true, arts: ['gold'], allure: 2, pocket: 1, text: '', flavour: 'She counts every note, slowly, without breaking eye contact.' },
  'generous-discount':   { id: 'generous-discount', name: 'A Generous Discount', npc: true, arts: ['gold', 'silk'], allure: 2, pocket: 1, text: '', flavour: 'Ten per cent off. Ten per cent of what, she won\'t say.' },
  'behind-the-fan':      { id: 'behind-the-fan', name: 'Behind the Fan', npc: true, arts: ['mask'], allure: 2, pocket: 0, text: '', flavour: 'Whatever she said behind it made the curate sit down.' },
  'mystery-veil':        { id: 'mystery-veil', name: 'The Mystery Veil', npc: true, arts: ['mask', 'silk'], allure: 2, pocket: 0, text: '', flavour: 'Her chin has never been seen in public. Several men have proposed to it.' },
  'flash-of-garter':     { id: 'flash-of-garter', name: 'A Flash of Garter', npc: true, arts: ['frolic'], allure: 3, pocket: 0, text: '', flavour: 'Blink and you\'ll miss it. The front row has given up blinking.' },
  'can-can-kick':        { id: 'can-can-kick', name: 'The Can-Can Kick', npc: true, position: true, arts: ['frolic', 'wit'], allure: 2, pocket: 0, text: '', flavour: 'One kick, and a gentleman\'s top hat spends the second act in the chandelier.' },
  // Market: Victorian London
  'strict-governess': { id: 'strict-governess', name: 'Strict Governess', timeline: 'victorian', arts: ['mask'], allure: 2, pocket: 0, cost: 4, text: 'For a gentleman who loves a good telling-off.', flavour: 'You\'ve been a very naughty Chancellor of the Exchequer.', art: art('victorian', 'card-strict-governess') },
  'limerick':         { id: 'limerick', name: 'A Limerick from Nantucket', timeline: 'victorian', arts: ['wit', 'frolic'], allure: 3, pocket: 0, cost: 4, text: '', flavour: "There once was a man from... no, we'd best not.", art: art('victorian', 'card-limerick') },
  'pick-his-pocket':  { id: 'pick-his-pocket', name: 'Pick His Pocket', timeline: 'victorian', arts: ['gold'], allure: 1, pocket: 1, cost: 3, effects: ['coinOnWork2', 'notorietyOnWork'], text: 'Worked: +2 Coin, Notoriety +1.', flavour: 'He came with a purse and a pocket watch. He left with a warm feeling.', art: art('victorian', 'card-pick-his-pocket') },
  'wheelbarrow':      { id: 'wheelbarrow', name: 'The Wheelbarrow', timeline: 'victorian', position: true, arts: ['frolic'], allure: 3, pocket: 0, cost: 5, effects: ['doubleItch', 'firstBonus'], text: 'Counts as 2 Frolic cards for Itch. Place 1st: +2 Renown.', flavour: 'Requires one wheelbarrow, two consenting adults and a gardener sworn to secrecy.', art: art('victorian', 'card-wheelbarrow') },
  'charity-bazaar':   { id: 'charity-bazaar', name: 'The Charity Bazaar', timeline: 'victorian', arts: ['silk', 'wit'], allure: 1, pocket: 0, cost: 4, effects: ['notorietyDownOnWork'], text: 'Worked: Notoriety -1 (good works, in public).', flavour: 'She ran the kissing booth for the orphans. The orphans did very well.', art: art('victorian', 'card-charity-bazaar') },
  // Market: Wild West
  'ambitious-corset': { id: 'ambitious-corset', name: 'Corset of Uncommon Ambition', timeline: 'wildwest', arts: ['silk'], allure: 3, pocket: 0, cost: 5, text: '', flavour: 'Laced by two maids and a mule.', art: art('wildwest', 'card-ambitious-corset') },
  'drinks-on-house':  { id: 'drinks-on-house', name: 'Drinks on the House', timeline: 'wildwest', arts: ['gold'], allure: 1, pocket: 1, cost: 4, effects: ['plusIfCrowd'], text: '+1 Allure if anyone else is at your Place.', flavour: 'Drinks on the house. She\'s put the house on his tab.', art: art('wildwest', 'card-drinks-on-house') },
  'bucking-bronco':   { id: 'bucking-bronco', name: 'The Bucking Bronco', timeline: 'wildwest', position: true, arts: ['frolic'], allure: 3, pocket: 0, cost: 4, effects: ['plusRowdyGutter'], text: '+1 Allure at Rowdy and Gutter Places.', flavour: "Eight seconds is the record. She's going for nine.", art: art('wildwest', 'card-bucking-bronco') },
  'masked-stranger':  { id: 'masked-stranger', name: 'The Masked Stranger', timeline: 'wildwest', arts: ['mask', 'frolic'], allure: 2, pocket: 0, cost: 4, text: '', flavour: "Who was that masked woman? He's offering a reward to find out. And a bigger one to forget.", art: art('wildwest', 'card-masked-stranger') },
  // The Temperance Pledge is also Clockwork Clementine's signature (CHARACTERS.clementine.cards): she plays the card the market sells.
  'temperance-pledge':{ id: 'temperance-pledge', name: 'The Temperance Pledge', timeline: 'wildwest', arts: ['mask', 'gold'], allure: 1, pocket: 0, cost: 4, effects: ['notorietyDownOnWork'], text: 'Worked: Notoriety -1 (signed in front of witnesses).', flavour: 'She signed the pledge in front of the whole Temperance League, then bought them a round to celebrate.', art: art('wildwest', 'card-temperance-pledge') },
  // Market: Las Vegas
  'bottle-service':   { id: 'bottle-service', name: 'Bottle Service', timeline: 'vegas', arts: ['gold', 'silk'], allure: 2, pocket: 2, cost: 4, text: '', flavour: 'A sparkler in the bottle, a sparkle in her eye, $900 on his card.', art: art('vegas', 'card-bottle-service') },
  'sign-the-nda':     { id: 'sign-the-nda', name: 'Sign the NDA', timeline: 'vegas', arts: ['mask'], allure: 2, pocket: 0, cost: 3, effects: ['noNotoriety'], text: 'Worked: you gain no Notoriety from this encounter.', flavour: 'What happens in the suite is legally binding.', art: art('vegas', 'card-sign-the-nda') },
  'body-glitter':     { id: 'body-glitter', name: 'Body Glitter, Everywhere', timeline: 'vegas', arts: ['silk', 'frolic'], allure: 2, pocket: 0, cost: 4, effects: ['plusIfOtherFrolic'], text: '+1 Allure if you Work another Frolic card with it.', flavour: "He'll be finding it in his socks till Thanksgiving. So will his wife.", art: art('vegas', 'card-body-glitter') },
  'chapel-quickie':   { id: 'chapel-quickie', name: 'The Chapel Quickie', timeline: 'vegas', position: true, arts: ['frolic', 'mask'], allure: 1, pocket: 0, cost: 4, effects: ['notorietyDownOnWork'], text: "Worked: Notoriety -1 (you're married now; it's respectable).", flavour: 'Vows at 10:02. Annulment booked for 10:15. Elvis gave her away.', art: art('vegas', 'card-chapel-quickie') },
};

export const SHARED_DECK = ['come-hither', 'come-hither', 'saucy-quip', 'saucy-quip', 'teeth-extra', 'peek-a-boo-fan', 'saucy-wink', 'mothers-advice'];

export const NPC_SIGNATURES = {
  silk: ['swan-neck', 'dropped-glove'],
  wit: ['well-turned-couplet', 'lowered-spectacles'],
  gold: ['counting-out-loud', 'generous-discount'],
  mask: ['behind-the-fan', 'mystery-veil'],
  frolic: ['flash-of-garter', 'can-can-kick'],
};

// ---------------------------------------------------------------------------
// Afflictions (curse cards) and their cures
// ---------------------------------------------------------------------------
export const AFFLICTIONS = {
  'lodgers':      { id: 'lodgers', name: 'The Covent Garden Lodgers', timeline: 'victorian', carriedBy: 'nobby', symptom: { kind: 'coinPerCurtain', amount: 1 }, symptomText: '-1 Coin after each Curtain (they eat your profits).', cure: { id: 'hot-bath', name: 'Hot Bath & Carbolic', place: 'drowned-rat', cost: 2, notoriety: 0 }, flavour: 'Kills ninety-nine per cent of lodgers. She evicts the last one by hand.', gag: 'A tiny top hat bobs across the sheet. Then another. Then a whole family.', art: art('victorian', 'affliction-lodgers') },
  'wobbles':      { id: 'wobbles', name: 'The Cheapside Wobbles', timeline: 'victorian', carriedBy: 'alfie', symptom: { kind: 'artAllure', art: 'silk', amount: 1 }, symptomText: 'Your Silk cards -1 Allure.', cure: { id: 'mercury-pills', name: "Dr Quackenbush's Mercury Pills", place: 'salon', cost: 3, notoriety: 0 }, flavour: 'A night with Venus, a lifetime with Mercury.', gag: 'Her knees knock out the chorus of "Ta-ra-ra Boom-de-ay".', art: art('victorian', 'affliction-wobbles') },
  'drip':         { id: 'drip', name: 'The Gold-Rush Drip', timeline: 'wildwest', carriedBy: 'hank', symptom: { kind: 'artAllure', art: 'frolic', amount: 1 }, symptomText: 'Your Frolic cards -1 Allure.', cure: { id: 'snake-oil', name: "Doc Pruitt's Snake Oil", place: 'last-chance', cost: 2, notoriety: 1 }, flavour: 'Doc Pruitt\'s Snake Oil cures forty things. The drip is number thirty-nine, just after rust.', gag: 'A prospector pans the washbasin, shakes his head and moves on to the next claim.', art: art('wildwest', 'affliction-drip') },
  'saddle-sores': { id: 'saddle-sores', name: 'Saddle Sores', timeline: 'wildwest', carriedBy: 'rusty', symptom: { kind: 'sway', amount: 1 }, symptomText: '-1 Sway.', cure: { id: 'hot-springs', name: 'A Soak at the Hot Springs', place: 'hog-ranch', cost: 3, notoriety: 0 }, flavour: "She's walking like she's still on the horse. The horse is walking normally.", gag: 'She drinks her whiskey standing up this week.', art: art('wildwest', 'affliction-saddle-sores') },
  'glitter-itch': { id: 'glitter-itch', name: 'The Glitter Itch', timeline: 'vegas', carriedBy: 'gaz', symptom: { kind: 'sway', amount: 1 }, symptomText: '-1 Sway.', cure: { id: 'urgent-care', name: 'Poolside Urgent Care', place: 'flamingo', cost: 3, notoriety: 0 }, flavour: "Glitter is forever. The cure just asks it nicely to leave.", gag: 'She sparkles where the sun don\'t shine.', art: art('vegas', 'affliction-glitter-itch') },
  'what-happens': { id: 'what-happens', name: 'What Happens in Vegas', timeline: 'vegas', carriedBy: 'slots', symptom: { kind: 'revealPlace' }, symptomText: 'Rivals can see your Place before the Curtain.', cure: { id: 'annulment', name: 'The Drive-Thru Annulment Window', place: 'motel', cost: 2, notoriety: 0 }, flavour: 'What happens in Vegas is now trending in Des Moines.', gag: 'Her name goes up on a billboard on the I-15, between a personal-injury lawyer and a buffet.', art: art('vegas', 'affliction-what-happens') },
};

// ---------------------------------------------------------------------------
// Novelty items. kinkFor is HIDDEN (masked by getView until the Kink is known).
// ---------------------------------------------------------------------------
export const ITEMS = {
  'cane':      { id: 'cane', name: "The Headmistress's Cane", timeline: 'victorian', cost: 3, kind: 'kink', kinkFor: 'plunkett', uses: 1, inspect: 'Never used, just waved about. The waving is booked up a fortnight ahead.', publicUse: 'Swish. A whole generation of Cabinet ministers sits up straight.', art: art('victorian', 'item-cane') },
  'bonnet':    { id: 'bonnet', name: "The Pearly Queen's Bonnet", timeline: 'victorian', cost: 2, kind: 'kink', kinkFor: 'alfie', uses: 1, inspect: 'Two thousand mother-of-pearl buttons and an ostrich feather. Weighs more than the lady wearing it.', publicUse: 'Rattles like a tin of buttons. You can hear her coming three streets away.', art: art('victorian', 'item-bonnet') },
  'helmet':    { id: 'helmet', name: "Bobby's Helmet (Borrowed)", timeline: 'victorian', cost: 2, kind: 'kink', kinkFor: 'nobby', uses: 1, blackMarket: true, inspect: "'Evening all.' The constable is still looking for it. He's looked everywhere but up.", publicUse: 'The constable wants it back. He can have it when she\'s done with it.', art: art('victorian', 'item-helmet') },
  'wand':      { id: 'wand', name: "Dr Quackenbush's Electro-Galvanic Vibratory Wand", timeline: 'victorian', cost: 5, kind: 'sway', sway: 2, uses: 3, durable: true, notorietyPerUse: 1, inspect: 'For nerves, vapours and the four-o\'clock slump. Ladies report a full recovery in under four minutes.', publicUse: '+2 Sway. Notoriety +1 per use (it is not quiet). 3 charges.', art: art('victorian', 'item-wand') },
  'spike':     { id: 'spike', name: 'The Golden Spike (Souvenir)', timeline: 'wildwest', cost: 3, kind: 'kink', kinkFor: 'vanderbucks', uses: 1, inspect: "Marks the day two great lines finally met. It took a lot of hammering.", publicUse: 'Gold-plated, nine inches long and honestly a bit much.', art: art('wildwest', 'item-spike') },
  'spurs':     { id: 'spurs', name: 'Jingling Spurs', timeline: 'wildwest', cost: 2, kind: 'kink', kinkFor: 'hank', uses: 1, inspect: 'Silver spurs, polished bright. The whole street will hear you coming.', publicUse: 'Murder on the bedsheets. Great for business.', art: art('wildwest', 'item-spurs') },
  'lasso':     { id: 'lasso', name: 'Lasso of the Lonesome Prairie', timeline: 'wildwest', cost: 2, kind: 'kink', kinkFor: 'rusty', uses: 1, blackMarket: true, inspect: 'Thirty feet of rope and a whole lot of ambition.', publicUse: 'Comes with a knot guide. Page six is not about cattle.', art: art('wildwest', 'item-lasso') },
  'lambskin':  { id: 'lambskin', name: 'Lambskin Sheath, with Ribbon', timeline: 'wildwest', cost: 2, kind: 'protection', protection: 2, uses: 2, inspect: "'Reusable,' says the mail-order catalogue. The catalogue is a liar.", publicUse: 'Protection 2 for one encounter. 2 uses.', art: art('wildwest', 'item-lambskin') },
  'shredder':  { id: 'shredder', name: 'Gold Card Shredder', timeline: 'vegas', cost: 3, kind: 'kink', kinkFor: 'brayden', uses: 1, inspect: 'Chews up a black card in four seconds. The card\'s owner asked for the slow setting.', publicUse: "Turns a credit limit into confetti.", art: art('vegas', 'item-shredder') },
  'jumpsuit':  { id: 'jumpsuit', name: 'Rhinestone Elvis Jumpsuit', timeline: 'vegas', cost: 3, kind: 'kink', kinkFor: 'gaz', uses: 1, inspect: 'Flared, sequinned, slightly damp. Comes with sideburns.', publicUse: "Size: Vegas, 1974. The zip goes all the way down, which is the whole point.", art: art('vegas', 'item-jumpsuit') },
  'dice':      { id: 'dice', name: 'Loaded Dice', timeline: 'vegas', cost: 2, kind: 'kink', kinkFor: 'slots', uses: 1, blackMarket: true, inspect: 'Seven, every time. More reliable than any man on the Strip.', publicUse: 'Roll them in a casino and you get thrown out. Roll them in bed and you get invited back.', art: art('vegas', 'item-dice') },
  'egg':       { id: 'egg', name: 'The Bluetooth Pleasure Egg', timeline: 'vegas', cost: 6, kind: 'sway', sway: 2, uses: 99, durable: true, cooldownCurtains: 1, inspect: 'App-controlled. The app has 1.2 stars and wants her contacts, her location and her mother\'s maiden name.', publicUse: '+2 Sway. After each use it sits out your next Curtain (it needs an update).', art: art('vegas', 'item-egg') },
  'stopper':   { id: 'stopper', name: 'Rhinestone Stopper (for Decorative Purposes)', timeline: 'vegas', cost: 4, kind: 'sway', sway: 1, uses: 99, durable: true, blackMarket: true, notorietyAtPosh: 1, inspect: "A stopper with a rhinestone heart on the end. 'It's decorative,' says the stall guy, for the third time this hour.", publicUse: '+1 Sway. At a Posh Place, Notoriety +1.', art: art('vegas', 'item-stopper') },
};

// ---------------------------------------------------------------------------
// Places (3 per Timeline). house: Allure modifiers per Art; pocket: extra Coin per pocketed card.
// ---------------------------------------------------------------------------
export const PLACES = {
  'salon':       { id: 'salon', timeline: 'victorian', kind: 'posh', name: "Mrs Featherstonehaugh's Salon", short: 'The Salon', where: 'Mayfair', note: 'Pronounced "Fanshaw", and you will be corrected if you don\'t.', house: { name: 'Drawing-Room Manners', arts: { wit: 1, frolic: -1 }, pocket: 0, text: 'Wit +1 Allure, Frolic -1 Allure.' }, stall: ['cane'], cure: 'mercury-pills', blurb: 'Gaslight, aspidistras and a piano player who never saw a thing.', art: art('victorian', 'place-salon') },
  'tuppenny':    { id: 'tuppenny', timeline: 'victorian', kind: 'rowdy', name: 'The Tuppenny Palace of Varieties', short: 'The Tuppenny Palace', where: 'Lambeth', house: { name: 'Footlights', arts: { silk: 1 }, pocket: 0, applause: 2, text: 'Silk +1 Allure; Applause is +2.' }, stall: ['bonnet', 'wand'], cure: null, blurb: 'Sawdust, a chairman with a gavel, and a four-piece band.', art: art('victorian', 'place-tuppenny') },
  'drowned-rat': { id: 'drowned-rat', timeline: 'victorian', kind: 'gutter', name: 'The Drowned Rat, Wapping', short: 'The Drowned Rat', where: 'Wapping', house: { name: 'Light Fingers', arts: { silk: -1 }, pocket: 1, text: "Silk -1 Allure (it'll be nicked); every pocketed card gives +1 Coin." }, stall: ['helmet'], cure: 'hot-bath', raidSquad: 'the Peelers', blurb: 'Low beams, a river smell, a landlord who answers to "Oi".', art: art('victorian', 'place-drowned-rat') },
  'velvet-spur': { id: 'velvet-spur', timeline: 'wildwest', kind: 'posh', name: 'The Velvet Spur Parlour House', short: 'The Velvet Spur', where: 'Upper Main Street', house: { name: 'Parlour Manners', arts: { silk: 1 }, pocket: 0, text: 'Silk +1 Allure. Money is never mentioned in the parlour. The madam counts it in the back.' }, stall: ['spike', 'lambskin'], cure: null, blurb: 'Piano, linen, a madam with a ledger and a shotgun.', art: art('wildwest', 'place-velvet-spur') },
  'last-chance': { id: 'last-chance', timeline: 'wildwest', kind: 'rowdy', name: 'The Last Chance Saloon', short: 'The Saloon', where: 'Main Street', house: { name: 'Rowdy', arts: { gold: 1, wit: -1 }, pocket: 0, text: "Gold +1 Allure, Wit -1 Allure (too loud for jokes)." }, stall: ['spurs'], cure: 'snake-oil', blurb: 'Swinging doors, and a sign over the bar: PLEASE DO NOT SHOOT THE PIANIST. HE IS DOING HIS BEST.', art: art('wildwest', 'place-last-chance') },
  'hog-ranch':   { id: 'hog-ranch', timeline: 'wildwest', kind: 'gutter', name: 'Hog Ranch Row', short: 'Hog Ranch Row', where: 'by the fort', house: { name: 'Anything Goes', arts: { frolic: 1 }, pocket: 0, text: 'Frolic +1 Allure.' }, stall: ['lasso'], cure: 'hot-springs', raidSquad: 'the Marshal', blurb: 'The cribs by the fort: mud, lanterns, and a goat that eats the bunting.', art: art('wildwest', 'place-hog-ranch') },
  'penthouse':   { id: 'penthouse', timeline: 'vegas', kind: 'posh', name: 'The Velvet Rope Penthouse', short: 'The Penthouse', where: 'top of the Strip', house: { name: 'High Limit', arts: { mask: 1, wit: -1 }, pocket: 0, nda: true, text: "Mask +1 Allure, Wit -1 Allure (whales don't listen; they sign). The butler leaves an NDA on every pillow: Frolic here costs no Notoriety." }, stall: ['shredder', 'egg'], cure: null, blurb: 'Infinity pool, a butler, an NDA on the pillow.', art: art('vegas', 'place-penthouse') },
  'flamingo':    { id: 'flamingo', timeline: 'vegas', kind: 'rowdy', name: 'The Neon Flamingo Day Club', short: 'The Day Club', where: 'poolside', house: { name: "Everyone's Filming", arts: { frolic: 1, mask: -1 }, pocket: 0, text: 'Frolic +1 Allure, Mask -1 Allure.' }, stall: ['jumpsuit'], cure: 'urgent-care', blurb: 'A pool party that kicked off in 2009 and is still going.', art: art('vegas', 'place-flamingo') },
  'motel':       { id: 'motel', timeline: 'vegas', kind: 'gutter', name: 'Motel Paradiso, Off-Strip', short: 'Motel Paradiso', where: 'Off-Strip ("weekly rates")', house: { name: 'No Questions Asked', arts: { mask: 1 }, pocket: 0, text: 'Mask +1 Allure.' }, stall: ['dice', 'stopper'], cure: 'annulment', raidSquad: 'Metro Vice', blurb: 'The neon sign lost its D in 1987. Management claims it always said Paraiso.', art: art('vegas', 'place-motel') },
};

// ---------------------------------------------------------------------------
// Gentlemen. secretTaste and kink are HIDDEN until Studied (or hit by accident).
// kink.trigger: { item } or { cards: [...] } (optionally withArt: another Worked card must carry that Art) or { artCount: {art, n} }
//   or { arts: [a, b] } or { distinctArts: 3 } or {} (only his novelty will do). Since the C-scandal review (2026-10-07) every
//   slice Kink is a specific market card the casual player never buys, or the novelty: never a pattern Best Guess makes by accident.
// ---------------------------------------------------------------------------
export const GENTS = {
  plunkett: { id: 'plunkett', timeline: 'victorian', name: 'Lord Percival Plunkett-Bottomsworth, MP', short: 'Lord Plunkett', freshness: 'scrubbed', carries: null,
    tastes: ['wit', 'mask'], aversion: 'frolic', aversionLine: 'he faints', fancy: 'bluestocking',
    secretTaste: 'silk', kink: { name: 'A Stern Word', item: 'cane', trigger: { cards: ['strict-governess'] }, hint: 'the Headmistress\'s Cane, or Work Strict Governess' },
    tells: ['Has put little skirts on the piano legs.', 'Flinches pleasantly whenever a door slams.'],
    hook: { kind: 'regularCap', value: 3, text: 'A creature of habit: Regular bonus up to +3 with him.' },
    again: ["Lord Plunkett, again. The butler just waves him through now.", "Lord Plunkett is skipping work for this. The country will cope.", "Lord Plunkett's voters want to know where he spends his evenings. He's not telling."],
    reactions: {delighted: ["Lord Plunkett has fainted. His valet says it's the good kind.", "Lord Plunkett proposes a law in your honour. The whole House rises for it.", "Lord Plunkett wants tonight declared a bank holiday."], satisfied: ["Lord Plunkett says \"I say\" four times and pays in guineas.", "Lord Plunkett leaves his card, his hat and one sock.", "Lord Plunkett calls it \"most satisfactory\" and tips the butler to forget it."], fizzled: ["Big Ben strikes ten, and Lord Plunkett runs off to vote.", "Lord Plunkett is late for a committee meeting. Or so he says.", "Lord Plunkett leaves to write a stiff letter to The Times. About you, possibly."]},
    voice: 'I say. Is that an ankle? Fetch my salts. No, leave it, fetch the ankle.', voices: ["I say. Is that an ankle? Fetch my salts. No, leave it, fetch the ankle.", "I haven't been this worked up since the budget debate. Do go on.", "Madam, I am a Member of Parliament. Kindly be gentle with the Member."], temperament: 'flustered', art: art('victorian', 'gent-plunkett') },
  alfie: { id: 'alfie', timeline: 'victorian', name: 'Alfie Barrow, Pearly King of Cheapside', short: 'Alfie Barrow', freshness: 'fair', carries: 'wobbles',
    tastes: ['frolic', 'silk'], aversion: 'mask', aversionLine: "never trust a face you can't see", fancy: 'minx',
    secretTaste: 'gold', kink: { name: "The Barrow Boy's Delight", item: 'bonnet', trigger: { cards: ['wheelbarrow'] }, hint: "the Pearly Queen's Bonnet, or Work The Wheelbarrow" },
    tells: ['Six thousand pearl buttons and not one done up properly.', 'Keeps patting his barrow and sighing.'],
    hook: { kind: 'gossipOnWin', value: 1, text: 'Win with him and he sings about you all week: +1 Gossip.' },
    again: ["Alfie Barrow, again. He's sewn your initials on his best waistcoat in pearl buttons.", "Alfie has parked his barrow outside your door. Permanently, he says.", "Alfie's had a word with the other barrow boys. They all call you Duchess now."],
    reactions: {delighted: ["Alfie sings about you all the way down the Old Kent Road.", "Alfie gives you a pearl button. He has five thousand nine hundred and ninety-nine left.", "Alfie does a knees-up all the way home. He lives in Bow."], satisfied: ["Alfie calls you a proper diamond and pays in farthings. It takes twenty minutes.", "Alfie tips his cap. Three buttons fall off.", "Alfie pays up, then sells you your own hat back at a very reasonable price."], fizzled: ["Alfie hears someone nicking his barrow and legs it after them.", "Alfie's off to see a man about a dog. The dog is waiting.", "Alfie says \"no offence, love\" and takes his whelks elsewhere."]},
    voice: "Gor blimey, look at the apples and pears on 'er. The stairs, love. I meant the stairs.", voices: ["Gor blimey, look at the apples and pears on 'er. The stairs, love. I meant the stairs.", "'Ere, I've polished every button for you. Well, most of 'em.", "My old mum said marry a nice girl. I'm working up to it, a shilling at a time."], temperament: 'jolly', art: art('victorian', 'gent-alfie') },
  nobby: { id: 'nobby', timeline: 'victorian', name: 'Nobby Nickit, fence and cracksman', short: 'Nobby Nickit', freshness: 'ripe', carries: 'lodgers',
    tastes: ['gold', 'mask'], aversion: 'wit', aversionLine: "don't get clever with me", fancy: 'hustler',
    secretTaste: 'frolic', kink: { name: 'A Fair Cop', item: 'helmet', trigger: { cards: ['pick-his-pocket'] }, hint: "Bobby's Helmet, or Work Pick His Pocket" },
    tells: ['Counts the spoons when he comes in and when he leaves.', 'Goes misty-eyed at a police whistle.'],
    hook: { kind: 'coinNextAssignation', value: 1, text: 'Beat him and he pays you in "lightly used" pocket watches: +1 Coin at your next Assignation.' },
    again: ["Nobby Nickit, again. He's started bringing the spoons back.", "Nobby says he's going straight. Straight back here.", "Nobby hasn't nicked a thing all night. It's a personal best."],
    reactions: {delighted: ["Nobby pays you in a gold pocket watch inscribed \"To Reginald, for forty years' service\".", "Nobby is so pleased he gives you back your earring.", "Nobby swears off thieving until breakfast."], satisfied: ["Nobby checks his own pockets on the way out. Force of habit.", "Nobby leaves an IOU signed 'The Archbishop of Canterbury'.", "Nobby pays in full. He looks as surprised as you are."], fizzled: ["Nobby hears a whistle and leaves by the window.", "Nobby has gone. So have your candlesticks.", "Nobby has to be back in Newgate before they notice."]},
    voice: "Lovely evening. Lovely necklace. Lovely clasp on that necklace. Very loose, that clasp.", voices: ["Lovely evening. Lovely necklace. Lovely clasp on that necklace. Very loose, that clasp.", "Lovely spoons. Are they insured?", "I'm a gentleman of independent means. Other people's, mostly."], temperament: 'shifty', art: art('victorian', 'gent-nobby') },
  vanderbucks: { id: 'vanderbucks', timeline: 'wildwest', name: 'Cornelius Vanderbucks, railroad baron', short: 'Mr Vanderbucks', freshness: 'scrubbed', carries: null,
    tastes: ['gold', 'silk'], aversion: 'frolic', aversionLine: 'not before the board meeting', fancy: 'siren',
    secretTaste: 'mask', kink: { name: 'Driving the Golden Spike', item: 'spike', trigger: { cards: ['drinks-on-house'] }, hint: 'the Golden Spike, or Work Drinks on the House' },
    tells: ['Talks about his track. Its length. Its gauge.', 'Has never been told no. Secretly dying to hear it.'],
    hook: { kind: 'siding', value: 2, text: 'Satisfy him twice and he names a siding after you.' },
    again: ["Mr Vanderbucks, again. He's bought the hotel so he can stop paying for the room.", "Mr Vanderbucks is having a branch line surveyed to your door.", "Mr Vanderbucks has moved his board meetings to your bedroom."],
    reactions: {delighted: ["Mr Vanderbucks lays an extra mile of track before breakfast.", "Mr Vanderbucks gives you a lifetime pass on the Lower Bottoms & Pacific, first class, both directions.", "Mr Vanderbucks buys you a town. It has one street and a very grateful dentist."], satisfied: ["Mr Vanderbucks pays you in railroad shares. You're preferred stock now.", "Mr Vanderbucks pencils you in, between Sacramento and lunch.", "Mr Vanderbucks calls it a sound investment and asks about the dividend."], fizzled: ["Mr Vanderbucks is called away to buy a rival railroad.", "Mr Vanderbucks reroutes himself to Omaha.", "Mr Vanderbucks writes the evening off as a loss. For tax purposes."]},
    voice: 'Madam, I have laid four thousand miles of track. I can lay a little more.', voices: ["Madam, I have laid four thousand miles of track. I can lay a little more.", "I own the line, the depot and the coal. Name your station.", "Madam, time is money, and I have a great deal of both."], temperament: 'pompous', art: art('wildwest', 'gent-vanderbucks') },
  hank: { id: 'hank', timeline: 'wildwest', name: 'Hank "Six-Shooter" McGraw', short: 'Hank McGraw', freshness: 'fair', carries: 'drip',
    tastes: ['gold', 'frolic'], aversion: 'mask', aversionLine: 'never trust a body in a mask', fancy: 'hustler',
    secretTaste: 'silk', kink: { name: 'Spurs', item: 'spurs', trigger: { cards: ['drinks-on-house'], withArt: 'frolic' }, hint: 'the Jingling Spurs, or Work Drinks on the House with a Frolic card' },
    tells: ["Hasn't bathed since the Gold Rush. Possibly the one before.", 'His spurs jingle in an oddly hopeful way.'],
    hook: { kind: 'doubleCoinIfDelighted', value: 2, text: 'Pays double Coin in Assignations to anyone who has Delighted him.' },
    again: ["Hank McGraw, again. He's had a bath. The saloon thinks he's dying.", "Hank ties his horse up outside your door now. The neighbours set their clocks by it.", "Hank says he still ain't missed. The bullet holes in your ceiling say otherwise."],
    reactions: {delighted: ["Hank fires six shots in the air. The weathervane will never be the same.", "Hank buys the saloon a round and makes them drink to you, at gunpoint.", "Hank whoops so loud the church bell answers."], satisfied: ["Hank tips his hat. Something lives in the hat.", "Hank says 'much obliged, ma'am' and means about half of it.", "Hank pays in gold dust and most of a mule."], fizzled: ["Hank has a gunfight at noon. Can't keep a fella waiting.", "Hank wanders off to argue with his horse.", "Hank lies down for a minute and wakes up in Cheyenne."]},
    voice: 'Six shots, ma\'am, and I ain\'t never missed. Well. Once. She knows what she did.', voices: ["Six shots, ma'am, and I ain't never missed. Well. Once. She knows what she did.", "I'm quick on the draw, ma'am. Slower on everything else, I promise.", "I've been shot at, snake-bit and married. This here's the scariest."], temperament: 'swaggering', art: art('wildwest', 'gent-hank') },
  rusty: { id: 'rusty', timeline: 'wildwest', name: '"Rattlesnake" Rusty Colt, horse thief', short: 'Rusty Colt', freshness: 'ripe', carries: 'saddle-sores',
    tastes: ['frolic', 'mask'], aversion: 'silk', aversionLine: 'frills give him hives', fancy: 'minx',
    secretTaste: 'gold', kink: { name: 'Hog-Tied', item: 'lasso', trigger: { cards: ['masked-stranger'] }, hint: 'the Lasso of the Lonesome Prairie, or Work The Masked Stranger' },
    tells: ['Used to being tied up. Mostly by the sheriff.', 'Wears his bandana even to eat soup.'],
    hook: { kind: 'horse', value: 1, text: 'Beat him and he steals you a horse (cosmetic; it follows you around the map).' },
    again: ["Rusty Colt, again. The sheriff has stopped looking for him and started looking for you.", "Rusty has returned a horse. Not the right one, but it's the thought.", "Rusty takes off his bandana for you. He puts it straight back on. Baby steps."],
    reactions: {delighted: ["Rusty steals you a bunch of flowers. From the undertaker.", "Rusty swears he'll go straight. He goes diagonally.", "Rusty writes you a poem. It rhymes \"darlin'\" with \"gallows\"."], satisfied: ["Rusty pays cash, still warm from the stagecoach.", "Rusty pays up and throws in a horse. Best not ride it through town.", "Rusty pays in full and asks you not to tell anyone. He has a reputation."], fizzled: ["Rusty hears hooves and leaves at a gallop. On your horse.", "Rusty sees his own face on a poster and leaves to argue about the likeness.", "Rusty climbs out of the window. The door was open."]},
    voice: "That ain't my horse. That ain't my hat neither. But you can trust me, darlin'.", voices: ["That ain't my horse. That ain't my hat neither. But you can trust me, darlin'.", "I came by this honest, in a manner of speaking.", "Don't mind the posse. They follow me everywhere."], temperament: 'shifty', art: art('wildwest', 'gent-rusty') },
  brayden: { id: 'brayden', timeline: 'vegas', name: 'Brayden Bullion III, crypto whale', short: 'Brayden Bullion III', freshness: 'scrubbed', carries: null,
    tastes: ['gold', 'mask'], aversion: 'wit', aversionLine: "explain something to him and he'll explain it back", fancy: 'hustler',
    secretTaste: 'silk', kink: { name: 'Financial Domination', item: 'shredder', trigger: { cards: ['chapel-quickie'], withArt: 'gold' }, hint: 'the Gold Card Shredder, or Work The Chapel Quickie with a Gold card' },
    tells: ['Asks what things cost, then pays double.', "Calls his accountant 'Mommy'."],
    hook: { kind: 'oddCoin', value: 1, text: 'Delight him and he tips in a coin nobody has heard of (a collectible).' },
    again: ["Brayden Bullion III, again. He's calling it a recurring investment.", "Brayden tries to buy you outright. You remind him you're not a startup.", "Brayden's portfolio is now 40% you. His advisers are begging him to diversify."],
    reactions: {delighted: ["Brayden calls it the best ROI of his life.", "Brayden tips you in a coin he invented this morning.", "Brayden posts a 41-part thread about you. Part one is about him."], satisfied: ["Brayden leaves a five-star review. Of himself.", "Brayden pays up and asks if he can write you off as a business expense.", "Brayden rates it a solid seven and asks if it scales."], fizzled: ["Brayden's card bounces. So does he.", "Brayden leaves to buy a small island to sulk on.", "Brayden says it's not you, it's the market."]},
    voice: "I'm not a client. I'm an early-stage investor.", voices: ["I'm not a client. I'm an early-stage investor.", "Is this the VIP area? I'll buy it.", "I've disrupted three industries and two marriages, one of them mine."], temperament: 'smug', art: art('vegas', 'gent-brayden') },
  gaz: { id: 'gaz', timeline: 'vegas', name: 'Gaz Pickering, stag do, from Leeds', short: 'Gaz Pickering', freshness: 'fair', carries: 'glitter-itch',
    tastes: ['frolic', 'wit'], aversion: 'gold', aversionLine: "he's skint, it's a stag do", fancy: 'minx',
    secretTaste: 'silk', kink: { name: 'Thank You Very Much', item: 'jumpsuit', trigger: { cards: ['chapel-quickie'] }, hint: 'the Rhinestone Elvis Jumpsuit, or Work The Chapel Quickie' },
    tells: ["Four days in a novelty Elvis quiff and a stag-do sash. He's not even the stag.", "Sings 'Suspicious Minds' to the slot machines."],
    hook: { kind: 'forgetsFizzle', value: 1, text: 'Fizzle him and he forgets; win and he sends a group-chat photo (Gossip).' },
    again: ["Gaz Pickering, again. The stag went home. Gaz didn't.", "Gaz has extended his hotel booking. And his tab. And his sash.", "Gaz says it stopped being a stag do on day three. Now it's a lifestyle."],
    reactions: {delighted: ["Gaz climbs on a blackjack table to announce he's in love.", "Gaz shouts \"best stag do ever!\" He still hasn't found the stag.", "Gaz gets your name tattooed on his arm. Spelt wrong. Twice."], satisfied: ["Gaz says 'cheers, love' and gives you his last chip.", "Gaz tips in pound coins. In Las Vegas.", "Gaz says \"that were champion\" and goes looking for a kebab on the Strip."], fizzled: ["Gaz gets talked into a timeshare. He now owns one week in Orlando, forever.", "Gaz goes looking for the stag, last seen in a rented Ferrari.", "Gaz falls asleep in a fountain. Security tucks him in."]},
    voice: "Is this the chapel? No? Is this the bar? Brilliant. Same again, love.", voices: ["Is this the chapel? No? Is this the bar? Brilliant. Same again, love.", "Our Dean's getting wed Saturday. I've lost Dean.", "They do a chapel and a buffet in one place? That's my sort of town."], temperament: 'merry', art: art('vegas', 'gent-gaz') },
  slots: { id: 'slots', timeline: 'vegas', name: '"Slots" McGee, banned from fourteen casinos', short: '"Slots" McGee', freshness: 'ripe', carries: 'what-happens',
    tastes: ['gold', 'mask'], aversion: 'silk', aversionLine: 'sequins put him off his count', fancy: 'hustler',
    secretTaste: 'frolic', kink: { name: 'Hit Me', item: 'dice', trigger: {}, hint: 'the Loaded Dice, and nothing else will do' },
    tells: ['Counts cards, chips, exits and the buttons on your dress.', 'Visor on. Indoors. At night.'],
    hook: { kind: 'tipOff', value: 1, text: 'Win with him and he tells you which Place a rival will pick next Curtain.' },
    again: ["\"Slots\" McGee, again. He's worked out the odds on this, and he doesn't like them.", "Slots McGee has stopped counting cards and started counting visits.", "Slots has put you on his lucky-numbers list. Right under seven."],
    reactions: {delighted: ["\"Slots\" calls it the best odds he has had since 1987.", "\"Slots\" tips in chips from a casino that banned him.", "\"Slots\" lets it all ride. On you."], satisfied: ["\"Slots\" counts to seven, nods, and pays.", "\"Slots\" calls it a push. From him, that's a love letter.", "\"Slots\" pays you in quarters, still warm from the machine."], fizzled: ["\"Slots\" has a sure thing in the fourth race at the dog track.", "\"Slots\" folds. First time all year.", "\"Slots\" cashes out early. He always does."]},
    voice: "Odds are good, doll. Odds are always good. That's the trouble with odds.", voices: ["Odds are good, doll. Odds are always good. That's the trouble with odds.", "Seven's my number, doll. Yours is seven now too.", "I'm not superstitious. Blow on these anyway."], temperament: 'twitchy', art: art('vegas', 'gent-slots') },
};

// Which of the gentleman's public Tells a Kink novelty answers to (index into GENTS[kinkFor].tells). The stall quotes it,
// so the Kink-item puzzle can be solved from free clues (Study still confirms it and adds the +3 to the preview).
export const ITEM_TELLS = { cane: 1, bonnet: 1, helmet: 1, spike: 0, spurs: 1, lasso: 0, shredder: 0, jumpsuit: 1, dice: 0 };

// Tourists: comic cross-Timeline punters, Assignations only. Can't be lost to.
export const TOURISTS = {
  tex:    { id: 'tex', name: 'Tex Tumbleweed, a lost cowboy', short: 'Tex Tumbleweed', from: 'wildwest', lostIn: 'victorian', taste: 'wit', freshness: 'scrubbed', aside: 'Pays in dollars and thanks you in a drawl no Londoner can follow.', reactions: {delighted: ["Tex calls it the best night east of the Pecos. He's been east of the Pecos once.", "Tex throws his hat in the air. It doesn't come down.", "Tex yee-haws so loud a cab horse in the Strand bolts for Texas."], satisfied: ["Tex tips his hat and tries to tie his horse to a lamp-post. He has no horse.", "Tex pays in gold nuggets. The landlord bites every one.", "Tex calls you 'ma'am' eleven times and backs out of the door."]},
    voice: "Ma'am, which way's Texas? And what's a 'crumpet'?", voices: ["Ma'am, which way's Texas? And what's a 'crumpet'?", "I asked for a steak and they brought me a pie with a kidney in it. A kidney, ma'am.", "Your policemen don't carry guns, ma'am. How do they settle an argument?"], gag: "Tex's hat sails over the curtain and lands on the bandleader.", gags: ["Tex's hat sails over the curtain and lands on the bandleader.", 'A lasso flies over the curtain and ropes the chandelier, a waiter and the piano.', 'A spur rolls out from under the curtain and keeps going, down the Strand.'], art: art('victorian', 'tourist-tex') },
  darren: { id: 'darren', name: 'Darren, on a Wild West coach tour', short: 'Darren', from: 'vegas', lostIn: 'wildwest', taste: 'gold', freshness: 'scrubbed', aside: 'Came on a coach trip from the Strip and thinks you\'re part of the show.', reactions: {delighted: ["Darren gives you five stars on the coach company's feedback form, with a little drawing.", "Darren hands over a crisp modern twenty. The bank keeps it under glass.", "Darren photographs you, the saloon and his own thumb, in that order."], satisfied: ["Darren tips you in drinks vouchers from the coach.", "Darren calls it 'very authentic' and asks where the toilets are.", "Darren says 'lovely, that' and gets back on the wrong coach."]},
    voice: "Is this the re-enactment? Only the brochure said there'd be a buffet.", voices: ["Is this the re-enactment? Only the brochure said there'd be a buffet.", "The stagecoach robbery's at four, it says here. I've brought exact change.", "The wife's on the spa day. I'm on the Authentic Frontier Package."], gag: 'A plastic sheriff\'s badge flies out of the window. A horse eats it.', gags: ['A plastic sheriff\'s badge flies out of the window. A horse eats it.', 'A pint glass rolls out from under the curtain, upright and still full.', 'The inflatable hat floats over the curtain and drifts off towards Nevada.'], art: art('wildwest', 'tourist-darren') },
  pooter: { id: 'pooter', name: 'Mr Charles Pooter, bank clerk of Holloway', short: 'Mr Pooter', from: 'victorian', lostIn: 'vegas', taste: 'frolic', freshness: 'scrubbed', aside: 'A long way from home, and pinker by the minute.', reactions: {delighted: ["Mr Pooter writes it all down in his diary, then crosses most of it out.", "Mr Pooter orders a second lemonade, and makes it a large one.", "Mr Pooter loosens his tie. A whole inch."], satisfied: ["Mr Pooter asks for a receipt, for Carrie.", "Mr Pooter calls it \"most agreeable\" and shakes your hand for a full minute.", "Mr Pooter tips exactly ten per cent and checks it twice."]},
    voice: 'Carrie believes I am at a conference on municipal drainage.', voices: ['Carrie believes I am at a conference on municipal drainage.', 'I have put a whole dollar in the machine. I do hope Carrie never hears of it.', 'Is it always this bright at midnight? In Holloway we have the decency to be dark.'], gag: 'A bowler hat rises slowly on a jet of fountain water. Bells ring.', gags: ['A bowler hat rises slowly on a jet of fountain water. Bells ring.', 'A tie-pin pings off a slot machine and lands in a showgirl\'s headdress.', 'A diary sails over the curtain, open at a page Carrie must never see.'], art: art('vegas', 'tourist-pooter') },
};

// ---------------------------------------------------------------------------
// Characters (whores). Temperaments deliberately mixed.
// role: starter | rival | standin. label shown in every UI for automatons.
// ---------------------------------------------------------------------------
const exprs = (era, id, list) => Object.fromEntries(list.map(([k, label]) => [k, { label, art: art(era, `${id}--${k}`) }]));

export const CHARACTERS = {
  // Starters
  dolly: { id: 'dolly', short: 'Dolly', role: 'starter', timeline: 'victorian', name: 'Dolly Mopp', epithet: 'the Parlourmaid Poetess', type: 'bluestocking', signature: 'wit',
    temperament: 'shy', temperamentText: 'Shy and sweet, blushes to her ears, writes naughty poems she\'d never read out loud.',
    look: "A housemaid's cap worn at a hopeful angle, a darned apron over a laced black bodice (buttoned to the throat in public), ink on her fingers.",
    charm: 'silver-tongue', talent: 'double-entendre', vice: 'loose-lips', cards: ['anonymous-verse', 'blush-curtsey'],
    voice: '"I couldn\'t possibly say it, sir. But I could write it down."', voices: ["\"I couldn't possibly say it, sir. But I could write it down.\"", "\"I never write about real people, sir. Only ones exactly like you.\"", "\"Mistress says I'm to be seen and not heard. I'm working on the seen.\""], plays: 'Wit-lovers, the Salon, long courtships.',
    art: art('victorian', 'dolly'), expressions: exprs('victorian', 'dolly', [['blush', 'blushing behind a fan'], ['pleased', 'a tiny triumphant smile'], ['caught', 'mortified'], ['wink', 'the wink (rare, devastating)'], ['won', 'winning, purse held high']]) },
  fanny: { id: 'fanny', short: 'Fanny', role: 'starter', timeline: 'wildwest', name: 'Fanny Faro', epithet: 'the Deadpan Dealer', type: 'hustler', signature: 'gold',
    temperament: 'deadpan', temperamentText: 'Deadpan; one eyebrow does all the work.',
    look: 'A frayed velvet bodice, sleeve garters, a green eyeshade, a derringer and a spare ace in the garter, one bare shoulder she hasn\'t noticed.',
    charm: 'underestimated', talent: 'quick-change', vice: 'gambler', cards: ['ace-up-garter', 'poker-face'],
    voice: '"I never cheat, sugar. I just know where the cards have been."', voices: ["\"I never cheat, sugar. I just know where the cards have been.\"", "\"Cut the deck if you like, mister. Won't make a lick of difference.\"", "\"I've never lost a hand I meant to win.\""], plays: 'Gold-lovers, the Saloon, crowded rooms.',
    art: art('wildwest', 'fanny'), expressions: exprs('wildwest', 'fanny', [['poker', 'poker face'], ['pleased', 'poker face (pleased)'], ['caught', 'poker face (caught)'], ['eyebrow', 'one raised eyebrow'], ['won', 'winning, chips in hand']]) },
  jackie: { id: 'jackie', short: 'Jackie', role: 'starter', timeline: 'vegas', name: 'Jackie Potts', epithet: 'the Jaded Jackpot', type: 'minx', signature: 'frolic',
    temperament: 'bored', temperamentText: 'Bored; has seen everything twice and filmed none of it.',
    look: "Last night's sequins under a white shirt she slept in, sunglasses pushed up at 4 a.m., gum, a phone at 3%.",
    charm: 'iron-constitution', talent: 'smokescreen', vice: 'bored-stiff', cards: ['been-there', 'reverse-cowgirl'],
    voice: '"Yeah, I know that one. And the other one."', voices: ["\"Yeah, I know that one. And the other one.\"", "\"Is it a bachelor party? It's always a bachelor party.\"", "\"Wake me up when he gets to the good part.\""], plays: 'Frolic-lovers, the Day Club and the Motel; must keep moving.',
    art: art('vegas', 'jackie'), expressions: exprs('vegas', 'jackie', [['yawn', 'yawn'], ['bubble', 'a slow bubble of gum'], ['eyeroll', 'eye-roll'], ['surprise', 'genuine surprise (once a season)'], ['won', 'winning, a fan of notes']]) },
  // Rivals
  lavinia: { id: 'lavinia', short: 'Lady Lavinia', role: 'rival', label: 'PROTOTYPE STAND-IN', timeline: 'victorian', name: 'Lady Lavinia Loosely-Laced', epithet: 'the Swan of Belgravia', type: 'siren', signature: 'silk',
    temperament: 'haughty', temperamentText: 'Haughty, scheming.',
    look: 'Swan neck, opera gloves, a lorgnette she looks down through at everyone, a bodice laced by committee.',
    charm: 'dimples', talent: 'upstage', vice: 'vanity', cards: ['swan-neck', 'the-lorgnette'],
    habit: { kind: 'posh', text: 'Always the Posh Place; plays the matchup and keeps her Regulars. Go to the Gutter and she follows you down, out of spite.' }, knowsAll: true,
    voice: '"How quaint. You\'ve brought your own enthusiasm."', voices: ["\"How quaint. You've brought your own enthusiasm.\"", "\"My mother was presented at court. Yours, I gather, was presented at the Old Bailey.\"", "\"I never compete, dear. I simply arrive, and others leave.\""],
    art: art('victorian', 'lavinia'), expressions: exprs('victorian', 'lavinia', [['disdain', 'looking down the lorgnette'], ['pleased', 'a thin smile'], ['caught', 'outraged'], ['scheme', 'scheming behind a fan']]) },
  clementine: { id: 'clementine', short: 'Clementine', role: 'rival', automaton: true, label: 'AUTOMATON', timeline: 'wildwest', name: 'Clockwork Clementine', epithet: 'the Temperance Automaton', type: 'enigma', signature: 'mask',
    temperament: 'prim', temperamentText: 'Prim. The Temperance League built her to scare men off drink. It backfired.',
    look: 'A player-piano saloon girl; porcelain face, buttoned to the chin, a brass key in her back. Ticks when shocked.',
    charm: 'good-listener', talent: 'read-the-room', vice: 'jealousy', cards: ['tick-tock', 'temperance-pledge'],
    habit: { kind: 'rowdy2of3', text: 'The Rowdy Place two Curtains in three, otherwise the Posh one; plays Best Guess. If you go to the Gutter, she clanks down after you, to set an example.' },
    voice: '"Lips that touch liquor shall... oh, go on then. Tick."', voices: ["\"Lips that touch liquor shall... oh, go on then. Tick.\"", "\"The League wound me up to set an example. Tick. They did not say which sort.\"", "\"My key is in my back, sir. Kindly keep your hands where I can see them. Tick.\""],
    art: art('wildwest', 'clementine'), expressions: exprs('wildwest', 'clementine', [['prim', 'prim'], ['pleased', 'a click of approval'], ['shocked', 'ticking furiously'], ['wink', 'a porcelain wink (malfunction?)']]) },
  bettie: { id: 'bettie', short: 'Bettie', role: 'rival', automaton: true, label: 'AUTOMATON', timeline: 'vegas', name: 'Brass Bettie', epithet: 'the Animatronic Showgirl', type: 'hustler', signature: 'gold',
    temperament: 'saucy', temperamentText: 'Saucy. An animatronic showgirl rescued from a bankrupt casino lobby.',
    look: "Feathers, rhinestones, chrome hinges at the elbows, a coin slot she's very coy about.",
    charm: 'knows-which-fork', talent: 'upstage', vice: 'gambler', cards: ['insert-coin', 'jackpot-shimmy'],
    habit: { kind: 'biggestPot', text: 'The biggest 1st-place pot (Renown plus Coin) whose door is open to her; plays Best Guess. If you go to the Gutter, she follows the money down there.' },
    voice: '"Insert coin. Ooh, cheeky."', voices: ["\"Insert coin. Ooh, cheeky.\"", "\"Jackpot! Oh. No. That's just my lights.\"", "\"Pull my lever, high roller. Gently. I'm vintage.\""],
    art: art('vegas', 'bettie'), expressions: exprs('vegas', 'bettie', [['showtime', 'showtime smile'], ['pleased', 'jackpot lights'], ['caught', 'tilt!'], ['wink', 'a hydraulic wink']]) },
  // Stand-in whores (casual players filling the rooms). Labelled in the UI.
  polly: { id: 'polly', short: 'Polly', role: 'standin', label: 'STAND-IN', timeline: 'victorian', name: 'Polly Perkins-Upp', epithet: 'the Violet Seller', type: 'siren', signature: 'silk', temperament: 'sweet', temperamentText: 'Sweet; thinks the best of everyone, prices accordingly.', look: 'A violet seller\'s blouse slipping off one shoulder, a grey shawl sliding to her elbow, a basket of slightly wilted posies, darned mittens.', charm: 'dimples', talent: 'upstage', vice: 'mothers-ruin', cards: NPC_SIGNATURES.silk, voice: '"Violets, sir? Only a penny. The rest is negotiable."', art: art('victorian', 'polly') },
  agatha: { id: 'agatha', short: 'Agatha', role: 'standin', label: 'STAND-IN', timeline: 'victorian', name: 'Agatha Primm-Rose', epithet: 'the Vicar\'s Widow', type: 'enigma', signature: 'mask', temperament: 'prim', temperamentText: 'Prim; disapproves of everything, including herself.', look: 'Black mourning dress buttoned to the jaw, a veil, a hymn book with a racing paper tucked inside.', charm: 'knows-which-fork', talent: 'read-the-room', vice: 'vanity', cards: NPC_SIGNATURES.mask, voice: '"I\'m in mourning. Mourning is Thursdays, two till four."', art: art('victorian', 'agatha') },
  bess: { id: 'bess', short: 'Bess', role: 'standin', label: 'STAND-IN', timeline: 'victorian', name: 'Bess Bunbury', epithet: 'the Can-Can Queen of Lambeth', type: 'minx', signature: 'frolic', temperament: 'saucy', temperamentText: 'Saucy; laughs like a foghorn, winks like a lighthouse.', look: 'A frilled music-hall skirt, red stockings with a ladder she calls "ventilation", a feather boa past its best.', charm: 'iron-constitution', talent: 'smokescreen', vice: 'jealousy', habit: { kind: 'gutter2of3', text: 'The Gutter Place two Curtains in three; on Raid Night she lies low at the Rowdy one. Plays Best Guess.' }, cards: NPC_SIGNATURES.frolic, voice: '"Knees up, gentlemen. Mine, I mean."', art: art('victorian', 'bess') },
  lottie: { id: 'lottie', short: 'Lottie', role: 'standin', label: 'STAND-IN', timeline: 'victorian', name: 'Lottie Ledger', epithet: 'the Countinghouse Coquette', type: 'hustler', signature: 'gold', temperament: 'scheming', temperamentText: 'Scheming; keeps two sets of books and one set of eyelashes.', look: 'Ink-stained cuffs, a pencil in her hair, a bodice with a hidden purse, a pawnbroker\'s ticket for a tiara.', charm: 'born-in-a-gin-shop', talent: 'quick-change', vice: 'gambler', cards: NPC_SIGNATURES.gold, voice: '"Pleasure is free, sir. The receipt is a shilling."', art: art('victorian', 'lottie') },
  rose: { id: 'rose', short: 'Rose', role: 'standin', label: 'STAND-IN', timeline: 'wildwest', name: 'Prairie Rose Hipps', epithet: 'the Pie Queen of the Prairie', type: 'siren', signature: 'silk', temperament: 'sweet', temperamentText: 'Sweet; bakes pies for the whole saloon and charges for none of them.', look: 'A gingham dress let out at the seams, a sunbonnet, a cherry pie, and a ribbon garter she made from a flour sack.', charm: 'dimples', talent: 'make-him-wait', vice: 'mothers-ruin', cards: NPC_SIGNATURES.silk, voice: '"Why, I\'ve never been kissed. Not by a sober man."', art: art('wildwest', 'rose') },
  prudence: { id: 'prudence', short: 'Prudence', role: 'standin', label: 'STAND-IN', timeline: 'wildwest', name: 'Prudence Pike', epithet: 'the Schoolmarm', type: 'bluestocking', signature: 'wit', temperament: 'prim', temperamentText: 'Prim; corrects grammar mid-seduction.', look: 'A high collar, wire spectacles, a ruler, a bustle that has seen two winters.', charm: 'silver-tongue', talent: 'double-entendre', vice: 'vanity', cards: NPC_SIGNATURES.wit, voice: '"It\'s \'whom\', cowboy. Now, about my fee."', art: art('wildwest', 'prudence') },
  dusty: { id: 'dusty', short: 'Dusty', role: 'standin', label: 'STAND-IN', timeline: 'wildwest', name: 'Dusty Drawers', epithet: 'the Tumbleweed Tease', type: 'minx', signature: 'frolic', temperament: 'bored', temperamentText: 'Bored; yawns through gunfights.', look: 'A patched petticoat, cowboy boots two sizes wrong, a hat with a bullet hole she says was there when she won it.', charm: 'underestimated', talent: 'smokescreen', vice: 'bored-stiff', habit: { kind: 'gutter2of3', text: 'The Gutter Place two Curtains in three; on Raid Night she lies low at the Rowdy one. Plays Best Guess.' }, cards: NPC_SIGNATURES.frolic, voice: '"Done? I thought that was the warm-up."', art: art('wildwest', 'dusty') },
  widow: { id: 'widow', short: 'the Widow', role: 'standin', label: 'STAND-IN', timeline: 'wildwest', name: 'The Widow Pettigrew', epithet: 'Thrice Bereaved', type: 'enigma', signature: 'mask', temperament: 'haughty', temperamentText: 'Haughty and scheming; three late husbands, all perfectly natural causes.', look: 'Black lace, a parasol, a locket with three portraits and room for a fourth.', charm: 'good-listener', talent: 'upstage', vice: 'jealousy', cards: NPC_SIGNATURES.mask, voice: '"Do sit down. You look like a man with a policy."', art: art('wildwest', 'widow') },
  krystal: { id: 'krystal', short: 'Krystal', role: 'standin', label: 'STAND-IN', timeline: 'vegas', name: 'Krystal Chandelier', epithet: 'the Lobby Legend', type: 'siren', signature: 'silk', temperament: 'haughty', temperamentText: 'Haughty; has a ring light for her ring light.', look: 'A rhinestone gown with a hemline repaired by stapler, false lashes like awnings, a borrowed fur.', charm: 'knows-which-fork', talent: 'upstage', vice: 'vanity', cards: NPC_SIGNATURES.silk, voice: '"I don\'t do day clubs. Daylight is for people with day jobs."', art: art('vegas', 'krystal') },
  ivy: { id: 'ivy', short: 'Ivy', role: 'standin', label: 'STAND-IN', timeline: 'vegas', name: 'Ivy League', epithet: 'the Law Student', type: 'bluestocking', signature: 'wit', temperament: 'scheming', temperamentText: 'Scheming; paying off her student loans one whale at a time.', look: 'Reading glasses, a cocktail dress with a highlighter in the cleavage, a contract-law textbook.', charm: 'silver-tongue', talent: 'make-him-wait', vice: 'loose-lips', cards: NPC_SIGNATURES.wit, voice: '"Technically, this is a consultation."', art: art('vegas', 'ivy') },
  candy: { id: 'candy', short: 'Candy', role: 'standin', label: 'STAND-IN', timeline: 'vegas', name: 'Candy Floss', epithet: 'the Pool Party Princess', type: 'minx', signature: 'frolic', temperament: 'sweet', temperamentText: 'Sweet; calls everyone "babe", including the cop who busts her.', look: 'A pink sarong, a pool float worn as a cape, glitter she can\'t explain.', charm: 'iron-constitution', talent: 'smokescreen', vice: 'mothers-ruin', habit: { kind: 'gutter2of3', text: 'The Gutter Place two Curtains in three (she pays the weekly rate); on Raid Night she lies low at the Rowdy one. Plays Best Guess.' }, cards: NPC_SIGNATURES.frolic, voice: '"Babe. Babe. Babe. Okay so."', art: art('vegas', 'candy') },
  dee: { id: 'dee', short: 'Dee', role: 'standin', label: 'STAND-IN', timeline: 'vegas', name: 'Dee Scretion', epithet: 'the Woman in the Sunglasses', type: 'enigma', signature: 'mask', temperament: 'deadpan', temperamentText: 'Deadpan; says nothing, charges extra for it.', look: 'Oversized sunglasses, a trench coat over sequins, a burner phone, a face like a locked safe.', charm: 'underestimated', talent: 'read-the-room', vice: 'gambler', cards: NPC_SIGNATURES.mask, voice: '"No comment."', art: art('vegas', 'dee') },
};

// Stand-in and automaton accounts (a lively Players screen). pastWhorescore = earlier seasons.
// season = this season's side-board standing so far (Coin earned, peak meters), so a newcomer has to earn a #1 on every board.
export const NPC_ACCOUNTS = [
  { id: 'lavinia-acct', name: 'LadyLavinia', kind: 'standin', whores: ['lavinia'], pastWhorescore: 57, season: { lavinia: { coinEarned: 24, peakStanding: 5 } } },
  { id: 'clementine-acct', name: 'Clockwork Clementine', kind: 'automaton', whores: ['clementine'], pastWhorescore: 0 },
  { id: 'bettie-acct', name: 'Brass Bettie', kind: 'automaton', whores: ['bettie'], pastWhorescore: 0 },
  { id: 'polly-acct', name: 'PollyPutTheKettleOn', kind: 'standin', whores: ['polly', 'rose'], pastWhorescore: 22, season: { polly: { coinEarned: 9, peakStanding: 3 }, rose: { coinEarned: 11, peakNotoriety: 2 } } },
  { id: 'agatha-acct', name: 'Agatha_Primm', kind: 'standin', whores: ['agatha'], pastWhorescore: 14, season: { agatha: { coinEarned: 7, peakStanding: 4 } } },
  { id: 'bess-acct', name: 'BessBunbury', kind: 'standin', whores: ['bess', 'candy'], pastWhorescore: 31, season: { bess: { coinEarned: 21, peakNotoriety: 5 }, candy: { coinEarned: 14, peakNotoriety: 3 } } },
  { id: 'lottie-acct', name: 'LottieLedger', kind: 'standin', whores: ['lottie', 'krystal'], pastWhorescore: 44, season: { lottie: { coinEarned: 30, peakNotoriety: 4 }, krystal: { coinEarned: 26, peakStanding: 4 } } },
  { id: 'prudence-acct', name: 'PrudencePike', kind: 'standin', whores: ['prudence'], pastWhorescore: 9, season: { prudence: { coinEarned: 8, peakStanding: 3 } } },
  { id: 'dusty-acct', name: 'DustyD', kind: 'standin', whores: ['dusty', 'dee'], pastWhorescore: 18, season: { dusty: { coinEarned: 12, peakNotoriety: 3 }, dee: { coinEarned: 19, peakNotoriety: 2 } } },
  { id: 'widow-acct', name: 'WidowP', kind: 'standin', whores: ['widow'], pastWhorescore: 40, season: { widow: { coinEarned: 22, peakNotoriety: 3 } } },
  { id: 'ivy-acct', name: 'IvyLeague', kind: 'standin', whores: ['ivy'], pastWhorescore: 5, season: { ivy: { coinEarned: 16, peakStanding: 3 } } },
];

// ---------------------------------------------------------------------------
// Era titles (verified terms; sources in rules-core.md). tier -> { standing, notoriety }
// ---------------------------------------------------------------------------
export const TIERS = ['common', 'rare', 'epic', 'legendary', 'mythic'];
export const TIER_NAMES = { common: 'Common Whore', rare: 'Rare Whore', epic: 'Epic Whore', legendary: 'Legendary Whore', mythic: 'Mythic Whore' };

export const ERA_TITLES = {
  victorian: {
    common: { standing: 'dollymop', notoriety: 'dollymop' },
    rare: { standing: 'dress lodger', notoriety: 'park woman' },
    epic: { standing: 'pretty horsebreaker', notoriety: "thieves' woman" },
    legendary: { standing: 'prima donna', notoriety: 'Richest Tart in Wapping', notorietyInvented: true },
    mythic: { standing: 'grande horizontale', notoriety: 'grande horizontale' },
  },
  wildwest: {
    common: { standing: 'crib girl', notoriety: 'crib girl' },
    rare: { standing: 'soiled dove', notoriety: 'hog-ranch girl' },
    epic: { standing: 'sporting woman', notoriety: 'lady of the line' },
    legendary: { standing: 'parlour-house boarder', notoriety: 'Queen of Hog Ranch Row', notorietyInvented: true },
    mythic: { standing: 'parlour-house madam', notoriety: 'parlour-house madam' },
  },
  vegas: {
    common: { standing: 'streetwalker', notoriety: 'streetwalker' },
    rare: { standing: 'outcall entertainer', notoriety: 'card girl', notorietyInvented: true },
    epic: { standing: 'ranch girl', notoriety: 'hustler' },
    legendary: { standing: 'high-end escort', notoriety: 'Off-Strip Royalty', notorietyInvented: true },
    mythic: { standing: 'courtesan to the whales', notoriety: 'courtesan to the whales' },
  },
};

// Seats per Timeline. place = where a vacant seat is won.
export const SEATS = {
  salon:  { id: 'salon', name: 'the Salon Seat', names: { victorian: 'the Salon Seat', wildwest: 'the Velvet Chair', vegas: 'the Penthouse Suite' }, tier: 'legendary', route: 'standing', placeKind: 'posh' },
  gutter: { id: 'gutter', name: 'the Gutter Throne', names: { victorian: 'the Gutter Throne', wildwest: 'the Hog Ranch Throne', vegas: 'the Off-Strip Throne' }, tier: 'legendary', route: 'notoriety', placeKind: 'gutter' },
  crown:  { id: 'crown', name: 'the Crown', tier: 'mythic', route: 'either', placeKind: 'rowdy' },
};

// ---------------------------------------------------------------------------
// Timelines with skins as data
// ---------------------------------------------------------------------------
export const TIMELINES = {
  victorian: {
    id: 'victorian', name: 'Victorian London', short: 'London', year: '1895', quarter: 'From Mayfair to Wapping',
    starter: 'dolly', rival: 'lavinia', standins: ['polly', 'agatha', 'bess', 'lottie'],
    places: ['salon', 'tuppenny', 'drowned-rat'], gents: ['plunkett', 'alfie', 'nobby'], tourist: 'tex',
    market: ['strict-governess', 'limerick', 'pick-his-pocket', 'wheelbarrow', 'charity-bazaar'],
    afflictions: ['lodgers', 'wobbles'], raidSquad: 'the Peelers', gazette: 'The Illustrated Police Gazette & Tittle-Tattle',
    telegram: 'A telegram from Victorian London: "Gaslight lit. Gentlemen restless. Come at once. Bring a chaperone you can lose."',
    skin: {
      mood: 'Gilded oil painting, candlelit, gaslight.',
      palette: { soot: '#1E140F', velvet: '#3B0F1A', oxblood: '#6B1E23', gilt: '#C9A24A', giltHighlight: '#E8C877', candle: '#F4DFAE', parchment: '#EFE3C8', gaslight: '#4F6B4A' },
      roles: { bg: '#1E140F', surface: '#3B0F1A', accent: '#C9A24A', accent2: '#6B1E23', text: '#EFE3C8', textOnAccent: '#1E140F', good: '#4F6B4A', bad: '#6B1E23' },
      fonts: { display: 'IM Fell English SC', display2: 'Playfair Display SC', body: 'EB Garamond' },
      textures: { bg: art('victorian', 'skin-bg'), frame: art('victorian', 'skin-frame'), curtain: art('victorian', 'skin-curtain'), card: art('victorian', 'skin-card') },
      textureWords: 'Craquelure varnish, flocked damask wallpaper, gilt frame bevels, candle-smoke vignette, foxed paper.',
      illustration: 'Oil-painting brushwork in the manner of Victorian genre painting: warm chiaroscuro key light, gold rim light, dark varnished backgrounds, faces lit like a portrait sitting.',
      curtain: 'Red velvet with gold fringe.',
    },
  },
  wildwest: {
    id: 'wildwest', name: 'The Wild West', short: 'Wild West', year: '1876', quarter: 'Lower Bottoms, Dakota Territory',
    starter: 'fanny', rival: 'clementine', standins: ['rose', 'prudence', 'dusty', 'widow'],
    places: ['velvet-spur', 'last-chance', 'hog-ranch'], gents: ['vanderbucks', 'hank', 'rusty'], tourist: 'darren',
    market: ['ambitious-corset', 'drinks-on-house', 'bucking-bronco', 'masked-stranger', 'temperance-pledge'],
    afflictions: ['drip', 'saddle-sores'], raidSquad: 'the Marshal', gazette: 'The Lower Bottoms Bugle',
    telegram: 'A telegram from the Wild West: "Gold struck. Gentlemen flush. Come quick. Bring a parasol."',
    skin: {
      mood: 'Painterly realism in the spirit of Red Dead Redemption 2 key art and Frederic Remington; sepia dusk; woodtype.',
      palette: { gunmetal: '#2E3238', saddle: '#5A3A22', sepia: '#7A5C3E', sunsetRed: '#C8553D', duskAmber: '#E9A25B', dust: '#D9C3A0', bone: '#F2E6CF', sage: '#8A9A6B', shadowViolet: '#4B3B5C' },
      roles: { bg: '#2E3238', surface: '#5A3A22', accent: '#E9A25B', accent2: '#C8553D', text: '#F2E6CF', textOnAccent: '#2E3238', good: '#8A9A6B', bad: '#C8553D' },
      fonts: { display: 'Rye', display2: 'Sancreek', body: 'Libre Caslon Text' },
      textures: { bg: art('wildwest', 'skin-bg'), frame: art('wildwest', 'skin-frame'), curtain: art('wildwest', 'skin-curtain'), card: art('wildwest', 'skin-card') },
      textureWords: 'Canvas weave, sun-bleached planks, wanted-poster paper, woodtype ink bleed, dust motes in low sun.',
      illustration: 'Painterly realism: long low dusk light, strong rim light, atmospheric haze, loose confident brushwork, wide skies.',
      curtain: 'A canvas wagon cover drawn shut.',
    },
  },
  vegas: {
    id: 'vegas', name: 'Modern Las Vegas', short: 'Vegas', year: 'now', quarter: 'The Strip and Off-Strip',
    starter: 'jackie', rival: 'bettie', standins: ['krystal', 'ivy', 'candy', 'dee'],
    places: ['penthouse', 'flamingo', 'motel'], gents: ['brayden', 'gaz', 'slots'], tourist: 'pooter',
    market: ['bottle-service', 'sign-the-nda', 'body-glitter', 'chapel-quickie'],
    afflictions: ['glitter-itch', 'what-happens'], raidSquad: 'Metro Vice', gazette: 'The Strip Tease Daily',
    telegram: 'A text from Las Vegas: "neon on. whales in. u coming?? 💋" (sent 4:12 a.m.)',
    skin: {
      mood: 'Neon synthwave and contemporary cyberpunk-glam: magenta and cyan neon, chrome, glossy airbrush, casino glitz.',
      palette: { night: '#0B0620', plum: '#2A0E3D', magenta: '#FF2E9A', cyan: '#19E6FF', violet: '#8A3FFC', chrome: '#CBD5E1', goldChrome: '#FFD25E', hotWhite: '#FFF5FB' },
      roles: { bg: '#0B0620', surface: '#2A0E3D', accent: '#FF2E9A', accent2: '#19E6FF', text: '#FFF5FB', textOnAccent: '#0B0620', good: '#19E6FF', bad: '#FF2E9A' },
      fonts: { display: 'Monoton', display2: 'Bungee', body: 'Outfit' },
      textures: { bg: art('vegas', 'skin-bg'), frame: art('vegas', 'skin-frame'), curtain: art('vegas', 'skin-curtain'), card: art('vegas', 'skin-card') },
      textureWords: 'Neon-tube bloom, brushed chrome bevels, glossy airbrush gradients, sequin glints, loud casino carpet.',
      illustration: '1980s airbrush pin-up gloss meets synthwave key art: hard magenta and cyan rim light, chrome reflections, glossy highlights, grid horizons.',
      curtain: 'A sequinned stage curtain with chasing bulbs.',
    },
  },
};
export const TIMELINE_IDS = ['victorian', 'wildwest', 'vegas'];

// ---------------------------------------------------------------------------
// Gag events (implied, off-screen, rare). Each leaves a postcard collectible.
// trigger: { kind: 'kinkWin', gent } | { kind: 'firstWithCrowd', place, n }
// ---------------------------------------------------------------------------
export const GAGS = {
  'wellington':    { id: 'wellington', timeline: 'victorian', name: "The Duke of Wellington's Wheelbarrow", trigger: { kind: 'kinkWin', gent: 'alfie' }, see: 'A squeaky wheel behind the curtain; a brass band strikes up; a portrait of the Duke turns to face the wall.', punchline: 'The biggest thrashing since Waterloo, and the loser wants a rematch.', punchlines: ['The biggest thrashing since Waterloo, and the loser wants a rematch.', 'The wheelbarrow has gone in for repairs. The wheelwright asked no questions.'], art: art('victorian', 'postcard-wellington') },
  'encore':        { id: 'encore', timeline: 'victorian', name: 'Encore! Encore!', trigger: { kind: 'firstWithCrowd', place: 'tuppenny', n: 3 }, see: 'The curtain falls; the crowd shouts for more; a bed leg gives way.', punchline: 'Two shows nightly. Three, under protest.', art: art('victorian', 'postcard-encore') },
  'stern-word':    { id: 'stern-word', timeline: 'victorian', name: 'Detention, Mayfair', title: 'Detention, {where}', trigger: { kind: 'kinkWin', gent: 'plunkett' }, see: 'A door slams; a gentleman says "Oh!" in three keys; a ruler snaps.', punchline: 'He\'s been sent to bed with no supper. He has asked to be sent again tomorrow.', punchlines: ['He\'s been sent to bed with no supper. He has asked to be sent again tomorrow.', 'He\'s written "I must not" two hundred times. He\'d like to know what comes next.', 'He was sent to stand in the corner. He\'s still there, admiring the wallpaper.'], art: art('victorian', 'postcard-stern-word') },
  'fair-cop':      { id: 'fair-cop', timeline: 'victorian', name: "It's a Fair Cop", trigger: { kind: 'kinkWin', gent: 'nobby' }, see: 'A police whistle; running boots; a helmet rolls out from under the door.', punchline: '"I\'ll come quietly," he said. He did not.', punchlines: ['"I\'ll come quietly," he said. He did not.', 'The desk sergeant writes it up as "resisting, briefly".'], art: art('victorian', 'postcard-fair-cop') },
  'golden-spike':  { id: 'golden-spike', timeline: 'wildwest', name: 'The Golden Spike Ceremony', trigger: { kind: 'kinkWin', gent: 'vanderbucks' }, see: 'Bunting, a ribbon cut, a steam whistle, a locomotive enters a tunnel; the brass band loses its place.', punchline: 'The line is open. The shareholders are delighted.', punchlines: ['The line is open. The shareholders are delighted.', 'Dividends are up. So, briefly, was the board.'], art: art('wildwest', 'postcard-golden-spike') },
  'prairie':       { id: 'prairie', timeline: 'wildwest', name: 'The Prairie Schooner, Fully Laden', trigger: { kind: 'kinkWin', gent: 'rusty' }, see: 'Saloon doors swing; a lasso flies out; a distant "yee-haw"; a long creak of timber.', punchline: 'The wagon got to Kansas without the horse.', punchlines: ['The wagon got to Kansas without the horse.', 'The town council wants that wagon oiled.'], art: art('wildwest', 'postcard-prairie') },
  'jingle':        { id: 'jingle', timeline: 'wildwest', name: 'Jingle All the Way', trigger: { kind: 'kinkWin', gent: 'hank' }, see: 'A rhythmic jingling through the wall; the bartender keeps time with a spoon; a cuckoo clock gives up.', punchline: 'The sheriff comes round to complain and stays for the chorus.', punchlines: ['The sheriff comes round to complain and stays for the chorus.', 'The blacksmith next door caught the rhythm and finished three horseshoes.'], art: art('wildwest', 'postcard-jingle') },
  'thank-you':     { id: 'thank-you', timeline: 'vegas', name: 'Thank You, Thank You Very Much', trigger: { kind: 'kinkWin', gent: 'gaz' }, see: 'A white cape flies over the curtain; a stick-on sideburn hits the lampshade; a voice: "Elvis has left the building".', punchline: 'He leaves humming "Burning Love", which the hotel doctor writes down as a symptom.', punchlines: ['He leaves humming "Burning Love", which the hotel doctor writes down as a symptom.', 'He\'s already booked the same suite for next year\'s stag do.'], art: art('vegas', 'postcard-thank-you') },
  'hit-me':        { id: 'hit-me', timeline: 'vegas', name: 'Hit Me', trigger: { kind: 'kinkWin', gent: 'slots' }, see: 'A hand taps green felt; a card flips; jackpot bells; coins roll out under the door.', punchline: 'The house always wins. Tonight, the house was her.', punchlines: ['The house always wins. Tonight, the house was her.', 'The pit boss pins her photo up with the banned list. Then he takes it home.'], art: art('vegas', 'postcard-hit-me') },
  'margin-call':   { id: 'margin-call', timeline: 'vegas', name: 'Margin Call', trigger: { kind: 'kinkWin', gent: 'brayden' }, see: 'A shredder whirs; a gold card goes in; a grown man sobs with joy; the butler pours a brandy.', punchline: 'His portfolio is down 11%. Best quarter he\'s ever had.', punchlines: ['His portfolio is down 11%. Best quarter he\'s ever had.', 'He feeds the shredder his backup card. Then his backup backup card.'], art: art('vegas', 'postcard-margin-call') },
};

// Generic collectible postcards found by Rummaging (3 per Timeline).
export const POSTCARDS = {
  victorian: [
    { id: 'pc-v-bathing', name: 'Bathing Machine, Margate', caption: '"Wish you were here. Wish I had my other bloomers."', art: art('victorian', 'postcard-bathing') },
    { id: 'pc-v-piano', name: 'The Piano Legs', caption: '"Lord P. has dressed the furniture again."', art: art('victorian', 'postcard-piano') },
    { id: 'pc-v-gaslight', name: 'By Gaslight', caption: '"Having a lovely time. Lost my gloves, my hat and my reputation."', art: art('victorian', 'postcard-gaslight') },
  ],
  wildwest: [
    { id: 'pc-w-wanted', name: 'Wanted: For Being Too Handsome', caption: '"Reward: one kiss. Paid in instalments."', art: art('wildwest', 'postcard-wanted') },
    { id: 'pc-w-bathhouse', name: 'Saturday at the Bathhouse', caption: '"Hank went in. Hank came out. The water did not."', art: art('wildwest', 'postcard-bathhouse') },
    { id: 'pc-w-sunset', name: 'Riding Off Into the Sunset', caption: '"He forgot his trousers. I kept them as a souvenir."', art: art('wildwest', 'postcard-sunset') },
  ],
  vegas: [
    { id: 'pc-l-chapel', name: 'Greetings from the Chapel', caption: '"Wish you were here. Can\'t remember if I was."', art: art('vegas', 'postcard-chapel') },
    { id: 'pc-l-flamingo', name: 'Flamingo Down', caption: '"The flamingo didn\'t make it. Neither did my eyebrows."', art: art('vegas', 'postcard-flamingo') },
    { id: 'pc-l-sign', name: 'Welcome to Fabulous', caption: '"Lost: dignity. Found: a hundred bucks and a wedding ring."', art: art('vegas', 'postcard-sign') },
  ],
};

// Hook collectibles (cosmetic)
export const COLLECTIBLES = {
  'siding': { id: 'siding', name: 'Your Own Railway Siding', caption: 'Mr Vanderbucks has named a siding after you. It is, he says, very long.' },
  'horse': { id: 'horse', name: 'A Stolen Horse', caption: 'Rusty stole you a horse. It follows you around and won\'t say whose it was.' },
  'odd-coin': { id: 'odd-coin', name: 'A Coin Nobody Has Heard Of', caption: 'Brayden tipped you in $SAUCE. It\'s worth whatever his last post says.' },
  'front-page': { id: 'front-page', name: 'The Front Page', caption: 'Your portrait, above the fold, framed. A preacher called it a disgrace and bought six copies.' },
  // round 5, finding 2: the High Road's twin of the Front Page (Standing 10)
  'society-pages': { id: 'society-pages', name: 'The Society Pages, Framed', caption: 'Seated between a bishop\'s niece and a minor duchess, and the only one of the three looking at the camera.' },
};

// ---------------------------------------------------------------------------
// The Ladder (round 5, finding 1): lodgings and finery bought with Coin, one ladder per Road and Timeline. Cosmetic: each
// rung shows on her portrait (a prop and a caption), on her win picture and on her profile. cost in Coin; four rungs.
// `prop` is the short noun the win picture's caption uses ("...from her new carriage").
// ---------------------------------------------------------------------------
export const DIGS = {
  victorian: {
    standing: [
      { id: 'gown', cost: 8, name: 'A Gown from Worth', prop: 'Worth gown', line: 'Paris silk, cut by the man who dresses empresses. She can sit down in it, just.' },
      { id: 'carriage', cost: 20, name: 'A Carriage and Pair', prop: 'carriage', line: 'Two grey horses and a coachman who knows not to look back.' },
      { id: 'opera-box', cost: 40, name: 'A Box at Covent Garden', prop: 'opera box', line: 'She watches the stage. The stalls watch her.' },
      { id: 'villa', cost: 80, name: "A Villa in St John's Wood", prop: 'villa', line: 'Detached, discreet, and paid for by three gentlemen who must never meet on the stairs.' },
    ],
    notoriety: [
      { id: 'room', cost: 8, name: 'A Room over the Pie Shop', prop: 'room over the pie shop', line: 'One bed, one window, and the smell of mutton until midnight.' },
      { id: 'parlour', cost: 20, name: 'A Parlour with a Piano', prop: 'parlour', line: 'She can\'t play it. The customers pay to lean on it.' },
      { id: 'elephants', cost: 40, name: "The Forty Elephants' Protection", prop: 'Forty Elephants', line: 'The Elephant and Castle\'s shoplifting girls look out for her. Her hats are suddenly excellent.' },
      { id: 'red-lamp', cost: 80, name: 'A House of Her Own in Wapping', prop: 'house in Wapping', line: 'A red lamp, a brass knocker, and a landlord who now calls her ma\'am.' },
    ],
  },
  wildwest: {
    standing: [
      { id: 'gown', cost: 8, name: 'A Gown from Back East', prop: 'Philadelphia gown', line: 'Shipped from Philadelphia in a crate. Half the town came to watch it unpacked.' },
      { id: 'buggy', cost: 20, name: 'A Buggy with Yellow Wheels', prop: 'yellow buggy', line: 'The only yellow thing in Lower Bottoms apart from the teeth.' },
      { id: 'opera-box', cost: 40, name: 'A Box at the Opera House', prop: 'opera box', line: 'Lower Bottoms has an opera house now. One opera so far, and she was the best thing in it.' },
      { id: 'brick-house', cost: 80, name: 'A Brick House on Upper Main', prop: 'brick house', line: 'The only brick in the Territory. Cowboys tip their hats to it on the way past.' },
    ],
    notoriety: [
      { id: 'crib', cost: 8, name: 'A Crib on the Row', prop: 'crib on the Row', line: 'Two yards wide, one lantern, and a door that knows every knock.' },
      { id: 'back-room', cost: 20, name: 'The Back Room at the Saloon', prop: 'back room', line: 'Right behind the piano, which the pianist plays louder whenever the door shuts.' },
      { id: 'hired-guns', cost: 40, name: 'A Pair of Hired Guns', prop: 'hired guns', line: 'Twin brothers with one brain between them. They take turns.' },
      { id: 'hog-ranch', cost: 80, name: 'A Hog Ranch of Her Own', prop: 'hog ranch', line: 'The goat that eats the bunting is now on the payroll.' },
    ],
  },
  vegas: {
    standing: [
      { id: 'gown', cost: 8, name: 'A Gown from a Strip Boutique', prop: 'boutique gown', line: 'It comes with its own bodyguard, who walks two steps behind the hem.' },
      { id: 'limo', cost: 20, name: 'A White Stretch Limousine', prop: 'stretch limo', line: 'Forty feet long. Every corner is a twelve-point turn.' },
      { id: 'residency', cost: 40, name: 'A Booth at the Residency', prop: 'residency booth', line: 'Front row for the headliner. The headliner keeps checking she\'s having fun.' },
      { id: 'villa', cost: 80, name: 'A Villa on the Golf Course', prop: 'golf-course villa', line: 'Eighteen holes. She\'s never played one.' },
    ],
    notoriety: [
      { id: 'weekly', cost: 8, name: 'A Motel Room by the Week', prop: 'motel room', line: 'A microwave, a view of the parking lot, and a door that locks if you lean on it.' },
      { id: 'hot-tub', cost: 20, name: 'A Suite with a Hot Tub', prop: 'hot-tub suite', line: 'Shaped like a champagne glass, and about as warm.' },
      { id: 'tiny', cost: 40, name: 'A Bouncer Called Tiny', prop: 'Tiny', line: 'Six foot eight, collects porcelain thimbles, and ends any conversation by standing up.' },
      { id: 'neon', cost: 80, name: 'Her Name in Pink Neon', prop: 'neon sign', line: 'Forty feet high over the Off-Strip, with every single letter working.' },
    ],
  },
};

// Renown milestones between Rare and Epic (round 5, finding 2): an era sub-title worn under her title. Invented, in each
// era's voice (the tier titles stay the verified period terms). Keyed by RULES.milestones.
export const ERA_MILESTONES = {
  victorian: { 100: { standing: 'the toast of the Strand', notoriety: 'the talk of the Ratcliff Highway' }, 200: { standing: 'a fixture at Ascot', notoriety: 'well known to Scotland Yard' } },
  wildwest: { 100: { standing: 'the belle of Main Street', notoriety: 'the terror of the Row' }, 200: { standing: 'the toast of the Territory', notoriety: 'on a poster in three counties' } },
  vegas: { 100: { standing: 'on the VIP list', notoriety: 'known to Metro Vice' }, 200: { standing: 'residency material', notoriety: 'an Off-Strip landmark' } },
};

// A lucky Secret Taste (round 5, finding 7): the first time she ticks a gentleman's hidden Taste by accident, a short gag
// prints with the "Happy accident" clip, so a lazy player sees some of the comedy too. One line per gentleman.
export const LUCKY = {
  plunkett: 'He undoes his top button. His party calls an emergency meeting.',
  alfie: 'He buys her a jellied eel. In Cheapside, that\'s practically a proposal.',
  nobby: 'He gives her a wink and her own purse back, with interest.',
  vanderbucks: 'He checks his pocket watch, then forgets about it. First time since 1861.',
  hank: 'He takes his hat off indoors. The saloon falls silent.',
  rusty: 'He pays with a five-dollar note that is, for once, his own.',
  brayden: 'He puts his phone face down and listens. For ten whole seconds.',
  gaz: 'He texts the lads that he\'s staying in tonight. They assume he\'s been kidnapped.',
  slots: 'He stops counting. Even the dealer looks worried.',
};

// ---------------------------------------------------------------------------
// Gossip lines (district gossip events, one per Curtain per Timeline)
// ---------------------------------------------------------------------------
export const GOSSIP = {
  victorian: [
    'Lord P. raises the length of ladies\' skirts in Parliament. Twice.',
    "Pearly King's buttons now outnumber his debts.",
    "A cane has gone missing from the Whips' Office. The Chief Whip is said to be 'livid, and oddly flattered'.",
    'The Tuppenny Palace chairman has broken his third gavel this week. Ask him how and he goes red.',
    'Fog so thick on Saturday night that two gentlemen proposed to the wrong lady. Both said yes.',
    'The Drowned Rat\'s landlord denies watering the gin. Regulars say it\'s mostly Thames.',
    'A Pearly Queen\'s bonnet is missing from Cheapside. Police are following a trail of buttons.',
    'Mrs Featherstonehaugh denies the Salon is a house of ill repute. She says it\'s a house of very good repute.',
    'The Peelers raid the Drowned Rat and arrest the landlord, the gin and a parrot that knew too much.',
    'An MP is seen leaving Lambeth at dawn. He says he was inspecting the drains.',
    'Ladies\' bicycles go on sale in Oxford Street. Several gentlemen have taken up cycling to watch.',
    'Cabbies now park outside the Salon all night. Not one of them is waiting for a fare.',
  ],
  wildwest: [
    'Railroad baron extends his line again, as far as the widow Pettigrew\'s back gate.',
    'Hank McGraw shoots the town clock for running fast. It now runs slow.',
    'Temperance automaton spotted humming a saloon tune. League calls an emergency tea.',
    'The Sheriff\'s wanted posters have run out of ink. Outlaws are asked to call in and describe themselves.',
    'A goat at Hog Ranch Row has been elected sheriff. Turnout was low.',
    'Rusty Colt seen paying for a horse. The town assumes it\'s a disguise.',
    'The Velvet Spur\'s madam has bought a second shotgun. "For the ledger," she says.',
    'The stage from Cheyenne arrives with one passenger, four trunks and no driver. The passenger isn\'t talking.',
    'The Temperance League meets at the Last Chance. Attendance excellent; the bar takes ninety dollars.',
    'A travelling dentist sets up on Main Street. Most patients ask for gold.',
    'The Marshal\'s raid on Hog Ranch Row nets two horse thieves, a banjo and the Marshal\'s own brother.',
    'Railroad surveyors measure Lower Bottoms for a station. Lower Bottoms is flattered.',
  ],
  vegas: [
    'Crypto whale loses fortune, finds it, loses it again before lunch.',
    'An inflatable flamingo is banned from the Day Club for conduct unbecoming a pool toy.',
    "Motel Paradiso's ice machine works. Management investigating.",
    'Two Elvis impersonators arrested after a fight over a parking space. Both thanked the officers very much.',
    '"Slots" McGee banned from a fifteenth casino. He\'s never even been inside.',
    'Brass Bettie seen taking a token from a retiree. His bingo club wants her number.',
    'A penthouse butler retires after nine years of "seeing nothing". He\'s launching a podcast.',
    'The Day Club lifeguard rescues the same man from the lazy river for the fourth time this week.',
    'Motel Paradiso now advertises "free breakfast". The breakfast is a vending machine.',
    'The Fremont Street zip line now carries a Liberace impersonator twice an hour, whether he likes it or not.',
    'Tech bro buys a casino to win his money back. Loses the casino.',
    'Brass Bettie fails her annual safety inspection. The inspector has booked another for Friday.',
  ],
};

// ---------------------------------------------------------------------------
// While You Were Away: base weights and gossip-sheet templates
// Placeholders: {whore} {rival} {gent} {place} {n} {renown} {title} {timeline} {seat} {list} {affliction}
// ---------------------------------------------------------------------------
export const DIGEST = {
  weights: {
    'seat-challenged': 100, 'seat-won': 100, 'seat-lost': 100, 'seat-defended': 100, 'seat-repelled': 100, 'seat-missed': 100,
    'seat-challenging': 45, 'seat-bid': 45, // your own challenge, still pending: a reminder, not news
    'promoted': 90, 'timeline-unlocked': 90,
    'standing-order': 70,
    'curtain-result': 75, // your sealed plan's Curtain fell while you were in another Timeline
    'overtaken': 60,
    'rival-delighted-regular': 50,
    'rota-fancy': 45, 'fresh-stall-kink': 45,
    'raid': 40,
    'habit-changed': 35,
    'caught-from-yours': 30,
    'paper': 80, // she changed papers while you were away
    'gossip': 15, 'gag': 15, 'front-page': 15, 'society-pages': 15, 'milestone': 80, 'patron': 20,
    // awayDigest opts.tonight (synthesized, about you): last call, then tonight's matchup (raised by his novelty or a Regular)
    'last-call': 85, 'tonight-kink': 70, 'tonight-regular': 50, 'tonight': 35,
  },
  // round 6 (finding 17): each era's own punchline for the shared templates that end on {eratail}, and for CROWNED events.
  // The Front Page collectible tells the 'disapprover secretly buys copies' joke, so the digest line tells a different one.
  eraTails: {
    'seat-won': { victorian: 'Hat shops report record sales.', wildwest: 'The saloon hangs her garter where the moose head used to be.', vegas: 'A casino names a cocktail after her. It comes with an umbrella and a lawyer.' },
    'front-page': { victorian: 'The vicar has preached against her twice. Attendance is up.', wildwest: 'The marshal pins her picture next to the WANTED posters. Half the town wants her too.', vegas: 'Her face is on a billboard on the Strip. Three drivers have rear-ended the same limousine.' },
    'milestone': { victorian: 'Her laundress has put up her prices.', wildwest: 'The general store has started giving her credit.', vegas: 'Her stylist just raised her prices.' },
  },
  crowned: { victorian: 'Hats thrown; one landed on a bishop.', wildwest: 'Hats thrown; one landed on a horse, which kept it.', vegas: 'Chips thrown; the pit boss is still counting them.' },
  templates: {
    'seat-challenged': 'SEAT UNDER SIEGE: {rival} demands {whore}\'s chair. Pistols at the next Curtain.',
    'seat-won': 'CROWNED: {whore} takes {seat}. {eratail}',
    'seat-lost': 'TOPPLED: {whore} loses {seat} to {rival}. The chair is still warm.',
    'seat-defended': 'STILL IN THE CHAIR: {whore} keeps {seat}. {rival} is shown the door, politely.',
    'seat-challenging': 'GAUNTLET THROWN: {whore} has called out {rival} for {seat}. Handbags at dawn.',
    'seat-bid': 'BOLD AS BRASS: {whore} has put in a bid for the empty {seat}. Decided at the next Curtain.',
    'seat-repelled': 'SENT PACKING: {rival} keeps {seat}. {whore} keeps her dignity, mostly.',
    'seat-missed': 'NOT TONIGHT: {whore} missed the empty {seat}. It\'s still up for grabs.',
    'promoted': 'RISING STAR: {whore} is now a {title}. She\'s had cards printed.',
    'timeline-unlocked': 'TELEGRAM: {timeline} wants you. Pack something lacy.',
    'curtain-result': 'CURTAIN CALL: {whore} {placing} at {place} while you were out. {tail}',
    'standing-order': 'WHILE YOU SLEPT: {whore} went out without you {times}: {list}. +{renown} Renown.',
    'standing-order-after': 'AFTER HOURS: {whore} went out without you {times}. Door gift only; the Renown had gone to bed.',
    'standing-order-none': 'WHILE YOU SLEPT: {whore} went out without you {times}: {list}. Nothing to show for it but the door gift.',
    'overtaken': 'PIPPED: {rival} edges past {whore} on the {timeline} table. Elbows were involved.',
    'rival-delighted-regular': 'POACHER ABOUT: {rival} left {gent} grinning ear to ear. Wasn\'t he yours?',
    'rota-fancy': 'ON THE ROTA: {gent} hosts {place} at Curtain No. {curtain}. He\'s got a thing for girls like you.',
    'fresh-stall-kink': 'NEW AT THE STALLS: something for {gent} at the back door of {place}. You know the thing.',
    'raid': 'RAID NIGHT: {raidSquad} descend on {place}. Renown halved; Coin, curiously, unaffected.',
    'habit-changed': 'CHANGE OF HABIT: {rival} has been spotted at {place}. Watch your back.',
    'caught-from-yours': 'GET WELL SOON: {rival} caught {affliction} off {gent}. Weren\'t you just with him?',
    'gossip': '{text}',
    'gag': 'OVERHEARD: {text}',
    'gag-many': 'OVERHEARD: {n} ladies had wild nights ({list}). The night porter wants danger money.',
    'front-page': 'FRONT PAGE: {whore} is the talk of {timeline}. {eratail}',
    'society-pages': 'SOCIETY PAGES: {whore} is snapped at a charity lunch in {timeline}. The other guests are hiding their husbands.',
    'milestone': 'MAKING A NAME: {whore} is now {title}. {eratail}',
    'patron': 'A PATRON CALLS: an envelope for {whore} with {n} Coin in it. No name. No questions.',
    'paper-gazette': 'IN THE GAZETTE: {whore} is in the Police Gazette now. Her nights did it.',
    'paper-society': 'BACK IN SOCIETY: {whore} is back in the Society Pages. The hostesses act as if she never left.',
    'nothing': 'Nothing stirred. Even the cat was bored.',
    'tonight': 'TONIGHT: {gent} at {place}. {mood} {extra}{when}',
    'last-call': 'LAST CALL: {whore} is due on stage. {gent} at {place}: {mood} {extra}{when}',
  },
  // the headline when a Timeline sends for you: one per Timeline (B-arcade finding 7)
  telegrams: {
    victorian: 'TELEGRAM: Victorian London wants you. Pack gloves, a fan and a believable aunt.',
    wildwest: 'TELEGRAM: The Wild West wants you. Pack soap. The gentlemen have not.',
    vegas: 'TEXT MESSAGE: Las Vegas wants you. Pack sunglasses, sunscreen and an alibi.',
  },
  // the rota tip rotates through these so it never reads the same twice running
  rotaTemplates: [
    'ON THE ROTA: {gent} hosts {place} at Curtain No. {curtain}. He\'s got a thing for girls like you.',
    'DIARY DATE: Curtain No. {curtain}, {place}. {gent} hosting, and he\'s weak at the knees for your type.',
    'A LITTLE BIRD SAYS: {gent} will be at {place} for Curtain No. {curtain}. Wear something he can\'t refuse.',
    'HOLD THE DATE: {place}, Curtain No. {curtain}. Host: {gent}. Weakness: you, roughly.',
  ],
  details: {
    'curtain-result': 'You sealed your plan and played elsewhere, so the Curtain fell without you. Go take your bow.',
    'standing-order': 'Your Standing Order played Best Guess at your usual Place while you were away. Door gifts paid either way.',
    'raid': 'Raid Night halves the Renown shares at the Gutter Place. The rota shows the next one three Curtains ahead.',
    'rota-fancy': 'His Fancy is your Type: +2 Sway the moment you walk in.',
    'tonight': 'Your best Place for the next Curtain, based on what you can see (and what\'s in your reticule).',
    'last-call': 'The District clock waits while you\'re at last call. Seal her plan, or her Standing Order goes where the smileys are.',
  },
};

// ---------------------------------------------------------------------------
// Short UI lines (onboarding, pops). One line at a time; never a wall.
// ---------------------------------------------------------------------------
export const LINES = {
  signup: 'A lady never shares her password. Or her age.',
  firstItch: 'Mind how you go.',
  firstStanding: 'The better doors swing open.',
  firstNotoriety: 'People are talking. Some of them are paying.',
  slumming: 'Go slumming? Notoriety +1, Standing -1.',
  postShut: '"Madam is not receiving." Posh doors need Standing 2 or more, and at least as much Standing as Notoriety.',
  postShutWhy: {
    standing: '"Madam is not receiving." Your Standing is below 2. Delight a Scrubbed gentleman in an Assignation to win it back.',
    notoriety: '"Madam is not receiving." Your Notoriety is higher than your Standing. Delight a Scrubbed gentleman to tip the seesaw back.',
  },
  shutsDoor: '{place} will shut its doors to you.',
  scrubbedRefuse: 'He\'s not at home. Not to you, anyway.',
  bestGuess: 'Best Guess picks the cards that score highest on what you can see.',
  seal: 'Sealed. You can change your mind until the Curtain falls.',
  // the Curtain clock in words (rules.js curtainWhen); 'due' prints as "last call!" or "when you're ready" (the page decides)
  curtainWhen: { later: 'later on', soon: 'soon', near: 'any minute now' },
  braveFace: 'Chin up. Brave Face: +1 Sway at your next Curtain.',
  afterHours: 'After Hours: Coin and door gifts only. Another Timeline is still open for business.',
  // round 5 (finding 20): "Not tonight, dear." belongs to a shut Posh door only (it echoes "Madam is not receiving")
  smileys: ['Slim pickings.', 'A long shot.', 'Promising.', 'Made for each other.'],
  notTonight: 'Not tonight, dear.',
  // a first Gutter visit is capped at 1 smiley because of what it costs (the meters), not because it is hard: say so (B-arcade finding 6)
  gutterCap: 'Easy pickings, but people will talk.',
  afterHoursPlace: 'After Hours: Coin only.',
  toBed: 'Everyone\'s spent for tonight. Off to bed: dawn brings three fresh Curtains each.',
  tourist: { victorian: 'A lost cowboy stumbles out of the music hall.', wildwest: 'A sunburnt man in an inflatable cowboy hat photographs the hitching post.', vegas: 'A gentleman in a bowler hat blinks at the neon.' },
};
