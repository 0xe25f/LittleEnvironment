const climateClamp = (value, low, high) => Math.max(low, Math.min(high, value));

/**
 * Immutable catalogue of weather-driven climate and gameplay modifiers.
 */
export class ClimateMatrix {
  /**
   * @param {Record<string, object>} [presets] Named climate presets.
   */
  constructor(presets = ClimateMatrix.defaultPresets()) {
    this.presets = new Map();
    for (const [key, preset] of Object.entries(presets)) this.set(key, preset);
  }

  /**
   * Stores a normalised preset.
   *
   * @param {string} key Weather identifier.
   * @param {object} preset Climate values.
   */
  set(key, preset) {
    this.presets.set(key, ClimateMatrix.normalisePreset(key, preset));
  }

  /**
   * Gets a cloned climate preset.
   *
   * @param {string} key Weather identifier.
   * @returns {object} Climate values.
   */
  get(key) {
    const preset = this.presets.get(key);
    if (!preset) throw new RangeError(`Unknown weather preset: ${key}.`);
    return ClimateMatrix.clonePreset(preset);
  }

  /**
   * Linearly blends two named weather presets.
   *
   * @param {string} fromKey Initial weather identifier.
   * @param {string} toKey Target weather identifier.
   * @param {number} progress Transition amount from zero to one.
   * @returns {object} Blended climate values.
   */
  blend(fromKey, toKey, progress) {
    return ClimateMatrix.blendPresets(this.get(fromKey), this.get(toKey), progress);
  }

  /** @returns {Record<string, object>} Built-in climate presets. */
  static defaultPresets() {
    return {
      clear: { visibility: 1, temperatureOffset: 0, wind: { x: 40, y: 0 }, wetnessRate: 0, particleKind: null },
      rain: { visibility: 0.65, temperatureOffset: -6, wind: { x: 150, y: 500 }, wetnessRate: 0.05, particleKind: 'rain', elementalModifiers: { lightning: 0.3 } },
      blizzard: { visibility: 0.3, temperatureOffset: -18, wind: { x: -300, y: 350 }, wetnessRate: -0.02, particleKind: 'snow', movementMultiplier: 0.75 },
      heatwave: { visibility: 0.75, temperatureOffset: 15, wind: { x: 20, y: 0 }, wetnessRate: -0.1, particleKind: 'ash', staminaDrainMultiplier: 1.4, elementalModifiers: { fire: 0.2 } },
      ash: { visibility: 0.7, temperatureOffset: 8, wind: { x: 80, y: 130 }, wetnessRate: -0.04, particleKind: 'ash' },
      miasma: { visibility: 0.5, temperatureOffset: -2, wind: { x: 0, y: 0 }, wetnessRate: 0, particleKind: 'fog', toxic: true },
    };
  }

  /** @param {string} key @param {object} preset @returns {object} Normalised preset. */
  static normalisePreset(key, preset) {
    return {
      key,
      visibility: climateClamp(Number(preset.visibility ?? 1), 0, 1),
      temperatureOffset: Number(preset.temperatureOffset ?? 0),
      wind: { x: Number(preset.wind?.x ?? 0), y: Number(preset.wind?.y ?? 0) },
      wetnessRate: Number(preset.wetnessRate ?? 0),
      particleKind: preset.particleKind ?? null,
      movementMultiplier: Number(preset.movementMultiplier ?? 1),
      staminaDrainMultiplier: Number(preset.staminaDrainMultiplier ?? 1),
      elementalModifiers: { ...(preset.elementalModifiers ?? {}) },
      toxic: Boolean(preset.toxic),
    };
  }

  /** @param {object} preset @returns {object} Cloned preset. */
  static clonePreset(preset) {
    return { ...preset, wind: { ...preset.wind }, elementalModifiers: { ...preset.elementalModifiers } };
  }

  /** @param {object} from @param {object} to @param {number} amount @returns {object} Blended preset. */
  static blendPresets(from, to, amount) {
    const progress = climateClamp(amount, 0, 1);
    const blendValue = (first, second) => first + (second - first) * progress;
    const keys = new Set([...Object.keys(from.elementalModifiers ?? {}), ...Object.keys(to.elementalModifiers ?? {})]);
    const elementalModifiers = {};
    for (const key of keys) elementalModifiers[key] = blendValue(from.elementalModifiers?.[key] ?? 0, to.elementalModifiers?.[key] ?? 0);
    return {
      key: progress >= 1 ? to.key : from.key,
      visibility: blendValue(from.visibility, to.visibility),
      temperatureOffset: blendValue(from.temperatureOffset, to.temperatureOffset),
      wind: { x: blendValue(from.wind.x, to.wind.x), y: blendValue(from.wind.y, to.wind.y) },
      wetnessRate: blendValue(from.wetnessRate, to.wetnessRate),
      particleKind: progress < 0.5 ? from.particleKind : to.particleKind,
      movementMultiplier: blendValue(from.movementMultiplier, to.movementMultiplier),
      staminaDrainMultiplier: blendValue(from.staminaDrainMultiplier, to.staminaDrainMultiplier),
      elementalModifiers,
      toxic: progress < 0.5 ? from.toxic : to.toxic,
    };
  }
}
