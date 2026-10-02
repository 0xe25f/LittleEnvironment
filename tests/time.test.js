import assert from 'node:assert/strict';
import test from 'node:test';
import { CalendarEngine, CelestialClock, EnvironmentEvents } from '../src/index.js';

test('celestial clock retains continuous time and emits every day rollover', () => {
  const calendar = new CalendarEngine({ daysPerSeason: 2, seasons: ['spring', 'summer'] });
  const clock = new CelestialClock({ dayDurationSeconds: 10, startNormalisedTime: 0.9, calendar });
  const days = [];
  const seasons = [];
  clock.eventBus.on(EnvironmentEvents.NEW_DAY, (event) => days.push(event.day));
  clock.eventBus.on(EnvironmentEvents.SEASON_CHANGE, (event) => seasons.push(event.season));
  clock.update(21);
  assert.equal(clock.time, 0);
  assert.deepEqual(days, [2, 3, 4]);
  assert.deepEqual(seasons, ['summer']);
  assert.equal(clock.currentSeason, 'summer');
});

test('celestial clock exposes useful astronomical and wall-clock values', () => {
  const clock = new CelestialClock({ startNormalisedTime: 0.5 });
  assert.deepEqual(clock.getClockTime(), { hour: 12, minute: 0, second: 0 });
  assert.ok(clock.getSunPosition().elevation > 0.99);
  assert.ok(clock.getAmbientIntensity() > 0.99);
  assert.equal(clock.isNight, false);
  clock.setTime(-0.1);
  assert.equal(clock.time, 0.9);
  assert.equal(clock.isNight, true);
});
