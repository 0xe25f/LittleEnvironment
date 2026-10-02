import { AmbientColorGradient } from './AmbientColorGradient.js';

/**
 * Renderer adapter that prepares and composites ambient and point-light passes.
 */
export class LightingCompositor {
  /**
   * @param {object} [options] Compositor configuration.
   * @param {AmbientColorGradient} [options.ambientGradient] Ambient palette.
   * @param {object|null} [options.ambientOverride] Optional fixed ambient colour.
   */
  constructor({ ambientGradient = new AmbientColorGradient(), ambientOverride = null } = {}) {
    this.ambientGradient = ambientGradient;
    this.ambientOverride = ambientOverride;
    this.lights = new Map();
  }

  /** @param {import('./LightSource.js').LightSource} light Light to register. */
  addLight(light) { this.lights.set(light.id, light); return light; }
  /** @param {string} id Light identifier. @returns {boolean} Removal result. */
  removeLight(id) { return this.lights.delete(id); }
  /** Removes every light. */
  clearLights() { this.lights.clear(); }

  /**
   * Builds a renderer-neutral frame, culling off-screen lights before rendering.
   *
   * @param {number} normalisedTime Celestial time.
   * @param {{x: number, y: number, width: number, height: number}} bounds Viewport bounds.
   * @param {number} [timeSeconds=0] Simulation time.
   * @returns {{ambient: object, lights: object[]}} Lighting frame.
   */
  createFrame(normalisedTime, bounds, timeSeconds = 0) {
    const ambient = this.ambientOverride ? { ...this.ambientOverride } : this.ambientGradient.evaluate(normalisedTime);
    const lights = [...this.lights.values()]
      .filter((light) => light.intersects(bounds, timeSeconds))
      .map((light) => light.describe(timeSeconds));
    return { ambient, lights };
  }

  /**
   * Draws a prepared lighting frame through a Canvas 2D-compatible renderer.
   * The simulation state stays headless; this method is an opt-in adapter.
   *
   * @param {CanvasRenderingContext2D} context Canvas context.
   * @param {{ambient: object, lights: object[]}} frame Prepared lighting frame.
   * @param {{x: number, y: number, width: number, height: number}} bounds Viewport bounds.
   */
  compositeCanvas(context, frame, bounds) {
    const { r, g, b, a } = frame.ambient;
    context.save();
    context.globalCompositeOperation = 'multiply';
    context.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
    context.fillRect(0, 0, bounds.width, bounds.height);
    context.globalCompositeOperation = 'lighter';
    for (const light of frame.lights) {
      const x = light.position.x - bounds.x;
      const y = light.position.y - bounds.y;
      const gradient = context.createRadialGradient(x, y, 0, x, y, light.radius);
      const colour = light.colour;
      gradient.addColorStop(0, `rgba(${colour.r}, ${colour.g}, ${colour.b}, ${light.intensity})`);
      gradient.addColorStop(0.7, `rgba(${colour.r}, ${colour.g}, ${colour.b}, ${light.intensity * 0.3})`);
      gradient.addColorStop(1, `rgba(${colour.r}, ${colour.g}, ${colour.b}, 0)`);
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(x, y, light.radius, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }
}
