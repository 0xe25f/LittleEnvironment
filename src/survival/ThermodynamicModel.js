/**
 * Pure heat-conduction model used by survival systems.
 */
export class ThermodynamicModel {
  /**
   * @param {object} [options] Thermodynamic constants.
   * @param {number} [options.thermalConstant=8] Baseline thermal inertia.
   * @param {number} [options.exchangeRate=0.02] Heat exchange rate per second.
   */
  constructor({ thermalConstant = 8, exchangeRate = 0.02 } = {}) {
    if (!Number.isFinite(thermalConstant) || thermalConstant <= 0) {
      throw new RangeError('Thermal constant must be greater than zero.');
    }
    if (!Number.isFinite(exchangeRate) || exchangeRate < 0) {
      throw new RangeError('Heat exchange rate must be non-negative.');
    }
    this.thermalConstant = thermalConstant;
    this.exchangeRate = exchangeRate;
  }

  /**
   * Applies the required heat-balance equation over a continuous delta.
   *
   * dT/dt = (environment - body) / (insulation + thermalConstant) * exchangeRate
   *
   * @param {number} bodyTemperature Current core temperature.
   * @param {number} environmentTemperature Effective environmental temperature.
   * @param {number} insulation Clothing insulation.
   * @param {number} deltaSeconds Simulation delta.
   * @returns {{temperature: number, delta: number, rate: number}} Integrated result.
   */
  step(bodyTemperature, environmentTemperature, insulation, deltaSeconds) {
    if (![bodyTemperature, environmentTemperature, insulation, deltaSeconds].every(Number.isFinite)) {
      throw new TypeError('Thermodynamic values must be finite.');
    }
    if (deltaSeconds < 0) throw new RangeError('Thermodynamic delta must be non-negative.');
    const thermalResistance = Math.max(0, insulation) + this.thermalConstant;
    const delta = environmentTemperature - bodyTemperature;
    const rate = (delta / thermalResistance) * this.exchangeRate;
    return { temperature: bodyTemperature + rate * deltaSeconds, delta, rate };
  }

  /**
   * Totals radiant heat from compatible heat-source objects.
   *
   * @param {{x: number, y: number}} position Recipient world position.
   * @param {Array<object>} sources Nearby heat sources.
   * @returns {number} Total heat contribution.
   */
  calculateRadiantHeat(position, sources) {
    return sources.reduce((total, source) => {
      if (typeof source.getContribution === 'function') return total + source.getContribution(position);
      const distance = Math.hypot((source.x ?? 0) - position.x, (source.y ?? 0) - position.y);
      if (!Number.isFinite(source.radius) || distance >= source.radius) return total;
      const falloff = Math.max(0.01, source.falloff ?? 1);
      return total + (source.heatOutput ?? 0) * (1 - distance / source.radius) ** falloff;
    }, 0);
  }
}
