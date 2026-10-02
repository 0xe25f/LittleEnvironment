import assert from 'node:assert/strict';
import test from 'node:test';
import { Attribute, HeatSource, SurvivalVitalManager, ThermodynamicModel } from '../src/index.js';

const makeCharacter = () => {
  const attributes = new Map([['insulation', new Attribute({ name: 'insulation', base: 8 })]]);
  return {
    x: 0,
    y: 0,
    attributes,
    conditions: [],
    damage: 0,
    getAttribute(name) { return this.attributes.get(name); },
    applyStatusEffect(id) { this.conditions.push(`+${id}`); },
    removeStatusEffect(id) { this.conditions.push(`-${id}`); },
    takeDamage(payload) { this.damage += payload.rawAmount; },
  };
};

test('thermodynamic model exchanges heat smoothly and sources add radiant warmth', () => {
  const model = new ThermodynamicModel({ thermalConstant: 2, exchangeRate: 1 });
  const step = model.step(37, 17, 8, 1);
  assert.equal(step.temperature, 35);
  const source = new HeatSource({ x: 0, y: 0, radius: 10, heatOutput: 20 });
  assert.equal(model.calculateRadiantHeat({ x: 5, y: 0 }, [source]), 10);
});

test('vitals drain at sub-second accuracy and drowning causes true damage', () => {
  const character = makeCharacter();
  const vitals = new SurvivalVitalManager({
    targetCharacter: character,
    oxygen: 1,
    drowningDamagePerSecond: 10,
  });
  vitals.setSubmerged(true);
  vitals.update(0.5, { ambientTemperature: -20, isRaining: true });
  assert.ok(vitals.bodyTemperature < 37 && vitals.bodyTemperature > 30);
  assert.equal(vitals.oxygen, 0);
  assert.equal(character.damage, 5);
  assert.equal(vitals.hunger < 100, true);
  assert.equal(vitals.thirst < 100, true);
});
