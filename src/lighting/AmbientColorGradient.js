const colourClamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const normaliseGradientTime = (value) => ((value % 1) + 1) % 1;

/**
 * Cyclic ambient colour palette with linear or smooth Hermite interpolation.
 */
export class AmbientColorGradient {
  /**
   * @param {Array<object>} [keyframes] Ordered or unordered palette keyframes.
   * @param {'linear'|'hermite'} [interpolation='linear'] Interpolation mode.
   */
  constructor(keyframes = AmbientColorGradient.defaultKeyframes(), interpolation = 'linear') {
    this.interpolation = interpolation;
    this.setKeyframes(keyframes);
  }

  /**
   * Replaces the colour keyframes.
   *
   * @param {Array<object>} keyframes Palette frames with `t` and `colour` or `c`.
   */
  setKeyframes(keyframes) {
    if (!Array.isArray(keyframes) || keyframes.length < 2) {
      throw new TypeError('An ambient gradient requires at least two keyframes.');
    }
    this.keyframes = keyframes.map((frame) => {
      const source = frame.colour ?? frame.c ?? frame.color;
      if (!source || !Number.isFinite(frame.t)) {
        throw new TypeError('Each ambient keyframe requires finite time and colour values.');
      }
      return {
        t: normaliseGradientTime(frame.t),
        colour: {
          r: colourClamp(Math.round(source.r), 0, 255),
          g: colourClamp(Math.round(source.g), 0, 255),
          b: colourClamp(Math.round(source.b), 0, 255),
          a: colourClamp(Number(source.a ?? 1), 0, 1),
        },
      };
    }).sort((first, second) => first.t - second.t);
  }

  /**
   * Evaluates the palette at a normalised time.
   *
   * @param {number} time Fraction of a day.
   * @returns {{r: number, g: number, b: number, a: number}} RGBA colour.
   */
  evaluate(time) {
    const normalised = normaliseGradientTime(time);
    let previous = this.keyframes[this.keyframes.length - 1];
    let next = this.keyframes[0];
    for (let index = 0; index < this.keyframes.length; index += 1) {
      const candidate = this.keyframes[index];
      if (candidate.t <= normalised) {
        previous = candidate;
        next = this.keyframes[(index + 1) % this.keyframes.length];
      }
    }
    const span = next.t > previous.t ? next.t - previous.t : 1 - previous.t + next.t;
    const distance = normalised >= previous.t ? normalised - previous.t : 1 - previous.t + normalised;
    let progress = span === 0 ? 0 : distance / span;
    if (this.interpolation === 'hermite') progress = progress * progress * (3 - 2 * progress);
    return {
      r: Math.round(previous.colour.r + (next.colour.r - previous.colour.r) * progress),
      g: Math.round(previous.colour.g + (next.colour.g - previous.colour.g) * progress),
      b: Math.round(previous.colour.b + (next.colour.b - previous.colour.b) * progress),
      a: Number((previous.colour.a + (next.colour.a - previous.colour.a) * progress).toFixed(4)),
    };
  }

  /**
   * Returns the built-in day/night palette.
   *
   * @returns {Array<object>} Palette keyframes.
   */
  static defaultKeyframes() {
    return [
      { t: 0, colour: { r: 10, g: 15, b: 35, a: 0.92 } },
      { t: 0.22, colour: { r: 40, g: 30, b: 50, a: 0.85 } },
      { t: 0.28, colour: { r: 230, g: 120, b: 80, a: 0.3 } },
      { t: 0.5, colour: { r: 255, g: 255, b: 240, a: 0 } },
      { t: 0.72, colour: { r: 240, g: 100, b: 50, a: 0.35 } },
      { t: 0.8, colour: { r: 25, g: 20, b: 45, a: 0.88 } },
    ];
  }
}
