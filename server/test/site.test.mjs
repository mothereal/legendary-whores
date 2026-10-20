// T-site: the outward face. What the landing page, the Scandal Sheet route, the /game/ page and the README
// say to a stranger (a link preview, a pinned icon, the first screen) is pinned here, as text reads of the site and client files.
// Sizes come from the JPEG SOF marker and the PNG IHDR chunk, so no image library is needed. Every test also fails on an em dash
// (U+2014) in any text file it reads: the copy rule is plain, no em dashes. This reads files only and starts no server.
// deploy.sh runs server/test/*.test.mjs, so each of these is a deploy gate.
// Run: node --test 'server/test/*.test.mjs'.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ORIGIN = 'https://legendarywhores.com';
const SHEET_URL = `${ORIGIN}/scandal-sheet/`;
const SHEET_CARD = `${ORIGIN}/scandal-sheet/card.jpg`;
const LANDING_CARD = `${ORIGIN}/og-card-v2.jpg`;
const EM_DASH = '\u2014';

// ---- file reads ----

// A text file as a string. It must exist and must hold no em dash; every test reads its text files through here.
function read(rel) {
  const file = path.join(ROOT, rel);
  assert.ok(fs.existsSync(file), `${rel} does not exist`);
  const text = fs.readFileSync(file, 'utf8');
  const at = text.indexOf(EM_DASH);
  assert.ok(at < 0, `${rel} has an em dash (U+2014) at line ${text.slice(0, at).split('\n').length}`);
  return text;
}
function readBin(rel) {
  const file = path.join(ROOT, rel);
  assert.ok(fs.existsSync(file), `${rel} does not exist`);
  return fs.readFileSync(file);
}

// ---- image sizes ----

// Width and height from the first SOF marker of a JPEG (APPn segments, such as an EXIF thumbnail, are skipped by length).
function jpegSize(buf, rel) {
  assert.ok(buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8, `${rel} is not a JPEG`);
  let i = 2;
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff) { i += 1; continue; }
    const marker = buf[i + 1];
    if (marker === 0xff) { i += 1; continue; } // fill byte
    if (marker === 0x00 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) { i += 2; continue; } // no length
    if (marker === 0xd9) break;
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      assert.ok(i + 9 <= buf.length, `${rel} ends inside its SOF marker`);
      return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return assert.fail(`${rel} has no SOF marker`);
}
// Width and height from the IHDR chunk of a PNG (always the first chunk, right after the 8-byte signature).
function pngSize(buf, rel) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.ok(buf.length >= 24 && buf.subarray(0, 8).equals(sig), `${rel} is not a PNG`);
  assert.equal(buf.toString('latin1', 12, 16), 'IHDR', `${rel} does not start with an IHDR chunk`);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}
const jpegAt = (rel) => jpegSize(readBin(rel), rel);
const pngAt = (rel) => pngSize(readBin(rel), rel);

// ---- a small HTML reader (the pages are hand-written, so tags and attributes are regular) ----

const TAG = '<([a-zA-Z][\\w-]*)((?:"[^"]*"|\'[^\']*\'|[^>"\'])*)>';
const stripComments = (html) => html.replace(/<!--[\s\S]*?-->/g, '');
function parseAttrs(s) {
  const out = {};
  const re = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(s))) out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  return out;
}
const decode = (s) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&rsquo;/g, '\u2019').replace(/&lsquo;/g, '\u2018').replace(/&amp;/g, '&');
// every opening tag of one name, comments left out: [{ attrs }]
function tags(html, name) {
  const src = stripComments(html);
  const re = new RegExp(TAG, 'g');
  const out = [];
  let m;
  while ((m = re.exec(src))) if (m[1].toLowerCase() === name) out.push({ attrs: parseAttrs(m[2]) });
  return out;
}
// the first <meta property=key> or <meta name=key>: its content, or null
function meta(html, key) {
  const hit = tags(html, 'meta').find((t) => t.attrs.property === key || t.attrs.name === key);
  return hit ? decode(hit.attrs.content ?? '') : null;
}
// the first <link rel=rel>: its attributes, or null
function link(html, rel) {
  const hit = tags(html, 'link').find((t) => (t.attrs.rel || '').split(/\s+/).includes(rel));
  return hit ? hit.attrs : null;
}
// the inner HTML of the first element for which match(attrs, tagName) holds, closed at its own matching end tag; null if none
function element(html, match) {
  const src = stripComments(html);
  const re = new RegExp(TAG, 'g');
  let m;
  while ((m = re.exec(src))) {
    if (!match(parseAttrs(m[2]), m[1].toLowerCase())) continue;
    const name = m[1];
    const from = re.lastIndex;
    const walk = new RegExp(`<(/?)${name}\\b(?:"[^"]*"|'[^']*'|[^>"'])*>`, 'gi');
    walk.lastIndex = from;
    let depth = 1;
    let w;
    while ((w = walk.exec(src))) {
      depth += w[1] ? -1 : 1;
      if (depth === 0) return src.slice(from, w.index);
    }
    return assert.fail(`<${name}> opened at offset ${m.index} is never closed`);
  }
  return null;
}
const byId = (html, id) => element(html, (a) => a.id === id);
const byClass = (html, cls) => element(html, (a) => (a.class || '').split(/\s+/).includes(cls));
const textOf = (inner) => decode(inner.replace(new RegExp(TAG, 'g'), ' ')).replace(/\s+/g, ' ').trim();

