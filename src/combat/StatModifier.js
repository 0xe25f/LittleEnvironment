/**
 * Modifier operation types applied by an Attribute.
 *
 * @readonly
 */
export const ModifierType = Object.freeze({
  FLAT: 0,
  PERCENT_ADDITIVE: 1,
  PERCENT_MULTIPLICATIVE: 2,
});

/**
 * Immutable description of one layered attribute modifier.
 */
export class StatModifier {
  /**
   * @param {object} options Modifier values.
   * @param {string} options.id Unique modifier identifier.
   * @param {string} options.type Modifier operation type.
   * @param {number} options.value Modifier magnitude.
   * @param {string} [options.source='generic'] Owning system identifier.
   */
  constructor({ id, type = ModifierType.FLAT, value = 0, source = 'generic' } = {}) {
    if (!id) throw new TypeError('A stat modifier requires an identifier.');
    if (!Object.values(ModifierType).includes(type)) throw new RangeError(`Unknown modifier type: ${type}.`);
    if (!Number.isFinite(value)) throw new TypeError('A stat modifier value must be finite.');
    this.id = String(id);
    this.type = type;
    this.value = value;
    this.source = String(source);
    Object.freeze(this);
  }

  /** @returns {object} Plain serialisable modifier data. */
  serialise() { return { id: this.id, type: this.type, value: this.value, source: this.source }; }
}
