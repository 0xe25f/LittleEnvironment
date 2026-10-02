import assert from 'node:assert/strict';
import test from 'node:test';
import { AmbientColorGradient, LightSource, LightingCompositor } from '../src/index.js';

test('ambient gradient interpolates cyclic colour frames', () => {
  const gradient = new AmbientColorGradient([
    { t: 0, colour: { r: 0, g: 0, b: 0, a: 1 } },
    { t: 0.5, colour: { r: 100, g: 200, b: 50, a: 0 } },
  ]);
  assert.deepEqual(gradient.evaluate(0.25), { r: 50, g: 100, b: 25, a: 0.5 });
  assert.deepEqual(gradient.evaluate(0.75), { r: 50, g: 100, b: 25, a: 0.5 });
});

test('lights are deterministic and compositor culls invisible sources', () => {
  const light = new LightSource({ id: 'torch', position: { x: 20, y: 20 }, radius: 10, flickerAmount: 0.1 });
  assert.equal(light.getEffectiveRadius(3), light.getEffectiveRadius(3));
  const compositor = new LightingCompositor();
  compositor.addLight(light);
  compositor.addLight(new LightSource({ id: 'far', position: { x: 1000, y: 1000 }, radius: 10 }));
  const frame = compositor.createFrame(0.5, { x: 0, y: 0, width: 100, height: 100 }, 3);
  assert.equal(frame.lights.length, 1);
  assert.equal(frame.lights[0].id, 'torch');
});
