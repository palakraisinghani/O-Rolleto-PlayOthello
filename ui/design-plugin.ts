// Turns ../design.md into CSS variables (--d-<token-name>) injected into index.html,
// reloads the dev server when the file changes, and checks that tokens and code agree.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const here = dirname(fileURLToPath(import.meta.url));
const DESIGN_FILE = resolve(here, '../design.md');
const SRC_DIR = resolve(here, 'src');

export type Tokens = Map<string, string>;

/** Parse the ```tokens blocks of design.md into [name, value] pairs. */
export function parseDesign(markdown: string): Tokens {
  const tokens: Tokens = new Map();
  for (const block of markdown.matchAll(/```tokens\n([\s\S]*?)```/g)) {
    for (const [i, raw] of block[1].split('\n').entries()) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const colon = line.indexOf(':');
      const name = colon > 0 ? line.slice(0, colon).trim() : '';
      if (!/^[a-z][a-z0-9_]*$/.test(name)) {
        throw new Error(`design.md: cannot read token line "${line}" (block line ${i + 1}); expected "name: value"`);
      }
      // A comment starts at " # " (hash followed by a space); "#ff2fb3" is a colour.
      const value = line.slice(colon + 1).split(/\s+#\s/)[0].trim();
      if (!value) throw new Error(`design.md: token "${name}" has no value`);
      if (tokens.has(name)) throw new Error(`design.md: token "${name}" is defined twice`);
      tokens.set(name, value);
    }
  }
  return tokens;
}

const cssName = (token: string) => `--d-${token.replace(/_/g, '-')}`;
const human = (cssVar: string) => cssVar.slice(4).replace(/-/g, '_');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.(css|svelte|ts)$/.test(entry) ? [path] : [];
  });
}

/** Every --d-* variable the code (or another token) refers to. */
function usedVariables(tokens: Tokens): Set<string> {
  const used = new Set<string>();
  const scan = (text: string) => text.match(/--d-[a-z0-9-]+/g)?.forEach((v) => used.add(v));
  sourceFiles(SRC_DIR).forEach((f) => scan(readFileSync(f, 'utf8')));
  tokens.forEach((value) => scan(value));
  return used;
}

function load(warn: (msg: string) => void): string {
  const tokens = parseDesign(readFileSync(DESIGN_FILE, 'utf8'));
  const defined = new Set([...tokens.keys()].map(cssName));
  const used = usedVariables(tokens);
  const missing = [...used].filter((v) => !defined.has(v));
  if (missing.length) throw new Error(`design.md is missing tokens the app uses: ${missing.map(human).join(', ')}`);
  const unused = [...defined].filter((v) => !used.has(v));
  if (unused.length) warn(`design.md has tokens nothing uses: ${unused.map(human).join(', ')}`);
  return `:root {\n${[...tokens].map(([n, v]) => `  ${cssName(n)}: ${v};`).join('\n')}\n}`;
}

export default function design(): Plugin {
  return {
    name: 'othello-design',
    buildStart() {
      load((m) => this.warn(m)); // fail the build early on a bad design.md
    },
    configureServer(server) {
      server.watcher.add(DESIGN_FILE);
      server.watcher.on('change', (file) => {
        if (resolve(file) === DESIGN_FILE) {
          server.config.logger.info('design.md changed, reloading', { timestamp: true });
          server.ws.send({ type: 'full-reload' });
        }
      });
    },
    transformIndexHtml: {
      order: 'pre',
      handler() {
        const css = load((m) => console.warn(`\n[design] ${m}`));
        return [{ tag: 'style', attrs: { id: 'design-tokens' }, children: css, injectTo: 'head-prepend' }];
      }
    }
  };
}
