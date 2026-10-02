import { Attribute, HeatSource, SurvivalVitalManager } from '../../release/littleenvironment.min.js';

const attributes = new Map([['insulation', new Attribute({ name: 'insulation', base: 7, min: 0 })]]);
const character = {
  x: 0,
  y: 0,
  getAttribute: (name) => attributes.get(name),
  takeDamage: (payload) => console.log('Drowning damage', payload.rawAmount),
};
const vitals = new SurvivalVitalManager({ targetCharacter: character });
let fireEnabled = false;
let submerged = false;

document.querySelector('#fire').addEventListener('click', () => { fireEnabled = !fireEnabled; });
document.querySelector('#water').addEventListener('click', () => { submerged = !submerged; });

setInterval(() => {
  vitals.setSubmerged(submerged);
  vitals.update(0.25, { ambientTemperature: -12, isRaining: true }, fireEnabled ? [new HeatSource({ radius: 100, heatOutput: 35 })] : []);
  document.querySelector('#readout').textContent = JSON.stringify(vitals.snapshot(), null, 2);
}, 250);
