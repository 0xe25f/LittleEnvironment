import { WeatherSystem } from '../../release/littleenvironment.min.js';

const canvas = document.querySelector('#weather-canvas');
const context = canvas.getContext('2d');
const readout = document.querySelector('#readout');
const weather = new WeatherSystem({ initialWeather: 'rain', maxParticles: 160, randomSeed: 42 });
const bounds = { x: 0, y: 0, width: canvas.width, height: canvas.height };
let previous = performance.now();

document.querySelector('#weather').addEventListener('change', (event) => weather.setWeather(event.target.value, 1));

function render(now) {
  const frameTime = Number.isFinite(now) ? now : performance.now();
  const delta = Math.min((frameTime - previous) / 1000, 0.1);
  previous = frameTime;
  const snapshot = weather.update(delta, bounds);
  context.fillStyle = '#142136';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.beginPath();
  for (const particle of weather.particles) {
    context.moveTo(particle.x, particle.y);
    context.lineTo(particle.x - snapshot.climate.wind.x * 0.02, particle.y - 8);
  }
  context.strokeStyle = '#d8ebff';
  context.stroke();
  readout.textContent = `${snapshot.currentWeather}: ${snapshot.climate.temperatureOffset.toFixed(1)} °C, visibility ${snapshot.climate.visibility.toFixed(2)}`;
  requestAnimationFrame(render);
}

requestAnimationFrame(render);
