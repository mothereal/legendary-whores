#!/usr/bin/env node
// scan-public.mjs: secret + identity scanner for a PUBLIC repository.
// Dependency-free (Node >= 18, plus the git CLI for the git modes).
//
// It fails (exit 1) on:
//   - private keys, API keys and tokens (AWS, GitHub, Slack, Google, Anthropic, OpenAI-style,
//     Stripe, npm, Hugging Face, JWTs, Cloudflare tunnel tokens/credentials, CF token assignments,
//     generic "password/secret/api_key = '...'" assignments, URLs with embedded credentials)
//   - any email address except the project's public noreply address
//   - home-directory paths (/Users/<name>, C:\Users\<name>)
//   - IPv4 addresses outside the documentation ranges 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24
//     (write "localhost" in configs instead of a loopback literal)
//   - any word from the private deny-list (whole word, case-insensitive)
//   - (identity modes) a commit/tag author or committer other than the project identity.
//     --identity and --commits (the designer's own new commits) accept ONLY the project identity.
//     --history (everything already in the repo, incl. GitHub merges, Dependabot and outside
//     contributors) also accepts GitHub's pseudonymous addresses: any users.noreply.github.com
//     address and GitHub's own noreply address; any other email in a commit identity fails. Commit
//     MESSAGES may also contain those and GitHub's support address (Dependabot's sign-off).
//     File contents stay strict.
//
// The deny-list never lives in the repo. It is read from, in order:
//   1. the file named by $SCAN_PUBLIC_DENYLIST_FILE
//   2. ./.private-denylist at the repo root (gitignored)
//   3. $SCAN_DENYLIST (newline- or comma-separated; CI feeds it from a repository secret)
// One term per line, "#" starts a comment. Matched text is NEVER printed (CI logs are public):
// findings show file, line, column and rule id only.
//
// Usage:
//   node scripts/scan-public.mjs --staged            staged blobs (pre-commit); warns if no deny-list
//   node scripts/scan-public.mjs --all               tracked + untracked-not-ignored files; needs deny-list
//   node scripts/scan-public.mjs --history           every blob, commit message and identity in all refs
//   node scripts/scan-public.mjs --identity          the identity the next commit would use (git var)
//   node scripts/scan-public.mjs --commits           commit shas on stdin (pre-push): check identities + messages
//   node scripts/scan-public.mjs <path>...           files or directories (works outside git too)
// Flags:
//   --require-denylist        fail (exit 2) if no deny-list terms were loaded
//   --allow-missing-denylist  downgrade the missing deny-list error to a warning (forked/Dependabot PRs)
// Exit codes: 0 clean, 1 findings, 2 usage or configuration error.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_IDENT = 'mothereal <180792623+mothereal@users.noreply.github.com>';
const ALLOWED_EMAILS = new Set(['180792623+mothereal@users.noreply.github.com']);
const AT = '@'; // concatenated so this file passes its own email rule
const PLATFORM_EMAILS = new Set([`noreply${AT}github.com`, `support${AT}github.com`]);
const isPlatformEmail = (e) => PLATFORM_EMAILS.has(e) || e.endsWith('@users.noreply.github.com');
const DOC_IPV4_PREFIXES = ['192.0.2.', '198.51.100.', '203.0.113.']; // RFC 5737
const DENYLIST_FILE = '.private-denylist';
const SKIP_DIRS = new Set(['.git', 'node_modules']);
const SKIP_FILES = new Set([DENYLIST_FILE]);
const MAX_BYTES = 64 * 1024 * 1024;

// ---------- args ----------
const argv = process.argv.slice(2);
const flag = (f) => argv.includes(f);
const paths = argv.filter((a) => !a.startsWith('--'));
const MODE_STAGED = flag('--staged');
const MODE_ALL = flag('--all');
const MODE_HISTORY = flag('--history');
const MODE_IDENTITY = flag('--identity');
const MODE_COMMITS = flag('--commits');
const known = new Set(['--staged', '--all', '--history', '--identity', '--commits', '--require-denylist', '--allow-missing-denylist', '--help']);
for (const a of argv) if (a.startsWith('--') && !known.has(a)) { console.error(`scan-public: unknown flag ${a}`); process.exit(2); }
if (flag('--help') || (!MODE_STAGED && !MODE_ALL && !MODE_HISTORY && !MODE_IDENTITY && !MODE_COMMITS && paths.length === 0)) {
  console.error('usage: node scripts/scan-public.mjs [--staged|--all|--history|--identity|--commits] [--require-denylist] [--allow-missing-denylist] [path...]');
  process.exit(2);
}

