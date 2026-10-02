/**
 * A renderer-neutral weather particle constrained to the active viewport.
 */
export class PrecipitationParticle {
  /**
   * @param {object} values Particle values.
   */
  constructor({ x = 0, y = 0, length = 8, speed = 1, drift = 0 } = {}) {
    this.x = x;
    this.y = y;
    this.length = length;
    this.speed = speed;
    this.drift = drift;
  }

  /**
   * Advances and recycles the particle inside viewport bounds.
   *
   * @param {number} deltaSeconds Simulation delta.
   * @param {{x: number, y: number}} wind World wind.
   * @param {{x: number, y: number, width: number, height: number}} bounds Viewport bounds.
   */
  update(deltaSeconds, wind, bounds) {
    this.x += (wind.x * this.speed + this.drift) * deltaSeconds;
    this.y += wind.y * this.speed * deltaSeconds;
    this.x = PrecipitationParticle.wrap(this.x, bounds.x, bounds.width);
    this.y = PrecipitationParticle.wrap(this.y, bounds.y, bounds.height);
  }

  /** @returns {object} Plain particle data. */
  serialise() { return { x: this.x, y: this.y, length: this.length, speed: this.speed, drift: this.drift }; }

  /**
   * Wraps a coordinate across a finite viewport span, including long-frame travel.
   *
   * @param {number} value Coordinate to wrap.
   * @param {number} origin Lower span boundary.
   * @param {number} span Positive span width.
   * @returns {number} Wrapped coordinate.
   */
  static wrap(value, origin, span) {
    if (!Number.isFinite(span) || span <= 0) return origin;
    return origin + (((value - origin) % span) + span) % span;
  }
}
