// After `vite build --mode web`: check the build really is one file, then publish it as
// ../web/othello.html (the page to host on GitHub Pages or anywhere else).
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const dist = resolve(root, '../dist-web');
const out = resolve(root, '../../web/othello.html');

const leftovers = readdirSync(dist).filter((f) => f !== 'index.html');
if (leftovers.length) {
  console.error(`dist-web has extra files, so the page is not self-contained: ${leftovers.join(', ')}`);
  process.exit(1);
}
mkdirSync(dirname(out), { recursive: true });
copyFileSync(join(dist, 'index.html'), out);
console.log(`wrote web/othello.html (${(statSync(out).size / 1024).toFixed(0)} KiB)`);