// a pattern that must not appear: the failure names the match, not the whole file
function assertNone(text, re, what) {
  const m = re.exec(text);
  assert.ok(!m, `${what}: found "${m && m[0]}"`);
}

// the text before </head>, which must be there: a missing one would otherwise slice to the end of the page and pass
function headOf(page, where) {
  const end = page.search(/<\/head>/i);
  assert.ok(end > 0, `${where} has no </head>`);
  return page.slice(0, end);
}

// JavaScript with its comments taken out and its string literals kept whole (a string may hold "//", as a URL does), so
// what is matched afterwards is code the browser runs, never a note beside it. Regular expression literals are not
// parsed, and front-page.js has none.
const stripJsComments = (js) => js.replace(/("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m, s) => s ?? '');

// every file a page pulls in from this site: each <img src> and srcset candidate, and the stylesheet, icon and
// apple-touch-icon links. A root-relative path resolves against site/, any other against the page's own folder; a URL
// with a scheme or a host is someone else's (the fonts). Each must exist on disk, since a missing one ships a broken
// image or an unstyled page while every text check stays green.
function assertLocalFiles(html, pageRel) {
  const pageDir = path.dirname(path.join(ROOT, pageRel));
  const wanted = [];
  for (const t of tags(html, 'img')) {
    if (t.attrs.src) wanted.push(t.attrs.src);
    for (const c of (t.attrs.srcset || '').split(',')) { const u = c.trim().split(/\s+/)[0]; if (u) wanted.push(u); }
  }
  for (const t of tags(html, 'link')) {
    const rels = (t.attrs.rel || '').split(/\s+/);
    if (t.attrs.href && ['stylesheet', 'icon', 'apple-touch-icon'].some((r) => rels.includes(r))) wanted.push(t.attrs.href);
  }
  assert.ok(wanted.length > 0, `${pageRel} pulls in no file at all`);
  for (const u of wanted) {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(u)) continue;
    const clean = decode(u).replace(/[?#].*$/, '');
    const file = clean.startsWith('/') ? path.join(ROOT, 'site', clean) : path.resolve(pageDir, clean);
    assert.ok(fs.existsSync(file), `${pageRel} pulls in ${u}, which is not on disk`);
  }
}

// an og:image:width and og:image:height pair, when a page states one, must say what the card file really is
function assertDeclaredCardSize(html, size, where) {
  const w = meta(html, 'og:image:width');
  const h = meta(html, 'og:image:height');
  if (w !== null) assert.equal(Number(w), size.width, `${where} og:image:width disagrees with the card file`);
  if (h !== null) assert.equal(Number(h), size.height, `${where} og:image:height disagrees with the card file`);
}

// ---- the tests ----

test('T-site-landing: the landing page leads with the game, not with open-source or deck-building, and its card is 1200x630', () => {
  const html = read('site/index.html');
  // comments are left out: a note to the maintainers never reaches a preview, a search result or a reader
  const page = stripComments(html);
  const head = headOf(page, 'site/index.html');
  assertNone(head, /open-source|deck-building/i, 'the <head> (title, description, og and twitter tags) still leads with open-source or deck-building');
  assertLocalFiles(html, 'site/index.html');

  const kicker = byClass(html, 'kicker-text');
  assert.notEqual(kicker, null, 'site/index.html has no .kicker-text');
  assertNone(textOf(kicker), /open-source|deck-building/i, `.kicker-text says "${textOf(kicker)}"`);

  // scrapers cache a card by its URL, so the replacement card has a new name; the old name is gone from both card tags
  assert.equal(meta(html, 'og:image'), LANDING_CARD, 'og:image is not the v2 card');
  assert.equal(meta(html, 'twitter:image'), LANDING_CARD, 'twitter:image is not the v2 card');
  const size = jpegAt('site/og-card-v2.jpg');
  assert.deepEqual(size, { width: 1200, height: 630 }, 'site/og-card-v2.jpg is not 1200x630');
  assertDeclaredCardSize(html, size, 'site/index.html');

  // the card source: the band under the picture, and everything else it prints, free of deck-building
  const card = read('site/og-card.html');
  const printed = stripComments(card).replace(/<style[\s\S]*?<\/style>/gi, '');
  assertNone(printed, /deck-building/i, 'site/og-card.html still prints it');
});

test('T-site-rivals: Real Rivals is not under Coming Soon, and the rivals story says real players', () => {
  const html = read('site/index.html');
  const next = byId(html, 'next');
  assert.notEqual(next, null, 'site/index.html has no #next section');
  assertNone(next, /real rivals/i, 'section#next (Coming Soon) still lists it');
  const rivals = byId(html, 'rivals');
  assert.notEqual(rivals, null, 'site/index.html has no #rivals story');
  assert.match(textOf(rivals), /real players/i, '#rivals does not say "real players"');
});

test('T-site-adults: the stamp note above the fold says Adults only', () => {
  const html = read('site/index.html');
  const note = byClass(html, 'stamp-note');
  assert.notEqual(note, null, 'site/index.html has no .stamp-note');
  assert.match(textOf(note), /Adults only/, `.stamp-note says "${textOf(note)}"`);
});

test('T-site-sheet: the Scandal Sheet route has its own preview: title, url, a 1200x630 card, and no inline script', () => {
  const html = read('site/scandal-sheet/index.html'); // a missing file is the "no route" failure
  const head = headOf(html, 'the route');
  const title = (/<title>([\s\S]*?)<\/title>/i.exec(stripComments(head)) || [])[1];
  assert.ok(title, 'the route has no <title>');
  assertLocalFiles(html, 'site/scandal-sheet/index.html'); // its stylesheet, icons and the plan screen sit a folder up

  const ogTitle = meta(html, 'og:title');
  assert.ok(ogTitle !== null && ogTitle.startsWith('The Scandal Sheet'), `og:title is ${JSON.stringify(ogTitle)}`);
  assert.equal(meta(html, 'og:site_name'), 'The Scandal Sheet', 'og:site_name');
  // the paper's own preview must not carry the game's name or its trade words
  const titled = { title: decode(title), 'og:title': ogTitle, 'twitter:title': meta(html, 'twitter:title'), 'og:site_name': meta(html, 'og:site_name') };
  for (const [what, text] of Object.entries(titled)) {
    if (text !== null) assertNone(text, /whore|harlot/i, `${what} is "${text}"`);
  }

  assert.equal(meta(html, 'og:url'), SHEET_URL, 'og:url');
  const canonical = link(html, 'canonical');
  assert.ok(canonical, 'the route has no canonical link');
  assert.equal(canonical.href, SHEET_URL, 'canonical');
  assert.equal(meta(html, 'twitter:card'), 'summary_large_image', 'twitter:card');
  assert.equal(meta(html, 'og:image'), SHEET_CARD, 'og:image');
  const twitterImage = meta(html, 'twitter:image');
  if (twitterImage !== null) assert.equal(twitterImage, SHEET_CARD, 'twitter:image');
  const size = jpegAt('site/scandal-sheet/card.jpg');
  assert.deepEqual(size, { width: 1200, height: 630 }, 'site/scandal-sheet/card.jpg is not 1200x630');
  assertDeclaredCardSize(html, size, 'the route');

  // CSP is script-src 'self': an inline script would be blocked, so none may be written
  const inline = tags(html, 'script').filter((t) => !t.attrs.src);
  assert.equal(inline.length, 0, `the route has ${inline.length} script tag(s) without src`);
});

test('T-site-share: the landing share sends the Scandal Sheet link under the paper\'s title, without "discreetly"', () => {
  const js = read('site/landing/front-page.js');
  // the assignment the share and the copy both read, in code: the url in a note beside an older one does not count
  const code = stripJsComments(js);
  assert.match(code, /\b(?:var|let|const)\s+url\s*=\s*(['"])https:\/\/legendarywhores\.com\/scandal-sheet\/\1\s*;/, 'front-page.js does not assign the Scandal Sheet url to the shared url');
  // the share sheet carries the paper's name and motto, and that same url
  const share = /navigator\.share\(\{([^}]*)\}/.exec(code);
  assert.ok(share, 'front-page.js has no navigator.share call');
  assert.match(share[1], /\btitle:\s*(['"])The Scandal Sheet\1/, `the share sheet's title is wrong in "${share[1].trim()}"`);
  assert.match(share[1], /\btext:\s*(['"])All the news that’s fit to whisper\.\1/, `the share sheet's text is not the motto in "${share[1].trim()}"`);
  assert.match(share[1], /\burl:\s*url\b/, `the share sheet does not send the url in "${share[1].trim()}"`);
  assertNone(js, /discreetly/i, 'front-page.js still says it');
});

test('T-site-game: the game page pastes and pins: og tags with the sheet card, manifest and icon links, and the files behind them', () => {
  const html = read('game/index.html');
  const ogTitle = meta(html, 'og:title');
  assert.ok(ogTitle !== null && ogTitle.startsWith('The Scandal Sheet'), `og:title is ${JSON.stringify(ogTitle)}`);
  assert.equal(meta(html, 'og:image'), SHEET_CARD, 'og:image is not the Scandal Sheet card');
  assert.equal(meta(html, 'twitter:card'), 'summary_large_image', 'twitter:card');

  // links resolve against /game/, so a relative "manifest.json" and an absolute "/game/manifest.json" both count; the
  // whole resolved URL is compared, origin included, since a link to another host would pass a path check and still
  // send the browser somewhere the files below are not
  const base = `${ORIGIN}/game/`;
  const manifestLink = link(html, 'manifest');
  assert.ok(manifestLink, 'game/index.html has no <link rel="manifest">');
  assert.equal(new URL(manifestLink.href, base).href, `${base}manifest.json`, 'the manifest link');
  const touchLink = link(html, 'apple-touch-icon');
  assert.ok(touchLink, 'game/index.html has no <link rel="apple-touch-icon">');
  assert.equal(new URL(touchLink.href, base).href, `${base}apple-touch-icon.png`, 'the apple-touch-icon link');

  // flat files in game/ (deploy.sh copies game/ with plain cp), so the manifest and icons sit beside index.html
  const manifest = JSON.parse(read('game/manifest.json'));
  assert.equal(manifest.start_url, '/game/', 'manifest start_url');
  assert.equal(manifest.scope, '/game/', 'manifest scope');
  const declared = new Map((manifest.icons || []).map((i) => [new URL(i.src, `${base}manifest.json`).href, i.sizes]));
  assert.equal(declared.get(`${base}icon-192.png`), '192x192', 'manifest does not declare icon-192.png at 192x192');
  assert.equal(declared.get(`${base}icon-512.png`), '512x512', 'manifest does not declare icon-512.png at 512x512');
  assert.deepEqual(pngAt('game/icon-192.png'), { width: 192, height: 192 }, 'game/icon-192.png');
  assert.deepEqual(pngAt('game/icon-512.png'), { width: 512, height: 512 }, 'game/icon-512.png');
  assert.deepEqual(pngAt('game/apple-touch-icon.png'), { width: 180, height: 180 }, 'game/apple-touch-icon.png');
});

test('T-site-readme: the README says the game is live, with the plan screen linked and on disk', () => {
  const md = read('README.md');
  assertNone(md, /once it['\u2019]s live/i, 'README.md still says it');
  assert.match(md, /!\[[^\]]*\]\(\s*(?:\.\/)?site\/landing\/assets\/plan-screen\.jpg(?:\s+"[^"]*")?\s*\)/, 'README.md does not link the plan screen picture');
  // the picture itself, which the landing, the route and the sheet card also use: a real JPEG, whatever its size
  jpegAt('site/landing/assets/plan-screen.jpg');
});
