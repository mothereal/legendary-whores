# Security policy

Legendary Whores is a browser game. The code is public on purpose: the server is meant to be safe
even when everyone can read it. If you find a way to break that, thank you, and please tell us
privately first.

## Reporting a vulnerability

Use GitHub's **private vulnerability reporting**: open the repository's **Security** tab and
choose **Report a vulnerability**. Only the maintainer sees the report.

Please do **not** open a public issue, pull request or discussion for a security problem, and
please don't post details elsewhere until a fix has shipped.

A useful report says:

- what is affected (the live site legendarywhores.com, the game client, the rules engine, or the
  repository and CI);
- how to reproduce it, step by step;
- what an attacker could gain (another player's account or progress, server control, data, etc.).

## What happens next

- We aim to acknowledge reports within 7 days and to agree a fix and disclosure date with you.
- Credit in the advisory is yours if you want it; tell us how you'd like to be named.
- This is a hobby project, so there is no bug bounty.

## Scope and ground rules

In scope: the live site and its API, the code in this repository, and the GitHub Actions
workflows.

Please test only against your own accounts, and stop as soon as you can show the problem. Do not:

- access, change or delete other players' data;
- run denial-of-service, load or brute-force tests against the live site;
- use social engineering or physical attacks;
- run automated scanners against the live site at high volume (the site sits behind Cloudflare
  rate limits, and you'll mostly be testing those).

## Supported versions

Only the current `main` branch and the live site are supported.
