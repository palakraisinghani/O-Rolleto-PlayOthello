// Loads Oroletto into onnxruntime-web (WebAssembly, runs inside the phone's or browser's web view).
// Imported lazily, so builds without the model never pay for the runtime.

import type { Evaluator, Levels } from './oroletto.ts';
import { levelsFromManifest } from './oroletto.ts';

export interface LoadedOroletto {
  evaluator: Evaluator;
  levels: Levels;
}

/** `base` is the folder that holds oroletto-8x8.onnx and oroletto-8x8.json. The WebAssembly runtime is emitted by the bundler. */
export async function loadOroletto(base = './oroletto/'): Promise<LoadedOroletto> {
  const ort = await import('onnxruntime-web/wasm');
  ort.env.wasm.numThreads = 1; // no cross-origin isolation inside a web view, so no threads
  const [model, manifest] = await Promise.all([
    fetch(`${base}oroletto-8x8.onnx`).then((r) => {
      if (!r.ok) throw new Error(`model: ${r.status}`);
      return r.arrayBuffer();
    }),
    fetch(`${base}oroletto-8x8.json`).then((r) => (r.ok ? r.json() : {})).catch(() => ({}))
  ]);
  const session = await ort.InferenceSession.create(new Uint8Array(model), { executionProviders: ['wasm'] });
  const evaluator: Evaluator = {
    async evaluate(planes) {
      const out = await session.run({ planes: new ort.Tensor('float32', planes, [1, 3, 8, 8]) });
      return { logits: out.policy_logits.data as Float32Array, value: (out.value.data as Float32Array)[0] };
    }
  };
  return { evaluator, levels: levelsFromManifest(manifest) };
}
