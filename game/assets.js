// The Scandal Sheet · art list (written by make-assets.mjs from the files in art-assets/<era>/; do not hand-edit,
// re-run `node game/make-assets.mjs` after every art batch). EXISTS: every painted file on disk. STANDINS: a painting
// that is still missing, and the painted file to show instead (pos: object-position for face crops).
export const EXISTS = new Set(["victorian/affliction-lodgers.webp","victorian/affliction-wobbles.webp","victorian/agatha.webp","victorian/bess.webp","victorian/card-anonymous-verse.webp","victorian/card-come-hither.webp","victorian/card-mothers-advice.webp","victorian/card-peek-a-boo-fan.webp","victorian/card-saucy-quip.webp","victorian/card-saucy-wink.webp","victorian/card-teeth-extra.webp","victorian/dolly--caught.webp","victorian/dolly--pleased.webp","victorian/dolly--wink.webp","victorian/dolly--won.webp","victorian/dolly.webp","victorian/gent-alfie.webp","victorian/gent-nobby.webp","victorian/gent-plunkett.webp","victorian/item-bonnet.webp","victorian/item-cane.webp","victorian/item-helmet.webp","victorian/item-wand.webp","victorian/lavinia--caught.webp","victorian/lavinia--disdain.webp","victorian/lavinia--pleased.webp","victorian/lavinia--scheme.webp","victorian/lavinia.webp","victorian/lottie.webp","victorian/place-drowned-rat.webp","victorian/place-salon.webp","victorian/place-tuppenny.webp","victorian/polly.webp","victorian/postcard-encore.webp","victorian/postcard-fair-cop.webp","victorian/postcard-gaslight.webp","victorian/postcard-stern-word.webp","victorian/postcard-wellington.webp","victorian/skin-bg.webp","victorian/skin-card.webp","victorian/skin-curtain.webp","victorian/skin-divider.webp","victorian/skin-frame.webp","victorian/tourist-tex.webp","wildwest/affliction-drip.webp","wildwest/affliction-saddle-sores.webp","wildwest/card-ace-up-garter.webp","wildwest/card-ambitious-corset.webp","wildwest/card-come-hither.webp","wildwest/card-mothers-advice.webp","wildwest/card-peek-a-boo-fan.webp","wildwest/card-poker-face.webp","wildwest/card-saucy-quip.webp","wildwest/card-saucy-wink.webp","wildwest/card-teeth-extra.webp","wildwest/clementine--wink.webp","wildwest/clementine.webp","wildwest/dusty.webp","wildwest/fanny--caught.webp","wildwest/fanny--eyebrow.webp","wildwest/fanny--pleased.webp","wildwest/fanny--won.webp","wildwest/fanny.webp","wildwest/gent-hank.webp","wildwest/gent-rusty.webp","wildwest/gent-vanderbucks.webp","wildwest/item-lambskin.webp","wildwest/item-lasso.webp","wildwest/item-spike.webp","wildwest/item-spurs.webp","wildwest/place-hog-ranch.webp","wildwest/place-last-chance.webp","wildwest/place-velvet-spur.webp","wildwest/postcard-golden-spike.webp","wildwest/postcard-jingle.webp","wildwest/postcard-prairie.webp","wildwest/prudence.webp","wildwest/rose.webp","wildwest/skin-bg.webp","wildwest/skin-card.webp","wildwest/skin-curtain.webp","wildwest/skin-frame.webp","wildwest/tourist-darren.webp","wildwest/widow.webp","wildwest/x-orn-divider.webp","wildwest/x-tex-wanted-paper.webp","wildwest/x-tex-woodtype-ink.webp","vegas/affliction-glitter-itch.webp","vegas/affliction-what-happens.webp","vegas/bettie.webp","vegas/candy.webp","vegas/card-come-hither.webp","vegas/card-mothers-advice.webp","vegas/card-peek-a-boo-fan.webp","vegas/card-saucy-quip.webp","vegas/card-saucy-wink.webp","vegas/card-teeth-extra.webp","vegas/dee.webp","vegas/gent-brayden.webp","vegas/gent-gaz.webp","vegas/gent-slots.webp","vegas/item-dice.webp","vegas/item-egg.webp","vegas/item-jumpsuit.webp","vegas/item-shredder.webp","vegas/item-stopper.webp","vegas/ivy.webp","vegas/jackie--bubble.webp","vegas/jackie--surprise.webp","vegas/jackie--won.webp","vegas/jackie--yawn.webp","vegas/jackie.webp","vegas/krystal.webp","vegas/place-flamingo.webp","vegas/place-motel.webp","vegas/place-penthouse.webp","vegas/postcard-chapel.webp","vegas/postcard-flamingo.webp","vegas/postcard-hit-me.webp","vegas/postcard-margin-call.webp","vegas/postcard-sign.webp","vegas/postcard-thank-you.webp","vegas/skin-bg.webp","vegas/skin-card.webp","vegas/skin-curtain.webp","vegas/skin-frame.webp","vegas/tourist-pooter.webp"]);
export const STANDINS = {
 "victorian/dolly--blush.webp": {
  "use": "victorian/dolly.webp"
 },
 "victorian/postcard-bathing.webp": {
  "use": "victorian/postcard-gaslight.webp"
 },
 "victorian/postcard-piano.webp": {
  "use": "victorian/place-salon.webp"
 },
 "victorian/card-blush-curtsey.webp": {
  "use": "victorian/dolly.webp"
 },
 "victorian/card-strict-governess.webp": {
  "use": "victorian/item-cane.webp"
 },
 "victorian/card-limerick.webp": {
  "use": "victorian/card-anonymous-verse.webp"
 },
 "victorian/card-pick-his-pocket.webp": {
  "use": "victorian/item-helmet.webp"
 },
 "victorian/card-wheelbarrow.webp": {
  "use": "victorian/postcard-wellington.webp"
 },
 "wildwest/fanny--poker.webp": {
  "use": "wildwest/fanny.webp",
  "pos": "50% 24%"
 },
 "wildwest/clementine--prim.webp": {
  "use": "wildwest/clementine.webp",
  "pos": "40% 20%"
 },
 "wildwest/clementine--pleased.webp": {
  "use": "wildwest/clementine.webp",
  "pos": "40% 20%"
 },
 "wildwest/clementine--shocked.webp": {
  "use": "wildwest/clementine.webp",
  "pos": "40% 20%"
 },
 "wildwest/postcard-wanted.webp": {
  "use": "wildwest/gent-rusty.webp",
  "pos": "52% 24%"
 },
 "wildwest/postcard-bathhouse.webp": {
  "use": "wildwest/gent-hank.webp",
  "pos": "48% 20%"
 },
 "wildwest/postcard-sunset.webp": {
  "use": "wildwest/place-hog-ranch.webp"
 },
 "wildwest/card-drinks-on-house.webp": {
  "use": "wildwest/place-last-chance.webp"
 },
 "wildwest/card-bucking-bronco.webp": {
  "use": "wildwest/postcard-prairie.webp"
 },
 "wildwest/card-masked-stranger.webp": {
  "use": "wildwest/place-velvet-spur.webp"
 },
 "vegas/jackie--eyeroll.webp": {
  "use": "vegas/jackie.webp"
 },
 "vegas/bettie--showtime.webp": {
  "use": "vegas/bettie.webp"
 },
 "vegas/bettie--pleased.webp": {
  "use": "vegas/bettie.webp"
 },
 "vegas/bettie--caught.webp": {
  "use": "vegas/bettie.webp"
 },
 "vegas/bettie--wink.webp": {
  "use": "vegas/bettie.webp"
 },
 "vegas/card-been-there.webp": {
  "use": "vegas/jackie--bubble.webp"
 },
 "vegas/card-reverse-cowgirl.webp": {
  "use": "vegas/jackie--yawn.webp"
 },
 "vegas/card-bottle-service.webp": {
  "use": "vegas/place-flamingo.webp"
 },
 "vegas/card-sign-the-nda.webp": {
  "use": "vegas/place-penthouse.webp"
 },
 "vegas/card-body-glitter.webp": {
  "use": "vegas/postcard-flamingo.webp"
 },
 "vegas/card-chapel-quickie.webp": {
  "use": "vegas/postcard-chapel.webp"
 }
};
