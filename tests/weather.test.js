import assert from 'node:assert/strict';
import test from 'node:test';
import { ClimateMatrix, WeatherSystem } from '../src/index.js';

test('weather transitions interpolate climate and preserve bounded particles', () => {
  const weather = new WeatherSystem({ maxParticles: 10, randomSeed: 123 });
  weather.setWeather('rain', 2);
  weather.update(1, { x: 5, y: 10, width: 50, height: 40 });
  assert.equal(weather.transitionProgress, 0.5);
  assert.equal(weather.temperatureOffset, -3);
  assert.equal(weather.particles.length, 10);
  weather.update(1, { x: 5, y: 10, width: 50, height: 40 });
  assert.equal(weather.currentWeather, 'rain');
  for (const particle of weather.particles) {
    assert.ok(particle.x >= -7 && particle.x <= 67);
    assert.ok(particle.y >= -12 && particle.y <= 62);
  }
});

test('climate matrix blends gameplay values and weather selection is seeded', () => {
  const matrix = new ClimateMatrix();
  assert.equal(matrix.blend('clear', 'blizzard', 0.5).visibility, 0.65);
  const first = new WeatherSystem({ randomSeed: 8 });
  const second = new WeatherSystem({ randomSeed: 8 });
  assert.equal(first.chooseWeather({ clear: 1, blizzard: 2 }), second.chooseWeather({ clear: 1, blizzard: 2 }));
});
