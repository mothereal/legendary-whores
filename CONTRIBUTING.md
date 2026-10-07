# Contributing

Thanks for looking. Legendary Whores is a small, designer-led game, so please **open an issue
before you write a pull request**. Ideas are welcome, but the designer decides what goes in, and
some ideas are deliberately parked (see `docs/gdd/06-roadmap.md`).

## Ground rules for content

- Heat level: saucy postcard. Implied, never explicit. No nudity in art or words.
- Every character is clearly an adult.
- Jokes target the trade, the era and the punters, never ethnicity or religion.
- Real historical victims and real violence are never punchlines.

## Ground rules for code

- `engine/` is plain ES modules with no dependencies. Actions are pure (state in, new state out),
  whole numbers only, and randomness comes only from the seeded RNG.
- Balance numbers live in `engine/content.js`; the rules live in `docs/rules-core.md`. Change both
  together.
- Before opening a PR, run `node engine/test.mjs` and `node engine/sim.mjs --quick`. CI runs both,
  and a PR that breaks a balance target won't be merged unless the target itself is the thing
  being changed, on purpose.
- Adding a dependency needs a very good reason. If you add one, commit its lockfile, and use a
  release at least 7 days old.

## Privacy checks apply to you too

CI scans every commit for secrets, home-directory paths, non-documentation IP addresses and email
addresses. Commit with your GitHub **noreply** address (GitHub → Settings → Emails → "Keep my
email addresses private"), or the privacy check will fail your PR. Never paste real IPs,
hostnames or credentials into code, docs, issues or logs.

## Security issues

Don't open a public issue. Use private vulnerability reporting: see [SECURITY.md](SECURITY.md).
