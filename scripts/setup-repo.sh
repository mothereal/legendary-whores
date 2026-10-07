#!/bin/sh
# setup-repo.sh: one-time local setup for the public Legendary Whores repo.
# - sets the REPO-LOCAL git identity (the machine's global identity is never used here)
# - stops git from guessing an identity from the hostname
# - installs the hooks in scripts/hooks via core.hooksPath
# - creates an empty, gitignored .private-denylist for you to fill in
# Prints every step. Makes no network calls and changes nothing outside this repository.
set -eu

NAME="mothereal"
EMAIL="180792623+mothereal@users.noreply.github.com"

say() { printf 'setup-repo: %s\n' "$*"; }
run() { printf 'setup-repo: $ %s\n' "$*"; "$@"; }

ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "setup-repo: run this inside the repository." >&2; exit 1; }
cd "$ROOT"
say "repository root: $ROOT"

for f in scripts/scan-public.mjs scripts/hooks/pre-commit scripts/hooks/pre-push .gitignore; do
  [ -f "$f" ] || { echo "setup-repo: missing $f, aborting." >&2; exit 1; }
done
command -v node >/dev/null 2>&1 || { echo "setup-repo: node is required by the hooks; install Node 20+ first." >&2; exit 1; }

say "1/5 repo-local identity"
run git config --local user.name "$NAME"
run git config --local user.email "$EMAIL"
run git config --local user.useConfigOnly true

say "2/5 hooks"
run chmod +x scripts/hooks/pre-commit scripts/hooks/pre-push scripts/scan-public.mjs
run git config --local core.hooksPath scripts/hooks

say "3/5 private deny-list (.private-denylist, gitignored, never committed)"
if ! git check-ignore -q .private-denylist; then
  echo "setup-repo: .gitignore does not ignore .private-denylist; fix that first." >&2
  exit 1
fi
if [ -f .private-denylist ]; then
  say "    .private-denylist already exists ($(grep -cvE '^[[:space:]]*(#|$)' .private-denylist || true) term(s)); left unchanged"
else
  umask 077
  cat > .private-denylist <<'EOF'
# One private word per line: real names, personal handles, personal email addresses,
# private hostnames, your own IP addresses. Whole-word, case-insensitive. This file is gitignored.
# The scanner never prints what it matched.
EOF
  say "    created .private-denylist (empty). Add your private words before the first push;"
  say "    the pre-push hook refuses to run without at least one term."
fi

say "4/5 checks"
say "    identity the next commit will use:"
if node scripts/scan-public.mjs --identity 2>/dev/null; then
  say "    identity OK"
else
  say "    WARNING: identity mismatch. Unset GIT_AUTHOR_*/GIT_COMMITTER_* variables in your shell."
fi
say "    global identity is untouched; this repo overrides it locally."

say "5/5 first-push gate"
COMMON_DIR=$(cd "$(git rev-parse --git-common-dir)" && pwd)
if [ -f "$COMMON_DIR/lw-email-privacy-confirmed" ]; then
  say "    email-privacy marker present: pushes are allowed (after the scans pass)."
else
  say "    email-privacy marker absent: every push is refused until you confirm on GitHub"
  say "    (Settings -> Emails: 'Keep my email addresses private' and"
  say "    'Block command line pushes that expose my email') and then run:"
  say "    touch \"$COMMON_DIR/lw-email-privacy-confirmed\""
fi
say "done. Note: --no-verify skips hooks locally; CI runs the same scanner on every push and PR."
