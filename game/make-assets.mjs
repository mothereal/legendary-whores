// Regenerates assets.js from the files on disk: EXISTS lists every painted file under art-assets/<era>/ for the three
// slice Timelines, and STANDINS keeps a stand-in only while the painting it stands in for is still missing.
// Run from anywhere after every art batch:  node game/make-assets.mjs
// Check only (exit 1 when assets.js is stale, i.e. a painting on disk is missing from EXISTS or a stand-in covers one):
//   node game/make-assets.mjs --check
// The page no longer depends on this list to show new art (artOf tries the real file first and falls back through the
// image error handler), but the list still decides which stand-in a missing painting gets, so keep it fresh.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ART = path.join(HERE, '../art-assets');
const ERAS = ['victorian', 'wildwest', 'vegas'];
const CHECK = process.argv.includes('--check');
const { EXISTS: OLD, STANDINS } = await import(path.join(HERE, 'assets.js'));
const C = (await import(path.join(HERE, '../engine/content.js')));
const onDisk = ERAS.flatMap((e) => (fs.existsSync(path.join(ART, e)) ? fs.readdirSync(path.join(ART, e)) : [])
  .filter((f) => /\.(webp|png|jpe?g)$/i.test(f)).sort().map((f) => `${e}/${f}`));
const have = new Set(onDisk);
const keep = {}; const dropped = [];
for (const [k, v] of Object.entries(STANDINS)) {
  if (have.has(k)) dropped.push(k);
  else if (have.has(v.use)) keep[k] = v;
  else dropped.push(`${k} (stand-in target missing)`);
}
// every art path the shared content asks for that has neither a painting nor a stand-in (shows the era frame and name)
const wanted = new Set(); JSON.stringify(C, (k, v) => { if (typeof v === 'string' && v.startsWith('../art-assets/')) wanted.add(v.slice(14)); return v; });
const bare = [...wanted].filter((p) => ERAS.includes(p.split('/')[0]) && !have.has(p) && !keep[p]).sort();
const missingFromOld = onDisk.filter((p) => !OLD.has(p));
const coveredStandins = Object.keys(STANDINS).filter((k) => have.has(k));
if (CHECK) {
  if (missingFromOld.length || coveredStandins.length) {
    console.log(`assets.js is stale: ${missingFromOld.length} painting(s) on disk missing from EXISTS${missingFromOld.length ? ` (${missingFromOld.join(', ')})` : ''}; ${coveredStandins.length} stand-in(s) cover a real painting${coveredStandins.length ? ` (${coveredStandins.join(', ')})` : ''}. Run: node game/make-assets.mjs`);
    process.exitCode = 1;
  } else console.log(`assets.js is current: ${onDisk.length} paintings, ${Object.keys(STANDINS).length} stand-ins.`);
} else {
  const out = `// The Scandal Sheet · art list (written by make-assets.mjs from the files in art-assets/<era>/; do not hand-edit,
// re-run \`node game/make-assets.mjs\` after every art batch). EXISTS: every painted file on disk. STANDINS: a painting
// that is still missing, and the painted file to show instead (pos: object-position for face crops).
export const EXISTS = new Set(${JSON.stringify(onDisk)});
export const STANDINS = ${JSON.stringify(keep, null, 1)};
`;
  fs.writeFileSync(path.join(HERE, 'assets.js'), out);
  console.log(`EXISTS: ${onDisk.length} paintings (${missingFromOld.length} new: ${missingFromOld.join(', ') || 'none'})`);
  console.log(`STANDINS: kept ${Object.keys(keep).length}; dropped ${dropped.length}: ${dropped.join(', ') || 'none'}`);
  console.log(`asked for by content with no painting and no stand-in: ${bare.join(', ') || 'none'}`);
}
