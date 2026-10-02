/**
 * Deterministic experience requirement curve.
 */
export class ExperienceCurve {
  /**
   * @param {object} [options] Curve configuration.
   * @param {'exponential'|'polynomial'} [options.mode='exponential'] Curve form.
   * @param {number} [options.baseXP=100] Base experience requirement.
   * @param {number} [options.exponent=1.6] Level exponent.
   * @param {number} [options.flatStep=40] Linear step per completed level.
   */
  constructor({ mode = 'exponential', baseXP = 100, exponent = 1.6, flatStep = 40 } = {}) {
    if (!['exponential', 'polynomial'].includes(mode)) throw new RangeError(`Unknown experience curve mode: ${mode}.`);
    if (![baseXP, exponent, flatStep].every(Number.isFinite) || baseXP <= 0 || exponent <= 0) {
      throw new RangeError('Experience curve constants must be positive finite values.');
    }
    this.mode = mode;
    this.baseXP = baseXP;
    this.exponent = exponent;
    this.flatStep = flatStep;
  }

  /**
   * Gets experience required to advance from one level.
   *
   * @param {number} level Current level.
   * @param {number} [maxLevel=Infinity] Optional level ceiling.
   * @returns {number} Required experience, or Infinity at the ceiling.
   */
  getRequirement(level, maxLevel = Infinity) {
    if (!Number.isInteger(level) || level < 1) throw new RangeError('Experience level must be a positive integer.');
    if (level >= maxLevel) return Infinity;
    const power = this.mode === 'polynomial'
      ? level * level * this.exponent
      : level ** this.exponent;
    return Math.max(1, Math.floor(this.baseXP * power + this.flatStep * (level - 1)));
  }

  /** @returns {object} Persistable curve configuration. */
  serialise() { return { mode: this.mode, baseXP: this.baseXP, exponent: this.exponent, flatStep: this.flatStep }; }
}
