// The Scandal Sheet · slice set-up shared by scandal.js and find-first-curtain.mjs (one source, so the replay checks
// exactly what the page plays).
// SEEDS: chosen by a search over the engine: the tourist can be Delighted, the fresh stall sells the Kink novelty of the
// host it sits behind, and the rival follows you into the first Curtain (scriptRival { curtains: 1 }).
export const SEEDS = { dolly: 'dolly-70', fanny: 'fanny-18', jackie: 'jackie-19' };
// STAGE: each era's rival at its first Curtain (engine opts.stageRivals; no RNG is used, so the seeds hold). Tuned with
// find-first-curtain.mjs so she lands between Best Guess (a paid 2nd) and the taught novelty path (a clear 1st), and she
// keeps her Upstage quiet that night (quietCurtains: 1).
export const STAGE = {
  lavinia: { quietCurtains: 1 }, // her own hand already scores 13 on Lord Plunkett: Best Guess 12, the Cane 15
  clementine: { hand: ['behind-the-fan', 'saucy-wink', 'drinks-on-house'], regular: { hank: 2 }, quietCurtains: 1 },
  bettie: { hand: ['counting-out-loud', 'saucy-wink', 'body-glitter'], regular: { gaz: 2 }, quietCurtains: 1 },
};
// salt (lever 1, variety): a per-game salt the engine folds into its RNG once the first Curtain 0 has fallen in full, so the
// scripted opening on the fixed SEEDS is kept and the rest of the game varies. Minted here when none is passed (the page
// never passes one; find-first-curtain passes 'x' so its replay is fixed).
export function gameOpts(id, name = 'Anonymous', salt = null) {
  const mint = () => (globalThis.crypto && globalThis.crypto.getRandomValues ? globalThis.crypto.getRandomValues(new Uint32Array(1))[0].toString(16) : String(Date.now()));
  return {
    scriptRival: { curtains: 1 }, scriptItch: true, starter: id, humans: [{ id: 'you', name }],
    salt: salt != null ? String(salt) : mint(),
    stageRivals: STAGE,
    // a minimum gap between Curtains (15 district minutes for the demo), and stand-ins who seal 30-90 minutes after you
    // from each Timeline's second Curtain on, so a whore waits for her Curtain and you play another meanwhile
    minGapMin: 15, standinSeal: { min: 30, max: 90, from: 1 },
    // the page saves the game on the phone after each action: keep the event log short (it trims old entries, no RNG)
    logLimit: 300,
  };
}
