import { EnvironmentEventBus } from '../events/EnvironmentEventBus.js';
import { EnvironmentEvents } from '../events/EnvironmentEvents.js';
import { CalendarEngine } from './CalendarEngine.js';

const TAU = Math.PI * 2;

/**
 * Continuous celestial timekeeper with deterministic day and season transitions.
 */
export class CelestialClock {
  /**
   * @param {object} [options] Clock configuration.
   * @param {number} [options.dayDurationSeconds=1200] Real seconds in one game day.
   * @param {number} [options.startNormalisedTime=0.25] Starting fraction of a day.
   * @param {number} [options.startNormalizedTime] American-spelled compatibility alias.
   * @param {CalendarEngine} [options.calendar] Calendar to advance on rollover.
   * @param {EnvironmentEventBus} [options.eventBus] Optional event dispatcher.
   */
  constructor({
    dayDurationSeconds = 1200,
    startNormalisedTime,
    startNormalizedTime,
    calendar,
    eventBus,
    daysPerSeason,
    seasons,
  } = {}) {
    if (!Number.isFinite(dayDurationSeconds) || dayDurationSeconds <= 0) {
      throw new RangeError('A celestial day duration must be greater than zero.');
    }
    const initialTime = startNormalisedTime ?? startNormalizedTime ?? 0.25;
    this.dayDurationSeconds = dayDurationSeconds;
    this.time = CelestialClock.normaliseTime(initialTime);
    this.calendar = calendar ?? new CalendarEngine({ daysPerSeason, seasons });
    this.eventBus = eventBus ?? new EnvironmentEventBus();
    this.subscribers = new Set();
  }

  /** @returns {number} One-based world day. */
  get dayCount() { return this.calendar.dayCount; }
  /** @returns {number} Compatibility alias for the day duration. */
  get dayDuration() { return this.dayDurationSeconds; }
  /** @returns {string} Current season. */
  get currentSeason() { return this.calendar.currentSeason; }
  /** @returns {number} Current calendar year. */
  get year() { return this.calendar.year; }
  /** @returns {boolean} Whether the time lies in the night window. */
  get isNight() { return this.time < 0.22 || this.time >= 0.78; }
  /** @returns {boolean} Whether the time lies in the day window. */
  get isDay() { return !this.isNight; }

  /**
   * Advances continuous time, retaining every day rollover even after a long frame.
   *
   * @param {number} deltaSeconds Real seconds elapsed.
   * @param {number} [timeScale=1] Simulation speed multiplier.
   * @returns {object} Current clock snapshot.
   */
  update(deltaSeconds, timeScale = 1) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new RangeError('Clock delta seconds must be finite and non-negative.');
    }
    if (!Number.isFinite(timeScale) || timeScale < 0) {
      throw new RangeError('Clock time scale must be finite and non-negative.');
    }
    const elapsedDays = (deltaSeconds * timeScale) / this.dayDurationSeconds;
    const totalTime = this.time + elapsedDays;
    const rollovers = Math.floor(totalTime);
    this.time = CelestialClock.normaliseTime(totalTime);
    for (const rollover of this.calendar.advanceDays(rollovers)) {
      this.emit(EnvironmentEvents.NEW_DAY, rollover);
      if (rollover.seasonChanged) this.emit(EnvironmentEvents.SEASON_CHANGE, rollover);
    }
    const snapshot = this.snapshot();
    this.emit(EnvironmentEvents.TIME_TICK, snapshot);
    return snapshot;
  }

  /**
   * Sets continuous time without altering the calendar.
   *
   * @param {number} normalisedTime Fraction of a day.
   */
  setTime(normalisedTime) {
    this.time = CelestialClock.normaliseTime(normalisedTime);
  }

  /**
   * Gets local 24-hour time without rounding away continuous precision.
   *
   * @returns {{hour: number, minute: number, second: number}} Clock time.
   */
  getClockTime() {
    const seconds = this.time * 86400;
    const hour = Math.floor(seconds / 3600);
    const minute = Math.floor((seconds % 3600) / 60);
    return { hour, minute, second: Math.floor(seconds % 60) };
  }

  /**
   * Calculates the sun's orbital angle and unit direction.
   *
   * @returns {{angle: number, elevation: number, x: number, y: number}} Sun position.
   */
  getSunPosition() {
    const angle = TAU * (this.time - 0.25);
    return {
      angle,
      elevation: Math.sin(angle),
      x: Math.cos(angle),
      y: Math.sin(angle),
    };
  }

  /**
   * Calculates the moon's opposing orbital position.
   *
   * @returns {{angle: number, elevation: number, x: number, y: number}} Moon position.
   */
  getMoonPosition() {
    const sun = this.getSunPosition();
    return {
      angle: sun.angle + Math.PI,
      elevation: -sun.elevation,
      x: -sun.x,
      y: -sun.y,
    };
  }

  /**
   * Evaluates a bounded, smooth ambient intensity.
   *
   * @param {number} [minimum=0.06] Night-time intensity floor.
   * @returns {number} Ambient intensity.
   */
  getAmbientIntensity(minimum = 0.06) {
    const sun = Math.sin(TAU * (this.time - 0.25)) * 1.2;
    return Math.max(minimum, Math.min(1, sun));
  }

  /**
   * Subscribes to every clock event using the legacy `(event, data)` shape.
   *
   * @param {(event: string, data: object) => void} callback Listener to invoke.
   * @returns {() => void} Function that removes the subscription.
   */
  subscribe(callback) {
    if (typeof callback !== 'function') throw new TypeError('A clock subscriber must be a function.');
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Dispatches through the event bus and legacy subscriptions.
   *
   * @param {string} event Event name.
   * @param {object} payload Event data.
   */
  emit(event, payload) {
    this.eventBus.emit(event, payload);
    for (const subscriber of [...this.subscribers]) subscriber(event, payload);
  }

  /**
   * Returns a serialisable summary.
   *
   * @returns {object} Clock state.
   */
  snapshot() {
    return {
      time: this.time,
      ...this.getClockTime(),
      dayCount: this.dayCount,
      season: this.currentSeason,
      year: this.year,
      isNight: this.isNight,
    };
  }

  /**
   * Produces a complete clock snapshot for persistence.
   *
   * @returns {object} Clock state.
   */
  serialise() {
    return {
      dayDurationSeconds: this.dayDurationSeconds,
      time: this.time,
      calendar: this.calendar.serialise(),
    };
  }

  /**
   * Restores a clock from serialised state.
   *
   * @param {object} state Clock state.
   * @param {EnvironmentEventBus} [eventBus] Event dispatcher.
   * @returns {CelestialClock} Restored clock.
   */
  static deserialise(state, eventBus) {
    return new CelestialClock({
      dayDurationSeconds: state.dayDurationSeconds,
      startNormalisedTime: state.time,
      calendar: CalendarEngine.deserialise(state.calendar),
      eventBus,
    });
  }

  /**
   * Wraps a number into the continuous half-open day interval.
   *
   * @param {number} value Any finite day fraction.
   * @returns {number} Fraction in [0, 1).
   */
  static normaliseTime(value) {
    if (!Number.isFinite(value)) throw new TypeError('Celestial time must be finite.');
    return ((value % 1) + 1) % 1;
  }
}
