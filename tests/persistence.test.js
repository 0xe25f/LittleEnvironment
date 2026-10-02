import assert from 'node:assert/strict';
import test from 'node:test';
import { Attribute, EnvironmentSerialiser, SchemaMigrator } from '../src/index.js';

test('serialiser persists lossless world and character state', () => {
  const serialiser = new EnvironmentSerialiser();
  const input = { world: { dayCount: 14, weather: 'rain', time: 0.425 }, character: { level: 6, bodyTemperature: 36.8, effects: [{ id: 'wet', stacks: 2 }] } };
  assert.deepEqual(serialiser.deserialise(serialiser.serialise(input)), { version: 1, ...input, metadata: {} });
});

test('serialiser retains values that plain JSON cannot encode', () => {
  const serialiser = new EnvironmentSerialiser();
  const input = { character: { attribute: new Attribute({ name: 'health', base: 10, max: Infinity }), marker: undefined, value: Number.NaN } };
  const restored = serialiser.deserialise(serialiser.serialise(input));
  assert.equal(restored.character.attribute.max, Infinity);
  assert.equal(restored.character.marker, undefined);
  assert.equal(Number.isNaN(restored.character.value), true);
});

test('migrator applies contiguous forward schema migrations without input mutation', () => {
  const migrator = new SchemaMigrator(3)
    .register(1, (state) => ({ ...state, world: { ...state.world, weather: state.world.climate ?? 'clear' } }))
    .register(2, (state) => ({ ...state, character: { ...state.character, thirst: state.character.thirst ?? 100 } }));
  const oldState = { version: 1, world: { climate: 'rain' }, character: {} };
  assert.deepEqual(migrator.migrate(oldState), { version: 3, world: { climate: 'rain', weather: 'rain' }, character: { thirst: 100 } });
  assert.deepEqual(oldState, { version: 1, world: { climate: 'rain' }, character: {} });
});
