/**
 * Deterministic calendar state driven by celestial day rollovers.
 */
export class CalendarEngine {
  /**
   * @param {object} [options] Calendar configuration.
   * @param {number} [options.dayCount=1] One-based current day.
   * @param {number} [options.daysPerSeason=30] Days in each season.
   * @param {string[]} [options.seasons] Ordered season names.
   */
  constructor({
    dayCount = 1,
    daysPerSeason = 30,
    seasons = ['spring', 'summer', 'autumn', 'winter'],
  } = {}) {
    if (!Number.isInteger(dayCount) || dayCount < 1) {
      throw new RangeError('Calendar day count must be a positive integer.');
    }
    if (!Number.isInteger(daysPerSeason) || daysPerSeason < 1) {
      throw new RangeError('Days per season must be a positive integer.');
    }
    if (!Array.isArray(seasons) || seasons.length === 0 || seasons.some((season) => !season)) {
      throw new TypeError('A calendar requires at least one named season.');
    }
    this.dayCount = dayCount;
    this.daysPerSeason = daysPerSeason;
    this.seasons = [...seasons];
  }

  /** @returns {number} Zero-based current season index. */
  get seasonIndex() {
    return Math.floor((this.dayCount - 1) / this.daysPerSeason) % this.seasons.length;
  }

  /** @returns {number} Compatibility alias for the current season index. */
  get currentSeasonIndex() { return this.seasonIndex; }

  /** @returns {string} Current season name. */
  get currentSeason() {
    return this.seasons[this.seasonIndex];
  }

  /** @returns {number} One-based current year. */
  get year() {
    return Math.floor((this.dayCount - 1) / (this.daysPerSeason * this.seasons.length)) + 1;
  }

  /** @returns {number} One-based day within the current season. */
  get dayOfSeason() {
    return ((this.dayCount - 1) % this.daysPerSeason) + 1;
  }

  /**
   * Advances a whole number of days and returns each rollover.
   *
   * @param {number} [days=1] Number of days to advance.
   * @returns {Array<object>} Rollover descriptors in chronological order.
   */
  advanceDays(days = 1) {
    if (!Number.isInteger(days) || days < 0) {
      throw new RangeError('Calendar advances must be non-negative whole days.');
    }
    const rollovers = [];
    for (let index = 0; index < days; index += 1) {
      const previousSeasonIndex = this.seasonIndex;
      this.dayCount += 1;
      rollovers.push({
        day: this.dayCount,
        season: this.currentSeason,
        seasonChanged: previousSeasonIndex !== this.seasonIndex,
        year: this.year,
      });
    }
    return rollovers;
  }

  /**
   * Produces a serialisable calendar snapshot.
   *
   * @returns {object} Calendar state.
   */
  serialise() {
    return {
      dayCount: this.dayCount,
      daysPerSeason: this.daysPerSeason,
      seasons: [...this.seasons],
    };
  }

  /**
   * Restores a calendar from a snapshot.
   *
   * @param {object} state Calendar state.
   * @returns {CalendarEngine} Restored calendar.
   */
  static deserialise(state) {
    return new CalendarEngine(state);
  }
}
