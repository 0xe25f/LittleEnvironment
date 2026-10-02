import assert from 'node:assert/strict';
import test from 'node:test';
import { Attribute, CombatResolver, DamagePayload, ModifierType } from '../src/index.js';

const makeCombatant = (attributes) => ({
  attributes: new Map(Object.entries(attributes)),
  shields: [],
  getAttribute(name) { return this.attributes.get(name); },
});

test('attributes apply required precedence and dirty-cache invalidation', () => {
  const attribute = new Attribute({ name: 'power', base: 100, min: 0 });
  attribute.addModifier('flat', ModifierType.FLAT, 10);
  attribute.addModifier('add', ModifierType.PERCENT_ADDITIVE, 0.2);
  attribute.addModifier('mult', ModifierType.PERCENT_MULTIPLICATIVE, 0.5);
  assert.equal(attribute.value, 198);
  const count = attribute.recalculationCount;
  assert.equal(attribute.value, 198);
  assert.equal(attribute.recalculationCount, count);
  attribute.removeModifier('flat');
  assert.equal(attribute.value, 180);
});

test('combat mitigates armour, shields, criticals, and never heals from negative damage', () => {
  const attacker = makeCombatant({
    critChance: new Attribute({ name: 'critChance', base: 1 }),
    critDamage: new Attribute({ name: 'critDamage', base: 2 }),
  });
  const target = makeCombatant({
    health: new Attribute({ name: 'health', base: 100, min: 0 }),
    armour: new Attribute({ name: 'armour', base: 100, min: 0 }),
  });
  target.shields.push({ amount: 10 });
  const receipt = CombatResolver.resolveDamage(target, new DamagePayload({ rawAmount: 100, attacker }), { random: () => 0 });
  assert.equal(receipt.isCrit, true);
  assert.equal(receipt.absorbedDamage, 10);
  assert.equal(receipt.appliedDamage, 90);
  assert.equal(target.getAttribute('health').base, 10);
  const harmless = CombatResolver.resolveDamage(target, { rawAmount: -5, isTrueDamage: true });
  assert.equal(harmless.appliedDamage, 0);
  assert.equal(target.getAttribute('health').base, 10);
});
