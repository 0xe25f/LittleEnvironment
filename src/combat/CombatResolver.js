import { DamagePayload } from './DamagePayload.js';
import { EnvironmentEvents } from '../events/EnvironmentEvents.js';

const combatClamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const findAttribute = (target, names) => {
  for (const name of names) {
    const attribute = target?.getAttribute?.(name);
    if (attribute) return attribute;
  }
  return null;
};

/**
 * Five-stage deterministic combat damage resolver.
 */
export class CombatResolver {
  /**
   * Resolves one payload against a target.
   *
   * @param {object} target Target exposing `getAttribute` and optional shields.
   * @param {DamagePayload|object} input Damage input.
   * @param {object} [options] Resolution options.
   * @param {number} [options.defenceConstant=100] Diminishing-return defence constant.
   * @param {() => number} [options.random] Deterministic random provider for critical checks.
   * @returns {object} Detailed combat receipt.
   */
  static resolveDamage(target, input, options = {}) {
    if (!target) throw new TypeError('Combat resolution requires a target.');
    const settings = Number.isFinite(options) ? { defenceConstant: options } : options;
    const defenceConstant = settings.defenceConstant ?? settings.defenseK ?? 100;
    const { random } = settings;
    if (!Number.isFinite(defenceConstant) || defenceConstant <= 0) {
      throw new RangeError('Defence constant must be greater than zero.');
    }
    const payload = DamagePayload.from(input);
    let amount = payload.rawAmount;
    const originalAmount = amount;
    const randomValue = (random ?? payload.random ?? (() => 1))();
    let isCrit = false;
    let mitigation = 0;

    if (payload.canCrit && payload.attacker && !payload.isTrueDamage) {
      const chance = combatClamp(Number(findAttribute(payload.attacker, ['critChance', 'criticalChance'])?.value ?? 0), 0, 1);
      if (randomValue < chance) {
        isCrit = true;
        const multiplier = Math.max(0, Number(findAttribute(payload.attacker, ['critDamage', 'criticalDamage'])?.value ?? 1.5));
        amount *= multiplier;
      }
    }

    const preMitigationAmount = amount;
    if (!payload.isTrueDamage) {
      if (payload.type === 'physical') {
        const armour = Math.max(0, Number(findAttribute(target, ['armour', 'armor', 'defence', 'defense'])?.value ?? 0));
        mitigation = armour / (armour + defenceConstant);
      } else {
        const resistance = Number(findAttribute(target, [
          `res_${payload.type}`,
          `resistance_${payload.type}`,
          `${payload.type}Resistance`,
        ])?.value ?? 0);
        mitigation = combatClamp(resistance, -1, 0.85);
      }
      amount *= 1 - mitigation;
    }
    amount = Math.max(0, amount);

    let absorbedDamage = 0;
    const shields = Array.isArray(target.shields) ? target.shields : [];
    for (let index = shields.length - 1; index >= 0 && amount > 0; index -= 1) {
      const shield = shields[index];
      const available = Math.max(0, Number(shield.amount ?? 0));
      const absorbed = Math.min(available, amount);
      shield.amount = available - absorbed;
      amount -= absorbed;
      absorbedDamage += absorbed;
      if (shield.amount <= 0) shields.splice(index, 1);
    }

    const appliedDamage = Math.max(0, amount);
    const health = findAttribute(target, ['health', 'hp']);
    if (health) health.setBase(Math.max(0, health.base - appliedDamage));
    const receipt = {
      originalAmount,
      criticalAmount: preMitigationAmount,
      mitigation,
      mitigatedDamage: Math.max(0, preMitigationAmount - appliedDamage - absorbedDamage),
      absorbedDamage,
      appliedDamage,
      isCrit,
      isTrueDamage: payload.isTrueDamage,
      damageType: payload.type,
      isDead: health ? health.base <= 0 : Boolean(target.isDead),
      target,
      attacker: payload.attacker,
      payload,
    };
    target.emit?.(EnvironmentEvents.DAMAGE_RESOLVED, receipt);
    target.emit?.('onDamageTaken', receipt);
    payload.attacker?.emit?.('onDamageDealt', receipt);
    return receipt;
  }
}
