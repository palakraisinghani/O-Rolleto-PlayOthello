// After `vite build --mode site`: publish the multi-file site (page + Oroletto + WebAssembly runtime) as ../docs,
// the folder GitHub Pages serves.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist-site');
const docs = resolve(root, '../docs');
if (!existsSync(join(dist, 'index.html'))) throw new Error('run `vite build --mode site` first');
mkdirSync(docs, { recursive: true });
for (const f of readdirSync(docs)) rmSync(join(docs, f), { recursive: true, force: true }); // drop stale hashed files
cpSync(dist, docs, { recursive: true });
console.log(`wrote docs/ (${readdirSync(docs).join(', ')})`);
