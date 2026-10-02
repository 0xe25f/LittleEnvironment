import { EnvironmentEvents } from '../events/EnvironmentEvents.js';
import { ExperienceCurve } from './ExperienceCurve.js';

/**
 * Character level, experience rollover, attribute growth, and perk tracking.
 */
export class CharacterProgression {
  /**
   * @param {object} [options] Progression configuration.
   */
  constructor({
    targetCharacter,
    maxLevel = 50,
    level = 1,
    currentXP = 0,
    curve,
    mode,
    baseXP,
    exponent,
    flatStep,
    statGrowths = {},
    unspentPerkPoints = 0,
  } = {}) {
    if (!Number.isInteger(maxLevel) || maxLevel < 1) throw new RangeError('Maximum level must be a positive integer.');
    if (!Number.isInteger(level) || level < 1 || level > maxLevel) throw new RangeError('Initial level is out of range.');
    this.target = targetCharacter ?? null;
    this.maxLevel = maxLevel;
    this.level = level;
    this.currentXP = Math.max(0, Number(currentXP) || 0);
    this.curve = curve ?? new ExperienceCurve({ mode, baseXP, exponent, flatStep });
    this.statGrowths = { ...statGrowths };
    this.unspentPerkPoints = Math.max(0, Number(unspentPerkPoints) || 0);
    this.resolveLevelUps();
  }

  /** @returns {number} Experience needed for the next level. */
  get nextLevelXP() { return this.getXPForLevel(this.level); }

  /**
   * Gets the requirement for a level transition.
   *
   * @param {number} level Current level.
   * @returns {number} Required experience.
   */
  getXPForLevel(level) { return this.curve.getRequirement(level, this.maxLevel); }

  /**
   * Grants non-negative experience and preserves all multi-level overflow.
   *
   * @param {number} amount Experience to grant.
   * @returns {{levelsGained: number, currentXP: number, level: number}} Grant result.
   */
  grantXP(amount) {
    if (!Number.isFinite(amount) || amount < 0) throw new RangeError('Granted experience must be non-negative and finite.');
    this.currentXP += amount;
    const levelsGained = this.resolveLevelUps();
    return { levelsGained, currentXP: this.currentXP, level: this.level };
  }

  /**
   * Spends one available perk point.
   *
   * @returns {boolean} Whether a point was spent.
   */
  spendPerkPoint() {
    if (this.unspentPerkPoints <= 0) return false;
    this.unspentPerkPoints -= 1;
    return true;
  }

  /**
   * Consumes level requirements until no further level can be gained.
   *
   * @returns {number} Number of gained levels.
   */
  resolveLevelUps() {
    let levelsGained = 0;
    while (this.level < this.maxLevel) {
      const requirement = this.getXPForLevel(this.level);
      if (this.currentXP < requirement) break;
      this.currentXP -= requirement;
      this.level += 1;
      this.unspentPerkPoints += 1;
      levelsGained += 1;
      this.applyGrowth();
      this.target?.emit?.(EnvironmentEvents.LEVEL_UP, { level: this.level, points: this.unspentPerkPoints });
      this.target?.emit?.('onLevelUp', { level: this.level, points: this.unspentPerkPoints });
    }
    return levelsGained;
  }

  /**
   * Adds configured growth to base attributes without disturbing modifiers.
   */
  applyGrowth() {
    for (const [name, growth] of Object.entries(this.statGrowths)) {
      const attribute = this.target?.getAttribute?.(name);
      if (attribute) attribute.setBase(attribute.base + Number(growth));
    }
  }

  /** @returns {object} Persistable progression state. */
  serialise() {
    return {
      maxLevel: this.maxLevel,
      level: this.level,
      currentXP: this.currentXP,
      curve: this.curve.serialise(),
      statGrowths: { ...this.statGrowths },
      unspentPerkPoints: this.unspentPerkPoints,
    };
  }

  /**
   * Restores progression around a target character.
   *
   * @param {object} state Saved progression state.
   * @param {object} [options] Additional constructor options.
   * @returns {CharacterProgression} Restored progression.
   */
  static deserialise(state, options = {}) {
    return new CharacterProgression({ ...state, ...options, curve: new ExperienceCurve(state.curve) });
  }
}
