import { ModifierType, StatModifier } from './StatModifier.js';

const attributeClamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

/**
 * A dirty-cached layered numeric attribute.
 */
export class Attribute {
  /**
   * @param {object} options Attribute configuration.
   * @param {string} options.name Attribute name.
   * @param {number} [options.base=0] Unmodified base value.
   * @param {number} [options.min=-Infinity] Effective lower bound.
   * @param {number} [options.max=Infinity] Effective upper bound.
   */
  constructor({ name, base = 0, min = -Infinity, max = Infinity } = {}) {
    if (!name) throw new TypeError('An attribute requires a name.');
    if (!Number.isFinite(base) || (!Number.isFinite(min) && min !== -Infinity)
      || (!Number.isFinite(max) && max !== Infinity)) {
      throw new TypeError('Attribute bounds and base must be numeric.');
    }
    if (min > max) throw new RangeError('Attribute minimum cannot exceed maximum.');
    this.name = String(name);
    this.base = base;
    this.min = min;
    this.max = max;
    this.modifiers = new Map();
    this.cachedValue = base;
    this.isDirty = true;
    this.recalculationCount = 0;
  }

  /** @returns {number} Current effective value, recalculated only when dirty. */
  get value() {
    if (this.isDirty) this.recalculate();
    return this.cachedValue;
  }

  /**
   * Updates the unmodified value and invalidates the cache.
   *
   * @param {number} value New base value.
   * @returns {Attribute} This attribute.
   */
  setBase(value) {
    if (!Number.isFinite(value)) throw new TypeError('Attribute base must be finite.');
    if (this.base !== value) {
      this.base = value;
      this.isDirty = true;
    }
    return this;
  }

  /**
   * Adds or replaces one modifier.
   *
   * @param {StatModifier|string} modifier Modifier instance or identifier.
   * @param {string} [type] Modifier type when using the shorthand form.
   * @param {number} [value] Modifier value when using the shorthand form.
   * @param {string} [source='generic'] Modifier source when using the shorthand form.
   * @returns {Attribute} This attribute.
   */
  addModifier(modifier, type, value, source = 'generic') {
    const resolved = modifier instanceof StatModifier
      ? modifier
      : new StatModifier({ id: modifier, type, value, source });
    this.modifiers.set(resolved.id, resolved);
    this.isDirty = true;
    return this;
  }

  /**
   * Removes a modifier by identifier.
   *
   * @param {string} id Modifier identifier.
   * @returns {boolean} Whether a modifier was removed.
   */
  removeModifier(id) {
    const removed = this.modifiers.delete(id);
    if (removed) this.isDirty = true;
    return removed;
  }

  /**
   * Removes every modifier belonging to a source.
   *
   * @param {string} source Modifier source.
   * @returns {number} Number of removed modifiers.
   */
  removeModifiersBySource(source) {
    let removed = 0;
    for (const [id, modifier] of this.modifiers) {
      if (modifier.source === source) {
        this.modifiers.delete(id);
        removed += 1;
      }
    }
    if (removed > 0) this.isDirty = true;
    return removed;
  }

  /**
   * Explicitly marks the cached value stale.
   */
  invalidate() { this.isDirty = true; }

  /**
   * Evaluates the required deterministic modifier precedence formula.
   *
   * @returns {number} New effective value.
   */
  recalculate() {
    let flatSum = 0;
    let additiveSum = 0;
    let multiplicativeProduct = 1;
    for (const modifier of this.modifiers.values()) {
      if (modifier.type === ModifierType.FLAT) flatSum += modifier.value;
      else if (modifier.type === ModifierType.PERCENT_ADDITIVE) additiveSum += modifier.value;
      else multiplicativeProduct *= 1 + modifier.value;
    }
    this.cachedValue = attributeClamp(
      ((this.base + flatSum) * (1 + additiveSum)) * multiplicativeProduct,
      this.min,
      this.max,
    );
    this.isDirty = false;
    this.recalculationCount += 1;
    return this.cachedValue;
  }

  /** @returns {object} Persistable attribute state. */
  serialise() {
    return {
      name: this.name,
      base: this.base,
      min: this.min,
      max: this.max,
      modifiers: [...this.modifiers.values()].map((modifier) => modifier.serialise()),
    };
  }

  /**
   * Restores an attribute from state.
   *
   * @param {object} state Attribute state.
   * @returns {Attribute} Restored attribute.
   */
  static deserialise(state) {
    const attribute = new Attribute(state);
    for (const modifier of state.modifiers ?? []) attribute.addModifier(new StatModifier(modifier));
    return attribute;
  }
}
