import { Attribute, CombatResolver, StackPolicy, StatusEffectManager } from '../../release/littleenvironment.min.js';

const attributes = new Map([
  ['health', new Attribute({ name: 'health', base: 100, min: 0, max: 100 })],
  ['armour', new Attribute({ name: 'armour', base: 35, min: 0 })],
]);
const target = { attributes, shields: [{ amount: 15 }], getAttribute: (name) => attributes.get(name) };
const effects = new StatusEffectManager(target);
const readout = document.querySelector('#readout');

function show(value) { readout.textContent = JSON.stringify(value, null, 2); }

document.querySelector('#attack').addEventListener('click', () => show(CombatResolver.resolveDamage(target, { rawAmount: 40, type: 'physical', canCrit: false })));
document.querySelector('#frost').addEventListener('click', () => effects.apply({
  id: 'frostbite',
  duration: 5,
  tickInterval: 1,
  stackPolicy: StackPolicy.INTENSITY,
  maxStacks: 3,
  onTick: (_target, stacks) => show(CombatResolver.resolveDamage(target, { rawAmount: 3 * stacks, type: 'frost', canCrit: false })),
}));

setInterval(() => effects.update(0.25), 250);
show({ health: target.getAttribute('health').value, shield: target.shields[0].amount });
