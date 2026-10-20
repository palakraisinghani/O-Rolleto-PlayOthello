// Oroletto parity: the TypeScript search must reproduce OthelloRL's root visit counts exactly
// (tests/golden/parity_8x8.json), using the shipped ONNX model through onnxruntime.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import * as ort from 'onnxruntime-web';
import { Position } from './position.ts';
import { encode, search, type Evaluator } from './oroletto.ts';

const root = new URL('../../../../', import.meta.url);
// The bitboards are 64-bit integers, which JSON.parse would round, so quote them first.
const parity = JSON.parse(
  readFileSync(new URL('tests/golden/parity_8x8.json', root), 'utf8').replace(/"(black|white)": (\d+)/g, '"$1": "$2"')
);
const model = readFileSync(new URL('models/oroletto-8x8.onnx', root));

async function makeEvaluator(): Promise<Evaluator> {
  ort.env.wasm.numThreads = 1;
  const session = await ort.InferenceSession.create(new Uint8Array(model));
  return {
    async evaluate(planes) {
      const out = await session.run({ planes: new ort.Tensor('float32', planes, [1, 3, 8, 8]) });
      return { logits: out.policy_logits.data as Float32Array, value: (out.value.data as Float32Array)[0] };
    }
  };
}

const position = (c: { black: number | string; white: number | string; to_move: string }) =>
  new Position(BigInt(c.black), BigInt(c.white), c.to_move as 'black' | 'white');

test('encode matches the fixture planes', () => {
  for (const c of parity.positions.slice(0, 10)) {
    const flat = (c.planes as number[][][]).flat(2);
    assert.deepEqual(Array.from(encode(position(c))), flat);
  }
});

test('network output matches the fixture', async () => {
  const ev = await makeEvaluator();
  for (const c of parity.positions.slice(0, 10)) {
    const r = await ev.evaluate(encode(position(c)));
    assert.ok(Math.abs(r.value - c.value) < 1e-3, 'value');
    for (let i = 0; i < 65; i++) assert.ok(Math.abs(r.logits[i] - c.policy_logits[i]) < 1e-3, `logit ${i}`);
  }
});

test('search reproduces the root visit counts exactly', async () => {
  const ev = await makeEvaluator();
  for (const [idx, c] of parity.positions.entries()) {
    for (const sims of [16, 64, 200]) {
      const want = c.search[String(sims)].visits as Record<string, number>;
      const got = await search(position(c), sims, ev);
      assert.ok(got);
      const have: Record<string, number> = {};
      got.moves.forEach((m, i) => (have[String(m)] = got.visits[i]));
      assert.deepEqual(have, want, `position ${idx}, ${sims} sims`);
    }
  }
});
