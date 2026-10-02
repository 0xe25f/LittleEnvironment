/**
 * Headless radial source of environmental heat.
 */
export class HeatSource {
  /**
   * @param {object} [options] Heat source configuration.
   */
  constructor({ id = 'heat-source', x = 0, y = 0, radius = 100, heatOutput = 10, falloff = 1 } = {}) {
    if (!Number.isFinite(radius) || radius <= 0) {
      throw new RangeError('Heat source radius must be greater than zero.');
    }
    this.id = String(id);
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.heatOutput = heatOutput;
    this.falloff = Math.max(0.01, falloff);
  }

  /**
   * Calculates radiant heat at a world position.
   *
   * @param {{x: number, y: number}} position Recipient world position.
   * @returns {number} Temperature contribution in degrees Celsius.
   */
  getContribution(position) {
    const distance = Math.hypot(this.x - position.x, this.y - position.y);
    if (distance >= this.radius) return 0;
    return this.heatOutput * (1 - distance / this.radius) ** this.falloff;
  }

  /** @returns {object} Persistable source description. */
  serialise() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      radius: this.radius,
      heatOutput: this.heatOutput,
      falloff: this.falloff,
    };
  }
}
