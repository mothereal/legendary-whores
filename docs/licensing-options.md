# Licensing options (for the designer to choose; nothing is chosen here)

The repo holds two different kinds of work, and they are usually licensed separately:

1. **Code**: `engine/`, `game/`, `scripts/`.
2. **Content**: `art-assets/`, the writing in `engine/content.js` (names, jokes, flavour text),
   and `docs/`.

Until a `LICENSE` file is added, the default is **all rights reserved**: people can read the code
on GitHub but may not reuse it.

## Code: the main options

| Licence | What others may do | What it means for a hosted game |
|---|---|---|
| **MIT** | Almost anything, including closed-source commercial reuse, as long as they keep the notice. | Someone can run a modified copy of the game as their own site and keep their changes private. Simplest and most familiar. |
| **Apache-2.0** | Like MIT, plus an explicit patent grant and a rule to state changes. | Same freedom as MIT, with clearer legal terms. A common choice for companies. |
| **AGPL-3.0** | Reuse and modify, but anyone who runs a modified version **as a network service** must publish their source under AGPL. | The only common licence that closes the "host it without sharing" gap. Copycat servers must stay open. It puts off some commercial reusers, which may suit you. |
| **All rights reserved** (no licence file) | Read only. Forks on GitHub are allowed by GitHub's terms, but nothing else is. | Most control, least community contribution. You can relax it later; you can't easily tighten a licence once it's granted. |

## Content and art: the main options

| Licence | Meaning |
|---|---|
| **All rights reserved** | Art and writing stay yours; others can't reuse them. Common for games even when the code is open (the "open engine, closed assets" model). |
| **CC BY-NC-SA 4.0** | Others may remix for non-commercial use, with credit, under the same terms. |
| **CC BY 4.0** | Any reuse with credit, including commercial. |

AI-generated art: in several jurisdictions, purely machine-generated images may not be protected by
copyright at all. This affects how much a restrictive art licence can actually enforce. Take advice
if it matters.

## The name

"Legendary Whores" and the logo are a **trademark** question, separate from copyright. None of the
licences above grants rights to the name. Add a short trademark note to the README if you want
forks to rename themselves.

## A common combination (an example, not a recommendation)

AGPL-3.0 or MIT for the code, all rights reserved for art and writing, plus a trademark note
for the name. Decide, then add `LICENSE` (code) and a `LICENSE-ASSETS` or `art-assets/LICENSE`
(content), and update the README's Licence section.
