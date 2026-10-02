import { EnvironmentEvents } from '../events/EnvironmentEvents.js';
import { ThermodynamicModel } from './ThermodynamicModel.js';

const vitalClamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

/**
 * Headless physiological survival simulation for one character.
 */
export class SurvivalVitalManager {
  /**
   * @param {object} [options] Vital configuration.
   */
  constructor({
    targetCharacter,
    baseWarmth = 37,
    hunger = 100,
    thirst = 100,
    stamina = 100,
    oxygen = 100,
    thermodynamicModel = new ThermodynamicModel(),
    hungerDrainPerSecond = 0.12,
    thirstDrainPerSecond = 0.2,
    oxygenDrainPerSecond = 12,
    oxygenRecoveryPerSecond = 25,
    drowningDamagePerSecond = 15,
  } = {}) {
    this.character = targetCharacter ?? null;
    this.bodyTemperature = baseWarmth;
    this.hunger = vitalClamp(hunger, 0, 100);
    this.thirst = vitalClamp(thirst, 0, 100);
    this.stamina = vitalClamp(stamina, 0, 100);
    this.oxygen = vitalClamp(oxygen, 0, 100);
    this.isSubmerged = false;
    this.isSprinting = false;
    this.thermodynamicModel = thermodynamicModel;
    this.hungerDrainPerSecond = hungerDrainPerSecond;
    this.thirstDrainPerSecond = thirstDrainPerSecond;
    this.oxygenDrainPerSecond = oxygenDrainPerSecond;
    this.oxygenRecoveryPerSecond = oxygenRecoveryPerSecond;
    this.drowningDamagePerSecond = drowningDamagePerSecond;
    this.conditions = new Set();
  }

  /** @returns {number} Compatibility alias for core body temperature. */
  get bodyTemp() { return this.bodyTemperature; }
  /** @param {number} value Core temperature. */
  set bodyTemp(value) { this.bodyTemperature = value; }

