import assert from 'node:assert/strict';
import test from 'node:test';
import { Attribute, CharacterProgression, ExperienceCurve } from '../src/index.js';

test('experience curves support exponential and polynomial requirements', () => {
  assert.equal(new ExperienceCurve({ baseXP: 10, exponent: 2, flatStep: 0 }).getRequirement(3), 90);
  assert.equal(new ExperienceCurve({ mode: 'polynomial', baseXP: 10, exponent: 2, flatStep: 0 }).getRequirement(3), 180);
});

test('progression carries overflow through multiple levels and grows base attributes', () => {
  const health = new Attribute({ name: 'health', base: 10 });
  const target = { getAttribute: (name) => (name === 'health' ? health : undefined) };
  const progression = new CharacterProgression({
    targetCharacter: target,
    maxLevel: 4,
    curve: new ExperienceCurve({ baseXP: 10, exponent: 1, flatStep: 0 }),
    statGrowths: { health: 5 },
  });
  const result = progression.grantXP(35);
  assert.equal(result.levelsGained, 2);
  assert.equal(progression.level, 3);
  assert.equal(progression.currentXP, 5);
  assert.equal(health.base, 20);
  assert.equal(progression.unspentPerkPoints, 2);
});
