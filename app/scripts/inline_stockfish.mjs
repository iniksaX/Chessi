/* Postbuild — inlines Stockfish 19 (lite, single-threaded) into dist/index.html.
   The 1.8 MB wasm becomes base64 + the 28 KB Emscripten glue becomes a classic
   <script> that sets its factory on the element's `_exports` (its official API
   for classic-script consumers). No network, no fetch — works from file:// and
   inside Android WebViews. Kept OUT of git; regenerated on every build. */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const gluePath = join(root, 'node_modules/stockfish/bin/stockfish-19-lite-single.js');
const wasmPath = join(root, 'node_modules/stockfish/bin/stockfish-19-lite-single.wasm');
const distPath = join(root, 'dist/index.html');

for (const p of [gluePath, wasmPath, distPath]) {
  if (!existsSync(p)) {
    console.error(`[inline_stockfish] missing ${p} — run \`npm install\` and \`npm run build\` first.`);
    process.exit(1);
  }
}

const glue = readFileSync(gluePath, 'utf8');
const wasmB64 = readFileSync(wasmPath).toString('base64');

// safety: the glue must be the classic-script flavour (assigns to document.currentScript._exports)
if (!glue.includes('document.currentScript')) {
  console.error('[inline_stockfish] glue does not look like the classic-script build; refusing to inline.');
  process.exit(1);
}
// avoid </script> breaking out of the inline script element
const safeGlue = glue.replace(/<\/script/gi, '<\\/script');

const block =
  `<script id="chessi-sf-wasm">window.__SF_WASM_B64="${wasmB64}";</script>\n` +
  `<script id="chessi-sf-glue">${safeGlue}</script>\n` +
  `<script>window.__SF_FACTORY=document.getElementById('chessi-sf-glue')._exports;</script>\n`;

let html = readFileSync(distPath, 'utf8');
const markerRe = /<script id="chessi-sf-wasm">[\s\S]*?<\/script>\s*<script id="chessi-sf-glue">[\s\S]*?<\/script>\s*<script>window\.__SF_FACTORY=[\s\S]*?<\/script>\n?/;
html = html.replace(markerRe, ''); // idempotent re-runs

const headEnd = html.indexOf('</head>');
if (headEnd === -1) {
  console.error('[inline_stockfish] dist/index.html has no </head> — unexpected format.');
  process.exit(1);
}
html = html.slice(0, headEnd) + block + html.slice(headEnd);
writeFileSync(distPath, html);

const mb = (Buffer.byteLength(html) / 1024 / 1024).toFixed(2);
console.log(`[inline_stockfish] inlined Stockfish 19 lite single → dist/index.html (${mb} MB total)`);
