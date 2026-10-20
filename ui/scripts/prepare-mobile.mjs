// Copies Oroletto (model + manifest) into mobile-public/oroletto/,
// which `vite build --mode mobile` serves next to the app. Run by `npm run build:mobile`.
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'mobile-public/oroletto');
rmSync(join(root, 'mobile-public'), { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const f of ['oroletto-8x8.onnx', 'oroletto-8x8.json']) copyFileSync(join(root, '../models', f), join(out, f));
console.log('prepared mobile-public/oroletto');