  /**
   * Advances thermal and vital state without DOM or renderer dependencies.
   *
   * @param {number} deltaSeconds Simulation delta.
   * @param {object} [environment] Environmental inputs.
   * @param {Array<object>} [heatSources] Nearby radiant heat sources.
   * @returns {object} Current vital snapshot.
   */
  update(deltaSeconds, environment = {}, heatSources = []) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new RangeError('Vital delta seconds must be finite and non-negative.');
    }
    if (this.character?.isDead) return this.snapshot();
    const position = { x: this.character?.x ?? 0, y: this.character?.y ?? 0 };
    const ambientTemperature = Number(environment.ambientTemperature ?? 20);
    const weatherOffset = Number(environment.weatherTempOffset ?? environment.temperatureOffset ?? 0);
    const wetnessPenalty = environment.isRaining || environment.wet ? -5 : 0;
    const radiantHeat = this.thermodynamicModel.calculateRadiantHeat(position, heatSources);
    const effectiveTemperature = ambientTemperature + weatherOffset + wetnessPenalty + radiantHeat;
    const insulation = this.getCharacterAttribute('insulation', 0);
    this.bodyTemperature = this.thermodynamicModel.step(
      this.bodyTemperature, effectiveTemperature, insulation, deltaSeconds,
    ).temperature;

    const shivering = this.bodyTemperature < 35.5;
    const sweating = this.bodyTemperature > 38;
    const sprintMultiplier = this.isSprinting || environment.isSprinting ? 1.35 : 1;
    const climateStaminaMultiplier = Number(environment.staminaDrainMultiplier ?? 1);
    this.hunger = vitalClamp(
      this.hunger - this.hungerDrainPerSecond * (shivering ? 1.6 : 1) * sprintMultiplier * deltaSeconds, 0, 100,
    );
    this.thirst = vitalClamp(
      this.thirst - this.thirstDrainPerSecond * (sweating ? 1.8 : 1) * sprintMultiplier * deltaSeconds, 0, 100,
    );
    this.updateStamina(deltaSeconds, { shivering, climateStaminaMultiplier, resting: environment.resting });
    this.updateOxygen(deltaSeconds);
    this.evaluateConditions();
    return this.snapshot();
  }

  /**
   * Sets water submersion state.
   *
   * @param {boolean} submerged Whether the character is submerged.
   */
  setSubmerged(submerged) { this.isSubmerged = Boolean(submerged); }

  /**
   * Sets sprinting state.
   *
   * @param {boolean} sprinting Whether the character is sprinting.
   */
  setSprinting(sprinting) { this.isSprinting = Boolean(sprinting); }

  /**
   * Restores a bounded vitality pool.
   *
   * @param {'hunger'|'thirst'|'stamina'|'oxygen'} pool Pool name.
   * @param {number} amount Positive restoration amount.
   */
  restore(pool, amount) {
    if (!['hunger', 'thirst', 'stamina', 'oxygen'].includes(pool)) {
      throw new RangeError(`Unknown vitality pool: ${pool}.`);
    }
    if (!Number.isFinite(amount) || amount < 0) throw new RangeError('Restoration amount must be non-negative.');
    this[pool] = vitalClamp(this[pool] + amount, 0, 100);
  }

  /**
   * Gets an effective numeric attribute from the target character.
   *
   * @param {string} name Attribute name.
   * @param {number} fallback Fallback value.
   * @returns {number} Effective attribute.
   */
  getCharacterAttribute(name, fallback) {
    const attribute = this.character?.getAttribute?.(name);
    return Number(attribute?.value ?? fallback);
  }

  /**
   * Applies stamina depletion or recovery.
   *
   * @param {number} deltaSeconds Simulation delta.
   * @param {object} state Current physiological state.
   */
  updateStamina(deltaSeconds, { shivering, climateStaminaMultiplier, resting }) {
    if (this.isSprinting) {
      this.stamina = vitalClamp(this.stamina - 8 * climateStaminaMultiplier * deltaSeconds, 0, 100);
      return;
    }
    const recovery = (resting ? 12 : 6) * (shivering ? 0.6 : 1) * (this.hunger === 0 || this.thirst === 0 ? 0.4 : 1);
    this.stamina = vitalClamp(this.stamina + recovery * deltaSeconds, 0, 100);
  }

  /**
   * Updates oxygen and issues deterministic true drowning damage.
   *
   * @param {number} deltaSeconds Simulation delta.
   */
  updateOxygen(deltaSeconds) {
    if (this.isSubmerged) {
      this.oxygen = vitalClamp(this.oxygen - this.oxygenDrainPerSecond * deltaSeconds, 0, 100);
      if (this.oxygen === 0 && this.drowningDamagePerSecond > 0) {
        this.character?.takeDamage?.({
          rawAmount: this.drowningDamagePerSecond * deltaSeconds,
          type: 'true',
          isTrueDamage: true,
          canCrit: false,
        });
      }
    } else {
      this.oxygen = vitalClamp(this.oxygen + this.oxygenRecoveryPerSecond * deltaSeconds, 0, 100);
    }
  }

  /**
   * Reconciles active physiological conditions with current thresholds.
   */
  evaluateConditions() {
    this.reconcileCondition('hypothermia_severe', this.bodyTemperature < 34.5);
    this.reconcileCondition('hypothermia_mild', this.bodyTemperature >= 34.5 && this.bodyTemperature < 35.5);
    this.reconcileCondition('hyperthermia_severe', this.bodyTemperature > 40);
    this.reconcileCondition('hyperthermia_mild', this.bodyTemperature > 39 && this.bodyTemperature <= 40);
    this.reconcileCondition('starvation_dying', this.hunger === 0);
    this.reconcileCondition('dehydration_dying', this.thirst === 0);
  }

  /**
   * Adds or removes a threshold condition exactly once per state change.
   *
   * @param {string} id Condition identifier.
   * @param {boolean} active Whether it should be active.
   */
  reconcileCondition(id, active) {
    const currentlyActive = this.conditions.has(id);
    if (active === currentlyActive) return;
    if (active) {
      this.conditions.add(id);
      this.character?.applyStatusEffect?.(id);
    } else {
      this.conditions.delete(id);
      this.character?.removeStatusEffect?.(id);
    }
    this.character?.emit?.(EnvironmentEvents.VITAL_THRESHOLD, { id, active, vitals: this.snapshot() });
  }

  /** @returns {object} Persistable vital state. */
  snapshot() {
    return {
      bodyTemperature: this.bodyTemperature,
      hunger: this.hunger,
      thirst: this.thirst,
      stamina: this.stamina,
      oxygen: this.oxygen,
      isSubmerged: this.isSubmerged,
      isSprinting: this.isSprinting,
      conditions: [...this.conditions],
    };
  }

  /** @returns {object} Persistable vital state. */
  serialise() { return this.snapshot(); }

  /**
   * Restores a manager state around a target character.
   *
   * @param {object} state Saved vitality state.
   * @param {object} options Additional constructor options.
   * @returns {SurvivalVitalManager} Restored manager.
   */
  static deserialise(state, options = {}) {
    const manager = new SurvivalVitalManager({ ...options, baseWarmth: state.bodyTemperature, ...state });
    manager.conditions = new Set(state.conditions ?? []);
    return manager;
  }
}
