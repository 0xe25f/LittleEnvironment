/**
 * Canonical event names emitted by LittleEnvironment systems.
 *
 * @readonly
 */
export const EnvironmentEvents = Object.freeze({
  TIME_TICK: 'time:tick',
  NEW_DAY: 'time:new-day',
  SEASON_CHANGE: 'time:season-change',
  WEATHER_CHANGE: 'weather:change',
  WEATHER_TRANSITION: 'weather:transition',
  VITAL_THRESHOLD: 'survival:vital-threshold',
  EFFECT_APPLIED: 'effect:applied',
  EFFECT_REMOVED: 'effect:removed',
  DAMAGE_RESOLVED: 'combat:damage-resolved',
  LEVEL_UP: 'progression:level-up',
});