// ---------- git helpers ----------
function git(args, opts = {}) {
  return execFileSync('git', args, { cwd: ROOT, maxBuffer: 1 << 30, stdio: ['pipe', 'pipe', 'pipe'], ...opts });
}
function findRoot() {
  try { return execFileSync('git', ['rev-parse', '--show-toplevel'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
  catch { return null; }
}
const GIT_ROOT = findRoot();
const ROOT = GIT_ROOT || process.cwd();
const needsGit = MODE_STAGED || MODE_ALL || MODE_HISTORY || MODE_IDENTITY || MODE_COMMITS;
if (needsGit && !GIT_ROOT) { console.error('scan-public: this mode needs a git repository'); process.exit(2); }

// ---------- deny-list ----------
function parseTerms(text) {
  // strip "#" comments per line first, then allow comma-separated terms within a line
  return text.split('\n').map((l) => l.replace(/#.*/, '')).join(',').split(',').map((t) => t.trim()).filter(Boolean);
}
function loadDenylist() {
  const terms = [];
  const envFile = process.env.SCAN_PUBLIC_DENYLIST_FILE;
  const candidates = [envFile, path.join(ROOT, DENYLIST_FILE)].filter(Boolean);
  for (const f of candidates) {
    try { terms.push(...parseTerms(fs.readFileSync(f, 'utf8'))); break; } catch { /* try next */ }
  }
  if (process.env.SCAN_DENYLIST) terms.push(...parseTerms(process.env.SCAN_DENYLIST));
  const uniq = [...new Set(terms.map((t) => t.toLowerCase()))];
  return uniq.map((t, i) => ({
    n: i + 1,
    re: new RegExp(`(?<![A-Za-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9])`, 'gi'),
  }));
}
const DENY = loadDenylist();
const requireDeny = (flag('--require-denylist') || MODE_ALL || MODE_HISTORY) && !flag('--allow-missing-denylist');
if (DENY.length === 0) {
  const msg = `no private deny-list terms loaded (create ${DENYLIST_FILE}, or set SCAN_DENYLIST / SCAN_PUBLIC_DENYLIST_FILE)`;
  if (requireDeny) { console.error(`scan-public: ERROR: ${msg}`); process.exit(2); }
  console.error(`scan-public: warning: ${msg}`);
}

// ---------- rules ----------
// Built so this file never matches itself (e.g. the PEM header is concatenated).
const PEM = '-----' + 'BEGIN ';
const RULES = [
  { id: 'private-key', bin: true, re: new RegExp(PEM + '(?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----', 'g') },
  { id: 'aws-access-key-id', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { id: 'github-token', re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{22,})\b/g },
  { id: 'slack-token', re: /\bxox[abposr]-[A-Za-z0-9-]{10,}/g },
  { id: 'slack-webhook', re: /hooks\.slack\.com\/services\/[A-Za-z0-9/_-]{20,}/g },
  { id: 'discord-webhook', re: /discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+/g },
  { id: 'google-api-key', re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { id: 'anthropic-key', re: /\bsk-ant-[A-Za-z0-9_-]{20,}/g },
  { id: 'openai-style-key', re: /\bsk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{32,}/g },
  { id: 'stripe-key', re: /\b(?:sk|rk)_(?:live|test)_[0-9A-Za-z]{16,}/g },
  { id: 'npm-token', re: /\bnpm_[A-Za-z0-9]{36}\b/g },
  { id: 'huggingface-token', re: /\bhf_[A-Za-z0-9]{34,}\b/g },
  { id: 'jwt', re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { id: 'cloudflare-tunnel-token', re: /\beyJhIjoi[A-Za-z0-9+/_=-]{40,}/g },
  { id: 'cloudflare-tunnel-credentials', re: /"TunnelSecret"\s*:/g },
  { id: 'cloudflare-token-assignment', re: /\b(?:CF|CLOUDFLARE)_[A-Z_]*(?:TOKEN|KEY|SECRET)\b["']?\s*[:=]\s*["']?[A-Za-z0-9_-]{30,}/g },
  { id: 'generic-secret-assignment', re: /\b(?:api[_-]?key|secret[_-]?key|client[_-]?secret|access[_-]?token|auth[_-]?token|password|passwd)\b["']?\s*[:=]\s*["'][^"'\s]{12,}["']/gi },
  { id: 'url-with-credentials', re: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/"'<>]+:[^\s@/"'<>]+@[^\s/"'<>]+/gi },
  { id: 'home-path', bin: true, re: /(?:\/Users\/|\b[A-Za-z]:\\{1,2}Users\\{1,2})(?!Shared\b)[A-Za-z0-9._-]+/g },
];
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}(?![A-Za-z0-9-])/g;
const FILE_EXT_TLD = /\.(?:png|jpe?g|gif|webp|avif|svg|ico|css|js|mjs|json|html?|md|txt|woff2?|ttf)$/i; // icon@2x.png etc.
const IPV4_RE = /(?<![\d.])(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?!\d|\.\d)/g;

// ---------- scanning ----------
const findings = [];
let scannedCount = 0;

function lineCol(text, idx) {
  let line = 1; let last = -1;
  for (let i = text.indexOf('\n'); i !== -1 && i < idx; i = text.indexOf('\n', i + 1)) { line++; last = i; }
  return `${line}:${idx - last}`;
}
function report(where, text, idx, rule) { findings.push(`${where}:${lineCol(text, idx)}  ${rule}`); }

function scanText(where, text, binary, commitMeta = false) {
  for (const r of RULES) {
    if (binary && !r.bin) continue;
    r.re.lastIndex = 0;
    for (const m of text.matchAll(r.re)) report(where, text, m.index, r.id);
  }
  for (const m of text.matchAll(EMAIL_RE)) {
    const e = m[0];
    if (ALLOWED_EMAILS.has(e.toLowerCase())) continue;
    if (commitMeta && isPlatformEmail(e.toLowerCase())) continue;
    if (FILE_EXT_TLD.test(e)) continue;
    if (binary && e.split('@')[0].length < 3) continue;
    report(where, text, m.index, 'email');
  }
  if (!binary) {
    for (const m of text.matchAll(IPV4_RE)) {
      if (DOC_IPV4_PREFIXES.some((p) => m[0].startsWith(p))) continue;
      report(where, text, m.index, 'ipv4');
    }
  }
  for (const d of DENY) for (const m of text.matchAll(d.re)) report(where, text, m.index, `denylist[#${d.n}]`);
}

function scanBuffer(where, buf) {
  scannedCount++;
  if (buf.length > MAX_BYTES) { findings.push(`${where}  too-large-to-scan (${buf.length} bytes; keep big binaries out of git)`); return; }
  const binary = buf.subarray(0, 8000).includes(0);
  scanText(where, buf.toString(binary ? 'latin1' : 'utf8'), binary);
}
function scanName(name) { scanText(`(path) ${name}`, name, false); }

function walk(p, out) {
  let st;
  try { st = fs.lstatSync(p); } catch { console.error(`scan-public: cannot read ${p}`); process.exit(2); }
  if (st.isSymbolicLink()) return;
  if (st.isDirectory()) {
    if (SKIP_DIRS.has(path.basename(p))) return;
    for (const e of fs.readdirSync(p)) walk(path.join(p, e), out);
  } else if (st.isFile() && !SKIP_FILES.has(path.basename(p))) out.push(p);
}

function identOf(raw) { return raw.replace(/\s+\d+\s+[+-]\d{4}\s*$/, '').trim(); } // strip "<time> <tz>"

function checkIdentity() {
  for (const v of ['GIT_AUTHOR_IDENT', 'GIT_COMMITTER_IDENT']) {
    let id;
    try { id = identOf(git(['var', v]).toString()); } catch { findings.push(`(identity) ${v} is not set`); continue; }
    if (id !== PROJECT_IDENT) findings.push(`(identity) ${v} is not the project identity (expected "${PROJECT_IDENT}")`);
  }
}

function identOk(ident, strict) {
  if (ident === PROJECT_IDENT) return true;
  if (strict) return false;
  const m = /<([^>]*)>$/.exec(ident);
  return !!m && isPlatformEmail(m[1].toLowerCase());
}

function checkCommits(shas, strict) {
  for (const sha of shas) {
    const out = git(['show', '-s', '--format=%an <%ae>%x00%cn <%ce>%x00%B', sha]).toString();
    const [author, committer, ...msg] = out.split('\0');
    const short = sha.slice(0, 10);
    const want = strict ? 'the project identity' : 'the project identity or a GitHub noreply address';
    if (!identOk(author, strict)) findings.push(`(commit ${short}) author is not ${want}`);
    if (!identOk(committer, strict)) findings.push(`(commit ${short}) committer is not ${want}`);
    for (const d of DENY) if (d.re.test(author + ' ' + committer)) { d.re.lastIndex = 0; findings.push(`(commit ${short}) identity matches denylist[#${d.n}]`); }
    scanText(`(commit ${short} message)`, msg.join('\0'), false, true);
  }
}

function catFileBatch(shas, onBlob) {
  for (let i = 0; i < shas.length; i += 400) {
    const chunk = shas.slice(i, i + 400);
    const buf = git(['cat-file', '--batch'], { input: chunk.join('\n') + '\n' });
    let pos = 0;
    while (pos < buf.length) {
      const nl = buf.indexOf(10, pos);
      const [sha, type, size] = buf.toString('latin1', pos, nl).split(' ');
      const n = Number(size);
      onBlob(sha, type, buf.subarray(nl + 1, nl + 1 + n));
      pos = nl + 1 + n + 1;
    }
  }
}

if (MODE_IDENTITY) checkIdentity();

if (MODE_COMMITS) {
  const shas = fs.readFileSync(0, 'utf8').split(/\s+/).filter((s) => /^[0-9a-f]{40,64}$/.test(s));
  checkCommits(shas, true);
}

if (MODE_STAGED) {
  const names = git(['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR']).toString().split('\0').filter(Boolean);
  for (const n of names) {
    if (SKIP_FILES.has(path.basename(n))) { findings.push(`${n}  private-denylist-file-staged (never commit it)`); continue; }
    scanName(n);
    scanBuffer(n, git(['show', `:${n}`]));
  }
}

if (MODE_ALL) {
  const names = git(['ls-files', '-z', '--cached', '--others', '--exclude-standard']).toString().split('\0').filter(Boolean);
  for (const n of names) {
    if (SKIP_FILES.has(path.basename(n))) { findings.push(`${n}  private-denylist-file-not-ignored (add it to .gitignore)`); continue; }
    scanName(n);
    const abs = path.join(ROOT, n);
    let st; try { st = fs.lstatSync(abs); } catch { continue; } // deleted in worktree
    if (!st.isFile()) continue;
    scanBuffer(n, fs.readFileSync(abs));
  }
}

if (MODE_HISTORY) {
  const hasRefs = git(['for-each-ref', '--count=1']).toString().trim() !== '';
  if (hasRefs) {
    const objLines = git(['rev-list', '--objects', '--all']).toString().split('\n').filter(Boolean);
    const pathOf = new Map();
    for (const l of objLines) { const sp = l.indexOf(' '); if (sp > 0) pathOf.set(l.slice(0, sp), l.slice(sp + 1)); else pathOf.set(l, ''); }
    const allShas = [...pathOf.keys()];
    const types = git(['cat-file', '--batch-check'], { input: allShas.join('\n') + '\n' }).toString().split('\n').filter(Boolean);
    const blobs = types.map((t) => t.split(' ')).filter((p) => p[1] === 'blob').map((p) => p[0]);
    for (const p of new Set(pathOf.values())) if (p) scanName(p);
    catFileBatch(blobs, (sha, type, buf) => {
      const p = pathOf.get(sha) || '?';
      if (SKIP_FILES.has(path.basename(p))) { findings.push(`(history ${sha.slice(0, 10)}) ${p}  private-denylist-file-committed`); return; }
      scanBuffer(`(history ${sha.slice(0, 10)}) ${p}`, buf);
    });
    const commits = git(['rev-list', '--all']).toString().split('\n').filter(Boolean);
    checkCommits(commits, false);
    const tags = git(['for-each-ref', 'refs/tags', '--format=%(objecttype) %(refname:short)%00%(taggername) %(taggeremail)']).toString().split('\n').filter(Boolean);
    for (const t of tags) {
      const [head, ident] = t.split('\0');
      if (head.startsWith('tag ') && !identOk(ident.trim(), false)) findings.push(`(tag ${head.slice(4)}) tagger is not the project identity or a GitHub noreply address`);
    }
  }
}

if (paths.length) {
  const files = [];
  for (const p of paths) walk(path.resolve(p), files);
  for (const f of files) {
    const rel = path.relative(process.cwd(), f) || f;
    scanName(rel);
    scanBuffer(rel, fs.readFileSync(f));
  }
}

if (findings.length) {
  console.error(`scan-public: ${findings.length} finding(s) in ${scannedCount} item(s) (matched text is not printed):`);
  for (const f of findings) console.error(`  ${f}`);
  console.error('scan-public: FAILED. Remove or rewrite the flagged content; do not bypass the hook.');
  process.exit(1);
}
console.log(`scan-public: clean (${scannedCount} item(s) scanned, ${DENY.length} deny-list term(s) loaded)`);
