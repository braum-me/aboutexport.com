/**
 * Erzeugt nach dem Build .br- und .gz-Varianten für Text-Assets in dist/client.
 * server.mjs liefert sie je nach Accept-Encoding aus – unabhängig vom Reverse Proxy.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const ROOT = new URL('../dist/client/', import.meta.url).pathname;
const EXTENSIONS = new Set(['.html', '.css', '.js', '.mjs', '.svg', '.xml', '.txt', '.json', '.webmanifest']);
const MIN_BYTES = 1024;

let files = 0;
let before = 0;
let after = 0;

const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    const ext = entry.name.slice(entry.name.lastIndexOf('.'));
    if (!EXTENSIONS.has(ext) || statSync(full).size < MIN_BYTES) continue;
    const data = readFileSync(full);
    const br = brotliCompressSync(data, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: data.length },
    });
    writeFileSync(`${full}.br`, br);
    writeFileSync(`${full}.gz`, gzipSync(data, { level: 9 }));
    files += 1;
    before += data.length;
    after += br.length;
  }
};

walk(ROOT);
console.log(
  `precompress: ${files} Dateien, ${(before / 1024).toFixed(0)} KB → ${(after / 1024).toFixed(0)} KB (brotli)`,
);
