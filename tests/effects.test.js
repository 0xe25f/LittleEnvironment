import assert from 'node:assert/strict';
import test from 'node:test';
import { Attribute, ModifierType, StackPolicy, StatusEffectManager } from '../src/index.js';

const makeTarget = () => ({
  attributes: new Map([['speed', new Attribute({ name: 'speed', base: 100 })]]),
  getAttribute(name) { return this.attributes.get(name); },
});

test('effects process all lagged ticks and retain fractional accumulator time', () => {
  const ticks = [];
  const manager = new StatusEffectManager(makeTarget());
  manager.apply({ id: 'poison', duration: 5, tickInterval: 0.5, onTick: (_target, stacks) => ticks.push(stacks) });
  manager.update(1.25);
  assert.deepEqual(ticks, [1, 1]);
  assert.equal(manager.effects.get('poison').accumulator, 0.25);
  manager.update(0.25);
  assert.deepEqual(ticks, [1, 1, 1]);
});

test('intensity, duration, refresh, independent and dispel policies clean modifiers', () => {
  const target = makeTarget();
  const manager = new StatusEffectManager(target);
  const frost = { id: 'frost', duration: 2, stackPolicy: StackPolicy.INTENSITY, maxStacks: 3, modifiers: [{ attribute: 'speed', type: ModifierType.PERCENT_ADDITIVE, value: -0.1 }] };
  manager.apply(frost);
  manager.apply(frost);
  assert.equal(target.getAttribute('speed').value, 80);
  manager.dispelByTag('missing');
  manager.remove('frost');
  assert.equal(target.getAttribute('speed').value, 100);
  manager.apply({ id: 'dot', duration: 1, stackPolicy: StackPolicy.DURATION });
  manager.apply({ id: 'dot', duration: 1, stackPolicy: StackPolicy.DURATION });
  assert.equal(manager.effects.get('dot').remaining, 2);
  manager.apply({ id: 'spark', stackPolicy: StackPolicy.INDEPENDENT });
  manager.apply({ id: 'spark', stackPolicy: StackPolicy.INDEPENDENT });
  assert.equal([...manager.effects.values()].filter((effect) => effect.id === 'spark').length, 2);
});
