// Dev mode only (LW_DEV=1): serve the game's published folders read-only, so the local page and /api share one origin.
// Never used on the live server, where the front web server serves the static site.

import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

const FOLDERS = ['game', 'engine', 'art-assets'];

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

// The live site's policy, so CSP mistakes show up in dev too (minus upgrade-insecure-requests: dev is plain http).
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
  + "font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; "
  + "base-uri 'none'; form-action 'self'; frame-ancestors 'none'";

export function staticServer(repoRoot) {
  const roots = new Map(FOLDERS.map((f) => [f, fs.realpathSync(path.join(repoRoot, f))]));

  // Serves `rawPath` (the request path, still percent-encoded) and returns null, or returns the error code to answer
  // with when it serves nothing.
  return async function serveStatic(req, res, rawPath) {
    const readOnly = req.method === 'GET' || req.method === 'HEAD';
    if (rawPath === '/' || rawPath === '/game') return readOnly ? redirect(res, '/game/') : 'method-not-allowed';
    let decoded;
    try { decoded = decodeURIComponent(rawPath); } catch { return 'not-found'; }
    // no NUL, no backslash, no empty segment ("//x" would make the redirect below protocol-relative)
    if (decoded.includes('\0') || decoded.includes('\\') || decoded.includes('//')) return 'not-found';
    const segs = decoded.split('/').filter(Boolean);
    const root = roots.get(segs[0]);
    // one of the three folders, and no dot segments at all: no "..", no ".", no dotfiles
    if (!root || segs.some((s) => s.startsWith('.'))) return 'not-found';
    if (!readOnly) return 'method-not-allowed';

    let file = path.join(root, ...segs.slice(1));
    let st;
    try {
      file = await fs.promises.realpath(file); // a symlink must not lead outside its folder
      if (file !== root && !file.startsWith(root + path.sep)) return 'not-found';
      st = await fs.promises.stat(file);
      if (st.isDirectory()) {
        if (!decoded.endsWith('/')) return redirect(res, `${rawPath}/`);
        file = path.join(file, 'index.html');
        st = await fs.promises.stat(file);
      }
    } catch {
      return 'not-found';
    }
    if (!st.isFile()) return 'not-found';

    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': CSP,
    });
    if (req.method === 'HEAD') { res.end(); return null; }
    try { await pipeline(fs.createReadStream(file), res); } catch { res.destroy(); } // a reader who left mid-file
    return null;
  };
}

function redirect(res, location) {
  res.writeHead(302, { Location: location, 'Content-Length': 0, 'Cache-Control': 'no-cache' });
  res.end();
  return null;
}
