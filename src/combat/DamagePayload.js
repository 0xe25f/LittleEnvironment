/**
 * Immutable input to the combat damage pipeline.
 */
export class DamagePayload {
  /**
   * @param {object} [options] Damage values.
   */
  constructor({
    rawAmount = 0,
    type = 'physical',
    attacker = null,
    canCrit = true,
    isTrueDamage = false,
    tags = [],
    random = null,
    metadata = {},
  } = {}) {
    if (!Number.isFinite(rawAmount)) throw new TypeError('Damage amount must be finite.');
    this.rawAmount = Math.max(0, rawAmount);
    this.type = String(type);
    this.attacker = attacker;
    this.canCrit = Boolean(canCrit);
    this.isTrueDamage = Boolean(isTrueDamage) || this.type === 'true';
    this.tags = [...tags];
    this.random = random;
    this.metadata = { ...metadata };
    Object.freeze(this.tags);
    Object.freeze(this.metadata);
    Object.freeze(this);
  }

  /**
   * Converts plain input into a payload instance.
   *
   * @param {DamagePayload|object} payload Damage input.
   * @returns {DamagePayload} Payload instance.
   */
  static from(payload) { return payload instanceof DamagePayload ? payload : new DamagePayload(payload); }
}
