const boundedLightHash = (text) => {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
};

/**
 * Headless description of a deterministic dynamic point light.
 */
export class LightSource {
  /**
   * @param {object} [options] Light configuration.
   */
  constructor({
    id = 'light',
    position = { x: 0, y: 0 },
    pos,
    radius = 120,
    colour = { r: 255, g: 180, b: 60 },
    color,
    intensity = 1,
    flickerSpeed = 8,
    flickerAmount = 0.08,
    flickerSeed,
    enabled = true,
  } = {}) {
    if (!Number.isFinite(radius) || radius < 0) throw new RangeError('Light radius must be non-negative.');
    this.id = String(id);
    this.position = { ...(pos ?? position) };
    this.radius = radius;
    this.colour = { ...(color ?? colour) };
    this.intensity = intensity;
    this.flickerSpeed = flickerSpeed;
    this.flickerAmount = flickerAmount;
    this.flickerSeed = flickerSeed ?? boundedLightHash(this.id) * 1000;
    this.enabled = enabled;
  }

  /**
   * Calculates the flicker-adjusted radius for a simulation time.
   *
   * @param {number} timeSeconds Simulation time.
   * @returns {number} Effective radius.
   */
  getEffectiveRadius(timeSeconds) {
    if (!this.enabled || this.flickerAmount <= 0) return this.enabled ? this.radius : 0;
    const wave = Math.sin(timeSeconds * this.flickerSpeed + this.flickerSeed);
    const harmonic = Math.sin(timeSeconds * this.flickerSpeed * 2.17 + this.flickerSeed * 0.71) * 0.35;
    return this.radius * (1 + (wave + harmonic) * this.flickerAmount);
  }

  /**
   * Calculates flicker-adjusted brightness.
   *
   * @param {number} timeSeconds Simulation time.
   * @returns {number} Effective intensity.
   */
  getEffectiveIntensity(timeSeconds) {
    return this.radius === 0 ? 0 : this.intensity * (this.getEffectiveRadius(timeSeconds) / this.radius);
  }

  /**
   * Tests whether this light intersects a world-space viewport.
   *
   * @param {{x: number, y: number, width: number, height: number}} bounds Viewport bounds.
   * @param {number} [timeSeconds=0] Simulation time.
   * @returns {boolean} Whether the light may affect the viewport.
   */
  intersects(bounds, timeSeconds = 0) {
    const radius = this.getEffectiveRadius(timeSeconds);
    return this.enabled
      && this.position.x + radius >= bounds.x
      && this.position.x - radius <= bounds.x + bounds.width
      && this.position.y + radius >= bounds.y
      && this.position.y - radius <= bounds.y + bounds.height;
  }

  /**
   * Produces a renderer-neutral light descriptor.
   *
   * @param {number} timeSeconds Simulation time.
   * @returns {object} Light descriptor.
   */
  describe(timeSeconds = 0) {
    return {
      id: this.id,
      position: { ...this.position },
      radius: this.getEffectiveRadius(timeSeconds),
      colour: { ...this.colour },
      intensity: this.getEffectiveIntensity(timeSeconds),
      enabled: this.enabled,
    };
  }
}
