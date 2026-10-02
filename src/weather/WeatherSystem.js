import { EnvironmentEventBus } from '../events/EnvironmentEventBus.js';
import { EnvironmentEvents } from '../events/EnvironmentEvents.js';
import { ClimateMatrix } from './ClimateMatrix.js';
import { PrecipitationParticle } from './PrecipitationParticle.js';

const weatherClamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const seededWeatherRandom = (seed) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Deterministic weather state, climate transitions, and viewport-bounded particles.
 */
export class WeatherSystem {
  /**
   * @param {object} [options] Weather configuration.
   */
  constructor({
    climateMatrix = new ClimateMatrix(),
    initialWeather = 'clear',
    maxParticles = 240,
    randomSeed = 0xC0FFEE,
    eventBus,
  } = {}) {
    if (!Number.isInteger(maxParticles) || maxParticles < 0) {
      throw new RangeError('Maximum weather particles must be a non-negative integer.');
    }
    this.climateMatrix = climateMatrix;
    this.currentWeather = initialWeather;
    this.targetWeather = initialWeather;
    this.transitionDuration = 0;
    this.transitionProgress = 1;
    this.maxParticles = maxParticles;
    this.particles = [];
    this.eventBus = eventBus ?? new EnvironmentEventBus();
    this.random = seededWeatherRandom(randomSeed);
    this.climate = this.climateMatrix.get(initialWeather);
  }

  /** @returns {number} Current environmental temperature adjustment. */
  get temperatureOffset() { return this.climate.temperatureOffset; }
  /** @returns {number} Current visibility factor. */
  get visibilityFactor() { return this.climate.visibility; }
  /** @returns {{x: number, y: number}} Current wind vector. */
  get wind() { return { ...this.climate.wind }; }

  /**
   * Starts a smooth transition to a known weather preset.
   *
   * @param {string} weatherKey Target weather key.
   * @param {number} [transitionDuration=5] Transition duration in seconds.
   */
  setWeather(weatherKey, transitionDuration = 5) {
    this.climateMatrix.get(weatherKey);
    if (!Number.isFinite(transitionDuration) || transitionDuration < 0) {
      throw new RangeError('Weather transition duration must be non-negative.');
    }
    if (weatherKey === this.targetWeather && this.transitionProgress < 1) return;
    this.currentWeather = this.transitionProgress < 1 ? this.currentWeather : this.targetWeather;
    this.targetWeather = weatherKey;
    this.transitionDuration = transitionDuration;
    this.transitionProgress = transitionDuration === 0 ? 1 : 0;
    if (this.transitionProgress === 1) {
      this.currentWeather = weatherKey;
      this.climate = this.climateMatrix.get(weatherKey);
      this.eventBus.emit(EnvironmentEvents.WEATHER_CHANGE, this.snapshot());
    }
  }

  /**
   * Selects a weather key from positive biome weights using the seeded generator.
   *
   * @param {Record<string, number>} weights Weather probability weights.
   * @param {number} [transitionDuration=5] Transition duration.
   * @returns {string} Selected weather key.
   */
  chooseWeather(weights, transitionDuration = 5) {
    const entries = Object.entries(weights).filter(([, weight]) => Number.isFinite(weight) && weight > 0);
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    if (total <= 0) throw new RangeError('Weather weights must contain a positive value.');
    let point = this.random() * total;
    let selected = entries[entries.length - 1][0];
    for (const [key, weight] of entries) {
      point -= weight;
      if (point <= 0) { selected = key; break; }
    }
    this.setWeather(selected, transitionDuration);
    return selected;
  }

  /**
   * Advances climate blending and particles. Bounds are required only for particle simulation.
   *
   * @param {number} deltaSeconds Simulation delta.
   * @param {{x: number, y: number, width: number, height: number}} [bounds] Active camera bounds.
   * @returns {object} Weather snapshot.
   */
  update(deltaSeconds, bounds) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new RangeError('Weather delta seconds must be finite and non-negative.');
    }
    const previousProgress = this.transitionProgress;
    if (this.transitionProgress < 1) {
      this.transitionProgress = weatherClamp(
        this.transitionProgress + deltaSeconds / Math.max(this.transitionDuration, Number.EPSILON), 0, 1,
      );
      this.climate = this.climateMatrix.blend(this.currentWeather, this.targetWeather, this.transitionProgress);
      this.eventBus.emit(EnvironmentEvents.WEATHER_TRANSITION, this.snapshot());
      if (this.transitionProgress === 1 && previousProgress < 1) {
        this.currentWeather = this.targetWeather;
        this.climate = this.climateMatrix.get(this.currentWeather);
        this.eventBus.emit(EnvironmentEvents.WEATHER_CHANGE, this.snapshot());
      }
    }
    if (bounds) this.updateParticles(deltaSeconds, bounds);
    return this.snapshot();
  }

  /**
   * Updates particles exclusively inside camera bounds.
   *
   * @param {number} deltaSeconds Simulation delta.
   * @param {{x: number, y: number, width: number, height: number}} bounds Active bounds.
   */
  updateParticles(deltaSeconds, bounds) {
    const particleKind = this.climate.particleKind;
    if (!particleKind || this.maxParticles === 0) {
      this.particles.length = 0;
      return;
    }
    const density = particleKind === 'fog' ? 0.35 : 1;
    const desired = Math.round(this.maxParticles * density);
    while (this.particles.length < desired) this.particles.push(this.createParticle(bounds, particleKind));
    if (this.particles.length > desired) this.particles.length = desired;
    for (const particle of this.particles) particle.update(deltaSeconds, this.climate.wind, bounds);
  }

  /**
   * Creates one seeded particle inside the viewport.
   *
   * @param {{x: number, y: number, width: number, height: number}} bounds Active bounds.
   * @param {string} kind Visual particle kind.
   * @returns {PrecipitationParticle} Particle.
   */
  createParticle(bounds, kind) {
    const snow = kind === 'snow';
    const fog = kind === 'fog';
    return new PrecipitationParticle({
      x: bounds.x + this.random() * bounds.width,
      y: bounds.y + this.random() * bounds.height,
      length: fog ? 28 + this.random() * 30 : snow ? 3 + this.random() * 3 : 10 + this.random() * 12,
      speed: fog ? 0.12 + this.random() * 0.15 : 0.7 + this.random() * 0.6,
      drift: snow ? (this.random() - 0.5) * 30 : 0,
    });
  }

  /** @returns {object} Renderer-neutral current weather state. */
  snapshot() {
    return {
      currentWeather: this.currentWeather,
      targetWeather: this.targetWeather,
      transitionProgress: this.transitionProgress,
      transitionDuration: this.transitionDuration,
      climate: ClimateMatrix.clonePreset(this.climate),
      particleCount: this.particles.length,
    };
  }

  /** @returns {object} Persistable weather state. */
  serialise() {
    return { ...this.snapshot(), particles: this.particles.map((particle) => particle.serialise()) };
  }
}
