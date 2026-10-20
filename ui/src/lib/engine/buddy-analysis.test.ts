// End to end with the real network: games played by Oroletto at a known skill (against a random opponent)
// must be measured in the right order.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import * as ort from 'onnxruntime-web';
import { Rng } from './ai.ts';
import { measureGame } from './buddy-analysis.ts';
import { sampleMove, tFromSkill } from './buddy.ts';
import { search, type Evaluator } from './oroletto.ts';
import { PASS, Position, moveName, type Side } from './position.ts';

const model = readFileSync(new URL('../../../../models/oroletto-8x8.onnx', import.meta.url));

async function evaluator(): Promise<Evaluator> {
  ort.env.wasm.numThreads = 1;
  const session = await ort.InferenceSession.create(new Uint8Array(model));
  return {
    async evaluate(planes) {
      const out = await session.run({ planes: new ort.Tensor('float32', planes, [1, 3, 8, 8]) });
      return { logits: out.policy_logits.data as Float32Array, value: (out.value.data as Float32Array)[0] };
    }
  };
}

/** The player picks with Oroletto at temperature T(skill); the opponent plays uniformly at random. */
async function playGame(skill: number, human: Side, ev: Evaluator, rng: Rng): Promise<string[]> {
  let p = Position.initial();
  const history: string[] = [];
  while (!p.isTerminal()) {
    const legal = p.legalMoves();
    let move: number;
    if (legal.length === 1) move = legal[0];
    else if (p.toMove === human) {
      const r = (await search(p, 100, ev))!;
      move = r.moves[sampleMove(r.visits, tFromSkill(skill), rng)];
    }
    else move = rng.pick(legal);
    history.push(moveName(move));
    p = p.play(move).position;
  }
  return history;
}

test('Oroletto-played games are measured in order of skill', { timeout: 240_000 }, async () => {
  const ev = await evaluator();
  const rng = new Rng(2024);
  const measured: number[] = [];
  for (const skill of [0.1, 0.5, 1]) {
    const est = await measureGame(await playGame(skill, 'black', ev, rng), 'black', ev);
    assert.ok(est && est.moves >= 15, 'enough informative moves');
    measured.push(est.skill);
  }
  console.log('measured skills for true 0.1 / 0.5 / 1.0:', measured.map((x) => x.toFixed(2)).join(' / '));
  assert.ok(measured[0] < measured[1] && measured[1] < measured[2], `not in order: ${measured}`);
  assert.ok(measured[2] > 0.7, `a perfect player should score high: ${measured[2]}`);
});

export { PASS };
