// End-to-end test of the built web page (web/othello.html) in a headless DOM:
// start a game, play, watch the computer answer, play a whole game, change a setting.
// Build the page first (npm run build:web), then run:  npm run test:web
import { JSDOM, VirtualConsole } from 'jsdom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

// jsdom cannot run <script type="module"> (which browsers defer until the page is parsed). The bundle is one
// self-contained chunk, so run it as a classic script moved to the end of <body>.
let html = readFileSync(fileURLToPath(new URL('../../web/othello.html', import.meta.url)), 'utf8');
const m = html.match(/<script type="module">([\s\S]*?)<\/script>/);
assert.ok(m, 'page has one inline module script');
html = html.replace(m[0], '').replace('</body>', () => `<script>${m[1]}</script></body>`);
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push(String(e.stack || e)));
vc.on('error', (e) => errors.push(String(e)));

const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.github.io/othello.html', virtualConsole: vc });
const { window } = dom;
const { document } = window;
// jsdom lacks these; the page only needs them for cosmetics.
window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
window.HTMLElement.prototype.scrollIntoView ??= () => {};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (sel) => document.querySelector(sel);
const qa = (sel) => [...document.querySelectorAll(sel)];
const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
const byText = (sel, text) => qa(sel).find((e) => e.textContent.trim().startsWith(text));
async function until(pred, what, ms = 5000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (pred()) return; await sleep(20); }
  throw new Error('timed out: ' + what);
}
const discs = () => qa('.cell .disc').length;
const legalCells = () => qa('.cell:not([disabled])');
const scoreText = () => qa('.player .count').map((e) => e.textContent.trim()).join('-');

await sleep(200);
assert.ok(q('.home'), 'home screen renders');
assert.ok(q('.wheel') && q('.logo'), 'hero + logo');
console.log('ok  home screen rendered');

// Start a game against the computer (difficulty 2 default), playing black.
click(byText('.menu .btn', 'Play vs Computer'));
await until(() => q('form'), 'setup form');
q('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await until(() => q('.board'), 'board');
assert.equal(discs(), 4, 'four starting discs');
assert.equal(scoreText(), '2-2');
assert.equal(legalCells().length, 4, 'four legal opening moves');
assert.ok(q('.splash'), 'chip splash plays at game start');
console.log('ok  new game: 4 discs, 4 legal moves, chip splash mounted');

// Make a move; the computer must answer by itself.
click(legalCells()[0]);
await until(() => discs() === 5, 'human move placed');
assert.equal(q('.status').textContent.includes('thinking'), true, 'status says the computer is thinking');
console.log('ok  human move placed ->', scoreText(), '| status:', q('.status').textContent.trim());
await until(() => qa('.history').some((h) => h.textContent.trim().split(' · ').length === 2), 'computer reply', 6000);
assert.equal(discs(), 6, 'computer placed one disc');
assert.ok(legalCells().length > 0, 'human has legal moves again');
console.log('ok  computer replied by itself ->', scoreText(), '|', q('.history').textContent.trim());

// Play a whole game to the end against the computer by always taking the first legal square.
let moves = 0;
const t0 = Date.now();
while (!q('.overlay') && Date.now() - t0 < 90000) {
  const cells = legalCells();
  if (cells.length) { click(cells[0]); moves++; await sleep(30); } else await sleep(40);
}
assert.ok(q('.overlay'), 'game reached the result dialog');
const total = qa('.cell .disc').length;
console.log(`ok  full game finished after ${moves} human moves; result: "${q('.result').textContent.trim()}", discs on board: ${total}, score ${scoreText()}`);
assert.ok(q('.rain') || !q('.celebrate'), 'rain only on a win');

// Result buttons work: Home, then settings persist across a reload of the page state.
click(byText('.overlay .btn', 'Home'));
await until(() => q('.home'), 'home again');
click(byText('.menu .btn', 'Settings'));
await until(() => qa('input[type=checkbox]').length === 3, 'settings screen');
const [legal] = qa('input[type=checkbox]');
legal.checked = false; legal.dispatchEvent(new window.Event('change', { bubbles: true }));
await sleep(50);
const saved = JSON.parse(window.localStorage.getItem('othello-player.settings'));
assert.equal(saved.show_legal_moves, false);
console.log('ok  settings saved to localStorage:', JSON.stringify(saved));

assert.deepEqual(errors, [], 'no script errors: ' + errors.join('\n'));
console.log('ok  no script errors');
window.close();
